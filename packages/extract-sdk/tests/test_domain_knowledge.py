"""Tests for expert commercial lease abstraction domain knowledge."""

from extract_sdk.extraction.domain_knowledge import (
    ASSIGNMENT_AND_SUBLETTING_KNOWLEDGE,
    CAM_AND_OPEX_KNOWLEDGE,
    COMMON_EXTRACTION_PITFALLS,
    CROSS_FIELD_VALIDATION_RULES,
    DEFAULT_AND_REMEDIES_KNOWLEDGE,
    EXCLUSIVITY_AND_COTENANCY_KNOWLEDGE,
    INSURANCE_AND_INDEMNITY_KNOWLEDGE,
    KEY_DATES_AND_TERM_KNOWLEDGE,
    MISCELLANEOUS_KNOWLEDGE,
    OPTIONS_KNOWLEDGE,
    PARKING_AND_COMMON_AREAS_KNOWLEDGE,
    PARTIES_AND_PROPERTY_KNOWLEDGE,
    RENT_AND_ESCALATIONS_KNOWLEDGE,
    SIGNAGE_AND_PERMITTED_USE_KNOWLEDGE,
    TI_AND_CONSTRUCTION_KNOWLEDGE,
    UTILITIES_AND_PHYSICAL_KNOWLEDGE,
    get_all_domain_knowledge,
    get_category_knowledge,
    get_validation_knowledge,
)


class TestCategoryConstants:
    """All 14 category knowledge constants must be non-empty strings."""

    def test_parties_and_property_present(self):
        assert len(PARTIES_AND_PROPERTY_KNOWLEDGE) > 100
        assert "landlord_legal_name" in PARTIES_AND_PROPERTY_KNOWLEDGE
        assert "RSF" in PARTIES_AND_PROPERTY_KNOWLEDGE
        assert "USF" in PARTIES_AND_PROPERTY_KNOWLEDGE
        assert "BOMA" in PARTIES_AND_PROPERTY_KNOWLEDGE

    def test_key_dates_and_term_present(self):
        assert len(KEY_DATES_AND_TERM_KNOWLEDGE) > 100
        assert "commencement" in KEY_DATES_AND_TERM_KNOWLEDGE
        assert "rent_commencement" in KEY_DATES_AND_TERM_KNOWLEDGE
        assert "lease_term_months" in KEY_DATES_AND_TERM_KNOWLEDGE

    def test_rent_and_escalations_present(self):
        assert len(RENT_AND_ESCALATIONS_KNOWLEDGE) > 100
        assert "base_rent_annual" in RENT_AND_ESCALATIONS_KNOWLEDGE
        assert "escalation_type" in RENT_AND_ESCALATIONS_KNOWLEDGE
        assert "CPI" in RENT_AND_ESCALATIONS_KNOWLEDGE
        assert "breakpoint" in RENT_AND_ESCALATIONS_KNOWLEDGE

    def test_cam_and_opex_present(self):
        assert len(CAM_AND_OPEX_KNOWLEDGE) > 100
        assert "pro_rata_share" in CAM_AND_OPEX_KNOWLEDGE
        assert "cam_cap_type" in CAM_AND_OPEX_KNOWLEDGE
        assert "non_cumulative" in CAM_AND_OPEX_KNOWLEDGE
        assert "cumulative" in CAM_AND_OPEX_KNOWLEDGE
        assert "gross_up" in CAM_AND_OPEX_KNOWLEDGE
        assert "NNN" in CAM_AND_OPEX_KNOWLEDGE

    def test_options_present(self):
        assert len(OPTIONS_KNOWLEDGE) > 100
        assert "renewal" in OPTIONS_KNOWLEDGE
        assert "termination" in OPTIONS_KNOWLEDGE
        assert "ROFR" in OPTIONS_KNOWLEDGE
        assert "ROFO" in OPTIONS_KNOWLEDGE

    def test_ti_and_construction_present(self):
        assert len(TI_AND_CONSTRUCTION_KNOWLEDGE) > 100
        assert "ti_allowance" in TI_AND_CONSTRUCTION_KNOWLEDGE
        assert "restoration" in TI_AND_CONSTRUCTION_KNOWLEDGE
        assert "hvac" in TI_AND_CONSTRUCTION_KNOWLEDGE.lower()

    def test_insurance_and_indemnity_present(self):
        assert len(INSURANCE_AND_INDEMNITY_KNOWLEDGE) > 100
        assert "cgl" in INSURANCE_AND_INDEMNITY_KNOWLEDGE.lower()
        assert "subrogation" in INSURANCE_AND_INDEMNITY_KNOWLEDGE.lower()
        assert "indemnification" in INSURANCE_AND_INDEMNITY_KNOWLEDGE.lower()

    def test_assignment_and_subletting_present(self):
        assert len(ASSIGNMENT_AND_SUBLETTING_KNOWLEDGE) > 100
        assert "consent_standard" in ASSIGNMENT_AND_SUBLETTING_KNOWLEDGE
        assert "recapture" in ASSIGNMENT_AND_SUBLETTING_KNOWLEDGE
        assert "permitted_transferees" in ASSIGNMENT_AND_SUBLETTING_KNOWLEDGE

    def test_default_and_remedies_present(self):
        assert len(DEFAULT_AND_REMEDIES_KNOWLEDGE) > 100
        assert "monetary_cure" in DEFAULT_AND_REMEDIES_KNOWLEDGE
        assert "holdover" in DEFAULT_AND_REMEDIES_KNOWLEDGE
        assert "acceleration" in DEFAULT_AND_REMEDIES_KNOWLEDGE

    def test_exclusivity_and_cotenancy_present(self):
        assert len(EXCLUSIVITY_AND_COTENANCY_KNOWLEDGE) > 100
        assert "exclusive_use" in EXCLUSIVITY_AND_COTENANCY_KNOWLEDGE
        assert "co-tenancy" in EXCLUSIVITY_AND_COTENANCY_KNOWLEDGE.lower()
        assert "anchor" in EXCLUSIVITY_AND_COTENANCY_KNOWLEDGE

    def test_parking_present(self):
        assert len(PARKING_AND_COMMON_AREAS_KNOWLEDGE) > 100
        assert "parking_ratio" in PARKING_AND_COMMON_AREAS_KNOWLEDGE

    def test_utilities_present(self):
        assert len(UTILITIES_AND_PHYSICAL_KNOWLEDGE) > 100
        assert "utilities_payment_method" in UTILITIES_AND_PHYSICAL_KNOWLEDGE
        assert "clear_height" in UTILITIES_AND_PHYSICAL_KNOWLEDGE

    def test_signage_present(self):
        assert len(SIGNAGE_AND_PERMITTED_USE_KNOWLEDGE) > 100
        assert "permitted_use" in SIGNAGE_AND_PERMITTED_USE_KNOWLEDGE
        assert "fascia" in SIGNAGE_AND_PERMITTED_USE_KNOWLEDGE

    def test_miscellaneous_present(self):
        assert len(MISCELLANEOUS_KNOWLEDGE) > 100
        assert "security_deposit" in MISCELLANEOUS_KNOWLEDGE
        assert "guaranty" in MISCELLANEOUS_KNOWLEDGE
        assert "estoppel" in MISCELLANEOUS_KNOWLEDGE


