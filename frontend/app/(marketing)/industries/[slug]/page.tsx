import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import {
  getIndexableIndustryBySlug,
  getAllIndexableIndustrySlugs,
  getIndustrySeoRedirect,
  INDEXABLE_INDUSTRIES,
} from '@/data/industries'
import { getLeaseTypeByName } from '@/data/lease-types'
import { getFieldSeoRedirect, getIndexableFieldBySlug } from '@/data/fields'
import { getRedFlagSeoRedirect, getIndexableRedFlagBySlug } from '@/data/red-flags'
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
import { getAllContentItems, getRelatedContentForPseo, getSmartCrossLinks } from '@/lib/content-matching'

interface IndustryPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllIndexableIndustrySlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: IndustryPageProps): Promise<Metadata> {
  const { slug } = await params
  const industry = getIndexableIndustryBySlug(slug)

  if (!industry) {
    const redirectTarget = getIndustrySeoRedirect(slug)
    if (redirectTarget) permanentRedirect(redirectTarget)
    return { title: 'Page Not Found' }
  }

  return {
    title: industry.metaTitle,
    description: industry.metaDescription,
    alternates: {
      canonical: `${SITE_URL}/industries/${industry.slug}`,
    },
    openGraph: {
      url: `${SITE_URL}/industries/${industry.slug}`,
      title: industry.metaTitle,
      description: industry.metaDescription,
      type: 'article',
      images: [DEFAULT_OG_IMAGE],
    },
  }
}

