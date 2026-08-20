import type { Metadata } from 'next'
import Link from 'next/link'
import { INDEXABLE_INTEGRATIONS as INTEGRATIONS } from '@/data/integrations'
import { SITE_URL } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/json-ld'
import { buildBreadcrumbSchema, buildFAQPageSchema } from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { ResourceHubDirectory } from '@/components/content/resource-hub-directory'
import { ContentCta } from '@/components/content/content-cta'
import { BrowseVerticals } from '@/components/content/browse-verticals'
import { RelatedContent } from '@/components/content/related-content'
import { FaqSection } from '@/components/marketing/faq-section'
import { getAllContentItems, getRelatedContentForPseo } from '@/lib/content-matching'
import { Plug } from 'lucide-react'
import { PRICING, formatPrice } from '@/lib/pricing'

const FAQ_ITEMS = [
  {
    question: 'What integrations does Lextract support?',
    answer:
      'Lextract works with CRE platforms across property management, lease management, investment management, accounting, analytics, and spreadsheet categories. These include Yardi Voyager, MRI Software, ARGUS Enterprise, Visual Lease, LeaseQuery, and CoStar, among others. There is no live connection. You download Excel, Word, or PDF files and import them into each platform yourself.',
  },
  {
    question: 'Can I export Lextract results to Excel or Google Sheets?',
    answer:
      'Yes. Every lease extraction can be exported as an Excel (.xlsx) file with all 126 fields organized by category. You can open the workbook in Excel or Google Sheets and use it as the handoff file for downstream workflows.',
  },
  {
    question: 'Does Lextract integrate with property management software?',
    answer:
      'Lextract produces exports formatted for property management platforms like Yardi Voyager and MRI Software. The exports organize Lextract\'s 126 fields so you can import the lease data into the platform yourself. Each integration guide lists the field mappings and import steps for that platform.',
  },
  {
    question: 'What export formats does Lextract support?',
    answer:
      `Lextract supports three export formats. Excel (.xlsx) is organized by field category with confidence scores. Word (.docx) is a client-ready report. PDF is for formal documentation. Each export includes the extracted fields and confidence scores from a single ${formatPrice(PRICING.single.price)} extraction.`,
  },
  {
    question: 'Is there an API for custom integrations?',
    answer:
      'Not yet. Lextract focuses on file-based exports so teams get repeatable lease data without setup work. For high-volume workflows or custom integration needs, email angel.campa@lextract.io.',
  },
]

export const metadata: Metadata = {
  title: 'Lease Abstraction Integrations - Yardi, MRI, ARGUS & More',
  description:
    'See how to import Lextract lease data into Yardi Voyager, MRI Software, ARGUS Enterprise, Visual Lease, LeaseQuery, and 30+ other CRE platforms using Excel, Word, and PDF exports.',
  alternates: {
    canonical: `${SITE_URL}/integrations`,
  },
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
  'cam-audit': 'CAM Audit',
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
  'cam-audit': 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
}

const CATEGORY_ORDER = [
  'property-management',
  'lease-management',
  'investment-management',
  'accounting',
  'analytics',
  'spreadsheets',
  'document-management',
  'legal',
  'crm-data',
  'compliance',
  'productivity',
  'cam-audit',
] as const

export default async function IntegrationsIndexPage() {
  const allContent = await getAllContentItems()
  const featuredArticles = getRelatedContentForPseo(
    allContent,
    'integrations',
    ['yardi', 'mri', 'argus', 'lease accounting', 'import', 'property management'],
    3
  )

  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Integrations', url: `${SITE_URL}/integrations` },
  ]

  const byCategory = new Map<string, typeof INTEGRATIONS>()
  for (const integration of INTEGRATIONS) {
    const existing = byCategory.get(integration.category) ?? []
    existing.push(integration)
    byCategory.set(integration.category, existing)
  }

  return (
    <>
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(FAQ_ITEMS)} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Integrations' },
          ]}
        />

        <header className="mb-12 mt-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-sm font-medium text-primary">
            <Plug className="size-3.5" aria-hidden="true" />
            {INTEGRATIONS.length} CRE Platforms
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Lease Abstraction Integrations
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg lg:text-xl">
            Lextract extracts 126 structured fields from your lease PDF. You get
            Excel, Word, and PDF exports that you can import into property
            management, lease accounting, and investment management platforms.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              {INTEGRATIONS.length} platforms
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Excel, Word &amp; PDF exports
            </span>
          </div>
        </header>

        {CATEGORY_ORDER.map((categoryKey) => {
          const items = byCategory.get(categoryKey)
          if (!items || items.length === 0) return null
          return (
            <section key={categoryKey} className="mb-12">
              <h2 className="mb-4 text-2xl font-bold sm:text-3xl">
                {CATEGORY_LABELS[categoryKey]}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {items.map((integration) => (
                  <Link
                    key={integration.slug}
                    href={`/integrations/${integration.slug}`}
                    className="group rounded-xl border bg-card p-5 shadow-sm transition-colors hover:shadow-md hover:border-primary/30 hover:bg-muted/50"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h3 className="font-semibold group-hover:text-primary transition-colors">
                        {integration.software}
                      </h3>
                      <span
                        className={`shrink-0 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLES[integration.category]}`}
                      >
                        {CATEGORY_LABELS[integration.category]}
                      </span>
                    </div>
                    <p className="mb-2 text-xs text-muted-foreground">
                      {integration.vendor}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {integration.overview.split('.')[0]}.
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )
        })}

        {featuredArticles.length > 0 && (
          <div className="mb-12">
            <RelatedContent
              items={featuredArticles}
              heading="Featured Articles"
              basePath="/resources"
            />
          </div>
        )}
        <ResourceHubDirectory hubHref="/integrations" />


        <BrowseVerticals current="integrations" />

        <FaqSection items={FAQ_ITEMS} />

        <ContentCta
          heading="Extract lease data for any platform"
          description="Lextract outputs 126 structured fields in Excel, Word, and PDF. Hand off clean lease data to property management or lease accounting workflows in minutes. Just $15 per lease."
          buttonText="Start Extracting"
          href="/upload"
        />
      </div>
    </>
  )
}
