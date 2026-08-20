import { PUBLIC_KNOWLEDGE } from '@/data/public-knowledge'

export const HELP_CONTENT = {
  freePreview:
    'You can see a real preview before you pay. We show key lease terms, field counts, confidence, and whether risk flags were found.',
  payment: `${PUBLIC_KNOWLEDGE.app.payment.singleUnlock} ${PUBLIC_KNOWLEDGE.app.payment.noSubscription}`,
  security:
    'Your lease is encrypted in transit and at rest. Files are stored privately and handled according to the retention policy.',
  validPdf: PUBLIC_KNOWLEDGE.app.upload.guidance,
  firstRun: PUBLIC_KNOWLEDGE.app.accountSupport.firstRun,
  confidenceScore: PUBLIC_KNOWLEDGE.app.results.confidenceHelp,
  redFlags: PUBLIC_KNOWLEDGE.app.results.redFlagsHelp,
  sourceText: PUBLIC_KNOWLEDGE.app.results.sourceTextHelp,
  fieldEdit: PUBLIC_KNOWLEDGE.app.results.fieldEditHelp,
  exportFormat:
    'Choose the file type you want to download. Word is best for sharing, Excel is best for data work, and PDF is best for a read-only report.',
  exportTemplate:
    'Templates adjust the report emphasis for the property type. If you are not sure, use Commercial.',
  searchFields:
    'Search by field name, such as rent, renewal, CAM, insurance, or deposit.',
  expandFields:
    'Expand all categories when you want to scan the whole lease abstract. Collapse them when you only need the summary.',
} as const

export type HelpContentKey = keyof typeof HELP_CONTENT
