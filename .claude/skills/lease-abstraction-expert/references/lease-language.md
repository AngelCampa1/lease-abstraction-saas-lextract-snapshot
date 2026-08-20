# Lease Language -- Common Clause Patterns by Category

Organized by the 14 extraction categories. Each section shows typical language patterns the extractor encounters, standard vs. non-standard wording, property-type variations, and ambiguous clauses that reduce extraction confidence.

---

## 1. Parties & Property

### Typical Patterns

**Landlord identification (standard):**
> "This Lease Agreement ('Lease') is entered into by and between WESTFIELD PROPERTIES, LLC, a Delaware limited liability company ('Landlord'), and ACME CORPORATION, a California corporation ('Tenant')."

**Landlord identification (complex entity chain):**
> "BROOKFIELD ASSET MANAGEMENT INC., a Canadian corporation, as general partner of BROOKFIELD PROPERTY PARTNERS L.P., a Bermuda limited partnership, by its wholly owned subsidiary BPY BERMUDA HOLDINGS IV LIMITED ('Landlord')..."

When the entity chain spans multiple lines, extract the ultimate named entity that the lease defines as "Landlord" in parentheses or quotes.

**Premises description (office):**
> "The Premises shall consist of approximately 12,500 rentable square feet located on the 14th floor of the Building, as more particularly shown on Exhibit A attached hereto."

**Premises description (retail):**
> "The Demised Premises is that certain space designated as Space No. 114 in the Shopping Center, containing approximately 3,200 square feet of Gross Leasable Area."

**Premises description (industrial):**
> "Tenant hereby leases the Premises consisting of Building 4 at the Industrial Park, comprising approximately 45,000 square feet of warehouse and 5,000 square feet of office space, totaling 50,000 rentable square feet."

**Building total area:**
> "The Building contains approximately 285,000 rentable square feet."

Or indirectly via pro rata share:
> "Tenant's Pro Rata Share is 4.39%, based upon 12,500 square feet of Premises and 285,000 square feet of total Building area."

### Non-Standard Wording

**"Approximately" qualifier:** Nearly universal. Leases almost always state areas as "approximately" to avoid disputes over exact measurements. This should not lower confidence.

**Multiple measurement standards:**
> "The Premises contain 10,200 usable square feet and 11,730 rentable square feet as measured in accordance with the 2017 BOMA Standard."

Extract both figures and the measurement standard. If only one figure is given without specifying RSF or USF, check context: if a load factor or "common area factor" is mentioned, the figure is likely USF.

### Ambiguous Clauses (Lower Confidence)

> "The Premises shall be as shown on Exhibit A."

No square footage stated. Area can only be determined from the exhibit drawing. Flag `rentable_square_footage` as low confidence unless the exhibit contains a stated area.

> "The Landlord reserves the right to remeasure the Premises and adjust Tenant's Pro Rata Share accordingly."

Unilateral remeasurement rights mean the extracted RSF and pro rata share could change. Note this caveat but extract the current stated values.

---

## 2. Key Dates & Term

### Typical Patterns

**Fixed commencement date:**
> "The Term of this Lease shall commence on January 1, 2025 ('Commencement Date') and shall expire on December 31, 2029 ('Expiration Date'), unless sooner terminated in accordance with the terms hereof."

**Contingent commencement date:**
> "The Commencement Date shall be the earlier of (a) the date of Substantial Completion of Landlord's Work, as defined in the Work Letter, or (b) the date Tenant opens for business in the Premises, or (c) one hundred eighty (180) days after the date of this Lease."

Extract the formula when the date is contingent. If a later amendment or Commencement Date Agreement confirms the actual date, that confirmed date is the extraction target.

**Rent commencement with abatement:**
> "Notwithstanding the Commencement Date, Tenant's obligation to pay Base Rent shall not commence until the date that is ninety (90) days after the Commencement Date (the 'Rent Commencement Date'). During such ninety (90) day period, Tenant shall be responsible only for its Pro Rata Share of Operating Expenses."

