"""Tests for pipeline_events.py — PipelineEventRecorder and helpers."""

from __future__ import annotations

from unittest.mock import MagicMock
from uuid import UUID, uuid4

import pytest

from app.services.pipeline_events import (
    PIPELINE_STAGES,
    PIPELINE_STATUSES,
    PipelineEventRecorder,
    build_stage_summary,
    set_sentry_pipeline_context,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_db(rows: list[dict] | None = None) -> MagicMock:
    """Build a mock DB client that returns ``rows`` on insert."""
    db = MagicMock()
    mock_result = MagicMock()
    mock_result.data = rows if rows is not None else []
    db.table.return_value.insert.return_value.execute.return_value = mock_result
    db.table.return_value.update.return_value.eq.return_value.execute.return_value = (
        MagicMock()
    )
    return db


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------


class TestConstants:
    def test_pipeline_stages_contains_expected_values(self) -> None:
        expected = {
            "document_fetch",
            "pass1_extraction",
            "pass2_validation",
            "pass3_escalation",
            "sibling_extraction",
            "judge_arbitration",
            "persistence",
        }
        assert expected <= PIPELINE_STAGES

    def test_pipeline_statuses_contains_expected_values(self) -> None:
        assert {"started", "succeeded", "failed", "skipped"} <= PIPELINE_STATUSES

    def test_no_camaudit_stages_present(self) -> None:
        """CamAudit-specific stages must not be in Lextract's stage set."""
        assert "raw_text_sidecar" not in PIPELINE_STAGES
        assert "detection_handoff" not in PIPELINE_STAGES


# ---------------------------------------------------------------------------
# PipelineEventRecorder.start_stage
# ---------------------------------------------------------------------------


class TestStartStage:
    def test_inserts_row_and_returns_uuid(self) -> None:
        event_id = str(uuid4())
        db = _make_db(rows=[{"id": event_id}])
        recorder = PipelineEventRecorder(db)

        result = recorder.start_stage(
            extraction_id=uuid4(),
            stage="pass1_extraction",
            model="google/gemini-3-flash-preview",
        )

        assert result == UUID(event_id)
        db.table.assert_called_once_with("extraction_pipeline_events")
        insert_payload = db.table.return_value.insert.call_args[0][0]
        assert insert_payload["stage"] == "pass1_extraction"
        assert insert_payload["status"] == "started"
        assert insert_payload["model"] == "google/gemini-3-flash-preview"
        assert insert_payload["retry_count"] == 0

    def test_returns_none_when_no_rows_returned(self) -> None:
        db = _make_db(rows=[])
        recorder = PipelineEventRecorder(db)

        result = recorder.start_stage(
            extraction_id=uuid4(),
            stage="pass1_extraction",
        )
        assert result is None

    def test_raises_on_unknown_stage(self) -> None:
        db = _make_db()
        recorder = PipelineEventRecorder(db)

        with pytest.raises(ValueError, match="Unknown pipeline stage"):
            recorder.start_stage(
                extraction_id=uuid4(),
                stage="nonexistent_stage",
            )

    def test_db_error_returns_none_and_does_not_raise(self) -> None:
        db = MagicMock()
        db.table.return_value.insert.return_value.execute.side_effect = RuntimeError(
            "DB unavailable"
        )
        recorder = PipelineEventRecorder(db)

        result = recorder.start_stage(
            extraction_id=uuid4(),
            stage="pass1_extraction",
        )
        assert result is None

    def test_fallback_models_stored_in_payload(self) -> None:
        event_id = str(uuid4())
        db = _make_db(rows=[{"id": event_id}])
        recorder = PipelineEventRecorder(db)

        recorder.start_stage(
            extraction_id=uuid4(),
            stage="pass1_extraction",
            fallback_models=["model-b", "model-c"],
        )

        insert_payload = db.table.return_value.insert.call_args[0][0]
        assert insert_payload["fallback_models"] == ["model-b", "model-c"]

    def test_metadata_stored_in_payload(self) -> None:
        event_id = str(uuid4())
        db = _make_db(rows=[{"id": event_id}])
        recorder = PipelineEventRecorder(db)

        recorder.start_stage(
            extraction_id=uuid4(),
            stage="pass2_validation",
            metadata={"dual_mode": True},
        )

        insert_payload = db.table.return_value.insert.call_args[0][0]
        assert insert_payload["metadata"] == {"dual_mode": True}

    def test_all_valid_stages_accepted(self) -> None:
        for stage in PIPELINE_STAGES:
            event_id = str(uuid4())
            db = _make_db(rows=[{"id": event_id}])
            recorder = PipelineEventRecorder(db)
            result = recorder.start_stage(extraction_id=uuid4(), stage=stage)
            assert result is not None


# ---------------------------------------------------------------------------
# PipelineEventRecorder.finish_stage
# ---------------------------------------------------------------------------


class TestFinishStage:
    def test_updates_row_with_terminal_state(self) -> None:
        db = _make_db()
        recorder = PipelineEventRecorder(db)
        event_id = uuid4()

        recorder.finish_stage(
            event_id=event_id,
            status="succeeded",
            duration_ms=1200,
        )

        db.table.assert_called_once_with("extraction_pipeline_events")
        update_payload = db.table.return_value.update.call_args[0][0]
        assert update_payload["status"] == "succeeded"
        assert update_payload["duration_ms"] == 1200
        assert update_payload["retry_count"] == 0
        db.table.return_value.update.return_value.eq.assert_called_once_with(
            "id", str(event_id)
        )

    def test_raises_on_invalid_status(self) -> None:
        db = _make_db()
        recorder = PipelineEventRecorder(db)

        with pytest.raises(ValueError, match="Unknown pipeline status"):
            recorder.finish_stage(
                event_id=uuid4(),
                status="started",  # "started" is not a terminal status
                duration_ms=100,
            )

    def test_error_class_stored_in_payload(self) -> None:
        db = _make_db()
        recorder = PipelineEventRecorder(db)

        recorder.finish_stage(
            event_id=uuid4(),
            status="failed",
            duration_ms=500,
            error_class="cost_ceiling",
        )

        update_payload = db.table.return_value.update.call_args[0][0]
        assert update_payload["error_class"] == "cost_ceiling"

    def test_model_stored_when_provided(self) -> None:
        db = _make_db()
        recorder = PipelineEventRecorder(db)

        recorder.finish_stage(
            event_id=uuid4(),
            status="succeeded",
            duration_ms=800,
            model="openai/gpt-5.4-mini",
        )

        update_payload = db.table.return_value.update.call_args[0][0]
        assert update_payload["model"] == "openai/gpt-5.4-mini"

    def test_db_error_does_not_raise(self) -> None:
        db = MagicMock()
        db.table.return_value.update.return_value.eq.return_value.execute.side_effect = RuntimeError(
            "DB unavailable"
        )
        recorder = PipelineEventRecorder(db)

        # Must not raise — fail-open
        recorder.finish_stage(
            event_id=uuid4(),
            status="succeeded",
            duration_ms=100,
        )

    def test_all_terminal_statuses_accepted(self) -> None:
        for status in {"succeeded", "failed", "skipped"}:
            db = _make_db()
            recorder = PipelineEventRecorder(db)
            recorder.finish_stage(event_id=uuid4(), status=status, duration_ms=100)


# ---------------------------------------------------------------------------
# build_stage_summary
# ---------------------------------------------------------------------------


class TestBuildStageSummary:
    def test_empty_events_returns_none_stage(self) -> None:
        summary = build_stage_summary(events=[], pass_records=None)
        assert summary["final_stage"] is None
        assert summary["attempts_by_stage"] == {}
        assert summary["latest_error_class"] is None
        assert summary["timeline_table"] == "extraction_pipeline_events"

    def test_final_stage_from_last_event(self) -> None:
        events = [
            {"stage": "pass1_extraction", "attempt_number": 1, "error_class": None},
            {"stage": "pass2_validation", "attempt_number": 1, "error_class": None},
        ]
        summary = build_stage_summary(events=events, pass_records=None)
        assert summary["final_stage"] == "pass2_validation"

    def test_attempts_by_stage_uses_max(self) -> None:
        events = [
            {"stage": "pass1_extraction", "attempt_number": 1, "error_class": None},
            {"stage": "pass1_extraction", "attempt_number": 2, "error_class": None},
        ]
        summary = build_stage_summary(events=events, pass_records=None)
        assert summary["attempts_by_stage"]["pass1_extraction"] == 2

    def test_error_class_captured_from_events(self) -> None:
        events = [
            {
                "stage": "pass2_validation",
                "attempt_number": 1,
                "error_class": "json_parse_error",
            },
        ]
        summary = build_stage_summary(events=events, pass_records=None)
        assert summary["latest_error_class"] == "json_parse_error"

    def test_final_model_from_last_pass_record(self) -> None:
        pass_records = [
            {"model": "google/gemini-3-flash-preview"},
            {"model": "openai/gpt-5.4-mini"},
        ]
        summary = build_stage_summary(events=[], pass_records=pass_records)
        assert summary["final_model"] == "openai/gpt-5.4-mini"

    def test_stage_with_no_stage_key_skipped(self) -> None:
        events = [{"attempt_number": 1, "error_class": None}]  # no "stage" key
        summary = build_stage_summary(events=events, pass_records=None)
        assert summary["final_stage"] is None


# ---------------------------------------------------------------------------
# set_sentry_pipeline_context
# ---------------------------------------------------------------------------


class TestSetSentryPipelineContext:
    def test_sets_tags_and_context(self) -> None:
        import importlib
        import sys
        from unittest.mock import MagicMock as MockMagic

        mock_sentry = MockMagic()
        original = sys.modules.get("sentry_sdk")
        sys.modules["sentry_sdk"] = mock_sentry
        try:
            from app.services import pipeline_events as pe_module

            importlib.reload(pe_module)

            pe_module.set_sentry_pipeline_context(
                extraction_id=uuid4(),
                stage="pass1_extraction",
                model="test-model",
                retry_count=0,
                duration_ms=1000,
            )

            mock_sentry.set_tag.assert_called()
            mock_sentry.set_context.assert_called_once()
        finally:
            if original is not None:
                sys.modules["sentry_sdk"] = original
            else:
                del sys.modules["sentry_sdk"]
            importlib.reload(pe_module)

    def test_empty_context_skips_calls(self) -> None:
        # Should not raise even with no kwargs
        set_sentry_pipeline_context()

    def test_none_values_filtered_out(self) -> None:
        import importlib
        import sys
        from unittest.mock import MagicMock as MockMagic

        mock_sentry = MockMagic()
        original = sys.modules.get("sentry_sdk")
        sys.modules["sentry_sdk"] = mock_sentry
        try:
            from app.services import pipeline_events as pe_module

            importlib.reload(pe_module)

            pe_module.set_sentry_pipeline_context(stage=None, model="test-model")  # type: ignore[arg-type]

            # set_context should be called with only non-None values
            context_call = mock_sentry.set_context.call_args[0][1]
            assert "stage" not in context_call
            assert context_call["model"] == "test-model"
        finally:
            if original is not None:
                sys.modules["sentry_sdk"] = original
            else:
                del sys.modules["sentry_sdk"]
            importlib.reload(pe_module)
