"""Tests for multi-pass extraction models (FieldCorrection, ExtractionPatch, etc.)."""

from extract_sdk.models import (
    ExtractionPassRecord,
    ExtractionPatch,
    ExtractionResult,
    FieldCorrection,
    FieldExtractionValue,
    MultiPassResult,
)


class TestFieldCorrection:
    """FieldCorrection model tests."""

    def test_basic_creation(self):
        fc = FieldCorrection(
            original_value="5.25",
            corrected_value=0.0525,
            reasoning="Percentage not converted to decimal",
            confidence=0.95,
        )
        assert fc.original_value == "5.25"
        assert fc.corrected_value == 0.0525
        assert fc.confidence == 0.95
        assert fc.rule_relevance == []

    def test_defaults(self):
        fc = FieldCorrection()
        assert fc.original_value is None
        assert fc.corrected_value is None
        assert fc.reasoning == ""
        assert fc.confidence == 0.0
        assert fc.rule_relevance == []

    def test_with_rule_relevance(self):
        fc = FieldCorrection(
            original_value="cumulative",
            corrected_value="non_cumulative",
            reasoning="No carry-forward language found",
            confidence=0.88,
            rule_relevance=["Format checks", "Date consistency"],
        )
        assert fc.rule_relevance == ["Format checks", "Date consistency"]


class TestExtractionPatch:
    """ExtractionPatch model tests."""

    def test_empty_patch(self):
        patch = ExtractionPatch()
        assert patch.is_empty
        assert patch.field_corrections == {}

    def test_non_empty_patch(self):
        patch = ExtractionPatch(
            field_corrections={
                "pro_rata_share": FieldCorrection(
                    original_value=5.25,
                    corrected_value=0.0525,
                    confidence=0.92,
                )
            }
        )
        assert not patch.is_empty
        assert "pro_rata_share" in patch.field_corrections

    def test_critical_corrections(self):
        patch = ExtractionPatch(
            field_corrections={
                "pro_rata_share": FieldCorrection(
                    original_value=5.25, corrected_value=0.0525, confidence=0.92
                ),
                "parking_ratio": FieldCorrection(
                    original_value=3.0, corrected_value=4.0, confidence=0.75
                ),
                "base_rent_annual": FieldCorrection(
                    original_value=100000, corrected_value=120000, confidence=0.88
                ),
            }
        )
        critical = patch.critical_corrections(
            ["base_rent_annual", "pro_rata_share", "lease_term_months"]
        )
        assert len(critical) == 2
        assert "pro_rata_share" in critical
        assert "base_rent_annual" in critical
        assert "parking_ratio" not in critical

    def test_critical_corrections_empty(self):
        patch = ExtractionPatch(
            field_corrections={
                "parking_ratio": FieldCorrection(
                    original_value=3.0, corrected_value=4.0, confidence=0.75
                ),
            }
        )
        critical = patch.critical_corrections(["base_rent_annual", "pro_rata_share"])
        assert len(critical) == 0


class TestExtractionPassRecord:
    """ExtractionPassRecord model tests."""

    def test_basic_creation(self):
        record = ExtractionPassRecord(
            pass_number=1,
            model="minimax/minimax-m2.7",
            input_tokens=50000,
            output_tokens=4000,
            duration_ms=3500,
        )
        assert record.pass_number == 1
        assert record.model == "minimax/minimax-m2.7"
        assert record.total_tokens == 54000

    def test_defaults(self):
        record = ExtractionPassRecord(pass_number=2, model="openai/gpt-5.4-mini")
        assert record.input_tokens == 0
        assert record.output_tokens == 0
        assert record.duration_ms == 0
        assert record.total_tokens == 0


class TestMultiPassResult:
    """MultiPassResult model tests."""

    def test_basic_creation(self):
        extraction = ExtractionResult(
            fields={
                "base_rent_annual": FieldExtractionValue(
                    value=120000, confidence=0.95, source_text="$120,000 per annum"
                )
            }
        )
        result = MultiPassResult(
            extraction=extraction,
            pass_records=[
                ExtractionPassRecord(
                    pass_number=1,
                    model="minimax/minimax-m2.7",
                    input_tokens=50000,
                    output_tokens=4000,
                ),
                ExtractionPassRecord(
                    pass_number=2,
                    model="openai/gpt-5.4-mini",
                    input_tokens=6000,
                    output_tokens=1500,
                ),
            ],
        )
        assert result.total_tokens == 61500
        assert result.needs_review is False
        assert result.patch is None
        assert result.pass3_overrides is None

    def test_with_patch_and_overrides(self):
        extraction = ExtractionResult(fields={})
        patch = ExtractionPatch(
            field_corrections={
                "pro_rata_share": FieldCorrection(
                    original_value=5.25, corrected_value=0.0525, confidence=0.92
                )
            }
        )
        result = MultiPassResult(
            extraction=extraction,
            pass_records=[],
            patch=patch,
            pass3_overrides={"pro_rata_share": 0.0525},
            needs_review=True,
        )
        assert result.needs_review is True
        assert result.patch is not None
        assert not result.patch.is_empty
        assert result.pass3_overrides == {"pro_rata_share": 0.0525}

    def test_total_tokens_empty(self):
        result = MultiPassResult(
            extraction=ExtractionResult(fields={}), pass_records=[]
        )
        assert result.total_tokens == 0
