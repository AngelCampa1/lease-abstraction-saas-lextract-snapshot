"""Tests for the extraction status state machine and update function."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from app.core.status import (
    InvalidStatusTransitionError,
    update_extraction_status,
    validate_transition,
)
from app.models.enums import ExtractionStatus


class TestValidateTransition:
    """Tests for the validate_transition function."""

    @pytest.mark.parametrize(
        ("current", "target"),
        [
            (ExtractionStatus.UPLOADING, ExtractionStatus.EXTRACTING),
            (ExtractionStatus.UPLOADING, ExtractionStatus.FAILED),
            (ExtractionStatus.EXTRACTING, ExtractionStatus.SCORING),
            (ExtractionStatus.EXTRACTING, ExtractionStatus.FAILED),
            (ExtractionStatus.SCORING, ExtractionStatus.COMPLETE),
            (ExtractionStatus.SCORING, ExtractionStatus.FAILED),
        ],
    )
    def test_valid_transitions_return_true(
        self, current: ExtractionStatus, target: ExtractionStatus
    ) -> None:
        assert validate_transition(current, target) is True

    @pytest.mark.parametrize(
        ("current", "target"),
        [
            (ExtractionStatus.UPLOADING, ExtractionStatus.SCORING),
            (ExtractionStatus.UPLOADING, ExtractionStatus.COMPLETE),
            (ExtractionStatus.EXTRACTING, ExtractionStatus.UPLOADING),
            (ExtractionStatus.EXTRACTING, ExtractionStatus.COMPLETE),
            (ExtractionStatus.SCORING, ExtractionStatus.UPLOADING),
            (ExtractionStatus.SCORING, ExtractionStatus.EXTRACTING),
        ],
    )
    def test_invalid_transitions_return_false(
        self, current: ExtractionStatus, target: ExtractionStatus
    ) -> None:
        assert validate_transition(current, target) is False

    def test_uploading_to_extracting_direct_transition(self) -> None:
        """UPLOADING -> EXTRACTING is valid (no OCR step in Gemini pipeline)."""
        assert (
            validate_transition(ExtractionStatus.UPLOADING, ExtractionStatus.EXTRACTING)
            is True
        )

    def test_complete_is_terminal(self) -> None:
        for status in ExtractionStatus:
            assert validate_transition(ExtractionStatus.COMPLETE, status) is False

    def test_failed_is_terminal(self) -> None:
        for status in ExtractionStatus:
            assert validate_transition(ExtractionStatus.FAILED, status) is False


class TestUpdateExtractionStatus:
    """Tests for the async update_extraction_status function."""

    def _make_mock_db(self, current_status: str) -> MagicMock:
        """Create a mock DB client that returns a record with the given status."""
        mock_db = MagicMock()
        mock_response = MagicMock()
        mock_response.data = {"id": "ext-123", "status": current_status}
        (
            mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value
        ) = mock_response
        mock_db.table.return_value.update.return_value.eq.return_value.execute = (
            MagicMock()
        )
        return mock_db

    def test_valid_transition_updates_db(self) -> None:
        mock_db = self._make_mock_db("uploading")
        with patch("app.core.status._get_db_client", return_value=mock_db):
            applied = update_extraction_status("ext-123", ExtractionStatus.EXTRACTING)

        # An applied transition reports True so callers can run once-per-transition
        # side effects (e.g. completion emails).
        assert applied is True
        # Verify update was called
        mock_db.table.return_value.update.assert_called_once()
        call_args = mock_db.table.return_value.update.call_args[0][0]
        assert call_args["status"] == "extracting"

    def test_same_status_transition_is_idempotent(self) -> None:
        """Celery retries may re-enter a stage that was already persisted."""
        mock_db = self._make_mock_db("extracting")
        with patch("app.core.status._get_db_client", return_value=mock_db):
            applied = update_extraction_status("ext-123", ExtractionStatus.EXTRACTING)

        # An idempotent no-op reports False so retry-driven side effects are skipped.
        assert applied is False
        mock_db.table.return_value.update.assert_not_called()

    def test_same_status_transition_rejects_deleted_row(self) -> None:
        from app.core.exceptions import ConflictError

        mock_db = MagicMock()
        mock_response = MagicMock()
        mock_response.data = {
            "id": "ext-123",
            "status": "extracting",
            "deleted_at": "2026-05-19T14:30:00+00:00",
        }
        (
            mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value
        ) = mock_response

        with patch("app.core.status._get_db_client", return_value=mock_db):
            with pytest.raises(ConflictError, match="ext-123"):
                update_extraction_status("ext-123", ExtractionStatus.EXTRACTING)

        mock_db.table.return_value.update.assert_not_called()

    def test_invalid_transition_raises_value_error(self) -> None:
        mock_db = self._make_mock_db("uploading")
        with patch("app.core.status._get_db_client", return_value=mock_db):
            with pytest.raises(
                InvalidStatusTransitionError, match="uploading.*complete"
            ):
                update_extraction_status("ext-123", ExtractionStatus.COMPLETE)

    def test_sets_processing_started_at_on_extracting(self) -> None:
        """processing_started_at is set when transitioning to EXTRACTING."""
        mock_db = self._make_mock_db("uploading")
        with patch("app.core.status._get_db_client", return_value=mock_db):
            update_extraction_status("ext-123", ExtractionStatus.EXTRACTING)

        call_args = mock_db.table.return_value.update.call_args[0][0]
        assert "processing_started_at" in call_args

    def test_sets_processing_completed_at_on_complete(self) -> None:
        mock_db = self._make_mock_db("scoring")
        with patch("app.core.status._get_db_client", return_value=mock_db):
            update_extraction_status("ext-123", ExtractionStatus.COMPLETE)

        call_args = mock_db.table.return_value.update.call_args[0][0]
        assert "processing_completed_at" in call_args

    def test_sets_processing_completed_at_on_failed(self) -> None:
        mock_db = self._make_mock_db("extracting")
        with patch("app.core.status._get_db_client", return_value=mock_db):
            update_extraction_status("ext-123", ExtractionStatus.FAILED)

        call_args = mock_db.table.return_value.update.call_args[0][0]
        assert "processing_completed_at" in call_args

    def test_extra_data_merged_into_update(self) -> None:
        mock_db = self._make_mock_db("extracting")
        with patch("app.core.status._get_db_client", return_value=mock_db):
            update_extraction_status(
                "ext-123",
                ExtractionStatus.FAILED,
                extra_data={"error_message": "Something broke"},
            )

        call_args = mock_db.table.return_value.update.call_args[0][0]
        assert call_args["error_message"] == "Something broke"
        assert call_args["status"] == "failed"

    def test_update_without_extra_data(self) -> None:
        mock_db = self._make_mock_db("extracting")
        with patch("app.core.status._get_db_client", return_value=mock_db):
            update_extraction_status("ext-123", ExtractionStatus.SCORING)

        call_args = mock_db.table.return_value.update.call_args[0][0]
        assert call_args["status"] == "scoring"

    def test_always_sets_updated_at(self) -> None:
        """Bug #40: Every status update must include updated_at."""
        mock_db = self._make_mock_db("extracting")
        with patch("app.core.status._get_db_client", return_value=mock_db):
            update_extraction_status("ext-123", ExtractionStatus.SCORING)

        call_args = mock_db.table.return_value.update.call_args[0][0]
        assert "updated_at" in call_args
        assert call_args["updated_at"] is not None

    def test_updated_at_set_on_every_transition(self) -> None:
        """Bug #40: updated_at is set for all status transitions, not just some."""
        transitions = [
            ("uploading", ExtractionStatus.EXTRACTING),
            ("extracting", ExtractionStatus.SCORING),
            ("scoring", ExtractionStatus.COMPLETE),
            ("uploading", ExtractionStatus.FAILED),
        ]
        for current, target in transitions:
            mock_db = self._make_mock_db(current)
            with patch("app.core.status._get_db_client", return_value=mock_db):
                update_extraction_status("ext-123", target)

            call_args = mock_db.table.return_value.update.call_args[0][0]
            assert (
                "updated_at" in call_args
            ), f"updated_at missing for transition {current} -> {target}"

    def test_cas_conflict_raises_conflict_error(self) -> None:
        """When CAS update returns no rows, ConflictError is raised."""
        from app.core.exceptions import ConflictError

        mock_db = MagicMock()
        # SELECT returns the current status
        mock_read_response = MagicMock()
        mock_read_response.data = {"id": "ext-123", "status": "uploading"}
        (
            mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value
        ) = mock_read_response
        # UPDATE returns empty data (CAS miss — another writer changed status).
        # The code chains:
        # .update(...).eq("id",...).eq("status",...).is_("deleted_at","null").execute()
        mock_update_response = MagicMock()
        mock_update_response.data = []
        mock_db.table.return_value.update.return_value.eq.return_value.eq.return_value.is_.return_value.execute.return_value = (
            mock_update_response
        )

        with patch("app.core.status._get_db_client", return_value=mock_db):
            with pytest.raises(ConflictError, match="ext-123"):
                update_extraction_status("ext-123", ExtractionStatus.EXTRACTING)

    def test_status_update_requires_row_not_deleted(self) -> None:
        """Pipeline status transitions must not advance soft-deleted rows."""
        from app.core.exceptions import ConflictError

        mock_db = MagicMock()
        mock_read_response = MagicMock()
        mock_read_response.data = {"id": "ext-123", "status": "uploading"}
        (
            mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value
        ) = mock_read_response

        update_query = mock_db.table.return_value.update.return_value
        update_query.eq.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
            data=[]
        )

        with patch("app.core.status._get_db_client", return_value=mock_db):
            with pytest.raises(ConflictError, match="ext-123"):
                update_extraction_status("ext-123", ExtractionStatus.EXTRACTING)

        update_query.eq.return_value.eq.return_value.is_.assert_called_once_with(
            "deleted_at", "null"
        )


class TestGetDbClient:
    """Tests for the _get_db_client helper function."""

    def test_returns_db_admin_client(self):
        from app.core.status import _get_db_client

        mock_admin = MagicMock()
        with patch("app.database.client.get_db_admin", return_value=mock_admin):
            result = _get_db_client()
            assert result is mock_admin
