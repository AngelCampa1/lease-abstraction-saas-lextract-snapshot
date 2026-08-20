// ─── Field Types ────────────────────────────────────────────────────

import {
  filterRetainedSeoItems,
  getExplicitSeoRedirect,
  isRetainedSeoSlug,
} from '@/lib/seo-inventory'

export type FieldCategory =
  | 'parties-property'
  | 'key-dates-term'
  | 'rent-escalations'
  | 'cam-operating-expenses'
  | 'options'
  | 'tenant-improvements'
  | 'insurance-indemnity'
  | 'assignment-subletting'
  | 'default-remedies'
  | 'exclusivity-cotenancy'
  | 'parking-common-areas'
  | 'utilities'
  | 'signage-permitted-use'
  | 'miscellaneous'

export interface FieldData {
  fieldName: string
  slug: string
  displayLabel: string
  category: FieldCategory
  categoryLabel: string
  description: string
  aliases: string[]
  dataType: string
  required: boolean
  camRelevant: boolean
  whyItMatters: string
  whereToFindIt: string
  relatedRedFlags: string[]
  relatedFields: string[]
  relatedGlossaryTerms: string[]
  faqs: { question: string; answer: string }[]
  metaTitle: string
  metaDescription: string
}

// ─── Category Display Labels ────────────────────────────────────────

export const FIELD_CATEGORY_LABELS: Record<FieldCategory, string> = {
  'parties-property': 'Parties & Property',
  'key-dates-term': 'Key Dates & Term',
  'rent-escalations': 'Rent & Escalations',
  'cam-operating-expenses': 'CAM & Operating Expenses',
  'options': 'Options',
  'tenant-improvements': 'Tenant Improvements & Construction',
  'insurance-indemnity': 'Insurance & Indemnity',
  'assignment-subletting': 'Assignment & Subletting',
  'default-remedies': 'Default & Remedies',
  'exclusivity-cotenancy': 'Exclusivity & Co-tenancy',
  'parking-common-areas': 'Parking & Common Areas',
  'utilities': 'Utilities',
  'signage-permitted-use': 'Signage & Permitted Use',
  'miscellaneous': 'Miscellaneous',
}

// ─── Category Mapping ───────────────────────────────────────────────


// ─── Field Data ─────────────────────────────────────────────────────