Extract `rent_commencement_date` as "90 days after Commencement Date" and `rent_abatement_period` as "90 days" or "3 months."

**Lease term stated in years:**
> "The initial term of this Lease shall be for a period of seven (7) years."

Convert to months: `lease_term_months` = 84.

### Property Type Variations

**Office:** Commencement often tied to substantial completion of landlord's build-out. Free rent periods of 3-12 months are common for new construction.

**Retail:** Commencement may be tied to co-tenancy requirements: "The Commencement Date shall not occur until such time as the Anchor Tenant has opened for business." This creates an uncertain start date.

**Industrial:** Commencement is typically fixed because industrial spaces are delivered in shell condition with minimal landlord work.

**Medical:** Extended build-out periods (6-12 months) are common due to regulatory requirements. Possession dates often precede commencement dates by several months.

### Ambiguous Clauses (Lower Confidence)

> "The Lease shall be for a term of approximately five (5) years."

"Approximately" applied to a lease term is unusual and introduces genuine ambiguity. Flag `lease_term_months` as medium confidence.

> "The Commencement Date has been established as set forth in the Commencement Date Agreement to be executed by the parties."

If the Commencement Date Agreement is not attached to the document, `commencement_date` cannot be extracted. Mark as low confidence.

---

## 3. Rent & Escalations

### Typical Patterns

**Annual base rent (per RSF):**
> "Tenant shall pay to Landlord Base Rent in the amount of Twenty-Four and 50/100 Dollars ($24.50) per rentable square foot per annum, payable in equal monthly installments of $25,520.83."

**Rent schedule (stepped escalations):**
> "Base Rent shall be as follows:
> Months 1-12: $24.50/RSF/yr ($25,520.83/mo)
> Months 13-24: $25.24/RSF/yr ($26,291.67/mo)
> Months 25-36: $25.99/RSF/yr ($27,073.96/mo)"

Extract the Year 1 amount for `base_rent_annual`. The escalation type is "stepped" with the specific schedule.

**Fixed percentage escalation:**
> "Commencing on the first anniversary of the Rent Commencement Date, and on each anniversary thereafter during the Term, Base Rent shall increase by three percent (3%) over the Base Rent payable for the immediately preceding Lease Year."

`escalation_type` = "fixed percentage", `fixed_escalation_rate` = 3%.

**CPI escalation with floor and ceiling:**
> "Annual rent adjustments shall be calculated based upon the percentage change in the Consumer Price Index for All Urban Consumers (CPI-U), U.S. City Average, All Items, as published by the Bureau of Labor Statistics, with a minimum annual increase of 2% and a maximum annual increase of 5%."

`escalation_type` = "CPI", `cpi_index_reference` = "CPI-U, U.S. City Average, All Items", floor = 2%, ceiling = 5%.

**Percentage rent (retail):**
> "In addition to Base Rent, Tenant shall pay to Landlord as Percentage Rent an amount equal to six percent (6%) of Tenant's Gross Sales in excess of the Breakpoint Amount of One Million Dollars ($1,000,000) per Lease Year."

`percentage_rent_rate` = 6%, `sales_breakpoint_amount` = $1,000,000.

### Property Type Variations

**Office:** Fixed percentage (2-4% annual) or CPI-based escalations are standard. Rent schedules with specific annual amounts are also common.

**Retail:** Combination of fixed base rent escalations plus percentage rent above a breakpoint. The escalation structure may be different for the base rent component vs. the percentage rent component.

**Industrial:** Fixed escalations (2-3%) or CPI-based are typical. Industrial rents are lower per RSF, so the dollar impact of escalation type is less dramatic than office.

**Medical:** Often longer free rent periods and higher TI allowances offset by higher escalation rates (3-4% fixed).

### Ambiguous Clauses (Lower Confidence)

> "Rent shall be adjusted annually to reflect the fair market rental value of the Premises."

Fair market value resets are the hardest escalation type to extract because the future value is unknown. `escalation_type` = "fair market value." No specific rate can be extracted.

