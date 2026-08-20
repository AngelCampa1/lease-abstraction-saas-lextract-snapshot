"""Tests for the cleanup_stuck_extractions manual maintenance task.

Verifies that extractions stuck in ``uploading``, ``extracting``, or
``scoring`` past the 60-minute stall threshold are marked ``failed`` so users
see a clear error instead of a forever-spinning processing page. The task must
not be registered in the Celery beat schedule because scheduled DB reads wake
Neon compute when no user is active.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock, patch


class TestCleanupStuckExtractions:
    """Beat task that fails extractions stalled in upload/extract/score > 60 min."""

    def test_marks_old_extracting_jobs_failed(self) -> None:
        from app.tasks.pipeline import cleanup_stuck_extractions

        threshold = datetime.now(UTC) - timedelta(minutes=61)
        stuck_rows = [
            {"id": "11111111-1111-4111-a111-111111111111", "status": "extracting"},
            {"id": "22222222-2222-4222-a222-222222222222", "status": "scoring"},
        ]

        mock_db = MagicMock()
        # First .select() chain returns the stuck rows
        select_chain = MagicMock()
        select_chain.execute.return_value = MagicMock(data=stuck_rows)
        mock_db.table.return_value.select.return_value.in_.return_value.lt.return_value.is_.return_value = (
            select_chain
        )
        # update chain
        update_chain = MagicMock()
        mock_db.table.return_value.update.return_value.eq.return_value.eq.return_value.is_.return_value.execute.return_value = (
            update_chain
        )
        update_chain.data = [{"id": stuck_rows[0]["id"]}]

        with patch(
            "app.tasks.pipeline._get_db_client",
            return_value=mock_db,
        ):
            result = cleanup_stuck_extractions.run()

        # Both rows should be marked failed
        assert result["failed_count"] == 2
        assert mock_db.table.return_value.update.call_count == 2
        # Ensure the update payload uses the expected error message
        for call in mock_db.table.return_value.update.call_args_list:
            payload = call.args[0]
            assert payload["status"] == "failed"
            assert "timed out" in payload["error_message"].lower()
        assert threshold is not None  # threshold variable used for clarity

    def test_no_stuck_jobs_returns_zero(self) -> None:
        from app.tasks.pipeline import cleanup_stuck_extractions

        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.in_.return_value.lt.return_value.is_.return_value.execute.return_value = MagicMock(
            data=[]
        )

        with patch(
            "app.tasks.pipeline._get_db_client",
            return_value=mock_db,
        ):
            result = cleanup_stuck_extractions.run()

        assert result["failed_count"] == 0
        # No updates dispatched
        mock_db.table.return_value.update.assert_not_called()

    def test_query_filters_on_uploading_extracting_and_scoring(self) -> None:
        """The query must scope to uploading/extracting/scoring, exclude deleted."""
        from app.tasks.pipeline import cleanup_stuck_extractions

        mock_db = MagicMock()
        in_chain = MagicMock()
        mock_db.table.return_value.select.return_value.in_ = in_chain
        in_chain.return_value.lt.return_value.is_.return_value.execute.return_value = (
            MagicMock(data=[])
        )

        with patch(
            "app.tasks.pipeline._get_db_client",
            return_value=mock_db,
        ):
            cleanup_stuck_extractions.run()

        # Verify the .in_ filter targeted uploading, extracting, and scoring
        in_call = in_chain.call_args
        assert in_call.args[0] == "status"
        assert set(in_call.args[1]) == {"uploading", "extracting", "scoring"}

    def test_marks_old_uploading_jobs_failed(self) -> None:
        """An uploading row older than the threshold is flipped to failed.

        A row is inserted as ``uploading`` and only flips to ``extracting`` once
        the Gemini task starts executing. If the worker is down or the broker
        drops the message, the row strands in ``uploading`` forever — the sweep
        must recover it.
        """
        from app.tasks.pipeline import cleanup_stuck_extractions

        stuck_rows = [
            {"id": "33333333-3333-4333-a333-333333333333", "status": "uploading"},
        ]

        mock_db = MagicMock()
        select_chain = MagicMock()
        select_chain.execute.return_value = MagicMock(data=stuck_rows)
        mock_db.table.return_value.select.return_value.in_.return_value.lt.return_value.is_.return_value = (
            select_chain
        )
        update_chain = MagicMock()
        mock_db.table.return_value.update.return_value.eq.return_value.eq.return_value.is_.return_value.execute.return_value = (
            update_chain
        )
        update_chain.data = [{"id": stuck_rows[0]["id"]}]

        with patch(
            "app.tasks.pipeline._get_db_client",
            return_value=mock_db,
        ):
            result = cleanup_stuck_extractions.run()

        assert result["failed_count"] == 1
        assert mock_db.table.return_value.update.call_count == 1
        payload = mock_db.table.return_value.update.call_args.args[0]
        assert payload["status"] == "failed"
        assert "timed out" in payload["error_message"].lower()
        # The CAS guard must match the original uploading status: the second
        # .eq() in the update chain pins the WHERE clause to the read status.
        cas_status_eq = (
            mock_db.table.return_value.update.return_value.eq.return_value.eq
        )
        assert cas_status_eq.call_args.args == ("status", "uploading")

    def test_fresh_uploading_job_is_left_alone(self) -> None:
        """An uploading row newer than the threshold is not swept.

        The DB-level ``.lt("updated_at", threshold)`` filter excludes fresh
        rows, so the select returns nothing and no update is dispatched — a job
        that legitimately just started is protected.
        """
        from app.tasks.pipeline import cleanup_stuck_extractions

        captured: dict[str, object] = {}

        mock_db = MagicMock()

        def _lt(column: str, value: str) -> MagicMock:
            captured["lt_column"] = column
            captured["lt_value"] = value
            # The fresh uploading row is filtered out by updated_at, so the
            # query yields no stuck rows.
            chain = MagicMock()
            chain.is_.return_value.execute.return_value = MagicMock(data=[])
            return chain

        mock_db.table.return_value.select.return_value.in_.return_value.lt.side_effect = (
            _lt
        )

        with patch(
            "app.tasks.pipeline._get_db_client",
            return_value=mock_db,
        ):
            result = cleanup_stuck_extractions.run()

        assert result["failed_count"] == 0
        assert result["checked"] == 0
        mock_db.table.return_value.update.assert_not_called()
        # The threshold filter is applied on updated_at.
        assert captured["lt_column"] == "updated_at"

    def test_task_is_not_registered_in_beat_schedule(self) -> None:
        from app.core.celery_app import celery_app

        beat_schedule = celery_app.conf.beat_schedule
        assert "cleanup-stuck-extractions" not in beat_schedule
