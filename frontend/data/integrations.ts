// ─── Integration Types ───────────────────────────────────────────────

import {
  filterRetainedSeoItems,
  getExplicitSeoRedirect,
  isRetainedSeoSlug,
} from '@/lib/seo-inventory'

export interface Integration {
  software: string
  slug: string
  vendor: string
  category: 'property-management' | 'lease-management' | 'investment-management' | 'accounting' | 'analytics' | 'spreadsheets' | 'document-management' | 'legal' | 'crm-data' | 'compliance' | 'productivity' | 'cam-audit'
  overview: string
  howLextractHelps: string
  exportFormats: string[]
  workflowSteps: string[]
  criticalFields: string[]
  faqs: Array<{ question: string; answer: string }>
  metaTitle: string
  metaDescription: string
  relatedIntegrations?: string[]
}

// ─── Integration Data ────────────────────────────────────────────────

export const INTEGRATIONS: Integration[] = [
  {
    software: 'Yardi Voyager',
    slug: 'yardi-voyager',
    vendor: 'Yardi Systems',
    category: 'property-management',
    overview:
      'Yardi Voyager is the industry-leading property management and accounting platform used by commercial and multifamily real estate owners and managers globally. It centralizes lease administration, accounts payable, general ledger, and tenant billing in a single system. Voyager\'s lease module supports full lifecycle management from lease entry through CAM reconciliation and critical date tracking.',
    howLextractHelps:
      'Lextract extracts all 126 lease fields into a structured Excel workbook that maps to Yardi Voyager\'s lease entry screens. After uploading a lease PDF to Lextract, your team receives a clean handoff file for Voyager lease commencement, rent schedule, and option tracking modules. This reduces abstraction time from hours to minutes and cuts transcription errors that commonly occur when manually keying lease terms.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Upload the executed lease PDF to Lextract and receive extracted data in 5–15 minutes',
      'Download the Excel handoff formatted for Yardi Voyager lease entry fields',
      'Review high-confidence fields and verify any medium or low-confidence extractions against the source document',
      'Use the workbook to populate Yardi Voyager\'s lease module using your standard internal template',
      'Verify rent schedules, critical dates, and option data populated correctly in Voyager',
      'Archive the Lextract Excel, Word, or PDF output alongside the lease document in Voyager\'s document management system',
    ],
    criticalFields: [
      'landlord-legal-name',
      'tenant-legal-name',
      'premises-address',
      'commencement-date',
      'expiration-date',
      'base-rent',
      'cam-estimate',
      'renewal-options',
      'security-deposit',
    ],
    faqs: [
      {
        question: 'Does Lextract integrate directly with Yardi Voyager via API?',
        answer:
          'Lextract currently provides Excel, Word, and PDF exports that support Yardi Voyager data-entry workflows. Direct API integration with Yardi is on the product roadmap. For now, the structured handoff workflow takes approximately 15 minutes per lease compared to 4-8 hours for manual entry.',
      },
      {
        question: 'Which Yardi Voyager modules benefit most from Lextract data?',
        answer:
          'The primary modules are: Lease Administration (commencement, expiration, rent schedules), Critical Dates (option notice deadlines), CAM Reconciliation (pro-rata share, CAM caps, exclusions), and Charge Codes (base rent, CAM estimates, insurance, tax). The options module requires manual setup but benefits from the extracted option terms and notice periods.',
      },
      {
        question: 'How do I handle lease amendments in Yardi after using Lextract?',
        answer:
          'Upload the amendment PDF to Lextract separately and extract only the modified fields. Then update the specific fields in Voyager using the amendment data. Lextract clearly identifies which fields are being modified by the amendment versus preserved from the original lease.',
      },
    ],
    metaTitle: 'Lease Abstraction for Yardi Voyager - Import Ready Excel',
    metaDescription:
      'Extract commercial lease data into a Yardi Voyager-ready Excel handoff. Lextract outputs 126 structured fields in 5-15 minutes, ready for Voyager lease module entry.',
  },
  {
    software: 'MRI Software',
    slug: 'mri-software',
    vendor: 'MRI Software',
    category: 'property-management',
    overview:
      'MRI Software is a comprehensive real estate management platform serving commercial, residential, and investment management clients across lease administration, financial management, and facilities. MRI\'s commercial suite handles the full lease lifecycle from proposal through CAM reconciliation and reporting. It is particularly strong for complex lease structures, multi-currency portfolios, and investment management use cases.',
    howLextractHelps:
      'Lextract outputs lease data in MRI-compatible formats, mapping extracted fields to MRI\'s lease commencement, charge schedule, and option tracking data structures. Teams using MRI for commercial lease management can eliminate the manual lease entry bottleneck by running all new leases through Lextract first, then importing the structured output. This is especially valuable for high-volume acquisition portfolios where dozens of leases need to be entered into MRI quickly.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Upload executed lease PDF to Lextract and receive the 126-field extraction report',
      'Download the Excel export with fields mapped to MRI\'s lease entry schema',
      'Review confidence scores and verify medium/low-confidence fields against the source lease',
      'Use MRI\'s lease import template to load base lease data, rent schedules, and critical dates',
      'Manually enter options data using Lextract\'s extracted option terms as the source',
      'Run MRI\'s lease data validation to confirm all required fields populated correctly',
    ],
    criticalFields: [
      'landlord-legal-name',
      'tenant-legal-name',
      'commencement-date',
      'expiration-date',
      'base-rent',
      'cam-estimate',
      'pro-rata-share',
      'renewal-options',
      'notice-requirements',
    ],
    faqs: [
      {
        question: 'Can Lextract data be used with MRI\'s ProLease module?',
        answer:
          'Yes. Lextract\'s Excel export can be mapped to MRI ProLease\'s data fields for ASC 842 and IFRS 16 lease accounting. The critical data points - commencement date, term, lease payments, renewal options, and discount rates - are all extracted by Lextract and can be formatted for ProLease import.',
      },
      {
        question: 'How does Lextract handle MRI\'s charge code structure?',
        answer:
          'Lextract extracts all rent and expense components separately: base rent, CAM estimate, real estate taxes, and insurance. Each component maps to a separate MRI charge code. The Excel export labels each line item with the corresponding MRI charge code naming convention to simplify the import process.',
      },
    ],
    metaTitle: 'Lease Abstraction for MRI Software - Structured Data Import',
    metaDescription:
      'Prepare commercial lease data for MRI Software import. Lextract extracts 126 fields from lease PDFs in minutes, formatted for MRI lease administration modules.',
  },
  {
    software: 'ARGUS Enterprise',
    slug: 'argus-enterprise',
    vendor: 'Altus Group',
    category: 'analytics',
    overview:
      'ARGUS Enterprise is the industry-standard commercial real estate valuation and cash flow modeling platform, used by institutional investors, REITs, and investment managers to underwrite acquisitions and manage asset performance. ARGUS models lease-by-lease cash flows, vacancy assumptions, market rent projections, and sale pricing, requiring precise lease data as inputs. Errors in lease data entry directly affect DCF valuations and investment committee presentations.',
    howLextractHelps:
      'ARGUS models depend on accurate lease inputs - any error in commencement dates, rent schedules, or option terms directly distorts the property\'s projected cash flows and valuation. Lextract eliminates data entry errors by extracting all economically critical lease fields with confidence scores, providing a verified source of truth before data is entered into ARGUS. For acquisition due diligence where 20-50 leases need to be modeled quickly, Lextract dramatically accelerates the underwriting process.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Upload all property leases to Lextract during the due diligence period',
      'Download the Excel output with all rent schedules, escalations, options, and expense data',
      'Review red flags - particularly missing renewal options and CAM cap provisions affecting cash flow',
      'Build ARGUS model using Lextract data as the verified source for all lease inputs',
      'Cross-reference Lextract extractions against the rent roll provided by the seller',
      'Document any discrepancies between Lextract data and the seller\'s rent roll for price negotiation',
    ],
    criticalFields: [
      'base-rent',
      'rent-escalation',
      'commencement-date',
      'expiration-date',
      'renewal-options',
      'cam-estimate',
      'cam-cap',
      'termination-option',
      'free-rent',
      'ti-allowance',
    ],
    faqs: [
      {
        question: 'Which ARGUS data fields does Lextract populate?',
        answer:
          'Lextract directly populates the most critical ARGUS inputs: lease commencement and expiration, base rent by year, CPI and fixed escalations, expense reimbursement structure (gross, NNN, modified gross), CAM estimates, renewal options (term, rent basis, notice period), termination options, and TI allowance. These account for the majority of manual data entry time in ARGUS modeling.',
      },
      {
        question: 'How does Lextract help with the rent roll verification process?',
        answer:
          'Lextract extracts data directly from the executed lease documents - the legal source of truth. Comparing the Lextract extraction against the seller\'s rent roll identifies any discrepancies in quoted rents, lease dates, or option structures. This is a standard quality-control step in institutional due diligence that Lextract makes faster and more systematic.',
      },
      {
        question: 'Can Lextract process anchor tenant leases with complex percentage rent structures?',
        answer:
          'Yes. Lextract extracts percentage rent provisions including breakpoint types (natural vs. artificial), percentage rate, and sales reporting requirements. These are flagged as complex extractions with confidence scores, and the raw lease language is preserved for review when the structure involves multiple percentage rent tiers.',
      },
    ],
    metaTitle: 'Lease Abstraction for ARGUS Enterprise - CRE Underwriting Data',
    metaDescription:
      'Prepare accurate lease data for ARGUS Enterprise cash flow modeling. Lextract extracts rent schedules, escalations, options, and CAM data from lease PDFs in minutes.',
  },
  {
    software: 'CoStar Suite',
    slug: 'costar-suite',
    vendor: 'CoStar Group',
    category: 'analytics',
    overview:
      'CoStar Suite is the leading commercial real estate data and analytics platform, providing market data, comparable transactions, property analytics, and portfolio management tools to brokers, owners, and investors. CoStar\'s portfolio and lease management features allow users to track lease data alongside market benchmarks, enabling real-time comparison of in-place rents against current market conditions.',
    howLextractHelps:
      'Lextract provides the lease-level data that populates CoStar\'s portfolio management and lease tracking features. Rather than manually entering lease terms into CoStar, teams can extract data from lease PDFs and import the structured output. This is particularly useful for portfolio managers tracking lease expirations and comparing in-place rents against CoStar\'s market rent data to identify below-market and above-market leases.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Extract all portfolio leases through Lextract to build a complete data set',
      'Export lease data to Excel and map to CoStar\'s lease import template',
      'Import lease data into CoStar portfolio management module',
      'Use CoStar\'s market rent data to compare in-place rents against extracted base rents',
      'Flag below-market leases for renewal negotiation strategy and above-market leases for disposition planning',
      'Set lease expiration alerts in CoStar based on extracted expiration dates and option deadlines',
    ],
    criticalFields: [
      'premises-address',
      'rentable-area',
      'base-rent',
      'commencement-date',
      'expiration-date',
      'renewal-options',
      'lease-type',
    ],
    faqs: [
      {
        question: 'Can I import lease data from Lextract directly into CoStar?',
        answer:
          'CoStar supports lease data import via its portfolio management module using a standard Excel template. Lextract\'s Excel export can be formatted to match CoStar\'s import schema, allowing direct upload. The key fields for CoStar lease tracking - property address, tenant, rent, term, and expiration - are all high-confidence extractions in Lextract.',
      },
      {
        question: 'How does Lextract improve lease expiration tracking in CoStar?',
        answer:
          'Accurate expiration dates and option notice deadlines extracted by Lextract feed into CoStar\'s lease roll analysis, allowing users to build precise 1-, 3-, and 5-year lease expiration forecasts. This is especially valuable for portfolio-level reporting to investment committees and lenders who need to understand rollover risk.',
      },
    ],
    metaTitle: 'Lease Abstraction for CoStar Suite - Portfolio Data Management',
    metaDescription:
      'Populate CoStar Suite with accurate lease data. Lextract extracts rent, term, and option data from lease PDFs for CoStar portfolio management and market analysis.',
  },
  {
    software: 'RealPage',
    slug: 'realpage',
    vendor: 'RealPage, Inc.',
    category: 'property-management',
    overview:
      'RealPage is a comprehensive real estate software platform serving commercial and residential property managers, offering solutions for lease management, accounting, revenue management, and analytics. RealPage\'s commercial platform handles lease administration, CAM reconciliation, and tenant billing with deep integration across property management workflows. The platform is widely used for retail, office, and industrial portfolios.',
    howLextractHelps:
      'Lextract accelerates lease data entry for RealPage by extracting all lease terms, rent schedules, and CAM provisions into a structured format ready for import. For portfolio managers onboarding new acquisitions into RealPage, Lextract eliminates the manual data entry bottleneck that delays system go-live dates. The red flag detection also alerts teams to CAM provisions that require special configuration in RealPage\'s reconciliation module.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Upload executed lease PDFs to Lextract for extraction',
      'Review extraction results and download an Excel handoff for RealPage lease entry',
      'Import base lease data, tenant information, and premises details into RealPage',
      'Configure rent schedules using extracted escalation amounts and effective dates',
      'Set up CAM charge codes using extracted estimate, pro-rata share, and cap provisions',
      'Enter option terms and set critical date alerts in RealPage\'s lease administration module',
    ],
    criticalFields: [
      'tenant-legal-name',
      'premises-address',
      'rentable-area',
      'commencement-date',
      'expiration-date',
      'base-rent',
      'cam-estimate',
      'pro-rata-share',
      'renewal-options',
    ],
    faqs: [
      {
        question: 'How does Lextract handle RealPage\'s charge type structure?',
        answer:
          'Lextract extracts each rent and reimbursement component separately - base rent, estimated CAM, estimated taxes, and estimated insurance - which correspond to individual RealPage charge types. This separation enables accurate charge type configuration without requiring users to manually parse the lease for each component amount.',
      },
      {
        question: 'Can Lextract help with RealPage CAM reconciliation setup?',
        answer:
          'Yes. The CAM-specific fields Lextract extracts - pro-rata share percentage, CAM cap type and rate, exclusion list, management fee cap, and gross-up provisions - directly inform how RealPage\'s CAM reconciliation module needs to be configured for each tenant. Having these fields extracted and verified before setup reduces CAM configuration errors.',
      },
    ],
    metaTitle: 'Lease Abstraction for RealPage - Structured Lease Data Import',
    metaDescription:
      'Prepare lease data for RealPage property management. Lextract extracts all CAM provisions, rent schedules, and options from lease PDFs for RealPage import.',
  },
  {
    software: 'AppFolio',
    slug: 'appfolio',
    vendor: 'AppFolio, Inc.',
    category: 'property-management',
    overview:
      'AppFolio Property Manager is a cloud-based property management platform primarily serving residential and small-to-midsize commercial property managers. It offers lease management, online rent collection, maintenance tracking, and accounting in an intuitive interface. AppFolio is particularly popular with boutique commercial landlords, mixed-use property owners, and property management companies managing diverse portfolios.',
    howLextractHelps:
      'For AppFolio users managing commercial leases alongside residential units, Lextract extracts the commercial lease terms that are more complex than AppFolio\'s native lease builder handles - particularly CAM provisions, option structures, and multi-year rent escalation schedules. The structured output ensures that commercial lease data is entered accurately, even when the lease structure is more complex than typical residential leases.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Upload commercial lease PDFs to Lextract for extraction',
      'Download the Excel workbook with extracted lease terms, rent schedules, and options',
      'Create the lease in AppFolio using extracted party names, premises, and term dates',
      'Configure rent amounts and escalation schedule using Lextract\'s extracted data',
      'Document CAM provisions in AppFolio\'s notes or custom fields using Lextract\'s CAM extraction',
      'Set critical date reminders in AppFolio based on extracted option notice deadlines',
    ],
    criticalFields: [
      'tenant-legal-name',
      'premises-address',
      'commencement-date',
      'expiration-date',
      'base-rent',
      'security-deposit',
      'renewal-options',
    ],
    faqs: [
      {
        question: 'Does AppFolio support NNN lease CAM reconciliation natively?',
        answer:
          'AppFolio\'s commercial functionality is more limited than enterprise platforms like Yardi or MRI for complex NNN lease CAM reconciliations. For portfolios with complex CAM structures, many AppFolio users supplement with a spreadsheet-based reconciliation process and use Lextract to ensure the underlying lease terms are accurately documented.',
      },
      {
        question: 'How should I handle multi-year rent escalations in AppFolio?',
        answer:
          'Lextract extracts each year\'s base rent amount and effective date in the escalation schedule. In AppFolio, you can set future rent increases using the lease terms section. Having the precise escalation amounts and dates from Lextract eliminates guesswork and ensures rent increases are applied on the correct date.',
      },
    ],
    metaTitle: 'Lease Abstraction for AppFolio - Commercial Lease Data',
    metaDescription:
      'Extract commercial lease data for AppFolio property management. Lextract provides accurate rent schedules, CAM terms, and option data for AppFolio lease setup.',
  },
  {
    software: 'Buildium',
    slug: 'buildium',
    vendor: 'RealPage, Inc.',
    category: 'property-management',
    overview:
      'Buildium is a property management platform targeting small-to-midsize property managers and landlords, offering lease management, accounting, maintenance, and tenant communication tools. While Buildium is primarily designed for residential property management, it is used by mixed-use property managers and small commercial landlords who need an affordable, user-friendly platform for managing a limited number of commercial tenants.',
    howLextractHelps:
      'Buildium\'s commercial lease handling is focused on essential terms rather than complex NNN structures. Lextract helps Buildium users accurately capture commercial lease terms that go beyond Buildium\'s native fields, particularly multi-year rent schedules, CAM provisions, and option notice requirements. The structured extraction also serves as a standalone abstract that supplements Buildium\'s lease record for compliance and risk management purposes.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Run commercial leases through Lextract to get a complete 126-field extraction',
      'Use extracted lease dates, rent, and party information to set up the lease in Buildium',
      'Store the Lextract Excel export as a document attachment to the Buildium lease record',
      'Use extracted critical dates to configure Buildium\'s lease expiration alerts',
      'Maintain the Lextract abstract as the reference document for CAM provisions not natively tracked in Buildium',
    ],
    criticalFields: [
      'tenant-legal-name',
      'commencement-date',
      'expiration-date',
      'base-rent',
      'security-deposit',
      'renewal-options',
    ],
    faqs: [
      {
        question: 'Is Buildium suitable for managing NNN commercial leases?',
        answer:
          'Buildium is workable for simple gross leases and leases with straightforward expense pass-throughs, but it lacks the CAM reconciliation, audit rights tracking, and complex charge code functionality required for full NNN lease management. Users with significant commercial portfolios typically graduate to Yardi or MRI as their portfolio grows.',
      },
    ],
    metaTitle: 'Lease Abstraction for Buildium - Commercial Lease Data',
    metaDescription:
      'Extract commercial lease terms for Buildium property management. Lextract provides complete lease abstracts that supplement Buildium\'s lease records for commercial tenants.',
  },
  {
    software: 'Visual Lease',
    slug: 'visual-lease',
    vendor: 'Visual Lease',
    category: 'lease-management',
    overview:
      'Visual Lease is a purpose-built lease accounting and administration platform designed to help companies comply with ASC 842 and IFRS 16 lease accounting standards. It serves corporate tenants and occupiers managing large lease portfolios across multiple locations. Visual Lease provides lease data management, right-of-use asset calculations, financial reporting, and audit trail documentation required for lease accounting compliance.',
    howLextractHelps:
      'Visual Lease requires accurate lease data as the foundation of all ASC 842 and IFRS 16 calculations. Errors in lease terms - particularly commencement dates, payment schedules, option information, and renewal probabilities - directly affect balance sheet reporting. Lextract provides a verified source of lease data before entry into Visual Lease, and its red flag detection identifies provisions like implicit rate information and variable lease payment structures that require special accounting treatment.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Upload lease PDFs to Lextract to extract all terms relevant to ASC 842 classification',
      'Identify renewal and termination options with high confidence using Lextract\'s extraction',
      'Assess option exercise probability based on extracted option terms and economic factors',
      'Download Lextract data in Visual Lease\'s preferred import format',
      'Import lease commencement, payment schedule, and option data into Visual Lease',
      'Run ASC 842 right-of-use asset and lease liability calculations using the verified data',
    ],
    criticalFields: [
      'commencement-date',
      'expiration-date',
      'base-rent',
      'rent-escalation',
      'renewal-options',
      'termination-option',
      'lease-type',
      'free-rent',
    ],
    faqs: [
      {
        question: 'How does Lextract support ASC 842 compliance?',
        answer:
          'ASC 842 requires companies to recognize right-of-use assets and lease liabilities for all leases with terms over 12 months. Lextract extracts the lease classification inputs: commencement date, lease term, payment schedule including escalations, renewal options with exercise criteria, and any variable payment provisions. These extracted values feed directly into Visual Lease\'s accounting engine.',
      },
      {
        question: 'Which Lextract fields are most important for lease accounting?',
        answer:
          'The highest-priority fields for ASC 842 are: commencement date, expiration date, all fixed and variable payment amounts, escalation rates and effective dates, renewal options (with exercise criteria), termination options (with penalty amounts), and any tenant improvement allowances that represent landlord assets. All of these are extracted by Lextract.',
      },
      {
        question: 'How should renewal options be handled in Visual Lease when using Lextract data?',
        answer:
          'Lextract extracts the renewal option terms - number of options, term length, rent basis, and notice period. In Visual Lease, you must separately assess the probability of exercise (reasonably certain under ASC 842). Lextract provides the fact pattern; your accounting team makes the probability judgment. The option notice deadline extracted by Lextract is critical for planning the renewal assessment.',
      },
    ],
    metaTitle: 'Lease Abstraction for Visual Lease - ASC 842 Data Preparation',
    metaDescription:
      'Prepare accurate lease data for Visual Lease ASC 842 compliance. Lextract extracts all lease accounting inputs from PDFs: payments, terms, and renewal options.',
  },
  {
    software: 'LeaseQuery',
    slug: 'leasequery',
    vendor: 'LeaseQuery',
    category: 'accounting',
    overview:
      'LeaseQuery is a purpose-built lease accounting software designed to ensure compliance with ASC 842, IFRS 16, and GASB 87 lease accounting standards. It serves mid-market and enterprise companies with complex lease portfolios, providing automated journal entries, disclosure reporting, and audit-ready documentation. LeaseQuery integrates with major ERP systems including NetSuite, Sage Intacct, and Microsoft Dynamics.',
    howLextractHelps:
      'LeaseQuery\'s accuracy depends entirely on the quality of lease data entered - incorrect commencement dates, missed variable escalations, or unidentified renewal options can cause material misstatements in lease accounting. Lextract provides a systematic extraction of all economically relevant lease terms before data entry into LeaseQuery, dramatically reducing the risk of input errors that lead to audit findings or restatements.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Upload all leases subject to ASC 842 or IFRS 16 to Lextract',
      'Review the extracted payment schedule, term, and options for each lease',
      'Flag any leases with variable lease payments or complex escalation structures for accounting team review',
      'Export Lextract data to LeaseQuery\'s standard import template',
      'Import lease data into LeaseQuery and run initial right-of-use asset and liability calculations',
      'Review journal entries and disclosure footnotes for reasonableness against Lextract source data',
    ],
    criticalFields: [
      'commencement-date',
      'expiration-date',
      'base-rent',
      'rent-escalation',
      'free-rent',
      'renewal-options',
      'termination-option',
      'lease-type',
    ],
    faqs: [
      {
        question: 'What is the risk of entering incorrect lease data in LeaseQuery?',
        answer:
          'Errors in lease data - particularly commencement dates, payment amounts, and option identification - can result in material misstatements in right-of-use assets and lease liabilities. For public companies, this can trigger material weakness findings in SOX audits. For private companies, it creates restatement risk if errors are discovered during financing or sale processes.',
      },
      {
        question: 'How does Lextract handle CPI-escalated lease payments?',
        answer:
          'Lextract extracts CPI escalation provisions including the index used, base index date, measurement frequency, and any cap on annual increases. Under ASC 842, variable lease payments tied to an index are measured using the index rate at the commencement date. Lextract extracts all the parameters needed to make this initial measurement and identify when reassessment is required.',
      },
    ],
    metaTitle: 'Lease Abstraction for LeaseQuery - ASC 842 IFRS 16 Data',
    metaDescription:
      'Prepare accurate lease data for LeaseQuery ASC 842 compliance. Lextract systematically extracts all lease accounting inputs to eliminate data entry errors.',
  },
  {
    software: 'Juniper Square',
    slug: 'juniper-square',
    vendor: 'Juniper Square',
    category: 'investment-management',
    overview:
      'Juniper Square is an investment management platform for private real estate funds, providing tools for investor reporting, capital call management, distribution tracking, and portfolio analytics. It is widely used by real estate private equity firms, fund managers, and family offices managing institutional real estate portfolios. Juniper Square\'s portfolio management module tracks asset-level performance, which requires accurate lease data as the foundation of income modeling.',
    howLextractHelps:
      'For investment managers using Juniper Square, lease data accuracy is fundamental to asset performance reporting and investor communications. Lextract ensures that lease terms entered into Juniper Square\'s portfolio module are accurate and complete, including all economic provisions that affect net operating income projections. The red flag detection also surfaces lease risks that should be disclosed in investor reports or factored into hold/sell analysis.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Run all asset leases through Lextract during acquisition due diligence or onboarding',
      'Use the Excel export to build the lease roll for Juniper Square\'s portfolio module',
      'Document rent roll accuracy by comparing Lextract extractions to seller-provided data',
      'Enter lease data into Juniper Square with expiration dates and option data for NOI forecasting',
      'Use Lextract\'s red flag report to identify lease risks for investor disclosure documents',
      'Update Juniper Square with new lease data each time a new lease is executed at an asset',
    ],
    criticalFields: [
      'base-rent',
      'rent-escalation',
      'commencement-date',
      'expiration-date',
      'renewal-options',
      'cam-estimate',
      'termination-option',
      'ti-allowance',
    ],
    faqs: [
      {
        question: 'How does Lextract support investor reporting accuracy?',
        answer:
          'Investor reports that include lease roll, lease expiration schedules, and NOI projections are only as accurate as the underlying lease data. Lextract provides a systematic quality check on all lease data, with confidence scores flagging any fields that warrant manual review. This creates an audit trail documenting that lease data was independently verified before use in investor reporting.',
      },
      {
        question: 'Can Lextract data be used to build the lease schedule for a fund\'s annual report?',
        answer:
          'Yes. Lextract\'s Excel export can be structured to output tenant name, premises, rentable area, commencement date, expiration date, current rent, escalation rate, and option summary - the standard fields in a commercial real estate portfolio lease schedule. This output can be directly formatted into the lease schedule table in your fund\'s annual report.',
      },
    ],
    metaTitle: 'Lease Abstraction for Juniper Square - Real Estate Fund Portfolio Data',
    metaDescription:
      'Populate Juniper Square portfolio management with accurate lease data. Lextract extracts rent rolls, lease terms, and option data for CRE fund reporting.',
  },
  {
    software: 'IBM TRIRIGA',
    slug: 'tririga',
    vendor: 'IBM',
    category: 'lease-management',
    overview:
      'IBM TRIRIGA is an enterprise real estate and facilities management platform used by large corporate occupiers to manage their entire real estate portfolio - from lease administration and space management to facilities maintenance and energy management. TRIRIGA\'s lease administration module supports ASC 842/IFRS 16 compliance, critical date tracking, CAM reconciliation, and portfolio-wide reporting. It is commonly deployed by Fortune 500 companies managing hundreds of locations globally.',
    howLextractHelps:
      'TRIRIGA\'s power comes from the quality of the lease data that populates it - manual data entry at scale is error-prone and time-consuming. Lextract enables corporate real estate teams to extract lease data systematically from PDFs and import it into TRIRIGA\'s lease module, maintaining data quality across large, complex portfolios. This is particularly valuable during portfolio migrations, M&A lease portfolio integration, and ASC 842 initial adoption projects.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Upload all lease PDFs to Lextract as part of the TRIRIGA data migration project',
      'Use Lextract\'s batch extraction to process all leases in parallel',
      'Review extraction results with confidence scores and resolve any low-confidence fields',
      'Map Lextract fields to TRIRIGA\'s lease record schema using the provided field mapping guide',
      'Import data into TRIRIGA using the TRIRIGA Application Builder import template',
      'Validate data quality in TRIRIGA by spot-checking against original lease documents',
    ],
    criticalFields: [
      'landlord-legal-name',
      'tenant-legal-name',
      'premises-address',
      'rentable-area',
      'commencement-date',
      'expiration-date',
      'base-rent',
      'cam-estimate',
      'renewal-options',
      'notice-requirements',
    ],
    faqs: [
      {
        question: 'Is Lextract suitable for large TRIRIGA data migration projects?',
        answer:
          'Yes. Lextract is well-suited for TRIRIGA migrations where dozens or hundreds of leases need to be abstracted and entered. The consistent, structured output with confidence scoring reduces the quality assurance workload compared to purely manual abstraction. Multi-pack credits make large projects cost-effective at scale.',
      },
      {
        question: 'How does Lextract handle international leases for global TRIRIGA deployments?',
        answer:
          'Lextract currently optimizes for US commercial lease formats. International leases using common English-language formats are generally supported, though some jurisdiction-specific clauses may have lower confidence scores. For large international portfolio migrations, we recommend testing a sample of leases before committing to full-scale extraction.',
      },
    ],
    metaTitle: 'Lease Abstraction for IBM TRIRIGA - Enterprise Lease Data',
    metaDescription:
      'Prepare lease data for IBM TRIRIGA at scale. Lextract extracts all 126 lease fields from PDFs for TRIRIGA migrations, ASC 842 adoption, and ongoing portfolio management.',
  },
  {
    software: 'Lease Harbor',
    slug: 'lease-harbor',
    vendor: 'Lease Harbor',
    category: 'lease-management',
    overview:
      'Lease Harbor is a purpose-built commercial lease management and ASC 842 compliance platform serving corporate real estate teams and lease administrators. It provides a clean, modern interface for managing lease portfolios, tracking critical dates, and generating ASC 842 journal entries and footnote disclosures. Lease Harbor is known for its intuitive data entry, strong reporting, and responsive customer support.',
    howLextractHelps:
      'Lextract provides the upstream data extraction layer that feeds Lease Harbor\'s lease management system. Rather than manually transcribing lease terms from PDFs into Lease Harbor, teams run leases through Lextract first and receive a clean, structured data set. Lextract\'s confidence scoring identifies which fields need a second look before they are committed to Lease Harbor, preventing downstream reporting errors.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Upload executed lease PDF to Lextract and download the structured extraction',
      'Review high-confidence fields and verify medium/low-confidence fields against the lease',
      'Use the Excel export as the data source for Lease Harbor manual entry or import',
      'Configure lease in Lease Harbor with accurate commencement, term, and payment data',
      'Set up option tracking using Lextract\'s extracted option terms and notice deadlines',
      'Enable Lease Harbor\'s ASC 842 calculations using the verified lease data',
    ],
    criticalFields: [
      'commencement-date',
      'expiration-date',
      'base-rent',
      'rent-escalation',
      'renewal-options',
      'termination-option',
      'free-rent',
      'lease-type',
    ],
    faqs: [
      {
        question: 'Does Lease Harbor integrate with Lextract directly?',
        answer:
          'Lextract provides standard Excel, Word, and PDF exports that can be used to populate Lease Harbor\'s lease entry screens or import template. Direct API integration between Lextract and Lease Harbor is on the product roadmap. For now, the structured export workflow takes 15-20 minutes per lease versus 4-8 hours for purely manual entry.',
      },
      {
        question: 'What makes Lextract more reliable than manual data entry for Lease Harbor?',
        answer:
          'Manual data entry introduces transcription errors - wrong dates, transposed rent amounts, missed escalations. Lextract extracts directly from the source document using AI, then assigns confidence scores so reviewers know exactly which fields to double-check. This systematic approach catches errors that human reviewers commonly miss, particularly in long leases with multiple exhibits.',
      },
    ],
    metaTitle: 'Lease Abstraction for Lease Harbor - Accurate Lease Data Input',
    metaDescription:
      'Prepare accurate lease data for Lease Harbor. Lextract extracts 126 fields from lease PDFs with confidence scoring, reducing manual data entry errors.',
  },
  {
    software: 'Microsoft Excel',
    slug: 'microsoft-excel',
    vendor: 'Microsoft',
    category: 'spreadsheets',
    overview: 'Microsoft Excel is the universal spreadsheet platform used across every CRE role for lease tracking, rent roll management, CAM reconciliation, and financial modeling. CRE professionals use Excel to build custom lease abstracts, track critical dates, model cash flows, and produce investor reports. While purpose-built property management systems handle transaction processing, Excel remains the default tool for analysis, reporting, and data manipulation across CRE portfolios of every size.',
    howLextractHelps: 'Lextract outputs all 126 extracted lease fields directly to Excel, eliminating the need to manually copy-paste lease data from PDFs. The Excel export uses clean column headers, ISO date formats, and separates rent schedules into a structured table - making it immediately usable for pivot tables, VLOOKUP formulas, and dashboard reports. For teams building or maintaining a master lease tracking spreadsheet, Lextract is the extraction layer that populates it accurately and consistently.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Upload executed lease PDF to Lextract and receive the 126-field extraction',
      'Download the Excel export with fields organized across 14 lease categories',
      'Review confidence scores - high-confidence fields are ready to use; verify any medium or low-confidence extractions',
      'Paste or import the extracted data into your master lease tracking spreadsheet',
      'Use the rent escalation schedule (separate tab) to build forward-looking cash flow projections',
      'Archive the Lextract Excel file alongside the original PDF in your document management system',
    ],
    criticalFields: [
      'tenant-legal-name',
      'premises-address',
      'rentable-area',
      'commencement-date',
      'expiration-date',
      'base-rent',
      'rent-escalation',
      'cam-estimate',
      'renewal-options',
      'security-deposit',
    ],
    faqs: [
      {
        question: 'What does the Lextract Excel export look like?',
        answer: 'The Excel export contains one tab for the 126 lease fields with a header row and data row, and a second tab for the rent escalation schedule showing each period, effective date, and rent amount. All date fields use ISO format (YYYY-MM-DD). Confidence scores are included as a separate column next to each extracted value so you can see at a glance which fields need review.',
      },
      {
        question: 'Can I import Lextract data into an existing Excel lease tracker?',
        answer: 'Yes. The Lextract field names in the Excel export can be mapped to whatever column names your existing spreadsheet uses. For teams with a standardized lease tracking template, the workbook workflow lets you populate multiple leases quickly.',
      },
      {
        question: 'How does Lextract handle leases with multiple rent escalation periods?',
        answer: 'Each escalation period is captured separately: effective date, new base rent, and the percentage or dollar increase. In the Excel export, escalation periods appear in the dedicated rent schedule tab with one row per period. This is the correct structure for forward-looking rent modeling - a single current-rent field is insufficient for leases with annual steps.',
      },
    ],
    metaTitle: 'Lease Abstraction for Microsoft Excel - 126 Fields Export',
    metaDescription: 'Extract commercial lease data directly to Excel. Lextract outputs 126 structured fields with confidence scores in an Excel file ready for lease tracking and analysis.',
  },
  {
    software: 'Google Sheets',
    slug: 'google-sheets',
    vendor: 'Google',
    category: 'spreadsheets',
    overview: 'Google Sheets is the cloud-based spreadsheet platform widely used by small property managers, tenant representatives, and operations teams who need collaborative lease tracking without enterprise software overhead. Its real-time collaboration, Google Drive integration, and accessibility from any device make it popular for small-to-midsize commercial portfolios. CRE teams use Sheets for rent rolls, critical date trackers, CAM estimate logs, and lease comparison tools.',
    howLextractHelps: 'Lextract provides an Excel export that can be opened directly in Google Sheets. The structured output - one row per lease, one column per field - is immediately compatible with Google Sheets formulas, conditional formatting rules, and data validation for building interactive lease dashboards. For teams sharing lease data across brokers, attorneys, and property managers, exporting to Google Sheets creates a single source of truth that all parties can access.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Upload the executed lease PDF to Lextract and wait for extraction to complete',
      'Download the Excel export from Lextract',
      'Open Google Sheets and import the workbook using File → Import',
      'Review extracted fields and highlight any medium or low-confidence values for manual verification',
      'Connect to your shared lease tracker Google Sheet using IMPORTRANGE or copy-paste the verified data',
      'Set up conditional formatting on expiration dates and option notice deadlines to create visual alerts',
    ],
    criticalFields: [
      'tenant-legal-name',
      'premises-address',
      'commencement-date',
      'expiration-date',
      'base-rent',
      'cam-estimate',
      'renewal-options',
      'security-deposit',
    ],
    faqs: [
      {
        question: 'How do I import Lextract data into Google Sheets?',
        answer: 'Download the Excel export from Lextract. In Google Sheets, click File → Import → Upload → select the workbook. Choose "Replace current sheet" or "Insert new sheets." The data imports with one row per lease and column headers matching the Lextract field names. From there, you can map columns to your existing tracker format using VLOOKUP or paste-special.',
      },
      {
        question: 'Can I use Lextract data with Google Sheets templates for rent rolls?',
        answer: 'Yes. The Lextract Excel export can be imported into any Google Sheets rent roll template. The key fields - tenant name, premises, rentable area, commencement date, expiration date, base rent, and renewal options - are all extracted and map cleanly to standard rent roll columns.',
      },
    ],
    metaTitle: 'Lease Abstraction for Google Sheets - Excel Import Ready',
    metaDescription: 'Extract lease data from PDFs into Google Sheets. Lextract outputs a structured Excel workbook with 126 lease fields ready for your Google Sheets lease tracker.',
  },
  {
    software: 'DocuSign',
    slug: 'docusign',
    vendor: 'DocuSign',
    category: 'legal',
    overview: 'DocuSign is the leading e-signature platform used to execute commercial leases digitally. After a lease is signed in DocuSign, it is available as a completed PDF in the DocuSign envelope - but the execution is where the data extraction challenge begins. The signed document contains all the agreed terms, but they exist only as text in a PDF, not as structured data that can flow into property management systems, lease accounting platforms, or rent roll spreadsheets.',
    howLextractHelps: 'Lextract closes the gap between DocuSign execution and lease administration by extracting structured data from the completed PDF. After downloading the executed lease from DocuSign, uploading it to Lextract returns 126 structured fields in 5–15 minutes. This eliminates the manual abstraction step that typically follows e-signature execution - the signed document goes directly into Lextract and comes out as clean, structured data ready for Yardi, MRI, QuickBooks, or Excel.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Once the lease is fully executed in DocuSign, download the completed PDF from the DocuSign envelope',
      'Upload the executed PDF to Lextract - it handles the same PDF DocuSign produces (no reformatting needed)',
      'Receive 126 extracted fields with confidence scores in 5–15 minutes',
      'Review any medium or low-confidence extractions, particularly on handwritten or redlined sections',
      'Download the structured export in your preferred format (Excel, Word, or PDF)',
      'Import the data into your property management system, lease accounting software, or master lease tracker',
    ],
    criticalFields: [
      'landlord-legal-name',
      'tenant-legal-name',
      'commencement-date',
      'expiration-date',
      'base-rent',
      'security-deposit',
      'renewal-options',
      'notice-requirements',
    ],
    faqs: [
      {
        question: 'Does Lextract work directly with DocuSign via API?',
        answer: 'Lextract currently uses a manual upload workflow - you download the executed PDF from DocuSign and upload it to Lextract. A direct API integration between Lextract and DocuSign that triggers extraction automatically upon execution is on the product roadmap. The current workflow adds approximately 5 minutes to the post-execution process and can be batch-processed for multiple closings.',
      },
      {
        question: 'How does Lextract handle counter-signatures and rider attachments in DocuSign?',
        answer: 'DocuSign delivers all signed documents and attachments as a single PDF package or separate files depending on the envelope configuration. Lextract processes the full PDF - if the lease and all riders are combined into one document (as DocuSign typically does), all pages are included in the extraction. For multi-document envelopes, extract the main lease document and any material rider attachments separately.',
      },
    ],
    metaTitle: 'Extract Data from DocuSign Executed Leases',
    metaDescription: 'Extract structured data from leases executed in DocuSign. Lextract converts the signed PDF to 126 structured fields in minutes, ready for your property management system.',
  },
  {
    software: 'QuickBooks',
    slug: 'quickbooks',
    vendor: 'Intuit',
    category: 'accounting',
    overview: 'QuickBooks is the dominant small business accounting platform used by independent commercial landlords, small property managers, and real estate investors managing portfolios of up to 20–50 properties. While QuickBooks lacks the native lease management functionality of enterprise platforms like Yardi or MRI, many small CRE operators use it to track rental income, security deposits, CAM charges, and operating expenses. Setting up accurate lease-based billing in QuickBooks requires knowing the precise rent schedule, escalation dates, and charge components from each executed lease.',
    howLextractHelps: 'Lextract extracts the billing-critical fields that QuickBooks users need to set up tenant accounts correctly: base rent amounts and escalation schedule, CAM estimate, security deposit amount, and lease term dates. The Excel export provides a clear data source for setting up recurring invoice schedules in QuickBooks without manually reading through the lease. For landlords managing their books in QuickBooks, Lextract ensures that the rent schedule entered matches the executed lease exactly.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Upload the commercial lease PDF to Lextract to extract the billing-relevant fields',
      'Review the extracted rent schedule, CAM estimate, and security deposit amounts',
      'Create the tenant as a customer in QuickBooks with the legal name from the Lextract extraction',
      'Set up the recurring rent invoice using the extracted monthly rent amount and effective dates',
      'Create separate line items for base rent, CAM estimate, and any other recurring charges',
      'Note the rent escalation dates in QuickBooks reminders to update invoices on each anniversary',
    ],
    criticalFields: [
      'tenant-legal-name',
      'commencement-date',
      'expiration-date',
      'base-rent',
      'rent-escalation',
      'cam-estimate',
      'security-deposit',
      'renewal-options',
    ],
    faqs: [
      {
        question: 'Does Lextract integrate directly with QuickBooks?',
        answer: 'Lextract provides Excel, Word, and PDF exports that you use to populate QuickBooks manually - there is no direct API connection to QuickBooks. The workflow is straightforward: extract the lease with Lextract, use the rent schedule and charges from the export to set up recurring invoices in QuickBooks. This typically takes 15–20 minutes per lease versus 1–2 hours of manual abstraction.',
      },
      {
        question: 'How do I handle CAM charges in QuickBooks using Lextract data?',
        answer: 'Lextract extracts the estimated monthly CAM charge as a separate field from base rent. In QuickBooks, you set up CAM as a separate invoice line item or a separate product/service. The Lextract extraction also captures whether the lease is NNN, modified gross, or gross - which determines how expense pass-throughs are structured in QuickBooks billing.',
      },
    ],
    metaTitle: 'Commercial Lease Tracking in QuickBooks - Extract Lease Data First',
    metaDescription: 'Extract lease payment schedules, CAM charges, and security deposit data from lease PDFs for QuickBooks setup. Lextract gets billing-critical fields in 5–15 minutes.',
  },
  {
    software: 'Airtable',
    slug: 'airtable',
    vendor: 'Airtable',
    category: 'productivity',
    overview: 'Airtable is a flexible, database-spreadsheet hybrid platform popular with tenant representatives, small operations teams, and CRE startups that need organized lease tracking without the overhead of enterprise property management software. Airtable bases for lease management can include relational links between properties, tenants, and leases, making it a useful lightweight alternative to traditional PMS platforms for teams managing under 50 leases. Its flexible field types, views, and automations allow custom lease dashboards without developer resources.',
    howLextractHelps: 'Lextract provides structured Excel exports that can be mapped into Airtable bases. The field names in the Lextract export can be mapped to Airtable column names during import, making it straightforward to populate an existing lease tracking base. For tenant representatives maintaining client lease portfolios in Airtable, Lextract eliminates manual data entry on each new or renewed lease.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Upload the executed lease PDF to Lextract and receive the structured extraction',
      'Download the Excel export from Lextract',
      'In Airtable, open your lease tracking base and use the import or mapping workflow',
      'Map the Lextract Excel columns to your Airtable field names during setup',
      'Review imported records and verify any medium or low-confidence fields against the source PDF',
      'Set up Airtable automations to send notifications on upcoming option deadlines and expirations',
    ],
    criticalFields: [
      'tenant-legal-name',
      'premises-address',
      'commencement-date',
      'expiration-date',
      'base-rent',
      'renewal-options',
      'cam-estimate',
    ],
    faqs: [
      {
        question: 'How do I import Lextract data into an Airtable lease tracking base?',
        answer: 'Download the Lextract Excel export and use Airtable\'s import feature (the "+" icon on the left sidebar → Import data → Microsoft Excel). Airtable walks you through mapping columns to your existing fields. For a new base, you can start from the workbook and let Airtable create fields automatically, then customize field types (date fields, numeric fields, linked records) after the import.',
      },
      {
        question: 'Can I use Lextract data with Airtable automations for critical date alerts?',
        answer: 'Yes. Once expiration dates and option notice deadlines are imported from Lextract into Airtable date fields, you can build automations that trigger email or Slack notifications when a date is approaching. The critical dates most worth tracking: lease expiration, renewal option notice deadline (notice must typically be given 6–18 months before expiration), and any expansion or termination option exercise windows.',
      },
    ],
    metaTitle: 'Lease Tracking in Airtable - Import Lease Data from PDF',
    metaDescription: 'Populate your Airtable lease tracking base from lease PDFs. Lextract extracts 126 structured fields for Airtable mapping - no manual data entry.',
  },
  {
    software: 'SharePoint',
    slug: 'sharepoint',
    vendor: 'Microsoft',
    category: 'document-management',
    overview: 'Microsoft SharePoint is the enterprise document management and collaboration platform used by large corporate occupiers, enterprise property managers, and institutional real estate teams to store and organize lease documents. SharePoint serves as the document repository for executed leases, amendments, correspondence, and related legal documents. While SharePoint excels at document storage, version control, and access management, it does not extract or structure the data contained within lease documents.',
    howLextractHelps: 'Lextract provides the data extraction layer that turns SharePoint\'s document repository into an actionable lease database. By processing PDFs stored in SharePoint through Lextract, corporate real estate teams can extract 126 structured fields from each document and build a complete lease database without manual abstraction. The Excel output can be imported into SharePoint lists, uploaded to Power BI, or handed off to other enterprise systems connected to SharePoint.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Identify executed lease PDFs stored in your SharePoint document library',
      'Download each PDF or access directly via SharePoint link, then upload to Lextract',
      'Process all leases through Lextract and download structured extractions for each',
      'Import the Lextract Excel data into a SharePoint list for searchable, sortable lease data',
      'Connect the SharePoint list to Power BI for portfolio-level reporting and critical date dashboards',
      'Store the Lextract Excel, Word, or PDF output alongside each PDF in SharePoint for downstream review',
    ],
    criticalFields: [
      'tenant-legal-name',
      'premises-address',
      'commencement-date',
      'expiration-date',
      'base-rent',
      'renewal-options',
      'cam-estimate',
      'notice-requirements',
    ],
    faqs: [
      {
        question: 'How does Lextract fit into a SharePoint document management workflow?',
        answer: 'SharePoint is designed for storing and retrieving documents - it does not read or interpret their contents. Lextract adds the extraction layer: you process leases through Lextract to get structured data, then import that data into a SharePoint list. The list becomes a searchable, filterable lease database while the original PDFs remain in the document library for reference.',
      },
      {
        question: 'Can I automate lease extraction from SharePoint using Power Automate?',
        answer: 'A Power Automate flow can trigger when a new lease is uploaded to a SharePoint library, call the Lextract API to process it, and write the structured output back to a SharePoint list or send it to another system. This type of automation is on the Lextract product roadmap. In the current workflow, extraction requires a manual upload to the Lextract interface.',
      },
    ],
    metaTitle: 'Lease Document Management with SharePoint - Extract Structured Data',
    metaDescription: 'Extract structured lease data from SharePoint document libraries. Lextract processes lease PDFs into 126 structured fields for SharePoint lists and Power BI dashboards.',
  },
  {
    software: 'NetSuite',
    slug: 'netsuite',
    vendor: 'Oracle',
    category: 'accounting',
    overview: 'Oracle NetSuite is a cloud-based ERP platform widely used by mid-market and enterprise companies for financial management, including lease accounting under ASC 842 and IFRS 16. NetSuite\'s lease accounting module manages right-of-use assets, lease liabilities, journal entries, and financial disclosures. It integrates with other NetSuite modules (AP, AR, fixed assets) for a unified financial view. Accurate lease data is the foundation of NetSuite\'s lease accounting calculations - errors in commencement dates, payment schedules, or option terms produce incorrect balance sheet entries.',
    howLextractHelps: 'Lextract ensures that lease data entered into NetSuite\'s lease accounting module is accurate and complete. By extracting all ASC 842-relevant fields - commencement date, payment schedule, escalations, renewal options, termination options, and variable lease payments - Lextract provides a verified source of data before entry into NetSuite. This is particularly valuable during ASC 842 initial adoption projects and for companies with large lease portfolios that need systematic, error-free data capture.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Upload all leases subject to ASC 842 to Lextract for systematic extraction',
      'Review the extracted payment schedules, options, and commencement dates with confidence scores',
      'Flag leases with variable payment provisions, CPI escalations, or complex option structures for accounting team review',
      'Export Lextract data to the NetSuite lease record import template',
      'Import lease commencement, payment schedule, and option data into NetSuite\'s lease accounting module',
      'Validate the generated right-of-use asset and lease liability calculations against the source lease terms',
    ],
    criticalFields: [
      'commencement-date',
      'expiration-date',
      'base-rent',
      'rent-escalation',
      'free-rent',
      'renewal-options',
      'termination-option',
      'lease-type',
    ],
    faqs: [
      {
        question: 'How does Lextract support NetSuite ASC 842 data entry?',
        answer: 'NetSuite\'s lease accounting module requires specific data points for each lease record: commencement date, lease term in months, payment schedule (amount and frequency), escalation rates, incremental borrowing rate, and option information. Lextract extracts all of these fields with confidence scores, ensuring that the data entered into NetSuite is accurate and that any uncertain fields are flagged for review before they affect balance sheet calculations.',
      },
      {
        question: 'What Lextract fields are most important for NetSuite lease accounting?',
        answer: 'The highest-priority fields for NetSuite ASC 842 are: commencement date (start of right-of-use asset recognition), lease term in months, all base rent amounts by period, escalation rate and type (fixed vs. CPI), free rent periods (affects payment schedule), renewal options (term, rent basis, and exercise probability), and any termination options with penalty amounts. Errors in these fields directly affect the lease liability present value calculation.',
      },
    ],
    metaTitle: 'Lease Abstraction for NetSuite - ASC 842 Data Entry',
    metaDescription: 'Prepare accurate lease data for NetSuite ASC 842 compliance. Lextract extracts payment schedules, escalations, and options from lease PDFs in minutes.',
  },
  {
    software: 'Sage Intacct',
    slug: 'sage-intacct',
    vendor: 'Sage',
    category: 'accounting',
    overview: 'Sage Intacct is a cloud-based financial management platform widely used by mid-market companies for accounting, financial reporting, and lease management under ASC 842 and IFRS 16. It is particularly popular with corporate tenants managing lease portfolios across multiple locations - retail chains, healthcare networks, restaurant groups, and professional services firms. Sage Intacct\'s lease accounting module provides right-of-use asset calculations, automated journal entries, and disclosure footnotes that require accurate lease data as inputs.',
    howLextractHelps: 'Lextract provides the upstream data extraction layer that feeds Sage Intacct\'s lease accounting module with accurate, verified data. Rather than manually entering payment schedules and option terms from lease PDFs, teams use Lextract to extract all ASC 842-relevant fields and import the structured output into Intacct. The confidence scoring ensures that any uncertain values are flagged for accounting team review before affecting financial statements.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Upload lease PDFs to Lextract to extract ASC 842 data points',
      'Review the payment schedule, escalations, and option terms with confidence scores',
      'Identify any CPI escalations, variable payments, or complex option structures for accounting review',
      'Export Lextract data in the format required by Sage Intacct\'s lease import template',
      'Import lease data into Intacct and configure the right-of-use asset and lease liability calculation',
      'Review generated journal entries and disclosure footnotes for accuracy',
    ],
    criticalFields: [
      'commencement-date',
      'expiration-date',
      'base-rent',
      'rent-escalation',
      'renewal-options',
      'termination-option',
      'free-rent',
      'lease-type',
    ],
    faqs: [
      {
        question: 'What makes accurate lease data critical for Sage Intacct ASC 842 calculations?',
        answer: 'Sage Intacct calculates right-of-use asset values and lease liabilities using the data entered for each lease. An incorrect commencement date, missed escalation, or misidentified renewal option can cause material misstatements that create audit findings or restatement requirements. Lextract\'s confidence scoring surfaces the fields that warrant careful review before they affect financial calculations.',
      },
    ],
    metaTitle: 'Lease Abstraction for Sage Intacct - ASC 842 Data',
    metaDescription: 'Prepare accurate lease data for Sage Intacct ASC 842 compliance. Lextract extracts payment schedules, escalations, and options from lease PDFs in minutes.',
  },
  {
    software: 'Notion',
    slug: 'notion',
    vendor: 'Notion Labs',
    category: 'productivity',
    overview: 'Notion is a versatile workspace platform used by tenant representatives, small brokerage teams, and CRE consultants for knowledge management, project tracking, and lightweight lease databases. Its flexible database views (table, calendar, kanban, gallery) make it a popular tool for teams that want custom workflows without enterprise software complexity. CRE professionals use Notion to track active deals, manage client lease portfolios, and maintain reference databases of key lease terms.',
    howLextractHelps: 'Lextract\'s Excel export can be mapped into Notion databases, reducing manual data entry for each lease record. Tenant representatives maintaining client portfolios in Notion can extract each new or renewed lease through Lextract and import the structured data in minutes. The key fields for Notion lease tracking - tenant name, premises, term dates, rent, and renewal options - are all high-confidence extractions.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Upload the lease PDF to Lextract and download the Excel export',
      'Save the relevant sheet from the Excel workbook as a CSV file (File → Save As → CSV)',
      'In Notion, open your lease database and click the "..." menu → Merge with CSV',
      'Map the Lextract field columns to your Notion database fields',
      'Review imported data and verify any medium-confidence fields',
      'Add any additional context fields (deal notes, client name, broker contacts) manually',
    ],
    criticalFields: [
      'tenant-legal-name',
      'premises-address',
      'commencement-date',
      'expiration-date',
      'base-rent',
      'renewal-options',
    ],
    faqs: [
      {
        question: 'How do I get Lextract data into a Notion database?',
        answer: 'Notion supports CSV import via the "Merge with CSV" option in any database view. Download the Lextract Excel export and use it as the source for your lease database. Date fields import as text - you will need to update the field type to Date in Notion after import for calendar views and deadline reminders to work correctly.',
      },
    ],
    metaTitle: 'Lease Tracking in Notion - Import Lease Data from PDF',
    metaDescription: 'Import structured lease data into Notion databases from PDFs. Lextract extracts 126 fields for Notion mapping - no manual data entry.',
  },
  {
    software: 'Google Drive',
    slug: 'google-drive',
    vendor: 'Google',
    category: 'document-management',
    overview: 'Google Drive is the cloud storage and document management platform used by small property managers, boutique brokerages, and CRE consultants to store executed leases, amendments, and supporting documents. While Drive excels at file storage, sharing, and access control, it provides no mechanism for extracting or organizing the data inside lease PDFs. Teams relying solely on Drive often maintain parallel spreadsheet trackers that require manual data entry whenever a new lease is stored.',
    howLextractHelps: 'Lextract bridges the gap between Google Drive\'s document storage and structured lease data. Teams that store leases in Drive download each PDF, process it through Lextract, and receive structured data that can be imported into a Google Sheets lease tracker or any other system. This workflow ensures that every lease stored in Drive has a corresponding structured data record, enabling critical date tracking, rent roll management, and portfolio reporting.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Locate executed lease PDFs stored in Google Drive',
      'Download the PDF and upload it to Lextract for extraction',
      'Receive 126 structured fields in 5–15 minutes',
      'Download the Excel export and import into your Google Sheets lease tracker',
      'Store the Lextract Excel output in the same Google Drive folder as the original PDF',
    ],
    criticalFields: [
      'tenant-legal-name',
      'premises-address',
      'commencement-date',
      'expiration-date',
      'base-rent',
      'renewal-options',
    ],
    faqs: [
      {
        question: 'Can I access leases stored in Google Drive directly from Lextract?',
        answer: 'Currently, Lextract requires direct PDF upload - you download the file from Drive and upload it to Lextract. A Google Drive integration that allows direct selection of files from your Drive is on the product roadmap. For teams with large numbers of leases in Drive, the Portfolio processing workflow (uploading multiple PDFs in sequence) is the most efficient current approach.',
      },
    ],
    metaTitle: 'Organize Lease Data from Google Drive PDFs',
    metaDescription: 'Extract structured lease data from PDFs stored in Google Drive. Lextract converts lease PDFs to 126 structured fields for Google Sheets import and lease tracking.',
  },
  {
    software: 'Dropbox',
    slug: 'dropbox',
    vendor: 'Dropbox',
    category: 'document-management',
    overview: 'Dropbox is a cloud storage and file synchronization platform used by independent property managers, attorneys, and CRE service firms to store and share executed leases and related documents. Like other document storage platforms, Dropbox does not provide any mechanism for reading or structuring the contents of lease PDFs - it is a container for files, not a data management system. Property managers and attorneys who rely on Dropbox for lease document storage often maintain a separate manual spreadsheet tracker to compensate.',
    howLextractHelps: 'Lextract adds the data extraction capability that Dropbox lacks. Teams that store leases in Dropbox can process each PDF through Lextract to get a structured data file that lives alongside the original document. For attorneys who need to quickly pull up lease terms during negotiations or closings, having a Lextract extraction stored in Dropbox next to the PDF eliminates the need to search through a long document.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Locate the executed lease PDF in Dropbox and download it',
      'Upload the PDF to Lextract for extraction',
      'Download the Lextract Excel, Word, or PDF output',
      'Store the extraction file in the same Dropbox folder as the original PDF for reference',
      'Use the Excel workbook in your tracking spreadsheet or property management handoff',
    ],
    criticalFields: [
      'tenant-legal-name',
      'premises-address',
      'commencement-date',
      'expiration-date',
      'base-rent',
      'renewal-options',
    ],
    faqs: [
      {
        question: 'Should I store Lextract outputs in Dropbox alongside original lease PDFs?',
        answer: 'Yes - storing the Lextract Excel, Word, or PDF output in the same folder as the original PDF creates a two-part lease record: the source document and the structured data extract. The extraction file acts as a quick-reference abstract that anyone can open without reading the full lease. For attorneys and property managers sharing files with clients in Dropbox, the structured abstract is often more useful than the 100-page original.',
      },
    ],
    metaTitle: 'Lease Data Extraction for Dropbox Stored Leases',
    metaDescription: 'Extract structured data from lease PDFs stored in Dropbox. Lextract outputs 126 lease fields to complement your Dropbox document storage workflow.',
  },
  {
    software: 'CREXi',
    slug: 'crexi',
    vendor: 'CREXi',
    category: 'crm-data',
    overview: 'CREXi (Commercial Real Estate Exchange) is a digital marketplace and transaction management platform for commercial real estate listings, due diligence, and deal execution. CREXi is used by brokers and acquisition teams to access property listings, due diligence documents, and transaction management tools. Its platform includes data room functionality where sellers post lease documents, rent rolls, and operating statements for buyer review during due diligence.',
    howLextractHelps: 'During CREXi due diligence, buyers access lease documents in the data room and need to quickly extract and verify the key terms against the seller\'s rent roll. Lextract enables acquisition teams to download leases from CREXi data rooms, extract all 126 fields, and build a verified lease database in hours rather than weeks. The red flag detection also surfaces lease provisions that should affect purchase price negotiations.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Download lease PDFs from the CREXi data room during due diligence',
      'Upload each lease to Lextract for systematic extraction',
      'Compare Lextract extractions against the seller\'s rent roll provided in the data room',
      'Document any discrepancies between the extracted lease terms and the rent roll figures',
      'Flag red flags - particularly early termination rights, co-tenancy clauses, and below-market renewal options',
      'Present extraction results to the investment committee with confidence scores highlighted',
    ],
    criticalFields: [
      'tenant-legal-name',
      'base-rent',
      'commencement-date',
      'expiration-date',
      'renewal-options',
      'termination-option',
      'cam-estimate',
      'rentable-area',
    ],
    faqs: [
      {
        question: 'How does Lextract support CREXi due diligence workflows?',
        answer: 'CREXi data rooms typically contain lease PDFs that buyers need to abstract quickly during a 2–4 week due diligence period. Lextract processes each lease in 5–15 minutes, enabling teams to extract and verify all active leases in hours rather than weeks. The rent roll comparison workflow - comparing Lextract extractions against the seller-provided rent roll - is a key quality control step for identifying discrepancies before closing.',
      },
    ],
    metaTitle: 'Lease Abstraction for CREXi Due Diligence - Extract and Verify',
    metaDescription: 'Process lease PDFs from CREXi data rooms quickly. Lextract extracts 126 fields per lease in 5–15 minutes for acquisition due diligence and rent roll verification.',
  },
  {
    software: 'CompStak',
    slug: 'compstak',
    vendor: 'CompStak',
    category: 'analytics',
    overview: 'CompStak is a commercial real estate data platform providing lease comparable data, market analytics, and property intelligence. It is used by brokers, asset managers, and analysts to benchmark in-place rents against market comparables, track lease trends, and support investment decisions. CompStak\'s comparable lease data is most valuable when paired with accurate in-place lease data from your own portfolio - the comparison reveals which leases are above market, below market, or at risk of non-renewal.',
    howLextractHelps: 'Lextract extracts the in-place lease economics that you compare against CompStak market data: current base rent, rent per square foot, lease expiration, and renewal option terms. By running your portfolio leases through Lextract, you build the structured dataset needed to benchmark every tenant against current market conditions. This analysis drives renewal strategy, pricing decisions, and asset valuation.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Extract all portfolio leases through Lextract to build a structured in-place rent roll',
      'Export to Excel with base rent, rent per square foot, expiration date, and renewal option terms',
      'Pull comparable lease data from CompStak for the same submarkets and property types',
      'Build a side-by-side comparison of in-place rents versus CompStak market comps',
      'Flag below-market leases as renewal opportunities and above-market leases as vacancy risk',
      'Use the analysis for investor reporting, lease renewal negotiations, and acquisition pricing',
    ],
    criticalFields: [
      'base-rent',
      'rentable-area',
      'commencement-date',
      'expiration-date',
      'renewal-options',
      'lease-type',
    ],
    faqs: [
      {
        question: 'How does pairing Lextract with CompStak improve investment analysis?',
        answer: 'CompStak shows what the market is paying for similar space. Lextract shows what your tenants are actually paying under their executed leases. The combination reveals the spread between in-place rent and market rent - a key input for modeling lease renewal probability, setting asking rents for vacant spaces, and underwriting the reversion value of expiring leases.',
      },
    ],
    metaTitle: 'Lease Data for CompStak Analysis - Extract In-Place Rents',
    metaDescription: 'Pair in-place lease data with CompStak market comps. Lextract extracts current rents, expirations, and terms from lease PDFs for market benchmarking.',
  },
  {
    software: 'LoopNet',
    slug: 'loopnet',
    vendor: 'CoStar Group',
    category: 'crm-data',
    overview: 'LoopNet is the largest commercial real estate listing marketplace in the US, operated by CoStar Group. It is used by brokers and investors to search for available commercial properties, access property data, and evaluate investment opportunities. When investors identify a property on LoopNet for potential acquisition, they request offering memorandums and due diligence documents - including the current rent roll and underlying lease documents - which require systematic abstraction and verification.',
    howLextractHelps: 'After identifying a target property on LoopNet and receiving the offering package, Lextract enables rapid lease abstraction and rent roll verification. Investors can process all provided leases in a few hours, compare the extraction against the seller\'s rent roll summary in the OM, and identify any discrepancies that affect pricing before submitting an offer.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Identify a target property on LoopNet and request the offering memorandum',
      'Receive lease documents and rent roll from the listing broker',
      'Upload all lease PDFs to Lextract for systematic extraction',
      'Compare extracted rent, expiration dates, and option terms against the OM rent roll',
      'Flag discrepancies and request clarification before submitting an LOI',
    ],
    criticalFields: [
      'tenant-legal-name',
      'base-rent',
      'commencement-date',
      'expiration-date',
      'renewal-options',
      'cam-estimate',
      'rentable-area',
    ],
    faqs: [
      {
        question: 'How does Lextract support acquisition analysis after finding a property on LoopNet?',
        answer: 'LoopNet provides the market exposure - you find the property. The offering package provides the lease documents. Lextract extracts the economic data from those leases so you can verify the seller\'s rent roll claims and build an accurate underwriting model. The entire workflow - from document receipt to verified extraction - takes hours rather than days.',
      },
    ],
    metaTitle: 'Lease Abstraction for LoopNet Property Acquisitions',
    metaDescription: 'Verify rent rolls on properties found on LoopNet. Lextract extracts lease terms from offering package documents for fast acquisition due diligence.',
  },
  {
    software: 'Microsoft Dynamics 365',
    slug: 'microsoft-dynamics',
    vendor: 'Microsoft',
    category: 'accounting',
    overview: 'Microsoft Dynamics 365 Finance and Operations includes lease accounting functionality for ASC 842 and IFRS 16 compliance, used by enterprise companies that have standardized on the Microsoft ecosystem. Dynamics 365\'s lease module manages right-of-use assets, lease liabilities, and journal entry automation for large, multi-location lease portfolios. Accurate lease data entry is required before the system can calculate the correct accounting treatment.',
    howLextractHelps: 'Lextract provides the upstream extraction layer for enterprises entering leases into Dynamics 365. By extracting all ASC 842-relevant data points from lease PDFs before entry, Lextract ensures that the data powering Dynamics 365\'s lease accounting calculations is accurate and complete.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Upload lease PDFs to Lextract for systematic extraction of ASC 842 data',
      'Review payment schedules, options, and commencement dates with confidence scores',
      'Export to the Dynamics 365 lease record import format',
      'Import lease data into Dynamics 365 Finance and run lease accounting calculations',
      'Validate right-of-use asset and lease liability balances against source lease terms',
    ],
    criticalFields: [
      'commencement-date',
      'expiration-date',
      'base-rent',
      'rent-escalation',
      'renewal-options',
      'termination-option',
      'free-rent',
    ],
    faqs: [
      {
        question: 'How does Lextract support Dynamics 365 lease accounting data quality?',
        answer: 'Dynamics 365 Finance lease accounting is only as accurate as the data entered. Lextract\'s confidence scoring surfaces the fields - particularly option terms and variable payment structures - that warrant careful review before they are committed to Dynamics 365 and affect balance sheet reporting.',
      },
    ],
    metaTitle: 'Lease Abstraction for Microsoft Dynamics 365 - ASC 842 Data',
    metaDescription: 'Prepare lease data for Dynamics 365 Finance ASC 842 compliance. Lextract extracts payment schedules and options from lease PDFs for Dynamics 365 import.',
  },
  {
    software: 'Clio',
    slug: 'clio',
    vendor: 'Themis Solutions',
    category: 'legal',
    overview: 'Clio is a cloud-based practice management platform used by commercial real estate law firms to manage matters, documents, billing, and client communications. CRE attorneys use Clio to organize lease review matters, store executed leases, and track client work. While Clio excels at matter management, it does not provide lease data extraction capabilities - attorneys still manually abstract lease terms for client deliverables, negotiation support, and legal opinions.',
    howLextractHelps: 'Lextract enables CRE attorneys to deliver faster, more thorough lease abstracts to clients. By processing the lease PDF through Lextract before manual review, attorneys receive a 126-field extraction with confidence scores that identifies the clauses requiring careful analysis. The red flag detection surfaces provisions that warrant immediate legal attention - unusual termination rights, co-tenancy clauses, and missing audit rights - allowing attorneys to focus their time on the provisions that matter most.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Receive the lease PDF as part of a new client matter in Clio',
      'Upload the PDF to Lextract for initial extraction and red flag review',
      'Review the red flag report for provisions requiring legal analysis',
      'Use the extraction as a starting point for the client lease abstract document',
      'Store the Lextract output in the Clio matter file alongside the original executed lease',
    ],
    criticalFields: [
      'landlord-legal-name',
      'tenant-legal-name',
      'commencement-date',
      'expiration-date',
      'renewal-options',
      'termination-option',
      'audit-rights',
      'notice-requirements',
    ],
    faqs: [
      {
        question: 'How does Lextract help CRE attorneys deliver faster lease abstracts?',
        answer: 'Manual lease abstraction by an attorney or paralegal typically takes 3–6 hours for a complex commercial lease. Lextract handles the extraction of all 126 standard fields in 5–15 minutes, with confidence scores indicating which fields need attorney verification. This allows legal professionals to focus on the analytical and interpretive work - legal risk assessment, unusual provisions, negotiating positions - rather than data entry.',
      },
    ],
    metaTitle: 'Lease Abstraction for CRE Attorneys Using Clio',
    metaDescription: 'Speed up lease abstract delivery for CRE law firms using Clio. Lextract extracts 126 fields with red flag detection so attorneys can focus on legal analysis.',
  },
  {
    software: 'Box',
    slug: 'box',
    vendor: 'Box',
    category: 'document-management',
    overview: 'Box is an enterprise cloud content management platform used by large CRE firms, corporate occupiers, and institutional investors to store, share, and collaborate on lease documents. Box provides advanced security, compliance controls, and workflow automation capabilities that make it a preferred document management solution for enterprise real estate teams with strict data governance requirements.',
    howLextractHelps: 'Lextract adds the data extraction layer that transforms Box\'s document repository into actionable lease data. Enterprise teams storing leases in Box can process PDFs through Lextract and import structured data into Box Notes, external databases, or enterprise systems connected to Box via API. The Excel output is useful for organizations building repeatable lease data handoffs from Box.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Access lease PDFs from Box and download for extraction',
      'Upload to Lextract and receive structured extraction output',
      'Store the Lextract Excel, Word, or PDF output alongside the PDF in the Box folder structure',
      'Hand off Excel data to enterprise systems (Yardi, SAP, Oracle) via Box workflows',
    ],
    criticalFields: [
      'tenant-legal-name',
      'premises-address',
      'commencement-date',
      'expiration-date',
      'base-rent',
      'renewal-options',
    ],
    faqs: [
      {
        question: 'Can Lextract work with Box\'s enterprise content management workflows?',
        answer: 'Lextract currently uses a manual upload workflow. For enterprise Box deployments, Excel, Word, and PDF outputs from Lextract can be stored in Box and shared with connected teams. Direct Box integration with automated trigger-based extraction is on the product roadmap.',
      },
    ],
    metaTitle: 'Lease Data Extraction for Box Document Management',
    metaDescription: 'Extract structured lease data from PDFs stored in Box. Lextract outputs 126 lease fields in Excel, Word, and PDF for enterprise lease data workflows.',
  },
  {
    software: 'AI Tools for Lease Review',
    slug: 'ai-tools-lease-review',
    vendor: 'Various',
    category: 'productivity',
    overview: 'General-purpose AI tools like ChatGPT (OpenAI), Claude (Anthropic), and Google Gemini are increasingly being used by CRE professionals to assist with lease review tasks - summarizing documents, explaining unfamiliar clauses, and answering questions about specific provisions. While these tools provide helpful language understanding for individual questions, they are not purpose-built for structured commercial lease abstraction - they lack the field schema, confidence scoring, and red flag detection that systematic lease data extraction requires.',
    howLextractHelps: 'Lextract is purpose-built for what general AI tools cannot reliably deliver: a consistent, structured 126-field extraction from any commercial lease PDF with per-field confidence scores and automated red flag detection. While ChatGPT and similar tools are useful for explaining a specific clause or answering an ad-hoc question, they cannot produce a reliable, audit-ready 126-field abstract that maps to property management systems. Lextract delivers the structured output that downstream systems require.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Identify what you need: structured data extraction (Lextract) vs. clause explanation (general AI)',
      'For structured data needs, upload the lease PDF to Lextract for systematic 126-field extraction',
      'Use general AI tools (ChatGPT, Claude) as a supplement for clarifying ambiguous provisions flagged by Lextract',
      'Export Lextract data to your preferred format for system import or analysis',
    ],
    criticalFields: [
      'tenant-legal-name',
      'commencement-date',
      'expiration-date',
      'base-rent',
      'renewal-options',
      'cam-estimate',
    ],
    faqs: [
      {
        question: 'Can ChatGPT or Claude replace Lextract for lease abstraction?',
        answer: 'General AI tools can answer specific questions about a lease and explain clause language, but they cannot reliably produce a structured 126-field extraction with consistent field names, confidence scores, and red flag detection. When a general AI tool extracts data, you have no way to know which fields it may have missed, misread, or hallucinated. Lextract\'s structured schema, OCR pipeline, and confidence scoring are specifically engineered for production-quality, audit-ready lease data extraction.',
      },
      {
        question: 'When should I use a general AI tool versus Lextract for lease work?',
        answer: 'Use Lextract when you need structured data: rent schedules, dates, option terms, and fields that flow into systems or spreadsheets. Use general AI tools when you need explanation or interpretation: "What does this holdover clause mean?" or "Is this co-tenancy requirement unusual?" The two approaches are complementary - Lextract extracts the data, general AI tools help you understand it.',
      },
    ],
    metaTitle: 'AI Lease Review Tools: ChatGPT vs. Lextract Compared',
    metaDescription: 'Understand why ChatGPT is not enough for commercial lease abstraction. Lextract provides purpose-built 126-field extraction with confidence scoring and red flag detection.',
  },
  {
    software: 'Reonomy',
    slug: 'reonomy',
    vendor: 'Reonomy',
    category: 'crm-data',
    overview: 'Reonomy is a commercial real estate data platform providing property intelligence, ownership data, and transaction history for CRE prospecting and due diligence. It is used by brokers, lenders, and acquisition teams to research property ownership, identify off-market opportunities, and analyze market transactions. During due diligence on a target property, Reonomy provides context on ownership history and transaction comparables that informs lease data analysis.',
    howLextractHelps: 'When Reonomy identifies a target property, Lextract extracts structured data from the lease documents obtained during due diligence. The combination enables a complete analytical workflow: Reonomy provides property and market context, Lextract provides verified lease economics from the executed documents.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Identify target property using Reonomy for ownership and transaction data',
      'Obtain lease documents through the acquisition process or broker outreach',
      'Upload lease PDFs to Lextract for systematic extraction',
      'Build acquisition model using Reonomy market data and Lextract lease economics',
    ],
    criticalFields: [
      'tenant-legal-name',
      'base-rent',
      'expiration-date',
      'renewal-options',
      'cam-estimate',
    ],
    faqs: [
      {
        question: 'How do Reonomy and Lextract complement each other in due diligence?',
        answer: 'Reonomy tells you about the property and its market context - ownership history, comparable transactions, zoning data. Lextract tells you about the leases - the precise economic terms that drive the property\'s cash flow. Together, they support a comprehensive pre-LOI analysis that covers both market positioning and in-place lease verification.',
      },
    ],
    metaTitle: 'Property Data + Lease Extraction: Reonomy + Lextract Workflow',
    metaDescription: 'Combine Reonomy property intelligence with Lextract lease data extraction for complete acquisition due diligence. Extract 126 lease fields in minutes.',
  },
  {
    software: 'Slack and Microsoft Teams',
    slug: 'slack-teams',
    vendor: 'Various',
    category: 'productivity',
    overview: 'Slack and Microsoft Teams are the dominant workplace messaging platforms used by property management teams, brokerage firms, and corporate real estate teams for day-to-day communication, project coordination, and notifications. CRE teams use these platforms to collaborate on lease reviews, share extraction results with colleagues, and receive alerts on critical lease events. Integrating lease data workflows with messaging platforms improves team coordination and reduces reliance on email for time-sensitive lease data.',
    howLextractHelps: 'Lextract extraction results can be shared as structured reports in Slack or Teams channels, enabling teams to review extracted lease terms collaboratively, flag items for discussion, and coordinate the review process without switching between tools. Property managers can set up notification workflows that alert their Slack or Teams channels when critical dates are approaching, using data extracted from leases by Lextract.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Upload lease to Lextract and receive extraction results',
      'Share the Lextract extraction summary in a dedicated lease review Slack or Teams channel',
      'Team members review and comment on the extracted fields, flagging any concerns',
      'Export verified data to property management system or shared spreadsheet',
      'Set up a recurring notification workflow for critical date reminders using the extracted dates',
    ],
    criticalFields: [
      'tenant-legal-name',
      'expiration-date',
      'renewal-options',
      'base-rent',
    ],
    faqs: [
      {
        question: 'Can Lextract send extraction results to Slack or Teams automatically?',
        answer: 'Direct webhook integration with Slack and Teams is on the Lextract product roadmap. Currently, extraction results can be downloaded as Excel, Word, or PDF and shared in Slack or Teams as file attachments.',
      },
    ],
    metaTitle: 'Share Lease Extraction Results in Slack and Microsoft Teams',
    metaDescription: 'Collaborate on lease reviews using Slack and Teams. Lextract extracts 126 fields from lease PDFs for team review, critical date alerts, and property management workflows.',
  },
  {
    software: 'PracticePanther',
    slug: 'practicepanther',
    vendor: 'PracticePanther',
    category: 'legal',
    overview: 'PracticePanther is a legal practice management platform used by small-to-midsize commercial real estate law firms for matter management, time tracking, document storage, and billing. CRE attorneys using PracticePanther manage lease review matters, store executed lease documents, and track billable time spent on abstraction and analysis. The platform does not provide lease data extraction capabilities, so attorneys still rely on manual abstraction methods for client deliverables.',
    howLextractHelps: 'Lextract enables CRE attorneys using PracticePanther to deliver faster, more comprehensive lease abstracts. By processing the lease through Lextract before manual review, attorneys receive an initial extraction with red flag detection that guides their analysis. The extraction report can be saved in the PracticePanther matter file as a deliverable or working document.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Receive lease PDF in a new PracticePanther matter',
      'Upload to Lextract for initial extraction and red flag identification',
      'Use the extraction as the foundation for the client lease abstract',
      'Bill time spent reviewing and verifying the extraction rather than manual first-pass abstraction',
      'Store the Lextract output in the PracticePanther document management system',
    ],
    criticalFields: [
      'tenant-legal-name',
      'landlord-legal-name',
      'commencement-date',
      'expiration-date',
      'renewal-options',
      'termination-option',
      'audit-rights',
    ],
    faqs: [
      {
        question: 'How does Lextract change the economics of lease abstraction for small CRE law firms?',
        answer: 'Manual lease abstraction by a paralegal or junior attorney costs the firm $90-$250 in burdened labor per document. Lextract handles the initial extraction for $15 in 5-15 minutes. The attorney or paralegal then spends 20-30 minutes verifying confidence-flagged fields rather than 4-8 hours reading the document. This frees up attorney time for higher-value work and reduces the cost of delivering the abstraction service to clients.',
      },
    ],
    metaTitle: 'Lease Abstraction for CRE Law Firms Using PracticePanther',
    metaDescription: 'Accelerate lease abstract delivery for real estate law firms. Lextract extracts 126 fields with red flag detection so attorneys can focus on legal analysis, not data entry.',
  },
  {
    software: 'CoStar Real Estate Manager',
    slug: 'costar-real-estate-manager',
    vendor: 'CoStar Group',
    category: 'compliance',
    overview: 'CoStar Real Estate Manager (formerly known as CoStar Lease Manager) is an enterprise lease accounting and administration platform designed for corporate occupiers managing large lease portfolios under ASC 842 and IFRS 16. It is used by corporate real estate teams at Fortune 500 companies to manage lease data, generate compliance reports, and produce right-of-use asset and lease liability calculations. The platform integrates with major ERP systems and provides audit-ready lease accounting documentation.',
    howLextractHelps: 'Lextract ensures that lease data entered into CoStar Real Estate Manager is accurate before the platform runs its ASC 842 calculations. By extracting all payment schedules, option terms, and commencement data from lease PDFs before data entry, Lextract reduces the risk of input errors that create compliance issues. The red flag detection also surfaces lease provisions that require special accounting treatment under ASC 842.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Upload lease PDFs to Lextract for ASC 842 data extraction',
      'Review extracted payment schedules, options, and commencement dates',
      'Export data in CoStar Real Estate Manager import format',
      'Import lease data and run initial right-of-use asset and lease liability calculations',
      'Review compliance reports and audit trail documentation',
    ],
    criticalFields: [
      'commencement-date',
      'expiration-date',
      'base-rent',
      'rent-escalation',
      'renewal-options',
      'termination-option',
      'free-rent',
      'lease-type',
    ],
    faqs: [
      {
        question: 'How does Lextract support CoStar Real Estate Manager ASC 842 compliance?',
        answer: 'CoStar Real Estate Manager\'s ASC 842 calculations depend on accurate lease data inputs. Lextract provides a systematic extraction of all required data points - with confidence scores flagging fields that need careful review before they affect balance sheet calculations. This is particularly important for initial adoption projects where large portfolios must be abstracted and entered systematically.',
      },
    ],
    metaTitle: 'Lease Abstraction for CoStar Real Estate Manager - ASC 842',
    metaDescription: 'Prepare lease data for CoStar Real Estate Manager ASC 842 compliance. Lextract extracts all required accounting data from lease PDFs for CoStar REM import.',
  },
  {
    software: 'CamAudit',
    slug: 'camaudit',
    vendor: 'Ventora',
    category: 'cam-audit',
    overview:
      'CamAudit is a forensic CAM audit platform for commercial tenants. Tenants upload their lease and the landlord\'s annual CAM reconciliation statement; CamAudit applies 14 deterministic detection rules - covering management fee overcharges, pro-rata calculation errors, gross-up violations, CAM cap breaches, and more - and outputs a forensic audit report with a dispute letter draft.',
    howLextractHelps:
      'Lextract and CamAudit are designed to work in sequence. Lextract extracts the 126 structured fields from your lease PDF - including CAM definitions, pro-rata share formula, management fee cap, gross-up provisions, CAM cap percentage, base year, and audit rights language - providing the contractual baseline CamAudit needs to verify the landlord\'s reconciliation math. After abstracting your lease with Lextract, export your results and upload them to CamAudit.io alongside the annual reconciliation statement to run the full 14-rule forensic audit.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Upload your commercial lease PDF to Lextract and receive 126 extracted fields in 5–15 minutes',
      'Review confidence scores and verify CAM-related fields: pro-rata share, management fee cap, gross-up provisions, and CAM cap percentage',
      'Export the Lextract results as Excel, Word, or PDF',
      'Upload your lease PDF and the landlord\'s annual CAM reconciliation statement to CamAudit.io',
      'CamAudit cross-references your lease terms against the reconciliation using 14 detection rules',
      'Download the forensic audit report and auto-generated dispute letter draft',
    ],
    criticalFields: [
      'cam-cap-percentage',
      'cam-cap-type',
      'cam-exclusions',
      'pro-rata-share',
      'gross-up-provision',
      'management-fee-cap',
      'base-year',
      'audit-rights',
      'operating-expense-inclusions',
    ],
    faqs: [
      {
        question: 'How does Lextract connect to CamAudit?',
        answer: 'Lextract and CamAudit work in sequence: Lextract extracts the lease terms your audit depends on, and CamAudit uses those terms to verify the landlord\'s annual reconciliation math. The two products share the same lease data model, so fields extracted by Lextract map directly to the inputs CamAudit needs to run its 14 detection rules.',
      },
      {
        question: 'Can I use CamAudit without Lextract?',
        answer: 'Yes. CamAudit accepts the original lease PDF directly and extracts the necessary fields for audit purposes. Lextract adds value by providing a complete 126-field structured abstract with confidence scoring - useful if you also need lease data for other purposes like Yardi import, ASC 842 compliance, or portfolio management.',
      },
    ],
    metaTitle: 'Lextract + CamAudit - Lease Abstraction for CAM Audits',
    metaDescription: 'Use Lextract to extract CAM provisions from your lease, then bring that data to CamAudit.io to run a forensic audit of your landlord\'s reconciliation statement.',
  },
  {
    software: 'CapVeri',
    slug: 'capveri',
    vendor: 'Ventora',
    category: 'property-management',
    overview:
      'CapVeri is a CRE FinOps platform for landlords and property managers that automates CAM reconciliation. It ingests CSV and PDF exports from Yardi, MRI, and AppFolio - no API integrations required - and handles BOMA calculations, tenant share allocations, gross-up normalization, CAM cap enforcement, and pro-rata denominator validation.',
    howLextractHelps:
      'Before a property manager can run an accurate CAM reconciliation, they need structured lease data for every tenant: pro-rata share formula, CAM inclusions and exclusions, management fee cap, gross-up provisions, and CAM cap percentage. Lextract extracts these fields from any lease PDF in 5–15 minutes, providing the lease data inputs CapVeri needs to build accurate expense pool allocations. This is especially valuable at acquisition or lease renewal when lease terms change and reconciliation setups must be updated.',
    exportFormats: ['Excel', 'Word', 'PDF'],
    workflowSteps: [
      'Upload tenant lease PDFs to Lextract and receive structured field extractions in 5–15 minutes',
      'Review and verify CAM-related fields: pro-rata share, management fee cap, gross-up provisions, and CAM cap',
      'Export an Excel handoff for each tenant',
      'Import tenant lease data into CapVeri to configure the CAM pool and tenant allocation rules',
      'Upload your Yardi, MRI, or AppFolio GL export to CapVeri',
      'Review the automated reconciliation output and generate tenant reconciliation statements',
    ],
    criticalFields: [
      'pro-rata-share',
      'cam-cap-percentage',
      'cam-cap-type',
      'cam-exclusions',
      'management-fee-cap',
      'gross-up-provision',
      'base-year',
      'operating-expense-inclusions',
      'lease-type',
    ],
    faqs: [
      {
        question: 'How does Lextract connect to CapVeri?',
        answer: 'Lextract extracts the tenant lease terms CapVeri needs to build accurate CAM pool configurations. After abstracting tenant leases with Lextract, property managers can configure CapVeri\'s expense allocation rules using the extracted pro-rata shares, CAM caps, management fee limits, and gross-up thresholds - eliminating manual lease lookups during the reconciliation setup.',
      },
      {
        question: 'Does CapVeri require Lextract?',
        answer: 'No. CapVeri can be configured manually or from existing lease data. Lextract accelerates the initial setup for new acquisitions or portfolios with many leases, reducing the time needed to configure each tenant\'s allocation rules from hours to minutes.',
      },
    ],
    metaTitle: 'Lextract + CapVeri - Lease Data for CAM Reconciliation',
    metaDescription: 'Use Lextract to extract tenant lease terms, then feed that data to CapVeri to automate CAM reconciliation from your Yardi, MRI, or AppFolio exports.',
  },
]

