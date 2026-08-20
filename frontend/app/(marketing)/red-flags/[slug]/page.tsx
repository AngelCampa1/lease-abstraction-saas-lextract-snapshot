import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import {
  getIndexableRedFlagBySlug,
  getAllIndexableRedFlagSlugs,
  getRedFlagSeoRedirect,
  INDEXABLE_RED_FLAGS,
} from '@/data/red-flags'
import { getLeaseTypeByName } from '@/data/lease-types'
import { getFieldSeoRedirect, getIndexableFieldBySlug } from '@/data/fields'
import { SITE_URL } from '@/lib/site-config'
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
import { CrossSiteCallout } from '@/components/content/cross-site-callout'
import { SeoFunnelLinks } from '@/components/content/seo-funnel-links'
import { PRODUCT_RED_FLAG_COUNT } from '@/lib/product-facts'

const RED_FLAG_PAGE_UPDATED_AT = '2026-03-17'

interface RedFlagPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllIndexableRedFlagSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: RedFlagPageProps): Promise<Metadata> {
  const { slug } = await params
  const flag = getIndexableRedFlagBySlug(slug)

  if (!flag) {
    const redirectTarget = getRedFlagSeoRedirect(slug)
    if (redirectTarget) permanentRedirect(redirectTarget)
    return { title: 'Red Flag Not Found' }
  }

  return {
    title: flag.metaTitle,
    description: flag.metaDescription,
    alternates: {
      canonical: `${SITE_URL}/red-flags/${flag.slug}`,
    },
    openGraph: {
      url: `${SITE_URL}/red-flags/${flag.slug}`,
      title: flag.metaTitle,
      description: flag.metaDescription,
      type: 'article',
      images: [
        {
          url: `${SITE_URL}/red-flags/${flag.slug}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${flag.name} - Lextract Red Flag Reference`,
        },
      ],
    },
  }
}

const SEVERITY_STYLES = {
  high: {
    bg: 'bg-red-100 dark:bg-red-950',
    text: 'text-red-800 dark:text-red-300',
    border: 'border-red-200 dark:border-red-900',
    label: 'High Severity',
  },
  medium: {
    bg: 'bg-amber-100 dark:bg-amber-950',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-900',
    label: 'Medium Severity',
  },
  low: {
    bg: 'bg-blue-100 dark:bg-blue-950',
    text: 'text-blue-800 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-900',
    label: 'Low Severity',
  },
} as const

