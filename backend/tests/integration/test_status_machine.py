"""Integration tests for the extraction status state machine.

State machine: UPLOADING -> EXTRACTING -> SCORING -> COMPLETE | FAILED
Any non-terminal state may also transition to FAILED.

BUG #6: When a CAS conflict occurs during status update, the code raises
ConflictError — semantically distinct from InvalidStatusTransitionError.
The transition was valid; it just lost a race. This distinction matters
for retry logic.
"""

from unittest.mock import MagicMock, patch

import pytest

from app.core.exceptions import ConflictError
from app.core.status import (
    InvalidStatusTransitionError,
    update_extraction_status,
    validate_transition,
    VALID_TRANSITIONS,
)
from app.models.enums import ExtractionStatus


class TestValidTransitions:
    """Verify all valid forward transitions succeed."""

    @pytest.mark.parametrize(
        "current,target",
        [
            (ExtractionStatus.UPLOADING, ExtractionStatus.EXTRACTING),
            (ExtractionStatus.EXTRACTING, ExtractionStatus.SCORING),
            (ExtractionStatus.SCORING, ExtractionStatus.COMPLETE),
        ],
    )
    def test_forward_transition_is_valid(self, current, target):
        assert validate_transition(current, target) is True

    @pytest.mark.parametrize(
        "current",
        [
            ExtractionStatus.UPLOADING,
            ExtractionStatus.EXTRACTING,
            ExtractionStatus.SCORING,
        ],
    )
    def test_any_non_terminal_can_transition_to_failed(self, current):
        assert validate_transition(current, ExtractionStatus.FAILED) is True


class TestInvalidTransitions:
    """Verify backward and skip transitions are rejected."""

    @pytest.mark.parametrize(
        "current,target",
        [
            # Backward
            (ExtractionStatus.EXTRACTING, ExtractionStatus.UPLOADING),
            (ExtractionStatus.SCORING, ExtractionStatus.EXTRACTING),
            (ExtractionStatus.COMPLETE, ExtractionStatus.SCORING),
            # Skip
            (ExtractionStatus.UPLOADING, ExtractionStatus.SCORING),
            (ExtractionStatus.UPLOADING, ExtractionStatus.COMPLETE),
            (ExtractionStatus.EXTRACTING, ExtractionStatus.COMPLETE),
        ],
    )
    def test_backward_and_skip_transitions_rejected(self, current, target):
        assert validate_transition(current, target) is False


class TestTerminalStates:
    """Verify COMPLETE and FAILED are terminal — no transitions out."""

    def test_complete_has_no_valid_transitions(self):
        assert VALID_TRANSITIONS[ExtractionStatus.COMPLETE] == set()

    def test_failed_has_no_valid_transitions(self):
        assert VALID_TRANSITIONS[ExtractionStatus.FAILED] == set()

    @pytest.mark.parametrize(
        "target",
        list(ExtractionStatus),
    )
    def test_complete_to_anything_rejected(self, target):
        assert validate_transition(ExtractionStatus.COMPLETE, target) is False

    @pytest.mark.parametrize(
        "target",
        list(ExtractionStatus),
    )
    def test_failed_to_anything_rejected(self, target):
        assert validate_transition(ExtractionStatus.FAILED, target) is False


class TestInvalidStatusTransitionError:
    """Verify update_extraction_status raises on invalid transitions."""

    def test_invalid_transition_raises(self):
        """Attempting a backward transition raises InvalidStatusTransitionError."""
        extraction_id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

        mock_db = MagicMock()
        # SELECT returns current status = SCORING
        select_result = MagicMock()
        select_result.data = {"id": extraction_id, "status": "scoring"}
        select_chain = MagicMock()
        select_chain.eq.return_value = select_chain
        select_chain.single.return_value.execute.return_value = select_result
        mock_db.table.return_value.select.return_value = select_chain

        with patch("app.core.status._get_db_client", return_value=mock_db):
            with pytest.raises(InvalidStatusTransitionError) as exc_info:
                # SCORING -> EXTRACTING is backward, hence invalid
                update_extraction_status(extraction_id, ExtractionStatus.EXTRACTING)

        err = exc_info.value
        assert err.current == ExtractionStatus.SCORING
        assert err.target == ExtractionStatus.EXTRACTING


