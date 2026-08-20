"""Tests for extract_sdk.models — Pydantic models."""

from __future__ import annotations

import pytest

from extract_sdk.models import (
    ExtractionPassRecord,
    ExtractionPatch,
    ExtractionResponse,
    ExtractionResult,
    FieldCorrection,
    FieldExtractionValue,
    MultiPassResult,
    ValidationFailure,
    ValidationResult,
)


class TestExtractionResponse:
    """Tests for ExtractionResponse model."""

    def test_basic_construction(self) -> None:
        resp = ExtractionResponse(text="output", input_tokens=100, output_tokens=50)
        assert resp.text == "output"
        assert resp.input_tokens == 100
        assert resp.output_tokens == 50

    def test_total_tokens(self) -> None:
        resp = ExtractionResponse(text="", input_tokens=200, output_tokens=100)
        assert resp.total_tokens == 300

    def test_zero_tokens(self) -> None:
        resp = ExtractionResponse(text="", input_tokens=0, output_tokens=0)
        assert resp.total_tokens == 0

    def test_negative_tokens_rejected(self) -> None:
        with pytest.raises(ValueError):
            ExtractionResponse(text="", input_tokens=-1, output_tokens=0)

    def test_negative_output_tokens_rejected(self) -> None:
        with pytest.raises(ValueError):
            ExtractionResponse(text="", input_tokens=0, output_tokens=-1)


class TestFieldExtractionValue:
    """Tests for FieldExtractionValue model."""

    def test_defaults(self) -> None:
        fv = FieldExtractionValue()
        assert fv.value is None
        assert fv.confidence == 0.0
        assert fv.source_text == ""

    def test_with_values(self) -> None:
        fv = FieldExtractionValue(
            value="hello", confidence=0.95, source_text="from lease"
        )
        assert fv.value == "hello"
        assert fv.confidence == 0.95
        assert fv.source_text == "from lease"

    def test_confidence_normalization_integer_95(self) -> None:
        fv = FieldExtractionValue(value="x", confidence=95)
        assert fv.confidence == 0.95

    def test_confidence_normalization_integer_0(self) -> None:
        fv = FieldExtractionValue(value="x", confidence=0)
        assert fv.confidence == 0.0

    def test_confidence_normalization_integer_100(self) -> None:
        fv = FieldExtractionValue(value="x", confidence=100)
        assert fv.confidence == 1.0

    def test_confidence_normalization_float_0_5(self) -> None:
        fv = FieldExtractionValue(value="x", confidence=0.5)
        assert fv.confidence == 0.5

    def test_confidence_normalization_non_numeric(self) -> None:
        fv = FieldExtractionValue(value="x", confidence="high")  # type: ignore[arg-type]
        assert fv.confidence == 0.0

    def test_confidence_normalization_string_decimal(self) -> None:
        fv = FieldExtractionValue(value="x", confidence="0.95")  # type: ignore[arg-type]
        assert fv.confidence == 0.95

    def test_confidence_normalization_string_percent(self) -> None:
        fv = FieldExtractionValue(value="x", confidence="95%")  # type: ignore[arg-type]
        assert fv.confidence == 0.95

    def test_confidence_above_one_normalized(self) -> None:
        fv = FieldExtractionValue(value="x", confidence=50)
        assert fv.confidence == 0.5

    def test_confidence_exactly_one(self) -> None:
        fv = FieldExtractionValue(value="x", confidence=1.0)
        assert fv.confidence == 1.0

    def test_various_value_types(self) -> None:
        # string
        assert FieldExtractionValue(value="str").value == "str"
        # number
        assert FieldExtractionValue(value=42).value == 42
        # boolean
        assert FieldExtractionValue(value=True).value is True
        # list
        assert FieldExtractionValue(value=["a", "b"]).value == ["a", "b"]
        # None
        assert FieldExtractionValue(value=None).value is None


class TestExtractionResult:
    """Tests for ExtractionResult model."""

    def test_empty_result(self) -> None:
        result = ExtractionResult()
        assert result.fields == {}

    def test_get_field_value(self) -> None:
        result = ExtractionResult(
            fields={
                "test": FieldExtractionValue(value="hello", confidence=0.9)
            }
        )
        assert result.get_field_value("test") == "hello"

    def test_get_field_value_missing(self) -> None:
        result = ExtractionResult(fields={})
        assert result.get_field_value("missing") is None

    def test_get_field_confidence(self) -> None:
        result = ExtractionResult(
            fields={
                "test": FieldExtractionValue(value="v", confidence=0.85)
            }
        )
        assert result.get_field_confidence("test") == 0.85

    def test_get_field_confidence_missing(self) -> None:
        result = ExtractionResult(fields={})
        assert result.get_field_confidence("missing") == 0.0

    def test_missing_fields(self) -> None:
        result = ExtractionResult(
            fields={
                "present": FieldExtractionValue(value="v", confidence=0.9),
                "null_value": FieldExtractionValue(value=None, confidence=0.0),
            }
        )
        missing = result.missing_fields(["present", "null_value", "absent"])
        assert "present" not in missing
        assert "null_value" in missing
        assert "absent" in missing

    def test_missing_fields_none_when_all_present(self) -> None:
        result = ExtractionResult(
            fields={
                "a": FieldExtractionValue(value="v1", confidence=0.9),
                "b": FieldExtractionValue(value="v2", confidence=0.8),
            }
        )
        missing = result.missing_fields(["a", "b"])
        assert missing == []


class TestValidationFailure:
    """Tests for ValidationFailure model."""

    def test_basic_construction(self) -> None:
        vf = ValidationFailure(field_name="test", message="wrong value")
        assert vf.field_name == "test"
        assert vf.message == "wrong value"
        assert vf.severity == "error"

    def test_custom_severity(self) -> None:
        vf = ValidationFailure(
            field_name="test", message="warning", severity="warning"
        )
        assert vf.severity == "warning"


