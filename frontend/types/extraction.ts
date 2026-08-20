/** Field value as stored in extracted_data JSONB */
export interface ExtractionFieldValue {
  value: unknown
  confidence?: number
  source_text?: string
}

/** Confidence score entry */
export interface ConfidenceScoreEntry {
  score: number
  tier: 'high' | 'medium' | 'low' | 'not_found'
}

/** Red flag */
export interface RedFlag {
  name: string
  severity: string
  description: string
  rule_id?: string
  triggered_value?: string
}

/** Category definition for organizing fields */
export interface CategoryDefinition {
  name: string
  displayName: string
  fields: string[]
}

/** Full extraction response (matches backend FullResultsResponse) */
export interface FullExtraction {
  id: string
  status: string
  payment_status: string
  document_filename: string
  document_page_count: number | null
  property_type: string | null
  extracted_data: Record<string, ExtractionFieldValue>
  confidence_scores: Record<string, ConfidenceScoreEntry>
  red_flags: RedFlag[]
  show_camaudit: boolean
  overall_confidence: number | null
  created_at: string
  updated_at: string
  error_message?: string
}

/** Confidence thresholds */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.85,
  MEDIUM: 0.6,
} as const

export function getConfidenceTier(score: number): 'high' | 'medium' | 'low' {
  if (score >= CONFIDENCE_THRESHOLDS.HIGH) return 'high'
  if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'medium'
  return 'low'
}

/** Field display labels from canonical extraction schema */
export const FIELD_LABELS: Record<string, string> = {
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
  "reconciliation_frequency": "Reconciliation Frequency",
  "cam_audit_deadline_days": "CAM Audit Deadline (Days)",
  "cap_cumulative_vs_annual": "CAM Cap Type (Cumulative vs Annual)",
  "controllable_vs_noncontrollable_expenses": "Controllable vs Non-Controllable Expenses",
  "base_year_gross_up": "Base Year Gross-Up",
  "cam_estimate_method": "CAM Estimate Method",
  "lease_classification": "Lease Classification",
  "discount_rate": "Discount Rate",
  "has_purchase_option": "Has Purchase Option",
  "purchase_option_price": "Purchase Option Price",
  "variable_lease_payments": "Variable Lease Payments",
  "residual_value_guarantee": "Residual Value Guarantee",
  "lease_incentives_received": "Lease Incentives Received",
  "short_term_lease_election": "Short-Term Lease Election",
  "has_expansion_option": "Has Expansion Option",
  "expansion_option_terms": "Expansion Option Terms",
  "has_contraction_option": "Has Contraction Option",
  "auto_renewal": "Auto-Renewal",
  "auto_renewal_terms": "Auto-Renewal Terms",
  "casualty_termination_right": "Casualty Termination Right",
  "casualty_rent_abatement": "Casualty Rent Abatement",
  "condemnation_termination_right": "Condemnation Termination Right",
  "condemnation_award_allocation": "Condemnation Award Allocation",
  "force_majeure_clause": "Force Majeure Clause",
  "base_rent_per_rsf": "Base Rent per RSF",
  "monthly_base_rent": "Monthly Base Rent",
  "cpi_escalation_floor": "CPI Escalation Floor",
  "cpi_escalation_ceiling": "CPI Escalation Ceiling",
  "expense_stop_amount": "Expense Stop Amount",
  "landlord_notice_address": "Landlord Notice Address",
  "tenant_notice_address": "Tenant Notice Address",
  "hazardous_materials_clause": "Hazardous Materials Clause",
  "relocation_right": "Relocation Right"
}

