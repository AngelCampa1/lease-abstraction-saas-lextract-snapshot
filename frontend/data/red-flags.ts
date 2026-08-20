import {
  filterRetainedSeoItems,
  getExplicitSeoRedirect,
  isRetainedSeoSlug,
} from '@/lib/seo-inventory'

export type RedFlagSeverity = 'high' | 'medium' | 'low'

export interface RedFlagData {
  ruleId: string
  name: string
  slug: string
  severity: RedFlagSeverity
  summary: string
  detectionRule: string
  triggeringFields: string[]
  realWorldImpact: string
  whatToDo: string
  relatedRedFlags: string[]
  isCamRelated: boolean
  commonLeaseTypes: string[]
  faqs: { question: string; answer: string }[]
  metaTitle: string
  metaDescription: string
}

export const RED_FLAGS: RedFlagData[] = [
  {
    ruleId: 'RF-001',
    name: 'Excessive Management Fee',
    slug: 'excessive-management-fee',
    severity: 'high',
    summary:
      'Your lease allows the landlord to charge a management fee above 15% of operating expenses, or the management fee cap is missing entirely. Management fees are supposed to cover the cost of administering the property, but without a reasonable cap, they become a hidden profit center for the landlord.',
    detectionRule:
      'Flagged when the management fee cap exceeds 15% of operating expenses or when no management fee cap is specified in the lease.',
    triggeringFields: ['management-fee-cap'],
    realWorldImpact:
      'On a 10,000 RSF lease with $100,000 in annual operating expenses, a 15% management fee costs $15,000 per year before any other CAM charges. Without a cap, the landlord could charge 20% or more, adding $5,000+ annually with no justification. Over a 10-year lease term, uncapped management fees can cost $50,000 or more above a negotiated 15% cap. In multi-tenant retail centers, a high uncapped management fee can materially increase the tenant\'s expected CAM contribution.',
    whatToDo:
      'Negotiate a management fee cap between 3% and 5% of total operating expenses when the property and services justify that range. If the landlord insists on a higher percentage, require that the fee be calculated only on controllable expenses, excluding taxes and insurance. Include language that the management fee cannot exceed the fee charged to other tenants in the same building. Request annual disclosure of actual management costs to verify the fee reflects real expenses. Property managers can use <a href="https://www.capveri.com" target="_blank" rel="noopener noreferrer">CapVeri.com</a> to flag management fee calculations automatically during reconciliation, ensuring the fee percentage stays within the lease-specified cap across every tenant in a portfolio. Once you receive an annual CAM reconciliation, <a href="https://www.camaudit.io" target="_blank" rel="noopener noreferrer">CamAudit.io</a> can verify whether the management fee was applied correctly and within the cap specified in your lease.',
    relatedRedFlags: ['RF-002', 'RF-003', 'RF-006'],
    isCamRelated: true,
    commonLeaseTypes: ['NNN', 'Modified Gross'],
    faqs: [
      {
        question: 'What is a reasonable management fee in a commercial lease?',
        answer:
          'Many negotiated institutional leases cap management fees around 3% to 5% of total operating expenses. Smaller properties or those requiring intensive management may justify higher fees, but anything above 10% should be scrutinized carefully.',
      },
      {
        question: 'Can the landlord charge a management fee on top of CAM charges?',
        answer:
          'Yes, management fees are typically a separate line item within the operating expense pass-through. However, the fee should only be calculated on actual operating expenses, not on capital expenditures or other excluded costs.',
      },
      {
        question: 'How do I verify the management fee is reasonable?',
        answer:
          'Request a breakdown of the management fee calculation alongside the annual CAM reconciliation statement. Compare the fee percentage to market benchmarks and verify it is being applied only to eligible expense categories as defined in the lease.',
      },
    ],
    metaTitle: 'Excessive Management Fee: Commercial Lease Red Flag',
    metaDescription:
      'Uncapped or excessive management fees can cost tenants $50,000+ over a lease term. Learn how Lextract detects this red flag.',
  },
  {
    ruleId: 'RF-002',
    name: 'Missing Audit Rights',
    slug: 'missing-audit-rights',
    severity: 'high',
    summary:
      'Your lease does not include the right to audit the landlord\'s operating expense records. Without audit rights, you have no way to verify that CAM charges, tax pass-throughs, and other operating expenses are accurate and fairly allocated.',
    detectionRule:
      'Flagged when audit rights are set to false or when no audit rights provision is found in the lease.',
    triggeringFields: ['audit-rights'],
    realWorldImpact:
      'CAM reconciliation errors are lease-specific: excluded expenses, capital items, incorrect allocation percentages, and management-fee calculations all depend on the exact lease language. For a tenant paying $25,000 annually in CAM charges, even a 10% unsupported charge equals $2,500 per year or $25,000 over a 10-year term. Without audit rights, tenants have no contractual mechanism to identify or recover these overcharges.',
    whatToDo:
      'Insist on explicit audit rights in your lease with at least 180 days to dispute CAM reconciliation statements. Require the landlord to provide itemized operating expense records upon request, including invoices and contracts for major expense categories. Negotiate that if the audit reveals overcharges exceeding 5% of total CAM, the landlord pays the cost of the audit. Include a provision for retroactive recovery of overcharges for the full lease term, not just the current year. Even without formal audit rights, you can run a preliminary check on your reconciliation at <a href="https://www.camaudit.io" target="_blank" rel="noopener noreferrer">CamAudit.io</a> - it applies 14 detection rules and surfaces the specific overcharge categories most likely to be present.',
    relatedRedFlags: ['RF-001', 'RF-003', 'RF-006', 'RF-015'],
    isCamRelated: true,
    commonLeaseTypes: ['NNN', 'Modified Gross'],
    faqs: [
      {
        question: 'Can I negotiate audit rights into an existing lease?',
        answer:
          'It is difficult to add audit rights after lease execution. Your best opportunity is during lease renewal negotiations or when the landlord requests a lease amendment for other purposes. Some tenants successfully negotiate audit rights by offering a longer renewal term in exchange.',
      },
      {
        question: 'How often do CAM reconciliation statements contain errors?',
        answer:
          'CAM audits across institutional properties frequently surface billing errors in the landlord-prepared reconciliation. CAM audit guidance from Mohr Partners describes invoice, contract, and allocation review as the practical way to identify charges that do not match the lease. Common issues include double-counting expenses, including capital expenditures that should be excluded, and miscalculating pro-rata shares.',
      },
      {
        question: 'Who typically conducts a CAM audit?',
        answer:
          'CAM audits are typically performed by specialized commercial real estate auditing firms. These firms work on a contingency basis (taking a percentage of recovered overcharges) or for a flat fee. Expect to pay $3,000 to $10,000 for a comprehensive audit.',
      },
    ],
    metaTitle: 'Missing Audit Rights: Commercial Lease Red Flag',
    metaDescription:
      'Without audit rights, tenants cannot verify CAM charges. Lextract flags leases missing this critical protection.',
  },
  {
    ruleId: 'RF-003',
    name: 'No CAM Cap',
    slug: 'no-cam-cap',
    severity: 'high',
    summary:
      'Your lease has no ceiling on annual increases to common area maintenance charges. Without a CAM cap, your landlord can raise your operating expenses by any amount each year, making it impossible to forecast occupancy costs accurately.',
    detectionRule:
      'Flagged when the CAM cap percentage field is null or missing from the lease.',
    triggeringFields: ['cam-cap-percentage'],
    realWorldImpact:
      'Without a CAM cap, annual operating expense increases are limited only by the landlord\'s actual costs - or creative accounting. In an average shopping center, CAM charges can increase 5% to 8% annually. For a tenant paying $30,000 in CAM charges in year one, uncapped increases at 7% per year compound to over $59,000 by year ten. That is $97,000 more in total CAM charges over ten years compared to a lease with a 5% annual cap. In volatile markets or properties undergoing major renovations, single-year CAM increases of 20% to 30% are not uncommon when no cap is in place.',
    whatToDo:
      'Negotiate a CAM cap of 3% to 5% per year on controllable operating expenses. Ensure the cap applies on a non-cumulative (compounding) basis, meaning each year\'s cap is calculated from the prior year\'s actual charges, not the original base year. Separate controllable expenses from non-controllable expenses like real estate taxes and insurance, which typically cannot be capped. If the landlord resists a hard cap, propose a cap with a carve-out for extraordinary events like natural disasters. Property managers can use <a href="https://www.capveri.com" target="_blank" rel="noopener noreferrer">CapVeri.com</a> to track CAM cap compliance automatically across their portfolio, ensuring reconciliation statements honor the cap terms agreed in each lease. If you are already past lease execution, <a href="https://www.camaudit.io" target="_blank" rel="noopener noreferrer">CamAudit.io</a> can detect CAM cap violations in your annual reconciliation - checking whether the landlord honored the cap terms in your existing lease.',
    relatedRedFlags: ['RF-001', 'RF-004', 'RF-006'],
    isCamRelated: true,
    commonLeaseTypes: ['NNN', 'Modified Gross'],
    faqs: [
      {
        question: 'What is a reasonable CAM cap percentage?',
        answer:
          'A reasonable CAM cap is 3% to 5% per year on controllable expenses. Caps below 3% may discourage landlords from properly maintaining the property. Caps above 5% provide limited protection since most annual CAM increases fall within that range anyway.',
      },
      {
        question:
          'Should the CAM cap apply to all expenses or just controllable expenses?',
        answer:
          'CAM caps typically apply only to controllable expenses - those the landlord can influence, such as landscaping, janitorial, and management fees. Non-controllable expenses like property taxes and insurance premiums are usually excluded from the cap since the landlord cannot control their increases.',
      },
      {
        question: 'What is the difference between a cumulative and non-cumulative CAM cap?',
        answer:
          'A non-cumulative cap limits each year\'s increase from the prior year\'s actual charges. A cumulative cap limits the total increase from a base year, allowing larger single-year increases if prior years were below the cap. Non-cumulative caps provide better year-to-year predictability for tenants.',
      },
    ],
    metaTitle: 'No CAM Cap: Commercial Lease Red Flag',
    metaDescription:
      'A missing CAM cap can cost tenants $97,000+ over a 10-year lease. Learn how Lextract detects uncapped CAM exposure.',
  },
  {
    ruleId: 'RF-004',
    name: 'Cumulative CAM Cap',
    slug: 'cumulative-cam-cap',
    severity: 'medium',
    summary:
      'Your lease uses a cumulative CAM cap rather than a non-cumulative (annual) cap. While having any cap is better than none, a cumulative cap allows the landlord to bank unused increases from low-cost years and apply them all at once in a future year, creating unpredictable expense spikes.',
    detectionRule:
      'Flagged when the CAM cap type is set to "cumulative" rather than "annual" or "non-cumulative."',
    triggeringFields: ['cam-cap-type', 'cam-cap-percentage'],
    realWorldImpact:
      'Consider a lease with a 5% cumulative CAM cap starting at $30,000 in base year charges. If CAM increases only 2% in years one through three, the landlord banks the unused 3% each year. By year four, the landlord has 14% of banked capacity. If actual costs spike that year, the tenant could face a single-year increase of up to 14% - jumping from roughly $31,800 to $36,250 in one year. Over a 10-year lease, cumulative caps can result in $15,000 to $25,000 more in total CAM charges compared to a non-cumulative cap at the same percentage.',
    whatToDo:
      'Negotiate for a non-cumulative (also called "annual" or "compounding") CAM cap. This structure resets the baseline each year to actual charges, preventing banked increases. If the landlord insists on a cumulative cap, negotiate a "circuit breaker" clause that limits any single-year increase to no more than twice the annual cap percentage. Also request that the cumulative cap be calculated from actual expenses each year rather than the maximum allowable amount. Tenants can detect cumulative cap violations using <a href="https://www.camaudit.io" target="_blank" rel="noopener noreferrer">CAMAudit.io</a>. Property managers can track cap compliance across portfolios with <a href="https://www.capveri.com" target="_blank" rel="noopener noreferrer">CapVeri.com</a>.',
    relatedRedFlags: ['RF-003', 'RF-001'],
    isCamRelated: true,
    commonLeaseTypes: ['NNN', 'Modified Gross'],
    faqs: [
      {
        question: 'What does cumulative mean in a CAM cap?',
        answer:
          'A cumulative CAM cap tracks unused increase capacity over multiple years. If the cap is 5% but costs only rise 2% one year, the landlord banks the remaining 3%. In future years, the landlord can apply these banked increases on top of the stated cap, leading to potentially large single-year jumps.',
      },
      {
        question: 'Is a cumulative CAM cap better than no cap at all?',
        answer:
          'Yes, a cumulative cap is significantly better than no cap. It still limits total expense growth over the lease term. However, it provides less year-to-year predictability than a non-cumulative cap because expenses can spike in individual years.',
      },
      {
        question: 'How common are cumulative CAM caps?',
        answer:
          'Cumulative CAM caps are more common in landlord-favorable markets and in leases negotiated by tenants without specialized legal counsel. In competitive tenant markets, non-cumulative caps are the standard. Always push for non-cumulative if market conditions allow.',
      },
    ],
    metaTitle: 'Cumulative CAM Cap: Commercial Lease Red Flag',
    metaDescription:
      'Cumulative CAM caps let landlords bank unused increases for future spikes. See how Lextract identifies this risk.',
  },
  {
    ruleId: 'RF-005',
    name: 'No Gross-Up Provision',
    slug: 'no-gross-up-provision',
    severity: 'medium',
    summary:
      'Your NNN lease lacks a gross-up provision, meaning operating expenses are calculated based on actual occupancy rather than full building occupancy. When the building is partially vacant, existing tenants end up subsidizing the landlord\'s share of costs for empty spaces.',
    detectionRule:
      'Flagged when the gross-up percentage is null and the lease structure type contains "NNN."',
    triggeringFields: ['gross-up-percentage', 'lease-structure-type'],
    realWorldImpact:
      'In a 100,000 RSF building at 70% occupancy, common area costs like HVAC, janitorial, and security remain largely the same whether the building is 70% or 100% occupied. Without a gross-up clause, a tenant leasing 10,000 RSF pays 10% of actual costs. With a gross-up to 95% occupancy, the landlord bears the cost of vacant space. For a building with $500,000 in annual variable operating expenses, the difference between actual (70%) and grossed-up (95%) allocation costs a 10,000 RSF tenant approximately $1,800 per year. Over a 10-year lease in a chronically under-occupied building, this adds up to $18,000 or more in extra charges.',
    whatToDo:
      'Require a gross-up provision that adjusts variable operating expenses as if the building were 95% occupied when that threshold fits the deal. This helps ensure tenants do not subsidize vacant space. Specify that the gross-up applies only to variable expenses that fluctuate with occupancy, not to fixed costs like property taxes and insurance. Negotiate that the gross-up floor be at least 90% to prevent landlord abuse of the provision in nearly full buildings. Use <a href="https://www.camaudit.io" target="_blank" rel="noopener noreferrer">CAMAudit.io</a> to verify whether gross-up was applied correctly to your charges.',
    relatedRedFlags: ['RF-013', 'RF-003'],
    isCamRelated: true,
    commonLeaseTypes: ['NNN'],
    faqs: [
      {
        question: 'What is a gross-up clause in a commercial lease?',
        answer:
          'A gross-up clause adjusts variable operating expenses as if the building were at a specified occupancy level, typically 95%. This prevents existing tenants from paying a disproportionate share of operating costs when the building has vacant space.',
      },
      {
        question: 'What occupancy level should expenses be grossed up to?',
        answer:
          'A 95% gross-up level is common in negotiated leases. Some landlords push for 100%, which can be reasonable for expense calculation purposes. Avoid accepting gross-up levels below 90%, as this provides minimal protection.',
      },
      {
        question: 'Does a gross-up clause affect my pro-rata share?',
        answer:
          'No, your pro-rata share of the building remains the same. The gross-up clause adjusts the total expense pool before your share is calculated, ensuring the total pool reflects normalized occupancy rather than actual vacancies.',
      },
    ],
    metaTitle: 'No Gross-Up Provision: Commercial Lease Red Flag',
    metaDescription:
      'Missing gross-up clauses force tenants to subsidize vacant space costs. Lextract flags NNN leases lacking this protection.',
  },
  {
    ruleId: 'RF-006',
    name: 'Missing CAM Exclusions',
    slug: 'missing-cam-exclusions',
    severity: 'high',
    summary:
      'Your lease does not specify any exclusions from CAM charges, allowing the landlord to pass through virtually any expense as a common area maintenance cost. Without exclusions, capital improvements, legal fees, leasing commissions, and other non-recurring costs can be billed to tenants.',
    detectionRule:
      'Flagged when the CAM exclusions list is an empty array, indicating no expense categories are excluded from pass-through charges.',
    triggeringFields: ['cam-exclusions'],
    realWorldImpact:
      'Without CAM exclusions, landlords have included expenses such as roof replacements ($150,000+), parking lot repaving ($80,000+), leasing commissions for other tenants ($50,000+), and even legal fees from disputes with other tenants. A 10,000 RSF tenant with a 10% pro-rata share could be charged $15,000 for a single roof replacement they had no say in. Over a 10-year lease term, missing exclusions can result in $30,000 to $75,000 in unexpected pass-through charges that would be excluded under a well-drafted lease.',
    whatToDo:
      'Insist on a comprehensive list of CAM exclusions. Standard exclusions include capital expenditures over a specified threshold, landlord\'s leasing commissions and marketing costs, legal fees from disputes with other tenants, depreciation and amortization, executive salaries above property manager level, costs reimbursed by insurance proceeds, and costs attributable to other tenants\' specific needs. Negotiate that any expense category not specifically listed as includable in operating expenses is automatically excluded. Scan your reconciliation statement with <a href="https://www.camaudit.io" target="_blank" rel="noopener noreferrer">CAMAudit.io</a> to identify excluded items that were incorrectly billed as CAM.',
    relatedRedFlags: ['RF-001', 'RF-002', 'RF-003'],
    isCamRelated: true,
    commonLeaseTypes: ['NNN', 'Modified Gross'],
    faqs: [
      {
        question: 'What expenses should be excluded from CAM charges?',
        answer:
          'Standard CAM exclusions include capital expenditures, leasing commissions, legal fees from landlord disputes, depreciation, above-market management salaries, insurance reimbursements, ground lease rent, income taxes, and costs benefiting only specific tenants rather than the common areas.',
      },
      {
        question: 'Can the landlord pass through capital improvement costs as CAM?',
        answer:
          'Without proper exclusions, yes. Well-drafted leases exclude capital expenditures entirely or amortize them over their useful life with a reasonable interest rate. A $200,000 roof replacement should be amortized over 20 years at a fair interest rate, not charged in full in the year it occurs.',
      },
      {
        question: 'How do I know if a CAM charge is legitimate?',
        answer:
          'Legitimate CAM charges are recurring operating expenses that benefit all tenants and the common areas. They include landscaping, janitorial services, parking lot maintenance, common area utilities, security, and property management fees at market rates. Anything unusual or non-recurring should be questioned.',
      },
    ],
    metaTitle: 'Missing CAM Exclusions: Commercial Lease Red Flag',
    metaDescription:
      'Without CAM exclusions, landlords can pass through capital costs and legal fees. Lextract flags this high-severity risk.',
  },
  {
    ruleId: 'RF-007',
    name: 'Short Cure Period',
    slug: 'short-cure-period',
    severity: 'medium',
    summary:
      'Your lease provides fewer than 10 days to cure a monetary default, such as late rent payment. A short cure period leaves very little time to resolve payment issues before the landlord can begin default proceedings, especially when payment delays are caused by banking errors or accounting oversights.',
    detectionRule:
      'Flagged when the monetary cure period is less than 10 days.',
    triggeringFields: ['monetary-cure-period'],
    realWorldImpact:
      'A 5-day monetary cure period means the tenant has just five business days to receive the default notice, process it internally, resolve any payment issue, and transmit funds. In practice, mailed notices may take 2 to 3 days to arrive, leaving only 2 to 3 business days for actual cure. If rent is $15,000 per month and the landlord declares default, the tenant faces potential lease termination, forfeiture of the security deposit (often $30,000 to $45,000), loss of tenant improvements ($50,000+), and relocation costs averaging $25 to $35 per RSF. The total financial exposure from an uncured default triggered by a short cure period can exceed $200,000.',
    whatToDo:
      'Negotiate a monetary cure period of at least 10 business days (not calendar days) after written notice of default. Require that the notice be delivered via both certified mail and email to ensure timely receipt. Add a provision requiring at least two missed payments within a 12-month period before the landlord can declare a lease default. For non-monetary defaults, negotiate 30 days to cure with extensions for diligent efforts.',
    relatedRedFlags: ['RF-008'],
    isCamRelated: false,
    commonLeaseTypes: ['NNN', 'Modified Gross', 'Gross', 'Ground'],
    faqs: [
      {
        question: 'What is a reasonable monetary cure period?',
        answer:
          'A reasonable monetary cure period is 10 to 15 business days after written notice. This allows adequate time to receive the notice, identify the issue, and process payment. Some tenant-favorable leases provide 20 to 30 days for the first default in any 12-month period.',
      },
      {
        question: 'Does the cure period start when the notice is sent or received?',
        answer:
          'This depends on the lease language. Tenant-favorable provisions start the cure period upon receipt of notice. Landlord-favorable provisions start upon sending. Negotiate for the period to begin upon actual receipt or, at minimum, three business days after mailing.',
      },
      {
        question: 'Can a landlord terminate the lease for a single late payment?',
        answer:
          'If the lease allows it and the cure period expires without payment, technically yes. This is why tenants should negotiate provisions requiring repeated defaults before termination and include language allowing cure up until the landlord actually files legal proceedings.',
      },
    ],
    metaTitle: 'Short Cure Period: Commercial Lease Red Flag',
    metaDescription:
      'Cure periods under 10 days risk lease termination from minor payment delays. Lextract detects this medium-severity flag.',
  },
  {
    ruleId: 'RF-008',
    name: 'Aggressive Holdover Rate',
    slug: 'aggressive-holdover-rate',
    severity: 'medium',
    summary:
      'Your lease sets the holdover rent rate above 200% of the final monthly rent. While holdover provisions are standard, excessively high rates create enormous financial pressure and can be used as leverage against tenants who need even a brief extension while finalizing a new lease or relocation.',
    detectionRule:
      'Flagged when the holdover rate exceeds 200% of the base rent at lease expiration.',
    triggeringFields: ['holdover-rate'],
    realWorldImpact:
      'On a lease with final-year base rent of $15,000 per month, a 300% holdover rate means $60,000 per month - an additional $40,000 monthly penalty. Even a two-month holdover at 300% costs $80,000 more than normal rent. Holdover situations are common when renewal negotiations extend past the expiration date, when a new space has construction delays, or when the tenant needs time to wind down operations. A 200% holdover rate is already punitive enough to incentivize timely departure; rates above 200% are designed to extract maximum financial harm.',
    whatToDo:
      'Negotiate the holdover rate down to 125% to 150% of the final monthly rent for the first 60 to 90 days of holdover, with 200% applying only after that initial grace period. Require the landlord to provide written notice at least 12 months before expiration if they do not intend to renew, giving you adequate time to find alternative space. Include language stating that holdover does not create a new lease term and that the holdover period is month-to-month terminable by either party with 30 days notice.',
    relatedRedFlags: ['RF-007', 'RF-009'],
    isCamRelated: false,
    commonLeaseTypes: ['NNN', 'Modified Gross', 'Gross', 'Ground'],
    faqs: [
      {
        question: 'What is a reasonable holdover rate in a commercial lease?',
        answer:
          'Negotiated holdover rates often range from 125% to 200% of the final base rent. Rates above 200% are aggressive and can primarily serve to penalize tenants rather than compensate the landlord for short-term occupancy disruption.',
      },
      {
        question: 'Can I be evicted immediately when my lease expires?',
        answer:
          'No. Even without a holdover provision, state law typically requires proper notice and legal proceedings to remove a holdover tenant. However, the holdover provision determines the rent rate during this period and whether the holdover creates a new month-to-month tenancy.',
      },
      {
        question: 'Does the holdover rate apply to all charges or just base rent?',
        answer:
          'This depends on the lease language. Most holdover clauses apply the multiplier only to base rent, with operating expenses continuing at their normal rate. Carefully review whether the holdover rate applies to total rent or just the base rent component.',
      },
    ],
    metaTitle: 'Aggressive Holdover Rate: Commercial Lease Red Flag',
    metaDescription:
      'Holdover rates above 200% cost tenants thousands monthly. Lextract flags aggressive holdover provisions in your lease.',
  },
  {
    ruleId: 'RF-009',
    name: 'No Termination Option',
    slug: 'no-termination-option',
    severity: 'low',
    summary:
      'Your lease exceeds five years in length but contains no early termination option. Long-term leases without an exit clause lock tenants into financial obligations that may become unsustainable if business conditions change, the location underperforms, or the tenant needs to downsize or relocate.',
    detectionRule:
      'Flagged when the lease has no termination option and the lease term exceeds 60 months.',
    triggeringFields: ['has-termination-option', 'lease-term-months'],
    realWorldImpact:
      'A 10-year NNN lease at $25 per RSF on 5,000 RSF represents a total obligation of $1,250,000 in base rent alone, plus operating expenses. If the tenant needs to exit at year five, they face the remaining $625,000 obligation. Without a termination option, the tenant\'s only choices are subletting (often restricted and difficult), lease assignment (requires landlord consent), or defaulting and facing litigation. Business failure rates mean roughly 20% of commercial tenants will need to exit a lease before its natural expiration. Subletting typically requires offering below-market rates, costing the original tenant $5 to $10 per RSF annually in difference.',
    whatToDo:
      'Negotiate a one-time early termination option exercisable after year three or five of the lease term. Standard termination penalties range from six to twelve months of rent plus unamortized tenant improvement costs and leasing commissions. Require at least six to nine months advance written notice before exercising the termination option. If the landlord refuses a termination option entirely, negotiate robust assignment and subletting rights as an alternative exit strategy.',
    relatedRedFlags: ['RF-008'],
    isCamRelated: false,
    commonLeaseTypes: ['NNN', 'Modified Gross', 'Gross'],
    faqs: [
      {
        question: 'What happens if my lease has no early termination clause?',
        answer:
          'Without an early termination clause, you are legally obligated for the full remaining rent through the lease expiration. Your options are limited to subletting (if permitted), lease assignment (with landlord consent), or negotiating a lease buyout directly with the landlord, which often costs 50% to 100% of remaining rent.',
      },
      {
        question: 'What is a typical early termination penalty?',
        answer:
          'Standard termination penalties include six to twelve months of base rent plus the unamortized balance of any tenant improvement allowance and leasing commissions the landlord paid. Some leases also require payment of the landlord\'s costs to re-tenant the space.',
      },
      {
        question: 'Should every long-term lease have a termination option?',
        answer:
          'For leases longer than five years, a termination option is strongly recommended, especially for growing businesses whose space needs may change. Even if the termination penalty is substantial, having the option provides critical flexibility that can save a business from financial distress.',
      },
    ],
    metaTitle: 'No Termination Option: Commercial Lease Red Flag',
    metaDescription:
      'Long leases without an exit option can lock tenants into $1M+ obligations. Lextract identifies missing termination clauses.',
  },
  {
    ruleId: 'RF-010',
    name: 'Missing Restoration Clarity',
    slug: 'missing-restoration-clarity',
    severity: 'low',
    summary:
      'Your lease requires the tenant to restore the premises at the end of the term but does not clearly describe what work the tenant performed, making it impossible to determine what must be restored. This ambiguity gives the landlord leverage to demand extensive demolition and rebuild costs at lease expiration.',
    detectionRule:
      'Flagged when restoration is required but the tenant work description is null, leaving the scope of restoration undefined.',
    triggeringFields: ['restoration-requirement', 'tenant-work-description'],
    realWorldImpact:
      'Restoration costs for commercial spaces typically range from $15 to $40 per RSF. For a 5,000 RSF space, that represents $75,000 to $200,000 in potential costs. Without clear documentation of the original condition and tenant improvements, landlords have demanded full demolition of all tenant modifications, even improvements that benefit the space. In one case, a restaurant tenant was required to spend $120,000 removing kitchen infrastructure, grease traps, and specialty flooring when the lease lacked clear documentation of the original premises condition and tenant work scope.',
    whatToDo:
      'Document all tenant work in detail as a lease exhibit, including photographs of the premises condition at lease commencement. Negotiate that the landlord must provide written notice at least 12 months before lease expiration specifying exactly which improvements must be removed. Include language that improvements which enhance the space\'s value to future tenants (such as built-in cabinetry, upgraded HVAC, or improved electrical) are not subject to restoration unless the landlord provides written objection within 30 days of installation.',
    relatedRedFlags: ['RF-009'],
    isCamRelated: false,
    commonLeaseTypes: ['NNN', 'Modified Gross', 'Gross', 'Ground'],
    faqs: [
      {
        question: 'What does restoration mean in a commercial lease?',
        answer:
          'Restoration (also called "surrender condition" or "demolition clause") requires the tenant to return the premises to its original condition at lease expiration. This can include removing all tenant improvements, patching walls and floors, and restoring original building systems.',
      },
      {
        question: 'Can the landlord waive restoration requirements?',
        answer:
          'Yes, and many landlords will waive restoration for improvements that add value to the space. The key is to negotiate this upfront. Ask for a "leave in place" list of improvements during the lease negotiation, and get the landlord\'s written agreement that listed items do not require removal.',
      },
      {
        question: 'How do I estimate restoration costs before signing a lease?',
        answer:
          'Obtain a general contractor estimate for removing the planned tenant improvements and returning the space to shell condition. Budget $15 to $40 per RSF for typical office restorations and $30 to $60 per RSF for restaurant or medical office restorations. Include this cost in your total occupancy cost analysis.',
      },
    ],
    metaTitle: 'Missing Restoration Clarity: Commercial Lease Red Flag',
    metaDescription:
      'Unclear restoration clauses expose tenants to $75K-$200K in unexpected costs. Lextract flags this ambiguity.',
  },
  {
    ruleId: 'RF-011',
    name: 'No Renewal Option',
    slug: 'no-renewal-option',
    severity: 'low',
    summary:
      'Your lease does not include a renewal option, meaning you have no guaranteed right to extend your tenancy at the end of the lease term. Without a renewal option, the landlord can refuse to renew, demand significantly higher rent, or lease the space to another tenant regardless of your history as a reliable occupant.',
    detectionRule:
      'Flagged when the lease indicates no renewal option is present.',
    triggeringFields: ['has-renewal-option'],
    realWorldImpact:
      'Relocating a commercial business costs $25 to $50 per RSF in moving expenses, new tenant improvements, and business disruption. For a 5,000 RSF tenant, relocation costs range from $125,000 to $250,000. Without a renewal option, the landlord has maximum leverage at lease expiration, often demanding 15% to 30% rent increases. For a tenant paying $15,000 per month, a 25% increase adds $60,000 annually. Businesses that depend on their location - such as retail, restaurants, and medical practices - face the additional risk of losing customers who cannot find them at a new address.',
    whatToDo:
      'Negotiate at least one five-year renewal option at the lesser of fair market value or a fixed percentage increase over the final year\'s rent. Include a "most favored nations" clause requiring that your renewal rate be no higher than the rate offered to new tenants for comparable space. Specify a clear process for determining fair market value in case of disagreement, such as binding arbitration with each party selecting an appraiser and the two appraisers selecting a third. Require at least nine to twelve months advance notice from either party regarding renewal intentions.',
    relatedRedFlags: ['RF-009'],
    isCamRelated: false,
    commonLeaseTypes: ['NNN', 'Modified Gross', 'Gross', 'Ground'],
    faqs: [
      {
        question: 'Can a landlord refuse to renew my commercial lease?',
        answer:
          'Yes, unless your lease contains a renewal option. Unlike residential leases in many jurisdictions, commercial leases generally do not provide tenants with any automatic right to renew. When the lease term expires, the landlord has no obligation to offer a new lease.',
      },
      {
        question: 'What terms should a renewal option include?',
        answer:
          'A well-drafted renewal option specifies the length of the renewal term, the method for determining the renewal rent rate, the deadline for exercising the option, and any conditions that must be met (such as being current on rent). Avoid options that give the landlord discretion over the renewal rent.',
      },
      {
        question: 'How far in advance should I exercise my renewal option?',
        answer:
          'Most renewal options require 6 to 12 months advance written notice. Exercise your option as early as permitted to secure your tenancy, then negotiate the specific terms. Missing the exercise deadline by even one day can forfeit your renewal right entirely.',
      },
    ],
    metaTitle: 'No Renewal Option: Commercial Lease Red Flag',
    metaDescription:
      'Without a renewal option, tenants face relocation costs of $125K+ or steep rent hikes. Lextract detects this risk.',
  },
  {
    ruleId: 'RF-012',
    name: 'Recapture Right Present',
    slug: 'recapture-right-present',
    severity: 'medium',
    summary:
      'Your lease gives the landlord a recapture right, allowing them to terminate your lease and take back the space if you attempt to sublease or assign. Recapture rights effectively eliminate your ability to exit the lease through subletting because any attempt to find a subtenant triggers the landlord\'s right to reclaim the space entirely.',
    detectionRule:
      'Flagged when the recapture right field is set to true.',
    triggeringFields: ['recapture-right'],
    realWorldImpact:
      'Recapture rights create a catch-22 for tenants. If you need to downsize from 10,000 RSF to 5,000 RSF and attempt to sublease the excess space, the landlord can recapture the entire 10,000 RSF and release it at current market rates, which may be higher than your contracted rate. On a lease with $15 per RSF below-market rent, recapture on 10,000 RSF gives the landlord a $200,000 annual windfall. This makes subletting - often the only practical exit from a long-term lease - effectively unusable as a strategy.',
    whatToDo:
      'Negotiate to eliminate the recapture right entirely or limit it to situations where the tenant seeks to assign the entire lease, not partial subletting. If the landlord insists on recapture rights, negotiate a "profit sharing" arrangement instead, where the landlord receives a percentage of any sublease profit rather than the right to recapture the space. Include exceptions for subleasing to affiliates, subsidiaries, or successors-in-interest. At minimum, require that recapture rights expire after a specified period, such as the first half of the lease term.',
    relatedRedFlags: ['RF-009', 'RF-011'],
    isCamRelated: false,
    commonLeaseTypes: ['NNN', 'Modified Gross', 'Gross'],
    faqs: [
      {
        question: 'What is a recapture right in a commercial lease?',
        answer:
          'A recapture right allows the landlord to take back the leased premises if the tenant attempts to sublease or assign the lease. Instead of consenting to the sublease, the landlord terminates the original lease and releases the space directly, often at a higher current market rate.',
      },
      {
        question: 'Can I sublease if my landlord has a recapture right?',
        answer:
          'Technically yes, but the landlord can respond to your sublease request by recapturing the space instead of consenting. This means any attempt to sublease puts your entire tenancy at risk. Many tenants with recapture clauses are effectively locked in with no sublease exit.',
      },
      {
        question: 'Is a recapture right the same as a termination option for the landlord?',
        answer:
          'Not exactly. A recapture right is triggered only when the tenant requests to sublease or assign. It is not a unilateral termination right the landlord can exercise at any time. However, the practical effect is similar - it gives the landlord an option to end the lease under certain conditions.',
      },
    ],
    metaTitle: 'Recapture Right Present: Commercial Lease Red Flag',
    metaDescription:
      'Landlord recapture rights can eliminate your sublease exit strategy. Lextract flags this medium-severity lease risk.',
  },
  {
    ruleId: 'RF-013',
    name: 'No Base Year Gross-Up',
    slug: 'no-base-year-gross-up',
    severity: 'medium',
    summary:
      'Your lease has a base year for operating expense calculations but does not gross up the base year expenses to reflect full occupancy. If the building was partially vacant during the base year, the base year expenses will be artificially low, meaning you will pay higher expense increases in subsequent years than intended.',
    detectionRule:
      'Flagged when base year gross-up is false and a base year is specified in the lease.',
    triggeringFields: ['base-year-gross-up', 'base-year'],
    realWorldImpact:
      'Consider a building that was 75% occupied during the base year. Variable operating expenses that year totaled $750,000, but at full occupancy they would have been $950,000. Your expense stop (base year amount) is set at $18 per RSF instead of the grossed-up $9.50 per RSF. In year two, when the building reaches 95% occupancy, expenses rise to $950,000 - a $200,000 "increase" that is really just the building filling up. On 10,000 RSF with a 10% pro-rata share, you pay $15,000 in year-two escalations that would not exist with a grossed-up base year. Over a 10-year lease, this base year distortion can cost $50,000 to $80,000 in excess pass-through charges.',
    whatToDo:
      'Require that the base year operating expenses be grossed up to 95% occupancy for all variable expenses. This ensures your expense stop reflects normalized building operations, not the anomaly of low occupancy during the base year. Verify which expenses are classified as variable versus fixed for gross-up purposes. If the landlord resists grossing up the base year, negotiate a higher expense stop or a cap on year-over-year expense increases to offset the distorted baseline.',
    relatedRedFlags: ['RF-005', 'RF-003', 'RF-014'],
    isCamRelated: true,
    commonLeaseTypes: ['Modified Gross', 'Gross'],
    faqs: [
      {
        question: 'What is a base year in a commercial lease?',
        answer:
          'The base year is the first year of the lease term, and its operating expenses become the baseline for calculating future expense pass-throughs. The tenant pays their share of any operating expenses that exceed the base year amount in subsequent years.',
      },
      {
        question: 'Why does low occupancy affect base year expenses?',
        answer:
          'Variable operating expenses like utilities, janitorial, and elevator maintenance increase with occupancy. If the building is only 70% occupied in the base year, these costs are lower than they will be at full occupancy. As the building fills up, expenses rise - and without a gross-up, that increase is passed through to tenants even though it reflects occupancy changes, not actual cost inflation.',
      },
      {
        question: 'Is base year gross-up the same as the operating expense gross-up?',
        answer:
          'They are related but distinct. Operating expense gross-up adjusts current-year expenses. Base year gross-up adjusts the base year itself. Both should be present in a well-drafted lease to ensure fair expense allocation regardless of building occupancy fluctuations.',
      },
    ],
    metaTitle: 'No Base Year Gross-Up: Commercial Lease Red Flag',
    metaDescription:
      'A non-grossed-up base year inflates your expense pass-throughs by $50K-$80K. Lextract catches this hidden cost trap.',
  },
  {
    ruleId: 'RF-014',
    name: 'No Reconciliation Frequency',
    slug: 'no-reconciliation-frequency',
    severity: 'medium',
    summary:
      'Your NNN lease does not specify how often the landlord must reconcile estimated operating expense payments against actual costs. Without a defined reconciliation frequency, the landlord can delay reconciliation indefinitely, collecting estimated payments that may significantly exceed actual expenses without any obligation to settle up.',
    detectionRule:
      'Flagged when the reconciliation frequency is null and the lease structure type contains "NNN."',
    triggeringFields: ['reconciliation-frequency', 'lease-structure-type'],
    realWorldImpact:
      'Landlords typically collect estimated CAM payments monthly, often padding estimates by 10% to 20% to ensure they are not out of pocket. On $30,000 in annual CAM charges, a 15% over-estimate means the landlord collects $4,500 more than actual costs each year. Without a required reconciliation, this overpayment accumulates year after year. Over five years, a tenant could overpay by $22,500 or more with no mechanism to force a true-up. In extreme cases, tenants have discovered cumulative overpayments exceeding $50,000 when they finally demanded an accounting at lease expiration.',
    whatToDo:
      'Require annual reconciliation of operating expenses within 90 to 120 days after each calendar year ends. Specify that if the landlord fails to deliver the reconciliation statement within the required timeframe, estimated payments are deemed actual and no additional charges can be assessed for that year. Require that any overpayment be credited to the tenant\'s next monthly payment or refunded within 30 days. Include a provision that the tenant may request interim reconciliation statements quarterly for informational purposes.',
    relatedRedFlags: ['RF-015', 'RF-002'],
    isCamRelated: true,
    commonLeaseTypes: ['NNN'],
    faqs: [
      {
        question: 'What is CAM reconciliation?',
        answer:
          'CAM reconciliation is the process of comparing estimated monthly operating expense payments against actual expenses incurred during the year. The landlord prepares a statement showing total actual expenses, the tenant\'s pro-rata share, and the difference between actual and estimated payments. The tenant either receives a credit or owes additional payment.',
      },
      {
        question: 'How often should CAM reconciliation occur?',
        answer:
          'Annual reconciliation, delivered within 90 to 120 days after the end of each calendar year, is common in negotiated CAM provisions. Some sophisticated tenants negotiate quarterly interim statements for budgeting purposes, with a final annual reconciliation.',
      },
      {
        question: 'What can I do if my landlord refuses to reconcile?',
        answer:
          'If your lease specifies a reconciliation deadline, the landlord is in breach if they miss it. Send written notice demanding reconciliation. If the lease includes language deeming estimates as actual upon missed deadlines, cite that provision. As a last resort, you may need to engage an attorney to compel compliance or withhold future estimated payments.',
      },
    ],
    metaTitle: 'No Reconciliation Frequency: Commercial Lease Red Flag',
    metaDescription:
      'Missing reconciliation deadlines let landlords collect excess estimates indefinitely. Lextract flags this NNN lease risk.',
  },
  {
    ruleId: 'RF-015',
    name: 'Short Audit Window',
    slug: 'short-audit-window',
    severity: 'medium',
    summary:
      'Your lease gives you fewer than 60 days to audit the landlord\'s CAM reconciliation statement after receiving it. A short audit window makes it practically impossible to engage an auditor, obtain records, and complete a thorough review before your right to dispute charges expires.',
    detectionRule:
      'Flagged when the CAM audit deadline is less than 60 days after receipt of the reconciliation statement.',
    triggeringFields: ['cam-audit-deadline-days'],
    realWorldImpact:
      'Professional CAM audits typically take 30 to 60 days from engagement to completion, assuming the landlord provides records promptly. With a 30-day audit window, the tenant must engage an auditor, request records, wait for the landlord to produce them, and complete the review in less time than the audit itself requires. In practice, a 30-day window means tenants cannot effectively audit their charges, forfeiting thousands of dollars in potential overcharge recoveries each year. On $50,000 in annual CAM charges, even a 5% overcharge - common and detectable - represents $2,500 per year or $25,000 over a 10-year lease term that the tenant cannot recover.',
    whatToDo:
      'Negotiate an audit window of at least 180 days after receipt of the reconciliation statement. Specify that the window does not begin until the landlord provides all supporting documentation, not just the summary statement. Include language tolling the audit deadline if the landlord delays in producing requested records. Ensure that the right to audit extends for at least two years retroactively, allowing you to audit prior years if you discover patterns of overcharging in the current year.',
    relatedRedFlags: ['RF-002', 'RF-014'],
    isCamRelated: true,
    commonLeaseTypes: ['NNN', 'Modified Gross'],
    faqs: [
      {
        question: 'How long should I have to audit CAM charges?',
        answer:
          'A reasonable audit window is 180 to 365 days after receipt of the reconciliation statement. This provides adequate time to engage a professional auditor, obtain the landlord\'s records, and complete a thorough review. Anything less than 90 days is impractical for a meaningful audit.',
      },
      {
        question: 'What if I miss the audit deadline?',
        answer:
          'If the audit deadline passes without a dispute, most leases deem the reconciliation statement accepted and final. You lose the right to challenge any overcharges for that year. This is why a reasonable audit window is critical - it is a use-it-or-lose-it right.',
      },
      {
        question: 'Can the audit window be extended?',
        answer:
          'Only if your lease includes tolling provisions. Well-drafted audit clauses toll the deadline if the landlord delays in producing records, if the landlord provides incomplete information, or if the tenant discovers fraud or intentional misrepresentation. Without these provisions, the deadline is typically firm.',
      },
      {
        question: 'What records should the landlord provide for a CAM audit?',
        answer:
          'The landlord should provide invoices, contracts, general ledger entries, payroll records for on-site staff, tax bills, insurance policies, and any supporting documentation for expenses included in the reconciliation. A well-drafted audit clause specifies the categories of records the landlord must produce.',
      },
    ],
    metaTitle: 'Short Audit Window: Commercial Lease Red Flag',
    metaDescription:
      'Audit windows under 60 days prevent effective CAM oversight. Lextract flags this risk so you can negotiate better terms.',
  },
  {
    ruleId: 'RF-016',
    name: 'Missing Force Majeure Clause',
    slug: 'missing-force-majeure-clause',
    severity: 'medium',
    summary:
      'Your lease does not contain a force majeure clause, leaving you potentially liable for rent and other obligations during unforeseeable events - including pandemics, natural disasters, and government-mandated closures - that are entirely outside your control.',
    detectionRule:
      'Flagged when no force majeure clause is found or when the clause is explicitly absent from the lease.',
    triggeringFields: ['force-majeure-clause'],
    realWorldImpact:
      "Without force majeure protection, tenants remained contractually obligated to pay full rent during COVID-19 shutdowns, even when government orders prohibited the tenant's business from operating. Many tenants without this clause faced default proceedings while their premises sat empty by order of law. The financial exposure depends on lease length and monthly rent - but for a 5-year lease at $10,000 per month, even a 3-month abatement that a force majeure clause might provide represents $30,000 in potential savings.",
    whatToDo:
      'Negotiate a mutual force majeure clause covering both landlord and tenant. The clause should define qualifying events (natural disasters, pandemics, acts of war, government orders, utility failures) and specify that rent obligations are suspended during the period the premises cannot be used for the permitted purpose. Ensure the clause requires the party claiming force majeure to provide written notice within a specified timeframe and take reasonable steps to mitigate the disruption.',
    relatedRedFlags: ['RF-018', 'RF-009'],
    isCamRelated: false,
    commonLeaseTypes: ['NNN', 'Full Service Gross', 'Modified Gross', 'Retail'],
    faqs: [
      {
        question: 'Does force majeure automatically excuse rent payment?',
        answer:
          'Not automatically. The force majeure clause must explicitly address rent obligations. Many clauses only excuse performance obligations (building out the space, operating requirements) but not monetary obligations like rent. Negotiate specifically for rent abatement during qualifying force majeure events, not just performance excuse.',
      },
      {
        question: 'What events should be covered by force majeure?',
        answer:
          'A comprehensive force majeure clause should cover: natural disasters (floods, earthquakes, hurricanes), pandemic or public health emergencies, acts of war or terrorism, government orders restricting use of the premises, extended utility failures, and labor strikes affecting the building. Avoid clauses that list only historical disasters - broad language like "events beyond the reasonable control of the party" provides better protection.',
      },
      {
        question: 'Can I add force majeure to a lease that does not have it?',
        answer:
          'Force majeure must be negotiated before lease execution - it cannot typically be added unilaterally after signing. If you are reviewing an existing lease without this clause, document the absence and consult with an attorney about whether common law doctrines (impossibility, frustration of purpose) might provide partial protection in your jurisdiction.',
      },
    ],
    metaTitle: 'Missing Force Majeure Clause: Commercial Lease Red Flag',
    metaDescription:
      'No force majeure protection leaves tenants liable during pandemics and disasters. Lextract flags this lease risk automatically.',
  },
  {
    ruleId: 'RF-017',
    name: 'Auto-Renewal Without Notice Terms',
    slug: 'auto-renewal-without-notice-terms',
    severity: 'medium',
    summary:
      'Your lease contains an automatic renewal provision but does not specify the required notice period or renewal terms. Without clear notice requirements, you risk being locked into an unwanted lease renewal - with no way to exit - simply because you missed an unspecified deadline.',
    detectionRule:
      'Flagged when auto-renewal is present but the required notice period and renewal terms are not specified in the lease.',
    triggeringFields: ['auto-renewal', 'auto-renewal-terms'],
    realWorldImpact:
      "Tenants have been legally bound to multi-year lease renewals because they missed a notice deadline buried in a lease amendment that cross-referenced the original lease's auto-renewal provision. In one documented case, a tenant's failure to deliver written non-renewal notice 180 days before expiration - rather than the 90 days they expected - resulted in an automatic 3-year renewal at above-market rent. The financial exposure is the full cost of the unwanted renewal term.",
    whatToDo:
      "Negotiate to remove auto-renewal entirely and replace it with a standard renewal option that requires the tenant to affirmatively elect renewal. If the landlord insists on auto-renewal, ensure the notice period, notice method (certified mail to a specific address), and renewal rent formula are all explicitly stated in the same clause. Set a calendar reminder for the notice deadline well before it triggers. Some tenants negotiate for landlord notice requirements - the landlord must remind the tenant of the upcoming auto-renewal deadline at least 30 days before the tenant's notice deadline.",
    relatedRedFlags: ['RF-011'],
    isCamRelated: false,
    commonLeaseTypes: ['Office', 'Industrial', 'Retail'],
    faqs: [
      {
        question: 'How much notice is typically required to prevent auto-renewal?',
        answer:
          'Notice periods for preventing auto-renewal typically range from 60 to 180 days before lease expiration, with 90 days being most common. However, some leases require notice as far as 12 months in advance, particularly for large-space tenants. The exact period must be clearly stated in the lease - ambiguous auto-renewal language is a significant lease risk.',
      },
      {
        question: 'What happens if I miss the auto-renewal notice deadline?',
        answer:
          'If you miss the notice deadline, the lease typically renews automatically for the specified renewal term at the renewal rent. You will likely be legally bound to the renewed term. Courts generally enforce clear auto-renewal provisions, though some states have enacted specific disclosure requirements for commercial auto-renewal clauses.',
      },
    ],
    metaTitle: 'Auto-Renewal Without Notice Terms: Commercial Lease Red Flag',
    metaDescription:
      'Unclear auto-renewal notice requirements can trap tenants in unwanted lease terms. Lextract identifies this risk automatically.',
  },
  {
    ruleId: 'RF-018',
    name: 'No Casualty Termination Right',
    slug: 'no-casualty-termination-right',
    severity: 'medium',
    summary:
      'Your lease does not specify the conditions under which either party can terminate if the premises are substantially damaged or destroyed. Without this right, you could be obligated to continue paying rent on an unusable space while waiting for a rebuilding process that may take years.',
    detectionRule:
      'Flagged when no casualty termination provisions are found in the lease.',
    triggeringFields: ['casualty-termination-right'],
    realWorldImpact:
      "A tenant without casualty termination rights may be required to pay full rent on a fire-damaged space for the 18–24 months it takes the landlord to rebuild. Even with rent abatement during reconstruction, the tenant remains bound to the lease - unable to relocate, sign a new lease, or plan their business operations. In the worst cases, landlords have decided not to rebuild at all while the tenant remained contractually prevented from exiting.",
    whatToDo:
      'Negotiate a tenant termination right triggered when: (1) damage exceeds a specified percentage of the building value (typically 25–50%), (2) the landlord\'s estimate to repair exceeds a specified timeframe (typically 180 days), or (3) damage occurs within the last 12–24 months of the lease term. Ensure rent is fully abated during any period the premises cannot be used. Include a "deemed termination" provision if the landlord fails to commence repairs within a specified period.',
    relatedRedFlags: ['RF-016', 'RF-019'],
    isCamRelated: false,
    commonLeaseTypes: ['NNN', 'Full Service Gross', 'Modified Gross', 'Retail', 'Industrial'],
    faqs: [
      {
        question: 'Is rent abated automatically after a casualty?',
        answer:
          'Not automatically - the lease must include a rent abatement provision for casualty events. Well-drafted leases provide for pro-rata rent abatement based on the percentage of the premises that cannot be used. Without an explicit abatement provision, you may owe full rent even on a space that is completely unusable.',
      },
      {
        question: "What if the landlord won't or can't rebuild?",
        answer:
          'Without a casualty termination right, you may have limited remedies if the landlord fails to rebuild. Negotiate a provision that automatically terminates the lease if the landlord does not commence reconstruction within 90 days of the casualty and complete it within 12–18 months. Include a right to terminate if the landlord notifies you that it will not rebuild.',
      },
    ],
    metaTitle: 'No Casualty Termination Right: Commercial Lease Red Flag',
    metaDescription:
      'Without casualty termination rights, tenants can be trapped in damaged premises. Lextract flags this gap in your lease protection.',
  },
  {
    ruleId: 'RF-019',
    name: 'Relocation Right Present',
    slug: 'relocation-right-present',
    severity: 'medium',
    summary:
      'Your landlord has the contractual right to relocate you to different premises within the building at their discretion. This provision can force costly business disruptions, require you to update client addresses and signage, and move you to a less desirable location - all without your consent.',
    detectionRule:
      'Flagged when the lease grants the landlord the right to relocate the tenant to substitute premises.',
    triggeringFields: ['relocation-right'],
    realWorldImpact:
      "Tenants have been relocated from premium corner spaces to interior locations, from high-traffic ground floor retail to second-floor spaces with significantly lower foot traffic, and from recently renovated suites to spaces requiring substantial reconfiguration. Beyond the operational disruption, relocation can cost $50,000–$200,000 in moving expenses, new signage, updated marketing materials, and business interruption. For professional service firms, relocation can impact client relationships and referral networks tied to a specific address.",
    whatToDo:
      'Negotiate to remove the relocation right entirely. If the landlord insists, require that: (1) substitute premises are at least equal in size and comparable in quality, floor level, and location within the building, (2) the landlord pays all reasonable relocation costs including moving expenses, signage replacement, and temporary business disruption, (3) you have the right to terminate the lease if you do not approve the substitute premises within 30 days, and (4) no relocation occurs within the last 24 months of the lease term.',
    relatedRedFlags: ['RF-009', 'RF-018'],
    isCamRelated: false,
    commonLeaseTypes: ['Full Service Gross', 'Modified Gross', 'Office'],
    faqs: [
      {
        question: 'Why do landlords want relocation rights?',
        answer:
          "Landlords typically request relocation rights to accommodate larger tenant requirements - if a major tenant needs to expand into your space, the landlord wants the flexibility to move you. In multi-tenant buildings, this allows the landlord to cluster tenants, consolidate vacant space, and accommodate anchor tenant expansions. Understanding the landlord's motivation helps you negotiate appropriate limitations.",
      },
      {
        question: 'Can I negotiate compensation for being relocated?',
        answer:
          'Yes, and you should. Standard negotiated protections include: full payment of moving expenses by landlord, new leasehold improvement allowance for the substitute space, payment of all costs to update signage and marketing materials, rent abatement during the relocation period, and a right to terminate if comparable substitute space is unavailable. Some tenants also negotiate a one-time lump sum payment for business disruption.',
      },
    ],
    metaTitle: 'Relocation Right Present: Commercial Lease Red Flag',
    metaDescription:
      'Landlord relocation rights can force costly moves without your consent. Lextract identifies this tenant risk in your lease.',
  },
  {
    ruleId: 'RF-020',
    name: 'No Purchase Option Disclosure',
    slug: 'no-purchase-option-disclosure',
    severity: 'low',
    summary:
      "Your lease does not clearly disclose whether a purchase option exists. Under ASC 842 and IFRS 16 accounting standards, a purchase option that is 'reasonably certain' to be exercised must be included in the lease liability calculation - a disclosure gap that can materially misstate your company's balance sheet.",
    detectionRule:
      'Flagged when the purchase option status is not identified in the lease document.',
    triggeringFields: ['has-purchase-option'],
    realWorldImpact:
      "For companies subject to ASC 842 (US GAAP) or IFRS 16, an undisclosed purchase option creates audit risk. If a purchase option exists and is later determined to be reasonably certain of exercise, the right-of-use asset and lease liability must be recalculated to include the option price in the remaining lease payments. This can increase reported lease liabilities by the full option price - potentially millions of dollars - requiring restatement of prior period financials. External auditors increasingly flag purchase option disclosures as a high-risk area in lease accounting.",
    whatToDo:
      'Ensure the lease explicitly states whether a purchase option exists. If it does, document the option price, exercise conditions, notice requirements, and expiration date. For ASC 842 compliance, your accounting team should assess whether the option is reasonably certain of exercise at each reporting date and adjust the right-of-use asset and lease liability accordingly. If no purchase option exists, consider adding a lease provision explicitly stating this to prevent ambiguity during future audits.',
    relatedRedFlags: ['RF-011'],
    isCamRelated: false,
    commonLeaseTypes: ['Ground Lease', 'NNN', 'Industrial'],
    faqs: [
      {
        question: "What does 'reasonably certain' mean under ASC 842?",
        answer:
          "Under ASC 842, 'reasonably certain' is a high threshold - roughly equivalent to 'probable' under the old lease accounting standard. A purchase option is reasonably certain of exercise when the economic incentive to exercise is significant. Factors include: the option price compared to fair market value, the significance of leasehold improvements, the importance of the location to business operations, and costs of relocation.",
      },
      {
        question: 'How does a purchase option affect the right-of-use asset?',
        answer:
          'When a purchase option is reasonably certain of exercise, the option exercise price is added to the total lease payments used to calculate the right-of-use asset and lease liability at commencement. If the option assessment changes during the lease term (from not reasonably certain to reasonably certain, or vice versa), the lease liability and right-of-use asset must be remeasured. This can create significant balance sheet volatility.',
      },
    ],
    metaTitle: 'No Purchase Option Disclosure: Commercial Lease Red Flag',
    metaDescription:
      'Undisclosed purchase options can misstate ASC 842 lease liabilities. Lextract flags this accounting risk in your commercial lease.',
  },
]

