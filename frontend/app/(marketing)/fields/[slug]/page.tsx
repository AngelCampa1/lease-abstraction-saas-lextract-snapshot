import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import {
  getFieldSeoRedirect,
  getIndexableFieldBySlug,
  getAllIndexableFieldSlugs,
  getFieldsByCategory,
} from '@/data/fields'
import { getIndexableRedFlagBySlug, getRedFlagSeoRedirect, RED_FLAG_BY_ID } from '@/data/red-flags'
import { getGlossaryTermBySlug } from '@/data/glossary'
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
import { resolveGlossaryHref } from '@/lib/pseo-paths'
import { PRODUCT_FIELD_COUNT, PRODUCT_RED_FLAG_COUNT } from '@/lib/product-facts'

const FIELD_PAGE_UPDATED_AT = '2026-03-17'

interface FieldPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllIndexableFieldSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: FieldPageProps): Promise<Metadata> {
  const { slug } = await params
  const field = getIndexableFieldBySlug(slug)

  if (!field) {
    const redirectTarget = getFieldSeoRedirect(slug)
    if (redirectTarget) permanentRedirect(redirectTarget)
    return { title: 'Field Not Found' }
  }

  return {
    title: field.metaTitle,
    description: field.metaDescription,
    alternates: {
      canonical: `${SITE_URL}/fields/${field.slug}`,
    },
    openGraph: {
      url: `${SITE_URL}/fields/${field.slug}`,
      title: field.metaTitle,
      description: field.metaDescription,
      type: 'article',
      images: [
        {
          url: `${SITE_URL}/fields/${field.slug}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${field.displayLabel} - Lextract Field Reference`,
        },
      ],
    },
  }
}

// Severity styles are exhaustive over the RedFlagSeverity union
const SEVERITY_STYLES = {
  high: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
} as const

