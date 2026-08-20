---
name: lease-abstraction-expert
description: >-
  Deep technical reference for commercial lease abstraction. Use when building extraction logic,
  writing field definitions, debugging extraction accuracy, creating test fixtures, or answering
  domain questions about lease terms, clause interpretation, and field mapping. Trigger keywords:
  extraction, field schema, lease clause, NNN, gross-up, pro rata, CAM, base year, escalation,
  confidence scoring, red flag, dual extraction, validation loop.
user_invocable: false
---

# Lease Abstraction Expert

Deep technical reference for AI-powered commercial lease abstraction. Covers the 126-field schema across 16 categories, confidence scoring methodology, red flag detection rules, lease type classification, and extraction best practices.

## Copy Rules (Mandatory)

- **Run the humanizer skill on all user-facing output.** Any extraction results, field descriptions, red flag explanations, or marketing copy must pass through the `humanizer` skill before delivery.
- **Em dashes are strictly prohibited.** Use commas, colons, parentheses, or restructure the sentence instead.
- **Technical precision is required for extraction logic.** Field names, confidence formulas, and validation rules must be exact. Approximation in extraction code produces wrong data at scale.
- **Dollar amounts and percentages must always cite the source field.** Never present a calculated figure without naming the fields that produced it.

---

## Critical Thinking Mandate

**Extraction accuracy demands skepticism, not optimism. Question every clause.**

Commercial leases are drafted by landlord counsel and contain deliberate ambiguity. The extraction pipeline must treat lease text as an adversarial document where defined terms may diverge from standard CRE usage.

**Required posture:**
- Never assume a term carries its standard meaning without checking the lease's definitions section. "Operating Expenses" in one lease may include capital expenditures; in another it may exclude them entirely.
- Amendments and addenda override the base lease. If the base lease says "5% CAM cap" but a Third Amendment removes it, the extracted value is "no cap." Always extract the final, effective term.
- Defined terms in the preamble or definitions article control interpretation. If the lease defines "Rentable Area" to include the parking garage, that definition governs even though BOMA standards exclude it.
- Handwritten modifications, strikethroughs, and margin notes override printed text. Flag these for low confidence but extract the handwritten value.
- When a clause is genuinely ambiguous, extract both possible interpretations, assign medium or low confidence, and flag it for human review. Do not pick one reading and present it as definitive.
- If a field appears to contradict another extracted field (e.g., pro rata share does not match the RSF/building RSF ratio), flag both fields. Do not silently "fix" one to match the other.

**Red flags for passive extraction:**
- Accepting a stated pro rata share without verifying it against the area figures
- Extracting a CAM cap percentage without determining whether it is cumulative or non-cumulative
- Marking a field "not found" without checking amendments, addenda, exhibits, and riders
- Treating a gross lease as having no CAM fields when modified gross structures exist

---

## Core Principle: Vision AI Reads PDFs End-to-End, Python Validates Cross-Field Consistency

The extraction pipeline has two distinct layers, and each layer has strict boundaries:

1. **Vision AI (Gemini 3 Flash via OpenRouter, 3 passes):** Reads the PDF natively as images — no separate OCR step. Pass 1 performs primary 126-field extraction with self-reported per-field confidence. Pass 2 re-reads the PDF adversarially against Pass 1's output and emits a sparse patch correcting errors. Pass 3 escalates only on disputed critical fields. The model interprets lease language: it understands that "Tenant's Proportionate Share" maps to `pro_rata_share`, and that "the first full calendar year of the Term" maps to `base_year`. It also reads page layout, tables, and signatures the way a human reviewer would.

2. **Python (validation layer):** Runs deterministic checks on the extracted JSON. Computes the combined confidence score from per-field self-report + cross-pass agreement. Executes cross-field validation rules. Fires red flag rules. Python never interprets lease language. It never decides what a clause means.

**The critical boundary:** the model NEVER calculates financial figures. If a lease states base rent of "$24.50 per RSF" and the premises are 5,000 RSF, the model extracts the per-RSF rate and the area. Python multiplies them to get $122,500 annual rent. The model performing arithmetic on financial figures produces hallucinated numbers that destroy extraction credibility.

**The validation loop:** After Pass 1+2 extraction, Python checks for internal consistency. If `pro_rata_share` is 7.5% but `rentable_square_footage` / `building_total_rsf` = 8.2%, Python flags the discrepancy. It does not override the extraction. It lowers confidence on both fields and creates a validation warning, which can trigger Pass 3 escalation if the field is critical.

---

## 99-Field Schema Overview

16 categories, 126 fields total. 44 required, 18 CAM-relevant (feed CamAudit funnel logic).

| # | Category | Fields | Required | CAM-Relevant |
|---|----------|--------|----------|--------------|
| 1 | Parties & Property | 10 | 6 | 2 |
| 2 | Key Dates & Term | 7 | 5 | 0 |
| 3 | Rent & Escalations | 8 | 3 | 0 |
| 4 | CAM & Operating Expenses | 15 | 4 | 15 |
| 5 | Options | 7 | 2 | 0 |
| 6 | Tenant Improvements & Construction | 6 | 2 | 1 |
| 7 | Insurance & Indemnity | 6 | 6 | 0 |
| 8 | Assignment & Subletting | 6 | 4 | 0 |
| 9 | Default & Remedies | 6 | 5 | 0 |
| 10 | Exclusivity & Co-tenancy | 6 | 0 | 0 |
| 11 | Parking & Common Areas | 5 | 0 | 0 |
| 12 | Utilities | 6 | 2 | 0 |
| 13 | Signage & Permitted Use | 5 | 1 | 0 |
| 14 | Miscellaneous | 6 | 4 | 0 |
| | **Total** | **99** | **44** | **18** |

### Complete Field Listing by Category

**1. Parties & Property (10 fields)**
- `landlord_legal_name` (string, required) - Landlord Name
- `tenant_legal_name` (string, required) - Tenant Name
- `guarantor_name` (array) - Guarantor Name
- `premises_address` (string, required) - Premises Address
- `suite_or_unit_number` (string) - Suite/Unit Number
- `rentable_square_footage` (number, required, CAM) - Rentable Area (RSF)
- `usable_square_footage` (number) - Usable Area (USF)
- `building_total_rsf` (number, required, CAM) - Building Total RSF
- `load_factor` (percentage) - Load Factor
- `property_use_type` (string, required) - Property Type

**2. Key Dates & Term (7 fields)**
- `execution_date` (date, required) - Execution Date
- `commencement_date` (date, required) - Commencement Date
- `rent_commencement_date` (date, required) - Rent Commencement
- `expiration_date` (date, required) - Expiration Date
- `lease_term_months` (number, required) - Lease Term (Months)
- `possession_date` (date) - Possession Date
- `rent_abatement_period` (string) - Free Rent Period

