"""Extraction audit trail dataclass.

Captures per-pass diagnostic information from the MultiPassOrchestrator
so callers can audit extraction quality, flag retries, and drive human review.

Note: Each instance is call-scoped (created fresh inside
``MultiPassOrchestrator.run()``). Do not share instances across concurrent
calls.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class ExtractionAuditTrail:
    """Diagnostic record produced by the multi-pass extraction pipeline.

    ``raw_responses`` and ``retry_counts`` are index-parallel lists — entry
    ``i`` in both lists corresponds to the same pass.  When a pass required a
    retry, ``raw_responses[i]`` holds the *final* (successful) response text
    and ``retry_counts[i]`` records how many extra attempts were made.

    Attributes:
        raw_responses: Final raw text response from each pass, in pass order.
            Contains one entry per pass that actually executed (1–3 entries).
        retry_counts: Number of *extra* attempts (retries) per pass, in pass
            order.  A value of 0 means the pass succeeded on the first try;
            a value of 1 means one retry was needed (two total calls).
        validation_failures: Human-readable failure messages collected during
            the pipeline run (e.g., JSON parse errors, model fallback notices).
        needs_review: True when any pass required retries or produced validation
            failures, signalling that a human should inspect the extraction.
    """

    raw_responses: list[str] = field(default_factory=list)
    retry_counts: list[int] = field(default_factory=list)
    validation_failures: list[str] = field(default_factory=list)
    needs_review: bool = False

    def to_dict(self) -> dict[str, Any]:
        """Serialise the audit trail to a plain dict for storage.

        Returns:
            A JSON-serialisable dict with all audit fields.
        """
        return {
            "raw_responses": self.raw_responses,
            "retry_counts": self.retry_counts,
            "validation_failures": self.validation_failures,
            "needs_review": self.needs_review,
        }
