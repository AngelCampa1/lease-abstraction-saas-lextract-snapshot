import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import {
  getIndexableLocationBySlug,
  getAllIndexableLocationSlugs,
  getLocationSeoRedirect,
} from '@/data/locations'
import { getLeaseTypeByName } from '@/data/lease-types'
import { resolveFieldHref, resolveRedFlagHref } from '@/lib/pseo-paths'
import { SITE_URL, DEFAULT_OG_IMAGE } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/json-ld'
import { buildArticleSchema, buildBreadcrumbSchema, buildFAQPageSchema } from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { LastUpdated } from '@/components/content/last-updated'
import { AuthorByline } from '@/components/content/author-byline'
import { ContentCta } from '@/components/content/content-cta'
import { RelatedContent } from '@/components/content/related-content'
import { CrossVerticalLinks } from '@/components/content/cross-vertical-links'
import { SeoFunnelLinks } from '@/components/content/seo-funnel-links'
import { getAllContentItems, getRelatedContentForPseo, getSmartCrossLinks } from '@/lib/content-matching'

interface LocationPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllIndexableLocationSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: LocationPageProps): Promise<Metadata> {
  const { slug } = await params
  const location = getIndexableLocationBySlug(slug)

  if (!location) {
    const redirectTarget = getLocationSeoRedirect(slug)
    if (redirectTarget) permanentRedirect(redirectTarget)
    return { title: 'Location Not Found' }
  }

  return {
    title: location.metaTitle,
    description: location.metaDescription,
    alternates: {
      canonical: `${SITE_URL}/locations/${location.slug}`,
    },
    openGraph: {
      url: `${SITE_URL}/locations/${location.slug}`,
      title: location.metaTitle,
      description: location.metaDescription,
      type: 'article',
      images: [DEFAULT_OG_IMAGE],
    },
  }
}

const TIER_COLORS: Record<string, string> = {
  'Tier 1': 'bg-primary/10 text-primary border-primary/20',
  'Tier 2': 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  'Tier 3': 'bg-muted text-muted-foreground border-border',
}

