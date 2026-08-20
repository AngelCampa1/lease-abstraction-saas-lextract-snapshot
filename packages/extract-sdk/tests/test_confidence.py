"""Comprehensive tests for confidence scoring module.

Tests cover:
- Per-field LLM confidence scoring
- Tier assignment at all boundary values
- Cross-field validation rules (pro rata, dates, lease term)
- Overall confidence weighted average
- Null/missing field handling
- Edge cases
"""

from __future__ import annotations

import pytest

from extract_sdk.models import ExtractionResult, FieldExtractionValue
from extract_sdk.schema.base import FieldDefinition
from extract_sdk.schema.registry import FieldRegistry

from extract_sdk.confidence import (
    ConfidenceScore,
    CrossFieldPenalty,
    score_confidence,
    score_overall_confidence,
    assign_tier,
    validate_pro_rata_share,
    validate_date_consistency,
    validate_lease_term,
    run_cross_field_validations,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def scoring_fields() -> list[FieldDefinition]:
    """Fields needed for confidence scoring tests."""
    return [
        FieldDefinition(
            field_name="base_rent_annual",
            category="Rent & Escalations",
            display_label="Annual Base Rent",
            description="Total base rent.",
            data_type="currency",
            required=True,
            weight=2.0,
            critical=True,
        ),
        FieldDefinition(
            field_name="pro_rata_share",
            category="CAM & Operating Expenses",
            display_label="Pro Rata Share",
            description="Tenant share of expenses.",
            data_type="percentage",
            required=True,
            weight=2.0,
            critical=True,
        ),
        FieldDefinition(
            field_name="lease_term_months",
            category="Key Dates & Term",
            display_label="Lease Term (Months)",
            description="Total duration in months.",
            data_type="number",
            required=True,
            weight=1.5,
            critical=True,
        ),
        FieldDefinition(
            field_name="commencement_date",
            category="Key Dates & Term",
            display_label="Commencement Date",
            description="Lease start date.",
            data_type="date",
            required=True,
            weight=1.0,
        ),
        FieldDefinition(
            field_name="expiration_date",
            category="Key Dates & Term",
            display_label="Expiration Date",
            description="Lease end date.",
            data_type="date",
            required=True,
            weight=1.0,
        ),
        FieldDefinition(
            field_name="rent_commencement_date",
            category="Key Dates & Term",
            display_label="Rent Commencement Date",
            description="Date rent payments begin.",
            data_type="date",
            required=False,
            weight=1.0,
        ),
        FieldDefinition(
            field_name="rentable_square_footage",
            category="Parties & Property",
            display_label="Rentable SF",
            description="Tenant's rentable square footage.",
            data_type="number",
            required=True,
            weight=1.0,
        ),
        FieldDefinition(
            field_name="building_total_rsf",
            category="Parties & Property",
            display_label="Building Total RSF",
            description="Total building rentable SF.",
            data_type="number",
            required=False,
            weight=1.0,
        ),
        FieldDefinition(
            field_name="landlord_legal_name",
            category="Parties & Property",
            display_label="Landlord Name",
            description="Legal name of landlord.",
            data_type="string",
            required=True,
            weight=1.0,
        ),
    ]


@pytest.fixture
def scoring_registry(scoring_fields: list[FieldDefinition]) -> FieldRegistry:
    """Registry for confidence scoring tests."""
    return FieldRegistry(name="Scoring Test Schema", fields=scoring_fields)


# ---------------------------------------------------------------------------
# assign_tier
# ---------------------------------------------------------------------------


class TestAssignTier:
    """Tests for tier assignment at all boundary values."""

    def test_high_tier_at_1_0(self) -> None:
        assert assign_tier(1.0) == "high"

    def test_high_tier_at_0_85(self) -> None:
        assert assign_tier(0.85) == "high"

    def test_high_tier_at_0_92(self) -> None:
        assert assign_tier(0.92) == "high"

    def test_medium_tier_at_0_84(self) -> None:
        assert assign_tier(0.84) == "medium"

    def test_medium_tier_at_0_60(self) -> None:
        assert assign_tier(0.60) == "medium"

    def test_medium_tier_at_0_72(self) -> None:
        assert assign_tier(0.72) == "medium"

    def test_low_tier_at_0_59(self) -> None:
        assert assign_tier(0.59) == "low"

    def test_low_tier_at_0_0(self) -> None:
        assert assign_tier(0.0) == "low"

    def test_low_tier_at_0_30(self) -> None:
        assert assign_tier(0.30) == "low"


# ---------------------------------------------------------------------------
# score_confidence — per-field scoring
# ---------------------------------------------------------------------------


class TestScoreConfidence:
    """Tests for the main score_confidence function."""

    def test_basic_scoring_formula(self, scoring_registry: FieldRegistry) -> None:
        """Score equals LLM self-reported confidence directly."""
        extracted = ExtractionResult(
            fields={
                "base_rent_annual": FieldExtractionValue(
                    value=150000, confidence=0.90, source_text="$150k"
                ),
            }
        )

        result = score_confidence(extracted, scoring_registry)

        assert result["base_rent_annual"].score == pytest.approx(0.90, abs=0.001)

    def test_tier_assigned_correctly(self, scoring_registry: FieldRegistry) -> None:
        extracted = ExtractionResult(
            fields={
                "base_rent_annual": FieldExtractionValue(
                    value=150000, confidence=0.90, source_text="$150k"
                ),
            }
        )

        result = score_confidence(extracted, scoring_registry)
        assert result["base_rent_annual"].tier == "high"

    def test_llm_confidence_stored(
        self, scoring_registry: FieldRegistry
    ) -> None:
        extracted = ExtractionResult(
            fields={
                "base_rent_annual": FieldExtractionValue(
                    value=150000, confidence=0.90, source_text="$150k"
                ),
            }
        )

        result = score_confidence(extracted, scoring_registry)
        assert result["base_rent_annual"].llm_confidence == 0.90

    def test_null_field_gets_not_found_tier(
        self, scoring_registry: FieldRegistry
    ) -> None:
        """Null-value fields get confidence 0.0, tier not_found (absent from lease)."""
        extracted = ExtractionResult(
            fields={
                "base_rent_annual": FieldExtractionValue(
                    value=None, confidence=0.0, source_text=""
                ),
            }
        )

        result = score_confidence(extracted, scoring_registry)
        assert result["base_rent_annual"].score == 0.0
        assert result["base_rent_annual"].tier == "not_found"

    def test_null_field_distinguished_from_low_confidence(
        self, scoring_registry: FieldRegistry
    ) -> None:
        """A found-but-uncertain field gets tier 'low'; an absent field gets 'not_found'."""
        extracted = ExtractionResult(
            fields={
                "base_rent_annual": FieldExtractionValue(
                    value=None, confidence=0.0, source_text=""
                ),
                "landlord_legal_name": FieldExtractionValue(
                    value="Maybe Corp", confidence=0.35, source_text="maybe"
                ),
            }
        )

        result = score_confidence(extracted, scoring_registry)
        assert result["base_rent_annual"].tier == "not_found"
        assert result["landlord_legal_name"].tier == "low"

    def test_low_confidence_field(
        self, scoring_registry: FieldRegistry
    ) -> None:
        """A field with low LLM confidence scores in the low tier."""
        extracted = ExtractionResult(
            fields={
                "base_rent_annual": FieldExtractionValue(
                    value=150000, confidence=0.50, source_text="$150k"
                ),
            }
        )

        result = score_confidence(extracted, scoring_registry)
        assert result["base_rent_annual"].score == pytest.approx(0.50, abs=0.001)
        assert result["base_rent_annual"].tier == "low"

    def test_multiple_fields_scored(self, scoring_registry: FieldRegistry) -> None:
        extracted = ExtractionResult(
            fields={
                "base_rent_annual": FieldExtractionValue(
                    value=150000, confidence=0.95, source_text="$150k"
                ),
                "landlord_legal_name": FieldExtractionValue(
                    value="Acme LLC", confidence=0.99, source_text="Acme LLC"
                ),
            }
        )

        result = score_confidence(extracted, scoring_registry)
        assert "base_rent_annual" in result
        assert "landlord_legal_name" in result

    def test_fields_not_in_registry_excluded(
        self, scoring_registry: FieldRegistry
    ) -> None:
        """Fields extracted but not in registry are not scored."""
        extracted = ExtractionResult(
            fields={
                "unknown_field": FieldExtractionValue(
                    value="something", confidence=0.90, source_text="text"
                ),
            }
        )

        result = score_confidence(extracted, scoring_registry)
        assert "unknown_field" not in result

    def test_medium_tier_field(self, scoring_registry: FieldRegistry) -> None:
        """A field that scores in the medium tier."""
        extracted = ExtractionResult(
            fields={
                "base_rent_annual": FieldExtractionValue(
                    value=150000, confidence=0.70, source_text="$150k"
                ),
            }
        )

        result = score_confidence(extracted, scoring_registry)
        assert result["base_rent_annual"].score == pytest.approx(0.70, abs=0.001)
        assert result["base_rent_annual"].tier == "medium"

    def test_low_tier_field(self, scoring_registry: FieldRegistry) -> None:
        """A field that scores in the low tier."""
        extracted = ExtractionResult(
            fields={
                "base_rent_annual": FieldExtractionValue(
                    value=150000, confidence=0.40, source_text="$150k"
                ),
            }
        )

        result = score_confidence(extracted, scoring_registry)
        assert result["base_rent_annual"].score == pytest.approx(0.40, abs=0.001)
        assert result["base_rent_annual"].tier == "low"

    def test_perfect_confidence(self, scoring_registry: FieldRegistry) -> None:
        extracted = ExtractionResult(
            fields={
                "base_rent_annual": FieldExtractionValue(
                    value=150000, confidence=1.0, source_text="$150k"
                ),
            }
        )

        result = score_confidence(extracted, scoring_registry)
        assert result["base_rent_annual"].score == pytest.approx(1.0, abs=0.001)
        assert result["base_rent_annual"].tier == "high"

    def test_empty_extraction(self, scoring_registry: FieldRegistry) -> None:
        extracted = ExtractionResult(fields={})
        result = score_confidence(extracted, scoring_registry)
        assert result == {}


# ---------------------------------------------------------------------------
# Cross-field validation: pro rata share
# ---------------------------------------------------------------------------


class TestValidateProRataShare:
    """Tests for pro_rata_share = tenant_rsf / building_rsf cross-validation."""

    def test_valid_pro_rata(self) -> None:
        """Pro rata matches calculation within tolerance."""
        # 10,000 / 200,000 = 0.05
        fields = {
            "pro_rata_share": FieldExtractionValue(
                value=5.0, confidence=0.90, source_text="5%"
            ),
            "rentable_square_footage": FieldExtractionValue(
                value=10000, confidence=0.95, source_text="10,000 RSF"
            ),
            "building_total_rsf": FieldExtractionValue(
                value=200000, confidence=0.95, source_text="200,000 RSF"
            ),
        }
        penalties = validate_pro_rata_share(fields)
        assert len(penalties) == 0

    def test_invalid_pro_rata(self) -> None:
        """Pro rata doesn't match calculation."""
        # 10,000 / 200,000 = 0.05 (5%), but claim 10%
        fields = {
            "pro_rata_share": FieldExtractionValue(
                value=10.0, confidence=0.90, source_text="10%"
            ),
            "rentable_square_footage": FieldExtractionValue(
                value=10000, confidence=0.95, source_text="10,000 RSF"
            ),
            "building_total_rsf": FieldExtractionValue(
                value=200000, confidence=0.95, source_text="200,000 RSF"
            ),
        }
        penalties = validate_pro_rata_share(fields)
        assert len(penalties) > 0
        affected = {p.field_name for p in penalties}
        assert "pro_rata_share" in affected

    def test_pro_rata_within_tolerance(self) -> None:
        """Pro rata within 2% tolerance passes."""
        # 10,000 / 200,000 = 5.0%, value is 5.09% — within 2% relative tolerance
        fields = {
            "pro_rata_share": FieldExtractionValue(
                value=5.09, confidence=0.90, source_text="5.09%"
            ),
            "rentable_square_footage": FieldExtractionValue(
                value=10000, confidence=0.95, source_text="10,000 RSF"
            ),
            "building_total_rsf": FieldExtractionValue(
                value=200000, confidence=0.95, source_text="200,000 RSF"
            ),
        }
        penalties = validate_pro_rata_share(fields)
        assert len(penalties) == 0

    def test_pro_rata_missing_fields_no_penalty(self) -> None:
        """If any of the three fields is missing, skip validation."""
        fields = {
            "pro_rata_share": FieldExtractionValue(
                value=5.0, confidence=0.90, source_text="5%"
            ),
        }
        penalties = validate_pro_rata_share(fields)
        assert len(penalties) == 0

    def test_pro_rata_null_values_no_penalty(self) -> None:
        """If any value is None, skip validation."""
        fields = {
            "pro_rata_share": FieldExtractionValue(
                value=None, confidence=0.0, source_text=""
            ),
            "rentable_square_footage": FieldExtractionValue(
                value=10000, confidence=0.95, source_text="10,000 RSF"
            ),
            "building_total_rsf": FieldExtractionValue(
                value=200000, confidence=0.95, source_text="200,000 RSF"
            ),
        }
        penalties = validate_pro_rata_share(fields)
        assert len(penalties) == 0

    def test_pro_rata_zero_building_rsf_no_penalty(self) -> None:
        """Avoid division by zero when building RSF is 0."""
        fields = {
            "pro_rata_share": FieldExtractionValue(
                value=5.0, confidence=0.90, source_text="5%"
            ),
            "rentable_square_footage": FieldExtractionValue(
                value=10000, confidence=0.95, source_text="10,000 RSF"
            ),
            "building_total_rsf": FieldExtractionValue(
                value=0, confidence=0.95, source_text="0 RSF"
            ),
        }
        penalties = validate_pro_rata_share(fields)
        assert len(penalties) == 0

    def test_pro_rata_as_decimal(self) -> None:
        """Pro rata share expressed as 0.05 (decimal) instead of 5.0 (percent)."""
        fields = {
            "pro_rata_share": FieldExtractionValue(
                value=0.05, confidence=0.90, source_text="5%"
            ),
            "rentable_square_footage": FieldExtractionValue(
                value=10000, confidence=0.95, source_text="10,000 RSF"
            ),
            "building_total_rsf": FieldExtractionValue(
                value=200000, confidence=0.95, source_text="200,000 RSF"
            ),
        }
        penalties = validate_pro_rata_share(fields)
        assert len(penalties) == 0


# ---------------------------------------------------------------------------
# Cross-field validation: date consistency
# ---------------------------------------------------------------------------


class TestValidateDateConsistency:
    """Tests for date consistency: commencement < expiration, rent between."""

    def test_valid_dates(self) -> None:
        fields = {
            "commencement_date": FieldExtractionValue(
                value="2024-01-15", confidence=0.95, source_text="Jan 15 2024"
            ),
            "expiration_date": FieldExtractionValue(
                value="2029-01-14", confidence=0.95, source_text="Jan 14 2029"
            ),
        }
        penalties = validate_date_consistency(fields)
        assert len(penalties) == 0

    def test_commencement_after_expiration(self) -> None:
        fields = {
            "commencement_date": FieldExtractionValue(
                value="2029-01-15", confidence=0.95, source_text="Jan 15 2029"
            ),
            "expiration_date": FieldExtractionValue(
                value="2024-01-14", confidence=0.95, source_text="Jan 14 2024"
            ),
        }
        penalties = validate_date_consistency(fields)
        assert len(penalties) > 0
        affected = {p.field_name for p in penalties}
        assert "commencement_date" in affected
        assert "expiration_date" in affected

    def test_commencement_equals_expiration(self) -> None:
        """Same date is invalid — commencement must be strictly before expiration."""
        fields = {
            "commencement_date": FieldExtractionValue(
                value="2024-01-15", confidence=0.95, source_text="Jan 15 2024"
            ),
            "expiration_date": FieldExtractionValue(
                value="2024-01-15", confidence=0.95, source_text="Jan 15 2024"
            ),
        }
        penalties = validate_date_consistency(fields)
        assert len(penalties) > 0

    def test_rent_commencement_between_dates(self) -> None:
        fields = {
            "commencement_date": FieldExtractionValue(
                value="2024-01-15", confidence=0.95, source_text=""
            ),
            "expiration_date": FieldExtractionValue(
                value="2029-01-14", confidence=0.95, source_text=""
            ),
            "rent_commencement_date": FieldExtractionValue(
                value="2024-03-01", confidence=0.90, source_text=""
            ),
        }
        penalties = validate_date_consistency(fields)
        assert len(penalties) == 0

    def test_rent_commencement_before_commencement(self) -> None:
        fields = {
            "commencement_date": FieldExtractionValue(
                value="2024-01-15", confidence=0.95, source_text=""
            ),
            "expiration_date": FieldExtractionValue(
                value="2029-01-14", confidence=0.95, source_text=""
            ),
            "rent_commencement_date": FieldExtractionValue(
                value="2023-06-01", confidence=0.90, source_text=""
            ),
        }
        penalties = validate_date_consistency(fields)
        affected = {p.field_name for p in penalties}
        assert "rent_commencement_date" in affected

    def test_rent_commencement_after_expiration(self) -> None:
        fields = {
            "commencement_date": FieldExtractionValue(
                value="2024-01-15", confidence=0.95, source_text=""
            ),
            "expiration_date": FieldExtractionValue(
                value="2029-01-14", confidence=0.95, source_text=""
            ),
            "rent_commencement_date": FieldExtractionValue(
                value="2030-01-01", confidence=0.90, source_text=""
            ),
        }
        penalties = validate_date_consistency(fields)
        affected = {p.field_name for p in penalties}
        assert "rent_commencement_date" in affected

    def test_missing_dates_no_penalty(self) -> None:
        fields = {
            "commencement_date": FieldExtractionValue(
                value="2024-01-15", confidence=0.95, source_text=""
            ),
        }
        penalties = validate_date_consistency(fields)
        assert len(penalties) == 0

    def test_invalid_date_format_no_penalty(self) -> None:
        """Non-parseable dates should not crash, just skip validation."""
        fields = {
            "commencement_date": FieldExtractionValue(
                value="not-a-date", confidence=0.95, source_text=""
            ),
            "expiration_date": FieldExtractionValue(
                value="2029-01-14", confidence=0.95, source_text=""
            ),
        }
        penalties = validate_date_consistency(fields)
        assert len(penalties) == 0

    def test_null_date_values_no_penalty(self) -> None:
        fields = {
            "commencement_date": FieldExtractionValue(
                value=None, confidence=0.0, source_text=""
            ),
            "expiration_date": FieldExtractionValue(
                value=None, confidence=0.0, source_text=""
            ),
        }
        penalties = validate_date_consistency(fields)
        assert len(penalties) == 0


# ---------------------------------------------------------------------------
# Cross-field validation: lease term
# ---------------------------------------------------------------------------


class TestValidateLeaseTerm:
    """Tests for lease_term_months matching date delta."""

    def test_valid_lease_term(self) -> None:
        """60 months from Jan 2024 to Jan 2029 — valid."""
        fields = {
            "lease_term_months": FieldExtractionValue(
                value=60, confidence=0.95, source_text="60 months"
            ),
            "commencement_date": FieldExtractionValue(
                value="2024-01-15", confidence=0.95, source_text=""
            ),
            "expiration_date": FieldExtractionValue(
                value="2029-01-14", confidence=0.95, source_text=""
            ),
        }
        penalties = validate_lease_term(fields)
        assert len(penalties) == 0

    def test_valid_lease_term_with_inclusive_expiration_same_day_minus_one(self) -> None:
        """A 60-month term commonly expires the day before the anniversary date."""
        fields = {
            "lease_term_months": FieldExtractionValue(
                value=60, confidence=0.95, source_text="60 months"
            ),
            "commencement_date": FieldExtractionValue(
                value="2024-02-01", confidence=0.95, source_text=""
            ),
            "expiration_date": FieldExtractionValue(
                value="2029-01-31", confidence=0.95, source_text=""
            ),
        }
        penalties = validate_lease_term(fields)
        assert len(penalties) == 0

    def test_invalid_lease_term(self) -> None:
        """Claimed 120 months but dates show ~60 months."""
        fields = {
            "lease_term_months": FieldExtractionValue(
                value=120, confidence=0.95, source_text="120 months"
            ),
            "commencement_date": FieldExtractionValue(
                value="2024-01-15", confidence=0.95, source_text=""
            ),
            "expiration_date": FieldExtractionValue(
                value="2029-01-14", confidence=0.95, source_text=""
            ),
        }
        penalties = validate_lease_term(fields)
        assert len(penalties) > 0
        affected = {p.field_name for p in penalties}
        assert "lease_term_months" in affected

    def test_lease_term_within_one_month_tolerance(self) -> None:
        """Off by 1 month is within tolerance."""
        fields = {
            "lease_term_months": FieldExtractionValue(
                value=59, confidence=0.95, source_text="59 months"
            ),
            "commencement_date": FieldExtractionValue(
                value="2024-01-15", confidence=0.95, source_text=""
            ),
            "expiration_date": FieldExtractionValue(
                value="2029-01-14", confidence=0.95, source_text=""
            ),
        }
        penalties = validate_lease_term(fields)
        assert len(penalties) == 0

    def test_lease_term_missing_fields(self) -> None:
        """Missing dates — skip validation."""
        fields = {
            "lease_term_months": FieldExtractionValue(
                value=60, confidence=0.95, source_text=""
            ),
        }
        penalties = validate_lease_term(fields)
        assert len(penalties) == 0

    def test_lease_term_null_value(self) -> None:
        fields = {
            "lease_term_months": FieldExtractionValue(
                value=None, confidence=0.0, source_text=""
            ),
            "commencement_date": FieldExtractionValue(
                value="2024-01-15", confidence=0.95, source_text=""
            ),
            "expiration_date": FieldExtractionValue(
                value="2029-01-14", confidence=0.95, source_text=""
            ),
        }
        penalties = validate_lease_term(fields)
        assert len(penalties) == 0


# ---------------------------------------------------------------------------
# run_cross_field_validations
# ---------------------------------------------------------------------------


class TestRunCrossFieldValidations:
    """Tests for the aggregate cross-field validation runner."""

    def test_all_valid(self) -> None:
        fields = {
            "pro_rata_share": FieldExtractionValue(
                value=5.0, confidence=0.90, source_text=""
            ),
            "rentable_square_footage": FieldExtractionValue(
                value=10000, confidence=0.95, source_text=""
            ),
            "building_total_rsf": FieldExtractionValue(
                value=200000, confidence=0.95, source_text=""
            ),
            "commencement_date": FieldExtractionValue(
                value="2024-01-15", confidence=0.95, source_text=""
            ),
            "expiration_date": FieldExtractionValue(
                value="2029-01-14", confidence=0.95, source_text=""
            ),
            "lease_term_months": FieldExtractionValue(
                value=60, confidence=0.95, source_text=""
            ),
        }
        penalties = run_cross_field_validations(fields)
        assert len(penalties) == 0

    def test_multiple_failures(self) -> None:
        """Multiple cross-field rules can fail simultaneously."""
        fields = {
            "pro_rata_share": FieldExtractionValue(
                value=50.0, confidence=0.90, source_text=""
            ),
            "rentable_square_footage": FieldExtractionValue(
                value=10000, confidence=0.95, source_text=""
            ),
            "building_total_rsf": FieldExtractionValue(
                value=200000, confidence=0.95, source_text=""
            ),
            "commencement_date": FieldExtractionValue(
                value="2029-01-15", confidence=0.95, source_text=""
            ),
            "expiration_date": FieldExtractionValue(
                value="2024-01-14", confidence=0.95, source_text=""
            ),
            "lease_term_months": FieldExtractionValue(
                value=120, confidence=0.95, source_text=""
            ),
        }
        penalties = run_cross_field_validations(fields)
        assert len(penalties) >= 2


# ---------------------------------------------------------------------------
# score_confidence with cross-field penalties
# ---------------------------------------------------------------------------


class TestScoreConfidenceWithCrossField:
    """Tests that cross-field validation failures reduce field confidence."""

    def test_pro_rata_mismatch_lowers_confidence(
        self, scoring_registry: FieldRegistry
    ) -> None:
        extracted = ExtractionResult(
            fields={
                "pro_rata_share": FieldExtractionValue(
                    value=50.0, confidence=0.90, source_text="50%"
                ),
                "rentable_square_footage": FieldExtractionValue(
                    value=10000, confidence=0.95, source_text=""
                ),
                "building_total_rsf": FieldExtractionValue(
                    value=200000, confidence=0.95, source_text=""
                ),
            }
        )

        result = score_confidence(extracted, scoring_registry)

        # Without penalty: 0.90
        # With penalty: 0.90 * 0.7 = 0.63
        assert result["pro_rata_share"].score < 0.90

    def test_date_mismatch_lowers_confidence(
        self, scoring_registry: FieldRegistry
    ) -> None:
        extracted = ExtractionResult(
            fields={
                "commencement_date": FieldExtractionValue(
                    value="2029-01-15", confidence=0.95, source_text=""
                ),
                "expiration_date": FieldExtractionValue(
                    value="2024-01-14", confidence=0.95, source_text=""
                ),
            }
        )

        result = score_confidence(extracted, scoring_registry)

        # Both dates penalized — score should be below the base LLM confidence of 0.95
        assert result["commencement_date"].score < 0.95
        assert result["expiration_date"].score < 0.95


# ---------------------------------------------------------------------------
# score_overall_confidence
# ---------------------------------------------------------------------------


class TestScoreOverallConfidence:
    """Tests for the weighted-average overall confidence score."""

    def test_basic_weighted_average(self, scoring_registry: FieldRegistry) -> None:
        field_scores = {
            "base_rent_annual": ConfidenceScore(
                score=0.90, tier="high", llm_confidence=0.90
            ),
            "landlord_legal_name": ConfidenceScore(
                score=0.80, tier="medium", llm_confidence=0.80
            ),
        }
        overall = score_overall_confidence(field_scores, scoring_registry)
        # base_rent_annual weight=2.0, landlord weight=1.0
        # weighted avg = (0.90*2.0 + 0.80*1.0) / (2.0 + 1.0) = 2.60/3.0 = 0.8667
        assert overall["overall_score"] == pytest.approx(0.8667, abs=0.01)
        assert overall["tier"] == "high"

    def test_empty_scores(self, scoring_registry: FieldRegistry) -> None:
        field_scores: dict[str, ConfidenceScore] = {}
        overall = score_overall_confidence(field_scores, scoring_registry)
        assert overall["overall_score"] == 0.0
        assert overall["tier"] == "low"

    def test_all_high_confidence(self, scoring_registry: FieldRegistry) -> None:
        field_scores = {
            "base_rent_annual": ConfidenceScore(
                score=0.95, tier="high", llm_confidence=0.95
            ),
            "pro_rata_share": ConfidenceScore(
                score=0.95, tier="high", llm_confidence=0.95
            ),
        }
        overall = score_overall_confidence(field_scores, scoring_registry)
        assert overall["tier"] == "high"
        assert overall["overall_score"] >= 0.85

    def test_fields_not_in_registry_excluded_from_average(
        self, scoring_registry: FieldRegistry
    ) -> None:
        """If a field_score key isn't in the registry, it's excluded from weighting."""
        field_scores = {
            "base_rent_annual": ConfidenceScore(
                score=0.90, tier="high", llm_confidence=0.90
            ),
            "nonexistent_field": ConfidenceScore(
                score=0.10, tier="low", llm_confidence=0.10
            ),
        }
        overall = score_overall_confidence(field_scores, scoring_registry)
        # Only base_rent_annual counted (weight 2.0) = 0.90
        assert overall["overall_score"] == pytest.approx(0.90, abs=0.01)

    def test_overall_low_tier(self, scoring_registry: FieldRegistry) -> None:
        field_scores = {
            "base_rent_annual": ConfidenceScore(
                score=0.30, tier="low", llm_confidence=0.30
            ),
        }
        overall = score_overall_confidence(field_scores, scoring_registry)
        assert overall["tier"] == "low"

    def test_overall_medium_tier(self, scoring_registry: FieldRegistry) -> None:
        field_scores = {
            "base_rent_annual": ConfidenceScore(
                score=0.75, tier="medium", llm_confidence=0.75
            ),
        }
        overall = score_overall_confidence(field_scores, scoring_registry)
        assert overall["tier"] == "medium"

    def test_needs_review_flag(self, scoring_registry: FieldRegistry) -> None:
        """Overall result includes needs_review based on low confidence fields."""
        field_scores = {
            "base_rent_annual": ConfidenceScore(
                score=0.40, tier="low", llm_confidence=0.40
            ),
        }
        overall = score_overall_confidence(field_scores, scoring_registry)
        assert overall["needs_review"] is True

    def test_no_review_when_all_high(self, scoring_registry: FieldRegistry) -> None:
        field_scores = {
            "base_rent_annual": ConfidenceScore(
                score=0.95, tier="high", llm_confidence=0.95
            ),
        }
        overall = score_overall_confidence(field_scores, scoring_registry)
        assert overall["needs_review"] is False

    def test_low_confidence_fields_listed(
        self, scoring_registry: FieldRegistry
    ) -> None:
        field_scores = {
            "base_rent_annual": ConfidenceScore(
                score=0.40, tier="low", llm_confidence=0.40
            ),
            "landlord_legal_name": ConfidenceScore(
                score=0.95, tier="high", llm_confidence=0.95
            ),
        }
        overall = score_overall_confidence(field_scores, scoring_registry)
        assert "base_rent_annual" in overall["low_confidence_fields"]
        assert "landlord_legal_name" not in overall["low_confidence_fields"]

    def test_not_found_fields_excluded_from_overall_average(
        self, scoring_registry: FieldRegistry
    ) -> None:
        """not_found fields (absent from lease) must not drag down the overall score."""
        field_scores = {
            "base_rent_annual": ConfidenceScore(
                score=0.95, tier="high", llm_confidence=0.95
            ),
            # All other fields absent — not_found should not count toward average
            "pro_rata_share": ConfidenceScore(
                score=0.0, tier="not_found", llm_confidence=0.0
            ),
            "lease_term_months": ConfidenceScore(
                score=0.0, tier="not_found", llm_confidence=0.0
            ),
            "landlord_legal_name": ConfidenceScore(
                score=0.0, tier="not_found", llm_confidence=0.0
            ),
        }
        overall = score_overall_confidence(field_scores, scoring_registry)
        # Only base_rent_annual (weight 2.0, score 0.95) should count
        assert overall["overall_score"] == pytest.approx(0.95, abs=0.01)
        assert overall["tier"] == "high"

    def test_not_found_fields_excluded_from_low_confidence_list(
        self, scoring_registry: FieldRegistry
    ) -> None:
        """not_found fields are absent from the lease — they must not appear in low_confidence_fields."""
        field_scores = {
            "base_rent_annual": ConfidenceScore(
                score=0.95, tier="high", llm_confidence=0.95
            ),
            "pro_rata_share": ConfidenceScore(
                score=0.0, tier="not_found", llm_confidence=0.0
            ),
        }
        overall = score_overall_confidence(field_scores, scoring_registry)
        assert "pro_rata_share" not in overall["low_confidence_fields"]

    def test_needs_review_not_triggered_by_not_found_fields(
        self, scoring_registry: FieldRegistry
    ) -> None:
        """A lease with only high-confidence found fields should not need review
        even if many other fields are absent."""
        field_scores = {
            "base_rent_annual": ConfidenceScore(
                score=0.95, tier="high", llm_confidence=0.95
            ),
            "pro_rata_share": ConfidenceScore(
                score=0.0, tier="not_found", llm_confidence=0.0
            ),
            "lease_term_months": ConfidenceScore(
                score=0.0, tier="not_found", llm_confidence=0.0
            ),
        }
        overall = score_overall_confidence(field_scores, scoring_registry)
        assert overall["needs_review"] is False


# ---------------------------------------------------------------------------
# ConfidenceScore dataclass
# ---------------------------------------------------------------------------


class TestConfidenceScore:
    """Tests for the ConfidenceScore data structure."""

    def test_to_dict(self) -> None:
        cs = ConfidenceScore(
            score=0.92, tier="high", llm_confidence=0.89
        )
        d = cs.to_dict()
        assert d == {
            "score": 0.92,
            "tier": "high",
            "llm_confidence": 0.89,
        }

    def test_crossfield_penalty_fields(self) -> None:
        p = CrossFieldPenalty(
            field_name="pro_rata_share",
            reason="Mismatch",
            penalty_factor=0.7,
        )
        assert p.field_name == "pro_rata_share"
        assert p.penalty_factor == 0.7


# ---------------------------------------------------------------------------
# Edge cases for internal helpers
# ---------------------------------------------------------------------------


class TestEdgeCases:
    """Tests for uncovered edge cases in helper functions."""

    def test_safe_parse_date_with_date_object(self) -> None:
        """_safe_parse_date with an actual date object returns it directly."""
        from datetime import date as dt_date

        from extract_sdk.confidence import _safe_parse_date

        d = dt_date(2024, 1, 15)
        assert _safe_parse_date(d) == d

    def test_safe_parse_date_with_datetime_object(self) -> None:
        """_safe_parse_date with a datetime object returns .date()."""
        from datetime import datetime as dt_datetime

        from extract_sdk.confidence import _safe_parse_date

        dt = dt_datetime(2024, 1, 15, 10, 30)
        assert _safe_parse_date(dt) == dt.date()

    def test_safe_parse_date_with_non_string(self) -> None:
        """_safe_parse_date with a non-string/non-date returns None."""
        from extract_sdk.confidence import _safe_parse_date

        assert _safe_parse_date(12345) is None

    def test_safe_float_with_non_numeric_string(self) -> None:
        """_safe_float with unparseable string returns None."""
        from extract_sdk.confidence import _safe_float

        assert _safe_float("not-a-number") is None

    def test_pro_rata_zero_expected(self) -> None:
        """When expected ratio is 0 (tenant RSF=0), skip validation."""
        fields = {
            "pro_rata_share": FieldExtractionValue(
                value=0.0, confidence=0.90, source_text="0%"
            ),
            "rentable_square_footage": FieldExtractionValue(
                value=0, confidence=0.95, source_text="0 RSF"
            ),
            "building_total_rsf": FieldExtractionValue(
                value=200000, confidence=0.95, source_text="200,000 RSF"
            ),
        }
        penalties = validate_pro_rata_share(fields)
        assert len(penalties) == 0

    def test_rent_commencement_unparseable(self) -> None:
        """Rent commencement with unparseable date skips validation."""
        fields = {
            "commencement_date": FieldExtractionValue(
                value="2024-01-15", confidence=0.95, source_text=""
            ),
            "expiration_date": FieldExtractionValue(
                value="2029-01-14", confidence=0.95, source_text=""
            ),
            "rent_commencement_date": FieldExtractionValue(
                value="garbage-date", confidence=0.90, source_text=""
            ),
        }
        penalties = validate_date_consistency(fields)
        assert len(penalties) == 0

    def test_lease_term_unparseable_dates(self) -> None:
        """Lease term validation with unparseable dates skips."""
        fields = {
            "lease_term_months": FieldExtractionValue(
                value=60, confidence=0.95, source_text=""
            ),
            "commencement_date": FieldExtractionValue(
                value="bad-date", confidence=0.95, source_text=""
            ),
            "expiration_date": FieldExtractionValue(
                value="2029-01-14", confidence=0.95, source_text=""
            ),
        }
        penalties = validate_lease_term(fields)
        assert len(penalties) == 0

    def test_lease_term_reversed_dates(self) -> None:
        """Lease term with commencement >= expiration skips."""
        fields = {
            "lease_term_months": FieldExtractionValue(
                value=60, confidence=0.95, source_text=""
            ),
            "commencement_date": FieldExtractionValue(
                value="2029-01-15", confidence=0.95, source_text=""
            ),
            "expiration_date": FieldExtractionValue(
                value="2024-01-14", confidence=0.95, source_text=""
            ),
        }
        penalties = validate_lease_term(fields)
        assert len(penalties) == 0

    def test_lease_term_non_numeric(self) -> None:
        """Non-numeric lease term value skips validation."""
        fields = {
            "lease_term_months": FieldExtractionValue(
                value="sixty", confidence=0.95, source_text=""
            ),
            "commencement_date": FieldExtractionValue(
                value="2024-01-15", confidence=0.95, source_text=""
            ),
            "expiration_date": FieldExtractionValue(
                value="2029-01-14", confidence=0.95, source_text=""
            ),
        }
        penalties = validate_lease_term(fields)
        assert len(penalties) == 0
