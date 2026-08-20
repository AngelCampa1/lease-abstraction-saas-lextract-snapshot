# Field Extraction Guide -- Complex and Ambiguous Fields

Detailed extraction guidance for the fields that most frequently produce errors, require domain expertise, or involve cross-field dependencies. For each field: what to look for, common aliases, where in the lease it typically appears, edge cases, and cross-field validation.

---

## pro_rata_share

**Schema:** Category 4 (CAM & Operating Expenses), percentage, required, CAM-relevant.

**What to look for:** A percentage representing the tenant's fractional responsibility for building operating expenses. Usually stated as a fixed percentage with the underlying formula shown.

**Common aliases:** Tenant's Proportionate Share, Tenant's Share, Proportionate Share, Allocable Fraction, Percentage Share, Tenant's Fraction.

**Where it appears:** Typically in the definitions article (Article 1 or the Basic Lease Information summary page) and again in the operating expenses article. The Basic Lease Information page at the front of the lease is the most reliable source because it is a negotiated summary of key terms.

**Standard formula:** `pro_rata_share = tenant_rsf / building_total_rsf`

**The denominator problem:** The denominator is where extraction errors create the largest financial impact. Four common denominator definitions:

1. **GLA (Gross Leasable Area):** Total leasable area of the building or center, including vacant spaces. This is the standard and correct denominator for most leases. BOMA ANSI/BOMA Z65.5 for retail.

2. **GLOA (Gross Leased and Occupied Area):** Excludes vacant spaces. As occupancy drops, the remaining tenants' shares increase. A building at 80% occupancy increases every tenant's effective share by 25% (divide by 0.80 instead of 1.00). The NRTA (National Retail Tenants Association) explicitly warns against GLOA-based denominators.

3. **Building RSF minus anchor exclusions:** Shopping center anchors sometimes pay CAM directly or are excluded from the pro rata calculation entirely. If a 30,000 SF anchor is excluded from a 100,000 SF center, the effective denominator for in-line tenants is 70,000 SF, increasing their shares by ~43%.

4. **Fixed contractual denominator:** The lease states a specific number that may not match actual building area. This is the safest for tenants because it cannot be manipulated, but it may also be wrong if the building is later expanded or remeasured.

**Edge cases:**
- BOMA remeasurement: the 2017 BOMA standard can produce different RSF figures than the 2010 standard. A 3% RSF increase from remeasurement directly increases the pro rata share by 3%.
- Multi-building developments: the denominator may be the entire development (lower share) or a single building (higher share). Extract the stated scope.
- Retail centers with outparcels: outparcels (freestanding pad buildings) may or may not be included in the center's total GLA. Inclusion reduces the in-line tenants' shares.

**Cross-field validation:**
```
computed = rentable_square_footage / building_total_rsf * 100
if abs(pro_rata_share - computed) > 0.5:
    flag: "Stated pro rata share does not match computed ratio"
    check: is the denominator GLA, GLOA, or adjusted?
```

If the stated pro rata share is higher than the computed ratio, the landlord may be using a smaller denominator (anchor exclusion, GLOA, or remeasurement). If it is lower, the landlord may have rounded down favorably or the building was expanded after lease signing.

---

## cam_cap_percentage and cap_cumulative_vs_annual

**Schema:** Category 4, percentage and string, both optional, both CAM-relevant.

**What to look for:** A ceiling on annual increases to controllable operating expenses. The cap percentage alone is insufficient; the cap type (cumulative vs. non-cumulative) determines the mathematical formula.

**Common aliases:** Expense Ceiling, Controllable Cap, CAM Increase Limit, Operating Expense Cap, Controllable Expense Cap.

**Where it appears:** In the operating expenses article, typically in a subsection titled "Limitation on Controllable Expenses" or "Cap on Operating Expenses."

**Three mathematical structures:**

1. **Non-cumulative (year-over-year):** Each year's cap is computed from the prior year's actual expenses.
   ```
   cap_year_N = prior_year_actual * (1 + cap_rate)
   ```
   The tenant benefits because a spike in one year cannot compound forward. If Year 2 actual = $100K and cap = 5%, Year 3 cap = $105K regardless of what Years 1 or 3 actual expenses are.

