import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import {
  getIndexableClauseBySlug,
  getAllIndexableClauseSlugs,
  INDEXABLE_CLAUSES,
  CLAUSE_CATEGORY_LABELS,
  CLAUSES_PUBLISHED_AT,
  getClauseSeoRedirect,
} from '@/data/clauses'
import { getLeaseTypeByName } from '@/data/lease-types'
import { getFieldSeoRedirect, getIndexableFieldBySlug } from '@/data/fields'
import { SITE_URL } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/json-ld'
import { buildArticleSchema, buildBreadcrumbSchema, buildFAQPageSchema } from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { LastUpdated } from '@/components/content/last-updated'
import { AuthorByline } from '@/components/content/author-byline'
import { ContentCta } from '@/components/content/content-cta'
import { RelatedContent } from '@/components/content/related-content'
import { getRelatedContentForPseo, getAllContentItems, getSmartCrossLinks } from '@/lib/content-matching'
import { CrossVerticalLinks } from '@/components/content/cross-vertical-links'
import { CrossSiteCallout } from '@/components/content/cross-site-callout'
import { SeoFunnelLinks } from '@/components/content/seo-funnel-links'

interface ClausePageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllIndexableClauseSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: ClausePageProps): Promise<Metadata> {
  const { slug } = await params
  const clause = getIndexableClauseBySlug(slug)

  if (!clause) {
    const redirectTarget = getClauseSeoRedirect(slug)
    if (redirectTarget) permanentRedirect(redirectTarget)
    return { title: 'Clause Not Found' }
  }

  return {
    title: clause.metaTitle,
    description: clause.metaDescription,
    alternates: {
      canonical: `${SITE_URL}/clauses/${clause.slug}`,
    },
    openGraph: {
      url: `${SITE_URL}/clauses/${clause.slug}`,
      title: clause.metaTitle,
      description: clause.metaDescription,
      type: 'article',
      images: [
        {
          url: `${SITE_URL}/clauses/${clause.slug}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${clause.name} - Lextract Clause Reference`,
        },
      ],
    },
  }
}

const CATEGORY_STYLES: Record<string, string> = {
  'tenant-rights': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  'landlord-protections': 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  financial: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  operational: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
  legal: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
}

