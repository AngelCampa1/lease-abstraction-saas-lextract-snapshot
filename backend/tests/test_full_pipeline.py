"""Tests for full pipeline integration: extraction, scoring, red flags.

Verifies the 4-task Gemini-native chain and its individual components work
end-to-end with mocked external boundaries (object storage, orchestrator, DB).
"""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.enums import ExtractionStatus
from app.tasks._helpers import PipelineStoppedError

# Minimal valid PDF bytes for pypdf page-count
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


@pytest.fixture(autouse=True)
def _mock_settings():
    """Provide mocked settings for extraction tests."""
    with patch("app.tasks.extraction.settings") as mock_settings:
        mock_settings.openrouter_api_key = "test-key"
        mock_settings.openrouter_base_url = "https://openrouter.ai/api/v1"
        mock_settings.pass1_model = "test/model-1"
        mock_settings.pass1_fallback_model = "test/model-1b"
        mock_settings.pass1_fallback_model_2 = "test/model-1c"
        mock_settings.pass2_model = "test/model-2"
        mock_settings.pass2_fallback_model = "test/model-2b"
        mock_settings.pass2_fallback_model_2 = "test/model-2c"
        mock_settings.pass3_model = "test/model-3"
        mock_settings.pass3_fallback_model = "test/model-3b"
        mock_settings.pass3_fallback_model_2 = "test/model-3c"
        mock_settings.validation_min_confidence = 0.70
        mock_settings.escalation_confidence_threshold = 0.80
        yield mock_settings


def _make_mock_db(record_data: dict[str, Any]) -> MagicMock:
    """Build a mock DB client that returns record_data on .single()."""
    mock_db = MagicMock()
    mock_response = MagicMock()
    mock_response.data = record_data

    (
        mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value
    ) = mock_response

    mock_db.table.return_value.update.return_value.eq.return_value.execute = MagicMock()
    return mock_db


# ---------------------------------------------------------------------------
# Pipeline chain tests
# ---------------------------------------------------------------------------


class TestNewPipelineChain:
    """Tests that the pipeline chain is wired correctly for the Gemini path."""

    def test_new_chain_has_4_tasks(self) -> None:
        """Pipeline chain: run_gemini_extraction -> score -> red_flags -> complete."""
        from app.tasks.pipeline import run_extraction_pipeline

        with (
            patch("app.tasks.pipeline.run_gemini_extraction_task") as mock_extract,
            patch("app.tasks.pipeline.score_confidence_task") as mock_score,
            patch("app.tasks.pipeline.run_red_flags_task") as mock_flags,
            patch("app.tasks.pipeline.mark_extraction_complete") as mock_complete,
        ):
            for m in [mock_extract, mock_score, mock_flags, mock_complete]:
                m.si.return_value = MagicMock()

            with patch("app.tasks.pipeline.chain") as mock_chain:
                mock_chain.return_value.apply_async = MagicMock()
                run_extraction_pipeline("ext-123")

                mock_chain.assert_called_once()
                chain_args = mock_chain.call_args[0]
                assert len(chain_args) == 4

    def test_placeholder_extraction_removed(self) -> None:
        """placeholder_extraction should no longer exist in pipeline module."""
        import app.tasks.pipeline as pipeline_mod

        assert not hasattr(pipeline_mod, "placeholder_extraction")

    def test_gap_filler_removed_from_pipeline(self) -> None:
        """run_gap_filler_task import must be gone from pipeline module."""
        import app.tasks.pipeline as pipeline_mod

        assert not hasattr(pipeline_mod, "run_gap_filler_task")

    def test_textract_parser_not_imported(self) -> None:
        """TextractResultParser must not be imported in pipeline module."""
        import inspect

        import app.tasks.pipeline as pipeline_mod

        source = inspect.getsource(pipeline_mod)
        assert "TextractResultParser" not in source


# ---------------------------------------------------------------------------
# Extraction task tests
# ---------------------------------------------------------------------------


