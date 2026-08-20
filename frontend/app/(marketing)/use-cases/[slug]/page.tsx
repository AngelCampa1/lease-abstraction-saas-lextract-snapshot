import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getUseCaseBySlug, getAllUseCaseSlugs } from '@/data/use-cases'
import { RED_FLAG_BY_ID } from '@/data/red-flags'
import { getFieldBySlug } from '@/data/fields'
import { SITE_URL, DEFAULT_OG_IMAGE } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/json-ld'
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildFAQPageSchema,
  buildHowToSchema,
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

interface UseCasePageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllUseCaseSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: UseCasePageProps): Promise<Metadata> {
  const { slug } = await params
  const useCase = getUseCaseBySlug(slug)

  if (!useCase) {
    return { title: 'Use Case Not Found' }
  }

  return {
    title: useCase.metaTitle,
    description: useCase.metaDescription,
    alternates: {
      canonical: `${SITE_URL}/use-cases/${useCase.slug}`,
    },
    openGraph: {
      url: `${SITE_URL}/use-cases/${useCase.slug}`,
      title: useCase.metaTitle,
      description: useCase.metaDescription,
      type: 'article',
      images: [DEFAULT_OG_IMAGE],
    },
  }
}

export default async function UseCasePage({ params }: UseCasePageProps) {
  const { slug } = await params
  const useCase = getUseCaseBySlug(slug)

  if (!useCase) {
    notFound()
  }

  const allContent = await getAllContentItems()
  const relatedArticles = getRelatedContentForPseo(allContent, 'use-cases', [useCase.name])
  const crossLinks = getSmartCrossLinks('use-cases', [useCase.name, ...useCase.criticalFields.slice(0, 3)])

  const pageUrl = `${SITE_URL}/use-cases/${useCase.slug}`
  const publishedDate = '2026-03-18'
  const modifiedDate = '2026-03-18'

  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Use Cases', url: `${SITE_URL}/use-cases` },
    { name: useCase.name, url: pageUrl },
  ]

  return (
    <>
      <JsonLd
        schema={buildArticleSchema({
          headline: `Lease Abstraction for ${useCase.name}`,
          description: useCase.metaDescription,
          url: pageUrl,
          datePublished: publishedDate,
          dateModified: modifiedDate,
          author: 'Angel Campa, Founder',
        })}
      />
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(useCase.faqs)} />
      <JsonLd
        schema={buildHowToSchema({
          name: `How to use Lextract for ${useCase.name}`,
          steps: useCase.workflowSteps.map((s) => ({
            name: s.name,
            text: s.description,
          })),
        })}
      />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Use Cases', href: '/use-cases' },
            { label: useCase.name },
          ]}
        />

        <header className="mb-10 mt-6">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {useCase.name}: Faster with AI Lease Abstraction
          </h1>
          <p className="mt-4 text-base sm:text-lg lg:text-xl text-muted-foreground">
            {useCase.metaDescription}
          </p>
          <LastUpdated date="2026-03-17" />
          <AuthorByline />
        </header>

        {/* The Problem */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold">The Problem</h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            {useCase.problem}
          </p>
        </section>

        {/* How Lextract Helps */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold">How Lextract Helps</h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            {useCase.solution}
          </p>
        </section>

        {/* Time Savings */}
        <section className="mb-10">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-5 sm:p-6 text-center shadow-sm">
              <p className="text-sm text-muted-foreground">Manual Process</p>
              <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
                {useCase.timeSaving.manual}
              </p>
            </div>
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 sm:p-6 text-center shadow-sm">
              <p className="text-sm text-muted-foreground">With Lextract</p>
              <p className="mt-1 text-2xl font-bold text-primary">
                {useCase.timeSaving.lextract}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-5 sm:p-6 text-center shadow-sm">
              <p className="text-sm text-muted-foreground">Time Saved</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {useCase.timeSaving.savings}
              </p>
            </div>
          </div>
        </section>

        {/* Workflow Steps */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold">Step-by-Step Workflow</h2>
          <div className="space-y-4">
            {useCase.workflowSteps.map((step, index) => (
              <div key={`step-${index}`} className="flex gap-4">
                <div aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {index + 1}
                </div>
                <div>
                  <p className="font-semibold">{step.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Critical Fields */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold">Critical Fields for {useCase.name}</h2>
          <div className="flex flex-wrap gap-2">
            {useCase.criticalFields.map((rawSlug) => {
              // use-cases data uses underscores; normalize to hyphens for lookup
              const fieldSlug = rawSlug.replace(/_/g, '-')
              const fieldExists = !!getFieldBySlug(fieldSlug)
              const label = fieldSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
              return fieldExists ? (
                <Link
                  key={rawSlug}
                  href={`/fields/${fieldSlug}`}
                  className="inline-flex items-center rounded-xl border bg-card px-3 py-2 text-sm shadow-sm transition-all hover:bg-primary/10 hover:text-primary hover:shadow-md"
                >
                  {label}
                </Link>
              ) : (
                <span
                  key={rawSlug}
                  className="inline-flex items-center rounded-xl border bg-card px-3 py-2 text-sm shadow-sm"
                >
                  {label}
                </span>
              )
            })}
          </div>
        </section>

        {/* Red Flags */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold">Red Flags to Watch</h2>
          <div className="space-y-3">
            {useCase.relevantRedFlags.map((rfId) => {
              const rf = RED_FLAG_BY_ID[rfId]
              if (!rf) return null
              return (
                <Link
                  key={rfId}
                  href={`/red-flags/${rf.slug}`}
                  className="group flex items-center gap-3 rounded-xl border bg-card p-5 sm:p-6 shadow-sm transition-all hover:bg-muted/50 hover:shadow-md"
                >
                  <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold uppercase ${
                    rf.severity === 'high'
                      ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                      : rf.severity === 'medium'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  }`}>
                    {rf.severity}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">{rfId}</span>
                  <span className="font-medium">{rf.name}</span>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Who Uses This */}
        {useCase.relevantPersonas.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold">Who Uses This</h2>
            <div className="flex flex-wrap gap-2">
              {useCase.relevantPersonas.map((personaSlug) => (
                <Link
                  key={personaSlug}
                  href={`/for/${personaSlug}`}
                  className="inline-flex items-center rounded-xl border bg-card px-3 py-2 text-sm shadow-sm transition-all hover:bg-primary/10 hover:text-primary hover:shadow-md"
                >
                  {personaSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Related Use Cases */}
        {useCase.relatedUseCases.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold">Related Use Cases</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {useCase.relatedUseCases.map((ucSlug) => (
                <Link
                  key={ucSlug}
                  href={`/use-cases/${ucSlug}`}
                  className="group rounded-xl border bg-card p-5 sm:p-6 shadow-sm transition-all hover:bg-muted/50 hover:shadow-md"
                >
                  <p className="font-medium group-hover:text-primary transition-colors">
                    {ucSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
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
            {useCase.faqs.map((faq, index) => (
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

        <CrossSiteCallout tags={[useCase.name, ...useCase.criticalFields.slice(0, 3)]} />

        <SeoFunnelLinks routeHref={`/use-cases/${useCase.slug}`} />

        <ContentCta
          heading={`Start your ${useCase.name.toLowerCase()} with Lextract`}
          description={`Upload your lease PDF and get 126 structured fields extracted in minutes. Perfect for ${useCase.name.toLowerCase()}. Just $15 per lease.`}
          buttonText="Upload Your Lease"
          href="/upload"
        />
      </div>
    </>
  )
}
