import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPropertyTypeBySlug, getAllPropertyTypeSlugs, PROPERTY_TYPES_PUBLISHED_AT } from '@/data/property-types'
import { RED_FLAG_BY_ID } from '@/data/red-flags'
import { getFieldBySlug } from '@/data/fields'
import { SITE_URL, DEFAULT_OG_IMAGE } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/json-ld'
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildFAQPageSchema,
} from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { LastUpdated } from '@/components/content/last-updated'
import { AuthorByline } from '@/components/content/author-byline'
import { ContentCta } from '@/components/content/content-cta'
import { RelatedContent } from '@/components/content/related-content'
import { CrossVerticalLinks } from '@/components/content/cross-vertical-links'
import { SeoFunnelLinks } from '@/components/content/seo-funnel-links'
import { getRelatedContentForPseo, getAllContentItems, getSmartCrossLinks } from '@/lib/content-matching'

interface PropertyTypePageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllPropertyTypeSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: PropertyTypePageProps): Promise<Metadata> {
  const { slug } = await params
  const propertyType = getPropertyTypeBySlug(slug)

  if (!propertyType) {
    return { title: 'Property Type Not Found' }
  }

  return {
    title: propertyType.metaTitle,
    description: propertyType.metaDescription,
    alternates: {
      canonical: `${SITE_URL}/property-types/${propertyType.slug}`,
    },
    openGraph: {
      url: `${SITE_URL}/property-types/${propertyType.slug}`,
      title: propertyType.metaTitle,
      description: propertyType.metaDescription,
      type: 'article',
      images: [DEFAULT_OG_IMAGE],
    },
  }
}

// RED_FLAG_BY_ID imported from @/data/red-flags - single source of truth

const SEVERITY_STYLES = {
  high: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
} as const