class TestRunGeminiExtractionTaskIntegration:
    """Integration tests for run_gemini_extraction_task."""

    def test_reads_document_object_key_from_db(self) -> None:
        """Task reads document_object_key from extractions table."""
        from app.tasks.extraction import run_gemini_extraction_task

        mock_db = _make_mock_db(
            {
                "document_object_key": "user/ext/original.pdf",
                "document_filename": "lease.pdf",
            }
        )

        mock_object_storage = MagicMock()
        mock_object_storage.download_file.return_value = _MINIMAL_PDF

        mock_fv = MagicMock()
        mock_fv.value = "Acme Corp"
        mock_fv.confidence = 0.95
        mock_fv.source_text = "Acme Corp"

        mock_mp_result = MagicMock()
        mock_mp_result.extraction = MagicMock()
        mock_mp_result.extraction.fields = {"tenant_name": mock_fv}
        mock_mp_result.pass_records = []
        mock_mp_result.total_tokens = 0
        mock_mp_result.patch = None
        mock_mp_result.pass3_overrides = None

        mock_orchestrator = MagicMock()
        mock_orchestrator.run = AsyncMock(return_value=mock_mp_result)

        with (
            patch("app.tasks.extraction._get_db_client", return_value=mock_db),
            patch(
                "app.tasks.extraction.ObjectStorageService",
                return_value=mock_object_storage,
            ),
            patch(
                "app.tasks.extraction.MultiPassOrchestrator",
                return_value=mock_orchestrator,
            ),
            patch("app.tasks.extraction.update_extraction_status"),
        ):
            result = run_gemini_extraction_task("ext-123")

        assert result["extraction_id"] == "ext-123"
        mock_db.table.assert_any_call("extractions")
        mock_object_storage.download_file.assert_called_once_with(
            "user/ext/original.pdf"
        )

    def test_writes_extracted_data_to_db(self) -> None:
        """Task writes extracted_data, tokens, and page_count to DB."""
        from app.tasks.extraction import run_gemini_extraction_task

        mock_db = _make_mock_db(
            {
                "document_object_key": "user/ext/original.pdf",
                "document_filename": "lease.pdf",
            }
        )

        mock_object_storage = MagicMock()
        mock_object_storage.download_file.return_value = _MINIMAL_PDF

        mock_fv = MagicMock()
        mock_fv.value = "Acme Corp"
        mock_fv.confidence = 0.95
        mock_fv.source_text = "Acme Corp"

        mock_pass_record = MagicMock()
        mock_pass_record.input_tokens = 100
        mock_pass_record.output_tokens = 200
        mock_pass_record.model_dump.return_value = {"pass_number": 1}

        mock_mp_result = MagicMock()
        mock_mp_result.extraction = MagicMock()
        mock_mp_result.extraction.fields = {"tenant_name": mock_fv}
        mock_mp_result.pass_records = [mock_pass_record]
        mock_mp_result.total_tokens = 300
        mock_mp_result.patch = None
        mock_mp_result.pass3_overrides = None

        mock_orchestrator = MagicMock()
        mock_orchestrator.run = AsyncMock(return_value=mock_mp_result)

        with (
            patch("app.tasks.extraction._get_db_client", return_value=mock_db),
            patch(
                "app.tasks.extraction.ObjectStorageService",
                return_value=mock_object_storage,
            ),
            patch(
                "app.tasks.extraction.MultiPassOrchestrator",
                return_value=mock_orchestrator,
            ),
            patch("app.tasks.extraction.update_extraction_status"),
        ):
            result = run_gemini_extraction_task("ext-123")

        assert result["field_count"] == 1
        update_call = mock_db.table.return_value.update
        update_args = update_call.call_args[0][0]
        assert "extracted_data" in update_args
        assert "tenant_name" in update_args["extracted_data"]
        assert "document_page_count" in update_args

    def test_failure_marks_extraction_failed(self) -> None:
        """On exception, task calls on_pipeline_failure."""
        from app.tasks.extraction import run_gemini_extraction_task

        mock_db = MagicMock()
        mock_db.table.side_effect = RuntimeError("DB exploded")

        with (
            patch("app.tasks.extraction._get_db_client", return_value=mock_db),
            patch("app.tasks.extraction.on_pipeline_failure") as mock_fail,
        ):
            with pytest.raises(RuntimeError, match="DB exploded"):
                run_gemini_extraction_task("ext-123")

            mock_fail.assert_called_once()

    def test_transitions_status_to_scoring(self) -> None:
        """After successful extraction, status transitions to SCORING."""
        from app.tasks.extraction import run_gemini_extraction_task

        mock_db = _make_mock_db(
            {
                "document_object_key": "user/ext/original.pdf",
                "document_filename": "lease.pdf",
            }
        )

        mock_object_storage = MagicMock()
        mock_object_storage.download_file.return_value = _MINIMAL_PDF

        mock_fv = MagicMock()
        mock_fv.value = "123 Main St"
        mock_fv.confidence = 0.9
        mock_fv.source_text = "at 123 Main St"

        mock_pass_record = MagicMock()
        mock_pass_record.input_tokens = 100
        mock_pass_record.output_tokens = 200
        mock_pass_record.model_dump.return_value = {"pass_number": 1}

        mock_mp_result = MagicMock()
        mock_mp_result.extraction = MagicMock()
        mock_mp_result.extraction.fields = {"property_address": mock_fv}
        mock_mp_result.pass_records = [mock_pass_record]
        mock_mp_result.total_tokens = 300
        mock_mp_result.patch = None
        mock_mp_result.pass3_overrides = None

        mock_orchestrator = MagicMock()
        mock_orchestrator.run = AsyncMock(return_value=mock_mp_result)

        with (
            patch("app.tasks.extraction._get_db_client", return_value=mock_db),
            patch(
                "app.tasks.extraction.ObjectStorageService",
                return_value=mock_object_storage,
            ),
            patch(
                "app.tasks.extraction.MultiPassOrchestrator",
                return_value=mock_orchestrator,
            ),
            patch("app.tasks.extraction.update_extraction_status") as mock_status,
        ):
            result = run_gemini_extraction_task("ext-status")

        assert result["status"] == "scoring"
        calls = mock_status.call_args_list
        final_call = calls[-1][0]
        assert final_call[0] == "ext-status"
        assert final_call[1] == ExtractionStatus.SCORING


