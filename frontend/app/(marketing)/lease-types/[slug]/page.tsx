import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import {
  getIndexableLeaseTypeBySlug,
  getAllIndexableLeaseTypeSlugs,
  getLeaseTypeSeoRedirect,
} from '@/data/lease-types'
import { getIndustryByShortName } from '@/data/industries'
import { getFieldSeoRedirect, getIndexableFieldBySlug } from '@/data/fields'
import { getRedFlagSeoRedirect, getIndexableRedFlagBySlug } from '@/data/red-flags'
import { SITE_URL } from '@/lib/site-config'
import { buildIndexableMarketingMetadata } from '@/lib/seo-metadata'
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
import { getRelatedContentForPseo, getAllContentItems, getSmartCrossLinks } from '@/lib/content-matching'
import { CrossVerticalLinks } from '@/components/content/cross-vertical-links'
import { SeoFunnelLinks } from '@/components/content/seo-funnel-links'

interface LeaseTypePageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllIndexableLeaseTypeSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: LeaseTypePageProps): Promise<Metadata> {
  const { slug } = await params
  const leaseType = getIndexableLeaseTypeBySlug(slug)

  if (!leaseType) {
    const redirectTarget = getLeaseTypeSeoRedirect(slug)
    if (redirectTarget) permanentRedirect(redirectTarget)
    return { title: 'Lease Type Not Found' }
  }

  return buildIndexableMarketingMetadata({
    title: leaseType.metaTitle,
    description: leaseType.metaDescription,
    path: `/lease-types/${leaseType.slug}`,
    type: 'article',
  })
}

