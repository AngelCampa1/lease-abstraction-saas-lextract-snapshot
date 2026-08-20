// ─── Persona Types ─────────────────────────────────────────────────

export interface PersonaData {
  role: string
  slug: string
  shortTitle: string
  heroSubhead: string
  challenge: string
  solution: string
  roiStat: { value: string; label: string; detail: string }
  outcomes: string[]
  keyFields: string[]
  relevantRedFlags: string[]
  workflowSteps: { name: string; description: string }[]
  relatedUseCases: string[]
  relatedIndustries: string[]
  faqs: { question: string; answer: string }[]
  metaTitle: string
  metaDescription: string
}

// ─── Persona Data ──────────────────────────────────────────────────

export const PERSONAS: PersonaData[] = [
  {
    role: 'Tenant Representatives',
    slug: 'tenant-representatives',
    shortTitle: 'Tenant Reps',
    heroSubhead:
      'Spot bad lease terms before your client signs. Upload a PDF and get 126 fields back in minutes.',
    challenge:
      'You manage many client leases at once. Each lease can run 80 pages. Reading one by hand takes 4 to 8 hours. A renewal deadline can arrive before you finish. Bad terms hide deep in the text. CAM caps limit what the landlord can bill for shared building costs. Holdover rates set what rent your client owes past the lease end. Miss either one and a client can overpay by tens of thousands.',
    solution:
      'Upload a lease PDF. AI reads it and pulls out 126 fields. Results arrive in about 5 to 15 minutes. You see every financial term in one place. Lextract shows rent increases, audit rights, and CAM caps in a single view. Red flags call out high holdover rates before your client signs. You walk into talks with real numbers. A portfolio review that once took weeks now takes hours.',
    roiStat: {
      value: '5-15 min',
      label: 'to abstract one lease',
      detail: 'By hand it takes 4 to 8 hours per lease.',
    },
    outcomes: [
      'Catch bad CAM caps and holdover rates before signing',
      'Get all 126 fields in 5 to 15 minutes',
      'Walk into renewal talks with a list of problem terms',
      'Review an entire client portfolio in hours, not weeks',
    ],
    keyFields: [
      'cam_cap_percentage',
      'audit_rights',
      'renewal_terms',
      'holdover_rate',
      'termination_penalty',
      'cam_exclusions',
      'management_fee_cap',
      'escalation_type',
      'base_rent_annual',
      'lease_term_months',
      'exclusive_use_rights',
      'consent_standard',
    ],
    relevantRedFlags: [
      'RF-001',
      'RF-002',
      'RF-003',
      'RF-004',
      'RF-006',
      'RF-008',
      'RF-009',
      'RF-011',
    ],
    workflowSteps: [
      {
        name: 'Upload client lease PDFs',
        description:
          'Drop one or more lease PDFs into Lextract. AI reads each file as an image. You do not need an extra conversion step.',
      },
      {
        name: 'Review the 126 fields',
        description:
          'Look at the 126-field summary. Check rent structure, CAM caps, renewal options, and holdover rates. Each field shows a confidence score of High, Medium, or Low.',
      },
      {
        name: 'Check red flags',
        description:
          'Review any red flags Lextract found. Look for missing CAM caps, absent audit rights, and high holdover rates. Use this list to plan your client talks.',
      },
      {
        name: 'Export for your client',
        description:
          'Download the summary as Excel or PDF. Share it with your client or add it to a deal package.',
      },
      {
        name: 'Compare renewal terms',
        description:
          'Compare the current lease terms with the proposed renewal. See exactly what changed and where you should push back.',
      },
    ],
    relatedUseCases: [
      'lease-renewal-analysis',
      'lease-comparison',
      'cam-reconciliation',
      'lease-audit',
    ],
    relatedIndustries: ['office', 'retail', 'industrial'],
    faqs: [
      {
        question: 'Can Lextract read scanned leases from older portfolios?',
        answer:
          'Yes. Lextract reads scanned PDFs and phone photos of pages. You do not need an extra conversion step. It handles old lease formats well.',
      },
      {
        question: 'How does Lextract help me prepare for renewal talks?',
        answer:
          'Lextract pulls out renewal terms, notice deadlines, CAM caps, and holdover rates. Red flags mark the terms that hurt your client. You get a concrete list to bring to talks.',
      },
      {
        question: 'Can I process a whole client portfolio at once?',
        answer:
          'Yes. Upload many PDFs at once and Lextract works on them at the same time. Each lease gets its own 126-field summary. Export the whole batch when done.',
      },
    ],
    metaTitle: 'Lease Abstraction for Tenant Representatives',
    metaDescription:
      'Lextract helps tenant reps read client leases fast. Extract 126 fields, catch bad terms, and go into talks with real numbers. Flat $15 per lease.',
  },
  {
    role: 'Property Managers',
    slug: 'property-managers',
    shortTitle: 'Property Managers',
    heroSubhead:
      'Stop losing money to CAM billing errors. Upload a lease PDF and get 126 clean fields in minutes.',
    challenge:
      'You manage hundreds of leases across many buildings. Each one has its own CAM structure. CAM is the shared building costs tenants help pay. Tracking pro rata shares by hand is slow. Pro rata share is a tenant\'s percent of those costs. Base year is the starting year used for expense math. Year-end CAM reconciliation takes weeks. Reconciliation is the yearly true-up of CAM bills. One wrong number creates a billing dispute. Missed dates cost you money.',
    solution:
      'Upload your lease PDFs. Lextract reads each one and pulls out 126 fields. You get the CAM data you need. Pro rata shares, base years, caps, and reconciliation dates are all there. You also get gross-up provisions. Gross-up means adjusting costs as if the building were full. Export to Excel or CSV. It maps to Yardi, MRI, AppFolio, and Buildium. Red flags alert you when a lease is missing key terms. Catch billing gaps before they become disputes.',
    roiStat: {
      value: '40%',
      label: 'of CAM bills have errors',
      detail: 'Good data helps you catch billing errors fast.',
    },
    outcomes: [
      'Cut CAM reconciliation prep from weeks to hours',
      'Catch missing gross-up and reconciliation terms before billing',
      'Export 126 structured fields directly into Yardi, MRI, or AppFolio',
      'Track every critical date across your full portfolio',
    ],
    keyFields: [
      'reconciliation_frequency',
      'pro_rata_share',
      'base_year',
      'cam_estimate_method',
      'parking_ratio',
      'utilities_payment_method',
      'janitorial_responsibility',
      'cam_cap_percentage',
      'gross_up_percentage',
      'management_fee_cap',
      'base_year_gross_up',
      'cam_exclusions',
    ],
    relevantRedFlags: [
      'RF-001',
      'RF-003',
      'RF-004',
      'RF-005',
      'RF-006',
      'RF-013',
      'RF-014',
      'RF-015',
    ],
    workflowSteps: [
      {
        name: 'Upload your lease PDFs',
        description:
          'Drop your lease files into Lextract. It reads scanned and digital PDFs without a separate OCR step.',
      },
      {
        name: 'Verify CAM fields',
        description:
          'Review CAM caps, base years, gross-up terms, and reconciliation dates. Each field has a confidence score. It is High, Medium, or Low.',
      },
      {
        name: 'Export to your system',
        description:
          'Download as Excel or CSV. The file maps to standard fields in Yardi, MRI, AppFolio, and Buildium.',
      },
      {
        name: 'Track critical dates',
        description:
          'Pull start dates, end dates, renewal deadlines, and reconciliation schedules. Use them to keep your calendar current.',
      },
    ],
    relatedUseCases: [
      'cam-reconciliation',
      'portfolio-review',
      'lease-audit',
      'estoppel-preparation',
    ],
    relatedIndustries: ['office', 'retail', 'industrial', 'mixed-use'],
    faqs: [
      {
        question: 'Can I export extracted data into Yardi or MRI?',
        answer:
          'Yes. Lextract exports to Excel. The fields map to standard property management data in Yardi, MRI, AppFolio, and Buildium. Save as CSV if your system needs a CSV import file.',
      },
      {
        question: 'How does Lextract handle different CAM structures across my portfolio?',
        answer:
          'Lextract reads each lease on its own. It pulls the CAM cap type, base year, and gross-up terms. It also pulls excluded expenses for each tenant. You get accurate data for each lease in your portfolio.',
      },
      {
        question: 'Does Lextract find missing reconciliation schedules?',
        answer:
          'Yes. If a lease has no reconciliation schedule, Lextract flags it. You see the gap before it causes a billing error.',
      },
    ],
    metaTitle: 'Lease Abstraction for Property Managers',
    metaDescription:
      'Lextract pulls 126 fields from any lease PDF for property managers. CAM data exports to Yardi, MRI, AppFolio, and Buildium. $15 per lease, no subscription.',
  },
  {
    role: 'Asset Managers',
    slug: 'asset-managers',
    shortTitle: 'Asset Managers',
    heroSubhead:
      'Get 126 lease fields in 5 to 15 minutes per PDF. Model NOI and spot rollover risk before you commit.',
    challenge:
      'You need real lease data to model NOI. NOI means net operating income. It is rent left after operating costs. Lease data sits in PDFs on your desk. Reading one lease by hand can take 4 to 8 hours. A firm hired to abstract 50 leases can take weeks. By then, the deal may be gone. Slow data leads to bad investment calls.',
    solution:
      'Upload your PDFs and get 126 fields per lease in 5 to 15 minutes. You see base rent and rent step-ups for every tenant. Rent step-ups are increases the lease schedules in advance. Leases ending soon show up so you can plan for rollover risk. The AI checks 20 risk flags. Each flag gets a score: High, Medium, or Low. Model NOI and make buy or sell calls the same day. Each lease costs $15. Credits do not expire.',
    roiStat: {
      value: 'Hours',
      label: 'to underwrite a portfolio',
      detail: 'Hand abstraction of one deal can take weeks.',
    },
    outcomes: [
      'Get 126 fields from any PDF in minutes',
      'Spot leases ending soon and plan for rollover risk',
      'See 20 AI-scored risk flags before you close',
      'Export data into your financial models at $15 per lease',
    ],
    keyFields: [
      'base_rent_annual',
      'escalation_type',
      'fixed_escalation_rate',
      'lease_term_months',
      'expiration_date',
      'has_renewal_option',
      'renewal_terms',
      'has_termination_option',
      'termination_penalty',
      'pro_rata_share',
      'rentable_square_footage',
      'ti_allowance_amount',
    ],
    relevantRedFlags: [
      'RF-003',
      'RF-008',
      'RF-009',
      'RF-011',
      'RF-012',
      'RF-001',
    ],
    workflowSteps: [
      {
        name: 'Upload the lease stack',
        description:
          'Drop the PDFs for your target deal into Lextract. Scanned and digital files both work. The AI reads each page natively.',
      },
      {
        name: 'Review the rent roll',
        description:
          'See base rent, rent step-ups, and lease terms for each tenant. The rent roll lists each tenant. It shows what each one pays.',
      },
      {
        name: 'Check risk flags',
        description:
          'The AI flags up to 20 issues per lease. Each one gets a score: High, Medium, or Low. You see what needs your attention first.',
      },
      {
        name: 'Export for underwriting',
        description:
          'Download structured data as Excel. Feed it into your financial models, deal memos, or investment committee decks.',
      },
    ],
    relatedUseCases: [
      'due-diligence',
      'portfolio-acquisition',
      'portfolio-review',
      'lease-renewal-analysis',
    ],
    relatedIndustries: ['office', 'retail', 'industrial', 'multifamily'],
    faqs: [
      {
        question: 'Can Lextract help with acquisition underwriting?',
        answer:
          'Yes. You get base rent, rent step-ups, and lease terms. You also see renewal options and expense data for every tenant. Upload the full lease stack and export to your model in minutes. Each lease costs $15 with no subscription needed.',
      },
      {
        question: 'How does Lextract handle rent step-up modeling?',
        answer:
          'Lextract reads each lease and finds the rent increase type. It could be a fixed amount or a percent. It could also be tied to the CPI index. It pulls the rate and the index name too. That is what you need to model rent growth.',
      },
      {
        question: 'Can I see rollover risk across a portfolio?',
        answer:
          'Yes. Lextract pulls end dates, lease terms, renewal options, and notice deadlines for every lease. Export the data and you have a full list of leases ending soon. Use it to plan renewals or decide which assets to sell.',
      },
    ],
    metaTitle: 'Lease Abstraction for Asset Managers',
    metaDescription:
      'Lextract gives asset managers 126 lease fields per PDF in minutes. Model NOI, spot rollover risk, and underwrite deals. $15 per lease. No subscription.',
  },
  {
    role: 'Commercial Real Estate Attorneys',
    slug: 'cre-attorneys',
    shortTitle: 'CRE Attorneys',
    heroSubhead:
      'Pull every key lease term in minutes. Spend your time on legal judgment, not data entry.',
    challenge:
      'You spend hours hunting key terms before you do any legal work. Each lease puts clauses in a new spot. Indemnification sets who pays when someone gets hurt. It hides in dense text. A cure period is the time to fix a default. It can land on any page. The consent standard is the rule for approving a transfer. It takes an hour to track down. By then, half your file time went to data entry. That time belongs to your client.',
    solution:
      'Upload a lease PDF. Lextract pulls out all 126 fields in 5 to 15 minutes. Key legal fields come first. You see indemnification, cure periods, and consent standards right away. A subrogation waiver is when an insurer gives up the right to sue. Lextract shows you that too. Red flags mark clauses that raise your client\'s risk. Confidence scores (High, Medium, or Low) show where to look twice. You spend your time on advice. Upload an amendment with the original to see what changed.',
    roiStat: {
      value: '4 to 8 hrs',
      label: 'of data entry saved per lease',
      detail: 'Spend your time on advice, not typing.',
    },
    outcomes: [
      'Find key risk clauses in minutes, not hours',
      'See confidence scores so you know where to verify',
      'Compare amendments to originals field by field',
      'Export a clean abstract to attach to your client memo',
    ],
    keyFields: [
      'indemnification_scope',
      'waiver_of_subrogation',
      'consent_standard',
      'acceleration_clause',
      'governing_law_state',
      'continuing_liability',
      'monetary_cure_period',
      'non_monetary_cure_period',
      'holdover_rate',
      'liquidated_damages',
      'recapture_right',
      'snda_requirement',
    ],
    relevantRedFlags: [
      'RF-007',
      'RF-008',
      'RF-009',
      'RF-010',
      'RF-012',
      'RF-011',
    ],
    workflowSteps: [
      {
        name: 'Upload the lease PDF',
        description:
          'Drop the lease or amendment file. Lextract reads scanned and digital PDFs with no extra steps.',
      },
      {
        name: 'Review legal risk fields',
        description:
          'See indemnification, cure periods, and consent standards in one place. You also see holdover rates and governing law.',
      },
      {
        name: 'Check red flags',
        description:
          'Lextract flags short cure periods and aggressive holdover rates. It also flags missing termination rights.',
      },
      {
        name: 'Export for your memo',
        description:
          'Download the abstract as a PDF or Excel file. Attach it to client memos or negotiation notes.',
      },
    ],
    relatedUseCases: [
      'amendment-review',
      'lease-comparison',
      'due-diligence',
      'sublease-review',
    ],
    relatedIndustries: ['office', 'retail', 'industrial', 'healthcare'],
    faqs: [
      {
        question: 'Does Lextract extract legal risk fields?',
        answer:
          'Yes. Lextract pulls indemnification scope, cure periods, and consent standards from each lease. It also gets holdover rates, damages clauses, and governing law state. These are the fields you check first.',
      },
      {
        question: 'Can I compare an amendment to the original lease?',
        answer:
          'Yes. Upload both files. Lextract gives you a 126-field abstract for each one. Put them side by side to see what changed. This works for any number of amendments.',
      },
      {
        question: 'Does Lextract give legal advice?',
        answer:
          'No. Lextract pulls data from lease text. It does not read the law or advise your client. It helps you find the facts fast. The legal judgment is yours.',
      },
    ],
    metaTitle: 'Lease Abstraction for CRE Attorneys',
    metaDescription:
      'Lextract helps CRE attorneys pull 126 lease fields in minutes. Find indemnification, cure periods, and consent standards fast. $15 per lease, no subscription.',
  },
  {
    role: 'Lease Administrators',
    slug: 'lease-administrators',
    shortTitle: 'Lease Admins',
    heroSubhead:
      'Upload a lease PDF. Get 126 clean fields back in minutes. Ready to import into Yardi or MRI.',
    challenge:
      'Lease admins pull data from a lease by hand. One lease takes 4 to 8 hours. Dates, rent amounts, and renewal windows get typed in one at a time. A 100-lease move runs 400 to 800 hours of that work. Errors creep in. Deadlines slip. Wrong data causes billing mistakes. It causes missed critical dates. The bottleneck is the copy-and-type process itself.',
    solution:
      'You upload the PDF. Lextract pulls 126 fields from it in about 5 to 15 minutes. That is abstraction: pulling key lease facts into a clean record. Each field gets a confidence score, High, Medium, or Low. You fix anything flagged Low in the editing screen. Then you export to Excel. The file maps to Yardi and MRI import fields. You import the file and you are done. You skip the manual typing. No one re-keys 400 fields per lease.',
    roiStat: {
      value: '400 to 800 hrs',
      label: 'saved on a 100-lease move',
      detail: 'Hand work runs 4 to 8 hours per lease.',
    },
    outcomes: [
      'Turn an 800-hour, 100-lease move into a weekend.',
      'Catch bad data before it hits your system.',
      'Export clean data straight into Yardi or MRI.',
      'See which fields need a manual check first.',
    ],
    keyFields: [
      'commencement_date',
      'expiration_date',
      'rent_commencement_date',
      'base_rent_annual',
      'rent_payment_frequency',
      'security_deposit_amount',
      'pro_rata_share',
      'rentable_square_footage',
      'renewal_notice_days',
      'estoppel_turnaround_days',
      'reconciliation_frequency',
      'cam_estimate_method',
    ],
    relevantRedFlags: [
      'RF-003',
      'RF-005',
      'RF-006',
      'RF-013',
      'RF-014',
      'RF-015',
    ],
    workflowSteps: [
      {
        name: 'Upload lease documents',
        description:
          'Upload all lease PDFs for a property, portfolio, or system migration. Scanned and digital PDFs both work.',
      },
      {
        name: 'Review extracted data',
        description:
          'Check the 126-field output for each lease. Confidence scores show where manual review may be needed.',
      },
      {
        name: 'Fix and validate fields',
        description:
          'Use the field editing screen to fix any errors. Then confirm the data is right and complete.',
      },
      {
        name: 'Export for system import',
        description:
          'Download the checked data as Excel. It works for Yardi, MRI, or other lease systems. Save as CSV if your system needs it.',
      },
      {
        name: 'Archive completed abstracts',
        description:
          'Store finished abstracts next to the original PDFs. Keep them for future audits and compliance reports.',
      },
    ],
    relatedUseCases: [
      'portfolio-review',
      'lease-audit',
      'estoppel-preparation',
      'cam-reconciliation',
    ],
    relatedIndustries: ['office', 'retail', 'industrial', 'mixed-use'],
    faqs: [
      {
        question: 'How much time does Lextract save per lease?',
        answer:
          'Manual lease abstraction takes 4 to 8 hours per lease. Lextract finishes in about 5 to 15 minutes. A 100-lease project is 400 to 800 hours of hand work. Lextract removes it.',
      },
      {
        question: 'Can I edit fields before I export?',
        answer:
          'Yes. Lextract has a field editing screen. You fix any field, add notes, and check the data first. Lextract tracks all edits for audit records.',
      },
      {
        question: 'What formats does Lextract export?',
        answer:
          'Lextract exports to Excel. Each sheet holds all 126 fields in order. If your system needs a CSV, save the file as CSV. The columns map to standard Yardi and MRI import fields.',
      },
    ],
    metaTitle: 'Lease Abstraction for Lease Administrators',
    metaDescription:
      'Lextract pulls 126 fields from any commercial lease PDF in minutes. Export to Excel for Yardi or MRI. $15 per lease, no subscription.',
  },
  {
    role: 'Due Diligence Analysts',
    slug: 'due-diligence-analysts',
    shortTitle: 'DD Analysts',
    heroSubhead:
      'Abstract a full deal lease stack in hours. Verify the rent roll. Catch risks before you close.',
    challenge:
      'Buying a property means checking every lease first. That work is called due diligence. A typical deal has 10 to 50 leases. You need the rent roll ready fast. The rent roll lists every tenant and what each one pays. Reading each lease by hand takes 4 to 8 hours. One missed clause can change what the property is worth. A bad renewal option or a recapture right can hurt the deal.',
    solution:
      'Upload your full lease stack. Lextract reads every PDF. It pulls 126 fields from each lease. Each lease takes about 5 to 15 minutes. All leases run at the same time. The AI flags 20 types of deal risks. Compare the results to the seller\'s rent roll. Then export the data into your deal model. Underwriting is the math behind the deal. Lextract feeds your numbers directly.',
    roiStat: {
      value: '$2,400',
      label: 'to abstract 200 leases',
      detail: 'Outsourced firms charge $66,000 to $176,000 for 200 leases. That is 27 to 73 times the cost.',
    },
    outcomes: [
      'Abstract a 20-lease deal in under 30 minutes',
      'Spot rent roll mismatches before the deal closes',
      'Find 20 types of lease risks with one upload',
      'Export data to Excel for Argus or your deal model',
    ],
    keyFields: [
      'base_rent_annual',
      'lease_term_months',
      'expiration_date',
      'escalation_type',
      'fixed_escalation_rate',
      'has_renewal_option',
      'renewal_terms',
      'has_termination_option',
      'security_deposit_amount',
      'ti_allowance_amount',
      'cam_cap_percentage',
      'has_guaranty',
    ],
    relevantRedFlags: [
      'RF-003',
      'RF-008',
      'RF-009',
      'RF-011',
      'RF-012',
      'RF-001',
      'RF-006',
    ],
    workflowSteps: [
      {
        name: 'Upload lease stack',
        description:
          'Drop all tenant leases from the data room. Lextract handles scanned and digital PDFs.',
      },
      {
        name: 'Verify rent roll',
        description:
          'Compare extracted rents and lease terms to the seller\'s rent roll. Find any gap.',
      },
      {
        name: 'Review deal risks',
        description:
          'Check AI-flagged risks across every lease. Look for missing CAM caps and bad renewal terms.',
      },
      {
        name: 'Export for underwriting',
        description:
          'Download structured data as Excel. Feed it into Argus or your deal model. Underwriting is the math behind the deal.',
      },
      {
        name: 'Build summary report',
        description:
          'See when each lease ends. Count the risks across all leases.',
      },
    ],
    relatedUseCases: [
      'due-diligence',
      'portfolio-acquisition',
      'lease-comparison',
      'portfolio-review',
    ],
    relatedIndustries: ['office', 'retail', 'industrial', 'multifamily'],
    faqs: [
      {
        question: 'Can Lextract read poor scans from the data room?',
        answer:
          'Yes. Lextract reads scanned PDFs as images. It handles skewed pages and low-quality scans. Each field gets a confidence score. Scores are High, Medium, or Low. Low scores tell you where to double-check.',
      },
      {
        question: 'How fast can I process a full lease stack?',
        answer:
          'A 20-lease deal finishes in under 30 minutes. Each lease takes 5 to 15 minutes. All leases run at once. Total time is close to the longest single lease.',
      },
      {
        question: 'Does Lextract help me verify the rent roll?',
        answer:
          'Yes. Lextract pulls base rent, rent increases, start dates, and end dates from every lease. Compare that data to the seller\'s rent roll. Find any gap before you close.',
      },
    ],
    metaTitle: 'Lease Abstraction for Due Diligence Analysts',
    metaDescription:
      'Abstract any deal lease stack fast. Lextract pulls 126 fields per lease for $15. Verify the rent roll. Catch deal risks before you close.',
  },
  {
    role: 'Commercial Brokers',
    slug: 'commercial-brokers',
    shortTitle: 'Brokers',
    heroSubhead:
      'Get a full lease summary in minutes. Compare deals on the same terms.',
    challenge:
      'You get a new lease proposal. It is 60 pages long. Your client calls in two hours. You need the rent, TI allowance, and renewal terms. Reading every page to find them takes too long. You miss things when you rush. Comparing two proposals is hard too. Each one uses different words for the same deal terms. Spotting the real difference takes time you do not have.',
    solution:
      'Upload the PDF. In 5 to 15 minutes, you get 126 fields pulled from the lease. You see base rent, TI allowance, and rent increases. TI allowance is the money a landlord gives you for build-out. Every lease comes back in the same format. You compare two proposals side by side on the same fields. It costs $15 per lease. You walk into the client call ready.',
    roiStat: {
      value: 'Minutes',
      label: 'to a full lease summary',
      detail: 'Walk into the client call ready.',
    },
    outcomes: [
      'See 126 fields from any lease in one clean view',
      'Compare proposals on the same terms every time',
      'Spot risky terms with confidence-scored AI flags',
      'Pay $15 per lease with no subscription',
    ],
    keyFields: [
      'base_rent_annual',
      'escalation_type',
      'fixed_escalation_rate',
      'ti_allowance_per_rsf',
      'lease_term_months',
      'has_renewal_option',
      'renewal_terms',
      'parking_ratio',
      'rentable_square_footage',
      'lease_structure_type',
      'percentage_rent_rate',
      'exclusive_use_rights',
    ],
    relevantRedFlags: [
      'RF-003',
      'RF-008',
      'RF-009',
      'RF-011',
      'RF-001',
    ],
    workflowSteps: [
      {
        name: 'Upload the lease PDF',
        description:
          'Drop a lease or proposal PDF into Lextract. It reads scanned and digital files with no extra steps.',
      },
      {
        name: 'Review 126 deal fields',
        description:
          'See base rent, TI allowance, rent increases, and renewal options in one view. Each field has a confidence score. The score shows what to check.',
      },
      {
        name: 'Compare competing proposals',
        description:
          'Upload two or more proposals. Lextract pulls the same 126 fields from each. You see them side by side in the same format.',
      },
      {
        name: 'Share the summary with clients',
        description:
          'Export a clean PDF or Excel report. Give it to your client before or during the call.',
      },
    ],
    relatedUseCases: [
      'lease-comparison',
      'lease-renewal-analysis',
      'due-diligence',
      'sublease-review',
    ],
    relatedIndustries: ['office', 'retail', 'industrial'],
    faqs: [
      {
        question: 'How fast can I get a summary before a call?',
        answer:
          'Lextract reads the PDF and returns 126 fields. It takes 5 to 15 minutes. Upload before the call. Your summary is ready when it starts.',
      },
      {
        question: 'Can I compare two lease proposals side by side?',
        answer:
          'Yes. Upload both leases. Lextract pulls the same 126 fields from each one. You see base rent, TI allowance, and renewal terms in the same format. Comparing them is fast.',
      },
      {
        question: 'Does Lextract work for retail leases with percentage rent?',
        answer:
          'Yes. Lextract pulls percentage rent, the sales breakpoint, and exclusive use rights. It also gets radius limits and co-tenancy terms.',
      },
    ],
    metaTitle: 'Lease Abstraction for Commercial Brokers',
    metaDescription:
      'Get a full lease summary in minutes. Pull 126 fields from any PDF for $15. Compare proposals on the same terms and walk into client calls ready.',
  },
  {
    role: 'Portfolio Managers & Investors',
    slug: 'portfolio-managers',
    shortTitle: 'Portfolio Managers',
    heroSubhead:
      'Get clean data from every lease in your portfolio. Upload the PDFs and we pull out 126 fields per lease.',
    challenge:
      'Your lease data is stuck in PDFs. It lives across dozens of buildings. To model your portfolio, you need rent, lease dates, and costs for each tenant. Getting that data by hand takes weeks. One person can read only so many leases. Without clean data, big calls come down to guesses.',
    solution:
      'Upload your lease PDFs. You get 126 fields back per lease. All leases run at the same time. A big portfolio is done in hours. You see NOI data, which is income after costs. You can track rent increases and leases ending soon. Each field gets a score: High, Medium, or Low confidence. Export to Excel for your reports. AI checks for 20 types of risk and flags which leases need attention.',
    roiStat: {
      value: '$1,500',
      label: 'for a 100-lease portfolio',
      detail: 'No subscription. $15 per lease.',
    },
    outcomes: [
      'See rent, lease dates, and costs for every tenant.',
      'Track which leases end soon so you can plan ahead',
      'Spot risk across your portfolio with 20 AI-flagged checks',
      'Export clean data to Excel for reporting and investment decisions',
    ],
    keyFields: [
      'base_rent_annual',
      'escalation_type',
      'fixed_escalation_rate',
      'cpi_index_reference',
      'lease_term_months',
      'expiration_date',
      'has_renewal_option',
      'renewal_terms',
      'pro_rata_share',
      'rentable_square_footage',
      'lease_structure_type',
      'security_deposit_amount',
    ],
    relevantRedFlags: [
      'RF-003',
      'RF-009',
      'RF-011',
      'RF-001',
      'RF-004',
      'RF-008',
      'RF-012',
    ],
    workflowSteps: [
      {
        name: 'Upload all lease PDFs',
        description:
          'Drop your lease files into Lextract. Scanned and digital PDFs both work. All leases run at the same time.',
      },
      {
        name: 'Review portfolio data',
        description:
          'See 126 fields per lease. Check lease terms, rent, and expiration dates across your whole portfolio.',
      },
      {
        name: 'Check risk flags',
        description:
          'AI flags up to 20 types of risk. See which properties have the most issues. Then you know where to focus.',
      },
      {
        name: 'Export for reporting',
        description:
          'Download structured data to Excel. Use it for investor reports, REIT filings, or your financial models.',
      },
    ],
    relatedUseCases: [
      'portfolio-review',
      'portfolio-acquisition',
      'due-diligence',
      'lease-renewal-analysis',
    ],
    relatedIndustries: ['office', 'retail', 'industrial', 'multifamily', 'mixed-use'],
    faqs: [
      {
        question: 'Can Lextract handle a portfolio of 500 or more leases?',
        answer:
          'Yes. Leases run at the same time, not one by one. A 500-lease portfolio is done over a few hours. Credits do not expire, so you upload at your own pace.',
      },
      {
        question: 'How does Lextract help me track lease rollover risk?',
        answer:
          'Lextract pulls out base rent, rent increases, and lease terms. It gets renewal options too. Export to Excel. Then you can spot which leases end soon and plan ahead.',
      },
      {
        question: 'How does Lextract help with REIT reporting?',
        answer:
          'Lextract pulls out rent, rent increase type, and rate. It also pulls lease end dates. Each field has a confidence score of High, Medium, or Low. You see what needs a manual check.',
      },
      {
        question: 'What does it cost to process a large portfolio?',
        answer:
          'Lextract costs $15 per lease. A 5-pack is $13 per lease. A 10-pack is $12 per lease. There is no subscription. Credits do not expire. A 100-lease portfolio costs $1,500 total.',
      },
    ],
    metaTitle: 'Lease Abstraction for Portfolio Managers',
    metaDescription:
      'Get 126 fields from every lease PDF. $15 per lease, no subscription. Export to Excel for portfolio reporting and investment decisions.',
  },
]

// ─── Helper Functions ──────────────────────────────────────────────

/**
 * Find a persona by its URL slug.
 */
export function getPersonaBySlug(slug: string): PersonaData | undefined {
  return PERSONAS.find((p) => p.slug === slug)
}

/**
 * Get all persona slugs for static generation.
 */
export function getAllPersonaSlugs(): string[] {
  return PERSONAS.map((p) => p.slug)
}

/**
 * Find a persona by role name or short title (case-insensitive).
 * Used to resolve plain-text persona references into linkable slugs.
 */
export function getPersonaByName(name: string): PersonaData | undefined {
  const normalized = name.toLowerCase().trim()
  if (normalized.length === 0) return undefined
  return PERSONAS.find(
    (p) =>
      p.role.toLowerCase() === normalized ||
      p.shortTitle.toLowerCase() === normalized
  )
}
