import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SITE_URL } from '@/lib/site-config'
import { buildIndexableMarketingMetadata } from '@/lib/seo-metadata'
import { buildArticleSchema, buildBreadcrumbSchema, buildFAQPageSchema, buildSpeakableSchema, buildItemListSchema } from '@/lib/schema'
import type { FaqItem } from '@/lib/content-types'
import { JsonLd } from '@/components/seo/json-ld'
import Link from 'next/link'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { LastUpdated } from '@/components/content/last-updated'
import { AuthorByline } from '@/components/content/author-byline'
import { ContentCta } from '@/components/content/content-cta'
import { ComparisonTable } from '@/components/content/comparison-table'
import { SourcesChecked } from '@/components/content/sources-checked'
import { getComparisonBySlug, getAllComparisonSlugs } from '@/data/comparisons'
import { formatPrice, PRICING } from '@/lib/pricing'
import { RelatedContent } from '@/components/content/related-content'
import { CrossVerticalLinks } from '@/components/content/cross-vertical-links'
import { SeoFunnelLinks } from '@/components/content/seo-funnel-links'
import { getAllContentItems, getRelatedContentForPseo, getSmartCrossLinks } from '@/lib/content-matching'
import type { SourceItem } from '@/lib/content-types'

interface CompetitorPageProps {
  params: Promise<{ competitor: string }>
}

export async function generateStaticParams(): Promise<Array<{ competitor: string }>> {
  return getAllComparisonSlugs().map((slug) => ({ competitor: slug }))
}

export async function generateMetadata({
  params,
}: CompetitorPageProps): Promise<Metadata> {
  const { competitor } = await params
  const comparison = getComparisonBySlug(competitor)

  if (!comparison) {
    return { title: 'Comparison Not Found' }
  }

  return buildIndexableMarketingMetadata({
    title: comparison.metaTitle,
    description: comparison.metaDescription,
    path: `/resources/comparisons/${comparison.competitorSlug}`,
    type: 'article',
  })
}