export default async function LeaseTypePage({ params }: LeaseTypePageProps) {
  const { slug } = await params
  const leaseType = getIndexableLeaseTypeBySlug(slug)

  if (!leaseType) {
    const redirectTarget = getLeaseTypeSeoRedirect(slug)
    if (redirectTarget) permanentRedirect(redirectTarget)
    notFound()
  }

  const allContent = await getAllContentItems()
  const relatedArticles = getRelatedContentForPseo(allContent, 'lease-types', [leaseType.name])
  const crossLinks = getSmartCrossLinks('lease-types', [leaseType.name, leaseType.abbreviation, ...leaseType.typicalIndustries.slice(0, 3)])

  const pageUrl = `${SITE_URL}/lease-types/${leaseType.slug}`
  const publishedDate = '2026-03-18'
  const modifiedDate = '2026-03-18'

  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Lease Types', url: `${SITE_URL}/lease-types` },
    { name: leaseType.name, url: pageUrl },
  ]

  return (
    <>
      <JsonLd
        schema={buildArticleSchema({
          headline: `${leaseType.name} - Commercial Lease Structure Explained`,
          description: leaseType.metaDescription,
          url: pageUrl,
          datePublished: publishedDate,
          dateModified: modifiedDate,
          author: 'Angel Campa, Founder',
        })}
      />
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(leaseType.faqs)} />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:py-20 sm:px-6 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Lease Types', href: '/lease-types' },
            { label: leaseType.name },
          ]}
        />

        <LastUpdated date="2026-03-17" />
        <AuthorByline />

        <header className="mb-10 mt-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {leaseType.name}
            </h1>
            <span className="rounded bg-muted px-2 py-1 text-sm font-mono font-medium text-muted-foreground">
              {leaseType.abbreviation}
            </span>
          </div>
          <p className="mt-4 text-base sm:text-lg lg:text-xl text-muted-foreground">
            {leaseType.metaDescription}
          </p>
        </header>

        {/* Overview */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Overview</h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            {leaseType.summary}
          </p>
        </section>

        {/* Expense Breakdown */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Expense Breakdown</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-5 sm:p-6 shadow-sm dark:border-red-900/30 dark:bg-red-950/20">
              <h3 className="mb-3 font-semibold text-red-700 dark:text-red-400">
                Tenant Pays
              </h3>
              <ul className="space-y-1.5">
                {leaseType.tenantExpenses.map((expense) => (
                  <li key={expense} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-0.5 shrink-0 text-red-500">•</span>
                    {expense}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 sm:p-6 shadow-sm dark:border-emerald-900/30 dark:bg-emerald-950/20">
              <h3 className="mb-3 font-semibold text-emerald-700 dark:text-emerald-400">
                Landlord Pays
              </h3>
              <ul className="space-y-1.5">
                {leaseType.landlordExpenses.map((expense) => (
                  <li key={expense} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-0.5 shrink-0 text-emerald-500">•</span>
                    {expense}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Typical Profile */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Typical Profile</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border bg-card p-5 sm:p-6 shadow-sm">
              <p className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Typical Industries
              </p>
              <div className="flex flex-wrap gap-2">
                {leaseType.typicalIndustries.map((industry) => {
                  const resolved = getIndustryByShortName(industry)
                  return resolved ? (
                    <Link
                      key={industry}
                      href={`/industries/${resolved.slug}`}
                      className="rounded-full bg-muted px-3 py-1 text-sm transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      {industry}
                    </Link>
                  ) : (
                    <span
                      key={industry}
                      className="rounded-full bg-muted px-3 py-1 text-sm"
                    >
                      {industry}
                    </span>
                  )
                })}
              </div>
            </div>
            <div className="rounded-xl border bg-card p-5 sm:p-6 shadow-sm">
              <p className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Typical Term Length
              </p>
              <p className="text-2xl font-bold">{leaseType.typicalTermLength}</p>
            </div>
          </div>
        </section>

        {/* Pros & Cons */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Pros &amp; Cons</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border bg-card p-5 sm:p-6 shadow-sm">
              <h3 className="mb-3 font-semibold">For Tenant</h3>
              <div className="space-y-3">
                <div>
                  <p className="mb-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                    Pros
                  </p>
                  <ul className="space-y-1">
                    {leaseType.pros.forTenant.map((pro) => (
                      <li key={pro} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-0.5 shrink-0 text-emerald-500">+</span>
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">
                    Cons
                  </p>
                  <ul className="space-y-1">
                    {leaseType.cons.forTenant.map((con) => (
                      <li key={con} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-0.5 shrink-0 text-red-500">−</span>
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-5 sm:p-6 shadow-sm">
              <h3 className="mb-3 font-semibold">For Landlord</h3>
              <div className="space-y-3">
                <div>
                  <p className="mb-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                    Pros
                  </p>
                  <ul className="space-y-1">
                    {leaseType.pros.forLandlord.map((pro) => (
                      <li key={pro} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-0.5 shrink-0 text-emerald-500">+</span>
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">
                    Cons
                  </p>
                  <ul className="space-y-1">
                    {leaseType.cons.forLandlord.map((con) => (
                      <li key={con} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-0.5 shrink-0 text-red-500">−</span>
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Critical Fields */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">
            Critical Fields to Abstract
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            These are the highest-priority fields Lextract extracts from{' '}
            {leaseType.abbreviation} leases. Click any field to learn what it
            means and why it matters.
          </p>
          <div className="flex flex-wrap gap-2">
            {leaseType.criticalFields.map((fieldSlug) => {
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
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Common Red Flags</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Lextract automatically detects these red flags in{' '}
            {leaseType.abbreviation} leases. Click any flag to learn the impact
            and what to do.
          </p>
          <div className="flex flex-wrap gap-2">
            {leaseType.commonRedFlags.map((rfSlug) => {
              const liveRedFlag = getIndexableRedFlagBySlug(rfSlug)
              const redirectTarget = getRedFlagSeoRedirect(rfSlug)
              const label = rfSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

              if (liveRedFlag) {
                return (
                  <Link
                    key={rfSlug}
                    href={`/red-flags/${rfSlug}`}
                    className="inline-flex items-center rounded-xl border border-red-200 bg-red-50/50 px-3 py-2 text-sm text-red-700 shadow-sm transition-all hover:bg-red-100/50 hover:shadow-md dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40"
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
                    className="inline-flex items-center rounded-xl border border-red-200 bg-red-50/50 px-3 py-2 text-sm text-red-700 shadow-sm transition-all hover:bg-red-100/50 hover:shadow-md dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    {label}
                  </Link>
                )
              }

              return (
                <span
                  key={rfSlug}
                  className="inline-flex items-center rounded-xl border border-red-200 bg-red-50/50 px-3 py-2 text-sm text-red-700 shadow-sm dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400"
                >
                  {label}
                </span>
              )
            })}
          </div>
        </section>

        {/* Compare With */}
        {leaseType.comparisonLeaseTypes.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Compare With</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {leaseType.comparisonLeaseTypes.map((compareSlug) => (
                <Link
                  key={compareSlug}
                  href={`/lease-types/${compareSlug}`}
                  className="group rounded-xl border bg-card p-5 sm:p-6 shadow-sm transition-all hover:bg-muted/50 hover:shadow-md"
                >
                  <p className="font-medium group-hover:text-primary transition-colors">
                    {compareSlug
                      .replace(/-/g, ' ')
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    View expense breakdown and red flags →
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {leaseType.faqs.map((faq, index) => (
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

        <SeoFunnelLinks routeHref={`/lease-types/${leaseType.slug}`} />

        <ContentCta
          heading={`Abstract your ${leaseType.abbreviation} lease in minutes`}
          description={`Upload your ${leaseType.name} PDF and get 126 structured fields extracted with automatic red flag detection. Just $15 per lease.`}
          buttonText="Upload Your Lease"
          href="/upload"
        />
      </div>
    </>
  )
}
