import publicKnowledge from './public-knowledge.generated.json'

const SITE_URL = 'https://lextract.io'

export const CANONICAL_SITE_URL = SITE_URL
export const CANONICAL_BRAND_LOGO_URL = `${SITE_URL}/brand/lextract-email-logo.png`
export const NON_MAGNET_EVENT_SLUGS = ['checklist', 'nnn-calculator', 'sample-report']

export function getSenderFallback(): string {
  const founder = publicKnowledge.emails.senderIdentities.filter(
    (identity) => identity.id === 'founder',
  )[0]
  if (!founder) {
    throw new Error('Missing founder sender identity in public knowledge.')
  }
  return founder.from
}

export function getValidMagnetSlugs(): string[] {
  return publicKnowledge.marketing.leadMagnets
    .map((magnet) => magnet.slug)
    .concat(NON_MAGNET_EVENT_SLUGS)
}

export function getLeadMagnetDeliverySubject(magnetSlug: string): string {
  const magnet = publicKnowledge.marketing.leadMagnets.filter(
    (candidate) => candidate.slug === magnetSlug,
  )[0]
  const email = publicKnowledge.emails.transactional.filter(
    (candidate) => candidate.id === 'lead-magnet-delivery',
  )[0]
  const subjectTemplate = email?.subjectTemplate
  if (!magnet || typeof subjectTemplate !== 'string') {
    throw new Error(`Missing lead magnet delivery subject for ${magnetSlug}.`)
  }
  return renderTemplateString(subjectTemplate, { magnet_name: magnet.title })
}

export function getEmailFooterCopy(): { unsubscribe: string; support: string } {
  return publicKnowledge.emails.footer
}

export function getProductOneLine(): string {
  return publicKnowledge.marketing.product.oneLine
}

function renderTemplateString(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (rendered, [key, value]) => rendered.replaceAll(`{${key}}`, value),
    template,
  )
}

export function renderTransactionalBodyTemplate(
  emailId: string,
  templateKey: 'htmlTemplate' | 'textTemplate',
  values: Record<string, string>,
): string {
  const email = publicKnowledge.emails.transactional.filter(
    (candidate) => candidate.id === emailId,
  )[0]
  const template = email?.bodyTemplates?.[templateKey]
  if (!template) {
    throw new Error(`Missing ${templateKey} body template for ${emailId}.`)
  }
  return renderTemplateString(template, values)
}
