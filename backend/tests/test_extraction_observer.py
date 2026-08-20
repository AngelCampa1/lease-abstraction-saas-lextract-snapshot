"""Tests for ExtractionPipelineObserver."""

from __future__ import annotations

from unittest.mock import MagicMock, patch
from uuid import UUID, uuid4

from app.services.extraction_observer import ExtractionPipelineObserver


def _make_db() -> MagicMock:
    """Build a DB mock that returns a single row on insert."""
    db = MagicMock()
    event_id = str(uuid4())
    mock_result = MagicMock()
    mock_result.data = [{"id": event_id}]
    db.table.return_value.insert.return_value.execute.return_value = mock_result
    db.table.return_value.update.return_value.eq.return_value.execute.return_value = (
        MagicMock()
    )
    return db, event_id


class TestExtractionPipelineObserverStartStage:
    def test_returns_uuid_from_db(self) -> None:
        db, event_id = _make_db()
        obs = ExtractionPipelineObserver(extraction_id=str(uuid4()), db=db)

        handle = obs.start_stage(
            stage="pass1_extraction", model="google/gemini-3-flash-preview"
        )

        assert handle == UUID(event_id)

    def test_stores_event_in_memory(self) -> None:
        db, event_id = _make_db()
        obs = ExtractionPipelineObserver(extraction_id=str(uuid4()), db=db)

        obs.start_stage(stage="pass1_extraction")

        assert len(obs._events) == 1
        assert obs._events[0]["stage"] == "pass1_extraction"

    def test_returns_none_on_recorder_error(self) -> None:
        db = MagicMock()
        db.table.return_value.insert.return_value.execute.side_effect = RuntimeError(
            "DB down"
        )
        obs = ExtractionPipelineObserver(extraction_id=str(uuid4()), db=db)

        handle = obs.start_stage(stage="pass1_extraction")

        assert handle is None

    def test_does_not_raise_on_any_error(self) -> None:
        db = MagicMock()
        db.table.side_effect = Exception("catastrophic")
        obs = ExtractionPipelineObserver(extraction_id=str(uuid4()), db=db)

        # Must not raise
        result = obs.start_stage(stage="pass2_validation")
        assert result is None

    def test_sentry_context_called(self) -> None:
        db, _ = _make_db()
        obs = ExtractionPipelineObserver(extraction_id=str(uuid4()), db=db)

        with patch(
            "app.services.extraction_observer.set_sentry_pipeline_context"
        ) as mock_sentry:
            obs.start_stage(stage="pass1_extraction", model="test-model")
            mock_sentry.assert_called_once()

    def test_sentry_raise_is_swallowed(self) -> None:
        """If set_sentry_pipeline_context raises the outer except catches it."""
        db, _ = _make_db()
        obs = ExtractionPipelineObserver(extraction_id=str(uuid4()), db=db)

        with patch(
            "app.services.extraction_observer.set_sentry_pipeline_context",
            side_effect=RuntimeError("sentry down"),
        ):
            result = obs.start_stage(stage="pass1_extraction")

        assert result is None