class TestValidationResult:
    """Tests for ValidationResult model."""

    def test_empty_is_valid(self) -> None:
        vr = ValidationResult()
        assert vr.is_valid is True

    def test_with_failures_is_invalid(self) -> None:
        vr = ValidationResult(
            failures=[ValidationFailure(field_name="x", message="bad")]
        )
        assert vr.is_valid is False

    def test_feedback_prompt_empty_when_valid(self) -> None:
        vr = ValidationResult()
        assert vr.feedback_prompt == ""

    def test_feedback_prompt_with_failures(self) -> None:
        vr = ValidationResult(
            failures=[
                ValidationFailure(field_name="rent", message="too low"),
                ValidationFailure(field_name="term", message="missing"),
            ]
        )
        feedback = vr.feedback_prompt
        assert "rent: too low" in feedback
        assert "term: missing" in feedback
        assert "re-extract" in feedback.lower()

    def test_feedback_prompt_single_failure(self) -> None:
        vr = ValidationResult(
            failures=[ValidationFailure(field_name="test", message="issue")]
        )
        feedback = vr.feedback_prompt
        assert "test: issue" in feedback


class TestExtractionPassRecord:
    """Tests for ExtractionPassRecord model."""

    def test_basic_construction(self) -> None:
        record = ExtractionPassRecord(
            pass_number=1,
            model="model-a",
            input_tokens=100,
            output_tokens=50,
            duration_ms=200,
        )
        assert record.pass_number == 1
        assert record.model == "model-a"
        assert record.input_tokens == 100
        assert record.output_tokens == 50
        assert record.duration_ms == 200

    def test_total_tokens(self) -> None:
        record = ExtractionPassRecord(
            pass_number=2,
            model="model-b",
            input_tokens=300,
            output_tokens=150,
        )
        assert record.total_tokens == 450

    def test_total_tokens_zero(self) -> None:
        record = ExtractionPassRecord(pass_number=1, model="m")
        assert record.total_tokens == 0

    def test_pass_number_bounds(self) -> None:
        # Valid pass numbers
        ExtractionPassRecord(pass_number=1, model="m")
        ExtractionPassRecord(pass_number=3, model="m")
        import pytest as _pytest
        with _pytest.raises(Exception):
            ExtractionPassRecord(pass_number=0, model="m")
        with _pytest.raises(Exception):
            ExtractionPassRecord(pass_number=4, model="m")


class TestExtractionPatch:
    """Tests for ExtractionPatch model."""

    def test_is_empty_true(self) -> None:
        patch = ExtractionPatch()
        assert patch.is_empty is True

    def test_is_empty_false(self) -> None:
        patch = ExtractionPatch(
            field_corrections={
                "rent": FieldCorrection(
                    original_value=100,
                    corrected_value=200,
                    reasoning="x",
                    confidence=0.9,
                )
            }
        )
        assert patch.is_empty is False

    def test_critical_corrections_filters_correctly(self) -> None:
        patch = ExtractionPatch(
            field_corrections={
                "rent": FieldCorrection(confidence=0.9),
                "term": FieldCorrection(confidence=0.8),
                "notes": FieldCorrection(confidence=0.7),
            }
        )
        critical = patch.critical_corrections(["rent", "term"])
        assert "rent" in critical
        assert "term" in critical
        assert "notes" not in critical

    def test_critical_corrections_empty_when_no_overlap(self) -> None:
        patch = ExtractionPatch(
            field_corrections={"notes": FieldCorrection(confidence=0.5)}
        )
        assert patch.critical_corrections(["rent"]) == {}


class TestMultiPassResult:
    """Tests for MultiPassResult model."""

    def _make_result(self, records: list[ExtractionPassRecord]) -> MultiPassResult:
        return MultiPassResult(
            extraction=ExtractionResult(),
            pass_records=records,
        )

    def test_total_tokens_single_pass(self) -> None:
        records = [
            ExtractionPassRecord(
                pass_number=1, model="m", input_tokens=100, output_tokens=50
            )
        ]
        result = self._make_result(records)
        assert result.total_tokens == 150

    def test_total_tokens_multiple_passes(self) -> None:
        records = [
            ExtractionPassRecord(
                pass_number=1, model="m", input_tokens=200, output_tokens=100
            ),
            ExtractionPassRecord(
                pass_number=2, model="m", input_tokens=150, output_tokens=75
            ),
            ExtractionPassRecord(
                pass_number=3, model="m", input_tokens=100, output_tokens=50
            ),
        ]
        result = self._make_result(records)
        assert result.total_tokens == 675

    def test_total_tokens_zero_when_no_passes(self) -> None:
        result = self._make_result([])
        assert result.total_tokens == 0

    def test_audit_trail_field_present(self) -> None:
        result = MultiPassResult(
            extraction=ExtractionResult(),
            audit_trail={"raw_responses": [], "needs_review": False},
        )
        assert result.audit_trail is not None
        assert result.audit_trail["needs_review"] is False

    def test_audit_trail_defaults_to_none(self) -> None:
        result = MultiPassResult(extraction=ExtractionResult())
        assert result.audit_trail is None

    def test_confidence_scores_does_not_contain_audit_trail(self) -> None:
        result = MultiPassResult(
            extraction=ExtractionResult(),
            confidence_scores={"base_rent_annual": 0.95},
            audit_trail={"needs_review": False},
        )
        assert "_audit_trail" not in result.confidence_scores
        assert result.confidence_scores["base_rent_annual"] == 0.95
