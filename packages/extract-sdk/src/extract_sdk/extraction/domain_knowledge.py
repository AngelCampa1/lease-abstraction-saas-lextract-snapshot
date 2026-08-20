"""Expert commercial lease abstraction domain knowledge.

Organized by Lextract's 16 field categories, this module provides rich CRE
expertise that cheap open-source models need to extract accurately.  Injected
into extraction prompts (Pass 1), validation prompts (Pass 2), and escalation
prompts (Pass 3) of the multi-pass pipeline.

Unlike CamAudit's domain prompts (CAM-only, 42 fields), these cover the FULL
commercial lease: rent, dates, options, legal clauses, insurance, assignment,
co-tenancy, parking, signage, TI, ASC 842 compliance, casualty/condemnation, and more
— 126 fields across 16 categories.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Category 1: Parties & Property (10 fields)
# ---------------------------------------------------------------------------
PARTIES_AND_PROPERTY_KNOWLEDGE = """\
## Parties & Property — Expert Extraction Guidance

- **landlord_legal_name**: Extract the legal entity on the signature page, NOT
  a DBA or property manager name.  The landlord entity is often an LLC or LP
  (e.g., "ABC Properties LLC") distinct from the management company.
  **SUBLEASE RULE**: In a sublease document, `landlord_legal_name` = the
  SUBLANDLORD (the party granting the sublease, listed as "Sublandlord" or
  "Landlord" in the sublease agreement), NOT the head/master landlord (the
  original building owner under the head lease).  The head landlord may be
  referenced in recitals but is NOT the direct counterparty.
- **tenant_legal_name**: The full legal corporate entity.  Watch for "d/b/a"
  trade names — extract the legal name, note the DBA separately if present.
- **guarantor_name**: May appear in a separate Guaranty exhibit or rider, not
  in the main body.  Return as an array (multiple guarantors possible).
- **rentable_square_footage (RSF)** vs **usable_square_footage (USF)**:
  RSF includes the tenant's pro-rata share of common areas (lobbies, hallways,
  restrooms) per BOMA 2017.  USF is the private occupied space only.
  Load factor = RSF / USF (typical: 1.15–1.25 office, 1.05–1.10 industrial).
  Rent is almost ALWAYS quoted per RSF.  Do NOT confuse RSF with USF — this
  corrupts every per-SF financial calculation.
- **building_total_rsf**: The denominator for pro-rata share.  Must be the
  building's total rentable area, NOT gross building area (which includes
  structural walls, mechanical rooms, etc.).
- **load_factor**: RSF ÷ USF.  Only extract if explicitly stated.
- **property_use_type**: Classify based on the Permitted Use clause and
  property description.  Values: office, retail, industrial, medical,
  mixed-use, warehouse, flex, restaurant.
"""

# ---------------------------------------------------------------------------
# Category 2: Key Dates & Term (7 fields)
# ---------------------------------------------------------------------------
KEY_DATES_AND_TERM_KNOWLEDGE = """\
## Key Dates & Term — Expert Extraction Guidance

There are 6 distinct date types in a commercial lease — do NOT conflate them:

| Date | Meaning |
|------|---------|
| **execution_date** | When the lease was signed by all parties |
| **commencement_date** | When the legal term begins (obligations take effect) |
| **rent_commencement_date** | When rent payments begin (may differ from commencement) |
| **possession_date** | When tenant gets physical access for buildout |
| **expiration_date** | When the initial term ends |

- **Commencement ≠ rent commencement** when free rent exists or buildout is
  required.  The gap between them is the rent abatement period.
- **Contingent dates**: If commencement is "upon substantial completion of
  Landlord's Work" or "30 days after Certificate of Occupancy," extract the
  FORMULA/CONDITION as a string, not a specific date.  Look for a separate
  "Commencement Date Confirmation" letter in the exhibits.
- **lease_term_months**: Calculate from commencement_date to expiration_date,
  NOT from execution_date.  If stated as years, multiply by 12.
