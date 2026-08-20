"""Tests for the extraction Celery task (PDF-native via Gemini/OpenRouter).

Verifies run_gemini_extraction_task downloads PDF bytes from object storage, dispatches
the multi-pass orchestrator, writes results to DB, and handles failures.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.tasks._helpers import PipelineStoppedError
from app.tasks.extraction import run_gemini_extraction_task


def _make_mock_db(record_data: dict) -> MagicMock:  # type: ignore[type-arg]
    """Build a mock DB client."""
    mock_db = MagicMock()
    mock_response = MagicMock()
    mock_response.data = record_data
    (
        mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value
    ) = mock_response
    mock_db.table.return_value.update.return_value.eq.return_value.execute = MagicMock()
    return mock_db


def _make_mock_mp_result() -> MagicMock:
    """Build a mock MultiPassResult."""
    mock_fv = MagicMock()
    mock_fv.value = "Test LLC"
    mock_fv.confidence = 0.9
    mock_fv.source_text = "Test LLC"

    mock_extraction = MagicMock()
    mock_extraction.fields = {"landlord_legal_name": mock_fv}

    mock_pass_record = MagicMock()
    mock_pass_record.input_tokens = 5000
    mock_pass_record.output_tokens = 2000
    mock_pass_record.model_dump.return_value = {
        "pass_number": 1,
        "model": "test-model",
        "input_tokens": 5000,
        "output_tokens": 2000,
        "duration_ms": 1000,
    }

    mp_result = MagicMock()
    mp_result.extraction = mock_extraction
    mp_result.pass_records = [mock_pass_record]
    mp_result.total_tokens = 7000
    mp_result.patch = None
    mp_result.pass3_overrides = None

    return mp_result


# Minimal valid PDF header bytes for pypdf
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


class TestRunGeminiExtractionTask:
    """Tests for run_gemini_extraction_task (PDF-native pipeline)."""

    def test_task_name(self) -> None:
        """Task is registered with the correct Celery name."""
        assert (
            run_gemini_extraction_task.name
            == "app.tasks.extraction.run_gemini_extraction_task"
        )

    def test_task_success_downloads_pdf_and_calls_orchestrator(self) -> None:
        """Task downloads PDF from object storage and invokes MultiPassOrchestrator.run."""
        mock_db = _make_mock_db(
            {
                "document_object_key": "user-1/ext-1/original.pdf",
                "document_filename": "lease.pdf",
            }
        )
        mp_result = _make_mock_mp_result()

        mock_object_storage = MagicMock()
        mock_object_storage.download_file.return_value = _MINIMAL_PDF

        mock_orchestrator = MagicMock()
        mock_orchestrator.run = AsyncMock(return_value=mp_result)

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
            result = run_gemini_extraction_task("test-uuid-123")

        assert result["extraction_id"] == "test-uuid-123"
        assert result["status"] == "scoring"
        assert result["field_count"] == 1

        # Verify object-storage download was called
        mock_object_storage.download_file.assert_called_once_with(
            "user-1/ext-1/original.pdf"
        )

        # Verify orchestrator.run was called with pdf_bytes, filename, prompt
        mock_orchestrator.run.assert_called_once()
        call_args = mock_orchestrator.run.call_args[0]
        assert call_args[0] == _MINIMAL_PDF  # pdf_bytes
        assert isinstance(call_args[1], str)  # filename
        assert isinstance(call_args[2], str)  # prompt

    def test_task_derives_filename_from_object_key_when_no_column(self) -> None:
        """Filename is derived from the object key when document_filename is None."""
        mock_db = _make_mock_db(
            {
                "document_object_key": "user-1/ext-1/original.pdf",
                "document_filename": None,
            }
        )
        mp_result = _make_mock_mp_result()

        mock_object_storage = MagicMock()
        mock_object_storage.download_file.return_value = _MINIMAL_PDF

        mock_orchestrator = MagicMock()
        mock_orchestrator.run = AsyncMock(return_value=mp_result)

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
            result = run_gemini_extraction_task("test-uuid-456")

        assert result["extraction_id"] == "test-uuid-456"
        # Filename should be derived from the object key split
        call_args = mock_orchestrator.run.call_args[0]
        assert call_args[1] == "original.pdf"

    def test_task_falls_back_to_legacy_document_s3_key(self) -> None:
        """Legacy rows remain readable during the document key column rollout."""
        mock_db = MagicMock()
        query = (
            mock_db.table.return_value.select.return_value.eq.return_value.single.return_value
        )
        query.execute.side_effect = [
            MagicMock(data={"status": "uploading", "error_message": None}),
            Exception("Could not find the 'document_object_key' column"),
            MagicMock(
                data={
                    "document_s3_key": "user-1/ext-1/legacy.pdf",
                    "document_filename": "legacy.pdf",
                }
            ),
            MagicMock(data={"status": "extracting", "error_message": None}),
            MagicMock(data={"status": "extracting", "error_message": None}),
        ]
        mock_db.table.return_value.update.return_value.eq.return_value.execute = (
            MagicMock()
        )

        mp_result = _make_mock_mp_result()
        mock_object_storage = MagicMock()
        mock_object_storage.download_file.return_value = _MINIMAL_PDF

        mock_orchestrator = MagicMock()
        mock_orchestrator.run = AsyncMock(return_value=mp_result)

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
            result = run_gemini_extraction_task("test-uuid-legacy")

        assert result["extraction_id"] == "test-uuid-legacy"
        mock_object_storage.download_file.assert_called_once_with(
            "user-1/ext-1/legacy.pdf"
        )

    def test_task_writes_extracted_data_to_db(self) -> None:
        """Task persists extraction results and page count to DB."""
        mock_db = _make_mock_db(
            {
                "document_object_key": "user-1/ext-1/original.pdf",
                "document_filename": "lease.pdf",
            }
        )
        mp_result = _make_mock_mp_result()

        mock_object_storage = MagicMock()
        mock_object_storage.download_file.return_value = _MINIMAL_PDF

        mock_orchestrator = MagicMock()
        mock_orchestrator.run = AsyncMock(return_value=mp_result)

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
            run_gemini_extraction_task("test-uuid")

        update_call = mock_db.table.return_value.update
        update_args = update_call.call_args[0][0]
        assert "extracted_data" in update_args
        assert "landlord_legal_name" in update_args["extracted_data"]
        assert "extraction_tokens" in update_args
        assert "pass_records" in update_args
        assert "document_page_count" in update_args

    def test_task_writes_page_count_from_pypdf(self) -> None:
        """Task counts pages using pypdf and writes document_page_count to DB."""
        mock_db = _make_mock_db(
            {
                "document_object_key": "user-1/ext-1/original.pdf",
                "document_filename": "lease.pdf",
            }
        )
        mp_result = _make_mock_mp_result()

        mock_object_storage = MagicMock()
        mock_object_storage.download_file.return_value = _MINIMAL_PDF

        mock_orchestrator = MagicMock()
        mock_orchestrator.run = AsyncMock(return_value=mp_result)

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
            run_gemini_extraction_task("test-uuid-pages")

        update_call = mock_db.table.return_value.update
        update_args = update_call.call_args[0][0]
        # _MINIMAL_PDF has 1 page
        assert update_args["document_page_count"] == 1

    def test_task_stores_pass2_patch_when_present(self) -> None:
        """pass2_patch is stored in DB when the result contains a patch."""
        mock_db = _make_mock_db(
            {
                "document_object_key": "user-1/ext-1/original.pdf",
                "document_filename": "lease.pdf",
            }
        )
        mp_result = _make_mock_mp_result()
        mock_patch = MagicMock()
        mock_patch.model_dump.return_value = {"field_corrections": {}}
        mp_result.patch = mock_patch
        mp_result.pass3_overrides = {"some_field": "value"}

        mock_object_storage = MagicMock()
        mock_object_storage.download_file.return_value = _MINIMAL_PDF

        mock_orchestrator = MagicMock()
        mock_orchestrator.run = AsyncMock(return_value=mp_result)

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
            run_gemini_extraction_task("test-uuid-patch")

        update_args = mock_db.table.return_value.update.call_args[0][0]
        assert "pass2_patch" in update_args
        assert "pass3_overrides" in update_args
        assert update_args["pass3_overrides"] == {"some_field": "value"}

    def test_task_transitions_status_uploading_to_extracting_then_scoring(self) -> None:
        """Status transitions: UPLOADING -> EXTRACTING -> SCORING."""
        mock_db = _make_mock_db(
            {
                "document_object_key": "user-1/ext-1/original.pdf",
                "document_filename": "lease.pdf",
            }
        )
        mp_result = _make_mock_mp_result()

        mock_object_storage = MagicMock()
        mock_object_storage.download_file.return_value = _MINIMAL_PDF

        mock_orchestrator = MagicMock()
        mock_orchestrator.run = AsyncMock(return_value=mp_result)

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
            run_gemini_extraction_task("test-uuid-status")

        from app.models.enums import ExtractionStatus

        calls = mock_status.call_args_list
        assert len(calls) == 2
        assert calls[0][0][1] == ExtractionStatus.EXTRACTING
        assert calls[1][0][1] == ExtractionStatus.SCORING

    def test_deleted_before_work_stops_without_downloading_pdf(self) -> None:
        """If delete already won, no object storage, status, or model work runs."""
        mock_db = _make_mock_db(
            {
                "status": "uploading",
                "error_message": None,
                "deleted_at": "2026-05-19T14:30:00+00:00",
            }
        )

        with (
            patch("app.tasks.extraction._get_db_client", return_value=mock_db),
            patch(
                "app.tasks.extraction.ObjectStorageService",
            ) as mock_storage_class,
            patch("app.tasks.extraction.MultiPassOrchestrator") as mock_orchestrator,
            patch("app.tasks.extraction.update_extraction_status") as mock_status,
            patch("app.tasks.extraction.on_pipeline_failure") as mock_fail,
        ):
            with pytest.raises(PipelineStoppedError):
                run_gemini_extraction_task("ext-deleted")

        mock_storage_class.assert_not_called()
        mock_orchestrator.assert_not_called()
        mock_status.assert_not_called()
        mock_fail.assert_not_called()

    def test_deleted_during_document_lookup_stops_without_downloading_pdf(
        self,
    ) -> None:
        """If delete wins during document lookup, object storage must not run."""
        active_response = MagicMock(data={"status": "uploading", "error_message": None})
        deleted_document_response = MagicMock(
            data={
                "document_object_key": "user-1/ext-1/original.pdf",
                "document_filename": "lease.pdf",
                "deleted_at": "2026-05-19T14:31:00+00:00",
            }
        )
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.side_effect = [
            active_response,
            deleted_document_response,
        ]

        with (
            patch("app.tasks.extraction._get_db_client", return_value=mock_db),
            patch(
                "app.tasks.extraction.ObjectStorageService",
            ) as mock_storage_class,
            patch("app.tasks.extraction.MultiPassOrchestrator") as mock_orchestrator,
            patch("app.tasks.extraction.update_extraction_status") as mock_status,
            patch("app.tasks.extraction.on_pipeline_failure") as mock_fail,
        ):
            with pytest.raises(PipelineStoppedError):
                run_gemini_extraction_task("ext-deleted")

        mock_storage_class.assert_not_called()
        mock_orchestrator.assert_not_called()
        mock_status.assert_not_called()
        mock_fail.assert_not_called()

    def test_deleted_during_legacy_document_lookup_stops_without_downloading_pdf(
        self,
    ) -> None:
        """Legacy fallback also stops if delete wins before the key read returns."""
        active_response = MagicMock(data={"status": "uploading", "error_message": None})
        deleted_legacy_response = MagicMock(
            data={
                "document_s3_key": "user-1/ext-1/legacy.pdf",
                "document_filename": "legacy.pdf",
                "deleted_at": "2026-05-19T14:32:00+00:00",
            }
        )
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.side_effect = [
            active_response,
            Exception("Could not find the 'document_object_key' column"),
            deleted_legacy_response,
        ]

        with (
            patch("app.tasks.extraction._get_db_client", return_value=mock_db),
            patch(
                "app.tasks.extraction.ObjectStorageService",
            ) as mock_storage_class,
            patch("app.tasks.extraction.MultiPassOrchestrator") as mock_orchestrator,
            patch("app.tasks.extraction.update_extraction_status") as mock_status,
            patch("app.tasks.extraction.on_pipeline_failure") as mock_fail,
        ):
            with pytest.raises(PipelineStoppedError):
                run_gemini_extraction_task("ext-deleted")

        mock_storage_class.assert_not_called()
        mock_orchestrator.assert_not_called()
        mock_status.assert_not_called()
        mock_fail.assert_not_called()

    def test_deleted_after_result_write_stops_before_scoring_transition(self) -> None:
        """If delete wins before SCORING transition, generic failure cleanup is skipped."""
        from app.core.exceptions import ConflictError

        mock_db = _make_mock_db(
            {
                "document_object_key": "user-1/ext-1/original.pdf",
                "document_filename": "lease.pdf",
            }
        )
        mp_result = _make_mock_mp_result()
        mock_object_storage = MagicMock()
        mock_object_storage.download_file.return_value = _MINIMAL_PDF
        mock_orchestrator = MagicMock()
        mock_orchestrator.run = AsyncMock(return_value=mp_result)

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
            patch("app.tasks.extraction.raise_if_pipeline_stopped"),
            patch("app.tasks.extraction.update_extraction_if_status_matches"),
            patch(
                "app.tasks.extraction.update_extraction_status",
                side_effect=[
                    None,
                    ConflictError(
                        "Status update conflict",
                        resource_type="extraction",
                        resource_id="ext-deleted",
                    ),
                ],
            ),
            patch("app.tasks.extraction.on_pipeline_failure") as mock_fail,
        ):
            with pytest.raises(ConflictError):
                run_gemini_extraction_task("ext-deleted")

        mock_fail.assert_not_called()

    def test_task_failure_marks_extraction_failed(self) -> None:
        """Task raises on orchestrator failure and marks extraction as failed."""
        mock_db = _make_mock_db(
            {
                "document_object_key": "user-1/ext-1/original.pdf",
                "document_filename": "lease.pdf",
            }
        )

        mock_object_storage = MagicMock()
        mock_object_storage.download_file.return_value = _MINIMAL_PDF

        mock_orchestrator = MagicMock()
        mock_orchestrator.run = AsyncMock(side_effect=Exception("All models failed"))

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
            patch("app.tasks.extraction.on_pipeline_failure") as mock_fail,
            patch("app.tasks.extraction.update_extraction_status"),
        ):
            with pytest.raises(Exception):  # noqa: B017
                run_gemini_extraction_task("test-uuid")

            mock_fail.assert_called_once()

    def test_cancelled_extraction_does_not_persist_late_results(self) -> None:
        """If the user cancels during model work, task output must not overwrite it."""
        document_response = MagicMock(
            data={
                "document_object_key": "user-1/ext-1/original.pdf",
                "document_filename": "lease.pdf",
            }
        )
        active_response = MagicMock(
            data={"status": "extracting", "error_message": None}
        )
        cancelled_response = MagicMock(
            data={
                "status": "failed",
                "error_message": "Processing cancelled by user",
            }
        )
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.side_effect = [
            active_response,
            document_response,
            active_response,
            cancelled_response,
        ]

        mp_result = _make_mock_mp_result()
        mock_object_storage = MagicMock()
        mock_object_storage.download_file.return_value = _MINIMAL_PDF
        mock_orchestrator = MagicMock()
        mock_orchestrator.run = AsyncMock(return_value=mp_result)

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
            patch("app.tasks.extraction.on_pipeline_failure") as mock_fail,
        ):
            with pytest.raises(PipelineStoppedError):
                run_gemini_extraction_task("test-uuid-cancelled")

        mock_db.table.return_value.update.assert_not_called()
        mock_fail.assert_not_called()

    def test_late_cancelled_extraction_does_not_persist_results_on_cas_miss(
        self,
    ) -> None:
        """A cancellation between the guard and result write must stop the task."""
        document_response = MagicMock(
            data={
                "document_object_key": "user-1/ext-1/original.pdf",
                "document_filename": "lease.pdf",
            }
        )
        active_response = MagicMock(
            data={"status": "extracting", "error_message": None}
        )
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.side_effect = [
            active_response,
            document_response,
            active_response,
            active_response,
        ]
        update_query = mock_db.table.return_value.update.return_value
        update_query.eq.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
            data=[]
        )

        mp_result = _make_mock_mp_result()
        mock_object_storage = MagicMock()
        mock_object_storage.download_file.return_value = _MINIMAL_PDF
        mock_orchestrator = MagicMock()
        mock_orchestrator.run = AsyncMock(return_value=mp_result)

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
            patch("app.tasks.extraction.on_pipeline_failure") as mock_fail,
        ):
            with pytest.raises(PipelineStoppedError):
                run_gemini_extraction_task("test-uuid-late-cancelled")

        mock_fail.assert_not_called()

    def test_late_cancelled_extraction_deletes_unpersisted_raw_artifacts(
        self,
    ) -> None:
        """Raw artifacts uploaded before a CAS miss must be cleaned up."""
        document_response = MagicMock(
            data={
                "document_object_key": "user-1/ext-1/original.pdf",
                "document_filename": "lease.pdf",
            }
        )
        active_response = MagicMock(
            data={"status": "extracting", "error_message": None}
        )
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.side_effect = [
            active_response,
            document_response,
            active_response,
            active_response,
        ]
        update_query = mock_db.table.return_value.update.return_value
        update_query.eq.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
            data=[]
        )

        mp_result = _make_mock_mp_result()
        mp_result.audit_trail = {"raw_responses": ["raw model response"]}
        mp_result.pass_records[0].model = "test-model"
        mp_result.pass_records[0].pass_kind = "pass1"
        mp_result.pass_records[0].pass_number = 1
        mock_object_storage = MagicMock()
        mock_object_storage.download_file.return_value = _MINIMAL_PDF
        mock_object_storage.upload_extraction_artifact.return_value = "raw/key.json"
        mock_orchestrator = MagicMock()
        mock_orchestrator.run = AsyncMock(return_value=mp_result)

        with (
            patch("app.tasks.extraction._get_db_client", return_value=mock_db),
            patch(
                "app.tasks.extraction.ObjectStorageService",
                return_value=mock_object_storage,
            ),
            patch("app.tasks.extraction.settings") as mock_settings,
            patch(
                "app.tasks.extraction.MultiPassOrchestrator",
                return_value=mock_orchestrator,
            ),
            patch("app.tasks.extraction.update_extraction_status"),
            patch("app.tasks.extraction.on_pipeline_failure") as mock_fail,
        ):
            mock_settings.raw_extraction_dump_enabled = True
            mock_settings.max_extraction_llm_cost_usd = 1
            mock_settings.pass1_model = "m1"
            mock_settings.pass1_fallback_model = "m2"
            mock_settings.pass1_fallback_model_2 = "m3"
            mock_settings.pass2_model = "m4"
            mock_settings.pass2_fallback_model = "m5"
            mock_settings.pass2_fallback_model_2 = "m6"
            mock_settings.pass3_model = "m7"
            mock_settings.pass3_fallback_model = "m8"
            mock_settings.pass3_fallback_model_2 = "m9"
            mock_settings.extraction_sibling_model = "m10"
            mock_settings.extraction_sibling_fallback_model = "m11"
            mock_settings.extraction_sibling_fallback_model_2 = "m12"
            mock_settings.extraction_judge_model = "m13"
            mock_settings.extraction_judge_fallback_model = "m14"
            mock_settings.extraction_judge_fallback_model_2 = "m15"
            mock_settings.extraction_dual_enabled = False
            mock_settings.validation_min_confidence = 0.70
            mock_settings.escalation_confidence_threshold = 0.80
            mock_settings.openrouter_api_key = "test-key"
            mock_settings.openrouter_base_url = "https://openrouter.ai/api/v1"

            with pytest.raises(PipelineStoppedError):
                run_gemini_extraction_task("test-uuid-late-raw-cancelled")

        mock_object_storage.upload_extraction_artifact.assert_called_once()
        mock_object_storage.delete_file.assert_called_once_with("raw/key.json")
        mock_fail.assert_not_called()

    def test_task_object_storage_download_failure_marks_failed(self) -> None:
        """Object-storage download failure causes task to fail gracefully."""
        mock_db = _make_mock_db(
            {
                "document_object_key": "user-1/ext-1/original.pdf",
                "document_filename": "lease.pdf",
            }
        )

        mock_object_storage = MagicMock()
        mock_object_storage.download_file.side_effect = RuntimeError(
            "Object key not found"
        )

        with (
            patch("app.tasks.extraction._get_db_client", return_value=mock_db),
            patch(
                "app.tasks.extraction.ObjectStorageService",
                return_value=mock_object_storage,
            ),
            patch("app.tasks.extraction.on_pipeline_failure") as mock_fail,
            patch("app.tasks.extraction.update_extraction_status"),
        ):
            with pytest.raises(RuntimeError, match="Object key not found"):
                run_gemini_extraction_task("test-uuid")

            mock_fail.assert_called_once()

    def test_task_does_not_read_ocr_text_from_db(self) -> None:
        """Task reads document_object_key, NOT ocr_text â€” confirms Textract removal."""
        mock_db = _make_mock_db(
            {
                "document_object_key": "user-1/ext-1/original.pdf",
                "document_filename": "lease.pdf",
            }
        )
        mp_result = _make_mock_mp_result()

        mock_object_storage = MagicMock()
        mock_object_storage.download_file.return_value = _MINIMAL_PDF

        mock_orchestrator = MagicMock()
        mock_orchestrator.run = AsyncMock(return_value=mp_result)

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
            run_gemini_extraction_task("test-uuid-no-ocr")

        # Confirm the DB select used document_object_key, not ocr_text
        select_call = mock_db.table.return_value.select
        selected_columns = [call.args[0] for call in select_call.call_args_list]
        assert all("ocr_text" not in columns for columns in selected_columns)
        assert any("document_object_key" in columns for columns in selected_columns)