export const FIELDS: FieldData[] = [
  // ━━━ Parties & Property (10 fields) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    fieldName: 'landlord_legal_name',
    slug: 'landlord-legal-name',
    displayLabel: 'Landlord Name',
    category: 'parties-property',
    categoryLabel: 'Parties & Property',
    description: 'The legal corporate name of the landlord/lessor.',
    aliases: ['Lessor', 'Landlord', 'Owner', 'Property Owner'],
    dataType: 'string',
    required: true,
    camRelevant: false,
    whyItMatters:
      'Misidentifying the landlord entity can invalidate lease enforcement, rent payments, and legal notices. If the landlord is a single-purpose LLC that later dissolves, the tenant needs to know the exact entity to pursue remedies or negotiate amendments. Accurate entity identification also matters for estoppel certificates and SNDA agreements during property sales.',
    whereToFindIt:
      'Typically on the first page of the lease in the preamble or recitals section, immediately following "This Lease Agreement" language. May also appear in the signature block at the end of the document.',
    relatedRedFlags: [],
    relatedFields: ['tenant-legal-name', 'guarantor-name', 'premises-address'],
    relatedGlossaryTerms: ['lease-abstract', 'lease-abstraction'],
    faqs: [
      {
        question: 'Why does it matter which entity is listed as the landlord?',
        answer:
          'The landlord entity determines who is legally responsible for maintenance obligations, security deposit returns, and honoring lease options. If the entity listed is a holding company with no assets, the tenant may have limited recourse if the landlord breaches the lease.',
      },
      {
        question: 'What happens if the landlord entity changes during the lease term?',
        answer:
          'Most leases include a provision allowing the landlord to assign its interest to a new owner. The tenant should verify that the new owner formally assumes all landlord obligations. An SNDA agreement with the lender provides additional protection during ownership transitions.',
      },
    ],
    metaTitle: 'Landlord Name in Commercial Leases',
    metaDescription:
      'Learn why correctly identifying the landlord legal entity is critical for lease enforcement, rent payments, and legal notices in commercial real estate.',
  },
  {
    fieldName: 'tenant_legal_name',
    slug: 'tenant-legal-name',
    displayLabel: 'Tenant Name',
    category: 'parties-property',
    categoryLabel: 'Parties & Property',
    description: 'The legal corporate entity leasing the premises.',
    aliases: ['Lessee', 'Occupant'],
    dataType: 'string',
    required: true,
    camRelevant: false,
    whyItMatters:
      'The tenant entity on the lease determines financial liability, creditworthiness evaluation, and whether a personal guarantee is necessary. If a franchise operator signs under a different LLC than expected, the landlord may have limited recourse against the broader organization in the event of default.',
    whereToFindIt:
      'Found in the lease preamble on page one, typically alongside the landlord name. Also confirmed in the signature block and any guaranty exhibit.',
    relatedRedFlags: [],
    relatedFields: ['landlord-legal-name', 'guarantor-name', 'continuing-liability'],
    relatedGlossaryTerms: ['personal-guarantee', 'assignment-and-subletting'],
    faqs: [
      {
        question: 'Should the tenant name match the business operating name?',
        answer:
          'Not necessarily. The lease should list the legal entity (e.g., "ABC Holdings LLC"), which may differ from the trade name ("ABC Coffee"). The permitted use clause typically specifies what trade names can be used at the premises.',
      },
      {
        question: 'Can a tenant change the entity name on the lease?',
        answer:
          'Changing the tenant entity usually requires landlord consent and may trigger assignment provisions. A simple name change (same entity, new name) is typically permitted with written notice, but converting from an LLC to a corporation may constitute an assignment.',
      },
    ],
    metaTitle: 'Tenant Name in Commercial Leases',
    metaDescription:
      'Understand why the tenant legal entity on a commercial lease determines financial liability, creditworthiness, and guaranty requirements.',
  },
  {
    fieldName: 'guarantor_name',
    slug: 'guarantor-name',
    displayLabel: 'Guarantor Name',
    category: 'parties-property',
    categoryLabel: 'Parties & Property',
    description: 'The entity or individual providing financial backing for the tenant.',
    aliases: [],
    dataType: 'array',
    required: false,
    camRelevant: false,
    whyItMatters:
      'A guarantor provides the landlord with a secondary source of recovery if the tenant entity defaults. Without knowing who guaranteed the lease, asset managers cannot pursue collections effectively. Guarantors also need to be tracked for potential liability reduction negotiations as the lease matures.',
    whereToFindIt:
      'Usually found in a separate Guaranty exhibit or addendum attached to the end of the lease. The guarantor is named in the guaranty agreement and cross-referenced in the lease preamble.',
    relatedRedFlags: [],
    relatedFields: ['tenant-legal-name', 'landlord-legal-name', 'has-guaranty'],
    relatedGlossaryTerms: ['personal-guarantee'],
    faqs: [
      {
        question: 'What is the difference between a personal guarantee and a corporate guarantee?',
        answer:
          'A personal guarantee makes an individual (usually the business owner) liable with their personal assets. A corporate guarantee makes a parent company or affiliated entity liable. Corporate guarantees are preferred by tenants because they shield personal assets.',
      },
      {
        question: 'Can a guarantor be released from liability during the lease term?',
        answer:
          'Some leases include "burning" guaranty provisions that reduce or eliminate the guarantee after a specified period of timely rent payments, such as 24 or 36 consecutive months. This must be explicitly negotiated into the lease.',
      },
    ],
    metaTitle: 'Guarantor Name in Commercial Leases',
    metaDescription:
      'Learn how guarantors provide financial backing in commercial leases and why identifying them is essential for collections and liability management.',
  },
  {
    fieldName: 'premises_address',
    slug: 'premises-address',
    displayLabel: 'Premises Address',
    category: 'parties-property',
    categoryLabel: 'Parties & Property',
    description: 'The full physical address of the leased space.',
    aliases: [],
    dataType: 'string',
    required: true,
    camRelevant: false,
    whyItMatters:
      'The premises address defines the exact location subject to the lease and is critical for legal notices, insurance certificates, and tax filings. An incorrect address can void insurance coverage and create ambiguity about which property is bound by the lease terms. It also determines the governing jurisdiction for dispute resolution.',
    whereToFindIt:
      'Stated in the lease preamble or a "Premises" definition section within the first few pages. Often supplemented by an Exhibit showing the floor plan or site plan with the demised area highlighted.',
    relatedRedFlags: [],
    relatedFields: ['suite-or-unit-number', 'rentable-square-footage', 'property-use-type'],
    relatedGlossaryTerms: ['lease-abstract'],
    faqs: [
      {
        question: 'What if the lease lists a different address than the actual property?',
        answer:
          'Discrepancies between the lease address and the actual property address can create legal issues with notice delivery, insurance claims, and lien filings. Any such discrepancy should be corrected via a lease amendment as soon as it is discovered.',
      },
      {
        question: 'Does the premises address include the suite number?',
        answer:
          'Sometimes the suite number is included in the address, but in multi-tenant buildings it is usually broken out separately to allow for suite reassignments without amending the full address. Both should be verified during abstraction.',
      },
    ],
    metaTitle: 'Premises Address in Commercial Leases',
    metaDescription:
      'The premises address defines the leased location for legal notices, insurance, and jurisdiction. Learn why accuracy matters in lease abstraction.',
  },
  {
    fieldName: 'suite_or_unit_number',
    slug: 'suite-or-unit-number',
    displayLabel: 'Suite/Unit Number',
    category: 'parties-property',
    categoryLabel: 'Parties & Property',
    description: 'The specific identifier for the tenant\'s space within a multi-tenant building.',
    aliases: [],
    dataType: 'string',
    required: false,
    camRelevant: false,
    whyItMatters:
      'In multi-tenant buildings, the suite number is the only way to pinpoint which physical space is subject to the lease. Errors here can lead to disputes about which unit the tenant actually controls, particularly when floor plans change or suites are renumbered during a building renovation.',
    whereToFindIt:
      'Found alongside the premises address in the preamble or "Demised Premises" section. Also referenced on the floor plan exhibit and in the rent schedule.',
    relatedRedFlags: [],
    relatedFields: ['premises-address', 'rentable-square-footage', 'usable-square-footage'],
    relatedGlossaryTerms: ['lease-abstract'],
    faqs: [
      {
        question: 'What happens if the suite number changes during the lease?',
        answer:
          'Building owners sometimes renumber suites during renovations. The lease should include language allowing administrative updates to the suite number without requiring a formal amendment, though best practice is to confirm the change in a letter agreement.',
      },
      {
        question: 'Is a suite number required for all commercial leases?',
        answer:
          'Single-tenant buildings or freestanding retail properties may not have a suite number. In multi-tenant properties, however, the suite number is essential for distinguishing the demised premises from other occupied spaces.',
      },
    ],
    metaTitle: 'Suite/Unit Number in Commercial Leases',
    metaDescription:
      'The suite or unit number identifies the exact leased space in multi-tenant buildings. Learn why this field matters for lease abstraction.',
  },
  {
    fieldName: 'rentable_square_footage',
    slug: 'rentable-square-footage',
    displayLabel: 'Rentable Area (RSF)',
    category: 'parties-property',
    categoryLabel: 'Parties & Property',
    description: 'The total area for which the tenant pays rent, including common area allocations.',
    aliases: [],
    dataType: 'number',
    required: true,
    camRelevant: true,
    whyItMatters:
      'Rentable square footage is the multiplier for nearly every financial calculation in the lease: base rent, TI allowance, pro rata share of operating expenses, and parking ratios. A 500 RSF measurement error on a $30/RSF lease means $15,000 per year in overpayment or underpayment. RSF also determines the tenant\'s share of CAM charges for the entire lease term.',
    whereToFindIt:
      'Defined in the "Premises" or "Demised Premises" section, typically within the first 5 pages. May also appear in a rent schedule exhibit or a measurement certification exhibit.',
    relatedRedFlags: [],
    relatedFields: ['usable-square-footage', 'building-total-rsf', 'load-factor', 'pro-rata-share'],
    relatedGlossaryTerms: ['rentable-square-footage', 'usable-square-footage', 'base-rent'],
    faqs: [
      {
        question: 'What is the difference between rentable and usable square footage?',
        answer:
          'Usable square footage (USF) is the private space the tenant actually occupies. Rentable square footage (RSF) adds the tenant\'s proportionate share of common areas like lobbies, hallways, and restrooms. RSF is always larger than USF, and the difference is captured by the load factor.',
      },
      {
        question: 'Can a tenant challenge the landlord\'s RSF measurement?',
        answer:
          'Yes. Many leases allow tenants to have the space independently measured using BOMA standards within a specified period after lease execution. If the remeasurement shows a discrepancy, the rent and pro rata share should be adjusted accordingly.',
      },
      {
        question: 'How does RSF affect operating expense calculations?',
        answer:
          'The tenant\'s pro rata share of building operating expenses is typically calculated as the tenant\'s RSF divided by the building\'s total RSF. A larger RSF means a proportionally larger share of CAM, taxes, and insurance pass-throughs.',
      },
    ],
    metaTitle: 'Rentable Area (RSF) in Commercial Leases',
    metaDescription:
      'Rentable square footage determines base rent, CAM charges, and TI allowances. Learn how RSF is calculated and why it matters for lease costs.',
  },
  {
    fieldName: 'usable_square_footage',
    slug: 'usable-square-footage',
    displayLabel: 'Usable Area (USF)',
    category: 'parties-property',
    categoryLabel: 'Parties & Property',
    description: 'The exact private physical space occupied by the tenant.',
    aliases: [],
    dataType: 'number',
    required: false,
    camRelevant: false,
    whyItMatters:
      'USF determines how much space the tenant can actually use for operations, including desk counts, inventory storage, and equipment placement. Comparing USF across proposals reveals which building offers the most efficient space for the money, since two buildings with identical RSF can have very different usable areas depending on their load factors.',
    whereToFindIt:
      'Listed in the "Premises" section near the RSF figure. Sometimes only stated in a measurement exhibit or BOMA certification. In some leases, only RSF is provided and USF must be calculated using the load factor.',
    relatedRedFlags: [],
    relatedFields: ['rentable-square-footage', 'load-factor', 'ti-allowance-per-rsf'],
    relatedGlossaryTerms: ['usable-square-footage', 'rentable-square-footage'],
    faqs: [
      {
        question: 'Why do some leases only list RSF and not USF?',
        answer:
          'Landlords prefer to emphasize RSF because it is the billing basis. If USF is not stated, you can estimate it by dividing RSF by one plus the load factor. For example, 10,000 RSF with a 15% load factor implies approximately 8,696 USF.',
      },
      {
        question: 'How is usable square footage measured?',
        answer:
          'USF is measured to the interior faces of the tenant\'s walls following BOMA standards. It includes private offices, open work areas, and storage rooms but excludes shared corridors, elevator shafts, mechanical rooms, and restrooms.',
      },
    ],
    metaTitle: 'Usable Area (USF) in Commercial Leases',
    metaDescription:
      'Usable square footage measures the tenant\'s actual private space. Learn how USF differs from RSF and why it matters for space planning.',
  },
  {
    fieldName: 'building_total_rsf',
    slug: 'building-total-rsf',
    displayLabel: 'Building Total RSF',
    category: 'parties-property',
    categoryLabel: 'Parties & Property',
    description: 'The total rentable square footage of the entire building or shopping center.',
    aliases: [],
    dataType: 'number',
    required: true,
    camRelevant: true,
    whyItMatters:
      'Building total RSF is the denominator in the pro rata share calculation that determines how much of the building\'s operating expenses the tenant pays. If the building RSF is understated, the tenant\'s pro rata share is inflated, resulting in higher CAM charges every month for the entire lease term. A 10% error on a building with $500,000 in annual CAM could cost a tenant thousands per year.',
    whereToFindIt:
      'Usually stated in the "Operating Expenses" or "Pro Rata Share" section. Sometimes defined in the lease preamble or in an exhibit that includes the building specifications.',
    relatedRedFlags: [],
    relatedFields: ['rentable-square-footage', 'pro-rata-share', 'load-factor'],
    relatedGlossaryTerms: ['rentable-square-footage', 'cam-charges', 'operating-expense-pass-through'],
    faqs: [
      {
        question: 'Can the building total RSF change during the lease term?',
        answer:
          'Yes, through building expansions, remeasurement, or conversion of common areas to rentable space. Some leases lock the building RSF for pro rata share purposes, while others allow it to float. Tenants should negotiate a fixed denominator to prevent their share from increasing unexpectedly.',
      },
      {
        question: 'How does building RSF affect my pro rata share?',
        answer:
          'Your pro rata share equals your RSF divided by the building total RSF. For example, if you lease 5,000 RSF in a 100,000 RSF building, your share is 5%. You pay 5% of all pass-through operating expenses including CAM, taxes, and insurance.',
      },
    ],
    metaTitle: 'Building Total RSF in Commercial Leases',
    metaDescription:
      'Building total RSF determines your pro rata share of operating expenses. Learn why this number matters for CAM charges and lease costs.',
  },
  {
    fieldName: 'load_factor',
    slug: 'load-factor',
    displayLabel: 'Load Factor',
    category: 'parties-property',
    categoryLabel: 'Parties & Property',
    description: 'The ratio mapping usable to rentable space to account for common areas.',
    aliases: ['Core Factor', 'Common Area Factor'],
    dataType: 'percentage',
    required: false,
    camRelevant: false,
    whyItMatters:
      'The load factor reveals the hidden premium tenants pay for common areas. A building with a 20% load factor means for every 1,000 usable square feet, the tenant pays rent on 1,200 RSF. Comparing load factors between competing buildings is essential for evaluating true occupancy cost. Office buildings typically range from 10% to 20%, and anything above 20% should raise questions about measurement methodology.',
    whereToFindIt:
      'Sometimes explicitly stated in the Premises section or measurement exhibit. More often, it must be calculated by dividing RSF by USF and subtracting one. Some landlords avoid disclosing the load factor directly.',
    relatedRedFlags: [],
    relatedFields: ['rentable-square-footage', 'usable-square-footage', 'building-total-rsf'],
    relatedGlossaryTerms: ['rentable-square-footage', 'usable-square-footage'],
    faqs: [
      {
        question: 'What is a typical load factor for a commercial office building?',
        answer:
          'Most multi-tenant office buildings have load factors between 12% and 18%. Single-story buildings tend to be more efficient (10-12%), while high-rise towers with large lobbies and mechanical floors can reach 18-22%. Industrial properties typically have load factors under 5%.',
      },
      {
        question: 'How do I calculate the load factor if it is not in the lease?',
        answer:
          'Divide the rentable square footage by the usable square footage, then subtract 1 and multiply by 100. For example: (11,500 RSF / 10,000 USF) - 1 = 0.15, or a 15% load factor.',
      },
    ],
    metaTitle: 'Load Factor in Commercial Leases',
    metaDescription:
      'The load factor reveals how much extra you pay for common areas. Learn how to calculate and compare load factors across lease proposals.',
  },
  {
    fieldName: 'property_use_type',
    slug: 'property-use-type',
    displayLabel: 'Property Type',
    category: 'parties-property',
    categoryLabel: 'Parties & Property',
    description: 'The designated classification of the space.',
    aliases: [],
    dataType: 'string',
    required: true,
    camRelevant: false,
    whyItMatters:
      'Property type (office, retail, industrial, medical, etc.) determines which lease clauses are relevant and which market benchmarks apply. CAM structures differ dramatically between retail and office properties, and insurance requirements vary by use type. Misclassifying a property during abstraction can lead to applying the wrong lease-review benchmark for that property type.',
    whereToFindIt:
      'Stated in the lease preamble or "Premises" section. Sometimes implied by the permitted use clause rather than explicitly classified. The lease title itself often indicates the property type (e.g., "Office Lease Agreement" vs. "Retail Lease Agreement").',
    relatedRedFlags: [],
    relatedFields: ['premises-address', 'permitted-use-description', 'lease-structure-type'],
    relatedGlossaryTerms: ['nnn-lease', 'gross-lease'],
    faqs: [
      {
        question: 'Does the property type affect which lease terms are most important?',
        answer:
          'Absolutely. Retail leases prioritize percentage rent, co-tenancy, and exclusive use provisions. Industrial leases focus on clear height, loading docks, and power capacity. Office leases emphasize base year stops, janitorial services, and after-hours HVAC charges.',
      },
      {
        question: 'What are the main property types in commercial real estate?',
        answer:
          'The primary types are office, retail, industrial/warehouse, medical, flex/R&D, and mixed-use. Each has distinct lease structures, market benchmarks, and standard clauses that abstractors must understand.',
      },
    ],
    metaTitle: 'Property Type in Commercial Leases',
    metaDescription:
      'Property type determines which lease clauses and market benchmarks apply. Learn how office, retail, and industrial leases differ.',
  },

  // ━━━ Key Dates & Term (7 fields) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    fieldName: 'execution_date',
    slug: 'execution-date',
    displayLabel: 'Execution Date',
    category: 'key-dates-term',
    categoryLabel: 'Key Dates & Term',
    description: 'The date the lease agreement was fully signed by all parties.',
    aliases: [],
    dataType: 'date',
    required: true,
    camRelevant: false,
    whyItMatters:
      'The execution date establishes when the lease becomes a binding contract, which affects statutes of limitation, estoppel certifications, and amendment sequencing. If multiple amendments exist, knowing the original execution date allows you to determine the correct order of precedence. It also starts the clock on any pre-commencement obligations like security deposit delivery or insurance certificate submission.',
    whereToFindIt:
      'Found on the first page of the lease in the preamble (e.g., "This Lease is made and entered into as of...") or near the signature blocks at the end of the document. Sometimes the last signatory date controls.',
    relatedRedFlags: [],
    relatedFields: ['commencement-date', 'rent-commencement-date', 'expiration-date'],
    relatedGlossaryTerms: ['critical-date', 'lease-abstract'],
    faqs: [
      {
        question: 'Is the execution date the same as the commencement date?',
        answer:
          'No. The execution date is when the lease is signed, while the commencement date is when the lease term officially begins. They can be months apart, especially when landlord construction work must be completed before the tenant takes possession.',
      },
      {
        question: 'What if the landlord and tenant signed on different dates?',
        answer:
          'The execution date is typically the date of the last signature. Some leases specify that the "effective date" controls regardless of when individual parties signed. The abstractor should note both dates if they differ.',
      },
    ],
    metaTitle: 'Execution Date in Commercial Leases',
    metaDescription:
      'The execution date marks when a lease becomes binding. Learn how it differs from the commencement date and why it matters for compliance.',
  },
  {
    fieldName: 'commencement_date',
    slug: 'commencement-date',
    displayLabel: 'Commencement Date',
    category: 'key-dates-term',
    categoryLabel: 'Key Dates & Term',
    description: 'The date the legal term of the lease officially begins.',
    aliases: [],
    dataType: 'date',
    required: true,
    camRelevant: false,
    whyItMatters:
      'The commencement date is the anchor for calculating the expiration date, renewal deadlines, and every date-dependent obligation in the lease. If the commencement date is contingent on landlord delivery and gets delayed, it can cascade into delayed rent commencement, shortened free rent periods, and disrupted business opening timelines. Missing this date during abstraction undermines the entire critical date calendar.',
    whereToFindIt:
      'Defined in the "Term" section of the lease, usually within the first 5 pages. If contingent on delivery, look for a "Commencement Date Confirmation Letter" exhibit that memorializes the actual date after the conditions are met.',
    relatedRedFlags: [],
    relatedFields: ['execution-date', 'rent-commencement-date', 'expiration-date', 'possession-date'],
    relatedGlossaryTerms: ['commencement-date', 'critical-date'],
    faqs: [
      {
        question: 'What triggers the commencement date in a commercial lease?',
        answer:
          'The commencement date can be a fixed calendar date, or it can be triggered by an event like the landlord delivering the premises in "tenant-ready" condition. Some leases tie it to the earlier of the tenant opening for business or a specified date.',
      },
      {
        question: 'What is a commencement date confirmation letter?',
        answer:
          'It is a document signed by both parties after the actual commencement date is determined, memorializing the official start date, rent commencement date, and expiration date. It is especially important when the commencement date was contingent on construction completion.',
      },
    ],
    metaTitle: 'Commencement Date in Commercial Leases',
    metaDescription:
      'The commencement date anchors every lease deadline from expiration to renewal. Learn what triggers it and how delays affect your lease.',
  },
  {
    fieldName: 'rent_commencement_date',
    slug: 'rent-commencement-date',
    displayLabel: 'Rent Commencement',
    category: 'key-dates-term',
    categoryLabel: 'Key Dates & Term',
    description: 'The date the tenant is legally obligated to begin paying base rent.',
    aliases: [],
    dataType: 'date',
    required: true,
    camRelevant: false,
    whyItMatters:
      'The gap between the commencement date and the rent commencement date represents free rent, which can be worth tens of thousands of dollars. A tenant with a $25,000/month base rent and a 3-month gap saves $75,000. If this date is extracted incorrectly, the accounting team may begin accruing rent obligations at the wrong time, leading to financial statement errors and strained landlord relationships.',
    whereToFindIt:
      'Defined in the "Rent" or "Term" section, usually close to the commencement date definition. In leases with free rent periods, it may be defined as "X months after the Commencement Date" rather than a specific calendar date.',
    relatedRedFlags: [],
    relatedFields: ['commencement-date', 'rent-abatement-period', 'base-rent-annual'],
    relatedGlossaryTerms: ['base-rent', 'commencement-date', 'critical-date'],
    faqs: [
      {
        question: 'Can the rent commencement date differ from the lease commencement date?',
        answer:
          'Yes, and it frequently does. Tenants often negotiate a free rent period for build-out, so the lease term may start on January 1 while rent payments do not begin until April 1. During the gap, the tenant typically still pays operating expenses and insurance.',
      },
      {
        question: 'Does the tenant owe any payments before the rent commencement date?',
        answer:
          'While base rent is typically abated, most leases require the tenant to pay their pro rata share of operating expenses, taxes, and insurance from the commencement date. The free rent period usually applies only to base rent, not additional rent.',
      },
    ],
    metaTitle: 'Rent Commencement in Commercial Leases',
    metaDescription:
      'The rent commencement date marks when base rent begins. Learn how free rent periods work and why this date matters for financial planning.',
  },
  {
    fieldName: 'expiration_date',
    slug: 'expiration-date',
    displayLabel: 'Expiration Date',
    category: 'key-dates-term',
    categoryLabel: 'Key Dates & Term',
    description: 'The date the lease term naturally concludes without renewal.',
    aliases: [],
    dataType: 'date',
    required: true,
    camRelevant: false,
    whyItMatters:
      'The expiration date is the most important critical date in the lease. Missing it means the tenant either faces holdover penalties at 150-200% of base rent or loses the ability to negotiate renewal terms from a position of strength. For portfolio managers with hundreds of leases, tracking expiration dates is essential for staggering renewal negotiations and avoiding concentration of lease maturities.',
    whereToFindIt:
      'Stated in the "Term" section, either as a specific calendar date or calculated from the commencement date plus the lease term in months. Confirmed in the commencement date confirmation letter if the start date was contingent.',
    relatedRedFlags: ['RF-008'],
    relatedFields: ['commencement-date', 'lease-term-months', 'has-renewal-option', 'holdover-rate'],
    relatedGlossaryTerms: ['critical-date', 'holdover-provision'],
    faqs: [
      {
        question: 'What happens if a tenant stays past the expiration date?',
        answer:
          'The tenant enters "holdover" status and is typically subject to a significantly increased rent rate (often 150% to 200% of the last base rent). The tenant may also be liable for consequential damages if a new tenant was expecting to take possession.',
      },
      {
        question: 'How far in advance should a tenant prepare for lease expiration?',
        answer:
          'Most advisors recommend beginning renewal or relocation planning 12 to 18 months before expiration. Renewal option notice deadlines are typically 6 to 12 months before expiration, so missing that window eliminates the contractual right to renew.',
      },
    ],
    metaTitle: 'Expiration Date in Commercial Leases',
    metaDescription:
      'The lease expiration date is the most critical deadline to track. Learn about holdover penalties and when to start renewal planning.',
  },
  {
    fieldName: 'lease_term_months',
    slug: 'lease-term-months',
    displayLabel: 'Lease Term (Months)',
    category: 'key-dates-term',
    categoryLabel: 'Key Dates & Term',
    description: 'The total duration of the initial lease term expressed in months.',
    aliases: [],
    dataType: 'number',
    required: true,
    camRelevant: false,
    whyItMatters:
      'Lease term length directly impacts total financial exposure. A 120-month lease at $10,000/month represents $1.2 million in total base rent obligation. The term also affects amortization of TI allowances, free rent concessions, and tenant improvement costs. Longer terms provide stability but reduce flexibility, especially if the tenant\'s space needs change.',
    whereToFindIt:
      'Stated in the "Term" section, typically expressed as a number of months or years. May need to be calculated from the commencement and expiration dates if not stated explicitly.',
    relatedRedFlags: ['RF-009'],
    relatedFields: ['commencement-date', 'expiration-date', 'has-termination-option'],
    relatedGlossaryTerms: ['critical-date', 'lease-abstraction'],
    faqs: [
      {
        question: 'What is the standard lease term for commercial real estate?',
        answer:
          'Office leases typically run 5 to 10 years, retail leases 5 to 15 years, and industrial leases 3 to 10 years. Shorter terms give tenants flexibility; longer terms provide landlords with revenue certainty and make the property more attractive for financing.',
      },
      {
        question: 'Does the lease term include free rent periods?',
        answer:
          'Yes. The lease term is the total duration from commencement to expiration, regardless of whether rent is abated during any portion. A 60-month lease with 3 months of free rent still has a 60-month term.',
      },
    ],
    metaTitle: 'Lease Term (Months) in Commercial Leases',
    metaDescription:
      'The lease term determines total financial exposure and flexibility. Learn typical durations and how term length affects commercial lease negotiations.',
  },
  {
    fieldName: 'possession_date',
    slug: 'possession-date',
    displayLabel: 'Possession Date',
    category: 'key-dates-term',
    categoryLabel: 'Key Dates & Term',
    description: 'The date the landlord grants the tenant physical access to the space.',
    aliases: [],
    dataType: 'date',
    required: false,
    camRelevant: false,
    whyItMatters:
      'The possession date determines when the tenant can begin build-out work, which affects the entire project timeline from construction to store opening. If the landlord delivers late, it may trigger rent abatement extensions, delay damages, or even termination rights depending on how many days late delivery occurs. Tracking this date is essential for coordinating contractor schedules and grand opening plans.',
    whereToFindIt:
      'Found in the "Term" or "Delivery of Possession" section. May be the same as the commencement date or may precede it to allow for pre-commencement construction access. Sometimes defined in a separate early access agreement.',
    relatedRedFlags: [],
    relatedFields: ['commencement-date', 'rent-commencement-date', 'landlord-work-description'],
    relatedGlossaryTerms: ['commencement-date', 'force-majeure'],
    faqs: [
      {
        question: 'Is the possession date always the same as the commencement date?',
        answer:
          'Not always. The landlord may grant early access for the tenant to begin construction before the lease term officially starts. In those cases, the possession date precedes the commencement date, and the tenant may occupy under a separate early access agreement.',
      },
      {
        question: 'What happens if the landlord fails to deliver possession on time?',
        answer:
          'Most leases provide a grace period (30-90 days) before the tenant can exercise remedies. After that, the tenant may be entitled to rent abatement, extended free rent, or in extreme cases, the right to terminate the lease entirely.',
      },
    ],
    metaTitle: 'Possession Date in Commercial Leases',
    metaDescription:
      'The possession date determines when tenants gain physical access for build-out. Learn how late delivery affects rent and lease timelines.',
  },
  {
    fieldName: 'rent_abatement_period',
    slug: 'rent-abatement-period',
    displayLabel: 'Free Rent Period',
    category: 'key-dates-term',
    categoryLabel: 'Key Dates & Term',
    description: 'The duration during which the tenant is excused from paying base rent.',
    aliases: [],
    dataType: 'string',
    required: false,
    camRelevant: false,
    whyItMatters:
      'Free rent is one of the most valuable concessions in a commercial lease. Three months of free rent on a $30,000/month lease is worth $65,000 in immediate cash flow savings. Missing this during abstraction means the accounting team may begin accruing rent too early, and the tenant may overpay. Abatement provisions also define whether the free rent is forfeited upon default, which creates significant financial risk.',
    whereToFindIt:
      'Stated in the "Rent" section or in a separate "Rent Abatement" or "Free Rent" clause. May also appear in an amendment or side letter. The specific months that qualify are often tied to the commencement or rent commencement date.',
    relatedRedFlags: [],
    relatedFields: ['rent-commencement-date', 'commencement-date', 'base-rent-annual'],
    relatedGlossaryTerms: ['base-rent', 'commencement-date'],
    faqs: [
      {
        question: 'Does free rent apply to all charges or just base rent?',
        answer:
          'Most free rent provisions abate only base rent. The tenant typically still owes their share of operating expenses, real estate taxes, and insurance during the abatement period. Some landlords negotiate "gross free rent" that covers everything, but this is less common.',
      },
      {
        question: 'What happens to free rent if the tenant defaults?',
        answer:
          'Many leases include a "clawback" provision requiring the tenant to repay abated rent if they default during the lease term. This effectively converts the free rent concession into a contingent loan, which can amount to tens of thousands of dollars in unexpected liability.',
      },
    ],
    metaTitle: 'Free Rent Period in Commercial Leases',
    metaDescription:
      'Free rent periods save tenants thousands in cash flow. Learn how rent abatement works, what charges are excluded, and the risks of default clawbacks.',
  },

  // ━━━ Rent & Escalations (8 fields) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    fieldName: 'base_rent_annual',
    slug: 'base-rent-annual',
    displayLabel: 'Annual Base Rent',
    category: 'rent-escalations',
    categoryLabel: 'Rent & Escalations',
    description: 'The total base rent payable for the first full lease year.',
    aliases: [],
    dataType: 'currency',
    required: true,
    camRelevant: false,
    whyItMatters:
      'Annual base rent is the single largest cost component in most commercial leases. It serves as the foundation for calculating holdover penalties (often 150-200% of base rent), security deposit requirements (typically 1-3 months), and the overall NPV of the lease obligation. Extracting the wrong figure propagates errors through every financial analysis downstream.',
    whereToFindIt:
      'Defined in the "Rent" or "Base Rent" section, usually within the first 10 pages. Often presented as a schedule showing annual rent, monthly rent, and per-RSF rates for each year of the term.',
    relatedRedFlags: [],
    relatedFields: ['rent-payment-frequency', 'escalation-type', 'fixed-escalation-rate'],
    relatedGlossaryTerms: ['base-rent', 'rent-escalation-schedule'],
    faqs: [
      {
        question: 'How is annual base rent typically quoted in commercial leases?',
        answer:
          'Base rent is usually quoted as a dollar amount per rentable square foot per year (e.g., $30/RSF/yr). To calculate monthly payments, multiply the per-RSF rate by the total RSF and divide by 12. A $30/RSF rate on 5,000 RSF equals $150,000/year or $12,500/month.',
      },
      {
        question: 'Does base rent include operating expenses?',
        answer:
          'In a NNN lease, base rent does not include operating expenses -- those are billed separately. In a gross or full-service lease, base rent may include a base amount of operating expenses, with increases above the base year passed through as additional rent.',
      },
      {
        question: 'What is the difference between base rent and total occupancy cost?',
        answer:
          'Total occupancy cost includes base rent plus all additional charges: CAM/operating expenses, real estate taxes, insurance, utilities, parking fees, and any other pass-throughs. Base rent alone often represents only 60-75% of total occupancy cost.',
      },
    ],
    metaTitle: 'Annual Base Rent in Commercial Leases',
    metaDescription:
      'Annual base rent is the largest lease cost component. Learn how it is quoted, calculated, and why extraction accuracy matters for financial analysis.',
  },
  {
    fieldName: 'rent_payment_frequency',
    slug: 'rent-payment-frequency',
    displayLabel: 'Payment Frequency',
    category: 'rent-escalations',
    categoryLabel: 'Rent & Escalations',
    description: 'The interval at which rent is due.',
    aliases: ['Installment Period'],
    dataType: 'string',
    required: true,
    camRelevant: false,
    whyItMatters:
      'Payment frequency determines cash flow timing and late fee trigger dates. While monthly payments are standard, some leases require quarterly or annual prepayment, which dramatically changes the tenant\'s working capital requirements. A $300,000 annual rent paid quarterly means $75,000 due at once instead of $25,000 monthly -- a threefold increase in single-payment exposure.',
    whereToFindIt:
      'Specified in the "Rent" or "Payment" section, usually stating "due and payable in equal monthly installments on the first day of each calendar month." Some industrial leases specify quarterly payments.',
    relatedRedFlags: [],
    relatedFields: ['base-rent-annual', 'late-fee-percentage', 'monetary-cure-period'],
    relatedGlossaryTerms: ['base-rent'],
    faqs: [
      {
        question: 'Is monthly the standard payment frequency for commercial leases?',
        answer:
          'Yes, the vast majority of commercial leases require monthly rent payments due on the first of each month. Some shorter-term or industrial leases may use quarterly payments. Annual prepayment is rare but does exist in certain international markets.',
      },
      {
        question: 'When is rent typically due each month?',
        answer:
          'Rent is almost always due on the first calendar day of each month. Most leases include a grace period of 3 to 5 days before late fees apply, though some landlords charge late fees immediately after the due date.',
      },
    ],
    metaTitle: 'Payment Frequency in Commercial Leases',
    metaDescription:
      'Rent payment frequency affects cash flow planning and late fee exposure. Learn about monthly vs. quarterly schedules in commercial leases.',
  },
  {
    fieldName: 'escalation_type',
    slug: 'escalation-type',
    displayLabel: 'Escalation Type',
    category: 'rent-escalations',
    categoryLabel: 'Rent & Escalations',
    description: 'The methodology used to increase rent over the term.',
    aliases: [],
    dataType: 'string',
    required: true,
    camRelevant: false,
    whyItMatters:
      'The escalation type determines how quickly rent grows over the lease term and how predictable future costs will be. A 3% fixed annual escalation on a 10-year lease increases rent by 34% over the term. CPI-linked escalations introduce uncertainty, as inflation spikes can cause unexpected cost increases. Identifying the escalation type is essential for accurate financial modeling and straight-line rent calculations under ASC 842.',
    whereToFindIt:
      'Found in the "Rent Adjustments," "Escalations," or "Annual Increases" section. May be embedded within the rent schedule exhibit. Look for terms like "fixed percentage," "CPI," "step-up," or "fair market value."',
    relatedRedFlags: [],
    relatedFields: ['fixed-escalation-rate', 'cpi-index-reference', 'base-rent-annual'],
    relatedGlossaryTerms: ['rent-escalation-schedule', 'base-rent'],
    faqs: [
      {
        question: 'What are the most common rent escalation types?',
        answer:
          'The three primary types are: (1) Fixed percentage increases (e.g., 3% per year), (2) CPI/inflation-linked adjustments, and (3) Fixed dollar step-ups (e.g., $1/RSF per year). Some leases use fair market value resets at renewal or combine multiple methods.',
      },
      {
        question: 'Which escalation type is most favorable for tenants?',
        answer:
          'Fixed percentage or fixed dollar escalations provide cost certainty, which most tenants prefer. CPI-linked escalations with a cap and floor offer moderate protection. Open-ended CPI escalations without caps can result in significant cost spikes during inflationary periods.',
      },
    ],
    metaTitle: 'Escalation Type in Commercial Leases',
    metaDescription:
      'Rent escalation type determines how quickly your lease costs grow. Learn about fixed, CPI, and step-up escalation methods.',
  },
  {
    fieldName: 'fixed_escalation_rate',
    slug: 'fixed-escalation-rate',
    displayLabel: 'Fixed Escalation %',
    category: 'rent-escalations',
    categoryLabel: 'Rent & Escalations',
    description: 'The static percentage by which rent increases annually, if applicable.',
    aliases: [],
    dataType: 'percentage',
    required: false,
    camRelevant: false,
    whyItMatters:
      'A fixed escalation rate compounds over the lease term, and small differences create large cost impacts. On a $200,000/year base rent over 10 years, a 3% escalation results in $2.29 million total rent, while a 4% escalation totals $2.40 million -- an $110,000 difference from just one percentage point. Extracting this rate precisely is critical for financial projections, lease comparison analyses, and ASC 842 straight-line rent calculations.',
    whereToFindIt:
      'Located in the "Rent Adjustments" or "Escalation" clause, typically stated as "Base Rent shall increase by X% on each anniversary of the Rent Commencement Date." Also reflected in the rent schedule exhibit.',
    relatedRedFlags: [],
    relatedFields: ['escalation-type', 'base-rent-annual', 'cpi-index-reference'],
    relatedGlossaryTerms: ['rent-escalation-schedule', 'base-rent'],
    faqs: [
      {
        question: 'What is a typical fixed escalation rate in commercial leases?',
        answer:
          'Fixed escalation rates typically range from 2% to 4% per year, with 3% being the most common. In high-demand markets, landlords may push for 3.5% to 4%. During low-inflation periods, tenants can sometimes negotiate rates as low as 2%.',
      },
      {
        question: 'Does the escalation rate compound or apply to the original base rent?',
        answer:
          'Most fixed escalation rates compound, meaning each year\'s increase is calculated on the previous year\'s rent, not the original base rent. This compounding effect accelerates growth, so a 3% compounding escalation grows faster than a flat $0.90/RSF annual bump.',
      },
    ],
    metaTitle: 'Fixed Escalation % in Commercial Leases',
    metaDescription:
      'Fixed escalation rates compound over the lease term. Learn typical rates, how compounding works, and the financial impact on total rent.',
  },
  {
    fieldName: 'cpi_index_reference',
    slug: 'cpi-index-reference',
    displayLabel: 'CPI Index Used',
    category: 'rent-escalations',
    categoryLabel: 'Rent & Escalations',
    description: 'The specific inflation index utilized for variable escalations.',
    aliases: ['Inflation Index', 'Cost of Living'],
    dataType: 'string',
    required: false,
    camRelevant: false,
    whyItMatters:
      'Different CPI indices produce different escalation amounts. The national CPI-U may show 3.2% inflation while a regional CPI shows 4.1%. Over a 10-year lease, using the wrong index to verify rent increases can lead to cumulative overpayment or underpayment of thousands of dollars. The specific index reference also determines which government publication must be consulted for verification.',
    whereToFindIt:
      'Specified in the "Rent Adjustments" or "CPI Escalation" section. Look for the full index name (e.g., "CPI-U for All Urban Consumers, U.S. City Average"), the base period, and the comparison methodology.',
    relatedRedFlags: [],
    relatedFields: ['escalation-type', 'fixed-escalation-rate', 'base-rent-annual'],
    relatedGlossaryTerms: ['rent-escalation-schedule'],
    faqs: [
      {
        question: 'Which CPI index is most commonly used in commercial leases?',
        answer:
          'The CPI-U (Consumer Price Index for All Urban Consumers) published by the U.S. Bureau of Labor Statistics is the most commonly referenced index. Some leases specify a regional variant (e.g., CPI-U for the Los Angeles metropolitan area) for local relevance.',
      },
      {
        question: 'What happens if the specified CPI index is discontinued?',
        answer:
          'Most well-drafted leases include a fallback provision designating a successor index or a calculation methodology if the original index is discontinued. Without this language, the parties may need to negotiate or litigate a replacement.',
      },
    ],
    metaTitle: 'CPI Index Used in Commercial Leases',
    metaDescription:
      'The CPI index reference determines how inflation-linked rent escalations are calculated. Learn which indices are standard and why specificity matters.',
  },
  {
    fieldName: 'percentage_rent_rate',
    slug: 'percentage-rent-rate',
    displayLabel: 'Percentage Rent Rate',
    category: 'rent-escalations',
    categoryLabel: 'Rent & Escalations',
    description: 'The percentage of gross sales payable to the landlord.',
    aliases: [],
    dataType: 'percentage',
    required: false,
    camRelevant: false,
    whyItMatters:
      'Percentage rent can add 2% to 8% of gross sales on top of base rent, dramatically increasing total occupancy cost for high-volume tenants. A restaurant doing $2 million in annual sales at a 6% percentage rent rate owes $120,000 in additional rent beyond the breakpoint. Failing to extract this rate means the financial model understates total lease cost by tens or hundreds of thousands of dollars annually.',
    whereToFindIt:
      'Found in the "Percentage Rent" or "Additional Rent" section, common in retail leases. The rate, breakpoint, calculation methodology, reporting requirements, and audit provisions are typically grouped together.',
    relatedRedFlags: [],
    relatedFields: ['sales-breakpoint-amount', 'gross-sales-exclusions', 'base-rent-annual'],
    relatedGlossaryTerms: ['base-rent'],
    faqs: [
      {
        question: 'What is a typical percentage rent rate?',
        answer:
          'Rates vary widely by retail category. Grocery stores typically pay 1-2%, general retail 4-7%, and restaurants 5-8%. Specialty tenants with high margins may pay 8-10%. The rate is always negotiated in context with the base rent and breakpoint.',
      },
      {
        question: 'When does percentage rent kick in?',
        answer:
          'Percentage rent is only owed on gross sales exceeding the "breakpoint" threshold. The natural breakpoint is calculated by dividing annual base rent by the percentage rate. For example, $120,000 base rent / 6% rate = $1,500,000 breakpoint. Percentage rent is owed on every dollar of sales above $2 million.',
      },
    ],
    metaTitle: 'Percentage Rent Rate in Commercial Leases',
    metaDescription:
      'Percentage rent adds a share of gross sales to base rent. Learn typical rates by category, how breakpoints work, and the financial impact.',
  },
  {
    fieldName: 'sales_breakpoint_amount',
    slug: 'sales-breakpoint-amount',
    displayLabel: 'Breakpoint Amount',
    category: 'rent-escalations',
    categoryLabel: 'Rent & Escalations',
    description: 'The gross sales threshold that triggers percentage rent obligations.',
    aliases: [],
    dataType: 'currency',
    required: false,
    camRelevant: false,
    whyItMatters:
      'The breakpoint determines the sales level at which percentage rent obligations begin. An artificially low breakpoint means the tenant starts paying percentage rent sooner, while a high breakpoint delays the trigger. The difference between a $1.5 million and $2 million breakpoint at a 6% rate is $30,000 in annual savings. Natural breakpoints (base rent divided by percentage rate) are standard, but landlords sometimes negotiate lower "artificial" breakpoints.',
    whereToFindIt:
      'Stated in the "Percentage Rent" section alongside the percentage rent rate. May be expressed as a fixed dollar amount or calculated as the "natural breakpoint" from base rent divided by the percentage rate.',
    relatedRedFlags: [],
    relatedFields: ['percentage-rent-rate', 'gross-sales-exclusions', 'base-rent-annual'],
    relatedGlossaryTerms: ['base-rent'],
    faqs: [
      {
        question: 'What is the difference between a natural and artificial breakpoint?',
        answer:
          'A natural breakpoint is calculated by dividing annual base rent by the percentage rate. An artificial breakpoint is a fixed amount negotiated independently of base rent. Artificial breakpoints set below the natural breakpoint result in the tenant paying more total rent.',
      },
      {
        question: 'Does the breakpoint adjust when base rent escalates?',
        answer:
          'It depends on the lease language. Some leases recalculate the natural breakpoint each year based on the current base rent. Others fix the breakpoint at a specific dollar amount that never changes, which effectively lowers the threshold relative to growing sales over time.',
      },
    ],
    metaTitle: 'Breakpoint Amount in Commercial Leases',
    metaDescription:
      'The sales breakpoint triggers percentage rent obligations. Learn the difference between natural and artificial breakpoints and their financial impact.',
  },
  {
    fieldName: 'gross_sales_exclusions',
    slug: 'gross-sales-exclusions',
    displayLabel: 'Sales Exclusions',
    category: 'rent-escalations',
    categoryLabel: 'Rent & Escalations',
    description: 'Specific revenue streams omitted from percentage rent calculations.',
    aliases: [],
    dataType: 'array',
    required: false,
    camRelevant: false,
    whyItMatters:
      'Properly defined sales exclusions protect tenants from paying percentage rent on non-operational revenue like gift card sales, employee purchases, delivery service commissions, returns and refunds, and sales taxes. Without explicit exclusions, the landlord can argue that all revenue counts toward the breakpoint calculation. For a high-volume retailer, missing exclusions can inflate percentage rent by 10-20%.',
    whereToFindIt:
      'Listed in the "Percentage Rent" section, usually as a defined list of excluded items following the gross sales definition. May be extensive in well-negotiated retail leases.',
    relatedRedFlags: [],
    relatedFields: ['percentage-rent-rate', 'sales-breakpoint-amount'],
    relatedGlossaryTerms: ['base-rent'],
    faqs: [
      {
        question: 'What are common gross sales exclusions in retail leases?',
        answer:
          'Common exclusions include sales tax collected, returns and refunds, gift card activations (until redeemed), employee discounts, internet/catalog sales not fulfilled from the premises, insurance proceeds, and tips or gratuities. Each must be explicitly listed to be effective.',
      },
      {
        question: 'Can online sales be excluded from percentage rent?',
        answer:
          'Only if the lease explicitly excludes internet or e-commerce sales. Modern leases are increasingly specific about whether online orders placed in-store, curbside pickup, or click-and-collect transactions count toward gross sales. This is a heavily negotiated point in retail leases.',
      },
    ],
    metaTitle: 'Sales Exclusions in Commercial Leases',
    metaDescription:
      'Gross sales exclusions determine what revenue counts toward percentage rent. Learn common exclusions and why they matter for retail tenants.',
  },

  // ━━━ CAM & Operating Expenses (15 fields) ━━━━━━━━━━━━━━━━━━━━━━━━
  {
    fieldName: 'lease_structure_type',
    slug: 'lease-structure-type',
    displayLabel: 'Lease Structure',
    category: 'cam-operating-expenses',
    categoryLabel: 'CAM & Operating Expenses',
    description: 'The categorization of expense sharing.',
    aliases: [],
    dataType: 'string',
    required: true,
    camRelevant: true,
    whyItMatters:
      'The lease structure (NNN, gross, modified gross, absolute net) fundamentally determines the tenant\'s total occupancy cost. A $15/RSF NNN lease with $12/RSF in operating expenses costs $32/RSF total, while a $30/RSF gross lease may be cheaper overall. Misidentifying the structure during abstraction leads to drastically wrong financial projections and makes lease-to-lease comparisons unreliable.',
    whereToFindIt:
      'Usually stated in the first few pages or in the "Rent" section. Look for explicit designations like "Triple Net," "Full Service Gross," or "Modified Gross." Sometimes the structure must be inferred from the operating expense pass-through provisions.',
    relatedRedFlags: ['RF-005', 'RF-014'],
    relatedFields: ['pro-rata-share', 'cam-exclusions', 'base-year'],
    relatedGlossaryTerms: ['nnn-lease', 'gross-lease', 'operating-expense-pass-through'],
    faqs: [
      {
        question: 'What is the difference between NNN and gross leases?',
        answer:
          'In a NNN (triple net) lease, the tenant pays base rent plus their pro rata share of operating expenses, taxes, and insurance separately. In a gross lease, the landlord bundles these costs into a single rent payment. NNN leases have lower base rents but higher total cost variability.',
      },
      {
        question: 'What is a modified gross lease?',
        answer:
          'A modified gross lease is a hybrid where some expenses are included in base rent (typically taxes and insurance) while others (like utilities and janitorial) are paid directly by the tenant. The specific allocation varies by lease and must be carefully reviewed.',
      },
    ],
    metaTitle: 'Lease Structure in Commercial Leases',
    metaDescription:
      'Lease structure (NNN, gross, modified gross) determines total occupancy cost. Learn the differences and why accurate extraction is critical.',
  },
  {
    fieldName: 'pro_rata_share',
    slug: 'pro-rata-share',
    displayLabel: 'Pro Rata Share',
    category: 'cam-operating-expenses',
    categoryLabel: 'CAM & Operating Expenses',
    description: 'The tenant\'s fractional responsibility for total building operating expenses.',
    aliases: [],
    dataType: 'percentage',
    required: true,
    camRelevant: true,
    whyItMatters:
      'The pro rata share is a multiplier applied to every pass-through expense for the entire lease term. A 0.5% error on a building with $1 million in annual operating expenses means $5,000 per year in overcharges. Over a 10-year term, that compounds to $50,000. Verifying that the pro rata share matches the RSF ratio (tenant RSF / building RSF) is one of the highest-value checks in lease abstraction. CapVeri.com automates pro-rata share allocation for property managers - see <a href="https://www.capveri.com" target="_blank" rel="noopener noreferrer">CapVeri.com</a>.',
    whereToFindIt:
      'Defined in the "Operating Expenses" or "Additional Rent" section. May be stated as a fixed percentage or as a formula (tenant RSF / building total RSF). Cross-reference with the RSF and building RSF figures for verification.',
    relatedRedFlags: [],
    relatedFields: ['rentable-square-footage', 'building-total-rsf', 'cam-exclusions'],
    relatedGlossaryTerms: ['cam-charges', 'operating-expense-pass-through'],
    faqs: [
      {
        question: 'How is the pro rata share calculated?',
        answer:
          'Pro rata share equals the tenant\'s rentable square footage divided by the building\'s total rentable square footage, expressed as a percentage. For example, a 3,000 RSF tenant in a 60,000 RSF building has a 5.00% pro rata share.',
      },
      {
        question: 'Can the pro rata share change during the lease term?',
        answer:
          'If the building expands or is remeasured, the denominator changes. Some leases fix the pro rata share at signing, while others allow it to float with building RSF changes. A floating share can increase costs if the building adds or loses rentable space.',
      },
    ],
    metaTitle: 'Pro Rata Share in Commercial Leases',
    metaDescription:
      'Pro rata share determines your portion of building operating expenses. Learn how it is calculated and why even small errors cost thousands.',
  },
  {
    fieldName: 'base_year',
    slug: 'base-year',
    displayLabel: 'Base Year',
    category: 'cam-operating-expenses',
    categoryLabel: 'CAM & Operating Expenses',
    description: 'The foundational year used to calculate operating expense increases in gross leases.',
    aliases: [],
    dataType: 'string',
    required: false,
    camRelevant: true,
    whyItMatters:
      'In gross leases, the base year establishes the operating expense benchmark. The tenant only pays their share of expenses exceeding the base year amount. If the base year expenses are artificially low (due to low occupancy, tax abatements, or deferred maintenance), the tenant faces inflated pass-throughs in subsequent years. A base year set during a year when the building was 50% occupied could result in significantly higher pass-throughs than expected.',
    whereToFindIt:
      'Stated in the "Operating Expenses" or "Expense Stop" section of gross leases. Typically defined as a calendar year (e.g., "2025") or the first full calendar year of the lease term.',
    relatedRedFlags: ['RF-013'],
    relatedFields: ['lease-structure-type', 'base-year-gross-up', 'pro-rata-share'],
    relatedGlossaryTerms: ['gross-lease', 'operating-expense-pass-through', 'cam-reconciliation'],
    faqs: [
      {
        question: 'What is a base year in a commercial lease?',
        answer:
          'The base year is the reference period (usually a calendar year) used to set the operating expense baseline in gross leases. The tenant does not pay additional operating expenses unless total building expenses exceed the base year amount. Any excess is passed through proportionally.',
      },
      {
        question: 'Why does the base year matter for new buildings?',
        answer:
          'New buildings may have unusually low operating costs in their first year due to warranties, reduced maintenance needs, and tax abatements. If the base year is set during this period, the tenant faces large expense pass-throughs as costs normalize. Negotiating a base year gross-up provision mitigates this risk.',
      },
    ],
    metaTitle: 'Base Year in Commercial Leases',
    metaDescription:
      'The base year sets the operating expense benchmark in gross leases. Learn why an artificially low base year inflates future pass-through costs.',
  },
  {
    fieldName: 'cam_cap_percentage',
    slug: 'cam-cap-percentage',
    displayLabel: 'CAM Cap %',
    category: 'cam-operating-expenses',
    categoryLabel: 'CAM & Operating Expenses',
    description: 'The maximum allowable annual increase for controllable operating expenses.',
    aliases: ['Expense Ceiling', 'Controllable Cap'],
    dataType: 'percentage',
    required: false,
    camRelevant: true,
    whyItMatters:
      'Without a CAM cap, tenants face unlimited annual increases in operating expense pass-throughs. A 5% annual cap on a $50,000 CAM bill saves the tenant up to $7,500 in year two alone compared to uncapped charges. Over a 10-year lease, the cumulative savings from a well-negotiated CAM cap can exceed $100,000. This is one of the most financially impactful fields to extract accurately.',
    whereToFindIt:
      'Found in the "Operating Expenses" or "CAM" section. Look for language like "controllable expenses shall not increase by more than X% per annum." The cap may be stated as a percentage or a fixed dollar amount.',
    relatedRedFlags: ['RF-003'],
    relatedFields: ['cam-cap-type', 'cap-cumulative-vs-annual', 'controllable-vs-noncontrollable-expenses'],
    relatedGlossaryTerms: ['cam-charges', 'operating-expense-pass-through'],
    faqs: [
      {
        question: 'What is a typical CAM cap percentage?',
        answer:
          'CAM caps typically range from 3% to 5% per year for controllable expenses. A 5% cap is standard in most retail and office markets. Caps below 3% are aggressive and heavily favor the tenant. Some landlords resist any cap, especially in NNN industrial leases.',
      },
      {
        question: 'What expenses are excluded from the CAM cap?',
        answer:
          'Non-controllable expenses like real estate taxes, insurance premiums, utilities, and snow removal are commonly excluded from the cap. This means these costs can increase without limit regardless of the cap percentage, which is why identifying the controllable vs. non-controllable distinction is critical.',
      },
      {
        question: 'Does a CAM cap protect against all cost increases?',
        answer:
          'No. A CAM cap only limits increases in controllable operating expenses. Taxes, insurance, and utilities typically increase without limit. Additionally, a cumulative (compounding) cap is less protective than a non-cumulative (resetting) cap over time.',
      },
    ],
    metaTitle: 'CAM Cap % in Commercial Leases',
    metaDescription:
      'A CAM cap limits annual operating expense increases. Learn typical cap percentages, which expenses are excluded, and the financial impact.',
  },
  {
    fieldName: 'cam_cap_type',
    slug: 'cam-cap-type',
    displayLabel: 'CAM Cap Type',
    category: 'cam-operating-expenses',
    categoryLabel: 'CAM & Operating Expenses',
    description: 'Specifies whether the CAM cap is cumulative and compounding or non-cumulative.',
    aliases: [],
    dataType: 'string',
    required: false,
    camRelevant: true,
    whyItMatters:
      'A cumulative cap compounds year over year, allowing the landlord to "bank" unused increases. If actual costs rise 2% in year one but the cap is 5%, the landlord can pass through up to 8% in year two (5% + the unused 3%). A non-cumulative cap resets each year, limiting increases to exactly the cap percentage annually. Over a 10-year lease, the cumulative structure can cost a tenant 15-25% more in total CAM charges.',
    whereToFindIt:
      'Found in the CAM or Operating Expenses section alongside the CAM cap percentage. Look for specific language about whether unused cap amounts "carry forward" or "accumulate." Sometimes described as "compounding" vs. "non-compounding."',
    relatedRedFlags: ['RF-004'],
    relatedFields: ['cam-cap-percentage', 'cap-cumulative-vs-annual', 'controllable-vs-noncontrollable-expenses'],
    relatedGlossaryTerms: ['cam-charges', 'operating-expense-pass-through'],
    faqs: [
      {
        question: 'What is the difference between cumulative and non-cumulative CAM caps?',
        answer:
          'A non-cumulative cap limits each year\'s increase independently (e.g., max 5% per year regardless of prior years). A cumulative cap allows the landlord to carry forward unused increases, so if costs only rose 2% one year, the landlord can pass through up to 8% the next year (5% + 3% carryover).',
      },
      {
        question: 'Which CAM cap type is better for tenants?',
        answer:
          'Non-cumulative caps are significantly more protective for tenants because they prevent the landlord from banking unused increases. With cumulative caps, a single year of low increases can lead to a large spike in the following year.',
      },
    ],
    metaTitle: 'CAM Cap Type in Commercial Leases',
    metaDescription:
      'Cumulative vs. non-cumulative CAM caps dramatically affect long-term costs. Learn the difference and why cap type matters more than the percentage.',
  },
  {
    fieldName: 'gross_up_percentage',
    slug: 'gross-up-percentage',
    displayLabel: 'Gross-Up %',
    category: 'cam-operating-expenses',
    categoryLabel: 'CAM & Operating Expenses',
    description: 'The assumed occupancy level used to extrapolate variable operating expenses.',
    aliases: ['Gross-Up Provision'],
    dataType: 'percentage',
    required: false,
    camRelevant: true,
    whyItMatters:
      'Without a gross-up provision, existing tenants in a partially occupied building subsidize the vacant space. If a building is only 60% occupied but tenants pay pro rata shares of actual expenses, each tenant effectively pays 167% of their fair share. A gross-up to 95% occupancy normalizes expenses to reflect a stabilized building, preventing cost spikes as vacancies fluctuate.',
    whereToFindIt:
      'Found in the "Operating Expenses" or "Additional Rent" section. Look for language about "adjusting expenses as if the building were X% occupied" or "gross-up to 95% occupancy." May also be in a definitions section.',
    relatedRedFlags: ['RF-005'],
    relatedFields: ['lease-structure-type', 'pro-rata-share', 'base-year-gross-up'],
    relatedGlossaryTerms: ['cam-charges', 'operating-expense-pass-through'],
    faqs: [
      {
        question: 'What does gross-up mean in a commercial lease?',
        answer:
          'Gross-up adjusts variable operating expenses to reflect what they would be if the building were at a specified occupancy level (typically 95%). This prevents tenants from absorbing costs attributable to vacant space. Only variable expenses (like utilities and janitorial) are grossed up; fixed costs (like insurance and taxes) are not.',
      },
      {
        question: 'What is a typical gross-up percentage?',
        answer:
          'The standard gross-up assumes 95% occupancy, meaning variable expenses are calculated as if 95% of the building were occupied. Some leases use 100%, but 95% is the market standard because even fully leased buildings maintain some operational vacancy.',
      },
    ],
    metaTitle: 'Gross-Up % in Commercial Leases',
    metaDescription:
      'Gross-up provisions prevent tenants from subsidizing vacant space. Learn how the gross-up percentage works and why 95% is the market standard.',
  },
  {
    fieldName: 'management_fee_cap',
    slug: 'management-fee-cap',
    displayLabel: 'Management Fee Cap',
    category: 'cam-operating-expenses',
    categoryLabel: 'CAM & Operating Expenses',
    description: 'The maximum allowable percentage of gross revenues charged for property management.',
    aliases: ['Admin Fee Limit'],
    dataType: 'percentage',
    required: false,
    camRelevant: true,
    whyItMatters:
      'Management fees are one of the largest single line items in operating expense budgets, typically 3-6% of gross collected rent. Without a cap, a landlord-affiliated management company can charge inflated fees that directly increase tenant CAM charges. On a building collecting $2 million in gross rent, the difference between a 3% and 6% management fee is $60,000 per year that gets passed through to tenants.',
    whereToFindIt:
      'Found in the "Operating Expenses" or "CAM Exclusions" section. Look for language capping "property management fees" or "administrative fees" as a percentage of gross revenue or effective gross income.',
    relatedRedFlags: ['RF-001'],
    relatedFields: ['cam-exclusions', 'pro-rata-share', 'lease-structure-type'],
    relatedGlossaryTerms: ['cam-charges', 'operating-expense-pass-through'],
    faqs: [
      {
        question: 'What is a reasonable management fee cap?',
        answer:
          'Market-standard management fee caps range from 3% to 5% of gross collected rent. In multi-tenant office buildings, 3-4% is typical. In retail shopping centers, 4-5% is common. Fees above 5% should be scrutinized, especially if the management company is affiliated with the landlord.',
      },
      {
        question: 'Why do management fee caps matter if I am not the property manager?',
        answer:
          'Because management fees are included in operating expenses and passed through to tenants as part of CAM charges. Higher management fees directly increase your monthly additional rent payments. A cap protects you from inflated fees charged by a landlord-affiliated management company.',
      },
    ],
    metaTitle: 'Management Fee Cap in Commercial Leases',
    metaDescription:
      'Management fees can be 3-6% of gross rent and are passed through to tenants. Learn why capping this fee protects against inflated CAM charges.',
  },
  {
    fieldName: 'cam_exclusions',
    slug: 'cam-exclusions',
    displayLabel: 'CAM Exclusions',
    category: 'cam-operating-expenses',
    categoryLabel: 'CAM & Operating Expenses',
    description: 'Specific costs legally barred from being passed through to the tenant.',
    aliases: ['Unallowable Expenses', 'Carve-outs'],
    dataType: 'array',
    required: true,
    camRelevant: true,
    whyItMatters:
      'Without explicit CAM exclusions, landlords can pass through capital expenditures, executive salaries, leasing commissions, and even litigation costs as "operating expenses." A single roof replacement at $200,000 passed through pro rata to tenants represents tens of thousands in unexpected charges. A comprehensive exclusion list is the tenant\'s primary defense against inflated CAM bills and is essential for effective audit verification.',
    whereToFindIt:
      'Found in the "Operating Expenses" or "CAM" section, typically as a numbered or bulleted list of excluded items. In well-negotiated leases, this list can span several paragraphs. May also appear in a separate definitions exhibit.',
    relatedRedFlags: ['RF-006'],
    relatedFields: ['management-fee-cap', 'audit-rights', 'pro-rata-share'],
    relatedGlossaryTerms: ['cam-charges', 'operating-expense-pass-through', 'audit-rights'],
    faqs: [
      {
        question: 'What are the most important CAM exclusions to negotiate?',
        answer:
          'Critical exclusions include: capital expenditures (or amortization limits), executive/officer salaries above site level, leasing commissions, legal fees for disputes with other tenants, costs reimbursed by insurance, landlord\'s income taxes, depreciation, mortgage payments, and advertising costs for vacant space.',
      },
      {
        question: 'What happens if the lease has no CAM exclusions?',
        answer:
          'Without exclusions, the landlord has broad discretion to include nearly any building-related cost in operating expenses. This can lead to surprise charges for capital improvements, legal disputes with other tenants, or cosmetic renovations that primarily benefit the landlord\'s property value.',
      },
      {
        question: 'Can CAM exclusions be added via amendment?',
        answer:
          'Yes, but it requires landlord agreement. Tenants are in the strongest negotiating position before signing the lease or during renewal negotiations. Adding exclusions mid-term is possible but difficult since the landlord has little incentive to agree.',
      },
    ],
    metaTitle: 'CAM Exclusions in Commercial Leases',
    metaDescription:
      'CAM exclusions prevent landlords from passing through capital costs and executive salaries. Learn the critical exclusions every tenant needs.',
  },
  {
    fieldName: 'audit_rights',
    slug: 'audit-rights',
    displayLabel: 'Audit Rights',
    category: 'cam-operating-expenses',
    categoryLabel: 'CAM & Operating Expenses',
    description: 'Indicates whether the tenant possesses the legal right to audit the landlord\'s CAM ledgers.',
    aliases: [],
    dataType: 'boolean',
    required: true,
    camRelevant: true,
    whyItMatters:
      'CAM audits can uncover billing errors in landlord-prepared reconciliations when charges do not match the lease. On a $100,000 annual CAM bill, even a 10% unsupported charge is $10,000 for that year. Without contractual audit rights, the tenant must file a lawsuit to access the landlord\'s books, making verification practically difficult. This single field can be worth tens of thousands of dollars over the lease term. Once your lease is abstracted, verify your landlord\'s CAM charges against the audit rights clause with <a href="https://www.camaudit.io" target="_blank" rel="noopener noreferrer">CAMAudit.io</a>.',
    whereToFindIt:
      'Found in the "Operating Expenses," "CAM," or "Audit" section. Look for specific language about the tenant\'s right to "inspect," "audit," or "examine" the landlord\'s books and records. The clause should specify the audit window, who can perform the audit, and the landlord\'s obligations if errors are found.',
    relatedRedFlags: ['RF-002'],
    relatedFields: ['cam-audit-deadline-days', 'reconciliation-frequency', 'cam-exclusions'],
    relatedGlossaryTerms: ['audit-rights', 'cam-charges', 'cam-reconciliation'],
    faqs: [
      {
        question: 'How often do CAM audits find overcharges?',
        answer:
          'CAM audits of institutional properties can surface billing errors when charges do not match the lease. Common errors include improper capital expense pass-throughs, management fee overcharges, and miscalculated pro rata shares.',
      },
      {
        question: 'Can a landlord restrict the type of auditor the tenant uses?',
        answer:
          'Many leases prohibit contingency-fee auditors (who take a percentage of recoveries) because landlords believe they incentivize aggressive findings. Tenants should negotiate the right to use any certified public accountant and push back on overly restrictive auditor qualifications.',
      },
      {
        question: 'What happens if the audit finds overcharges?',
        answer:
          'The landlord must typically refund the overpayment within 30 days, sometimes with interest. If the overcharge exceeds a threshold (commonly 3-5% of total charges), the landlord may also be required to reimburse the tenant\'s audit costs.',
      },
    ],
    metaTitle: 'Audit Rights in Commercial Leases',
    metaDescription:
      'CAM audit rights let tenants verify operating expenses and recover common reconciliation overcharges. Learn why this clause is essential.',
  },
  {
    fieldName: 'reconciliation_frequency',
    slug: 'reconciliation-frequency',
    displayLabel: 'Reconciliation Frequency',
    category: 'cam-operating-expenses',
    categoryLabel: 'CAM & Operating Expenses',
    description: 'How often CAM charges are reconciled between estimated and actual amounts.',
    aliases: ['CAM reconciliation period', 'operating expense reconciliation', 'annual reconciliation'],
    dataType: 'string',
    required: false,
    camRelevant: true,
    whyItMatters:
      'Reconciliation frequency determines how quickly the tenant learns whether they overpaid or underpaid CAM charges. Without a defined frequency, landlords can delay reconciliation indefinitely, depriving tenants of credits for years. Annual reconciliation is standard, but the lease should also specify a deadline for delivering the reconciliation statement -- otherwise the landlord\'s delay effectively shortens the tenant\'s audit window. Property managers automating reconciliation can schedule and track frequency with <a href="https://www.capveri.com" target="_blank" rel="noopener noreferrer">CapVeri.com</a>.',
    whereToFindIt:
      'Found in the "Operating Expenses" or "CAM Reconciliation" section. Look for language about "annual adjustment," "year-end reconciliation," or "true-up" of estimated vs. actual expenses. The delivery deadline for the reconciliation statement is often in the same paragraph.',
    relatedRedFlags: ['RF-014'],
    relatedFields: ['cam-audit-deadline-days', 'audit-rights', 'cam-estimate-method'],
    relatedGlossaryTerms: ['cam-reconciliation', 'cam-charges', 'operating-expense-pass-through'],
    faqs: [
      {
        question: 'What is a standard CAM reconciliation frequency?',
        answer:
          'Annual reconciliation is the market standard. The landlord should deliver the reconciliation statement within 90 to 120 days after each calendar year ends. Some leases allow 180 days, but shorter deadlines are better for tenants.',
      },
      {
        question: 'What happens if the landlord never sends the reconciliation?',
        answer:
          'Some well-drafted leases include a "deemed approval" clause: if the landlord fails to deliver reconciliation within the specified period, the estimates are deemed final, and the tenant owes nothing further. Without such language, the tenant\'s obligation may remain open indefinitely.',
      },
    ],
    metaTitle: 'Reconciliation Frequency in Commercial Leases',
    metaDescription:
      'CAM reconciliation frequency determines when tenants learn their actual expense share. Learn why annual reconciliation deadlines matter.',
  },
  {
    fieldName: 'cam_audit_deadline_days',
    slug: 'cam-audit-deadline-days',
    displayLabel: 'CAM Audit Deadline (Days)',
    category: 'cam-operating-expenses',
    categoryLabel: 'CAM & Operating Expenses',
    description: 'Number of days tenant has to dispute or audit CAM reconciliation statement after receipt.',
    aliases: ['audit period', 'contest period', 'objection deadline', 'audit window'],
    dataType: 'number',
    required: false,
    camRelevant: true,
    whyItMatters:
      'A short audit window (e.g., 30 days) makes it practically impossible to hire an auditor, gather records, and complete a meaningful review. Industry-standard audits take 60-120 days to complete. If the deadline passes without action, the tenant permanently waives the right to dispute charges for that year. A 90-day window gives adequate time; anything under 60 days is a red flag.',
    whereToFindIt:
      'Found in the "Audit Rights" or "Operating Expenses" section, usually alongside the audit rights provisions. Look for language like "tenant must commence audit within X days of receiving the annual statement."',
    relatedRedFlags: ['RF-015'],
    relatedFields: ['audit-rights', 'reconciliation-frequency', 'cam-exclusions'],
    relatedGlossaryTerms: ['audit-rights', 'cam-reconciliation'],
    faqs: [
      {
        question: 'What is a reasonable CAM audit deadline?',
        answer:
          'A minimum of 90 days is considered reasonable, with 120 to 180 days being ideal. Anything under 60 days is restrictive and may not provide enough time to hire an auditor and complete the review. Landlords often push for shorter deadlines to minimize audit exposure.',
      },
      {
        question: 'What happens if the tenant misses the audit deadline?',
        answer:
          'The tenant typically waives the right to audit that year\'s operating expenses permanently. The landlord\'s statement becomes final and binding. This makes tracking the deadline a critical calendar event for property managers and tenant representatives.',
      },
    ],
    metaTitle: 'CAM Audit Deadline (Days) in Commercial Leases',
    metaDescription:
      'The CAM audit deadline limits how long tenants have to dispute operating expenses. Learn why 90+ days is essential for meaningful audits.',
  },
  {
    fieldName: 'cap_cumulative_vs_annual',
    slug: 'cap-cumulative-vs-annual',
    displayLabel: 'CAM Cap Type (Cumulative vs Annual)',
    category: 'cam-operating-expenses',
    categoryLabel: 'CAM & Operating Expenses',
    description: 'Whether the CAM cap resets annually or compounds cumulatively year over year. Cumulative caps are significantly more favorable to tenants.',
    aliases: ['compounding cap', 'rolling cap', 'annual reset cap', 'cumulative cap'],
    dataType: 'string',
    required: false,
    camRelevant: true,
    whyItMatters:
      'This field clarifies the precise behavior of the CAM cap. Under an annual reset cap, the maximum increase is calculated fresh each year from the prior year\'s actual charges. Under a cumulative cap, the maximum is calculated from the base year with compounding, allowing the landlord to recover expenses deferred by low-increase years. The financial difference over a 10-year term can exceed 20% of total CAM costs.',
    whereToFindIt:
      'Found in the "Operating Expenses" or "CAM Cap" section, near the cap percentage definition. Look for phrases like "compounding annually from the Base Year" (cumulative) or "shall not exceed X% over the prior year\'s actual amount" (annual reset).',
    relatedRedFlags: ['RF-004'],
    relatedFields: ['cam-cap-percentage', 'cam-cap-type', 'controllable-vs-noncontrollable-expenses'],
    relatedGlossaryTerms: ['cam-charges', 'operating-expense-pass-through'],
    faqs: [
      {
        question: 'How does a cumulative CAM cap work?',
        answer:
          'A cumulative cap compounds from the base year. With a 5% cumulative cap and $100,000 base year CAM, the cap in year 3 is $100,000 x 1.05^3 = $115,763. Even if actual expenses only rose to $104,000 in year 2, the year 3 cap is still $115,763, allowing a larger single-year increase.',
      },
      {
        question: 'Which cap type should tenants prefer?',
        answer:
          'Tenants should strongly prefer non-cumulative (annual reset) caps. These limit each year\'s increase independently, preventing the landlord from "catching up" after low-cost years. Cumulative caps are more favorable to landlords because unused cap allowances carry forward.',
      },
    ],
    metaTitle: 'CAM Cap Type (Cumulative vs Annual) in Commercial Leases',
    metaDescription:
      'Cumulative vs. annual CAM caps determine whether unused increases carry forward. Learn which type protects tenants and the financial difference.',
  },
  {
    fieldName: 'controllable_vs_noncontrollable_expenses',
    slug: 'controllable-vs-noncontrollable-expenses',
    displayLabel: 'Controllable vs Non-Controllable Expenses',
    category: 'cam-operating-expenses',
    categoryLabel: 'CAM & Operating Expenses',
    description: 'Defines which CAM expenses are subject to the cap (controllable) vs excluded from the cap such as taxes, insurance, and utilities (non-controllable).',
    aliases: ['controllable expenses', 'non-controllable expenses', 'cap exclusions', 'expense cap carveouts'],
    dataType: 'string',
    required: false,
    camRelevant: true,
    whyItMatters:
      'The distinction between controllable and non-controllable expenses determines the real value of a CAM cap. If real estate taxes, insurance, and utilities are classified as non-controllable, they can increase without limit even when a cap exists. In many markets, taxes and insurance alone represent 40-50% of total operating expenses, meaning the cap may only protect against half of the tenant\'s exposure.',
    whereToFindIt:
      'Found in the "Operating Expenses" or "CAM Cap" section, usually following the cap percentage definition. Look for a list of expenses that are "excluded from the cap" or "not subject to the annual limitation."',
    relatedRedFlags: [],
    relatedFields: ['cam-cap-percentage', 'cam-cap-type', 'cam-exclusions'],
    relatedGlossaryTerms: ['cam-charges', 'operating-expense-pass-through'],
    faqs: [
      {
        question: 'What are typical non-controllable expenses in a commercial lease?',
        answer:
          'Real estate taxes, property insurance premiums, utilities, and snow/ice removal are commonly classified as non-controllable expenses excluded from the CAM cap. Some leases also exclude government-mandated expenses and force majeure costs.',
      },
      {
        question: 'Can a tenant negotiate to include taxes and insurance under the cap?',
        answer:
          'It is possible but rare. Landlords argue these costs are outside their control and should not be subject to a cap. Tenants can sometimes negotiate a separate cap for taxes and insurance (e.g., 8-10% per year) to provide some protection against extreme increases.',
      },
    ],
    metaTitle: 'Controllable vs Non-Controllable Expenses in Commercial Leases',
    metaDescription:
      'Non-controllable expenses bypass CAM caps, leaving tenants exposed to unlimited increases in taxes and insurance. Learn how to evaluate this distinction.',
  },
  {
    fieldName: 'base_year_gross_up',
    slug: 'base-year-gross-up',
    displayLabel: 'Base Year Gross-Up',
    category: 'cam-operating-expenses',
    categoryLabel: 'CAM & Operating Expenses',
    description: 'Whether the base year operating expenses are normalized to a full occupancy level (typically 95%). Protects tenant from inflated future CAM charges when occupancy rises.',
    aliases: ['base year normalization', 'gross up base year', 'occupancy adjustment base year'],
    dataType: 'boolean',
    required: false,
    camRelevant: true,
    whyItMatters:
      'Without a base year gross-up, a tenant signing a lease in a building with 50% occupancy gets a low base year number. As the building fills up, variable expenses increase, and the tenant pays their share of the increase above the artificially low baseline. This can double the expected expense pass-throughs. Grossing up the base year to 95% occupancy establishes a fair benchmark that reflects normal building operations.',
    whereToFindIt:
      'Found in the "Operating Expenses" section near the base year definition. Look for language about "adjusting the Base Year expenses to reflect occupancy of 95%" or "normalizing variable expenses."',
    relatedRedFlags: ['RF-013'],
    relatedFields: ['base-year', 'gross-up-percentage', 'lease-structure-type'],
    relatedGlossaryTerms: ['gross-lease', 'operating-expense-pass-through', 'cam-charges'],
    faqs: [
      {
        question: 'Why is a base year gross-up important?',
        answer:
          'If the building is partially vacant during the base year, actual operating expenses are lower than they would be at full occupancy. Without grossing up, the tenant pays for the increase as the building fills -- even though per-tenant costs have not actually changed. Gross-up normalizes the baseline to prevent this unfair result.',
      },
      {
        question: 'Is a base year gross-up the same as a regular gross-up provision?',
        answer:
          'They are related but distinct. A regular gross-up adjusts current-year expenses to 95% occupancy to prevent subsidy of vacant space. A base year gross-up adjusts the base year benchmark to 95% occupancy to establish a fair starting point. Both are needed for full protection.',
      },
    ],
    metaTitle: 'Base Year Gross-Up in Commercial Leases',
    metaDescription:
      'Base year gross-up normalizes operating expenses to full occupancy, preventing inflated CAM pass-throughs. Learn why this provision is essential.',
  },
  {
    fieldName: 'cam_estimate_method',
    slug: 'cam-estimate-method',
    displayLabel: 'CAM Estimate Method',
    category: 'cam-operating-expenses',
    categoryLabel: 'CAM & Operating Expenses',
    description: 'How the landlord calculates monthly CAM estimates -- prior year actuals, budget-based, or fixed amount.',
    aliases: ['estimated CAM', 'CAM budget method', 'monthly CAM calculation'],
    dataType: 'string',
    required: false,
    camRelevant: true,
    whyItMatters:
      'The estimate method affects cash flow predictability. Budget-based estimates can be inflated if the landlord pads the budget, resulting in the tenant overpaying throughout the year and waiting for a year-end credit. Prior-year-actuals-based estimates are more grounded but may underestimate costs in rising-expense environments. Fixed amount estimates provide maximum predictability but may not adjust to actual costs.',
    whereToFindIt:
      'Found in the "Operating Expenses" or "Monthly Estimates" section. Look for language about how the landlord determines the "estimated monthly payment" or "monthly CAM installment." The methodology is often described in a single paragraph.',
    relatedRedFlags: [],
    relatedFields: ['reconciliation-frequency', 'pro-rata-share', 'cam-exclusions'],
    relatedGlossaryTerms: ['cam-charges', 'cam-reconciliation', 'operating-expense-pass-through'],
    faqs: [
      {
        question: 'What is the most common CAM estimate method?',
        answer:
          'Budget-based estimates are most common, where the landlord prepares an annual operating budget and bills tenants 1/12 of their pro rata share monthly. Prior-year actuals are the second most common method. Fixed estimates with no true-up are rare and typically found only in fixed-CAM lease structures.',
      },
      {
        question: 'Can a landlord increase CAM estimates mid-year?',
        answer:
          'Some leases allow mid-year adjustments if actual expenses significantly exceed estimates. This protects the landlord from large year-end shortfalls but can cause unexpected cash flow disruptions for tenants. Tenants should negotiate limits on mid-year increases.',
      },
    ],
    metaTitle: 'CAM Estimate Method in Commercial Leases',
    metaDescription:
      'The CAM estimate method determines how monthly charges are calculated. Learn about budget-based, prior-year, and fixed estimate approaches.',
  },

  // ━━━ Options (7 fields) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    fieldName: 'has_renewal_option',
    slug: 'has-renewal-option',
    displayLabel: 'Has Renewal Option',
    category: 'options',
    categoryLabel: 'Options',
    description: 'Indicates the presence of a contractual right to extend the lease term.',
    aliases: [],
    dataType: 'boolean',
    required: true,
    camRelevant: false,
    whyItMatters:
      'A renewal option gives the tenant the contractual right to extend occupancy without renegotiating from scratch, which is worth significant leverage and avoided relocation costs. Relocation expenses (moving, downtime, new build-out) can easily reach $50-100/RSF. Without a renewal option, the tenant has no guaranteed right to stay and faces holdover exposure at lease expiration.',
    whereToFindIt:
      'Found in the "Options" or "Renewal" section, typically in the latter half of the lease. May also be in a separate addendum or rider. The presence of an option is often referenced in the summary of lease terms on the first page.',
    relatedRedFlags: ['RF-011'],
    relatedFields: ['renewal-terms', 'renewal-notice-days', 'expiration-date'],
    relatedGlossaryTerms: ['critical-date', 'holdover-provision'],
    faqs: [
      {
        question: 'What percentage of commercial leases include renewal options?',
        answer:
          'Approximately 70-80% of multi-year commercial leases include at least one renewal option. They are more common in office and industrial leases than in retail leases, where landlords prefer to maintain flexibility to re-tenant at market rates.',
      },
      {
        question: 'Can a landlord refuse to grant a renewal option?',
        answer:
          'A renewal option is a contractual right, so if it exists in the lease, the landlord cannot refuse. However, many options require the tenant to be in good standing (no uncured defaults) and to exercise the option within a strict notice period. Failure to meet either condition can void the option.',
      },
    ],
    metaTitle: 'Has Renewal Option in Commercial Leases',
    metaDescription:
      'Renewal options protect tenants from relocation costs and holdover exposure. Learn how they work and why 70-80% of leases include them.',
  },
  {
    fieldName: 'renewal_terms',
    slug: 'renewal-terms',
    displayLabel: 'Renewal Terms',
    category: 'options',
    categoryLabel: 'Options',
    description: 'The specific parameters of the renewal.',
    aliases: ['Extension Periods'],
    dataType: 'array',
    required: false,
    camRelevant: false,
    whyItMatters:
      'Renewal terms define the duration, rent basis, and conditions of each renewal period. A renewal at "fair market value" provides no cost certainty, while a renewal at "95% of FMV" or with a fixed escalation structure locks in savings. Knowing whether the renewal is for one 5-year term or two 3-year terms affects long-term planning and total financial exposure.',
    whereToFindIt:
      'In the "Renewal Option" or "Extension Option" section. Look for specific details on renewal period length, number of options, rent calculation methodology (FMV, fixed rate, or CPI), and any conditions precedent.',
    relatedRedFlags: [],
    relatedFields: ['has-renewal-option', 'renewal-notice-days', 'base-rent-annual'],
    relatedGlossaryTerms: ['critical-date', 'rent-escalation-schedule'],
    faqs: [
      {
        question: 'What does "fair market value" mean for renewal rent?',
        answer:
          'Fair market value (FMV) renewal rent means the rent is reset to reflect current market conditions at the time of renewal. The lease should specify how FMV is determined -- typically through broker appraisal, comparable lease analysis, or binding arbitration if the parties cannot agree.',
      },
      {
        question: 'Can renewal terms be different from the original lease terms?',
        answer:
          'Yes. Renewal periods are often shorter than the initial term (e.g., 5-year initial term with two 3-year renewal options). Rent structures may also differ -- the initial term may have fixed escalations while the renewal uses FMV or CPI adjustments.',
      },
    ],
    metaTitle: 'Renewal Terms in Commercial Leases',
    metaDescription:
      'Renewal terms define the duration, rent basis, and conditions for extending a commercial lease. Learn about FMV, fixed rate, and CPI renewal structures.',
  },
  {
    fieldName: 'renewal_notice_days',
    slug: 'renewal-notice-days',
    displayLabel: 'Renewal Notice (Days)',
    category: 'options',
    categoryLabel: 'Options',
    description: 'The deadline prior to expiration by which the tenant must exercise the renewal.',
    aliases: ['Option Notice Period'],
    dataType: 'number',
    required: false,
    camRelevant: false,
    whyItMatters:
      'Missing the renewal notice deadline permanently forfeits the right to renew, forcing the tenant into holdover status or the open market. Notice periods typically range from 180 to 365 days before expiration. A tenant who misses a 270-day deadline on a $50,000/month lease loses both the contractual renewal right and the negotiating leverage that comes with it, potentially adding hundreds of thousands in relocation costs.',
    whereToFindIt:
      'Stated in the "Renewal Option" section, typically expressed as "no later than X days prior to the Expiration Date." This is one of the most important critical dates to calendar immediately upon abstraction.',
    relatedRedFlags: [],
    relatedFields: ['has-renewal-option', 'renewal-terms', 'expiration-date'],
    relatedGlossaryTerms: ['critical-date', 'holdover-provision'],
    faqs: [
      {
        question: 'What is a typical renewal notice period?',
        answer:
          'Most commercial leases require 6 to 12 months advance notice to exercise a renewal option. Office leases typically require 9 to 12 months, while retail and industrial leases may allow shorter periods of 6 to 9 months. The exact number of days should be calendared as a critical date.',
      },
      {
        question: 'What happens if the tenant sends the renewal notice one day late?',
        answer:
          'Technically, the renewal option expires and the tenant loses the right to renew. Some landlords will accept late notices as a goodwill gesture, but they have no legal obligation to do so. Courts generally enforce strict deadline compliance for option exercise.',
      },
    ],
    metaTitle: 'Renewal Notice (Days) in Commercial Leases',
    metaDescription:
      'Missing the renewal notice deadline forfeits your right to renew. Learn typical notice periods and why this is the most critical date to calendar.',
  },
  {
    fieldName: 'has_termination_option',
    slug: 'has-termination-option',
    displayLabel: 'Has Termination Option',
    category: 'options',
    categoryLabel: 'Options',
    description: 'Indicates the right to break the lease prior to the natural expiration date.',
    aliases: [],
    dataType: 'boolean',
    required: true,
    camRelevant: false,
    whyItMatters:
      'A termination option provides an exit strategy if the tenant\'s business changes, downsizes, or fails. Without one, the tenant is locked into the full rent obligation for the entire term -- potentially millions of dollars. On a 10-year lease at $15,000/month, the remaining obligation after year 3 is $1.68 million. A termination option with a reasonable penalty (typically 3-6 months rent) can save the tenant from catastrophic exposure.',
    whereToFindIt:
      'Found in the "Options" or "Termination" section. May also be called an "early termination right," "cancellation option," or "kick-out clause." Less common than renewal options, so its absence should be noted explicitly.',
    relatedRedFlags: ['RF-009'],
    relatedFields: ['termination-penalty', 'lease-term-months', 'expiration-date'],
    relatedGlossaryTerms: ['critical-date'],
    faqs: [
      {
        question: 'How common are termination options in commercial leases?',
        answer:
          'Termination options are less common than renewal options, appearing in roughly 20-30% of commercial leases. They are more frequently negotiated by strong-credit tenants, startups with uncertain growth, and in longer-term leases (7+ years) where business needs are harder to predict.',
      },
      {
        question: 'What is a typical early termination penalty?',
        answer:
          'Penalties typically include 3 to 6 months of base rent plus unamortized costs such as TI allowance, free rent concessions, and leasing commissions. The total penalty can be substantial but is almost always less than the remaining rent obligation.',
      },
    ],
    metaTitle: 'Has Termination Option in Commercial Leases',
    metaDescription:
      'Termination options provide an exit strategy from long-term leases. Learn how they work, typical penalties, and when to negotiate one.',
  },
  {
    fieldName: 'termination_penalty',
    slug: 'termination-penalty',
    displayLabel: 'Termination Penalty',
    category: 'options',
    categoryLabel: 'Options',
    description: 'The fee or liquidated damages required to execute an early termination.',
    aliases: [],
    dataType: 'currency',
    required: false,
    camRelevant: false,
    whyItMatters:
      'The termination penalty determines whether the early exit option is financially viable. A penalty equal to the remaining rent obligation effectively negates the option\'s value. Typical penalties range from 3 to 9 months of rent plus unamortized TI and commission costs. On a $30,000/month lease with $150,000 in unamortized TI, the penalty could reach $420,000 -- still far less than 5 years of remaining rent at $1.8 million.',
    whereToFindIt:
      'In the "Termination Option" section, usually stated as a formula: X months of base rent + unamortized tenant improvement costs + unamortized leasing commissions. May require advance notice of 6 to 12 months.',
    relatedRedFlags: [],
    relatedFields: ['has-termination-option', 'ti-allowance-amount', 'base-rent-annual'],
    relatedGlossaryTerms: ['critical-date'],
    faqs: [
      {
        question: 'What costs are typically included in a termination penalty?',
        answer:
          'The penalty usually includes: (1) a specified number of months of base rent (3-9 months), (2) the unamortized balance of the TI allowance, (3) the unamortized balance of leasing commissions, and (4) the unamortized value of any free rent concessions. Some leases simplify this to a fixed dollar amount.',
      },
      {
        question: 'How is "unamortized" TI calculated for termination penalties?',
        answer:
          'The TI allowance is amortized straight-line over the initial lease term. If the tenant terminates after 5 years of a 10-year lease with a $200,000 TI allowance, the unamortized balance is $100,000 (50% of the original allowance).',
      },
    ],
    metaTitle: 'Termination Penalty in Commercial Leases',
    metaDescription:
      'The termination penalty determines if an early exit is financially viable. Learn typical penalty structures and how unamortized costs are calculated.',
  },
  {
    fieldName: 'rofr_space',
    slug: 'rofr-space',
    displayLabel: 'Right of First Refusal',
    category: 'options',
    categoryLabel: 'Options',
    description: 'Indicates a ROFR on specific adjacent or building spaces.',
    aliases: [],
    dataType: 'string',
    required: false,
    camRelevant: false,
    whyItMatters:
      'A ROFR gives a growing tenant the right to match any third-party offer on adjacent space, providing expansion security without committing to additional space upfront. Without a ROFR, a competitor could lease the space next door, or the landlord could price the tenant out. The ROFR is particularly valuable in tight markets where available space is limited and relocation costs are high.',
    whereToFindIt:
      'Found in the "Options" or "Expansion" section, sometimes as a separate addendum. Look for the specific spaces covered, the matching period (typically 5-10 business days), and whether the ROFR survives renewal.',
    relatedRedFlags: [],
    relatedFields: ['rofo-space', 'has-renewal-option', 'rentable-square-footage'],
    relatedGlossaryTerms: ['right-of-first-refusal', 'right-of-first-offer'],
    faqs: [
      {
        question: 'What is the difference between a ROFR and a ROFO?',
        answer:
          'With a ROFR, the landlord first secures a third-party offer, then the tenant can match it. With a ROFO (Right of First Offer), the landlord must offer the space to the tenant first, before marketing it externally. ROFOs give tenants earlier access but less pricing information.',
      },
      {
        question: 'How long does a tenant have to decide on a ROFR?',
        answer:
          'The typical response window is 5 to 10 business days from receipt of the third-party offer terms. Some leases allow 15-30 days for larger spaces. The tight deadline requires tenants to have pre-approved expansion budgets and space plans ready.',
      },
    ],
    metaTitle: 'Right of First Refusal in Commercial Leases',
    metaDescription:
      'A ROFR lets tenants match third-party offers on adjacent space. Learn how it works, typical response windows, and how it differs from a ROFO.',
  },
  {
    fieldName: 'rofo_space',
    slug: 'rofo-space',
    displayLabel: 'Right of First Offer',
    category: 'options',
    categoryLabel: 'Options',
    description: 'Indicates a ROFO to lease space before it hits the open market.',
    aliases: [],
    dataType: 'string',
    required: false,
    camRelevant: false,
    whyItMatters:
      'A ROFO requires the landlord to offer available space to the tenant before marketing it publicly, giving the tenant first-mover advantage on expansion opportunities. Unlike a ROFR, the terms are proposed by the landlord rather than dictated by a third party, giving the tenant more negotiating room. However, if the tenant declines, the landlord can lease to anyone -- making the initial evaluation critical.',
    whereToFindIt:
      'Found in the "Options" or "Expansion Rights" section. Look for language about the landlord\'s obligation to "first offer" space to the tenant before marketing. The response period, eligible spaces, and reactivation triggers should be specified.',
    relatedRedFlags: [],
    relatedFields: ['rofr-space', 'has-renewal-option', 'rentable-square-footage'],
    relatedGlossaryTerms: ['right-of-first-offer', 'right-of-first-refusal'],
    faqs: [
      {
        question: 'When does a ROFO get triggered?',
        answer:
          'A ROFO is triggered when the landlord becomes aware that covered space will become available, typically upon receiving notice of an existing tenant\'s non-renewal or early termination. The landlord must then offer the space to the ROFO holder before marketing it to outside parties.',
      },
      {
        question: 'What happens if the tenant declines a ROFO and the landlord later lowers the price?',
        answer:
          'Well-drafted ROFOs include a "reactivation" clause: if the landlord offers the space to a third party at terms materially more favorable (e.g., 10% less rent) than what was offered to the tenant, the ROFO rights reactivate and the tenant gets another chance.',
      },
    ],
    metaTitle: 'Right of First Offer in Commercial Leases',
    metaDescription:
      'A ROFO gives tenants first access to available space before public marketing. Learn how it works and how it differs from a ROFR.',
  },

  // ━━━ Tenant Improvements & Construction (6 fields) ━━━━━━━━━━━━━━━
  {
    fieldName: 'ti_allowance_amount',
    slug: 'ti-allowance-amount',
    displayLabel: 'TI Allowance',
    category: 'tenant-improvements',
    categoryLabel: 'Tenant Improvements & Construction',
    description: 'The total monetary subsidy provided by the landlord for space customization.',
    aliases: [],
    dataType: 'currency',
    required: false,
    camRelevant: false,
    whyItMatters:
      'The TI allowance is often the largest single concession in a commercial lease. A $50/RSF allowance on 10,000 RSF represents $500,000 in landlord-funded construction. Extracting this amount accurately is essential for calculating the landlord\'s effective rent, evaluating competing proposals, and determining the unamortized balance for termination penalty calculations. It also affects the security deposit and personal guarantee amounts that landlords require.',
    whereToFindIt:
      'Found in the "Tenant Improvements" section, "Work Letter" exhibit, or "Construction" addendum. May be stated as a total dollar amount, a per-RSF rate, or both. Disbursement conditions are typically detailed in the same section.',
    relatedRedFlags: [],
    relatedFields: ['ti-allowance-per-rsf', 'landlord-work-description', 'tenant-work-description'],
    relatedGlossaryTerms: ['tenant-improvement-allowance', 'base-rent'],
    faqs: [
      {
        question: 'What is a typical TI allowance for commercial office space?',
        answer:
          'TI allowances vary widely by market and lease term. For new office leases, $40-$80/RSF is common in major markets for 5-10 year terms. Renewal TI allowances are often lower than new-lease packages because the space may already be built out. Industrial leases may offer $5-$15/RSF, and retail varies based on the tenant\'s credit strength.',
      },
      {
        question: 'Can unused TI allowance be converted to free rent?',
        answer:
          'Only if the lease explicitly allows it. Some work letters include a conversion clause permitting the tenant to apply unused TI funds as a rent credit. Without this language, unused allowance reverts to the landlord, so tenants should negotiate conversion rights upfront.',
      },
    ],
    metaTitle: 'TI Allowance in Commercial Leases',
    metaDescription:
      'The TI allowance is the landlord\'s construction subsidy for tenant build-out. Learn typical amounts, disbursement conditions, and conversion options.',
  },
  {
    fieldName: 'ti_allowance_per_rsf',
    slug: 'ti-allowance-per-rsf',
    displayLabel: 'TIA per RSF',
    category: 'tenant-improvements',
    categoryLabel: 'Tenant Improvements & Construction',
    description: 'The improvement allowance calculated on a per-square-foot basis.',
    aliases: [],
    dataType: 'currency',
    required: false,
    camRelevant: false,
    whyItMatters:
      'The per-RSF rate enables apples-to-apples comparison between competing lease proposals with different suite sizes. A $60/RSF allowance on a 5,000 RSF space ($300,000 total) is objectively more generous than a $50/RSF allowance on a 7,000 RSF space ($350,000 total) because the per-unit construction cost is the same regardless of space size. This metric is the standard benchmark used by tenant representatives.',
    whereToFindIt:
      'In the "Tenant Improvements" or "Work Letter" section. May be stated explicitly or must be calculated by dividing the total TI amount by the tenant\'s RSF.',
    relatedRedFlags: [],
    relatedFields: ['ti-allowance-amount', 'rentable-square-footage', 'tenant-work-description'],
    relatedGlossaryTerms: ['tenant-improvement-allowance', 'rentable-square-footage'],
    faqs: [
      {
        question: 'How do I compare TI allowances between different proposals?',
        answer:
          'Always compare on a per-RSF basis and factor in the lease term. A $60/RSF allowance on a 10-year lease is effectively $6/RSF/year, while $40/RSF on a 5-year lease is $8/RSF/year. The shorter-term lease actually provides more annualized construction value.',
      },
      {
        question: 'Is the TI allowance based on rentable or usable square footage?',
        answer:
          'It depends on the lease. Most quotes reference RSF for consistency with the rent calculation, but some landlords quote per USF which yields a higher per-square-foot number for the same total amount. Always confirm the measurement basis when comparing proposals.',
      },
    ],
    metaTitle: 'TIA per RSF in Commercial Leases',
    metaDescription:
      'TI allowance per RSF enables apples-to-apples comparison across lease proposals. Learn typical rates and how to evaluate construction subsidies.',
  },
  {
    fieldName: 'landlord_work_description',
    slug: 'landlord-work-description',
    displayLabel: 'Landlord\'s Work',
    category: 'tenant-improvements',
    categoryLabel: 'Tenant Improvements & Construction',
    description: 'The specific construction obligations the landlord must complete prior to possession.',
    aliases: [],
    dataType: 'string',
    required: false,
    camRelevant: false,
    whyItMatters:
      'Landlord work defines the baseline condition of the space at delivery. If the landlord is responsible for HVAC, restrooms, and ADA compliance but fails to complete these, the tenant bears the cost -- which can be $15-50/RSF for items that should have been included. Clear documentation of landlord obligations is essential for holding the landlord accountable and for calculating the actual construction budget the tenant must cover.',
    whereToFindIt:
      'In the "Work Letter" exhibit or "Construction" section. May be described as "Base Building Work," "Landlord\'s Work," or "Shell Condition." Sometimes defined by reference to building standards (e.g., "Landlord shall deliver the Premises in shell condition per Exhibit C specifications").',
    relatedRedFlags: [],
    relatedFields: ['tenant-work-description', 'possession-date', 'ti-allowance-amount'],
    relatedGlossaryTerms: ['tenant-improvement-allowance'],
    faqs: [
      {
        question: 'What is typically included in landlord work?',
        answer:
          'Common landlord work includes: base building HVAC, fire/life safety systems to code, ADA-compliant restrooms, core and shell completion, elevator service, electrical service to the floor, and sprinkler systems. The specific scope varies dramatically between shell condition and turnkey delivery.',
      },
      {
        question: 'What happens if the landlord\'s work is defective?',
        answer:
          'Most leases require the landlord to correct defective work for a specified warranty period (typically 12 months after delivery). Beyond that, building standard items usually become the tenant\'s maintenance responsibility. The work letter should include a punch list process for identifying defects at delivery.',
      },
    ],
    metaTitle: 'Landlord\'s Work in Commercial Leases',
    metaDescription:
      'Landlord work defines the construction the landlord must complete before delivery. Learn what is typically included and how to enforce obligations.',
  },
  {
    fieldName: 'tenant_work_description',
    slug: 'tenant-work-description',
    displayLabel: 'Tenant\'s Work',
    category: 'tenant-improvements',
    categoryLabel: 'Tenant Improvements & Construction',
    description: 'The scope of construction the tenant is responsible for managing and funding.',
    aliases: ['Initial Alterations', 'Fit-out'],
    dataType: 'string',
    required: false,
    camRelevant: false,
    whyItMatters:
      'Tenant work defines what the tenant must build and pay for beyond the TI allowance. Understanding the full scope prevents budget overruns that can derail store openings and create cash flow crises. If the lease categorizes certain items as tenant work that are normally landlord obligations (like fire sprinkler modifications or ADA compliance), the tenant faces unexpected costs that can reach $30-50/RSF.',
    whereToFindIt:
      'In the "Work Letter" exhibit alongside landlord work. Look for "Tenant\'s Work" or "Tenant Improvements" definitions. The construction schedule, approval requirements, and contractor restrictions are typically in the same section.',
    relatedRedFlags: ['RF-010'],
    relatedFields: ['landlord-work-description', 'ti-allowance-amount', 'restoration-requirement'],
    relatedGlossaryTerms: ['tenant-improvement-allowance'],
    faqs: [
      {
        question: 'Can the landlord approve the tenant\'s contractor?',
        answer:
          'Most leases require landlord approval of the general contractor and sometimes major subcontractors. Some leases restrict the tenant to using the landlord\'s preferred contractors, which can increase costs. Tenants should negotiate the right to solicit competitive bids from at least 2-3 pre-approved contractors.',
      },
      {
        question: 'Does the tenant need landlord approval for the build-out design?',
        answer:
          'Yes. Nearly all commercial leases require the tenant to submit plans and specifications for landlord review before beginning construction. The lease should specify a reasonable review period (typically 10-15 business days) and state that approval shall not be unreasonably withheld.',
      },
    ],
    metaTitle: 'Tenant\'s Work in Commercial Leases',
    metaDescription:
      'Tenant work defines the build-out scope the tenant must fund. Learn about approval requirements, contractor restrictions, and budget planning.',
  },
  {
    fieldName: 'restoration_requirement',
    slug: 'restoration-requirement',
    displayLabel: 'Restoration Obligation',
    category: 'tenant-improvements',
    categoryLabel: 'Tenant Improvements & Construction',
    description: 'The duty of the tenant to remove improvements and restore the space upon exit.',
    aliases: [],
    dataType: 'boolean',
    required: true,
    camRelevant: false,
    whyItMatters:
      'Restoration costs can range from $10 to $40 per RSF depending on the extent of improvements that must be removed. A 10,000 RSF space with extensive custom build-out could face $100,000-$400,000 in restoration costs at lease end. If this obligation is missed during abstraction, the tenant has no time to budget, negotiate a waiver, or find a replacement tenant willing to assume the improvements.',
    whereToFindIt:
      'Found in the "Surrender" or "Restoration" section near the end of the lease. May also be referenced in the work letter. Look for language about "removing alterations," "restoring to original condition," or "returning the premises in shell condition."',
    relatedRedFlags: ['RF-010'],
    relatedFields: ['tenant-work-description', 'landlord-work-description', 'hvac-responsibility'],
    relatedGlossaryTerms: ['tenant-improvement-allowance'],
    faqs: [
      {
        question: 'Can a tenant negotiate out of the restoration requirement?',
        answer:
          'Yes, particularly if the improvements enhance the space\'s marketability. Landlords often waive restoration for standard office improvements (carpet, paint, standard partitions) but require removal of specialized installations (commercial kitchens, server rooms, medical equipment). This should be negotiated at lease signing.',
      },
      {
        question: 'When must restoration be completed?',
        answer:
          'Most leases require restoration before or on the expiration date. Starting too late can push the tenant into holdover, triggering penalty rent. Tenants should budget 4-8 weeks for restoration and begin planning at least 6 months before lease expiration.',
      },
    ],
    metaTitle: 'Restoration Obligation in Commercial Leases',
    metaDescription:
      'Restoration requirements can cost $10-$40/RSF at lease end. Learn when restoration is required, how to negotiate waivers, and budget planning tips.',
  },
  {
    fieldName: 'hvac_responsibility',
    slug: 'hvac-responsibility',
    displayLabel: 'HVAC Responsibility',
    category: 'tenant-improvements',
    categoryLabel: 'Tenant Improvements & Construction',
    description: 'Identifies whether the landlord or tenant is responsible for replacing HVAC units.',
    aliases: [],
    dataType: 'string',
    required: true,
    camRelevant: true,
    whyItMatters:
      'HVAC replacement is one of the most expensive maintenance items in commercial real estate, costing $5,000 to $15,000 per rooftop unit. In NNN and industrial leases, tenants often bear this responsibility without realizing it. A 20,000 RSF retail space with 4 rooftop units faces potential replacement costs of $40,000-$60,000. Knowing who is responsible allows for proper reserve budgeting and maintenance scheduling.',
    whereToFindIt:
      'Found in the "Maintenance and Repairs" section or in the lease structure/NNN provisions. In industrial leases, HVAC responsibility is often part of a broader "Tenant Maintenance" paragraph. The work letter may also address initial HVAC installation.',
    relatedRedFlags: [],
    relatedFields: ['restoration-requirement', 'lease-structure-type', 'landlord-work-description'],
    relatedGlossaryTerms: ['nnn-lease', 'cam-charges'],
    faqs: [
      {
        question: 'Who typically pays for HVAC replacement in a commercial lease?',
        answer:
          'In gross and modified gross leases, the landlord typically handles HVAC replacement as a building standard service. In NNN leases, the tenant often bears full HVAC responsibility including replacement. In standard NNN (not absolute net) leases, the landlord may retain roof and structural responsibilities including HVAC.',
      },
      {
        question: 'Should tenants negotiate an HVAC maintenance standard?',
        answer:
          'Yes. If the tenant is responsible for HVAC, the lease should require regular preventive maintenance (typically quarterly service contracts). This protects both parties: the tenant avoids premature failure, and the landlord ensures the equipment is properly maintained during the lease term.',
      },
    ],
    metaTitle: 'HVAC Responsibility in Commercial Leases',
    metaDescription:
      'HVAC replacement can cost $5,000-$15,000 per unit. Learn who is typically responsible and how lease structure affects HVAC obligations.',
  },

  // ━━━ Insurance & Indemnity (6 fields) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    fieldName: 'cgl_occurrence_limit',
    slug: 'cgl-occurrence-limit',
    displayLabel: 'CGL Occurrence Limit',
    category: 'insurance-indemnity',
    categoryLabel: 'Insurance & Indemnity',
    description: 'The minimum liability coverage required for a single incident.',
    aliases: ['Per Occurrence Cap'],
    dataType: 'currency',
    required: true,
    camRelevant: false,
    whyItMatters:
      'The CGL occurrence limit sets the floor for liability protection in a single incident. Standard commercial leases require $1 million per occurrence, but high-traffic retail or restaurant tenants may need $2 million or more. If the required limit exceeds the tenant\'s existing policy, the additional premium cost must be factored into occupancy budgets. Inadequate coverage exposes both tenant and landlord to personal liability in the event of a serious injury claim.',
    whereToFindIt:
      'Found in the "Insurance" section, typically listing minimum coverage amounts in a table or bullet list. Often references "Commercial General Liability" or "CGL" policy with per-occurrence and aggregate limits specified together.',
    relatedRedFlags: [],
    relatedFields: ['cgl-aggregate-limit', 'additional-insured-req', 'waiver-of-subrogation'],
    relatedGlossaryTerms: [],
    faqs: [
      {
        question: 'What is a standard CGL per occurrence limit?',
        answer:
          '$1,000,000 per occurrence is the most common requirement in commercial leases. Some landlords in high-risk industries (food service, childcare, fitness) require $1,500,000. Umbrella or excess liability policies can bridge the gap if the base CGL limit is insufficient.',
      },
      {
        question: 'What does "per occurrence" mean in insurance terms?',
        answer:
          'Per occurrence means the maximum amount the insurer will pay for a single incident or claim. If a customer slips and falls, the per-occurrence limit caps the payout for that one event. This is different from the aggregate limit, which caps total payouts for all claims in a policy year.',
      },
    ],
    metaTitle: 'CGL Occurrence Limit in Commercial Leases',
    metaDescription:
      'CGL per occurrence limits set the minimum liability coverage for each incident. Learn standard requirements and how to evaluate your insurance needs.',
  },
  {
    fieldName: 'cgl_aggregate_limit',
    slug: 'cgl-aggregate-limit',
    displayLabel: 'CGL Aggregate Limit',
    category: 'insurance-indemnity',
    categoryLabel: 'Insurance & Indemnity',
    description: 'The total maximum liability coverage required for the policy period.',
    aliases: ['General Aggregate'],
    dataType: 'currency',
    required: true,
    camRelevant: false,
    whyItMatters:
      'The aggregate limit caps total insurance payouts across all claims in a policy year. Once exhausted, the tenant and landlord are personally exposed. Standard leases require $2 million aggregate, but businesses with frequent customer interactions may need higher limits. If the lease requires an aggregate significantly above the tenant\'s current policy, the premium increase can add $1,500-$5,000 to annual occupancy costs.',
    whereToFindIt:
      'Listed alongside the per-occurrence limit in the "Insurance" section. Standard formatting shows both limits together (e.g., "$1,000,000 per occurrence / $1,500,000 general aggregate").',
    relatedRedFlags: [],
    relatedFields: ['cgl-occurrence-limit', 'additional-insured-req', 'property-insurance-bearer'],
    relatedGlossaryTerms: [],
    faqs: [
      {
        question: 'What is a standard CGL aggregate limit?',
        answer:
          '$1,500,000 is the standard general aggregate limit in most commercial leases. This is typically twice the per-occurrence limit. High-risk tenants or large portfolios may need $3-5 million or more, often achieved through umbrella policies.',
      },
      {
        question: 'What happens if the aggregate limit is exhausted mid-year?',
        answer:
          'If total claims exceed the aggregate limit during the policy period, the tenant has no remaining CGL coverage. An umbrella policy provides additional layers of protection. Some leases require tenants to carry umbrella coverage precisely for this reason.',
      },
    ],
    metaTitle: 'CGL Aggregate Limit in Commercial Leases',
    metaDescription:
      'The CGL aggregate limit caps total liability payouts per year. Learn standard requirements, when higher limits are needed, and umbrella policy options.',
  },
  {
    fieldName: 'property_insurance_bearer',
    slug: 'property-insurance-bearer',
    displayLabel: 'Property Insurer',
    category: 'insurance-indemnity',
    categoryLabel: 'Insurance & Indemnity',
    description: 'Specifies whether the landlord or tenant insures the physical building/improvements.',
    aliases: ['Casualty Insurance'],
    dataType: 'string',
    required: true,
    camRelevant: false,
    whyItMatters:
      'Property insurance responsibility determines who carries the financial risk of building damage from fire, storms, or other casualties. In gross leases, the landlord typically insures the building and passes the premium through as an operating expense. In NNN leases, the tenant may be directly responsible for the insurance premium. If the wrong party is identified as the insurer, there could be a coverage gap that leaves the building uninsured during a critical period.',
    whereToFindIt:
      'Found in the "Insurance" section under "Property Insurance" or "Casualty Insurance." The lease should specify who maintains the policy, the coverage type (replacement cost vs. actual cash value), and which improvements are covered.',
    relatedRedFlags: [],
    relatedFields: ['waiver-of-subrogation', 'lease-structure-type', 'indemnification-scope'],
    relatedGlossaryTerms: ['nnn-lease', 'gross-lease'],
    faqs: [
      {
        question: 'Who typically carries property insurance in commercial leases?',
        answer:
          'In most leases, the landlord carries property insurance on the building structure and common areas. The cost is either included in gross rent or passed through as an operating expense in NNN leases. The tenant insures their own personal property, inventory, and tenant improvements.',
      },
      {
        question: 'Should the tenant insure their own improvements?',
        answer:
          'Yes. Even when the landlord carries building insurance, the policy typically does not cover tenant improvements above a minimal threshold. Tenants should carry "betterments and improvements" coverage to protect their build-out investment in case of fire, flood, or other casualty events.',
      },
    ],
    metaTitle: 'Property Insurer in Commercial Leases',
    metaDescription:
      'Property insurance determines who covers building damage from fire and storms. Learn which party typically insures and what tenants should cover.',
  },
  {
    fieldName: 'waiver_of_subrogation',
    slug: 'waiver-of-subrogation',
    displayLabel: 'Waiver of Subrogation',
    category: 'insurance-indemnity',
    categoryLabel: 'Insurance & Indemnity',
    description: 'A mutual agreement preventing insurers from suing the other party to recoup losses.',
    aliases: [],
    dataType: 'boolean',
    required: true,
    camRelevant: false,
    whyItMatters:
      'Without a mutual waiver of subrogation, your insurance company can sue the other lease party to recover claim payouts. If a tenant accidentally causes a fire, the landlord\'s insurer could sue the tenant for the full building damage -- potentially millions of dollars. A waiver of subrogation ensures that insurance covers losses without triggering cross-party litigation, which protects both landlord and tenant from catastrophic personal liability.',
    whereToFindIt:
      'Found in the "Insurance" section, often as a standalone paragraph titled "Waiver of Subrogation" or "Mutual Release." The clause should specify that both parties waive subrogation rights and that their respective insurers endorse the waiver.',
    relatedRedFlags: [],
    relatedFields: ['property-insurance-bearer', 'cgl-occurrence-limit', 'indemnification-scope'],
    relatedGlossaryTerms: [],
    faqs: [
      {
        question: 'What is subrogation in insurance?',
        answer:
          'Subrogation is the right of an insurance company to pursue a third party that caused a loss to recover the amount it paid on a claim. After paying a fire damage claim, the insurer "steps into the shoes" of the insured and can sue the party that caused the fire.',
      },
      {
        question: 'Why should subrogation be waived in commercial leases?',
        answer:
          'Both parties benefit from a mutual waiver because it prevents their respective insurance companies from suing each other. Without it, a minor incident could trigger expensive litigation between the parties, damaging the landlord-tenant relationship and creating liability beyond what insurance covers.',
      },
    ],
    metaTitle: 'Waiver of Subrogation in Commercial Leases',
    metaDescription:
      'A waiver of subrogation prevents insurers from suing the other lease party. Learn why this mutual clause protects both landlords and tenants.',
  },
  {
    fieldName: 'additional_insured_req',
    slug: 'additional-insured-req',
    displayLabel: 'Additional Insured',
    category: 'insurance-indemnity',
    categoryLabel: 'Insurance & Indemnity',
    description: 'Requirement for the tenant to add the landlord to their liability policy.',
    aliases: ['Named Insured'],
    dataType: 'boolean',
    required: true,
    camRelevant: false,
    whyItMatters:
      'Naming the landlord as an additional insured on the tenant\'s CGL policy means the landlord is covered under the tenant\'s policy for claims arising from the tenant\'s operations. Without this, the landlord must rely solely on their own insurance or the indemnification clause, which requires collecting from the tenant. This is a standard requirement that rarely costs the tenant additional premium but provides critical protection for the landlord.',
    whereToFindIt:
      'In the "Insurance" section, typically stated as "Tenant shall name Landlord as an additional insured on all liability policies." The clause may list specific entities that must be added (landlord, property manager, mortgagee).',
    relatedRedFlags: [],
    relatedFields: ['cgl-occurrence-limit', 'cgl-aggregate-limit', 'indemnification-scope'],
    relatedGlossaryTerms: [],
    faqs: [
      {
        question: 'Does adding the landlord as additional insured cost the tenant money?',
        answer:
          'In most cases, adding the landlord as an additional insured costs nothing or a minimal fee ($25-$100 per endorsement). The insurer adds the landlord via an endorsement to the existing CGL policy. Some policies include blanket additional insured coverage by default.',
      },
      {
        question: 'Who should be listed as an additional insured?',
        answer:
          'The lease typically requires the tenant to name the landlord entity, the property management company, and sometimes the landlord\'s lender as additional insureds. The specific entities should match the names listed in the lease to ensure there are no coverage gaps.',
      },
    ],
    metaTitle: 'Additional Insured in Commercial Leases',
    metaDescription:
      'Additional insured requirements extend the tenant\'s liability coverage to the landlord. Learn the standard requirements and minimal cost impact.',
  },
  {
    fieldName: 'indemnification_scope',
    slug: 'indemnification-scope',
    displayLabel: 'Indemnification Scope',
    category: 'insurance-indemnity',
    categoryLabel: 'Insurance & Indemnity',
    description: 'The extent to which the tenant holds the landlord harmless from liability claims.',
    aliases: ['Hold Harmless Agreement'],
    dataType: 'string',
    required: true,
    camRelevant: false,
    whyItMatters:
      'Indemnification scope determines whether the tenant is responsible for losses caused by the landlord\'s own negligence. A broad indemnity clause can make the tenant liable for incidents they did not cause, including injuries in common areas or structural failures. Mutual indemnification (each party covers their own negligence) is the fair standard. One-sided indemnification can expose tenants to unlimited liability for events entirely outside their control.',
    whereToFindIt:
      'Found in the "Indemnification" or "Hold Harmless" section. Look for whether the indemnity is mutual or one-sided, whether it covers the indemnifying party\'s sole negligence, and whether there are carve-outs for willful misconduct.',
    relatedRedFlags: [],
    relatedFields: ['waiver-of-subrogation', 'cgl-occurrence-limit', 'additional-insured-req'],
    relatedGlossaryTerms: [],
    faqs: [
      {
        question: 'What is the difference between mutual and one-sided indemnification?',
        answer:
          'Mutual indemnification means each party agrees to cover losses caused by their own negligence. One-sided indemnification requires the tenant to cover all losses, even those caused by the landlord. Mutual indemnification is the fair standard; one-sided clauses heavily favor the landlord.',
      },
      {
        question: 'Is a tenant ever required to indemnify the landlord for the landlord\'s negligence?',
        answer:
          'Some leases attempt this, but it is unenforceable in many states (including New York and California) under anti-indemnity statutes. These laws prohibit contractual indemnification for one\'s own negligence in construction and lease contexts. The abstractor should flag such clauses.',
      },
    ],
    metaTitle: 'Indemnification Scope in Commercial Leases',
    metaDescription:
      'Indemnification scope determines liability allocation between landlord and tenant. Learn the difference between mutual and one-sided indemnity.',
  },

  // ━━━ Assignment & Subletting (6 fields) ━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    fieldName: 'consent_required',
    slug: 'consent-required',
    displayLabel: 'Consent Required',
    category: 'assignment-subletting',
    categoryLabel: 'Assignment & Subletting',
    description: 'Indicates if landlord approval is necessary for a transfer of the leasehold.',
    aliases: ['Permission to Assign'],
    dataType: 'boolean',
    required: true,
    camRelevant: false,
    whyItMatters:
      'If consent is required for assignment or subletting, the tenant cannot exit the lease by finding a replacement without landlord approval. This limits flexibility for corporate restructurings, M&A transactions, and subleasing excess space. A consent requirement without a "shall not be unreasonably withheld" standard gives the landlord effective veto power over any transfer, trapping the tenant in the lease regardless of circumstances.',
    whereToFindIt:
      'Found in the "Assignment and Subletting" section. The first sentence typically states whether consent is required. The standard of consent and any exceptions follow in subsequent paragraphs.',
    relatedRedFlags: [],
    relatedFields: ['consent-standard', 'permitted-transferees', 'recapture-right'],
    relatedGlossaryTerms: ['assignment-and-subletting'],
    faqs: [
      {
        question: 'Can a tenant assign a lease without landlord consent?',
        answer:
          'Only if the lease explicitly permits it, which is rare. Most commercial leases require prior written consent. However, well-negotiated leases include exceptions for "permitted transfers" like corporate restructurings, parent-subsidiary transfers, and mergers where the surviving entity has equal or greater creditworthiness.',
      },
      {
        question: 'What happens if the tenant assigns without consent?',
        answer:
          'An unauthorized assignment is typically a material default that can trigger lease termination, acceleration of rent, and damages. Even if the new occupant is creditworthy, the lack of consent gives the landlord grounds to terminate.',
      },
    ],
    metaTitle: 'Consent Required in Commercial Leases',
    metaDescription:
      'Landlord consent requirements control whether tenants can assign or sublet. Learn how consent clauses affect flexibility and exit options.',
  },
  {
    fieldName: 'consent_standard',
    slug: 'consent-standard',
    displayLabel: 'Consent Standard',
    category: 'assignment-subletting',
    categoryLabel: 'Assignment & Subletting',
    description: 'The legal standard governing the landlord\'s right to refuse a transfer request.',
    aliases: [],
    dataType: 'string',
    required: true,
    camRelevant: false,
    whyItMatters:
      'The consent standard determines whether the landlord can arbitrarily block a transfer. "Sole discretion" gives the landlord absolute veto power. "Not to be unreasonably withheld, conditioned, or delayed" requires the landlord to have a legitimate business reason for refusal. In many states, courts will imply a reasonableness standard even if the lease is silent, but explicit language is far stronger protection.',
    whereToFindIt:
      'In the "Assignment and Subletting" section, usually in the same paragraph as the consent requirement. Key language to look for: "sole and absolute discretion," "not to be unreasonably withheld," or "reasonably withheld, conditioned, or delayed."',
    relatedRedFlags: [],
    relatedFields: ['consent-required', 'permitted-transferees', 'profit-sharing-percentage'],
    relatedGlossaryTerms: ['assignment-and-subletting'],
    faqs: [
      {
        question: 'What does "not to be unreasonably withheld" mean?',
        answer:
          'It means the landlord must have a legitimate business reason to refuse the transfer, such as the proposed assignee\'s poor creditworthiness, incompatible use, or violation of an exclusive use clause. The landlord cannot refuse simply because they want to re-lease the space at a higher rent.',
      },
      {
        question: 'What factors can a landlord consider when evaluating consent?',
        answer:
          'Reasonable factors include: the proposed tenant\'s financial condition, business reputation, intended use, compatibility with other tenants, and whether the use would violate any exclusive provisions in other leases. Factors like wanting a higher rent from a different tenant are generally considered unreasonable.',
      },
    ],
    metaTitle: 'Consent Standard in Commercial Leases',
    metaDescription:
      'The consent standard determines if a landlord can arbitrarily block lease transfers. Learn the difference between sole discretion and reasonableness.',
  },
  {
    fieldName: 'profit_sharing_percentage',
    slug: 'profit-sharing-percentage',
    displayLabel: 'Profit Sharing %',
    category: 'assignment-subletting',
    categoryLabel: 'Assignment & Subletting',
    description: 'The portion of sublease profits payable to the landlord.',
    aliases: [],
    dataType: 'percentage',
    required: false,
    camRelevant: false,
    whyItMatters:
      'Profit sharing clauses reduce the financial incentive for tenants to sublet at a markup. If the landlord takes 50% of sublease profits, a tenant subleasing 5,000 RSF at $5/RSF above their rate keeps only $12,500 of the $25,000 annual spread. This changes the economics of subleasing decisions and should be modeled before signing the lease, especially for tenants who may need to downsize.',
    whereToFindIt:
      'In the "Assignment and Subletting" section, typically in a paragraph about "excess rent" or "sublease profits." The definition of "profits" (gross vs. net of transaction costs) and the split percentage are key terms.',
    relatedRedFlags: [],
    relatedFields: ['consent-required', 'consent-standard', 'recapture-right'],
    relatedGlossaryTerms: ['assignment-and-subletting'],
    faqs: [
      {
        question: 'What is a typical sublease profit sharing percentage?',
        answer:
          'Landlords typically request 50% of sublease profits, though this is heavily negotiated. Some tenants negotiate down to 25-35% or eliminate the sharing requirement entirely. The definition of "profit" should deduct the tenant\'s reasonable costs (broker commissions, legal fees, build-out costs) before calculating the split.',
      },
      {
        question: 'How are sublease profits calculated?',
        answer:
          'Profits equal the sublease rent minus the tenant\'s lease rent for the sublet space, minus reasonable transaction costs. For example, if the tenant pays $30/RSF and subleases at $35/RSF for 3,000 RSF, the annual profit is $15,000 before deducting costs like broker commissions and legal fees.',
      },
    ],
    metaTitle: 'Profit Sharing % in Commercial Leases',
    metaDescription:
      'Sublease profit sharing reduces the tenant\'s financial incentive to sublet. Learn typical split percentages and how profits are calculated.',
  },
  {
    fieldName: 'recapture_right',
    slug: 'recapture-right',
    displayLabel: 'Recapture Right',
    category: 'assignment-subletting',
    categoryLabel: 'Assignment & Subletting',
    description: 'The landlord\'s right to terminate the lease and take back the space upon a transfer request.',
    aliases: [],
    dataType: 'boolean',
    required: true,
    camRelevant: false,
    whyItMatters:
      'A recapture right allows the landlord to cancel the lease instead of approving an assignment or sublease. This effectively converts the tenant\'s transfer request into a lease termination -- which may or may not be what the tenant wants. If the tenant planned to profit from a sublease or maintain control of the space, recapture eliminates that opportunity. Recapture rights make tenants reluctant to even request consent, chilling transfer activity.',
    whereToFindIt:
      'Found in the "Assignment and Subletting" section, usually as a separate paragraph describing the landlord\'s "right to recapture" or "right to terminate" upon receipt of a transfer request.',
    relatedRedFlags: ['RF-012'],
    relatedFields: ['consent-required', 'consent-standard', 'continuing-liability'],
    relatedGlossaryTerms: ['assignment-and-subletting'],
    faqs: [
      {
        question: 'How does recapture work in practice?',
        answer:
          'When the tenant requests consent to assign or sublease, the landlord has the option to terminate the lease (for the proposed sublease space or the entire premises) instead of approving the transfer. The landlord then re-leases directly to the new tenant, capturing the full rent rather than the original tenant\'s lease rate.',
      },
      {
        question: 'Can a tenant negotiate to eliminate recapture rights?',
        answer:
          'Yes, though landlords strongly resist. Common compromises include: limiting recapture to assignments only (not subleases), requiring the landlord to exercise recapture within a short window (e.g., 15 days), or allowing recapture only if the sublease covers more than 50% of the premises.',
      },
    ],
    metaTitle: 'Recapture Right in Commercial Leases',
    metaDescription:
      'Recapture rights let landlords terminate instead of approving transfers. Learn how they work, their impact on subleasing, and negotiation strategies.',
  },
  {
    fieldName: 'permitted_transferees',
    slug: 'permitted-transferees',
    displayLabel: 'Permitted Transferees',
    category: 'assignment-subletting',
    categoryLabel: 'Assignment & Subletting',
    description: 'Exemptions allowing corporate restructurings or M&A without landlord consent.',
    aliases: [],
    dataType: 'array',
    required: false,
    camRelevant: false,
    whyItMatters:
      'Permitted transferee provisions allow routine corporate transactions (mergers, acquisitions, parent-subsidiary transfers) without triggering the consent requirement. Without this carve-out, a tenant undergoing a corporate merger must obtain landlord consent for every lease in its portfolio, creating deal-killing delays. For companies with dozens of locations, negotiating permitted transferee language is essential for operational flexibility.',
    whereToFindIt:
      'In the "Assignment and Subletting" section, usually as a defined exception to the consent requirement. Look for "Permitted Transfers," "Exempt Transfers," or "Affiliate Transfers" provisions.',
    relatedRedFlags: [],
    relatedFields: ['consent-required', 'consent-standard', 'continuing-liability'],
    relatedGlossaryTerms: ['assignment-and-subletting'],
    faqs: [
      {
        question: 'What transfers are typically permitted without landlord consent?',
        answer:
          'Common permitted transfers include: (1) assignments to affiliates or subsidiaries, (2) transfers resulting from mergers or consolidations, (3) transfers of controlling interests in the tenant entity, and (4) internal corporate restructurings. Landlords often require the successor to have equal or greater net worth.',
      },
      {
        question: 'Does a permitted transfer release the original tenant from liability?',
        answer:
          'Usually not. Most leases state that permitted transfers do not release the original tenant from its obligations. The original entity remains liable as a guarantor unless the lease explicitly provides for release upon a permitted transfer.',
      },
    ],
    metaTitle: 'Permitted Transferees in Commercial Leases',
    metaDescription:
      'Permitted transferee clauses allow mergers and restructurings without landlord consent. Learn typical exemptions and continuing liability implications.',
  },
  {
    fieldName: 'continuing_liability',
    slug: 'continuing-liability',
    displayLabel: 'Continuing Liability',
    category: 'assignment-subletting',
    categoryLabel: 'Assignment & Subletting',
    description: 'Indicates if the original tenant remains financially liable post-assignment.',
    aliases: ['Ongoing Guaranty'],
    dataType: 'boolean',
    required: true,
    camRelevant: false,
    whyItMatters:
      'Continuing liability means the original tenant remains on the hook for rent and damages even after assigning the lease to a new party. If the assignee defaults, the landlord can pursue the original tenant for the full remaining obligation. On a 10-year lease with 7 years remaining at $15,000/month, continuing liability represents $1.68 million in potential exposure. Tenants should negotiate a release of liability upon assignment to a creditworthy successor.',
    whereToFindIt:
      'In the "Assignment and Subletting" section, typically stating that "no assignment shall release Tenant from its obligations." May also be addressed in the landlord\'s consent letter when an actual assignment occurs.',
    relatedRedFlags: [],
    relatedFields: ['consent-required', 'recapture-right', 'tenant-legal-name'],
    relatedGlossaryTerms: ['assignment-and-subletting', 'personal-guarantee'],
    faqs: [
      {
        question: 'Is continuing liability standard in commercial leases?',
        answer:
          'Yes, most commercial leases include continuing liability as a default provision. The original tenant remains liable unless explicitly released in writing. This is a heavily negotiated point, particularly for corporate tenants undergoing M&A transactions who want a clean break from legacy obligations.',
      },
      {
        question: 'How can a tenant negotiate out of continuing liability?',
        answer:
          'Tenants can negotiate a release contingent on the assignee meeting minimum creditworthiness standards (e.g., net worth exceeding a specified threshold). Alternatively, tenants may negotiate a time-limited guarantee that expires 12-24 months after the assignment if no default occurs.',
      },
    ],
    metaTitle: 'Continuing Liability in Commercial Leases',
    metaDescription:
      'Continuing liability keeps the original tenant responsible after assignment. Learn the financial exposure and how to negotiate a release.',
  },

  // ━━━ Default & Remedies (6 fields) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    fieldName: 'monetary_cure_period',
    slug: 'monetary-cure-period',
    displayLabel: 'Monetary Cure Period',
    category: 'default-remedies',
    categoryLabel: 'Default & Remedies',
    description: 'The number of days allowed to remedy missed financial payments after notice.',
    aliases: [],
    dataType: 'number',
    required: true,
    camRelevant: false,
    whyItMatters:
      'A short monetary cure period (3-5 days) gives the tenant almost no time to resolve a missed payment before the landlord can declare default and pursue remedies including eviction. Most bank wire transfers take 1-3 business days to process. A cure period of 5 business days (not calendar days) is the minimum reasonable standard. Missing this field during abstraction means the accounting team cannot properly prioritize payment deadlines.',
    whereToFindIt:
      'Found in the "Default" or "Events of Default" section. Look for language about "failure to pay rent within X days after written notice" or "monetary default." The cure period for monetary defaults is usually shorter than for non-monetary defaults.',
    relatedRedFlags: ['RF-007'],
    relatedFields: ['non-monetary-cure-period', 'late-fee-percentage', 'acceleration-clause'],
    relatedGlossaryTerms: [],
    faqs: [
      {
        question: 'What is a standard monetary cure period?',
        answer:
          'Most commercial leases allow 5 to 10 days to cure a monetary default after written notice from the landlord. Some tenant-friendly leases provide 15-30 days. Periods shorter than 5 days are aggressive and should be flagged during abstraction.',
      },
      {
        question: 'Does the cure period start from notice delivery or receipt?',
        answer:
          'This varies by lease. "Upon receipt of written notice" starts the clock when the tenant actually receives it. "Upon delivery" may start when the landlord mails or sends the notice. The method of notice delivery (email, certified mail, overnight courier) affects the effective start date.',
      },
    ],
    metaTitle: 'Monetary Cure Period in Commercial Leases',
    metaDescription:
      'The monetary cure period determines how long tenants have to fix missed payments. Learn standard timeframes and why short periods are a red flag.',
  },
  {
    fieldName: 'non_monetary_cure_period',
    slug: 'non-monetary-cure-period',
    displayLabel: 'Non-Monetary Cure',
    category: 'default-remedies',
    categoryLabel: 'Default & Remedies',
    description: 'The number of days allowed to remedy operational or physical breaches after notice.',
    aliases: ['Performance Grace Period'],
    dataType: 'number',
    required: true,
    camRelevant: false,
    whyItMatters:
      'Non-monetary defaults (like failing to maintain insurance, unauthorized alterations, or use violations) are often more complex to cure than simply writing a check. A 10-day cure period for obtaining new insurance coverage may be insufficient if the tenant needs to switch carriers. Standard non-monetary cure periods of 30 days with the ability to extend for good-faith efforts protect the tenant from losing the lease over administrative delays.',
    whereToFindIt:
      'In the "Default" section, usually in a separate paragraph from the monetary cure period. Look for "non-monetary default" or "other defaults." Well-drafted leases include a "diligent pursuit" extension if the cure cannot reasonably be completed within the initial period.',
    relatedRedFlags: [],
    relatedFields: ['monetary-cure-period', 'acceleration-clause', 'liquidated-damages'],
    relatedGlossaryTerms: [],
    faqs: [
      {
        question: 'What is a standard non-monetary cure period?',
        answer:
          'Most leases allow 30 days to cure non-monetary defaults, with an extension if the tenant is diligently pursuing the cure and it reasonably cannot be completed in 30 days. Periods shorter than 20 days are unusual and should be flagged.',
      },
      {
        question: 'What are common non-monetary defaults?',
        answer:
          'Common non-monetary defaults include: failure to maintain required insurance, unauthorized alterations, violation of permitted use restrictions, failure to comply with rules and regulations, abandonment of the premises, and failure to deliver an estoppel certificate within the required timeframe.',
      },
    ],
    metaTitle: 'Non-Monetary Cure in Commercial Leases',
    metaDescription:
      'Non-monetary cure periods cover operational breaches like insurance lapses. Learn standard timeframes, extension rights, and common default types.',
  },
  {
    fieldName: 'acceleration_clause',
    slug: 'acceleration-clause',
    displayLabel: 'Acceleration Clause',
    category: 'default-remedies',
    categoryLabel: 'Default & Remedies',
    description: 'Landlord\'s right to demand all future rent immediately upon a lease default.',
    aliases: [],
    dataType: 'boolean',
    required: true,
    camRelevant: false,
    whyItMatters:
      'An acceleration clause converts a monthly rent obligation into an immediate lump-sum demand upon default. On a lease with 60 months remaining at $25,000/month, acceleration creates a $1.5 million demand. While courts in many jurisdictions require landlords to mitigate damages by re-leasing, the clause shifts the burden to the tenant to prove mitigation. This is one of the most punitive remedies available to landlords.',
    whereToFindIt:
      'Found in the "Remedies" or "Landlord\'s Remedies" section. Look for language about the landlord\'s right to "accelerate" rent or demand "the present value of all rent for the balance of the Term." May also reference a discount rate for present value calculations.',
    relatedRedFlags: [],
    relatedFields: ['monetary-cure-period', 'liquidated-damages', 'holdover-rate'],
    relatedGlossaryTerms: [],
    faqs: [
      {
        question: 'Are acceleration clauses enforceable?',
        answer:
          'Enforceability varies by state. Many jurisdictions require the landlord to reduce the accelerated amount to present value and credit the tenant for any mitigation (re-leasing). Some states limit acceleration to actual damages. Courts generally disfavor double recovery, so the landlord cannot both accelerate rent and re-lease the space without providing a credit.',
      },
      {
        question: 'How is accelerated rent calculated?',
        answer:
          'Typically, accelerated rent equals the present value of all remaining rent payments, discounted at a specified rate (often the Federal Reserve discount rate or a contractual rate). Some leases use a simpler formula: total remaining rent minus a fixed discount. The present value approach is more favorable to tenants.',
      },
    ],
    metaTitle: 'Acceleration Clause in Commercial Leases',
    metaDescription:
      'Acceleration clauses let landlords demand all future rent at once. Learn how they work, enforceability limits, and present value calculations.',
  },
  {
    fieldName: 'liquidated_damages',
    slug: 'liquidated-damages',
    displayLabel: 'Liquidated Damages',
    category: 'default-remedies',
    categoryLabel: 'Default & Remedies',
    description: 'A predetermined penalty fee assessed for specific breaches of the contract.',
    aliases: [],
    dataType: 'currency',
    required: false,
    camRelevant: false,
    whyItMatters:
      'Liquidated damages clauses set a predetermined penalty for specific defaults, providing certainty for both parties. For tenants, knowing the maximum penalty allows for risk budgeting. For landlords, liquidated damages avoid the cost and uncertainty of proving actual damages in court. However, if the amount is disproportionate to actual likely damages, courts may strike it as an unenforceable penalty.',
    whereToFindIt:
      'Found in the "Remedies" section or in specific clauses where breach consequences are defined (e.g., early termination, failure to open for business). May also appear in the construction or opening deadline provisions.',
    relatedRedFlags: [],
    relatedFields: ['acceleration-clause', 'late-fee-percentage', 'monetary-cure-period'],
    relatedGlossaryTerms: [],
    faqs: [
      {
        question: 'What is the difference between liquidated damages and a penalty?',
        answer:
          'Liquidated damages are a reasonable pre-estimate of actual losses that would be difficult to calculate at the time of breach. A penalty is a punishment that bears no relationship to actual damages. Courts enforce liquidated damages clauses but may strike down provisions they deem to be penalties.',
      },
      {
        question: 'When are liquidated damages most commonly used in leases?',
        answer:
          'Common uses include: early termination fees, late delivery penalties (landlord to tenant), failure to open for business by a certain date (in retail), and construction milestone delays. The clause should explain why actual damages are difficult to ascertain to improve enforceability.',
      },
    ],
    metaTitle: 'Liquidated Damages in Commercial Leases',
    metaDescription:
      'Liquidated damages set predetermined penalties for lease breaches. Learn when they are enforceable and how they differ from punitive penalties.',
  },
  {
    fieldName: 'late_fee_percentage',
    slug: 'late-fee-percentage',
    displayLabel: 'Late Fee %',
    category: 'default-remedies',
    categoryLabel: 'Default & Remedies',
    description: 'The penalty percentage applied to overdue rent payments.',
    aliases: [],
    dataType: 'percentage',
    required: true,
    camRelevant: false,
    whyItMatters:
      'Late fees compound quickly on large rent obligations. A 5% late fee on a $30,000 monthly rent is $1,500 per incident. If the tenant is consistently late -- even by a few days -- annual late fees can reach $18,000. Some aggressive leases charge compound interest on top of flat late fees. Understanding the fee structure allows accounting teams to prioritize payment timing and avoid unnecessary costs.',
    whereToFindIt:
      'Found in the "Rent" or "Late Charges" section. Look for the fee structure (flat percentage, flat dollar amount, or per-diem interest rate), the grace period before fees apply, and whether the fee applies to base rent only or all amounts due.',
    relatedRedFlags: [],
    relatedFields: ['monetary-cure-period', 'rent-payment-frequency', 'base-rent-annual'],
    relatedGlossaryTerms: ['base-rent'],
    faqs: [
      {
        question: 'What is a typical late fee in commercial leases?',
        answer:
          'Late fees typically range from 3% to 5% of the overdue amount. Some leases charge a flat dollar amount (e.g., $500) plus per-diem interest (e.g., 1.5% per month). A grace period of 3-5 days after the due date before fees apply is standard. Fees above 5% may be challenged as penalties.',
      },
      {
        question: 'Are late fees enforceable if there is no grace period?',
        answer:
          'Courts in some jurisdictions have scrutinized late fees without grace periods as potential penalties. A brief grace period (3-5 days) makes the fee more likely to be enforceable. Tenants should negotiate at least a 5-day grace period to account for mail and processing delays.',
      },
    ],
    metaTitle: 'Late Fee % in Commercial Leases',
    metaDescription:
      'Late fee percentages penalize overdue rent payments. Learn typical rates, grace periods, and how to avoid thousands in unnecessary charges.',
  },
  {
    fieldName: 'holdover_rate',
    slug: 'holdover-rate',
    displayLabel: 'Holdover Rate',
    category: 'default-remedies',
    categoryLabel: 'Default & Remedies',
    description: 'The multiplier applied to base rent if the tenant remains post-expiration.',
    aliases: ['Overstay Penalty'],
    dataType: 'percentage',
    required: true,
    camRelevant: false,
    whyItMatters:
      'Holdover rates of 150-200% of base rent can cost tenants thousands per month if they stay even one day past expiration. Missing this field during abstraction means the tenant does not know their penalty exposure. A tenant paying $40,000/month in base rent faces $60,000-$80,000/month in holdover charges. Beyond the rent premium, holdover tenants may be liable for consequential damages if an incoming tenant sues the landlord for late delivery.',
    whereToFindIt:
      'Found in the "Holdover" or "Holding Over" section, typically near the end of the lease. The rate is usually expressed as a percentage of the last applicable base rent (e.g., "150% of the then-current Base Rent").',
    relatedRedFlags: ['RF-008'],
    relatedFields: ['expiration-date', 'has-renewal-option', 'base-rent-annual'],
    relatedGlossaryTerms: ['holdover-provision', 'critical-date'],
    faqs: [
      {
        question: 'What is a typical holdover rate?',
        answer:
          'Most commercial leases set holdover rates between 150% and 200% of the last base rent. Rates above 200% are aggressive and should be negotiated. Some leases also specify that holdover creates a month-to-month tenancy terminable on 30 days notice, while others treat it as a tenancy at sufferance.',
      },
      {
        question: 'Can a tenant negotiate a lower holdover rate?',
        answer:
          'Yes, though landlords resist because the high rate incentivizes timely vacating. A common compromise is 125% for the first 30-60 days (to account for reasonable move-out delays) escalating to 200% thereafter. This protects the tenant from short delays while still penalizing extended holdover.',
      },
      {
        question: 'Is the holdover rate the only cost of staying past expiration?',
        answer:
          'No. Beyond the elevated rent, the holdover tenant may be liable for consequential damages including rent differential to the landlord if they had a signed lease with a new tenant at a higher rate, moving and storage costs incurred by the incoming tenant, and attorney fees for eviction proceedings.',
      },
    ],
    metaTitle: 'Holdover Rate in Commercial Leases',
    metaDescription:
      'Holdover rates of 150-200% penalize tenants who stay past lease expiration. Learn the financial exposure and how to negotiate better terms.',
  },

  // ━━━ Exclusivity & Co-tenancy (6 fields) ━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    fieldName: 'exclusive_use_rights',
    slug: 'exclusive-use-rights',
    displayLabel: 'Exclusive Use',
    category: 'exclusivity-cotenancy',
    categoryLabel: 'Exclusivity & Co-tenancy',
    description: 'A covenant preventing the landlord from leasing to direct competitors in the center.',
    aliases: ['Non-compete Clause'],
    dataType: 'string',
    required: false,
    camRelevant: false,
    whyItMatters:
      'Exclusive use clauses protect the tenant\'s market share within the building or shopping center. A restaurant with an exclusive on "sit-down dining" prevents the landlord from leasing to another restaurant in the same complex. Without exclusivity, a direct competitor could open next door, cannibalizing sales and potentially triggering percentage rent disputes. Exclusive use rights are particularly critical for retail tenants whose business model depends on limited competition.',
    whereToFindIt:
      'Found in the "Exclusivity" or "Exclusive Use" section, sometimes in a separate rider or addendum. The scope of the exclusivity (what is protected), the area (building, shopping center, or radius), and the remedies for breach are all key terms.',
    relatedRedFlags: [],
    relatedFields: ['radius-restriction-miles', 'permitted-use-description', 'opening-cotenancy'],
    relatedGlossaryTerms: ['exclusive-use-clause'],
    faqs: [
      {
        question: 'What should an exclusive use clause cover?',
        answer:
          'A strong exclusive use clause defines exactly what products or services are protected, the geographic area covered (the entire shopping center, not just the building), the remedy if breached (rent reduction, termination right, or both), and whether the exclusivity survives lease renewals.',
      },
      {
        question: 'Can existing tenants override a new tenant\'s exclusive use clause?',
        answer:
          'If an existing tenant already has the right to sell competing products, the new tenant\'s exclusive clause cannot retroactively restrict them. The new tenant should request disclosure of all existing exclusive use provisions before signing. This is a common due diligence failure.',
      },
    ],
    metaTitle: 'Exclusive Use in Commercial Leases',
    metaDescription:
      'Exclusive use clauses prevent landlords from leasing to competitors. Learn what to include, enforcement remedies, and common pitfalls.',
  },
  {
    fieldName: 'radius_restriction_miles',
    slug: 'radius-restriction-miles',
    displayLabel: 'Radius Restriction',
    category: 'exclusivity-cotenancy',
    categoryLabel: 'Exclusivity & Co-tenancy',
    description: 'The geographic distance within which a tenant cannot open a competing location.',
    aliases: [],
    dataType: 'number',
    required: false,
    camRelevant: false,
    whyItMatters:
      'Radius restrictions limit where the tenant can open additional locations, protecting the landlord\'s percentage rent income. A 5-mile radius restriction in a densely populated metro area could effectively prevent the tenant from opening any additional stores in the market. For growing retail chains, an overly broad radius can be a deal-breaker. The restriction must be balanced against the tenant\'s expansion plans and the market\'s competitive dynamics.',
    whereToFindIt:
      'Found in the "Percentage Rent" or "Radius Restriction" section, typically expressed as a distance in miles from the leased premises. Some leases use drive time or specific geographic boundaries instead of a radius.',
    relatedRedFlags: [],
    relatedFields: ['exclusive-use-rights', 'percentage-rent-rate', 'permitted-use-description'],
    relatedGlossaryTerms: [],
    faqs: [
      {
        question: 'What is a typical radius restriction distance?',
        answer:
          'Radius restrictions commonly range from 2 to 5 miles. Urban areas may use 1-3 miles due to population density, while suburban areas may extend to 5-10 miles. Some leases define the restriction by drive time (e.g., 15-minute drive) rather than straight-line distance.',
      },
      {
        question: 'Are radius restrictions enforceable?',
        answer:
          'Generally yes, as long as they are reasonable in scope, duration, and geographic area. Courts may strike down overly broad restrictions as unreasonable restraints on trade. Restrictions tied to a legitimate interest (protecting percentage rent) are more likely to be upheld than blanket non-compete provisions.',
      },
    ],
    metaTitle: 'Radius Restriction in Commercial Leases',
    metaDescription:
      'Radius restrictions limit where tenants can open competing locations. Learn typical distances, enforceability standards, and negotiation strategies.',
  },
  {
    fieldName: 'opening_cotenancy',
    slug: 'opening-cotenancy',
    displayLabel: 'Opening Co-tenancy',
    category: 'exclusivity-cotenancy',
    categoryLabel: 'Exclusivity & Co-tenancy',
    description: 'Conditions requiring specific occupancy levels before the tenant is obligated to open.',
    aliases: [],
    dataType: 'string',
    required: false,
    camRelevant: false,
    whyItMatters:
      'Opening co-tenancy protects a tenant from opening in a shopping center that lacks the foot traffic needed to support the business. If the anchor tenant has not opened or the center is less than 60% occupied, the co-tenancy clause may allow the tenant to delay opening, pay reduced rent, or terminate. Without this protection, a tenant could be forced to open in a half-empty center, spending tens of thousands on staffing and inventory with minimal customer traffic.',
    whereToFindIt:
      'Found in the "Co-tenancy" section, typically in retail lease addenda. Look for conditions tied to named anchor tenants, minimum occupancy percentages, and the remedies available if conditions are not met at the scheduled opening date.',
    relatedRedFlags: [],
    relatedFields: ['ongoing-cotenancy', 'cotenancy-remedy', 'alternative-rent-rate'],
    relatedGlossaryTerms: ['continuous-operation-clause'],
    faqs: [
      {
        question: 'What is a typical opening co-tenancy requirement?',
        answer:
          'Common requirements include: (1) a named anchor tenant being open and operating, (2) a minimum occupancy threshold (typically 60-75% of the center\'s GLA), or (3) both. Some clauses name specific co-tenants (e.g., "Target and at least two major national retailers must be open").',
      },
      {
        question: 'What happens if opening co-tenancy is not met?',
        answer:
          'Typical remedies include: the right to delay opening until conditions are met, paying percentage rent only (or a reduced alternative rent) until conditions are satisfied, or the right to terminate the lease if conditions are not met within a specified period (often 12-18 months).',
      },
    ],
    metaTitle: 'Opening Co-tenancy in Commercial Leases',
    metaDescription:
      'Opening co-tenancy protects tenants from opening in under-occupied centers. Learn typical thresholds, remedies, and how to negotiate protection.',
  },
  {
    fieldName: 'ongoing_cotenancy',
    slug: 'ongoing-cotenancy',
    displayLabel: 'Ongoing Co-tenancy',
    category: 'exclusivity-cotenancy',
    categoryLabel: 'Exclusivity & Co-tenancy',
    description: 'Conditions requiring the continuous operation of specific anchor tenants.',
    aliases: ['Operating Co-tenancy'],
    dataType: 'string',
    required: false,
    camRelevant: false,
    whyItMatters:
      'When an anchor tenant closes during the lease term, foot traffic can drop 30-50%, devastating inline tenants\' sales. Ongoing co-tenancy provisions give the tenant relief (rent reduction or termination right) if key anchors close. Without this protection, a tenant paying $5,000/month in a shopping center could see sales drop by half when the anchor leaves, while remaining obligated for full rent for the remaining lease term.',
    whereToFindIt:
      'In the "Co-tenancy" section alongside opening co-tenancy provisions. Look for requirements tied to named anchor tenants or minimum occupancy levels that must be maintained throughout the lease term, not just at opening.',
    relatedRedFlags: [],
    relatedFields: ['opening-cotenancy', 'cotenancy-remedy', 'alternative-rent-rate'],
    relatedGlossaryTerms: ['continuous-operation-clause'],
    faqs: [
      {
        question: 'How does ongoing co-tenancy differ from opening co-tenancy?',
        answer:
          'Opening co-tenancy applies only at the start -- conditions must be met before the tenant opens. Ongoing co-tenancy applies throughout the lease term. If a named anchor tenant closes or occupancy drops below the threshold at any point during the term, the tenant\'s remedies are triggered.',
      },
      {
        question: 'What anchors are typically named in co-tenancy clauses?',
        answer:
          'Named anchors vary by center type. In malls, tenants name specific department stores or major retailers. In strip centers, the grocery anchor or big-box retailer is typically named. Some clauses specify categories (e.g., "at least one national grocery chain") rather than specific brands for flexibility.',
      },
    ],
    metaTitle: 'Ongoing Co-tenancy in Commercial Leases',
    metaDescription:
      'Ongoing co-tenancy protects tenants when anchor stores close during the lease term. Learn how it works and what remedies are available.',
  },
  {
    fieldName: 'cotenancy_remedy',
    slug: 'cotenancy-remedy',
    displayLabel: 'Co-tenancy Remedy',
    category: 'exclusivity-cotenancy',
    categoryLabel: 'Exclusivity & Co-tenancy',
    description: 'The tenant\'s recourse if co-tenancy fails.',
    aliases: [],
    dataType: 'string',
    required: false,
    camRelevant: false,
    whyItMatters:
      'The remedy defines what relief the tenant actually receives when co-tenancy conditions fail. Common remedies range from weak (right to close during certain hours) to strong (right to terminate the lease). A "self-executing" remedy (automatic rent reduction) is far more protective than one requiring the tenant to give notice and wait. The remedy determines whether the co-tenancy clause has real teeth or is merely aspirational language.',
    whereToFindIt:
      'In the "Co-tenancy" section, typically following the description of the co-tenancy requirements. Look for tiered remedies that escalate over time (e.g., reduced rent for 6 months, then termination right).',
    relatedRedFlags: [],
    relatedFields: ['opening-cotenancy', 'ongoing-cotenancy', 'alternative-rent-rate'],
    relatedGlossaryTerms: ['exclusive-use-clause'],
    faqs: [
      {
        question: 'What are the most common co-tenancy remedies?',
        answer:
          'The most common tiered approach is: (1) immediate right to pay alternative rent (e.g., percentage of sales only) when co-tenancy fails, (2) right to go dark (stop operating) while paying reduced rent, and (3) right to terminate after a cure period (typically 12-18 months) if conditions are not restored.',
      },
      {
        question: 'What is a "self-executing" co-tenancy remedy?',
        answer:
          'A self-executing remedy takes effect automatically when the co-tenancy condition fails, without requiring the tenant to give written notice or take any affirmative action. This is the strongest form of protection because delays in notice delivery cannot deprive the tenant of relief.',
      },
    ],
    metaTitle: 'Co-tenancy Remedy in Commercial Leases',
    metaDescription:
      'Co-tenancy remedies define tenant relief when anchors close. Learn about tiered remedies from rent reduction to termination rights.',
  },
  {
    fieldName: 'alternative_rent_rate',
    slug: 'alternative-rent-rate',
    displayLabel: 'Alternative Rent',
    category: 'exclusivity-cotenancy',
    categoryLabel: 'Exclusivity & Co-tenancy',
    description: 'The modified rent structure implemented during a co-tenancy failure period.',
    aliases: [],
    dataType: 'string',
    required: false,
    camRelevant: false,
    whyItMatters:
      'Alternative rent defines the reduced payment the tenant owes when co-tenancy conditions fail. Typically structured as the greater of a fixed minimum or a percentage of gross sales, it aligns the tenant\'s rent with reduced foot traffic. The difference between full rent and alternative rent represents the tenant\'s monthly savings during the co-tenancy failure period. On a $10,000/month lease, alternative rent of $3,000/month saves $84,000 over 12 months of anchor vacancy.',
    whereToFindIt:
      'In the "Co-tenancy" section alongside the co-tenancy remedy provisions. Look for language about "alternative rent," "reduced rent," or "percentage rent only" during the failure period.',
    relatedRedFlags: [],
    relatedFields: ['cotenancy-remedy', 'ongoing-cotenancy', 'percentage-rent-rate'],
    relatedGlossaryTerms: ['base-rent'],
    faqs: [
      {
        question: 'How is alternative rent typically structured?',
        answer:
          'Common structures include: (1) percentage of gross sales only (no base rent), (2) the greater of a reduced base rent or percentage rent, or (3) a flat percentage reduction of base rent (e.g., 50% of base rent). The first option most closely aligns rent with actual business performance during the co-tenancy failure.',
      },
      {
        question: 'How long does alternative rent last?',
        answer:
          'Alternative rent typically applies for a defined cure period (12-18 months) during which the landlord attempts to restore the co-tenancy condition. If the condition is not restored, the tenant\'s right to terminate kicks in. Some leases allow alternative rent to continue indefinitely as an alternative to termination.',
      },
    ],
    metaTitle: 'Alternative Rent in Commercial Leases',
    metaDescription:
      'Alternative rent reduces payments during co-tenancy failures. Learn common structures, typical savings, and how it connects to termination rights.',
  },

  // ━━━ Parking & Common Areas (5 fields) ━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    fieldName: 'parking_ratio',
    slug: 'parking-ratio',
    displayLabel: 'Parking Ratio',
    category: 'parking-common-areas',
    categoryLabel: 'Parking & Common Areas',
    description: 'The number of spaces allocated per 1,000 square feet of leased space.',
    aliases: [],
    dataType: 'number',
    required: false,
    camRelevant: false,
    whyItMatters:
      'Inadequate parking directly impacts employee retention and customer traffic. A medical office needs 5-6 spaces per 1,000 RSF to accommodate patients, while a standard office needs 3-4. If the lease provides only 2 spaces per 1,000 RSF, the tenant faces a permanent operational constraint. In dense urban areas, parking costs can add $150-$300 per space per month to occupancy costs, making the ratio a significant financial factor.',
    whereToFindIt:
      'Found in the "Parking" section or "Common Areas" provisions. May be stated as a ratio (e.g., "4 spaces per 1,000 RSF") or as a total number of spaces. Some leases reference the parking in an exhibit or site plan.',
    relatedRedFlags: [],
    relatedFields: ['unreserved-parking-spaces', 'reserved-parking-spaces', 'monthly-parking-cost'],
    relatedGlossaryTerms: [],
    faqs: [
      {
        question: 'What is a standard parking ratio for commercial office space?',
        answer:
          'Standard office parking ratios range from 3 to 5 spaces per 1,000 RSF. Suburban offices typically provide 4-5 spaces, while urban buildings may offer only 1-2 with public transit alternatives. Medical offices need 5-6 spaces, and retail requires 4-5 spaces per 1,000 RSF.',
      },
      {
        question: 'Is the parking ratio guaranteed for the entire lease term?',
        answer:
          'It depends on the lease language. Some leases guarantee a minimum ratio, while others provide parking on a "non-exclusive, first-come-first-served" basis. Tenants should negotiate a guaranteed minimum to prevent the landlord from reducing parking during the term.',
      },
    ],
    metaTitle: 'Parking Ratio in Commercial Leases',
    metaDescription:
      'Parking ratios determine spaces per 1,000 RSF. Learn standard ratios by property type and why guaranteed minimums matter for operations.',
  },
  {
    fieldName: 'unreserved_parking_spaces',
    slug: 'unreserved-parking-spaces',
    displayLabel: 'Unreserved Spaces',
    category: 'parking-common-areas',
    categoryLabel: 'Parking & Common Areas',
    description: 'The raw number of non-specific parking spaces granted to the tenant.',
    aliases: [],
    dataType: 'number',
    required: false,
    camRelevant: false,
    whyItMatters:
      'Unreserved spaces provide the bulk of a tenant\'s parking capacity for employees and visitors. While less desirable than reserved spaces, they represent the majority of available parking. If the lease does not specify a minimum number, the landlord can reduce the tenant\'s allocation unilaterally. In multi-tenant buildings, competition for unreserved spaces creates friction that affects employee satisfaction and client visits.',
    whereToFindIt:
      'In the "Parking" section, stated as a total number of spaces or calculated from the parking ratio. May distinguish between surface, garage, and off-site parking. Look for whether the spaces are "non-exclusive" (shared with other tenants) or "exclusive" (designated for the tenant).',
    relatedRedFlags: [],
    relatedFields: ['parking-ratio', 'reserved-parking-spaces', 'monthly-parking-cost'],
    relatedGlossaryTerms: [],
    faqs: [
      {
        question: 'What is the difference between unreserved and reserved parking?',
        answer:
          'Unreserved spaces are available on a first-come, first-served basis and are shared among all building tenants and visitors. Reserved spaces are specifically designated for the tenant and may be marked with signage. Reserved spaces cost more but guarantee availability.',
      },
      {
        question: 'Can the landlord change the location of unreserved spaces?',
        answer:
          'Usually yes, unless the lease restricts relocation. Landlords may relocate unreserved spaces during construction, repaving, or lot reconfiguration. Tenants should negotiate limits on how far spaces can be moved from the building entrance.',
      },
    ],
    metaTitle: 'Unreserved Spaces in Commercial Leases',
    metaDescription:
      'Unreserved parking spaces provide the bulk of tenant parking. Learn how they work, guaranteed minimums, and the difference from reserved spaces.',
  },
  {
    fieldName: 'reserved_parking_spaces',
    slug: 'reserved-parking-spaces',
    displayLabel: 'Reserved Spaces',
    category: 'parking-common-areas',
    categoryLabel: 'Parking & Common Areas',
    description: 'The number of explicitly designated, exclusive parking stalls for the tenant.',
    aliases: ['Executive Parking'],
    dataType: 'number',
    required: false,
    camRelevant: false,
    whyItMatters:
      'Reserved spaces guarantee convenient, accessible parking for executives, key employees, or customer-facing staff. They eliminate the morning competition for spots and project professionalism for client visits. In urban markets, reserved garage spaces can cost $200-$400/month each, adding $2,400-$4,800/year per space to occupancy costs. The number and location of reserved spaces should be documented during abstraction for accurate budgeting.',
    whereToFindIt:
      'In the "Parking" section or a parking exhibit/addendum. Reserved spaces are often shown on a parking plan with specific stall numbers or designated areas. Monthly costs for reserved spaces are stated alongside the allocation.',
    relatedRedFlags: [],
    relatedFields: ['unreserved-parking-spaces', 'parking-ratio', 'monthly-parking-cost'],
    relatedGlossaryTerms: [],
    faqs: [
      {
        question: 'How much do reserved parking spaces cost?',
        answer:
          'Costs vary dramatically by market. Suburban surface lots may include reserved spaces at no charge. Urban garages typically charge $150-$400/month per reserved space. Premium CBD locations can exceed $500/month. The cost is usually stated separately from base rent and may escalate annually.',
      },
      {
        question: 'Can reserved spaces be reassigned during the lease term?',
        answer:
          'The lease should specify whether reserved spaces are in fixed locations or subject to relocation by the landlord. Tenants should negotiate for fixed locations (or locations within a defined area) to prevent the landlord from moving reserved spaces to less convenient areas.',
      },
    ],
    metaTitle: 'Reserved Spaces in Commercial Leases',
    metaDescription:
      'Reserved parking spaces guarantee designated spots for key staff. Learn typical costs, how to secure fixed locations, and budgeting considerations.',
  },
  {
    fieldName: 'monthly_parking_cost',
    slug: 'monthly-parking-cost',
    displayLabel: 'Monthly Parking Cost',
    category: 'parking-common-areas',
    categoryLabel: 'Parking & Common Areas',
    description: 'The fee levied per space for utilizing the parking facilities.',
    aliases: [],
    dataType: 'currency',
    required: false,
    camRelevant: false,
    whyItMatters:
      'Monthly parking costs can significantly increase total occupancy expense, especially in urban markets. A tenant with 20 parking spaces at $250/month pays $60,000 annually -- potentially 10-15% of base rent. If parking costs escalate at a higher rate than base rent, total occupancy cost grows faster than expected. Parking fees should be modeled separately from base rent and CAM when evaluating total lease economics.',
    whereToFindIt:
      'In the "Parking" section, stated as a per-space monthly rate. Look for escalation provisions (annual increases), whether the rate differs between reserved and unreserved spaces, and whether validation or visitor parking is included.',
    relatedRedFlags: [],
    relatedFields: ['parking-ratio', 'reserved-parking-spaces', 'unreserved-parking-spaces'],
    relatedGlossaryTerms: [],
    faqs: [
      {
        question: 'Do parking costs escalate during the lease term?',
        answer:
          'Most parking agreements include annual escalations, either as a fixed percentage (3-5%), CPI-linked, or adjusted to market rates. Some leases fix parking costs for the initial term. Tenants should negotiate a cap on annual parking cost increases to prevent unexpected budget overruns.',
      },
      {
        question: 'Are parking costs included in operating expenses?',
        answer:
          'Generally no. Parking costs for tenant-specific spaces are billed directly to the tenant, not included in CAM. However, maintenance of the parking lot itself (lighting, repaving, snow removal) is typically included in building operating expenses and passed through as part of CAM charges.',
      },
    ],
    metaTitle: 'Monthly Parking Cost in Commercial Leases',
    metaDescription:
      'Monthly parking fees can add 10-15% to occupancy costs in urban markets. Learn about per-space rates, escalation provisions, and budget impact.',
  },
  {
    fieldName: 'trailer_parking_spaces',
    slug: 'trailer-parking-spaces',
    displayLabel: 'Trailer Parking',
    category: 'parking-common-areas',
    categoryLabel: 'Parking & Common Areas',
    description: 'The number of oversized spaces dedicated to industrial semi-truck trailers.',
    aliases: [],
    dataType: 'number',
    required: false,
    camRelevant: false,
    whyItMatters:
      'For distribution, logistics, and manufacturing tenants, trailer parking is an operational necessity. Each trailer space accommodates a 53-foot semi-trailer for staging, loading, or overflow storage. Insufficient trailer parking forces tenants to park on public streets (risking citations) or lease off-site yard space at $50-$150/month per space. Documenting the exact allocation prevents disputes about shared yard usage in multi-tenant industrial parks.',
    whereToFindIt:
      'Found in the "Parking" or "Premises" section of industrial leases. May be shown on a site plan exhibit with marked trailer stalls. The allocation may be exclusive (designated stalls) or shared (first-come basis in a yard area).',
    relatedRedFlags: [],
    relatedFields: ['parking-ratio', 'dock-high-doors', 'drive-in-doors'],
    relatedGlossaryTerms: [],
    faqs: [
      {
        question: 'How many trailer spaces does a typical warehouse need?',
        answer:
          'The number depends on the operation. A standard distribution facility needs 1 trailer space per dock door plus 2-3 additional spaces for staging. A 10-door warehouse might need 12-15 trailer spaces. High-volume operations or cross-dock facilities may need significantly more.',
      },
      {
        question: 'Are trailer parking spaces included in the lease area?',
        answer:
          'Trailer parking is usually on the exterior yard and not included in the building RSF. However, the tenant\'s right to use specific yard areas should be explicitly documented in the lease, including whether the spaces are exclusive, shared, or subject to landlord reallocation.',
      },
    ],
    metaTitle: 'Trailer Parking in Commercial Leases',
    metaDescription:
      'Trailer parking spaces are essential for distribution and logistics tenants. Learn how many you need, typical costs, and how to secure allocations.',
  },

  // ━━━ Utilities (6 fields) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    fieldName: 'utilities_payment_method',
    slug: 'utilities-payment-method',
    displayLabel: 'Utilities Payment',
    category: 'utilities',
    categoryLabel: 'Utilities',
    description: 'How utilities are billed to the tenant.',
    aliases: ['Utility Allocation'],
    dataType: 'string',
    required: true,
    camRelevant: false,
    whyItMatters:
      'The utility payment method (direct meter, sub-meter, or pro rata allocation) significantly affects cost fairness. A direct meter gives the tenant control over their own usage and costs. Pro rata allocation forces the tenant to subsidize neighbors with higher usage. A 24/7 data center tenant allocated utilities pro rata alongside 9-to-5 offices could overpay by 40-60%. Understanding the billing method is essential for budgeting and cost control.',
    whereToFindIt:
      'Found in the "Utilities" section or within the operating expense provisions. Look for whether utilities are "directly metered," "sub-metered," or "included in operating expenses." The specific utilities covered (electric, gas, water, telecom) should be itemized.',
    relatedRedFlags: [],
    relatedFields: ['janitorial-responsibility', 'power-capacity', 'lease-structure-type'],
    relatedGlossaryTerms: ['nnn-lease', 'operating-expense-pass-through'],
    faqs: [
      {
        question: 'What are the common utility billing methods in commercial leases?',
        answer:
          'The three main methods are: (1) direct metering (tenant pays utility company directly), (2) sub-metering (landlord meters individual suites and bills tenants for actual usage), and (3) pro rata allocation (utilities included in operating expenses and shared proportionally). Direct metering is most fair; pro rata can subsidize heavy users.',
      },
      {
        question: 'Who pays for utility infrastructure in a commercial lease?',
        answer:
          'The landlord typically provides base utility infrastructure (main service connections, distribution panels, standard capacity). Tenants who need above-standard capacity (extra HVAC, dedicated electrical circuits, generator connections) usually pay for the upgrades and may pay higher utility rates.',
      },
    ],
    metaTitle: 'Utilities Payment in Commercial Leases',
    metaDescription:
      'Utility billing methods affect cost fairness. Learn the difference between direct metering, sub-metering, and pro rata allocation in commercial leases.',
  },
  {
    fieldName: 'janitorial_responsibility',
    slug: 'janitorial-responsibility',
    displayLabel: 'Janitorial Services',
    category: 'utilities',
    categoryLabel: 'Utilities',
    description: 'Identifies whether the landlord or tenant is responsible for cleaning the premises.',
    aliases: [],
    dataType: 'string',
    required: true,
    camRelevant: false,
    whyItMatters:
      'Janitorial responsibility determines both who controls cleaning quality and who bears the cost. Landlord-provided janitorial is typically included in operating expenses and provides standardized service. Tenant-provided janitorial gives more control but adds $0.50-$2.00/RSF annually to occupancy costs. In medical, food service, and laboratory environments, specialized cleaning requirements often necessitate tenant-managed janitorial regardless of the lease default.',
    whereToFindIt:
      'Found in the "Services" or "Landlord Services" section. In office leases, janitorial is typically listed among the landlord-provided services. In industrial and retail leases, it is usually the tenant\'s responsibility and is stated in the maintenance obligations section.',
    relatedRedFlags: [],
    relatedFields: ['utilities-payment-method', 'lease-structure-type', 'cam-exclusions'],
    relatedGlossaryTerms: ['gross-lease', 'nnn-lease'],
    faqs: [
      {
        question: 'Is janitorial typically a landlord or tenant responsibility?',
        answer:
          'In multi-tenant office buildings, the landlord typically provides janitorial service for the premises and common areas, with the cost included in operating expenses. In industrial, retail, and single-tenant properties, janitorial is almost always the tenant\'s responsibility.',
      },
      {
        question: 'What does standard janitorial service include?',
        answer:
          'Standard landlord-provided janitorial typically includes nightly vacuuming, trash removal, restroom cleaning and restocking, and periodic window cleaning. It usually does not include day porter service, carpet shampooing, or specialized cleaning for kitchens, server rooms, or medical facilities.',
      },
    ],
    metaTitle: 'Janitorial Services in Commercial Leases',
    metaDescription:
      'Janitorial responsibility affects both cleaning quality and cost. Learn who typically handles cleaning by property type and what standard service includes.',
  },
  {
    fieldName: 'clear_height_feet',
    slug: 'clear-height-feet',
    displayLabel: 'Clear Height (ft)',
    category: 'utilities',
    categoryLabel: 'Utilities',
    description: 'The usable vertical clearance inside an industrial warehouse facility.',
    aliases: ['Clear Headway', 'Ceiling Height'],
    dataType: 'number',
    required: false,
    camRelevant: false,
    whyItMatters:
      'Clear height determines the maximum racking height and storage density in a warehouse. Each additional foot of clear height can increase storage capacity by 8-12% through taller pallet racks. Modern logistics require 32-40 foot clear heights for efficient operations. A warehouse with only 24 feet of clear height may need 30% more floor area to store the same volume, dramatically increasing rent costs for the tenant.',
    whereToFindIt:
      'Found in the "Premises" or "Building Specifications" section of industrial leases. May be stated as "clear height," "eave height," or "minimum ceiling clearance." Measured from the finished floor to the lowest obstruction (typically bottom of joists or trusses).',
    relatedRedFlags: [],
    relatedFields: ['dock-high-doors', 'drive-in-doors', 'power-capacity'],
    relatedGlossaryTerms: [],
    faqs: [
      {
        question: 'What is a standard clear height for modern warehouses?',
        answer:
          'Modern Class A warehouse construction features 32-40 foot clear heights. Older buildings may have 20-28 feet. For e-commerce fulfillment, 36+ feet is preferred. Cold storage facilities typically need 30-35 feet. Clear heights below 24 feet limit racking options and reduce storage efficiency.',
      },
      {
        question: 'How does clear height affect rent on a per-square-foot basis?',
        answer:
          'Higher clear heights allow more cubic storage in the same footprint, effectively reducing the cost per unit stored. A 36-foot warehouse at $8/RSF can store 50% more inventory than a 24-foot warehouse at $6/RSF, making the taller building cheaper on a per-pallet basis despite the higher rent.',
      },
    ],
    metaTitle: 'Clear Height (ft) in Commercial Leases',
    metaDescription:
      'Clear height determines warehouse storage capacity. Learn standard heights by building class and how vertical space affects total occupancy cost.',
  },
  {
    fieldName: 'dock_high_doors',
    slug: 'dock-high-doors',
    displayLabel: 'Dock-High Doors',
    category: 'utilities',
    categoryLabel: 'Utilities',
    description: 'The number of elevated loading bays designed to align with semi-truck beds.',
    aliases: [],
    dataType: 'number',
    required: false,
    camRelevant: false,
    whyItMatters:
      'Dock-high doors are essential for efficient freight loading and unloading. Each door handles approximately 4-6 truck turns per day depending on cargo type. Insufficient doors create bottlenecks, with trucks queuing for available docks, increasing labor costs and carrier detention charges. A warehouse with 10 dock doors can process 40-60 trucks daily, while one with only 4 doors is limited to 16-24 turns -- a critical constraint for high-volume distribution operations.',
    whereToFindIt:
      'Found in the "Premises" or "Building Specifications" section of industrial leases. Often included in a building data sheet or site plan exhibit. The door dimensions (typically 8\'x10\' or 9\'x10\'), dock levelers, and dock seal specifications may also be noted.',
    relatedRedFlags: [],
    relatedFields: ['drive-in-doors', 'trailer-parking-spaces', 'clear-height-feet'],
    relatedGlossaryTerms: [],
    faqs: [
      {
        question: 'How many dock doors does a warehouse need?',
        answer:
          'A common rule of thumb is one dock-high door per 5,000-10,000 RSF of warehouse space. Cross-dock facilities need more doors (one per 2,500-5,000 RSF). The exact requirement depends on throughput volume, dwell time, and whether the operation runs single or multiple shifts.',
      },
      {
        question: 'What is the difference between dock-high and grade-level doors?',
        answer:
          'Dock-high doors are elevated 48-52 inches to align with standard semi-truck trailer beds, allowing forklifts to drive directly into the trailer. Grade-level doors (drive-in doors) are at ground level, suitable for van deliveries, vehicle access, or loading smaller vehicles.',
      },
    ],
    metaTitle: 'Dock-High Doors in Commercial Leases',
    metaDescription:
      'Dock-high doors determine loading capacity for industrial tenants. Learn how many doors you need and how door count affects warehouse throughput.',
  },
  {
    fieldName: 'drive_in_doors',
    slug: 'drive-in-doors',
    displayLabel: 'Drive-In Doors',
    category: 'utilities',
    categoryLabel: 'Utilities',
    description: 'The number of grade-level doors allowing vehicle entry into the warehouse.',
    aliases: [],
    dataType: 'number',
    required: false,
    camRelevant: false,
    whyItMatters:
      'Drive-in doors at grade level allow vehicles, forklifts, and equipment to enter the building directly without a loading dock. They are essential for operations receiving deliveries by van or box truck, storing vehicles or equipment inside, or running manufacturing operations that require moving large items in and out. Without adequate drive-in access, the tenant faces costly workarounds for any operation that cannot use elevated dock doors.',
    whereToFindIt:
      'Found in the "Premises" or "Building Specifications" section of industrial leases. Drive-in door dimensions are typically 10\'x12\' or 12\'x14\'. Listed alongside dock-high doors in the building data sheet or site plan.',
    relatedRedFlags: [],
    relatedFields: ['dock-high-doors', 'clear-height-feet', 'trailer-parking-spaces'],
    relatedGlossaryTerms: [],
    faqs: [
      {
        question: 'When are drive-in doors more important than dock-high doors?',
        answer:
          'Drive-in doors are more important for operations that receive deliveries primarily by van or box truck (not semi-trailers), need to move large equipment or vehicles into the building, or run manufacturing processes requiring oversized material access. Smaller warehouses and flex/industrial spaces often rely primarily on drive-in doors.',
      },
      {
        question: 'What is a standard drive-in door size?',
        answer:
          'Standard drive-in doors are 10 feet wide by 12 feet tall for most industrial uses. Larger doors (12\'x14\' or 14\'x16\') accommodate larger vehicles and equipment. The door type (roll-up, sectional, or sliding) affects operation speed and insulation quality.',
      },
    ],
    metaTitle: 'Drive-In Doors in Commercial Leases',
    metaDescription:
      'Drive-in doors provide grade-level vehicle access to warehouses. Learn when they are needed, standard sizes, and how they complement dock-high doors.',
  },
  {
    fieldName: 'power_capacity',
    slug: 'power-capacity',
    displayLabel: 'Power Capacity',
    category: 'utilities',
    categoryLabel: 'Utilities',
    description: 'The quantitative electrical capability delivered to the premises.',
    aliases: ['Electrical Load'],
    dataType: 'string',
    required: false,
    camRelevant: false,
    whyItMatters:
      'Insufficient electrical capacity can prevent a tenant from running manufacturing equipment, server rooms, commercial kitchens, or high-density office environments. Upgrading electrical service after lease signing can cost $50,000-$200,000+ depending on the required capacity increase and proximity to the utility transformer. Knowing the delivered power (amps, voltage, phase) before signing avoids costly surprises and ensures the space supports the intended operations.',
    whereToFindIt:
      'Found in the "Building Specifications" or "Utilities" section. May be stated as total amps (e.g., "2,000 amps, 480/277V, 3-phase") or watts per square foot. Some leases reference the electrical panel or transformer capacity in a building data sheet.',
    relatedRedFlags: [],
    relatedFields: ['utilities-payment-method', 'clear-height-feet', 'property-use-type'],
    relatedGlossaryTerms: [],
    faqs: [
      {
        question: 'What electrical capacity does a typical commercial tenant need?',
        answer:
          'Standard office space needs 5-8 watts/RSF. Data centers require 100-250 watts/RSF. Manufacturing facilities vary from 10-50 watts/RSF depending on equipment. Restaurant and food service spaces need 20-40 watts/RSF for commercial kitchen equipment. Always calculate requirements before signing.',
      },
      {
        question: 'Who pays for electrical upgrades in a commercial lease?',
        answer:
          'If the tenant needs above-standard electrical capacity, the tenant typically pays for the upgrade. The lease should specify whether the landlord or tenant arranges the work, who owns the equipment post-installation, and whether the upgrade must be removed at lease expiration.',
      },
    ],
    metaTitle: 'Power Capacity in Commercial Leases',
    metaDescription:
      'Electrical power capacity determines if a space can support your operations. Learn standard requirements by use type and the cost of upgrades.',
  },

  // ━━━ Signage & Permitted Use (5 fields) ━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    fieldName: 'permitted_use_description',
    slug: 'permitted-use-description',
    displayLabel: 'Permitted Use',
    category: 'signage-permitted-use',
    categoryLabel: 'Signage & Permitted Use',
    description: 'The specific, legally allowed business activities the tenant can conduct.',
    aliases: ['Authorized Use', 'Use Clause'],
    dataType: 'string',
    required: true,
    camRelevant: false,
    whyItMatters:
      'A narrowly drafted permitted use clause can prevent the tenant from evolving their business model, adding product lines, or pivoting operations without landlord consent. "General office use" is broad; "accounting firm office use only" is restrictive. If the tenant wants to sublease, the permitted use clause constrains the pool of eligible subtenants. For retail tenants, the use clause also interacts with exclusive use provisions in other tenants\' leases.',
    whereToFindIt:
      'Found in the "Use" or "Permitted Use" section, typically within the first 10 pages. The clause defines what the tenant can do and often cross-references the prohibited uses list. Zoning compliance is usually referenced in the same section.',
    relatedRedFlags: [],
    relatedFields: ['prohibited-uses', 'exclusive-use-rights', 'property-use-type'],
    relatedGlossaryTerms: [],
    faqs: [
      {
        question: 'Should tenants negotiate broad or narrow permitted use clauses?',
        answer:
          'Tenants should always negotiate the broadest permitted use language possible, such as "any lawful commercial purpose" or "general retail and related uses." Broad language preserves flexibility for business evolution and makes the space easier to sublease if needed.',
      },
      {
        question: 'Can the landlord restrict the tenant\'s use beyond the lease?',
        answer:
          'Yes. The tenant must comply with the lease\'s permitted use, local zoning laws, CC&Rs (covenants, conditions, and restrictions) for the property, and any exclusive use clauses granted to other tenants. All four constraints should be reviewed before signing.',
      },
    ],
    metaTitle: 'Permitted Use in Commercial Leases',
    metaDescription:
      'The permitted use clause defines what business activities are allowed. Learn why broad language is essential for flexibility and subleasing.',
  },
  {
    fieldName: 'prohibited_uses',
    slug: 'prohibited-uses',
    displayLabel: 'Prohibited Uses',
    category: 'signage-permitted-use',
    categoryLabel: 'Signage & Permitted Use',
    description: 'Specific activities explicitly banned within the leased premises.',
    aliases: [],
    dataType: 'array',
    required: false,
    camRelevant: false,
    whyItMatters:
      'Prohibited use lists can inadvertently restrict legitimate business activities. A prohibition on "food preparation" could prevent an office tenant from operating a break room kitchen. "No storage of hazardous materials" could affect a medical or dental tenant who uses standard cleaning chemicals. Understanding what is prohibited ensures the tenant\'s operations comply from day one and avoids default situations that could trigger lease termination.',
    whereToFindIt:
      'Found in the "Use" or "Prohibited Uses" section, often as a bulleted or numbered list following the permitted use description. Some prohibitions appear in the building rules and regulations exhibit rather than the lease body.',
    relatedRedFlags: [],
    relatedFields: ['permitted-use-description', 'exclusive-use-rights', 'property-use-type'],
    relatedGlossaryTerms: [],
    faqs: [
      {
        question: 'What are common prohibited uses in commercial leases?',
        answer:
          'Common prohibitions include: adult entertainment, hazardous material storage, heavy manufacturing, medical waste generation, live animal handling, gambling operations, firearms sales, and any use that generates excessive noise, odor, or vibration. Shopping center leases often include longer lists protecting other tenants\' exclusives.',
      },
      {
        question: 'Can a prohibited use clause be modified after signing?',
        answer:
          'Only through a formal lease amendment signed by both parties. If the tenant discovers a prohibition that conflicts with planned operations, they should negotiate the modification before signing the original lease. Post-signing amendments require landlord cooperation, which is not guaranteed.',
      },
    ],
    metaTitle: 'Prohibited Uses in Commercial Leases',
    metaDescription:
      'Prohibited use lists restrict specific activities in leased space. Learn common prohibitions and how to avoid conflicts with your operations.',
  },
  {
    fieldName: 'fascia_signage_rights',
    slug: 'fascia-signage-rights',
    displayLabel: 'Fascia Signage',
    category: 'signage-permitted-use',
    categoryLabel: 'Signage & Permitted Use',
    description: 'The right to affix branding directly onto the exterior wall of the building.',
    aliases: [],
    dataType: 'boolean',
    required: false,
    camRelevant: false,
    whyItMatters:
      'Fascia signage on the building exterior is critical for brand visibility and customer wayfinding, especially in retail and restaurant settings. Without contractual signage rights, the landlord can deny or restrict exterior signage, effectively making the tenant invisible to drive-by traffic. The lease should specify sign dimensions, placement, illumination, and who bears the installation and maintenance costs.',
    whereToFindIt:
      'Found in the "Signage" section or a signage rider/exhibit. May include specifications for permitted sign types, dimensions, colors, illumination, and placement locations. Municipal sign code compliance is typically referenced.',
    relatedRedFlags: [],
    relatedFields: ['monument-signage-rights', 'signage-maintenance', 'permitted-use-description'],
    relatedGlossaryTerms: [],
    faqs: [
      {
        question: 'What is fascia signage?',
        answer:
          'Fascia signage refers to signs mounted directly on the exterior wall or storefront of the building, typically above the entrance. It includes channel letters, flat panel signs, awning signs, and projecting blade signs. For retail tenants, fascia signage is the primary method of exterior brand identification.',
      },
      {
        question: 'Who pays for fascia sign installation and removal?',
        answer:
          'The tenant typically pays for fabrication, installation, permitting, and eventual removal. The lease should specify whether the landlord must restore the building surface after sign removal or if the tenant bears that cost. Installation usually requires landlord approval of design and placement.',
      },
    ],
    metaTitle: 'Fascia Signage in Commercial Leases',
    metaDescription:
      'Fascia signage rights control exterior building branding. Learn what to negotiate for visibility, permitted specifications, and installation costs.',
  },
  {
    fieldName: 'monument_signage_rights',
    slug: 'monument-signage-rights',
    displayLabel: 'Monument Signage',
    category: 'signage-permitted-use',
    categoryLabel: 'Signage & Permitted Use',
    description: 'The right to place the tenant\'s name on a shared roadside structure.',
    aliases: [],
    dataType: 'boolean',
    required: false,
    camRelevant: false,
    whyItMatters:
      'Monument signs at the property entrance provide visibility from the road, which is critical for tenants who depend on drive-by traffic. In multi-tenant properties, monument sign position (top panel vs. bottom panel) affects visibility and perceived prestige. Top monument sign rights are often reserved for the largest tenant and have significant brand value. For a restaurant or retail business, monument signage can directly impact revenue.',
    whereToFindIt:
      'Found in the "Signage" section or a signage exhibit. Look for the tenant\'s position on the monument (panel number or location), sign dimensions, and whether the landlord or tenant pays for the panel and lighting.',
    relatedRedFlags: [],
    relatedFields: ['fascia-signage-rights', 'signage-maintenance', 'permitted-use-description'],
    relatedGlossaryTerms: [],
    faqs: [
      {
        question: 'What is a monument sign?',
        answer:
          'A monument sign is a freestanding sign structure at the property entrance, typically at roadside level. It lists the names of building tenants and is visible to passing vehicle traffic. Position on the monument (top, middle, or bottom) affects visibility. Multi-tenant monuments may list 4-8 tenants.',
      },
      {
        question: 'Can monument sign rights be transferred in a sublease?',
        answer:
          'This depends on the lease language. Some leases tie signage rights to the named tenant and prohibit transfer. Others allow the subtenant to display their name with landlord consent. If subleasing is possible, the assignability of signage rights should be confirmed during abstraction.',
      },
    ],
    metaTitle: 'Monument Signage in Commercial Leases',
    metaDescription:
      'Monument signage provides roadside brand visibility for tenants. Learn about positioning, cost responsibilities, and how it impacts retail revenue.',
  },
  {
    fieldName: 'signage_maintenance',
    slug: 'signage-maintenance',
    displayLabel: 'Signage Maintenance',
    category: 'signage-permitted-use',
    categoryLabel: 'Signage & Permitted Use',
    description: 'Determines if the landlord or tenant is financially responsible for sign upkeep.',
    aliases: [],
    dataType: 'string',
    required: false,
    camRelevant: false,
    whyItMatters:
      'Sign maintenance includes cleaning, bulb/LED replacement, electrical repairs, and structural upkeep. A large illuminated monument sign can cost $500-$1,500 per year in maintenance. If the lease assigns maintenance to the tenant but the tenant neglects it, the landlord may perform the work and charge back the cost at premium rates. Clear assignment of maintenance responsibility prevents disputes and ensures consistent brand presentation.',
    whereToFindIt:
      'Found in the "Signage" section or rules and regulations exhibit. May specify that the landlord maintains monument signs (with costs passed through as CAM) while the tenant maintains their own fascia signage. Look for repair timelines and consequences for neglected maintenance.',
    relatedRedFlags: [],
    relatedFields: ['fascia-signage-rights', 'monument-signage-rights', 'cam-exclusions'],
    relatedGlossaryTerms: [],
    faqs: [
      {
        question: 'Who typically maintains monument signs?',
        answer:
          'The landlord usually maintains the overall monument structure, with costs included in CAM charges. Individual tenant panels may be the tenant\'s responsibility. Fascia signage on the building exterior is almost always the tenant\'s maintenance responsibility.',
      },
      {
        question: 'What happens if a sign falls into disrepair?',
        answer:
          'Most leases allow the landlord to perform maintenance after written notice and a cure period (typically 15-30 days). If the tenant fails to act, the landlord can repair the sign and charge the cost to the tenant, often at a markup. Persistent neglect may constitute a lease default.',
      },
    ],
    metaTitle: 'Signage Maintenance in Commercial Leases',
    metaDescription:
      'Signage maintenance determines who pays for sign upkeep. Learn typical responsibilities, annual costs, and consequences of neglected maintenance.',
  },

  // ━━━ Miscellaneous (6 fields) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    fieldName: 'security_deposit_amount',
    slug: 'security-deposit-amount',
    displayLabel: 'Security Deposit',
    category: 'miscellaneous',
    categoryLabel: 'Miscellaneous',
    description: 'The total collateral held by the landlord to ensure lease performance.',
    aliases: [],
    dataType: 'currency',
    required: true,
    camRelevant: false,
    whyItMatters:
      'The security deposit is a significant upfront cash outlay that ties up working capital for the entire lease term. A deposit equal to 3 months of a $25,000/month rent obligation requires $75,000 in locked-up funds. Some leases allow the deposit to decrease over time ("burn down") as the tenant establishes a payment track record. Understanding the deposit amount, form (cash vs. letter of credit), and return conditions is critical for cash flow planning.',
    whereToFindIt:
      'Found in the "Security Deposit" section, typically within the first 10-15 pages. The amount, form, conditions for application by the landlord, interest accrual, and return timeline are usually addressed in the same section.',
    relatedRedFlags: [],
    relatedFields: ['security-deposit-type', 'base-rent-annual', 'has-guaranty'],
    relatedGlossaryTerms: ['base-rent'],
    faqs: [
      {
        question: 'What is a typical security deposit amount?',
        answer:
          'Security deposits commonly range from 1 to 6 months of base rent. Strong-credit tenants may negotiate 1-2 months. Startups or lower-credit tenants may be asked for 3-6 months. Some landlords calculate the deposit as a percentage of total annual rent including estimated operating expenses.',
      },
      {
        question: 'Does the security deposit earn interest?',
        answer:
          'This varies by state law and lease terms. Some states (like Illinois and Massachusetts) require landlords to hold deposits in interest-bearing accounts and pay interest to the tenant. Other states have no such requirement. The lease should specify whether interest accrues and how it is paid.',
      },
    ],
    metaTitle: 'Security Deposit in Commercial Leases',
    metaDescription:
      'Security deposits tie up working capital for the entire lease term. Learn typical amounts, burn-down provisions, and interest requirements.',
  },
  {
    fieldName: 'security_deposit_type',
    slug: 'security-deposit-type',
    displayLabel: 'Deposit Type',
    category: 'miscellaneous',
    categoryLabel: 'Miscellaneous',
    description: 'The form of the collateral provided.',
    aliases: ['Collateral Form'],
    dataType: 'string',
    required: true,
    camRelevant: false,
    whyItMatters:
      'The deposit type (cash, letter of credit, or surety bond) affects the tenant\'s liquidity and cost of capital. A cash deposit earns minimal interest while tying up working capital. A standby letter of credit from a bank costs 1-3% annually but preserves cash. A $100,000 security deposit held as cash for 10 years has an opportunity cost of $30,000-$70,000 depending on the tenant\'s cost of capital. The form also affects ease of recovery at lease end.',
    whereToFindIt:
      'In the "Security Deposit" section. Look for whether the landlord accepts alternatives to cash, such as letters of credit from approved banks, surety bonds, or corporate guarantees in lieu of deposit.',
    relatedRedFlags: [],
    relatedFields: ['security-deposit-amount', 'has-guaranty', 'governing-law-state'],
    relatedGlossaryTerms: [],
    faqs: [
      {
        question: 'What is the difference between a cash deposit and a letter of credit?',
        answer:
          'A cash deposit transfers actual funds to the landlord, tying up the tenant\'s working capital. A letter of credit (LOC) is a bank guarantee that the landlord can draw on if the tenant defaults, but the tenant retains use of the underlying funds. LOCs cost 1-3% annually in bank fees but preserve liquidity.',
      },
      {
        question: 'Can a tenant switch from cash to a letter of credit mid-term?',
        answer:
          'Only if the lease permits it. Some leases allow the tenant to substitute a letter of credit for cash after a specified period of timely payment. This should be negotiated at lease signing. Converting mid-term without lease authorization requires landlord consent.',
      },
    ],
    metaTitle: 'Deposit Type in Commercial Leases',
    metaDescription:
      'Security deposit type (cash, LOC, surety bond) affects liquidity and cost of capital. Learn the differences and how to preserve working capital.',
  },
  {
    fieldName: 'has_guaranty',
    slug: 'has-guaranty',
    displayLabel: 'Has Guaranty',
    category: 'miscellaneous',
    categoryLabel: 'Miscellaneous',
    description: 'Indicates if an external party has guaranteed the lease obligations.',
    aliases: [],
    dataType: 'boolean',
    required: true,
    camRelevant: false,
    whyItMatters:
      'A guaranty provides the landlord with a secondary source of recovery beyond the tenant entity. For the guarantor, it represents potentially unlimited personal financial exposure. Missing this field during abstraction means the guarantor may not be aware of their ongoing liability, and the landlord may not properly track the guarantor for collection purposes. Guaranty provisions often survive lease assignments, creating long-tail liability.',
    whereToFindIt:
      'The lease typically references the guaranty in the preamble or definitions section. The actual guaranty agreement is usually a separate exhibit or addendum attached to the lease. Look for "Guaranty of Lease" or "Personal Guaranty" exhibits.',
    relatedRedFlags: [],
    relatedFields: ['guarantor-name', 'tenant-legal-name', 'security-deposit-amount'],
    relatedGlossaryTerms: ['personal-guarantee'],
    faqs: [
      {
        question: 'When is a guaranty typically required?',
        answer:
          'Landlords require guaranties when the tenant entity lacks sufficient credit history, net worth, or operating track record. Common scenarios include: new LLCs formed for the lease, startup businesses, franchisees, and tenants with limited financial statements. Established companies with strong balance sheets can often avoid personal guaranties.',
      },
      {
        question: 'What is a "good guy" guaranty?',
        answer:
          'A good guy guaranty limits the guarantor\'s personal liability to rent owed through the date the tenant vacates and surrenders the premises in good condition. It incentivizes the tenant to leave cleanly rather than abandon the space. Common in New York and gaining popularity in other markets.',
      },
    ],
    metaTitle: 'Has Guaranty in Commercial Leases',
    metaDescription:
      'A lease guaranty creates personal financial exposure for the guarantor. Learn when guaranties are required and how to limit liability.',
  },
  {
    fieldName: 'governing_law_state',
    slug: 'governing-law-state',
    displayLabel: 'Governing Law',
    category: 'miscellaneous',
    categoryLabel: 'Miscellaneous',
    description: 'The legal jurisdiction whose laws dictate the interpretation of the contract.',
    aliases: [],
    dataType: 'string',
    required: true,
    camRelevant: false,
    whyItMatters:
      'The governing law state determines which legal standards apply to dispute resolution, tenant protections, and lease interpretation. State laws vary significantly on issues like security deposit interest, commercial tenant eviction timelines, and enforceability of acceleration clauses. A lease on property in Texas governed by Delaware law could deprive the tenant of Texas-specific protections. Understanding the governing jurisdiction is essential for legal compliance and risk assessment.',
    whereToFindIt:
      'Found in the "Miscellaneous" or "General Provisions" section near the end of the lease. The clause typically states: "This Lease shall be governed by and construed in accordance with the laws of the State of [X]." May also specify the venue for litigation.',
    relatedRedFlags: [],
    relatedFields: ['estoppel-turnaround-days', 'snda-requirement', 'premises-address'],
    relatedGlossaryTerms: [],
    faqs: [
      {
        question: 'Does the governing law always match the property location?',
        answer:
          'Not always, though it usually does. A national landlord may specify the state where their headquarters is located. Tenants should push for the governing law to match the property location, as local laws are most relevant to the landlord-tenant relationship and local courts are most convenient.',
      },
      {
        question: 'Why does governing law matter for commercial leases?',
        answer:
          'State laws differ on critical issues: some states require security deposit interest payments, others do not. Eviction procedures vary from 2 weeks to 6 months. Some states enforce cumulative remedy provisions while others require election of remedies. The governing law determines which protections and obligations apply.',
      },
    ],
    metaTitle: 'Governing Law in Commercial Leases',
    metaDescription:
      'Governing law determines which state\'s legal standards apply to your lease. Learn why jurisdiction matters for tenant protections and dispute resolution.',
  },
  {
    fieldName: 'snda_requirement',
    slug: 'snda-requirement',
    displayLabel: 'SNDA Requirement',
    category: 'miscellaneous',
    categoryLabel: 'Miscellaneous',
    description: 'Duty to sign a Subordination, Non-Disturbance, and Attornment agreement.',
    aliases: [],
    dataType: 'boolean',
    required: false,
    camRelevant: false,
    whyItMatters:
      'An SNDA protects the tenant if the landlord defaults on their mortgage. Without a non-disturbance agreement, the lender can terminate the lease upon foreclosure, evicting a rent-paying tenant. The subordination component also affects the tenant\'s priority in bankruptcy proceedings. For tenants with significant build-out investments or long-term leases, an SNDA is essential insurance against landlord financial distress.',
    whereToFindIt:
      'Found in the "Subordination" or "SNDA" section, typically in the miscellaneous provisions near the end of the lease. The lease usually requires the tenant to execute an SNDA upon request, and the landlord should be required to obtain the lender\'s agreement.',
    relatedRedFlags: [],
    relatedFields: ['estoppel-turnaround-days', 'governing-law-state', 'security-deposit-amount'],
    relatedGlossaryTerms: ['snda', 'estoppel-certificate'],
    faqs: [
      {
        question: 'What does SNDA stand for?',
        answer:
          'SNDA stands for Subordination, Non-Disturbance, and Attornment. Subordination means the lease is junior to the mortgage. Non-disturbance means the lender will honor the lease even after foreclosure. Attornment means the tenant agrees to recognize the new owner. The non-disturbance provision is the most important part for tenants.',
      },
      {
        question: 'Should tenants always require an SNDA?',
        answer:
          'Yes, especially for long-term leases or leases with significant TI investment. Without an SNDA, the lender can terminate the lease upon foreclosure. The lease should require the landlord to obtain the lender\'s execution of an SNDA within a specified period (e.g., 60 days of lease execution).',
      },
    ],
    metaTitle: 'SNDA Requirement in Commercial Leases',
    metaDescription:
      'An SNDA protects tenants from eviction if the landlord is foreclosed on. Learn what each component means and why tenants should always require one.',
  },
  {
    fieldName: 'estoppel_turnaround_days',
    slug: 'estoppel-turnaround-days',
    displayLabel: 'Estoppel Turnaround',
    category: 'miscellaneous',
    categoryLabel: 'Miscellaneous',
    description: 'The number of days the tenant has to return a signed estoppel certificate.',
    aliases: [],
    dataType: 'number',
    required: false,
    camRelevant: false,
    whyItMatters:
      'Estoppel turnaround days define how quickly the tenant must respond to the landlord\'s request for a signed estoppel certificate. Short deadlines (5-10 days) can create compliance pressure during busy periods, especially when the estoppel requires verifying rent amounts, security deposits, and default status. Failure to respond within the deadline may be treated as a material default, and some leases include a "deemed" provision where silence equals acceptance of the landlord\'s stated terms.',
    whereToFindIt:
      'Found in the "Estoppel" section, typically in the miscellaneous provisions. The clause specifies the turnaround period, the consequences of non-response, and whether the landlord can execute the certificate on the tenant\'s behalf if the tenant fails to respond.',
    relatedRedFlags: [],
    relatedFields: ['snda-requirement', 'governing-law-state', 'security-deposit-amount'],
    relatedGlossaryTerms: ['estoppel-certificate'],
    faqs: [
      {
        question: 'What is a typical estoppel turnaround period?',
        answer:
          'Most leases require 10 to 15 business days for estoppel responses. Some landlord-favorable leases push for 5-7 days. Tenants should negotiate at least 10 business days and resist any "deemed acceptance" provisions that treat silence as agreement with the landlord\'s stated terms.',
      },
      {
        question: 'What happens if the tenant does not return the estoppel on time?',
        answer:
          'Consequences vary: some leases treat non-response as a default, others include a "deemed estoppel" provision where the landlord\'s stated terms are accepted as true. The most aggressive leases grant the landlord power of attorney to sign the estoppel on the tenant\'s behalf. Tenants should negotiate for a reminder notice and additional cure period.',
      },
      {
        question: 'Why do landlords need estoppel certificates?',
        answer:
          'Estoppel certificates are required during property sales, mortgage refinancing, and loan applications. They provide binding confirmation to buyers and lenders that the lease terms are accurately represented and no disputes exist. A property sale can be delayed or derailed by a tenant\'s failure to deliver estoppels.',
      },
    ],
    metaTitle: 'Estoppel Turnaround in Commercial Leases',
    metaDescription:
      'Estoppel turnaround days set the deadline for signing lease confirmation documents. Learn typical periods, consequences of delay, and deemed acceptance risks.',
  },
]

