# Red Flag Rules -- Detailed Reference

Full specs for all 20 red flag detection rules (RF-001 through RF-020). These rules run post-extraction against the 126-field schema output. Source: `packages/extract-sdk/src/extract_sdk/red_flags.py`.

> **Ground truth priority:** This file reflects the PRD specification. When code is implemented, trust the code over this file for behavioral details.

---

## Severity Levels

| Severity | Meaning | UI Treatment |
|---|---|---|
| **High** | Direct financial risk or missing critical tenant protection | Red badge, prominent placement, immediate attention recommended |
| **Medium** | Unfavorable clause that may cause financial exposure over time | Yellow badge, review recommended |
| **Low** | Missing convenience feature or suboptimal term | Gray/blue badge, informational |

---

## CamAudit Trigger Rules

Rules that trigger the CamAudit upsell CTA are marked with **[CamAudit Trigger]**. When any of these fire, the CamAudit funnel CTA is activated in the results view, export footer, and post-extraction email.

CamAudit-triggering rules: RF-001, RF-002, RF-003, RF-004, RF-005, RF-006, RF-013, RF-014, RF-015.

Additionally, the CamAudit CTA fires if:
- `audit_rights == true` (tenant CAN audit -- suggest they use CamAudit to do it)
- `lease_structure_type` is NNN or Modified Gross
- 3+ CAM-relevant fields have Medium or Low confidence

---

## RF-001: Excessive Management Fee **[CamAudit Trigger]**

**Severity:** High
**Condition:** `management_fee_cap > 15%` OR `management_fee_cap` is null/missing
**Fields involved:** `management_fee_cap` (CAM & Operating Expenses category)

**Description:** Management fees above 15% of gross revenues are considered exploitative in commercial leasing. A missing cap means the landlord can charge unlimited management fees, which is a significant financial risk for tenants.

**Why this matters:** IREM benchmarks show typical management fees of 3-5% for office and industrial properties. Retail management fees range 5-15% (ICSC). Fees above 15% are outliers that warrant scrutiny. When no cap exists, management fees can quietly inflate CAM charges year after year.

**CamAudit connection:** CamAudit's Rule 3 (Management Fee Overcharge) detects when actual billed fees exceed the lease-permitted percentage. Lextract flags the lease-level risk; CamAudit quantifies the dollar impact.

**Upsell message:** "Management fees over 15% cost tenants thousands. CamAudit identifies exactly how much."

---

## RF-002: Missing Audit Rights **[CamAudit Trigger]**

**Severity:** High
**Condition:** `audit_rights == false` OR `audit_rights` not found in extraction
**Fields involved:** `audit_rights` (CAM & Operating Expenses category)

**Description:** Without audit rights, the tenant has no legal mechanism to verify the landlord's CAM charges. This is a major liability in any NNN or modified gross lease where operating expenses are passed through to the tenant.

**Why this matters:** Industry data shows 30-40% of CAM statements contain errors (IREM, Tango Analytics). Without audit rights, tenants cannot challenge these errors. Even when common law may imply audit rights in some jurisdictions, explicit contractual rights are far stronger.

**CamAudit connection:** CamAudit performs the actual forensic audit. If audit rights exist, the handoff message is "You have audit rights -- use them with CamAudit." If they are missing, the message shifts to "Without audit rights, you cannot verify charges. CamAudit can help you negotiate."

**Upsell message:** "Without audit rights, you cannot verify CAM charges. CamAudit can help you negotiate."

---

## RF-003: No CAM Cap **[CamAudit Trigger]**

**Severity:** High
**Condition:** `cam_cap_percentage` is null/missing
**Fields involved:** `cam_cap_percentage` (CAM & Operating Expenses category)

**Description:** No ceiling on annual CAM increases means unlimited exposure. CAM charges can increase by any amount year over year, leaving the tenant with no financial predictability.

**Why this matters:** Without a cap, landlords can pass through 100% of cost increases -- including insurance premium spikes (which increased 10-20% annually in 2023-2024 per CIAB data), property tax reassessments, and utility cost inflation. A typical CAM cap range is 3-6% annually (Cox Castle analysis).

**CamAudit connection:** CamAudit's Rule 6 (CAM Cap Violation) detects when actual charges exceed the cap. If no cap exists, there is nothing to violate -- which is precisely the problem.

**Upsell message:** "Uncapped CAM means unlimited annual increases. See what you are actually paying with CamAudit."

---

## RF-004: Cumulative CAM Cap **[CamAudit Trigger]**

**Severity:** Medium
**Condition:** `cam_cap_type == "cumulative"`
**Fields involved:** `cam_cap_type` (CAM & Operating Expenses category)

**Description:** Cumulative (compounding) caps heavily favor the landlord over non-cumulative (annual reset) caps. With cumulative caps, unused cap room from low-increase years carries forward, allowing larger increases in later years.

**Why this matters:** The math is counterintuitive. With a 5% cumulative cap, if year 1 CAM increases by only 2%, the landlord banks the unused 3%. In year 2, the landlord can increase by up to 8% (5% + 3% carryover). Over a 5-year lease, the cumulative cap allows significantly higher total charges than an annual reset cap at the same percentage.

