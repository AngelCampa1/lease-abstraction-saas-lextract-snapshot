import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import { SITE_URL } from '@/lib/site-config'
import { buildDefinedTermSchema, buildBreadcrumbSchema, buildSpeakableSchema, buildFAQPageSchema } from '@/lib/schema'
import { JsonLd } from '@/components/seo/json-ld'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { LastUpdated } from '@/components/content/last-updated'
import { AuthorByline } from '@/components/content/author-byline'
import { ContentCta } from '@/components/content/content-cta'
import { RelatedContent } from '@/components/content/related-content'
import { getRelatedContentForPseo, getAllContentItems, getSmartCrossLinks } from '@/lib/content-matching'
import { CrossVerticalLinks } from '@/components/content/cross-vertical-links'
import { CrossSiteCallout } from '@/components/content/cross-site-callout'
import { SeoFunnelLinks } from '@/components/content/seo-funnel-links'
import {
  INDEXABLE_GLOSSARY_TERMS,
  GLOSSARY_CATEGORY_LABELS,
  getGlossarySeoRedirect,
  getGlossaryTermBySlug,
  getIndexableGlossaryTermBySlug,
} from '@/data/glossary'
import { getFieldBySlug } from '@/data/fields'
import { getClauseBySlug } from '@/data/clauses'
import { resolveClauseHref, resolveFieldHref, resolveGlossaryHref } from '@/lib/pseo-paths'
import type { GlossaryCategory } from '@/data/glossary'

interface TermPageProps {
  params: Promise<{ slug: string }>
}

const CATEGORY_COLORS: Record<GlossaryCategory, string> = {
  financial: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  legal: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  operational: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  parties: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  property: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
}

export function generateStaticParams() {
  return INDEXABLE_GLOSSARY_TERMS.map((term) => ({ slug: term.slug }))
}

export async function generateMetadata({ params }: TermPageProps): Promise<Metadata> {
  const { slug } = await params
  const term = getIndexableGlossaryTermBySlug(slug)

  if (!term) {
    const redirectTarget = getGlossarySeoRedirect(slug)
    if (redirectTarget) permanentRedirect(redirectTarget)
    return { title: 'Term Not Found' }
  }

  const description =
    term.metaDescription ??
    (term.definition.length > 155
      ? term.definition.slice(0, 152).replace(/\s+\S*$/, '') + '...'
      : term.definition)

  return {
    title: term.metaTitle ?? `${term.term} - Commercial Lease Glossary`,
    description,
    alternates: {
      canonical: `${SITE_URL}/glossary/${slug}`,
    },
    openGraph: {
      title: term.metaTitle ?? `${term.term} - Commercial Lease Glossary | Lextract`,
      description,
      url: `${SITE_URL}/glossary/${slug}`,
      type: 'article',
      images: [
        {
          url: `${SITE_URL}/glossary/${slug}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${term.term} - Lextract Glossary Reference`,
        },
      ],
    },
  }
}