export default async function ClausePage({ params }: ClausePageProps) {
  const { slug } = await params
  const clause = getIndexableClauseBySlug(slug)

  if (!clause) {
    const redirectTarget = getClauseSeoRedirect(slug)
    if (redirectTarget) permanentRedirect(redirectTarget)
    notFound()
  }

  const pageUrl = `${SITE_URL}/clauses/${clause.slug}`
  const publishedDate = CLAUSES_PUBLISHED_AT
  const modifiedDate = CLAUSES_PUBLISHED_AT

  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Clauses', url: `${SITE_URL}/clauses` },
    { name: clause.name, url: pageUrl },
  ]

  const allContent = await getAllContentItems()
  const relatedArticles = getRelatedContentForPseo(allContent, 'clauses', [clause.name])
  const crossLinks = getSmartCrossLinks('clauses', [clause.name, clause.category, ...clause.leaseTypesWhere.slice(0, 2)])

  const relatedClauses = clause.relatedClauses
    .map((relatedSlug) => INDEXABLE_CLAUSES.find((c) => c.slug === relatedSlug))
    .filter((c): c is NonNullable<typeof c> => c !== undefined)

  const categoryLabel = CLAUSE_CATEGORY_LABELS[clause.category]
  const categoryStyle = CATEGORY_STYLES[clause.category]

  return (
    <>
      <JsonLd
        schema={buildArticleSchema({
          headline: clause.name,
          description: clause.metaDescription,
          url: pageUrl,
          datePublished: publishedDate,
          dateModified: modifiedDate,
          author: 'Angel Campa, Founder',
        })}
      />
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      {clause.faqs && clause.faqs.length > 0 && (
        <JsonLd schema={buildFAQPageSchema(clause.faqs)} />
      )}

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-prose">
          <Breadcrumbs
            crumbs={[
              { label: 'Home', href: '/' },
              { label: 'Clauses', href: '/clauses' },
              { label: clause.name },
            ]}
          />

          <LastUpdated date="2026-03-17" />
          <AuthorByline />

          <header className="mb-8 mt-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-md px-3 py-1 text-sm font-medium ${categoryStyle}`}
              >
                {categoryLabel}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">{clause.name}</h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg lg:text-xl">
              {clause.definition}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              By Angel Campa, Founder &middot; Updated March 2026
            </p>
          </header>

          {/* Why It Matters */}
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Why It Matters</h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              {clause.whyItMatters}
            </p>
          </section>

          {/* How to Negotiate */}
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">How to Negotiate</h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              {clause.howToNegotiate}
            </p>
          </section>

          {/* Common Variations */}
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Common Variations</h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              {clause.commonVariations}
            </p>
          </section>

          {/* Common in These Lease Types */}
          {clause.leaseTypesWhere.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Common in These Lease Types</h2>
              <div className="flex flex-wrap gap-2">
                {clause.leaseTypesWhere.map((leaseType) => {
                  const resolved = getLeaseTypeByName(leaseType)
                  if (resolved) {
                    return (
                      <Link
                        key={leaseType}
                        href={`/lease-types/${resolved.slug}`}
                        className="inline-flex min-h-[44px] items-center rounded-full border px-3 py-2.5 text-sm transition-colors hover:bg-primary/10 hover:text-primary"
                      >
                        {leaseType}
                      </Link>
                    )
                  }
                  return (
                    <span
                      key={leaseType}
                      className="inline-flex items-center rounded-full border px-3 py-1 text-sm text-muted-foreground"
                    >
                      {leaseType}
                    </span>
                  )
                })}
              </div>
            </section>
          )}

          {/* Related Fields */}
          {clause.relatedFields.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Related Extracted Fields</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Lextract extracts these fields directly from your lease PDF when this clause is present:
              </p>
              <div className="flex flex-wrap gap-2">
                {clause.relatedFields.map((fieldSlug) => {
                  const liveField = getIndexableFieldBySlug(fieldSlug)
                  const redirectTarget = getFieldSeoRedirect(fieldSlug)
                  const label = fieldSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                  return liveField ? (
                    <Link
                      key={fieldSlug}
                      href={`/fields/${fieldSlug}`}
                      className="inline-flex min-h-[44px] items-center rounded-full border px-3 py-2.5 text-sm transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      {label}
                    </Link>
                  ) : redirectTarget ? (
                    <Link
                      key={fieldSlug}
                      href={redirectTarget}
                      className="inline-flex min-h-[44px] items-center rounded-full border px-3 py-2.5 text-sm transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      {label}
                    </Link>
                  ) : (
                    <span
                      key={fieldSlug}
                      className="inline-flex items-center rounded-full border px-3 py-1 text-sm"
                    >
                      {label}
                    </span>
                  )
                })}
              </div>
            </section>
          )}

          {/* Related Clauses */}
          {relatedClauses.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Related Clauses</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {relatedClauses.map((related) => {
                  const relatedFirstSentence = related.definition.split('. ')[0] + '.'
                  return (
                    <Link
                      key={related.slug}
                      href={`/clauses/${related.slug}`}
                      className="group rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md sm:p-6"
                    >
                      <p className="font-medium transition-colors group-hover:text-primary">{related.name}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {relatedFirstSentence}
                      </p>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {clause.faqs && clause.faqs.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl lg:text-4xl">Frequently Asked Questions</h2>
              <div className="space-y-6 sm:space-y-8">
                {clause.faqs.map((faq, index) => (
                  <div key={`faq-${index}`}>
                    <h3 className="mb-2 text-xl font-semibold sm:text-2xl">{faq.question}</h3>
                    <p className="text-base leading-relaxed text-muted-foreground">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <RelatedContent items={relatedArticles} heading="Related Articles" />

          <CrossVerticalLinks crossLinks={crossLinks} />

          <SeoFunnelLinks routeHref={`/clauses/${clause.slug}`} />

          <CrossSiteCallout tags={[clause.name, clause.category]} />

          <ContentCta
            heading={`Need to identify ${clause.name.toLowerCase()} language in your lease?`}
            description="Upload your lease PDF and Lextract extracts 126 structured fields with confidence scoring and red flag detection - automatically. Just $15 per lease."
            buttonText="Upload Your Lease"
            href="/upload"
          />
        </div>
      </div>
    </>
  )
}