2. **Cumulative compounding:** Each year's cap is computed from the base year, compounding annually. Unused headroom is banked.
   ```
   cap_year_N = base_year * (1 + cap_rate)^N + banked_amount
   ```
   Banking means that if actual expenses in Year 2 are only 2% above the base (below the 5% cap), the 3% unused headroom is available in Year 3. The landlord can then pass through up to 8% in Year 3.

3. **Cumulative linear:** Each year's cap grows linearly from the base year without compounding.
   ```
   cap_year_N = base_year * (1 + cap_rate * N)
   ```
   Less common but occasionally seen.

**The terminology trap:** "Cumulative" means different things in different sources. The ICSC uses "cumulative" to mean banking/carry-forward. Some attorneys use "cumulative" to mean linear growth from a fixed base. Some use "non-cumulative" to mean the cap resets each year to the prior year's actual (which is technically compounding, not non-cumulative). The only reliable approach is to parse the actual formula described in the lease text, not the label.

**Key phrases to identify cap type:**
- "over the prior year's actual" = non-cumulative
- "irrespective of whether actual expenses were less than the cap" = cumulative with banking
- "compounded annually" = cumulative compounding
- "from the Base Year" = cumulative (linear or compounding, check for compounding language)

**Controllable vs. uncontrollable scope:**
Most caps apply only to "controllable" expenses. Uncontrollable expenses (property taxes, insurance, utilities, snow removal, government-mandated costs) are typically excluded from the cap. Extract the scope: which expenses does the cap cover?

**Cross-field validation:**
- If `cam_cap_percentage` is present, `cap_cumulative_vs_annual` should also be extractable
- If `controllable_vs_noncontrollable_expenses` defines a split, the cap should reference only the controllable portion
- A cap above 10% is unusual and should be flagged for verification

---

## gross_up_percentage

**Schema:** Category 4, percentage, optional, CAM-relevant.

**What to look for:** The assumed occupancy level used to normalize variable operating expenses. Prevents tenants from subsidizing vacant space in partially occupied buildings.

**Common aliases:** Gross-Up Provision, Occupancy Adjustment, Deemed Occupancy, Grossed-Up Expenses.

**Where it appears:** In the operating expenses article, often in a subsection titled "Adjustment for Occupancy" or embedded within the definition of "Operating Expenses."

**Standard provision:**
> "If during any calendar year the Building is less than ninety-five percent (95%) occupied, those Operating Expenses that vary with occupancy shall be adjusted to reflect what they would have been had the Building been ninety-five percent (95%) occupied."

`gross_up_percentage` = 95.

**What can and cannot be grossed up:**

| Gross up (variable) | Do not gross up (fixed) | Gray area |
|---------------------|------------------------|-----------|
| Janitorial/cleaning | Property taxes | Window washing |
| Utilities (building-level) | Building insurance | Security |
| Trash removal | Landscaping | Building engineering staff |
| HVAC maintenance | Debt service | Management fees (if % of rent) |
| Elevator maintenance | | |

**The base year trap:** If a lease has a base year stop structure, the gross-up must apply to BOTH the base year and all comparison years. If only comparison years are grossed up but the base year is not, the base year expenses are artificially low (reflecting actual low occupancy), and the tenant pays increases caused by rising occupancy rather than rising costs.

**Edge cases:**
- Gross-up targets vary: 95% is most common, but 90% and 100% also appear. Some leases say "fully occupied" without specifying a percentage; in practice this means 95%.
- Below 60% actual occupancy, the gross-up formula becomes unreliable because the linear relationship between occupancy and variable costs breaks down. Flag buildings below 60% occupancy for manual review.
- Some leases gross up to the "greater of actual occupancy or 95%." This means the gross-up only applies when occupancy is below 95%, which is the correct approach.
- Variable-only gross-up: the protective clause explicitly limits gross-up to expenses that "vary with occupancy." Without this qualifier, the landlord may gross up fixed costs (taxes, insurance), which inflates the operating expense pool by 20-40% in low-occupancy buildings.

**Cross-field validation:**
- If `gross_up_percentage` is present and `base_year` is also present, check for `base_year_gross_up`
- If `lease_structure_type` is NNN and `gross_up_percentage` is absent, RF-005 fires

