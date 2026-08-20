import type { Metadata } from 'next'
import { Newspaper } from 'lucide-react'
import { ContentCard } from '@/components/content/content-card'
import { SITE_URL, DEFAULT_OG_IMAGE } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/json-ld'
import { buildBreadcrumbSchema, buildFAQPageSchema } from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { ResourceHubDirectory } from '@/components/content/resource-hub-directory'
import { ContentCta } from '@/components/content/content-cta'
import { BrowseVerticals } from '@/components/content/browse-verticals'
import { FaqSection } from '@/components/marketing/faq-section'
import { getAllContent } from '@/lib/content'

const FAQ_ITEMS = [
  {
    question: 'What topics does the Lextract article library cover?',
    answer:
      'The article library covers commercial lease abstraction fundamentals, red flag identification, CAM reconciliation, specific lease types (NNN, gross, modified gross), FASB ASC 842 compliance, due diligence workflows, and lease negotiation tactics. New articles are added regularly as lease-related topics and questions emerge from the Lextract user community.',
  },
  {
    question: 'Are Lextract articles written by industry experts?',
    answer:
      'Yes. All articles are written by professionals with direct experience in commercial real estate, lease administration, and CRE technology. Content is reviewed for accuracy against current lease law and market practice before publication.',
  },
  {
    question: 'How often are new articles published?',
    answer:
      'New articles are published on a rolling basis as new topics are identified. The library currently covers the most common questions and pain points in commercial lease abstraction and will expand to cover emerging topics in CRE technology, compliance, and market-specific lease practices.',
  },
  {
    question: 'Can I share Lextract articles with my team?',
    answer:
      'Yes - all articles are publicly accessible with no login required. Share the article URL directly, or link to the Lextract article library from your team\'s internal resources. Articles are free to share for educational and reference purposes.',
  },
]

export const metadata: Metadata = {
  title: 'Commercial Lease Articles - Abstraction, CAM & CRE Insights',
  description:
    'Articles about commercial lease abstraction, property management, and CRE technology. Written for tenant reps, brokers, and property managers.',
  alternates: { canonical: `${SITE_URL}/resources/articles` },
  openGraph: {
    url: `${SITE_URL}/resources/articles`,
    title: 'Articles',
    description:
      'Articles about commercial lease abstraction, property management, and CRE technology.',
    type: 'website',
    images: [DEFAULT_OG_IMAGE],
  },
}

export default async function ArticlesPage() {
  const articles = await getAllContent('articles')
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Resources', url: `${SITE_URL}/resources` },
    { name: 'Articles', url: `${SITE_URL}/resources/articles` },
  ]

  return (
    <>
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(FAQ_ITEMS)} />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Resources', href: '/resources' },
            { label: 'Articles' },
          ]}
        />

        <header className="mb-12 mt-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-sm font-medium text-primary">
            <Newspaper className="size-3.5" aria-hidden="true" />
            Articles
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Articles
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg lg:text-xl">
            Practical insights on commercial lease abstraction, red flags, cost
            analysis, and property management best practices.
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ContentCard key={article.slug} content={article} />
          ))}
        </div>

        <FaqSection items={FAQ_ITEMS} />

        <ContentCta
          heading="Ready to stop reading and start extracting?"
          description="Upload a commercial lease PDF and get 126 structured fields extracted with AI-powered accuracy. Just $15 per lease."
        />
        <ResourceHubDirectory hubHref="/resources/articles" />


        <BrowseVerticals current="articles" />
      </div>
    </>
  )
}
