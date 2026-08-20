"""Merge logic for multi-pass extraction results.

Priority: Pass 3 (escalation) > Pass 2 (validation) > Pass 1 (extraction).
Pass 3 overrides are always authoritative.
Pass 2 corrections are applied only if confidence >= min_confidence threshold.

Dual-extract merge (``merge_dual_extractions``) is a separate code path used
when ``MultiPassConfig.dual_enabled=True``: A and B are two parallel full
extractions; per-field disagreements are resolved via ``JudgeResult``
verdicts. Agreeing fields pass through from A; disagreements with a verdict
take the verdict's value; disagreements without a verdict (judge dropped or
coercion failed) defensively fall back to A.

Ported from CamAudit-v2, generalized for any schema.
"""

from __future__ import annotations

import copy
import logging
from typing import TYPE_CHECKING, Any

from extract_sdk.models import ExtractionPatch, FieldCorrection

if TYPE_CHECKING:
    from extract_sdk.extraction.judge import JudgeResult

logger = logging.getLogger(__name__)

# Load valid schema field names once at module level.
try:
    from extract_sdk.schema.lextract_schema import build_lextract_registry as _build

    _VALID_SCHEMA_FIELDS: frozenset[str] = frozenset(_build().field_names)
except Exception:  # pragma: no cover
    logger.warning(
        "pass_merger: failed to load lextract schema for field validation; "
        "falling back to base-extraction-key-only filtering",
        exc_info=True,
    )
    _VALID_SCHEMA_FIELDS = frozenset()


def _filter_valid_keys(
    overrides: dict[str, Any],
    base: dict[str, Any],
) -> dict[str, Any]:
    """Return only override keys that are valid schema fields.

    Pass 3 responses may include hallucinated field names not in the schema.
    Applying those keys would silently pollute the extraction result dict with
    arbitrary model output.  We allow keys present in the Pass 1 base (fields
    that were extracted) OR any field in the known schema (fields that Pass 1
    may have missed but Pass 3 discovered).  Truly unknown keys are dropped.

    If the schema registry is unavailable, fall back to accepting only keys
    present in the base extraction to prevent unbounded pollution.
    """
    # Allow keys that are in the schema OR already in the base extraction.
    # Schema fields: legitimate fields pass 1 may have missed but pass 3 found.
    # Base fields: fields pass 1 extracted (pass 3 may update them even if they
    # happen to be absent from the schema registry, e.g. custom test schemas).
    if _VALID_SCHEMA_FIELDS:
        allowed = _VALID_SCHEMA_FIELDS | frozenset(base.keys())
    else:
        allowed = frozenset(base.keys())

    filtered: dict[str, Any] = {}
    for key, value in overrides.items():
        if key in allowed:
            filtered[key] = value
        else:
            logger.warning("Pass 3 override skipped — key %r not in schema", key)
    return filtered


def merge_extraction(
    base: dict[str, Any],
    patch: ExtractionPatch,
    pass3_overrides: dict[str, Any] | None,
    min_confidence: float = 0.70,
) -> dict[str, Any]:
    """Merge Pass 1 base with Pass 2 corrections and Pass 3 overrides.

    Args:
        base: Pass 1 extraction as a flat dict (field_name → value).
        patch: Pass 2 ExtractionPatch with field corrections.
        pass3_overrides: Pass 3 field overrides (authoritative).
            None if no escalation was triggered.
        min_confidence: Minimum confidence to accept a Pass 2 correction.

    Returns:
        Merged extraction dict.
    """
    merged = copy.deepcopy(base)

    # Apply Pass 2 corrections (confidence-gated)
    for field_name, correction in patch.field_corrections.items():
        if correction.confidence >= min_confidence:
            logger.info(
                "Pass 2 correction applied: %s = %r -> %r "
                "(confidence=%.2f, reason=%s)",
                field_name,
                correction.original_value,
                correction.corrected_value,
                correction.confidence,
                correction.reasoning,
            )
            merged[field_name] = correction.corrected_value
        else:
            logger.debug(
                "Pass 2 correction skipped (low confidence): "
                "%s confidence=%.2f < %.2f",
                field_name,
                correction.confidence,
                min_confidence,
            )

    # Apply Pass 3 overrides unconditionally (highest authority).
    # Filter to schema-valid keys first to prevent hallucinated field names from
    # polluting the extraction result with arbitrary model output.
    if pass3_overrides:
        valid_overrides = _filter_valid_keys(pass3_overrides, base)
        for field_name, value in valid_overrides.items():
            logger.info(
                "Pass 3 override applied: %s = %r -> %r",
                field_name,
                merged.get(field_name),
                value,
            )
            merged[field_name] = value

    return merged