export default async function GlossaryTermPage({ params }: TermPageProps) {
  const { slug } = await params
  const term = getIndexableGlossaryTermBySlug(slug)

  if (!term) {
    const redirectTarget = getGlossarySeoRedirect(slug)
    if (redirectTarget) permanentRedirect(redirectTarget)
    notFound()
  }

  const pageUrl = `${SITE_URL}/glossary/${term.slug}`

  const allContent = await getAllContentItems()
  const relatedArticles = getRelatedContentForPseo(allContent, 'glossary', [term.term])
  const crossLinks = getSmartCrossLinks('glossary', [term.term, term.category])

  const definedTermSchema = buildDefinedTermSchema({
    term: term.term,
    definition: term.definition,
    slug: term.slug,
  })

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Glossary', url: `${SITE_URL}/glossary` },
    { name: term.term, url: pageUrl },
  ])

  const speakableSchema = buildSpeakableSchema(pageUrl, ['#definition'])

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
      <JsonLd schema={definedTermSchema} />
      <JsonLd schema={breadcrumbSchema} />
      <JsonLd schema={speakableSchema} />
      {term.faqs && term.faqs.length > 0 && (
        <JsonLd schema={buildFAQPageSchema(term.faqs)} />
      )}

      <div className="mx-auto max-w-prose">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Glossary', href: '/glossary' },
            { label: term.term },
          ]}
        />

        <LastUpdated date="2026-03-17" />
        <AuthorByline />

        <header className="mb-8 mt-6">
          <div className="mb-3">
            <span
              className={`inline-block rounded-full px-3 py-0.5 text-sm font-medium ${CATEGORY_COLORS[term.category]}`}
            >
              {GLOSSARY_CATEGORY_LABELS[term.category]}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {term.term}
          </h1>
        </header>

        <section id="definition" className="mb-10">
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg lg:text-xl">{term.definition}</p>
        </section>

        <section id="extended-definition" className="mb-10">
          <h2 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl lg:text-4xl">Extended Definition</h2>
          <div
            className="prose dark:prose-invert max-w-none text-base text-muted-foreground
              prose-headings:text-foreground prose-headings:font-semibold
              prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-2
              prose-p:leading-relaxed prose-p:mb-4
              prose-ul:ml-5 prose-ul:mb-4
              prose-li:mb-1 prose-strong:text-foreground
              [&_table]:block [&_table]:overflow-x-auto"
            dangerouslySetInnerHTML={{
              __html: term.extendedDefinition.trimStart().startsWith('<')
                ? term.extendedDefinition
                : `<p>${term.extendedDefinition}</p>`,
            }}
          />
        </section>

        {term.relatedTerms.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl lg:text-4xl">Related Terms</h2>
            <div className="flex flex-wrap gap-2">
              {term.relatedTerms.map((relatedSlug) => {
                const relatedTerm = getGlossaryTermBySlug(relatedSlug)
                const href = resolveGlossaryHref(relatedSlug)
                if (!relatedTerm || !href) return null
                return (
                  <Link
                    key={relatedSlug}
                    href={href}
                    className="min-h-[44px] rounded-full bg-muted px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    {relatedTerm.term}
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {term.relatedFields && term.relatedFields.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl lg:text-4xl">Related Extracted Fields</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Lextract extracts these fields directly from your lease PDF:
            </p>
            <div className="flex flex-wrap gap-2">
              {term.relatedFields.map((fieldSlug) => {
                const href = resolveFieldHref(fieldSlug)
                if (!href) return null
                const field = getFieldBySlug(fieldSlug)
                return (
                  <Link
                    key={fieldSlug}
                    href={href}
                    className="inline-flex min-h-[44px] items-center rounded-full border px-3 py-2.5 text-sm transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    {field?.displayLabel ??
                      fieldSlug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {term.relatedClauses && term.relatedClauses.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl lg:text-4xl">Related Lease Clauses</h2>
            <div className="flex flex-wrap gap-2">
              {term.relatedClauses.map((clauseSlug) => {
                const href = resolveClauseHref(clauseSlug)
                if (!href) return null
                const clause = getClauseBySlug(clauseSlug)
                return (
                  <Link
                    key={clauseSlug}
                    href={href}
                    className="inline-flex min-h-[44px] items-center rounded-full border px-3 py-2.5 text-sm transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    {clause?.name ??
                      clauseSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {term.faqs && term.faqs.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl lg:text-4xl">Frequently Asked Questions</h2>
            <div className="space-y-6 sm:space-y-8">
              {term.faqs.map((faq, index) => (
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

        <SeoFunnelLinks routeHref={`/glossary/${term.slug}`} />

        <CrossSiteCallout tags={[term.term, term.category]} />

        <ContentCta
          heading="Extract lease terms automatically"
          description="Upload a commercial lease PDF and get 126 structured fields - including all the terms defined in this glossary - extracted in minutes. $15 per lease."
        />
      </div>
    </div>
  )
}