> "Base Rent shall increase by 3% per annum, compounded."

"Compounded" means the 3% applies to the prior year's already-increased rent, not the original base rent. This is standard for percentage escalations but worth noting: `escalation_type` = "fixed percentage (compounded)."

---

## 4. CAM & Operating Expenses

### Typical Patterns

**NNN structure declaration:**
> "This Lease is a 'triple net' lease and, except as otherwise expressly provided herein, it is the intention of the parties that the Base Rent shall be absolutely net to Landlord so that this Lease shall yield to Landlord the full amount of the installments of Base Rent throughout the Term, and that all costs, expenses and obligations relating to the Premises shall be paid by Tenant."

**Pro rata share (fixed):**
> "Tenant's Pro Rata Share shall be 7.50%, which has been calculated by dividing the Premises Rentable Area (7,500 square feet) by the Building Rentable Area (100,000 square feet)."

**Pro rata share (adjustable -- lower confidence):**
> "Tenant's Pro Rata Share shall be the ratio of the Rentable Area of the Premises to the total Rentable Area of the Building, as may be adjusted by Landlord from time to time."

**Base year (gross lease):**
> "The Base Year for purposes of calculating Tenant's Share of Operating Expense Increases shall be calendar year 2024."

**CAM cap (non-cumulative):**
> "Notwithstanding the foregoing, Controllable Operating Expenses shall not increase by more than five percent (5%) per annum over the prior year's Controllable Operating Expenses."

**CAM cap (cumulative/compounding):**
> "The Controllable Operating Expense Cap shall increase by five percent (5%) over the applicable Controllable Operating Expense Cap for the immediately preceding calendar year (irrespective of whether the actual Controllable Operating Expenses for the preceding calendar year was less than the amount of the applicable Controllable Operating Expense Cap for such preceding calendar year), such increase to be cumulative and compounded annually."

The presence of "irrespective of whether actual expenses were less than the cap" indicates banking/carry-forward, which is the hallmark of cumulative caps.

**Gross-up provision:**
> "If during any calendar year the Building is less than ninety-five percent (95%) occupied, Operating Expenses that vary with occupancy shall be adjusted by Landlord to the amount such expenses would have been if the Building had been 95% occupied."

`gross_up_percentage` = 95%.

**Management fee cap:**
> "Management fees included in Operating Expenses shall not exceed four percent (4%) of the gross revenues of the Building."

`management_fee_cap` = 4%.

**CAM exclusions (comprehensive):**
> "Operating Expenses shall not include: (a) capital expenditures and improvements, except to the extent amortized over the useful life of the improvement at a commercially reasonable interest rate; (b) depreciation; (c) mortgage interest, principal, or ground rent; (d) costs of leasing, marketing, or advertising; (e) leasing commissions and tenant improvement costs; (f) legal fees for lease negotiations or tenant disputes; (g) charitable or political contributions; (h) executive salaries above the property manager; (i) fines, penalties, or interest for late payment; (j) costs covered by insurance or warranties; (k) costs of correcting building code violations existing on the date of this Lease."

**Audit rights:**
> "Tenant shall have the right, at Tenant's sole cost and expense, to audit or cause to be audited Landlord's books and records pertaining to Operating Expenses for any calendar year within one hundred twenty (120) days following receipt of Landlord's annual reconciliation statement. If such audit reveals that Landlord has overcharged Tenant by more than five percent (5%), Landlord shall reimburse Tenant for the reasonable cost of such audit."

`audit_rights` = true, `cam_audit_deadline_days` = 120.

### Property Type Variations

**Office:** Gross or modified gross with base year stop is the dominant structure. Gross-up provisions are standard. CAM caps are less common than in retail.

**Retail:** NNN is standard. Detailed CAM exclusion lists, management fee caps, and audit rights are heavily negotiated. Controllable vs. uncontrollable expense distinctions are common. Reconciliation is typically annual.