// ─── Derived Constants ──────────────────────────────────────────────

const ALL_FIELDS = [...FIELDS]
export const INDEXABLE_FIELDS = filterRetainedSeoItems('fields', ALL_FIELDS)

export const FIELD_COUNT = INDEXABLE_FIELDS.length

// ─── Lookup Functions ───────────────────────────────────────────────

export function getFieldBySlug(slug: string): FieldData | undefined {
  return ALL_FIELDS.find((f) => f.slug === slug)
}

export function getAllFieldSlugs(): string[] {
  return ALL_FIELDS.map((f) => f.slug)
}

export function getIndexableFieldBySlug(slug: string): FieldData | undefined {
  return INDEXABLE_FIELDS.find((f) => f.slug === slug)
}

export function getAllIndexableFieldSlugs(): string[] {
  return INDEXABLE_FIELDS.map((f) => f.slug)
}

export function getFieldsByCategory(category: FieldCategory): FieldData[] {
  return INDEXABLE_FIELDS.filter((f) => f.category === category)
}

export function getFieldCategories(): { category: FieldCategory; label: string; count: number }[] {
  const categories: FieldCategory[] = [
    'parties-property',
    'key-dates-term',
    'rent-escalations',
    'cam-operating-expenses',
    'options',
    'tenant-improvements',
    'insurance-indemnity',
    'assignment-subletting',
    'default-remedies',
    'exclusivity-cotenancy',
    'parking-common-areas',
    'utilities',
    'signage-permitted-use',
    'miscellaneous',
  ]
  return categories.map((cat) => ({
    category: cat,
    label: FIELD_CATEGORY_LABELS[cat],
    count: INDEXABLE_FIELDS.filter((f) => f.category === cat).length,
  }))
}

export function getFieldSeoRedirect(slug: string): string | null {
  if (isRetainedSeoSlug('fields', slug)) return null
  if (!ALL_FIELDS.some((field) => field.slug === slug)) return null
  return getExplicitSeoRedirect('fields', slug) ?? '/fields'
}
