export interface PublicKnowledge {
  version: number
  updatedAt: string
  marketing: MarketingKnowledge
  app: AppKnowledge
  emails: EmailsKnowledge
}

export interface MarketingKnowledge {
  product: {
    name: string
    category: string
    oneLine: string
    fieldCount: number
    redFlagCount: number
    categoryCount: number
    confidenceScoring: boolean
    exports: string[]
    disclaimers: string[]
  }
  pricing: {
    single: PricingOffer
    pack5: PricingOffer
    pack10: PricingOffer
    competitorRange: string
    supportPolicy: string
    creditsExpire: boolean
    subscriptionRequired: boolean
  }
  processing: {
    canonicalRange: string
    headline: string
    detailed: string
    vsManual: string
  }
  contacts: {
    founderSales: ContactPoint
    support: ContactPoint
    legal: ContactPoint
    privacy: ContactPoint
  }
  personas: Array<{ id: string; label: string; useCase: string }>
  competitors: Array<{ name: string; positioning: string; comparisonNote: string }>
  faqs: Array<{ slug: string; question: string; shortAnswer: string }>
  leadMagnets: Array<LeadMagnetKnowledge>
  ctas: Array<{ id: string; label: string; href: string; context: string }>
}

export interface PricingOffer {
  price: number
  credits: number
  label: string
  perLease: number
  savings?: string | null
}

export interface ContactPoint {
  email: string
  purpose: string
}

export interface LeadMagnetKnowledge {
  slug: 'lease-abstraction-checklist'
    | 'cam-reconciliation-checklist'
    | 'due-diligence-checklist'
    | 'lease-audit-workbook'
  title: string
  fileFormat: 'PDF' | 'XLSX'
  contentType: string
}

export interface AppKnowledge {
  upload: {
    acceptedFormats: string[]
    maxFileSizeMb: number
    guidance: string
  }
  processing: {
    statusMessages: Record<'uploading' | 'extracting' | 'scoring' | 'complete' | 'failed', string>
    estimates: {
      withPageCountTemplate: string
      fallback: string
    }
  }
  teaser: {
    visibleFieldCount: string
    unlockCta: string
    creditPackCta: string
  }
  payment: {
    singleUnlock: string
    useCredit: string
    noSubscription: string
  }
  results: {
    confidenceHelp: string
    redFlagsHelp: string
    sourceTextHelp: string
    fieldEditHelp: string
  }
  exports: {
    formats: Array<{ id: 'docx' | 'pdf' | 'xlsx'; label: string; bestFor: string }>
    templates: Array<{ id: string; label: string; guidance: string }>
  }
  camaudit: {
    triggerSummary: string
    handoffCta: string
  }
  accountSupport: {
    firstRun: string
    supportGuidance: string
  }
}

export interface EmailsKnowledge {
  senderIdentities: Array<{ id: string; from: string; purpose: string }>
  transactional: Array<{
    id: string
    subjectTemplate: string
    purpose: string
    plainTextSummary: string
    bodyTemplates?: {
      htmlTemplate?: string
      textTemplate?: string
    }
  }>
  footer: {
    unsubscribe: string
    support: string
  }
}

const BANNED_PUBLIC_PATTERNS = [
  /OPENROUTER_API_KEY/i,
  /RESEND_API_KEY/i,
  /STRIPE_SECRET_KEY/i,
  /WEBHOOK_SECRET/i,
  /SERVICE_ROLE/i,
  /SECRET_ACCESS_KEY/i,
  /internal cost/i,
  /COGS/i,
  /model fallback/i,
  /raw response/i,
  /r2ObjectKey/i,
  /localAssetPath/i,
  /minimumBytes/i,
  /minimumPages/i,
  /minimumSheets/i,
  /api[_-]?key/i,
  /secret/i,
  /token/i,
  /password/i,
  /dsn/i,
  /postgres/i,
  /redis/i,
  /supabase/i,
  /railway/i,
  /vercel/i,
  /cloudflare/i,
  /bucket/i,
  /localhost/i,
  /127\.0\.0\.1/i,
  /C:\\Users\\/i,
] as const

export function validatePublicKnowledge(knowledge: PublicKnowledge): string[] {
  const errors: string[] = []

  if (knowledge.marketing.product.fieldCount !== 126) {
    errors.push('marketing.product.fieldCount must be 126')
  }
  if (knowledge.marketing.product.redFlagCount !== 20) {
    errors.push('marketing.product.redFlagCount must be 20')
  }
  if (knowledge.marketing.pricing.single.price !== 15) {
    errors.push('marketing.pricing.single.price must be 15')
  }
  if (knowledge.marketing.pricing.pack5.price !== 65) {
    errors.push('marketing.pricing.pack5.price must be 65')
  }
  if (knowledge.marketing.pricing.pack10.price !== 120) {
    errors.push('marketing.pricing.pack10.price must be 120')
  }
  if (knowledge.marketing.contacts.founderSales.email !== 'angel.campa@lextract.io') {
    errors.push('founder/sales contact must be angel.campa@lextract.io')
  }

  const requiredTransactional = [
    'extraction-complete',
    'cam-flags-found',
    'guest-account-setup',
    'anonymous-notification',
    'lead-magnet-delivery',
  ]
  const transactionalIds = new Set(knowledge.emails.transactional.map((email) => email.id))
  for (const id of requiredTransactional) {
    if (!transactionalIds.has(id)) {
      errors.push(`missing transactional email: ${id}`)
    }
  }

  const emailById = new Map(knowledge.emails.transactional.map((email) => [email.id, email]))
  const anonymousTemplates = emailById.get('anonymous-notification')?.bodyTemplates
  if (!anonymousTemplates?.htmlTemplate || !anonymousTemplates.textTemplate) {
    errors.push('anonymous-notification must define html and text body templates')
  }
  const deliveryTemplates = emailById.get('lead-magnet-delivery')?.bodyTemplates
  if (!deliveryTemplates?.htmlTemplate) {
    errors.push('lead-magnet-delivery must define an html body template')
  }
  const serialized = JSON.stringify(knowledge)
  for (const pattern of BANNED_PUBLIC_PATTERNS) {
    if (pattern.test(serialized)) {
      errors.push(`public knowledge contains banned private pattern: ${pattern.source}`)
    }
  }

  return errors
}
