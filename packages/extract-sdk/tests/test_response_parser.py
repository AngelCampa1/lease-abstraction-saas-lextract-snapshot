"""Tests for response_parser module."""

from __future__ import annotations

import json

import pytest

from extract_sdk.exceptions import ExtractionParseError
from extract_sdk.extraction.response_parser import (
    _coerce_field_value,
    _strip_markdown_code_blocks,
    parse_extraction_response,
)
from extract_sdk.schema.base import FieldDefinition
from extract_sdk.schema.registry import FieldRegistry


class TestStripMarkdownCodeBlocks:
    """Tests for markdown code block stripping."""

    def test_no_code_block(self) -> None:
        assert _strip_markdown_code_blocks('{"a": 1}') == '{"a": 1}'

    def test_json_code_block(self) -> None:
        text = '```json\n{"a": 1}\n```'
        assert _strip_markdown_code_blocks(text) == '{"a": 1}'

    def test_plain_code_block(self) -> None:
        text = '```\n{"a": 1}\n```'
        assert _strip_markdown_code_blocks(text) == '{"a": 1}'

    def test_whitespace_around(self) -> None:
        text = '  ```json\n{"a": 1}\n```  '
        assert _strip_markdown_code_blocks(text) == '{"a": 1}'


class TestCoerceFieldValue:
    """Tests for field value type coercion."""

    def test_none_passthrough(self) -> None:
        assert _coerce_field_value(None, "string") is None

    def test_boolean_true(self) -> None:
        assert _coerce_field_value(True, "boolean") is True

    def test_boolean_string_yes(self) -> None:
        assert _coerce_field_value("yes", "boolean") is True

    def test_boolean_string_false(self) -> None:
        assert _coerce_field_value("false", "boolean") is False

    def test_boolean_string_true(self) -> None:
        assert _coerce_field_value("true", "boolean") is True

    def test_boolean_int(self) -> None:
        assert _coerce_field_value(1, "boolean") is True

    def test_number_int(self) -> None:
        assert _coerce_field_value(42, "number") == 42.0

    def test_number_float(self) -> None:
        assert _coerce_field_value(3.14, "number") == 3.14

    def test_number_string(self) -> None:
        assert _coerce_field_value("150000", "number") == 150000.0

    def test_currency_with_symbols(self) -> None:
        assert _coerce_field_value("$150,000.00", "currency") == 150000.0

    def test_currency_empty_string(self) -> None:
        assert _coerce_field_value("$", "currency") is None

    def test_currency_non_numeric_string(self) -> None:
        result = _coerce_field_value("N/A", "currency")
        assert result == "N/A"

    def test_number_passthrough_for_non_string_object(self) -> None:
        raw = {"amount": 10}
        result = _coerce_field_value(raw, "number")
        assert result == raw

    def test_percentage_decimal(self) -> None:
        assert _coerce_field_value(0.05, "percentage") == 0.05

    def test_percentage_above_one(self) -> None:
        # 5.25% as a number > 1.0 should be converted to 0.0525
        assert _coerce_field_value(5.25, "percentage") == pytest.approx(0.0525)

    def test_percentage_string(self) -> None:
        assert _coerce_field_value("5.25%", "percentage") == pytest.approx(0.0525)

    def test_percentage_string_without_symbol_above_one(self) -> None:
        assert _coerce_field_value("5.25", "percentage") == pytest.approx(0.0525)

    def test_percentage_boundary_1_0(self) -> None:
        # M25 fix: 1.0 is ambiguous (could be 100% decimal or 1% percent form).
        # We treat it as already-decimal (100%) to avoid silently corrupting it.
        assert _coerce_field_value(1.0, "percentage") == pytest.approx(1.0)

    def test_percentage_string_boundary_1_0(self) -> None:
        assert _coerce_field_value("1.0", "percentage") == pytest.approx(1.0)

    def test_percentage_boundary_100_0(self) -> None:
        # 100.0 is treated as "100%" → 1.0
        assert _coerce_field_value(100.0, "percentage") == pytest.approx(1.0)

    def test_percentage_below_1_unchanged(self) -> None:
        # Values < 1.0 are already in decimal form; pass through unchanged
        assert _coerce_field_value(0.0525, "percentage") == pytest.approx(0.0525)

    def test_array_list(self) -> None:
        assert _coerce_field_value(["a", "b"], "array") == ["a", "b"]

    def test_array_string(self) -> None:
        assert _coerce_field_value("a, b, c", "array") == ["a", "b", "c"]

    def test_array_empty_string(self) -> None:
        assert _coerce_field_value("", "array") == []

    def test_array_single_value(self) -> None:
        assert _coerce_field_value(42, "array") == [42]

    def test_string_passthrough(self) -> None:
        assert _coerce_field_value("hello", "string") == "hello"

    def test_string_from_int(self) -> None:
        assert _coerce_field_value(42, "string") == "42"

    def test_date_passthrough(self) -> None:
        assert _coerce_field_value("2024-01-15", "date") == "2024-01-15"

    def test_number_non_numeric(self) -> None:
        result = _coerce_field_value("not a number", "number")
        assert result == "not a number"

    def test_percentage_empty_after_strip(self) -> None:
        assert _coerce_field_value("%", "percentage") is None


