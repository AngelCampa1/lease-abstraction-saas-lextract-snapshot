"""Export template configurations for different property types.

Each template defines the order of category sections and which fields
appear in each section, tailored to the property type's priorities.
All 14 categories are included in every template — only the ordering
and emphasis differ.
"""

from dataclasses import dataclass, field, replace


@dataclass(frozen=True)
class TemplateSection:
    """A section within an export template.

    Attributes:
        category: Internal category key matching the field schema.
        display_name: Human-readable section heading.
        fields: Ordered list of field_name values in this section.
        emphasis: Whether this section should be visually emphasized.
    """

    category: str
    display_name: str
    fields: tuple[str, ...]
    emphasis: bool = False


@dataclass(frozen=True)
class ExportTemplate:
    """Template configuration for a specific property type export.

    Attributes:
        name: Internal template identifier.
        display_name: Human-readable template name.
        sections: Ordered list of template sections.
    """

    name: str
    display_name: str
    sections: tuple[TemplateSection, ...] = field(default_factory=tuple)


# -- Section definitions for each of the 14 categories --

PARTIES_PROPERTY = TemplateSection(
    category="Parties & Property",
    display_name="Parties & Property",
    fields=(
        "landlord_legal_name",
        "tenant_legal_name",
        "guarantor_name",
        "premises_address",
        "suite_or_unit_number",
        "rentable_square_footage",
        "usable_square_footage",
        "building_total_rsf",
        "load_factor",
        "property_use_type",
    ),
    emphasis=True,
)

KEY_DATES = TemplateSection(
    category="Key Dates & Term",
    display_name="Key Dates & Term",
    fields=(
        "execution_date",
        "commencement_date",
        "rent_commencement_date",
        "expiration_date",
        "lease_term_months",
        "possession_date",
        "rent_abatement_period",
    ),
    emphasis=True,
)

RENT_ESCALATIONS = TemplateSection(
    category="Rent & Escalations",
    display_name="Rent & Escalations",
    fields=(
        "base_rent_annual",
        "rent_payment_frequency",
        "escalation_type",
        "fixed_escalation_rate",
        "cpi_index_reference",
        "percentage_rent_rate",
        "sales_breakpoint_amount",
        "gross_sales_exclusions",
    ),
    emphasis=True,
)

CAM_EXPENSES = TemplateSection(
    category="CAM & Operating Expenses",
    display_name="CAM & Operating Expenses",
    fields=(
        "lease_structure_type",
        "pro_rata_share",
        "base_year",
        "cam_cap_percentage",
        "cam_cap_type",
        "gross_up_percentage",
        "management_fee_cap",
        "cam_exclusions",
        "audit_rights",
        "reconciliation_frequency",
        "cam_audit_deadline_days",
        "cap_cumulative_vs_annual",
        "controllable_vs_noncontrollable_expenses",
        "base_year_gross_up",
        "cam_estimate_method",
    ),
)

OPTIONS = TemplateSection(
    category="Options",
    display_name="Options",
    fields=(
        "has_renewal_option",
        "renewal_terms",
        "renewal_notice_days",
        "has_termination_option",
        "termination_penalty",
        "rofr_space",
        "rofo_space",
    ),
)

TENANT_IMPROVEMENTS = TemplateSection(
    category="Tenant Improvements & Construction",
    display_name="Tenant Improvements & Construction",
    fields=(
        "ti_allowance_amount",
        "ti_allowance_per_rsf",
        "landlord_work_description",
        "tenant_work_description",
        "restoration_requirement",
        "hvac_responsibility",
    ),
)

INSURANCE = TemplateSection(
    category="Insurance & Indemnity",
    display_name="Insurance & Indemnity",
    fields=(
        "cgl_occurrence_limit",
        "cgl_aggregate_limit",
        "property_insurance_bearer",
        "waiver_of_subrogation",
        "additional_insured_req",
        "indemnification_scope",
    ),
)

ASSIGNMENT = TemplateSection(
    category="Assignment & Subletting",
    display_name="Assignment & Subletting",
    fields=(
        "consent_required",
        "consent_standard",
        "profit_sharing_percentage",
        "recapture_right",
        "permitted_transferees",
        "continuing_liability",
    ),
)

DEFAULT_REMEDIES = TemplateSection(
    category="Default & Remedies",
    display_name="Default & Remedies",
    fields=(
        "monetary_cure_period",
        "non_monetary_cure_period",
        "acceleration_clause",
        "liquidated_damages",
        "late_fee_percentage",
        "holdover_rate",
    ),
)

EXCLUSIVITY = TemplateSection(
    category="Exclusivity & Co-tenancy",
    display_name="Exclusivity & Co-tenancy",
    fields=(
        "exclusive_use_rights",
        "radius_restriction_miles",
        "opening_cotenancy",
        "ongoing_cotenancy",
        "cotenancy_remedy",
        "alternative_rent_rate",
    ),
)