- **rent_abatement_period**: May apply ONLY to base rent — tenant often still
  pays CAM/NNN/additional rent during the free rent period.  Extract the
  exact scope (e.g., "3 months base rent free, additional rent due from
  commencement").
- **possession_date ≤ commencement_date ≤ rent_commencement_date ≤ expiration_date**
"""

# ---------------------------------------------------------------------------
# Category 3: Rent & Escalations (8 fields)
# ---------------------------------------------------------------------------
RENT_AND_ESCALATIONS_KNOWLEDGE = """\
## Rent & Escalations — Expert Extraction Guidance

- **base_rent_annual**: The FIRST FULL YEAR of rent.  If the rent schedule
  shows monthly amounts, multiply by 12.  If stepped rent starts mid-year,
  use the rate for the first full lease year.  Return as a number without
  currency symbols.
- **rent_payment_frequency**: Usually "monthly" — extract the stated interval.
- **escalation_type**: Classify as one of:
  - "fixed_percentage": Stated % annual increase (e.g., "3% per annum")
  - "fixed_dollar": Stated $ increase (e.g., "$0.50/SF per year")
  - "cpi": Tied to Consumer Price Index — MUST also extract cpi_index_reference
  - "stepped": Predetermined rent schedule with specific amounts at specific dates
  - "pass_through": Tied to actual expense increases above a base year
  - "fair_market_value": Periodic reset to FMV
- **fixed_escalation_rate**: As a decimal.  "3%" = 0.03, NOT 3.
- **CPI escalations** (when escalation_type = "cpi"):
  - Extract the specific index: CPI-U (urban consumers) vs CPI-W (wage earners)
  - Extract the geographic region and base period
  - CRITICAL: Extract floors AND caps.  "CPI increase, not less than 2% nor
    more than 5%" → floor = 0.02, cap = 0.05.  Missing these is a top-5 error.
- **Percentage rent** (retail leases):
  - Base rent PLUS a percentage of gross sales above a "breakpoint"
  - Natural breakpoint = base_rent ÷ percentage_rent_rate
  - Artificial breakpoint = a contractually stated dollar amount
  - **gross_sales_exclusions**: Revenue streams excluded from the percentage
    rent calculation (returns, employee sales, internet/catalog sales,
    gift card redemptions).  Extract as an array.
"""

# ---------------------------------------------------------------------------
# Category 4: CAM & Operating Expenses (18 fields)
# ---------------------------------------------------------------------------
CAM_AND_OPEX_KNOWLEDGE = """\
## CAM & Operating Expenses — Expert Extraction Guidance

- **lease_structure_type**: Use the following decision tree (stop at first match):
  1. **Ground Lease**: If document title or recitals contain "Ground Lease",
     "ground lease", or "land lease" (even if it is an amendment to a ground
     lease) → classify as "ground_lease".  The rent structure (fixed, CPI,
     percentage) is irrelevant to this classification.
  2. **NNN**: If the document title or recitals use "Triple Net", "NNN",
     "Net Net Net", or "triple-net" AND tenant pays base rent + pro rata share
     of operating expenses/taxes/insurance → classify as "NNN".
     Do NOT downgrade to "modified_gross" for minor carve-outs.
  3. **NNN by substance**: If there is no explicit NNN label but tenant pays
     all (or nearly all) operating expenses via pro rata share → "NNN".
  4. **Gross**: If lease says "Gross" or "Full Service" and rent includes most
     expenses → "gross".
  5. **Modified Gross**: Only use when the lease is explicitly a hybrid with
     a split that is neither full gross nor NNN.
  6. For **amendment documents** (title contains "Amendment"): inherit the
     lease_structure_type from the original lease, which is typically stated
     in the recitals.  Do NOT reclassify based only on the amendment's rent
     provisions — they describe changes, not the overall lease structure.
  - NNN: tenant pays base rent + pro rata share of ALL (or nearly all)
    operating expenses, taxes, and insurance
  - Full Service Gross: single rent covers everything (check for base year stop)
  - Modified Gross: hybrid — only when clearly not NNN and not full gross

- **pro_rata_share**: ALWAYS as a decimal (5.25% = 0.0525).  Three methods:
  | Method | Formula | Effect |
  |--------|---------|--------|
  | GLA | tenant_rsf ÷ building_total_rsf | Standard, tenant-favorable |
  | GLOA | tenant_rsf ÷ occupied_rsf_only | Inflates share when vacancies exist |
  | Fixed | Contractually locked % | Unchanging regardless of occupancy |
  - "Subject to adjustment" language means landlord can recalculate annually.
  - If > 1.0, it's almost certainly a format error (percentage not converted).

- **cam_cap_percentage**: As a decimal.  5% = 0.05.
- **cam_cap_type** — THE SINGLE MOST IMPORTANT CLASSIFICATION:
  - "non_cumulative": Resets annually.  Unused allowance is LOST to landlord.
    Most tenant-favorable.  Key language: "per year", "annual limit"
  - "cumulative": Unused increases BANKED for future years.  Year 1 uses only
    2% of 5% cap → landlord can use remaining 3% in future years.
    Key language: "carry forward", "banked capacity", "cumulative"
  - "compounding": Each year's cap calculated on the PREVIOUS year's capped
    amount, not the original base.  Key language: "compound", "compounding"
  - If ambiguous: default to "non_cumulative" (industry standard interpretation)
- **cap_cumulative_vs_annual**: Redundant with cam_cap_type but captures the
  explicit lease language for the distinction.

- **gross_up_percentage**: The occupancy threshold for normalizing variable
  expenses (typically 0.95 = 95%).  Without gross-up in a partially occupied
  building, the base year is artificially low → tenant faces huge increases
  when building fills up.  Only extract if explicitly stated.
- **base_year_gross_up**: Boolean — whether base year expenses are normalized.

- **management_fee_cap**: Property manager's fee as % of operating expenses.
  Industry range: 3–15%.  If > 0.15, likely a format error.

- **cam_exclusions**: Expenses BARRED from pass-through.  Standard exclusions:
  capital expenditures, costs from landlord's breach, tenant-specific buildouts,
  political donations, above-market affiliate payments, insurance-reimbursable
  costs, leasing commissions, specialty area operations (fitness, cafeteria).
  Extract as an array of descriptions.

- **controllable_vs_noncontrollable_expenses**:
  Controllable (subject to cap): maintenance, landscaping, janitorial, admin,
  parking lot upkeep, management fees.
  Non-controllable (excluded from cap): taxes, insurance, utilities, snow
  removal, government-mandated costs.

- **audit_rights**: Boolean — does tenant have the right to audit landlord's
  CAM ledgers?  Critical tenant protection.
- **cam_audit_deadline_days**: Days to dispute after receiving reconciliation.
- **reconciliation_frequency**: How often estimated vs actual CAM is trued up.
- **cam_estimate_method**: How monthly estimates are calculated (prior year
  actuals, budget-based, fixed amount).
"""

# ---------------------------------------------------------------------------
# Category 5: Options (7 fields)
# ---------------------------------------------------------------------------
OPTIONS_KNOWLEDGE = """\
## Options — Expert Extraction Guidance

- **has_renewal_option / renewal_terms**: Extract number of options × length
  of each.  Key details often MISSED:
  - Notice deadline (typically 6–12 months before expiration)
  - Rent determination method: FMV, fixed %, CPI, formula
  - Whether options are at tenant's sole option, mutual, or automatic
  - For FMV renewals: capture determination method — broker opinion,
    arbitration, baseball arbitration, comparable properties
- **has_termination_option / termination_penalty**: Early termination usually
  requires written notice + a fee.  Fee is often: unamortized TI allowance +
  unamortized leasing commissions + remaining rent obligation (discounted).
  Extract the fee formula, not just "yes/no."
- **ROFR vs ROFO** — these are DIFFERENT rights:
  - ROFR (Right of First Refusal): Landlord receives a third-party offer,
    must present it to tenant, tenant can MATCH the offer.
  - ROFO (Right of First Offer): Landlord must offer space to tenant FIRST
    before marketing to third parties.
  - For both: extract what space is covered, response deadline, price mechanism,
    and whether it's extinguished after one declination.
"""

# ---------------------------------------------------------------------------
# Category 6: Tenant Improvements & Construction (6 fields)
# ---------------------------------------------------------------------------
TI_AND_CONSTRUCTION_KNOWLEDGE = """\
## Tenant Improvements & Construction — Expert Extraction Guidance

- **ti_allowance_amount** vs **ti_allowance_per_rsf**: Total $ vs $/RSF.
  If only per-RSF is stated, the total = per_rsf × rentable_square_footage.
  TI allowance may be quoted per USF or RSF — verify which.
- **landlord_work_description**: Landlord's construction obligations, typically
  building shell/core (HVAC, fire/life safety, restrooms, elevator lobbies).
  Usually specified in a "Landlord's Work" or "Base Building" exhibit.
- **tenant_work_description**: Tenant's interior fit-out scope.  Usually in a
  "Tenant's Work" or "Work Letter" exhibit.
- **restoration_requirement**: Whether tenant must remove improvements and
  restore to original condition at lease end.  This can cost $15–50/SF and is
  a major financial liability.  Extract "yes/no" AND any exceptions.
- **hvac_responsibility**: Who REPLACES (not just maintains) HVAC units.
  In industrial/retail, tenant is often responsible for HVAC serving their
  space.  In office, landlord typically maintains building systems.
"""

# ---------------------------------------------------------------------------
# Category 7: Insurance & Indemnity (6 fields)
# ---------------------------------------------------------------------------
INSURANCE_AND_INDEMNITY_KNOWLEDGE = """\
## Insurance & Indemnity — Expert Extraction Guidance

- **cgl_occurrence_limit / cgl_aggregate_limit**: Commercial General Liability
  minimums.  Typical: $1M per occurrence / $2M aggregate.  Extract as numbers.
- **property_insurance_bearer**: Who insures the building — almost always
  "landlord" in multi-tenant properties.  For single-tenant NNN, may be tenant.
- **waiver_of_subrogation**: Mutual waiver preventing insurers from suing the
  other party to recoup losses.  Almost universal — extract as boolean.
- **additional_insured_req**: Tenant must add landlord (and often lender) to
  liability policy.  Almost always required — extract as boolean.
- **indemnification_scope**: Classify the breadth:
  - "broad_form": Tenant indemnifies landlord for everything, INCLUDING
    landlord's own negligence (most landlord-favorable, unenforceable in some states)
  - "intermediate": Tenant indemnifies except for landlord's sole negligence
  - "limited": Tenant indemnifies only for tenant's own acts/omissions
"""

# ---------------------------------------------------------------------------
# Category 8: Assignment & Subletting (6 fields)
# ---------------------------------------------------------------------------
ASSIGNMENT_AND_SUBLETTING_KNOWLEDGE = """\
## Assignment & Subletting — Expert Extraction Guidance

- **consent_required**: Almost always true.  The key question is the STANDARD.
- **consent_standard**: Classify precisely:
  - "sole_discretion": Landlord can refuse for any reason (most restrictive)
  - "not_unreasonably_withheld": Statutory standard in many jurisdictions
  - "not_unreasonably_withheld_conditioned_or_delayed": Strongest tenant
    protection (adds anti-delay language)
- **permitted_transferees**: Carve-outs allowing transfers WITHOUT landlord
  consent — affiliates, subsidiaries, corporate restructurings, mergers, IPOs.
  These are often buried in the clause and easy to miss.  Extract as array.
- **recapture_right**: Landlord's option to terminate the lease instead of
  consenting to an assignment.  Very landlord-favorable — extract as boolean.
- **profit_sharing_percentage**: Landlord's share of sublease profit.
  Typically 50%.  As a decimal (0.50 = 50%).
- **continuing_liability**: Whether original tenant remains liable after
  assignment.  Almost always true — extract as boolean.
"""

# ---------------------------------------------------------------------------
# Category 9: Default & Remedies (6 fields)
# ---------------------------------------------------------------------------
DEFAULT_AND_REMEDIES_KNOWLEDGE = """\
## Default & Remedies — Expert Extraction Guidance

- **monetary_cure_period**: Days to cure a payment default after written
  notice.  Typically 5–10 days.  Some leases: 0 days for habitual late payers.
  Extract the NUMBER of days.
- **non_monetary_cure_period**: Days to cure non-payment defaults.  Typically
  30 days, with extension if cure cannot reasonably be completed in 30 days
  provided tenant is diligently pursuing.  Extract the base number of days.
- **acceleration_clause**: Landlord can demand ALL remaining rent for the
  entire lease term immediately upon uncured default.  Extremely landlord-
  favorable.  Extract as boolean.
- **holdover_rate**: Multiplier on the last month's rent if tenant remains
  after expiration.  Expressed as a percentage: 150% = 1.50, 200% = 2.00.
  Some leases have tiered holdover (150% for month 1, 200% thereafter).
  Extract the INITIAL rate.  Holdover usually constitutes a default.
- **late_fee_percentage**: Penalty on overdue rent.  Typically 3–5% of the
  overdue amount.  Extract as a decimal (5% = 0.05).
- **liquidated_damages**: Predetermined penalty for specific breaches.
  Extract as a currency amount if stated.
"""

# ---------------------------------------------------------------------------
# Category 10: Exclusivity & Co-tenancy (6 fields)
# ---------------------------------------------------------------------------
EXCLUSIVITY_AND_COTENANCY_KNOWLEDGE = """\
## Exclusivity & Co-tenancy — Expert Extraction Guidance

These clauses are primarily found in RETAIL leases.

- **exclusive_use_rights**: Prohibits landlord from leasing to competing
  businesses.  Extract the EXACT use description and geographic scope
  (building, shopping center, radius).  Note carve-outs for existing tenants
  and anchor tenants — these are common and critically important.
- **radius_restriction_miles**: Tenant cannot open a competing store within
  X miles of the property.  Extract the distance as a number.
- **opening_cotenancy**: Conditions that must be met BEFORE tenant must open:
  - Named anchor tenant(s) must be open and operating
  - Minimum occupancy % of the center (e.g., 75%)
  - Extract specific anchor names, thresholds, and remedies
- **ongoing_cotenancy**: Conditions maintained DURING the lease:
  - Named anchor must remain open
  - Minimum occupancy maintained
  - Remedy cascade: rent reduction for cure period → termination right
- **cotenancy_remedy**: Tenant's recourse if co-tenancy fails (rent reduction,
  percentage rent only, termination right).
