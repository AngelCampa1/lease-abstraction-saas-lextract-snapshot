"""E2E test: full pipeline against the new Gemini PDF-native extraction task.

Exercises ``run_gemini_extraction_task`` end-to-end with the
``ObjectStorageService.download_file`` and ``MultiPassOrchestrator.run`` boundaries
mocked so the test is hermetic. The post-migration pipeline operates on
PDF bytes (not OCR text), so we hand the orchestrator a deterministic
``MultiPassResult`` rather than calling OpenRouter for real.

Run with:
    cd backend && python -m pytest tests/e2e/ -m e2e -v -s --no-cov --timeout=0
"""

from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from extract_sdk.models import (
    ExtractionPassRecord,
    ExtractionResult,
    FieldExtractionValue,
    MultiPassResult,
)

from app.tasks.extraction import run_gemini_extraction_task
from app.tasks.scoring import run_red_flags_task, score_confidence_task

from .conftest import InMemoryExtractionDB

pytestmark = pytest.mark.e2e


def _build_deterministic_multi_pass_result() -> MultiPassResult:
    """Build a fixed MultiPassResult so the test is deterministic.

    The values are realistic for lease 07 (industrial/San Carlos) so the
    downstream confidence scoring and red flag tasks have plausible
    inputs to operate on.
    """
    fields = {
        "landlord_legal_name": FieldExtractionValue(
            value="San Carlos Industrial Holdings LLC",
            confidence=0.95,
            source_text="Landlord: San Carlos Industrial Holdings LLC",
        ),
        "tenant_legal_name": FieldExtractionValue(
            value="Acme Manufacturing Inc.",
            confidence=0.95,
            source_text="Tenant: Acme Manufacturing Inc.",
        ),
        "rentable_square_footage": FieldExtractionValue(
            value=9740,
            confidence=0.9,
            source_text="approximately 9,740 rentable square feet",
        ),
        "premises_address": FieldExtractionValue(
            value="123 Industrial Way, San Carlos, CA",
            confidence=0.9,
            source_text="Premises located at 123 Industrial Way, San Carlos, CA",
        ),
        "premises_city": FieldExtractionValue(
            value="San Carlos",
            confidence=0.95,
            source_text="San Carlos, CA",
        ),
        "base_rent_annual": FieldExtractionValue(
            value=350640,
            confidence=0.85,
            source_text="annual base rent of $350,640",
        ),
        "base_rent_monthly": FieldExtractionValue(
            value=29220,
            confidence=0.85,
            source_text="monthly base rent of $29,220",
        ),
    }
    extraction = ExtractionResult(fields=fields)
    pass_records = [
        ExtractionPassRecord(
            pass_number=1,
            model="google/gemini-3-flash",
            input_tokens=12000,
            output_tokens=4500,
            duration_ms=8200,
        ),
        ExtractionPassRecord(
            pass_number=2,
            model="google/gemini-3-flash",
            input_tokens=8000,
            output_tokens=1200,
            duration_ms=5400,
        ),
    ]
    return MultiPassResult(
        extraction=extraction,
        pass_records=pass_records,
        patch=None,
        pass3_overrides=None,
        needs_review=False,
        confidence_scores={},
        audit_trail=None,
    )


