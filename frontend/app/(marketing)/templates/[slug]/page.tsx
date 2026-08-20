import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTemplateBySlug, getAllTemplateSlugs, getLiveTemplates, TEMPLATES_PUBLISHED_AT } from '@/data/templates'
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
import { CrossSiteCallout } from '@/components/content/cross-site-callout'
import { SeoFunnelLinks } from '@/components/content/seo-funnel-links'
import { getAllContentItems, getRelatedContentForPseo, getSmartCrossLinks } from '@/lib/content-matching'
import { LeadMagnetGate } from '@/components/marketing/lead-magnet-gate'
import { PRICING, formatPrice } from '@/lib/pricing'

interface TemplatePageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllTemplateSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: TemplatePageProps): Promise<Metadata> {
  const { slug } = await params
  const template = getTemplateBySlug(slug)

  if (!template) {
    return { title: 'Template Not Found' }
  }

  return {
    title: template.metaTitle,
    description: template.metaDescription,
    alternates: {
      canonical: `${SITE_URL}/templates/${template.slug}`,
    },
    openGraph: {
      url: `${SITE_URL}/templates/${template.slug}`,
      title: template.metaTitle,
      description: template.metaDescription,
      type: 'article',
      images: [DEFAULT_OG_IMAGE],
    },
  }
}

// ---------------------------------------------------------------------------
// Lead magnet gate config
// ---------------------------------------------------------------------------

const GATED_SLUGS = new Set(getLiveTemplates().map((t) => t.slug))


const CATEGORY_LABELS: Record<string, string> = {
  abstraction: 'Abstraction',
  'due-diligence': 'Due Diligence',
  cam: 'CAM',
  compliance: 'Compliance',
  administration: 'Administration',
}

const CATEGORY_STYLES: Record<string, string> = {
  abstraction: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  'due-diligence': 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
  cam: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  compliance: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  administration: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
}

export default async function TemplatePage({ params }: TemplatePageProps) {
  const { slug } = await params
  const template = getTemplateBySlug(slug)

  if (!template) {
    notFound()
  }

  const allContent = await getAllContentItems()
  const keywords = [template.name, template.category, ...template.relatedFields.slice(0, 3)]
  const relatedArticles = getRelatedContentForPseo(allContent, 'templates', keywords)
  const crossLinks = getSmartCrossLinks('templates', keywords)

  const pageUrl = `${SITE_URL}/templates/${template.slug}`
  const publishedDate = TEMPLATES_PUBLISHED_AT
  const modifiedDate = TEMPLATES_PUBLISHED_AT

  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Templates', url: `${SITE_URL}/templates` },
    { name: template.name, url: pageUrl },
  ]

  return (
    <>
      <JsonLd
        schema={buildArticleSchema({
          headline: template.name,
          description: template.metaDescription,
          url: pageUrl,
          datePublished: publishedDate,
          dateModified: modifiedDate,
          author: 'Angel Campa, Founder',
        })}
      />
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(template.faqs)} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Templates', href: '/templates' },
            { label: template.name },
          ]}
        />

        <LastUpdated date="2026-03-17" />
        <AuthorByline />

        <header className="mb-8 mt-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-md px-3 py-1 text-xs font-medium ${CATEGORY_STYLES[template.category]}`}
            >
              {CATEGORY_LABELS[template.category]}
            </span>
            <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
              {template.downloadableFormat}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {template.name}
          </h1>
          <p className="mt-4 text-base sm:text-lg lg:text-xl text-muted-foreground">
            {template.description}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            By Angel Campa, Founder &middot; Updated March 2026
          </p>
        </header>

        {/* Use Case */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold">Who Uses This &amp; When</h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            {template.useCase}
          </p>
        </section>

        {/* Checklist Items */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold">
            Checklist Items ({template.keyItems.length})
          </h2>
          <ol className="space-y-3">
            {template.keyItems.map((item, index) => (
              <li
                key={`item-${index}`}
                className="flex gap-4 rounded-xl border bg-card p-5 sm:p-6 shadow-sm"
              >
                <span aria-hidden="true" className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {index + 1}
                </span>
                <span className="text-base leading-relaxed">{item}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Related Fields */}
        {template.relatedFields.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold">Related Lease Fields</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Lextract automatically extracts these fields from your lease PDF - eliminating
              the manual data collection underlying this checklist.
            </p>
            <div className="flex flex-wrap gap-2">
              {template.relatedFields.map((fieldSlug) => (
                <Link
                  key={fieldSlug}
                  href={`/fields/${fieldSlug}`}
                  className="inline-flex items-center rounded-full border px-3 py-1 text-sm transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  {fieldSlug
                    .replace(/-/g, ' ')
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        {template.faqs.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {template.faqs.map((faq, index) => (
                <div key={`faq-${index}`}>
                  <h3 className="mb-2 text-xl sm:text-2xl font-semibold">{faq.question}</h3>
                  <p className="text-base leading-relaxed text-muted-foreground">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related Templates */}
        {template.relatedTemplates && template.relatedTemplates.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold">Related Templates</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {template.relatedTemplates.map((tSlug) => (
                <Link
                  key={tSlug}
                  href={`/templates/${tSlug}`}
                  className="group rounded-xl border bg-card p-5 sm:p-6 shadow-sm transition-all hover:shadow-md"
                >
                  <p className="font-medium group-hover:text-primary transition-colors">
                    {tSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <RelatedContent items={relatedArticles} heading="Related Articles" />

        <CrossVerticalLinks crossLinks={crossLinks} />

        <CrossSiteCallout tags={[template.name, template.category]} />

        <SeoFunnelLinks routeHref={`/templates/${template.slug}`} />

        {GATED_SLUGS.has(template.slug) ? (
          <LeadMagnetGate
            magnetSlug={template.slug}
            magnetName={template.name}
            fileFormat={template.fileFormat ?? 'PDF'}
            description={template.description}
          />
        ) : (
          <ContentCta
            heading="Extract this data automatically with Lextract"
            description="Instead of working through this checklist manually, upload your lease PDF and get all 126 fields extracted in 5-15 minutes. Just $15 per lease - no subscription required."
            buttonText={`Extract My Lease - ${formatPrice(PRICING.single.price)}`}
            href="/upload"
          />
        )}
      </div>
    </>
  )
}
