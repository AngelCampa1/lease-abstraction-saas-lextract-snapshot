export type SeoCollection =
  | 'fields'
  | 'glossary'
  | 'clauses'
  | 'red-flags'
  | 'lease-types'
  | 'industries'
  | 'locations'
  | 'integrations'

export type ContentCollection = 'articles' | 'guides'

const RETAINED_SEO_SLUGS: Record<SeoCollection, readonly string[]> = {
  fields: [
    'commencement-date',
    'expiration-date',
    'base-rent-annual',
    'escalation-type',
    'fixed-escalation-rate',
    'pro-rata-share',
    'base-year',
    'cam-cap-percentage',
    'cam-exclusions',
    'audit-rights',
    'renewal-notice-days',
    'ti-allowance-per-rsf',
    'holdover-rate',
    'exclusive-use-rights',
  ],
  glossary: [
    'base-rent',
    'cam-charges',
    'nnn-lease',
    'gross-lease',
    'operating-expense-pass-through',
    'tenant-improvement-allowance',
    'estoppel-certificate',
    'snda',
    'right-of-first-refusal',
    'commencement-date',
    'rent-abatement',
    'pro-rata-share',
    'permitted-use',
    'guarantor',
  ],
  clauses: [
    'escalation-clause',
    'co-tenancy-clause',
    'exclusive-use-clause',
    'go-dark-clause',
    'kick-out-clause',
    'force-majeure-clause',
    'personal-guarantee-clause',
    'good-guy-guarantee',
    'operating-expense-stop',
    'base-year-clause',
    'gross-up-provision',
  ],
  'red-flags': [
    'missing-audit-rights',
    'no-cam-cap',
    'cumulative-cam-cap',
    'no-gross-up-provision',
    'missing-cam-exclusions',
    'aggressive-holdover-rate',
    'no-renewal-option',
    'missing-force-majeure-clause',
  ],
  'lease-types': [
    'nnn-lease',
    'modified-gross-lease',
    'gross-lease',
    'percentage-lease',
    'ground-lease',
    'build-to-suit-lease',
  ],
  industries: [
    'retail-lease-abstraction',
    'office-lease-abstraction',
    'industrial-lease-abstraction',
    'healthcare-lease-abstraction',
    'restaurant-lease-abstraction',
  ],
  locations: [
    'new-york-commercial-lease-abstraction',
    'los-angeles-commercial-lease-abstraction',
    'chicago-commercial-lease-abstraction',
    'houston-commercial-lease-abstraction',
    'dallas-commercial-lease-abstraction',
    'atlanta-commercial-lease-abstraction',
  ],
  integrations: [
    'yardi-voyager',
    'mri-software',
    'argus-enterprise',
    'leasequery',
    'microsoft-excel',
    'google-sheets',
    'docusign',
    'netsuite',
  ],
}

const EXPLICIT_SEO_REDIRECTS: Partial<Record<SeoCollection, Record<string, string>>> = {
  glossary: {
    'lease-abstraction': '/resources/articles/what-is-commercial-lease-abstraction',
  },
}

const CONTENT_REDIRECTS: Partial<Record<ContentCollection, Record<string, string>>> = {
  articles: {
    'what-is-lease-extraction': '/resources/articles/what-is-commercial-lease-abstraction',
    'lease-abstraction-automation': '/resources/articles/ai-lease-abstraction-guide',
    'manual-vs-ai-lease-abstraction':
      '/resources/articles/lease-abstraction-services-vs-ai-software',
    'hidden-cost-manual-lease-abstraction':
      '/resources/articles/lease-abstraction-services-vs-ai-software',
    'free-ai-lease-abstraction-tools-what-they-miss':
      '/resources/articles/best-ai-lease-abstraction-tools-2026',
  },
}

const RETAINED_LOOKUPS = Object.fromEntries(
  Object.entries(RETAINED_SEO_SLUGS).map(([collection, slugs]) => [
    collection,
    new Set(slugs),
  ])
) as Record<SeoCollection, Set<string>>

export function isRetainedSeoSlug(collection: SeoCollection, slug: string): boolean {
  return RETAINED_LOOKUPS[collection].has(slug)
}

export function getExplicitSeoRedirect(
  collection: SeoCollection,
  slug: string
): string | null {
  return EXPLICIT_SEO_REDIRECTS[collection]?.[slug] ?? null
}

export function filterRetainedSeoItems<T extends { slug: string }>(
  collection: SeoCollection,
  items: readonly T[]
): T[] {
  return items.filter((item) => isRetainedSeoSlug(collection, item.slug))
}

export function getRetainedSeoCount(collection: SeoCollection): number {
  return RETAINED_LOOKUPS[collection].size
}

export function isIndexableContentSlug(
  collection: ContentCollection,
  slug: string
): boolean {
  return getContentRedirectTarget(collection, slug) === null
}

export function getContentRedirectTarget(
  collection: ContentCollection,
  slug: string
): string | null {
  return CONTENT_REDIRECTS[collection]?.[slug] ?? null
}
