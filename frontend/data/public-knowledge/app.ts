import type { AppKnowledge } from './schema'

export const APP_KNOWLEDGE: AppKnowledge = {
  upload: {
    acceptedFormats: ['PDF'],
    maxFileSizeMb: 50,
    guidance:
      'Upload the signed commercial lease PDF if you have it. Amendments, exhibits, and scanned PDFs are okay as long as they are in one PDF under 50 MB.',
  },
  processing: {
    statusMessages: {
      uploading: 'Uploading document...',
      extracting: 'Extracting lease terms...',
      scoring: 'Scoring confidence...',
      complete: 'Complete!',
      failed: 'Extraction failed. Please try again or contact support.',
    },
    estimates: {
      withPageCountTemplate:
        'Reading {pages} pages of your lease document. This typically takes 5-15 minutes.',
      fallback:
        'Reading the lease document. This typically takes 5-15 minutes depending on document length.',
    },
  },
  teaser: {
    visibleFieldCount: '3-5 sample extracted fields',
    unlockCta: 'Unlock full extraction for $15',
    creditPackCta: 'Buy 5 credits for $65',
  },
  payment: {
    singleUnlock:
      'Payment unlocks the complete report for this lease: all extracted fields, red flag details, source text, editing, PDF review, and exports.',
    useCredit: 'Unlock with 1 credit',
    noSubscription: 'It is not a subscription.',
  },
  results: {
    confidenceHelp:
      'This shows how sure Lextract is about an answer. High is usually clear, medium deserves a quick review, and low should be checked against the lease.',
    redFlagsHelp:
      'Red flags are lease terms worth reviewing before you rely on the report. They are not legal advice, but they point you to areas that may need attention.',
    sourceTextHelp:
      'Source text is the exact lease language Lextract used for this field. Use it when you want to verify an answer quickly.',
    fieldEditHelp:
      'Click a field value to correct it. Lextract keeps the original AI value and updates red flags after your edit.',
  },
  exports: {
    formats: [
      {
        id: 'docx',
        label: 'Word',
        bestFor: 'Sharing an editable lease abstract.',
      },
      {
        id: 'pdf',
        label: 'PDF',
        bestFor: 'Sharing a read-only report.',
      },
      {
        id: 'xlsx',
        label: 'Excel',
        bestFor: 'Data work, imports, and portfolio analysis.',
      },
    ],
    templates: [
      {
        id: 'commercial',
        label: 'Commercial',
        guidance: 'Use this default when you are not sure which property-specific template fits.',
      },
      {
        id: 'office',
        label: 'Office',
        guidance: 'Emphasizes rent, base year stops, TI allowance, and parking.',
      },
      {
        id: 'industrial',
        label: 'Industrial',
        guidance: 'Emphasizes utilities, clear height, loading, power, and parking.',
      },
      {
        id: 'retail',
        label: 'Retail',
        guidance: 'Emphasizes percentage rent, exclusivity, co-tenancy, and signage.',
      },
    ],
  },
  camaudit: {
    triggerSummary:
      'The CamAudit handoff appears when audit rights, CAM-sensitive red flags, NNN or modified gross structure, or low-confidence CAM fields indicate audit relevance.',
    handoffCta: 'Run a tenant audit handoff',
  },
  accountSupport: {
    firstRun:
      'After upload, Lextract reads the lease, shows a free preview, then lets you unlock the full report and export it.',
    supportGuidance: 'For product help, contact angel.campa@lextract.io.',
  },
}
