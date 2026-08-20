"""Backend implementation of the SDK ``PipelineObserver`` protocol.

``ExtractionPipelineObserver`` bridges the SDK's observer callbacks to the
Neon ``extraction_pipeline_events`` table and Sentry tag/context API.

All methods are exception-safe — an observer failure must never interrupt the
extraction pipeline.  The SDK's orchestrator also wraps calls in try/except,
so errors here are doubly swallowed.
"""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from extract_sdk.extraction.observers import PipelineStage, PipelineStatus

from app.services.pipeline_events import (
    PipelineEventRecorder,
    build_stage_summary,
    set_sentry_pipeline_context,
)

logger = logging.getLogger(__name__)


class ExtractionPipelineObserver:
    """PipelineObserver implementation that writes to DB and sets Sentry context.

    Args:
        extraction_id: UUID string of the extraction row.
        db: Service-role Neon DB client.
    """

    def __init__(self, extraction_id: str, db: Any) -> None:
        self._extraction_id = extraction_id
        self._recorder = PipelineEventRecorder(db)
        self._events: list[dict[str, Any]] = []

    def start_stage(
        self,
        *,
        stage: PipelineStage,
        attempt_number: int = 1,
        model: str | None = None,
        fallback_models: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> UUID | None:
        """Record stage start in DB and set Sentry context. Returns event UUID."""
        try:
            set_sentry_pipeline_context(
                extraction_id=self._extraction_id,
                stage=stage,
                model=model,
            )
            event_id = self._recorder.start_stage(
                extraction_id=self._extraction_id,
                stage=stage,
                attempt_number=attempt_number,
                model=model,
                fallback_models=fallback_models,
                metadata=metadata,
            )
            if event_id is not None:
                self._events.append(
                    {
                        "id": str(event_id),
                        "stage": stage,
                        "attempt_number": attempt_number,
                        "model": model,
                        "error_class": None,
                    }
                )
            return event_id
        except Exception:
            logger.warning(
                "ExtractionPipelineObserver.start_stage raised (stage=%s)",
                stage,
                exc_info=True,
            )
            return None

    def finish_stage(
        self,
        handle: Any,
        *,
        status: PipelineStatus,
        duration_ms: int,
        retry_count: int = 0,
        error_class: str | None = None,
        model: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        """Update the DB row and refresh Sentry context with terminal state."""
        try:
            set_sentry_pipeline_context(
                extraction_id=self._extraction_id,
                model=model,
                retry_count=retry_count,
                duration_ms=duration_ms,
                error_class=error_class,
            )
            if handle is None:
                return
            event_id: UUID = handle if isinstance(handle, UUID) else UUID(str(handle))
            self._recorder.finish_stage(
                event_id=event_id,
                status=status,
                duration_ms=duration_ms,
                retry_count=retry_count,
                error_class=error_class,
                model=model,
                metadata=metadata,
            )
            # Update the in-memory event record with terminal info for summary.
            for ev in self._events:
                if ev["id"] == str(event_id):
                    ev["status"] = status
                    ev["error_class"] = error_class
                    ev["model"] = model or ev.get("model")
                    break
        except Exception:
            logger.warning(
                "ExtractionPipelineObserver.finish_stage raised",
                exc_info=True,
            )

    def build_summary(self, pass_records: list[dict[str, Any]]) -> dict[str, Any]:
        """Build a compact stage summary for ``extractions.stage_summary``."""
        return build_stage_summary(
            events=self._events,
            pass_records=pass_records,
        )