class TestExtractionPipelineObserverFinishStage:
    def test_updates_in_memory_event_error_class(self) -> None:
        db, event_id = _make_db()
        obs = ExtractionPipelineObserver(extraction_id=str(uuid4()), db=db)

        handle = obs.start_stage(stage="pass1_extraction")
        obs.finish_stage(
            handle,
            status="failed",
            duration_ms=500,
            error_class="model_timeout",
        )

        assert obs._events[0]["error_class"] == "model_timeout"

    def test_none_handle_returns_without_db_call(self) -> None:
        db, _ = _make_db()
        obs = ExtractionPipelineObserver(extraction_id=str(uuid4()), db=db)

        # finish_stage with None handle — should not call the DB update
        obs.finish_stage(None, status="succeeded", duration_ms=100)  # type: ignore[arg-type]

        db.table.return_value.update.assert_not_called()

    def test_db_error_does_not_raise(self) -> None:
        db = MagicMock()
        db.table.return_value.update.return_value.eq.return_value.execute.side_effect = RuntimeError(
            "DB down"
        )
        obs = ExtractionPipelineObserver(extraction_id=str(uuid4()), db=db)

        # Must not raise
        obs.finish_stage(uuid4(), status="succeeded", duration_ms=100)

    def test_model_updated_on_finish(self) -> None:
        db, event_id = _make_db()
        obs = ExtractionPipelineObserver(extraction_id=str(uuid4()), db=db)

        handle = obs.start_stage(stage="pass1_extraction", model="primary-model")
        obs.finish_stage(
            handle,
            status="succeeded",
            duration_ms=800,
            model="fallback-model",
        )

        assert obs._events[0]["model"] == "fallback-model"

    def test_sentry_context_called_on_finish(self) -> None:
        db, event_id = _make_db()
        obs = ExtractionPipelineObserver(extraction_id=str(uuid4()), db=db)

        handle = obs.start_stage(stage="pass1_extraction")
        with patch(
            "app.services.extraction_observer.set_sentry_pipeline_context"
        ) as mock_sentry:
            obs.finish_stage(handle, status="succeeded", duration_ms=100)
            mock_sentry.assert_called_once()

    def test_sentry_raise_on_finish_is_swallowed(self) -> None:
        """If set_sentry_pipeline_context raises in finish_stage the outer except catches it."""
        db, _ = _make_db()
        obs = ExtractionPipelineObserver(extraction_id=str(uuid4()), db=db)

        with patch(
            "app.services.extraction_observer.set_sentry_pipeline_context",
            side_effect=RuntimeError("sentry down"),
        ):
            # Must not raise
            obs.finish_stage(uuid4(), status="succeeded", duration_ms=100)


class TestExtractionPipelineObserverBuildSummary:
    def test_returns_summary_dict(self) -> None:
        db, event_id = _make_db()
        obs = ExtractionPipelineObserver(extraction_id=str(uuid4()), db=db)

        obs.start_stage(stage="pass1_extraction")
        obs.finish_stage(UUID(event_id), status="succeeded", duration_ms=1000)

        summary = obs.build_summary(
            pass_records=[{"model": "google/gemini-3-flash-preview"}]
        )

        assert "final_stage" in summary
        assert "attempts_by_stage" in summary
        assert summary["final_stage"] == "pass1_extraction"

    def test_empty_events_returns_valid_summary(self) -> None:
        db, _ = _make_db()
        obs = ExtractionPipelineObserver(extraction_id=str(uuid4()), db=db)

        summary = obs.build_summary(pass_records=[])

        assert summary["final_stage"] is None
        assert summary["attempts_by_stage"] == {}

    def test_multiple_stages_reflected(self) -> None:
        db = MagicMock()
        # Each insert returns a new event ID
        ids = [str(uuid4()), str(uuid4())]
        call_count = 0

        def insert_side_effect(payload: dict) -> MagicMock:
            nonlocal call_count
            result = MagicMock()
            result.data = [{"id": ids[call_count]}]
            call_count += 1
            return MagicMock(execute=MagicMock(return_value=result))

        db.table.return_value.insert.side_effect = insert_side_effect
        db.table.return_value.update.return_value.eq.return_value.execute.return_value = (
            MagicMock()
        )

        obs = ExtractionPipelineObserver(extraction_id=str(uuid4()), db=db)

        h1 = obs.start_stage(stage="pass1_extraction")
        h2 = obs.start_stage(stage="pass2_validation")
        obs.finish_stage(h1, status="succeeded", duration_ms=1000)
        obs.finish_stage(h2, status="succeeded", duration_ms=500)

        summary = obs.build_summary(pass_records=[])
        assert "pass1_extraction" in summary["attempts_by_stage"]
        assert "pass2_validation" in summary["attempts_by_stage"]