**3. Rent & Escalations (8 fields)**
- `base_rent_annual` (currency, required) - Annual Base Rent
- `rent_payment_frequency` (string, required) - Payment Frequency
- `escalation_type` (string, required) - Escalation Type
- `fixed_escalation_rate` (percentage) - Fixed Escalation %
- `cpi_index_reference` (string) - CPI Index Used
- `percentage_rent_rate` (percentage) - Percentage Rent Rate
- `sales_breakpoint_amount` (currency) - Breakpoint Amount
- `gross_sales_exclusions` (array) - Sales Exclusions

**4. CAM & Operating Expenses (15 fields, all CAM-relevant)**
- `lease_structure_type` (string, required, CAM) - Lease Structure
- `pro_rata_share` (percentage, required, CAM) - Pro Rata Share
- `base_year` (string, CAM) - Base Year
- `cam_cap_percentage` (percentage, CAM) - CAM Cap %
- `cam_cap_type` (string, CAM) - CAM Cap Type
- `gross_up_percentage` (percentage, CAM) - Gross-Up %
- `management_fee_cap` (percentage, CAM) - Management Fee Cap
- `cam_exclusions` (array, required, CAM) - CAM Exclusions
- `audit_rights` (boolean, required, CAM) - Audit Rights
- `reconciliation_frequency` (string, CAM) - Reconciliation Frequency
- `cam_audit_deadline_days` (number, CAM) - CAM Audit Deadline (Days)
- `cap_cumulative_vs_annual` (string, CAM) - CAM Cap Type (Cumulative vs Annual)
- `controllable_vs_noncontrollable_expenses` (string, CAM) - Controllable vs Non-Controllable Expenses
- `base_year_gross_up` (boolean, CAM) - Base Year Gross-Up
- `cam_estimate_method` (string, CAM) - CAM Estimate Method

**5. Options (7 fields)**
- `has_renewal_option` (boolean, required) - Has Renewal Option
- `renewal_terms` (array) - Renewal Terms
- `renewal_notice_days` (number) - Renewal Notice (Days)
- `has_termination_option` (boolean, required) - Has Termination Option
- `termination_penalty` (currency) - Termination Penalty
- `rofr_space` (string) - Right of First Refusal
- `rofo_space` (string) - Right of First Offer

**6. Tenant Improvements & Construction (6 fields)**
- `ti_allowance_amount` (currency) - TI Allowance
- `ti_allowance_per_rsf` (currency) - TIA per RSF
- `landlord_work_description` (string) - Landlord's Work
- `tenant_work_description` (string) - Tenant's Work
- `restoration_requirement` (boolean, required) - Restoration Obligation
- `hvac_responsibility` (string, required, CAM) - HVAC Responsibility

**7. Insurance & Indemnity (6 fields, all required)**
- `cgl_occurrence_limit` (currency, required) - CGL Occurrence Limit
- `cgl_aggregate_limit` (currency, required) - CGL Aggregate Limit
- `property_insurance_bearer` (string, required) - Property Insurer
- `waiver_of_subrogation` (boolean, required) - Waiver of Subrogation
- `additional_insured_req` (boolean, required) - Additional Insured
- `indemnification_scope` (string, required) - Indemnification Scope

**8. Assignment & Subletting (6 fields)**
- `consent_required` (boolean, required) - Consent Required
- `consent_standard` (string, required) - Consent Standard
- `profit_sharing_percentage` (percentage) - Profit Sharing %
- `recapture_right` (boolean, required) - Recapture Right
- `permitted_transferees` (array) - Permitted Transferees
- `continuing_liability` (boolean, required) - Continuing Liability

**9. Default & Remedies (6 fields)**
- `monetary_cure_period` (number, required) - Monetary Cure Period
- `non_monetary_cure_period` (number, required) - Non-Monetary Cure
- `acceleration_clause` (boolean, required) - Acceleration Clause
- `liquidated_damages` (currency) - Liquidated Damages
- `late_fee_percentage` (percentage, required) - Late Fee %
- `holdover_rate` (percentage, required) - Holdover Rate

**10. Exclusivity & Co-tenancy (6 fields, none required)**
- `exclusive_use_rights` (string) - Exclusive Use
- `radius_restriction_miles` (number) - Radius Restriction
- `opening_cotenancy` (string) - Opening Co-tenancy
- `ongoing_cotenancy` (string) - Ongoing Co-tenancy
- `cotenancy_remedy` (string) - Co-tenancy Remedy
- `alternative_rent_rate` (string) - Alternative Rent

**11. Parking & Common Areas (5 fields, none required)**
- `parking_ratio` (number) - Parking Ratio
- `unreserved_parking_spaces` (number) - Unreserved Spaces
- `reserved_parking_spaces` (number) - Reserved Spaces
- `monthly_parking_cost` (currency) - Monthly Parking Cost
- `trailer_parking_spaces` (number) - Trailer Parking

**12. Utilities (6 fields)**
- `utilities_payment_method` (string, required) - Utilities Payment
- `janitorial_responsibility` (string, required) - Janitorial Services
- `clear_height_feet` (number) - Clear Height (ft)
- `dock_high_doors` (number) - Dock-High Doors
- `drive_in_doors` (number) - Drive-In Doors
- `power_capacity` (string) - Power Capacity

**13. Signage & Permitted Use (5 fields)**
- `permitted_use_description` (string, required) - Permitted Use
- `prohibited_uses` (array) - Prohibited Uses
- `fascia_signage_rights` (boolean) - Fascia Signage
- `monument_signage_rights` (boolean) - Monument Signage
- `signage_maintenance` (string) - Signage Maintenance

**14. Miscellaneous (6 fields)**
- `security_deposit_amount` (currency, required) - Security Deposit
- `security_deposit_type` (string, required) - Deposit Type
- `has_guaranty` (boolean, required) - Has Guaranty
- `governing_law_state` (string, required) - Governing Law
- `snda_requirement` (boolean) - SNDA Requirement
- `estoppel_turnaround_days` (number) - Estoppel Turnaround

---

## Field Categories Deep Dive

### 1. Parties & Property

**What it covers:** Identification of contracting parties, physical location, and spatial measurements of the leased premises within the larger building or development.

**Common extraction challenges:**
- Landlord entity names may differ between the signature block, the preamble, and the notice provisions. The preamble entity is authoritative.
- Guarantor names often appear only in a separate Guaranty Agreement attached as an exhibit, not in the main lease body.
- RSF vs. USF confusion: some leases state only one figure. If only USF is provided, the load factor must be applied to derive RSF. If neither "rentable" nor "usable" is specified, assume the stated figure is rentable unless context indicates otherwise.
- Building total RSF may be stated in the lease or may need to be inferred from the pro rata share formula (tenant RSF / stated pro rata share).
- Property type may not be explicitly stated. Classify from context: presence of "clear height" or "dock doors" indicates industrial; "percentage rent" or "exclusivity" indicates retail; "base year stop" strongly suggests office.

