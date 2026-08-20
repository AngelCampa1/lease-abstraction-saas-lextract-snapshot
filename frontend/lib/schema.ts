import { SITE_URL } from '@/lib/site-config'
import { formatPrice, PRICING } from '@/lib/pricing'
import { PRODUCT_FIELD_COUNT } from '@/lib/product-facts'
import type { FaqItem } from '@/lib/content-types'
import { BRAND_ASSETS, getAbsoluteBrandAssetUrl } from '@/lib/brand'

// ─── Type Interfaces ────────────────────────────────────────────────

export interface OrganizationSchema {
  '@context': string
  '@type': 'Organization'
  name: string
  url: string
  description: string
  logo: string
  foundingDate: string
  sameAs: string[]
  contactPoint: {
    '@type': 'ContactPoint'
    contactType: string
    email: string
  }
}

export interface ProductSchema {
  '@context': string
  '@type': 'Product'
  name: string
  description: string
  url: string
  image: string
  brand: { '@type': 'Organization'; name: string; url: string }
  offers: {
    '@type': 'AggregateOffer'
    lowPrice: string
    highPrice: string
    priceCurrency: string
    offerCount: number
    offers: Array<{
      '@type': 'Offer'
      name: string
      price: string
      priceCurrency: string
      availability: string
      description: string
    }>
  }
}

export interface WebApplicationSchema {
  '@context': string
  '@type': 'WebApplication'
  name: string
  description: string
  url: string
  applicationCategory: string
  operatingSystem: string
  offers: {
    '@type': 'Offer'
    price: string
    priceCurrency: string
    description: string
  }
}

export interface FAQPageSchema {
  '@context': string
  '@type': 'FAQPage'
  mainEntity: Array<{
    '@type': 'Question'
    name: string
    acceptedAnswer: {
      '@type': 'Answer'
      text: string
    }
  }>
}

export interface HowToSchema {
  '@context': string
  '@type': 'HowTo'
  name: string
  step: Array<{
    '@type': 'HowToStep'
    name: string
    text: string
  }>
}

export interface ArticleSchema {
  '@context': string
  '@type': 'Article'
  headline: string
  description: string
  url: string
  datePublished: string
  dateModified: string
  author: { '@type': 'Person'; name: string; url?: string; jobTitle: string }
  publisher: { '@type': 'Organization'; name: string; url: string }
  mainEntityOfPage: { '@type': 'WebPage'; '@id': string }
  image: string
}

export interface BreadcrumbSchema {
  '@context': string
  '@type': 'BreadcrumbList'
  itemListElement: Array<{
    '@type': 'ListItem'
    position: number
    name: string
    item: string
  }>
}

export interface DefinedTermSetSchema {
  '@context': string
  '@type': 'DefinedTermSet'
  name: string
  description: string
  definedTerm: Array<{
    '@type': 'DefinedTerm'
    name: string
    description: string
  }>
}

export interface DefinedTermSchema {
  '@context': string
  '@type': 'DefinedTerm'
  name: string
  description: string
  url: string
  inDefinedTermSet: {
    '@type': 'DefinedTermSet'
    name: string
    url: string
  }
}

// ─── Builder Functions ──────────────────────────────────────────────

// Add new sameAs URLs here as profiles are claimed (G2, Capterra, YouTube, company LinkedIn, etc.)
const LEXTRACT_SAME_AS: string[] = [
  'https://www.linkedin.com/in/angelcampa1/',
  'https://camaudit.io',
]

export function buildOrganizationSchema(): OrganizationSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Lextract',
    url: SITE_URL,
    description:
      `AI-powered commercial lease abstraction platform. Extract ${PRODUCT_FIELD_COUNT} structured fields from any lease PDF in minutes with confidence scoring and red flag detection.`,
    logo: getAbsoluteBrandAssetUrl(BRAND_ASSETS.logoPng),
    foundingDate: '2026',
    sameAs: LEXTRACT_SAME_AS,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'angel.campa@lextract.io',
    },
  }
}

