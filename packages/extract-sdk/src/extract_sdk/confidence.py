"""Confidence scoring for lease extraction results.

Uses the LLM self-reported per-field confidence (float 0.0–1.0) from
extracted_data as the primary confidence signal, applies cross-field
validation rules, and assigns tier labels (high/medium/low/not_found).

Scoring formula:
    combined = llm_confidence  (0.0–1.0, as reported by the extraction model)

Cross-field validators lower confidence for fields that fail consistency
checks (pro rata share, date ordering, lease term vs. date delta).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date, datetime

from extract_sdk.models import ExtractionResult, FieldExtractionValue
from extract_sdk.schema.registry import FieldRegistry

logger = logging.getLogger(__name__)

# Cross-field penalty factor applied when validation fails
CROSS_FIELD_PENALTY = 0.7

# Pro rata share tolerance: 2% relative
PRO_RATA_TOLERANCE = 0.02

# Lease term tolerance: 1 month
LEASE_TERM_TOLERANCE_MONTHS = 1

# Tier thresholds (inclusive lower bounds)
HIGH_THRESHOLD = 0.85
MEDIUM_THRESHOLD = 0.60


@dataclass
class ConfidenceScore:
    """Per-field confidence score with tier label and component values."""

    score: float
    tier: str
    llm_confidence: float

    def to_dict(self) -> dict[str, object]:
        """Serialize to JSONB-compatible dictionary."""
        return {
            "score": self.score,
            "tier": self.tier,
            "llm_confidence": self.llm_confidence,
        }


@dataclass
class CrossFieldPenalty:
    """A penalty to apply to a specific field due to cross-field validation failure."""

    field_name: str
    reason: str
    penalty_factor: float


def assign_tier(score: float) -> str:
    """Assign a confidence tier based on the score.

    Returns:
        "high" for 0.85-1.00, "medium" for 0.60-0.84, "low" for 0.00-0.59.
    """
    if score >= HIGH_THRESHOLD:
        return "high"
    if score >= MEDIUM_THRESHOLD:
        return "medium"
    return "low"


def _safe_parse_date(value: object) -> date | None:
    """Try to parse a date string in ISO format. Returns None on failure."""
    if value is None:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    if not isinstance(value, str):
        return None
    try:
        return date.fromisoformat(value)
    except (ValueError, TypeError):
        return None


def _safe_float(value: object) -> float | None:
    """Try to coerce a value to float. Returns None on failure."""
    if value is None:
        return None
    if isinstance(value, (int, float, str)):
        try:
            return float(value)
        except (ValueError, TypeError):
            return None
    return None


def validate_pro_rata_share(
    fields: dict[str, FieldExtractionValue],
) -> list[CrossFieldPenalty]:
    """Validate that pro_rata_share matches tenant_rsf / building_rsf.

    Checks both percentage form (e.g. 5.0 for 5%) and decimal form (e.g. 0.05).
    Tolerance: 2% relative difference.
    """
    pro_rata = fields.get("pro_rata_share")
    tenant_rsf = fields.get("rentable_square_footage")
    building_rsf = fields.get("building_total_rsf")

    if pro_rata is None or tenant_rsf is None or building_rsf is None:
        return []

    pro_rata_val = _safe_float(pro_rata.value)
    tenant_val = _safe_float(tenant_rsf.value)
    building_val = _safe_float(building_rsf.value)

    if pro_rata_val is None or tenant_val is None or building_val is None:
        return []

    if building_val == 0:
        return []

    expected_ratio = tenant_val / building_val
    expected_percent = expected_ratio * 100.0

    # Determine whether pro_rata_val is in decimal form (0.05) or percent form (5.0).
    # The boundary heuristic "val <= 1.0" breaks for real values like 1.0% (exactly
    # on the boundary) or 0.5% — those are misclassified as decimal form.
    # We compare pro_rata_val against BOTH the decimal and percent representations
    # and pick whichever is closer to the computed expected ratio.
    diff_as_decimal = abs(pro_rata_val - expected_ratio)
    diff_as_percent = abs(pro_rata_val - expected_percent)
    if diff_as_decimal < diff_as_percent:
        actual = pro_rata_val
        expected = expected_ratio
    else:
        actual = pro_rata_val
        expected = expected_percent

    if expected == 0:
        return []

    relative_diff = abs(actual - expected) / abs(expected)

    if relative_diff > PRO_RATA_TOLERANCE:
        return [
            CrossFieldPenalty(
                field_name="pro_rata_share",
                reason=(
                    f"Pro rata share {actual:.4f} does not match "
                    f"tenant RSF / building RSF = {expected:.4f} "
                    f"(relative diff: {relative_diff:.2%})"
                ),
                penalty_factor=CROSS_FIELD_PENALTY,
            ),
            CrossFieldPenalty(
                field_name="rentable_square_footage",
                reason="Involved in pro rata share mismatch",
                penalty_factor=CROSS_FIELD_PENALTY,
            ),
            CrossFieldPenalty(
                field_name="building_total_rsf",
                reason="Involved in pro rata share mismatch",
                penalty_factor=CROSS_FIELD_PENALTY,
            ),
        ]
    return []


def validate_date_consistency(
    fields: dict[str, FieldExtractionValue],
) -> list[CrossFieldPenalty]:
    """Validate date ordering: commencement < expiration, rent commencement between.

    Skips validation if dates are missing or unparseable.
    """
    commencement = fields.get("commencement_date")
    expiration = fields.get("expiration_date")

    if commencement is None or expiration is None:
        return []

    commence_date = _safe_parse_date(commencement.value)
    expire_date = _safe_parse_date(expiration.value)

    if commence_date is None or expire_date is None:
        return []

    penalties: list[CrossFieldPenalty] = []

    if commence_date >= expire_date:
        penalties.append(
            CrossFieldPenalty(
                field_name="commencement_date",
                reason=(
                    f"Commencement date {commence_date} "
                    f"is not before expiration {expire_date}"
                ),
                penalty_factor=CROSS_FIELD_PENALTY,
            )
        )
        penalties.append(
            CrossFieldPenalty(
                field_name="expiration_date",
                reason=(
                    f"Expiration date {expire_date} "
                    f"is not after commencement {commence_date}"
                ),
                penalty_factor=CROSS_FIELD_PENALTY,
            )
        )

    rent_commencement = fields.get("rent_commencement_date")
    if rent_commencement is not None:
        rent_date = _safe_parse_date(rent_commencement.value)
        if rent_date is not None and commence_date < expire_date:
            if rent_date < commence_date or rent_date > expire_date:
                penalties.append(
                    CrossFieldPenalty(
                        field_name="rent_commencement_date",
                        reason=(
                            f"Rent commencement {rent_date} is outside lease period "
                            f"({commence_date} to {expire_date})"
                        ),
                        penalty_factor=CROSS_FIELD_PENALTY,
                    )
                )

    return penalties


def validate_lease_term(
    fields: dict[str, FieldExtractionValue],
) -> list[CrossFieldPenalty]:
    """Validate lease_term_months against commencement-to-expiration delta.

    Tolerance: 1 month.
    """
    term = fields.get("lease_term_months")
    commencement = fields.get("commencement_date")
    expiration = fields.get("expiration_date")

    if term is None or commencement is None or expiration is None:
        return []

    term_val = _safe_float(term.value)
    if term_val is None:
        return []

    commence_date = _safe_parse_date(commencement.value)
    expire_date = _safe_parse_date(expiration.value)

    if commence_date is None or expire_date is None:
        return []

    if commence_date >= expire_date:
        return []

    # Calculate months between dates.
    # Lease terms are rounded to whole months in commercial practice; the
    # day-of-month difference is within the 1-month tolerance already applied
    # below and does not need separate adjustment.
    month_diff = (expire_date.year - commence_date.year) * 12 + (
        expire_date.month - commence_date.month
    )

    if abs(term_val - month_diff) > LEASE_TERM_TOLERANCE_MONTHS:
        return [
            CrossFieldPenalty(
                field_name="lease_term_months",
                reason=(
                    f"Lease term {int(term_val)} months does not match "
                    f"date delta of ~{month_diff} months "
                    f"({commence_date} to {expire_date})"
                ),
                penalty_factor=CROSS_FIELD_PENALTY,
            ),
        ]
    return []


def run_cross_field_validations(
    fields: dict[str, FieldExtractionValue],
) -> list[CrossFieldPenalty]:
    """Run all cross-field validation rules and collect penalties."""
    penalties: list[CrossFieldPenalty] = []
    penalties.extend(validate_pro_rata_share(fields))
    penalties.extend(validate_date_consistency(fields))
    penalties.extend(validate_lease_term(fields))
    return penalties


def score_confidence(
    extracted_data: ExtractionResult,
    registry: FieldRegistry,
) -> dict[str, ConfidenceScore]:
    """Score per-field confidence using LLM self-reported confidence.

    Args:
        extracted_data: Extraction result with per-field values and confidences.
        registry: FieldRegistry for filtering known fields.

    Returns:
        Dictionary of field_name to ConfidenceScore.
    """
    if not extracted_data.fields:
        return {}

    # Run cross-field validations to collect penalties
    penalties = run_cross_field_validations(extracted_data.fields)

    # Build penalty lookup: field_name -> list of penalty factors
    penalty_map: dict[str, list[float]] = {}
    for penalty in penalties:
        penalty_map.setdefault(penalty.field_name, []).append(penalty.penalty_factor)

    result: dict[str, ConfidenceScore] = {}

    for field_name, field_data in extracted_data.fields.items():
        # Only score fields that exist in the registry
        if not registry.has_field(field_name):
            continue

        # Null value: field not found — distinct from low-confidence
        if field_data.value is None:
            result[field_name] = ConfidenceScore(
                score=0.0,
                tier="not_found",
                llm_confidence=0.0,
            )
            continue

        # Use LLM self-reported confidence (0.0–1.0) directly as the score
        combined = field_data.confidence

        # Apply cross-field penalties (multiply all penalty factors)
        if field_name in penalty_map:
            for factor in penalty_map[field_name]:
                combined *= factor

        # Clamp to [0, 1]
        combined = max(0.0, min(1.0, combined))

        result[field_name] = ConfidenceScore(
            score=round(combined, 4),
            tier=assign_tier(combined),
            llm_confidence=field_data.confidence,
        )

    return result


def score_overall_confidence(
    field_scores: dict[str, ConfidenceScore],
    registry: FieldRegistry,
) -> dict[str, object]:
    """Compute weighted average overall confidence from per-field scores.

    Uses FieldRegistry weights. Fields not in the registry are excluded.

    Args:
        field_scores: Per-field confidence scores from score_confidence().
        registry: FieldRegistry for field weights.

    Returns:
        Dictionary with keys: overall_score, tier, needs_review,
        low_confidence_fields.
    """
    if not field_scores:
        return {
            "overall_score": 0.0,
            "tier": "low",
            "needs_review": True,
            "low_confidence_fields": [],
        }

    weights = registry.get_field_weights()
    weighted_sum = 0.0
    total_weight = 0.0

    for field_name, score in field_scores.items():
        # Exclude absent fields — they were not found in the document and must not
        # dilute the overall confidence of fields that were actually extracted.
        if score.tier == "not_found":
            continue
        weight = weights.get(field_name)
        if weight is None:
            logger.debug(
                "Field %r has no weight in registry — skipping from overall score",
                field_name,
            )
            continue
        weighted_sum += score.score * weight
        total_weight += weight

    overall_score = weighted_sum / total_weight if total_weight > 0 else 0.0
    overall_score = round(overall_score, 4)

    # Flag low-confidence extracted fields; absent (not_found) fields excluded
    low_confidence_fields = [
        name
        for name, score in field_scores.items()
        if score.score < MEDIUM_THRESHOLD and score.tier != "not_found"
    ]

    needs_review = overall_score < HIGH_THRESHOLD or len(low_confidence_fields) > 0

    return {
        "overall_score": overall_score,
        "tier": assign_tier(overall_score),
        "needs_review": needs_review,
        "low_confidence_fields": low_confidence_fields,
    }
