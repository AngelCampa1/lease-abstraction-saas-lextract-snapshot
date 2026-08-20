"""Pipeline observer protocol for extraction observability.

The MultiPassOrchestrator emits per-stage lifecycle events (started → finished)
through a ``PipelineObserver`` so callers can persist a durable timeline,
attach tracing tags, or stream telemetry — without the SDK itself owning a
DB connection or Sentry client.

The default ``NullObserver`` makes observers truly optional: tests and
standalone SDK consumers can omit one entirely.

Lifecycle invariants
====================

* Every ``start_stage`` call returns an opaque ``handle`` that MUST be passed
  to the matching ``finish_stage`` call.  Implementations may use the handle
  to correlate the two events (e.g. write a row id, push/pop a span).
* ``finish_stage`` is called exactly once per ``start_stage``.  If a stage
  raises, the orchestrator still calls ``finish_stage`` with
  ``status="failed"`` and a non-empty ``error_class``.
* All observer callbacks MUST be exception-safe.  An observer that raises
  will be caught by the orchestrator and logged, but extraction continues —
  observability is non-essential to the extraction result itself.
"""

from __future__ import annotations

from typing import Any, Literal, Protocol

PipelineStage = Literal[
    "document_fetch",
    "pass1_extraction",
    "pass2_validation",
    "pass3_escalation",
    "sibling_extraction",
    "judge_arbitration",
    "persistence",
]

PipelineStatus = Literal["succeeded", "failed", "skipped"]


class PipelineObserver(Protocol):
    """Callbacks invoked by the orchestrator at each stage boundary."""

    def start_stage(
        self,
        *,
        stage: PipelineStage,
        attempt_number: int = 1,
        model: str | None = None,
        fallback_models: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Any:
        """Mark a stage as started.

        Returns an opaque handle the orchestrator passes back to
        ``finish_stage``.  Implementations free to return ``None``,
        a UUID, a span context, etc.
        """
        ...  # pragma: no cover

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
        """Mark a previously-started stage as finished.

        ``handle`` is the value returned by the matching ``start_stage`` call.
        ``model`` here may differ from the start-stage model when the chain
        fell back to a different slug — implementations should record the
        model that actually produced the result.
        """
        ...  # pragma: no cover


class NullObserver:
    """No-op observer used when no DB / telemetry sink is wired.

    Returning ``None`` from ``start_stage`` and accepting ``None`` as a
    handle in ``finish_stage`` keeps the orchestrator code branch-free.
    """

    def start_stage(
        self,
        *,
        stage: PipelineStage,
        attempt_number: int = 1,
        model: str | None = None,
        fallback_models: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
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
        return None


__all__ = [
    "NullObserver",
    "PipelineObserver",
    "PipelineStage",
    "PipelineStatus",
]
