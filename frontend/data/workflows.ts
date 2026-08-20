export interface WorkflowStep {
  name: string
  description: string
  tool: 'source' | 'lextract' | 'destination'
}

export interface Workflow {
  name: string
  slug: string
  toolName: string
  toolSlug: string
  category: 'import' | 'export' | 'compliance' | 'analysis' | 'migration'
  problem: string
  steps: WorkflowStep[]
  timeSaved: string
  targetPersonas: string[]
  relatedWorkflows: string[]
  faqs: Array<{ question: string; answer: string }>
  metaTitle: string
  metaDescription: string
}

export const WORKFLOWS_PUBLISHED_AT = '2026-03-19'

export const WORKFLOWS: Workflow[] = [
  // ─── P0 ───────────────────────────────────────────────────────────────

  {
    name: 'Lease PDF to Excel',
    slug: 'pdf-to-excel',
    toolName: 'Microsoft Excel',
    toolSlug: 'microsoft-excel',
    category: 'export',
    problem:
      'Commercial lease data is locked in PDFs - there is no native way to get structured, field-by-field data into Excel without hours of manual copy-paste or abstraction. Every property manager, lease administrator, and analyst ends up re-reading the same document multiple times just to populate a spreadsheet.',
    steps: [
      {
        name: 'Upload lease PDF to Lextract',
        description:
          'Drag-and-drop the executed lease PDF into the Lextract dashboard. Lextract accepts single documents up to 200 pages and multi-exhibit packages.',
        tool: 'source',
      },
      {
        name: 'AI extraction runs in 5–15 minutes',
        description:
          'Lextract\'s AI reads commercial lease PDFs end-to-end and extracts 126 structured fields - rent schedule, escalations, options, CAM provisions, insurance requirements, and more.',
        tool: 'lextract',
      },
      {
        name: 'Review confidence scores',
        description:
          'Each extracted field shows a confidence score. Fields flagged below 90% are highlighted for manual review so you can verify before exporting.',
        tool: 'lextract',
      },
      {
        name: 'Download Excel export',
        description:
          'Click "Export to Excel" to download a structured .xlsx file with one row per field and columns for extracted value, confidence score, and source page reference.',
        tool: 'destination',
      },
      {
        name: 'Import into master lease tracking spreadsheet',
        description:
          'Paste the extracted fields into your existing lease tracking workbook or use the downloaded file as a standalone lease abstract. All 126 fields are labeled with standard CRE terminology.',
        tool: 'destination',
      },
    ],
    timeSaved: '3–6 hours per lease',
    targetPersonas: [
      'Property Managers',
      'Lease Administrators',
      'Due Diligence Analysts',
      'Portfolio Managers',
      'Tenant Representatives',
    ],
    relatedWorkflows: ['rent-roll-verification', 'lease-roll-builder', 'expiration-tracker'],
    faqs: [
      {
        question: 'What fields does Lextract extract into Excel?',
        answer:
          'Lextract extracts 126 structured fields including tenant name, premises, base rent, rent escalations, lease commencement and expiration dates, renewal options, termination rights, CAM provisions, security deposit, permitted use, and more. Every field maps to a named column in the Excel export.',
      },
      {
        question: 'Can I export multiple leases to a single Excel file?',
        answer:
          'Yes. After processing multiple leases, you can bulk export all abstracts into a single Excel workbook with one row per lease - ideal for building a portfolio-level rent roll.',
      },
      {
        question: 'How accurate is the extraction?',
        answer:
          'Lextract returns confidence-scored field extraction on standard commercial leases. Each field displays a confidence score so you know exactly which values to verify before using the data.',
      },
      {
        question: 'Does it work on scanned PDFs?',
        answer:
          'Yes - our AI reads scanned PDFs natively as images, so it handles both digitally-created PDFs and scanned documents, including multi-exhibit lease packages.',
      },
    ],
    metaTitle: 'Lease PDF to Excel Workflow - Extract 126 Fields in Minutes',
    metaDescription:
      'Convert commercial lease PDFs to Excel automatically. Lextract extracts 126 structured fields from any lease PDF in 5–15 minutes. No manual copy-paste.',
  },

  {
    name: 'DocuSign to Structured Data',
    slug: 'docusign-to-data',
    toolName: 'DocuSign',
    toolSlug: 'docusign',
    category: 'import',
    problem:
      'Executed leases from DocuSign arrive as PDFs. There is no automatic way to extract the signed terms into a structured format - teams resort to manual abstraction that takes 4–8 hours per document and introduces transcription errors that compound across a portfolio.',
    steps: [
      {
        name: 'Download executed PDF from DocuSign',
        description:
          'After the lease is fully executed in DocuSign, download the completed PDF from the DocuSign envelope or your connected cloud storage.',
        tool: 'source',
      },
      {
        name: 'Upload to Lextract',
        description:
          'Upload the executed PDF directly to the Lextract dashboard. The full signed document - including all riders and exhibits - can be uploaded as a single file.',
        tool: 'lextract',
      },
      {
        name: 'Extract 126 fields with confidence scores',
        description:
          'Lextract processes the document and extracts all 126 structured fields. Confidence scores flag any fields that may need review, such as complex rent escalation tables or handwritten amendments.',
        tool: 'lextract',
      },
      {
        name: 'Download structured export',
        description:
          'Export the extraction results as Excel, Word, or PDF depending on your downstream use: property management system handoff, lease accounting review, or internal reporting.',
        tool: 'destination',
      },
      {
        name: 'Import into property management system',
        description:
          'Use the exported data to populate your PMS (Yardi, MRI, AppFolio) or lease accounting system. The structured fields eliminate manual re-entry and the transcription errors that come with it.',
        tool: 'destination',
      },
    ],
    timeSaved: '4–8 hours per lease',
    targetPersonas: [
      'Lease Administrators',
      'Property Managers',
      'Real Estate Attorneys',
      'Corporate Real Estate Teams',
    ],
    relatedWorkflows: ['pdf-to-yardi', 'pdf-to-mri', 'pms-migration'],
    faqs: [
      {
        question: 'Can Lextract connect directly to my DocuSign account?',
        answer:
          'Currently Lextract processes PDFs that you upload manually. You download the executed PDF from DocuSign and upload it to Lextract. Native DocuSign integration is on the roadmap.',
      },
      {
        question: 'Does Lextract preserve signature page data?',
        answer:
          'Lextract extracts the substantive lease terms from the body of the document. Signature block information such as execution date and signing party names is captured where present as structured fields.',
      },
      {
        question: 'What if the lease has riders or exhibits?',
        answer:
          'Upload the full DocuSign PDF including all exhibits. Lextract processes the entire document and attributes extracted fields to their source pages, so you can trace each value back to the specific exhibit or rider it came from.',
      },
    ],
    metaTitle: 'Extract Data from DocuSign Executed Leases',
    metaDescription:
      'Automatically extract structured data from executed DocuSign leases. Lextract converts signed lease PDFs to 126 structured fields in 5–15 minutes.',
  },

  {
    name: 'PDF to Yardi Voyager',
    slug: 'pdf-to-yardi',
    toolName: 'Yardi Voyager',
    toolSlug: 'yardi-voyager',
    category: 'import',
    problem:
      'Entering a new lease into Yardi Voyager from a PDF requires manually reading every clause and keying dozens of fields - a process that takes 2–4 hours per lease and introduces transcription errors that affect rent billing, CAM reconciliation, and reporting accuracy downstream.',
    steps: [
      {
        name: 'Upload lease PDF to Lextract',
        description:
          'Upload the executed lease PDF to Lextract. The system handles both digitally-created PDFs and scanned documents.',
        tool: 'source',
      },
      {
        name: 'Extract 126 structured fields',
        description:
          'Lextract extracts all fields relevant to Yardi data entry: tenant name, premises, lease dates, base rent, escalations, CAM structure, security deposit, options, and more.',
        tool: 'lextract',
      },
      {
        name: 'Review and approve extracted data',
        description:
          'Review confidence scores for key fields - particularly rent schedules, escalation tables, and option notice periods - before proceeding to export.',
        tool: 'lextract',
      },
      {
        name: 'Download Yardi handoff workbook',
        description:
          'Export the extraction as an Excel workbook organized for Yardi Voyager lease-entry review. The mapping covers the core lease record, charge schedule, and option fields.',
        tool: 'destination',
      },
      {
        name: 'Import into Yardi Voyager',
        description:
          'Use Yardi\'s import tools to load the workbook into the appropriate unit, tenant, and charge records. Verify the imported rent schedule and set up future billing.',
        tool: 'destination',
      },
    ],
    timeSaved: '2–4 hours per lease',
    targetPersonas: ['Property Managers', 'Lease Administrators', 'Portfolio Managers'],
    relatedWorkflows: ['pdf-to-mri', 'pms-migration', 'pdf-to-appfolio'],
    faqs: [
      {
        question: 'Which Yardi modules does the export support?',
        answer:
          'The Lextract export covers the fields needed to populate Yardi\'s core Lease, Tenant, and Charge Schedule records. CAM structure fields are also included to support Yardi CAM reconciliation setup.',
      },
      {
        question: 'Can Lextract handle commercial leases with complex rent schedules?',
        answer:
          'Yes. Lextract extracts multi-year rent schedules including fixed escalation steps, CPI-linked escalations, and percentage rent provisions. Each period is output as a separate row in the charge schedule export.',
      },
      {
        question: 'What about lease amendments?',
        answer:
          'Upload the original lease and each amendment as a combined PDF or as separate uploads. Lextract can process amendments and you can compare extracted fields to identify what changed.',
      },
    ],
    metaTitle: 'Import Lease Data into Yardi Voyager from PDF',
    metaDescription:
      'Skip manual lease abstraction before Yardi entry. Lextract extracts 126 lease fields from PDFs and outputs a Yardi-ready Excel handoff in 5-15 minutes.',
  },

  {
    name: 'PDF to QuickBooks',
    slug: 'pdf-to-quickbooks',
    toolName: 'QuickBooks',
    toolSlug: 'quickbooks',
    category: 'import',
    problem:
      'Small commercial landlords using QuickBooks need to track lease payment schedules, security deposits, and CAM charges - but QuickBooks requires manual entry from the lease PDF. Without structured extraction, landlords risk billing errors, missed escalations, and incorrect security deposit accounting.',
    steps: [
      {
        name: 'Upload lease PDF to Lextract',
        description:
          'Upload the executed commercial lease PDF. Lextract works on NNN, gross, and modified gross leases of any structure.',
        tool: 'source',
      },
      {
        name: 'Extract rent schedule, CAM, and security deposit',
        description:
          'Lextract identifies the base rent for each lease year, CAM estimates and caps, security deposit amount, and any scheduled escalations.',
        tool: 'lextract',
      },
      {
        name: 'Download structured Excel export',
        description:
          'Download the extracted fields as an Excel file showing each payment period, amount, and type - formatted for easy reference during QuickBooks setup.',
        tool: 'destination',
      },
      {
        name: 'Create customer and tenant record in QuickBooks',
        description:
          'Use the extracted tenant name, address, and contact information to create a Customer record in QuickBooks representing the commercial tenant.',
        tool: 'destination',
      },
      {
        name: 'Enter lease payment schedule and recurring charges',
        description:
          'Using the extracted rent schedule, set up recurring monthly invoices in QuickBooks for base rent and CAM. Enter the security deposit as a liability. Configure annual escalation reminders.',
        tool: 'destination',
      },
    ],
    timeSaved: '2–3 hours per lease',
    targetPersonas: ['Small Property Managers', 'Independent Landlords'],
    relatedWorkflows: ['cam-reconciliation-prep', 'rent-escalation-schedule', 'expiration-tracker'],
    faqs: [
      {
        question: 'Does Lextract extract CAM estimates from the lease?',
        answer:
          'Yes. Lextract extracts the CAM structure including estimated annual amounts, pro-rata share methodology, CAM caps, and exclusion lists where present in the lease.',
      },
      {
        question: 'How do I handle percentage rent in QuickBooks?',
        answer:
          'Lextract extracts the percentage rent provision including the breakpoint and applicable rate. You can use this to set up a variable invoice template in QuickBooks for months when percentage rent applies.',
      },
      {
        question: 'Can I use this workflow for residential leases?',
        answer:
          'Lextract is optimized for commercial leases. The 126-field schema covers commercial lease structures. Residential lease extraction is not the primary use case.',
      },
    ],
    metaTitle: 'Track Commercial Lease in QuickBooks - PDF to Data',
    metaDescription:
      'Extract lease payment schedules from PDFs for QuickBooks. Lextract outputs rent amounts, CAM estimates, and security deposit data ready for QuickBooks setup.',
  },

  {
    name: 'ASC 842 Data Preparation',
    slug: 'asc-842-data-prep',
    toolName: 'Visual Lease',
    toolSlug: 'visual-lease',
    category: 'compliance',
    problem:
      'ASC 842 requires companies to recognize right-of-use assets and lease liabilities on the balance sheet. Extracting the exact data points auditors need - payment schedules, option terms, commencement dates, and incremental borrowing rates - from lease PDFs manually is time-consuming and error-prone, with mistakes that can materially affect financial statements.',
    steps: [
      {
        name: 'Upload all leases subject to ASC 842',
        description:
          'Upload every executed lease PDF in scope for ASC 842 - operating leases over 12 months. Portfolio processing allows multiple documents in a single session.',
        tool: 'source',
      },
      {
        name: 'Extract commencement dates, payment schedules, and escalations',
        description:
          'Lextract identifies all fields required for ROU asset calculations: lease commencement date, expiration date, base rent by period, escalation triggers and rates, and any free rent periods.',
        tool: 'lextract',
      },
      {
        name: 'Review confidence scores on option fields',
        description:
          'Option fields - renewal terms, purchase options, termination rights - are critical to ASC 842 classification. Review any fields below 90% confidence before proceeding.',
        tool: 'lextract',
      },
      {
        name: 'Assess option exercise probability',
        description:
          'Use the extracted option terms and notice periods to determine whether renewal or purchase options are reasonably certain to be exercised, as required under ASC 842.',
        tool: 'lextract',
      },
      {
        name: 'Download data formatted for lease accounting software',
        description:
          'Export the extracted data in a format compatible with Visual Lease, LeaseQuery, or CoStar Real Estate Manager for ROU asset and lease liability calculations.',
        tool: 'destination',
      },
      {
        name: 'Import and run ROU asset calculations',
        description:
          'Load the extracted data into your lease accounting platform. The system calculates present value of future lease payments, ROU asset, and lease liability entries for each lease.',
        tool: 'destination',
      },
    ],
    timeSaved: '4–8 hours per lease for initial adoption',
    targetPersonas: [
      'Lease Administrators',
      'Compliance Teams',
      'Corporate Real Estate Teams',
      'Auditors',
    ],
    relatedWorkflows: ['lease-audit-data', 'annual-re-abstraction', 'pdf-to-netsuite'],
    faqs: [
      {
        question: 'Which ASC 842 fields does Lextract extract?',
        answer:
          'Lextract extracts commencement date, expiration date, base rent by period, CPI and fixed escalations, free rent periods, renewal option terms and notice periods, termination rights, purchase options, and variable lease payment provisions - all inputs required for the ASC 842 lease liability calculation.',
      },
      {
        question: 'Does Lextract distinguish operating leases from finance leases?',
        answer:
          'Lextract extracts the lease terms; the classification between operating and finance lease under ASC 842 requires judgment based on those terms and is made in your lease accounting software.',
      },
      {
        question: 'How do I handle lease amendments for ASC 842?',
        answer:
          'Upload lease amendments as separate documents. Lextract extracts the amended terms, and you can compare the original and amended abstracts to identify modifications that trigger lease remeasurement under ASC 842.',
      },
      {
        question: 'Can auditors access the extracted data?',
        answer:
          'Yes. Lextract provides source page references for every extracted field, so auditors can trace each value directly back to the lease PDF - a key requirement for audit documentation.',
      },
    ],
    metaTitle: 'ASC 842 Lease Data Preparation - Extract Required Fields',
    metaDescription:
      'Prepare lease data for ASC 842 compliance. Lextract extracts all required inputs - commencement dates, payment schedules, options - from PDFs in minutes.',
  },

  // ─── P1 ───────────────────────────────────────────────────────────────

  {
    name: 'PDF to MRI Software',
    slug: 'pdf-to-mri',
    toolName: 'MRI Software',
    toolSlug: 'mri-software',
    category: 'import',
    problem:
      'Entering lease data into MRI Software from PDFs requires manually locating and keying every field - rent amounts, escalation schedules, CAM provisions, and critical dates - across a document that may span dozens of pages and multiple exhibits. This process is slow, error-prone, and must be repeated for every new lease or amendment.',
    steps: [
      {
        name: 'Upload lease PDF to Lextract',
        description:
          'Upload the executed lease PDF including all riders and exhibits. Lextract handles multi-section documents and attribute extraction from exhibits.',
        tool: 'source',
      },
      {
        name: 'Extract all MRI-relevant fields',
        description:
          'Lextract extracts the tenant record, premises, lease dates, rent schedule, operating expense structure, security deposit, options, and critical dates - mapped to MRI field names.',
        tool: 'lextract',
      },
      {
        name: 'Review extracted data against PDF',
        description:
          'Each extracted field shows the source page and confidence score. Review any flagged fields against the original document before exporting.',
        tool: 'lextract',
      },
      {
        name: 'Export MRI handoff workbook',
        description:
          'Download the extraction as an Excel workbook organized around MRI Software field groups. The export includes separate sections for tenant data, lease terms, and charge schedules.',
        tool: 'destination',
      },
      {
        name: 'Import into MRI Software',
        description:
          'Use MRI\'s data import tools to load the workbook. Verify the tenant record, active charges, and critical date reminders after import.',
        tool: 'destination',
      },
    ],
    timeSaved: '2–4 hours per lease',
    targetPersonas: ['Property Managers', 'Lease Administrators'],
    relatedWorkflows: ['pdf-to-yardi', 'pms-migration', 'pdf-to-appfolio'],
    faqs: [
      {
        question: 'Does the export support MRI Commercial Management?',
        answer:
          'Yes. The export is designed for MRI Commercial Management and covers the lease, tenant, unit, and charge schedule records used in that module.',
      },
      {
        question: 'How does Lextract handle percentage rent in MRI imports?',
        answer:
          'Lextract extracts percentage rent breakpoints and rates as separate fields. These map to MRI\'s percentage rent charge type and can be configured as variable charges after import.',
      },
    ],
    metaTitle: 'Import Lease Data into MRI Software from PDF',
    metaDescription:
      'Skip manual lease abstraction before MRI entry. Lextract extracts 126 commercial lease fields from PDFs and outputs an MRI-ready Excel handoff in 5-15 minutes.',
  },

  {
    name: 'PDF to AppFolio',
    slug: 'pdf-to-appfolio',
    toolName: 'AppFolio',
    toolSlug: 'appfolio',
    category: 'import',
    problem:
      'Property managers using AppFolio for mixed-use or small commercial portfolios must manually enter lease terms from PDFs into each tenant record - a process that is slow, inconsistent across staff, and a source of billing errors when rent schedules are mis-entered.',
    steps: [
      {
        name: 'Upload commercial lease PDF',
        description:
          'Upload the executed commercial lease to Lextract. AppFolio supports both residential and commercial tenants, and Lextract extracts the commercial-specific fields.',
        tool: 'source',
      },
      {
        name: 'Extract tenant and lease term fields',
        description:
          'Lextract extracts tenant name, premises description, lease start and end dates, base rent, escalation schedule, security deposit, and CAM structure.',
        tool: 'lextract',
      },
      {
        name: 'Review and verify key billing fields',
        description:
          'Check confidence scores on rent amounts and escalation dates before exporting. Billing errors in AppFolio compound over time and require manual correction.',
        tool: 'lextract',
      },
      {
        name: 'Enter extracted data into AppFolio tenant record',
        description:
          'Use the Lextract export as a reference to populate the AppFolio lease record: lease dates, rent schedule, security deposit, and any custom charges for NNN or CAM.',
        tool: 'destination',
      },
    ],
    timeSaved: '1–3 hours per lease',
    targetPersonas: ['Small Property Managers', 'Mixed-Use Landlords'],
    relatedWorkflows: ['pdf-to-yardi', 'pdf-to-mri', 'cam-reconciliation-prep'],
    faqs: [
      {
        question: 'Does AppFolio support commercial leases?',
        answer:
          'AppFolio supports commercial tenants and leases. Lextract extracts the commercial-specific terms - CAM provisions, option rights, and NNN charges - that standard residential workflows do not cover.',
      },
      {
        question: 'Can I use this for month-to-month commercial tenants?',
        answer:
          'Yes. Lextract extracts whatever term is in the document. For holdover or month-to-month situations, the extracted lease terms help confirm the holdover rate and conditions.',
      },
    ],
    metaTitle: 'Import Commercial Lease Data into AppFolio from PDF',
    metaDescription:
      'Populate AppFolio tenant records from lease PDFs automatically. Lextract extracts 126 structured lease fields in 5–15 minutes - no manual re-entry.',
  },

  {
    name: 'PDF to Airtable',
    slug: 'pdf-to-airtable',
    toolName: 'Airtable',
    toolSlug: 'airtable',
    category: 'export',
    problem:
      'Tenant representatives and small operations teams use Airtable to track lease portfolios but have no structured way to get lease data out of PDFs and into an Airtable base. Manual entry across dozens of fields per lease creates an inconsistent database that is unreliable for portfolio reporting.',
    steps: [
      {
        name: 'Upload lease PDF to Lextract',
        description:
          'Upload the executed lease PDF. Lextract accepts both single-document leases and multi-exhibit packages.',
        tool: 'source',
      },
      {
        name: 'Extract 126 structured fields',
        description:
          'Lextract extracts all lease fields including tenant name, premises, rent schedule, escalations, options, and critical dates.',
        tool: 'lextract',
      },
      {
        name: 'Download Excel export',
        description:
          'Download the extraction as an Excel workbook with field names matching standard CRE terminology. Use the workbook as the source for Airtable import or manual mapping.',
        tool: 'lextract',
      },
      {
        name: 'Import data into Airtable base',
        description:
          'Use Airtable\'s import feature to add the extracted Excel data as a new record in your lease portfolio base. Map each column to your existing Airtable fields.',
        tool: 'destination',
      },
      {
        name: 'Link to tenant and property records',
        description:
          'After import, link the new lease record to the relevant tenant and property records in your Airtable base to enable portfolio-level views and rollups.',
        tool: 'destination',
      },
    ],
    timeSaved: '2–4 hours per lease setup',
    targetPersonas: ['Tenant Representatives', 'Small Operations Teams'],
    relatedWorkflows: ['pdf-to-google-sheets', 'pdf-to-excel', 'expiration-tracker'],
    faqs: [
      {
        question: 'Can I customize the fields imported into Airtable?',
        answer:
          'Yes. The Lextract Excel export contains all 126 fields. During Airtable setup you can choose which columns to map to your existing base fields and skip any fields your workflow does not need.',
      },
      {
        question: 'Can Lextract update existing Airtable records?',
        answer:
          'Currently Lextract exports data for import. Updating existing records requires manually merging the new export with the existing Airtable row, or using Airtable\'s upsert feature if you have a unique identifier.',
      },
    ],
    metaTitle: 'Import Commercial Lease Data into Airtable from PDF',
    metaDescription:
      'Build your Airtable lease portfolio database from PDFs. Lextract extracts 126 structured lease fields and exports an Excel workbook ready for Airtable mapping.',
  },

  {
    name: 'PDF to Google Sheets',
    slug: 'pdf-to-google-sheets',
    toolName: 'Google Sheets',
    toolSlug: 'google-sheets',
    category: 'export',
    problem:
      'Small property managers and tenant representatives use Google Sheets to track leases but must manually copy data from PDFs field by field. With no structured extraction, the sheet becomes stale or inaccurate, creating discrepancies between the source document and the working database.',
    steps: [
      {
        name: 'Upload lease PDF to Lextract',
        description:
          'Upload the executed lease PDF from your computer or a cloud storage link.',
        tool: 'source',
      },
      {
        name: 'Run AI extraction',
        description:
          'Lextract reads the PDF and extracts all 126 fields including all dates, rent schedule, CAM structure, and options.',
        tool: 'lextract',
      },
      {
        name: 'Review confidence-flagged fields',
        description:
          'Any field below the confidence threshold is highlighted. Review those values in the original PDF before exporting.',
        tool: 'lextract',
      },
      {
        name: 'Download Excel export',
        description:
          'Export all extracted fields as an Excel workbook.',
        tool: 'destination',
      },
      {
        name: 'Import workbook into Google Sheets',
        description:
          'Use File > Import in Google Sheets to load the workbook. Each lease can be represented in your master tracking sheet with all 126 fields as columns.',
        tool: 'destination',
      },
    ],
    timeSaved: '2–4 hours per lease',
    targetPersonas: ['Small Property Managers', 'Tenant Representatives'],
    relatedWorkflows: ['pdf-to-airtable', 'pdf-to-excel', 'lease-roll-builder'],
    faqs: [
      {
        question: 'Can I import Lextract data directly into a Google Sheet?',
        answer:
          'Yes. Download the Lextract Excel export and use Google Sheets File > Import to load it. You can import into a new sheet or append to an existing one.',
      },
      {
        question: 'How do I handle a portfolio of leases in Google Sheets?',
        answer:
          'Process each lease in Lextract and download an Excel export for each. Then use Google Sheets to consolidate the workbooks into a master lease tracking sheet with one row per lease.',
      },
    ],
    metaTitle: 'Lease PDF to Google Sheets - Extract 126 Fields Automatically',
    metaDescription:
      'Populate your Google Sheets lease tracker from PDFs. Lextract extracts 126 structured fields from any commercial lease PDF in 5–15 minutes.',
  },

  {
    name: 'PDF to ARGUS Enterprise',
    slug: 'pdf-to-argus',
    toolName: 'ARGUS Enterprise',
    toolSlug: 'argus-enterprise',
    category: 'analysis',
    problem:
      'ARGUS cash flow models require precise lease inputs - errors in rent schedules, escalation terms, or option data directly affect valuation. Manually entering 20–50 leases during due diligence creates bottlenecks, and keying errors are difficult to catch before they flow through to the cap rate analysis.',
    steps: [
      {
        name: 'Upload all lease PDFs from the data room',
        description:
          'Upload the full set of executed lease PDFs. Portfolio processing allows multiple documents at once, accelerating due diligence timelines.',
        tool: 'source',
      },
      {
        name: 'Extract ARGUS-relevant fields for each lease',
        description:
          'Lextract extracts tenant name, lease start and expiration, base rent by period, escalation type and rate, free rent periods, options, and CAM structure - all inputs for an ARGUS model.',
        tool: 'lextract',
      },
      {
        name: 'Review confidence scores on escalation and option fields',
        description:
          'ARGUS models are sensitive to escalation rates and option exercise dates. Review any flagged fields against the source lease before building the model.',
        tool: 'lextract',
      },
      {
        name: 'Export structured lease data',
        description:
          'Download the extracted lease data as an Excel file structured for ARGUS import or manual entry into the ARGUS lease tab.',
        tool: 'destination',
      },
      {
        name: 'Build or update ARGUS model',
        description:
          'Enter or import the extracted lease data into ARGUS Enterprise. Validate the rent roll output against the Lextract abstracts before running the full DCF.',
        tool: 'destination',
      },
    ],
    timeSaved: '3–6 hours per property for due diligence',
    targetPersonas: ['Due Diligence Analysts', 'Asset Managers', 'Investment Managers'],
    relatedWorkflows: ['data-room-review', 'rent-roll-verification', 'dscr-from-leases'],
    faqs: [
      {
        question: 'Does Lextract output match ARGUS field names?',
        answer:
          'Lextract exports use standard CRE terminology that maps directly to ARGUS lease inputs: base rent, rent steps, CPI escalation, free rent, and lease expiration date. The Excel export is structured to minimize re-labeling.',
      },
      {
        question: 'How does Lextract handle CPI escalation clauses?',
        answer:
          'Lextract identifies CPI escalation provisions and extracts the base year, cap on increase, floor, and applicable CPI index. You then enter the appropriate CPI assumptions in ARGUS.',
      },
      {
        question: 'Can Lextract help with ARGUS re-underwriting?',
        answer:
          'Yes. For re-underwriting an existing hold, upload the current executed leases (including amendments) to get an updated lease abstract that reflects any modifications since the original ARGUS model was built.',
      },
    ],
    metaTitle: 'Extract Lease Data for ARGUS Enterprise Models',
    metaDescription:
      'Speed up ARGUS model inputs during due diligence. Lextract extracts precise rent schedules, escalations, and option terms from lease PDFs in 5–15 minutes.',
  },

  {
    name: 'Rent Roll Verification',
    slug: 'rent-roll-verification',
    toolName: 'Microsoft Excel',
    toolSlug: 'microsoft-excel',
    category: 'analysis',
    problem:
      'Sellers provide rent rolls that may not accurately reflect executed lease terms - rents may be overstated, expiration dates may be wrong, and option terms may be omitted. Verifying each line item against source documents is critical for acquisition due diligence but is extremely time-intensive without extraction tooling.',
    steps: [
      {
        name: 'Obtain rent roll and lease PDFs from seller',
        description:
          'Collect the seller-provided rent roll (Excel or PDF) and all executed lease PDFs from the data room.',
        tool: 'source',
      },
      {
        name: 'Upload all lease PDFs to Lextract',
        description:
          'Process each lease PDF through Lextract to generate an independent abstract for every tenant.',
        tool: 'lextract',
      },
      {
        name: 'Export abstracts as Excel',
        description:
          'Download the extracted lease data for all tenants into a consolidated Excel export.',
        tool: 'lextract',
      },
      {
        name: 'Build side-by-side comparison in Excel',
        description:
          'Create a comparison workbook with the seller rent roll alongside Lextract-extracted values. Use VLOOKUP or Power Query to align rows by tenant and flag discrepancies.',
        tool: 'destination',
      },
      {
        name: 'Flag and escalate variances',
        description:
          'Identify discrepancies in base rent, expiration date, escalation terms, and option status. Prepare a variance summary for legal review and seller representation confirmation.',
        tool: 'destination',
      },
    ],
    timeSaved: '1–2 hours per property for verification',
    targetPersonas: ['Due Diligence Analysts', 'Acquisition Teams'],
    relatedWorkflows: ['data-room-review', 'pdf-to-argus', 'lease-roll-builder'],
    faqs: [
      {
        question: 'What discrepancies does rent roll verification commonly catch?',
        answer:
          'Common issues include overstated in-place rents, incorrect or omitted expiration dates, missing free rent periods, undisclosed rent concessions, and option terms that alter projected cash flows.',
      },
      {
        question: 'How long does it take to verify a 20-tenant rent roll?',
        answer:
          'With Lextract, processing 20 leases takes approximately 1 hour for extraction plus review time. Manual verification of the same 20 leases typically takes 2–4 days.',
      },
    ],
    metaTitle: 'Lease Rent Roll Verification - PDF vs. Excel Comparison',
    metaDescription:
      'Verify seller rent rolls against executed lease PDFs during due diligence. Lextract extracts all 126 lease fields for side-by-side accuracy verification.',
  },

  {
    name: 'CAM Reconciliation Prep',
    slug: 'cam-reconciliation-prep',
    toolName: 'Microsoft Excel',
    toolSlug: 'microsoft-excel',
    category: 'compliance',
    problem:
      'Preparing for CAM reconciliation requires knowing each tenant\'s pro-rata share, CAM cap provisions, exclusion lists, and base year - all buried in lease documents. Without accurate extraction, landlords may over-bill or under-bill tenants, and tenants may miss their right to dispute.',
    steps: [
      {
        name: 'Upload tenant lease PDFs',
        description:
          'Upload the executed lease for each tenant subject to CAM reconciliation.',
        tool: 'source',
      },
      {
        name: 'Extract CAM-relevant fields',
        description:
          'Lextract identifies pro-rata share, CAM cap type and rate, base year, exclusions, controllable vs. non-controllable expense definitions, and tenant audit rights.',
        tool: 'lextract',
      },
      {
        name: 'Review CAM cap and exclusion fields',
        description:
          'CAM caps and exclusions are frequently buried in exhibits and riders. Review confidence scores on these fields carefully and cross-check against the lease exhibit.',
        tool: 'lextract',
      },
      {
        name: 'Download CAM summary Excel',
        description:
          'Export a per-tenant CAM summary showing each tenant\'s share, cap, and exclusion list in a side-by-side Excel format.',
        tool: 'destination',
      },
      {
        name: 'Build CAM reconciliation workbook',
        description:
          'Load the per-tenant CAM data into your reconciliation model. Apply each tenant\'s cap and exclusions to the actual operating expenses to compute final CAM charges. Property managers can automate the reconciliation step with <a href="https://www.capveri.com" target="_blank" rel="noopener noreferrer">CapVeri.com</a>.',
        tool: 'destination',
      },
    ],
    timeSaved: '2–4 hours per property annually',
    targetPersonas: ['Property Managers', 'Tenant Representatives'],
    relatedWorkflows: ['lease-audit-data', 'annual-re-abstraction', 'pdf-to-quickbooks'],
    faqs: [
      {
        question: 'What CAM fields does Lextract extract?',
        answer:
          'Lextract extracts pro-rata share percentage, CAM cap type (cumulative or non-cumulative), annual CAM cap rate, base year for controllable expenses, exclusion list items, and tenant audit rights window.',
      },
      {
        question: 'Can Lextract identify gross-up provisions?',
        answer:
          'Yes. Lextract flags gross-up clauses that allow the landlord to normalize operating expenses to a specified occupancy level, which affects the CAM denominator.',
      },
    ],
    metaTitle: 'CAM Reconciliation Prep - Extract Lease CAM Provisions',
    metaDescription:
      'Prepare for CAM reconciliation by extracting pro-rata shares, CAM caps, and exclusions from lease PDFs. Lextract automates the data collection step.',
  },

  {
    name: 'Lease Expiration Tracker',
    slug: 'expiration-tracker',
    toolName: 'Microsoft Excel',
    toolSlug: 'microsoft-excel',
    category: 'analysis',
    problem:
      'Missing a lease expiration or option notice deadline can mean losing renewal rights or being locked into unfavorable holdover terms. Tracking these dates requires accurate data from every lease, and manual extraction means the tracker is only as good as the last person who read each document.',
    steps: [
      {
        name: 'Upload all active lease PDFs',
        description:
          'Upload the executed lease for every active tenant to Lextract.',
        tool: 'source',
      },
      {
        name: 'Extract critical dates from each lease',
        description:
          'Lextract extracts lease expiration date, renewal option notice deadlines, termination notice periods, rent escalation effective dates, and any lease-specific milestone dates.',
        tool: 'lextract',
      },
      {
        name: 'Download consolidated dates export',
        description:
          'Download the extraction as an Excel file with one row per lease and columns for each critical date type.',
        tool: 'lextract',
      },
      {
        name: 'Build expiration and notice deadline tracker',
        description:
          'Load the extracted dates into an Excel tracker with conditional formatting to highlight upcoming expirations and notice deadlines within 90, 180, and 365 days.',
        tool: 'destination',
      },
      {
        name: 'Set calendar reminders',
        description:
          'Use the extracted dates to set reminders in Outlook or Google Calendar for each option notice deadline - at minimum 30 days before the deadline.',
        tool: 'destination',
      },
    ],
    timeSaved: '1–2 hours per lease initial setup',
    targetPersonas: ['Lease Administrators', 'Property Managers'],
    relatedWorkflows: ['pdf-to-excel', 'rent-escalation-schedule', 'lease-roll-builder'],
    faqs: [
      {
        question: 'What happens if a tenant has multiple renewal options?',
        answer:
          'Lextract extracts each renewal option period separately, including the notice deadline and term length for each. All options appear as separate rows in the dates export.',
      },
      {
        question: 'Does Lextract extract holdover provisions?',
        answer:
          'Yes. Lextract identifies holdover rent rate (often 150% of base rent) and the nature of the holdover - month-to-month or at-will - so you know the consequences of expiration without renewal.',
      },
    ],
    metaTitle: 'Lease Expiration Tracker - Extract Critical Dates from PDFs',
    metaDescription:
      'Never miss a lease expiration or option deadline. Lextract extracts all critical dates from commercial lease PDFs and exports them to an Excel tracker.',
  },

  {
    name: 'Rent Escalation Schedule',
    slug: 'rent-escalation-schedule',
    toolName: 'Microsoft Excel',
    toolSlug: 'microsoft-excel',
    category: 'analysis',
    problem:
      'Building a forward-looking rent schedule requires extracting each escalation trigger, rate, and effective date from the lease - data that is often spread across multiple sections and exhibits. Manually assembling a multi-year rent schedule for a portfolio of leases is error-prone and time-consuming.',
    steps: [
      {
        name: 'Upload lease PDFs',
        description:
          'Upload executed lease PDFs for all tenants whose escalation schedules you need to model.',
        tool: 'source',
      },
      {
        name: 'Extract rent schedule and escalation terms',
        description:
          'Lextract identifies each rent step: fixed dollar amounts, fixed percentage escalations, CPI adjustments, and any base rent table from a rent schedule exhibit.',
        tool: 'lextract',
      },
      {
        name: 'Review CPI and percentage escalation fields',
        description:
          'CPI clauses are complex - review the extracted base CPI index, cap, and floor values carefully.',
        tool: 'lextract',
      },
      {
        name: 'Download rent schedule export',
        description:
          'Export the extracted rent data as an Excel file with separate rows for each escalation period, amount, and effective date.',
        tool: 'destination',
      },
      {
        name: 'Assemble multi-year rent forecast in Excel',
        description:
          'Use the extracted escalation data to build a year-by-year rent projection for each tenant. Aggregate to property level for asset management and reporting purposes.',
        tool: 'destination',
      },
    ],
    timeSaved: '1–3 hours per lease',
    targetPersonas: [
      'Property Managers',
      'Asset Managers',
      'Portfolio Managers',
      'Due Diligence Analysts',
    ],
    relatedWorkflows: ['expiration-tracker', 'pdf-to-argus', 'lease-to-investor-report'],
    faqs: [
      {
        question: 'How does Lextract handle rent schedules in exhibits?',
        answer:
          'Lextract processes the entire document including exhibits. If the rent schedule is provided as a table in an exhibit, Lextract extracts each row and period as a structured escalation step.',
      },
      {
        question: 'Can Lextract handle leases with percentage rent?',
        answer:
          'Yes. Lextract extracts percentage rent provisions including the natural breakpoint or artificial breakpoint, the applicable rate, and whether percentage rent is in addition to or in lieu of base rent.',
      },
    ],
    metaTitle: 'Rent Escalation Schedule - Extract from Lease PDFs',
    metaDescription:
      'Build accurate multi-year rent forecasts from lease PDFs. Lextract extracts rent steps, CPI escalations, and percentage rent provisions in 5–15 minutes.',
  },

  // ─── P2 ───────────────────────────────────────────────────────────────

  {
    name: 'PDF to NetSuite',
    slug: 'pdf-to-netsuite',
    toolName: 'NetSuite',
    toolSlug: 'netsuite',
    category: 'import',
    problem:
      'Companies using NetSuite for lease accounting under ASC 842 need accurate lease data entered before generating right-of-use asset calculations. Manual entry from PDFs is slow and introduces errors that materially affect financial statement balances.',
    steps: [
      {
        name: 'Upload lease PDFs to Lextract',
        description:
          'Upload each executed lease PDF that needs to be recorded in NetSuite.',
        tool: 'source',
      },
      {
        name: 'Extract ASC 842-relevant lease fields',
        description:
          'Lextract extracts commencement date, end date, base rent by period, escalations, free rent, renewal options, and variable payment provisions.',
        tool: 'lextract',
      },
      {
        name: 'Review option and variable payment fields',
        description:
          'Review option exercise probability determinations and any variable payment fields flagged for confidence before building the NetSuite lease record.',
        tool: 'lextract',
      },
      {
        name: 'Download structured export',
        description:
          'Download the extraction as an Excel file ready for entry into NetSuite\'s Lease Management module.',
        tool: 'destination',
      },
      {
        name: 'Create NetSuite lease record and run calculations',
        description:
          'Enter the extracted data into NetSuite\'s Lease Management module. Run the ROU asset and lease liability calculations and verify against your external workpaper.',
        tool: 'destination',
      },
    ],
    timeSaved: '2–4 hours per lease',
    targetPersonas: ['Portfolio Managers', 'Compliance Teams'],
    relatedWorkflows: ['asc-842-data-prep', 'lease-audit-data', 'annual-re-abstraction'],
    faqs: [
      {
        question: 'Does Lextract work with NetSuite Lease Management?',
        answer:
          'Yes. Lextract extracts the fields required to set up a lease record in NetSuite Lease Management, including the payment schedule and option terms needed for ASC 842 calculations.',
      },
      {
        question: 'How do I handle lease modifications in NetSuite?',
        answer:
          'Upload the lease amendment to Lextract to extract the modified terms. Then update the NetSuite lease record to reflect the modification and trigger remeasurement.',
      },
    ],
    metaTitle: 'Import Lease Data into NetSuite from PDF',
    metaDescription:
      'Populate NetSuite Lease Management from lease PDFs. Lextract extracts all ASC 842 inputs including payment schedules and options in 5–15 minutes.',
  },

  {
    name: 'Estoppel Certificate Preparation',
    slug: 'estoppel-data-prep',
    toolName: 'Microsoft Excel',
    toolSlug: 'microsoft-excel',
    category: 'analysis',
    problem:
      'Preparing estoppel certificates requires quickly pulling the key terms from the executed lease - tenant name, premise, rent, term, and option status - to confirm against the tenant\'s representations. Without extraction tooling, attorneys spend hours re-reading leases to populate each estoppel form.',
    steps: [
      {
        name: 'Upload executed lease PDFs',
        description:
          'Upload the executed lease and any amendments for each tenant requiring an estoppel.',
        tool: 'source',
      },
      {
        name: 'Extract key estoppel fields',
        description:
          'Lextract extracts tenant name, premises, commencement date, expiration date, base rent, any pending rent modifications, security deposit amount, and option status.',
        tool: 'lextract',
      },
      {
        name: 'Review amendment and option status fields',
        description:
          'Confirm that all amendments have been uploaded and that the option exercise status matches the current record.',
        tool: 'lextract',
      },
      {
        name: 'Populate estoppel certificate template',
        description:
          'Use the extracted data to populate the estoppel certificate form. Source page references allow the preparer to cite the specific lease clause for each representation.',
        tool: 'destination',
      },
    ],
    timeSaved: '1–2 hours per tenant',
    targetPersonas: ['Landlords', 'Property Managers', 'Real Estate Attorneys'],
    relatedWorkflows: ['data-room-review', 'rent-roll-verification', 'loi-to-lease-comparison'],
    faqs: [
      {
        question: 'What fields are included in a standard estoppel certificate?',
        answer:
          'Standard estoppel fields include tenant name, premises address and suite, lease date and commencement, current expiration date, base rent amount, security deposit, defaults status, and option rights. Lextract extracts all of these.',
      },
      {
        question: 'Can Lextract identify if there are outstanding defaults?',
        answer:
          'Lextract extracts default provisions and notice requirements from the lease document. Identifying whether a default is currently outstanding requires review beyond the lease text itself.',
      },
    ],
    metaTitle: 'Estoppel Certificate Prep - Extract Key Lease Terms',
    metaDescription:
      'Prepare estoppel certificates faster. Lextract extracts tenant name, premises, rent, term, and option status from executed lease PDFs in minutes.',
  },

  {
    name: 'DSCR from Lease Data',
    slug: 'dscr-from-leases',
    toolName: 'Microsoft Excel',
    toolSlug: 'microsoft-excel',
    category: 'analysis',
    problem:
      'Lenders calculating DSCR for commercial real estate loans need verified net operating income data, which requires accurate lease data: in-place rents, expense structures, lease terms, and option status. Manual extraction from PDFs during underwriting is slow and introduces the risk of basing loan decisions on incorrect data.',
    steps: [
      {
        name: 'Collect all executed lease PDFs',
        description:
          'Obtain executed lease PDFs for all tenants at the subject property from the borrower.',
        tool: 'source',
      },
      {
        name: 'Upload and extract all leases',
        description:
          'Process every lease through Lextract to extract base rent, expense structure (NNN vs. gross), lease term, and escalation schedule.',
        tool: 'lextract',
      },
      {
        name: 'Verify rents and expense pass-throughs',
        description:
          'Confirm in-place rents against the extracted schedule and verify whether operating expenses are included (gross) or passed through (NNN) for each tenant.',
        tool: 'lextract',
      },
      {
        name: 'Build NOI calculation in Excel',
        description:
          'Aggregate extracted rents and expense recovery data to calculate effective gross income and net operating income for the DSCR numerator.',
        tool: 'destination',
      },
      {
        name: 'Compute DSCR and sensitivity analysis',
        description:
          'Divide NOI by annual debt service to compute DSCR. Run scenario analysis using extracted escalation data to project DSCR over the loan term.',
        tool: 'destination',
      },
    ],
    timeSaved: '3–5 hours per property for underwriting',
    targetPersonas: ['Lenders', 'Acquisition Teams', 'Asset Managers'],
    relatedWorkflows: ['pdf-to-argus', 'rent-roll-verification', 'data-room-review'],
    faqs: [
      {
        question: 'What expense structures does Lextract identify?',
        answer:
          'Lextract identifies the lease type (NNN, double-net, modified gross, gross) and extracts the specific operating expenses passed through to the tenant, which directly affects effective gross income in DSCR calculations.',
      },
      {
        question: 'Can Lextract help with CMBS underwriting?',
        answer:
          'Yes. Lextract extracts the lease data inputs required for CMBS underwriting including anchor tenant leases, co-tenancy provisions, and go-dark clauses that affect collateral risk.',
      },
    ],
    metaTitle: 'Calculate DSCR from Lease PDFs - CRE Loan Underwriting',
    metaDescription:
      'Extract verified lease data for DSCR calculations. Lextract pulls in-place rents, expense structures, and term information from commercial lease PDFs in minutes.',
  },

  {
    name: 'Lease Audit Data Preparation',
    slug: 'lease-audit-data',
    toolName: 'Microsoft Excel',
    toolSlug: 'microsoft-excel',
    category: 'compliance',
    problem:
      'Auditing landlord operating expense charges requires knowing your exact lease rights: what is included in CAM, what is excluded, your pro-rata share, your cap provisions, and your audit rights window. Without extracting these terms from the lease, tenants often fail to identify overbillings they are contractually entitled to dispute.',
    steps: [
      {
        name: 'Locate and upload your executed lease',
        description:
          'Upload your executed lease including all amendments and exhibits to Lextract.',
        tool: 'source',
      },
      {
        name: 'Extract CAM and audit rights provisions',
        description:
          'Lextract identifies your pro-rata share, CAM definition, exclusion list, controllable expense cap, gross-up provision, and audit rights clause including the lookback period.',
        tool: 'lextract',
      },
      {
        name: 'Review exclusion and cap fields',
        description:
          'Verify that all exclusion items and CAM caps have been correctly extracted. These are often in exhibits and may be missed if the exhibit structure is non-standard.',
        tool: 'lextract',
      },
      {
        name: 'Download lease rights summary',
        description:
          'Export the CAM provisions as a structured Excel reference document for your auditor.',
        tool: 'destination',
      },
      {
        name: 'Provide to CRE auditor for expense comparison',
        description:
          'Share the extracted lease rights summary with your auditor. The auditor compares landlord\'s actual charges against your lease entitlements to identify overbillings. After extraction, tenants can run a 14-rule CAM audit at <a href="https://www.camaudit.io" target="_blank" rel="noopener noreferrer">CAMAudit.io</a>.',
        tool: 'destination',
      },
    ],
    timeSaved: '2–4 hours per lease audit setup',
    targetPersonas: ['Tenant Representatives', 'Lease Auditors', 'Corporate Real Estate Teams'],
    relatedWorkflows: ['cam-reconciliation-prep', 'asc-842-data-prep', 'annual-re-abstraction'],
    faqs: [
      {
        question: 'What is a typical CAM overbilling rate?',
        answer:
          'CAM overbilling risk depends on the lease language, expense categories, and reconciliation support. The audit process requires knowing your exact lease rights, which Lextract extracts.',
      },
      {
        question: 'How far back can I audit CAM charges?',
        answer:
          'Lextract extracts your audit rights clause, which specifies the lookback period - typically 1–3 years after receipt of the annual CAM reconciliation statement. Beyond that window, your audit rights may be contractually barred.',
      },
    ],
    metaTitle: 'Lease Audit Data Prep - Extract CAM Rights and Provisions',
    metaDescription:
      'Prepare for a commercial lease audit. Lextract extracts CAM inclusions, exclusions, pro-rata share, caps, and audit rights from your lease PDF in minutes.',
  },

  {
    name: 'PMS Data Migration',
    slug: 'pms-migration',
    toolName: 'Yardi Voyager',
    toolSlug: 'yardi-voyager',
    category: 'migration',
    problem:
      'Migrating lease data from spreadsheets or a legacy property management system to Yardi requires systematically re-abstracting every active lease to populate the new system accurately. Manual re-entry of dozens of fields per lease across a large portfolio takes months without extraction tooling.',
    steps: [
      {
        name: 'Compile all active lease PDFs',
        description:
          'Collect every executed lease and amendment PDF for active tenants in the portfolio being migrated.',
        tool: 'source',
      },
      {
        name: 'Batch process all leases through Lextract',
        description:
          'Upload all lease PDFs to Lextract. Process each document to generate a complete 126-field abstract.',
        tool: 'lextract',
      },
      {
        name: 'Review abstracts and resolve confidence flags',
        description:
          'Work through the flagged fields batch by batch. Prioritize high-impact fields: rent amounts, critical dates, and option terms.',
        tool: 'lextract',
      },
      {
        name: 'Export Yardi-formatted data package',
        description:
          'Download the full portfolio extraction as a Yardi-oriented Excel package covering all required modules: tenant, lease, charges, and options.',
        tool: 'destination',
      },
      {
        name: 'Load into Yardi and validate',
        description:
          'Use the Excel package to populate the new Yardi instance. Run a validation report comparing Yardi records against the Lextract abstracts to confirm accuracy before go-live.',
        tool: 'destination',
      },
    ],
    timeSaved: 'Reduces migration timeline by 60–80% vs. manual abstraction',
    targetPersonas: ['Property Managers', 'Lease Administrators'],
    relatedWorkflows: ['pdf-to-yardi', 'portfolio-digitization', 'pdf-to-mri'],
    faqs: [
      {
        question: 'How large a portfolio can Lextract handle for a migration?',
        answer:
          'Lextract can process hundreds of leases. For large portfolios, batch them by property or region and process in waves aligned with your migration go-live schedule.',
      },
      {
        question: 'What about historical leases that are expired?',
        answer:
          'Lextract can process expired leases for historical data migration. Whether to include historical leases depends on your Yardi configuration and reporting needs.',
      },
    ],
    metaTitle: 'PMS Migration - Extract Lease Data for Yardi Voyager',
    metaDescription:
      'Accelerate your property management system migration. Lextract batch-extracts lease data from PDFs and outputs Yardi-ready Excel handoffs for the full portfolio.',
  },

  {
    name: 'Data Room Lease Review',
    slug: 'data-room-review',
    toolName: 'Microsoft Excel',
    toolSlug: 'microsoft-excel',
    category: 'analysis',
    problem:
      'During an acquisition, a data room may contain 20–100 lease PDFs that all need to be abstracted and verified before LOI or contract signing. Manual review at this scale is a bottleneck that extends due diligence timelines and increases the risk of missing material lease provisions.',
    steps: [
      {
        name: 'Download all lease PDFs from data room',
        description:
          'Export all executed leases and amendments from the data room (VDR) to a local folder for upload to Lextract.',
        tool: 'source',
      },
      {
        name: 'Portfolio workflow to Lextract',
        description:
          'Upload all lease PDFs to Lextract. Use the Portfolio processing feature to queue all documents simultaneously.',
        tool: 'lextract',
      },
      {
        name: 'Review red flags and confidence alerts',
        description:
          'Lextract surfaces red flag clauses - co-tenancy provisions, go-dark rights, below-market options - alongside confidence alerts for fields that need manual verification.',
        tool: 'lextract',
      },
      {
        name: 'Download consolidated lease abstract matrix',
        description:
          'Export all lease abstracts as a consolidated Excel matrix with one row per lease and columns for every key field - ideal for presentation to the investment committee.',
        tool: 'destination',
      },
      {
        name: 'Prepare due diligence summary and risk memo',
        description:
          'Use the extracted data and red flag summary to prepare the due diligence lease memo identifying material risks, below-market leases, and near-term expirations.',
        tool: 'destination',
      },
    ],
    timeSaved: '4–8 hours per property in due diligence',
    targetPersonas: ['Due Diligence Analysts', 'Acquisition Teams', 'Real Estate Attorneys'],
    relatedWorkflows: ['rent-roll-verification', 'pdf-to-argus', 'estoppel-data-prep'],
    faqs: [
      {
        question: 'What red flags does Lextract identify?',
        answer:
          'Lextract flags co-tenancy clauses, go-dark rights, termination rights (landlord and tenant), below-market purchase options, percentage rent provisions, and other material provisions that affect property value or cash flow predictability.',
      },
      {
        question: 'How quickly can Lextract process a full data room?',
        answer:
          'Each lease typically processes in 5–15 minutes. A 50-lease data room can be fully extracted in under 15 hours when run in parallel, compared to 3–5 days for manual abstraction.',
      },
    ],
    metaTitle: 'Data Room Lease Review - AI Abstraction for Due Diligence',
    metaDescription:
      'Review 20–100 data room leases in hours, not days. Lextract extracts 126 fields per lease and surfaces red flags automatically for due diligence.',
  },

  {
    name: 'Portfolio Digitization',
    slug: 'portfolio-digitization',
    toolName: 'Microsoft Excel',
    toolSlug: 'microsoft-excel',
    category: 'migration',
    problem:
      'Many portfolios operate with paper or scanned leases that have never been digitized into structured data. Building an accurate lease database from scratch requires abstracting every document - a project that takes months manually and is cost-prohibitive with traditional abstraction services.',
    steps: [
      {
        name: 'Scan all paper lease documents',
        description:
          'Scan paper leases to PDF using a multifunction printer or a document scanning service. Ensure resolution is at least 300 DPI for accurate OCR.',
        tool: 'source',
      },
      {
        name: 'Upload scanned PDFs to Lextract',
        description:
          'Upload all scanned lease PDFs. Lextract\'s AI reads scanned documents natively as images, including handwritten amendments.',
        tool: 'lextract',
      },
      {
        name: 'Extract 126 fields per lease',
        description:
          'Lextract processes each document and generates a complete structured abstract with confidence scores for every field.',
        tool: 'lextract',
      },
      {
        name: 'Review and resolve low-confidence fields',
        description:
          'Work through flagged fields for each lease, cross-referencing the original scanned document to confirm values.',
        tool: 'lextract',
      },
      {
        name: 'Download consolidated lease database',
        description:
          'Export all abstracts into a consolidated Excel database. This becomes the portfolio\'s master lease record - the single source of truth for all lease terms.',
        tool: 'destination',
      },
    ],
    timeSaved: 'Reduces total abstraction time by 85% vs. manual',
    targetPersonas: ['Property Managers', 'Lease Administrators', 'Portfolio Managers'],
    relatedWorkflows: ['pms-migration', 'lease-roll-builder', 'annual-re-abstraction'],
    faqs: [
      {
        question: 'Can Lextract handle poor-quality scans?',
        answer:
          'Lextract\'s AI reads most standard scans natively. Very poor quality scans (below 200 DPI, heavy bleed-through, or significant distortion) may produce lower confidence scores on affected fields.',
      },
      {
        question: 'What is the cost to digitize a 100-lease portfolio?',
        answer:
          'At $15 per lease, digitizing a 100-lease portfolio costs $1,500 with Lextract. Traditional lease abstraction services typically charge $150–$400 per lease for the same scope.',
      },
    ],
    metaTitle: 'Portfolio Digitization - Convert Lease PDFs to Structured Database',
    metaDescription:
      'Digitize your entire lease portfolio from scanned PDFs. Lextract extracts 126 fields per lease and builds your master lease database at $15 per document.',
  },

  {
    name: 'LOI to Lease Comparison',
    slug: 'loi-to-lease-comparison',
    toolName: 'Microsoft Excel',
    toolSlug: 'microsoft-excel',
    category: 'analysis',
    problem:
      'After a lease is executed, attorneys and tenant reps need to verify that the final lease terms match the agreed LOI - any deviations in rent, term, tenant improvements, or option rights need to be identified and reviewed before the tenant takes occupancy.',
    steps: [
      {
        name: 'Obtain signed LOI and executed lease',
        description:
          'Collect the signed Letter of Intent and the fully executed lease PDF.',
        tool: 'source',
      },
      {
        name: 'Upload executed lease to Lextract',
        description:
          'Upload the executed lease PDF to Lextract for full 126-field extraction.',
        tool: 'lextract',
      },
      {
        name: 'Extract all business terms',
        description:
          'Lextract extracts base rent, term, free rent, tenant improvement allowance, options, permitted use, and parking terms - the key business points typically covered in an LOI.',
        tool: 'lextract',
      },
      {
        name: 'Build LOI-to-lease comparison matrix in Excel',
        description:
          'Create a side-by-side Excel comparison of the LOI terms against the extracted lease terms. Highlight any field where the executed lease deviates from the LOI.',
        tool: 'destination',
      },
      {
        name: 'Review deviations with client',
        description:
          'Present the deviation summary to the client or transaction team. Determine whether any deviations are material and require renegotiation or amendment.',
        tool: 'destination',
      },
    ],
    timeSaved: '2–3 hours per lease review',
    targetPersonas: ['Real Estate Attorneys', 'Tenant Representatives'],
    relatedWorkflows: ['estoppel-data-prep', 'rent-roll-verification', 'data-room-review'],
    faqs: [
      {
        question: 'Does Lextract extract tenant improvement allowances?',
        answer:
          'Yes. Lextract extracts tenant improvement allowance amount, disbursement conditions, deadline for completion, and landlord work scope - all terms that are frequently modified between LOI and execution.',
      },
      {
        question: 'Can Lextract compare two versions of a lease?',
        answer:
          'Process both documents separately in Lextract and download each as an Excel export. Then build the side-by-side comparison in Excel to identify any field-level differences.',
      },
    ],
    metaTitle: 'LOI to Lease Comparison - Verify Executed Terms Against LOI',
    metaDescription:
      'Verify your executed lease matches the agreed LOI. Lextract extracts all business terms from the lease PDF for a fast side-by-side comparison.',
  },

  {
    name: 'Annual Re-Abstraction',
    slug: 'annual-re-abstraction',
    toolName: 'Microsoft Excel',
    toolSlug: 'microsoft-excel',
    category: 'compliance',
    problem:
      'As leases are amended and lease administration systems change, the lease database can drift from the executed documents. Annual re-abstraction verifies that system data matches current lease terms - catching discrepancies before they affect billing, compliance reporting, or financial statements.',
    steps: [
      {
        name: 'Pull current lease data from PMS',
        description:
          'Export current lease terms from your property management system or existing lease database for each active tenant.',
        tool: 'source',
      },
      {
        name: 'Upload all current executed leases to Lextract',
        description:
          'Upload each executed lease (including all amendments) to Lextract for fresh extraction.',
        tool: 'lextract',
      },
      {
        name: 'Extract all 126 fields',
        description:
          'Run complete extraction on each lease. The re-abstraction captures any amendments that may have been processed since the last abstraction cycle.',
        tool: 'lextract',
      },
      {
        name: 'Compare extracted data against system records',
        description:
          'Build a comparison between the Lextract-extracted values and your current system records. Flag every field where the values differ.',
        tool: 'destination',
      },
      {
        name: 'Update system records and document changes',
        description:
          'Correct any discrepancies in the PMS or lease database. Document the changes and their source in the lease file.',
        tool: 'destination',
      },
    ],
    timeSaved: '2–4 hours per lease for verification',
    targetPersonas: ['Lease Administrators', 'Property Managers'],
    relatedWorkflows: ['cam-reconciliation-prep', 'asc-842-data-prep', 'portfolio-digitization'],
    faqs: [
      {
        question: 'How often should lease data be re-abstracted?',
        answer:
          'Annual re-abstraction is standard best practice. Leases with frequent amendments or complex CAM structures benefit from re-abstraction after each amendment is executed.',
      },
      {
        question: 'Does Lextract track changes between abstraction runs?',
        answer:
          'Lextract does not automatically compare against previous runs, but you can download both extractions as Excel files and use Excel\'s comparison tools to identify changed fields.',
      },
    ],
    metaTitle: 'Annual Lease Re-Abstraction - Verify Your Lease Database',
    metaDescription:
      'Keep your lease database accurate. Annual re-abstraction with Lextract catches data drift between executed leases and your PMS or compliance records.',
  },

  {
    name: 'CompStak + Lease Analysis',
    slug: 'compstak-lease-analysis',
    toolName: 'Microsoft Excel',
    toolSlug: 'microsoft-excel',
    category: 'analysis',
    problem:
      'Comparing your in-place lease rents against CompStak market comp data requires first extracting your lease economics into a structured format. Without that baseline, asset managers cannot run a credible mark-to-market analysis or make informed hold/sell and renewal decisions.',
    steps: [
      {
        name: 'Export CompStak comps for the submarket',
        description:
          'Pull relevant lease comps from CompStak for the property\'s submarket, property type, and size range. Export to Excel.',
        tool: 'source',
      },
      {
        name: 'Upload in-place lease PDFs to Lextract',
        description:
          'Upload all executed in-place lease PDFs to Lextract to extract current rent, lease type, and term.',
        tool: 'lextract',
      },
      {
        name: 'Extract rent and concession data',
        description:
          'Lextract extracts base rent, free rent periods, TI allowance, and lease type - the same data points that CompStak normalizes in its comp database.',
        tool: 'lextract',
      },
      {
        name: 'Build mark-to-market analysis in Excel',
        description:
          'Combine Lextract-extracted in-place rents with CompStak comp data in a single Excel workbook. Calculate the spread between in-place and market rent for each tenant.',
        tool: 'destination',
      },
      {
        name: 'Identify mark-to-market opportunity',
        description:
          'Highlight tenants where in-place rent is significantly below market (mark-to-market opportunity) or above market (renewal risk). Use this to inform asset strategy.',
        tool: 'destination',
      },
    ],
    timeSaved: '2–3 hours per property for market analysis',
    targetPersonas: ['Brokers', 'Asset Managers', 'Portfolio Managers'],
    relatedWorkflows: ['costar-lease-comparison', 'rent-escalation-schedule', 'lease-to-investor-report'],
    faqs: [
      {
        question: 'What rent metrics does Lextract extract for market comparison?',
        answer:
          'Lextract extracts base rent per square foot, effective rent (net of free rent), lease type (NNN vs. gross), TI allowance, and lease commencement date - all metrics used in CompStak comp analysis.',
      },
      {
        question: 'Can this workflow support a lease renewal negotiation?',
        answer:
          'Yes. Knowing your current in-place rent versus current market rates gives you a data-driven starting point for renewal negotiation or for deciding whether to invest in lease-up at market.',
      },
    ],
    metaTitle: 'CompStak + Lease PDF Analysis - Mark-to-Market Rents',
    metaDescription:
      'Compare in-place lease rents against CompStak market data. Lextract extracts your current rent economics from PDFs for mark-to-market analysis.',
  },

  {
    name: 'CoStar + Lease Comparison',
    slug: 'costar-lease-comparison',
    toolName: 'Microsoft Excel',
    toolSlug: 'microsoft-excel',
    category: 'analysis',
    problem:
      'Asset managers need to compare their in-place rents against CoStar asking rents to identify below-market and above-market leases for hold/sell and renewal strategy. Without structured extraction of in-place lease data, this comparison requires manual reading of every lease.',
    steps: [
      {
        name: 'Pull CoStar asking rent data',
        description:
          'Download CoStar asking rent data for comparable properties and lease spaces in the submarket. Export to Excel.',
        tool: 'source',
      },
      {
        name: 'Upload in-place lease PDFs to Lextract',
        description:
          'Upload all executed tenant lease PDFs to Lextract for structured extraction.',
        tool: 'lextract',
      },
      {
        name: 'Extract in-place rent and lease structure',
        description:
          'Lextract extracts base rent per SF, lease type, lease expiration, and escalation schedule for each tenant.',
        tool: 'lextract',
      },
      {
        name: 'Build rent gap analysis in Excel',
        description:
          'Combine in-place rents from Lextract with CoStar asking rates. Calculate the rent gap (spread to market) and rank tenants from most below-market to most above-market.',
        tool: 'destination',
      },
      {
        name: 'Develop leasing and asset strategy',
        description:
          'Use the rent gap analysis to prioritize lease renewals, identify re-leasing opportunities at market, and inform the hold/sell decision.',
        tool: 'destination',
      },
    ],
    timeSaved: '2–3 hours per property for market analysis',
    targetPersonas: ['Asset Managers', 'Portfolio Managers', 'Brokers'],
    relatedWorkflows: ['compstak-lease-analysis', 'rent-escalation-schedule', 'lease-to-investor-report'],
    faqs: [
      {
        question: 'What is mark-to-market rent analysis?',
        answer:
          'Mark-to-market analysis compares your current in-place rents against current market asking rents. Tenants paying below market represent upside at renewal; tenants paying above market represent retention risk.',
      },
      {
        question: 'How does lease type affect the comparison?',
        answer:
          'Lextract identifies whether each lease is NNN, modified gross, or gross. This affects the effective economic rent comparison - a $25/SF NNN lease is not directly comparable to a $25/SF gross lease.',
      },
    ],
    metaTitle: 'CoStar + Lease Comparison - In-Place vs. Market Rents',
    metaDescription:
      'Compare in-place lease rents against CoStar market data. Lextract extracts current rent economics from PDFs so you can identify mark-to-market opportunity.',
  },

  {
    name: 'SharePoint Lease Documents to Structured Data',
    slug: 'sharepoint-to-data',
    toolName: 'SharePoint',
    toolSlug: 'sharepoint',
    category: 'migration',
    problem:
      'Enterprise teams storing lease PDFs in SharePoint have no systematic way to extract the structured data from those documents into usable formats for reporting. Lease data stays locked in PDFs while business units request manual lookups for every decision.',
    steps: [
      {
        name: 'Locate lease PDFs in SharePoint',
        description:
          'Navigate to the SharePoint document library containing executed leases. Download a batch of lease PDFs for processing.',
        tool: 'source',
      },
      {
        name: 'Upload to Lextract',
        description:
          'Upload the downloaded PDFs to Lextract for batch extraction.',
        tool: 'lextract',
      },
      {
        name: 'Extract and review structured fields',
        description:
          'Run extraction on each lease. Review confidence-flagged fields, especially for complex multi-tenant leases or leases with numerous riders.',
        tool: 'lextract',
      },
      {
        name: 'Export structured data',
        description:
          'Download the extracted data as Excel, Word, or PDF for enterprise reporting workflows.',
        tool: 'destination',
      },
      {
        name: 'Load into enterprise reporting or lease management system',
        description:
          'Import the structured extraction into your lease management platform, BI tool, or enterprise data warehouse. The SharePoint PDFs remain as source documents; Lextract provides the structured layer.',
        tool: 'destination',
      },
    ],
    timeSaved: '3–6 hours per lease extracted',
    targetPersonas: ['Enterprise Administrators', 'Corporate Real Estate Teams'],
    relatedWorkflows: ['gdrive-to-database', 'portfolio-digitization', 'asc-842-data-prep'],
    faqs: [
      {
        question: 'Does Lextract integrate directly with SharePoint?',
        answer:
          'Lextract currently processes PDF uploads directly. You download the PDFs from SharePoint and upload to Lextract. Native SharePoint connector integration is on the roadmap.',
      },
      {
        question: 'Can multiple team members collaborate on lease reviews?',
        answer:
          'Yes. Lextract supports team accounts, so multiple reviewers can process and verify leases from the same SharePoint library under a shared organization workspace.',
      },
    ],
    metaTitle: 'SharePoint Lease PDFs to Structured Data',
    metaDescription:
      'Extract structured lease data from SharePoint PDFs. Lextract processes commercial lease documents and outputs 126 structured fields for enterprise reporting.',
  },

  {
    name: 'Google Drive Leases to Database',
    slug: 'gdrive-to-database',
    toolName: 'Google Drive',
    toolSlug: 'google-drive',
    category: 'migration',
    problem:
      'Small property management operations often store lease PDFs in Google Drive folders with no systematic data extraction. The data exists in the documents, but every request for a specific term - a rent amount, an expiration date - requires someone to open and read the PDF again.',
    steps: [
      {
        name: 'Download lease PDFs from Google Drive',
        description:
          'Download the executed lease PDFs from your Google Drive folder. Organize by property for efficient Portfolio processing.',
        tool: 'source',
      },
      {
        name: 'Upload to Lextract for extraction',
        description:
          'Upload the PDFs from your Downloads folder to Lextract. Process each document to generate a complete abstract.',
        tool: 'lextract',
      },
      {
        name: 'Review and approve extractions',
        description:
          'Check confidence scores for each lease. Flag any issues for manual verification before building the database.',
        tool: 'lextract',
      },
      {
        name: 'Export consolidated lease database',
        description:
          'Download all lease abstracts as a consolidated Excel file - one row per lease with all 126 fields as columns.',
        tool: 'destination',
      },
      {
        name: 'Upload database back to Google Drive',
        description:
          'Save the consolidated lease database to Google Drive alongside the original PDFs. Now any team member can look up lease terms from the structured spreadsheet without opening every PDF.',
        tool: 'destination',
      },
    ],
    timeSaved: '2–4 hours per lease',
    targetPersonas: ['Small Property Managers', 'Tenant Representatives'],
    relatedWorkflows: ['sharepoint-to-data', 'portfolio-digitization', 'pdf-to-google-sheets'],
    faqs: [
      {
        question: 'Can I link the Lextract database back to the Google Drive source files?',
        answer:
          'Yes. Add a column in the exported database for the Google Drive file URL. This creates a clickable link from each lease record back to the original PDF for quick reference.',
      },
      {
        question: 'What if my leases are in different Google Drive folders?',
        answer:
          'Download leases from each folder and upload them to Lextract in batches organized by property or tenant. The extraction assigns each document a name based on the file name you upload.',
      },
    ],
    metaTitle: 'Google Drive Leases to Structured Database',
    metaDescription:
      'Turn your Google Drive lease PDFs into a structured database. Lextract extracts 126 fields per commercial lease and exports a consolidated spreadsheet.',
  },

  {
    name: 'Lease Data to Investor Report',
    slug: 'lease-to-investor-report',
    toolName: 'Microsoft Excel',
    toolSlug: 'microsoft-excel',
    category: 'analysis',
    problem:
      'Investor reports require a current rent roll and lease schedule showing tenant names, rents, expirations, and option status. Pulling this data manually from lease PDFs for quarterly reporting is a recurring bottleneck that consumes analyst time every reporting cycle.',
    steps: [
      {
        name: 'Identify leases requiring update for reporting period',
        description:
          'Determine which leases have been executed or amended since the last reporting cycle and need fresh extraction.',
        tool: 'source',
      },
      {
        name: 'Upload updated lease PDFs to Lextract',
        description:
          'Upload any new or amended lease PDFs to Lextract for extraction.',
        tool: 'lextract',
      },
      {
        name: 'Extract rent roll fields',
        description:
          'Lextract extracts tenant name, premises SF, in-place rent, lease expiration, option status, and credit quality indicators for the current reporting period.',
        tool: 'lextract',
      },
      {
        name: 'Download updated rent roll data',
        description:
          'Export the updated abstracts as Excel. Merge with your existing rent roll database to reflect the current portfolio state.',
        tool: 'destination',
      },
      {
        name: 'Build investor report package',
        description:
          'Incorporate the updated rent roll into your quarterly investor report template. Include lease expiration schedule, lease rollover analysis, and occupancy metrics derived from the extracted data.',
        tool: 'destination',
      },
    ],
    timeSaved: '4–8 hours per reporting cycle',
    targetPersonas: ['Portfolio Managers', 'Fund Managers', 'Asset Managers'],
    relatedWorkflows: ['lease-roll-builder', 'rent-escalation-schedule', 'compstak-lease-analysis'],
    faqs: [
      {
        question: 'What metrics can be derived from Lextract data for investor reporting?',
        answer:
          'From Lextract extractions you can calculate weighted average lease term (WALT), weighted average remaining term (WART), in-place rent per SF, lease expiration schedule by year, and option coverage ratios.',
      },
      {
        question: 'How frequently should I re-extract for reporting?',
        answer:
          'Extract each time a new lease is signed or an amendment is executed. For quarterly reporting, a light re-extraction pass on all active leases confirms that system data is current.',
      },
    ],
    metaTitle: 'Lease Data for Investor Reports - Rent Roll from PDFs',
    metaDescription:
      'Automate quarterly investor reporting. Lextract extracts current rent roll data, expiration schedules, and option status from lease PDFs each reporting cycle.',
  },

  {
    name: 'Lease Roll Builder',
    slug: 'lease-roll-builder',
    toolName: 'Microsoft Excel',
    toolSlug: 'microsoft-excel',
    category: 'analysis',
    problem:
      'Building a lease roll from a set of PDF lease documents requires extracting tenant name, premises, rent, term, and options from each document and assembling them into a single spreadsheet. Without extraction tooling, this is a days-long manual project for any property with more than a handful of tenants.',
    steps: [
      {
        name: 'Collect all executed lease PDFs',
        description:
          'Gather all executed lease PDFs for the property, including amendments and side letters.',
        tool: 'source',
      },
      {
        name: 'Upload all PDFs to Lextract',
        description:
          'Upload each lease PDF to Lextract for Portfolio processing.',
        tool: 'lextract',
      },
      {
        name: 'Extract rent roll fields for each tenant',
        description:
          'Lextract extracts tenant name, suite or unit, RSF, base rent, lease commencement, lease expiration, renewal options, and security deposit - the standard columns in a commercial rent roll.',
        tool: 'lextract',
      },
      {
        name: 'Export consolidated rent roll',
        description:
          'Download all lease abstracts as a single Excel export with one row per tenant and standard rent roll column headers.',
        tool: 'destination',
      },
      {
        name: 'Format and validate the final rent roll',
        description:
          'Review the assembled rent roll for completeness. Add calculated columns: remaining term, annualized rent, and expiration year bucket. Validate total RSF against the building RSF.',
        tool: 'destination',
      },
    ],
    timeSaved: '3–6 hours per property vs. manual abstraction',
    targetPersonas: ['Property Managers', 'Acquisition Teams', 'Portfolio Managers'],
    relatedWorkflows: ['pdf-to-excel', 'expiration-tracker', 'lease-to-investor-report'],
    faqs: [
      {
        question: 'What columns does a standard commercial rent roll include?',
        answer:
          'A standard commercial rent roll includes tenant name, suite/unit, rentable square feet, lease commencement, lease expiration, current base rent, rent per SF, escalation schedule, renewal options, and security deposit. Lextract extracts all of these fields.',
      },
      {
        question: 'How do I handle multiple floors or suites for the same tenant?',
        answer:
          'Each executed lease produces one abstract row. For tenants with multiple suites under separate leases, each lease is processed separately and appears as a separate row that can be merged in Excel.',
      },
    ],
    metaTitle: 'Lease Roll Builder - Create Rent Roll from PDF Leases',
    metaDescription:
      'Build a complete commercial rent roll from lease PDFs. Lextract extracts tenant name, rent, term, and options from every lease and assembles them into Excel.',
  },

  {
    name: 'Tenant Insurance Compliance',
    slug: 'lease-insurance-compliance',
    toolName: 'Microsoft Excel',
    toolSlug: 'microsoft-excel',
    category: 'compliance',
    problem:
      'Landlords must track that each tenant carries the insurance coverage required by their lease. This requires knowing the exact insurance requirements from each executed lease document - minimum liability limits, required additional insured parties, endorsements, and certificate delivery deadlines. Without extraction, this is a manual review of every lease.',
    steps: [
      {
        name: 'Upload all tenant lease PDFs',
        description:
          'Upload the executed lease for each active tenant to Lextract.',
        tool: 'source',
      },
      {
        name: 'Extract insurance requirement fields',
        description:
          'Lextract identifies the insurance clause and extracts required coverage types, minimum limits for general liability and property, additional insured requirements, and certificate delivery frequency.',
        tool: 'lextract',
      },
      {
        name: 'Review extracted insurance requirements',
        description:
          'Confirm that the extracted coverage limits and additional insured language are accurate for each tenant. These terms are frequently modified in lease negotiations.',
        tool: 'lextract',
      },
      {
        name: 'Build insurance compliance tracker in Excel',
        description:
          'Download the extracted insurance requirements and build a per-tenant tracker showing each required coverage type, the required limit, the current certificate expiration, and compliance status.',
        tool: 'destination',
      },
      {
        name: 'Request certificates from non-compliant tenants',
        description:
          'Identify tenants with expired or missing certificates and send renewal requests referencing the specific lease requirement. Track receipt in the compliance tracker.',
        tool: 'destination',
      },
    ],
    timeSaved: '1–2 hours per property for initial setup',
    targetPersonas: ['Property Managers', 'Lease Administrators'],
    relatedWorkflows: ['cam-reconciliation-prep', 'annual-re-abstraction', 'expiration-tracker'],
    faqs: [
      {
        question: 'What insurance fields does Lextract extract?',
        answer:
          'Lextract extracts required insurance types (commercial general liability, property, workers compensation, auto), minimum coverage limits, additional insured requirements, waiver of subrogation provisions, and certificate delivery obligations.',
      },
      {
        question: 'Can Lextract verify a tenant certificate against the lease requirement?',
        answer:
          'Lextract extracts the requirement from the lease document. Verifying the certificate itself requires comparing the COI against the extracted requirement - a step done outside Lextract.',
      },
    ],
    metaTitle: 'Tenant Insurance Compliance - Extract Lease Insurance Requirements',
    metaDescription:
      'Track tenant insurance requirements from lease PDFs. Lextract extracts coverage types, limits, and additional insured requirements for every tenant automatically.',
  },
]

export function getWorkflowBySlug(slug: string): Workflow | undefined {
  return WORKFLOWS.find((w) => w.slug === slug)
}

export function getAllWorkflowSlugs(): string[] {
  return WORKFLOWS.map((w) => w.slug)
}
