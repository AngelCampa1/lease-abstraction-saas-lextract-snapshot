// ─── Template Types ──────────────────────────────────────────────────

export interface LeaseTemplate {
  name: string
  slug: string
  category: 'abstraction' | 'due-diligence' | 'cam' | 'compliance' | 'administration'
  description: string
  useCase: string
  keyItems: string[]
  relatedFields: string[]
  downloadableFormat: string
  fileFormat: 'PDF' | 'XLSX'
  status: 'live' | 'coming-soon'
  faqs: Array<{ question: string; answer: string }>
  metaTitle: string
  metaDescription: string
  relatedTemplates?: string[]
}

// ─── Template Data ───────────────────────────────────────────────────

export const TEMPLATES: LeaseTemplate[] = [
  {
    name: 'Lease Abstraction Checklist',
    slug: 'lease-abstraction-checklist',
    category: 'abstraction',
    description:
      'A comprehensive checklist covering all 126 data fields required for a complete commercial lease abstract. This checklist ensures no critical clause is overlooked during the abstraction process, from parties and premises to options and red flags. Use it as a quality-control framework when reviewing AI-extracted data or performing manual abstraction.',
    useCase:
      'Used by lease administrators, paralegals, and asset managers when abstracting a commercial lease for the first time or auditing an existing abstract for completeness and accuracy.',
    keyItems: [
      'Verify landlord and tenant legal entity names match the executed signature block',
      'Confirm premises address, floor, and suite number against the lease exhibit',
      'Extract commencement date and verify it matches the occupancy certificate or possession date',
      'Record lease expiration date and all renewal/extension option dates',
      'Capture base rent for each lease year and confirm any escalation schedule',
      'Document CAM estimate, reconciliation frequency, and any cap provisions',
      'Identify all tenant options: renewal, expansion, right of first offer, and termination',
      'Note security deposit amount, form (cash vs. letter of credit), and burn-down schedule',
      'Record tenant improvement allowance and required completion date',
      'Extract permitted use clause verbatim - confirm no restrictions affect current operations',
      'Identify all landlord and tenant insurance requirements and required endorsements',
      'Note assignment and subletting rights, consent requirements, and any recapture provisions',
      'Capture holdover provisions including rent multiple and notice period',
      'Identify cure periods for monetary and non-monetary defaults',
      'Flag any exclusive use provisions that benefit or restrict the tenant',
    ],
    relatedFields: [
      'landlord-legal-name',
      'tenant-legal-name',
      'commencement-date',
      'expiration-date',
      'base-rent',
      'cam-estimate',
      'security-deposit',
      'ti-allowance',
      'permitted-use',
    ],
    downloadableFormat: 'PDF',
    fileFormat: 'PDF',
    status: 'live',
    faqs: [
      {
        question: 'How long does a complete lease abstraction typically take manually?',
        answer:
          'A manual lease abstraction for a standard 30-50 page commercial lease typically takes 4-8 hours for an experienced paralegal or lease administrator. Lextract reduces this to typically 5-15 minutes depending on document length and complexity, with human review of flagged fields taking 15-30 minutes.',
      },
      {
        question: 'Which fields are most commonly missed in manual abstractions?',
        answer:
          'The most frequently missed fields are buried in exhibits and riders rather than the main lease body: CAM exclusion lists, audit rights windows, holdover rent multiples, co-tenancy trigger conditions, and exclusive use carve-outs. Lextract checks all 126 fields including exhibit content.',
      },
      {
        question: 'Should I abstract the lease myself or hire an abstraction service?',
        answer:
          'For portfolios with more than 20 leases, a technology-assisted approach (like Lextract) is typically more cost-effective and consistent than manual or outsourced abstraction. Individual leases or small portfolios can be handled manually using this checklist as a guide.',
      },
      {
        question: 'How do I handle lease amendments and riders?',
        answer:
          'Each amendment should be abstracted separately, noting which provisions of the original lease are modified. The abstract should reflect the as-amended position for all modified fields. Lextract processes the full lease package including amendments when uploaded together as a single PDF.',
      },
    ],
    metaTitle: 'Lease Abstraction Checklist - 15 Critical Fields',
    metaDescription:
      'Free commercial lease abstraction checklist covering all 126 data fields. Download the PDF/Excel template and ensure complete, accurate lease abstracts every time.',
  },
  {
    name: 'Due Diligence Checklist',
    slug: 'due-diligence-checklist',
    category: 'due-diligence',
    description:
      'A structured due diligence checklist for commercial real estate acquisitions, focusing on lease review, rent roll verification, and risk identification. This checklist covers everything an acquirer needs to verify during the lease review phase of a property acquisition or portfolio purchase. It pairs with rent roll analysis to surface economic exposure before closing.',
    useCase:
      'Used by acquisition teams, real estate attorneys, and investors during the due diligence period following a letter of intent on a commercial property or portfolio acquisition.',
    keyItems: [
      'Confirm rent roll accuracy - verify all tenants, spaces, and rent amounts against executed leases',
      'Identify all leases expiring within 24 months of closing and assess rollover risk',
      'Review all outstanding tenant improvement allowances and landlord obligations',
      'Verify all security deposits are on hand and confirm form (cash, LC, or bond)',
      'Identify any below-market leases that may affect appraised value',
      'Review all renewal options and assess likelihood of exercise based on market rents',
      'Check for any ROFR or ROFO provisions that could affect title transfer',
      'Identify co-tenancy clauses and assess whether current anchor tenants satisfy triggers',
      'Review all exclusive use clauses for conflicts with planned future tenants',
      'Verify all CAM reconciliations have been completed through the current period',
      'Confirm no outstanding landlord default notices or tenant litigation',
      'Review all assignment consents - verify all transfers were properly documented',
      'Identify any subordination, non-disturbance, and attornment (SNDA) agreement gaps',
      'Confirm all lease amendments, extensions, and modifications are accounted for in the rent roll',
    ],
    relatedFields: [
      'expiration-date',
      'renewal-options',
      'security-deposit',
      'ti-allowance',
      'cam-reconciliation',
      'rofr',
      'co-tenancy-clause',
      'exclusive-use',
    ],
    downloadableFormat: 'PDF',
    fileFormat: 'PDF',
    status: 'live',
    faqs: [
      {
        question: 'How many leases should I review during due diligence?',
        answer:
          'All leases should be reviewed. For large portfolios, a tiered approach is common: full abstraction for anchor and major tenants (typically leases representing 80% of revenue), and a summary review for smaller tenants. Lextract makes it cost-effective to abstract all leases regardless of portfolio size.',
      },
      {
        question: 'What is the most common due diligence oversight in lease review?',
        answer:
          'The most common oversight is failing to identify all outstanding landlord obligations - particularly unfunded TI allowances, deferred maintenance commitments written into lease side letters, and unexercised expansion options that the seller neglected to disclose. These represent real capital calls post-closing.',
      },
      {
        question: 'How does co-tenancy risk affect acquisition pricing?',
        answer:
          'Co-tenancy clauses allow tenants to pay reduced rent or terminate their lease if an anchor tenant vacates. An acquisition with a single anchor tenant with multiple co-tenancy-linked leases carries concentrated risk. Buyers typically apply a discount to the purchase price reflecting the probability-weighted impact of co-tenancy triggers.',
      },
    ],
    metaTitle: 'Commercial Real Estate Due Diligence Checklist',
    metaDescription:
      'Due diligence lease review checklist for CRE acquisitions. Verify rent rolls, TI obligations, options, co-tenancy risk, and all critical lease terms before closing.',
  },
  {
    name: 'CAM Reconciliation Checklist',
    slug: 'cam-reconciliation-checklist',
    category: 'cam',
    description:
      'A step-by-step CAM reconciliation checklist for reviewing landlord annual expense statements and verifying charges against lease terms. This checklist walks through the full reconciliation process from obtaining the statement to issuing payment or dispute notices. It covers expense inclusion/exclusion verification, cap calculations, and audit rights.',
    useCase:
      'Used by property managers, tenant representatives, and lease accountants during the annual CAM reconciliation process, typically between January and April of each year for the prior calendar year.',
    keyItems: [
      'Obtain year-end CAM statement from landlord within the lease-required delivery period',
      'Verify total building operating expenses against prior-year actuals and budget',
      'Confirm tenant\'s pro-rata share percentage matches the lease and current rentable area',
      'Identify all line items and verify each expense is permitted under the lease\'s inclusion list',
      'Check all excluded expenses against the lease exclusion list (management fees above cap, capital items, etc.)',
      'Recalculate management fee and verify it does not exceed the contractual cap percentage',
      'Apply any cumulative or non-cumulative CAM cap to limit year-over-year increase',
      'Verify gross-up calculation if building occupancy was below the lease threshold',
      'Confirm base year expenses used in the gross-up match the executed base year calculation',
      'Request supporting documentation for any line item exceeding 10% of total CAM',
      'Calculate reconciliation amount (actual vs. estimated) and compare to monthly estimates paid',
      'Verify audit rights window has not expired if disputing any line items',
      'Issue dispute notice within the contractual dispute period if any charges are improper',
      'Document reconciliation results in lease administration system for future budgeting',
    ],
    relatedFields: [
      'cam-estimate',
      'cam-cap',
      'cam-exclusions',
      'management-fee-cap',
      'gross-up-provision',
      'base-year',
      'pro-rata-share',
      'audit-rights',
      'reconciliation-frequency',
    ],
    downloadableFormat: 'PDF',
    fileFormat: 'PDF',
    status: 'live',
    faqs: [
      {
        question: 'What is the typical deadline for disputing a CAM reconciliation?',
        answer:
          'Most leases require tenants to dispute CAM statements within 60-180 days of receipt. After this window closes, the statement is typically deemed accepted even if charges are improper. Always identify and extract the audit rights and dispute period from your lease abstract before the reconciliation statement arrives.',
      },
      {
        question: 'Which CAM expenses are most commonly disputed?',
        answer:
          'The most commonly disputed items are management fees (charged above the contractual cap), capital expenditures included as operating expenses, expenses for areas outside the tenant\'s defined CAM pool, and above-market contractor charges for affiliated vendors. Having the exclusion list clearly extracted in your lease abstract is essential for effective disputes.',
      },
      {
        question: 'What is a CAM cap and how do I calculate it?',
        answer:
          'A CAM cap limits the annual increase in controllable operating expenses. A non-cumulative 5% cap means each year\'s controllable CAM cannot exceed the prior year\'s controllable CAM by more than 5%. A cumulative cap means unused capacity from prior years accumulates - giving the landlord more upside in later years. Non-cumulative caps are significantly more favorable to tenants.',
      },
      {
        question: 'What expenses are typically excluded from CAM?',
        answer:
          'Well-negotiated leases exclude: capital expenditures, leasing commissions, depreciation, financing costs, management fees above a specified percentage, expenses for vacant space, above-market wages for on-site employees, and costs for other tenants\' build-outs. The specific exclusion list is extracted and stored in the cam-exclusions field.',
      },
    ],
    metaTitle: 'CAM Reconciliation Checklist for Commercial Leases',
    metaDescription:
      'Step-by-step CAM reconciliation checklist for verifying landlord expense statements. Check inclusions, exclusions, caps, and gross-up calculations against your lease terms.',
  },
  {
    name: 'Lease Renewal Checklist',
    slug: 'lease-renewal-checklist',
    category: 'administration',
    description:
      'A comprehensive checklist for managing the commercial lease renewal process from initial notice through executed amendment. This checklist ensures tenants exercise renewal options within required timeframes, negotiate favorable terms, and document the renewed lease properly. It covers option notice deadlines, market rent determination, and amendment execution.',
    useCase:
      'Used by tenant representatives, corporate real estate teams, and lease administrators beginning 18-24 months before a lease expiration to plan and execute a successful renewal.',
    keyItems: [
      'Identify renewal option notice deadline from the lease abstract (typically 6-18 months before expiration)',
      'Confirm renewal option conditions - verify tenant is not in default and occupying premises',
      'Set calendar reminders for notice deadline with 60-day and 30-day advance alerts',
      'Review current market rents for comparable space to establish negotiating benchmark',
      'Determine if renewal rent is fixed, escalating, or at "fair market value"',
      'If fair market rent applies, review the fair market determination process in the lease',
      'Serve renewal option notice in writing via the contractual notice method before the deadline',
      'Retain a certified copy of the notice delivery (certified mail, email confirmation, etc.)',
      'Negotiate renewal rent and any modifications to lease terms in the amendment',
      'Review tenant improvement allowance availability for renewal term build-out needs',
      'Confirm whether landlord has any recapture right upon exercise of renewal option',
      'Document agreed terms in a lease amendment referencing the original lease date and parties',
      'Update lease abstract to reflect renewed term, new expiration date, and modified rent schedule',
      'File executed amendment with all lease documents and update lease administration system',
    ],
    relatedFields: [
      'renewal-options',
      'expiration-date',
      'notice-requirements',
      'base-rent',
      'fair-market-rent',
      'renewal-rent-basis',
    ],
    downloadableFormat: 'PDF, Excel',
    fileFormat: 'PDF',
    status: 'coming-soon',
    faqs: [
      {
        question: 'What happens if I miss the renewal option notice deadline?',
        answer:
          'Missing the renewal option notice deadline typically results in permanent loss of the renewal right - the landlord is not required to extend the lease, and courts rarely grant relief for missed option deadlines. This is why proactive calendar management and lease abstract accuracy are critical. Many tenants lose renewal options simply because the deadline was not tracked.',
      },
      {
        question: 'Can I negotiate the renewal terms even if the lease specifies "fair market rent"?',
        answer:
          'Yes. Even with a fair market rent clause, you can negotiate the specific comparables used for the appraisal, the timeline for determination, and any floor or ceiling provisions. You can also negotiate non-rent terms like tenant improvement allowances, free rent periods, and modifications to other lease clauses in the renewal amendment.',
      },
      {
        question: 'How far in advance should I start the renewal process?',
        answer:
          'Start at least 18-24 months before expiration, regardless of the option notice deadline. This gives you time to evaluate alternatives, understand market conditions, and negotiate from a position of strength. Beginning the process at the option notice deadline leaves you little leverage - the landlord knows you\'re committed.',
      },
    ],
    metaTitle: 'Lease Renewal Checklist - Commercial Lease Options',
    metaDescription:
      'Commercial lease renewal checklist: track option notice deadlines, negotiate renewal rent, serve proper notice, and execute amendments. Free PDF and Excel download.',
  },
  {
    name: 'Lease Audit Checklist',
    slug: 'lease-audit-checklist',
    category: 'cam',
    description:
      'A detailed lease audit checklist for reviewing landlord billing practices against executed lease terms. This checklist guides the audit process from document collection through final resolution, covering CAM charges, operating expenses, rent calculations, and insurance billing. It is designed for use by professional lease auditors and sophisticated tenants conducting self-audits.',
    useCase:
      'Used by lease auditors, real estate attorneys, and large tenants with multi-location portfolios to systematically identify overbillings in landlord CAM statements and recover overcharges.',
    keyItems: [
      'Request all supporting documentation: general ledger, vendor invoices, management agreements, and payroll records',
      'Obtain all CAM statements and reconciliations for the audit period (typically 3 years)',
      'Verify the audit window has not expired under the lease\'s audit rights provision',
      'Confirm tenant\'s pro-rata share percentage was correctly applied each year',
      'Audit management fee calculation against the contractual cap for each audit year',
      'Verify all capital expenditures were excluded or properly amortized as contractually permitted',
      'Check for expenses attributable to other tenants, vacant space, or excluded areas',
      'Verify gross-up calculations for years when building occupancy fell below the threshold',
      'Confirm all base year exclusions were consistently applied across audit years',
      'Check for duplicate billings across general ledger categories',
      'Audit insurance premium allocations - verify tenant is not paying for risks excluded from the lease',
      'Request contractor invoices for major repair line items to verify market-rate pricing',
      'Calculate total overcharges by year and apply any applicable interest provision',
      'Prepare audit findings report and submit dispute notice within the contractual deadline',
      'Negotiate settlement or pursue formal arbitration per the lease\'s dispute resolution process',
    ],
    relatedFields: [
      'audit-rights',
      'cam-exclusions',
      'management-fee-cap',
      'cam-cap',
      'base-year',
      'gross-up-provision',
      'pro-rata-share',
    ],
    downloadableFormat: 'PDF, Excel',
    fileFormat: 'PDF',
    status: 'coming-soon',
    faqs: [
      {
        question: 'How much can a typical lease audit recover?',
        answer:
          'Commercial lease audits can uncover overbilling when CAM reconciliations, exclusions, caps, or gross-up provisions are misapplied. For tenants paying $100,000+ annually in CAM, even a small billing error can be financially meaningful. The recovery amount depends on lease complexity, landlord billing practices, and how long the audit period covers.',
      },
      {
        question: 'What is the typical lease audit window?',
        answer:
          'Most leases provide an audit right of 12-24 months from the date the CAM reconciliation statement is delivered. Some leases have a longer 36-month window covering multiple years. The audit must typically be completed within 60-90 days after notice is given. Missing the audit window permanently waives the right to dispute those charges.',
      },
      {
        question: 'Can landlords charge the tenant for the cost of an audit?',
        answer:
          'Landlords can charge audit costs to the tenant if the audit reveals no overbilling, or if the lease specifically permits cost recovery. If the audit reveals an overbilling above a specified threshold (often 3-5%), the lease typically requires the landlord to pay audit costs. Negotiating favorable audit cost provisions is important at lease inception.',
      },
    ],
    metaTitle: 'Lease Audit Checklist - CAM Overcharge Recovery',
    metaDescription:
      'Professional lease audit checklist for commercial tenants. Audit CAM statements, verify pro-rata share, check exclusions, and recover overbillings. PDF/Excel download.',
  },
  {
    name: 'Sublease Review Checklist',
    slug: 'sublease-review-checklist',
    category: 'administration',
    description:
      'A structured checklist for reviewing sublease agreements and their relationship to the master lease. This checklist ensures sublease terms do not conflict with master lease restrictions, that landlord consent is properly obtained, and that the sublandlord retains appropriate protections. It is equally useful for subtenants evaluating what rights they are actually receiving.',
    useCase:
      'Used by corporate real estate teams, real estate attorneys, and lease administrators when a tenant seeks to sublease excess space or when a prospective subtenant is evaluating a sublease opportunity.',
    keyItems: [
      'Confirm the master lease permits subleasing and identify any consent requirements',
      'Check whether the landlord has a recapture right that could terminate the master lease',
      'Identify the landlord\'s consent standard - whether consent may be withheld in landlord\'s sole discretion',
      'Verify the proposed sublease term does not extend beyond the master lease expiration date',
      'Confirm the sublease rent does not exceed the master lease rent in jurisdictions with profit-sharing requirements',
      'Review permitted use in the master lease - verify the subtenant\'s intended use is permitted',
      'Confirm the subtenant\'s intended use does not conflict with any exclusivity clause in the master lease',
      'Obtain landlord consent in the form required by the master lease (written, within specified timeframe)',
      'Verify the subtenant assumes all master lease obligations applicable to the subleased premises',
      'Ensure the sublease is expressly subordinate to the master lease',
      'Confirm the subtenant has no right to deal directly with the landlord except in specified circumstances',
      'Verify the sublandlord retains the right to terminate the sublease upon master lease termination',
      'Review indemnification provisions - confirm sublandlord is protected from subtenant defaults',
      'Document landlord consent approval and file with master lease documents',
    ],
    relatedFields: [
      'subletting-rights',
      'landlord-consent',
      'recapture-right',
      'permitted-use',
      'assignment-restrictions',
    ],
    downloadableFormat: 'PDF, Excel',
    fileFormat: 'PDF',
    status: 'coming-soon',
    faqs: [
      {
        question: 'Does the subtenant get all the same rights as the original tenant?',
        answer:
          'No. A subtenant\'s rights are limited to what the sublandlord (original tenant) can grant from the master lease. If the master lease prohibits certain uses or modifications, those restrictions flow down to the sublease. Additionally, subtenants typically do not have a direct relationship with the landlord and cannot enforce master lease provisions directly.',
      },
      {
        question: 'What is a recapture right and when does it matter?',
        answer:
          'A recapture right allows the landlord to terminate the original lease and deal directly with the proposed subtenant when the tenant requests subleasing consent. This eliminates the sublandlord from the deal entirely. Recapture rights are most common in hot markets where landlords would prefer to sign a new lease at current market rates rather than have the original tenant profit from a sublease.',
      },
      {
        question: 'What happens to the sublease if the master lease is terminated?',
        answer:
          'Unless the landlord has signed a non-disturbance agreement protecting the subtenant, termination of the master lease typically terminates the sublease as well. Savvy subtenants negotiate an SNDA with the landlord that converts their sublease to a direct lease upon master lease termination, providing continuity of occupancy.',
      },
    ],
    metaTitle: 'Sublease Review Checklist - Commercial Lease',
    metaDescription:
      'Sublease review checklist for commercial real estate. Verify master lease permissions, landlord consent, recapture rights, and sublease subordination. PDF/Excel.',
  },
  {
    name: 'Lease Comparison Template',
    slug: 'lease-comparison-template',
    category: 'due-diligence',
    description:
      'A side-by-side lease comparison template for evaluating multiple lease proposals or comparing an existing lease against a proposed renewal or alternative space. This template structures the comparison across economic, operational, and legal dimensions to support objective space selection decisions. It is particularly useful when comparing NNN, gross, and modified gross lease structures.',
    useCase:
      'Used by corporate real estate teams, tenant brokers, and occupancy planners when evaluating two or more lease options, or when comparing a renewal proposal against a new space alternative.',
    keyItems: [
      'Document total occupancy cost per RSF per year for each option (base rent + CAM + insurance + taxes)',
      'Compare lease term length, commencement date, and expiration date for each option',
      'Evaluate tenant improvement allowance as a per-RSF amount and total buildout cost impact',
      'Compare free rent periods and calculate net present value of each option',
      'Assess renewal options: number of options, term length, rent basis (fixed vs. market)',
      'Compare termination options: availability, timing, and penalty calculations',
      'Evaluate CAM structure: gross vs. NNN, exclusions, caps, and audit rights',
      'Compare security deposit requirements and whether a letter of credit is required',
      'Assess assignment and subletting flexibility for each option',
      'Compare parking ratio, cost, and reserved vs. unreserved allocation',
      'Evaluate location factors: proximity to labor pool, clients, transit, and amenities',
      'Calculate broker commission and transaction costs for each option',
      'Assess landlord financial stability and building quality for each option',
      'Score each option and document final recommendation with supporting rationale',
    ],
    relatedFields: [
      'base-rent',
      'cam-estimate',
      'ti-allowance',
      'free-rent',
      'renewal-options',
      'termination-option',
      'security-deposit',
      'lease-type',
    ],
    downloadableFormat: 'PDF, Excel',
    fileFormat: 'PDF',
    status: 'coming-soon',
    faqs: [
      {
        question: 'How do I compare a gross lease to an NNN lease on an apples-to-apples basis?',
        answer:
          'Convert both to total occupancy cost per RSF. For a gross lease, the quoted rent already includes most operating expenses. For an NNN lease, add the base rent plus estimated taxes, insurance, and CAM. Then compare the total cost for each option, adjusting for any expense stop provisions in modified gross leases.',
      },
      {
        question: 'How should I weight TI allowance in the comparison?',
        answer:
          'Calculate the effective rent net of TI allowance by amortizing the TI over the base term at an appropriate discount rate (typically 7-10%). A lease with $50/SF TI allowance has a meaningfully lower effective rent than one with no TI, especially for a first-generation space build-out. Include TI in net present value calculations for the most accurate comparison.',
      },
      {
        question: 'Is it worth taking less TI allowance for better lease flexibility?',
        answer:
          'This depends on your capital position and business outlook. Companies with high growth uncertainty often prefer flexibility (more options, lower termination penalties) over maximum TI. Capital-constrained companies may prioritize maximum TI even at the cost of flexibility. Model both scenarios with realistic probability weights.',
      },
    ],
    metaTitle: 'Lease Comparison Template - Compare Commercial Lease Options',
    metaDescription:
      'Side-by-side commercial lease comparison template. Compare rent, TI allowance, CAM structure, options, and total occupancy cost across multiple lease proposals.',
  },
  {
    name: 'Estoppel Preparation Checklist',
    slug: 'estoppel-preparation-checklist',
    category: 'administration',
    description:
      'A preparation checklist for reviewing and responding to landlord-requested estoppel certificates. This checklist ensures tenants verify all statements against the lease before certifying, protecting against inadvertently confirming incorrect facts. It also guides tenants on appropriate qualifications and exceptions to include in the estoppel response.',
    useCase:
      'Used by tenant legal counsel, real estate managers, and lease administrators when a landlord requests an estoppel certificate in connection with a property sale, refinancing, or lender due diligence.',
    keyItems: [
      'Request and obtain a copy of the complete lease file before reviewing the estoppel',
      'Verify the estoppel identifies the correct lease date, parties, and premises description',
      'Confirm the stated commencement date and expiration date match the executed lease',
      'Verify the monthly rent figure stated in the estoppel matches current rent obligations',
      'Confirm whether any rent concessions, abatements, or free rent periods remain outstanding',
      'Verify the security deposit amount and form stated in the estoppel is accurate',
      'Confirm the status of any outstanding landlord obligations (TI work, allowances, etc.)',
      'Verify there are no outstanding landlord defaults or disputes that should be noted',
      'Confirm the tenant has not assigned or subleased any portion of the premises (or identify existing assignments)',
      'Verify all lease modifications and amendments are listed and attached to the estoppel',
      'Confirm no rights of first offer, first refusal, or expansion options are omitted',
      'Add appropriate qualifications for any item the tenant cannot independently verify',
      'Have the estoppel reviewed by legal counsel before execution if significant obligations are involved',
      'Execute the estoppel within the timeframe specified in the lease (typically 10-15 days)',
    ],
    relatedFields: [
      'landlord-legal-name',
      'tenant-legal-name',
      'commencement-date',
      'expiration-date',
      'base-rent',
      'security-deposit',
      'rofr',
      'renewal-options',
    ],
    downloadableFormat: 'PDF, Excel',
    fileFormat: 'PDF',
    status: 'coming-soon',
    faqs: [
      {
        question: 'What is an estoppel certificate and why does it matter?',
        answer:
          'An estoppel certificate is a legal document in which the tenant certifies specific facts about the lease - including rent amounts, lease dates, the absence of landlord defaults, and the completeness of the lease agreement. Once signed, the tenant is estopped (legally prevented) from later claiming facts that contradict the certificate. Lenders and buyers rely on estoppels to confirm the economic and legal status of leases in a property acquisition.',
      },
      {
        question: 'Can I refuse to sign an estoppel certificate?',
        answer:
          'Most commercial leases require the tenant to provide estoppels within a specified timeframe (typically 10-15 days) upon landlord request. Unreasonably refusing to sign is typically a default under the lease. However, you can and should include qualifications for any statements you cannot independently verify, and you should note any outstanding landlord defaults or disputes.',
      },
      {
        question: 'What should I do if the estoppel contains a factual error?',
        answer:
          'Never sign an estoppel containing incorrect facts without modification. Strike the incorrect statement, write in the correct information, and initial the change. If the landlord prepared the form, send a red-lined version with your corrections. Signing a materially incorrect estoppel can waive important lease rights and bind you to unfavorable terms.',
      },
    ],
    metaTitle: 'Estoppel Certificate Checklist - Tenant Preparation Guide',
    metaDescription:
      'Estoppel certificate preparation checklist for commercial tenants. Verify lease facts, identify landlord obligations, and protect your rights before signing.',
  },
  {
    name: 'Tenant Improvement Tracking Template',
    slug: 'tenant-improvement-tracking',
    category: 'administration',
    description:
      'A tracking template for managing tenant improvement allowance disbursements, construction milestones, and landlord/tenant obligations throughout a commercial build-out. This template ensures all allowance amounts are properly drawn down before expiration dates, construction is completed within required timelines, and all required approvals and documentation are obtained.',
    useCase:
      'Used by project managers, construction managers, and lease administrators managing a commercial build-out on behalf of a tenant, from lease execution through space delivery and punch list completion.',
    keyItems: [
      'Document total TI allowance amount, per-RSF basis, and any overallowance provisions',
      'Identify the TI allowance draw deadline - confirm date by which all funds must be requested',
      'Confirm whether unused TI allowance converts to rent credit or is forfeited',
      'Obtain landlord approval of construction drawings before commencement of work',
      'Track all contractor invoices submitted for allowance reimbursement',
      'Verify each invoice relates to landlord-approved work within the approved budget',
      'Submit draw requests with required supporting documentation (invoices, lien waivers, inspection reports)',
      'Track cumulative draw amounts against total allowance to prevent overdraws',
      'Monitor construction timeline against lease-required completion date',
      'Document any change orders and obtain landlord approval if required by the lease',
      'Conduct walk-through inspection at substantial completion and prepare punch list',
      'Obtain final lien waivers from all contractors before final allowance draw',
      'Confirm tenant\'s commencement date obligations are met (occupancy, rent commencement)',
      'File all construction documents, permits, and as-built drawings with lease documents',
    ],
    relatedFields: [
      'ti-allowance',
      'commencement-date',
      'rent-commencement',
      'landlord-work',
      'construction-deadline',
    ],
    downloadableFormat: 'PDF, Excel',
    fileFormat: 'PDF',
    status: 'coming-soon',
    faqs: [
      {
        question: 'What happens if the TI allowance is not fully drawn before the deadline?',
        answer:
          'In most leases, unused TI allowance is forfeited if not requested before the deadline - the landlord has no obligation to pay out unused funds. Some leases allow conversion to a rent credit, but this must be explicitly negotiated. Always track draw balances and deadlines proactively, and request extensions in writing if construction delays are affecting your draw timeline.',
      },
      {
        question: 'Can I use TI allowance for furniture and equipment?',
        answer:
          'This depends on the lease definition of "tenant improvements." Many leases restrict TI allowance to hard construction costs (walls, flooring, electrical, plumbing) and exclude furniture, fixtures, equipment (FF&E), and moving costs. Some landlords will negotiate a "soft cost" allowance of 10-15% for permits, architect fees, and project management. Review the TI allowance definition carefully.',
      },
      {
        question: 'What is an overallowance and how does it work?',
        answer:
          'An overallowance is an additional landlord contribution above the base TI allowance, typically structured as an amortized loan at a specified interest rate embedded in the base rent. For example, a landlord might provide an additional $15/SF above the TI allowance, recovering that amount through a rent addition of $2.50/SF per year for 8 years. It is a financing tool, not a grant.',
      },
    ],
    metaTitle: 'Tenant Improvement Tracking Template - TI Allowance Management',
    metaDescription:
      'Track TI allowance draws, construction milestones, and landlord approval requirements. Free tenant improvement tracking template for commercial build-outs.',
  },
  {
    name: 'Critical Dates Template',
    slug: 'critical-dates-template',
    category: 'administration',
    description:
      'A critical dates calendar template for tracking all action-required dates in a commercial lease, including option notice deadlines, rent escalation dates, CAM reconciliation windows, audit deadlines, and lease expiration. This template is the foundation of a lease administration system and the single most important tool for avoiding costly missed deadlines.',
    useCase:
      'Used by lease administrators, property managers, and corporate real estate teams to maintain an ongoing calendar of all lease-driven deadlines across a portfolio, with advance notice triggers for each date.',
    keyItems: [
      'Record lease commencement date and expiration date with 12-month advance alert',
      'Enter all renewal option notice deadlines with 18-month, 12-month, and 6-month alerts',
      'Log all termination option notice deadlines with 9-month and 3-month advance alerts',
      'Track all rent escalation dates and effective new rent amounts',
      'Record annual CAM reconciliation statement delivery deadline and dispute window expiration',
      'Log audit rights expiration date for each CAM year (typically 12-24 months from statement delivery)',
      'Track TI allowance draw deadline with 90-day and 30-day advance alerts',
      'Record all ROFR and ROFO notice and response deadlines',
      'Log insurance certificate renewal dates for all required policies',
      'Track any required tenant reporting dates (sales reports, financial statements)',
      'Record holdover period start date and any rate changes triggered by holdover status',
      'Log all dates for co-tenancy monitoring (anchor tenant lease expirations, etc.)',
      'Track landlord consent request deadlines for planned subleases or assignments',
      'Record any lease anniversary dates that trigger landlord improvement obligations',
    ],
    relatedFields: [
      'commencement-date',
      'expiration-date',
      'renewal-options',
      'termination-option',
      'rent-escalation-dates',
      'reconciliation-frequency',
      'audit-rights',
      'rofr',
    ],
    downloadableFormat: 'PDF, Excel',
    fileFormat: 'PDF',
    status: 'coming-soon',
    faqs: [
      {
        question: 'How many days in advance should I set alerts for option notice deadlines?',
        answer:
          'For renewal and termination options, set three alerts: 18 months out (to begin market research), 12 months out (to make a strategic decision), and 6 months out (final notice preparation). The 6-month alert should be a hard deadline reminder with sufficient time to prepare and serve notice via the required method (often certified mail with a delivery confirmation period).',
      },
      {
        question: 'What tools do lease administrators use for critical dates tracking?',
        answer:
          'Enterprise portfolios typically use dedicated lease administration software (Visual Lease, LeaseQuery, TRIRIGA) that automatically generates critical dates from abstracted lease data. For smaller portfolios, Excel-based systems are common. The key is ensuring critical dates are extracted accurately from the lease abstract - garbage in, garbage out.',
      },
      {
        question: 'Which missed deadline has the largest financial impact?',
        answer:
          'Missing a renewal option notice deadline is typically the most financially damaging, as it can force a tenant to relocate at significant cost or accept unfavorable holdover terms. Missing CAM audit windows is the second most costly, as tenants lose the right to recover overbillings - potentially tens of thousands of dollars in larger leases.',
      },
    ],
    metaTitle: 'Critical Dates Template - Commercial Lease Calendar',
    metaDescription:
      'Critical dates calendar template for commercial leases. Track option notice deadlines, rent escalations, CAM audit windows, and all lease action dates. PDF/Excel.',
  },
  {
    name: 'Lease Audit Workbook',
    slug: 'lease-audit-workbook',
    category: 'cam',
    description:
      'A structured Excel workbook for conducting a commercial lease audit - verifying CAM charges, operating expense allocations, pro-rata share calculations, and management fee caps against executed lease terms. The workbook includes built-in formulas for cap calculations, gross-up adjustments, and year-over-year overbilling summaries, making it the fastest path from raw landlord statements to a defensible dispute notice.',
    useCase:
      'Used by lease auditors, tenant representatives, and sophisticated tenants when auditing 1–5 years of CAM statements. Particularly valuable for multi-year audits where cumulative overbillings and base year errors compound across periods.',
    keyItems: [
      'Enter lease-extracted values: pro-rata share, CAM cap, management fee cap, base year, and audit rights window',
      'Import landlord general ledger line items for each audit year',
      'Flag each expense line as permitted, excluded, or disputed per the lease exclusion list',
      'Auto-calculate management fee overages against the contractual cap percentage',
      'Apply cumulative or non-cumulative CAM cap logic to controllable expense subtotals',
      'Identify capital expenditure line items incorrectly included as operating expenses',
      'Verify gross-up calculation for years when building occupancy was below the lease threshold',
      'Check for duplicate line items across expense categories in the general ledger',
      'Calculate overcharge amount per year and cumulative overcharge across the full audit period',
      'Generate a summary dispute table formatted for inclusion in an audit findings letter',
      'Track audit rights expiration date and flag if the audit window is within 60 days of closing',
      'Document all supporting documentation received and outstanding documentation requests',
    ],
    relatedFields: [
      'audit-rights',
      'cam-exclusions',
      'management-fee-cap',
      'cam-cap',
      'base-year',
      'gross-up-provision',
      'pro-rata-share',
      'reconciliation-frequency',
    ],
    downloadableFormat: 'Excel',
    fileFormat: 'XLSX',
    status: 'live',
    faqs: [
      {
        question: 'How many years should I audit?',
        answer:
          'Most leases allow a 12–36 month audit window from the date each CAM reconciliation statement is delivered. Audit all years still within the window - cumulative overbillings often compound year over year, so the full audit period produces meaningfully higher recoveries than a single year. The workbook covers up to 5 audit years.',
      },
      {
        question: 'Do I need the landlord\'s general ledger to use this workbook?',
        answer:
          'Yes. The audit is only as thorough as the documentation received. Start by requesting the general ledger, vendor invoices for major line items, management agreements, payroll records, and insurance certificates. Many landlords resist providing the full GL - your lease audit rights provision typically compels disclosure. The workbook includes a documentation request tracker to manage this process.',
      },
      {
        question: 'What is the most common overbilling identified in lease audits?',
        answer:
          'Management fee overages are the most common finding - landlords frequently charge management fees on gross revenue or total operating expenses rather than the contractually defined base. The second most common overbilling is capital expenditures included as operating expense line items without the amortization treatment required by the lease.',
      },
    ],
    metaTitle: 'Lease Audit Workbook - CAM Audit Excel Template',
    metaDescription:
      'Excel workbook for commercial lease CAM audits. Verify charges, calculate overages, apply caps, and generate a dispute summary. Free download for tenants and auditors.',
  },
]

