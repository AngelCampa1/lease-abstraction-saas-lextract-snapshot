"""Tests for Pass 3 escalation prompts."""

from extract_sdk.extraction.escalation_prompts import build_lease_escalation_prompt
from extract_sdk.models import ExtractionPatch, FieldCorrection


class TestBuildLeaseEscalationPrompt:
    """Tests for escalation prompt construction."""

    def test_contains_both_pass_values(self):
        pass1 = {"cam_cap_type": "cumulative", "pro_rata_share": 0.0525}
        patch = ExtractionPatch(
            field_corrections={
                "cam_cap_type": FieldCorrection(
                    original_value="cumulative",
                    corrected_value="non_cumulative",
                    reasoning="No carry-forward language found",
                    confidence=0.88,
                ),
            }
        )
        prompt = build_lease_escalation_prompt(
            pass1, patch, ["cam_cap_type"]
        )
        assert '"cumulative"' in prompt
        assert '"non_cumulative"' in prompt
        assert "No carry-forward language found" in prompt
        assert "0.88" in prompt

    def test_contains_preamble(self):
        prompt = build_lease_escalation_prompt(
            {"field": "value"},
            ExtractionPatch(),
            ["field"],
        )
        assert "senior commercial real estate analyst" in prompt
        assert "disputed" in prompt.lower()

    def test_output_format(self):
        prompt = build_lease_escalation_prompt(
            {"field": "value"},
            ExtractionPatch(),
            ["field"],
        )
        assert "field_name" in prompt
        assert "final_correct_value" in prompt

    def test_multiple_disputed_fields(self):
        pass1 = {"cam_cap_type": "cumulative", "pro_rata_share": 5.25}
        patch = ExtractionPatch(
            field_corrections={
                "cam_cap_type": FieldCorrection(
                    original_value="cumulative",
                    corrected_value="non_cumulative",
                    confidence=0.88,
                ),
                "pro_rata_share": FieldCorrection(
                    original_value=5.25,
                    corrected_value=0.0525,
                    confidence=0.95,
                ),
            }
        )
        prompt = build_lease_escalation_prompt(
            pass1, patch, ["cam_cap_type", "pro_rata_share"]
        )
        assert "cam_cap_type" in prompt
        assert "pro_rata_share" in prompt

    def test_injects_category_knowledge(self):
        prompt = build_lease_escalation_prompt(
            {"cam_cap_type": "cumulative"},
            ExtractionPatch(
                field_corrections={
                    "cam_cap_type": FieldCorrection(
                        original_value="cumulative",
                        corrected_value="non_cumulative",
                        confidence=0.88,
                    )
                }
            ),
            ["cam_cap_type"],
            field_categories={"cam_cap_type": "CAM & Operating Expenses"},
        )
        # Should inject CAM domain knowledge
        assert "CAM & Operating Expenses" in prompt
        assert "non_cumulative" in prompt

    def test_no_category_knowledge_without_mapping(self):
        prompt = build_lease_escalation_prompt(
            {"field": "value"},
            ExtractionPatch(),
            ["field"],
            field_categories=None,
        )
        # Should still work, just without category knowledge
        assert "field" in prompt
        assert "Raw Lease Document Text" in prompt

    def test_document_text_section(self):
        prompt = build_lease_escalation_prompt(
            {"f": "v"}, ExtractionPatch(), ["f"]
        )
        assert "Raw Lease Document Text" in prompt

    def test_field_without_correction(self):
        """A field in disputed_fields but not in patch (low confidence trigger)."""
        pass1 = {"base_rent_annual": 120000}
        patch = ExtractionPatch()  # No corrections
        prompt = build_lease_escalation_prompt(
            pass1, patch, ["base_rent_annual"]
        )
        assert "base_rent_annual" in prompt
        assert "120000" in prompt
