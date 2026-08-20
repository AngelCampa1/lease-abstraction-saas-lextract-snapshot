"""Tests for the wired extraction task — observer, R2 dump, cost, and stage summary."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.tasks.extraction import (
    _dump_raw_artifacts,
    _fetch_document_reference,
    _is_missing_column_error,
    _safe_slug,
    _should_retry_task,
    run_gemini_extraction_task,
)

# Minimal valid PDF for pypdf
_MINIMAL_PDF = (
    b"%PDF-1.4\n"
    b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
    b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
    b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n"
    b"xref\n0 4\n0000000000 65535 f \n"
    b"0000000009 00000 n \n"
    b"0000000058 00000 n \n"
    b"0000000115 00000 n \n"
    b"trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF\n"
)


def _make_db(doc_data: dict) -> MagicMock:
    mock_db = MagicMock()
    mock_response = MagicMock()
    mock_response.data = doc_data
    (
        mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value
    ) = mock_response
    mock_db.table.return_value.update.return_value.eq.return_value.execute = MagicMock()
    return mock_db


def _make_mp_result(
    *,
    cost_cents: int = 42,
    cost_ceiling_hit: bool = False,
    audit_trail: dict | None = None,
) -> MagicMock:
    mock_fv = MagicMock()
    mock_fv.value = "Test LLC"
    mock_fv.confidence = 0.9
    mock_fv.source_text = "Test LLC"

    mock_extraction = MagicMock()
    mock_extraction.fields = {"landlord_legal_name": mock_fv}

    mock_pass_record = MagicMock()
    mock_pass_record.input_tokens = 5000
    mock_pass_record.output_tokens = 2000
    mock_pass_record.model = "google/gemini-3-flash-preview"
    mock_pass_record.pass_kind = "pass1"
    mock_pass_record.pass_number = 1
    mock_pass_record.model_dump.return_value = {
        "pass_number": 1,
        "pass_kind": "pass1",
        "model": "google/gemini-3-flash-preview",
        "input_tokens": 5000,
        "output_tokens": 2000,
        "duration_ms": 1000,
        "cost_cents": cost_cents,
    }

    mp = MagicMock()
    mp.extraction = mock_extraction
    mp.pass_records = [mock_pass_record]
    mp.total_tokens = 7000
    mp.patch = None
    mp.pass3_overrides = None
    mp.extraction_cost_cents = cost_cents
    mp.cost_ceiling_hit = cost_ceiling_hit
    mp.audit_trail = audit_trail or {
        "raw_responses": ["raw json response text"],
        "retry_counts": [0],
        "validation_failures": [],
    }
    return mp


# ---------------------------------------------------------------------------
# _safe_slug
# ---------------------------------------------------------------------------


class TestSafeSlug:
    def test_replaces_slashes(self) -> None:
        assert (
            _safe_slug("google/gemini-3-flash-preview")
            == "google-gemini-3-flash-preview"
        )

    def test_replaces_colons(self) -> None:
        assert _safe_slug("model:v1") == "model-v1"

    def test_safe_chars_unchanged(self) -> None:
        assert _safe_slug("gemini-3-flash.preview") == "gemini-3-flash.preview"

    def test_empty_string(self) -> None:
        assert _safe_slug("") == ""


# ---------------------------------------------------------------------------
# _dump_raw_artifacts
# ---------------------------------------------------------------------------


class TestDumpRawArtifacts:
    def test_uploads_one_artifact_per_pass(self) -> None:
        mock_storage = MagicMock()
        mock_storage.upload_extraction_artifact.return_value = (
            "extractions/ext-1/raw/pass1-google-gemini.json"
        )
        pass_record = MagicMock()
        pass_record.model = "google/gemini"
        pass_record.pass_kind = "pass1"
        pass_record.pass_number = 1
        pass_record.input_tokens = 100
        pass_record.output_tokens = 50

        keys = _dump_raw_artifacts(
            extraction_id="ext-1",
            pass_records=[pass_record],
            raw_responses=["raw text"],
            object_storage=mock_storage,
        )

        assert len(keys) == 1
        mock_storage.upload_extraction_artifact.assert_called_once()
        call_kwargs = mock_storage.upload_extraction_artifact.call_args[1]
        assert call_kwargs["extraction_id"] == "ext-1"
        assert call_kwargs["artifact_name"] == "pass1-google-gemini"

    def test_skips_on_upload_error_returns_partial(self) -> None:
        mock_storage = MagicMock()
        mock_storage.upload_extraction_artifact.side_effect = [
            "extractions/ext-1/raw/a.json",
            RuntimeError("upload failed"),
        ]
        records = [
            MagicMock(
                model="m1",
                pass_kind="pass1",
                pass_number=1,
                input_tokens=0,
                output_tokens=0,
            ),
            MagicMock(
                model="m2",
                pass_kind="pass2",
                pass_number=2,
                input_tokens=0,
                output_tokens=0,
            ),
        ]
        raw = ["r1", "r2"]

        keys = _dump_raw_artifacts(
            extraction_id="ext-1",
            pass_records=records,
            raw_responses=raw,
            object_storage=mock_storage,
        )

        assert len(keys) == 1  # second failed, still returns first

    def test_empty_pass_records_returns_empty_list(self) -> None:
        keys = _dump_raw_artifacts(
            extraction_id="ext-1",
            pass_records=[],
            raw_responses=[],
            object_storage=MagicMock(),
        )
        assert keys == []

    def test_artifact_name_contains_pass_kind(self) -> None:
        mock_storage = MagicMock()
        mock_storage.upload_extraction_artifact.return_value = "key"
        record = MagicMock(
            model="openai/gpt-5",
            pass_kind="sibling",
            pass_number=1,
            input_tokens=0,
            output_tokens=0,
        )

        _dump_raw_artifacts(
            extraction_id="ext-2",
            pass_records=[record],
            raw_responses=["text"],
            object_storage=mock_storage,
        )

        call_kwargs = mock_storage.upload_extraction_artifact.call_args[1]
        assert call_kwargs["artifact_name"].startswith("sibling-")


# ---------------------------------------------------------------------------
# run_gemini_extraction_task — wired behavior
# ---------------------------------------------------------------------------


class TestWiredExtractionTask:
    def _run_task(
        self,
        mp_result: MagicMock,
        *,
        raw_dump_enabled: bool = True,
        dual_enabled: bool = False,
    ) -> MagicMock:
        mock_db = _make_db(
            {
                "document_object_key": "user-1/ext-1/original.pdf",
                "document_filename": "lease.pdf",
            }
        )
        mock_storage = MagicMock()
        mock_storage.download_file.return_value = _MINIMAL_PDF
        mock_storage.upload_extraction_artifact.return_value = (
            "extractions/ext-1/raw/pass1-model.json"
        )
        mock_orchestrator = MagicMock()
        mock_orchestrator.run = AsyncMock(return_value=mp_result)
        mock_observer = MagicMock()
        mock_observer.build_summary.return_value = {"final_stage": "pass1_extraction"}

        with (
            patch("app.tasks.extraction._get_db_client", return_value=mock_db),
            patch(
                "app.tasks.extraction.ObjectStorageService", return_value=mock_storage
            ),
            patch(
                "app.tasks.extraction.MultiPassOrchestrator",
                return_value=mock_orchestrator,
            ),
            patch(
                "app.tasks.extraction.ExtractionPipelineObserver",
                return_value=mock_observer,
            ),
            patch("app.tasks.extraction.update_extraction_status"),
            patch("app.tasks.extraction.settings") as mock_settings,
        ):
            mock_settings.pass1_model = "google/gemini-3-flash-preview"
            mock_settings.pass1_fallback_model = "google/gemini-3.1-flash-lite-preview"
            mock_settings.pass1_fallback_model_2 = "openai/gpt-5.4-mini"
            mock_settings.pass2_model = "google/gemini-3.1-flash-lite-preview"
            mock_settings.pass2_fallback_model = "openai/gpt-5.4-mini"
            mock_settings.pass2_fallback_model_2 = "google/gemini-3-flash-preview"
            mock_settings.pass3_model = "google/gemini-3-flash-preview"
            mock_settings.pass3_fallback_model = "google/gemini-3.1-flash-lite-preview"
            mock_settings.pass3_fallback_model_2 = "openai/gpt-5.4-mini"
            mock_settings.extraction_sibling_model = "openai/gpt-5.4-mini"
            mock_settings.extraction_sibling_fallback_model = (
                "google/gemini-3.1-flash-lite-preview"
            )
            mock_settings.extraction_sibling_fallback_model_2 = (
                "google/gemini-3-flash-preview"
            )
            mock_settings.extraction_judge_model = "z-ai/glm-5.1"
            mock_settings.extraction_judge_fallback_model = "minimax/minimax-m2.7"
            mock_settings.extraction_judge_fallback_model_2 = "moonshotai/kimi-k2.6"
            mock_settings.extraction_dual_enabled = dual_enabled
            mock_settings.validation_min_confidence = 0.70
            mock_settings.escalation_confidence_threshold = 0.80
            mock_settings.max_extraction_llm_cost_usd = 0.50
            mock_settings.raw_extraction_dump_enabled = raw_dump_enabled
            mock_settings.openrouter_api_key = "test-key"
            mock_settings.openrouter_base_url = "https://openrouter.ai/api/v1"

            result = run_gemini_extraction_task("ext-1")

        return result, mock_db, mock_storage, mock_orchestrator, mock_observer

    def test_observer_instantiated_with_extraction_id(self) -> None:
        mp_result = _make_mp_result()
        with (
            patch(
                "app.tasks.extraction._get_db_client",
                return_value=_make_db(
                    {"document_object_key": "k", "document_filename": "f.pdf"}
                ),
            ),
            patch("app.tasks.extraction.ObjectStorageService") as mock_storage_cls,
            patch("app.tasks.extraction.MultiPassOrchestrator") as mock_orch_cls,
            patch("app.tasks.extraction.ExtractionPipelineObserver") as mock_obs_cls,
            patch("app.tasks.extraction.update_extraction_status"),
            patch("app.tasks.extraction.settings") as s,
        ):
            mock_storage_cls.return_value.download_file.return_value = _MINIMAL_PDF
            mock_storage_cls.return_value.upload_extraction_artifact.return_value = "k"
            mock_orch_cls.return_value.run = AsyncMock(return_value=mp_result)
            mock_obs_cls.return_value.build_summary.return_value = {}
            for attr in [
                "pass1_model",
                "pass1_fallback_model",
                "pass1_fallback_model_2",
                "pass2_model",
                "pass2_fallback_model",
                "pass2_fallback_model_2",
                "pass3_model",
                "pass3_fallback_model",
                "pass3_fallback_model_2",
                "extraction_sibling_model",
                "extraction_sibling_fallback_model",
                "extraction_sibling_fallback_model_2",
                "extraction_judge_model",
                "extraction_judge_fallback_model",
                "extraction_judge_fallback_model_2",
            ]:
                setattr(s, attr, "test-model")
            s.extraction_dual_enabled = False
            s.validation_min_confidence = 0.70
            s.escalation_confidence_threshold = 0.80
            s.max_extraction_llm_cost_usd = 0.50
            s.raw_extraction_dump_enabled = False
            s.openrouter_api_key = "key"
            s.openrouter_base_url = "url"

            run_gemini_extraction_task("test-uuid-obs")

            mock_obs_cls.assert_called_once_with(
                extraction_id="test-uuid-obs", db=mock_obs_cls.call_args[1]["db"]
            )

    def test_cost_cents_written_to_db(self) -> None:
        mp_result = _make_mp_result(cost_cents=123)
        result, mock_db, *_ = self._run_task(mp_result, raw_dump_enabled=False)

        update_args = mock_db.table.return_value.update.call_args[0][0]
        assert update_args["extraction_cost_cents"] == 123

    def test_stage_summary_written_to_db(self) -> None:
        mp_result = _make_mp_result()
        result, mock_db, *_ = self._run_task(mp_result, raw_dump_enabled=False)

        update_args = mock_db.table.return_value.update.call_args[0][0]
        assert "stage_summary" in update_args
        assert update_args["stage_summary"]["final_stage"] == "pass1_extraction"

    def test_raw_artifact_keys_written_to_db_when_dump_enabled(self) -> None:
        mp_result = _make_mp_result(
            audit_trail={
                "raw_responses": ["raw text"],
                "retry_counts": [0],
                "validation_failures": [],
            }
        )
        result, mock_db, mock_storage, *_ = self._run_task(
            mp_result, raw_dump_enabled=True
        )

        mock_storage.upload_extraction_artifact.assert_called_once()
        update_args = mock_db.table.return_value.update.call_args[0][0]
        assert update_args["raw_extraction_object_keys"] is not None
        assert (
            "extractions/ext-1/raw/pass1-model.json"
            in update_args["raw_extraction_object_keys"]
        )

    def test_raw_keys_none_when_dump_disabled(self) -> None:
        mp_result = _make_mp_result()
        result, mock_db, mock_storage, *_ = self._run_task(
            mp_result, raw_dump_enabled=False
        )

        mock_storage.upload_extraction_artifact.assert_not_called()
        update_args = mock_db.table.return_value.update.call_args[0][0]
        assert update_args["raw_extraction_object_keys"] is None

    def test_raw_keys_none_when_no_raw_responses(self) -> None:
        mp_result = _make_mp_result(
            audit_trail={
                "raw_responses": [],
                "retry_counts": [],
                "validation_failures": [],
            }
        )
        result, mock_db, mock_storage, *_ = self._run_task(
            mp_result, raw_dump_enabled=True
        )

        update_args = mock_db.table.return_value.update.call_args[0][0]
        # Empty list → None (no point storing empty array)
        assert update_args["raw_extraction_object_keys"] is None

    def test_sentry_warning_on_cost_ceiling_hit(self) -> None:
        mp_result = _make_mp_result(cost_ceiling_hit=True)

        with patch("app.tasks.extraction.sentry_sdk") as mock_sentry:
            mock_sentry.set_tag = MagicMock()
            mock_sentry.capture_message = MagicMock()
            mock_sentry.add_breadcrumb = MagicMock()

            with (
                patch(
                    "app.tasks.extraction._get_db_client",
                    return_value=_make_db(
                        {"document_object_key": "k", "document_filename": "f.pdf"}
                    ),
                ),
                patch("app.tasks.extraction.ObjectStorageService") as mock_storage_cls,
                patch("app.tasks.extraction.MultiPassOrchestrator") as mock_orch_cls,
                patch(
                    "app.tasks.extraction.ExtractionPipelineObserver"
                ) as mock_obs_cls,
                patch("app.tasks.extraction.update_extraction_status"),
                patch("app.tasks.extraction.settings") as s,
            ):
                mock_storage_cls.return_value.download_file.return_value = _MINIMAL_PDF
                mock_storage_cls.return_value.upload_extraction_artifact.return_value = (
                    "k"
                )
                mock_orch_cls.return_value.run = AsyncMock(return_value=mp_result)
                mock_obs_cls.return_value.build_summary.return_value = {}
                for attr in [
                    "pass1_model",
                    "pass1_fallback_model",
                    "pass1_fallback_model_2",
                    "pass2_model",
                    "pass2_fallback_model",
                    "pass2_fallback_model_2",
                    "pass3_model",
                    "pass3_fallback_model",
                    "pass3_fallback_model_2",
                    "extraction_sibling_model",
                    "extraction_sibling_fallback_model",
                    "extraction_sibling_fallback_model_2",
                    "extraction_judge_model",
                    "extraction_judge_fallback_model",
                    "extraction_judge_fallback_model_2",
                ]:
                    setattr(s, attr, "test-model")
                s.extraction_dual_enabled = False
                s.validation_min_confidence = 0.70
                s.escalation_confidence_threshold = 0.80
                s.max_extraction_llm_cost_usd = 0.50
                s.raw_extraction_dump_enabled = False
                s.openrouter_api_key = "key"
                s.openrouter_base_url = "url"

                run_gemini_extraction_task("ext-cost-hit")

            mock_sentry.set_tag.assert_any_call("extraction.cost_ceiling_hit", "true")
            mock_sentry.capture_message.assert_called()
            call_args = mock_sentry.capture_message.call_args
            assert "cost ceiling" in call_args[0][0].lower()

    def test_sentry_warning_on_validation_failures(self) -> None:
        mp_result = _make_mp_result(
            audit_trail={
                "raw_responses": [],
                "retry_counts": [],
                "validation_failures": ["JSON parse failed on attempt 1"],
            }
        )

        with patch("app.tasks.extraction.sentry_sdk") as mock_sentry:
            mock_sentry.set_tag = MagicMock()
            mock_sentry.capture_message = MagicMock()
            mock_sentry.add_breadcrumb = MagicMock()

            with (
                patch(
                    "app.tasks.extraction._get_db_client",
                    return_value=_make_db(
                        {"document_object_key": "k", "document_filename": "f.pdf"}
                    ),
                ),
                patch("app.tasks.extraction.ObjectStorageService") as mock_storage_cls,
                patch("app.tasks.extraction.MultiPassOrchestrator") as mock_orch_cls,
                patch(
                    "app.tasks.extraction.ExtractionPipelineObserver"
                ) as mock_obs_cls,
                patch("app.tasks.extraction.update_extraction_status"),
                patch("app.tasks.extraction.settings") as s,
            ):
                mock_storage_cls.return_value.download_file.return_value = _MINIMAL_PDF
                mock_orch_cls.return_value.run = AsyncMock(return_value=mp_result)
                mock_obs_cls.return_value.build_summary.return_value = {}
                for attr in [
                    "pass1_model",
                    "pass1_fallback_model",
                    "pass1_fallback_model_2",
                    "pass2_model",
                    "pass2_fallback_model",
                    "pass2_fallback_model_2",
                    "pass3_model",
                    "pass3_fallback_model",
                    "pass3_fallback_model_2",
                    "extraction_sibling_model",
                    "extraction_sibling_fallback_model",
                    "extraction_sibling_fallback_model_2",
                    "extraction_judge_model",
                    "extraction_judge_fallback_model",
                    "extraction_judge_fallback_model_2",
                ]:
                    setattr(s, attr, "test-model")
                s.extraction_dual_enabled = False
                s.validation_min_confidence = 0.70
                s.escalation_confidence_threshold = 0.80
                s.max_extraction_llm_cost_usd = 0.50
                s.raw_extraction_dump_enabled = False
                s.openrouter_api_key = "key"
                s.openrouter_base_url = "url"

                run_gemini_extraction_task("ext-validation")

            calls = [str(c) for c in mock_sentry.capture_message.call_args_list]
            assert any("validation failure" in c.lower() for c in calls)

    def test_dual_config_wired_to_orchestrator(self) -> None:
        mp_result = _make_mp_result()

        with (
            patch(
                "app.tasks.extraction._get_db_client",
                return_value=_make_db(
                    {"document_object_key": "k", "document_filename": "f.pdf"}
                ),
            ),
            patch("app.tasks.extraction.ObjectStorageService") as mock_storage_cls,
            patch("app.tasks.extraction.MultiPassOrchestrator") as mock_orch_cls,
            patch("app.tasks.extraction.MultiPassConfig") as mock_config_cls,
            patch("app.tasks.extraction.ExtractionPipelineObserver") as mock_obs_cls,
            patch("app.tasks.extraction.update_extraction_status"),
            patch("app.tasks.extraction.settings") as s,
        ):
            mock_storage_cls.return_value.download_file.return_value = _MINIMAL_PDF
            mock_orch_cls.return_value.run = AsyncMock(return_value=mp_result)
            mock_obs_cls.return_value.build_summary.return_value = {}
            mock_config_cls.return_value = MagicMock()
            for attr in [
                "pass1_model",
                "pass1_fallback_model",
                "pass1_fallback_model_2",
                "pass2_model",
                "pass2_fallback_model",
                "pass2_fallback_model_2",
                "pass3_model",
                "pass3_fallback_model",
                "pass3_fallback_model_2",
                "extraction_sibling_model",
                "extraction_sibling_fallback_model",
                "extraction_sibling_fallback_model_2",
                "extraction_judge_model",
                "extraction_judge_fallback_model",
                "extraction_judge_fallback_model_2",
            ]:
                setattr(s, attr, "test-model")
            s.extraction_dual_enabled = True
            s.validation_min_confidence = 0.70
            s.escalation_confidence_threshold = 0.80
            s.max_extraction_llm_cost_usd = 0.50
            s.raw_extraction_dump_enabled = False
            s.openrouter_api_key = "key"
            s.openrouter_base_url = "url"

            run_gemini_extraction_task("ext-dual")

            config_kwargs = mock_config_cls.call_args[1]
            assert config_kwargs["dual_enabled"] is True
            assert config_kwargs["cost_ceiling_cents"] == 50  # int(0.50 * 100)
            assert "sibling_models" in config_kwargs
            assert "judge_models" in config_kwargs
            judge_model_class = config_kwargs["judge_model_class"]
            assert isinstance(judge_model_class, type)
            assert hasattr(judge_model_class, "model_validate")

    def test_observer_passed_to_orchestrator(self) -> None:
        mp_result = _make_mp_result()

        with (
            patch(
                "app.tasks.extraction._get_db_client",
                return_value=_make_db(
                    {"document_object_key": "k", "document_filename": "f.pdf"}
                ),
            ),
            patch("app.tasks.extraction.ObjectStorageService") as mock_storage_cls,
            patch("app.tasks.extraction.MultiPassOrchestrator") as mock_orch_cls,
            patch("app.tasks.extraction.ExtractionPipelineObserver") as mock_obs_cls,
            patch("app.tasks.extraction.update_extraction_status"),
            patch("app.tasks.extraction.settings") as s,
        ):
            mock_storage_cls.return_value.download_file.return_value = _MINIMAL_PDF
            mock_orch_cls.return_value.run = AsyncMock(return_value=mp_result)
            sentinel_observer = MagicMock()
            sentinel_observer.build_summary.return_value = {}
            mock_obs_cls.return_value = sentinel_observer
            for attr in [
                "pass1_model",
                "pass1_fallback_model",
                "pass1_fallback_model_2",
                "pass2_model",
                "pass2_fallback_model",
                "pass2_fallback_model_2",
                "pass3_model",
                "pass3_fallback_model",
                "pass3_fallback_model_2",
                "extraction_sibling_model",
                "extraction_sibling_fallback_model",
                "extraction_sibling_fallback_model_2",
                "extraction_judge_model",
                "extraction_judge_fallback_model",
                "extraction_judge_fallback_model_2",
            ]:
                setattr(s, attr, "test-model")
            s.extraction_dual_enabled = False
            s.validation_min_confidence = 0.70
            s.escalation_confidence_threshold = 0.80
            s.max_extraction_llm_cost_usd = 0.50
            s.raw_extraction_dump_enabled = False
            s.openrouter_api_key = "key"
            s.openrouter_base_url = "url"

            run_gemini_extraction_task("ext-obs-wired")

            # The orchestrator constructor must receive observer=sentinel_observer
            _, orch_kwargs = mock_orch_cls.call_args
            assert orch_kwargs.get("observer") is sentinel_observer


# ---------------------------------------------------------------------------
# _is_missing_column_error
# ---------------------------------------------------------------------------


class TestIsMissingColumnError:
    def test_returns_true_when_column_in_error_message(self) -> None:
        exc = Exception("column document_object_key does not exist")
        assert _is_missing_column_error(exc, "document_object_key") is True

    def test_returns_false_when_neither_column_nor_name_match(self) -> None:
        exc = Exception("connection timeout")
        assert _is_missing_column_error(exc, "document_object_key") is False

    def test_returns_false_when_column_present_but_name_missing(self) -> None:
        exc = Exception("column some_other_col does not exist")
        assert _is_missing_column_error(exc, "document_object_key") is False

    def test_returns_false_when_name_present_but_not_column(self) -> None:
        exc = Exception("table document_object_key missing")
        assert _is_missing_column_error(exc, "document_object_key") is False

    def test_case_insensitive(self) -> None:
        exc = Exception("COLUMN DOCUMENT_OBJECT_KEY MISSING")
        assert _is_missing_column_error(exc, "document_object_key") is True


# ---------------------------------------------------------------------------
# _fetch_document_reference — legacy column fallback
# ---------------------------------------------------------------------------


class TestFetchDocumentReference:
    def _make_db_two_queries(
        self,
        *,
        first_raises: Exception | None = None,
        first_data: dict | None = None,
        second_data: dict | None = None,
    ) -> MagicMock:
        """Mock DB that either raises on the first query or returns data."""
        db = MagicMock()
        chain = (
            db.table.return_value.select.return_value.eq.return_value.single.return_value
        )

        if first_raises is not None:
            chain.execute.side_effect = [
                first_raises,
                MagicMock(data=second_data or {}),
            ]
        else:
            chain.execute.return_value = MagicMock(data=first_data or {})
        return db

    def test_uses_new_column_when_available(self) -> None:
        db = self._make_db_two_queries(
            first_data={
                "document_object_key": "user/ext/file.pdf",
                "document_filename": "lease.pdf",
            }
        )
        key, filename = _fetch_document_reference(db, "ext-1")
        assert key == "user/ext/file.pdf"
        assert filename == "lease.pdf"

    def test_derives_filename_from_key_when_no_filename(self) -> None:
        db = self._make_db_two_queries(
            first_data={
                "document_object_key": "user/ext/lease.pdf",
                "document_filename": None,
            }
        )
        key, filename = _fetch_document_reference(db, "ext-1")
        assert filename == "lease.pdf"

    def test_falls_through_to_legacy_when_column_missing_error(self) -> None:
        missing_col_exc = Exception("column document_object_key does not exist")
        db = self._make_db_two_queries(
            first_raises=missing_col_exc,
            second_data={
                "document_s3_key": "legacy/key.pdf",
                "document_filename": "old.pdf",
            },
        )
        key, filename = _fetch_document_reference(db, "ext-1")
        assert key == "legacy/key.pdf"
        assert filename == "old.pdf"

    def test_re_raises_non_column_exception(self) -> None:
        network_exc = RuntimeError("DB connection refused")
        db = self._make_db_two_queries(first_raises=network_exc)

        with pytest.raises(RuntimeError, match="DB connection refused"):
            _fetch_document_reference(db, "ext-1")

    def test_raises_key_error_when_legacy_key_also_missing(self) -> None:
        missing_col_exc = Exception("column document_object_key does not exist")
        db = self._make_db_two_queries(
            first_raises=missing_col_exc,
            second_data={"document_s3_key": None, "document_filename": None},
        )

        with pytest.raises(KeyError):
            _fetch_document_reference(db, "ext-1")


# ---------------------------------------------------------------------------
# run_gemini_extraction_task — pass2_patch / pass3_overrides branches
# ---------------------------------------------------------------------------


class TestPassPatchAndOverrides:
    """Verify patch and overrides are included in the DB update when present."""

    def _run_with_patch_and_overrides(
        self, *, patch_data: dict | None, overrides: dict | None
    ) -> MagicMock:
        mp_result = _make_mp_result()
        mock_patch = MagicMock()
        mock_patch.model_dump.return_value = patch_data
        mp_result.patch = mock_patch if patch_data is not None else None
        mp_result.pass3_overrides = overrides

        mock_db = _make_db({"document_object_key": "k", "document_filename": "f.pdf"})
        with (
            patch("app.tasks.extraction._get_db_client", return_value=mock_db),
            patch("app.tasks.extraction.ObjectStorageService") as mock_storage_cls,
            patch("app.tasks.extraction.MultiPassOrchestrator") as mock_orch_cls,
            patch("app.tasks.extraction.ExtractionPipelineObserver") as mock_obs_cls,
            patch("app.tasks.extraction.update_extraction_status"),
            patch("app.tasks.extraction.settings") as s,
        ):
            mock_storage_cls.return_value.download_file.return_value = _MINIMAL_PDF
            mock_orch_cls.return_value.run = AsyncMock(return_value=mp_result)
            mock_obs_cls.return_value.build_summary.return_value = {}
            for attr in [
                "pass1_model",
                "pass1_fallback_model",
                "pass1_fallback_model_2",
                "pass2_model",
                "pass2_fallback_model",
                "pass2_fallback_model_2",
                "pass3_model",
                "pass3_fallback_model",
                "pass3_fallback_model_2",
                "extraction_sibling_model",
                "extraction_sibling_fallback_model",
                "extraction_sibling_fallback_model_2",
                "extraction_judge_model",
                "extraction_judge_fallback_model",
                "extraction_judge_fallback_model_2",
            ]:
                setattr(s, attr, "test-model")
            s.extraction_dual_enabled = False
            s.validation_min_confidence = 0.70
            s.escalation_confidence_threshold = 0.80
            s.max_extraction_llm_cost_usd = 0.50
            s.raw_extraction_dump_enabled = False
            s.openrouter_api_key = "key"
            s.openrouter_base_url = "url"

            run_gemini_extraction_task("ext-patch")

        return mock_db

    def test_pass2_patch_written_to_db_when_present(self) -> None:
        patch_data = {"field_corrections": {"rent": {"corrected": "5000"}}}
        mock_db = self._run_with_patch_and_overrides(
            patch_data=patch_data, overrides=None
        )
        update_args = mock_db.table.return_value.update.call_args[0][0]
        assert update_args["pass2_patch"] == patch_data

    def test_pass3_overrides_written_to_db_when_present(self) -> None:
        overrides = {"monthly_rent": "4500"}
        mock_db = self._run_with_patch_and_overrides(
            patch_data=None, overrides=overrides
        )
        update_args = mock_db.table.return_value.update.call_args[0][0]
        assert update_args["pass3_overrides"] == overrides

    def test_neither_written_when_both_none(self) -> None:
        mock_db = self._run_with_patch_and_overrides(patch_data=None, overrides=None)
        update_args = mock_db.table.return_value.update.call_args[0][0]
        assert "pass2_patch" not in update_args
        assert "pass3_overrides" not in update_args


# ---------------------------------------------------------------------------
# run_gemini_extraction_task — exception handler (lines 346-359)
# ---------------------------------------------------------------------------


class TestExceptionHandler:
    """Verify the except block calls on_pipeline_failure and re-raises."""

    def _run_with_orchestrator_error(self, error: Exception) -> MagicMock:
        """Run the task with an orchestrator that raises; return mock_on_failure."""
        mock_db = _make_db({"document_object_key": "k", "document_filename": "f.pdf"})
        with (
            patch("app.tasks.extraction._get_db_client", return_value=mock_db),
            patch("app.tasks.extraction.ObjectStorageService") as mock_storage_cls,
            patch("app.tasks.extraction.MultiPassOrchestrator") as mock_orch_cls,
            patch("app.tasks.extraction.ExtractionPipelineObserver") as mock_obs_cls,
            patch("app.tasks.extraction.update_extraction_status"),
            patch("app.tasks.extraction.on_pipeline_failure") as mock_on_failure,
            patch("app.tasks.extraction.settings") as s,
        ):
            mock_storage_cls.return_value.download_file.return_value = _MINIMAL_PDF
            mock_orch_cls.return_value.run = AsyncMock(side_effect=error)
            mock_obs_cls.return_value.build_summary.return_value = {}
            for attr in [
                "pass1_model",
                "pass1_fallback_model",
                "pass1_fallback_model_2",
                "pass2_model",
                "pass2_fallback_model",
                "pass2_fallback_model_2",
                "pass3_model",
                "pass3_fallback_model",
                "pass3_fallback_model_2",
                "extraction_sibling_model",
                "extraction_sibling_fallback_model",
                "extraction_sibling_fallback_model_2",
                "extraction_judge_model",
                "extraction_judge_fallback_model",
                "extraction_judge_fallback_model_2",
            ]:
                setattr(s, attr, "test-model")
            s.extraction_dual_enabled = False
            s.validation_min_confidence = 0.70
            s.escalation_confidence_threshold = 0.80
            s.max_extraction_llm_cost_usd = 0.50
            s.raw_extraction_dump_enabled = False
            s.openrouter_api_key = "key"
            s.openrouter_base_url = "url"

            # suppress the re-raise so we can assert on mock_on_failure
            try:
                run_gemini_extraction_task("ext-fail")
            except Exception:
                pass

            return mock_on_failure

    def test_value_error_uses_str_exc_as_message(self) -> None:
        error = ValueError("Field registry mismatch: 127 fields")
        mock_on_failure = self._run_with_orchestrator_error(error)
        mock_on_failure.assert_called_once()
        call_args = mock_on_failure.call_args[0]
        assert call_args[1] == "Field registry mismatch: 127 fields"

    def test_generic_exception_uses_generic_message(self) -> None:
        error = RuntimeError("OpenRouter 503")
        mock_on_failure = self._run_with_orchestrator_error(error)
        mock_on_failure.assert_called_once()
        call_args = mock_on_failure.call_args[0]
        assert "unable to extract" in call_args[1].lower()

    def test_exception_is_reraised(self) -> None:
        """The task must re-raise so Celery can retry and track failures."""
        mock_db = _make_db({"document_object_key": "k", "document_filename": "f.pdf"})
        with (
            patch("app.tasks.extraction._get_db_client", return_value=mock_db),
            patch("app.tasks.extraction.ObjectStorageService") as mock_storage_cls,
            patch("app.tasks.extraction.MultiPassOrchestrator") as mock_orch_cls,
            patch("app.tasks.extraction.ExtractionPipelineObserver") as mock_obs_cls,
            patch("app.tasks.extraction.update_extraction_status"),
            patch("app.tasks.extraction.on_pipeline_failure"),
            patch("app.tasks.extraction.settings") as s,
        ):
            mock_storage_cls.return_value.download_file.return_value = _MINIMAL_PDF
            mock_orch_cls.return_value.run = AsyncMock(
                side_effect=RuntimeError("must bubble up")
            )
            mock_obs_cls.return_value.build_summary.return_value = {}
            for attr in [
                "pass1_model",
                "pass1_fallback_model",
                "pass1_fallback_model_2",
                "pass2_model",
                "pass2_fallback_model",
                "pass2_fallback_model_2",
                "pass3_model",
                "pass3_fallback_model",
                "pass3_fallback_model_2",
                "extraction_sibling_model",
                "extraction_sibling_fallback_model",
                "extraction_sibling_fallback_model_2",
                "extraction_judge_model",
                "extraction_judge_fallback_model",
                "extraction_judge_fallback_model_2",
            ]:
                setattr(s, attr, "test-model")
            s.extraction_dual_enabled = False
            s.validation_min_confidence = 0.70
            s.escalation_confidence_threshold = 0.80
            s.max_extraction_llm_cost_usd = 0.50
            s.raw_extraction_dump_enabled = False
            s.openrouter_api_key = "key"
            s.openrouter_base_url = "url"

            with pytest.raises(RuntimeError, match="must bubble up"):
                run_gemini_extraction_task("ext-reraise")

    def test_should_retry_before_max_retries_when_not_direct(self) -> None:
        task = MagicMock()
        task.request.retries = 1
        task.request.called_directly = False
        task.max_retries = 2

        assert _should_retry_task(task) is True

    def test_should_not_retry_after_max_retries(self) -> None:
        task = MagicMock()
        task.request.retries = 2
        task.request.called_directly = False
        task.max_retries = 2

        assert _should_retry_task(task) is False


# ---------------------------------------------------------------------------
# client_factory closure coverage
# ---------------------------------------------------------------------------


class TestClientFactory:
    """Verify the client_factory closure is wired with the correct API credentials."""

    def test_client_factory_creates_openrouter_client_with_settings(self) -> None:
        mp_result = _make_mp_result()
        mock_db = _make_db({"document_object_key": "k", "document_filename": "f.pdf"})

        with (
            patch("app.tasks.extraction._get_db_client", return_value=mock_db),
            patch("app.tasks.extraction.ObjectStorageService") as mock_storage_cls,
            patch("app.tasks.extraction.MultiPassOrchestrator") as mock_orch_cls,
            patch("app.tasks.extraction.OpenRouterClient") as mock_client_cls,
            patch("app.tasks.extraction.ExtractionPipelineObserver") as mock_obs_cls,
            patch("app.tasks.extraction.update_extraction_status"),
            patch("app.tasks.extraction.settings") as s,
        ):
            mock_storage_cls.return_value.download_file.return_value = _MINIMAL_PDF
            mock_orch_cls.return_value.run = AsyncMock(return_value=mp_result)
            mock_obs_cls.return_value.build_summary.return_value = {}
            for attr in [
                "pass1_model",
                "pass1_fallback_model",
                "pass1_fallback_model_2",
                "pass2_model",
                "pass2_fallback_model",
                "pass2_fallback_model_2",
                "pass3_model",
                "pass3_fallback_model",
                "pass3_fallback_model_2",
                "extraction_sibling_model",
                "extraction_sibling_fallback_model",
                "extraction_sibling_fallback_model_2",
                "extraction_judge_model",
                "extraction_judge_fallback_model",
                "extraction_judge_fallback_model_2",
            ]:
                setattr(s, attr, "test-model")
            s.extraction_dual_enabled = False
            s.validation_min_confidence = 0.70
            s.escalation_confidence_threshold = 0.80
            s.max_extraction_llm_cost_usd = 0.50
            s.raw_extraction_dump_enabled = False
            s.openrouter_api_key = "test-api-key"
            s.openrouter_base_url = "https://openrouter.ai/api/v1"

            run_gemini_extraction_task("ext-factory")

            # The orchestrator receives client_factory as the second positional arg.
            # Extract it and invoke it to exercise the closure body.
            orch_call_args = mock_orch_cls.call_args[0]
            factory_fn = orch_call_args[1]  # second positional: client_factory
            factory_fn("google/gemini-3-flash-preview")

            mock_client_cls.assert_called_once_with(
                api_key="test-api-key",
                model="google/gemini-3-flash-preview",
                base_url="https://openrouter.ai/api/v1",
            )
