"""Critical-field dual extraction for highest-impact fields.

For configurable critical fields, extract a second time with a focused
prompt and compare. If both extractions agree: high confidence.
If they disagree: flag for review and use more conservative value.

Ported from CamAudit-v2, generalized to work with any FieldRegistry.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation

from extract_sdk.exceptions import CircuitOpenError, ExtractionError
from extract_sdk.extraction.client import ExtractionClientProtocol
from extract_sdk.extraction.prompt_builder import ExtractionPromptBuilder
from extract_sdk.models import ExtractionResult
from extract_sdk.schema.registry import FieldRegistry

logger = logging.getLogger(__name__)

_AGREEMENT_TOLERANCE = Decimal("0.02")  # 2% relative tolerance


@dataclass
class DualFieldResult:
    """Comparison result for a single critical field."""

    field_name: str
    primary_value: Decimal | None
    verification_value: Decimal | None

    @property
    def values_agree(self) -> bool:
        """Check if both values agree within tolerance."""
        if self.primary_value is None or self.verification_value is None:
            return False
        if self.primary_value == self.verification_value:
            return True
        denom = max(abs(self.primary_value), abs(self.verification_value))
        if denom == Decimal("0"):
            return True
        deviation = abs(self.primary_value - self.verification_value) / denom
        return deviation <= _AGREEMENT_TOLERANCE

    @property
    def recommended_value(self) -> Decimal | None:
        """Return the recommended value based on agreement.

        On disagreement, returns the lower value (more conservative
        for financial calculations, reducing false positive risk).
        """
        if self.primary_value is None and self.verification_value is None:
            return None
        if self.primary_value is None:
            return self.verification_value
        if self.verification_value is None:
            return self.primary_value
        if self.values_agree:
            return self.primary_value
        return min(self.primary_value, self.verification_value)

    @property
    def needs_review(self) -> bool:
        """Whether this field needs human review."""
        if self.primary_value is None or self.verification_value is None:
            return True
        return not self.values_agree


@dataclass
class DualExtractionOutcome:
    """Aggregated result from dual extraction of all critical fields."""

    results: list[DualFieldResult] = field(default_factory=list)
    total_tokens: int = 0

    @property
    def all_agree(self) -> bool:
        """True when all critical fields agree between primary and verification."""
        return all(r.values_agree for r in self.results)

    def get_result(self, field_name: str) -> DualFieldResult | None:
        """Get the dual extraction result for a specific field."""
        for r in self.results:
            if r.field_name == field_name:
                return r
        return None


def _to_decimal(value: object) -> Decimal | None:
    """Safely convert a value to Decimal."""
    if value is None:
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return None


def _extract_primary_values(
    extraction: ExtractionResult,
    critical_fields: list[str],
) -> dict[str, Decimal | None]:
    """Extract decimal values for critical fields from primary extraction."""
    values: dict[str, Decimal | None] = {}
    for field_name in critical_fields:
        raw = extraction.get_field_value(field_name)
        values[field_name] = _to_decimal(raw)
    return values


def _parse_verification_response(
    raw: str, critical_fields: list[str]
) -> dict[str, Decimal | None]:
    """Parse the verification extraction JSON response."""
    result: dict[str, Decimal | None] = {}
    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        logger.warning("Failed to parse verification response as JSON")
        return result

    # Support both { "fields": { ... } } and flat format
    fields_data = data.get("fields", data)
    if not isinstance(fields_data, dict):
        return result

    for field_name in critical_fields:
        field_data = fields_data.get(field_name)
        if isinstance(field_data, dict):
            val = field_data.get("value")
        else:
            val = field_data
        result[field_name] = _to_decimal(val)

    return result


async def dual_extract_critical_fields(
    *,
    client: ExtractionClientProtocol,
    document_text: str,
    primary_extraction: ExtractionResult,
    registry: FieldRegistry,
    critical_fields: list[str] | None = None,
) -> DualExtractionOutcome:
    """Extract critical fields a second time and compare with primary values.

    Args:
        client: Client for the verification extraction call.
        document_text: Original document text.
        primary_extraction: The primary extraction result to verify against.
        registry: FieldRegistry for building the verification prompt.
        critical_fields: Override list of critical field names.
                         If None, uses registry.get_critical_field_names().

    Returns:
        DualExtractionOutcome with comparison results for each field.
    """
    if critical_fields is None:
        critical_fields = registry.get_critical_field_names()

    if not critical_fields:
        return DualExtractionOutcome(results=[], total_tokens=0)

    primary_values = _extract_primary_values(primary_extraction, critical_fields)

    # Build verification prompt
    prompt_builder = ExtractionPromptBuilder(registry)
    verification_prompt = prompt_builder.build_verification_prompt(critical_fields)

    verification_values: dict[str, Decimal | None] = {}
    total_tokens = 0

    try:
        resp = await client.extract(
            prompt=verification_prompt,
            document_text=document_text,
            max_tokens=1024,
            temperature=0.0,
        )
        total_tokens = resp.total_tokens
        verification_values = _parse_verification_response(resp.text, critical_fields)
    except (ExtractionError, CircuitOpenError, Exception):
        logger.exception("Dual extraction verification call failed")
        for f in critical_fields:
            verification_values[f] = None

    results: list[DualFieldResult] = []
    for f in critical_fields:
        results.append(
            DualFieldResult(
                field_name=f,
                primary_value=primary_values.get(f),
                verification_value=verification_values.get(f),
            )
        )

    return DualExtractionOutcome(results=results, total_tokens=total_tokens)