class TestParseExtractionResponse:
    """Tests for the main response parser."""

    def test_parse_valid_response(
        self, sample_extraction_response_json: str
    ) -> None:
        result = parse_extraction_response(sample_extraction_response_json)
        assert "base_rent_annual" in result.fields
        assert result.fields["base_rent_annual"].value == 150000.0
        assert result.fields["base_rent_annual"].confidence == 0.95

    def test_parse_with_registry_coercion(
        self,
        sample_extraction_response_json: str,
        sample_registry: FieldRegistry,
    ) -> None:
        result = parse_extraction_response(
            sample_extraction_response_json, registry=sample_registry
        )
        assert result.fields["has_renewal_option"].value is True

    def test_parse_invalid_json(self) -> None:
        with pytest.raises(ExtractionParseError, match="Invalid JSON"):
            parse_extraction_response("not json at all")

    def test_parse_repairs_malformed_json_object(self) -> None:
        raw = '{"fields": {"test": {"value": "v", "confidence": 0.9, "source_text": "s",},},}'
        result = parse_extraction_response(raw)
        assert result.fields["test"].value == "v"

    def test_parse_non_object(self) -> None:
        with pytest.raises(ExtractionParseError, match="not a JSON object"):
            parse_extraction_response("[1, 2, 3]")

    def test_parse_fields_key_must_be_object(self) -> None:
        raw = json.dumps({"fields": ["not", "an", "object"]})
        with pytest.raises(ExtractionParseError, match="missing \"fields\""):
            parse_extraction_response(raw)

    def test_parse_markdown_wrapped(self) -> None:
        raw = '```json\n{"fields": {"test": {"value": "hello", "confidence": 0.9, "source_text": "src"}}}\n```'
        result = parse_extraction_response(raw)
        assert result.fields["test"].value == "hello"

    def test_parse_flat_format(self) -> None:
        """Test parsing when response is flat (no 'fields' wrapper)."""
        raw = json.dumps({
            "base_rent_annual": {
                "value": 100000,
                "confidence": 0.8,
                "source_text": "src"
            }
        })
        result = parse_extraction_response(raw)
        assert "base_rent_annual" in result.fields

    def test_parse_missing_source_text(self) -> None:
        raw = json.dumps({
            "fields": {
                "test": {"value": "v", "confidence": 0.5}
            }
        })
        result = parse_extraction_response(raw)
        assert result.fields["test"].source_text == ""

    def test_parse_empty_source_text(self) -> None:
        raw = json.dumps({
            "fields": {
                "test": {"value": "v", "confidence": 0.5, "source_text": "   "}
            }
        })
        result = parse_extraction_response(raw)
        assert result.fields["test"].source_text == ""

    def test_parse_skips_non_dict_entries(self) -> None:
        raw = json.dumps({
            "fields": {
                "valid": {"value": "v", "confidence": 0.5, "source_text": "s"},
                "metadata": "not a dict"
            }
        })
        result = parse_extraction_response(raw)
        assert "valid" in result.fields
        assert "metadata" not in result.fields

    def test_parse_confidence_normalization(self) -> None:
        """Test that confidence > 1.0 is normalized to 0-1 scale."""
        raw = json.dumps({
            "fields": {
                "test": {"value": "v", "confidence": 95, "source_text": "s"}
            }
        })
        result = parse_extraction_response(raw)
        assert result.fields["test"].confidence == 0.95

    def test_parse_null_values(self) -> None:
        raw = json.dumps({
            "fields": {
                "test": {"value": None, "confidence": 0.0, "source_text": ""}
            }
        })
        result = parse_extraction_response(raw)
        assert result.fields["test"].value is None
        assert result.fields["test"].confidence == 0.0

    def test_parse_with_registry_percentage_coercion(self) -> None:
        """Test that percentage fields > 1.0 are normalized when registry is provided."""
        fields = [
            FieldDefinition(
                field_name="rate", category="C", display_label="R",
                description="R", data_type="percentage",
            )
        ]
        registry = FieldRegistry(name="T", fields=fields)
        raw = json.dumps({
            "fields": {
                "rate": {"value": 5.25, "confidence": 0.9, "source_text": "5.25%"}
            }
        })
        result = parse_extraction_response(raw, registry=registry)
        assert result.fields["rate"].value == pytest.approx(0.0525)
