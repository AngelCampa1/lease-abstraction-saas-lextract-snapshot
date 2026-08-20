// ─── Lease Type Types ────────────────────────────────────────────────

import {
  filterRetainedSeoItems,
  getExplicitSeoRedirect,
  isRetainedSeoSlug,
} from '@/lib/seo-inventory'

export interface LeaseTypeData {
  name: string
  slug: string
  abbreviation: string
  summary: string
  tenantExpenses: string[]
  landlordExpenses: string[]
  typicalIndustries: string[]
  typicalTermLength: string
  criticalFields: string[]
  commonRedFlags: string[]
  comparisonLeaseTypes: string[]
  pros: { forTenant: string[]; forLandlord: string[] }
  cons: { forTenant: string[]; forLandlord: string[] }
  faqs: { question: string; answer: string }[]
  metaTitle: string
  metaDescription: string
}

// ─── Lease Type Data ─────────────────────────────────────────────────

export const LEASE_TYPES: LeaseTypeData[] = [
  {
    name: 'Triple Net Lease (NNN)',
    slug: 'nnn-lease',
    abbreviation: 'NNN',
    summary:
      'A Triple Net Lease requires the tenant to pay base rent plus all three "nets": property taxes, building insurance, and maintenance/operating expenses. The landlord receives a passive income stream with minimal management obligations. NNN leases are the dominant structure for single-tenant retail, fast-food, pharmacy, and automotive properties nationwide.',
    tenantExpenses: [
      'Base rent',
      'Property taxes',
      'Building insurance premiums',
      'Roof and structure maintenance',
      'HVAC systems maintenance and replacement',
      'Parking lot maintenance',
      'Common area maintenance (CAM)',
      'Utilities',
      'Janitorial services',
      'Landscaping',
    ],
    landlordExpenses: [
      'Mortgage / debt service (landlord obligation, not passed to tenant)',
      'Major structural capital improvements (in some NNN variants)',
    ],
    typicalIndustries: [
      'Retail',
      'Fast Food / QSR',
      'Pharmacy',
      'Automotive',
      'Dollar Stores',
      'Banks',
    ],
    typicalTermLength: '10–25 years',
    criticalFields: [
      'base-rent',
      'rent-commencement-date',
      'lease-expiration-date',
      'property-taxes',
      'insurance-requirements',
      'cam-charges',
      'renewal-options',
      'permitted-use',
      'termination-options',
      'assignment-rights',
    ],
    commonRedFlags: [
      'no-cam-cap',
      'missing-audit-rights',
      'no-termination-option',
      'no-renewal-option',
      'excessive-management-fee',
    ],
    comparisonLeaseTypes: [
      'absolute-net-lease',
      'double-net-lease',
      'modified-gross-lease',
      'gross-lease',
    ],
    pros: {
      forTenant: [
        'Predictable base rent with transparent expense pass-throughs',
        'Tenant controls maintenance quality and vendor selection',
        'Long terms provide operational stability and site security',
        'Often negotiable rent with landlord accepting lower base due to net structure',
      ],
      forLandlord: [
        'Passive income with minimal management obligations',
        'Predictable cash flow for underwriting and financing',
        'Tenant absorbs expense risk - landlord not exposed to rising taxes or insurance',
        'Highly financeable - attractive to REIT and 1031 exchange investors',
      ],
    },
    cons: {
      forTenant: [
        'Bears full risk of rising property taxes, insurance, and maintenance costs',
        'Responsible for costly capital replacements (HVAC, roof)',
        'Less flexibility to exit; long terms with limited termination options',
        'Exposure to unexpected structural repairs unless negotiated out',
      ],
      forLandlord: [
        'Lower base rent than gross lease structures',
        'Credit risk concentrated in single tenant',
        'Retenanting costs are high if tenant vacates',
        'Limited ability to increase income beyond scheduled rent bumps',
      ],
    },
    faqs: [
      {
        question: 'What does "triple net" mean in a commercial lease?',
        answer:
          'Triple net means the tenant pays three categories of expenses in addition to base rent: property taxes, building insurance, and maintenance/operating costs. Each of these is one "net," so three nets equals NNN. The landlord receives net rent after all operating costs have been absorbed by the tenant.',
      },
      {
        question: 'Is a NNN lease good for tenants?',
        answer:
          'NNN leases can be favorable for tenants who want control over their space and can negotiate a lower base rent in exchange for taking on expense risk. However, tenants must carefully underwrite estimated operating expenses and negotiate caps on controllable costs. The risk is that taxes, insurance, and maintenance costs rise unexpectedly over a 10–20 year term.',
      },
      {
        question: 'What is the difference between NNN and absolute net?',
        answer:
          'In a standard NNN lease, some structural repairs (like major roof replacement or foundation work) may still be the landlord\'s responsibility depending on how the lease is drafted. In an absolute net or "bondable" net lease, the tenant is responsible for 100% of all expenses including structural, with zero landlord obligations. Absolute net is the more extreme form.',
      },
      {
        question: 'Who pays property taxes in a triple net lease?',
        answer:
          'In a triple net lease, the tenant pays property taxes directly or reimburses the landlord for the tenant\'s pro-rata share. Property taxes are one of the three "nets" - alongside building insurance and maintenance - that distinguish a NNN lease from a gross lease. Tax provisions vary by lease: some require the tenant to pay taxes directly to the taxing authority; others bill the tenant\'s pro-rata share through a monthly escrow with annual reconciliation.',
      },
      {
        question: 'What is included in NNN charges?',
        answer:
          'NNN charges include property taxes, building insurance premiums, and all maintenance and operating costs for the property. In practice, "NNN charges" is often used interchangeably with CAM charges in multi-tenant properties, though in single-tenant NNN leases the tenant may pay these costs directly rather than through a landlord-administered pool. Key items include HVAC maintenance, roof repairs, parking lot upkeep, landscaping, snow removal, utilities for common areas, and property management fees.',
      },
      {
        question: 'How do I read a triple net lease?',
        answer:
          'When reviewing a NNN lease, focus on five areas: (1) The expense definition section - confirm which expenses are included and excluded from the tenant\'s obligation; (2) The rent escalation schedule - verify whether annual increases are fixed percentage, CPI-based, or fair market rent resets; (3) CAM provisions - look for annual caps, exclusions, and audit rights; (4) The roof, structure, and HVAC sections - identify which party bears capital replacement costs; (5) Options - confirm renewal option terms, notice periods, and pricing mechanisms. A full NNN lease abstraction surfaces all these fields in a structured format.',
      },
      {
        question: 'What NNN lease red flags should tenants watch for?',
        answer:
          'The highest-risk NNN lease provisions include: uncapped CAM charges (no limit on annual expense increases), missing tenant audit rights (no ability to verify reconciliation accuracy), capital expenditure pass-throughs classified as maintenance, short dispute windows for reconciliation objections, and absolute net clauses that transfer structural repair obligations entirely to the tenant. Lextract automatically detects these and 15 additional red flag patterns in every NNN lease extraction.',
      },
      {
        question: 'How does Lextract handle NNN lease abstraction?',
        answer:
          'Lextract extracts all 126 fields from NNN leases including base rent, rent escalation schedule, operating expense pass-through definitions, CAM caps, property tax provisions, insurance requirements, renewal options, and termination rights. Red flag detection automatically flags missing CAM caps, absent audit rights, and missing renewal or termination options.',
      },
    ],
    metaTitle: 'Triple Net Lease (NNN) Explained: What Tenants Pay & Key Red Flags',
    metaDescription:
      'Triple net (NNN) leases: tenant pays base rent, property taxes, insurance, and maintenance. Learn NNN expenses, red flags, and the 126 fields to abstract.',
  },
  {
    name: 'Modified Gross Lease',
    slug: 'modified-gross-lease',
    abbreviation: 'MG',
    summary:
      'A Modified Gross Lease is a hybrid structure where the tenant pays a single gross rent amount, but certain operating expenses are negotiated to be the tenant\'s direct responsibility. The specific split of expenses is defined in the lease and varies by deal. Modified gross leases are common in office, flex, and light industrial markets where neither party wants a pure gross or pure net arrangement.',
    tenantExpenses: [
      'Base rent (gross amount)',
      'Utilities (typically metered separately)',
      'Janitorial services within the premises',
      'Interior maintenance and repairs',
      'Negotiated share of operating expense increases above a base year',
    ],
    landlordExpenses: [
      'Property taxes',
      'Building insurance',
      'Common area maintenance',
      'Roof and structure repairs',
      'HVAC maintenance (in many variants)',
      'Landscaping',
      'Parking lot maintenance',
    ],
    typicalIndustries: ['Office', 'Flex Space', 'Medical Office', 'Light Industrial'],
    typicalTermLength: '3–7 years',
    criticalFields: [
      'base-rent',
      'rent-commencement-date',
      'lease-expiration-date',
      'operating-expenses',
      'cam-charges',
      'cam-cap-base-year',
      'tenant-improvement-allowance',
      'renewal-options',
      'permitted-use',
      'subletting-rights',
    ],
    commonRedFlags: [
      'no-cam-cap',
      'missing-audit-rights',
      'excessive-management-fee',
      'no-gross-up-provision',
      'no-reconciliation-frequency',
    ],
    comparisonLeaseTypes: [
      'full-service-gross-lease',
      'nnn-lease',
      'gross-lease',
      'industrial-gross-lease',
    ],
    pros: {
      forTenant: [
        'Predictable monthly cost with landlord absorbing major expense categories',
        'Negotiable structure allows customized expense allocation',
        'Less exposure to unpredictable capital costs like roof or structure',
        'Shorter terms provide flexibility compared to NNN structures',
      ],
      forLandlord: [
        'More income certainty than pure gross lease',
        'Tenant absorbs utility and janitorial costs directly',
        'Flexible structure accommodates a wide range of tenant requirements',
        'Operating expense increases above base year passed through to tenant',
      ],
    },
    cons: {
      forTenant: [
        'Expense allocation varies by deal - must read every provision carefully',
        'Base year provisions can shift costs significantly over time',
        'Less transparent than either a pure gross or pure net structure',
        'Negotiation complexity requires experienced counsel to protect tenant interests',
      ],
      forLandlord: [
        'More complex to administer than pure gross or pure net leases',
        'Annual reconciliation required for expense pass-throughs',
        'Disputes arise more frequently due to ambiguous expense allocation language',
        'Harder to market and explain to prospective tenants unfamiliar with hybrid structures',
      ],
    },
    faqs: [
      {
        question: 'What expenses does the tenant pay in a modified gross lease?',
        answer:
          'It depends on what was negotiated. Typically, tenants pay base rent plus their own utilities and janitorial costs. The landlord covers taxes, insurance, and structural maintenance. Operating expense increases above a base year amount are often passed through to the tenant proportionally. The specific allocation is defined in the lease and varies by deal.',
      },
      {
        question: 'Is a modified gross lease better than a full service gross lease?',
        answer:
          'For tenants who want maximum cost predictability, a full service gross (FSG) lease is simpler since the landlord absorbs all operating expenses. A modified gross lease gives the landlord some protection against expense increases while still shielding the tenant from major capital costs. Neither is inherently better - it depends on market conditions and the tenant\'s risk tolerance.',
      },
      {
        question: 'How does the base year work in a modified gross lease?',
        answer:
          'The base year establishes the baseline level of operating expenses included in the gross rent. In subsequent years, if operating expenses rise above the base year amount, the tenant pays their proportionate share of the increase. This protects the landlord from long-term expense growth while giving the tenant certainty in year one.',
      },
    ],
    metaTitle: 'Modified Gross Lease Explained',
    metaDescription:
      'Modified gross leases split operating expenses between tenant and landlord. Learn expense allocation, base year provisions, and red flags to watch.',
  },
  {
    name: 'Full Service Gross Lease',
    slug: 'full-service-gross-lease',
    abbreviation: 'FSG',
    summary:
      'A Full Service Gross (FSG) lease requires the tenant to pay a single all-inclusive gross rent, and the landlord is responsible for all operating expenses including taxes, insurance, utilities, janitorial, and maintenance. FSG leases are standard in Class A and Class B office buildings. The landlord\'s exposure to rising costs is typically mitigated by a base year expense stop that passes increases to tenants over time.',
    tenantExpenses: [
      'Base gross rent (all-inclusive)',
      'Operating expense increases above base year expense stop (after year one)',
      'Above-standard janitorial or after-hours HVAC (if separately metered)',
    ],
    landlordExpenses: [
      'Property taxes',
      'Building insurance',
      'Common area maintenance',
      'Utilities (electric, water, gas for base building)',
      'HVAC maintenance and replacement',
      'Janitorial services',
      'Landscaping',
      'Security',
      'Roof and structural maintenance',
      'Elevator maintenance',
    ],
    typicalIndustries: ['Class A Office', 'Class B Office', 'Medical Office', 'Government'],
    typicalTermLength: '5–10 years',
    criticalFields: [
      'base-rent',
      'rent-commencement-date',
      'lease-expiration-date',
      'cam-cap-base-year',
      'operating-expenses',
      'cam-charges',
      'tenant-improvement-allowance',
      'renewal-options',
      'termination-options',
      'permitted-use',
    ],
    commonRedFlags: [
      'no-gross-up-provision',
      'missing-audit-rights',
      'no-base-year-gross-up',
      'no-cam-cap',
      'excessive-management-fee',
    ],
    comparisonLeaseTypes: [
      'modified-gross-lease',
      'gross-lease',
      'nnn-lease',
      'double-net-lease',
    ],
    pros: {
      forTenant: [
        'Maximum cost certainty - one rent payment covers all operating expenses',
        'Simplest structure to budget and forecast',
        'No exposure to unpredictable maintenance or capital costs',
        'Landlord incentivized to maintain the building well to control their own costs',
      ],
      forLandlord: [
        'Attractive to a broad tenant market who want simplicity',
        'Base year expense stop protects against long-term cost inflation',
        'Gross up provision ensures costs are fairly allocated in multi-tenant buildings',
        'Ability to bundle services creates operating efficiencies at scale',
      ],
    },
    cons: {
      forTenant: [
        'Base rent is higher than NNN or net lease structures',
        'Expense stop pass-throughs can increase costs significantly after year one',
        'Less visibility into actual building operating costs',
        'Base year selection matters - a low-expense base year benefits landlord in out-years',
      ],
      forLandlord: [
        'Bears full risk of unexpected cost increases in year one',
        'Complex to administer - must track and reconcile expenses for each tenant\'s base year',
        'High building operating costs reduce effective net income',
        'Rising utility or insurance costs can compress margins if base year is poorly set',
      ],
    },
    faqs: [
      {
        question: 'What is included in a full service gross lease?',
        answer:
          'A full service gross lease includes all building operating expenses in the base rent: property taxes, insurance, maintenance, janitorial, utilities, HVAC, and security. The tenant pays one monthly rent with no additional pass-throughs in year one. After the base year, operating expense increases above the expense stop are allocated to tenants proportionally.',
      },
      {
        question: 'What is an expense stop in a full service gross lease?',
        answer:
          'An expense stop is the per-square-foot amount of operating expenses included in the base rent. Once actual expenses exceed the expense stop, the excess is passed through to tenants. The expense stop is usually set at the actual expense level of the base year, meaning tenants absorb all increases after the first year.',
      },
      {
        question: 'Why does the base year gross-up matter in a FSG lease?',
        answer:
          'If a building is partially occupied in the base year, actual expenses will be artificially low because some variable costs (janitorial, utilities) scale with occupancy. Without a gross-up clause, tenants get a low expense stop - meaning they absorb almost all future costs as the building fills. A gross-up provision adjusts the base year to what expenses would have been at full occupancy, protecting tenants.',
      },
    ],
    metaTitle: 'Full Service Gross Lease Explained',
    metaDescription:
      'FSG leases include all operating expenses in one rent payment. Learn base year stops, gross-up provisions, and key red flags for office tenants.',
  },
  {
    name: 'Ground Lease',
    slug: 'ground-lease',
    abbreviation: 'GL',
    summary:
      'A Ground Lease is a long-term lease of land only, where the tenant (ground lessee) finances and constructs improvements on the land they do not own. Ground leases typically run 50–99 years. The tenant owns the improvements during the lease term but the land (and often the improvements) revert to the landowner at expiration. Ground leases are common for retail pads, hotels, office buildings, and government-owned land.',
    tenantExpenses: [
      'Ground rent (land-only rent to landowner)',
      'Property taxes on improvements and sometimes on the land',
      'Construction and development costs for all improvements',
      'Building insurance',
      'All operating expenses for the improvements',
      'Maintenance of the entire property',
      'Leasehold financing costs',
    ],
    landlordExpenses: [
      'Little to no ongoing obligations once lease is executed',
      'May retain responsibility for title defects or environmental conditions predating lease',
    ],
    typicalIndustries: [
      'Retail Pads',
      'Hotels',
      'Office Buildings',
      'Government-Owned Land',
      'University / Institutional',
    ],
    typicalTermLength: '50–99 years',
    criticalFields: [
      'base-rent',
      'rent-commencement-date',
      'lease-expiration-date',
      'renewal-options',
      'assignment-rights',
      'permitted-use',
      'termination-options',
      'subletting-rights',
      'insurance-requirements',
      'property-taxes',
    ],
    commonRedFlags: [
      'no-renewal-option',
      'missing-audit-rights',
      'recapture-right-present',
      'no-termination-option',
      'missing-restoration-clarity',
    ],
    comparisonLeaseTypes: [
      'nnn-lease',
      'absolute-net-lease',
      'build-to-suit-lease',
      'net-lease',
    ],
    pros: {
      forTenant: [
        'Ability to develop and control real estate without purchasing land',
        'Leasehold interest is financeable - can pledge improvements as collateral',
        'Long lease terms provide generational operational security',
        'Land cost is spread over lease payments rather than paid upfront',
      ],
      forLandlord: [
        'Retains ownership of land (appreciating asset) while receiving income',
        'Improvements revert to landowner at lease expiration - significant wealth creation',
        'Minimal management obligations once lease is in place',
        'Ground rent is bondable and highly creditworthy if tenant is investment-grade',
      ],
    },
    cons: {
      forTenant: [
        'Improvements revert to landowner at expiration - massive at-risk investment',
        'Leasehold financing is more complex and expensive than fee simple financing',
        'Subordinated ground lease creates lender risk for construction financing',
        'Very long terms make renegotiation or exit extremely difficult',
      ],
      forLandlord: [
        'Locked into long lease term - cannot sell or redevelop land for decades',
        'Ground rent may not keep pace with land value appreciation',
        'Periodic rent resets (if any) are often contested',
        'Difficult to reposition property if tenant defaults mid-term',
      ],
    },
    faqs: [
      {
        question: 'Who owns the building in a ground lease?',
        answer:
          'During the lease term, the tenant (ground lessee) owns the improvements they construct on the land. The landowner owns the land itself. At lease expiration, ownership of the improvements typically reverts to the landowner, which is why long terms (50-99 years) are essential to allow the tenant to amortize their construction investment.',
      },
      {
        question: 'Can you get financing on a ground lease property?',
        answer:
          'Yes, leasehold financing is possible but more complex than fee simple financing. Lenders require the ground lease term to extend well beyond the loan maturity - typically at least 20-30 years beyond the loan term. They also require protection against lease termination events that would eliminate their collateral. Subordinated ground leases (where the landowner subordinates their fee interest) provide the strongest lender protection.',
      },
      {
        question: 'What happens to the building at the end of a ground lease?',
        answer:
          'Unless the ground lease contains an option to purchase the land or provides for lease renewal, the improvements revert to the landowner at lease expiration without compensation to the tenant. This is why ground lessees must negotiate meaningful renewal options and ensure the initial lease term is long enough to fully amortize their investment.',
      },
    ],
    metaTitle: 'Ground Lease Explained',
    metaDescription:
      'Ground leases: tenant leases land, builds improvements, and loses them at expiration. Learn 50-99 year terms, leasehold financing, and red flags.',
  },
  {
    name: 'Percentage Lease',
    slug: 'percentage-lease',
    abbreviation: 'PCT',
    summary:
      'A Percentage Lease requires the tenant to pay a base rent plus a percentage of gross sales above a specified breakpoint. The percentage rent component aligns landlord income with tenant performance, making it common in retail malls, outlet centers, and high-foot-traffic retail. Breakpoints can be "natural" (calculated based on base rent divided by percentage rate) or "artificial" (set by negotiation at a lower threshold).',
    tenantExpenses: [
      'Base rent (minimum rent)',
      'Percentage rent on gross sales above the breakpoint',
      'CAM charges and operating expenses (often NNN or modified gross)',
      'Gross sales reporting and audit costs',
      'Utilities and janitorial',
    ],
    landlordExpenses: [
      'Common area maintenance (in gross lease variants)',
      'Structural maintenance (varies by lease type layered on top)',
      'Building insurance (in some structures)',
    ],
    typicalIndustries: [
      'Regional Malls',
      'Outlet Centers',
      'Strip Centers',
      'Entertainment Retail',
      'Food & Beverage',
    ],
    typicalTermLength: '5–15 years',
    criticalFields: [
      'base-rent',
      'percentage-rent-rate',
      'percentage-rent-breakpoint',
      'gross-sales-reporting',
      'rent-commencement-date',
      'lease-expiration-date',
      'cam-charges',
      'renewal-options',
      'permitted-use',
      'assignment-rights',
    ],
    commonRedFlags: [
      'missing-audit-rights',
      'no-cam-cap',
      'no-renewal-option',
      'short-audit-window',
      'excessive-management-fee',
    ],
    comparisonLeaseTypes: [
      'modified-gross-lease',
      'full-service-gross-lease',
      'nnn-lease',
      'gross-lease',
    ],
    pros: {
      forTenant: [
        'Lower base rent burden during slow sales periods',
        'Rent exposure capped by sales performance - can\'t pay more than business generates',
        'Aligns landlord incentives with tenant success (landlord wants tenant to thrive)',
        'Natural breakpoint ensures percentage rent only kicks in when business is profitable',
      ],
      forLandlord: [
        'Upside participation in successful tenant performance',
        'Income grows with inflation and sales growth without separate escalation clauses',
        'Attracts tenants who cannot commit to high fixed rent',
        'Market-rate income in strong retail environments',
      ],
    },
    cons: {
      forTenant: [
        'Gross sales reporting obligations are administratively burdensome',
        'Landlord audit rights expose tenant financial records',
        'Artificial breakpoints can trigger percentage rent at lower sales levels',
        'Definition of "gross sales" is often contested - must be carefully defined',
      ],
      forLandlord: [
        'Income unpredictable - varies with tenant performance and macroeconomic conditions',
        'Complex to administer - requires annual sales reports and potentially audits',
        'Tenant may underreport sales without robust audit provisions',
        'Declining retail sales can compress income significantly',
      ],
    },
    faqs: [
      {
        question: 'What is a natural breakpoint in a percentage lease?',
        answer:
          'A natural breakpoint is calculated by dividing the annual base rent by the percentage rate. For example, if base rent is $60,000 per year and the percentage rate is 6%, the natural breakpoint is $1,000,000. The tenant pays no percentage rent until gross sales exceed $1,000,000, meaning percentage rent only kicks in when the business is profitable enough to cover the rent at the contractual rate.',
      },
      {
        question: 'What counts as gross sales in a percentage lease?',
        answer:
          'The lease definition of gross sales is critical. Typically it includes all revenue from the leased premises, but tenants should negotiate exclusions for sales taxes, returns and allowances, employee discounts, sales to employees at cost, catalog or internet sales not fulfilled from the premises, and gift card sales until redeemed. Without careful definition, tenants can be charged percentage rent on revenue that does not represent true operating income.',
      },
      {
        question: 'How does Lextract abstract percentage rent provisions?',
        answer:
          'Lextract extracts the percentage rent rate, breakpoint amount, breakpoint type (natural vs. artificial), gross sales reporting frequency, audit rights provisions, and exclusions from gross sales. Red flag detection flags missing gross sales reporting requirements and absent audit rights, which are critical for protecting both parties.',
      },
    ],
    metaTitle: 'Percentage Lease Explained',
    metaDescription:
      'Percentage leases combine base rent and a cut of gross sales. Learn breakpoints, natural vs artificial, gross sales definitions, and red flags.',
  },
  {
    name: 'Net Lease',
    slug: 'net-lease',
    abbreviation: 'N',
    summary:
      'A Net Lease (single net, or "N lease") requires the tenant to pay base rent plus one additional expense category on top - most commonly property taxes. The landlord retains responsibility for insurance and building maintenance. Single net leases are less common than NNN or NN structures but appear in certain older retail, industrial, and some government-leased properties.',
    tenantExpenses: [
      'Base rent',
      'Property taxes (the primary "net")',
      'Utilities within the premises',
      'Interior maintenance and repairs',
      'Janitorial services',
    ],
    landlordExpenses: [
      'Building insurance',
      'Roof and structural maintenance',
      'Common area maintenance',
      'HVAC systems',
      'Parking lot',
      'Landscaping',
    ],
    typicalIndustries: [
      'Older Retail Properties',
      'Industrial',
      'Government-Leased Properties',
      'Medical',
    ],
    typicalTermLength: '3–10 years',
    criticalFields: [
      'base-rent',
      'property-taxes',
      'rent-commencement-date',
      'lease-expiration-date',
      'insurance-requirements',
      'operating-expenses',
      'renewal-options',
      'permitted-use',
      'assignment-rights',
      'subletting-rights',
    ],
    commonRedFlags: [
      'missing-audit-rights',
      'no-renewal-option',
      'no-termination-option',
      'excessive-management-fee',
    ],
    comparisonLeaseTypes: [
      'double-net-lease',
      'nnn-lease',
      'gross-lease',
      'modified-gross-lease',
    ],
    pros: {
      forTenant: [
        'Limited expense exposure compared to NNN - only one net to absorb',
        'Landlord retains insurance and maintenance risk',
        'More balanced cost-sharing than NNN structures',
        'Simpler than modified gross - only one additional expense category',
      ],
      forLandlord: [
        'Property tax pass-through protects against one of the most volatile expense categories',
        'Retains control over building maintenance quality',
        'Easier to administer than NNN or modified gross structures',
      ],
    },
    cons: {
      forTenant: [
        'Property taxes can be highly volatile and politically driven',
        'Reassessment events can spike costs dramatically',
        'Tax appeal rights and process may not be specified in lease',
      ],
      forLandlord: [
        'Retains insurance and maintenance cost risk',
        'Less expense pass-through protection than NNN or NN structures',
        'Property maintenance quality depends on landlord, not tenant',
      ],
    },
    faqs: [
      {
        question: 'What is the difference between a net lease and triple net lease?',
        answer:
          'A single net (N) lease passes only one expense category - typically property taxes - to the tenant. A double net (NN) lease passes taxes and insurance. A triple net (NNN) lease passes taxes, insurance, and maintenance/operating expenses. NNN is the most common net lease structure in US commercial real estate today.',
      },
      {
        question: 'Who pays insurance in a single net lease?',
        answer:
          'In a single net lease, the landlord typically pays for building insurance. The tenant is responsible for their own contents and liability insurance, but the building property insurance is the landlord\'s cost. This distinguishes N leases from NN and NNN structures where insurance is a tenant obligation.',
      },
      {
        question: 'Are net leases common in modern commercial real estate?',
        answer:
          'Pure single net leases are relatively uncommon in new construction today. Most net lease transactions use NNN or modified gross structures. However, single net provisions appear in older properties and some government leases where the landlord prefers to retain control over building maintenance and insurance.',
      },
    ],
    metaTitle: 'Net Lease (Single Net) Explained',
    metaDescription:
      'Single net leases: tenant pays base rent plus property taxes. Learn the difference from NNN and NN, expense allocation, and critical fields.',
  },
  {
    name: 'Double Net Lease',
    slug: 'double-net-lease',
    abbreviation: 'NN',
    summary:
      'A Double Net Lease (NN) requires the tenant to pay base rent plus two expense categories: property taxes and building insurance. The landlord retains responsibility for structural maintenance including roof and foundation. Double net leases are common in retail, industrial, and multi-tenant properties where the landlord wants to retain control over building structure while passing tax and insurance risk to tenants.',
    tenantExpenses: [
      'Base rent',
      'Property taxes',
      'Building insurance premiums',
      'Utilities',
      'Interior maintenance and repairs',
      'Janitorial services',
      'HVAC maintenance (in some NN leases)',
    ],
    landlordExpenses: [
      'Roof repairs and replacement',
      'Structural/foundation maintenance',
      'Common area maintenance',
      'Parking lot (in most NN structures)',
      'HVAC systems (in some NN leases)',
      'Landscaping',
    ],
    typicalIndustries: ['Retail', 'Industrial', 'Multi-Tenant Strip Centers', 'Flex Space'],
    typicalTermLength: '5–15 years',
    criticalFields: [
      'base-rent',
      'property-taxes',
      'insurance-requirements',
      'rent-commencement-date',
      'lease-expiration-date',
      'cam-charges',
      'renewal-options',
      'operating-expenses',
      'permitted-use',
      'assignment-rights',
    ],
    commonRedFlags: [
      'missing-audit-rights',
      'no-cam-cap',
      'no-renewal-option',
      'no-termination-option',
      'excessive-management-fee',
    ],
    comparisonLeaseTypes: [
      'nnn-lease',
      'net-lease',
      'absolute-net-lease',
      'modified-gross-lease',
    ],
    pros: {
      forTenant: [
        'Landlord retains structural risk - no surprise roof or foundation assessments',
        'More balanced than NNN while still providing cost transparency',
        'Tenant controls insurance carrier selection for building coverage',
        'Clear delineation between tenant and landlord responsibilities',
      ],
      forLandlord: [
        'Tax and insurance pass-throughs cover the two most volatile expense categories',
        'Retains structural integrity by controlling roof and foundation maintenance',
        'Better protection than gross lease against expense inflation',
        'Attractive to institutional investors seeking moderate leverage',
      ],
    },
    cons: {
      forTenant: [
        'Still exposed to property tax reassessments and insurance premium spikes',
        'Tax appeal rights may not be specified - tenant pays but cannot contest assessments',
        'Insurance requirements can be onerous for smaller tenants',
      ],
      forLandlord: [
        'Retains structural maintenance risk - major roof replacements are landlord costs',
        'Less expense pass-through than NNN or absolute net structures',
        'Structural repairs unpredictable and can be expensive',
      ],
    },
    faqs: [
      {
        question: 'What is the difference between NN and NNN leases?',
        answer:
          'A double net (NN) lease passes property taxes and insurance to the tenant, but the landlord retains responsibility for structural maintenance including roof and foundation. A triple net (NNN) lease passes all three - taxes, insurance, and maintenance - to the tenant, including structural repairs. NNN gives landlords the most passive income position.',
      },
      {
        question: 'Who pays for a new roof in a double net lease?',
        answer:
          'In a double net lease, the landlord typically pays for roof repairs and replacement because maintenance is the landlord\'s retained responsibility. This is the key distinction from a NNN lease. However, tenants should read the lease carefully - some "NN" leases actually pass HVAC and parking lot maintenance to the tenant, making them closer to NNN in practice.',
      },
      {
        question: 'How does Lextract handle NN lease abstraction?',
        answer:
          'Lextract extracts and clearly identifies the expense allocation structure, flagging whether the lease is truly NN (taxes and insurance only) or whether additional maintenance obligations have been passed to the tenant. Critical fields include property tax provisions, insurance requirements, and the maintenance responsibility section. Red flags include missing audit rights and absent caps on operating expenses.',
      },
    ],
    metaTitle: 'Double Net Lease (NN) Explained',
    metaDescription:
      'Double net leases: tenant pays rent, taxes, and insurance. Landlord keeps structural maintenance. Learn NN vs NNN differences and red flags.',
  },
  {
    name: 'Absolute Net Lease',
    slug: 'absolute-net-lease',
    abbreviation: 'AN',
    summary:
      'An Absolute Net Lease (also called a bondable net lease) places 100% of property-related expenses and risks on the tenant, including structural repairs, roof replacement, and foundation work. The landlord has zero ongoing obligations - they receive rent as a passive income stream equivalent to a bond. Absolute net leases are typically reserved for investment-grade single tenants on long-term deals, often 20+ years.',
    tenantExpenses: [
      'Base rent',
      'Property taxes',
      'Building insurance (all types)',
      'Roof repair and replacement',
      'Structural and foundation repairs',
      'HVAC systems - maintenance, repair, and replacement',
      'All common area maintenance',
      'Utilities',
      'Parking lot maintenance',
      'Landscaping',
      'Environmental remediation',
      'All capital expenditures',
    ],
    landlordExpenses: [
      'None - landlord has zero ongoing property obligations',
    ],
    typicalIndustries: [
      'Investment-Grade Retail',
      'Pharmacy (Walgreens, CVS)',
      'Fast Food (Corporate)',
      'Dollar Stores',
      'Banks (Corporate Branches)',
    ],
    typicalTermLength: '20–25 years',
    criticalFields: [
      'base-rent',
      'rent-commencement-date',
      'lease-expiration-date',
      'renewal-options',
      'assignment-rights',
      'insurance-requirements',
      'property-taxes',
      'permitted-use',
      'termination-options',
      'subletting-rights',
    ],
    commonRedFlags: [
      'no-renewal-option',
      'no-termination-option',
      'missing-restoration-clarity',
      'recapture-right-present',
      'missing-audit-rights',
    ],
    comparisonLeaseTypes: [
      'nnn-lease',
      'double-net-lease',
      'net-lease',
      'ground-lease',
    ],
    pros: {
      forTenant: [
        'Maximum control over building condition and vendor selection',
        'Lower base rent than gross or modified gross structures',
        'Predictable landlord relationship - no expense disputes',
        'Full operational autonomy with no landlord interference',
      ],
      forLandlord: [
        'Pure passive income - zero property management obligations',
        'Lease is functionally equivalent to a long-term bond investment',
        'Highly financeable - lenders love absolute net leases with investment-grade tenants',
        'Property can be sold at low cap rates to net lease investors',
      ],
    },
    cons: {
      forTenant: [
        'Bears all property risk - one catastrophic event can mean millions in repair costs',
        'Responsible for roof replacement - often $200,000 to $1,000,000+ per event',
        'Structural repairs are unpredictable and can be financially devastating',
        'Very long terms (20-25 years) reduce flexibility significantly',
      ],
      forLandlord: [
        'Zero control over property condition - landlord cannot force maintenance',
        'If tenant defaults, property may be in poor condition',
        'Lower yields than actively managed properties due to passive nature',
        'Tenant credit quality is everything - there is no fallback income if tenant fails',
      ],
    },
    faqs: [
      {
        question: 'Why is an absolute net lease called a "bondable" lease?',
        answer:
          'An absolute net lease is called bondable because the landlord\'s income stream is as predictable and passive as a bond coupon. The investment-grade tenant pays rent unconditionally regardless of property condition, and the landlord has no operating obligations. Investors treat these leases as bond-equivalent assets and price them at very low cap rates similar to bond yields.',
      },
      {
        question: 'Who uses absolute net leases?',
        answer:
          'Absolute net leases are typically executed by investment-grade corporate tenants - major pharmacy chains like Walgreens and CVS, fast-food corporations like McDonald\'s and Starbucks, dollar store chains, and major banks. These tenants have the financial strength to absorb all property risk and the operational scale to manage properties efficiently.',
      },
      {
        question: 'What is the difference between an absolute net lease and a NNN lease?',
        answer:
          'A standard NNN lease may still hold the landlord responsible for structural elements like foundation and sometimes roof in practice depending on how the lease is drafted. An absolute net lease explicitly transfers all expenses and risks including structural to the tenant with no exceptions. The absolute net lease is the extreme end of the net lease spectrum.',
      },
    ],
    metaTitle: 'Absolute Net Lease Explained',
    metaDescription:
      'Absolute net leases transfer all expenses to the tenant - zero landlord obligations. Learn bondable net leases, investment-grade tenants, and risks.',
  },
  {
    name: 'Gross Lease',
    slug: 'gross-lease',
    abbreviation: 'GRS',
    summary:
      'A Gross Lease requires the tenant to pay a single fixed rent amount, and the landlord pays all operating expenses from that gross rent. The tenant has maximum cost certainty and no exposure to expense volatility. Gross leases are common in older office buildings, some industrial properties, and smaller commercial spaces where landlords prefer simplicity over expense optimization.',
    tenantExpenses: [
      'Base gross rent (fixed, all-inclusive)',
      'Their own contents and liability insurance',
      'Above-standard utility usage in some cases',
    ],
    landlordExpenses: [
      'Property taxes',
      'Building insurance',
      'Common area maintenance',
      'HVAC maintenance and replacement',
      'Utilities (electric, water, gas)',
      'Roof and structure maintenance',
      'Janitorial services',
      'Landscaping',
      'Parking lot maintenance',
      'Security',
    ],
    typicalIndustries: [
      'Older Office Buildings',
      'Small Commercial Spaces',
      'Industrial (older stock)',
      'Retail (smaller properties)',
    ],
    typicalTermLength: '1–5 years',
    criticalFields: [
      'base-rent',
      'rent-commencement-date',
      'lease-expiration-date',
      'operating-expenses',
      'insurance-requirements',
      'renewal-options',
      'termination-options',
      'permitted-use',
      'subletting-rights',
      'assignment-rights',
    ],
    commonRedFlags: [
      'missing-audit-rights',
      'no-renewal-option',
      'no-termination-option',
      'aggressive-holdover-rate',
      'short-cure-period',
    ],
    comparisonLeaseTypes: [
      'modified-gross-lease',
      'full-service-gross-lease',
      'net-lease',
      'nnn-lease',
    ],
    pros: {
      forTenant: [
        'Maximum cost certainty - one payment, no surprises',
        'Simplest lease structure to administer',
        'No exposure to rising taxes, insurance, or maintenance costs',
        'Landlord absorbs all operating risk',
      ],
      forLandlord: [
        'Simple to administer with no annual reconciliations',
        'Predictable tenant relationships - fewer disputes over expenses',
        'Attractive to smaller or less sophisticated tenants',
        'Higher base rent compensates for absorbed operating costs',
      ],
    },
    cons: {
      forTenant: [
        'Higher base rent than net lease structures',
        'Less transparency into building operating costs',
        'No ability to control or reduce operating costs',
        'Landlord has less incentive to be cost-efficient',
      ],
      forLandlord: [
        'Bears full risk of unexpected operating cost increases',
        'Rising costs compress net income over the lease term',
        'No mechanism to pass through tax, insurance, or utility spikes',
        'Incentive to defer maintenance to preserve income margin',
      ],
    },
    faqs: [
      {
        question: 'What does the tenant pay in a gross lease?',
        answer:
          'In a gross lease, the tenant pays only the fixed base rent. The landlord pays all operating expenses including property taxes, building insurance, maintenance, utilities, janitorial, and HVAC. The tenant has no additional financial obligations beyond the stated rent amount.',
      },
      {
        question: 'Is a gross lease better for tenants than a NNN lease?',
        answer:
          'For tenants who want simplicity and cost certainty, gross leases are preferable. However, the base rent in a gross lease will be higher than in a NNN lease to compensate the landlord for absorbing operating expenses. Whether a gross lease is "better" depends on the actual operating cost levels and the tenant\'s ability to manage and control expenses in a NNN structure.',
      },
      {
        question: 'What is the difference between a gross lease and a full service gross lease?',
        answer:
          'A gross lease typically has no expense pass-through mechanism - the landlord bears all operating costs for the entire lease term. A full service gross (FSG) lease includes an expense stop provision that allows the landlord to pass through operating expense increases above a base year threshold. FSG is more common in institutional office buildings; gross leases appear more in older or smaller properties.',
      },
    ],
    metaTitle: 'Gross Lease Explained',
    metaDescription:
      'Gross leases: tenant pays one fixed rent, landlord covers all expenses. Learn differences from full service gross, NNN, and key lease terms.',
  },
  {
    name: 'Industrial Gross Lease',
    slug: 'industrial-gross-lease',
    abbreviation: 'IG',
    summary:
      'An Industrial Gross Lease is a gross lease variant common in warehouse and distribution properties. The tenant pays a fixed gross rent plus utilities and janitorial for their own space. The landlord covers structural maintenance, roof, parking, property taxes, and insurance. This structure gives industrial tenants cost simplicity while protecting the landlord\'s building through retained control of structural elements.',
    tenantExpenses: [
      'Base gross rent',
      'Utilities (metered separately - electric, gas, water)',
      'Janitorial services within the warehouse/premises',
      'Interior non-structural repairs',
      'Dock equipment maintenance in some cases',
    ],
    landlordExpenses: [
      'Property taxes',
      'Building insurance',
      'Roof maintenance and replacement',
      'Structural repairs',
      'Parking lot and truck court maintenance',
      'Common area lighting',
      'Landscaping',
      'Fire suppression systems',
    ],
    typicalIndustries: [
      'Warehouse / Distribution',
      'Light Manufacturing',
      'Flex Industrial',
      'Last-Mile Logistics',
      'Cold Storage',
    ],
    typicalTermLength: '3–10 years',
    criticalFields: [
      'base-rent',
      'rent-commencement-date',
      'lease-expiration-date',
      'operating-expenses',
      'insurance-requirements',
      'property-taxes',
      'renewal-options',
      'permitted-use',
      'tenant-improvement-allowance',
      'assignment-rights',
    ],
    commonRedFlags: [
      'missing-audit-rights',
      'no-cam-cap',
      'no-renewal-option',
      'no-termination-option',
      'aggressive-holdover-rate',
    ],
    comparisonLeaseTypes: [
      'gross-lease',
      'modified-gross-lease',
      'nnn-lease',
      'double-net-lease',
    ],
    pros: {
      forTenant: [
        'Predictable base cost with only utilities and janitorial as variable expenses',
        'Landlord retains structural risk - no surprise roof or parking lot assessments',
        'Simple structure appropriate for operational focus of industrial tenants',
        'Clearer expense delineation than NNN for warehouse operators',
      ],
      forLandlord: [
        'Retains control of structural elements critical to building value',
        'Higher base rent compensates for absorbed structural costs',
        'Tenant utility metering eliminates dispute over utility allocation',
        'Suitable for multi-tenant industrial buildings with shared infrastructure',
      ],
    },
    cons: {
      forTenant: [
        'Higher base rent than NNN industrial leases',
        'Utility costs in large warehouse operations can be significant',
        'Less control over maintenance quality than NNN tenants',
        'Dock equipment and specialized fixtures may have unclear responsibility',
      ],
      forLandlord: [
        'Structural maintenance and roof replacement are significant expense risks',
        'Property condition depends on landlord maintenance - affects building value',
        'No mechanism to pass through tax or insurance increases mid-term',
        'Industrial roof replacements can cost $500,000 to $1,500,000+',
      ],
    },
    faqs: [
      {
        question: 'What is the difference between an industrial gross lease and a NNN industrial lease?',
        answer:
          'In an industrial gross lease, the landlord covers property taxes, insurance, structural repairs, and roof. The tenant pays base rent plus utilities and janitorial. In a NNN industrial lease, the tenant covers all three nets including taxes, insurance, and maintenance - often including roof and structural depending on the lease language. Industrial gross is more tenant-favorable on the structural side.',
      },
      {
        question: 'Who pays utilities in an industrial gross lease?',
        answer:
          'In an industrial gross lease, the tenant pays utilities directly - they are metered and billed separately from the base rent. This is the primary "tenant net" in an IG lease structure. Electric costs in large warehouse operations can be substantial, so tenants should carefully model utility expenses before signing.',
      },
      {
        question: 'Are industrial gross leases common?',
        answer:
          'Industrial gross leases are most common in older industrial stock, smaller warehouse facilities, and multi-tenant flex industrial buildings. Newer, large-format distribution centers tend to use NNN or modified gross structures. Industrial gross leases are prevalent in markets like Southern California, New Jersey, and Chicago where older industrial stock dominates.',
      },
    ],
    metaTitle: 'Industrial Gross Lease Explained',
    metaDescription:
      'Industrial gross leases: tenant pays rent and utilities, landlord covers structure and taxes. Learn warehouse lease terms and expense allocations.',
  },
  {
    name: 'Build-to-Suit Lease',
    slug: 'build-to-suit-lease',
    abbreviation: 'BTS',
    summary:
      'A Build-to-Suit Lease is a long-term lease where the landlord (developer) constructs a building to the tenant\'s exact specifications on land the landlord owns or acquires. The tenant commits to the lease before construction begins, typically for 15-25 years. After completion, the lease usually operates as a NNN structure. BTS transactions are common for corporate headquarters, distribution centers, and large retail users.',
    tenantExpenses: [
      'Base rent (typically NNN after construction completion)',
      'Property taxes',
      'Building insurance',
      'All maintenance and operating expenses (NNN structure)',
      'HVAC maintenance and replacement',
      'Utilities',
      'Janitorial services',
    ],
    landlordExpenses: [
      'Land acquisition cost',
      'Construction financing and development costs',
      'Construction contingency and overruns (in landlord-driven BTS)',
      'Pre-construction development fees',
    ],
    typicalIndustries: [
      'Corporate Headquarters',
      'Distribution / Fulfillment Centers',
      'Manufacturing',
      'Healthcare Campuses',
      'Data Centers',
    ],
    typicalTermLength: '15–25 years',
    criticalFields: [
      'base-rent',
      'rent-commencement-date',
      'lease-expiration-date',
      'tenant-improvement-allowance',
      'renewal-options',
      'termination-options',
      'assignment-rights',
      'permitted-use',
      'insurance-requirements',
      'property-taxes',
    ],
    commonRedFlags: [
      'no-renewal-option',
      'no-termination-option',
      'missing-restoration-clarity',
      'recapture-right-present',
      'missing-audit-rights',
    ],
    comparisonLeaseTypes: [
      'nnn-lease',
      'absolute-net-lease',
      'ground-lease',
      'modified-gross-lease',
    ],
    pros: {
      forTenant: [
        'Building designed and constructed to exact operational specifications',
        'Avoids capital expenditure of purchasing land and building',
        'Long-term site security aligned with business planning horizons',
        'Developer absorbs construction risk and financing complexity',
      ],
      forLandlord: [
        'Pre-leased before construction - zero lease-up risk',
        'Long lease term (15-25 years) provides exceptional income certainty',
        'Investment-grade tenants command low cap rate sales to net lease investors',
        'Development fee and yield-on-cost spread create strong returns',
      ],
    },
    cons: {
      forTenant: [
        'Locked into very long lease term before construction is complete',
        'Changes to specifications after groundbreaking are expensive',
        'Residual value of custom-built space is low if tenant exits early',
        'Construction delays can disrupt operations planning',
      ],
      forLandlord: [
        'Construction risk - cost overruns reduce yield-on-cost returns',
        'Long development timeline before rent commences',
        'Tenant credit risk is critical - no alternative tenant for custom-built space',
        'Highly specialized buildings have limited retenanting options on default',
      ],
    },
    faqs: [
      {
        question: 'When does rent start in a build-to-suit lease?',
        answer:
          'Rent commencement in a build-to-suit lease is tied to construction completion and delivery of the premises to the tenant. The lease will specify a rent commencement date based on substantial completion, a certificate of occupancy, or a negotiated number of days after delivery. Tenants should negotiate a hard rent commencement date rather than one solely based on construction milestones.',
      },
      {
        question: 'What happens if construction is delayed in a build-to-suit lease?',
        answer:
          'Most build-to-suit leases address construction delays through force majeure provisions and landlord delay provisions. If the landlord causes delays, tenants typically receive free rent credits or have the right to extend the lease term at their option. If delays exceed a threshold, some leases give the tenant a termination right. These provisions must be carefully negotiated before execution.',
      },
      {
        question: 'How does Lextract abstract build-to-suit leases?',
        answer:
          'Lextract extracts all 126 standard fields from build-to-suit leases including the rent commencement trigger, construction completion definitions, tenant improvement allowance (if any), renewal options, termination rights, and the operating expense structure post-completion. Red flag detection flags missing termination options, absent renewal rights, and unclear restoration obligations at expiration.',
      },
    ],
    metaTitle: 'Build-to-Suit Lease Explained',
    metaDescription:
      'Build-to-suit leases: developer builds to tenant spec, tenant commits for 15-25 years. Learn BTS structure, NNN operation, and critical abstractions.',
  },
]