---

## base_year

**Schema:** Category 4, string, optional, CAM-relevant.

**What to look for:** The reference year whose operating expenses serve as the baseline for calculating the tenant's share of future increases. Only applicable to gross and modified gross leases.

**Common aliases:** Base Year Operating Expenses, Expense Stop, Base Year Stop, Operating Expense Base.

**Where it appears:** In the Basic Lease Information summary page and in the operating expenses article.

**Two forms:**
1. **Actual base year:** A specific calendar year (e.g., "2024"). The operating expenses for that year, once finalized, become the baseline. The actual number is unknown at lease signing.
2. **Stipulated base year (expense stop):** A fixed dollar amount per RSF (e.g., "$12.50 per RSF"). Known at signing. The tenant pays increases above this fixed amount.

**Extraction guidance:** If the lease says "Base Year: 2024," extract "2024." If the lease says "Expense Stop: $12.50/RSF," extract "$12.50/RSF" and note that this is a stipulated amount, not a calendar year.

**Edge cases:**
- First partial year: if the lease commences July 1, 2024, the first partial year should NOT serve as the base year because partial-year expenses understate annual costs. Well-drafted leases specify "the first full calendar year following the Commencement Date" (which would be 2025).
- Gross-up of the base year: if the building was partially occupied in the base year, variable expenses must be grossed up to the target occupancy level. See `base_year_gross_up`.
- One-time expenses in the base year: unusual expenses (major repair, legal settlement, construction disruption) in the base year inflate the baseline and benefit the tenant. Some leases exclude "non-recurring" expenses from the base year calculation.
- Multiple base years: some modified gross leases use different base years for different expense categories (e.g., "Operating Expense Base Year: 2024; Tax Base Year: 2023"). Extract each separately.

**Cross-field validation:**
- If `base_year` is present, `lease_structure_type` should be "gross" or "modified gross," not "NNN"
- If `base_year` is a calendar year and `commencement_date` is available, verify the base year is the commencement year or the first full calendar year following
- If `base_year` is present, check for `base_year_gross_up`

---

## management_fee_cap

**Schema:** Category 4, percentage, optional, CAM-relevant.

**What to look for:** The maximum percentage the landlord can charge for property management as a component of operating expenses.

**Common aliases:** Admin Fee Limit, Management Fee, Property Management Fee Cap, Supervisory Fee.

**Where it appears:** In the operating expenses definitions or in a specific management fee section within the CAM article.

**Industry benchmarks:**
- Office: 3-5% of operating expenses (IREM benchmark: 3.62% of gross rents)
- Retail: 5-15% of operating costs (15% is "high")
- Industrial: 2-4% of operating expenses (IREM: 3.77% of gross rents)
- On-site management: 3-5% of operating expenses

**The fee-on-fee problem:** If the management fee is calculated as a percentage of "total operating expenses" and the management fee itself is included in total operating expenses, the fee is circular. The correct calculation excludes the fee from its own base:

```
Correct:  fee = base_expenses * rate          (base excludes the fee)
Circular: fee = (base + fee) * rate           (base includes the fee)
Algebraic correction: fee = (rate * base) / (1 - rate)
```

At 5% rate on $1M base: correct fee = $50,000; circular fee = $52,632; overcharge = $2,632.
At 15% rate on $1M base: correct fee = $150,000; circular fee = $176,471; overcharge = $26,471.

**Edge cases:**
- Self-managing landlords: if the landlord does not employ a third-party management company, they may still charge a management fee. Some leases require that the fee be "actually paid" to a management entity, which prevents self-management fees.
- Layered fees: some leases have both a "management fee" and an "administrative fee" or "supervisory fee." These can stack: a 5% management fee plus a 7.5% supervisory fee applied on top of management equals 12.875% effective.
- Fee basis: "4% of gross revenues" vs. "4% of operating expenses" vs. "4% of base rent" produce very different dollar amounts. Extract the basis, not just the percentage.
- No cap stated: the absence of a management fee cap (RF-001) means the landlord can charge any amount. Common in poorly negotiated leases.