/**
 * Find a red flag by its URL slug.
 */
export function getRedFlagBySlug(slug: string): RedFlagData | undefined {
  return ALL_RED_FLAGS.find((rf) => rf.slug === slug)
}

/**
 * Get all red flag slugs for static generation.
 */
export function getAllRedFlagSlugs(): string[] {
  return ALL_RED_FLAGS.map((rf) => rf.slug)
}

/**
 * Find a red flag by its rule ID (e.g., "RF-001").
 */
const ALL_RED_FLAGS = [...RED_FLAGS]
export const INDEXABLE_RED_FLAGS = filterRetainedSeoItems('red-flags', ALL_RED_FLAGS)

export function getRedFlagByRuleId(ruleId: string): RedFlagData | undefined {
  return ALL_RED_FLAGS.find((rf) => rf.ruleId === ruleId)
}

export function getIndexableRedFlagBySlug(slug: string): RedFlagData | undefined {
  return INDEXABLE_RED_FLAGS.find((rf) => rf.slug === slug)
}

export function getAllIndexableRedFlagSlugs(): string[] {
  return INDEXABLE_RED_FLAGS.map((rf) => rf.slug)
}

/**
 * Get all red flags filtered by severity.
 */
export function getRedFlagsBySeverity(severity: RedFlagSeverity): RedFlagData[] {
  return INDEXABLE_RED_FLAGS.filter((rf) => rf.severity === severity)
}

