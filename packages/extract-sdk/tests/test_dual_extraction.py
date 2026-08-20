"""Tests for dual_extraction module."""

from __future__ import annotations

import json
from decimal import Decimal
from unittest.mock import AsyncMock

import pytest

from extract_sdk.extraction.client import ExtractionClientProtocol
from extract_sdk.extraction.dual_extraction import (
    DualExtractionOutcome,
    DualFieldResult,
    _parse_verification_response,
    _to_decimal,
    dual_extract_critical_fields,
)
from extract_sdk.models import (
    ExtractionResponse,
    ExtractionResult,
    FieldExtractionValue,
)
from extract_sdk.schema.registry import FieldRegistry


class TestDualFieldResult:
    """Tests for DualFieldResult comparison logic."""

    def test_values_agree_exact(self) -> None:
        r = DualFieldResult(
            field_name="test",
            primary_value=Decimal("0.0525"),
            verification_value=Decimal("0.0525"),
        )
        assert r.values_agree is True
        assert r.needs_review is False

    def test_values_agree_within_tolerance(self) -> None:
        r = DualFieldResult(
            field_name="test",
            primary_value=Decimal("0.0525"),
            verification_value=Decimal("0.0530"),  # ~0.95% deviation
        )
        assert r.values_agree is True

    def test_values_disagree(self) -> None:
        r = DualFieldResult(
            field_name="test",
            primary_value=Decimal("0.05"),
            verification_value=Decimal("0.10"),  # 100% deviation
        )
        assert r.values_agree is False
        assert r.needs_review is True

    def test_values_agree_both_zero(self) -> None:
        r = DualFieldResult(
            field_name="test",
            primary_value=Decimal("0"),
            verification_value=Decimal("0"),
        )
        assert r.values_agree is True

    def test_primary_none(self) -> None:
        r = DualFieldResult(
            field_name="test",
            primary_value=None,
            verification_value=Decimal("0.05"),
        )
        assert r.values_agree is False
        assert r.needs_review is True

    def test_verification_none(self) -> None:
        r = DualFieldResult(
            field_name="test",
            primary_value=Decimal("0.05"),
            verification_value=None,
        )
        assert r.values_agree is False
        assert r.needs_review is True

    def test_both_none(self) -> None:
        r = DualFieldResult(
            field_name="test",
            primary_value=None,
            verification_value=None,
        )
        assert r.values_agree is False
        assert r.needs_review is True

    def test_recommended_value_agreement(self) -> None:
        r = DualFieldResult(
            field_name="test",
            primary_value=Decimal("0.05"),
            verification_value=Decimal("0.05"),
        )
        assert r.recommended_value == Decimal("0.05")

    def test_recommended_value_disagreement_uses_lower(self) -> None:
        r = DualFieldResult(
            field_name="test",
            primary_value=Decimal("0.10"),
            verification_value=Decimal("0.05"),
        )
        assert r.recommended_value == Decimal("0.05")

    def test_recommended_value_primary_none(self) -> None:
        r = DualFieldResult(
            field_name="test",
            primary_value=None,
            verification_value=Decimal("0.05"),
        )
        assert r.recommended_value == Decimal("0.05")

    def test_recommended_value_verification_none(self) -> None:
        r = DualFieldResult(
            field_name="test",
            primary_value=Decimal("0.05"),
            verification_value=None,
        )
        assert r.recommended_value == Decimal("0.05")

    def test_recommended_value_both_none(self) -> None:
        r = DualFieldResult(
            field_name="test",
            primary_value=None,
            verification_value=None,
        )
        assert r.recommended_value is None


class TestDualExtractionOutcome:
    """Tests for DualExtractionOutcome aggregation."""

    def test_all_agree(self) -> None:
        outcome = DualExtractionOutcome(
            results=[
                DualFieldResult("a", Decimal("1"), Decimal("1")),
                DualFieldResult("b", Decimal("2"), Decimal("2")),
            ],
            total_tokens=100,
        )
        assert outcome.all_agree is True

    def test_not_all_agree(self) -> None:
        outcome = DualExtractionOutcome(
            results=[
                DualFieldResult("a", Decimal("1"), Decimal("1")),
                DualFieldResult("b", Decimal("1"), Decimal("100")),
            ],
            total_tokens=100,
        )
        assert outcome.all_agree is False

    def test_get_result_found(self) -> None:
        outcome = DualExtractionOutcome(
            results=[DualFieldResult("a", Decimal("1"), Decimal("1"))],
        )
        assert outcome.get_result("a") is not None
        assert outcome.get_result("a").field_name == "a"

    def test_get_result_not_found(self) -> None:
        outcome = DualExtractionOutcome(results=[])
        assert outcome.get_result("nonexistent") is None

    def test_empty_results(self) -> None:
        outcome = DualExtractionOutcome(results=[], total_tokens=0)
        assert outcome.all_agree is True


