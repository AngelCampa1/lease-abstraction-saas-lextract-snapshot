import type { Metadata } from 'next'
import Link from 'next/link'
import { Library } from 'lucide-react'
import { ContentCard } from '@/components/content/content-card'
import { SITE_URL, DEFAULT_OG_IMAGE } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/json-ld'
import { buildBreadcrumbSchema, buildCollectionPageSchema, buildFAQPageSchema } from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { ContentCta } from '@/components/content/content-cta'
import { FaqSection } from '@/components/marketing/faq-section'
import { getAllContent } from '@/lib/content'
import { getResourceHubChildren, getResourceHubSections } from '@/lib/resource-hubs'

export const metadata: Metadata = {
  title: 'Commercial Lease Resources - Articles, Guides & Reference',
  description:
    'Articles, guides, and reference material for commercial real estate professionals. Learn about lease abstraction, CAM reconciliation, and property management.',
  alternates: { canonical: `${SITE_URL}/resources` },
  openGraph: {
    url: `${SITE_URL}/resources`,
    title: 'Commercial Lease Resources - Articles, Guides & Reference | Lextract',
    description:
      'Articles, guides, and reference material for commercial real estate professionals.',
    type: 'website',
    images: [DEFAULT_OG_IMAGE],
  },
}

const FAQ_ITEMS = [
  {
    question: 'What types of resources does Lextract offer?',
    answer:
      'Lextract\'s resource library covers lease abstraction in several formats. These include how-to articles, reference guides, a commercial real estate glossary, priority extraction fields, red flag explanations, and lease clause breakdowns. There are also sections organized by professional role, lease type, property type, and market.',
  },
  {
    question: 'Are Lextract\'s guides free to access?',
    answer:
      'Yes. All articles, guides, glossary entries, field definitions, and reference pages are free. No account is required. The paid product is lease extraction itself, priced at $15 per lease. The resource library is here to help CRE professionals make better decisions about lease data, whether or not they use Lextract.',
  },
  {
    question: 'How often is the resource library updated?',
    answer:
      'The library is updated on an ongoing basis as new lease structures, market conditions, and platform features emerge. Guides and articles carry publication dates so you can tell when content was last reviewed. The extraction field list reflects the current 126-field schema used in production.',
  },
  {
    question: 'Can I use Lextract articles in my own publications?',
    answer:
      'Short excerpts with attribution and a link back to the original article are acceptable for commentary or educational purposes. Reproducing full articles without permission is not permitted. For licensing or partnership inquiries, email angel.campa@lextract.io.',
  },
]

export default async function ResourcesPage() {
  const allArticles = await getAllContent('articles')
  const allGuides = await getAllContent('guides')
  const latestArticles = allArticles.slice(0, 3)
  const latestGuides = allGuides.slice(0, 3)
  const resourceHubSections = getResourceHubSections()

  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Resources', url: `${SITE_URL}/resources` },
  ]

  const collectionPageSchema = buildCollectionPageSchema({
    name: 'Lextract Resources',
    description:
      'Articles, guides, and reference material for commercial real estate professionals covering lease abstraction, CAM reconciliation, and property management.',
    url: `${SITE_URL}/resources`,
    parts: [
      { name: 'Commercial Lease Glossary', url: `${SITE_URL}/glossary`, description: 'Plain-English definitions of the highest-value commercial lease terms.' },
      { name: 'Extraction Fields', url: `${SITE_URL}/fields`, description: 'Priority lease fields for abstraction, audit, and import workflows.' },
      { name: 'Red Flags', url: `${SITE_URL}/red-flags`, description: 'Automated checks for the lease provisions most likely to create risk.' },
      { name: 'Lease Clauses', url: `${SITE_URL}/clauses`, description: 'Negotiation and review guidance for the clauses worth reviewing first.' },
      { name: 'Articles', url: `${SITE_URL}/resources/articles`, description: 'How-to articles on lease abstraction, CAM reconciliation, and CRE workflows.' },
      { name: 'Guides', url: `${SITE_URL}/resources/guides`, description: 'Deep reference guides on lease abstraction, CAM audit rights, and portfolio management.' },
      { name: 'Comparisons', url: `${SITE_URL}/resources/comparisons`, description: 'Lextract vs. LeaseLens, Prophia, Leverton, Kira Systems, and 25+ other tools.' },
      { name: 'State Lease Law', url: `${SITE_URL}/resources/states`, description: 'Commercial lease law summaries for all 50 US states.' },
      { name: 'City Markets', url: `${SITE_URL}/locations`, description: 'Lease abstraction context for curated high-priority US commercial markets.' },
    ],
  })

  return (
    <>
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={collectionPageSchema} />
      <JsonLd schema={buildFAQPageSchema(FAQ_ITEMS)} />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Resources' },
          ]}
        />

        <header className="mb-16 mt-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-sm font-medium text-primary">
            <Library className="size-3.5" aria-hidden="true" />
            Articles, Guides &amp; Reference
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Resources
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg lg:text-xl">
            Practical guides and articles for commercial real estate
            professionals. The goal is simple. Give you the information you need
            to make better decisions about lease data.
          </p>
        </header>

        <section className="mb-16">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold sm:text-3xl">Articles</h2>
            <Link
              href="/resources/articles"
              className="inline-flex min-h-[44px] items-center py-2 text-sm font-medium text-primary hover:underline"
            >
              View all articles
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {latestArticles.map((article) => (
              <ContentCard key={article.slug} content={article} />
            ))}
          </div>
        </section>

        <section className="mb-16">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold sm:text-3xl">Guides</h2>
            <Link
              href="/resources/guides"
              className="inline-flex min-h-[44px] items-center py-2 text-sm font-medium text-primary hover:underline"
            >
              View all guides
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {latestGuides.map((guide) => (
              <ContentCard key={guide.slug} content={guide} />
            ))}
          </div>
        </section>

        {resourceHubSections.map((section) => (
          <section key={section.heading} className="mb-16">
            <h2 className="mb-6 text-2xl font-bold sm:text-3xl">{section.heading}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.hubs.map((resource) => {
                const resourceCount = getResourceHubChildren(resource.href).length

                return (
                <Link
                  key={resource.href}
                  href={resource.href}
                  className="group rounded-xl border bg-card p-5 shadow-sm transition-all hover:border-primary/30 hover:bg-muted/50 hover:shadow-md sm:p-6"
                >
                  <h3 className="mb-2 font-semibold transition-colors group-hover:text-primary">
                    {resource.label}
                  </h3>
                  <p className="text-sm text-muted-foreground">{resource.description}</p>
                  <p className="mt-4 text-xs font-medium uppercase tracking-wider text-primary">
                    {resourceCount} resources
                  </p>
                </Link>
                )
              })}
            </div>
          </section>
        ))}

        <FaqSection items={FAQ_ITEMS} />

        <ContentCta
          heading="Extract any commercial lease in minutes"
          description="Upload a lease PDF and get 126 structured fields in 5 to 15 minutes. That includes rent, CAM, escalations, and red flags. Just $15 per lease."
        />
      </div>
    </>
  )
}
