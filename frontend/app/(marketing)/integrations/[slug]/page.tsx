import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import {
  getIndexableIntegrationBySlug,
  getAllIndexableIntegrationSlugs,
  getIntegrationSeoRedirect,
  INTEGRATIONS_PUBLISHED_AT,
} from '@/data/integrations'
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
import { resolveFieldHref } from '@/lib/pseo-paths'

interface IntegrationPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllIndexableIntegrationSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: IntegrationPageProps): Promise<Metadata> {
  const { slug } = await params
  const integration = getIndexableIntegrationBySlug(slug)

  if (!integration) {
    const redirectTarget = getIntegrationSeoRedirect(slug)
    if (redirectTarget) permanentRedirect(redirectTarget)
    return { title: 'Integration Not Found' }
  }

  return {
    title: integration.metaTitle,
    description: integration.metaDescription,
    alternates: {
      canonical: `${SITE_URL}/integrations/${integration.slug}`,
    },
    openGraph: {
      url: `${SITE_URL}/integrations/${integration.slug}`,
      title: integration.metaTitle,
      description: integration.metaDescription,
      type: 'article',
      images: [DEFAULT_OG_IMAGE],
    },
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  'property-management': 'Property Management',
  'lease-management': 'Lease Management',
  'investment-management': 'Investment Management',
  accounting: 'Accounting',
  analytics: 'Analytics',
  spreadsheets: 'Spreadsheets',
  'document-management': 'Document Management',
  legal: 'Legal',
  'crm-data': 'CRE Data & Research',
  compliance: 'Compliance',
  productivity: 'Productivity',
}

const CATEGORY_STYLES: Record<string, string> = {
  'property-management': 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  'lease-management': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  'investment-management': 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
  accounting: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  analytics: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
  spreadsheets: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  'document-management': 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  legal: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
  'crm-data': 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
  compliance: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  productivity: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
}

export default async function IntegrationPage({ params }: IntegrationPageProps) {
  const { slug } = await params
  const integration = getIndexableIntegrationBySlug(slug)

  if (!integration) {
    const redirectTarget = getIntegrationSeoRedirect(slug)
    if (redirectTarget) permanentRedirect(redirectTarget)
    notFound()
  }

  const allContent = await getAllContentItems()
  const keywords = [integration.software, integration.vendor, ...integration.criticalFields.slice(0, 3)]
  const relatedArticles = getRelatedContentForPseo(allContent, 'integrations', keywords)
  const crossLinks = getSmartCrossLinks('integrations', keywords)

  const pageUrl = `${SITE_URL}/integrations/${integration.slug}`
  const publishedDate = INTEGRATIONS_PUBLISHED_AT
  const modifiedDate = INTEGRATIONS_PUBLISHED_AT

  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Integrations', url: `${SITE_URL}/integrations` },
    { name: integration.software, url: pageUrl },
  ]

  return (
    <>
      <JsonLd
        schema={buildArticleSchema({
          headline: `Lease Abstraction for ${integration.software}`,
          description: integration.metaDescription,
          url: pageUrl,
          datePublished: publishedDate,
          dateModified: modifiedDate,
          author: 'Angel Campa, Founder',
        })}
      />
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(integration.faqs)} />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:py-20 sm:px-6 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Integrations', href: '/integrations' },
            { label: integration.software },
          ]}
        />

        <LastUpdated date="2026-03-17" />
        <AuthorByline />

        <header className="mb-8 mt-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-md px-3 py-1 text-xs font-medium ${CATEGORY_STYLES[integration.category]}`}
            >
              {CATEGORY_LABELS[integration.category]}
            </span>
            <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
              {integration.vendor}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Lease Abstraction for {integration.software}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            By Angel Campa, Founder &middot; Updated March 2026
          </p>
        </header>

        {/* Overview */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">
            About {integration.software}
          </h2>
          <p className="text-base sm:text-lg lg:text-xl leading-relaxed text-muted-foreground">
            {integration.overview}
          </p>
        </section>

        {/* How Lextract Helps */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">How Lextract Helps</h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            {integration.howLextractHelps}
          </p>
        </section>

        {/* Workflow Steps */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">
            Workflow: Extract to Import
          </h2>
          <ol className="space-y-3">
            {integration.workflowSteps.map((step, index) => (
              <li
                key={`step-${index}`}
                className="flex gap-4 rounded-xl border bg-card p-5 sm:p-6 shadow-sm"
              >
                <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {index + 1}
                </span>
                <span className="text-base leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Export Formats */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Supported Export Formats</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Lextract provides the following export formats compatible with{' '}
            {integration.software}:
          </p>
          <div className="flex flex-wrap gap-2">
            {integration.exportFormats.map((format) => (
              <span
                key={format}
                className="inline-flex items-center rounded-full border bg-muted/50 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary hover:border-primary/30"
              >
                {format}
              </span>
            ))}
          </div>
        </section>

        {/* Critical Fields */}
        {integration.criticalFields.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">
              Critical Fields for {integration.software}
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              These are the highest-priority fields Lextract extracts for{' '}
              {integration.software} users:
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {integration.criticalFields.map((fieldSlug) => {
                const fieldHref = resolveFieldHref(fieldSlug) ?? '/fields'
                return (
                  <Link
                    key={fieldSlug}
                    href={fieldHref}
                    className="group rounded-xl border bg-card p-4 sm:p-5 text-sm shadow-sm transition-all hover:shadow-md hover:bg-muted/50"
                  >
                    <span className="font-medium group-hover:text-primary transition-colors">
                      {fieldSlug
                        .replace(/-/g, ' ')
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* FAQ */}
        {integration.faqs.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {integration.faqs.map((faq, index) => (
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

        {/* Related Integrations */}
        {integration.relatedIntegrations && integration.relatedIntegrations.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Related Integrations</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {integration.relatedIntegrations.map((intSlug) => (
                <Link
                  key={intSlug}
                  href={`/integrations/${intSlug}`}
                  className="group rounded-xl border bg-card p-5 sm:p-6 shadow-sm transition-all hover:shadow-md hover:bg-muted/50"
                >
                  <p className="font-medium group-hover:text-primary transition-colors">
                    {intSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    View integration workflow →
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <RelatedContent items={relatedArticles} heading="Related Articles" />

        <CrossVerticalLinks crossLinks={crossLinks} />

        <SeoFunnelLinks routeHref={`/integrations/${integration.slug}`} />

        <ContentCta
          heading={`Start extracting lease data for ${integration.software}`}
          description={`Upload your lease PDF and get 126 structured fields ready to import into ${integration.software}. Just $15 per lease - no subscription required.`}
          buttonText="Start Extracting - $15/lease"
          href="/upload"
        />
      </div>
    </>
  )
}
