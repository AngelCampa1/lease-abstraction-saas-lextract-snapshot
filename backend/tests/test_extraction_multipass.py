"""Tests for the multi-pass extraction path in run_gemini_extraction_task.

Verifies that pass_records, pass2_patch, and pass3_overrides are all
persisted correctly after a multi-pass extraction run.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

from app.tasks.extraction import run_gemini_extraction_task
from extract_sdk.models import (
    ExtractionPassRecord,
    ExtractionPatch,
    ExtractionResult,
    FieldCorrection,
    FieldExtractionValue,
    MultiPassResult,
)

# Minimal valid PDF for pypdf page-count
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


def _make_multipass_result() -> MultiPassResult:
    """Build a realistic MultiPassResult."""
    return MultiPassResult(
        extraction=ExtractionResult(
            fields={
                "base_rent_annual": FieldExtractionValue(
                    value=120000, confidence=0.95, source_text="$120,000"
                ),
                "pro_rata_share": FieldExtractionValue(
                    value=0.0525, confidence=0.90, source_text="5.25%"
                ),
            }
        ),
        pass_records=[
            ExtractionPassRecord(
                pass_number=1,
                model="google/gemini-2.5-flash",
                input_tokens=50000,
                output_tokens=4000,
                duration_ms=3500,
            ),
            ExtractionPassRecord(
                pass_number=2,
                model="openai/gpt-4.1-mini",
                input_tokens=6000,
                output_tokens=1500,
                duration_ms=2800,
            ),
        ],
        patch=None,
        pass3_overrides=None,
        needs_review=False,
    )


class TestMultiPassGeminiExtractionTask:
    """Tests for multi-pass path in run_gemini_extraction_task."""

    def test_multipass_stores_pass_records(self) -> None:
        """Multi-pass result stores pass_records in DB update."""
        mock_db = _make_mock_db(
            {
                "document_object_key": "user-1/ext-1/original.pdf",
                "document_filename": "lease.pdf",
            }
        )
        mp_result = _make_multipass_result()

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
            patch("app.tasks.extraction.settings") as mock_settings,
            patch(
                "app.tasks.extraction.MultiPassOrchestrator",
                return_value=mock_orchestrator,
            ),
            patch("app.tasks.extraction.update_extraction_status"),
        ):
            mock_settings.pass1_model = "google/gemini-2.5-flash"
            mock_settings.pass1_fallback_model = "google/gemini-2.5-flash-lite"
            mock_settings.pass1_fallback_model_2 = "openai/gpt-4.1-mini"
            mock_settings.pass2_model = "openai/gpt-4.1-mini"
            mock_settings.pass2_fallback_model = "google/gemini-2.5-flash"
            mock_settings.pass2_fallback_model_2 = "moonshotai/kimi-k2.5"
            mock_settings.pass3_model = "google/gemini-2.5-flash"
            mock_settings.pass3_fallback_model = "moonshotai/kimi-k2.5"
            mock_settings.pass3_fallback_model_2 = "deepseek/deepseek-v3.2"
            mock_settings.validation_min_confidence = 0.70
            mock_settings.escalation_confidence_threshold = 0.80
            mock_settings.openrouter_api_key = "test-key"
            mock_settings.openrouter_base_url = "https://openrouter.ai/api/v1"

            result = run_gemini_extraction_task("test-uuid-multipass")

        assert result["extraction_id"] == "test-uuid-multipass"
        assert result["status"] == "scoring"
        assert result["field_count"] == 2

        # Verify DB update was called with pass_records
        update_call = mock_db.table.return_value.update
        update_args = update_call.call_args[0][0]
        assert "pass_records" in update_args
        assert len(update_args["pass_records"]) == 2
        assert update_args["pass_records"][0]["model"] == "google/gemini-2.5-flash"
        assert update_args["extraction_tokens"]["total_tokens"] == 61500

    def test_multipass_stores_patch_when_present(self) -> None:
        """Pass2 patch is stored in DB when non-empty."""
        mock_db = _make_mock_db(
            {
                "document_object_key": "user-1/ext-1/original.pdf",
                "document_filename": "lease.pdf",
            }
        )
        mp_result = _make_multipass_result()
        mp_result.patch = ExtractionPatch(
            field_corrections={
                "pro_rata_share": FieldCorrection(
                    original_value=5.25,
                    corrected_value=0.0525,
                    reasoning="Percentage not converted",
                    confidence=0.92,
                )
            }
        )
        mp_result.pass3_overrides = {"pro_rata_share": 0.0525}

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
            patch("app.tasks.extraction.settings") as mock_settings,
            patch(
                "app.tasks.extraction.MultiPassOrchestrator",
                return_value=mock_orchestrator,
            ),
            patch("app.tasks.extraction.update_extraction_status"),
        ):
            mock_settings.pass1_model = "m1"
            mock_settings.pass1_fallback_model = "m2"
            mock_settings.pass1_fallback_model_2 = "m3"
            mock_settings.pass2_model = "m4"
            mock_settings.pass2_fallback_model = "m5"
            mock_settings.pass2_fallback_model_2 = "m6"
            mock_settings.pass3_model = "m7"
            mock_settings.pass3_fallback_model = "m8"
            mock_settings.pass3_fallback_model_2 = "m9"
            mock_settings.validation_min_confidence = 0.70
            mock_settings.escalation_confidence_threshold = 0.80
            mock_settings.openrouter_api_key = "k"
            mock_settings.openrouter_base_url = "https://openrouter.ai/api/v1"

            run_gemini_extraction_task("test-uuid-patch")

        update_args = mock_db.table.return_value.update.call_args[0][0]
        assert "pass2_patch" in update_args
        assert "pass3_overrides" in update_args
        assert update_args["pass3_overrides"] == {"pro_rata_share": 0.0525}

    def test_orchestrator_called_with_pdf_bytes_not_ocr_text(self) -> None:
        """Orchestrator.run must receive (pdf_bytes, filename, prompt), no ocr_text."""
        mock_db = _make_mock_db(
            {
                "document_object_key": "user-1/ext-1/original.pdf",
                "document_filename": "lease_agreement.pdf",
            }
        )
        mp_result = _make_multipass_result()

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
            run_gemini_extraction_task("test-uuid-pdf-native")

        call_args = mock_orchestrator.run.call_args[0]
        # Arg 0: bytes (pdf_bytes), Arg 1: str (filename), Arg 2: str (prompt)
        assert isinstance(call_args[0], bytes)
        assert call_args[1] == "lease_agreement.pdf"
        assert isinstance(call_args[2], str)