- **alternative_rent_rate**: Modified rent during co-tenancy failure (often
  percentage of gross sales only, no base rent).
"""

# ---------------------------------------------------------------------------
# Category 11: Parking & Common Areas (4 fields)
# ---------------------------------------------------------------------------
PARKING_AND_COMMON_AREAS_KNOWLEDGE = """\
## Parking & Common Areas — Expert Extraction Guidance

- **parking_ratio**: Spaces per 1,000 RSF.  Typical: 3–4 office, 5+ retail,
  1–2 industrial.  Extract as a number.
- **unreserved_parking_spaces**: General pool spaces.  Extract as integer.
- **reserved_parking_spaces**: Designated/exclusive stalls (often premium
  priced).  Extract as integer.
- **monthly_parking_cost**: Per-space charge.  May be "included in rent" or
  a separate fee.  Extract as currency amount, or null if included.
- **trailer_parking_spaces**: Industrial-specific, for semi-trucks.
"""

# ---------------------------------------------------------------------------
# Category 12: Utilities & Physical (6 fields)
# ---------------------------------------------------------------------------
UTILITIES_AND_PHYSICAL_KNOWLEDGE = """\
## Utilities & Physical Characteristics — Expert Extraction Guidance

- **utilities_payment_method**: Classify as:
  - "direct_meter": Tenant pays utility company directly
  - "sub_meter": Landlord meters and bills tenant
  - "included_in_rent": Covered by gross rent (FSG leases)
  - "pro_rata_allocation": Allocated as part of CAM/NNN charges