**CamAudit connection:** CamAudit's Rule 6 supports all three cap types: NON_CUMULATIVE, CUMULATIVE (linear), and CUMULATIVE_COMPOUNDING. Lextract flags the lease structure; CamAudit verifies compliance.

**Upsell message:** "Cumulative caps compound year-over-year, heavily favoring the landlord. CamAudit calculates the real impact."

---

## RF-005: No Gross-Up Provision **[CamAudit Trigger]**

**Severity:** Medium
**Condition:** `gross_up_percentage` is null AND `lease_structure_type` contains "NNN"
**Fields involved:** `gross_up_percentage`, `lease_structure_type` (CAM & Operating Expenses category)

**Description:** In partially occupied buildings, variable expenses (janitorial, utilities) are lower because fewer tenants are present. Without a gross-up provision, the existing tenants pay a disproportionate share of these costs based on actual (lower) expenses rather than what expenses would be at full occupancy.

**Why this matters:** If a building is 70% occupied and there is no gross-up clause, the existing tenants collectively pay 100% of variable expenses that would be lower at full occupancy. A gross-up provision normalizes expenses to a standard occupancy level (typically 95%), ensuring fair allocation.

**CamAudit connection:** CamAudit's Rule 5 (Gross-Up Violation) detects gross-up application issues. If no gross-up exists in the lease, Lextract flags the structural risk.

---

## RF-006: Missing CAM Exclusions **[CamAudit Trigger]**

**Severity:** High
**Condition:** `cam_exclusions` is empty array
**Fields involved:** `cam_exclusions` (CAM & Operating Expenses category)

**Description:** Without capital expenditure carve-outs and other exclusions, the landlord can pass through virtually any building expense as CAM. This includes major capital improvements (roof replacement, structural repairs), landlord overhead, legal fees, and other costs that should be the landlord's responsibility.

**Why this matters:** CapEx improperly billed as CAM appears in approximately 25-35% of audited reconciliations (industry practitioner estimates). Without exclusions, there is no contractual basis to challenge these charges. Standard exclusions typically include: capital expenditures, landlord overhead, leasing commissions, above-standard tenant improvements, and lawsuit costs.

**CamAudit connection:** CamAudit's Rule 2 (Excluded Service Charges) detects items that the lease explicitly excludes. If the lease has no exclusions, every charge is technically permissible -- which is the worst possible position for a tenant.

**Upsell message:** "Without exclusions, capital expenditures can be passed through. CamAudit flags every improper charge."

---

## RF-007: Short Cure Period

**Severity:** Medium
**Condition:** `monetary_cure_period < 10` days
**Fields involved:** `monetary_cure_period` (Default & Remedies category)

**Description:** Insufficient time to remedy payment defaults. A cure period under 10 days leaves very little margin for administrative delays, banking issues, or simple oversights.

**Why this matters:** Standard commercial lease cure periods are typically 10-30 days for monetary defaults and 30-60 days for non-monetary defaults. A cure period under 10 days means a delayed rent check (even due to bank processing) could trigger a default event with serious consequences including lease termination and acceleration of remaining rent.

---

## RF-008: Aggressive Holdover Rate

**Severity:** Medium
**Condition:** `holdover_rate > 200%`
**Fields involved:** `holdover_rate` (Default & Remedies category)

**Description:** Punitive holdover penalties exceeding 200% of base rent. While holdover rates are designed to be punitive (to encourage timely vacating), rates above 200% are unusually aggressive.

**Why this matters:** Typical commercial holdover rates range from 125% to 200% of the last month's base rent. Rates exceeding 200% create extreme financial pressure during any transition period and may indicate an adversarial lease posture. Combined with consequential damages liability (if the landlord has a waiting tenant), holdover exposure can be devastating.

---

## RF-009: No Termination Option

**Severity:** Low
**Condition:** `has_termination_option == false` AND `lease_term_months > 60`
**Fields involved:** `has_termination_option`, `lease_term_months` (Options category, Key Dates & Term category)

**Description:** A long-term lease (5+ years) with no early termination option represents high commitment risk. Business conditions can change significantly over a 5-10 year period.

**Why this matters:** While landlords prefer long-term commitments without termination rights, tenants benefit from having an exit mechanism (even with a penalty) in case of business downturn, relocation needs, or strategic changes. The absence of this option is not inherently problematic for short leases but becomes a notable risk for terms exceeding 60 months.

---

## RF-010: Missing Restoration Clarity

**Severity:** Low
**Condition:** `restoration_requirement == true` AND `tenant_work_description` is null
**Fields involved:** `restoration_requirement` (Tenant Improvements & Construction), `tenant_work_description` (Tenant Improvements & Construction)

**Description:** Restoration is required but the scope of tenant's work is undefined. Without clear delineation of what the tenant built or modified, there is no objective standard for what must be restored upon lease termination.

**Why this matters:** Restoration costs can be significant (tens of thousands of dollars for commercial spaces). Ambiguity in restoration scope leads to disputes at lease end, with the landlord potentially demanding restoration of improvements the landlord actually requested or funded.