export function buildProductSchema(): ProductSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Lextract Lease Abstraction',
    description:
      `AI-powered commercial lease abstraction. Upload any lease PDF and get ${PRODUCT_FIELD_COUNT} structured fields extracted in minutes with confidence scoring and red flag detection.`,
    url: SITE_URL,
    image: getAbsoluteBrandAssetUrl(BRAND_ASSETS.ogImagePng),
    brand: { '@type': 'Organization', name: 'Lextract', url: SITE_URL },
    offers: (() => {
      const offerList = [
        {
          '@type': 'Offer' as const,
          name: 'Single Lease',
          price: String(PRICING.single.price),
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          description: `${formatPrice(PRICING.single.price)} per lease. No subscription required. Credits never expire.`,
        },
        {
          '@type': 'Offer' as const,
          name: '5-Pack',
          price: String(PRICING.pack5.price),
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          description: `5 lease extractions for ${formatPrice(PRICING.pack5.price)} (${formatPrice(PRICING.pack5.perLease)} per lease, ${PRICING.pack5.savings}). Credits never expire.`,
        },
        {
          '@type': 'Offer' as const,
          name: '10-Pack',
          price: String(PRICING.pack10.price),
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          description: `10 lease extractions for ${formatPrice(PRICING.pack10.price)} (${formatPrice(PRICING.pack10.perLease)} per lease, ${PRICING.pack10.savings}). Credits never expire.`,
        },
      ]
      return {
        '@type': 'AggregateOffer' as const,
        lowPrice: String(PRICING.single.price),
        highPrice: String(PRICING.pack10.price),
        priceCurrency: 'USD',
        offerCount: offerList.length,
        offers: offerList,
      }
    })(),
  }
}

export function buildWebApplicationSchema(): WebApplicationSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Lextract',
    description:
      `AI-powered commercial lease abstraction. Upload your lease PDF and get ${PRODUCT_FIELD_COUNT} structured fields extracted in minutes with confidence scoring and red flag detection.`,
    url: SITE_URL,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: String(PRICING.single.price),
      priceCurrency: 'USD',
      description: `${formatPrice(PRICING.single.price)} per lease. No subscription required.`,
    },
  }
}

export function buildFAQPageSchema(items: FaqItem[]): FAQPageSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ question, answer }) => ({
      '@type': 'Question' as const,
      name: question,
      acceptedAnswer: {
        '@type': 'Answer' as const,
        text: answer,
      },
    })),
  }
}

export function buildHowToSchema(opts: {
  name: string
  steps: Array<{ name: string; text: string }>
}): HowToSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: opts.name,
    step: opts.steps.map(({ name, text }) => ({
      '@type': 'HowToStep' as const,
      name,
      text,
    })),
  }
}

export function buildArticleSchema(opts: {
  headline: string
  description: string
  url: string
  datePublished: string
  dateModified: string
  author: string
  image?: string
}): ArticleSchema {
  // Strip any role/title suffix from author name for the @type:Person schema field.
  // MDX frontmatter may include 'Angel Campa, Founder'. Split on comma to get name and optional job title.
  const parts = opts.author.split(',')
  const authorName = parts[0].trim()
  const jobTitle = parts[1] !== undefined ? parts[1].trim() : 'Founder'
  const base: ArticleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.headline,
    description: opts.description,
    url: opts.url,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified,
    author: {
      '@type': 'Person',
      name: authorName,
      jobTitle,
      // Link to the author entity page only for known authors with a dedicated profile
      ...(authorName.toLowerCase().includes('angel campa')
        ? { url: `${SITE_URL}/about/angel-campa` }
        : {}),
    },
    publisher: { '@type': 'Organization', name: 'Lextract', url: SITE_URL },
    mainEntityOfPage: { '@type': 'WebPage', '@id': opts.url },
    image: opts.image ?? getAbsoluteBrandAssetUrl(BRAND_ASSETS.ogImagePng),
  }
  return base
}

export function buildBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
): BreadcrumbSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(({ name, url }, index) => ({
      '@type': 'ListItem' as const,
      position: index + 1,
      name,
      item: url,
    })),
  }
}

export function buildDefinedTermSchema(opts: {
  term: string
  definition: string
  slug: string
}): DefinedTermSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: opts.term,
    description: opts.definition,
    url: `${SITE_URL}/glossary/${opts.slug}`,
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      name: 'Commercial Lease Glossary',
      url: `${SITE_URL}/glossary`,
    },
  }
}

export function buildDefinedTermSetSchema(
  terms: Array<{ term: string; definition: string }>
): DefinedTermSetSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: 'Commercial Lease Glossary',
    description: 'Definitions of common commercial real estate lease terms used in lease abstraction',
    definedTerm: terms.map((t) => ({
      '@type': 'DefinedTerm' as const,
      name: t.term,
      description: t.definition,
    })),
  }
}