/** Categories from canonical extraction schema */
export const CATEGORIES: CategoryDefinition[] = [
  {
    "name": "parties_and_property",
    "displayName": "Parties & Property",
    "fields": [
      "landlord_legal_name",
      "tenant_legal_name",
      "guarantor_name",
      "premises_address",
      "suite_or_unit_number",
      "rentable_square_footage",
      "usable_square_footage",
      "building_total_rsf",
      "load_factor",
      "property_use_type"
    ]
  },
  {
    "name": "key_dates_and_term",
    "displayName": "Key Dates & Term",
    "fields": [
      "execution_date",
      "commencement_date",
      "rent_commencement_date",
      "expiration_date",
      "lease_term_months",
      "possession_date",
      "rent_abatement_period"
    ]
  },
  {
    "name": "rent_and_escalations",
    "displayName": "Rent & Escalations",
    "fields": [
      "base_rent_annual",
      "rent_payment_frequency",
      "escalation_type",
      "fixed_escalation_rate",
      "cpi_index_reference",
      "percentage_rent_rate",
      "sales_breakpoint_amount",
      "gross_sales_exclusions",
      "base_rent_per_rsf",
      "monthly_base_rent",
      "cpi_escalation_floor",
      "cpi_escalation_ceiling",
      "expense_stop_amount"
    ]
  },
  {
    "name": "cam_and_operating_expenses",
    "displayName": "CAM & Operating Expenses",
    "fields": [
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
      "cam_estimate_method"
    ]
  },
  {
    "name": "options",
    "displayName": "Options",
    "fields": [
      "has_renewal_option",
      "renewal_terms",
      "renewal_notice_days",
      "has_termination_option",
      "termination_penalty",
      "rofr_space",
      "rofo_space",
      "has_expansion_option",
      "expansion_option_terms",
      "has_contraction_option",
      "auto_renewal",
      "auto_renewal_terms"
    ]
  },
  {
    "name": "tenant_improvements_and_construction",
    "displayName": "Tenant Improvements & Construction",
    "fields": [
      "ti_allowance_amount",
      "ti_allowance_per_rsf",
      "landlord_work_description",
      "tenant_work_description",
      "restoration_requirement",
      "hvac_responsibility"
    ]
  },
  {
    "name": "insurance_and_indemnity",
    "displayName": "Insurance & Indemnity",
    "fields": [
      "cgl_occurrence_limit",
      "cgl_aggregate_limit",
      "property_insurance_bearer",
      "waiver_of_subrogation",
      "additional_insured_req",
      "indemnification_scope"
    ]
  },
  {
    "name": "assignment_and_subletting",
    "displayName": "Assignment & Subletting",
    "fields": [
      "consent_required",
      "consent_standard",
      "profit_sharing_percentage",
      "recapture_right",
      "permitted_transferees",
      "continuing_liability"
    ]
  },
  {
    "name": "default_and_remedies",
    "displayName": "Default & Remedies",
    "fields": [
      "monetary_cure_period",
      "non_monetary_cure_period",
      "acceleration_clause",
      "liquidated_damages",
      "late_fee_percentage",
      "holdover_rate"
    ]
  },
  {
    "name": "exclusivity_and_co_tenancy",
    "displayName": "Exclusivity & Co-tenancy",
    "fields": [
      "exclusive_use_rights",
      "radius_restriction_miles",
      "opening_cotenancy",
      "ongoing_cotenancy",
      "cotenancy_remedy",
      "alternative_rent_rate"
    ]
  },
  {
    "name": "parking_and_common_areas",
    "displayName": "Parking & Common Areas",
    "fields": [
      "parking_ratio",
      "unreserved_parking_spaces",
      "reserved_parking_spaces",
      "monthly_parking_cost",
      "trailer_parking_spaces"
    ]
  },
  {
    "name": "utilities",
    "displayName": "Utilities",
    "fields": [
      "utilities_payment_method",
      "janitorial_responsibility",
      "clear_height_feet",
      "dock_high_doors",
      "drive_in_doors",
      "power_capacity"
    ]
  },
  {
    "name": "signage_and_permitted_use",
    "displayName": "Signage & Permitted Use",
    "fields": [
      "permitted_use_description",
      "prohibited_uses",
      "fascia_signage_rights",
      "monument_signage_rights",
      "signage_maintenance"
    ]
  },
  {
    "name": "miscellaneous",
    "displayName": "Miscellaneous",
    "fields": [
      "security_deposit_amount",
      "security_deposit_type",
      "has_guaranty",
      "governing_law_state",
      "snda_requirement",
      "estoppel_turnaround_days",
      "landlord_notice_address",
      "tenant_notice_address",
      "hazardous_materials_clause",
      "relocation_right"
    ]
  },
  {
    "name": "asc_842_ifrs_16_compliance",
    "displayName": "ASC 842 / IFRS 16 Compliance",
    "fields": [
      "lease_classification",
      "discount_rate",
      "has_purchase_option",
      "purchase_option_price",
      "variable_lease_payments",
      "residual_value_guarantee",
      "lease_incentives_received",
      "short_term_lease_election"
    ]
  },
  {
    "name": "casualty_condemnation_and_force_majeure",
    "displayName": "Casualty, Condemnation & Force Majeure",
    "fields": [
      "casualty_termination_right",
      "casualty_rent_abatement",
      "condemnation_termination_right",
      "condemnation_award_allocation",
      "force_majeure_clause"
    ]
  }
]

/** Request to edit a field */
export interface FieldEditRequest {
  field_name: string
  value: unknown
}

/** Response from field edit */
export interface FieldEditResponse {
  extraction_id: string
  field_name: string
  original_value: unknown
  edited_value: unknown
  red_flags: RedFlag[]
}

/** Edit history item */
export interface EditHistoryItem {
  id: string
  field_name: string
  original_value: unknown
  edited_value: unknown
  edited_by: string
  edited_at: string
}

/**
 * Format a field value for display.
 * - null/undefined returns null (caller renders "Not found" text)
 * - boolean returns "Yes"/"No"
 * - arrays are joined with ", "
 * - everything else is String()
 */
// A blank lease template leaves fill-in tokens like {NAME OF TENANT} or
// "insert address here" where a real term would go. These are not extracted
// data and must read as "not found" on every buyer-facing surface. Mirrors
// is_template_placeholder in backend/app/services/field_text.py — keep in sync.
const TEMPLATE_PLACEHOLDER_RE = /^\{.*\}$/

function isTemplatePlaceholder(text: string): boolean {
  const stripped = text.trim()
  return TEMPLATE_PLACEHOLDER_RE.test(stripped) || stripped.toLowerCase().startsWith('insert ')
}

// Title-case each run of letters, matching Python's str.title() so the
// frontend and the server export render enum values identically.
function titleCase(text: string): string {
  return text.replace(/[A-Za-z]+/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
}

// An extraction enum is a bare lowercase token, optionally underscore-joined
// (gross, stepped, pro_rata_allocation). They read as machine output, so they
// become Gross / Pro Rata Allocation. Anything else — prose with spaces, a
// proper name, a number, a date, a filename like my_lease.pdf — is left
// exactly as extracted. Mirrors humanize_enum_value in
// backend/app/services/field_text.py.
const ENUM_TOKEN_RE = /^[a-z]+(?:_[a-z]+)*$/

function humanizeEnumValue(text: string): string {
  if (!ENUM_TOKEN_RE.test(text)) return text
  return titleCase(text.replace(/_/g, ' '))
}

export function formatFieldValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) {
    const items = value
      .map(String)
      .filter((item) => item.trim() !== '' && !isTemplatePlaceholder(item))
      .map(humanizeEnumValue)
    return items.length > 0 ? items.join(', ') : null
  }
  const text = String(value)
  if (text.trim() === '' || isTemplatePlaceholder(text)) return null
  return humanizeEnumValue(text)
}