class TestCASConflictError:
    """BUG #6: CAS conflict raises ConflictError, not InvalidStatusTransitionError."""

    def test_cas_conflict_raises_conflict_error(self):
        """When CAS fails (another process updated status first), the code
        raises ConflictError — correctly distinguishing from invalid transitions.
        """
        extraction_id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

        mock_db = MagicMock()

        # SELECT returns current status = UPLOADING
        select_result = MagicMock()
        select_result.data = {"id": extraction_id, "status": "uploading"}

        select_chain = MagicMock()
        select_chain.eq.return_value = select_chain
        select_chain.single.return_value.execute.return_value = select_result

        # UPDATE with CAS returns empty (another process changed status)
        update_chain = MagicMock()
        update_chain.eq.return_value = update_chain
        update_chain.is_.return_value = update_chain
        update_chain.execute.return_value = MagicMock(data=[])

        mock_db.table.return_value.select.return_value = select_chain
        mock_db.table.return_value.update.return_value = update_chain

        with patch("app.core.status._get_db_client", return_value=mock_db):
            with pytest.raises(ConflictError) as exc_info:
                # UPLOADING -> EXTRACTING is a valid transition; the
                # ConflictError must come from the CAS race, not from
                # transition validation.
                update_extraction_status(extraction_id, ExtractionStatus.EXTRACTING)

        error = exc_info.value
        assert "conflict" in str(error).lower()
        assert error.resource_type == "extraction"
        assert error.resource_id == extraction_id

    def test_timestamps_set_on_transition(self):
        """Verify processing_started_at is set when transitioning to EXTRACTING."""
        extraction_id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

        mock_db = MagicMock()
        select_result = MagicMock()
        select_result.data = {"id": extraction_id, "status": "uploading"}

        select_chain = MagicMock()
        select_chain.eq.return_value = select_chain
        select_chain.single.return_value.execute.return_value = select_result

        captured_updates: list[dict] = []

        def capture_update(data):
            captured_updates.append(data)
            chain = MagicMock()
            chain.eq.return_value = chain
            chain.execute.return_value = MagicMock(data=[{"id": extraction_id}])
            return chain

        mock_db.table.return_value.select.return_value = select_chain
        mock_db.table.return_value.update = capture_update

        with patch("app.core.status._get_db_client", return_value=mock_db):
            update_extraction_status(extraction_id, ExtractionStatus.EXTRACTING)

        assert len(captured_updates) == 1
        update_data = captured_updates[0]
        assert "processing_started_at" in update_data
        assert update_data["status"] == "extracting"

    def test_completed_at_set_on_terminal_transition(self):
        """Verify processing_completed_at is set when transitioning to COMPLETE."""
        extraction_id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

        mock_db = MagicMock()
        select_result = MagicMock()
        select_result.data = {"id": extraction_id, "status": "scoring"}

        select_chain = MagicMock()
        select_chain.eq.return_value = select_chain
        select_chain.single.return_value.execute.return_value = select_result

        captured_updates: list[dict] = []

        def capture_update(data):
            captured_updates.append(data)
            chain = MagicMock()
            chain.eq.return_value = chain
            chain.execute.return_value = MagicMock(data=[{"id": extraction_id}])
            return chain

        mock_db.table.return_value.select.return_value = select_chain
        mock_db.table.return_value.update = capture_update

        with patch("app.core.status._get_db_client", return_value=mock_db):
            update_extraction_status(extraction_id, ExtractionStatus.COMPLETE)

        assert len(captured_updates) == 1
        update_data = captured_updates[0]
        assert "processing_completed_at" in update_data
        assert update_data["status"] == "complete"