export default async function PropertyTypePage({ params }: PropertyTypePageProps) {
  const { slug } = await params
  const propertyType = getPropertyTypeBySlug(slug)

  if (!propertyType) {
    notFound()
  }

  const pageUrl = `${SITE_URL}/property-types/${propertyType.slug}`
  const publishedDate = PROPERTY_TYPES_PUBLISHED_AT
  const modifiedDate = PROPERTY_TYPES_PUBLISHED_AT

  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Property Types', url: `${SITE_URL}/property-types` },
    { name: propertyType.name, url: pageUrl },
  ]

  const allContent = await getAllContentItems()
  const relatedArticles = getRelatedContentForPseo(allContent, 'property-types', [propertyType.name])
  const crossLinks = getSmartCrossLinks('property-types', [propertyType.name, ...propertyType.criticalFields.slice(0, 3)])

  const resolvedRedFlags = propertyType.commonRedFlags
    .map((rfId) => ({ id: rfId, data: RED_FLAG_BY_ID[rfId] }))
    .filter((rf): rf is { id: string; data: NonNullable<(typeof RED_FLAG_BY_ID)[string]> } =>
      rf.data !== undefined
    )

  return (
    <>
      <JsonLd
        schema={buildArticleSchema({
          headline: `${propertyType.name} Lease Abstraction`,
          description: propertyType.metaDescription,
          url: pageUrl,
          datePublished: publishedDate,
          dateModified: modifiedDate,
          author: 'Angel Campa, Founder',
        })}
      />
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(propertyType.faqs)} />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:py-20 sm:px-6 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Property Types', href: '/property-types' },
            { label: propertyType.name },
          ]}
        />

        <header className="mb-8 mt-6">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {propertyType.name} Lease Abstraction
          </h1>
          <p className="mt-4 text-base sm:text-lg lg:text-xl leading-relaxed text-muted-foreground">
            {propertyType.overview}
          </p>
          <LastUpdated date="2026-03-17" />
          <AuthorByline />
        </header>

        {/* Average Term Range */}
        <section className="mb-10">
          <div className="inline-flex items-center gap-3 rounded-xl border bg-card px-5 py-3 shadow-sm">
            <span className="text-sm font-medium text-muted-foreground">Average Lease Term</span>
            <span className="text-lg font-bold">{propertyType.avgTermRange}</span>
          </div>
        </section>

        {/* Typical Lease Structure */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Typical Lease Structure</h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            {propertyType.typicalLeaseStructure}
          </p>
        </section>

        {/* Typical Tenants */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Typical Tenants</h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            {propertyType.typicalTenants}
          </p>
        </section>

        {/* Critical Fields to Extract */}
        {propertyType.criticalFields.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Critical Fields to Extract</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              These fields are most important when abstracting a {propertyType.name.toLowerCase()} lease.
              Click any field to learn what it means and where to find it.
            </p>
            <div className="flex flex-wrap gap-2">
              {propertyType.criticalFields.map((fieldSlug) => {
                const fieldExists = !!getFieldBySlug(fieldSlug)
                const label = fieldSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                return fieldExists ? (
                  <Link
                    key={fieldSlug}
                    href={`/fields/${fieldSlug}`}
                    className="inline-flex items-center rounded-full border bg-card px-3 py-1 text-sm shadow-sm transition-all hover:bg-primary/10 hover:text-primary hover:shadow-md"
                  >
                    {label}
                  </Link>
                ) : (
                  <span
                    key={fieldSlug}
                    className="inline-flex items-center rounded-full border bg-card px-3 py-1 text-sm shadow-sm"
                  >
                    {label}
                  </span>
                )
              })}
            </div>
          </section>
        )}

        {/* Common Red Flags */}
        {resolvedRedFlags.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Common Red Flags</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Lextract automatically checks {propertyType.name.toLowerCase()} leases against these
              red flag rules during extraction:
            </p>
            <div className="space-y-3">
              {resolvedRedFlags.map(({ id, data }) => (
                <Link
                  key={id}
                  href={`/red-flags/${data.slug}`}
                  className="group flex items-center gap-3 rounded-xl border bg-card p-5 sm:p-6 shadow-sm transition-all hover:bg-muted/50 hover:shadow-md"
                >
                  <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold uppercase ${SEVERITY_STYLES[data.severity]}`}
                  >
                    {data.severity}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">{id}</span>
                  <span className="font-medium">{data.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Extraction Considerations */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Extraction Considerations</h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            {propertyType.extractionConsiderations}
          </p>
        </section>

        {/* FAQ */}
        {propertyType.faqs.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {propertyType.faqs.map((faq, index) => (
                <div key={`faq-${index}`}>
                  <h3 className="mb-2 text-xl font-semibold sm:text-2xl">{faq.question}</h3>
                  <p className="text-base leading-relaxed text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related Property Types */}
        {propertyType.relatedPropertyTypes && propertyType.relatedPropertyTypes.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Related Property Types</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {propertyType.relatedPropertyTypes.map((ptSlug) => (
                <Link
                  key={ptSlug}
                  href={`/property-types/${ptSlug}`}
                  className="group rounded-xl border bg-card p-5 sm:p-6 shadow-sm transition-all hover:bg-muted/50 hover:shadow-md"
                >
                  <p className="font-medium group-hover:text-primary transition-colors">
                    {ptSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    View lease structure and critical fields →
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <RelatedContent items={relatedArticles} heading="Related Articles" />

        <CrossVerticalLinks crossLinks={crossLinks} />

        <SeoFunnelLinks routeHref={`/property-types/${propertyType.slug}`} />

        <ContentCta
          heading={`Abstract your ${propertyType.name.toLowerCase()} lease in minutes`}
          description={`Upload your ${propertyType.name.toLowerCase()} lease PDF and Lextract extracts 126 structured fields with confidence scoring and automatic red flag detection. Just $15 per lease.`}
          buttonText="Upload Your Lease"
          href="/upload"
        />
      </div>
    </>
  )
}