# ---------------------------------------------------------------------------
# Confidence scoring task tests
# ---------------------------------------------------------------------------


class TestScoreConfidenceTask:
    """Tests for score_confidence_task."""

    def test_reads_extracted_data_and_scores(self) -> None:
        """Task reads extracted_data from DB, scores fields, writes back."""
        from app.tasks.scoring import score_confidence_task

        mock_db = _make_mock_db(
            {
                "extracted_data": {
                    "tenant_name": {
                        "value": "Acme",
                        "confidence": 0.95,
                        "source_text": "Acme",
                    }
                },
            }
        )

        mock_field_score = MagicMock()
        mock_field_score.to_dict.return_value = {
            "score": 0.92,
            "tier": "high",
        }

        mock_overall = {
            "overall_score": 0.92,
            "tier": "high",
            "needs_review": False,
            "low_confidence_fields": [],
        }

        with (
            patch("app.tasks.scoring._get_db_client", return_value=mock_db),
            patch(
                "app.tasks.scoring.score_confidence",
                return_value={"tenant_name": mock_field_score},
            ) as mock_score_fn,
            patch(
                "app.tasks.scoring.score_overall_confidence",
                return_value=mock_overall,
            ),
            patch(
                "app.tasks.scoring.build_lextract_registry",
                return_value=MagicMock(),
            ),
        ):
            result = score_confidence_task("ext-123")

        assert result["extraction_id"] == "ext-123"
        assert result["field_count"] == 1
        mock_score_fn.assert_called_once()

    def test_confidence_sourced_from_extracted_data_not_ocr_metadata(self) -> None:
        """score_confidence is called WITHOUT ocr_confidences â€” LLM only."""
        from app.tasks.scoring import score_confidence_task

        mock_db = _make_mock_db(
            {
                "extracted_data": {
                    "base_rent_monthly": {
                        "value": 5000,
                        "confidence": 0.91,
                        "source_text": "$5,000/month",
                    }
                },
            }
        )

        mock_field_score = MagicMock()
        mock_field_score.to_dict.return_value = {"score": 0.91, "tier": "high"}

        mock_overall = {"overall_score": 0.91, "tier": "high", "needs_review": False}

        with (
            patch("app.tasks.scoring._get_db_client", return_value=mock_db),
            patch(
                "app.tasks.scoring.score_confidence",
                return_value={"base_rent_monthly": mock_field_score},
            ) as mock_score_fn,
            patch(
                "app.tasks.scoring.score_overall_confidence",
                return_value=mock_overall,
            ),
            patch(
                "app.tasks.scoring.build_lextract_registry",
                return_value=MagicMock(),
            ),
        ):
            score_confidence_task("ext-ocr-check")

        # score_confidence should be called with (result, registry) â€” NOT
        # with a third ocr_confidences argument
        call_args = mock_score_fn.call_args
        assert len(call_args[0]) == 2, (
            "score_confidence must be called with exactly 2 positional args "
            "(result, registry) â€” ocr_confidences was removed"
        )

    def test_db_select_does_not_include_ocr_metadata(self) -> None:
        """score_confidence_task must NOT select ocr_metadata from DB."""
        from app.tasks.scoring import score_confidence_task

        mock_db = _make_mock_db({"extracted_data": {}})

        with (
            patch("app.tasks.scoring._get_db_client", return_value=mock_db),
            patch("app.tasks.scoring.score_confidence", return_value={}),
            patch(
                "app.tasks.scoring.score_overall_confidence",
                return_value={"overall_score": 0.0, "tier": "low"},
            ),
            patch(
                "app.tasks.scoring.build_lextract_registry", return_value=MagicMock()
            ),
        ):
            score_confidence_task("ext-no-ocr")

        select_call = mock_db.table.return_value.select
        select_args = select_call.call_args[0][0]
        assert "ocr_metadata" not in select_args

    def test_writes_confidence_scores_to_db(self) -> None:
        """Task writes confidence_scores and overall_confidence to DB."""
        from app.tasks.scoring import score_confidence_task

        mock_db = _make_mock_db(
            {
                "extracted_data": {
                    "tenant_name": {
                        "value": "Acme",
                        "confidence": 0.95,
                        "source_text": "Acme",
                    }
                },
            }
        )

        mock_field_score = MagicMock()
        mock_field_score.to_dict.return_value = {"score": 0.92, "tier": "high"}

        mock_overall = {
            "overall_score": 0.92,
            "tier": "high",
            "needs_review": False,
            "low_confidence_fields": [],
        }

        with (
            patch("app.tasks.scoring._get_db_client", return_value=mock_db),
            patch(
                "app.tasks.scoring.score_confidence",
                return_value={"tenant_name": mock_field_score},
            ),
            patch(
                "app.tasks.scoring.score_overall_confidence",
                return_value=mock_overall,
            ),
            patch(
                "app.tasks.scoring.build_lextract_registry", return_value=MagicMock()
            ),
        ):
            score_confidence_task("ext-123")

        update_call = mock_db.table.return_value.update
        update_call.assert_called()
        update_args = update_call.call_args[0][0]
        assert "confidence_scores" in update_args
        assert "overall_confidence" in update_args
        assert update_args["overall_confidence"] == 0.92

    def test_failure_marks_extraction_failed(self) -> None:
        """On error, scoring calls on_pipeline_failure."""
        from app.tasks.scoring import score_confidence_task

        mock_db = MagicMock()
        mock_db.table.side_effect = RuntimeError("DB down")

        with (
            patch("app.tasks.scoring._get_db_client", return_value=mock_db),
            patch("app.tasks.scoring.on_pipeline_failure") as mock_fail,
        ):
            with pytest.raises(RuntimeError, match="DB down"):
                score_confidence_task("ext-123")

            mock_fail.assert_called_once()

    def test_cancelled_extraction_does_not_write_confidence_scores(self) -> None:
        """Scoring must stop without writes once cancellation is persisted."""
        from app.tasks.scoring import score_confidence_task

        mock_db = _make_mock_db(
            {
                "status": "failed",
                "error_message": "Processing cancelled by user",
            }
        )

        with (
            patch("app.tasks.scoring._get_db_client", return_value=mock_db),
            patch("app.tasks.scoring.on_pipeline_failure") as mock_fail,
        ):
            with pytest.raises(PipelineStoppedError):
                score_confidence_task("ext-cancelled")

        mock_db.table.return_value.update.assert_not_called()
        mock_fail.assert_not_called()

    def test_late_cancelled_extraction_does_not_write_confidence_scores(self) -> None:
        """A cancellation between scoring guard and write must stop the task."""
        from app.tasks.scoring import score_confidence_task

        mock_db = _make_mock_db(
            {
                "status": "scoring",
                "error_message": None,
                "extracted_data": {
                    "tenant_name": {
                        "value": "Acme",
                        "confidence": 0.95,
                        "source_text": "Acme",
                    }
                },
            }
        )
        update_query = mock_db.table.return_value.update.return_value
        update_query.eq.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
            data=[]
        )
        mock_field_score = MagicMock()
        mock_field_score.to_dict.return_value = {"score": 0.92, "tier": "high"}

        with (
            patch("app.tasks.scoring._get_db_client", return_value=mock_db),
            patch(
                "app.tasks.scoring.score_confidence",
                return_value={"tenant_name": mock_field_score},
            ),
            patch(
                "app.tasks.scoring.score_overall_confidence",
                return_value={"overall_score": 0.92},
            ),
            patch(
                "app.tasks.scoring.build_lextract_registry", return_value=MagicMock()
            ),
            patch("app.tasks.scoring.on_pipeline_failure") as mock_fail,
        ):
            with pytest.raises(PipelineStoppedError):
                score_confidence_task("ext-late-cancelled")

        mock_fail.assert_not_called()

    def test_non_dict_field_is_skipped_with_warning(self) -> None:
        """Non-dict field entries are skipped gracefully during confidence scoring."""
        from app.tasks.scoring import score_confidence_task

        mock_db = _make_mock_db(
            {
                "status": "scoring",
                "error_message": None,
                "extracted_data": {
                    "tenant_name": {
                        "value": "Acme",
                        "confidence": 0.9,
                        "source_text": "Acme Corp",
                    },
                    "bad_field": "not-a-dict",  # non-dict — should be skipped
                },
            }
        )
        mock_field_score = MagicMock()
        mock_field_score.to_dict.return_value = {"score": 0.9, "tier": "high"}
        mock_overall = {
            "overall_score": 0.9,
            "tier": "high",
            "needs_review": False,
            "low_confidence_fields": [],
        }

        with (
            patch("app.tasks.scoring._get_db_client", return_value=mock_db),
            patch(
                "app.tasks.scoring.score_confidence",
                return_value={"tenant_name": mock_field_score},
            ),
            patch(
                "app.tasks.scoring.score_overall_confidence",
                return_value=mock_overall,
            ),
            patch(
                "app.tasks.scoring.build_lextract_registry", return_value=MagicMock()
            ),
        ):
            result = score_confidence_task("ext-non-dict")

        assert result["field_count"] == 1

    def test_handles_empty_extracted_data(self) -> None:
        """When extracted_data is empty/None, scoring handles gracefully."""
        from app.tasks.scoring import score_confidence_task

        mock_db = _make_mock_db({"extracted_data": None})

        mock_overall = {
            "overall_score": 0.0,
            "tier": "low",
            "needs_review": True,
            "low_confidence_fields": [],
        }

        with (
            patch("app.tasks.scoring._get_db_client", return_value=mock_db),
            patch("app.tasks.scoring.score_confidence", return_value={}),
            patch(
                "app.tasks.scoring.score_overall_confidence", return_value=mock_overall
            ),
            patch(
                "app.tasks.scoring.build_lextract_registry", return_value=MagicMock()
            ),
        ):
            result = score_confidence_task("ext-123")
            assert result["field_count"] == 0