**Cross-field validation:**
- `management_fee_cap` > 15% triggers RF-001
- `management_fee_cap` absent triggers RF-001
- If present, note the basis (gross revenue, operating expenses, or base rent)

---

## escalation_type and fixed_escalation_rate

**Schema:** Category 3 (Rent & Escalations), string and percentage, escalation_type is required.

**What to look for:** The methodology for rent increases over the lease term and the specific rate if fixed.

**Common aliases for escalation_type:** Annual Adjustment, Rent Increase, Rent Escalation, CPI Adjustment, Cost of Living Adjustment (COLA), Step Rent, Bumps.

**Classification values:** Extract one of: "fixed percentage," "CPI-based," "fair market value," "stepped schedule," "fixed dollar amount," or "none."

**Where it appears:** In the Rent article, typically in a subsection titled "Annual Adjustments" or "Rent Increases." Rent schedules are often in the Basic Lease Information or an attached exhibit.

**Fixed percentage:**
> "Base Rent shall increase by three percent (3%) per annum on each anniversary of the Rent Commencement Date."

`escalation_type` = "fixed percentage", `fixed_escalation_rate` = 3%.

**CPI-based:**
> "Base Rent shall be adjusted annually based on the percentage increase in the CPI-U, All Items, published by the Bureau of Labor Statistics, with a floor of 2% and a cap of 5%."

`escalation_type` = "CPI-based", `cpi_index_reference` = "CPI-U, All Items, BLS." Extract floor and ceiling as part of the CPI terms.

**Stepped schedule:**
> "Year 1: $25.00/RSF; Year 2: $25.75/RSF; Year 3: $26.52/RSF..."

`escalation_type` = "stepped schedule." The specific amounts should be recorded. Compute the implicit escalation rate: ($25.75 - $25.00) / $25.00 = 3.0%.

**Fair market value reset:**
> "At the commencement of each Renewal Term, Base Rent shall be adjusted to the then-prevailing fair market rental value of the Premises."

`escalation_type` = "fair market value." No fixed rate can be extracted.

**Fixed dollar amount:**
> "Base Rent shall increase by $0.50 per RSF per annum."

`escalation_type` = "fixed dollar amount." The `fixed_escalation_rate` field does not apply; record the dollar amount in the escalation description.