export default async function RedFlagPage({ params }: RedFlagPageProps) {
  const { slug } = await params
  const flag = getIndexableRedFlagBySlug(slug)

  if (!flag) {
    const redirectTarget = getRedFlagSeoRedirect(slug)
    if (redirectTarget) permanentRedirect(redirectTarget)
    notFound()
  }

  const pageUrl = `${SITE_URL}/red-flags/${flag.slug}`
  const publishedDate = RED_FLAG_PAGE_UPDATED_AT
  const modifiedDate = RED_FLAG_PAGE_UPDATED_AT
  const severity = SEVERITY_STYLES[flag.severity]

  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Red Flags', url: `${SITE_URL}/red-flags` },
    { name: flag.name, url: pageUrl },
  ]

  const relatedFlags = flag.relatedRedFlags
    .map((id) => INDEXABLE_RED_FLAGS.find((f) => f.ruleId === id))
    .filter(Boolean)

  const allContent = await getAllContentItems()
  const relatedArticles = getRelatedContentForPseo(allContent, 'red-flags', [flag.name])
  const crossLinks = getSmartCrossLinks('red-flags', [flag.name, ...flag.commonLeaseTypes.slice(0, 2), ...flag.triggeringFields.slice(0, 2)])

  return (
    <>
      <JsonLd
        schema={buildArticleSchema({
          headline: `${flag.name}: Commercial Lease Red Flag`,
          description: flag.metaDescription,
          url: pageUrl,
          datePublished: publishedDate,
          dateModified: modifiedDate,
          author: 'Angel Campa, Founder',
        })}
      />
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(flag.faqs)} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-prose">
          <Breadcrumbs
            crumbs={[
              { label: 'Home', href: '/' },
              { label: 'Red Flags', href: '/red-flags' },
              { label: flag.name },
            ]}
          />

          <LastUpdated date={RED_FLAG_PAGE_UPDATED_AT} />
          <AuthorByline />

          <header className="mb-8 mt-6">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center rounded-md px-3 py-1 text-sm font-bold uppercase ${severity.bg} ${severity.text}`}>
                {severity.label}
              </span>
              <span className="font-mono text-sm text-muted-foreground">
                {flag.ruleId}
              </span>
              {flag.isCamRelated && (
                <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-1 text-sm font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  CAM Related
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Red Flag: {flag.name}
            </h1>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg lg:text-xl">
              {flag.summary}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              By Angel Campa, Founder &middot; Updated March 2026
            </p>
          </header>

          {/* Detection Rule */}
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">How Lextract Detects This</h2>
            <div className={`rounded-xl border bg-card p-5 shadow-sm sm:p-6 ${severity.bg} ${severity.border}`}>
              <p className={`font-mono text-sm ${severity.text}`}>
                {flag.detectionRule}
              </p>
            </div>
          </section>

          {/* Real-World Impact */}
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Real-World Financial Impact</h2>
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              {flag.realWorldImpact.split('\n').filter(Boolean).map((paragraph, index) => (
                <p key={`impact-${index}`} className="text-base leading-relaxed text-muted-foreground">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>

          {/* Triggering Fields */}
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Fields That Trigger This Red Flag</h2>
            <div className="flex flex-wrap gap-2">
              {flag.triggeringFields.map((fieldSlug) => {
                const liveField = getIndexableFieldBySlug(fieldSlug)
                const redirectTarget = getFieldSeoRedirect(fieldSlug)
                const label = fieldSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

                if (liveField) {
                  return (
                    <Link
                      key={fieldSlug}
                      href={`/fields/${fieldSlug}`}
                      className="inline-flex min-h-[44px] items-center rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      {label}
                    </Link>
                  )
                }

                if (redirectTarget) {
                  return (
                    <Link
                      key={fieldSlug}
                      href={redirectTarget}
                      className="inline-flex min-h-[44px] items-center rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      {label}
                    </Link>
                  )
                }

                return (
                  <span
                    key={fieldSlug}
                    className="inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium"
                  >
                    {label}
                  </span>
                )
              })}
            </div>
          </section>

          {/* What to Do */}
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">What to Do About It</h2>
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              {flag.whatToDo.split('\n').filter(Boolean).map((paragraph, index) => (
                <p key={`action-${index}`} className="text-base leading-relaxed text-muted-foreground">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>

          {/* Common Lease Types */}
          {flag.commonLeaseTypes.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Most Common In These Lease Types</h2>
              <div className="flex flex-wrap gap-2">
                {flag.commonLeaseTypes.map((leaseType) => {
                  const resolved = getLeaseTypeByName(leaseType)
                  return resolved ? (
                    <Link
                      key={leaseType}
                      href={`/lease-types/${resolved.slug}`}
                      className="inline-flex min-h-[44px] items-center rounded-full border px-3 py-2.5 text-sm transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      {leaseType}
                    </Link>
                  ) : (
                    <span
                      key={leaseType}
                      className="inline-flex items-center rounded-full border px-3 py-1 text-sm"
                    >
                      {leaseType}
                    </span>
                  )
                })}
              </div>
            </section>
          )}

          {/* Related Red Flags */}
          {relatedFlags.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Related Red Flags</h2>
              <div className="space-y-3">
                {relatedFlags.map((rf) => {
                  if (!rf) return null
                  const rfSeverity = SEVERITY_STYLES[rf.severity]
                  return (
                    <Link
                      key={rf.ruleId}
                      href={`/red-flags/${rf.slug}`}
                      className="group flex items-center gap-3 rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md sm:p-6"
                    >
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-sm font-bold uppercase ${rfSeverity.bg} ${rfSeverity.text}`}>
                        {rf.severity}
                      </span>
                      <span className="font-mono text-sm text-muted-foreground">{rf.ruleId}</span>
                      <span className="font-medium transition-colors group-hover:text-primary">{rf.name}</span>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {/* FAQ */}
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Frequently Asked Questions</h2>
            <div className="space-y-6 sm:space-y-8">
              {flag.faqs.map((faq, index) => (
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

          <CrossSiteCallout
            tags={[flag.name, ...flag.triggeringFields.slice(0, 3)]}
            audience={flag.isCamRelated ? 'tenant' : undefined}
          />

          <SeoFunnelLinks routeHref={`/red-flags/${flag.slug}`} />

          {/* CamAudit cross-sell for CAM-related flags */}
          {flag.isCamRelated && (
            <section className="mb-10 rounded-xl border-2 border-amber-500/30 bg-amber-50/50 p-6 dark:bg-amber-950/20 sm:p-8">
              <h2 className="mb-2 text-xl font-bold sm:text-2xl">Found CAM Issues? Take Action.</h2>
              <p className="mb-4 text-muted-foreground">
                This red flag indicates potential CAM overcharges in your lease.{' '}
                <strong>CamAudit.io</strong> performs forensic CAM audits that recover
                significant overcharges for tenants.
              </p>
              <a
                href="https://camaudit.io?ref=lextract"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-amber-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-amber-700 sm:w-auto"
              >
                Get a Forensic CAM Audit
              </a>
            </section>
          )}

          <ContentCta
            heading="Automatically detect red flags in your lease"
            description={`Upload your lease PDF and Lextract will check for ${flag.name.toLowerCase()} and ${PRODUCT_RED_FLAG_COUNT - 1} other red flags automatically. Just $15 per lease.`}
            buttonText="Upload Your Lease"
            href="/upload"
          />
        </div>
      </div>
    </>
  )
}