**Industrial:** NNN is standard. Simpler operating expense structures because there are fewer shared services. Management fees are lower (2-4%). CAM exclusions focus on structural and capital items.

**Medical:** Often modified gross with specific exclusions for medical waste, specialized HVAC, and after-hours utility usage.

### Ambiguous Clauses (Lower Confidence)

> "CAM increases shall not exceed 5% per year."

This is the classic ambiguous cap language. Does "per year" mean: (a) 5% over the prior year's actual expenses? (b) 5% over the prior year's cap amount? (c) 5% over the base year, cumulated linearly? The industry has no consensus on what this means. Extract `cam_cap_percentage` = 5% but assign medium confidence and flag the ambiguity in `cam_cap_type` and `cap_cumulative_vs_annual`.

> "Landlord shall maintain the common areas in a manner consistent with other first-class office buildings in the metropolitan area."

This is a maintenance standard, not an expense definition. It does not tell you what is included in or excluded from operating expenses. Do not extract this as a CAM exclusion or inclusion.

> "Operating Expenses shall include all costs of every kind and nature incurred by Landlord."

Maximally broad definition with no exclusions. `cam_exclusions` = empty array. Triggers RF-006.

---

## 5. Options

### Typical Patterns

**Renewal option:**
> "Provided Tenant is not in default, Tenant shall have two (2) options to renew this Lease for additional periods of five (5) years each, upon the same terms and conditions except that Base Rent shall be adjusted to ninety-five percent (95%) of the then-prevailing Fair Market Rent."

`has_renewal_option` = true, `renewal_terms` = ["5 years at 95% FMV", "5 years at 95% FMV"].

**Renewal notice requirement:**
> "Tenant shall exercise each option by delivering written notice to Landlord not later than twelve (12) months prior to the expiration of the then-current Term."

`renewal_notice_days` = 365.

**Early termination option:**
> "Tenant may terminate this Lease effective as of the last day of the sixtieth (60th) month of the Term by providing not less than nine (9) months' prior written notice and paying to Landlord a termination fee equal to the unamortized portion of the Tenant Improvement Allowance and leasing commissions, plus three (3) months' Base Rent at the rate then in effect."

`has_termination_option` = true, `termination_penalty` = "unamortized TI + commissions + 3 months' rent."

**ROFR:**
> "If during the Term any space on the 14th or 15th floor of the Building becomes available for lease, Landlord shall present to Tenant the terms upon which Landlord is prepared to lease such space to a third party, and Tenant shall have fifteen (15) business days to elect to lease such space upon those same terms."

`rofr_space` = "14th and 15th floor of the Building."

### Ambiguous Clauses (Lower Confidence)

> "Tenant may have the option to renew, subject to mutual agreement of the parties."

This is not a true option because it requires mutual agreement. `has_renewal_option` should be false or flagged as medium confidence with a note that the "option" is actually a right to negotiate.

---

## 6. Tenant Improvements & Construction

### Typical Patterns

**TI allowance (per RSF):**
> "Landlord shall provide Tenant with a tenant improvement allowance in the amount of Forty-Five Dollars ($45.00) per rentable square foot of the Premises (the 'TI Allowance'), which Tenant shall use solely for the cost of designing and constructing Tenant's improvements."

`ti_allowance_per_rsf` = $45.00, `ti_allowance_amount` = $45.00 * RSF.

**Landlord's work:**
> "Prior to the Commencement Date, Landlord shall, at Landlord's sole cost and expense, deliver the Premises in 'Building Standard' condition, including: (a) building standard ceiling grid and tiles; (b) building standard lighting; (c) building standard HVAC distribution; (d) fire/life safety systems to code; and (e) demising walls to deck."

**Restoration requirement (clear):**
> "Upon the expiration or earlier termination of this Lease, Tenant shall, at Tenant's sole cost and expense, remove all of Tenant's trade fixtures, equipment, and personal property, and shall restore the Premises to the condition existing on the Commencement Date, reasonable wear and tear excepted. Notwithstanding the foregoing, Tenant shall not be required to remove any improvements constructed with the TI Allowance."

