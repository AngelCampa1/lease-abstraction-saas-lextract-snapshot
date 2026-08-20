"""Tests for extraction pipeline stage summary construction."""

from __future__ import annotations

from app.services.pipeline_events import build_stage_summary


def test_stage_summary_uses_pipeline_outcome_for_final_status() -> None:
    summary = build_stage_summary(
        events=[
            {
                "stage": "pass1_extraction",
                "attempt_number": 1,
                "status": "succeeded",
                "error_class": None,
                "model": "model-a",
            },
            {
                "stage": "pass2_validation",
                "attempt_number": 1,
                "status": "failed",
                "error_class": "ExtractionError",
                "model": "model-b",
            },
        ],
        pass_records=[{"model": "model-a"}],
    )

    assert summary["final_status"] == "succeeded"
    assert summary["status_by_stage"] == {
        "pass1_extraction": "succeeded",
        "pass2_validation": "failed",
    }


def test_stage_summary_reports_failed_when_no_result_records_exist() -> None:
    summary = build_stage_summary(
        events=[
            {
                "stage": "pass1_extraction",
                "attempt_number": 1,
                "status": "failed",
                "error_class": "ExtractionError",
            },
        ],
        pass_records=[],
    )

    assert summary["final_status"] == "failed"