**Cross-field validation:**
- `load_factor` should approximately equal `rentable_square_footage` / `usable_square_footage` (within 2% tolerance)
- `pro_rata_share` should approximately equal `rentable_square_footage` / `building_total_rsf` (within 0.5% tolerance)
- If `building_total_rsf` < `rentable_square_footage`, flag as data error

**Lease type variations:**
- NNN leases almost always specify both tenant RSF and building total RSF because the pro rata share calculation requires both.
- Gross leases may omit building total RSF since the tenant pays a fixed amount regardless.
- Retail leases at shopping centers may express area as GLA (Gross Leasable Area) rather than RSF.

### 2. Key Dates & Term

**What it covers:** The temporal framework of the lease, from execution through expiration, including the critical distinction between lease commencement (legal obligations begin) and rent commencement (payment obligations begin).

**Common extraction challenges:**
- Commencement date is often contingent: "the earlier of (a) substantial completion of Landlord's Work, or (b) Tenant's opening for business, or (c) 180 days after the Effective Date." Extract the formula, not a specific date, unless the lease later confirms the actual date in a Commencement Date Agreement or amendment.
- Rent commencement may differ from lease commencement by weeks or months (free rent period). If the lease says "Rent shall commence on the date that is ninety (90) days after the Commencement Date," extract the formula and compute the date only if the commencement date is known.
- Execution date vs. effective date: the execution date is when signatures were applied. The effective date (if different) is when the lease becomes binding. Extract both if present; the execution date field captures the signature date.
- Lease term stated as "five (5) years" requires conversion to months (60). Watch for terms like "five (5) Lease Years," where a "Lease Year" may be defined as something other than a calendar year.
- Possession date is often the same as commencement date but can be earlier (early access for build-out). Only extract as a separate value if explicitly distinguished.

**Cross-field validation:**
- `lease_term_months` should equal the number of months between `commencement_date` and `expiration_date` (within 1-month tolerance for partial months)
- `rent_commencement_date` must be on or after `commencement_date`
- `execution_date` should be on or before `commencement_date`
- `possession_date` should be on or before `commencement_date`
- Date sequence: execution <= possession <= commencement <= rent commencement <= expiration

**Lease type variations:**
- Ground leases often have terms of 50-99 years, producing lease_term_months values in the thousands.
- Retail leases frequently tie commencement to co-tenancy conditions being met, making the date uncertain at signing.

### 3. Rent & Escalations

**What it covers:** The financial terms governing base rent, how it increases over time, and any additional rent tied to the tenant's business performance (percentage rent).

**Common extraction challenges:**
- Rent may be stated as annual, monthly, or per-RSF-per-year. Normalize to annual for `base_rent_annual`. If stated as "$2.04 per month per RSF" on 5,000 RSF, annual = $2.04 * 12 * 5,000 = $122,400. But remember: Claude extracts the stated figures, Python computes the annual total.
- Escalation type classification: "Fixed" = a stated percentage or dollar increase. "CPI" = tied to an inflation index. "Fair Market" = reset to market rate (typically at renewal). "Stepped" = a rent schedule with specific amounts for each year. Extract the type and the specific parameters.
- CPI escalations may have floors and ceilings: "the greater of 2% or CPI, not to exceed 5%." Extract the floor, the ceiling, and the index reference.
- Percentage rent in retail leases: the breakpoint may be "natural" (base rent / percentage rate) or "artificial" (a stated dollar amount). Extract the stated breakpoint. If only base rent and percentage are given, note the breakpoint as "natural" but do not compute the dollar figure.
- Rent schedules spanning multiple pages are common. The first-year rent goes into `base_rent_annual`. The full schedule should be captured but may exceed a single field.

**Cross-field validation:**
- If `escalation_type` is "fixed," `fixed_escalation_rate` should be present
- If `escalation_type` is "CPI," `cpi_index_reference` should be present
- If `percentage_rent_rate` is present, `sales_breakpoint_amount` should also be present (or noted as natural breakpoint)
- `base_rent_annual` should be greater than zero

**Lease type variations:**
- NNN leases: base rent is the primary rent; all operating expenses are additional rent billed separately.
- Gross leases: base rent is all-inclusive; escalations above a base year stop are the only additional charge.
- Percentage leases (retail): base rent plus percentage rent above the breakpoint. Some percentage-only leases have $0 base rent.

### 4. CAM & Operating Expenses

**What it covers:** The structure for sharing building operating costs between landlord and tenant. This is the most complex category, with 15 fields, all CAM-relevant. This is also the primary driver of the CamAudit funnel.

**Common extraction challenges:**
- Lease structure classification requires reading the entire operating expense section, not just the header. A lease labeled "Triple Net" in its title may actually be modified gross if the landlord pays certain expenses directly.
- Pro rata share may be stated as a fixed percentage, or as a formula, or both. If both are present and they conflict, flag for human review.
- CAM cap language is notoriously ambiguous. "CAM increases shall not exceed 5% per year" does not specify: (a) 5% over the prior year's actual or the prior year's cap? (b) cumulative or non-cumulative? (c) does the cap apply to controllable expenses only or all expenses? Extract the literal text and classify as best as possible, but assign medium confidence if the language is ambiguous.
- Gross-up provisions may apply to all operating expenses, variable expenses only, or specific categories. The standard is variable expenses only (janitorial, utilities, trash). Gross-up of fixed costs (taxes, insurance) is a red flag.
- Management fee caps may be expressed as a percentage of operating expenses, a percentage of gross revenue, or a flat dollar amount. Extract the stated cap and its basis.
- CAM exclusions are critical. Extract as a complete array. Common exclusions include capital expenditures, depreciation, mortgage payments, leasing commissions, landlord litigation costs, and tenant-specific expenses.
- Audit rights are binary (present or absent) but the details matter enormously: scope of audit, deadline to request, cost-recovery threshold, who can perform the audit (CPA vs. any representative), and whether the audit right extends to the base year.

**Cross-field validation:**
- If `lease_structure_type` is "NNN" and `pro_rata_share` is null, flag as inconsistent
- If `cam_cap_percentage` is present, `cam_cap_type` (cumulative vs. non-cumulative) should also be present
- If `base_year` is present, the lease is likely gross or modified gross, not NNN
- If `gross_up_percentage` is present, check for `base_year_gross_up` consistency
- `pro_rata_share` should approximately match `rentable_square_footage` / `building_total_rsf`

**Lease type variations:**
- NNN: all 15 fields are typically populated. Tenant pays pro rata share of all operating expenses.
- Gross: `base_year` is the key field. Tenant pays escalations above the base year stop only. Many fields (cam_cap, gross_up) may not apply.
- Modified Gross: hybrid, with some expenses included in base rent and others passed through. The hardest to classify correctly.

