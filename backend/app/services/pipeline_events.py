"""Durable pipeline timeline helpers for extraction observability.

Records per-stage start/finish events to ``extraction_pipeline_events`` so
that extraction failures can be diagnosed after the fact without relying on
ephemeral Celery logs.  All DB operations are fail-open: any error is logged
as a warning and the extraction pipeline continues unaffected.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

logger = logging.getLogger(__name__)

PIPELINE_STAGES = frozenset(
    {
        "document_fetch",
        "pass1_extraction",
        "pass2_validation",
        "pass3_escalation",
        "sibling_extraction",
        "judge_arbitration",
        "persistence",
    }
)

PIPELINE_STATUSES = frozenset({"started", "succeeded", "failed", "skipped"})


def _utcnow() -> datetime:
    return datetime.now(UTC)


class PipelineEventRecorder:
    """Persists pipeline stage attempts to ``extraction_pipeline_events``."""

    def __init__(self, db: Any) -> None:
        self._db = db

    def start_stage(
        self,
        *,
        extraction_id: UUID | str,
        stage: str,
        attempt_number: int = 1,
        model: str | None = None,
        fallback_models: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> UUID | None:
        """Insert a started event row and return its id when available."""
        if stage not in PIPELINE_STAGES:
            raise ValueError(f"Unknown pipeline stage: {stage}")

        payload: dict[str, Any] = {
            "extraction_id": str(extraction_id),
            "stage": stage,
            "status": "started",
            "attempt_number": attempt_number,
            "started_at": _utcnow().isoformat(),
            "model": model,
            "fallback_models": fallback_models or [],
            "retry_count": 0,
            "metadata": metadata or {},
        }
        try:
            result = (
                self._db.table("extraction_pipeline_events").insert(payload).execute()
            )
            rows = getattr(result, "data", None) or []
            if not rows:
                return None
            row = rows[0]
            event_id = row.get("id") if isinstance(row, dict) else None
            return UUID(str(event_id)) if event_id else None
        except Exception as exc:
            logger.warning(
                "Failed to record pipeline start event for %s: %s",
                stage,
                exc,
            )
            return None

    def finish_stage(
        self,
        *,
        event_id: UUID,
        status: str,
        duration_ms: int,
        retry_count: int = 0,
        error_class: str | None = None,
        model: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        """Update an existing event row with its terminal state."""
        if status not in PIPELINE_STATUSES - {"started"}:
            raise ValueError(f"Unknown pipeline status: {status}")

        payload: dict[str, Any] = {
            "status": status,
            "completed_at": _utcnow().isoformat(),
            "duration_ms": duration_ms,
            "retry_count": retry_count,
            "error_class": error_class,
        }
        if model is not None:
            payload["model"] = model
        if metadata is not None:
            payload["metadata"] = metadata

        try:
            (
                self._db.table("extraction_pipeline_events")
                .update(payload)
                .eq("id", str(event_id))
                .execute()
            )
        except Exception as exc:
            logger.warning(
                "Failed to update pipeline event %s for status %s: %s",
                event_id,
                status,
                exc,
            )


def build_stage_summary(
    *,
    events: list[dict[str, Any]],
    pass_records: list[dict[str, Any]] | None,
) -> dict[str, Any]:
    """Build a compact extraction summary that points to the full timeline."""
    attempts_by_stage: dict[str, int] = defaultdict(int)
    status_by_stage: dict[str, str] = {}
    final_stage: str | None = None
    final_status: str | None = None
    latest_error_class: str | None = None

    for event in events:
        stage = str(event.get("stage") or "")
        if not stage:
            continue
        attempts_by_stage[stage] = max(
            attempts_by_stage[stage],
            int(event.get("attempt_number") or 0),
        )
        final_stage = stage
        status = event.get("status")
        if status is not None:
            final_status = str(status)
            status_by_stage[stage] = final_status
        if event.get("error_class"):
            latest_error_class = str(event["error_class"])

    final_model: str | None = None
    pipeline_succeeded = False
    if pass_records:
        last = pass_records[-1]
        if isinstance(last, dict) and last.get("model"):
            final_model = str(last["model"])
        pipeline_succeeded = True

    if pipeline_succeeded:
        final_status = "succeeded"

    return {
        "timeline_table": "extraction_pipeline_events",
        "final_model": final_model,
        "final_stage": final_stage,
        "final_status": final_status,
        "latest_error_class": latest_error_class,
        "attempts_by_stage": dict(attempts_by_stage),
        "status_by_stage": status_by_stage,
    }


def set_sentry_pipeline_context(**context: Any) -> None:
    """Attach extraction context to Sentry when available."""
    try:
        import sentry_sdk
    except ImportError:  # pragma: no cover
        return

    clean = {key: value for key, value in context.items() if value is not None}
    if not clean:
        return

    if "extraction_id" in clean:
        sentry_sdk.set_tag("extraction_id", str(clean["extraction_id"]))
    if "stage" in clean:
        sentry_sdk.set_tag("extraction.stage", str(clean["stage"]))
    if "model" in clean:
        sentry_sdk.set_tag("extraction.model", str(clean["model"]))
    if "retry_count" in clean:
        sentry_sdk.set_tag("extraction.retry_count", str(clean["retry_count"]))
    if "duration_ms" in clean:
        sentry_sdk.set_tag("extraction.duration_ms", str(clean["duration_ms"]))
    if "error_class" in clean:
        sentry_sdk.set_tag("extraction.error_class", str(clean["error_class"]))

    sentry_sdk.set_context("extraction_pipeline", clean)
    logger.debug("Updated Sentry extraction context", extra={"context": clean})
