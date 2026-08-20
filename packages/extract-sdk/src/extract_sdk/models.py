"""Shared Pydantic models for extract-sdk."""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class ExtractionResponse(BaseModel):
    """Structured response from a single Claude extraction call.

    Carries the text response alongside token counts for cost tracking.
    """

    text: str
    input_tokens: int = Field(ge=0)
    output_tokens: int = Field(ge=0)

    @property
    def total_tokens(self) -> int:
        """Total tokens consumed (input + output)."""
        return self.input_tokens + self.output_tokens


class FieldExtractionValue(BaseModel):
    """A single extracted field value with confidence and source text."""

    value: Any = None
    confidence: float = Field(ge=0.0, le=1.0, default=0.0)
    source_text: str = ""

    @field_validator("confidence", mode="before")
    @classmethod
    def normalize_confidence(cls, v: Any) -> float:
        """Normalize confidence values: integers 0-100 become 0.0-1.0."""
        if isinstance(v, int | float):
            if v > 1.0:
                return float(v) / 100.0
            return float(v)
        if isinstance(v, str):
            cleaned = v.strip()
            if not cleaned:
                return 0.0
            if cleaned.endswith("%"):
                cleaned = cleaned[:-1].strip()
            try:
                numeric = float(cleaned)
            except ValueError:
                return 0.0
            if numeric > 1.0:
                return numeric / 100.0
            return numeric
        return 0.0


class ExtractionResult(BaseModel):
    """Complete extraction result: all fields with their values and confidences."""

    fields: dict[str, FieldExtractionValue] = Field(default_factory=dict)

    def get_field_value(self, field_name: str) -> Any:
        """Get the raw value for a field, or None if not extracted."""
        field_data = self.fields.get(field_name)
        if field_data is None:
            return None
        return field_data.value

    def get_field_confidence(self, field_name: str) -> float:
        """Get the confidence for a field, or 0.0 if not extracted."""
        field_data = self.fields.get(field_name)
        if field_data is None:
            return 0.0
        return field_data.confidence

    def missing_fields(self, required_fields: list[str]) -> list[str]:
        """Return required fields that are missing or have null values."""
        missing: list[str] = []
        for field_name in required_fields:
            field_data = self.fields.get(field_name)
            if field_data is None or field_data.value is None:
                missing.append(field_name)
        return missing


class ValidationFailure(BaseModel):
    """A single validation failure with field name and description."""

    field_name: str
    message: str
    severity: str = "error"


class ValidationResult(BaseModel):
    """Result of validating an extraction against business rules."""

    failures: list[ValidationFailure] = Field(default_factory=list)

    @property
    def is_valid(self) -> bool:
        """True when there are no validation failures."""
        return len(self.failures) == 0

    @property
    def feedback_prompt(self) -> str:
        """Build a feedback string for Claude re-extraction."""
        if self.is_valid:
            return ""
        lines = ["The previous extraction had the following issues:"]
        for f in self.failures:
            lines.append(f"- {f.field_name}: {f.message}")
        lines.append(
            "\nPlease re-extract these fields, correcting the issues described above."
        )
        return "\n".join(lines)


# ---------------------------------------------------------------------------
# Multi-pass extraction models
# ---------------------------------------------------------------------------


class FieldCorrection(BaseModel):
    """A single field correction proposed by Pass 2 adversarial validation."""

    original_value: Any = None
    corrected_value: Any = None
    reasoning: str = ""
    confidence: float = Field(ge=0.0, le=1.0, default=0.0)
    rule_relevance: list[str] = Field(default_factory=list)


class ExtractionPatch(BaseModel):
    """Sparse set of corrections from Pass 2 validation.

    Only contains fields that need changing — not a full extraction.
    """

    field_corrections: dict[str, FieldCorrection] = Field(default_factory=dict)

    @property
    def is_empty(self) -> bool:
        """True when no corrections were proposed."""
        return len(self.field_corrections) == 0

    def critical_corrections(
        self, critical_field_names: Sequence[str]
    ) -> dict[str, FieldCorrection]:
        """Return only corrections that touch critical fields.

        Args:
            critical_field_names: List of field names considered critical.

        Returns:
            Dict of field_name → FieldCorrection for critical fields only.
        """
        return {
            name: corr
            for name, corr in self.field_corrections.items()
            if name in critical_field_names
        }


PassKind = Literal["pass1", "pass2", "pass3", "sibling", "judge"]


class ExtractionPassRecord(BaseModel):
    """Audit trail for a single extraction pass.

    ``pass_kind`` distinguishes the role of this record beyond the legacy
    ``pass_number`` (1/2/3). For dual-extract mode the orchestrator emits
    two ``pass1`` records (one for primary, one with ``pass_kind="sibling"``)
    plus a ``judge`` record. Existing serialized records default to
    ``pass_kind="pass1"`` so old DB rows deserialize cleanly.
    """

    pass_number: int = Field(ge=1, le=3)
    pass_kind: PassKind = "pass1"
    model: str
    input_tokens: int = Field(ge=0, default=0)
    output_tokens: int = Field(ge=0, default=0)
    duration_ms: int = Field(ge=0, default=0)
    cost_cents: int = Field(
        ge=0,
        default=0,
        description=(
            "Cost in integer cents for this pass. 0 when the pricing registry "
            "does not have an entry for the model."
        ),
    )

    @property
    def total_tokens(self) -> int:
        """Total tokens consumed (input + output)."""
        return self.input_tokens + self.output_tokens


class MultiPassResult(BaseModel):
    """Aggregated outcome of a multi-pass extraction pipeline."""

    extraction: ExtractionResult
    pass_records: list[ExtractionPassRecord] = Field(default_factory=list)
    patch: ExtractionPatch | None = None
    pass3_overrides: dict[str, Any] | None = None
    needs_review: bool = False
    confidence_scores: dict[str, Any] = Field(default_factory=dict)
    audit_trail: dict[str, Any] | None = None
    extraction_cost_cents: int = Field(
        ge=0,
        default=0,
        description=(
            "Total LLM spend across all passes for this extraction, in cents."
        ),
    )
    cost_ceiling_hit: bool = Field(
        default=False,
        description=(
            "True when the orchestrator skipped at least one pass because "
            "the per-extraction cost ceiling was reached."
        ),
    )

    @property
    def total_tokens(self) -> int:
        """Total tokens consumed across all passes."""
        return sum(r.total_tokens for r in self.pass_records)