---

## RF-011: No Renewal Option

**Severity:** Low
**Condition:** `has_renewal_option == false`
**Fields involved:** `has_renewal_option` (Options category)

**Description:** No guaranteed right to extend occupancy. The tenant has no contractual protection against displacement at lease end.

**Why this matters:** Without a renewal option, the tenant must rely on the landlord's willingness to negotiate a new lease. This creates leverage imbalance at renewal time, as the tenant faces relocation costs and business disruption if the landlord refuses to renew or demands significantly higher rent.

---

## RF-012: Recapture Right Present

**Severity:** Medium
**Condition:** `recapture_right == true`
**Fields involved:** `recapture_right` (Assignment & Subletting category)

**Description:** The landlord can terminate the lease and take back the space when the tenant requests to assign or sublet. This effectively nullifies the tenant's assignment/subletting rights.

**Why this matters:** Recapture rights mean that any attempt by the tenant to transfer the lease triggers the landlord's option to simply terminate. This is particularly problematic for tenants who may need to exit early through assignment -- the recapture right removes this exit mechanism and captures any lease value (favorable rent) for the landlord.

---

## RF-013: No Base Year Gross-Up **[CamAudit Trigger]**

**Severity:** Medium
**Condition:** `base_year_gross_up == false` AND `base_year` is not null
**Fields involved:** `base_year_gross_up`, `base_year` (CAM & Operating Expenses category)

**Description:** Base year operating expenses are not normalized to full occupancy. If the base year occurs during low occupancy, variable expenses are artificially low, meaning future increases (above the understated base) are inflated.

**Why this matters:** If a building is 60% occupied during the base year, variable expenses (cleaning, utilities) are proportionally lower. Without gross-up normalization, the tenant's base year is set at this artificially low level. When occupancy rises to 95% in subsequent years, the tenant pays the full increase above the understated base -- effectively paying for the building filling up, not for actual cost inflation.

**CamAudit connection:** CamAudit's Rule 7 (Base Year Error) detects when un-grossed base years produce inflated future charges.

---

## RF-014: No Reconciliation Frequency **[CamAudit Trigger]**

**Severity:** Medium
**Condition:** `reconciliation_frequency` is null AND `lease_structure_type` contains "NNN"
**Fields involved:** `reconciliation_frequency`, `lease_structure_type` (CAM & Operating Expenses category)

**Description:** No defined CAM reconciliation schedule in a NNN lease. Without a reconciliation requirement, the landlord has no obligation to provide annual accountings of actual vs. estimated charges.

**Why this matters:** CAM reconciliation is the mechanism by which tenants verify they are paying the correct amount. Without a defined frequency (typically annual), the landlord can delay or avoid reconciliation entirely, preventing the tenant from identifying overcharges or receiving credits for overpayment.

**CamAudit connection:** CamAudit requires reconciliation statements to perform its forensic audit. If no reconciliation frequency is defined, the tenant may not receive the statements needed to audit.

---

## RF-015: Short Audit Window **[CamAudit Trigger]**

**Severity:** Medium
**Condition:** `cam_audit_deadline_days < 60`
**Fields involved:** `cam_audit_deadline_days` (CAM & Operating Expenses category)

**Description:** Insufficient time to dispute CAM reconciliation statements. An audit deadline under 60 days from receipt makes it extremely difficult to engage professional auditors and complete a thorough review.

**Why this matters:** Professional CAM audits (even AI-powered ones) require time to gather documents, analyze charges, and prepare dispute correspondence. Standard audit windows in commercial leases range from 90 to 365 days. Windows under 60 days effectively deter tenants from exercising their audit rights by creating impossible timelines.

**CamAudit connection:** CamAudit processes audits quickly (minutes, not weeks), making it one of the few options viable within a short audit window. This is a strong conversion angle: "Your audit window is closing. CamAudit delivers results in minutes, not weeks."

---

## Rule Coverage by Category

| Category | Rules | Count |
|---|---|---|
| CAM & Operating Expenses | RF-001, RF-002, RF-003, RF-004, RF-005, RF-006, RF-013, RF-014, RF-015 | 9 |
| Default & Remedies | RF-007, RF-008 | 2 |
| Options | RF-009, RF-011 | 2 |
| Tenant Improvements & Construction | RF-010 | 1 |
| Assignment & Subletting | RF-012 | 1 |

The heavy concentration in CAM & Operating Expenses (9 of 20 rules) reflects the CamAudit funnel strategy -- these rules surface CAM-related risks that drive the upsell to forensic audit.

---

## Implementation Notes

- Rules are evaluated sequentially but are independent (no rule depends on another rule's output).
- Red flag detection is non-fatal -- if it errors, the extraction still succeeds. Errors are logged, not surfaced to the user.
- Rules fire against `extracted_data` JSONB -- they read field values from the extraction output.
- After user edits to extracted fields (via PATCH endpoint), red flags are re-evaluated against the updated values.
- Red flags are stored as a JSONB array in the `extractions.red_flags` column. Each entry contains: `rule_id`, `rule_name`, `severity`, `description`, `fields_involved`, `camaudit_trigger` (boolean).