# ---------------------------------------------------------------------------
# Red flags task tests
# ---------------------------------------------------------------------------


class TestRunRedFlagsTask:
    """Tests for run_red_flags_task."""

    def test_non_fatal_does_not_raise(self) -> None:
        """Red flag task never propagates exceptions."""
        from app.tasks.scoring import run_red_flags_task

        mock_db = MagicMock()
        mock_db.table.side_effect = RuntimeError("DB on fire")

        with patch("app.tasks.scoring._get_db_client", return_value=mock_db):
            result = run_red_flags_task("ext-123")
            assert result["extraction_id"] == "ext-123"
            assert "error" in result

    def test_writes_red_flags_to_db(self) -> None:
        """Task writes red_flags and show_camaudit to DB."""
        from app.tasks.scoring import run_red_flags_task

        mock_db = _make_mock_db(
            {
                "extracted_data": {
                    "management_fee_cap": {"value": 20.0},
                    "audit_rights": {"value": False},
                },
                "confidence_scores": {
                    "management_fee_cap": {"score": 0.9},
                },
            }
        )

        mock_flag = MagicMock()
        mock_flag.to_dict.return_value = {
            "rule_id": "RF-001",
            "name": "Excessive Management Fee",
            "severity": "high",
            "description": "Fee too high",
            "triggered_value": "20%",
        }

        with (
            patch("app.tasks.scoring._get_db_client", return_value=mock_db),
            patch("app.tasks.scoring.detect_red_flags", return_value=[mock_flag]),
            patch("app.tasks.scoring.should_show_camaudit", return_value=True),
        ):
            result = run_red_flags_task("ext-123")

        assert result["flag_count"] == 1
        assert result["show_camaudit"] is True

        update_args = mock_db.table.return_value.update.call_args[0][0]
        assert "red_flags" in update_args
        assert "show_camaudit" in update_args

    def test_returns_gracefully_on_db_write_failure(self) -> None:
        """If DB write fails during red flags, task still does not raise."""
        from app.tasks.scoring import run_red_flags_task

        mock_db = _make_mock_db({"extracted_data": {}, "confidence_scores": {}})
        update_query = mock_db.table.return_value.update.return_value
        update_query.eq.return_value.eq.return_value.is_.return_value.execute.side_effect = RuntimeError(
            "Write failed"
        )

        with (
            patch("app.tasks.scoring._get_db_client", return_value=mock_db),
            patch("app.tasks.scoring.detect_red_flags", return_value=[]),
            patch("app.tasks.scoring.should_show_camaudit", return_value=False),
        ):
            result = run_red_flags_task("ext-123")
            assert "error" in result

    def test_cancelled_extraction_does_not_write_red_flags(self) -> None:
        """Red flag detection must not continue a cancelled extraction."""
        from app.tasks.scoring import run_red_flags_task

        mock_db = _make_mock_db(
            {
                "status": "failed",
                "error_message": "Processing cancelled by user",
            }
        )

        with patch("app.tasks.scoring._get_db_client", return_value=mock_db):
            with pytest.raises(PipelineStoppedError):
                run_red_flags_task("ext-cancelled")

        mock_db.table.return_value.update.assert_not_called()

    def test_non_dict_field_is_skipped_with_warning_in_red_flags(self) -> None:
        """Non-dict fields in extracted_data emit a warning and are skipped."""
        from app.tasks.scoring import run_red_flags_task

        mock_db = _make_mock_db(
            {
                "status": "scoring",
                "error_message": None,
                "extracted_data": {
                    "management_fee_cap": {"value": 10.0},
                    "bad_legacy_field": "plain-string",  # non-dict — triggers warning
                },
                "confidence_scores": {},
            }
        )

        with (
            patch("app.tasks.scoring._get_db_client", return_value=mock_db),
            patch("app.tasks.scoring.detect_red_flags", return_value=[]),
            patch("app.tasks.scoring.should_show_camaudit", return_value=False),
        ):
            result = run_red_flags_task("ext-non-dict-flags")

        assert result["flag_count"] == 0

    def test_late_cancelled_extraction_does_not_write_red_flags(self) -> None:
        """A cancellation between red-flag guard and write must stop the task."""
        from app.tasks.scoring import run_red_flags_task

        mock_db = _make_mock_db(
            {
                "status": "scoring",
                "error_message": None,
                "extracted_data": {
                    "management_fee_cap": {"value": 20.0},
                    "audit_rights": {"value": False},
                },
                "confidence_scores": {"management_fee_cap": {"score": 0.9}},
            }
        )
        update_query = mock_db.table.return_value.update.return_value
        update_query.eq.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
            data=[]
        )

        with (
            patch("app.tasks.scoring._get_db_client", return_value=mock_db),
            patch("app.tasks.scoring.detect_red_flags", return_value=[]),
            patch("app.tasks.scoring.should_show_camaudit", return_value=False),
        ):
            with pytest.raises(PipelineStoppedError):
                run_red_flags_task("ext-late-cancelled")


