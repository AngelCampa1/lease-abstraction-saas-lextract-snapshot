"""Extraction status state machine and update function.

Provides validated status transitions for the extraction pipeline.
Each transition is checked against VALID_TRANSITIONS before being
persisted to the database.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

from app.core.exceptions import ConflictError
from app.models.enums import ExtractionStatus

logger = logging.getLogger(__name__)

VALID_TRANSITIONS: dict[ExtractionStatus, set[ExtractionStatus]] = {
    ExtractionStatus.UPLOADING: {
        ExtractionStatus.EXTRACTING,
        ExtractionStatus.FAILED,
    },
    ExtractionStatus.EXTRACTING: {
        ExtractionStatus.SCORING,
        ExtractionStatus.FAILED,
    },
    ExtractionStatus.SCORING: {
        ExtractionStatus.COMPLETE,
        ExtractionStatus.FAILED,
    },
    ExtractionStatus.COMPLETE: set(),
    ExtractionStatus.FAILED: set(),
}


class InvalidStatusTransitionError(ValueError):
    """Raised when an invalid status transition is attempted."""

    def __init__(self, current: ExtractionStatus, target: ExtractionStatus) -> None:
        self.current = current
        self.target = target
        super().__init__(f"Invalid status transition from '{current}' to '{target}'")


def validate_transition(current: ExtractionStatus, target: ExtractionStatus) -> bool:
    """Check whether a status transition is allowed.

    Args:
        current: The current extraction status.
        target: The desired new status.

    Returns:
        True if the transition is valid, False otherwise.
    """
    return target in VALID_TRANSITIONS.get(current, set())


def _get_db_client() -> Any:
    """Get a Neon service client for DB operations.

    Returns:
        NeonDB client instance.
    """
    from app.database.client import get_db_admin

    return get_db_admin()


def update_extraction_status(
    extraction_id: str,
    new_status: ExtractionStatus,
    extra_data: dict[str, Any] | None = None,
) -> bool:
    """Validate and persist a status transition for an extraction.

    Reads the current status from the database, validates the transition,
    and writes the new status along with any extra data. Automatically
    sets timestamp fields on certain transitions:
    - processing_started_at when transitioning to extracting
    - processing_completed_at when transitioning to complete or failed

    Args:
        extraction_id: UUID of the extraction record.
        new_status: The target ExtractionStatus.
        extra_data: Optional additional fields to persist (e.g., error_message).

    Returns:
        True if this call actually applied the transition; False if the row
        was already in ``new_status`` (an idempotent no-op). Callers that must
        run side effects exactly once per transition (e.g. dispatching a
        completion email) can gate on this so a task retry does not repeat them.

    Raises:
        InvalidStatusTransitionError: If the transition is not allowed.
        ConflictError: If the row was deleted or modified concurrently.
    """
    db = _get_db_client()

    # Read current status
    response = (
        db.table("extractions")
        .select("id, status, deleted_at")
        .eq("id", extraction_id)
        .single()
        .execute()
    )
    record = response.data
    if record.get("deleted_at") is not None:
        raise ConflictError(
            f"Status update conflict: extraction {extraction_id} was deleted",
            resource_type="extraction",
            resource_id=extraction_id,
        )
    current_status = ExtractionStatus(record["status"])

    if current_status == new_status:
        logger.info(
            "Extraction %s already in status %s; skipping idempotent transition",
            extraction_id,
            current_status,
        )
        return False

    # Validate transition
    if not validate_transition(current_status, new_status):
        raise InvalidStatusTransitionError(current_status, new_status)

    # Build update payload
    now = datetime.now(UTC).isoformat()
    update_data: dict[str, Any] = {"status": str(new_status), "updated_at": now}

    if new_status == ExtractionStatus.EXTRACTING:
        update_data["processing_started_at"] = now

    if new_status in (ExtractionStatus.COMPLETE, ExtractionStatus.FAILED):
        update_data["processing_completed_at"] = now

    if extra_data:
        update_data.update(extra_data)

    # Persist with CAS: only update if status hasn't changed since we read it.
    # Note: the read + CAS update is not wrapped in a DB transaction because
    # the CAS condition (.eq("status", current_status)) makes the update
    # atomic — if another writer changed the status between our read and
    # write, the WHERE clause won't match and we detect the conflict below.
    # A transaction would not add safety here since the CAS already
    # guarantees at-most-once application of the status change.
    result = (
        db.table("extractions")
        .update(update_data)
        .eq("id", extraction_id)
        .eq("status", str(current_status))
        .is_("deleted_at", "null")
        .execute()
    )

    if not result.data:
        logger.warning(
            "Extraction %s: CAS conflict — status changed since read (expected %s)",
            extraction_id,
            current_status,
        )
        raise ConflictError(
            f"Status update conflict: extraction {extraction_id} "
            f"was modified concurrently (expected status '{current_status}')",
            resource_type="extraction",
            resource_id=extraction_id,
        )

    logger.info(
        "Extraction %s: %s -> %s",
        extraction_id,
        current_status,
        new_status,
    )
    return True
