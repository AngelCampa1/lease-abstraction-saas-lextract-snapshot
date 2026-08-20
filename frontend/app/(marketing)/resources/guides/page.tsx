import type { Metadata } from 'next'
import { BookOpen } from 'lucide-react'
import { ContentCard } from '@/components/content/content-card'
import { SITE_URL, DEFAULT_OG_IMAGE } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/json-ld'
import { buildBreadcrumbSchema, buildFAQPageSchema } from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { ResourceHubDirectory } from '@/components/content/resource-hub-directory'
import { ContentCta } from '@/components/content/content-cta'
import { BrowseVerticals } from '@/components/content/browse-verticals'
import { contentFrontmatterSchema } from '@/lib/content-schema'
import guidesRaw from '@/content/guides-index.json'
import { FaqSection } from '@/components/marketing/faq-section'

const guides = guidesRaw.map((item) => contentFrontmatterSchema.parse(item))

const FAQ_ITEMS = [
  {
    question: 'What types of guides does Lextract publish?',
    answer:
      'Lextract publishes in-depth reference guides covering commercial lease abstraction workflows, CAM reconciliation, ASC 842 compliance, lease administration, and financial term interpretation. Each guide is written for CRE professionals who need technical depth, not surface-level overviews.',
  },
  {
    question: 'Are Lextract guides suitable for lease abstraction beginners?',
    answer:
      'Yes. Each guide is structured to be useful at any experience level - beginners will find clear definitions and step-by-step context, while experienced professionals will find detailed coverage of edge cases, calculation methods, and compliance requirements. No prior abstraction experience is assumed.',
  },
  {
    question: 'How is a guide different from an article?',
    answer:
      'Guides are comprehensive reference documents designed for repeated use - covering an entire workflow or topic area in full detail. Articles are shorter, focused pieces on a specific concept or question. Guides are the right starting point when you need to understand a full process; articles answer narrower questions quickly.',
  },
  {
    question: 'Do I need an account to read Lextract guides?',
    answer:
      'No. All guides are publicly available without an account or login. An account is only required when you upload a lease PDF for extraction. Guides are free resources for the commercial real estate community.',
  },
  {
    question: 'Can I download Lextract guides as PDFs?',
    answer:
      'Guides are currently available as web pages optimized for reading and reference. If you need a portable copy, most browsers support printing to PDF directly from the guide page. For actual lease extraction, upload your lease PDF at $15 per lease and receive 126 structured fields within 5–15 minutes.',
  },
]

export const metadata: Metadata = {
  title: 'Commercial Lease Guides - ASC 842, CAM & Abstraction Deep Dives',
  description:
    'In-depth reference guides on commercial lease abstraction, CAM reconciliation, ASC 842 compliance, and lease administration. For CRE professionals.',
  alternates: { canonical: `${SITE_URL}/resources/guides` },
  openGraph: {
    url: `${SITE_URL}/resources/guides`,
    title: 'Guides',
    description:
      'In-depth reference guides on commercial lease abstraction, CAM reconciliation, ASC 842 compliance, and lease administration.',
    type: 'website',
    images: [DEFAULT_OG_IMAGE],
  },
}

export default function GuidesPage() {
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Resources', url: `${SITE_URL}/resources` },
    { name: 'Guides', url: `${SITE_URL}/resources/guides` },
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
            { label: 'Guides' },
          ]}
        />

        <header className="mb-12 mt-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-sm font-medium text-primary">
            <BookOpen className="size-3.5" aria-hidden="true" />
            Deep-Dive Guides
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Guides
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg lg:text-xl">
            Deep-dive reference guides for commercial real estate professionals. Each guide
            covers a specific workflow in full detail: financial terms, CAM reconciliation,
            lease administration, compliance, and more.
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => (
            <ContentCard key={guide.slug} content={guide} />
          ))}
        </div>

        <FaqSection items={FAQ_ITEMS} />

        <ContentCta
          heading="Put these guides to work - extract your first lease"
          description="Upload a commercial lease PDF and get 126 structured fields extracted with AI-powered accuracy. Just $15 per lease."
        />
        <ResourceHubDirectory hubHref="/resources/guides" />


        <BrowseVerticals current="guides" />
      </div>
    </>
  )
}
