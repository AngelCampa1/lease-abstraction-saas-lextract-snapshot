import type { Metadata } from 'next'
import Link from 'next/link'
import { getLiveTemplates, getComingSoonTemplates } from '@/data/templates'
import { SITE_URL } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/json-ld'
import { buildBreadcrumbSchema, buildFAQPageSchema } from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { ResourceHubDirectory } from '@/components/content/resource-hub-directory'
import { ContentCta } from '@/components/content/content-cta'
import { BrowseVerticals } from '@/components/content/browse-verticals'
import { FaqSection } from '@/components/marketing/faq-section'
import { ClipboardList } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Commercial Lease Templates & Checklists',
  description:
    'Free commercial lease templates and checklists for lease abstraction, due diligence, CAM reconciliation, lease renewals, and more. Download PDF and Excel formats.',
  alternates: {
    canonical: `${SITE_URL}/templates`,
  },
}

const FAQ_ITEMS = [
  {
    question: 'What lease abstraction templates does Lextract offer?',
    answer:
      'Lextract offers templates across five categories: abstraction, due diligence, CAM reconciliation, compliance, and lease administration. Each template is a structured checklist or data collection form designed for a specific stage of the lease lifecycle. All templates are available as free downloads.',
  },
  {
    question: 'Are these templates compatible with Excel?',
    answer:
      'Yes. Templates are provided in both PDF and Excel formats where applicable. The Excel versions are structured to accept the 126 fields that Lextract extracts, so you can paste Lextract export data directly into the template without reformatting.',
  },
  {
    question: 'How do I use a lease abstract template with Lextract results?',
    answer:
      'Upload your lease PDF to Lextract and download the Excel export when extraction is complete (typically 5–15 minutes). Then map the extracted fields into your chosen template. Because Lextract uses a consistent 126-field schema, the mapping is straightforward and repeatable across your entire portfolio.',
  },
  {
    question: 'Can I customize the export template for my organization?',
    answer:
      'Yes. You can add your organization\'s branding, remove fields you don\'t track, or add portfolio-specific columns. If you need automated export into your own template format, contact us to discuss API access.',
  },
  {
    question: 'What fields are included in the standard lease abstract template?',
    answer:
      'The standard lease abstract template covers all critical economic and legal terms: rent schedule, escalation rates, CAM charges and caps, lease term and options, tenant improvement allowances, permitted use, insurance requirements, and termination rights. This matches the core of Lextract\'s 126-field extraction schema.',
  },
]

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

export default function TemplatesIndexPage() {
  const liveTemplates = getLiveTemplates()
  const comingSoonTemplates = getComingSoonTemplates()

  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Templates', url: `${SITE_URL}/templates` },
  ]

  return (
    <>
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(FAQ_ITEMS)} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Templates' },
          ]}
        />

        <header className="mb-12 mt-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-sm font-medium text-primary">
            <ClipboardList className="size-3.5" aria-hidden="true" />
            Checklists &amp; Templates
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Commercial Lease Templates
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg lg:text-xl">
            Checklists and templates for each stage of the commercial lease lifecycle.
            Use them on their own, or pair them with Lextract to automate the data
            extraction behind each checklist.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              {liveTemplates.length} free downloads
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              PDF &amp; Excel formats
            </span>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {liveTemplates.map((template) => (
            <Link
              key={template.slug}
              href={`/templates/${template.slug}`}
              className="group flex flex-col rounded-xl border bg-card p-5 shadow-sm transition-colors hover:border-primary/30 hover:bg-muted/50 hover:shadow-md"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLES[template.category]}`}
                >
                  {CATEGORY_LABELS[template.category]}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {template.keyItems.length} items
                </span>
              </div>
              <h2 className="mb-2 font-semibold leading-snug group-hover:text-primary transition-colors">
                {template.name}
              </h2>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {template.description}
              </p>
              <div className="mt-auto pt-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {template.downloadableFormat}
                </span>
                <span className="text-xs font-medium text-primary">
                  Download Free →
                </span>
              </div>
            </Link>
          ))}
        </div>

        {comingSoonTemplates.length > 0 && (
          <div className="mt-12 rounded-xl border bg-muted/30 px-6 py-5">
            <h2 className="mb-3 text-base font-semibold text-muted-foreground">
              More templates coming soon
            </h2>
            <ul className="flex flex-wrap gap-x-6 gap-y-1.5">
              {comingSoonTemplates.map((template) => (
                <li key={template.slug} className="text-sm text-muted-foreground">
                  {template.name}
                </li>
              ))}
            </ul>
          </div>
        )}
        <ResourceHubDirectory hubHref="/templates" />


        <BrowseVerticals current="templates" />

        <FaqSection items={FAQ_ITEMS} />

        <ContentCta
          heading="Skip the manual checklist"
          description="Lextract extracts all 126 lease fields automatically in 5 to 15 minutes. Use these checklists to verify the data, not to collect it by hand. Just $15 per lease."
          buttonText="Extract Your Lease"
          href="/upload"
        />
      </div>
    </>
  )
}