### 5. Options

**What it covers:** Tenant's contractual rights to extend, terminate, or expand the lease.

**Common extraction challenges:**
- Renewal options may specify the rent rate for renewal periods ("at 95% of then-prevailing Fair Market Value") or leave it open ("at rent to be mutually agreed"). Extract the stated terms.
- Multiple renewal options are common: "two (2) successive options to extend for five (5) years each." Extract as an array of terms.
- Termination options often have complex trigger conditions: "Tenant may terminate effective at the end of Month 36, provided Tenant pays a termination fee equal to unamortized TI costs plus 6 months' rent." Extract the trigger and the penalty.
- ROFR vs. ROFO: Right of First Refusal means the tenant can match a third-party offer. Right of First Offer means the landlord must offer the space to the tenant before marketing it. These are legally distinct and must be classified correctly.
- Notice periods for options are critical dates. Missing a renewal notice deadline can cost the tenant the option entirely.

**Cross-field validation:**
- If `has_renewal_option` is true, at least one of `renewal_terms` or `renewal_notice_days` should be present
- If `has_termination_option` is true, `termination_penalty` is often (but not always) present

**Lease type variations:**
- Retail leases almost always include renewal options and often include co-tenancy-triggered termination rights.
- Industrial leases may include expansion options tied to adjacent bays.
- Ground leases typically have long initial terms (50+ years) and may lack renewal options entirely.

### 6. Tenant Improvements & Construction

**What it covers:** The allocation of build-out responsibilities and costs, the TI allowance, and the tenant's obligation to restore the space at lease expiration.

**Common extraction challenges:**
- TI allowance may be stated as a total dollar amount, a per-RSF amount, or both. Extract both if present. If only per-RSF is given, Python can compute the total using `ti_allowance_per_rsf` * `rentable_square_footage`.
- Landlord's work vs. tenant's work: the division is often detailed in a Work Letter attached as an exhibit. Check exhibits for these descriptions.
- Restoration requirements are frequently ambiguous: "Tenant shall restore the Premises to their original condition, reasonable wear and tear excepted." What constitutes "original condition" when the landlord provided a TI allowance for customization? Flag ambiguous restoration language.
- HVAC responsibility is a sleeper issue. In many NNN leases, the tenant is responsible for HVAC maintenance but the landlord is responsible for replacement. In others, the tenant bears full HVAC responsibility including replacement. The distinction has significant financial implications.

**Cross-field validation:**
- If `ti_allowance_amount` and `ti_allowance_per_rsf` are both present, verify that `ti_allowance_amount` approximately equals `ti_allowance_per_rsf` * `rentable_square_footage`

**Lease type variations:**
- Office leases typically have the largest TI allowances ($30-$80/RSF for new construction).
- Industrial leases often have minimal TI ("warm shell" or "cold shell" delivery).
- Retail leases may have landlord-delivered "vanilla box" with tenant responsible for all interior finishes.

### 7. Insurance & Indemnity

**What it covers:** Required insurance coverages, limits, and the allocation of liability risk between parties.

