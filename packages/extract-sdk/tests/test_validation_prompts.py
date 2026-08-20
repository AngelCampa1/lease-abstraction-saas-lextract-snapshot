"""Tests for Pass 2 adversarial validation prompts."""

from extract_sdk.extraction.validation_prompts import build_lease_validation_prompt


class TestBuildLeaseValidationPrompt:
    """Tests for validation prompt construction."""

    def test_contains_pass1_json(self):
        pass1 = {"pro_rata_share": 0.0525, "base_rent_annual": 120000}
        prompt = build_lease_validation_prompt(pass1)
        assert '"pro_rata_share": 0.0525' in prompt
        assert '"base_rent_annual": 120000' in prompt

    def test_contains_adversarial_preamble(self):
        prompt = build_lease_validation_prompt({"rent": 100})
        assert "adversarial" in prompt.lower()
        assert "FIND ERRORS" in prompt

    def test_contains_output_format(self):
        prompt = build_lease_validation_prompt({"rent": 100})
        assert "field_corrections" in prompt
        assert "original_value" in prompt
        assert "corrected_value" in prompt
        assert "reasoning" in prompt
        assert "confidence" in prompt

    def test_contains_forensic_checklist(self):
        prompt = build_lease_validation_prompt({"rent": 100})
        assert "Format checks" in prompt
        assert "Date consistency" in prompt
        assert "Pro rata share" in prompt
        assert "CAM cap type" in prompt
        assert "Amendment detection" in prompt

    def test_contains_validation_knowledge(self):
        prompt = build_lease_validation_prompt({"rent": 100})
        assert "Cross-Field Validation" in prompt
        assert "Top 10 Extraction Accuracy Risks" in prompt

    def test_contains_document_text_section(self):
        prompt = build_lease_validation_prompt({"rent": 100})
        assert "Raw Lease Document Text" in prompt

    def test_handles_complex_values(self):
        pass1 = {
            "cam_exclusions": ["capital expenditures", "leasing commissions"],
            "renewal_terms": [{"years": 5, "rent": "FMV"}],
        }
        prompt = build_lease_validation_prompt(pass1)
        assert "capital expenditures" in prompt
        assert "leasing commissions" in prompt

    def test_empty_extraction(self):
        prompt = build_lease_validation_prompt({})
        assert "field_corrections" in prompt  # Still has format instructions