// ─── Related Integrations ───────────────────────────────────────────

const INTEGRATION_RELATIONS: Record<string, string[]> = {
  'yardi-voyager': ['mri-software', 'realpage'],
  'mri-software': ['yardi-voyager', 'argus-enterprise'],
  'argus-enterprise': ['costar-suite', 'mri-software'],
  'costar-suite': ['argus-enterprise', 'realpage'],
  'realpage': ['yardi-voyager', 'appfolio'],
  'appfolio': ['buildium', 'realpage'],
  'buildium': ['appfolio', 'realpage'],
  'visual-lease': ['leasequery', 'lease-harbor'],
  'leasequery': ['visual-lease', 'lease-harbor'],
  'juniper-square': ['argus-enterprise', 'mri-software'],
  'tririga': ['yardi-voyager', 'mri-software'],
  'lease-harbor': ['visual-lease', 'leasequery'],
  'microsoft-excel': ['google-sheets', 'airtable'],
  'google-sheets': ['microsoft-excel', 'airtable'],
  'docusign': ['microsoft-excel', 'yardi-voyager'],
  'quickbooks': ['microsoft-excel', 'sage-intacct'],
  'airtable': ['google-sheets', 'notion'],
  'sharepoint': ['box', 'microsoft-excel'],
  'netsuite': ['sage-intacct', 'leasequery'],
  'sage-intacct': ['netsuite', 'leasequery'],
  'notion': ['airtable', 'google-sheets'],
  'google-drive': ['google-sheets', 'dropbox'],
  'dropbox': ['google-drive', 'box'],
  'crexi': ['loopnet', 'compstak'],
  'compstak': ['crexi', 'argus-enterprise'],
  'loopnet': ['crexi', 'costar-suite'],
  'microsoft-dynamics': ['netsuite', 'sage-intacct'],
  'clio': ['practicepanther', 'docusign'],
  'box': ['sharepoint', 'dropbox'],
  'ai-tools-lease-review': ['microsoft-excel', 'argus-enterprise'],
  'reonomy': ['crexi', 'compstak'],
  'slack-teams': ['microsoft-excel', 'airtable'],
  'practicepanther': ['clio', 'docusign'],
  'costar-real-estate-manager': ['costar-suite', 'argus-enterprise'],
  'camaudit': ['yardi-voyager', 'argus-enterprise'],
  'capveri': ['yardi-voyager', 'mri-software'],
}