# ---------------------------------------------------------------------------
# Helpers module tests
# ---------------------------------------------------------------------------


class TestPipelineHelpers:
    """Tests for shared helper module."""

    def test_on_pipeline_failure_marks_failed(self) -> None:
        from app.tasks._helpers import on_pipeline_failure

        with patch("app.tasks._helpers.update_extraction_status") as mock_status:
            on_pipeline_failure("ext-123", "Something broke")
            mock_status.assert_called_once()

    def test_on_pipeline_failure_handles_invalid_transition(self) -> None:
        from app.core.status import InvalidStatusTransitionError
        from app.tasks._helpers import on_pipeline_failure

        with patch(
            "app.tasks._helpers.update_extraction_status",
            side_effect=InvalidStatusTransitionError(
                ExtractionStatus.COMPLETE, ExtractionStatus.FAILED
            ),
        ):
            on_pipeline_failure("ext-123", "Already done")

    def test_on_pipeline_failure_handles_unexpected_error(self) -> None:
        from app.tasks._helpers import on_pipeline_failure

        with patch(
            "app.tasks._helpers.update_extraction_status",
            side_effect=RuntimeError("Unexpected"),
        ):
            on_pipeline_failure("ext-123", "Some error")

    def test_get_db_client_returns_admin_client(self) -> None:
        from app.tasks._helpers import _get_db_client

        mock_admin = MagicMock()
        with patch("app.database.client.get_db_admin", return_value=mock_admin):
            result = _get_db_client()
            assert result is mock_admin

    def test_raise_if_pipeline_stopped_allows_active_status(self) -> None:
        from app.tasks._helpers import raise_if_pipeline_stopped

        mock_db = _make_mock_db({"status": "scoring", "error_message": None})

        raise_if_pipeline_stopped(mock_db, "ext-active")

    def test_raise_if_pipeline_stopped_rejects_cancelled_status(self) -> None:
        from app.tasks._helpers import raise_if_pipeline_stopped

        mock_db = _make_mock_db(
            {
                "status": "failed",
                "error_message": "Processing cancelled by user",
            }
        )

        with pytest.raises(PipelineStoppedError, match="cancelled"):
            raise_if_pipeline_stopped(mock_db, "ext-cancelled")

    def test_raise_if_pipeline_stopped_rejects_complete_status(self) -> None:
        from app.tasks._helpers import raise_if_pipeline_stopped

        mock_db = _make_mock_db({"status": "complete", "error_message": None})

        with pytest.raises(PipelineStoppedError, match="already terminal"):
            raise_if_pipeline_stopped(mock_db, "ext-complete")

    def test_raise_if_pipeline_stopped_rejects_deleted_active_row(self) -> None:
        from app.tasks._helpers import raise_if_pipeline_stopped

        mock_db = _make_mock_db(
            {
                "status": "extracting",
                "error_message": None,
                "deleted_at": "2026-05-19T14:20:00+00:00",
            }
        )

        with pytest.raises(PipelineStoppedError, match="deleted"):
            raise_if_pipeline_stopped(mock_db, "ext-deleted")

    def test_update_extraction_if_status_matches_stamps_updated_at(self) -> None:
        from datetime import UTC, datetime

        from app.tasks._helpers import update_extraction_if_status_matches

        mock_db = MagicMock()
        update_query = mock_db.table.return_value.update.return_value
        update_query.eq.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
            data=[{"id": "ext-1"}]
        )

        original_payload = {"confidence_scores": {"a": 1}}
        before = datetime.now(UTC)
        update_extraction_if_status_matches(
            mock_db,
            "ext-1",
            original_payload,
            ExtractionStatus.SCORING,
        )
        after = datetime.now(UTC)

        written = mock_db.table.return_value.update.call_args.args[0]
        assert "updated_at" in written
        stamped = datetime.fromisoformat(written["updated_at"])
        assert before <= stamped <= after
        # Caller's dict must not be mutated.
        assert "updated_at" not in original_payload
        assert written["confidence_scores"] == {"a": 1}

    def test_update_extraction_if_status_matches_raises_on_cas_miss(self) -> None:
        from app.tasks._helpers import update_extraction_if_status_matches

        mock_db = MagicMock()
        update_query = mock_db.table.return_value.update.return_value
        update_query.eq.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
            data=[]
        )

        with pytest.raises(PipelineStoppedError, match="changed status"):
            update_extraction_if_status_matches(
                mock_db,
                "ext-cancelled",
                {"confidence_scores": {}},
                ExtractionStatus.SCORING,
            )

    def test_update_extraction_if_status_matches_requires_not_deleted(self) -> None:
        from app.tasks._helpers import update_extraction_if_status_matches

        mock_db = MagicMock()
        update_query = mock_db.table.return_value.update.return_value
        update_query.eq.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
            data=[]
        )

        with pytest.raises(PipelineStoppedError, match="changed status"):
            update_extraction_if_status_matches(
                mock_db,
                "ext-deleted",
                {"confidence_scores": {}},
                ExtractionStatus.SCORING,
            )