@pytest.mark.timeout(600)
def test_full_pipeline_with_mocked_orchestrator(
    e2e_extraction_id: str,
    in_memory_db: InMemoryExtractionDB,
) -> None:
    """E2E: PDF download -> deterministic Gemini result -> scoring -> red flags.

    Validates the full backend extraction pipeline end-to-end against the
    new Gemini task. ObjectStorageService.download_file and MultiPassOrchestrator.run
    are mocked at their natural boundaries so no external network calls
    are made. DB writes, scoring, and red flag evaluation run against the
    in-memory test database; status transitions are mirrored by a sync patch
    so the result-write CAS path can run without external services.
    """
    fake_pdf_bytes = b"%PDF-1.4\n%mock pdf bytes for e2e test\n%%EOF\n"
    deterministic_result = _build_deterministic_multi_pass_result()

    async def _fake_run(*args: Any, **kwargs: Any) -> MultiPassResult:
        return deterministic_result

    fake_orchestrator = MagicMock()
    fake_orchestrator.run = _fake_run

    def _set_status(extraction_id: str, status: Any, **kwargs: Any) -> None:
        if extraction_id == e2e_extraction_id:
            in_memory_db.record["status"] = str(status)
            in_memory_db.record.update(kwargs.get("extra_data") or {})

    with (
        patch("app.tasks.extraction._get_db_client", return_value=in_memory_db),
        patch("app.tasks.scoring._get_db_client", return_value=in_memory_db),
        patch(
            "app.tasks.extraction.update_extraction_status",
            side_effect=_set_status,
        ),
        patch(
            "app.tasks._helpers.update_extraction_status",
            side_effect=_set_status,
        ),
        patch(
            "app.tasks.extraction.ObjectStorageService.download_file",
            return_value=fake_pdf_bytes,
        ),
        # pypdf cannot read our fake PDF; stub the page count call.
        patch("app.tasks.extraction.pypdf.PdfReader") as mock_pdf_reader,
        patch(
            "app.tasks.extraction.MultiPassOrchestrator",
            return_value=fake_orchestrator,
        ),
    ):
        mock_pdf_reader.return_value.pages = [object()] * 12

        # Stage 1: extraction (mocked orchestrator)
        result1 = run_gemini_extraction_task.apply(args=[e2e_extraction_id]).get()
        assert (
            result1["status"] == "scoring"
        ), f"Stage 1 returned unexpected status: {result1}"

        # Stage 2: confidence scoring
        result2 = score_confidence_task.apply(args=[e2e_extraction_id]).get()
        assert "field_count" in result2, f"Stage 2 missing field_count: {result2}"

        # Stage 3: red flag detection (non-fatal)
        result3 = run_red_flags_task.apply(args=[e2e_extraction_id]).get()
        assert "flag_count" in result3, f"Stage 3 missing flag_count: {result3}"

    record = in_memory_db.record

    # -----------------------------------------------------------------------
    # extracted_data
    # -----------------------------------------------------------------------
    extracted_data: dict[str, Any] = record.get("extracted_data") or {}
    assert (
        len(extracted_data) >= 5
    ), f"Expected the deterministic fixture's fields to round-trip, got {len(extracted_data)}"

    def _val(field: str) -> Any:
        return extracted_data.get(field, {}).get("value")

    assert _val("landlord_legal_name") == "San Carlos Industrial Holdings LLC"
    assert _val("tenant_legal_name") == "Acme Manufacturing Inc."
    assert _val("rentable_square_footage") == 9740
    assert _val("base_rent_monthly") == 29220

    # -----------------------------------------------------------------------
    # confidence_scores — produced by the real scoring task
    # -----------------------------------------------------------------------
    confidence_scores: dict[str, Any] = record.get("confidence_scores") or {}
    field_score_keys = [k for k in confidence_scores if k != "_overall"]
    assert (
        len(field_score_keys) >= 5
    ), f"Expected >= 5 confidence score entries, got {len(field_score_keys)}"

    overall_confidence = record.get("overall_confidence")
    assert (
        isinstance(overall_confidence, float) and 0.0 <= overall_confidence <= 1.0
    ), f"overall_confidence should be float in [0.0, 1.0], got {overall_confidence!r}"

    # -----------------------------------------------------------------------
    # red_flags
    # -----------------------------------------------------------------------
    red_flags = record.get("red_flags")
    assert isinstance(
        red_flags, list
    ), f"red_flags should be a list, got {type(red_flags).__name__}"

    # -----------------------------------------------------------------------
    # pass_records — should round-trip the deterministic fixture
    # -----------------------------------------------------------------------
    pass_records = record.get("pass_records")
    assert (
        isinstance(pass_records, list) and len(pass_records) == 2
    ), f"Expected 2 pass_records (pass 1 + pass 2), got {pass_records!r}"

    # -----------------------------------------------------------------------
    # extraction_tokens — sums from the deterministic fixture
    # -----------------------------------------------------------------------
    extraction_tokens: dict[str, Any] = record.get("extraction_tokens") or {}
    total_tokens = extraction_tokens.get("total_tokens", 0)
    assert (
        total_tokens == 12000 + 4500 + 8000 + 1200
    ), f"Unexpected total_tokens: {extraction_tokens!r}"

    # Document page count was set from the stubbed pypdf reader
    assert record.get("document_page_count") == 12

    # -----------------------------------------------------------------------
    # Observability columns (migration 00010)
    # -----------------------------------------------------------------------

    # extraction_cost_cents — written by the task (0 from mock LLM)
    cost_cents = record.get("extraction_cost_cents")
    assert isinstance(
        cost_cents, int
    ), f"extraction_cost_cents should be int; got {type(cost_cents).__name__!r}"
    assert cost_cents >= 0, f"extraction_cost_cents should be ≥0; got {cost_cents!r}"

    # stage_summary — compact dict built by the observer
    stage_summary = record.get("stage_summary")
    assert isinstance(
        stage_summary, dict
    ), f"stage_summary should be a dict; got {type(stage_summary).__name__!r}"
    assert (
        stage_summary.get("timeline_table") == "extraction_pipeline_events"
    ), f"stage_summary.timeline_table unexpected: {stage_summary!r}"
