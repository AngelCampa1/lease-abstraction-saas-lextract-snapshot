import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPersonaBySlug, getAllPersonaSlugs } from '@/data/personas'
import { RED_FLAG_BY_ID } from '@/data/red-flags'
import { getFieldBySlug } from '@/data/fields'
import { SITE_URL } from '@/lib/site-config'
import { buildIndexableMarketingMetadata } from '@/lib/seo-metadata'
import { JsonLd } from '@/components/seo/json-ld'
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildFAQPageSchema,
  buildSpeakableSchema,
} from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { LastUpdated } from '@/components/content/last-updated'
import { AuthorByline } from '@/components/content/author-byline'
import { ContentCta } from '@/components/content/content-cta'
import { RelatedContent } from '@/components/content/related-content'
import { CrossVerticalLinks } from '@/components/content/cross-vertical-links'
import { getAllContentItems, getRelatedContentForPseo, getSmartCrossLinks } from '@/lib/content-matching'
import { CrossSiteCallout } from '@/components/content/cross-site-callout'
import { SeoFunnelLinks } from '@/components/content/seo-funnel-links'

const TENANT_PERSONAS = ['tenant-representatives']
const LANDLORD_PERSONAS = [
  'property-managers',
  'asset-managers',
  'portfolio-managers',
  'lease-administrators',
]

interface PersonaPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllPersonaSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: PersonaPageProps): Promise<Metadata> {
  const { slug } = await params
  const persona = getPersonaBySlug(slug)

  if (!persona) {
    return { title: 'Page Not Found' }
  }

  return buildIndexableMarketingMetadata({
    title: persona.metaTitle,
    description: persona.metaDescription,
    path: `/for/${persona.slug}`,
    type: 'article',
  })
}

export default async function PersonaPage({ params }: PersonaPageProps) {
  const { slug } = await params
  const persona = getPersonaBySlug(slug)

  if (!persona) {
    notFound()
  }

  const allContent = await getAllContentItems()
  const keywords = [persona.role, persona.shortTitle, ...persona.relatedUseCases]
  const relatedArticles = getRelatedContentForPseo(allContent, 'personas', keywords)
  const crossLinks = getSmartCrossLinks('personas', keywords)

  const personaAudience: 'tenant' | 'landlord' | undefined =
    TENANT_PERSONAS.includes(persona.slug)
      ? 'tenant'
      : LANDLORD_PERSONAS.includes(persona.slug)
        ? 'landlord'
        : undefined

  const pageUrl = `${SITE_URL}/for/${persona.slug}`
  const publishedDate = '2026-03-18'
  const modifiedDate = '2026-03-18'

  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Who It\'s For', url: `${SITE_URL}/for` },
    { name: `For ${persona.shortTitle}`, url: pageUrl },
  ]

  return (
    <>
      <JsonLd
        schema={buildArticleSchema({
          headline: `Lease Abstraction for ${persona.role}`,
          description: persona.metaDescription,
          url: pageUrl,
          datePublished: publishedDate,
          dateModified: modifiedDate,
          author: 'Angel Campa, Founder',
        })}
      />
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(persona.faqs)} />
      <JsonLd
        schema={buildSpeakableSchema(pageUrl, [
          'h1',
          '.persona-hero-subhead',
          '.persona-outcomes li',
        ])}
      />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Who It\'s For', href: '/for' },
            { label: `For ${persona.shortTitle}` },
          ]}
        />

        <LastUpdated date="2026-03-18" />
        <AuthorByline />

        <header className="mb-10 mt-6">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Lease Abstraction Built for {persona.role}
          </h1>
          <p className="persona-hero-subhead mt-4 text-base sm:text-lg lg:text-xl text-muted-foreground">
            {persona.heroSubhead}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            By{' '}
            <a href="/about/angel-campa" className="underline-offset-4 hover:underline">
              Angel Campa, Founder
            </a>{' '}
            &middot; Updated March 2026
          </p>
        </header>

        {/* ROI Stat + Outcomes */}
        <section className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col justify-center rounded-2xl border bg-card p-6 shadow-sm">
            <p className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">
              {persona.roiStat.value}
            </p>
            <p className="mt-2 text-base font-semibold">{persona.roiStat.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{persona.roiStat.detail}</p>
          </div>
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-2xl sm:text-3xl font-bold">What You Get</h2>
            <ul className="persona-outcomes grid grid-cols-1 gap-3 sm:grid-cols-2">
              {persona.outcomes.map((outcome, index) => (
                <li key={`outcome-${index}`} className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
                  >
                    ✓
                  </span>
                  <span className="text-sm leading-relaxed">{outcome}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* The Challenge */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold">The Challenge</h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            {persona.challenge}
          </p>
        </section>

        {/* How Lextract Solves It */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold">How Lextract Solves It</h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            {persona.solution}
          </p>
        </section>

        {/* Workflow */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold">Your Workflow with Lextract</h2>
          <div className="space-y-4">
            {persona.workflowSteps.map((step, index) => (
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

        {/* Key Fields */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold">Fields That Matter Most to {persona.shortTitle}</h2>
          <div className="flex flex-wrap gap-2">
            {persona.keyFields.map((rawSlug) => {
              const fieldSlug = rawSlug.replace(/_/g, '-')
              const fieldExists = !!getFieldBySlug(fieldSlug)
              const label = fieldSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
              return fieldExists ? (
                <Link
                  key={rawSlug}
                  href={`/fields/${fieldSlug}`}
                  className="inline-flex min-h-[44px] items-center rounded-xl border bg-card px-3 py-2 text-sm shadow-sm transition-all hover:bg-primary/10 hover:text-primary hover:shadow-md"
                >
                  {label}
                </Link>
              ) : (
                <span
                  key={rawSlug}
                  className="inline-flex min-h-[44px] items-center rounded-xl border bg-card px-3 py-2 text-sm shadow-sm"
                >
                  {label}
                </span>
              )
            })}
          </div>
        </section>

        {/* Red Flags to Watch */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold">Red Flags {persona.shortTitle} Should Watch</h2>
          <div className="space-y-3">
            {persona.relevantRedFlags.map((rfId) => {
              const rf = RED_FLAG_BY_ID[rfId]
              if (!rf) return null
              return (
                <Link
                  key={rfId}
                  href={`/red-flags/${rf.slug}`}
                  className="group flex items-center gap-3 rounded-xl border bg-card p-5 sm:p-6 shadow-sm transition-all hover:bg-muted/50 hover:shadow-md"
                >
                  <span className={`inline-flex items-center rounded px-2 py-0.5 text-sm font-bold uppercase ${
                    rf.severity === 'high'
                      ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                      : rf.severity === 'medium'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  }`}>
                    {rf.severity}
                  </span>
                  <span className="text-sm font-mono text-muted-foreground">{rfId}</span>
                  <span className="font-medium">{rf.name}</span>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Related Use Cases */}
        {persona.relatedUseCases.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold">Common Use Cases</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {persona.relatedUseCases.map((ucSlug) => (
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
            {persona.faqs.map((faq, index) => (
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

        <SeoFunnelLinks routeHref={`/for/${persona.slug}`} />

        <CrossSiteCallout audience={personaAudience} />

        <ContentCta
          heading={`Ready to save hours on lease abstraction?`}
          description={`Upload your lease PDF and get 126 structured fields extracted in minutes. Built for ${persona.role.toLowerCase()}. Just $15 per lease.`}
          buttonText="Upload Your Lease"
          href="/upload"
        />
      </div>
    </>
  )
}
