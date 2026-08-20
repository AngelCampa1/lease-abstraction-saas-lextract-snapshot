import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getStateBySlug, getAllStateSlugs } from '@/data/states'
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
import { SourcesChecked } from '@/components/content/sources-checked'
import { RelatedContent } from '@/components/content/related-content'
import { CrossVerticalLinks } from '@/components/content/cross-vertical-links'
import { SeoFunnelLinks } from '@/components/content/seo-funnel-links'
import { getAllContentItems, getRelatedContentForPseo, getSmartCrossLinks } from '@/lib/content-matching'
import { StateFactGrid } from '@/components/content/state-fact-grid'
import { StateStatuteList } from '@/components/content/state-statute-list'
import { StateNoticePeriodTable } from '@/components/content/state-notice-table'
import { StateAuditRightsSection } from '@/components/content/state-audit-rights'
import { StateFaqAccordion } from '@/components/content/state-faq-accordion'

interface StatePageProps {
  params: Promise<{ state: string }>
}

export async function generateStaticParams() {
  return getAllStateSlugs().map((slug) => ({ state: slug }))
}

export async function generateMetadata({
  params,
}: StatePageProps): Promise<Metadata> {
  const { state: slug } = await params
  const state = getStateBySlug(slug)

  if (!state) {
    return { title: 'State Not Found' }
  }

  return buildIndexableMarketingMetadata({
    title: `${state.state} Commercial Lease Laws`,
    description: state.metaDescription,
    path: `/resources/states/${state.slug}`,
    type: 'article',
  })
}

export default async function StatePage({ params }: StatePageProps) {
  const { state: slug } = await params
  const state = getStateBySlug(slug)

  if (!state) {
    notFound()
  }

  const allContent = await getAllContentItems()
  const keywords = [state.state, state.stateCode]
  const relatedArticles = getRelatedContentForPseo(allContent, 'states', keywords)
  const crossLinks = getSmartCrossLinks('states', keywords)

  const pageUrl = `${SITE_URL}/resources/states/${state.slug}`
  const publishedDate = '2026-03-01'
  const modifiedDate = '2026-03-17'

  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Resources', url: `${SITE_URL}/resources` },
    { name: 'States', url: `${SITE_URL}/resources/states` },
    { name: state.state, url: pageUrl },
  ]

  const faqItems = state.faqs.map((faq) => ({
    question: faq.question,
    answer: faq.answer,
  }))

  const overviewParagraphs = state.overview.split('\n').filter(Boolean)
  const sources = state.keyStatutes
    .filter((statute): statute is typeof statute & { url: string } => statute.url !== undefined)
    .map((statute) => ({
      title: statute.name,
      url: statute.url,
      publisher: `${state.state} legal source`,
      checkedAt: modifiedDate,
    }))

  return (
    <>
      <JsonLd
        schema={buildArticleSchema({
          headline: `${state.state} Commercial Lease Laws`,
          description: state.metaDescription,
          url: pageUrl,
          datePublished: publishedDate,
          dateModified: modifiedDate,
          author: 'Angel Campa, Founder',
        })}
      />
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(faqItems)} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Resources', href: '/resources' },
            { label: 'States', href: '/resources/states' },
            { label: state.state },
          ]}
        />

        <div className="mx-auto mt-6 max-w-4xl">
          <header className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <span className="inline-flex items-center justify-center rounded-md bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary">
              {state.stateCode}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {state.state} Commercial Lease Laws
          </h1>
          <LastUpdated date={modifiedDate} />
          <AuthorByline />
          <SourcesChecked sources={sources} />
        </header>

        <section className="prose prose-neutral dark:prose-invert max-w-none">
          {overviewParagraphs.map((paragraph, index) => (
            <p key={`overview-${index}`} className="text-base leading-relaxed text-muted-foreground">
              {paragraph}
            </p>
          ))}
        </section>

        <StateFactGrid facts={state.keyFacts} />
        <StateStatuteList statutes={state.keyStatutes} />
        <StateNoticePeriodTable periods={state.noticePeriods} />
        <StateAuditRightsSection auditRights={state.auditRights} />
        <StateFaqAccordion faqs={state.faqs} />

        {state.relatedFields && state.relatedFields.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Key Fields for {state.state} Leases</h2>
            <div className="flex flex-wrap gap-2">
              {state.relatedFields.map((fieldSlug) => (
                <Link
                  key={fieldSlug}
                  href={`/fields/${fieldSlug}`}
                  className="inline-flex min-h-[44px] items-center rounded-full border px-3 py-2 text-sm transition-all hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                >
                  {fieldSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </Link>
              ))}
            </div>
          </section>
        )}

        {state.relatedRedFlags && state.relatedRedFlags.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Common Red Flags</h2>
            <div className="flex flex-wrap gap-2">
              {state.relatedRedFlags.map((rfSlug) => (
                <Link
                  key={rfSlug}
                  href={`/red-flags/${rfSlug}`}
                  className="inline-flex min-h-[44px] items-center rounded-full border border-red-200 bg-red-50/50 px-3 py-2 text-sm text-red-700 transition-colors hover:bg-red-100/50 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400"
                >
                  {rfSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-12 rounded-xl border border-amber-500/20 bg-amber-50/50 p-4 shadow-sm dark:bg-amber-950/20">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong>Disclaimer:</strong> This page provides general information
            about commercial landlord-tenant law in {state.state}. It is not
            legal advice. Laws change frequently and local ordinances may impose
            additional requirements. Consult a licensed attorney in{' '}
            {state.state} for guidance specific to your situation.
          </p>
        </section>

        <RelatedContent items={relatedArticles} heading="Related Articles" />

        <CrossVerticalLinks crossLinks={crossLinks} />

        <SeoFunnelLinks routeHref={`/resources/states/${state.slug}`} />

        <ContentCta
          heading={`Abstracting a ${state.state} commercial lease?`}
          description={`Upload your lease PDF and get 126 structured fields extracted in minutes. Lextract flags state-specific clauses and risks. Just $15 per lease.`}
          buttonText="Upload Your Lease"
          href="/upload"
        />
        </div>
      </div>
    </>
  )
}