**HVAC responsibility (split):**
> "Tenant shall be responsible for the maintenance and repair of all HVAC units exclusively serving the Premises. Landlord shall be responsible for the replacement of such units when replacement is necessary due to normal wear and tear."

`hvac_responsibility` = "Tenant maintains; Landlord replaces."

### Property Type Variations

**Office:** High TI allowances ($30-$80/RSF). Landlord delivers to building standard or "warm shell." Restoration is typically limited to removal of non-standard improvements.

**Retail:** Lower TI or no TI ("vanilla box" delivery). Tenant builds out entire interior. Restoration often requires return to vanilla box condition.

**Industrial:** Minimal TI. "Cold shell" or "warm shell" delivery. Tenant improvements focus on specialized infrastructure (power, compressed air, crane systems).

### Ambiguous Clauses (Lower Confidence)

> "Tenant shall return the Premises in good condition."

"Good condition" is undefined. Does it mean original condition? Current condition minus wear? Flag `restoration_requirement` as true but note ambiguity.

---

## 7. Insurance & Indemnity

### Typical Patterns

**CGL requirements:**
> "Tenant shall maintain Commercial General Liability insurance with limits of not less than One Million Dollars ($1,000,000) per occurrence and Two Million Dollars ($2,000,000) in the annual aggregate."

**Property insurance bearer:**
> "Landlord shall maintain 'All Risk' or 'Special Form' property insurance covering the Building and all Building improvements at their full replacement cost."

`property_insurance_bearer` = "Landlord."

**Waiver of subrogation (mutual):**
> "Landlord and Tenant each hereby waive any and all rights of recovery against the other for any loss or damage covered by the insurance policies required to be maintained hereunder."

`waiver_of_subrogation` = true (mutual).

**Additional insured:**
> "Tenant's CGL policy shall name Landlord, Landlord's managing agent, and any mortgagee designated by Landlord as additional insureds."

### Property Type Variations

**Office:** Standard CGL limits ($1M/$2M). Landlord carries property insurance. Umbrella coverage may be required for large tenants.

**Retail:** Higher CGL limits for food-service tenants ($2M/$4M). Liquor liability may be required. Product liability may be specified.

**Industrial:** Environmental/pollution coverage may be required depending on the tenant's use. Higher CGL limits for manufacturing operations.

---

## 8. Assignment & Subletting

### Typical Patterns

**Consent not to be unreasonably withheld:**
> "Tenant shall not assign this Lease or sublease all or any portion of the Premises without the prior written consent of Landlord, which consent shall not be unreasonably withheld, conditioned, or delayed."

`consent_required` = true, `consent_standard` = "not to be unreasonably withheld, conditioned, or delayed."

**Sole discretion:**
> "Any assignment or sublease shall require the prior written consent of Landlord, which may be withheld in Landlord's sole and absolute discretion."

`consent_standard` = "sole and absolute discretion."

**Permitted transferees:**
> "Notwithstanding the foregoing, Tenant may assign this Lease or sublease all or any portion of the Premises without Landlord's consent to (a) any entity controlling, controlled by, or under common control with Tenant, (b) any successor by merger or consolidation, or (c) any purchaser of all or substantially all of Tenant's assets."

**Recapture right:**
> "If Tenant requests Landlord's consent to an assignment or sublease covering more than fifty percent (50%) of the Premises, Landlord shall have the right, exercisable within thirty (30) days of receipt of such request, to terminate this Lease as to the space proposed to be assigned or subleased."

`recapture_right` = true.

**Profit sharing:**
> "If Tenant receives rent or other consideration from any sublessee or assignee in excess of the rent payable by Tenant hereunder, Tenant shall pay to Landlord fifty percent (50%) of such excess after deducting Tenant's reasonable transaction costs."

`profit_sharing_percentage` = 50%.

---

## 9. Default & Remedies

### Typical Patterns