# ---------------------------------------------------------------------------
# mark_extraction_complete retry idempotency
# ---------------------------------------------------------------------------


class TestMarkExtractionCompleteRetryIdempotency:
    """mark_extraction_complete must not re-dispatch emails on a task retry.

    The task is ``max_retries=2``. ``update_extraction_status`` is idempotent
    (silently returns when already complete), but the email-dispatch block runs
    after it. If a retry occurs after a prior attempt already flipped the row to
    complete, emails would re-send. Dispatch must be gated on whether THIS call
    performed the complete transition.
    """

    @staticmethod
    def _make_status_db(prior_status: str, *, user_id: str | None) -> MagicMock:
        """Build a DB mock whose extractions row reports ``prior_status``."""
        db = MagicMock()
        record = MagicMock()
        record.data = {
            "status": prior_status,
            "user_id": user_id,
            "notify_email": None,
            "anonymous_session_id": None,
            "document_filename": "lease.pdf",
        }
        (
            db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value
        ) = record
        return db

    def test_retry_after_complete_does_not_redispatch_email(self) -> None:
        """When the row is already complete (a retry), emails are NOT re-sent."""
        from app.tasks.pipeline import mark_extraction_complete

        db = self._make_status_db("complete", user_id="user-abc")
        mock_complete_email = MagicMock()
        mock_flags_email = MagicMock()

        with (
            patch("app.tasks.pipeline.update_extraction_status") as mock_status,
            patch("app.tasks.pipeline._get_db_client", return_value=db),
            patch(
                "app.tasks.email.send_extraction_complete_email",
                mock_complete_email,
            ),
            patch("app.tasks.email.send_cam_flags_email", mock_flags_email),
            patch("app.tasks.pipeline._send_anonymous_notify_email") as mock_notify,
        ):
            # Row already complete: the idempotent helper performs no transition.
            mock_status.return_value = False
            result = mark_extraction_complete("ext-retry")

        assert result["status"] == "complete"
        # Idempotent status helper is still invoked (no-op).
        mock_status.assert_called_once()
        # But no email tasks are re-dispatched on the retry.
        mock_complete_email.delay.assert_not_called()
        mock_flags_email.apply_async.assert_not_called()
        mock_notify.assert_not_called()

    def test_first_completion_dispatches_email(self) -> None:
        """When the row was not yet complete, this call dispatches emails."""
        from app.tasks.pipeline import mark_extraction_complete

        db = self._make_status_db("scoring", user_id="user-abc")
        mock_complete_email = MagicMock()
        mock_flags_email = MagicMock()

        with (
            patch(
                "app.tasks.pipeline.update_extraction_status",
                return_value=True,
            ),
            patch("app.tasks.pipeline._get_db_client", return_value=db),
            patch(
                "app.tasks.email.send_extraction_complete_email",
                mock_complete_email,
            ),
            patch("app.tasks.email.send_cam_flags_email", mock_flags_email),
        ):
            result = mark_extraction_complete("ext-first")

        assert result["status"] == "complete"
        mock_complete_email.delay.assert_called_once_with("ext-first")
        mock_flags_email.apply_async.assert_called_once()


