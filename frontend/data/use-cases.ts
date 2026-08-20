// ─── Use Case Types ────────────────────────────────────────────────

export interface UseCaseData {
  name: string
  slug: string
  problem: string
  solution: string
  workflowSteps: { name: string; description: string }[]
  criticalFields: string[]
  relevantRedFlags: string[]
  relevantPersonas: string[]
  relatedUseCases: string[]
  timeSaving: { manual: string; lextract: string; savings: string }
  faqs: { question: string; answer: string }[]
  metaTitle: string
  metaDescription: string
}

// ─── Use Case Data ─────────────────────────────────────────────────

export const USE_CASES: UseCaseData[] = [
  {
    name: 'Due Diligence',
    slug: 'due-diligence',
    problem:
      'Acquisition due diligence requires abstracting 10 to 50 leases within days to verify rent rolls, assess tenant credit risk, and identify lease-level issues that could affect property valuation. Manual abstraction under these timelines is error-prone and expensive. Analysts often resort to spot-checking a handful of leases rather than reviewing the full stack, leaving material risks undiscovered until after closing. A single overlooked below-market renewal option can cost hundreds of thousands in lost revenue.',
    solution:
      'Lextract processes an entire acquisition lease stack in under an hour, extracting 126 structured fields per lease including all rent, escalation, renewal, and operating expense data. Automated red flag detection surfaces risks across every lease - not just the ones an analyst had time to review manually. The structured export feeds directly into Argus or Excel underwriting models, eliminating transcription errors between lease documents and financial analysis.',
    workflowSteps: [
      {
        name: 'Upload Data Room Leases',
        description:
          'Portfolio workflow all tenant leases from the seller data room. Lextract\'s AI reads scanned PDFs natively as images and handles inconsistent formatting and poor scan quality.',
      },
      {
        name: 'Verify Rent Roll',
        description:
          'Compare extracted base rents, commencement dates, expiration dates, and escalation schedules against the seller-provided rent roll to identify discrepancies.',
      },
      {
        name: 'Review Red Flags',
        description:
          'Examine automatically detected red flags across all leases - missing CAM caps, absent termination options, aggressive holdover rates, and other valuation risks.',
      },
      {
        name: 'Assess Tenant Risk',
        description:
          'Review lease term lengths, guaranty provisions, security deposits, and renewal options to evaluate tenant credit and retention risk.',
      },
      {
        name: 'Export for Underwriting',
        description:
          'Download structured data as Excel for integration with financial models, Argus, or investment committee memo templates.',
      },
    ],
    criticalFields: [
      'base_rent_annual',
      'lease_term_months',
      'expiration_date',
      'escalation_type',
      'fixed_escalation_rate',
      'has_renewal_option',
      'renewal_terms',
      'has_termination_option',
      'security_deposit_amount',
      'has_guaranty',
      'ti_allowance_amount',
      'cam_cap_percentage',
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
    relevantPersonas: [
      'due-diligence-analysts',
      'asset-managers',
      'cre-attorneys',
      'portfolio-managers',
    ],
    relatedUseCases: [
      'portfolio-acquisition',
      'lease-comparison',
      'portfolio-review',
    ],
    timeSaving: {
      manual: '40-80 hours for 10 leases',
      lextract: 'Under 30 minutes',
      savings: '98% time reduction',
    },
    faqs: [
      {
        question: 'Can Lextract handle the poor-quality scans typically found in data rooms?',
        answer:
          'Yes. Lextract\'s AI reads scanned documents natively as images, handling skewed pages, low resolution, and inconsistent formatting. Confidence scores on each extracted field indicate where scan quality may have affected accuracy.',
      },
      {
        question: 'How does Lextract compare to hiring a third-party abstraction firm?',
        answer:
          'Third-party abstraction firms typically charge $150 to $500 per lease and require 5 to 10 business days for delivery. Lextract costs $15 per lease and delivers results in 5–15 minutes. For a 20-lease acquisition, that is $300 vs. $3,000-$10,000, delivered in minutes vs. 1-2 weeks.',
      },
      {
        question: 'Does Lextract replace the need for legal review during due diligence?',
        answer:
          'No. Lextract provides structured data extraction and risk flagging to accelerate and inform legal review, but it does not provide legal advice. Attorneys should still review key provisions, particularly where red flags are detected or confidence scores are low.',
      },
    ],
    metaTitle: 'AI-Powered Due Diligence Lease Abstraction',
    metaDescription:
      'Accelerate acquisition due diligence with Lextract. Abstract entire lease stacks in minutes, verify rent rolls automatically, and detect lease-level risks before closing.',
  },
  {
    name: 'Portfolio Review',
    slug: 'portfolio-review',
    problem:
      'Annual portfolio reviews require extracting current lease data across dozens or hundreds of properties to identify underperforming leases, upcoming expirations, and renegotiation opportunities. Most organizations rely on stale data in their property management systems because re-abstracting the portfolio manually is prohibitively time-consuming. This means investment decisions are made on incomplete or outdated information, and optimization opportunities are missed until they become urgent problems.',
    solution:
      'Lextract enables teams to re-abstract an entire portfolio in a single day. Upload the current lease documents, receive structured data for every tenant, and immediately identify leases with below-market rents, upcoming rollovers, or unfavorable terms. The batch export provides a clean dataset for portfolio analytics, comparison against market benchmarks, and prioritization of renegotiation targets.',
    workflowSteps: [
      {
        name: 'Upload Current Leases',
        description:
          'Portfolio workflow the most current version of each lease in the portfolio, including any executed amendments.',
      },
      {
        name: 'Extract Portfolio Data',
        description:
          'Lextract processes all documents in parallel, extracting 126 fields per lease with confidence scores.',
      },
      {
        name: 'Identify Underperformers',
        description:
          'Compare extracted rents, escalation rates, and expense structures against portfolio averages and market benchmarks.',
      },
      {
        name: 'Flag Upcoming Expirations',
        description:
          'Review lease expiration dates and renewal notice deadlines to build a proactive retention and leasing strategy.',
      },
      {
        name: 'Export for Analysis',
        description:
          'Download structured data for integration with portfolio dashboards, business intelligence tools, or financial models.',
      },
    ],
    criticalFields: [
      'base_rent_annual',
      'escalation_type',
      'fixed_escalation_rate',
      'expiration_date',
      'lease_term_months',
      'has_renewal_option',
      'renewal_terms',
      'renewal_notice_days',
      'rentable_square_footage',
      'pro_rata_share',
      'cam_cap_percentage',
      'lease_structure_type',
    ],
    relevantRedFlags: [
      'RF-003',
      'RF-009',
      'RF-011',
      'RF-001',
      'RF-004',
      'RF-008',
    ],
    relevantPersonas: [
      'asset-managers',
      'portfolio-managers',
      'property-managers',
      'tenant-representatives',
    ],
    relatedUseCases: [
      'lease-renewal-analysis',
      'lease-audit',
      'portfolio-acquisition',
    ],
    timeSaving: {
      manual: '80-160 hours for 20 leases',
      lextract: 'Under 1 hour',
      savings: '99% time reduction',
    },
    faqs: [
      {
        question: 'How often should I re-abstract my portfolio?',
        answer:
          'Best practice is to re-abstract annually or whenever a significant amendment is executed. At $15 per lease, annual re-abstraction of a 50-lease portfolio costs just $750 - far less than the cost of making decisions on stale data.',
      },
      {
        question: 'Can I compare this year\'s extraction against last year\'s data?',
        answer:
          'Yes. You can export structured data from each abstraction session and compare them in Excel or your analytics platform to track changes in rent, operating expenses, and lease terms over time.',
      },
      {
        question: 'Does Lextract integrate with portfolio management software?',
        answer:
          'Lextract exports to Excel, Word, and PDF formats. The structured 126-field Excel export maps directly to standard property management data models and can be saved as CSV for platforms that require it.',
      },
    ],
    metaTitle: 'AI-Powered Portfolio Review & Lease Analysis',
    metaDescription:
      'Streamline annual portfolio reviews with Lextract. Batch-abstract entire lease portfolios, identify underperformers, track expirations, and export structured data for analytics.',
  },
  {
    name: 'CAM Reconciliation',
    slug: 'cam-reconciliation',
    problem:
      'Year-end CAM reconciliation is one of the most complex and error-prone processes in commercial real estate. Property managers must compare actual operating expenses against estimated charges for every tenant, applying each lease\'s unique cap structure, exclusion list, base year, and pro rata share. Tenants and their representatives must verify that landlord reconciliation statements comply with lease terms. Manual reconciliation across a portfolio of even 20 leases can consume weeks of staff time, and errors in cap application or exclusion enforcement result in over- or under-billing that triggers disputes.',
    solution:
      'Lextract extracts every CAM-relevant field from each lease - cap percentages, cap types, base years, gross-up provisions, exclusion lists, management fee caps, pro rata shares, and reconciliation schedules. With this structured data, property managers can set up accurate reconciliation calculations and tenants can verify landlord statements against actual lease terms. Red flag detection automatically identifies leases with missing caps, absent gross-up provisions, or undefined reconciliation schedules before they become billing disputes. Tenants can verify their reconciliation against actual charges with <a href="https://www.camaudit.io" target="_blank" rel="noopener noreferrer">CAMAudit.io</a>. Property managers can automate the full reconciliation workflow with <a href="https://www.capveri.com" target="_blank" rel="noopener noreferrer">CapVeri.com</a>.',
    workflowSteps: [
      {
        name: 'Upload Leases',
        description:
          'Upload all tenant leases for the property or portfolio undergoing CAM reconciliation.',
      },
      {
        name: 'Extract CAM Provisions',
        description:
          'Lextract extracts cap percentages, cap types, base years, exclusion lists, gross-up provisions, management fee caps, and pro rata shares for each lease.',
      },
      {
        name: 'Review Red Flags',
        description:
          'Examine flagged leases with missing CAM caps (RF-003), cumulative caps (RF-004), absent gross-up provisions (RF-005), missing exclusions (RF-006), or undefined reconciliation schedules (RF-014).',
      },
      {
        name: 'Compare Against Statements',
        description:
          'Use extracted lease terms to verify that the landlord reconciliation statement correctly applies each tenant\'s cap, exclusions, and pro rata share.',
      },
      {
        name: 'Export Reconciliation Data',
        description:
          'Download structured CAM data as Excel for integration with reconciliation worksheets or property management billing systems.',
      },
    ],
    criticalFields: [
      'cam_cap_percentage',
      'cam_cap_type',
      'base_year',
      'gross_up_percentage',
      'management_fee_cap',
      'cam_exclusions',
      'pro_rata_share',
      'reconciliation_frequency',
      'cam_audit_deadline_days',
      'cam_estimate_method',
      'base_year_gross_up',
      'controllable_vs_noncontrollable_expenses',
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
    relevantPersonas: [
      'property-managers',
      'tenant-representatives',
      'lease-administrators',
    ],
    relatedUseCases: [
      'lease-audit',
      'portfolio-review',
      'estoppel-preparation',
    ],
    timeSaving: {
      manual: '4-8 hours per lease',
      lextract: '5–15 minutes per lease',
      savings: '94–97% time reduction',
    },
    faqs: [
      {
        question: 'Does Lextract calculate the actual CAM reconciliation?',
        answer:
          'Lextract extracts the lease terms that govern CAM reconciliation - caps, exclusions, base years, pro rata shares, and gross-up provisions. It does not perform the reconciliation calculation itself, but it provides the accurate lease data needed to set up or verify reconciliation worksheets.',
      },
      {
        question: 'How does Lextract help tenants verify landlord CAM statements?',
        answer:
          'By extracting the exact CAM provisions from the lease, Lextract enables tenant reps and attorneys to compare the landlord\'s reconciliation statement against actual lease terms. This makes it straightforward to identify if a cap was exceeded, an exclusion was ignored, or a management fee was overcharged.',
      },
      {
        question: 'What CAM-specific red flags does Lextract detect?',
        answer:
          'Lextract detects eight CAM-related red flags: excessive management fees (RF-001), missing audit rights (RF-002), no CAM cap (RF-003), cumulative caps (RF-004), missing gross-up provisions (RF-005), absent exclusion lists (RF-006), no base year gross-up (RF-013), missing reconciliation frequency (RF-014), and short audit windows (RF-015).',
      },
    ],
    metaTitle: 'AI-Powered CAM Reconciliation Lease Abstraction',
    metaDescription:
      'Simplify CAM reconciliation with Lextract. Extract cap structures, exclusion lists, base years, and pro rata shares from every lease. Detect CAM billing risks automatically.',
  },
  {
    name: 'Lease Renewal Analysis',
    slug: 'lease-renewal-analysis',
    problem:
      'Lease renewals present a critical decision point, but evaluating whether to renew, renegotiate, or relocate requires a thorough understanding of current lease terms, market conditions, and the specific renewal provisions in the existing agreement. Manually extracting renewal terms, current rent, escalation history, and holdover penalties from the existing lease takes hours. Without this data organized and readily accessible, tenants and their representatives enter negotiations without the leverage that comes from knowing exactly what the lease says.',
    solution:
      'Lextract extracts all renewal-relevant provisions from the existing lease within minutes - renewal option terms, notice deadlines, current rent and escalation structure, holdover rates, and termination penalties. This structured data enables a clear comparison between staying and moving costs. Red flag detection highlights unfavorable terms like aggressive holdover rates or missing renewal options that should factor into the decision. The export provides a clean basis for negotiation preparation.',
    workflowSteps: [
      {
        name: 'Upload Current Lease',
        description:
          'Upload the existing lease document including any amendments that modify renewal terms, rent, or other key provisions.',
      },
      {
        name: 'Review Renewal Provisions',
        description:
          'Examine extracted renewal option terms, notice periods, rent reset mechanisms, and any conditions or limitations on the renewal right.',
      },
      {
        name: 'Assess Current Economics',
        description:
          'Review current base rent, escalation schedule, operating expense structure, and TI allowance to understand the full cost of the existing occupancy.',
      },
      {
        name: 'Identify Negotiation Leverage',
        description:
          'Use red flag analysis to identify unfavorable terms in the current lease that should be renegotiated as part of any renewal.',
      },
      {
        name: 'Export for Comparison',
        description:
          'Download structured data to compare against market proposals and build a stay-vs-move financial analysis.',
      },
    ],
    criticalFields: [
      'has_renewal_option',
      'renewal_terms',
      'renewal_notice_days',
      'base_rent_annual',
      'escalation_type',
      'fixed_escalation_rate',
      'holdover_rate',
      'has_termination_option',
      'termination_penalty',
      'ti_allowance_amount',
      'cam_cap_percentage',
      'expiration_date',
    ],
    relevantRedFlags: [
      'RF-008',
      'RF-009',
      'RF-011',
      'RF-003',
      'RF-001',
    ],
    relevantPersonas: [
      'tenant-representatives',
      'commercial-brokers',
      'asset-managers',
      'portfolio-managers',
    ],
    relatedUseCases: [
      'lease-comparison',
      'lease-audit',
      'portfolio-review',
    ],
    timeSaving: {
      manual: '4-6 hours per lease',
      lextract: '5–15 minutes',
      savings: '94–97% time reduction',
    },
    faqs: [
      {
        question: 'Does Lextract extract the specific renewal option terms?',
        answer:
          'Yes. Lextract extracts renewal option details including the number of renewal periods, the length of each period, rent reset mechanisms (fair market value, fixed increase, CPI-linked), and any conditions or limitations on exercising the renewal right.',
      },
      {
        question: 'How does Lextract help with the stay-vs-move analysis?',
        answer:
          'By extracting current rent, escalation schedule, TI amortization, holdover rate, and termination penalties, Lextract provides the data needed to calculate the true cost of staying vs. relocating. This enables a data-driven comparison against market proposals.',
      },
      {
        question: 'What if my lease has been amended multiple times?',
        answer:
          'You can upload the original lease and each amendment separately, then compare extracted fields to see exactly how terms have changed over time. This is particularly useful for understanding which renewal terms are from the original lease vs. subsequent amendments.',
      },
    ],
    metaTitle: 'AI-Powered Lease Renewal Analysis',
    metaDescription:
      'Make smarter renewal decisions with Lextract. Extract renewal terms, holdover rates, and escalation schedules in minutes. Compare stay-vs-move costs with structured data.',
  },
  {
    name: 'Lease Audit',
    slug: 'lease-audit',
    problem:
      'Systematic lease audits are essential for maintaining portfolio accuracy, ensuring billing compliance, and catching costly errors - but they are rarely performed because of the time required. Auditing a single lease against property management system data requires re-reading the entire document to verify that every field in the system matches the actual lease language. Across a portfolio, this process can take months, during which billing errors, missed escalations, and incorrect expense pass-throughs continue unchecked.',
    solution:
      'Lextract makes lease audits practical by extracting structured data from the actual lease documents in minutes. The extracted fields can be directly compared against what is currently stored in the property management system to identify discrepancies. This turns a months-long manual audit into a days-long data comparison exercise. Red flag detection adds another layer by identifying provisions that may be misconfigured in billing systems, such as missing caps, incorrect reconciliation schedules, or absent exclusion lists. After extraction, tenants can run a forensic CAM audit at <a href="https://www.camaudit.io" target="_blank" rel="noopener noreferrer">CAMAudit.io</a>.',
    workflowSteps: [
      {
        name: 'Upload Lease Documents',
        description:
          'Upload the original lease and all amendments for each tenant being audited.',
      },
      {
        name: 'Extract Current Terms',
        description:
          'Lextract processes each document and extracts the 126-field structured abstract representing the current state of each lease.',
      },
      {
        name: 'Export System Data',
        description:
          'Export the corresponding lease data from your property management system for comparison.',
      },
      {
        name: 'Compare and Identify Discrepancies',
        description:
          'Compare Lextract output against system data field by field to identify where property management records do not match actual lease terms.',
      },
      {
        name: 'Remediate Errors',
        description:
          'Correct discrepancies in the property management system and adjust billing as needed for any identified over- or under-charges.',
      },
    ],
    criticalFields: [
      'base_rent_annual',
      'escalation_type',
      'fixed_escalation_rate',
      'cam_cap_percentage',
      'pro_rata_share',
      'base_year',
      'management_fee_cap',
      'reconciliation_frequency',
      'commencement_date',
      'expiration_date',
      'rent_payment_frequency',
      'security_deposit_amount',
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
    relevantPersonas: [
      'lease-administrators',
      'property-managers',
      'tenant-representatives',
    ],
    relatedUseCases: [
      'cam-reconciliation',
      'portfolio-review',
      'estoppel-preparation',
    ],
    timeSaving: {
      manual: '6-10 hours per lease',
      lextract: '5–15 minutes per lease',
      savings: '94–97% time reduction',
    },
    faqs: [
      {
        question: 'How is a lease audit different from lease abstraction?',
        answer:
          'Lease abstraction extracts data from the lease document. A lease audit compares that extracted data against what is currently stored in your property management system to identify discrepancies. Lextract handles the extraction step, making the comparison step fast and straightforward.',
      },
      {
        question: 'How often should I audit my lease portfolio?',
        answer:
          'Industry best practice is to audit every lease at least once every 2-3 years, and immediately after any system migration or major amendment. At $15 per lease, Lextract makes annual audits economically feasible for portfolios of any size.',
      },
      {
        question: 'What are the most common discrepancies found during lease audits?',
        answer:
          'The most common errors are incorrect escalation rates, wrong base years for expense pass-throughs, missing or incorrectly applied CAM caps, outdated pro rata shares after building modifications, and missed amendments that changed key economic terms.',
      },
    ],
    metaTitle: 'AI-Powered Lease Audit & Compliance Verification',
    metaDescription:
      'Make systematic lease audits practical with Lextract. Extract structured data from lease documents, compare against system records, and identify billing discrepancies in hours instead of months.',
  },
  {
    name: 'Portfolio Acquisition',
    slug: 'portfolio-acquisition',
    problem:
      'Acquiring a portfolio of commercial properties means abstracting dozens to hundreds of leases under extreme time pressure. Sellers and brokers set tight due diligence windows, and the buyer who can underwrite fastest has a competitive advantage. Hiring third-party abstraction firms adds cost and introduces 1-2 week delays. Relying on the seller\'s rent roll without independent verification creates risk of post-closing surprises - incorrect rents, undisclosed concessions, or below-market renewal options that were not factored into the purchase price.',
    solution:
      'Lextract enables acquisition teams to independently verify every lease in a portfolio within hours. The entire lease stack is uploaded and processed in parallel, producing structured abstracts that can be compared against the seller-provided rent roll. Red flags are automatically detected across all leases, creating a comprehensive risk profile for the portfolio. The structured export integrates directly with underwriting models, eliminating the manual data entry that typically introduces errors between lease documents and financial analysis.',
    workflowSteps: [
      {
        name: 'Upload Full Lease Stack',
        description:
          'Portfolio workflow all tenant leases, amendments, and subleases from the seller data room.',
      },
      {
        name: 'Process in Parallel',
        description:
          'Lextract extracts 126 fields per lease simultaneously across all documents, completing the full portfolio in a fraction of the time manual abstraction would require.',
      },
      {
        name: 'Cross-Reference Rent Roll',
        description:
          'Compare extracted base rents, lease terms, and escalation schedules against the seller-provided rent roll to identify discrepancies.',
      },
      {
        name: 'Assess Portfolio Risk Profile',
        description:
          'Review red flag distribution across all leases to understand concentrated risks, near-term rollover exposure, and below-market terms.',
      },
      {
        name: 'Export for Investment Committee',
        description:
          'Download structured data and risk summary for inclusion in investment committee packages and underwriting models.',
      },
    ],
    criticalFields: [
      'base_rent_annual',
      'escalation_type',
      'fixed_escalation_rate',
      'lease_term_months',
      'expiration_date',
      'has_renewal_option',
      'renewal_terms',
      'ti_allowance_amount',
      'security_deposit_amount',
      'has_guaranty',
      'cam_cap_percentage',
      'lease_structure_type',
    ],
    relevantRedFlags: [
      'RF-003',
      'RF-009',
      'RF-011',
      'RF-012',
      'RF-001',
      'RF-008',
    ],
    relevantPersonas: [
      'due-diligence-analysts',
      'asset-managers',
      'portfolio-managers',
    ],
    relatedUseCases: [
      'due-diligence',
      'portfolio-review',
      'lease-comparison',
    ],
    timeSaving: {
      manual: '200-400 hours for 50 leases',
      lextract: 'Under 2 hours',
      savings: '99% time reduction',
    },
    faqs: [
      {
        question: 'How does Lextract help me compete in a tight bidding process?',
        answer:
          'Speed is the primary advantage. While competitors wait 1-2 weeks for third-party abstraction or spend days on manual review, Lextract processes a 50-lease portfolio in under 2 hours. This lets you submit a more informed bid faster, with independent lease verification that gives your investment committee confidence.',
      },
      {
        question: 'Can Lextract identify undisclosed concessions or side letters?',
        answer:
          'Lextract extracts what is in the documents you upload. If concessions are documented in amendments, side letters, or the original lease, they will be extracted. If concessions are purely verbal or not documented, no abstraction tool can identify them.',
      },
      {
        question: 'What happens if the data room has incomplete lease files?',
        answer:
          'Lextract will extract whatever data is available in the uploaded documents. If a lease is incomplete, some fields will have low confidence scores or be marked as not found. This actually helps identify gaps in the data room that should be flagged to the seller.',
      },
    ],
    metaTitle: 'AI-Powered Portfolio Acquisition Lease Abstraction',
    metaDescription:
      'Win acquisitions with faster due diligence. Lextract abstracts entire portfolio lease stacks in hours, verifies rent rolls, and delivers investment-grade data for underwriting.',
  },
  {
    name: 'Lease Comparison',
    slug: 'lease-comparison',
    problem:
      'Comparing multiple lease proposals requires extracting key economic terms from each document and organizing them in a standardized format for apples-to-apples evaluation. Every landlord uses different lease templates, different terminology, and different ways of structuring the same economic concepts. Manually creating a comparison matrix from three or four proposals can take an entire day, and the result is only as accurate as the person doing the extraction. Missing a single term - like a cumulative CAM cap vs. annual cap - can make a worse deal look better on paper.',
    solution:
      'Lextract standardizes lease comparison by extracting all proposals to the same 126-field format. Upload two, three, or ten proposals and the output is directly comparable because every lease is abstracted against the same schema. Economic terms, expense structures, renewal options, and tenant improvement packages are all extracted consistently regardless of how different the source documents look. Red flag detection highlights unfavorable provisions in each proposal, making it clear which deals carry more risk.',
    workflowSteps: [
      {
        name: 'Upload Competing Proposals',
        description:
          'Upload all lease proposals or draft leases being considered. Each is processed independently against the same 126-field schema.',
      },
      {
        name: 'Review Standardized Extractions',
        description:
          'Examine the structured output for each proposal, now formatted consistently for direct comparison.',
      },
      {
        name: 'Compare Key Economics',
        description:
          'Side-by-side comparison of base rent, escalation structure, TI allowance, free rent, and operating expense pass-throughs across all proposals.',
      },
      {
        name: 'Assess Risk Per Proposal',
        description:
          'Review red flags for each proposal to understand which deals carry more landlord-favorable or risky provisions.',
      },
      {
        name: 'Export Comparison Matrix',
        description:
          'Download all proposals in a single Excel workbook with each proposal on a separate tab for easy comparison.',
      },
    ],
    criticalFields: [
      'base_rent_annual',
      'escalation_type',
      'fixed_escalation_rate',
      'ti_allowance_per_rsf',
      'rent_abatement_period',
      'lease_term_months',
      'lease_structure_type',
      'cam_cap_percentage',
      'parking_ratio',
      'has_renewal_option',
      'renewal_terms',
      'exclusive_use_rights',
    ],
    relevantRedFlags: [
      'RF-003',
      'RF-004',
      'RF-001',
      'RF-008',
      'RF-011',
    ],
    relevantPersonas: [
      'commercial-brokers',
      'tenant-representatives',
      'cre-attorneys',
    ],
    relatedUseCases: [
      'lease-renewal-analysis',
      'due-diligence',
      'sublease-review',
    ],
    timeSaving: {
      manual: '2-4 hours per proposal',
      lextract: '5–15 minutes per proposal',
      savings: '94–97% time reduction',
    },
    faqs: [
      {
        question: 'Can I compare proposals that use completely different formats?',
        answer:
          'Yes. That is one of Lextract\'s primary advantages for lease comparison. Regardless of the source format - different law firm templates, different landlord standards, even different lease structures - every document is extracted to the same 126-field schema, making direct comparison possible.',
      },
      {
        question: 'Does Lextract highlight which proposal is more favorable?',
        answer:
          'Lextract does not make subjective recommendations, but red flag detection clearly identifies which proposals contain more landlord-favorable or risky provisions. Combined with the standardized extraction, it is straightforward to determine which deal offers better terms on any specific provision.',
      },
      {
        question: 'Can I compare a renewal proposal against my current lease?',
        answer:
          'Absolutely. Upload your current lease and the renewal proposal as separate documents. Lextract will extract both to the same 126-field format, making it easy to see exactly what terms the landlord is proposing to change.',
      },
    ],
    metaTitle: 'AI-Powered Lease Comparison & Proposal Analysis',
    metaDescription:
      'Compare commercial lease proposals side by side with Lextract. Standardize every proposal to the same 126-field format for true apples-to-apples evaluation.',
  },
  {
    name: 'Sublease Review',
    slug: 'sublease-review',
    problem:
      'Sublease transactions require reviewing both the sublease agreement and the master lease to ensure compliance. The subtenant needs to verify that the sublease terms are permissible under the master lease, that consent requirements are met, and that the sublease does not expose them to risks from the master lease - like a landlord recapture right or restrictive transfer provisions. Manually cross-referencing two lengthy documents is time-intensive and easy to get wrong.',
    solution:
      'Lextract processes both the master lease and the sublease as separate documents, extracting 126 fields from each. This allows immediate comparison of the sublease terms against the master lease restrictions. Transfer provisions - consent standards, recapture rights, profit sharing, permitted transferees, and continuing liability - are all extracted from the master lease, making it clear what the sublease must comply with. Red flag detection highlights provisions in either document that create elevated risk.',
    workflowSteps: [
      {
        name: 'Upload Both Documents',
        description:
          'Upload the master lease and the sublease agreement as separate documents. Each is extracted independently.',
      },
      {
        name: 'Review Transfer Provisions',
        description:
          'Examine the master lease extraction for consent requirements, recapture rights, profit sharing obligations, and continuing liability provisions.',
      },
      {
        name: 'Compare Sublease Terms',
        description:
          'Cross-reference sublease rent, term, and use restrictions against what the master lease permits.',
      },
      {
        name: 'Identify Compliance Gaps',
        description:
          'Flag any sublease terms that may conflict with or exceed the master lease permissions.',
      },
    ],
    criticalFields: [
      'consent_required',
      'consent_standard',
      'profit_sharing_percentage',
      'recapture_right',
      'permitted_transferees',
      'continuing_liability',
      'permitted_use_description',
      'prohibited_uses',
      'base_rent_annual',
      'lease_term_months',
      'expiration_date',
      'exclusive_use_rights',
    ],
    relevantRedFlags: [
      'RF-012',
      'RF-009',
      'RF-011',
      'RF-007',
      'RF-008',
    ],
    relevantPersonas: [
      'cre-attorneys',
      'tenant-representatives',
      'commercial-brokers',
    ],
    relatedUseCases: [
      'lease-comparison',
      'amendment-review',
      'due-diligence',
    ],
    timeSaving: {
      manual: '6-10 hours for both documents',
      lextract: '5–15 minutes',
      savings: '94–97% time reduction',
    },
    faqs: [
      {
        question: 'Does Lextract automatically compare the sublease against the master lease?',
        answer:
          'Lextract extracts both documents to the same 126-field schema, making comparison straightforward. You receive two structured abstracts that can be reviewed side by side. The system does not perform automated compliance checking, but the structured data makes manual comparison fast and thorough.',
      },
      {
        question: 'What master lease provisions are most important for sublease review?',
        answer:
          'The critical master lease provisions for sublease review are: consent standard (sole discretion vs. reasonable consent), recapture right, profit sharing percentage, permitted transferee definitions, continuing liability, and any use restrictions that may limit what a subtenant can do.',
      },
      {
        question: 'Can Lextract flag if a sublease exceeds the master lease term?',
        answer:
          'Lextract extracts expiration dates and lease terms from both documents. Comparing these fields will immediately reveal if the sublease term extends beyond the master lease expiration.',
      },
    ],
    metaTitle: 'AI-Powered Sublease Review & Analysis',
    metaDescription:
      'Review subleases with confidence using Lextract. Extract and compare sublease terms against the master lease. Verify compliance with consent, transfer, and use restrictions.',
  },
  {
    name: 'Amendment Review',
    slug: 'amendment-review',
    problem:
      'Commercial leases are frequently amended over their lifetime - sometimes three, five, or even ten times. Each amendment modifies specific provisions while leaving others unchanged, creating a layered document trail that becomes increasingly difficult to interpret. Determining the current state of any given lease term requires reading the original lease plus every amendment in sequence. Missing an amendment that modified the escalation rate or changed the renewal terms can lead to incorrect billing, missed deadlines, and misinformed decisions.',
    solution:
      'Lextract processes each amendment as a standalone document, extracting the modified terms into the same 126-field structure. By comparing the extraction of the original lease against each amendment, users can see exactly which fields were changed and when. This creates a clear audit trail of lease modifications without needing to re-read every document. For leases with many amendments, this systematic approach is far more reliable than manual tracking.',
    workflowSteps: [
      {
        name: 'Upload Original and Amendments',
        description:
          'Upload the original lease and each amendment as separate documents. Lextract processes each independently.',
      },
      {
        name: 'Extract Modified Terms',
        description:
          'Review the extraction for each amendment, noting which of the 126 fields contain data indicating modified provisions.',
      },
      {
        name: 'Track Changes Over Time',
        description:
          'Compare extractions chronologically to build a complete picture of how the lease terms have evolved from the original agreement through each amendment.',
      },
      {
        name: 'Determine Current Terms',
        description:
          'Identify the most current version of each provision by applying amendment modifications in sequence against the original lease extraction.',
      },
      {
        name: 'Export Amendment Summary',
        description:
          'Download a structured summary showing original terms, modified terms, and the amendment that made each change.',
      },
    ],
    criticalFields: [
      'base_rent_annual',
      'escalation_type',
      'fixed_escalation_rate',
      'expiration_date',
      'lease_term_months',
      'has_renewal_option',
      'renewal_terms',
      'cam_cap_percentage',
      'permitted_use_description',
      'tenant_legal_name',
      'rentable_square_footage',
      'ti_allowance_amount',
    ],
    relevantRedFlags: [
      'RF-003',
      'RF-008',
      'RF-009',
      'RF-011',
      'RF-001',
    ],
    relevantPersonas: [
      'cre-attorneys',
      'lease-administrators',
      'tenant-representatives',
    ],
    relatedUseCases: [
      'lease-audit',
      'lease-renewal-analysis',
      'sublease-review',
    ],
    timeSaving: {
      manual: '2-4 hours per amendment',
      lextract: '5–15 minutes per amendment',
      savings: '94–97% time reduction',
    },
    faqs: [
      {
        question: 'Can Lextract tell me exactly what changed in an amendment?',
        answer:
          'Lextract extracts each amendment to the same 126-field schema as the original lease. By comparing the fields that contain data in the amendment extraction against the original, you can identify exactly which provisions were modified. Fields not addressed by the amendment will typically not appear in the amendment extraction.',
      },
      {
        question: 'How does Lextract handle a lease with 5+ amendments?',
        answer:
          'Upload each document separately and Lextract will extract them all. You can then review them in chronological order to track the evolution of terms. The cost is $15 per document, so a lease with 5 amendments would cost $90 total for the original plus all amendments.',
      },
      {
        question: 'Can Lextract create a consolidated view of the current lease terms?',
        answer:
          'Lextract extracts each document independently. To determine current terms, you would compare extractions in chronological order, with each amendment\'s terms superseding the prior version. The structured format makes this comparison straightforward in Excel.',
      },
    ],
    metaTitle: 'AI-Powered Lease Amendment Review',
    metaDescription:
      'Track lease amendments systematically with Lextract. Extract modified terms from each amendment, compare against original provisions, and determine current lease terms with confidence.',
  },
  {
    name: 'Estoppel Preparation',
    slug: 'estoppel-preparation',
    problem:
      'Estoppel certificates must accurately state the current terms of a lease - rent, expiration date, security deposit, outstanding landlord obligations, and any defaults. Preparing estoppels requires re-reading the entire lease plus all amendments to extract these specific data points. When a property is being sold or refinanced, dozens of estoppels may be needed simultaneously under tight deadlines. Errors in estoppel certificates can create binding legal obligations if the receiving party relies on inaccurate information.',
    solution:
      'Lextract extracts all estoppel-relevant fields from the lease and amendments in minutes - base rent, commencement and expiration dates, security deposit amounts, TI allowance details, renewal options, and outstanding obligations. This structured data can be used to populate estoppel certificate templates quickly and accurately. Instead of re-reading each lease to fill out the certificate, administrators simply transfer verified extracted data into the estoppel form.',
    workflowSteps: [
      {
        name: 'Upload Lease and Amendments',
        description:
          'Upload the original lease and all amendments for each tenant requiring an estoppel certificate.',
      },
      {
        name: 'Extract Estoppel-Relevant Fields',
        description:
          'Lextract extracts base rent, commencement date, expiration date, security deposit, TI allowance, renewal options, and other fields needed for the estoppel.',
      },
      {
        name: 'Verify Extracted Data',
        description:
          'Review extracted fields and confidence scores, manually verifying any fields with lower confidence before populating the estoppel form.',
      },
      {
        name: 'Populate Estoppel Template',
        description:
          'Transfer verified data into your estoppel certificate template. The structured format maps directly to standard estoppel fields.',
      },
    ],
    criticalFields: [
      'base_rent_annual',
      'commencement_date',
      'expiration_date',
      'security_deposit_amount',
      'security_deposit_type',
      'ti_allowance_amount',
      'landlord_work_description',
      'has_renewal_option',
      'renewal_terms',
      'rent_abatement_period',
      'estoppel_turnaround_days',
      'rent_commencement_date',
    ],
    relevantRedFlags: [
      'RF-009',
      'RF-011',
      'RF-003',
      'RF-010',
    ],
    relevantPersonas: [
      'lease-administrators',
      'property-managers',
      'cre-attorneys',
    ],
    relatedUseCases: [
      'lease-audit',
      'portfolio-review',
      'cam-reconciliation',
    ],
    timeSaving: {
      manual: '2-3 hours per estoppel',
      lextract: '5–15 minutes per lease',
      savings: '94–97% time reduction',
    },
    faqs: [
      {
        question: 'Does Lextract generate the estoppel certificate itself?',
        answer:
          'Lextract extracts the data needed to populate an estoppel certificate - it does not generate the legal document itself. The structured extraction provides all the key data points (rent, dates, deposits, options) that go into a standard estoppel form, making the population step fast and accurate.',
      },
      {
        question: 'What fields are most critical for estoppel preparation?',
        answer:
          'The most critical estoppel fields are current base rent, rent commencement date, lease expiration date, security deposit amount and type, TI allowance details, renewal option terms, and any outstanding landlord work obligations. Lextract extracts all of these.',
      },
      {
        question: 'Can I prepare 50 estoppels at once for a property sale?',
        answer:
          'Yes. Portfolio workflow all 50 tenant leases and Lextract will process them in parallel. Each extraction typically takes 5–15 minutes, and the structured output for all 50 tenants can be exported to Excel for efficient estoppel preparation.',
      },
    ],
    metaTitle: 'AI-Powered Estoppel Certificate Preparation',
    metaDescription:
      'Prepare estoppel certificates faster with Lextract. Extract rent, dates, deposits, and renewal terms from every lease. Populate estoppel templates with verified, structured data.',
  },
]

// ─── Helper Functions ──────────────────────────────────────────────

/**
 * Find a use case by its URL slug.
 */
export function getUseCaseBySlug(slug: string): UseCaseData | undefined {
  return USE_CASES.find((uc) => uc.slug === slug)
}

/**
 * Get all use case slugs for static generation.
 */
export function getAllUseCaseSlugs(): string[] {
  return USE_CASES.map((uc) => uc.slug)
}