def merge_dual_extractions(
    extraction_a: dict[str, Any],
    extraction_b: dict[str, Any],
    judge_result: JudgeResult,
) -> dict[str, Any]:
    """Merge two parallel full extractions using judge verdicts.

    Used in dual-extract mode (``MultiPassConfig.dual_enabled=True``).
    Pass 1 (A) and Sibling (B) are both full extractions over the same PDF.
    The judge has computed per-field verdicts for disagreements; this
    function applies them.

    Rules:
    * **Agreeing fields**: take from A (deterministic; A is the canonical
      "primary" side).
    * **Disagreeing fields with a verdict** (``winner ∈ {a, b, synthesis}``):
      take the verdict's coerced value. ``winner='a'`` could in theory
      short-circuit to ``extraction_a[field]``, but using the verdict's
      ``value`` keeps the merger trivially testable and lets the judge apply
      light coercion (e.g. string → int) even when picking A.
    * **Disagreeing fields without a verdict** (judge dropped on coercion
      failure, unknown field, malformed response, or LLM error): defensive
      fallback to A. This is the path that fires on
      ``JudgeResult(verdicts=[])``.

    Args:
        extraction_a: Pass 1 extraction as a flat dict (field_name → value).
        extraction_b: Sibling extraction as a flat dict.
        judge_result: Result from ``judge_extractions`` — a list of verdicts.
            Empty verdicts is a valid "judge failed" signal; A wins everywhere.

    Returns:
        Merged extraction dict.
    """
    merged = copy.deepcopy(extraction_a)
    verdict_paths = {v.field_path for v in judge_result.verdicts}

    # Apply verdicts (one per disagreeing field).
    for verdict in judge_result.verdicts:
        # Only top-level fields are coerced by the judge today; nested paths
        # would need schema-walking. The judge already drops nested verdicts
        # via ``_resolve_field_annotation``.
        if "." in verdict.field_path:
            logger.debug(
                "merge_dual: nested verdict path %r ignored (top-level only)",
                verdict.field_path,
            )
            continue
        previous = merged.get(verdict.field_path)
        merged[verdict.field_path] = verdict.value
        logger.info(
            "dual-extract verdict: %s = %r -> %r (winner=%s, conf=%.2f)",
            verdict.field_path,
            previous,
            verdict.value,
            verdict.winner,
            verdict.confidence,
        )

    # For disagreements without a verdict, A is already in `merged` (deep
    # copy from extraction_a above). Logged here for forensic clarity.
    for key in extraction_a.keys() | extraction_b.keys():
        if extraction_a.get(key) == extraction_b.get(key):
            continue
        if key in verdict_paths:
            continue
        logger.debug(
            "dual-extract: no verdict for disagreeing field %r — keeping A=%r",
            key,
            extraction_a.get(key),
        )

    return merged


def judge_result_to_patch(
    judge_result: JudgeResult,
    extraction_a: dict[str, Any],
) -> ExtractionPatch:
    """Convert a JudgeResult into an ExtractionPatch.

    Used by the dual-extract orchestrator path to feed judge verdicts into
    the existing Pass 3 escalation flow without changing the escalation
    prompt builder.

    Verdicts where ``winner == 'a'`` are no-ops in the merge sense (A wins),
    but are still included in the patch with ``original_value == corrected_value``
    so the escalation prompt sees them as "judge confirmed A". Pass 3 then
    decides whether to override based on the PDF.

    Args:
        judge_result: Output of ``judge_extractions``.
        extraction_a: Pass 1 (A) extraction as a flat dict, used to populate
            ``FieldCorrection.original_value``.

    Returns:
        An ``ExtractionPatch`` whose ``field_corrections`` mirrors the
        verdicts, suitable for ``_should_escalate`` / Pass 3 prompt building.
    """
    corrections: dict[str, FieldCorrection] = {}
    for verdict in judge_result.verdicts:
        if "." in verdict.field_path:
            # Top-level only; matches merge_dual_extractions semantics.
            continue
        corrections[verdict.field_path] = FieldCorrection(
            original_value=extraction_a.get(verdict.field_path),
            corrected_value=verdict.value,
            reasoning=verdict.reason,
            confidence=verdict.confidence,
            rule_relevance=[],
        )
    return ExtractionPatch(field_corrections=corrections)
