import type { Metadata } from 'next'
import Link from 'next/link'
import { WORKFLOWS } from '@/data/workflows'
import { SITE_URL } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/json-ld'
import { buildBreadcrumbSchema, buildFAQPageSchema } from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { ResourceHubDirectory } from '@/components/content/resource-hub-directory'
import { ContentCta } from '@/components/content/content-cta'
import { BrowseVerticals } from '@/components/content/browse-verticals'
import { FaqSection } from '@/components/marketing/faq-section'
import { ArrowRight } from 'lucide-react'
import { RelatedContent } from '@/components/content/related-content'
import { getAllContentItems, getRelatedContentForPseo } from '@/lib/content-matching'

export const metadata: Metadata = {
  title: 'Lease Data Workflows - PDF to Yardi, Excel, QuickBooks & More',
  description:
    'Step-by-step workflows for extracting lease data from PDFs into Yardi, MRI, Excel, QuickBooks, Airtable, and more. Free Lextract workflows for every CRE system.',
  alternates: {
    canonical: `${SITE_URL}/workflows`,
  },
}

const FAQ_ITEMS = [
  {
    question: 'What workflows can Lextract automate?',
    answer:
      'Lextract handles the data extraction step in many workflows. These include lease import into Yardi or MRI, lease data export to Excel or Airtable, FASB ASC 842 compliance data collection, CAM reconciliation prep, and portfolio migration between systems. The 126-field output works as a handoff file for any downstream workflow.',
  },
  {
    question: 'How does Lextract fit into a property management workflow?',
    answer:
      'Property managers usually get a signed lease PDF and key the data into their system by hand. With Lextract, you upload the PDF and get a structured Excel, Word, or PDF export in 5 to 15 minutes. You review the data, then hand it off to Yardi, MRI, AppFolio, or any tool that accepts spreadsheet data. This cuts down on manual keying.',
  },
  {
    question: 'Can Lextract integrate into a lease review workflow for attorneys?',
    answer:
      'Yes. An attorney uploads the lease PDF and gets the 126-field extraction with confidence scores. Each field shows High, Medium, or Low confidence. Low-confidence fields are flagged for manual review. This points attorney time at the fields that need a closer look. Always verify the extracted data against the original lease.',
  },
  {
    question: 'How long does the Lextract workflow take from upload to results?',
    answer:
      'The workflow has four steps. Upload your lease PDF. Wait 5 to 15 minutes for AI extraction. Review the results in the dashboard. Download an Excel, Word, or PDF export. For most leases the full cycle takes under 20 minutes.',
  },
  {
    question: 'What does a typical lease abstraction workflow look like?',
    answer:
      'A standard workflow has four steps. First, you receive the signed lease PDF. Second, you upload it to Lextract and wait for extraction. Third, you review the 126 fields and red flag report in the dashboard. Fourth, you export to Excel, Word, or PDF and import into your target system. Your team handles steps one and four. Steps two and three take under 20 minutes.',
  },
]

const CATEGORY_LABELS: Record<string, string> = {
  import: 'Import',
  export: 'Export',
  compliance: 'Compliance',
  analysis: 'Analysis',
  migration: 'Migration',
}

const CATEGORY_STYLES: Record<string, string> = {
  import: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  export: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  compliance: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  analysis: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  migration: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
}

const CATEGORY_ORDER = ['import', 'export', 'compliance', 'analysis', 'migration'] as const

export default async function WorkflowsIndexPage() {
  const allContent = await getAllContentItems()
  const featuredArticles = getRelatedContentForPseo(
    allContent,
    'workflows',
    ['yardi', 'excel', 'import', 'export', 'lease data', 'mri'],
    3
  )

  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Workflows', url: `${SITE_URL}/workflows` },
  ]

  const byCategory = new Map<string, typeof WORKFLOWS>()
  for (const workflow of WORKFLOWS) {
    const existing = byCategory.get(workflow.category) ?? []
    existing.push(workflow)
    byCategory.set(workflow.category, existing)
  }

  return (
    <>
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(FAQ_ITEMS)} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Workflows' },
          ]}
        />

        <header className="mb-12 mt-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-sm font-medium text-primary">
            <ArrowRight className="size-3.5" aria-hidden="true" />
            Workflow Guides
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Lease Data Workflows
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg lg:text-xl">
            Step-by-step workflows for extracting commercial lease data from PDFs.
            Import it into Yardi, MRI, Excel, QuickBooks, Airtable, and other
            systems your team uses.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              {WORKFLOWS.length} workflows
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Import, export, compliance &amp; analysis
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
                {items.map((workflow) => (
                  <Link
                    key={workflow.slug}
                    href={`/workflows/${workflow.slug}`}
                    className="group rounded-xl border bg-card shadow-sm p-5 transition-colors hover:shadow-md hover:border-primary/30 hover:bg-muted/50"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h3 className="font-semibold group-hover:text-primary transition-colors">
                        {workflow.name}
                      </h3>
                      <span
                        className={`shrink-0 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLES[workflow.category]}`}
                      >
                        {CATEGORY_LABELS[workflow.category]}
                      </span>
                    </div>
                    <p className="mb-2 text-xs text-muted-foreground">
                      {workflow.toolName}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {workflow.problem.split('.')[0]}.
                    </p>
                    <p className="mt-2 text-xs text-primary/70">
                      Saves {workflow.timeSaved}
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
        <ResourceHubDirectory hubHref="/workflows" />


        <BrowseVerticals current="workflows" />

        <FaqSection items={FAQ_ITEMS} />

        <ContentCta
          heading="Start extracting lease data in minutes"
          description="Upload any lease PDF and get 126 structured fields ready to import into any system. Just $15 per lease. No subscription required."
          buttonText="Start Extracting"
          href="/upload"
        />
      </div>
    </>
  )
}