**Edge cases:**
- Blended escalation: "3% annual increase for Years 1-5, then CPI-based for Years 6-10." Extract the primary escalation type for the initial term.
- Compounding vs. simple: "3% annual increase" almost always means compounding (3% of the prior year's rent). "3% of the initial Base Rent" means simple (the same dollar amount each year). The default interpretation is compounding unless the lease specifies otherwise.
- CPI lookback period: some leases use the CPI change from the preceding 12 months; others use a specific month-to-month comparison. Extract the lookback methodology.

**Cross-field validation:**
- If `escalation_type` is "fixed percentage" and `fixed_escalation_rate` is absent, flag as incomplete
- If `escalation_type` is "CPI-based" and `cpi_index_reference` is absent, flag as incomplete
- `fixed_escalation_rate` > 5% is unusual for office/industrial and should be verified

---

## lease_structure_type

**Schema:** Category 4 (CAM & Operating Expenses), string, required, CAM-relevant.

**What to look for:** The classification of how operating expenses are shared between landlord and tenant.

**Classification values:** "Triple Net (NNN)," "Double Net (NN)," "Single Net (N)," "Gross (Full Service)," "Modified Gross," "Absolute Net (Bondable)," "Percentage."

**Where it appears:** The lease title, the Basic Lease Information, or the rent article. However, the title may not match the actual structure. Always classify based on the operative provisions, not the title.

**Classification decision tree:**
1. Does the tenant pay pro rata share of ALL operating expenses (taxes, insurance, CAM)? Yes = NNN.
2. Does the tenant pay pro rata share of some but not all operating expenses? Yes = Modified Gross or Double Net.
3. Does the tenant pay a single base rent that includes all operating expenses, with escalations only above a base year? Yes = Gross.
4. Is the tenant responsible for literally everything including structural repairs, roof, and capital replacements? Yes = Absolute Net / Bondable.
5. Is there percentage rent tied to gross sales? Additional classification = Percentage (overlay on NNN or Modified Gross).

**Edge cases:**
- "NNN" in the title but landlord pays insurance: this is actually a Double Net lease. Classify based on actual expense allocation.
- "Gross" in the title but tenant pays electric separately: this is Modified Gross. The electricity carve-out is a modification to the gross structure.
- "Modified Gross" with no further specification: determine exactly which expenses are included in base rent and which are passed through. The specific modification varies by lease.
- "Industrial Gross" or "Industrial Net": regional terminology. In some markets, "Industrial Gross" means the landlord pays property taxes and insurance but the tenant pays everything else (effectively Double Net).

**Cross-field validation:**
- If classified as NNN, `pro_rata_share` should be present
- If classified as Gross, `base_year` should be present
- If classified as NNN, `base_year` should typically be absent
- If classified as Modified Gross, note which specific expenses are included vs. excluded

---

## audit_rights

**Schema:** Category 4, boolean, required, CAM-relevant.

**What to look for:** Whether the tenant has a contractual right to examine the landlord's books and records for operating expenses.

**Common aliases:** Right to Audit, Inspection Rights, Tenant Audit, Review Rights, Access to Records.

**Where it appears:** In the operating expenses article, often in a subsection near the end titled "Audit Rights," "Tenant's Right to Review," or "Records and Inspection."

**What to extract beyond the boolean:**
While the schema field is boolean, the extraction should capture and store the following details for the red flag engine and CamAudit funnel:
- **Scope:** Can the tenant audit all operating expenses or only specific categories?
- **Timeline:** How many days after receiving the reconciliation statement does the tenant have to initiate an audit? (maps to `cam_audit_deadline_days`)
- **Cost recovery threshold:** If the audit reveals an overcharge exceeding X%, the landlord reimburses audit costs. Common thresholds: 3-5%.
- **Auditor qualifications:** Can the tenant use any representative, or must it be a CPA? Are contingency-fee auditors permitted?
- **Confidentiality:** Is the tenant required to keep audit findings confidential? (This is landlord-favorable and limits the tenant's ability to share findings with other tenants.)
- **Base year audit:** Does the audit right extend to the base year, or only comparison years?

**Edge cases:**
- Implied audit rights: in some jurisdictions (notably California, per *McClain v. Octagon Plaza, LLC*), tenants have an implied right to inspect CAM records under the covenant of good faith and fair dealing, even if the lease is silent. However, implied rights are weaker than contractual rights. If the lease is silent, `audit_rights` = false, but note the jurisdictional implied right.
- Audit rights with confidentiality gag: "Tenant shall keep the results of any such audit strictly confidential." This is a meaningful limitation. Extract and flag.
- Self-audit only: "Tenant may review Landlord's records" without the right to engage a professional auditor. This is a weaker version of audit rights. Still extract as true but note the limitation.

**Cross-field validation:**
- `audit_rights` = false triggers RF-002
- If `audit_rights` = true and `cam_audit_deadline_days` < 60, RF-015 fires
- If `audit_rights` = true but no deadline is specified, `cam_audit_deadline_days` should be null (not zero)

---

## holdover_rate

**Schema:** Category 9 (Default & Remedies), percentage, required.

**What to look for:** The multiplier applied to base rent if the tenant remains in possession after the lease expires. Expressed as a percentage of the then-current base rent.

**Common aliases:** Overstay Penalty, Holdover Rent, Holdover Premium.

**Where it appears:** In the Default & Remedies article or a standalone "Holdover" section near the end of the lease.

**Extraction guidance:** The holdover rate is typically stated as "X% of the Base Rent in effect during the last month of the Term." Extract the percentage. Common values:
- 125%: tenant-favorable
- 150%: market standard
- 200%: landlord-favorable
- 250-300%: aggressive/punitive

**Edge cases:**
- Holdover with consent vs. without consent: some leases have different rates. "If Tenant holds over without Landlord's consent, Tenant shall pay 200% of Base Rent. If Tenant holds over with Landlord's written consent, Tenant shall pay 125% of Base Rent." Extract the without-consent rate as the primary `holdover_rate`.
- Holdover as month-to-month tenancy: "Tenant shall become a month-to-month tenant at 150% of Base Rent." This creates a month-to-month tenancy terminable by either party on 30 days' notice, rather than a trespasser situation.
- Progressive holdover: "150% for the first 60 days, 200% thereafter." Extract the initial rate and note the progression.
- Holdover includes additional rent: "During any holdover period, Tenant shall pay 150% of Base Rent and shall continue to pay all Additional Rent." The holdover multiplier applies to base rent only; additional rent (CAM, taxes, insurance) continues at 100%.

**Cross-field validation:**
- `holdover_rate` > 200 triggers RF-008
- `holdover_rate` < 100 is unusual and should be verified (tenant paying less during holdover than during the term would be extraordinary)

---

## restoration_requirement

**Schema:** Category 6 (Tenant Improvements & Construction), boolean, required.

**What to look for:** Whether the tenant must remove improvements and return the space to its pre-tenancy condition upon lease expiration.

**Common aliases:** Surrender Condition, Restoration Obligation, Removal Obligation, Reinstatement.

**Where it appears:** In the "Surrender of Premises" or "Condition at End of Term" section, typically near the end of the lease.

**Three common forms:**

1. **Full restoration:** "Tenant shall remove all Tenant's alterations and improvements and restore the Premises to the condition existing on the Commencement Date."
   `restoration_requirement` = true.

2. **Partial restoration:** "Tenant shall remove only those alterations that Landlord designates for removal in writing at the time Landlord approves the alteration."
   `restoration_requirement` = true, but scope is limited.

3. **No restoration:** "All alterations and improvements made by Tenant shall become the property of Landlord upon installation and shall remain in the Premises upon expiration."
   `restoration_requirement` = false.

**Edge cases:**
- TI allowance exemption: improvements constructed with the landlord's TI allowance are often exempt from restoration requirements because the landlord funded them. Check for this carve-out.
- "Reasonable wear and tear excepted": standard language that does not negate the restoration requirement. The tenant must still restore, but is not liable for normal aging of materials.
- Designated-for-removal ambiguity: if the lease says Landlord will designate items for removal "at the time of Landlord's approval of the alteration," but the landlord never designates, is the tenant obligated to remove? Courts are split. Flag as medium confidence.
- Hazardous materials remediation: tenants who use or store hazardous materials (dry cleaners, auto repair, manufacturing) typically have additional environmental restoration obligations that go beyond physical restoration.

**Cross-field validation:**
- If `restoration_requirement` = true and `tenant_work_description` is null, RF-010 fires (scope of work undefined)

---

## has_termination_option

**Schema:** Category 5 (Options), boolean, required.

**What to look for:** Whether the tenant has the contractual right to terminate the lease before the natural expiration date.

**Common aliases:** Early Termination, Break Right, Kick-Out Clause, Cancellation Option.

**Where it appears:** In the Options article or a standalone "Termination Option" section.

**Extraction guidance:** Look for language granting the tenant the right to end the lease before expiration. The termination right is almost always conditioned on:
1. Advance written notice (typically 6-12 months)
2. Payment of a termination fee (unamortized TI costs, leasing commissions, and/or a rent penalty)
3. No existing default at the time of exercise

**Edge cases:**
- Mutual termination: "Either party may terminate this Lease upon 12 months' notice." This is a termination right even though it is mutual. `has_termination_option` = true.
- Casualty/condemnation termination: most leases allow termination if the premises are substantially destroyed or condemned. These are standard force majeure provisions, not negotiated termination options. Do NOT classify casualty/condemnation termination rights as `has_termination_option` = true. The field captures voluntary, elective termination only.
- Co-tenancy triggered termination: in retail leases, the failure of co-tenancy conditions may give the tenant a termination right. This IS a termination option. `has_termination_option` = true.
- Termination upon relocation: some leases give the landlord the right to relocate the tenant to comparable space. If the tenant can refuse relocation and terminate instead, that is a form of termination right.
- Expansion failure termination: "If Landlord fails to deliver the Expansion Space by [date], Tenant may terminate this Lease." This is a conditional termination right triggered by the landlord's failure.

**Cross-field validation:**
- If `has_termination_option` = false and `lease_term_months` > 60, RF-009 fires
- If `has_termination_option` = true, `termination_penalty` should ideally be extractable

---

## security_deposit_amount

**Schema:** Category 14 (Miscellaneous), currency, required.

**What to look for:** The total collateral held by the landlord as security for the tenant's lease obligations.

**Common aliases:** Deposit, Letter of Credit Amount, Security, Collateral.

**Where it appears:** In the Basic Lease Information summary and in a dedicated "Security Deposit" article.

**Two primary forms:**

1. **Cash deposit:** Tenant delivers a cash amount that the landlord holds in an account. Some states require the landlord to hold it in a separate interest-bearing account and return it with interest.

2. **Letter of credit (LOC):** Tenant provides an irrevocable standby LOC from a qualifying bank. The LOC is typically for a higher amount than an equivalent cash deposit because the landlord values cash more highly than a LOC. LOC terms include the issuing bank, expiration date, auto-renewal provisions, and draw conditions.

**Edge cases:**
- Burn-down provisions: the deposit amount decreases over time if the tenant performs well. "The Security Deposit shall be reduced by $25,000 on each anniversary of the Commencement Date, provided Tenant is not in default, until the Security Deposit equals $50,000." Extract the initial amount.
- Multiple deposits: the tenant may post both a cash deposit and a LOC, or the lease may require separate deposits for different obligations (rent security vs. environmental remediation security). Extract the total.
- Good guy guaranty (New York): a personal guaranty that terminates when the tenant vacates and surrenders the premises in good condition. This functions as a form of security deposit but is technically a guaranty. Extract under `has_guaranty` and `guarantor_name`, not as a security deposit.
- Deposit as last month's rent: some leases allow the tenant to apply the security deposit to the last month's rent. This should not affect the extracted amount but is worth noting.

**Cross-field validation:**
- `security_deposit_amount` should be proportional to rent (commonly 1-6 months of base rent)
- If `security_deposit_type` is "letter of credit," the amount may be higher than a typical cash deposit
- If `security_deposit_amount` is zero or absent, verify that the lease does not require a deposit (some creditworthy tenants negotiate zero deposits)

---

## Additional Complex Fields

### reconciliation_frequency

**What to look for:** How often the landlord reconciles estimated CAM payments against actual expenses.

**Standard:** Annual reconciliation, delivered within 90-120 days after the end of the calendar year.

**Edge cases:**
- No stated frequency: if the lease requires NNN payments but does not specify reconciliation timing, `reconciliation_frequency` = null. RF-014 fires.
- Semi-annual or quarterly: less common but occasionally seen in large leases. Extract the stated frequency.
- "Landlord shall use commercially reasonable efforts to deliver the annual reconciliation within 120 days of year-end": this establishes annual frequency with a soft deadline.

### controllable_vs_noncontrollable_expenses

**What to look for:** The delineation of which expenses are subject to the CAM cap (controllable) and which are uncapped (non-controllable).

**Standard controllable expenses:** Management fees, janitorial, landscaping, general repairs, security, supplies, administrative costs.

**Standard non-controllable expenses:** Property taxes, insurance premiums, utilities, snow/ice removal, government-mandated costs, union labor rates.

**Edge cases:**
- Reclassification: a landlord may reclassify an expense from controllable to non-controllable to evade the cap. If janitorial costs ($120K, controllable) are reclassified as "building services" (non-controllable), the cap no longer constrains that cost.
- Utilities straddling the line: in some leases, utilities are controllable; in others, they are non-controllable. The lease language controls, not industry custom.

### cam_estimate_method

**What to look for:** How the landlord calculates the monthly estimated CAM payments that the tenant pays in advance of the annual reconciliation.

**Three common methods:**
1. **Prior year actuals:** Monthly estimate = prior year's actual CAM / 12. Simple and transparent.
2. **Budget-based:** The landlord prepares an annual budget and bills 1/12 each month. Allows the landlord to anticipate cost increases.
3. **Fixed amount:** A flat monthly amount stated in the lease. Does not change until reconciliation.

**Edge cases:**
- Mid-year adjustment: some leases allow the landlord to adjust estimates mid-year if actual costs are running significantly above or below budget. Extract whether mid-year adjustments are permitted.
- No method stated: if the lease requires estimated payments but does not describe how they are calculated, the landlord has broad discretion. Flag as a gap.
