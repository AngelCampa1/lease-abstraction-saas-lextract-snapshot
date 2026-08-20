"""Tests for multi-pass extraction merge logic."""

from extract_sdk.extraction.judge import JudgeResult, JudgeVerdict
from extract_sdk.extraction.pass_merger import (
    judge_result_to_patch,
    merge_dual_extractions,
    merge_extraction,
)
from extract_sdk.models import ExtractionPatch, FieldCorrection


class TestMergeExtraction:
    """Tests for merge_extraction()."""

    def test_base_only_no_corrections(self):
        base = {"rent": 120000, "term": 60}
        patch = ExtractionPatch()
        result = merge_extraction(base, patch, None)
        assert result == {"rent": 120000, "term": 60}

    def test_pass2_correction_applied(self):
        base = {"pro_rata_share": 5.25, "rent": 120000}
        patch = ExtractionPatch(
            field_corrections={
                "pro_rata_share": FieldCorrection(
                    original_value=5.25,
                    corrected_value=0.0525,
                    reasoning="Percentage not converted",
                    confidence=0.92,
                )
            }
        )
        result = merge_extraction(base, patch, None)
        assert result["pro_rata_share"] == 0.0525
        assert result["rent"] == 120000  # Unchanged

    def test_pass2_correction_skipped_low_confidence(self):
        base = {"pro_rata_share": 0.0525}
        patch = ExtractionPatch(
            field_corrections={
                "pro_rata_share": FieldCorrection(
                    original_value=0.0525,
                    corrected_value=0.06,
                    confidence=0.50,  # Below threshold
                )
            }
        )
        result = merge_extraction(base, patch, None, min_confidence=0.70)
        assert result["pro_rata_share"] == 0.0525  # Original kept

    def test_pass2_correction_with_custom_threshold(self):
        base = {"cap_type": "cumulative"}
        patch = ExtractionPatch(
            field_corrections={
                "cap_type": FieldCorrection(
                    original_value="cumulative",
                    corrected_value="non_cumulative",
                    confidence=0.55,
                )
            }
        )
        # At threshold 0.50, this should be applied
        result = merge_extraction(base, patch, None, min_confidence=0.50)
        assert result["cap_type"] == "non_cumulative"

    def test_pass3_overrides_unconditionally(self):
        base = {"cap_type": "cumulative", "rent": 120000}
        patch = ExtractionPatch(
            field_corrections={
                "cap_type": FieldCorrection(
                    original_value="cumulative",
                    corrected_value="non_cumulative",
                    confidence=0.92,
                )
            }
        )
        # Pass 3 says "cumulative" was right after all
        overrides = {"cap_type": "cumulative"}
        result = merge_extraction(base, patch, overrides)
        # Pass 3 wins over Pass 2
        assert result["cap_type"] == "cumulative"
        assert result["rent"] == 120000

    def test_pass3_overrides_new_field(self):
        base = {"rent": 120000}
        patch = ExtractionPatch()
        overrides = {"pro_rata_share": 0.0525}
        result = merge_extraction(base, patch, overrides)
        assert result["pro_rata_share"] == 0.0525
        assert result["rent"] == 120000

    def test_combined_merge(self):
        base = {
            "rent": 120000,
            "pro_rata_share": 5.25,
            "cap_type": "cumulative",
            "term": 60,
        }
        patch = ExtractionPatch(
            field_corrections={
                "pro_rata_share": FieldCorrection(
                    original_value=5.25,
                    corrected_value=0.0525,
                    confidence=0.95,
                ),
                "cap_type": FieldCorrection(
                    original_value="cumulative",
                    corrected_value="non_cumulative",
                    confidence=0.88,
                ),
            }
        )
        overrides = {"cap_type": "cumulative"}  # Pass 3 reverses cap_type

        result = merge_extraction(base, patch, overrides)
        assert result["rent"] == 120000  # Untouched
        assert result["pro_rata_share"] == 0.0525  # Pass 2 correction
        assert result["cap_type"] == "cumulative"  # Pass 3 override wins
        assert result["term"] == 60  # Untouched

    def test_does_not_mutate_base(self):
        base = {"rent": 120000}
        patch = ExtractionPatch(
            field_corrections={
                "rent": FieldCorrection(
                    original_value=120000,
                    corrected_value=130000,
                    confidence=0.90,
                )
            }
        )
        merge_extraction(base, patch, None)
        assert base["rent"] == 120000  # Original unchanged

    def test_empty_pass3_overrides(self):
        base = {"rent": 120000}
        patch = ExtractionPatch()
        result = merge_extraction(base, patch, {})
        assert result == {"rent": 120000}

    def test_pass3_hallucinated_key_is_dropped(self):
        """Keys not in the schema or base extraction are silently dropped.

        This prevents a hallucinating model response from polluting the
        extraction result with arbitrary invented fields.
        """
        base = {"tenant_legal_name": "Acme Corp"}
        patch = ExtractionPatch()
        result = merge_extraction(
            base, patch, pass3_overrides={"__hallucinated_field__": "bad_value"}
        )
        assert "__hallucinated_field__" not in result
        assert result["tenant_legal_name"] == "Acme Corp"  # base unchanged


def _empty_judge_result() -> JudgeResult:
    return JudgeResult(
        verdicts=[],
        total_input_tokens=0,
        total_output_tokens=0,
        model_used="z-ai/glm-5.1",
    )