// ─── CollectionPage Schema ───────────────────────────────────────────

export interface CollectionPageSchema {
  '@context': string
  '@type': 'CollectionPage'
  name: string
  description: string
  url: string
  hasPart: Array<{
    '@type': 'WebPage'
    name: string
    url: string
    description: string
  }>
}

export function buildCollectionPageSchema(opts: {
  name: string
  description: string
  url: string
  parts: Array<{ name: string; url: string; description: string }>
}): CollectionPageSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    hasPart: opts.parts.map(({ name, url, description }) => ({
      '@type': 'WebPage' as const,
      name,
      url,
      description,
    })),
  }
}

// ─── ItemList Schema ─────────────────────────────────────────────────

export interface ItemListSchema {
  '@context': string
  '@type': 'ItemList'
  name: string
  description: string
  numberOfItems: number
  itemListElement: Array<{
    '@type': 'ListItem'
    position: number
    name: string
    url?: string
    description?: string
  }>
}

export function buildItemListSchema(opts: {
  name: string
  description: string
  items: Array<{ name: string; url?: string; description?: string }>
}): ItemListSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: opts.name,
    description: opts.description,
    numberOfItems: opts.items.length,
    itemListElement: opts.items.map(({ name, url, description }, index) => ({
      '@type': 'ListItem' as const,
      position: index + 1,
      name,
      ...(url !== undefined ? { url } : {}),
      ...(description !== undefined ? { description } : {}),
    })),
  }
}

// ─── Person Schema ───────────────────────────────────────────────────

export interface PersonSchema {
  '@context': string
  '@type': 'Person'
  name: string
  jobTitle: string
  url: string
  image?: string
  sameAs: string[]
  worksFor: {
    '@type': 'Organization'
    name: string
    url: string
  }
}

export function buildPersonSchema(opts: {
  name: string
  jobTitle: string
  profileUrl: string
  imageUrl?: string
  linkedInUrl?: string
}): PersonSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: opts.name,
    jobTitle: opts.jobTitle,
    url: opts.profileUrl,
    ...(opts.imageUrl !== undefined ? { image: opts.imageUrl } : {}),
    sameAs: opts.linkedInUrl !== undefined ? [opts.linkedInUrl] : [],
    worksFor: {
      '@type': 'Organization',
      name: 'Lextract',
      url: SITE_URL,
    },
  }
}

// ─── Speakable Schema ────────────────────────────────────────────────
// SpeakableSpecification must be nested as the `speakable` property of a
// WebPage node. It cannot be emitted as a standalone root JSON-LD object.

export interface SpeakableSchema {
  '@context': string
  '@type': 'WebPage'
  '@id': string
  speakable: {
    '@type': 'SpeakableSpecification'
    cssSelector: string[]
  }
}

export function buildSpeakableSchema(pageUrl: string, cssSelectors: string[]): SpeakableSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': pageUrl,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: cssSelectors,
    },
  }
}

// ─── Organization with SearchAction ─────────────────────────────────

export type OrganizationWithSearchActionSchema = OrganizationSchema

export function buildOrganizationWithSearchSchema(): OrganizationWithSearchActionSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Lextract',
    url: SITE_URL,
    description:
      `AI-powered commercial lease abstraction platform. Extract ${PRODUCT_FIELD_COUNT} structured fields from any lease PDF in minutes with confidence scoring and red flag detection.`,
    logo: getAbsoluteBrandAssetUrl(BRAND_ASSETS.logoPng),
    foundingDate: '2026',
    sameAs: LEXTRACT_SAME_AS,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'angel.campa@lextract.io',
    },
  }
}

// ─── Service Schema ──────────────────────────────────────────────────

export interface ServiceSchema {
  '@context': string
  '@type': 'Service'
  name: string
  description: string
  url: string
  serviceType: string
  provider: { '@type': 'Organization'; name: string; url: string }
  offers: {
    '@type': 'Offer'
    price: string
    priceCurrency: string
    description: string
  }
}

export function buildServiceSchema(opts: {
  name: string
  description: string
  url: string
  serviceType: string
}): ServiceSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    serviceType: opts.serviceType,
    provider: { '@type': 'Organization', name: 'Lextract', url: SITE_URL },
    offers: {
      '@type': 'Offer',
      price: String(PRICING.single.price),
      priceCurrency: 'USD',
      description: `AI-powered lease abstraction at ${formatPrice(PRICING.single.price)} per lease. No subscription required.`,
    },
  }
}