class TestToDecimal:
    """Tests for _to_decimal helper."""

    def test_from_int(self) -> None:
        assert _to_decimal(150000) == Decimal("150000")

    def test_from_float(self) -> None:
        assert _to_decimal(0.0525) == Decimal("0.0525")

    def test_from_string(self) -> None:
        assert _to_decimal("60") == Decimal("60")

    def test_from_none(self) -> None:
        assert _to_decimal(None) is None

    def test_from_invalid(self) -> None:
        assert _to_decimal("not a number") is None

    def test_from_bool(self) -> None:
        # str(True) = "True" which is not valid for Decimal, so returns None
        assert _to_decimal(True) is None


class TestParseVerificationResponse:
    """Tests for _parse_verification_response."""

    def test_valid_nested_format(self) -> None:
        raw = json.dumps({
            "fields": {
                "base_rent_annual": {"value": 150000, "confidence": 0.9, "source_text": "s"},
                "pro_rata_share": {"value": 0.0525, "confidence": 0.85, "source_text": "s"},
            }
        })
        result = _parse_verification_response(
            raw, ["base_rent_annual", "pro_rata_share"]
        )
        assert result["base_rent_annual"] == Decimal("150000")
        assert result["pro_rata_share"] == Decimal("0.0525")

    def test_valid_flat_format(self) -> None:
        raw = json.dumps({
            "base_rent_annual": 150000,
            "pro_rata_share": 0.0525,
        })
        result = _parse_verification_response(
            raw, ["base_rent_annual", "pro_rata_share"]
        )
        assert result["base_rent_annual"] == Decimal("150000")
        assert result["pro_rata_share"] == Decimal("0.0525")

    def test_invalid_json(self) -> None:
        result = _parse_verification_response(
            "not json", ["base_rent_annual"]
        )
        assert result == {}

    def test_missing_field(self) -> None:
        raw = json.dumps({"base_rent_annual": 150000})
        result = _parse_verification_response(
            raw, ["base_rent_annual", "nonexistent"]
        )
        assert result["base_rent_annual"] == Decimal("150000")
        assert result["nonexistent"] is None

    def test_null_value(self) -> None:
        raw = json.dumps({"base_rent_annual": None})
        result = _parse_verification_response(raw, ["base_rent_annual"])
        assert result["base_rent_annual"] is None

    def test_non_dict_fields(self) -> None:
        raw = json.dumps({"fields": "not a dict"})
        result = _parse_verification_response(raw, ["test"])
        assert result == {}