export default async function LocationPage({ params }: LocationPageProps) {
  const { slug } = await params
  const location = getIndexableLocationBySlug(slug)

  if (!location) {
    const redirectTarget = getLocationSeoRedirect(slug)
    if (redirectTarget) permanentRedirect(redirectTarget)
    notFound()
  }

  const allContent = await getAllContentItems()
  const keywords = [location.city, location.state, location.stateAbbr, ...location.dominantLeaseTypes]
  const relatedArticles = getRelatedContentForPseo(allContent, 'locations', keywords)
  const crossLinks = getSmartCrossLinks('locations', keywords)

  const pageUrl = `${SITE_URL}/locations/${location.slug}`
  const publishedDate = '2026-03-17'
  const modifiedDate = '2026-03-17'

  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Locations', url: `${SITE_URL}/locations` },
    { name: `${location.city}, ${location.stateAbbr}`, url: pageUrl },
  ]

  return (
    <>
      <JsonLd
        schema={buildArticleSchema({
          headline: `Commercial Lease Abstraction in ${location.city}, ${location.stateAbbr}`,
          description: location.metaDescription,
          url: pageUrl,
          datePublished: publishedDate,
          dateModified: modifiedDate,
          author: 'Angel Campa, Founder',
        })}
      />
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(location.faqs)} />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:py-20 sm:px-6 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Locations', href: '/locations' },
            { label: `${location.city}, ${location.stateAbbr}` },
          ]}
        />

        <header className="mb-10 mt-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Commercial Lease Abstraction in {location.city}, {location.stateAbbr}
            </h1>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-sm font-medium ${TIER_COLORS[location.keyMarketStats.marketTier]}`}
            >
              {location.keyMarketStats.marketTier}
            </span>
            <span className="text-sm text-muted-foreground">
              {location.state}
            </span>
          </div>
          <p className="mt-4 text-base sm:text-lg lg:text-xl text-muted-foreground">
            {location.marketOverview}
          </p>
          <LastUpdated date={modifiedDate} />
          <AuthorByline />
        </header>

        {/* Market Stats */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Market Overview</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-card p-5 sm:p-6 text-center shadow-sm">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Commercial Space
              </p>
              <p className="mt-1 text-xl font-bold text-primary">
                {location.keyMarketStats.totalCommercialSqFt}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-5 sm:p-6 text-center shadow-sm">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Avg Office Rent
              </p>
              <p className="mt-1 text-xl font-bold text-primary">
                {location.keyMarketStats.avgOfficeRentPsf}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-5 sm:p-6 text-center shadow-sm">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Vacancy Rate
              </p>
              <p className="mt-1 text-xl font-bold text-primary">
                {location.keyMarketStats.vacancyRate}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-5 sm:p-6 text-center shadow-sm">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Avg Lease Term
              </p>
              <p className="mt-1 text-xl font-bold text-primary">
                {location.avgLeaseTermYears}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Market figures are directional planning estimates and may vary by submarket, property class, building condition, and lease structure.
          </p>
        </section>

        {/* Dominant Lease Types */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Dominant Lease Types</h2>
          <div className="flex flex-wrap gap-2">
            {location.dominantLeaseTypes.map((lt) => {
              const resolved = getLeaseTypeByName(lt)
              return resolved ? (
                <Link
                  key={lt}
                  href={`/lease-types/${resolved.slug}`}
                  className="rounded-lg border bg-muted px-3 py-2 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                >
                  {lt}
                </Link>
              ) : (
                <span
                  key={lt}
                  className="rounded-lg border bg-muted px-3 py-2 text-sm font-medium"
                >
                  {lt}
                </span>
              )
            })}
          </div>
        </section>

        {/* Common Lease Structures */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">
            Common Lease Structures in {location.city}
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            {location.commonLeaseStructures}
          </p>
        </section>

        {/* Key Fields */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">
            Key Fields for {location.city} Leases
          </h2>
          <div className="flex flex-wrap gap-2">
            {location.keyFields.map((fieldSlug) => {
              const fieldHref = resolveFieldHref(fieldSlug)
              const label = fieldSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
              return fieldHref ? (
                <Link
                  key={fieldSlug}
                  href={fieldHref}
                  className="inline-flex items-center rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                >
                  {label}
                </Link>
              ) : (
                <span
                  key={fieldSlug}
                  className="inline-flex items-center rounded-lg border px-3 py-2 text-sm"
                >
                  {label}
                </span>
              )
            })}
          </div>
        </section>

        {/* Local Red Flags */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">
            Local Red Flags to Watch
          </h2>
          <div className="flex flex-wrap gap-2">
            {location.localRedFlags.map((rfSlug) => {
              const redFlagHref = resolveRedFlagHref(rfSlug)
              const label = rfSlug
                .replace(/-/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase())

              if (redFlagHref) {
                return (
                  <Link
                    key={rfSlug}
                    href={redFlagHref}
                    className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
                  >
                    {label}
                  </Link>
                )
              }

              return (
                <span
                  key={rfSlug}
                  className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
                >
                  {label}
                </span>
              )
            })}
          </div>
        </section>

        {/* State Law Reference */}
        {location.stateSlug && (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">
              {location.state} Commercial Lease Law
            </h2>
            <Link
              href={`/resources/states/${location.stateSlug}`}
              className="group inline-flex items-center gap-2 rounded-xl border bg-card p-5 sm:p-6 shadow-sm transition-all hover:shadow-md hover:bg-muted/50"
            >
              <div>
                <p className="font-semibold group-hover:text-primary transition-colors">
                  {location.state} Landlord–Tenant Guide
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  State-specific commercial lease laws, notice periods, and tenant
                  rights for {location.state} &rarr;
                </p>
              </div>
            </Link>
          </section>
        )}

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {location.faqs.map((faq, index) => (
              <div key={`faq-${index}`}>
                <h3 className="mb-2 text-xl font-semibold sm:text-2xl">{faq.question}</h3>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

        <RelatedContent items={relatedArticles} heading="Related Articles" />

        <CrossVerticalLinks crossLinks={crossLinks} />

        <SeoFunnelLinks routeHref={`/locations/${location.slug}`} />

        <ContentCta
          heading={`Start abstracting ${location.city} leases today`}
          description={`Upload your ${location.city} commercial lease PDF and get 126 structured fields extracted in minutes. Just $15 per lease.`}
          buttonText="Upload Your Lease"
          href="/upload"
        />
      </div>
    </>
  )
}