class TestCrossFieldRules:
    """Cross-field validation rules must cover key consistency checks."""

    def test_rules_non_empty(self):
        assert len(CROSS_FIELD_VALIDATION_RULES) > 200

    def test_pro_rata_consistency(self):
        assert "pro_rata_share" in CROSS_FIELD_VALIDATION_RULES
        assert "building_total_rsf" in CROSS_FIELD_VALIDATION_RULES

    def test_date_ordering(self):
        assert "commencement_date" in CROSS_FIELD_VALIDATION_RULES
        assert "expiration_date" in CROSS_FIELD_VALIDATION_RULES

    def test_percentage_format_rule(self):
        assert "> 1.0" in CROSS_FIELD_VALIDATION_RULES


class TestExtractionPitfalls:
    """Top 10 pitfalls must be present."""

    def test_pitfalls_non_empty(self):
        assert len(COMMON_EXTRACTION_PITFALLS) > 200

    def test_amendment_chain_pitfall(self):
        assert "amendment" in COMMON_EXTRACTION_PITFALLS.lower()

    def test_lease_type_pitfall(self):
        assert "Lease type" in COMMON_EXTRACTION_PITFALLS

    def test_cam_cap_pitfall(self):
        assert "Cumulative vs non-cumulative" in COMMON_EXTRACTION_PITFALLS


class TestGetFunctions:
    """Public getter functions return correct content."""

    def test_get_all_domain_knowledge_includes_all_categories(self):
        full = get_all_domain_knowledge()
        assert "Parties & Property" in full
        assert "Key Dates & Term" in full
        assert "Rent & Escalations" in full
        assert "CAM & Operating Expenses" in full
        assert "Options" in full
        assert "Insurance & Indemnity" in full
        assert "Assignment & Subletting" in full
        assert "Default & Remedies" in full
        assert "Exclusivity & Co-tenancy" in full
        assert "Parking & Common Areas" in full
        assert "Signage & Permitted Use" in full
        assert "Miscellaneous" in full
        # Also includes validation rules and pitfalls
        assert "Cross-Field Validation" in full
        assert "Top 10 Extraction Accuracy Risks" in full

    def test_get_all_domain_knowledge_starts_with_header(self):
        full = get_all_domain_knowledge()
        assert full.startswith("# Expert Commercial Lease Abstraction Knowledge")

    def test_get_category_knowledge_known_category(self):
        result = get_category_knowledge("Rent & Escalations")
        assert "base_rent_annual" in result
        assert "escalation_type" in result

    def test_get_category_knowledge_unknown_category(self):
        result = get_category_knowledge("Nonexistent Category")
        assert result == ""

    def test_get_category_knowledge_all_14_categories(self):
        categories = [
            "Parties & Property",
            "Key Dates & Term",
            "Rent & Escalations",
            "CAM & Operating Expenses",
            "Options",
            "Tenant Improvements & Construction",
            "Insurance & Indemnity",
            "Assignment & Subletting",
            "Default & Remedies",
            "Exclusivity & Co-tenancy",
            "Parking & Common Areas",
            "Utilities",
            "Signage & Permitted Use",
            "Miscellaneous",
        ]
        for cat in categories:
            result = get_category_knowledge(cat)
            assert len(result) > 50, f"Category '{cat}' returned too little content"

    def test_get_validation_knowledge(self):
        result = get_validation_knowledge()
        assert "Cross-Field Validation" in result
        assert "Top 10 Extraction Accuracy Risks" in result
        assert len(result) > 500