**Monetary cure period:**
> "If Tenant fails to pay any installment of Rent within five (5) days after written notice from Landlord that such payment is past due, Tenant shall be in default."

`monetary_cure_period` = 5 days.

**Non-monetary cure period:**
> "If Tenant breaches any non-monetary obligation under this Lease and fails to cure such breach within thirty (30) days after written notice from Landlord (or such longer period as may be reasonably necessary to complete such cure, provided Tenant commences cure within such 30-day period and diligently pursues the same to completion)..."

`non_monetary_cure_period` = 30 days (with extension for diligent pursuit).

**Holdover:**
> "If Tenant remains in possession of the Premises after the expiration of the Term without the express written consent of Landlord, Tenant shall pay Base Rent equal to one hundred fifty percent (150%) of the Base Rent in effect during the last month of the Term."

`holdover_rate` = 150%.

**Late fee:**
> "If any installment of Rent is not received by Landlord within five (5) days after the due date, Tenant shall pay a late charge equal to five percent (5%) of the overdue amount."

`late_fee_percentage` = 5%.

**Acceleration:**
> "Upon the occurrence of an Event of Default, Landlord shall have the right to accelerate all Base Rent and Additional Rent remaining for the balance of the Term, discounted to present value at a rate of six percent (6%) per annum."

`acceleration_clause` = true.

### Property Type Variations

**Retail:** Continuous operation clauses create additional default triggers. Failure to remain open during required business hours may constitute a default.

**Office:** Standard cure periods. Acceleration clauses are common.

**Industrial:** Similar to office but may have additional defaults related to environmental compliance and hazardous materials.

---

## 10. Exclusivity & Co-tenancy

### Typical Patterns (Retail-Focused)

**Exclusive use:**
> "Landlord covenants that during the Term, Landlord shall not lease any space in the Shopping Center to any tenant whose primary business is the sale of Italian food and beverages for on-premises consumption."

`exclusive_use_rights` = "Sale of Italian food and beverages for on-premises consumption."

**Radius restriction:**
> "During the Term, Tenant shall not, directly or indirectly, own, manage, or operate a business similar to the Permitted Use within a radius of five (5) miles of the Shopping Center."

`radius_restriction_miles` = 5.

**Opening co-tenancy:**
> "Tenant's obligation to open for business shall be conditioned upon (a) Nordstrom or a comparable anchor tenant opening for business in the Shopping Center, and (b) at least seventy percent (70%) of the Gross Leasable Area of the Shopping Center being leased and open for business."

**Co-tenancy remedy:**
> "If the Opening Co-Tenancy Conditions are not satisfied within twelve (12) months of the Delivery Date, Tenant shall have the right to (a) pay Alternative Rent as defined below in lieu of Base Rent until such conditions are satisfied, or (b) terminate this Lease."

---

## 11. Parking & Common Areas

### Typical Patterns

**Parking ratio (office):**
> "Tenant shall be entitled to use four (4) parking spaces per 1,000 rentable square feet of the Premises, on an unreserved, non-exclusive basis, in the Building's parking structure."

`parking_ratio` = 4.0.

**Reserved and unreserved (office):**
> "Of the total parking allocation, Tenant shall be entitled to five (5) reserved, covered spaces at a rate of $150.00 per space per month, and thirty-five (35) unreserved spaces at no additional charge."

`reserved_parking_spaces` = 5, `unreserved_parking_spaces` = 35, `monthly_parking_cost` = $150.00 (for reserved).

**Trailer parking (industrial):**
> "Tenant shall have the right to park up to ten (10) semi-truck trailers in the designated trailer staging area adjacent to the Premises."

`trailer_parking_spaces` = 10.

---

## 12. Utilities

### Typical Patterns

**Direct metering:**
> "Tenant shall pay directly to the applicable utility provider for all electricity consumed in the Premises, which shall be separately metered."

`utilities_payment_method` = "Direct meter (electricity); other utilities per pro rata share."