# ---------------------------------------------------------------------------
# Full happy path integration test
# ---------------------------------------------------------------------------


class TestFullHappyPath:
    """End-to-end test verifying the full pipeline progression."""

    def test_extraction_returns_expected_structure(self) -> None:
        """run_gemini_extraction_task returns dict with extraction_id, status,
        field_count keys."""
        from app.tasks.extraction import run_gemini_extraction_task

        mock_db = _make_mock_db(
            {
                "document_object_key": "user/ext/original.pdf",
                "document_filename": "full_lease.pdf",
            }
        )

        mock_object_storage = MagicMock()
        mock_object_storage.download_file.return_value = _MINIMAL_PDF

        mock_fv = MagicMock()
        mock_fv.value = "123 Main St"
        mock_fv.confidence = 0.9
        mock_fv.source_text = "at 123 Main St"

        mock_pass_record = MagicMock()
        mock_pass_record.input_tokens = 100
        mock_pass_record.output_tokens = 200
        mock_pass_record.model_dump.return_value = {"pass_number": 1}

        mock_mp_result = MagicMock()
        mock_mp_result.extraction = MagicMock()
        mock_mp_result.extraction.fields = {"property_address": mock_fv}
        mock_mp_result.pass_records = [mock_pass_record]
        mock_mp_result.total_tokens = 300
        mock_mp_result.patch = None
        mock_mp_result.pass3_overrides = None

        mock_orchestrator = MagicMock()
        mock_orchestrator.run = AsyncMock(return_value=mock_mp_result)

        with (
            patch("app.tasks.extraction._get_db_client", return_value=mock_db),
            patch(
                "app.tasks.extraction.ObjectStorageService",
                return_value=mock_object_storage,
            ),
            patch(
                "app.tasks.extraction.MultiPassOrchestrator",
                return_value=mock_orchestrator,
            ),
            patch("app.tasks.extraction.update_extraction_status"),
        ):
            result = run_gemini_extraction_task("ext-happy")

        assert result["extraction_id"] == "ext-happy"
        assert result["status"] == "scoring"
        assert result["field_count"] == 1