export default async function CompetitorComparisonPage({
  params,
}: CompetitorPageProps) {
  const { competitor } = await params
  const comparison = getComparisonBySlug(competitor)

  if (!comparison) {
    notFound()
  }

  const allContent = await getAllContentItems()
  const relatedArticles = getRelatedContentForPseo(allContent, 'comparisons', [comparison.competitor, comparison.competitorSlug])
  const crossLinks = getSmartCrossLinks('comparisons', [comparison.competitor, comparison.competitorSlug])

  const articleSchema = buildArticleSchema({
    headline: comparison.metaTitle,
    description: comparison.metaDescription,
    url: `${SITE_URL}/resources/comparisons/${comparison.competitorSlug}`,
    datePublished: '2026-03-01',
    dateModified: '2026-03-26',
    author: 'Angel Campa, Founder',
  })

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Resources', url: `${SITE_URL}/resources` },
    { name: 'Comparisons', url: `${SITE_URL}/resources/comparisons` },
    {
      name: `vs ${comparison.competitor}`,
      url: `${SITE_URL}/resources/comparisons/${comparison.competitorSlug}`,
    },
  ])

  const lextractWins = comparison.features.filter(
    (f) => f.advantage === 'lextract'
  ).length
  const competitorWins = comparison.features.filter(
    (f) => f.advantage === 'competitor'
  ).length
  const ties = comparison.features.filter((f) => f.advantage === 'tie').length

  const comparisonFaqs: FaqItem[] = [
    {
      question: `What is the difference between Lextract and ${comparison.competitor}?`,
      answer: comparison.introduction.split('\n\n')[0],
    },
    {
      question: `How much does ${comparison.competitor} cost compared to Lextract?`,
      answer: `Lextract pricing: ${comparison.pricing.lextract}. ${comparison.competitor} pricing: ${comparison.pricing.competitor}. ${comparison.pricing.analysis.split('\n\n')[0]}`,
    },
    {
      question: `Is Lextract better than ${comparison.competitor}?`,
      answer: comparison.verdict,
    },
    {
      question: `Who should use ${comparison.competitor} instead of Lextract?`,
      answer: `${comparison.competitor} is best for: ${comparison.bestFor.competitor}. Lextract is best for: ${comparison.bestFor.lextract}.`,
    },
  ]

  const pageUrl = `${SITE_URL}/resources/comparisons/${comparison.competitorSlug}`
  const speakableSchema = buildSpeakableSchema(pageUrl, ['h1', '#overview'])

  const comparisonListSchema = buildItemListSchema({
    name: `Lextract vs ${comparison.competitor} - Feature Comparison`,
    description: `Side-by-side comparison of Lextract and ${comparison.competitor} for commercial lease abstraction`,
    items: [
      {
        name: 'Lextract',
        url: SITE_URL,
        description: `AI-powered lease abstraction - 126 fields, 20 red flags, ${formatPrice(PRICING.single.price)}/lease. ${comparison.bestFor.lextract}`,
      },
      {
        name: comparison.competitor,
        ...(comparison.competitorUrl !== undefined ? { url: comparison.competitorUrl } : {}),
        description: `${comparison.competitorDescription} ${comparison.bestFor.competitor}`,
      },
    ],
  })
  const sources: SourceItem[] = [
    {
      title: 'Lextract pricing',
      url: `${SITE_URL}/pricing`,
      publisher: 'Lextract',
      checkedAt: '2026-05-12',
    },
    ...(comparison.competitorUrl !== undefined
      ? [
          {
            title: `${comparison.competitor} product site`,
            url: comparison.competitorUrl,
            publisher: comparison.competitor,
            checkedAt: '2026-05-12',
          },
        ]
      : []),
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-4xl">
      <JsonLd schema={articleSchema} />
      <JsonLd schema={breadcrumbSchema} />
      <JsonLd schema={buildFAQPageSchema(comparisonFaqs)} />
      <JsonLd schema={speakableSchema} />
      <JsonLd schema={comparisonListSchema} />

      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Resources', href: '/resources' },
          { label: 'Comparisons', href: '/resources/comparisons' },
          { label: `vs ${comparison.competitor}` },
        ]}
      />

      <LastUpdated date="2026-03-26" />
      <AuthorByline />
      <SourcesChecked sources={sources} />

      {/* Hero */}
      <div className="mb-8 mt-6">
        <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          Lextract vs {comparison.competitor}
        </h1>
        <p className="text-base text-muted-foreground sm:text-lg lg:text-xl">
          {comparison.competitorDescription}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-4 py-2">
            <span className="text-2xl font-bold text-primary">{lextractWins}</span>
            <span className="text-sm font-medium text-primary">Lextract wins</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
            <span className="text-2xl font-bold text-muted-foreground">{competitorWins}</span>
            <span className="text-sm font-medium text-muted-foreground">{comparison.competitor} wins</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
            <span className="text-2xl font-bold text-muted-foreground">{ties}</span>
            <span className="text-sm font-medium text-muted-foreground">Ties</span>
          </div>
        </div>
      </div>

      {/* Winner callout */}
      {lextractWins > competitorWins && (
        <div className="mb-12 rounded-xl border-2 border-primary bg-primary/5 p-6 text-center">
          <p className="text-lg font-bold text-primary">
            Lextract wins {lextractWins} of {comparison.features.length} feature categories
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Based on features, pricing, and workflow integration
          </p>
        </div>
      )}

      {/* Introduction */}
      <section id="overview" className="mb-12">
        <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Overview</h2>
        {comparison.introduction.split('\n\n').map((paragraph, i) => (
          <p key={i} className="mb-4 text-muted-foreground">
            {paragraph}
          </p>
        ))}
      </section>

      {/* Feature Comparison Table */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">
          Feature Comparison
        </h2>
        <ComparisonTable
          features={comparison.features}
          competitorName={comparison.competitor}
        />
      </section>

      {/* Pricing */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Pricing</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="relative rounded-xl border-2 border-primary bg-card shadow-sm p-6">
            <span className="absolute -top-3 left-4 rounded-full bg-primary px-3 py-0.5 text-sm font-medium text-primary-foreground">
              Best Value
            </span>
            <h3 className="mb-2 text-xl font-semibold sm:text-2xl">Lextract</h3>
            <p className="text-sm text-muted-foreground">{comparison.pricing.lextract}</p>
          </div>
          <div className="rounded-xl border bg-card shadow-sm p-6">
            <h3 className="mb-2 text-xl font-semibold sm:text-2xl">
              {comparison.competitor}
            </h3>
            <p className="text-sm text-muted-foreground">
              {comparison.pricing.competitor}
            </p>
          </div>
        </div>
        <div className="mt-4">
          {comparison.pricing.analysis.split('\n\n').map((paragraph, i) => (
            <p key={i} className="mb-3 text-sm text-muted-foreground">
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      {/* Strengths & Weaknesses */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">
          Strengths and Weaknesses
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Lextract */}
          <div>
            <h3 className="mb-3 text-xl font-semibold sm:text-2xl">Lextract</h3>
            <div className="mb-4">
              <h4 className="mb-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                Strengths
              </h4>
              <ul className="space-y-1">
                {comparison.strengths.lextract.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1 text-emerald-600" aria-hidden="true">+</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium text-rose-700 dark:text-rose-400">
                Weaknesses
              </h4>
              <ul className="space-y-1">
                {comparison.weaknesses.lextract.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1 text-rose-600" aria-hidden="true">-</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {/* Competitor */}
          <div>
            <h3 className="mb-3 text-xl font-semibold sm:text-2xl">
              {comparison.competitor}
            </h3>
            <div className="mb-4">
              <h4 className="mb-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                Strengths
              </h4>
              <ul className="space-y-1">
                {comparison.strengths.competitor.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1 text-emerald-600" aria-hidden="true">+</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium text-rose-700 dark:text-rose-400">
                Weaknesses
              </h4>
              <ul className="space-y-1">
                {comparison.weaknesses.competitor.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1 text-rose-600" aria-hidden="true">-</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Best For */}
      {/* "Recommended" and "Best Value" badges are intentionally unconditional - this is
          Lextract's own marketing site and Lextract is the recommended choice on every page.
          The winner callout banner above IS conditional as a data-driven trust signal. */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Who Should Use Each</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="relative rounded-xl border-2 border-primary bg-primary/5 shadow-sm p-6">
            <span className="absolute -top-3 left-4 rounded-full bg-primary px-3 py-0.5 text-sm font-medium text-primary-foreground">
              Recommended
            </span>
            <h3 className="mb-2 text-xl font-semibold sm:text-2xl">
              Choose Lextract if...
            </h3>
            <p className="text-sm text-muted-foreground">{comparison.bestFor.lextract}</p>
          </div>
          <div className="rounded-xl border bg-card shadow-sm p-6">
            <h3 className="mb-2 text-xl font-semibold sm:text-2xl">
              Choose {comparison.competitor} if...
            </h3>
            <p className="text-sm text-muted-foreground">
              {comparison.bestFor.competitor}
            </p>
          </div>
        </div>
      </section>

      {/* Verdict */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">The Verdict</h2>
        {comparison.verdict.split('\n\n').map((paragraph, i) => (
          <p key={i} className="mb-4 text-muted-foreground">
            {paragraph}
          </p>
        ))}
      </section>

      {/* Source/Accuracy Disclaimer */}
      <section className="mb-12 rounded-md border border-muted bg-muted/40 p-4">
        <p className="text-sm text-muted-foreground">
          <strong>About this comparison.</strong> Pricing, feature, and capability claims about
          {' '}{comparison.competitor} on this page are based on publicly available product pages,
          documentation, and marketing materials at the time of writing. Vendors change pricing
          and features without notice - confirm current details on
          {comparison.competitorUrl ? (
            <>
              {' '}
              <a
                href={comparison.competitorUrl}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="underline"
              >
                {comparison.competitor}&apos;s own site
              </a>
            </>
          ) : (
            <>{' '}the vendor&apos;s own site</>
          )}{' '}
          before purchasing. Lextract claims (126 fields, $15/lease, 5–15 minute processing, 20
          red-flag checks, per-field confidence scores) reflect Lextract&apos;s current product
          and pricing.
        </p>
      </section>

      {/* Why Lextract */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">
          Why Teams Choose Lextract
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link
            href="/fields"
            className="group rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:bg-muted/50 sm:p-6"
          >
            <p className="font-medium group-hover:text-primary transition-colors">126 Extracted Fields</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Every field from parties to parking, fully structured.
            </p>
          </Link>
          <Link
            href="/red-flags"
            className="group rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:bg-muted/50 sm:p-6"
          >
            <p className="font-medium group-hover:text-primary transition-colors">20 Red Flag Rules</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Automatic detection of risky clauses and missing protections.
            </p>
          </Link>
          <Link
            href="/use-cases"
            className="group rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:bg-muted/50 sm:p-6"
          >
            <p className="font-medium group-hover:text-primary transition-colors">Built for Real Workflows</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Due diligence, renewals, portfolio acquisitions, and more.
            </p>
          </Link>
        </div>
      </section>

      <RelatedContent items={relatedArticles} heading="Related Articles" />

      <CrossVerticalLinks crossLinks={crossLinks} />

      <SeoFunnelLinks routeHref={`/resources/comparisons/${comparison.competitorSlug}`} />

      {/* Bottom Line */}
      <section className="mb-12 rounded-xl border-2 border-primary/20 bg-primary/5 p-8">
        <h2 className="mb-3 text-2xl font-bold sm:text-3xl lg:text-4xl">The Bottom Line</h2>
        <p className="text-muted-foreground">
          For CRE professionals who need structured, reliable lease data at scale, Lextract
          delivers more value per dollar than {comparison.competitor}. With 126 curated fields,
          per-field confidence scores, automated red flag detection, and exports ready for your
          property management system, Lextract turns lease PDFs into actionable data in 5-15
          minutes for $15 per lease.
        </p>
      </section>

      {/* FAQ */}
      <section className="mb-12">
        <h2 className="mb-6 text-2xl font-bold sm:text-3xl lg:text-4xl">Frequently Asked Questions</h2>
        <div className="space-y-6">
          {comparisonFaqs.map((faq, i) => (
            <div key={i}>
              <h3 className="mb-2 text-xl font-semibold sm:text-2xl">{faq.question}</h3>
              <p className="text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <ContentCta
        heading="Try Lextract on your next lease"
        description="Upload a commercial lease PDF and get 126 structured fields extracted in 5-15 minutes. $15 per lease, no subscription required."
      />
      </div>
    </div>
  )
}