// ─── Related Templates ──────────────────────────────────────────────

const TEMPLATE_RELATIONS: Record<string, string[]> = {
  'lease-abstraction-checklist': ['due-diligence-checklist', 'lease-audit-workbook', 'cam-reconciliation-checklist'],
  'due-diligence-checklist': ['lease-abstraction-checklist', 'lease-audit-workbook', 'cam-reconciliation-checklist'],
  'cam-reconciliation-checklist': ['lease-audit-workbook', 'lease-abstraction-checklist'],
  'lease-audit-workbook': ['cam-reconciliation-checklist', 'due-diligence-checklist'],
  'lease-renewal-checklist': ['critical-dates-template', 'lease-comparison-template'],
  'lease-audit-checklist': ['cam-reconciliation-checklist', 'due-diligence-checklist'],
  'sublease-review-checklist': ['lease-abstraction-checklist', 'lease-comparison-template'],
  'lease-comparison-template': ['lease-abstraction-checklist', 'sublease-review-checklist'],
  'estoppel-preparation-checklist': ['due-diligence-checklist', 'critical-dates-template'],
  'tenant-improvement-tracking': ['cam-reconciliation-checklist', 'lease-abstraction-checklist'],
  'critical-dates-template': ['lease-renewal-checklist', 'estoppel-preparation-checklist'],
}

for (const template of TEMPLATES) {
  const related = TEMPLATE_RELATIONS[template.slug]
  if (related) template.relatedTemplates = related
}

// ─── Helper Functions ────────────────────────────────────────────────

export function getTemplateBySlug(slug: string): LeaseTemplate | undefined {
  return TEMPLATES.find((t) => t.slug === slug)
}

export function getAllTemplateSlugs(): string[] {
  return TEMPLATES.map((t) => t.slug)
}

export function getLiveTemplates(): LeaseTemplate[] {
  return TEMPLATES.filter((t) => t.status === 'live')
}

export function getComingSoonTemplates(): LeaseTemplate[] {
  return TEMPLATES.filter((t) => t.status === 'coming-soon')
}

// ─── Publication date ───────────────────────────────────────────────
export const TEMPLATES_PUBLISHED_AT = '2026-03-18'
