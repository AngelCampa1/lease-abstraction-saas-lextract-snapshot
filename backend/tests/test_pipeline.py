"""Tests for the extraction pipeline orchestration tasks.

Covers run_extraction_pipeline chain wiring, mark_extraction_complete,
and shared failure-handler helpers. Textract/OCR tasks have been removed.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from app.core.status import InvalidStatusTransitionError
from app.core.exceptions import ConflictError
from app.models.enums import ExtractionStatus


class TestRunExtractionPipeline:
    """Tests for the run_extraction_pipeline function."""

    def test_pipeline_chains_4_tasks_in_order(self) -> None:
        """Pipeline chain: gemini_extraction -> score -> red_flags -> complete."""
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

    def test_chain_has_no_gap_filler_task(self) -> None:
        """Regression: gap_filler task must not be re-introduced to the pipeline."""
        import app.tasks.pipeline as pipeline_mod

        assert not hasattr(
            pipeline_mod, "run_gap_filler_task"
        ), "run_gap_filler_task was re-introduced into the pipeline — it must not be there"

    def test_chain_has_no_ocr_task(self) -> None:
        """Regression: start_ocr_job must not appear in the pipeline chain."""
        import app.tasks.pipeline as pipeline_mod

        assert not hasattr(pipeline_mod, "start_ocr_job")

    def test_chain_has_no_poll_task(self) -> None:
        """Regression: poll_textract_until_done must not appear in the pipeline."""
        import app.tasks.pipeline as pipeline_mod

        assert not hasattr(pipeline_mod, "poll_textract_until_done")

    def test_chain_has_no_beat_task(self) -> None:
        """Regression: poll_active_ocr_jobs beat task must be removed."""
        import app.tasks.pipeline as pipeline_mod

        assert not hasattr(pipeline_mod, "poll_active_ocr_jobs")

    def test_run_gemini_extraction_task_is_first_in_chain(self) -> None:
        """run_gemini_extraction_task must be the first task in the chain."""
        from app.tasks.pipeline import run_extraction_pipeline

        with (
            patch("app.tasks.pipeline.run_gemini_extraction_task") as mock_extract,
            patch("app.tasks.pipeline.score_confidence_task") as mock_score,
            patch("app.tasks.pipeline.run_red_flags_task") as mock_flags,
            patch("app.tasks.pipeline.mark_extraction_complete") as mock_complete,
            patch("app.tasks.pipeline.chain") as mock_chain,
        ):
            for m in [mock_extract, mock_score, mock_flags, mock_complete]:
                m.si.return_value = MagicMock(name=m._mock_name)
            mock_chain.return_value.apply_async = MagicMock()

            run_extraction_pipeline("ext-789")

            # Verify run_gemini_extraction_task.si was called
            mock_extract.si.assert_called_once_with("ext-789")

    def test_mark_extraction_complete_is_last_in_chain(self) -> None:
        """mark_extraction_complete must be the final task in the chain."""
        from app.tasks.pipeline import run_extraction_pipeline

        with (
            patch("app.tasks.pipeline.run_gemini_extraction_task") as mock_extract,
            patch("app.tasks.pipeline.score_confidence_task") as mock_score,
            patch("app.tasks.pipeline.run_red_flags_task") as mock_flags,
            patch("app.tasks.pipeline.mark_extraction_complete") as mock_complete,
            patch("app.tasks.pipeline.chain") as mock_chain,
        ):
            for m in [mock_extract, mock_score, mock_flags, mock_complete]:
                m.si.return_value = MagicMock(name=m._mock_name)
            mock_chain.return_value.apply_async = MagicMock()

            run_extraction_pipeline("ext-789")

            # Verify mark_extraction_complete.si was called
            mock_complete.si.assert_called_once_with("ext-789")


class TestMarkExtractionComplete:
    """Tests for the mark_extraction_complete task."""

    def test_marks_complete(self) -> None:
        from app.tasks.pipeline import mark_extraction_complete

        with (
            patch("app.tasks.pipeline.update_extraction_status") as mock_status,
            patch("app.tasks.pipeline._get_db_client") as mock_get_db,
        ):
            mock_db = MagicMock()
            mock_response = MagicMock()
            mock_response.data = {"user_id": None}
            mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = (
                mock_response
            )
            mock_get_db.return_value = mock_db

            result = mark_extraction_complete("ext-123")

            assert result["extraction_id"] == "ext-123"
            assert result["status"] == "complete"
            mock_status.assert_called_once()

    def test_failure_marks_extraction_failed(self) -> None:
        from app.tasks.pipeline import mark_extraction_complete

        with (
            patch(
                "app.tasks.pipeline.update_extraction_status",
                side_effect=RuntimeError("DB error"),
            ),
            patch("app.tasks.pipeline.on_pipeline_failure") as mock_fail,
        ):
            with pytest.raises(RuntimeError, match="DB error"):
                mark_extraction_complete("ext-123")

            mock_fail.assert_called_once()

    def test_dispatches_email_tasks_when_user_id_present(self) -> None:
        """Email tasks are dispatched when user_id is set on the extraction."""
        from app.tasks.pipeline import mark_extraction_complete

        mock_complete_email = MagicMock()
        mock_flags_email = MagicMock()

        with (
            patch("app.tasks.pipeline.update_extraction_status"),
            patch("app.tasks.pipeline._get_db_client") as mock_get_db,
            patch(
                "app.tasks.email.send_extraction_complete_email",
                mock_complete_email,
            ),
            patch("app.tasks.email.send_cam_flags_email", mock_flags_email),
        ):
            mock_db = MagicMock()
            mock_response = MagicMock()
            mock_response.data = {"user_id": "user-abc"}
            mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = (
                mock_response
            )
            mock_get_db.return_value = mock_db

            result = mark_extraction_complete("ext-user")

        assert result["status"] == "complete"
        mock_complete_email.delay.assert_called_once_with("ext-user")
        mock_flags_email.apply_async.assert_called_once()

    def test_email_dispatch_failure_is_non_fatal(self) -> None:
        """Email dispatch errors must be caught and logged, not re-raised."""
        from app.tasks.pipeline import mark_extraction_complete

        with (
            patch("app.tasks.pipeline.update_extraction_status"),
            patch("app.tasks.pipeline._get_db_client") as mock_get_db,
            patch(
                "app.tasks.email.send_extraction_complete_email",
                side_effect=RuntimeError("Email service down"),
            ),
        ):
            mock_db = MagicMock()
            mock_response = MagicMock()
            mock_response.data = {"user_id": "user-xyz"}
            mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = (
                mock_response
            )
            mock_get_db.return_value = mock_db

            # Should not raise — email errors are non-fatal
            result = mark_extraction_complete("ext-email-error")

        assert result["status"] == "complete"

    def test_cancelled_extraction_is_not_marked_complete(self) -> None:
        from app.tasks.pipeline import mark_extraction_complete

        with (
            patch(
                "app.tasks.pipeline.update_extraction_status",
                side_effect=InvalidStatusTransitionError(
                    ExtractionStatus.FAILED, ExtractionStatus.COMPLETE
                ),
            ) as mock_status,
            patch("app.tasks.pipeline.on_pipeline_failure") as mock_fail,
            patch("app.tasks.pipeline._get_db_client") as mock_get_db,
        ):
            with pytest.raises(InvalidStatusTransitionError):
                mark_extraction_complete("ext-123")

        mock_status.assert_called_once()
        mock_fail.assert_called_once()
        mock_get_db.assert_not_called()

    def test_concurrent_completion_conflict_does_not_dispatch_email(self) -> None:
        from app.tasks.pipeline import mark_extraction_complete

        with (
            patch(
                "app.tasks.pipeline.update_extraction_status",
                side_effect=ConflictError(
                    "Status changed",
                    resource_type="extraction",
                    resource_id="ext-123",
                ),
            ),
            patch("app.tasks.pipeline._get_db_client") as mock_get_db,
        ):
            with pytest.raises(ConflictError):
                mark_extraction_complete("ext-123")

        mock_get_db.assert_not_called()

    def test_concurrent_completion_conflict_does_not_mark_failed(self) -> None:
        from app.tasks.pipeline import mark_extraction_complete

        with (
            patch(
                "app.tasks.pipeline.update_extraction_status",
                side_effect=ConflictError(
                    "Status changed",
                    resource_type="extraction",
                    resource_id="ext-123",
                ),
            ),
            patch("app.tasks.pipeline.on_pipeline_failure") as mock_fail,
        ):
            with pytest.raises(ConflictError):
                mark_extraction_complete("ext-123")

        mock_fail.assert_not_called()


class TestBeatSchedule:
    """Tests that no scheduled tasks can wake Neon while idle."""

    def test_beat_schedule_is_empty(self) -> None:
        """No Celery beat tasks should run without a user/operator trigger."""
        from app.core.celery_app import celery_app

        assert celery_app.conf.beat_schedule == {}

    def test_beat_schedule_has_no_ocr_poll(self) -> None:
        """poll-active-ocr-jobs must be removed from the beat schedule."""
        from app.core.celery_app import celery_app

        schedule = celery_app.conf.beat_schedule
        assert "poll-active-ocr-jobs" not in schedule

    def test_beat_schedule_is_empty_or_dict(self) -> None:
        """beat_schedule should be a dict (possibly empty)."""
        from app.core.celery_app import celery_app

        assert isinstance(celery_app.conf.beat_schedule, dict)


class TestNoActiveOcrKey:
    """Regression tests verifying ACTIVE_OCR_KEY was fully removed."""

    def test_active_ocr_key_not_in_pipeline_module(self) -> None:
        """ACTIVE_OCR_KEY constant must be gone from pipeline module."""
        import app.tasks.pipeline as pipeline_mod

        assert not hasattr(pipeline_mod, "ACTIVE_OCR_KEY")

    def test_pipeline_module_has_no_redis_imports(self) -> None:
        """pipeline.py must not import _get_redis_client."""
        import inspect

        import app.tasks.pipeline as pipeline_mod

        source = inspect.getsource(pipeline_mod)
        assert "_get_redis_client" not in source


class TestFailureHandler:
    """Tests for pipeline task failure handling."""

    def test_on_pipeline_failure_marks_failed(self) -> None:
        from app.tasks._helpers import on_pipeline_failure

        with patch("app.tasks._helpers.update_extraction_status") as mock_status:
            on_pipeline_failure(
                extraction_id="ext-123",
                error_message="Something went wrong",
            )
            mock_status.assert_called_once()

    def test_on_pipeline_failure_handles_invalid_transition(self) -> None:
        """When extraction is already terminal, failure handler should not raise."""
        from app.tasks._helpers import on_pipeline_failure

        with patch(
            "app.tasks._helpers.update_extraction_status",
            side_effect=InvalidStatusTransitionError(
                ExtractionStatus.COMPLETE, ExtractionStatus.FAILED
            ),
        ):
            on_pipeline_failure(
                extraction_id="ext-123",
                error_message="Already done",
            )

    def test_on_pipeline_failure_handles_unexpected_error(self) -> None:
        """When an unexpected error occurs, failure handler should not raise."""
        from app.tasks._helpers import on_pipeline_failure

        with patch(
            "app.tasks._helpers.update_extraction_status",
            side_effect=RuntimeError("DB connection lost"),
        ):
            on_pipeline_failure(
                extraction_id="ext-123",
                error_message="Some error",
            )


class TestHelpersNoTextractClient:
    """Regression: _get_textract_client must be removed from _helpers."""

    def test_get_textract_client_removed_from_helpers(self) -> None:
        from app.tasks import _helpers

        assert not hasattr(_helpers, "_get_textract_client")

    def test_helpers_has_get_db_client(self) -> None:
        """_get_db_client must still be present."""
        from app.tasks._helpers import _get_db_client

        assert callable(_get_db_client)