class TestMergeDualExtractions:
    def test_agreeing_fields_pass_through(self):
        a = {"rent": 100, "term": 60}
        b = {"rent": 100, "term": 60}
        merged = merge_dual_extractions(a, b, _empty_judge_result())
        assert merged == {"rent": 100, "term": 60}

    def test_disagreement_without_verdict_falls_back_to_a(self):
        a = {"rent": 100, "term": 60}
        b = {"rent": 200, "term": 72}
        # Empty verdict list — judge dropped both verdicts.  A wins everywhere.
        merged = merge_dual_extractions(a, b, _empty_judge_result())
        assert merged == {"rent": 100, "term": 60}

    def test_verdict_b_overrides_a(self):
        a = {"rent": 100}
        b = {"rent": 200}
        verdict = JudgeVerdict(
            field_path="rent",
            winner="b",
            value=200,
            confidence=0.9,
            reason="B is correct",
        )
        result = JudgeResult(
            verdicts=[verdict],
            total_input_tokens=10,
            total_output_tokens=5,
            model_used="z-ai/glm-5.1",
        )
        merged = merge_dual_extractions(a, b, result)
        assert merged == {"rent": 200}

    def test_synthesis_verdict_applied(self):
        a = {"landlord": "Acme Co"}
        b = {"landlord": "ACME CORPORATION"}
        verdict = JudgeVerdict(
            field_path="landlord",
            winner="synthesis",
            value="Acme Corporation",
            confidence=0.7,
            reason="title-cased canonical",
        )
        merged = merge_dual_extractions(
            a,
            b,
            JudgeResult(
                verdicts=[verdict],
                total_input_tokens=0,
                total_output_tokens=0,
                model_used="z-ai/glm-5.1",
            ),
        )
        assert merged == {"landlord": "Acme Corporation"}

    def test_winner_a_uses_verdict_value_not_extraction_a(self):
        # Winner=a, but verdict.value carries a coerced version (e.g. ``Decimal``
        # from string).  The merge function MUST use the verdict's value, not
        # extraction_a[field], so coercion is preserved.
        a = {"rent": "100"}
        b = {"rent": "100.00"}
        verdict = JudgeVerdict(
            field_path="rent",
            winner="a",
            value=100,  # coerced to int
            confidence=0.9,
            reason="A correct (coerced)",
        )
        merged = merge_dual_extractions(
            a,
            b,
            JudgeResult(
                verdicts=[verdict],
                total_input_tokens=0,
                total_output_tokens=0,
                model_used="z-ai/glm-5.1",
            ),
        )
        assert merged == {"rent": 100}

    def test_nested_verdict_path_ignored(self):
        # Nested verdicts are not coerced by today's judge; merger drops them.
        a = {"rent": 100}
        b = {"rent": 200}
        verdict = JudgeVerdict(
            field_path="rent.subfield",
            winner="b",
            value=999,
            confidence=0.9,
            reason="ignored",
        )
        merged = merge_dual_extractions(
            a,
            b,
            JudgeResult(
                verdicts=[verdict],
                total_input_tokens=0,
                total_output_tokens=0,
                model_used="z-ai/glm-5.1",
            ),
        )
        # No verdict applied → A wins on the disagreement.
        assert merged == {"rent": 100}

    def test_does_not_mutate_a(self):
        a = {"rent": 100}
        b = {"rent": 200}
        merge_dual_extractions(a, b, _empty_judge_result())
        assert a == {"rent": 100}


class TestJudgeResultToPatch:
    def test_empty_verdicts_yields_empty_patch(self):
        patch = judge_result_to_patch(_empty_judge_result(), {"rent": 100})
        assert patch.is_empty

    def test_each_verdict_becomes_a_correction(self):
        a = {"rent": 100, "term": 60}
        verdicts = [
            JudgeVerdict(
                field_path="rent",
                winner="b",
                value=200,
                confidence=0.9,
                reason="B correct",
            ),
            JudgeVerdict(
                field_path="term",
                winner="synthesis",
                value=66,
                confidence=0.6,
                reason="merged",
            ),
        ]
        result = JudgeResult(
            verdicts=verdicts,
            total_input_tokens=0,
            total_output_tokens=0,
            model_used="z-ai/glm-5.1",
        )
        patch = judge_result_to_patch(result, a)
        assert set(patch.field_corrections.keys()) == {"rent", "term"}
        assert patch.field_corrections["rent"].original_value == 100
        assert patch.field_corrections["rent"].corrected_value == 200
        assert patch.field_corrections["rent"].confidence == 0.9
        assert patch.field_corrections["term"].original_value == 60
        assert patch.field_corrections["term"].corrected_value == 66

    def test_nested_verdict_skipped(self):
        a = {"rent": 100}
        verdict = JudgeVerdict(
            field_path="rent.cents",
            winner="b",
            value=99,
            confidence=0.5,
            reason="cents level",
        )
        result = JudgeResult(
            verdicts=[verdict],
            total_input_tokens=0,
            total_output_tokens=0,
            model_used="z-ai/glm-5.1",
        )
        patch = judge_result_to_patch(result, a)
        assert patch.is_empty

    def test_uses_a_value_for_original_when_field_missing_in_a(self):
        # Field not present in A → original_value is None.
        a: dict[str, object] = {}
        verdict = JudgeVerdict(
            field_path="rent",
            winner="b",
            value=200,
            confidence=0.9,
            reason="B has it",
        )
        result = JudgeResult(
            verdicts=[verdict],
            total_input_tokens=0,
            total_output_tokens=0,
            model_used="z-ai/glm-5.1",
        )
        patch = judge_result_to_patch(result, a)
        assert patch.field_corrections["rent"].original_value is None
        assert patch.field_corrections["rent"].corrected_value == 200