- **janitorial_responsibility**: "landlord" or "tenant".  In office usually
  landlord; in retail/industrial usually tenant.
- **clear_height_feet / dock_high_doors / drive_in_doors**: Industrial-specific
  physical characteristics.  Only extract if the property is industrial/
  warehouse.  Set to null for office and retail leases.
- **power_capacity**: Electrical capability (amps/volts/phase).  Industrial-
  specific.  Only extract if stated.
"""

# ---------------------------------------------------------------------------
# Category 13: Signage & Permitted Use (5 fields)
# ---------------------------------------------------------------------------
SIGNAGE_AND_PERMITTED_USE_KNOWLEDGE = """\
## Signage & Permitted Use — Expert Extraction Guidance

- **permitted_use_description**: Extract the EXACT lease language — do NOT
  paraphrase.  Overly narrow use clauses limit assignability and are a major
  risk factor.  Broad clauses like "general office use" are favorable;
  narrow clauses like "dental practice only" are restrictive.
- **prohibited_uses**: Explicit bans (hazardous materials, adult entertainment,
  competing uses, etc.).  Extract as an array.
- **fascia_signage_rights**: Right to affix branding on the building exterior.
  Boolean.  Critical for retail tenants.
- **monument_signage_rights**: Right to place name on a freestanding roadside
  structure.  Boolean.  Critical for retail visibility.