// ─── Accessor Functions ────────────────────────────────────────────────

const ALL_LEASE_TYPES = [...LEASE_TYPES]
export const INDEXABLE_LEASE_TYPES = filterRetainedSeoItems('lease-types', ALL_LEASE_TYPES)

export function getLeaseTypeBySlug(slug: string): LeaseTypeData | undefined {
  return ALL_LEASE_TYPES.find((lt) => lt.slug === slug)
}

export function getAllLeaseTypeSlugs(): string[] {
  return ALL_LEASE_TYPES.map((lt) => lt.slug)
}

export function getIndexableLeaseTypeBySlug(slug: string): LeaseTypeData | undefined {
  return INDEXABLE_LEASE_TYPES.find((lt) => lt.slug === slug)
}

export function getAllIndexableLeaseTypeSlugs(): string[] {
  return INDEXABLE_LEASE_TYPES.map((lt) => lt.slug)
}

export function getLeaseTypeByName(name: string): LeaseTypeData | undefined {
  const normalized = name.toLowerCase().trim()
  if (normalized.length === 0) return undefined
  return ALL_LEASE_TYPES.find((lt) => {
    const ltName = lt.name.toLowerCase()
    const ltAbbr = lt.abbreviation.toLowerCase()
    return ltName === normalized || ltAbbr === normalized || ltName.includes(normalized)
  })
}

export function getLeaseTypeSeoRedirect(slug: string): string | null {
  if (isRetainedSeoSlug('lease-types', slug)) return null
  if (!ALL_LEASE_TYPES.some((leaseType) => leaseType.slug === slug)) return null
  return getExplicitSeoRedirect('lease-types', slug) ?? '/lease-types'
}
