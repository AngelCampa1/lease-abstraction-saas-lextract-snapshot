import type { MarketingKnowledge } from './schema'

export const MARKETING_KNOWLEDGE: MarketingKnowledge = {
  product: {
    name: 'Lextract',
    category: 'AI-powered commercial lease abstraction',
    oneLine:
      'Upload a commercial lease PDF and receive structured fields, confidence scores, red flags, and export-ready reports.',
    fieldCount: 126,
    redFlagCount: 20,
    categoryCount: 16,
    confidenceScoring: true,
    exports: ['JSON', 'Excel', 'Word', 'PDF'],
    disclaimers: [
      'Lextract output is informational only and is not legal, tax, or accounting advice.',
      'Users should verify extracted data against the original lease document before relying on it.',
      'Confidence scores indicate review priority, not a guarantee of accuracy.',
    ],
  },
  pricing: {
    single: {
      price: 15,
      credits: 1,
      label: 'Single Lease',
      perLease: 15,
    },
    pack5: {
      price: 65,
      credits: 5,
      label: '5-Pack',
      savings: '13% off',
      perLease: 13,
    },
    pack10: {
      price: 120,
      credits: 10,
      label: '10-Pack',
      savings: '20% off',
      perLease: 12,
    },
    competitorRange: '$90-$250',
    supportPolicy: 'If an extraction looks wrong, email support and we will review it.',
    creditsExpire: false,
    subscriptionRequired: false,
  },
  processing: {
    canonicalRange: '5-15 minutes',
    headline: 'Results in minutes, not hours',
    detailed: 'typically in 5-15 minutes depending on document length and complexity',
    vsManual: '5-15 minutes vs. 4-8 hours manually',
  },
  contacts: {
    founderSales: {
      email: 'angel.campa@lextract.io',
      purpose: 'Founder, sales, partnerships, and commercial inquiries',
    },
    support: {
      email: 'angel.campa@lextract.io',
      purpose: 'Product support and customer help',
    },
    legal: {
      email: 'angel.campa@lextract.io',
      purpose: 'Legal notices and terms questions',
    },
    privacy: {
      email: 'angel.campa@lextract.io',
      purpose: 'Privacy and data rights requests',
    },
  },
  personas: [
    {
      id: 'tenant-rep',
      label: 'Tenant representatives',
      useCase: 'Abstract leases during portfolio reviews and surface CAM exposure before deadlines.',
    },
    {
      id: 'corporate-real-estate',
      label: 'Corporate real estate teams',
      useCase: 'Standardize lease data across locations for reporting, critical dates, and accounting.',
    },
    {
      id: 'broker',
      label: 'Commercial brokers',
      useCase: 'Create quick lease summaries for deal evaluation without reading every clause manually.',
    },
    {
      id: 'attorney',
      label: 'Real estate attorneys',
      useCase: 'Extract terms before review so legal analysis starts from structured facts.',
    },
    {
      id: 'property-manager',
      label: 'Property managers and landlords',
      useCase: 'Digitize lease portfolios and prepare CAM reconciliation workflows.',
    },
    {
      id: 'investor',
      label: 'Lenders and investors',
      useCase: 'Normalize lease data during acquisition, financing, and due diligence.',
    },
  ],
  competitors: [
    {
      name: 'LeaseLens',
      positioning: 'Free analysis with paid export',
      comparisonNote: 'Useful for ad hoc viewing; Lextract focuses on structured output, confidence, and CAM risk.',
    },
    {
      name: 'Prophia',
      positioning: 'Enterprise CRE portfolio intelligence',
      comparisonNote: 'Built for larger portfolios; Lextract is self-serve and per-lease.',
    },
    {
      name: 'Re-Leased Credia AI',
      positioning: 'Lease management platform AI feature',
      comparisonNote: 'Tied to a broader platform; Lextract is abstraction-first.',
    },
    {
      name: 'Outsourced abstraction services',
      positioning: 'Human-reviewed lease abstracts',
      comparisonNote: 'Appropriate when certified human review is required; Lextract prioritizes speed and cost.',
    },
  ],
  faqs: [
    {
      slug: 'what-is-lease-abstraction',
      question: 'What is lease abstraction?',
      shortAnswer:
        'Lease abstraction extracts key lease terms into a structured summary for review, reporting, and system import.',
    },
    {
      slug: 'how-long-does-lease-abstraction-take',
      question: 'How long does lease abstraction take?',
      shortAnswer:
        'Lextract typically processes commercial leases in 5-15 minutes depending on document length and complexity.',
    },
    {
      slug: 'what-fields-are-in-a-lease-abstract',
      question: 'What fields are in a lease abstract?',
      shortAnswer:
        'Lextract extracts 126 structured fields covering parties, dates, rent, CAM, options, insurance, defaults, and operational clauses.',
    },
    {
      slug: 'how-much-does-lease-abstraction-cost',
      question: 'How much does lease abstraction cost?',
      shortAnswer:
        'Lextract costs $15 for a single lease, $65 for 5 credits, or $120 for 10 credits with no subscription.',
    },
  ],
  leadMagnets: [
    {
      slug: 'lease-abstraction-checklist',
      title: 'Lease Abstraction Checklist',
      fileFormat: 'PDF',
      contentType: 'application/pdf',
    },
    {
      slug: 'cam-reconciliation-checklist',
      title: 'CAM Reconciliation Audit Checklist',
      fileFormat: 'PDF',
      contentType: 'application/pdf',
    },
    {
      slug: 'due-diligence-checklist',
      title: 'Due Diligence Checklist',
      fileFormat: 'PDF',
      contentType: 'application/pdf',
    },
    {
      slug: 'lease-audit-workbook',
      title: 'Lease Audit Workbook',
      fileFormat: 'XLSX',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  ],
  ctas: [
    {
      id: 'upload',
      label: 'Upload Your First Lease',
      href: '/upload',
      context: 'Primary product CTA',
    },
    {
      id: 'sample-output',
      label: 'See Sample Output',
      href: '/sample-report',
      context: 'Evaluation CTA',
    },
    {
      id: 'pricing',
      label: 'View Pricing',
      href: '/pricing',
      context: 'Commercial CTA',
    },
  ],
}