- **signage_maintenance**: Who pays for sign upkeep — "landlord" or "tenant".
"""

# ---------------------------------------------------------------------------
# Category 14: Miscellaneous (4 fields)
# ---------------------------------------------------------------------------
MISCELLANEOUS_KNOWLEDGE = """\
## Miscellaneous — Expert Extraction Guidance

- **security_deposit_amount**: Total collateral held by landlord.  Typically
  1–3 months of base rent.  Extract as a number.
- **security_deposit_type**: Classify as:
  - "cash": Standard cash deposit
  - "letter_of_credit": LC from a bank — more complex, extract issuing bank
    requirements and auto-renewal provisions if present
  - "combination": Both cash and LC
- **has_guaranty**: Whether an external party guarantees lease obligations.
  Guarantee types to note in source_text:
  - Full/absolute: all obligations, entire term
  - Limited/partial: capped amount or monetary only
  - Good guy (NYC market): ends upon proper vacancy + rent current
  - Springing: activated only by trigger events
  - Burn-off: reduces over time as tenant performs
- **governing_law_state**: The jurisdiction whose laws govern the lease.
- **snda_requirement**: Whether tenant must sign a Subordination, Non-
  Disturbance, and Attornment agreement.  Protects tenant if building is
  sold or foreclosed.  Boolean.