export default async function FieldPage({ params }: FieldPageProps) {
  const { slug } = await params
  const field = getIndexableFieldBySlug(slug)

  if (!field) {
    const redirectTarget = getFieldSeoRedirect(slug)
    if (redirectTarget) permanentRedirect(redirectTarget)
    notFound()
  }

  const pageUrl = `${SITE_URL}/fields/${field.slug}`
  const publishedDate = FIELD_PAGE_UPDATED_AT
  const modifiedDate = FIELD_PAGE_UPDATED_AT

  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Fields', url: `${SITE_URL}/fields` },
    { name: field.displayLabel, url: pageUrl },
  ]

  const relatedFieldsInCategory = getFieldsByCategory(field.category)
    .filter((f) => f.slug !== field.slug)
    .slice(0, 6)

  const allContent = await getAllContentItems()
  const relatedArticles = getRelatedContentForPseo(allContent, 'fields', [field.displayLabel, field.category])
  const crossLinks = getSmartCrossLinks('fields', [field.displayLabel, field.category, ...field.aliases.slice(0, 2)])

  return (
    <>
      <JsonLd
        schema={buildArticleSchema({
          headline: `${field.displayLabel} in Commercial Leases`,
          description: field.metaDescription,
          url: pageUrl,
          datePublished: publishedDate,
          dateModified: modifiedDate,
          author: 'Angel Campa, Founder',
        })}
      />
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(field.faqs)} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-prose">
          <Breadcrumbs
            crumbs={[
              { label: 'Home', href: '/' },
              { label: 'Fields', href: '/fields' },
              { label: field.displayLabel },
            ]}
          />

          <LastUpdated date={FIELD_PAGE_UPDATED_AT} />
          <AuthorByline />

          <header className="mb-8 mt-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {field.categoryLabel}
              </span>
              {field.required && (
                <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Required Field
                </span>
              )}
              {field.camRelevant && (
                <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  CAM Relevant
                </span>
              )}
              <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                {field.dataType}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {field.displayLabel}
            </h1>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg lg:text-xl">
              {field.description}
            </p>
            {field.aliases.length > 0 && (
              <p className="mt-2 text-sm text-muted-foreground">
                <strong>Also known as:</strong> {field.aliases.join(', ')}
              </p>
            )}
          </header>

          {/* Why It Matters */}
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Why This Field Matters</h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              {field.whyItMatters}
            </p>
          </section>

          {/* Where to Find It */}
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Where to Find It in Your Lease</h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              {field.whereToFindIt}
            </p>
          </section>

          {/* How Lextract Extracts It */}
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">How Lextract Extracts This Field</h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              Lextract uses vision AI to read your lease PDF directly (scanned or digital), then
              multi-pass AI validation identifies and extracts the{' '}
              <strong>{field.displayLabel.toLowerCase()}</strong>. The AI searches for
              {field.aliases.length > 0
                ? ` the field name and common aliases like "${field.aliases.slice(0, 2).join('", "')}" across`
                : ''}{' '}
              all pages of the document, then assigns a confidence score based on document
              quality and extraction certainty. Fields with lower confidence are flagged for
              human review.
            </p>
          </section>

          {/* Related Red Flags */}
          {field.relatedRedFlags.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Related Red Flags</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Lextract automatically checks this field against its {PRODUCT_RED_FLAG_COUNT}-rule red flag engine.
                Issues detected for {field.displayLabel.toLowerCase()}:
              </p>
              <div className="space-y-3">
                {field.relatedRedFlags.map((rfId) => {
                  const rf = RED_FLAG_BY_ID[rfId]
                  if (!rf) return null
                  const href = getIndexableRedFlagBySlug(rf.slug)
                    ? `/red-flags/${rf.slug}`
                    : getRedFlagSeoRedirect(rf.slug)
                  if (!href) return null
                  return (
                    <Link
                      key={rfId}
                      href={href}
                      className="group flex items-center gap-3 rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md sm:p-6"
                    >
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold uppercase ${SEVERITY_STYLES[rf.severity]}`}>
                        {rf.severity}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">{rfId}</span>
                      <span className="font-medium transition-colors group-hover:text-primary">{rf.name}</span>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {/* Related Fields */}
          {relatedFieldsInCategory.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">
                Related Fields in {field.categoryLabel}
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {relatedFieldsInCategory.map((related) => (
                  <Link
                    key={related.slug}
                    href={`/fields/${related.slug}`}
                    className="group rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md sm:p-6"
                  >
                    <p className="font-medium transition-colors group-hover:text-primary">{related.displayLabel}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {related.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Glossary Links */}
          {field.relatedGlossaryTerms.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Related Glossary Terms</h2>
              <div className="flex flex-wrap gap-2">
                {field.relatedGlossaryTerms.map((termSlug) => {
                  const href = resolveGlossaryHref(termSlug)
                  if (!href) return null
                  const term = getGlossaryTermBySlug(termSlug)
                  return (
                    <Link
                      key={termSlug}
                      href={href}
                      className="inline-flex min-h-[44px] items-center rounded-full border px-3 py-2.5 text-sm transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      {term?.term ??
                        termSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {/* FAQ */}
          {field.faqs.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Frequently Asked Questions</h2>
              <div className="space-y-6 sm:space-y-8">
                {field.faqs.map((faq, index) => (
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

          <SeoFunnelLinks routeHref={`/fields/${field.slug}`} />

          <CrossSiteCallout tags={[field.displayLabel, field.category, ...field.aliases.slice(0, 3)]} />

          <ContentCta
            heading={`Need to extract ${field.displayLabel.toLowerCase()} from your lease?`}
            description={`Upload your lease PDF and Lextract will extract ${field.displayLabel.toLowerCase()} along with ${PRODUCT_FIELD_COUNT - 1} other structured fields in minutes. Just $15 per lease.`}
            buttonText="Upload Your Lease"
            href="/upload"
          />
        </div>
      </div>
    </>
  )
}
