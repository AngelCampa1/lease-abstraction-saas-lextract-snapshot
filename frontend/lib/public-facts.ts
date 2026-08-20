import { PUBLIC_KNOWLEDGE } from '@/data/public-knowledge'
import type { ContactPoint, LeadMagnetKnowledge } from '@/data/public-knowledge'
import { formatPrice } from '@/lib/pricing'

type ContactKey = keyof typeof PUBLIC_KNOWLEDGE.marketing.contacts

interface PublicPricingOffer {
  price: number
  credits: number
  perLease: number
}

export function formatPublicPricingOffer(offer: PublicPricingOffer): string {
  if (offer.credits === 1) {
    return `${formatPrice(offer.price)} per lease`
  }
  return `${formatPrice(offer.price)} for ${offer.credits} credits (${formatPrice(
    offer.perLease,
  )} each)`
}

export function getProductFacts() {
  return PUBLIC_KNOWLEDGE.marketing.product
}

export function getPricingFacts() {
  const { single, pack5, pack10 } = PUBLIC_KNOWLEDGE.marketing.pricing
  return {
    single: { ...single, display: formatPublicPricingOffer(single) },
    pack5: { ...pack5, display: formatPublicPricingOffer(pack5) },
    pack10: { ...pack10, display: formatPublicPricingOffer(pack10) },
    competitorRange: PUBLIC_KNOWLEDGE.marketing.pricing.competitorRange,
    supportPolicy: PUBLIC_KNOWLEDGE.marketing.pricing.supportPolicy,
    creditsExpire: PUBLIC_KNOWLEDGE.marketing.pricing.creditsExpire,
    subscriptionRequired: PUBLIC_KNOWLEDGE.marketing.pricing.subscriptionRequired,
  }
}

export function getProcessingFacts() {
  return {
    range: PUBLIC_KNOWLEDGE.marketing.processing.canonicalRange,
    headline: PUBLIC_KNOWLEDGE.marketing.processing.headline,
    detailed: PUBLIC_KNOWLEDGE.marketing.processing.detailed,
    vsManual: PUBLIC_KNOWLEDGE.marketing.processing.vsManual,
  }
}

export function getContact(contact: ContactKey): ContactPoint {
  return PUBLIC_KNOWLEDGE.marketing.contacts[contact]
}

export function getContactEmail(contact: ContactKey): string {
  return getContact(contact).email
}

export function getLeadMagnetPublicFacts(
  slug: LeadMagnetKnowledge['slug'],
): LeadMagnetKnowledge {
  const magnet = PUBLIC_KNOWLEDGE.marketing.leadMagnets.find(
    (candidate) => candidate.slug === slug,
  )
  if (!magnet) {
    throw new Error(`Unknown public lead magnet: ${slug}`)
  }
  return magnet
}