for (const integration of INTEGRATIONS) {
  const related = INTEGRATION_RELATIONS[integration.slug]
  if (related) integration.relatedIntegrations = related
}

const ALL_INTEGRATIONS = [...INTEGRATIONS]
export const INDEXABLE_INTEGRATIONS = filterRetainedSeoItems('integrations', ALL_INTEGRATIONS)

// ─── Helper Functions ────────────────────────────────────────────────

export function getIntegrationBySlug(slug: string): Integration | undefined {
  return ALL_INTEGRATIONS.find((i) => i.slug === slug)
}

export function getAllIntegrationSlugs(): string[] {
  return ALL_INTEGRATIONS.map((i) => i.slug)
}

export function getIndexableIntegrationBySlug(slug: string): Integration | undefined {
  return INDEXABLE_INTEGRATIONS.find((i) => i.slug === slug)
}

export function getAllIndexableIntegrationSlugs(): string[] {
  return INDEXABLE_INTEGRATIONS.map((i) => i.slug)
}

export function getIntegrationSeoRedirect(slug: string): string | null {
  if (isRetainedSeoSlug('integrations', slug)) return null
  if (!ALL_INTEGRATIONS.some((integration) => integration.slug === slug)) return null
  return getExplicitSeoRedirect('integrations', slug) ?? '/integrations'
}

// ─── Publication date ───────────────────────────────────────────────
export const INTEGRATIONS_PUBLISHED_AT = '2026-03-18'
