import type { FaqItem } from '@/lib/content-types'
import { PRODUCT_FIELD_COUNT, PRODUCT_RED_FLAG_COUNT } from '@/lib/product-facts'
import { formatPrice, PRICING, PROCESSING_TIME } from '@/lib/pricing'

export interface FeatureLink {
  label: string
  href: string
}

export interface ProductFeature {
  slug: string
  name: string
  shortName: string
  eyebrow: string
  metaTitle: string
  metaDescription: string
  summary: string
  fastAnswer: string
  problem: string
  solution: string
  proof: string[]
  whatChanges: string[]
  bestFor: string[]
  faqs: FaqItem[]
  internalLinks: FeatureLink[]
  relatedFeatureSlugs: string[]
}

const baseInternalLinks: FeatureLink[] = [
  { label: 'Upload a lease', href: '/upload' },
  { label: 'View sample report', href: '/sample-report' },
  { label: 'Lease abstraction software', href: '/lease-abstraction-software' },
  { label: 'Pricing', href: '/pricing' },
]

export const PRODUCT_FEATURES: ProductFeature[] = [
  {
    slug: '126-field-lease-extraction',
    name: '126-field lease extraction',
    shortName: '126 fields',
    eyebrow: 'Structured lease data',
    metaTitle: '126-Field Lease Extraction Feature | Lextract',
    metaDescription:
      'See how Lextract extracts 126 structured commercial lease fields from PDFs, including rent, dates, CAM, options, rights, and review notes.',
    summary:
      'Lextract pulls a consistent field set from every commercial lease so teams do not rebuild the same spreadsheet by hand.',
    fastAnswer:
      '126-field lease extraction is for teams that need the same lease data points captured every time: rent, dates, CAM terms, options, rights, restrictions, and review notes in one consistent schema.',
    problem:
      'Commercial lease review breaks down when every abstract uses a different spreadsheet. One reviewer captures renewal notice days, another skips CAM exclusions, and a third leaves rent schedules buried in notes. The portfolio looks organized until someone needs to compare leases under deadline.',
    solution:
      `Lextract extracts ${PRODUCT_FIELD_COUNT} structured fields from each lease PDF. The same schema covers parties, premises, term dates, rent, escalations, CAM language, options, assignment, insurance, default, parking, signage, and unusual provisions that often get missed in manual review.`,
    proof: [
      'The output uses the same field names across every lease.',
      'Each field is grouped by category so reviewers can scan the abstract quickly.',
      'Exports keep the structure intact for Excel, Word, and PDF handoff.',
    ],
    whatChanges: [
      'Acquisition teams can compare leases side by side instead of merging uneven abstracts.',
      'Asset managers can find critical dates, rent changes, and options without rereading the full lease.',
      'Outside counsel and brokers get a cleaner starting point for negotiation review.',
    ],
    bestFor: [
      'Portfolio acquisitions',
      'Lease administration cleanup',
      'Renewal and option reviews',
      'Client-facing lease summaries',
    ],
    faqs: [
      {
        question: 'What does 126-field lease extraction include?',
        answer:
          'It includes parties, premises, dates, rent, escalations, CAM and operating expense terms, options, tenant improvements, insurance, assignment, default, signage, parking, utilities, restrictions, and notes for provisions that need review.',
      },
      {
        question: 'Can the field set support portfolio comparison?',
        answer:
          'Yes. Lextract uses a consistent schema across leases, which makes the output easier to compare across tenants, properties, and acquisitions.',
      },
      {
        question: 'Does every extracted field need review?',
        answer:
          'No. Confidence scoring helps reviewers decide where to spend time. High confidence fields can be scanned quickly, while lower confidence fields deserve closer review against the PDF.',
      },
    ],
    internalLinks: [
      ...baseInternalLinks,
      { label: 'Browse extracted fields', href: '/fields' },
      { label: 'Lease PDF to Excel guide', href: '/resources/articles/lease-pdf-to-excel-guide' },
    ],
    relatedFeatureSlugs: [
      'pdf-native-ai-extraction',
      'confidence-scoring',
      'reviewable-results',
      'excel-word-pdf-exports',
    ],
  },
  {
    slug: 'pdf-native-ai-extraction',
    name: 'PDF-native AI extraction',
    shortName: 'PDF-native AI',
    eyebrow: 'Reads real lease files',
    metaTitle: 'PDF-Native AI Lease Extraction Feature | Lextract',
    metaDescription:
      'Lextract reads native and scanned commercial lease PDFs, preserving lease structure for better abstraction, review, and export workflows.',
    summary:
      'Lease PDFs are messy. Lextract reads the document as a lease file, not as loose pasted text.',
    fastAnswer:
      'PDF-native AI extraction helps when leases arrive as scans, amendment packets, exhibits, or signature copies and the reviewer needs layout context preserved before abstraction starts.',
    problem:
      'Commercial leases arrive as scans, amendment packages, signature copies, and long PDFs with tables, exhibits, and odd formatting. Plain text extraction can flatten those cues, which makes dates, rent schedules, and clause boundaries harder to trust.',
    solution:
      `Lextract uses PDF-native AI extraction built for real commercial lease files. It reads native and scanned PDFs, keeps useful layout context, and turns the document into structured lease data in ${PROCESSING_TIME.comparison}.`,
    proof: [
      'The workflow supports scanned and native PDFs.',
      'Tables, labels, and clause groupings are treated as useful context.',
      'Reviewers see structured output instead of a loose summary.',
    ],
    whatChanges: [
      'Teams can upload the lease files they already have.',
      'Reviewers spend less time repairing OCR output before abstraction starts.',
      'Amendments and exhibits can be checked against the same extraction workflow.',
    ],
    bestFor: [
      'Scanned leases',
      'Long amendment packages',
      'Legacy lease files',
      'Mixed portfolio documents',
    ],
    faqs: [
      {
        question: 'Does Lextract support scanned PDFs?',
        answer:
          'Yes. Lextract supports scanned and native commercial lease PDFs. Very poor scans still need review, but the workflow is built for common lease file quality.',
      },
      {
        question: 'Why does PDF-native extraction matter?',
        answer:
          'Lease meaning often depends on tables, headings, exhibits, and clause boundaries. PDF-native extraction keeps more of that context than copy-paste text workflows.',
      },
      {
        question: 'Can Lextract handle amendments?',
        answer:
          'Yes. Lextract can process lease files with amendments, but reviewers should confirm amendment order and superseded terms in the final abstract.',
      },
    ],
    internalLinks: [
      ...baseInternalLinks,
      { label: 'Lease extraction software', href: '/lease-extraction-software' },
      { label: 'How to extract data from a lease PDF', href: '/resources/articles/how-to-extract-data-from-lease-pdf' },
    ],
    relatedFeatureSlugs: [
      '126-field-lease-extraction',
      'multi-pass-validation',
      'confidence-scoring',
      'reviewable-results',
    ],
  },
  {
    slug: 'multi-pass-validation',
    name: 'Multi-pass validation',
    shortName: 'Validation',
    eyebrow: 'Built for review',
    metaTitle: 'Multi-Pass Lease Extraction Validation Feature | Lextract',
    metaDescription:
      'Lextract validates lease extraction output across multiple passes so reviewers can catch uncertain fields, contradictions, and risky lease terms faster.',
    summary:
      'The extraction does not stop at first draft. Lextract checks the output before it reaches the reviewer.',
    fastAnswer:
      'Multi-pass validation is for leases where a polished first draft is not enough, especially when amendments, rent tables, notice language, or CAM provisions can contradict each other.',
    problem:
      'A lease abstract can look polished and still be wrong. The risk is highest when rent schedules conflict with amendments, option windows depend on notice language, or CAM provisions spread across several sections.',
    solution:
      'Lextract validates extracted lease data across multiple passes. The system checks the draft against the document, looks for contradictions, and gives the reviewer a cleaner set of fields to inspect instead of treating the first answer as final.',
    proof: [
      'Validation is part of the extraction workflow, not a separate manual step.',
      'The review screen pairs fields with confidence signals.',
      'Red flag checks run alongside field extraction.',
    ],
    whatChanges: [
      'Reviewers get a better first draft of the abstract.',
      'Uncertain terms are easier to spot before export.',
      'Teams can standardize review without forcing everyone into the same spreadsheet habits.',
    ],
    bestFor: [
      'Complex leases',
      'Amended documents',
      'Diligence review',
      'Quality control before export',
    ],
    faqs: [
      {
        question: 'What is multi-pass validation in lease extraction?',
        answer:
          'It means Lextract checks extraction output more than once before presenting it for review. The goal is to catch uncertainty, contradictions, and fields that need closer inspection.',
      },
      {
        question: 'Does validation replace legal review?',
        answer:
          'No. Lextract produces reviewable lease data. Attorneys, asset managers, brokers, and lease administrators should still review important terms against the original PDF.',
      },
      {
        question: 'Which fields benefit most from validation?',
        answer:
          'Rent schedules, renewal notices, CAM caps, exclusions, assignment rights, termination rights, and amendment-driven provisions benefit the most because they often depend on language in multiple parts of the lease.',
      },
    ],
    internalLinks: [
      ...baseInternalLinks,
      { label: 'AI lease abstraction', href: '/ai-lease-abstraction' },
      { label: 'AI accuracy benchmarks', href: '/resources/articles/ai-lease-abstraction-accuracy-benchmarks' },
    ],
    relatedFeatureSlugs: [
      'pdf-native-ai-extraction',
      'confidence-scoring',
      'red-flag-detection',
      'reviewable-results',
    ],
  },
  {
    slug: 'confidence-scoring',
    name: 'Confidence scoring',
    shortName: 'Confidence',
    eyebrow: 'Know what to review',
    metaTitle: 'Lease Extraction Confidence Scoring Feature | Lextract',
    metaDescription:
      'Lextract adds field-level confidence scores to commercial lease abstracts so reviewers know which terms need a closer look.',
    summary:
      'Confidence scoring turns review into triage. The team can see which fields deserve attention first.',
    fastAnswer:
      'Confidence scoring helps reviewers decide where to spend time by separating stronger extracted fields from terms that deserve closer review against the original PDF.',
    problem:
      'Without confidence scoring, every extracted lease field looks equally certain. Reviewers either recheck everything, which wastes time, or trust the output too quickly, which creates risk.',
    solution:
      'Lextract adds confidence scoring to individual extracted fields. Reviewers can scan high confidence terms quickly and slow down on lower confidence fields, exceptions, and provisions that need human judgment.',
    proof: [
      'Confidence appears beside extracted fields in the review workflow.',
      'Lower confidence results are easier to identify before export.',
      'Confidence works with red flag checks, not instead of them.',
    ],
    whatChanges: [
      'Review time moves toward the fields that actually need attention.',
      'Managers can inspect output quality without reading every page first.',
      'Teams get a practical quality signal for each lease abstract.',
    ],
    bestFor: [
      'Reviewer triage',
      'Quality control',
      'High volume lease review',
      'Attorney and broker workflows',
    ],
    faqs: [
      {
        question: 'What is field-level confidence scoring?',
        answer:
          'It is a quality signal attached to individual extracted fields. It helps reviewers decide which fields to accept quickly and which fields to check against the PDF.',
      },
      {
        question: 'Does high confidence mean no review is needed?',
        answer:
          'No. High confidence means the field is stronger, not that review should disappear. Important deal terms should still be checked before decisions are made.',
      },
      {
        question: 'How does confidence scoring help lease teams?',
        answer:
          'It helps teams spend review time on uncertain fields, complex clauses, and red flags instead of treating every extracted field the same way.',
      },
    ],
    internalLinks: [
      ...baseInternalLinks,
      { label: 'Accuracy benchmarks', href: '/resources/articles/ai-lease-abstraction-accuracy-benchmarks' },
      { label: 'Manual vs AI abstraction', href: '/resources/articles/lease-abstraction-services-vs-ai-software' },
    ],
    relatedFeatureSlugs: [
      '126-field-lease-extraction',
      'multi-pass-validation',
      'red-flag-detection',
      'reviewable-results',
    ],
  },
  {
    slug: 'red-flag-detection',
    name: 'Red flag detection',
    shortName: 'Red flags',
    eyebrow: 'Risk terms surfaced',
    metaTitle: 'Commercial Lease Red Flag Detection Feature | Lextract',
    metaDescription:
      'Lextract checks commercial lease abstractions for red flags such as missing audit rights, uncapped CAM, aggressive holdover, and risky option language.',
    summary:
      'Red flag detection helps reviewers find lease terms that can change economics, deadlines, and tenant risk.',
    fastAnswer:
      'Red flag detection points lease teams toward provisions that can change the deal, such as uncapped CAM, missing audit rights, aggressive holdover rates, and risky guarantee language.',
    problem:
      'Risky lease language often hides in ordinary sections. A missing audit right, uncapped CAM clause, personal guarantee, or aggressive holdover rate can matter more than the headline rent number.',
    solution:
      `Lextract checks each abstraction against ${PRODUCT_RED_FLAG_COUNT} automated red flag rules. The result points reviewers toward provisions that deserve attention before the abstract is exported or shared.`,
    proof: [
      'Red flags are shown with the extracted result.',
      'Checks focus on commercial lease risks, not generic document warnings.',
      'The red flag library connects to supporting explanation pages.',
    ],
    whatChanges: [
      'Tenant reps can spot negotiation issues sooner.',
      'Asset managers can review risk across a portfolio with less rereading.',
      'Diligence teams can separate ordinary lease data from deal-sensitive exceptions.',
    ],
    bestFor: [
      'Tenant lease review',
      'CAM exposure checks',
      'Acquisition diligence',
      'Renewal negotiation prep',
    ],
    faqs: [
      {
        question: 'What red flags does Lextract detect?',
        answer:
          'Lextract detects commercial lease risks such as no CAM cap, missing audit rights, aggressive holdover rates, missing force majeure language, missing CAM exclusions, and other terms that should trigger review.',
      },
      {
        question: 'Can red flag detection replace attorney review?',
        answer:
          'No. It helps prioritize review. Legal and business teams should still evaluate flagged provisions in context.',
      },
      {
        question: 'Are red flags included in exports?',
        answer:
          'Yes. Red flag findings appear with the reviewed abstraction so teams can preserve them in handoff materials.',
      },
    ],
    internalLinks: [
      ...baseInternalLinks,
      { label: 'Browse red flags', href: '/red-flags' },
      { label: 'No CAM cap red flag', href: '/red-flags/no-cam-cap' },
    ],
    relatedFeatureSlugs: [
      'confidence-scoring',
      'multi-pass-validation',
      '126-field-lease-extraction',
      'reviewable-results',
    ],
  },
  {
    slug: 'reviewable-results',
    name: 'Reviewable results',
    shortName: 'Review',
    eyebrow: 'Human review stays in control',
    metaTitle: 'Reviewable Lease Abstraction Results Feature | Lextract',
    metaDescription:
      'Lextract gives teams reviewable lease abstraction results with structured fields, confidence signals, red flags, and export-ready outputs.',
    summary:
      'Lextract is designed for reviewer judgment. The output is structured so a human can inspect it fast.',
    fastAnswer:
      'Reviewable results give teams a structured lease abstract with categories, confidence scores, and red flags so a human can verify important terms before export.',
    problem:
      'A summary is not enough for lease operations. Teams need to verify exact dates, amounts, notice periods, and clause references before using the data for diligence, accounting, or negotiations.',
    solution:
      'Lextract presents structured fields, confidence scores, red flags, and export options in a review workflow. The reviewer can inspect the lease abstract before using it in reports, imports, or client materials.',
    proof: [
      'Fields are grouped by lease category.',
      'Confidence scores and red flags appear near the extracted data.',
      'The same reviewed result can be exported in several formats.',
    ],
    whatChanges: [
      'Teams get a usable review surface instead of a pasted AI answer.',
      'Important fields can be checked before they enter a system of record.',
      'The final export reflects reviewed structured data.',
    ],
    bestFor: [
      'Lease administration teams',
      'Attorney review',
      'Broker summaries',
      'Asset management handoff',
    ],
    faqs: [
      {
        question: 'What makes Lextract results reviewable?',
        answer:
          'The result is organized as fields, categories, confidence scores, and red flags. That structure makes it easier to inspect than a long narrative summary.',
      },
      {
        question: 'Can reviewers edit extracted fields?',
        answer:
          'Yes. Lextract is built around review and correction before export so teams can preserve judgment where it matters.',
      },
      {
        question: 'Who should review the result?',
        answer:
          'The reviewer depends on the workflow. Property managers, asset managers, attorneys, brokers, accountants, and consultants all use lease abstracts for different decisions.',
      },
    ],
    internalLinks: [
      ...baseInternalLinks,
      { label: 'Browse extracted fields', href: '/fields' },
      { label: 'Lease abstract example', href: '/resources/articles/lease-abstract-example' },
    ],
    relatedFeatureSlugs: [
      'confidence-scoring',
      'red-flag-detection',
      'excel-word-pdf-exports',
      '126-field-lease-extraction',
    ],
  },
  {
    slug: 'excel-word-pdf-exports',
    name: 'Excel, Word, and PDF exports',
    shortName: 'Exports',
    eyebrow: 'Handoff formats',
    metaTitle: 'Excel, Word, and PDF Lease Abstract Export Feature | Lextract',
    metaDescription:
      'Lextract exports reviewed lease abstraction results to Excel, Word, and PDF for diligence, client reporting, lease administration, and system handoff.',
    summary:
      'One extraction can become the spreadsheet, report, or review document the next team needs.',
    fastAnswer:
      'Excel, Word, and PDF exports help teams reuse the same reviewed abstraction for spreadsheet analysis, client reports, diligence files, and system handoff.',
    problem:
      'Lease data often gets trapped in the first format someone creates. A paralegal abstract may not fit Excel, a spreadsheet may not read well for a client, and a PDF summary may not import cleanly into another workflow.',
    solution:
      'Lextract exports reviewed results to Excel, Word, and PDF. Teams can use the same structured abstraction for analysis, client review, diligence files, and downstream handoff without rebuilding it.',
    proof: [
      'Excel exports support spreadsheet review and import prep.',
      'Word exports support narrative review packages.',
      'PDF exports support shareable reports.',
    ],
    whatChanges: [
      'Diligence teams can move from review to spreadsheet analysis faster.',
      'Brokers and attorneys can share cleaner client materials.',
      'Property teams can prepare system handoff without rekeying the lease.',
    ],
    bestFor: [
      'Excel analysis',
      'Word abstracts',
      'PDF reports',
      'Yardi, MRI, and system import prep',
    ],
    faqs: [
      {
        question: 'What export formats does Lextract support?',
        answer:
          'Lextract supports Excel, Word, and PDF exports for reviewed lease abstraction results.',
      },
      {
        question: 'Can I use the Excel export for system import prep?',
        answer:
          'Yes. Teams use the Excel export as a structured handoff format before importing data into lease administration, accounting, or property management workflows.',
      },
      {
        question: 'Do exports include red flags and confidence scores?',
        answer:
          'Exports are designed to preserve the reviewed abstraction, including the context teams need for quality control and handoff.',
      },
    ],
    internalLinks: [
      ...baseInternalLinks,
      { label: 'Lease PDF to Excel', href: '/resources/articles/best-way-convert-lease-pdf-excel' },
      { label: 'Yardi import workflow', href: '/workflows/pdf-to-yardi' },
    ],
    relatedFeatureSlugs: [
      '126-field-lease-extraction',
      'reviewable-results',
      'pay-per-lease-pricing',
      'pdf-native-ai-extraction',
    ],
  },
  {
    slug: 'pay-per-lease-pricing',
    name: 'Pay-per-lease pricing',
    shortName: 'Pricing',
    eyebrow: 'No subscription required',
    metaTitle: 'Pay-Per-Lease Pricing Feature | Lextract',
    metaDescription:
      'Lextract costs $15 per commercial lease extraction with no subscription, no setup fee, and credits that do not expire.',
    summary:
      'Lextract gives teams lease abstraction capacity without an annual software contract.',
    fastAnswer:
      'Pay-per-lease pricing fits bursty lease work: one lease review, a diligence push, or a backlog cleanup without buying an annual platform contract.',
    problem:
      'Many CRE teams need abstraction in bursts. A portfolio acquisition, backlog cleanup, renewal push, or tenant review may require fast output without a long software purchase or BPO engagement.',
    solution:
      `Lextract starts at ${PRICING.single.label.toLowerCase()} for ${formatPrice(PRICING.single.price)}. Teams can buy one extraction or discounted packs, use credits when lease work appears, and avoid a subscription when they only need the abstraction step.`,
    proof: [
      `${formatPrice(PRICING.single.price)} for one lease extraction.`,
      `${formatPrice(PRICING.pack5.price)} for ${PRICING.pack5.credits} leases.`,
      `${formatPrice(PRICING.pack10.price)} for ${PRICING.pack10.credits} leases.`,
    ],
    whatChanges: [
      'Small teams can process a lease without procurement.',
      'Deal teams can scale abstraction during diligence spikes.',
      'Consultants can price lease review work with cleaner unit economics.',
    ],
    bestFor: [
      'One-off lease review',
      'Portfolio bursts',
      'Backlog cleanup',
      'Teams avoiding annual contracts',
    ],
    faqs: [
      {
        question: 'How much does Lextract cost?',
        answer:
          'A single lease extraction costs $15. Lextract also offers discounted 5-pack and 10-pack credit bundles.',
      },
      {
        question: 'Do I need a subscription?',
        answer:
          'No. Lextract is pay per lease. You can buy credits when you need them, and credits do not expire.',
      },
      {
        question: 'What is included in the price?',
        answer:
          'Each extraction includes structured lease fields, confidence scoring, red flag checks, reviewable results, and export options.',
      },
    ],
    internalLinks: [
      ...baseInternalLinks,
      { label: 'Lease abstraction services', href: '/lease-abstraction-services' },
      { label: 'Cost comparison guide', href: '/resources/articles/how-much-does-lease-abstraction-cost' },
    ],
    relatedFeatureSlugs: [
      'excel-word-pdf-exports',
      '126-field-lease-extraction',
      'reviewable-results',
      'red-flag-detection',
    ],
  },
]

export function getFeatureBySlug(slug: string): ProductFeature | undefined {
  return PRODUCT_FEATURES.find((feature) => feature.slug === slug)
}

export function getAllFeatureSlugs(): string[] {
  return PRODUCT_FEATURES.map((feature) => feature.slug)
}

export function getRelatedFeatures(feature: ProductFeature): ProductFeature[] {
  return feature.relatedFeatureSlugs
    .map((slug) => getFeatureBySlug(slug))
    .filter((candidate): candidate is ProductFeature => candidate !== undefined)
}
