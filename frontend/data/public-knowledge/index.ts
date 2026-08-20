import { APP_KNOWLEDGE } from './app'
import { EMAILS_KNOWLEDGE } from './emails'
import { MARKETING_KNOWLEDGE } from './marketing'
import type { PublicKnowledge } from './schema'

export type {
  AppKnowledge,
  ContactPoint,
  EmailsKnowledge,
  LeadMagnetKnowledge,
  MarketingKnowledge,
  PricingOffer,
  PublicKnowledge,
} from './schema'
export { validatePublicKnowledge } from './schema'

export const PUBLIC_KNOWLEDGE: PublicKnowledge = {
  version: 1,
  updatedAt: '2026-05-09',
  marketing: MARKETING_KNOWLEDGE,
  app: APP_KNOWLEDGE,
  emails: EMAILS_KNOWLEDGE,
}
