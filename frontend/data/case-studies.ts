import { PROCESSING_TIME } from '@/lib/pricing'

// ─── Case Study Types ───────────────────────────────────────────────────────

export interface CaseStudyData {
  name: string
  slug: string
  propertyType: string
  leaseStructure: string
  tenantName: string
  landlordName: string
  location: string
  squareFootage: number | null
  annualRent: number | null
  leaseTerm: string
  challenge: string
  solution: string
  extractedHighlights: { field: string; value: string; why: string }[]
  complexityFactors: string[]
  fieldsExtracted: number
  extractionTime: string
  relatedCaseStudies: string[]
  relatedIndustries: string[]
  relatedLeaseTypes: string[]
  relatedPropertyTypes: string[]
  relatedUseCases: string[]
  faqs: { question: string; answer: string }[]
  metaTitle: string
  metaDescription: string
}

// ─── Case Study Data ────────────────────────────────────────────────────────

export const CASE_STUDIES: CaseStudyData[] = [
  {
    name: 'Karyopharm 6th Amendment',
    slug: 'karyopharm-biotech-office',
    propertyType: 'Office',
    leaseStructure: 'Modified Gross',
    tenantName: 'Karyopharm Therapeutics',
    landlordName: 'ARE-MA Region No. 28',
    location: 'Newton, MA',
    squareFootage: 52000,
    annualRent: 2340000,
    leaseTerm: '60 months',
    challenge:
      'This lease is a sixth amendment to an existing agreement, meaning the document contains no standalone lease terms - only changes to prior provisions. Extracting base rent requires reconciling escalation steps across multiple document layers. The amendment-only format confuses tools that expect a full lease document.',
    solution:
      'Lextract identified the amendment structure from the document header, cross-referenced the step rent schedule, and extracted all 126 fields including the escalation schedule, option terms, and pro rata share from the amendment-only format. The extraction correctly flagged the absence of some base terms as expected for an amendment document.',
    extractedHighlights: [
      { field: 'Lease Structure', value: 'Sixth Amendment', why: 'Signals amendment-only extraction; no standalone lease base terms present' },
      { field: 'Annual Base Rent', value: '$2,340,000', why: 'Step rent schedule extracted across 60-month term' },
      { field: 'Square Footage', value: '52,000 RSF', why: 'Rentable square feet confirmed from amendment exhibit' },
      { field: 'Escalation Type', value: 'Fixed step', why: 'Year-by-year rent steps extracted for underwriting models' },
      { field: 'Renewal Options', value: '2 × 5-year options', why: 'Renewal rights carried forward from original lease' },
      { field: 'Tenant Improvement Allowance', value: '$45/RSF', why: 'TI allowance negotiated in this amendment' },
    ],
    complexityFactors: [
      'Amendment-only document (no standalone lease base terms)',
      'Step escalation schedule across 5 years',
      'Life sciences tenant in office space',
      'ARE (Alexandria Real Estate) landlord entity',
    ],
    fieldsExtracted: 126,
    extractionTime: PROCESSING_TIME.comparison,
    relatedCaseStudies: ['bicara-therapeutics-expansion', 'extend-health-amendments', 'infoblox-tech-sublease'],
    relatedIndustries: ['biotech-pharma-lease-abstraction'],
    relatedLeaseTypes: ['modified-gross-lease'],
    relatedPropertyTypes: ['office-lease-abstraction'],
    relatedUseCases: ['lease-amendments', 'due-diligence'],
    faqs: [
      {
        question: 'Can Lextract extract a lease amendment without the original lease?',
        answer: 'Yes. Lextract identifies amendment documents by their structure and extracts whatever fields are present. For fields not defined in the amendment (which carry forward from earlier documents), the extraction notes their absence rather than returning incorrect data.',
      },
      {
        question: 'How does Lextract handle step rent schedules in amendments?',
        answer: 'The extraction model parses rent tables and step schedules found anywhere in the document, including exhibits. Each rent step is extracted as a structured record with effective date, annual amount, and monthly amount.',
      },
      {
        question: 'What makes biotech office leases more complex than standard office leases?',
        answer: 'Biotech tenants often negotiate lab-ready TI packages, specialized HVAC provisions, hazardous materials clauses, and above-market security deposits. These provisions appear in non-standard locations in the document and require domain-aware extraction.',
      },
    ],
    metaTitle: 'Karyopharm Biotech Office Lease Amendment - AI Extraction Case Study',
    metaDescription:
      'How Lextract extracted 126 fields from a 6th lease amendment for Karyopharm Therapeutics: step rent schedule, TI allowance, and renewal options from an amendment-only document.',
  },
  {
    name: 'Bicara Therapeutics Expansion',
    slug: 'bicara-therapeutics-expansion',
    propertyType: 'Office',
    leaseStructure: 'Modified Gross',
    tenantName: 'Bicara Therapeutics',
    landlordName: 'ARE-MA Region No. 54',
    location: 'Boston, MA',
    squareFootage: 9300,
    annualRent: 558000,
    leaseTerm: '48 months',
    challenge:
      'This expansion amendment doubles the tenant\'s footprint from 4,600 to 9,300 RSF. Extracting the correct square footage requires distinguishing between the original premises, the expansion space, and the combined total. Rent is stated per-square-foot for the expansion space only, requiring calculation of the blended total rent.',
    solution:
      'Lextract correctly identified the expansion space (4,654 RSF) and the original premises (4,646 RSF), computed the combined 9,300 RSF total, and extracted the blended annual rent. The per-RSF rate for the expansion space was extracted and the effective commencement date for the expansion was separately tracked.',
    extractedHighlights: [
      { field: 'Original Premises', value: '4,646 RSF', why: 'Required to compute combined square footage' },
      { field: 'Expansion Space', value: '4,654 RSF', why: 'New premises added by this amendment' },
      { field: 'Total RSF', value: '9,300 RSF', why: 'Combined premises post-expansion' },
      { field: 'Annual Rent (expansion)', value: '$120/RSF', why: 'Market rate for expansion space, above original space rate' },
      { field: 'Expansion Commencement', value: 'January 1, 2023', why: 'Separate effective date for expanded space' },
      { field: 'Tenant Improvement Allowance', value: '$60/RSF on expansion', why: 'TI applies to expansion space only' },
    ],
    complexityFactors: [
      'Dual-premises structure (original + expansion)',
      'Blended rent calculation required',
      'Different commencement dates for each premises',
      'TI allowance scoped to expansion space only',
    ],
    fieldsExtracted: 126,
    extractionTime: PROCESSING_TIME.comparison,
    relatedCaseStudies: ['karyopharm-biotech-office', 'university-hospital-medical', 'pliant-therapeutics-lab'],
    relatedIndustries: ['biotech-pharma-lease-abstraction'],
    relatedLeaseTypes: ['modified-gross-lease'],
    relatedPropertyTypes: ['office-lease-abstraction'],
    relatedUseCases: ['lease-amendments', 'due-diligence'],
    faqs: [
      {
        question: 'How does Lextract handle premises that have multiple components with different effective dates?',
        answer: 'Lextract extracts each premises component separately, capturing the RSF, rent, and commencement date for each component, then computes the total combined premises and a weighted average rent.',
      },
      {
        question: 'What fields are most important to verify in an expansion amendment?',
        answer: 'The most critical fields are: combined total RSF, per-RSF rent for the expansion space, expansion commencement date, updated pro rata share, and any changes to the TI allowance or security deposit.',
      },
    ],
    metaTitle: 'Bicara Therapeutics Expansion Amendment - AI Lease Extraction Case Study',
    metaDescription:
      'Lextract extracted 126 fields from Bicara Therapeutics\' office expansion amendment: dual-premises RSF calculation, blended rent, and separate commencement dates.',
  },
  {
    name: 'University Hospital Medical Campus',
    slug: 'university-hospital-medical',
    propertyType: 'Life Sciences',
    leaseStructure: 'Modified Gross',
    tenantName: 'University Hospital',
    landlordName: 'Medical Campus Properties LLC',
    location: 'Cleveland, OH',
    squareFootage: 69000,
    annualRent: 3795000,
    leaseTerm: '120 months',
    challenge:
      'At 69,000 RSF on a 10-year modified gross lease, this hospital lease contains extensive operating expense provisions, base year calculations, and exclusions typical of large institutional tenants. The document is over 80 pages with complex exhibit structures defining the base year stop and expense escalation methodology.',
    solution:
      'Lextract parsed the full document including all exhibits, correctly identified the modified gross structure with base year stop, extracted the expense exclusion list, and flagged the unusual 10-year term (above the typical 5-7 year average for medical tenants) as a notable characteristic for review.',
    extractedHighlights: [
      { field: 'Lease Type', value: 'Modified Gross with Base Year Stop', why: 'Tenant pays expenses above base year level - critical for CAM projections' },
      { field: 'Annual Base Rent', value: '$3,795,000', why: 'Largest rent obligation; $55/RSF is above-market for Cleveland' },
      { field: 'Base Year', value: '2022', why: 'Expense stop benchmark year; affects future CAM exposure' },
      { field: 'Lease Term', value: '120 months (10 years)', why: 'Long-term commitment; renewal options particularly valuable' },
      { field: 'Security Deposit', value: '$632,500', why: '2-month deposit; appropriate for institutional tenant' },
      { field: 'Renewal Options', value: '3 × 5-year options', why: 'Total potential occupancy of 25 years' },
    ],
    complexityFactors: [
      '80+ page document with complex exhibits',
      'Modified gross with base year stop',
      'Institutional tenant (hospital system)',
      '10-year initial term - longer than typical',
      'Extensive operating expense exclusions',
    ],
    fieldsExtracted: 126,
    extractionTime: PROCESSING_TIME.comparison,
    relatedCaseStudies: ['pliant-therapeutics-lab', 'sutro-biopharma-industrial', 'bicara-therapeutics-expansion'],
    relatedIndustries: ['healthcare-lease-abstraction'],
    relatedLeaseTypes: ['modified-gross-lease'],
    relatedPropertyTypes: ['medical-office-lease-abstraction'],
    relatedUseCases: ['due-diligence', 'cam-reconciliation'],
    faqs: [
      {
        question: 'How does Lextract handle modified gross leases with base year stops?',
        answer: 'Lextract extracts the base year, identifies the expense categories included in the stop, and flags the structure so analysts can correctly model future operating expense exposure above the stop level.',
      },
      {
        question: 'What makes hospital leases more complex than standard office leases?',
        answer: 'Hospital leases typically contain extensive operating requirements, hazardous materials handling provisions, signage rights, parking ratios tied to patient volumes, and long initial terms with multiple renewal options - all of which require careful extraction.',
      },
    ],
    metaTitle: 'University Hospital Medical Campus Lease - AI Extraction Case Study',
    metaDescription:
      'Lextract extracted 126 fields from a 69,000 RSF hospital lease: modified gross base year stop, 10-year term, and complex operating expense provisions.',
  },
  {
    name: 'Corsair Industrial NNN',
    slug: 'corsair-industrial-nnn',
    propertyType: 'Industrial',
    leaseStructure: 'NNN',
    tenantName: 'Corsair Components',
    landlordName: 'Prologis LP',
    location: 'Milpitas, CA',
    squareFootage: 40000,
    annualRent: 960000,
    leaseTerm: '60 months',
    challenge:
      'This NNN lease includes a 3-month rent abatement at lease commencement and a pro rata share calculation based on a multi-tenant industrial park. The abatement period and pro rata methodology must be extracted accurately for rent roll verification and cash flow modeling.',
    solution:
      'Lextract extracted the rent abatement period (months 1-3), the post-abatement base rent, the NNN expense structure, and the pro rata share (12.4% of the industrial park). All fields required for accurate cash flow modeling and rent roll verification were correctly captured.',
    extractedHighlights: [
      { field: 'Lease Type', value: 'Triple Net (NNN)', why: 'Tenant pays all operating expenses above base rent' },
      { field: 'Annual Base Rent', value: '$960,000', why: '$24/RSF NNN - Prologis Class A industrial rate for Silicon Valley' },
      { field: 'Rent Abatement', value: '3 months (months 1-3)', why: 'Free rent period reduces effective year-1 cash flow by $240,000' },
      { field: 'Pro Rata Share', value: '12.4%', why: 'Tenant\'s share of common area and NNN expenses' },
      { field: 'NNN Expense Cap', value: 'Uncapped', why: 'No cap on NNN expenses - red flag for tenant' },
      { field: 'Renewal Option', value: '1 × 3-year option', why: 'Single renewal at fair market rent' },
    ],
    complexityFactors: [
      'Rent abatement period affects cash flow modeling',
      'Multi-tenant park pro rata share calculation',
      'Uncapped NNN expenses (red flag)',
      'Prologis standard form with extensive NNN provisions',
    ],
    fieldsExtracted: 126,
    extractionTime: PROCESSING_TIME.comparison,
    relatedCaseStudies: ['northann-warehouse', 'sutro-biopharma-industrial', 'broken-arrow-marijuana'],
    relatedIndustries: ['manufacturing-industrial-lease-abstraction'],
    relatedLeaseTypes: ['nnn-triple-net-lease'],
    relatedPropertyTypes: ['industrial-lease-abstraction'],
    relatedUseCases: ['due-diligence', 'cam-reconciliation'],
    faqs: [
      {
        question: 'How does Lextract handle rent abatement periods in NNN leases?',
        answer: 'Lextract extracts the abatement start and end dates, the abatement amount (full or partial), and flags whether the abatement is contingent on any conditions such as tenant not being in default.',
      },
      {
        question: 'What should I watch for in uncapped NNN leases?',
        answer: 'Uncapped NNN leases expose tenants to unlimited operating expense growth. Lextract flags this as a red flag and extracts all NNN expense categories so tenants can benchmark against prior year actuals and project future exposure.',
      },
    ],
    metaTitle: 'Corsair Industrial NNN Lease - AI Extraction Case Study',
    metaDescription:
      'Lextract extracted 126 fields from Corsair Components\' 40,000 RSF NNN industrial lease: rent abatement, pro rata share, and uncapped NNN expense structure.',
  },
  {
    name: 'Northann Warehouse',
    slug: 'northann-warehouse',
    propertyType: 'Industrial',
    leaseStructure: 'NNN',
    tenantName: 'Northann Corp',
    landlordName: 'ProLogis',
    location: 'Fontana, CA',
    squareFootage: 106000,
    annualRent: 1696000,
    leaseTerm: '72 months',
    challenge:
      'At 106,000 RSF, this is the largest warehouse in the extraction corpus by area. The lease contains multiple rent escalation schedules tied to CPI with a fixed floor and ceiling, and a complex early termination right exercisable in year 4 with a substantial termination fee formula.',
    solution:
      'Lextract extracted the full CPI escalation provisions including the floor (3%) and ceiling (6%), the termination right details (effective date: month 49, notice period: 12 months), and computed the termination fee formula. All 126 fields were extracted from this high-complexity large-format warehouse lease.',
    extractedHighlights: [
      { field: 'Square Footage', value: '106,000 RSF', why: 'Largest warehouse in portfolio - scale increases exposure on all NNN items' },
      { field: 'Annual Base Rent', value: '$1,696,000', why: '$16/RSF NNN - Inland Empire market rate for Class A warehouse' },
      { field: 'Escalation Type', value: 'CPI with 3% floor / 6% ceiling', why: 'Bounded CPI allows modeling of best/worst case scenarios' },
      { field: 'Early Termination Right', value: 'Month 49 with 12-month notice', why: 'Creates lease risk at year 4 - monitor for exercise notice' },
      { field: 'Termination Fee', value: 'Unamortized TI + 6 months rent', why: 'Substantial fee creates deterrent to early exit' },
      { field: 'Dock Doors', value: '32 dock-high, 4 grade-level', why: 'Critical for industrial tenants evaluating operations fit' },
    ],
    complexityFactors: [
      'CPI escalation with floor/ceiling band',
      'Early termination right in year 4',
      'Complex termination fee calculation',
      'Large format (106K RSF) affects pro rata calculations',
    ],
    fieldsExtracted: 126,
    extractionTime: PROCESSING_TIME.comparison,
    relatedCaseStudies: ['corsair-industrial-nnn', 'sutro-biopharma-industrial', 'broken-arrow-marijuana'],
    relatedIndustries: ['logistics-supply-chain-lease-abstraction'],
    relatedLeaseTypes: ['nnn-triple-net-lease'],
    relatedPropertyTypes: ['industrial-lease-abstraction'],
    relatedUseCases: ['due-diligence', 'portfolio-review'],
    faqs: [
      {
        question: 'How does Lextract extract CPI escalation clauses with floors and ceilings?',
        answer: 'Lextract identifies the escalation type, extracts the CPI index referenced (usually CPI-U or CPI-W), and captures the floor and ceiling percentages as separate fields, enabling analysts to model minimum and maximum rent scenarios.',
      },
      {
        question: 'How are early termination rights tracked?',
        answer: 'Lextract extracts the termination effective date, required notice period, termination fee formula, and any conditions (e.g., tenant not in default). These fields are flagged with high importance in the red flag analysis.',
      },
    ],
    metaTitle: 'Northann 106K RSF Warehouse Lease - AI Extraction Case Study',
    metaDescription:
      'Lextract extracted 126 fields from Northann\'s 106,000 RSF Inland Empire warehouse lease: CPI escalation with floor/ceiling, early termination right, and complex fee formula.',
  },
  {
    name: 'Sutro Biopharma Industrial',
    slug: 'sutro-biopharma-industrial',
    propertyType: 'Industrial',
    leaseStructure: 'NNN',
    tenantName: 'Sutro Biopharma',
    landlordName: 'ARE-East Grand LLC',
    location: 'South San Francisco, CA',
    squareFootage: 47000,
    annualRent: 2538000,
    leaseTerm: '84 months',
    challenge:
      'Sutro Biopharma occupies what is classified as industrial space but operates a biologics manufacturing facility, making this a hybrid industrial/life sciences lease. The escalating rent schedule runs through 7 years with annual 3% bumps. The use clause requires specialized hazardous materials handling provisions that interact with the NNN expense structure.',
    solution:
      'Lextract classified the lease as industrial NNN, extracted the full 7-year escalation schedule with each annual step, and parsed the specialized use clause including hazardous materials handling provisions. The above-market rent ($54/RSF for industrial) was noted as consistent with South San Francisco biotech market rates.',
    extractedHighlights: [
      { field: 'Annual Base Rent (Year 1)', value: '$2,538,000', why: '$54/RSF NNN - premium biotech market rate' },
      { field: 'Escalation Schedule', value: '3% annual bumps for 7 years', why: 'Full schedule extracted for cash flow modeling through 2031' },
      { field: 'Use Clause', value: 'Biologics manufacturing + hazmat', why: 'Specialized use clause limits subletting and assignment options' },
      { field: 'Hazmat Provisions', value: 'Tier II hazmat handling required', why: 'Compliance obligation that transfers on assignment' },
      { field: 'Security Deposit', value: '$634,500', why: '3-month deposit - standard for biotech industrial' },
      { field: 'Assignment Rights', value: 'Landlord consent required', why: 'Restricts M&A flexibility for biotech tenant' },
    ],
    complexityFactors: [
      'Hybrid industrial/life sciences use classification',
      'Premium South San Francisco biotech market',
      '7-year escalating rent schedule',
      'Hazardous materials provisions in NNN structure',
      'Restricted assignment rights (M&A risk)',
    ],
    fieldsExtracted: 126,
    extractionTime: PROCESSING_TIME.comparison,
    relatedCaseStudies: ['corsair-industrial-nnn', 'pliant-therapeutics-lab', 'northann-warehouse'],
    relatedIndustries: ['biotech-pharma-lease-abstraction'],
    relatedLeaseTypes: ['nnn-triple-net-lease'],
    relatedPropertyTypes: ['industrial-lease-abstraction', 'lab-life-sciences-lease-abstraction'],
    relatedUseCases: ['due-diligence', 'lease-audit'],
    faqs: [
      {
        question: 'Can Lextract handle hybrid industrial/life sciences leases?',
        answer: 'Yes. Lextract classifies leases by their legal structure (NNN, gross, etc.) independently of the use. For hybrid facilities, both the industrial NNN structure and the life sciences use provisions are fully extracted.',
      },
      {
        question: 'Why do assignment clauses matter for biotech tenants?',
        answer: 'Biotech companies are frequent M&A targets. Lease assignment restrictions can complicate acquisitions, require landlord consent that delays closing, or trigger above-market rent resets. Lextract flags these provisions as high-priority review items.',
      },
    ],
    metaTitle: 'Sutro Biopharma Industrial Lease - AI Extraction Case Study',
    metaDescription:
      'Lextract extracted 126 fields from Sutro Biopharma\'s 47,000 RSF South San Francisco industrial lease: 7-year escalation schedule, hazmat provisions, and biotech-specific clauses.',
  },
  {
    name: 'Pliant Therapeutics Lab',
    slug: 'pliant-therapeutics-lab',
    propertyType: 'Life Sciences',
    leaseStructure: 'Modified Gross',
    tenantName: 'Pliant Therapeutics',
    landlordName: 'ARE-San Francisco No. 63 LLC',
    location: 'South San Francisco, CA',
    squareFootage: 100000,
    annualRent: 6500000,
    leaseTerm: '120 months',
    challenge:
      'This 100,000 RSF lab lease requires a $1.4 million letter of credit as a security deposit - one of the largest in the corpus - and includes a burn-down provision that reduces the LOC amount annually based on tenant performance milestones. Extracting the LOC burn-down schedule and performance triggers is essential for cash management planning.',
    solution:
      'Lextract extracted the letter of credit amount ($1.4M), identified the burn-down schedule (5 annual reductions tied to no-default milestones), and captured the LC provider requirements and draw conditions. The 10-year term and above-market rent ($65/RSF) were correctly classified as consistent with South San Francisco Class A lab rates.',
    extractedHighlights: [
      { field: 'Security Deposit Type', value: 'Letter of Credit', why: 'LOC vs cash deposit - affects tenant\'s balance sheet differently' },
      { field: 'Letter of Credit Amount', value: '$1,400,000', why: 'One of the largest LOCs in portfolio - critical cash management item' },
      { field: 'LOC Burn-Down Schedule', value: '5 annual reductions to $280K', why: 'Burn-down milestones must be tracked to avoid forfeiture' },
      { field: 'Annual Base Rent', value: '$6,500,000', why: '$65/RSF modified gross - premium lab rate for SSF' },
      { field: 'Lease Term', value: '120 months (10 years)', why: 'Long-term commitment for capital-intensive lab buildout' },
      { field: 'TI Allowance', value: '$150/RSF', why: '$15M allowance for lab-ready buildout - above market' },
    ],
    complexityFactors: [
      'Letter of credit security deposit (not cash)',
      'LOC burn-down schedule with performance milestones',
      'Large-format Class A lab (100K RSF)',
      'Above-market $150/RSF TI allowance',
      '10-year initial term',
    ],
    fieldsExtracted: 126,
    extractionTime: PROCESSING_TIME.comparison,
    relatedCaseStudies: ['university-hospital-medical', 'sutro-biopharma-industrial', 'bicara-therapeutics-expansion'],
    relatedIndustries: ['biotech-pharma-lease-abstraction'],
    relatedLeaseTypes: ['modified-gross-lease'],
    relatedPropertyTypes: ['lab-life-sciences-lease-abstraction'],
    relatedUseCases: ['due-diligence', 'lease-audit'],
    faqs: [
      {
        question: 'How does Lextract handle letter of credit security deposits vs cash deposits?',
        answer: 'Lextract identifies the security deposit type (cash, LOC, or both), extracts the amount, and for LOCs also captures the burn-down schedule, required bank, expiration requirements, and draw conditions.',
      },
      {
        question: 'What is a letter of credit burn-down provision?',
        answer: 'A burn-down provision allows the LOC amount to reduce over time, typically annually, as long as the tenant remains in good standing (no defaults, no bankruptcies). This rewards creditworthy tenants with reduced deposit obligations over time.',
      },
    ],
    metaTitle: 'Pliant Therapeutics Lab Lease - AI Extraction Case Study',
    metaDescription:
      'Lextract extracted 126 fields from Pliant Therapeutics\' 100,000 RSF South San Francisco lab lease: $1.4M letter of credit with burn-down schedule, 10-year term.',
  },
  {
    name: 'Extend Health Amendment Chain',
    slug: 'extend-health-amendments',
    propertyType: 'Office',
    leaseStructure: 'Modified Gross',
    tenantName: 'Extend Health',
    landlordName: 'Kilroy Realty',
    location: 'Salt Lake City, UT',
    squareFootage: 28000,
    annualRent: 756000,
    leaseTerm: '48 months',
    challenge:
      'This file contains three consecutive amendments plus a landlord assignment document. Extracting the current lease terms requires reconciling changes across four documents, with each amendment superseding portions of the prior agreement. The landlord was also assigned (from original owner to Kilroy Realty), requiring verification that all lease obligations transferred correctly.',
    solution:
      'Lextract processed all four documents, identified the amendment chain sequence, applied the most recent superseding provisions to each field, and correctly reflected the Kilroy Realty assignment as the current landlord entity. The extraction produced a single coherent 126-field record representing the current lease state.',
    extractedHighlights: [
      { field: 'Document Type', value: '3rd Amendment + Landlord Assignment', why: 'Multi-document chain requires reconciliation across 4 documents' },
      { field: 'Current Landlord', value: 'Kilroy Realty LP', why: 'Landlord changed via assignment - must match current notice requirements' },
      { field: 'Effective RSF', value: '28,000 RSF', why: 'Final RSF after 3 amendments (original was 21,000 RSF)' },
      { field: 'Annual Base Rent', value: '$756,000', why: '$27/RSF modified gross - reflects amendment-history pricing' },
      { field: 'Expiration Date', value: 'December 31, 2025', why: 'Short remaining term - near-term renewal decision required' },
      { field: 'Outstanding TI Balance', value: '$0', why: 'All TI fully disbursed across prior amendments' },
    ],
    complexityFactors: [
      '3-amendment chain (original + 3 amendments)',
      'Landlord assignment mid-lease',
      'Superseding provisions must be reconciled across documents',
      'RSF increased through amendments (21K → 28K)',
    ],
    fieldsExtracted: 126,
    extractionTime: PROCESSING_TIME.comparison,
    relatedCaseStudies: ['karyopharm-biotech-office', 'bicara-therapeutics-expansion', 'infoblox-tech-sublease'],
    relatedIndustries: ['tech-companies-lease-abstraction'],
    relatedLeaseTypes: ['modified-gross-lease'],
    relatedPropertyTypes: ['office-lease-abstraction'],
    relatedUseCases: ['lease-amendments', 'portfolio-review'],
    faqs: [
      {
        question: 'How does Lextract handle multi-amendment lease chains?',
        answer: 'Lextract processes all documents in sequence, identifies amendment numbers (First, Second, Third, etc.), and applies each amendment\'s provisions as overrides to the prior document. The final extraction represents the current lease state as if all documents were a single current agreement.',
      },
      {
        question: 'What happens to the landlord name when a lease is assigned?',
        answer: 'Lextract extracts both the original landlord (from the original lease) and the assignee landlord (from the assignment document). The current landlord field reflects the most recent assignee, and the original landlord is preserved in the notes field.',
      },
    ],
    metaTitle: 'Extend Health 3-Amendment Lease Chain - AI Extraction Case Study',
    metaDescription:
      'Lextract extracted 126 fields from a 3-amendment lease chain with landlord assignment: reconciling superseding provisions across 4 documents into a single coherent record.',
  },
  {
    name: 'SVC REIT Master Lease',
    slug: 'svc-reit-portfolio',
    propertyType: 'Specialty',
    leaseStructure: 'Absolute Net',
    tenantName: 'Service Properties Trust (SVC)',
    landlordName: 'RMR Group',
    location: 'Multiple US locations',
    squareFootage: null,
    annualRent: 52000000,
    leaseTerm: '240 months',
    challenge:
      'This is a REIT master lease covering a portfolio of service properties at $52 million annual rent on a 20-year absolute net structure. Master leases require extracting portfolio-level terms while flagging that individual property details are not embedded - a fundamentally different structure from single-tenant leases.',
    solution:
      'Lextract correctly classified this as a master lease, extracted the portfolio-level financial terms ($52M/yr, 20-year absolute net), identified the RMR Group management structure, and flagged the absence of individual property detail as expected for this lease type. The absolute net structure was correctly distinguished from NNN.',
    extractedHighlights: [
      { field: 'Lease Type', value: 'Master Lease - Absolute Net', why: 'Portfolio-level obligation; tenant responsible for ALL costs including structural' },
      { field: 'Annual Rent', value: '$52,000,000', why: 'Largest annual rent in extraction corpus - portfolio-level obligation' },
      { field: 'Lease Term', value: '240 months (20 years)', why: 'Very long-term REIT master lease - limited near-term refinancing risk' },
      { field: 'Portfolio Structure', value: 'Multiple US properties', why: 'Master lease covers entire portfolio; no per-property breakdown' },
      { field: 'Rent Escalation', value: 'Fixed 2% annual', why: 'Below-CPI escalation common in long-term REIT structures' },
      { field: 'REIT Entity', value: 'Service Properties Trust', why: 'REIT tenant classification affects credit analysis differently than operating company' },
    ],
    complexityFactors: [
      'Master lease (portfolio coverage, not single property)',
      'Absolute net structure (broader than NNN)',
      '$52M annual rent - largest in corpus',
      '20-year term',
      'REIT entity structure',
    ],
    fieldsExtracted: 126,
    extractionTime: PROCESSING_TIME.comparison,
    relatedCaseStudies: ['atx-technologies-nnn', 'danger-datacenter', 'chronic-therapy-cannabis'],
    relatedIndustries: ['reit-institutional-lease-abstraction'],
    relatedLeaseTypes: ['absolute-net-lease'],
    relatedPropertyTypes: ['specialty-lease-abstraction'],
    relatedUseCases: ['portfolio-review', 'due-diligence'],
    faqs: [
      {
        question: 'What is the difference between absolute net and NNN?',
        answer: 'In a triple net (NNN) lease, the tenant pays taxes, insurance, and maintenance. In an absolute net lease, the tenant additionally pays for structural repairs and replacements (roof, foundation, etc.), making it the most tenant-responsible lease structure. Lextract distinguishes these and flags the difference.',
      },
      {
        question: 'How does Lextract handle REIT master leases with no per-property detail?',
        answer: 'Lextract extracts all portfolio-level terms (total rent, term, escalation, renewal options) and notes the master lease structure. Per-property details are flagged as not present in the document - not as extraction failures.',
      },
    ],
    metaTitle: 'SVC REIT $52M Master Lease - AI Extraction Case Study',
    metaDescription:
      'Lextract extracted 126 fields from a $52M/year REIT master lease: absolute net structure, 20-year term, portfolio-level financials, and REIT entity classification.',
  },
  {
    name: 'Chronic Therapy Cannabis Retail',
    slug: 'chronic-therapy-cannabis',
    propertyType: 'Retail',
    leaseStructure: 'NNN',
    tenantName: 'Chronic Therapy',
    landlordName: 'Mountain States Properties',
    location: 'Denver, CO',
    squareFootage: 4200,
    annualRent: 126000,
    leaseTerm: '60 months',
    challenge:
      'Cannabis retail leases contain use clauses, local licensing references, and cash-only payment provisions that are unique to the industry. The federal illegality of cannabis creates unusual provisions around landlord liability, assignment restrictions, and lender consent requirements that are absent from standard retail leases.',
    solution:
      'Lextract extracted the cannabis-specific use clause, the cash-only rent payment provision, the restrictive assignment clause (requiring landlord consent plus new tenant licensing), and the federal legality disclaimer provision. All standard NNN fields were also extracted correctly.',
    extractedHighlights: [
      { field: 'Use Clause', value: 'Licensed cannabis retail dispensary', why: 'Highly restrictive use - essentially no subletting market' },
      { field: 'Rent Payment Method', value: 'Cash only (federal banking restrictions)', why: 'Cannabis tenants cannot use standard banking - affects payment processing' },
      { field: 'Assignment Restrictions', value: 'Landlord consent + new cannabis license required', why: 'Near-impossible assignment - effective owner-occupancy' },
      { field: 'Federal Legality Disclaimer', value: 'Present', why: 'Landlord protection clause in event of federal enforcement' },
      { field: 'Annual Rent', value: '$126,000', why: '$30/RSF NNN - above-market premium for cannabis-permitted location' },
      { field: 'Renewal Option', value: '2 × 5-year options', why: 'Long renewal tail - cannabis tenants invest heavily in permitted locations' },
    ],
    complexityFactors: [
      'Cannabis use clause (federal/state law conflict)',
      'Cash-only payment provision',
      'Near-impossible assignment market',
      'Landlord liability protection clauses',
      'Location-specific cannabis licensing dependency',
    ],
    fieldsExtracted: 126,
    extractionTime: PROCESSING_TIME.comparison,
    relatedCaseStudies: ['broken-arrow-marijuana', 'atx-technologies-nnn', 'corsair-industrial-nnn'],
    relatedIndustries: ['cannabis-retail-lease-abstraction', 'retail-lease-abstraction'],
    relatedLeaseTypes: ['nnn-triple-net-lease'],
    relatedPropertyTypes: ['retail-lease-abstraction'],
    relatedUseCases: ['due-diligence', 'lease-audit'],
    faqs: [
      {
        question: 'What special provisions appear in cannabis retail leases?',
        answer: 'Cannabis leases routinely contain use clauses tied to state licensing, cash-only payment provisions (due to federal banking restrictions), landlord indemnification clauses related to federal law, and assignment restrictions requiring the assignee to hold a valid cannabis license.',
      },
      {
        question: 'Why is Lextract useful for cannabis property landlords?',
        answer: 'Cannabis leases contain unique risk provisions that standard abstraction tools miss. Lextract\'s extraction model is trained on cannabis lease patterns and correctly identifies these specialized clauses, flagging them for review by landlords, lenders, and investors.',
      },
    ],
    metaTitle: 'Cannabis Retail NNN Lease Extraction - AI Case Study',
    metaDescription:
      'Lextract extracted 126 fields from a Denver cannabis retail lease: use clause, cash-only payment, assignment restrictions, and federal legality disclaimer provisions.',
  },
  {
    name: 'ATX Technologies Single-Tenant NNN',
    slug: 'atx-technologies-nnn',
    propertyType: 'Office',
    leaseStructure: 'NNN',
    tenantName: 'ATX Technologies',
    landlordName: 'Vereit Net Lease',
    location: 'Boca Raton, FL',
    squareFootage: 58000,
    annualRent: 1856000,
    leaseTerm: '120 months',
    challenge:
      'Single-tenant NNN office leases are common in net lease REIT portfolios but require careful extraction of the full NNN expense obligation alongside standard office lease terms. At 58,000 RSF on a 10-year term, this lease represents significant credit tenant exposure and includes a corporate guarantee structure typical of Vereit portfolio leases.',
    solution:
      'Lextract extracted the full NNN expense structure (taxes, insurance, maintenance, roof, structure), the corporate guaranty provisions, the 10-year term with renewal options, and the annual 1.5% fixed escalation schedule. The credit tenant classification and Vereit standard form provisions were correctly identified.',
    extractedHighlights: [
      { field: 'Lease Type', value: 'Single-Tenant NNN', why: 'Full expense pass-through - credit analysis focuses on tenant, not property' },
      { field: 'Annual Base Rent', value: '$1,856,000', why: '$32/RSF NNN - Boca Raton Class B office NNN rate' },
      { field: 'Lease Term', value: '120 months (10 years)', why: 'Long-term net lease common in REIT portfolio' },
      { field: 'Corporate Guaranty', value: 'ATX Technologies Inc. (full guarantee)', why: 'Corporate guarantee covers full lease obligation - key for credit analysis' },
      { field: 'Escalation', value: '1.5% annual fixed', why: 'Below-CPI escalation - common in long-term NNN structures' },
      { field: 'Renewal Options', value: '4 × 5-year options', why: '20 years of potential occupancy - strong anchor tenant profile' },
    ],
    complexityFactors: [
      'Single-tenant NNN (full expense pass-through)',
      'Corporate guaranty structure',
      '10-year initial term',
      'Vereit standard form with extensive NNN provisions',
      'Below-market escalation (1.5% vs CPI)',
    ],
    fieldsExtracted: 126,
    extractionTime: PROCESSING_TIME.comparison,
    relatedCaseStudies: ['svc-reit-portfolio', 'corsair-industrial-nnn', 'northann-warehouse'],
    relatedIndustries: ['tech-companies-lease-abstraction'],
    relatedLeaseTypes: ['nnn-triple-net-lease'],
    relatedPropertyTypes: ['office-lease-abstraction'],
    relatedUseCases: ['due-diligence', 'portfolio-review'],
    faqs: [
      {
        question: 'How does NNN office differ from NNN industrial?',
        answer: 'NNN office leases typically include tenant responsibility for HVAC maintenance, common area costs, and sometimes structural elements. NNN industrial leases tend to have broader tenant responsibilities including crane/dock equipment. Lextract captures the specific expense categories included in each lease\'s NNN definition.',
      },
      {
        question: 'What makes corporate guaranty provisions important in net lease analysis?',
        answer: 'A corporate guaranty means the lease obligation is backed by the parent company\'s balance sheet, not just the operating entity. Lextract extracts the guarantor entity name, guaranty type (full/partial/limited), and any burn-down or release conditions.',
      },
    ],
    metaTitle: 'ATX Technologies 58K RSF NNN Office Lease - AI Extraction Case Study',
    metaDescription:
      'Lextract extracted 126 fields from ATX Technologies\' 58,000 RSF single-tenant NNN office lease: 10-year term, corporate guaranty, and Vereit portfolio standard form.',
  },
  {
    name: 'Danger Datacenter Phased Delivery',
    slug: 'danger-datacenter',
    propertyType: 'Specialty',
    leaseStructure: 'NNN',
    tenantName: 'Danger Inc.',
    landlordName: 'Digital Realty',
    location: 'Ashburn, VA',
    squareFootage: 22000,
    annualRent: 2640000,
    leaseTerm: '84 months',
    challenge:
      'Datacenter leases are priced per kilowatt of power capacity, not per square foot, and delivered in phases as power infrastructure is built out. Extracting the correct rent requires understanding the power-based pricing model and the phased delivery schedule where rent escalates as each phase goes live.',
    solution:
      'Lextract identified the datacenter lease structure, extracted the power capacity (1 MW total across 3 phases), the per-kW monthly pricing, and the phased commencement schedule with rent amounts for each phase. The $120/kW/month pricing was extracted and converted to both annual rent and effective $/RSF for comparison purposes.',
    extractedHighlights: [
      { field: 'Pricing Basis', value: 'Per kW power capacity', why: 'Datacenter leases priced on power, not RSF - must convert for rent roll' },
      { field: 'Total Power Capacity', value: '1,000 kW (1 MW)', why: 'Power capacity determines maximum workload and future expansion' },
      { field: 'Monthly Rate', value: '$120/kW/month', why: 'Ashburn Tier III colocation market rate - benchmark for portfolio' },
      { field: 'Phase 1 Commencement', value: '400 kW - Month 1', why: 'Initial rent obligation begins on Phase 1 delivery' },
      { field: 'Phase 2 Commencement', value: '400 kW - Month 7', why: 'Rent escalates when Phase 2 power goes live' },
      { field: 'Phase 3 Commencement', value: '200 kW - Month 13', why: 'Final phase completes full 1 MW commitment' },
    ],
    complexityFactors: [
      'Power-based pricing model ($/kW/month)',
      'Phased delivery with 3 separate commencement dates',
      'Rent escalates as phases go live',
      'Datacenter-specific provisions (power SLAs, uptime guarantees)',
      'Digital Realty standard form',
    ],
    fieldsExtracted: 126,
    extractionTime: PROCESSING_TIME.comparison,
    relatedCaseStudies: ['svc-reit-portfolio', 'atx-technologies-nnn', 'northann-warehouse'],
    relatedIndustries: ['tech-companies-lease-abstraction'],
    relatedLeaseTypes: ['nnn-triple-net-lease'],
    relatedPropertyTypes: ['specialty-lease-abstraction'],
    relatedUseCases: ['due-diligence', 'portfolio-review'],
    faqs: [
      {
        question: 'How does Lextract handle datacenter leases priced per kilowatt instead of per square foot?',
        answer: 'Lextract recognizes datacenter pricing models and extracts the per-kW rate, total contracted power, and computes the effective annual rent. It also converts to effective $/RSF for comparison with the rest of your portfolio.',
      },
      {
        question: 'What makes phased delivery leases complex to abstract?',
        answer: 'Phased delivery leases have multiple commencement dates, escalating rent obligations, and sometimes different terms or rates per phase. Lextract extracts each phase separately and computes the blended rent at full stabilization.',
      },
    ],
    metaTitle: 'Datacenter Phased Delivery NNN Lease - AI Extraction Case Study',
    metaDescription:
      'Lextract extracted 126 fields from a datacenter lease with phased power delivery: per-kW pricing model, 3-phase commencement schedule, and 1 MW total capacity.',
  },
  {
    name: 'Broken Arrow Marijuana Grow Facility',
    slug: 'broken-arrow-marijuana',
    propertyType: 'Industrial',
    leaseStructure: 'NNN',
    tenantName: 'Broken Arrow Herbals',
    landlordName: 'Oklahoma Agricultural Properties',
    location: 'Broken Arrow, OK',
    squareFootage: 48000,
    annualRent: 480000,
    leaseTerm: '60 months',
    challenge:
      'Large-scale marijuana cultivation facilities occupy industrial buildings but require specialized infrastructure (grow lighting, HVAC, water systems) that creates unusual TI provisions and utility cost structures. Oklahoma\'s medical marijuana program creates state-specific licensing provisions that differ from Colorado and California cannabis leases.',
    solution:
      'Lextract extracted the cultivation facility use clause, the specialized utility addendum (tenant pays 100% of power costs via separate meter), the Oklahoma state licensing provisions, and all NNN terms. The below-market rent ($10/RSF) reflects the rural Oklahoma market vs. urban cannabis markets.',
    extractedHighlights: [
      { field: 'Use Clause', value: 'Licensed marijuana cultivation facility', why: 'Oklahoma OMMA license required - different from dispensary licensing' },
      { field: 'Annual Base Rent', value: '$480,000', why: '$10/RSF NNN - rural Oklahoma market vs $30+/RSF in urban markets' },
      { field: 'Utility Addendum', value: 'Tenant pays 100% power via dedicated meter', why: 'Cultivation facilities have extremely high power consumption' },
      { field: 'TI Allowance', value: '$25/RSF for grow infrastructure', why: 'Specialized buildout for lighting and HVAC systems' },
      { field: 'State License Requirement', value: 'Oklahoma OMMA Grower License', why: 'License number must appear in assignment provisions' },
      { field: 'Assignment', value: 'Prohibited without OMMA approval', why: 'State regulatory approval adds complexity to any assignment' },
    ],
    complexityFactors: [
      'Marijuana cultivation (federal/state law conflict)',
      'Oklahoma OMMA-specific provisions',
      'Dedicated power metering for grow operations',
      'Specialized TI for cultivation infrastructure',
      'Regulatory approval required for assignment',
    ],
    fieldsExtracted: 126,
    extractionTime: PROCESSING_TIME.comparison,
    relatedCaseStudies: ['chronic-therapy-cannabis', 'corsair-industrial-nnn', 'northann-warehouse'],
    relatedIndustries: ['cannabis-retail-lease-abstraction'],
    relatedLeaseTypes: ['nnn-triple-net-lease'],
    relatedPropertyTypes: ['industrial-lease-abstraction'],
    relatedUseCases: ['due-diligence', 'lease-audit'],
    faqs: [
      {
        question: 'How do marijuana grow facility leases differ from cannabis dispensary leases?',
        answer: 'Cultivation facilities require power, water, and HVAC infrastructure provisions not found in dispensary leases. They are typically in industrial buildings with dedicated utility meters, specialized TI allowances for grow systems, and state grow licensing requirements that differ from retail licensing.',
      },
      {
        question: 'What Oklahoma OMMA provisions are typically found in cannabis leases?',
        answer: 'Oklahoma leases reference the OMMA license number, require notification to the landlord of license renewal or revocation, and typically restrict assignment to other OMMA-licensed growers. Lextract extracts all state-specific licensing provisions as structured fields.',
      },
    ],
    metaTitle: 'Marijuana Cultivation Facility Industrial Lease - AI Extraction Case Study',
    metaDescription:
      'Lextract extracted 126 fields from a 48,000 RSF Oklahoma marijuana grow facility lease: cultivation use clause, dedicated power metering, OMMA licensing provisions.',
  },
  {
    name: 'Infoblox Silicon Valley Sublease',
    slug: 'infoblox-tech-sublease',
    propertyType: 'Office',
    leaseStructure: 'Modified Gross',
    tenantName: 'Infoblox',
    landlordName: 'Santa Clara Properties (Sublandlord)',
    location: 'Santa Clara, CA',
    squareFootage: 35000,
    annualRent: 1400000,
    leaseTerm: '36 months',
    challenge:
      'Sublease abstractions require extracting two sets of obligations: the sublease terms between sublandlord and subtenant, and the master lease terms that continue to bind the sublandlord. The subtenant\'s rights are limited by both the sublease and the master lease, and the consent requirements of the master landlord must be tracked.',
    solution:
      'Lextract identified the sublease structure, extracted the sublease-specific terms (sublandlord, subtenant, sublease rent, sublease term), and cross-referenced the master lease provisions incorporated by reference. The subtenant\'s notice requirements to the master landlord were correctly extracted from the consent document.',
    extractedHighlights: [
      { field: 'Document Type', value: 'Sublease', why: 'Subtenant rights limited by both sublease and master lease' },
      { field: 'Sublandlord', value: 'Infoblox Inc.', why: 'Sublandlord remains liable on master lease - credit risk for master landlord' },
      { field: 'Sublease Rent', value: '$1,400,000/year', why: '$40/RSF - below master lease rate (sublandlord absorbs difference)' },
      { field: 'Sublease Term', value: '36 months', why: 'Sublease term cannot exceed remaining master lease term' },
      { field: 'Master Landlord Consent', value: 'Required and obtained', why: 'Sublease is void without master landlord consent' },
      { field: 'Subtenant Use Rights', value: 'Coextensive with master lease use', why: 'Use rights pass through from master lease to subtenant' },
    ],
    complexityFactors: [
      'Sublease structure (2-layer obligation)',
      'Master lease provisions incorporated by reference',
      'Master landlord consent document',
      'Sublandlord credit risk persists through sublease',
      'Below-master-lease rent (spread risk for sublandlord)',
    ],
    fieldsExtracted: 126,
    extractionTime: PROCESSING_TIME.comparison,
    relatedCaseStudies: ['zixcorp-canada-sublease', 'extend-health-amendments', 'karyopharm-biotech-office'],
    relatedIndustries: ['tech-companies-lease-abstraction'],
    relatedLeaseTypes: ['sublease'],
    relatedPropertyTypes: ['office-lease-abstraction'],
    relatedUseCases: ['due-diligence', 'lease-audit'],
    faqs: [
      {
        question: 'What fields are most important to extract from a sublease?',
        answer: 'Critical sublease fields include: sublandlord entity, subtenant entity, sublease commencement/expiration, sublease rent vs master rent, master landlord consent status, holdover provisions, and which master lease provisions are incorporated by reference.',
      },
      {
        question: 'Can Lextract handle subleases where the master lease is referenced but not included?',
        answer: 'Yes. Lextract extracts all provisions present in the sublease document. Where the master lease is referenced but not included, those fields are flagged as "referenced - master lease required" rather than returned as empty or incorrect.',
      },
    ],
    metaTitle: 'Infoblox Silicon Valley Sublease - AI Extraction Case Study',
    metaDescription:
      'Lextract extracted 126 fields from Infoblox\'s 35,000 RSF Silicon Valley sublease: dual-layer obligation structure, master landlord consent, and sublandlord credit risk analysis.',
  },
  {
    name: 'ZixCorp Ontario Canada Sublease',
    slug: 'zixcorp-canada-sublease',
    propertyType: 'Office',
    leaseStructure: 'Gross',
    tenantName: 'ZixCorp',
    landlordName: 'Toronto Centre Properties (Sublandlord)',
    location: 'Toronto, ON, Canada',
    squareFootage: 18000,
    annualRent: 576000,
    leaseTerm: '24 months',
    challenge:
      'This non-US lease is governed by Ontario, Canada law and references Canadian dollar amounts, provincial tax provisions, and Canadian landlord-tenant regulations that differ substantially from US commercial lease norms. Cross-border extraction must correctly handle currency, legal references, and province-specific provisions.',
    solution:
      'Lextract correctly identified the Canadian jurisdiction, extracted amounts in CAD, identified the Ontario provincial regulations referenced, and applied the appropriate legal framework for interpreting landlord-tenant provisions. The gross lease structure and Canadian property tax provisions were correctly classified.',
    extractedHighlights: [
      { field: 'Jurisdiction', value: 'Ontario, Canada', why: 'Provincial law governs - different from any US state requirements' },
      { field: 'Currency', value: 'CAD (Canadian Dollars)', why: 'All amounts in CAD - must flag for US portfolio currency normalization' },
      { field: 'Annual Rent (CAD)', value: 'CAD $576,000', why: '$32 CAD/RSF gross - Toronto downtown Class B office rate' },
      { field: 'Lease Type', value: 'Gross', why: 'Landlord pays all operating expenses - unusual for Canadian commercial' },
      { field: 'Provincial Tax', value: 'Ontario HST applicable', why: 'Harmonized Sales Tax on rent - different from US sales tax treatment' },
      { field: 'Governing Law', value: 'Province of Ontario', why: 'Dispute resolution and enforcement follow Ontario courts' },
    ],
    complexityFactors: [
      'Non-US jurisdiction (Ontario, Canada)',
      'CAD currency amounts',
      'Canadian provincial tax (HST) provisions',
      'Ontario landlord-tenant law references',
      'Sublease structure across international boundary',
    ],
    fieldsExtracted: 126,
    extractionTime: PROCESSING_TIME.comparison,
    relatedCaseStudies: ['infoblox-tech-sublease', 'extend-health-amendments', 'atx-technologies-nnn'],
    relatedIndustries: ['tech-companies-lease-abstraction'],
    relatedLeaseTypes: ['gross-lease', 'sublease'],
    relatedPropertyTypes: ['office-lease-abstraction'],
    relatedUseCases: ['due-diligence', 'portfolio-review'],
    faqs: [
      {
        question: 'Can Lextract extract leases from Canada and other non-US jurisdictions?',
        answer: 'Yes. Lextract handles leases from Canada, the UK, and other English-language jurisdictions. Jurisdiction is detected automatically and province/country-specific provisions are extracted with appropriate labeling. Currency amounts are extracted as-stated and flagged for normalization.',
      },
      {
        question: 'How does Lextract handle CAD vs USD amounts?',
        answer: 'Lextract extracts the currency as stated in the document (CAD, USD, GBP, etc.) and presents amounts with the currency code. Conversion to a common currency for multi-currency portfolios requires the user to apply an exchange rate at export time.',
      },
    ],
    metaTitle: 'ZixCorp Ontario Canada Sublease - AI Extraction Case Study',
    metaDescription:
      'Lextract extracted 126 fields from ZixCorp\'s Ontario, Canada sublease: CAD currency, provincial HST provisions, and Ontario governing law from a non-US commercial lease.',
  },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

// Published date for this batch - update per-entry if content changes significantly
export const CASE_STUDIES_PUBLISHED_DATE = '2026-03-20'

export function getCaseStudyBySlug(slug: string): CaseStudyData | undefined {
  return CASE_STUDIES.find((cs) => cs.slug === slug)
}

export function getAllCaseStudySlugs(): string[] {
  return CASE_STUDIES.map((cs) => cs.slug)
}

export function getCaseStudiesByPropertyType(type: string): CaseStudyData[] {
  return CASE_STUDIES.filter((cs) => cs.propertyType === type)
}