class TestDualExtractCriticalFields:
    """Tests for the main dual extraction function."""

    @pytest.mark.asyncio
    async def test_all_agree(self, sample_registry: FieldRegistry) -> None:
        """Verification agrees with primary extraction."""
        verification_response = json.dumps({
            "fields": {
                "base_rent_annual": {"value": 150000, "confidence": 0.95, "source_text": "s"},
                "pro_rata_share": {"value": 0.0525, "confidence": 0.9, "source_text": "s"},
                "lease_term_months": {"value": 60, "confidence": 0.98, "source_text": "s"},
            }
        })

        client = AsyncMock(spec=ExtractionClientProtocol)
        client.extract = AsyncMock(
            return_value=ExtractionResponse(
                text=verification_response, input_tokens=200, output_tokens=100
            )
        )

        primary = ExtractionResult(fields={
            "base_rent_annual": FieldExtractionValue(value=150000, confidence=0.95, source_text="s"),
            "pro_rata_share": FieldExtractionValue(value=0.0525, confidence=0.9, source_text="s"),
            "lease_term_months": FieldExtractionValue(value=60, confidence=0.98, source_text="s"),
        })

        outcome = await dual_extract_critical_fields(
            client=client,
            document_text="lease text",
            primary_extraction=primary,
            registry=sample_registry,
        )

        assert outcome.all_agree is True
        assert outcome.total_tokens == 300

    @pytest.mark.asyncio
    async def test_disagreement(self, sample_registry: FieldRegistry) -> None:
        """Verification disagrees on one field."""
        verification_response = json.dumps({
            "fields": {
                "base_rent_annual": {"value": 200000, "confidence": 0.8, "source_text": "s"},
                "pro_rata_share": {"value": 0.0525, "confidence": 0.9, "source_text": "s"},
                "lease_term_months": {"value": 60, "confidence": 0.98, "source_text": "s"},
            }
        })

        client = AsyncMock(spec=ExtractionClientProtocol)
        client.extract = AsyncMock(
            return_value=ExtractionResponse(
                text=verification_response, input_tokens=200, output_tokens=100
            )
        )

        primary = ExtractionResult(fields={
            "base_rent_annual": FieldExtractionValue(value=150000, confidence=0.95, source_text="s"),
            "pro_rata_share": FieldExtractionValue(value=0.0525, confidence=0.9, source_text="s"),
            "lease_term_months": FieldExtractionValue(value=60, confidence=0.98, source_text="s"),
        })

        outcome = await dual_extract_critical_fields(
            client=client,
            document_text="lease text",
            primary_extraction=primary,
            registry=sample_registry,
        )

        assert outcome.all_agree is False
        rent_result = outcome.get_result("base_rent_annual")
        assert rent_result is not None
        assert rent_result.needs_review is True
        assert rent_result.recommended_value == Decimal("150000")

    @pytest.mark.asyncio
    async def test_verification_api_failure(self, sample_registry: FieldRegistry) -> None:
        """Verification call fails — all fields need review."""
        client = AsyncMock(spec=ExtractionClientProtocol)
        client.extract = AsyncMock(side_effect=Exception("API down"))

        primary = ExtractionResult(fields={
            "base_rent_annual": FieldExtractionValue(value=150000, confidence=0.95, source_text="s"),
            "pro_rata_share": FieldExtractionValue(value=0.0525, confidence=0.9, source_text="s"),
            "lease_term_months": FieldExtractionValue(value=60, confidence=0.98, source_text="s"),
        })

        outcome = await dual_extract_critical_fields(
            client=client,
            document_text="lease text",
            primary_extraction=primary,
            registry=sample_registry,
        )

        assert outcome.all_agree is False
        assert outcome.total_tokens == 0
        for r in outcome.results:
            assert r.needs_review is True

    @pytest.mark.asyncio
    async def test_custom_critical_fields(self, sample_registry: FieldRegistry) -> None:
        """Override critical fields with a custom list."""
        verification_response = json.dumps({
            "fields": {
                "base_rent_annual": {"value": 150000, "confidence": 0.95, "source_text": "s"},
            }
        })

        client = AsyncMock(spec=ExtractionClientProtocol)
        client.extract = AsyncMock(
            return_value=ExtractionResponse(
                text=verification_response, input_tokens=100, output_tokens=50
            )
        )

        primary = ExtractionResult(fields={
            "base_rent_annual": FieldExtractionValue(value=150000, confidence=0.95, source_text="s"),
        })

        outcome = await dual_extract_critical_fields(
            client=client,
            document_text="lease text",
            primary_extraction=primary,
            registry=sample_registry,
            critical_fields=["base_rent_annual"],
        )

        assert len(outcome.results) == 1
        assert outcome.results[0].field_name == "base_rent_annual"

    @pytest.mark.asyncio
    async def test_no_critical_fields(self, sample_registry: FieldRegistry) -> None:
        """When no critical fields are specified, returns empty result."""
        client = AsyncMock(spec=ExtractionClientProtocol)

        primary = ExtractionResult(fields={})

        outcome = await dual_extract_critical_fields(
            client=client,
            document_text="lease text",
            primary_extraction=primary,
            registry=sample_registry,
            critical_fields=[],
        )

        assert len(outcome.results) == 0
        assert outcome.all_agree is True
        assert outcome.total_tokens == 0

    @pytest.mark.asyncio
    async def test_primary_missing_field(self, sample_registry: FieldRegistry) -> None:
        """Primary extraction is missing a critical field."""
        verification_response = json.dumps({
            "fields": {
                "base_rent_annual": {"value": 150000, "confidence": 0.95, "source_text": "s"},
            }
        })

        client = AsyncMock(spec=ExtractionClientProtocol)
        client.extract = AsyncMock(
            return_value=ExtractionResponse(
                text=verification_response, input_tokens=100, output_tokens=50
            )
        )

        primary = ExtractionResult(fields={})  # Missing all fields

        outcome = await dual_extract_critical_fields(
            client=client,
            document_text="lease text",
            primary_extraction=primary,
            registry=sample_registry,
            critical_fields=["base_rent_annual"],
        )

        result = outcome.get_result("base_rent_annual")
        assert result is not None
        assert result.primary_value is None
        assert result.verification_value == Decimal("150000")
        assert result.recommended_value == Decimal("150000")