**Common extraction challenges:**
- Insurance limits are stated in various formats: "$1,000,000 per occurrence / $2,000,000 aggregate" or "one million dollars ($1,000,000) per occurrence and two million dollars ($2,000,000) in the aggregate." Normalize to numeric currency values.
- Waiver of subrogation is bilateral (both parties waive) in well-drafted leases but may be unilateral (tenant waives only) in landlord-favorable leases. Extract whether it is mutual or one-sided.
- "Additional insured" vs. "named insured" are legally different. Most leases require the tenant to name the landlord as an additional insured on their CGL policy.
- Indemnification scope ranges from narrow (tenant indemnifies for its own negligence only) to broad (tenant indemnifies for landlord's negligence too). Broad indemnification may be unenforceable in some states.

**Cross-field validation:**
- `cgl_aggregate_limit` should be greater than or equal to `cgl_occurrence_limit`
- All six fields are required; if any are missing, flag the extraction

**Lease type variations:**
- NNN leases place more insurance burden on tenants, including potentially building property insurance.
- Gross leases typically require tenant CGL only, with landlord carrying building property insurance.

### 8. Assignment & Subletting

**What it covers:** The tenant's ability to transfer their leasehold interest to a third party, and the restrictions on that ability.

**Common extraction challenges:**
- "Sole discretion" vs. "shall not be unreasonably withheld" are the two main consent standards. Some leases add "conditioned, or delayed" after "withheld." Extract the full standard.
- Permitted transferees (affiliates, subsidiaries, entities under common control) are often exempt from consent requirements. These are typically defined in a separate paragraph.
- Profit-sharing splits on sublet premiums vary widely (50/50 is common) and may require deduction of the tenant's transaction costs first.
- Recapture rights allow the landlord to take back the space instead of consenting to a sublease. This is a binary extraction but the conditions may be complex.

**Cross-field validation:**
- If `consent_required` is false, `consent_standard` should indicate "no consent needed" or similar
- If `recapture_right` is true, assignment consent is almost always also required

**Lease type variations:**
- Retail leases with exclusivity provisions often have stricter assignment restrictions to prevent competitors from taking over the space.
- Office leases in multi-tenant buildings typically allow assignment with consent not to be unreasonably withheld.

### 9. Default & Remedies

**What it covers:** What constitutes a breach, how much time the tenant has to fix it, and what penalties apply.

**Common extraction challenges:**
- Monetary cure periods vary by state law. Some states mandate minimum cure periods regardless of what the lease says. Extract the lease-stated period, but note that the governing law may override it.
- Holdover rates are expressed as a percentage of the last month's rent: "150% of the then-current Base Rent." Extract the percentage (150 in this case).
- Acceleration clauses may accelerate the full remaining rent, or rent discounted to present value, or rent through the date a replacement tenant is found. Extract the specific acceleration formula.
- Late fees may be a flat percentage (typically 5%) or an interest rate (typically prime + 2-5%). Distinguish between flat fees and interest-based charges.

**Cross-field validation:**
- `monetary_cure_period` should be >= 5 days (most state minimums)
- `holdover_rate` should be >= 100% (holding over at less than current rent would be unusual)
- `late_fee_percentage` should be < 25% (higher amounts may be unenforceable as penalties)

**Lease type variations:**
- NNN leases may have separate cure periods for rent defaults vs. CAM payment defaults.
- All lease types have similar default structures, though retail leases often include continuous operation requirements with specific remedies.

### 10. Exclusivity & Co-tenancy

**What it covers:** Tenant protections related to competition within the property and minimum occupancy conditions. Primarily relevant to retail leases.

**Common extraction challenges:**
- Exclusive use clauses are highly specific: "the exclusive right to sell Italian cuisine within the Shopping Center." Breadth of the exclusion, geographic scope, and exceptions (food court, temporary holiday kiosks) all matter.
- Radius restrictions prevent the tenant from opening a competing location within X miles. This protects the landlord's percentage rent by preventing the tenant from diverting sales to a nearby location.
- Co-tenancy clauses typically name specific anchor tenants or require minimum occupancy percentages. "Opening co-tenancy" triggers before the tenant must open; "ongoing co-tenancy" triggers during the term.
- Co-tenancy remedies range from rent reduction to termination rights. "Alternative rent" during a co-tenancy failure period is typically a reduced fixed rent or percentage-only rent.

**Cross-field validation:**
- Exclusivity and co-tenancy fields are primarily relevant when `property_use_type` is "retail." Presence of these fields in a non-retail lease should be noted but is not necessarily an error.

**Lease type variations:**
- Retail: all six fields may be populated. Anchor tenant co-tenancy is particularly important for in-line retail tenants.
- Office/Industrial: exclusivity and co-tenancy are rare. Occasionally an office tenant will have a non-compete clause against a direct competitor in the same building.

### 11. Parking & Common Areas

**What it covers:** Parking allocations, costs, and specialized industrial vehicle parking.

**Common extraction challenges:**
- Parking ratio is typically expressed as "X spaces per 1,000 RSF." A 10,000 RSF tenant with a 4:1,000 ratio gets 40 spaces. Extract the ratio, not the total count (unless only the total is stated).
- Reserved vs. unreserved parking may have different monthly costs. Extract both counts and the cost per space if applicable.
- Trailer parking is industrial-specific. Not all industrial leases address it explicitly.

**Cross-field validation:**
- Total parking spaces (reserved + unreserved) should be approximately consistent with `parking_ratio` * `rentable_square_footage` / 1000

**Lease type variations:**
- Office: parking ratio is critical (typically 3-5 per 1,000 RSF). Monthly costs are common in urban areas.
- Retail: parking is typically shared and not allocated to individual tenants by count. The ratio applies to the center as a whole.
- Industrial: lower ratios (0.5-2 per 1,000 RSF for warehouse) but trailer parking becomes relevant.

### 12. Utilities

**What it covers:** How utilities are metered, billed, and allocated, plus physical characteristics of industrial spaces.

**Common extraction challenges:**
- Utilities payment method: "direct meter" (tenant pays utility directly), "sub-meter" (landlord meters and bills), "pro rata allocation" (shared by percentage), or "included in base rent." Extract the specific method.
- Janitorial responsibility overlaps with CAM. In NNN leases, the tenant typically handles their own space and pays pro rata for common area janitorial. In gross leases, the landlord provides janitorial as part of the base rent.
- Clear height, dock doors, and drive-in doors are industrial-specific physical characteristics. They are unlikely to appear in office or retail leases.
- Power capacity may be stated as amps, volts, watts, or a general description ("200-amp, 3-phase service"). Extract the stated specification.

**Cross-field validation:**
- If `property_use_type` is "industrial," `clear_height_feet`, `dock_high_doors`, and `drive_in_doors` should ideally be present
- If `utilities_payment_method` is "included in base rent," the lease is likely gross or modified gross

**Lease type variations:**
- Industrial: all six fields are commonly populated. Clear height is a critical differentiator for warehouse tenants.
- Office: typically only `utilities_payment_method` and `janitorial_responsibility` are relevant.
- Retail: utility allocation in shopping centers can be complex, with some utilities (HVAC) metered separately and others (water, trash) shared.

### 13. Signage & Permitted Use

**What it covers:** What the tenant can do in the space and how they can brand the exterior.

**Common extraction challenges:**
- Permitted use clauses range from broad ("general office use") to extremely narrow ("the operation of a Subway franchise restaurant and no other purpose"). Broad use clauses give the tenant flexibility; narrow ones restrict it.
- Prohibited uses often include hazardous materials, adult entertainment, and uses that would violate zoning. Extract as a complete list.
- Signage rights (fascia and monument) are often governed by a separate Sign Criteria exhibit. Check exhibits for details.
- Signage maintenance responsibility may not be explicitly stated. Default assumption varies by lease type.

**Cross-field validation:**
- If `property_use_type` is "retail," signage fields are particularly important
- If `permitted_use_description` conflicts with `property_use_type`, flag for review

**Lease type variations:**
- Retail: signage rights are heavily negotiated. Monument signage is a premium concession for anchor tenants.
- Office: fascia signage may be available for top-floor or building-naming-rights tenants. Most office tenants get lobby directory and floor signage only.
- Industrial: signage is typically less restricted but may be governed by park-level CC&Rs.

### 14. Miscellaneous

**What it covers:** Security deposits, guaranties, governing law, and procedural requirements.

**Common extraction challenges:**
- Security deposit may be cash, a letter of credit (LOC), or a combination. LOCs have their own terms (issuing bank, expiration, draw conditions) that are typically in a separate exhibit.
- Guaranty terms may be full (unlimited duration and amount), limited (capped amount or "good guy" guaranty that expires on surrender of the space), or conditional. The guarantor is typically a parent company or individual principal.
- SNDA (Subordination, Non-Disturbance, and Attornment) agreements protect the tenant if the landlord's lender forecloses. The requirement may be on the tenant (to sign one) or on the landlord (to deliver one from their lender).
- Estoppel turnaround days: landlords need tenant estoppel certificates for refinancing and sales. Common periods are 10-30 days.

**Cross-field validation:**
- If `has_guaranty` is true, `guarantor_name` should be populated
- `governing_law_state` should be a valid U.S. state abbreviation or name

**Lease type variations:**
- All lease types require these fields. Security deposit structures tend to be more complex in retail (percentage rent makes the deposit calculation harder) and startup tenants (personal guarantees are more common).

---

## Lease Types

### Triple Net (NNN)

**Definition:** Tenant pays base rent plus their pro rata share of all three "nets": property taxes, building insurance, and operating expenses (including CAM). The most common structure for industrial and retail leases.

**Fields typically present:** All 15 CAM fields are populated. `pro_rata_share`, `cam_exclusions`, and `audit_rights` are critical. `base_year` is typically absent (NNN does not use a base year stop).

**Fields typically absent or N/A:** `base_year`, `base_year_gross_up` (these are gross lease concepts).

**Extraction differences:** The lease will explicitly define "Additional Rent" or "Triple Net Charges" and specify how they are estimated, billed, and reconciled. Look for the reconciliation section, which describes the annual true-up process.

**Common gotchas:**
- "NNN" in the title but the landlord actually pays insurance directly (making it a Double Net or Modified Gross lease). Classify based on actual expense allocation, not the title.
- Tenant responsible for roof and structure repairs in addition to CAM (sometimes called "absolute NNN" or "bondable NNN"). This is distinct from standard NNN where the landlord handles structural items.
- Anchor tenants at shopping centers may have a "capped NNN" structure where their CAM share is subject to a cap, but in-line tenants have no cap. Extract the cap terms for each tenant individually.

### Gross (Full Service)

**Definition:** Tenant pays a single base rent amount that includes all operating expenses for a base year. Landlord bills increases above the base year as "escalations" or "additional rent." The dominant structure for office leases.

**Fields typically present:** `base_year`, `base_rent_annual`, `escalation_type`. CAM fields are relevant only to the extent they define what is included in operating expenses and how escalations above the base year are calculated.

**Fields typically absent or N/A:** `cam_cap_percentage` (escalation caps exist but are structured differently), `cam_estimate_method` (no monthly CAM estimates in a gross lease).

**Extraction differences:** The key extraction challenge is identifying the base year and the expense stop. "Base Year" may be a specific calendar year (2024) or a "stipulated base year" (a fixed dollar amount). Look for language like "Tenant's Share of Operating Expense Increases" or "Excess Operating Expenses."

**Common gotchas:**
- Base year gross-up is critical. If the building was 60% occupied in the base year and no gross-up was applied, the tenant will overpay for the entire lease term because the base year expenses are artificially low.
- "Expense stop" vs. "base year" distinction: an expense stop is a predetermined fixed dollar amount (e.g., "$12.00 per RSF"). A base year references actual expenses for a specific year (unknown until that year closes). They function similarly but are calculated differently.
- Electricity may be excluded from the gross lease and billed separately via submeter. This makes it a "modified gross" lease even though it is labeled "gross."

### Modified Gross

**Definition:** A hybrid structure where some expenses are included in base rent and others are passed through to the tenant. There is no industry-standard definition of which expenses go where.

**Fields typically present:** A mix of gross and NNN fields. `base_year` may be present for some expense categories but not others. `lease_structure_type` should be classified as "Modified Gross" with a note explaining which expenses are included vs. excluded.

**Extraction differences:** This is the hardest lease type to classify and abstract correctly. The extraction must identify exactly which expenses are included in base rent and which are additional. Common variations:
- "Gross plus electric" (all expenses included except electricity)
- "Gross plus janitorial" (all expenses included except cleaning)
- "Base year stop on operating expenses, NNN on taxes and insurance"

**Common gotchas:**
- The lease may not use the term "Modified Gross" anywhere. Classification requires reading the expense provisions in full.
- The split between included and excluded expenses may change over the lease term (e.g., "For the first 3 Lease Years, Landlord shall pay all operating expenses. Thereafter, Tenant shall pay increases over the Base Year").

### Percentage Lease

**Definition:** A retail lease structure where the tenant pays base rent plus a percentage of gross sales above a breakpoint threshold. Almost always combined with NNN or Modified Gross for operating expenses.

**Fields typically present:** `percentage_rent_rate`, `sales_breakpoint_amount`, `gross_sales_exclusions`. All standard NNN or Modified Gross fields also apply.

**Extraction differences:** The percentage rent section is often a separate article or exhibit. Key extraction targets: the percentage rate, the breakpoint (natural or artificial), the definition of "gross sales" (inclusions and exclusions), and the reporting obligations (monthly or annual sales reports).

**Common gotchas:**
- Natural breakpoint = base rent / percentage rate. If base rent is $60,000/year and the percentage rate is 6%, the natural breakpoint is $1,000,000 in annual gross sales. An "artificial" breakpoint is set independently (e.g., $800,000), making the percentage rent kick in sooner.
- Gross sales exclusions vary widely. Internet sales, gift card activations, returns, employee discounts, and sales taxes are commonly excluded. The definition of "gross sales" can have significant financial impact.
- Some percentage leases have no base rent at all (percentage-only), which is common for kiosk or temporary retail tenants.

### Ground Lease

**Definition:** A lease of the land only, where the tenant constructs and owns the building improvements. Terms typically run 50-99 years. The tenant's building reverts to the landlord at lease expiration.

**Fields typically present:** `lease_term_months` (very high numbers), `base_rent_annual`, `escalation_type`. Many building-specific fields (TI allowance, clear height, HVAC responsibility) are N/A because the tenant builds and maintains their own improvements.

**Extraction differences:** Ground leases are structured fundamentally differently from space leases. The "premises" is the land, not a space within a building. CAM concepts may apply to shared infrastructure (roads, utilities, landscaping) in a ground-leased development but are structured differently than in a multi-tenant building.

**Common gotchas:**
- Ground lease rent escalations are often CPI-based or based on periodic fair market value resets.
- The reversion of improvements to the landlord at expiration is a critical but often buried provision.
- Leasehold financing (tenant's mortgage on the building they construct) creates a three-party dynamic that affects SNDA and assignment provisions.

---

## Red Flag Rules

20 rules (RF-001 through RF-020). Each fires when extracted field values indicate a potential risk for the tenant. Red flags drive the CamAudit funnel CTA when CAM-related rules fire.

| Rule ID | Rule Name | Severity | Condition | Fields Checked | CamAudit Trigger |
|---------|-----------|----------|-----------|---------------|-----------------|
| RF-001 | Excessive Management Fee | High | `management_fee_cap > 15%` OR missing | `management_fee_cap` | Yes |
| RF-002 | Missing Audit Rights | High | `audit_rights == false` OR not found | `audit_rights` | Yes |
| RF-003 | No CAM Cap | High | `cam_cap_percentage` is null/missing | `cam_cap_percentage` | Yes |
| RF-004 | Cumulative CAM Cap | Medium | `cam_cap_type == "cumulative"` | `cam_cap_type`, `cap_cumulative_vs_annual` | Yes |
| RF-005 | No Gross-Up Provision | Medium | `gross_up_percentage` is null AND `lease_structure_type` contains "NNN" | `gross_up_percentage`, `lease_structure_type` | Yes |
| RF-006 | Missing CAM Exclusions | High | `cam_exclusions` is empty array | `cam_exclusions` | Yes |
| RF-007 | Short Cure Period | Medium | `monetary_cure_period < 10` days | `monetary_cure_period` | No |
| RF-008 | Aggressive Holdover Rate | Medium | `holdover_rate > 200%` | `holdover_rate` | No |
| RF-009 | No Termination Option | Low | `has_termination_option == false` AND `lease_term_months > 60` | `has_termination_option`, `lease_term_months` | No |
| RF-010 | Missing Restoration Clarity | Low | `restoration_requirement == true` AND `tenant_work_description` is null | `restoration_requirement`, `tenant_work_description` | No |
| RF-011 | No Renewal Option | Low | `has_renewal_option == false` | `has_renewal_option` | No |
| RF-012 | Recapture Right Present | Medium | `recapture_right == true` | `recapture_right` | No |
| RF-013 | No Base Year Gross-Up | Medium | `base_year_gross_up == false` AND `base_year` is not null | `base_year_gross_up`, `base_year` | Yes |
| RF-014 | No Reconciliation Frequency | Medium | `reconciliation_frequency` is null AND `lease_structure_type` contains "NNN" | `reconciliation_frequency`, `lease_structure_type` | Yes |
| RF-015 | Short Audit Window | Medium | `cam_audit_deadline_days < 60` | `cam_audit_deadline_days` | Yes |

### Rule Details

**RF-001: Excessive Management Fee.** Management fees above 15% of operating expenses are exploitative by industry standards. IREM benchmarks show office management fees averaging 3.62% of gross rents; retail CAM management is typically 5-15%. A missing cap means the landlord can charge unlimited management fees. Both conditions (>15% and missing) fire this rule at High severity because the financial impact compounds annually.

**RF-002: Missing Audit Rights.** Without contractual audit rights, the tenant cannot verify CAM charges. While some jurisdictions imply an inspection right under the covenant of good faith (see *McClain v. Octagon Plaza, LLC*, Cal. App. 2008), contractual rights are far stronger and include scope, timeline, and cost-recovery provisions. This is the single most important CamAudit trigger because tenants without audit rights cannot independently verify what they are being charged.

**RF-003: No CAM Cap.** An uncapped CAM provision exposes the tenant to unlimited annual increases. In a rising-cost environment, CAM charges can increase 8-12% annually without a cap. Over a 10-year lease on 7,500 RSF at $12/RSF CAM, the difference between capped (5% annual) and uncapped (8% actual) growth can exceed $45,000 in cumulative overpayment.

**RF-004: Cumulative CAM Cap.** Cumulative (compounding) caps allow unused headroom from low-cost years to be "banked" and applied in high-cost years. A 5% cumulative cap permits the landlord to pass through 8% in a single year if prior years came in under cap. Non-cumulative (year-over-year) caps provide more predictable expense trajectories for tenants.

**RF-005: No Gross-Up Provision.** In a partially occupied NNN building, the tenant's pro rata share of variable expenses is inflated because those expenses are spread across fewer tenants. A gross-up provision normalizes variable expenses to a target occupancy (typically 95%), preventing the tenant from subsidizing vacant space. The absence of this provision in a NNN lease is a material risk when building occupancy is below 90%.

**RF-006: Missing CAM Exclusions.** Without explicit exclusions, the landlord can pass through capital expenditures, executive salaries, legal fees, leasing commissions, and other costs that are not legitimate operating expenses. A comprehensive exclusion list is the tenant's primary defense against overbilling.

**RF-007: Short Cure Period.** Monetary cure periods below 10 days give tenants minimal time to remedy a late payment before the landlord can pursue default remedies including lease termination. Many states mandate minimum cure periods (e.g., California requires 3-day notice for monetary defaults; New York requires 10-day notice in some contexts). Lease-stated periods below 10 days are aggressive.

**RF-008: Aggressive Holdover Rate.** Holdover rates above 200% of the last month's rent are punitive. The industry standard is 125-200%. Rates above 200% are designed to force immediate surrender rather than to compensate the landlord for actual damages from holdover.

**RF-009: No Termination Option.** A lease term exceeding 5 years (60 months) with no early termination right represents significant commitment risk, particularly for tenants whose business needs may change. This is Low severity because long-term leases without termination options are common and not inherently problematic, but the risk should be surfaced.

**RF-010: Missing Restoration Clarity.** When the lease requires the tenant to restore the premises but does not describe what work the tenant initially performed, the scope of restoration is undefined. This creates disputes at lease expiration about what must be removed vs. what can remain.

**RF-011: No Renewal Option.** Without a renewal option, the tenant has no guaranteed right to remain in the space after the initial term. The landlord can refuse to renew or demand significantly higher rent. This is Low severity because it is common and many tenants negotiate renewal terms when the time comes.

**RF-012: Recapture Right Present.** A recapture right allows the landlord to terminate the lease and take back the space when the tenant requests permission to assign or sublet. This effectively eliminates the tenant's ability to exit the lease through a sublease, because the landlord can simply recapture the space instead of consenting.

**RF-013: No Base Year Gross-Up.** When the base year is not normalized to full occupancy, a building that was 60% occupied in the base year will have artificially low base year expenses. Every subsequent year, the tenant pays for occupancy increases rather than real cost increases. Over a 10-year term, this error compounds to tens of thousands of dollars.

**RF-014: No Reconciliation Frequency.** In a NNN lease, the lack of a defined reconciliation schedule means the landlord has no obligation to true-up estimated CAM charges against actual costs on any specific timeline. The tenant may overpay for years without a reconciliation.

**RF-015: Short Audit Window.** An audit deadline of fewer than 60 days from receipt of the reconciliation statement gives the tenant insufficient time to review, challenge, and audit CAM charges. Professional audits typically take 30-90 days to complete. A window shorter than 60 days may effectively prevent the tenant from exercising audit rights.

### CamAudit Funnel Activation

Rules RF-001 through RF-006 and RF-013 through RF-020 are CamAudit triggers. When any of these fire, the UI activates the CamAudit cross-sell CTA with a 20% referral discount. Additional trigger conditions:
- `audit_rights == true` (tenant CAN audit, suggest they do)
- `lease_structure_type` is NNN or Modified Gross
- 3+ CAM-relevant fields have medium or low confidence

---

## Confidence Scoring

### Three Tiers

| Tier | Score Range | UI Color | Meaning |
|------|-----------|----------|---------|
| **High** | 0.85-1.00 | Green | Field clearly stated in the lease text. OCR is clean. No ambiguity in the extraction. |
| **Medium** | 0.60-0.84 | Yellow | Field is implied or partially stated. Some ambiguity exists. May require human verification. |
| **Low** | 0.00-0.59 | Red | Field is missing, contradicted by other clauses, or highly ambiguous. Manual verification recommended. |

### Combined Confidence Formula

```
combined_confidence = pass1_self_confidence
                      adjusted by pass2 patches (if any)
                      overridden by pass3 escalation result (if triggered)
```

Where:
- `pass1_self_confidence` is the model's self-reported extraction certainty for the field (0.0-1.0 scale, returned inline in the extraction JSON)
- `pass2 patches` either reinforce or correct Pass 1 — a Pass 2 patch carries its own confidence which replaces Pass 1's value for that field
- `pass3 overrides` only apply to disputed critical fields below the escalation threshold; if Pass 3 produces a clear answer, its confidence wins
- There is no separate "OCR confidence" signal — vision-LLM extraction collapses OCR and classification into a single read

### Factors That Increase Confidence

- Field value found via primary term match (e.g., "Pro Rata Share" directly stated)
- Value is explicitly numerical with clear units ("7.50%", "$24.50 per RSF")
- Cross-field validation passes (e.g., pro rata share matches RSF ratio)
- Value appears in a structured table or form rather than narrative text
- Multiple consistent references to the same value across the document

### Factors That Decrease Confidence

- Field found via alias match only (e.g., "Tenant's Proportionate Share" instead of "Pro Rata Share")
- Value requires interpretation of narrative language ("approximately seven and one-half percent")
- Handwritten annotations or modifications to the text
- Value appears only in an amendment or addendum (may supersede but could also be ambiguous)
- Cross-field validation fails (e.g., stated pro rata share does not match computed ratio)
- Pass 2 adversarial validation flags the field as questionable
- Conflicting values found in different sections of the document

### Cross-Field Validators

These deterministic checks run after extraction and adjust confidence on related fields:

**Pro Rata Share Validator:**
```
computed_share = rentable_square_footage / building_total_rsf
if abs(pro_rata_share - computed_share) > 0.005:  # >0.5% tolerance
    lower confidence on pro_rata_share, rentable_square_footage, building_total_rsf
    create validation warning
```

**Lease Term Validator:**
```
computed_months = month_diff(commencement_date, expiration_date)
if abs(lease_term_months - computed_months) > 1:  # >1 month tolerance
    lower confidence on lease_term_months, commencement_date, expiration_date
    create validation warning
```

**Date Sequence Validator:**
```
expected_order: execution_date <= possession_date <= commencement_date <= rent_commencement_date <= expiration_date
if any date violates this order:
    lower confidence on the out-of-order date(s)
    create validation warning
```

**TI Allowance Validator:**
```
if ti_allowance_amount and ti_allowance_per_rsf and rentable_square_footage:
    computed_total = ti_allowance_per_rsf * rentable_square_footage
    if abs(ti_allowance_amount - computed_total) > 100:  # >$100 tolerance
        lower confidence on both TI fields
        create validation warning
```

**Insurance Limit Validator:**
```
if cgl_aggregate_limit < cgl_occurrence_limit:
    lower confidence on both insurance fields
    create validation warning (aggregate should >= occurrence)
```

---

## Common Extraction Challenges

### Ambiguous Language
Leases use phrases like "reasonable," "customary," "as determined by Landlord," and "commercially reasonable efforts" that resist precise extraction. When a field value depends on subjective language, extract the literal text, assign medium confidence, and note the ambiguity.

### Handwritten Amendments
Handwritten modifications to printed lease text are legally binding and take precedence over the printed text. Vision-LLM models read handwriting reliably for printed-style cursive but accuracy drops on heavily styled or faded handwriting. Extract the handwritten value, use the model's self-reported confidence (which should naturally be lower for difficult handwriting), and flag the field as having a handwritten modification.

### Addenda and Amendment Overrides
The effective value of a field may be different from what the base lease states. A Third Amendment that says "Section 5.2 is hereby deleted and replaced with the following..." changes the extraction target. The pipeline must process documents in order: base lease first, then each amendment chronologically, with later values overriding earlier ones.

### Defined Terms
Watch for definitions sections that redefine standard terms. If the lease's Article 1 says "'Operating Expenses' shall mean and include the following...", that definition controls even if it includes items normally excluded from operating expenses (like capital improvements amortized over their useful life).

### Multi-Property Leases
Some leases cover multiple properties or multiple suites. Each property/suite may have different rent, area, and pro rata share figures. The extraction should identify whether the lease covers a single premises or multiple, and if multiple, extract fields for the primary premises while flagging the multi-property structure.

### Rent Schedules Spanning Multiple Pages
Rent escalation tables can span 2-5 pages. The extraction must recognize that a table continues across a page break and consolidate the data. The first-year rent goes into `base_rent_annual`; the full schedule may need to be stored separately.

### Percentage Rent with Breakpoint Calculations
Natural breakpoint = annual base rent / percentage rate. If the lease states a breakpoint amount that differs from the natural breakpoint, it is an "artificial" breakpoint. Extract the stated amount. Do not compute the natural breakpoint in the extraction layer; that is a validation-layer check.

### Ground Lease Overlays
When a building sits on ground-leased land, the building lease (between the building owner/ground lessee and the space tenant) may reference or incorporate terms from the ground lease. These cross-references can affect CAM calculations, insurance requirements, and assignment restrictions.

---

## Key Formulas

All formulas are executed in the Python validation layer. Claude extracts the parameters; Python does the math.

### Pro Rata Share
```
pro_rata_share = tenant_rsf / building_total_rsf
```
Watch for denominator issues: GLA (all leasable space), GLOA (only leased and occupied space), or a fixed contractual denominator. The denominator choice has material financial impact. See `references/field-extraction-guide.md` for detailed analysis.

### Rent Escalation (Fixed Percentage)
```
year_N_rent = base_rent * (1 + fixed_escalation_rate) ^ (N - 1)
```
Where N is the lease year number (Year 1 = base rent, Year 2 = first escalation).

### Rent Escalation (CPI-Based)
```
year_N_rent = prior_year_rent * (1 + CPI_change)
# Often with floor and ceiling:
escalation_rate = max(floor_rate, min(ceiling_rate, CPI_change))
year_N_rent = prior_year_rent * (1 + escalation_rate)
```

### CAM Cap (Non-Cumulative)
```
max_cam_year_N = prior_year_actual_cam * (1 + cam_cap_percentage)
```

### CAM Cap (Cumulative/Compounding)
```
max_cam_year_N = base_year_cam * (1 + cam_cap_percentage) ^ N + banked_unused_cap
```
Banking: if actual CAM in a year is below the cap, the difference (cap - actual) is banked for use in future years.

### Gross-Up (Variable Expenses Only)
```
grossed_up_variable = actual_variable_expenses * (target_occupancy / actual_occupancy)
adjusted_total = grossed_up_variable + actual_fixed_expenses
```
Target occupancy is typically 95%. Fixed expenses (taxes, insurance) are never grossed up.

### Management Fee (Correct Calculation)
```
correct_fee = (total_cam_expenses - management_fee) * fee_rate
# If landlord used circular base (fee-on-fee):
circular_fee = total_cam_expenses * fee_rate  # WRONG: includes fee in its own base
overcharge = circular_fee - correct_fee
```

### Holdover Rent
```
holdover_monthly_rent = last_month_base_rent * (holdover_rate / 100)
```

### Natural Breakpoint (Percentage Rent)
```
natural_breakpoint = annual_base_rent / percentage_rent_rate
```
If the stated breakpoint is lower than the natural breakpoint, the tenant pays percentage rent sooner (landlord-favorable). If higher, the tenant has more sales headroom before percentage rent kicks in (tenant-favorable).

---

## References

For common lease clause patterns organized by category: `references/lease-language.md`

For detailed extraction guidance on complex fields: `references/field-extraction-guide.md`