PARKING = TemplateSection(
    category="Parking & Common Areas",
    display_name="Parking & Common Areas",
    fields=(
        "parking_ratio",
        "unreserved_parking_spaces",
        "reserved_parking_spaces",
        "monthly_parking_cost",
        "trailer_parking_spaces",
    ),
)

UTILITIES = TemplateSection(
    category="Utilities",
    display_name="Utilities",
    fields=(
        "utilities_payment_method",
        "janitorial_responsibility",
        "clear_height_feet",
        "dock_high_doors",
        "drive_in_doors",
        "power_capacity",
    ),
)

SIGNAGE = TemplateSection(
    category="Signage & Permitted Use",
    display_name="Signage & Permitted Use",
    fields=(
        "permitted_use_description",
        "prohibited_uses",
        "fascia_signage_rights",
        "monument_signage_rights",
        "signage_maintenance",
    ),
)

MISCELLANEOUS = TemplateSection(
    category="Miscellaneous",
    display_name="Miscellaneous",
    fields=(
        "security_deposit_amount",
        "security_deposit_type",
        "has_guaranty",
        "governing_law_state",
        "snda_requirement",
        "estoppel_turnaround_days",
    ),
)

# -- All 14 categories (used for validation) --
ALL_CATEGORIES: frozenset[str] = frozenset(
    {
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
    }
)

# -- Template definitions --
# Commercial: general-purpose ordering, suitable for most lease types
COMMERCIAL_TEMPLATE = ExportTemplate(
    name="commercial",
    display_name="Commercial Lease",
    sections=(
        PARTIES_PROPERTY,
        KEY_DATES,
        RENT_ESCALATIONS,
        CAM_EXPENSES,
        OPTIONS,
        TENANT_IMPROVEMENTS,
        INSURANCE,
        ASSIGNMENT,
        DEFAULT_REMEDIES,
        EXCLUSIVITY,
        PARKING,
        UTILITIES,
        SIGNAGE,
        MISCELLANEOUS,
    ),
)

# Office: emphasizes CAM/operating expenses and TI allowances
OFFICE_TEMPLATE = ExportTemplate(
    name="office",
    display_name="Office Lease",
    sections=(
        PARTIES_PROPERTY,
        KEY_DATES,
        RENT_ESCALATIONS,
        replace(CAM_EXPENSES, emphasis=True),
        replace(TENANT_IMPROVEMENTS, emphasis=True),
        OPTIONS,
        PARKING,
        INSURANCE,
        ASSIGNMENT,
        DEFAULT_REMEDIES,
        UTILITIES,
        SIGNAGE,
        EXCLUSIVITY,
        MISCELLANEOUS,
    ),
)

# Industrial: emphasizes utilities (clear height, dock doors) and parking
INDUSTRIAL_TEMPLATE = ExportTemplate(
    name="industrial",
    display_name="Industrial Lease",
    sections=(
        PARTIES_PROPERTY,
        KEY_DATES,
        RENT_ESCALATIONS,
        replace(UTILITIES, emphasis=True),
        replace(PARKING, emphasis=True),
        CAM_EXPENSES,
        TENANT_IMPROVEMENTS,
        OPTIONS,
        INSURANCE,
        ASSIGNMENT,
        DEFAULT_REMEDIES,
        EXCLUSIVITY,
        SIGNAGE,
        MISCELLANEOUS,
    ),
)

# Retail: emphasizes exclusivity/co-tenancy and percentage rent
RETAIL_TEMPLATE = ExportTemplate(
    name="retail",
    display_name="Retail Lease",
    sections=(
        PARTIES_PROPERTY,
        KEY_DATES,
        replace(RENT_ESCALATIONS, emphasis=True),
        replace(EXCLUSIVITY, emphasis=True),
        CAM_EXPENSES,
        replace(SIGNAGE, emphasis=True),
        OPTIONS,
        TENANT_IMPROVEMENTS,
        PARKING,
        INSURANCE,
        ASSIGNMENT,
        DEFAULT_REMEDIES,
        UTILITIES,
        MISCELLANEOUS,
    ),
)

TEMPLATES: dict[str, ExportTemplate] = {
    "commercial": COMMERCIAL_TEMPLATE,
    "office": OFFICE_TEMPLATE,
    "industrial": INDUSTRIAL_TEMPLATE,
    "retail": RETAIL_TEMPLATE,
}

DEFAULT_TEMPLATE = "commercial"