/**
 * Get all CAM-related red flags.
 */
export function getCamRelatedRedFlags(): RedFlagData[] {
  return INDEXABLE_RED_FLAGS.filter((rf) => rf.isCamRelated)
}

/**
 * Get related red flags for a given red flag.
 */
export function getRelatedRedFlags(ruleId: string): RedFlagData[] {
  const flag = INDEXABLE_RED_FLAGS.find((rf) => rf.ruleId === ruleId)
  if (!flag) return []
  return flag.relatedRedFlags
    .map((id) => INDEXABLE_RED_FLAGS.find((rf) => rf.ruleId === id))
    .filter((rf): rf is RedFlagData => rf !== undefined)
}


// ─── ID-keyed lookup (ruleId → display metadata) ─────────────────
// Used by pSEO detail pages that reference red flags by ruleId string.
// Single source of truth - avoids duplicating this map in multiple page files.
export const RED_FLAG_BY_ID: Record<string, { name: string; slug: string; severity: RedFlagSeverity }> =
  Object.fromEntries(
    ALL_RED_FLAGS.map((rf) => [rf.ruleId, { name: rf.name, slug: rf.slug, severity: rf.severity }])
  )

export function getRedFlagSeoRedirect(slug: string): string | null {
  if (isRetainedSeoSlug('red-flags', slug)) return null
  if (!ALL_RED_FLAGS.some((flag) => flag.slug === slug)) return null
  return getExplicitSeoRedirect('red-flags', slug) ?? '/red-flags'
}