export default async function IndustryPage({ params }: IndustryPageProps) {
  const { slug } = await params
  const industry = getIndexableIndustryBySlug(slug)

  if (!industry) {
    const redirectTarget = getIndustrySeoRedirect(slug)
    if (redirectTarget) permanentRedirect(redirectTarget)
    notFound()
  }

  const allContent = await getAllContentItems()
  const keywords = [industry.name, industry.shortName, ...industry.dominantLeaseTypes]
  const relatedArticles = getRelatedContentForPseo(allContent, 'industries', keywords)
  const crossLinks = getSmartCrossLinks('industries', keywords)

  const pageUrl = `${SITE_URL}/industries/${industry.slug}`
  const publishedDate = '2026-03-18'
  const modifiedDate = '2026-03-18'

  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Industries', url: `${SITE_URL}/industries` },
    { name: industry.shortName, url: pageUrl },
  ]

  const relatedIndustries = INDEXABLE_INDUSTRIES.filter((i) =>
    industry.relatedIndustries.includes(i.slug)
  )

  return (
    <>
      <JsonLd
        schema={buildArticleSchema({
          headline: industry.name,
          description: industry.metaDescription,
          url: pageUrl,
          datePublished: publishedDate,
          dateModified: modifiedDate,
          author: 'Angel Campa, Founder',
        })}
      />
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(industry.faqs)} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Industries', href: '/industries' },
            { label: industry.shortName },
          ]}
        />

        <LastUpdated date="2026-03-17" />
        <AuthorByline />

        <header className="mb-10 mt-6">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {industry.name}
          </h1>
          <p className="mt-4 text-base sm:text-lg lg:text-xl text-muted-foreground">
            {industry.metaDescription}
          </p>
        </header>

        {/* Industry Overview */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold">Industry Overview</h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            {industry.overview}
          </p>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border bg-card p-5 sm:p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Typical Lease Term
              </p>
              <p className="mt-1 text-base font-medium">{industry.avgLeaseTermYears}</p>
            </div>
            <div className="rounded-xl border bg-card p-5 sm:p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Dominant Lease Structures
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {industry.dominantLeaseTypes.map((leaseType) => {
                  const resolved = getLeaseTypeByName(leaseType)
                  return resolved ? (
                    <Link
                      key={leaseType}
                      href={`/lease-types/${resolved.slug}`}
                      className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                    >
                      {leaseType}
                    </Link>
                  ) : (
                    <span
                      key={leaseType}
                      className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                    >
                      {leaseType}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Industry-Specific Considerations */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold">Industry-Specific Considerations</h2>
          <ul className="space-y-3">
            {industry.industrySpecificConsiderations.map((consideration, index) => (
              <li key={`consideration-${index}`} className="flex gap-3">
                <span aria-hidden="true" className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {index + 1}
                </span>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {consideration}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Critical Fields to Abstract */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold">Critical Fields to Abstract</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            These fields carry the highest financial and operational significance in{' '}
            {industry.shortName.toLowerCase()} leases.
          </p>
          <div className="flex flex-wrap gap-2">
            {industry.criticalFields.map((fieldSlug) => {
              const liveField = getIndexableFieldBySlug(fieldSlug)
              const redirectTarget = getFieldSeoRedirect(fieldSlug)
              const label = fieldSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
              return liveField ? (
                <Link
                  key={fieldSlug}
                  href={`/fields/${fieldSlug}`}
                  className="inline-flex items-center rounded-xl border bg-card px-3 py-2 text-sm shadow-sm transition-all hover:bg-primary/10 hover:text-primary hover:shadow-md"
                >
                  {label}
                </Link>
              ) : redirectTarget ? (
                <Link
                  key={fieldSlug}
                  href={redirectTarget}
                  className="inline-flex items-center rounded-xl border bg-card px-3 py-2 text-sm shadow-sm transition-all hover:bg-primary/10 hover:text-primary hover:shadow-md"
                >
                  {label}
                </Link>
              ) : (
                <span
                  key={fieldSlug}
                  className="inline-flex items-center rounded-xl border bg-card px-3 py-2 text-sm shadow-sm"
                >
                  {label}
                </span>
              )
            })}
          </div>
        </section>

        {/* Common Red Flags */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold">Common Red Flags in {industry.shortName} Leases</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Lextract automatically detects these high-risk provisions in{' '}
            {industry.shortName.toLowerCase()} leases.
          </p>
          <div className="flex flex-wrap gap-2">
            {industry.commonRedFlags.map((rfSlug) => {
              const liveRedFlag = getIndexableRedFlagBySlug(rfSlug)
              const redirectTarget = getRedFlagSeoRedirect(rfSlug)
              const label = rfSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

              if (liveRedFlag) {
                return (
                  <Link
                    key={rfSlug}
                    href={`/red-flags/${rfSlug}`}
                    className="inline-flex items-center rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive shadow-sm transition-all hover:bg-destructive/10 hover:shadow-md"
                  >
                    {label}
                  </Link>
                )
              }

              if (redirectTarget) {
                return (
                  <Link
                    key={rfSlug}
                    href={redirectTarget}
                    className="inline-flex items-center rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive shadow-sm transition-all hover:bg-destructive/10 hover:shadow-md"
                  >
                    {label}
                  </Link>
                )
              }

              return (
                <span
                  key={rfSlug}
                  className="inline-flex items-center rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive shadow-sm"
                >
                  {label}
                </span>
              )
            })}
          </div>
        </section>

        {/* Sample Extraction Note */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold">What Lextract Extracts</h2>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
            <p className="text-base leading-relaxed">{industry.sampleExtractionNote}</p>
          </div>
        </section>

        {/* Related Industries */}
        {relatedIndustries.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold">Related Industries</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {relatedIndustries.map((related) => (
                <Link
                  key={related.slug}
                  href={`/industries/${related.slug}`}
                  className="group rounded-xl border bg-card p-5 sm:p-6 shadow-sm transition-all hover:bg-muted/50 hover:shadow-md"
                >
                  <p className="font-medium group-hover:text-primary transition-colors">{related.shortName}</p>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {related.dominantLeaseTypes.join(', ')}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {industry.faqs.map((faq, index) => (
              <div key={`faq-${index}`}>
                <h3 className="mb-2 text-xl sm:text-2xl font-semibold">{faq.question}</h3>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

        <RelatedContent items={relatedArticles} heading="Related Articles" />

        <CrossVerticalLinks crossLinks={crossLinks} />

        <SeoFunnelLinks routeHref={`/industries/${industry.slug}`} />

        <ContentCta
          heading={`Ready to abstract your ${industry.shortName.toLowerCase()} lease?`}
          description={`Upload your ${industry.shortName.toLowerCase()} lease PDF and get 126 structured fields extracted in minutes. Industry-specific red flag detection included. Just $15 per lease.`}
          buttonText="Upload Your Lease"
          href="/upload"
        />
      </div>
    </>
  )
}