- **estoppel_turnaround_days**: Days to return a signed estoppel certificate.
  Typically 10–15 days.  Extract as integer.
"""

# ---------------------------------------------------------------------------
# Cross-field validation rules
# ---------------------------------------------------------------------------
CROSS_FIELD_VALIDATION_RULES = """\
## Cross-Field Validation Rules

These rules check consistency BETWEEN extracted fields.  Violations indicate
extraction errors that must be corrected:

1. **Pro rata share consistency**: pro_rata_share should ≈
   rentable_square_footage ÷ building_total_rsf (within 2% tolerance).
2. **Date ordering**: commencement_date ≤ rent_commencement_date ≤
   expiration_date.  possession_date ≤ commencement_date.
3. **Lease term consistency**: lease_term_months should match the number of
   months between commencement_date and expiration_date (±1 month).
4. **NNN consistency**: If lease_structure_type contains "NNN" or "triple net",
   then pro_rata_share and cam_exclusions should be populated.
5. **Option consistency**: If has_renewal_option = true, then renewal_terms
   should be non-empty.  If has_termination_option = true, then
   termination_penalty should be populated.
6. **Escalation consistency**: If escalation_type = "cpi", then
   cpi_index_reference should be populated.  If "fixed_percentage", then
   fixed_escalation_rate should be populated.
7. **Security deposit plausibility**: security_deposit_amount should typically
   be 1–3× monthly base rent (base_rent_annual ÷ 12).
8. **Percentage format**: All percentage fields must be decimals.  Values > 1.0
   are almost certainly format errors (5.25 should be 0.0525).
9. **CAM cap plausibility**: cam_cap_percentage should be < 0.15 (15%).
   management_fee_cap should be < 0.20 (20%).
10. **Holdover rate**: Should be between 1.0 and 3.0 (100%–300% of rent).
"""

# ---------------------------------------------------------------------------
# Common extraction pitfalls
# ---------------------------------------------------------------------------
COMMON_EXTRACTION_PITFALLS = """\
## Top 10 Extraction Accuracy Risks

These are the most common errors in commercial lease abstraction, ranked by
frequency and financial impact.  Be especially careful with these:

1. **Amendment chain**: If the document includes amendments, process them
   CHRONOLOGICALLY and apply the LATEST version of each modified term.  An
   amendment to rent in 2020 supersedes the original 2015 rent schedule AND
   any 2018 amendment to rent.  Always check exhibits and riders.

2. **Lease type ≠ expense allocation**: A lease labeled "NNN" might exclude
   certain expenses.  A lease labeled "Gross" might have pass-throughs.
   ALWAYS read the actual expense allocation section.

3. **Commencement ≠ rent commencement**: These dates differ when free rent
   or a buildout period exists.  Confusing them is a top-5 error.

4. **Percentage format**: ALWAYS convert to decimals.  "5.25%" = 0.0525.
   Any value > 1.0 in a percentage field is almost certainly a format error.

5. **RSF vs USF**: Rent is quoted per RSF.  TI allowance may be per RSF or
   per USF.  Getting the area type wrong corrupts ALL per-SF calculations.

6. **Pro rata share denominator**: GLA vs GLOA changes the tenant's share by
   2–5%.  GLOA (occupied area only) inflates the share when vacancies exist.

7. **CAM cap type**: Cumulative vs non-cumulative is the single highest-
   impact misclassification.  A cumulative cap can cost tenants thousands
   more than a non-cumulative cap.  Default to non-cumulative if ambiguous.

