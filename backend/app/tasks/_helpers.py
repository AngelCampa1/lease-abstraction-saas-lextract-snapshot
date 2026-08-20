"""Shared helpers for pipeline tasks.

Provides failure handling used by extraction, scoring, and red flag tasks.
Extracted to avoid circular imports between task modules.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

import sentry_sdk

from app.core.exceptions import ConflictError
from app.core.status import InvalidStatusTransitionError, update_extraction_status
from app.models.enums import ExtractionStatus

logger = logging.getLogger(__name__)

CANCELLED_ERROR_MESSAGE = "Processing cancelled by user"


class PipelineStoppedError(RuntimeError):
    """Raised when a pipeline task should stop without failure cleanup."""


def _get_db_client() -> Any:
    """Get a Neon service client for DB operations.

    Returns:
        NeonDB client instance.
    """
    from app.database.client import get_db_admin

    return get_db_admin()


def raise_if_pipeline_stopped(db: Any, extraction_id: str) -> None:
    """Stop task work when the extraction row is already terminal."""
    response = (
        db.table("extractions")
        .select("status, error_message, deleted_at")
        .eq("id", extraction_id)
        .single()
        .execute()
    )
    record = response.data or {}
    if record.get("deleted_at") is not None:
        raise PipelineStoppedError(f"Extraction {extraction_id} was deleted")

    status = record.get("status")
    if status not in {
        ExtractionStatus.COMPLETE.value,
        ExtractionStatus.FAILED.value,
    }:
        return

    error_message = record.get("error_message")
    if error_message == CANCELLED_ERROR_MESSAGE:
        raise PipelineStoppedError(f"Extraction {extraction_id} was cancelled")

    raise PipelineStoppedError(
        f"Extraction {extraction_id} is already terminal ({status})"
    )


def update_extraction_if_status_matches(
    db: Any,
    extraction_id: str,
    update_data: dict[str, Any],
    expected_status: ExtractionStatus,
) -> None:
    """Persist task output only if the pipeline status has not changed.

    Always stamps a fresh ``updated_at`` so liveness reflects real pipeline
    progress (preventing ``cleanup_stuck_extractions`` from force-failing
    slow-but-alive jobs). The caller's dict is copied rather than mutated.
    """
    payload = {**update_data, "updated_at": datetime.now(UTC).isoformat()}
    result = (
        db.table("extractions")
        .update(payload)
        .eq("id", extraction_id)
        .eq("status", expected_status.value)
        .is_("deleted_at", "null")
        .execute()
    )
    if not getattr(result, "data", None):
        raise PipelineStoppedError(
            f"Extraction {extraction_id} changed status before task output write"
        )


def on_pipeline_failure(
    extraction_id: str,
    error_message: str,
) -> None:
    """Mark an extraction as failed when a pipeline task errors.

    Args:
        extraction_id: UUID of the extraction record.
        error_message: Human-readable error description.
    """
    sentry_sdk.set_tag("extraction_id", extraction_id)
    sentry_sdk.capture_message(
        f"Pipeline failure: {error_message}",
        level="error",
    )
    try:
        update_extraction_status(
            extraction_id,
            ExtractionStatus.FAILED,
            extra_data={"error_message": error_message},
        )
    except (InvalidStatusTransitionError, ConflictError):
        logger.warning(
            "Extraction %s already in terminal state, cannot mark as failed",
            extraction_id,
        )
    except Exception:
        logger.exception("Failed to mark extraction %s as failed", extraction_id)