# -- Field display label lookup --
# Maps field_name -> display_label for use in exports
FIELD_LABELS: dict[str, str] = {
    "landlord_legal_name": "Landlord Name",
    "tenant_legal_name": "Tenant Name",
    "guarantor_name": "Guarantor Name",
    "premises_address": "Premises Address",
    "suite_or_unit_number": "Suite/Unit Number",
    "rentable_square_footage": "Rentable Area (RSF)",
    "usable_square_footage": "Usable Area (USF)",
    "building_total_rsf": "Building Total RSF",
    "load_factor": "Load Factor",
    "property_use_type": "Property Type",
    "execution_date": "Execution Date",
    "commencement_date": "Commencement Date",
    "rent_commencement_date": "Rent Commencement",
    "expiration_date": "Expiration Date",
    "lease_term_months": "Lease Term (Months)",
    "possession_date": "Possession Date",
    "rent_abatement_period": "Free Rent Period",
    "base_rent_annual": "Annual Base Rent",
    "rent_payment_frequency": "Payment Frequency",
    "escalation_type": "Escalation Type",
    "fixed_escalation_rate": "Fixed Escalation %",
    "cpi_index_reference": "CPI Index Used",
    "percentage_rent_rate": "Percentage Rent Rate",
    "sales_breakpoint_amount": "Breakpoint Amount",
    "gross_sales_exclusions": "Sales Exclusions",
    "lease_structure_type": "Lease Structure",
    "pro_rata_share": "Pro Rata Share",
    "base_year": "Base Year",
    "cam_cap_percentage": "CAM Cap %",
    "cam_cap_type": "CAM Cap Type",
    "gross_up_percentage": "Gross-Up %",
    "management_fee_cap": "Management Fee Cap",
    "cam_exclusions": "CAM Exclusions",
    "audit_rights": "Audit Rights",
    "reconciliation_frequency": "Reconciliation Frequency",
    "cam_audit_deadline_days": "CAM Audit Deadline (Days)",
    "cap_cumulative_vs_annual": "CAM Cap Type (Cumulative vs Annual)",
    "controllable_vs_noncontrollable_expenses": (
        "Controllable vs Non-Controllable Expenses"
    ),
    "base_year_gross_up": "Base Year Gross-Up",
    "cam_estimate_method": "CAM Estimate Method",
    "has_renewal_option": "Has Renewal Option",
    "renewal_terms": "Renewal Terms",
    "renewal_notice_days": "Renewal Notice (Days)",
    "has_termination_option": "Has Termination Option",
    "termination_penalty": "Termination Penalty",
    "rofr_space": "Right of First Refusal",
    "rofo_space": "Right of First Offer",
    "ti_allowance_amount": "TI Allowance",
    "ti_allowance_per_rsf": "TIA per RSF",
    "landlord_work_description": "Landlord's Work",
    "tenant_work_description": "Tenant's Work",
    "restoration_requirement": "Restoration Obligation",
    "hvac_responsibility": "HVAC Responsibility",
    "cgl_occurrence_limit": "CGL Occurrence Limit",
    "cgl_aggregate_limit": "CGL Aggregate Limit",
    "property_insurance_bearer": "Property Insurer",
    "waiver_of_subrogation": "Waiver of Subrogation",
    "additional_insured_req": "Additional Insured",
    "indemnification_scope": "Indemnification Scope",
    "consent_required": "Consent Required",
    "consent_standard": "Consent Standard",
    "profit_sharing_percentage": "Profit Sharing %",
    "recapture_right": "Recapture Right",
    "permitted_transferees": "Permitted Transferees",
    "continuing_liability": "Continuing Liability",
    "monetary_cure_period": "Monetary Cure Period",
    "non_monetary_cure_period": "Non-Monetary Cure",
    "acceleration_clause": "Acceleration Clause",
    "liquidated_damages": "Liquidated Damages",
    "late_fee_percentage": "Late Fee %",
    "holdover_rate": "Holdover Rate",
    "exclusive_use_rights": "Exclusive Use",
    "radius_restriction_miles": "Radius Restriction",
    "opening_cotenancy": "Opening Co-tenancy",
    "ongoing_cotenancy": "Ongoing Co-tenancy",
    "cotenancy_remedy": "Co-tenancy Remedy",
    "alternative_rent_rate": "Alternative Rent",
    "parking_ratio": "Parking Ratio",
    "unreserved_parking_spaces": "Unreserved Spaces",
    "reserved_parking_spaces": "Reserved Spaces",
    "monthly_parking_cost": "Monthly Parking Cost",
    "trailer_parking_spaces": "Trailer Parking",
    "utilities_payment_method": "Utilities Payment",
    "janitorial_responsibility": "Janitorial Services",
    "clear_height_feet": "Clear Height (ft)",
    "dock_high_doors": "Dock-High Doors",
    "drive_in_doors": "Drive-In Doors",
    "power_capacity": "Power Capacity",
    "permitted_use_description": "Permitted Use",
    "prohibited_uses": "Prohibited Uses",
    "fascia_signage_rights": "Fascia Signage",
    "monument_signage_rights": "Monument Signage",
    "signage_maintenance": "Signage Maintenance",
    "security_deposit_amount": "Security Deposit",
    "security_deposit_type": "Deposit Type",
    "has_guaranty": "Has Guaranty",
    "governing_law_state": "Governing Law",
    "snda_requirement": "SNDA Requirement",
    "estoppel_turnaround_days": "Estoppel Turnaround",
}