8. **Missing CAM exclusions**: Failing to extract cam_exclusions understates
   tenant protections and overstates their expense exposure.

9. **Contingent dates**: If a date depends on an event ("substantial
   completion", "certificate of occupancy"), extract the condition/formula
   as a string, not "TBD" or null.

10. **Document type detection**: Ground leases (50–99 year terms, land only),
    subleases (subject to master lease), and Letters of Intent (non-binding)
    require fundamentally different extraction approaches.  Flag the
    document type if it's not a standard space lease.
"""

# ---------------------------------------------------------------------------
# Assembled knowledge blocks
# ---------------------------------------------------------------------------
_ALL_CATEGORY_KNOWLEDGE = (
    PARTIES_AND_PROPERTY_KNOWLEDGE
    + KEY_DATES_AND_TERM_KNOWLEDGE
    + RENT_AND_ESCALATIONS_KNOWLEDGE
    + CAM_AND_OPEX_KNOWLEDGE
    + OPTIONS_KNOWLEDGE
    + TI_AND_CONSTRUCTION_KNOWLEDGE
    + INSURANCE_AND_INDEMNITY_KNOWLEDGE
    + ASSIGNMENT_AND_SUBLETTING_KNOWLEDGE
    + DEFAULT_AND_REMEDIES_KNOWLEDGE
    + EXCLUSIVITY_AND_COTENANCY_KNOWLEDGE
    + PARKING_AND_COMMON_AREAS_KNOWLEDGE
    + UTILITIES_AND_PHYSICAL_KNOWLEDGE
    + SIGNAGE_AND_PERMITTED_USE_KNOWLEDGE
    + MISCELLANEOUS_KNOWLEDGE
)

_VALIDATION_KNOWLEDGE = CROSS_FIELD_VALIDATION_RULES + COMMON_EXTRACTION_PITFALLS

_CATEGORY_MAP: dict[str, str] = {
    "Parties & Property": PARTIES_AND_PROPERTY_KNOWLEDGE,
    "Key Dates & Term": KEY_DATES_AND_TERM_KNOWLEDGE,
    "Rent & Escalations": RENT_AND_ESCALATIONS_KNOWLEDGE,
    "CAM & Operating Expenses": CAM_AND_OPEX_KNOWLEDGE,
    "Options": OPTIONS_KNOWLEDGE,
    "Tenant Improvements & Construction": TI_AND_CONSTRUCTION_KNOWLEDGE,
    "Insurance & Indemnity": INSURANCE_AND_INDEMNITY_KNOWLEDGE,
    "Assignment & Subletting": ASSIGNMENT_AND_SUBLETTING_KNOWLEDGE,
    "Default & Remedies": DEFAULT_AND_REMEDIES_KNOWLEDGE,
    "Exclusivity & Co-tenancy": EXCLUSIVITY_AND_COTENANCY_KNOWLEDGE,
    "Parking & Common Areas": PARKING_AND_COMMON_AREAS_KNOWLEDGE,
    "Utilities": UTILITIES_AND_PHYSICAL_KNOWLEDGE,
    "Signage & Permitted Use": SIGNAGE_AND_PERMITTED_USE_KNOWLEDGE,
    "Miscellaneous": MISCELLANEOUS_KNOWLEDGE,
}


def get_all_domain_knowledge() -> str:
    """Return the complete domain knowledge string for Pass 1 injection.

    Includes all 14 category knowledge blocks plus cross-field validation
    rules and common extraction pitfalls.
    """
    return (
        "# Expert Commercial Lease Abstraction Knowledge\n\n"
        "Use the following domain expertise to extract fields accurately.\n\n"
        + _ALL_CATEGORY_KNOWLEDGE
        + "\n"
        + _VALIDATION_KNOWLEDGE
    )


def get_category_knowledge(category: str) -> str:
    """Return knowledge for a specific category.

    Args:
        category: Category name as it appears in the field schema
                  (e.g., "Parties & Property", "Rent & Escalations").

    Returns:
        The domain knowledge string for that category, or empty string
        if the category is not recognized.
    """
    return _CATEGORY_MAP.get(category, "")


def get_validation_knowledge() -> str:
    """Return cross-field validation rules and extraction pitfalls for Pass 2."""
    return _VALIDATION_KNOWLEDGE
