"""E2E tests: multiple lease types with ground truth validation.

Runs the full 3-stage extraction pipeline (extraction -> scoring -> red flags)
against multiple lease types and validates extraction accuracy using
exact ground truth assertions â€” not just completeness checks.

Skipped unless OPENROUTER_API_KEY is set in the environment AND a directory
of real PDF fixtures is provided via LEXTRACT_E2E_PDF_DIR. The new
PDF-native pipeline downloads PDF bytes from R2 and feeds them to
MultiPassOrchestrator; the legacy HTML fixtures are not consumable.

Run with:
    cd backend && OPENROUTER_API_KEY=sk-or-... \
        LEXTRACT_E2E_PDF_DIR=/path/to/pdfs \
        python -m pytest tests/e2e/test_multi_lease.py -m e2e -v -s --no-cov --timeout=600
"""

from __future__ import annotations

import os
import uuid
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest

from app.core.config import settings
from app.tasks.extraction import run_gemini_extraction_task
from app.tasks.scoring import run_red_flags_task, score_confidence_task

from .conftest import InMemoryExtractionDB
from .ground_truth import LEASE_CASES, LeaseCase, validate_ground_truth

# PDF fixtures directory â€” must be supplied at runtime; the legacy
# HTML fixture set under packages/extract-sdk does not include PDFs
# and the post-migration pipeline cannot consume HTML.
_PDF_DIR_ENV = "LEXTRACT_E2E_PDF_DIR"

pytestmark = [
    pytest.mark.e2e,
    pytest.mark.skipif(
        not os.environ.get("OPENROUTER_API_KEY"),
        reason="OPENROUTER_API_KEY not set",
    ),
    pytest.mark.skipif(
        not os.environ.get(_PDF_DIR_ENV),
        reason=f"{_PDF_DIR_ENV} not set â€” real PDF fixtures required",
    ),
]


def _read_lease_pdf(filename: str) -> bytes:
    """Read a lease PDF file from the configured fixtures directory.

    Skips the test (rather than erroring with FileNotFoundError) if the
    fixture file is absent â€” e.g. in CI environments that don't ship real leases.
    The expected PDF filename is the original .htm name with the extension
    swapped to .pdf.
    """
    pdf_dir = Path(os.environ[_PDF_DIR_ENV])
    pdf_name = Path(filename).with_suffix(".pdf").name
    lease_path = pdf_dir / pdf_name
    if not lease_path.exists():
        pytest.skip(f"PDF fixture not found: {lease_path}")
    return lease_path.read_bytes()


def _make_db(
    extraction_id: str, object_key: str, filename: str
) -> InMemoryExtractionDB:
    """Create a fresh in-memory DB seeded with the columns the Gemini task reads."""
    return InMemoryExtractionDB(
        {
            "id": extraction_id,
            "status": "uploading",
            "document_object_key": object_key,
            "document_filename": filename,
            "user_id": None,
            "extracted_data": None,
            "confidence_scores": None,
            "overall_confidence": None,
            "red_flags": None,
            "pass_records": None,
            "extraction_tokens": None,
        }
    )


@pytest.mark.parametrize(
    "case",
    LEASE_CASES,
    ids=[c.lease_id for c in LEASE_CASES],
)
@pytest.mark.timeout(900)
def test_extraction_accuracy(
    monkeypatch: pytest.MonkeyPatch,
    case: LeaseCase,
) -> None:
    """E2E: real lease PDF -> real extraction -> ground truth validation.

    Each parameterized case runs the full 3-stage pipeline independently
    and validates extracted values against known correct answers. The
    ObjectStorageService.download_file boundary is mocked to return the fixture PDF
    bytes directly; everything else (orchestrator, OpenRouter, scoring,
    red flags) runs for real.
    """
    real_key = os.environ["OPENROUTER_API_KEY"]
    monkeypatch.setattr(settings, "openrouter_api_key", real_key)

    extraction_id = f"e2e-{case.lease_id}-{uuid.uuid4().hex[:8]}"
    pdf_filename = Path(case.filename).with_suffix(".pdf").name
    object_key = f"extractions/e2e/{extraction_id}/{pdf_filename}"
    pdf_bytes = _read_lease_pdf(case.filename)
    db = _make_db(extraction_id, object_key, pdf_filename)

    with (
        patch("app.tasks.extraction._get_db_client", return_value=db),
        patch("app.tasks.scoring._get_db_client", return_value=db),
        patch(
            "app.tasks.extraction.update_extraction_status",
            new_callable=AsyncMock,
        ),
        patch(
            "app.tasks._helpers.update_extraction_status",
            new_callable=AsyncMock,
        ),
        # Mock the ObjectStorageService boundary so the task reads fixture bytes
        # instead of attempting a real R2 download.
        patch(
            "app.tasks.extraction.ObjectStorageService.download_file",
            return_value=pdf_bytes,
        ),
    ):
        # Stage 1: extraction
        result1 = run_gemini_extraction_task.apply(args=[extraction_id]).get()
        assert (
            result1["status"] == "scoring"
        ), f"[{case.lease_id}] Stage 1 failed: {result1}"

        # Stage 2: confidence scoring
        result2 = score_confidence_task.apply(args=[extraction_id]).get()
        assert (
            "field_count" in result2
        ), f"[{case.lease_id}] Stage 2 missing field_count: {result2}"

        # Stage 3: red flag detection
        result3 = run_red_flags_task.apply(args=[extraction_id]).get()
        assert (
            "flag_count" in result3
        ), f"[{case.lease_id}] Stage 3 missing flag_count: {result3}"

    record = db.record
    extracted_data: dict[str, Any] = record.get("extracted_data") or {}

    # Basic completeness â€” every lease should produce substantial output
    assert len(extracted_data) >= 20, (
        f"[{case.lease_id}] Expected >= 20 extracted fields, got {len(extracted_data)}. "
        f"Fields: {sorted(extracted_data.keys())}"
    )

    # Ground truth validation
    failures = validate_ground_truth(extracted_data, case)
    if failures:
        failure_report = "\n".join(failures)
        pytest.fail(
            f"[{case.lease_id}] Ground truth validation failed "
            f"({len(failures)} of {len(case.ground_truth)} checks):\n{failure_report}"
        )