**Landlord-provided janitorial:**
> "Landlord shall provide janitorial services to the Premises five (5) nights per week in accordance with the cleaning specifications attached hereto as Exhibit C."

`janitorial_responsibility` = "Landlord."

**Industrial specifications:**
> "The Premises shall have a minimum clear height of thirty-two (32) feet, eight (8) dock-high loading doors, two (2) grade-level drive-in doors, and 2,000-amp, 480/277-volt, 3-phase electrical service."

`clear_height_feet` = 32, `dock_high_doors` = 8, `drive_in_doors` = 2, `power_capacity` = "2,000-amp, 480/277-volt, 3-phase."

---

## 13. Signage & Permitted Use

### Typical Patterns

**Broad permitted use:**
> "The Premises shall be used and occupied only for general office purposes and for no other purpose."

**Narrow permitted use (retail):**
> "Tenant shall use and occupy the Premises solely for the operation of a Starbucks-branded retail coffee and food-service establishment and for no other purpose without Landlord's prior written consent."

**Fascia signage:**
> "Tenant shall have the right to install one (1) non-illuminated fascia sign on the exterior of the Building above the entrance to the Premises, subject to Landlord's prior written approval of the design, size, and placement, which approval shall not be unreasonably withheld."

`fascia_signage_rights` = true.

**Monument signage (anchor tenant):**
> "Landlord shall provide Tenant with a panel on the Shopping Center's monument sign located at the main entrance on Oak Street. Tenant's panel shall be the top position and shall be no smaller than the panel of any other tenant."

`monument_signage_rights` = true.

### Property Type Variations

**Office:** Permitted use is typically "general office" with broad latitude. Signage is limited to lobby directory and suite entry.

**Retail:** Permitted use is narrowly defined to protect exclusivity clauses of other tenants. Signage (fascia, monument, pylon) is heavily negotiated.

**Industrial:** Permitted use is broader ("warehouse, distribution, light manufacturing, and related office use"). Signage is often park-level regulated.

---

## 14. Miscellaneous

### Typical Patterns

**Security deposit (cash):**
> "Upon execution of this Lease, Tenant shall deposit with Landlord a security deposit in the amount of Fifty Thousand Dollars ($50,000.00) as security for the faithful performance of Tenant's obligations."

`security_deposit_amount` = $50,000, `security_deposit_type` = "cash."

**Security deposit (letter of credit):**
> "In lieu of a cash security deposit, Tenant shall deliver to Landlord an irrevocable standby letter of credit in the amount of $150,000 issued by a federally insured bank with assets of not less than $10 billion."

`security_deposit_amount` = $150,000, `security_deposit_type` = "letter of credit."

**Guaranty:**
> "As a material inducement to Landlord to enter into this Lease, John Smith, an individual ('Guarantor'), shall execute and deliver to Landlord a Guaranty of Lease in the form attached hereto as Exhibit G."

`has_guaranty` = true, `guarantor_name` = ["John Smith"].

**Governing law:**
> "This Lease shall be governed by and construed in accordance with the laws of the State of California."

`governing_law_state` = "California."

**SNDA:**
> "Within fifteen (15) days after request by Landlord, Tenant shall execute and deliver a subordination, non-disturbance, and attornment agreement in the form reasonably required by Landlord's mortgagee."

`snda_requirement` = true.

**Estoppel certificate:**
> "Tenant shall, within ten (10) business days after receipt of a written request from Landlord, execute and deliver to Landlord a certificate stating the current status of this Lease."

`estoppel_turnaround_days` = 10 (business days; note that the field captures the number but the extraction should note whether the days are business or calendar).

### Ambiguous Clauses (Lower Confidence)

> "Tenant shall provide reasonable security acceptable to Landlord."

No specific amount or form. `security_deposit_amount` cannot be extracted. Mark as low confidence.

> "This Lease shall be governed by the applicable law."

No state specified. `governing_law_state` cannot be determined. In practice, the governing law is typically the state where the property is located, but that inference should be flagged as medium confidence.
