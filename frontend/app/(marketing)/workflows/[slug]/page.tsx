import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  getWorkflowBySlug,
  getAllWorkflowSlugs,
  WORKFLOWS_PUBLISHED_AT,
  WORKFLOWS,
} from '@/data/workflows'
import { getPersonaByName } from '@/data/personas'
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
import { CrossVerticalLinks } from '@/components/content/cross-vertical-links'
import { CrossSiteCallout } from '@/components/content/cross-site-callout'
import { SeoFunnelLinks } from '@/components/content/seo-funnel-links'
import { getAllContentItems, getRelatedContentForPseo, getSmartCrossLinks } from '@/lib/content-matching'

interface WorkflowPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllWorkflowSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: WorkflowPageProps): Promise<Metadata> {
  const { slug } = await params
  const workflow = getWorkflowBySlug(slug)

  if (!workflow) {
    return { title: 'Workflow Not Found' }
  }

  return {
    title: workflow.metaTitle,
    description: workflow.metaDescription,
    alternates: {
      canonical: `${SITE_URL}/workflows/${workflow.slug}`,
    },
    openGraph: {
      url: `${SITE_URL}/workflows/${workflow.slug}`,
      title: workflow.metaTitle,
      description: workflow.metaDescription,
      type: 'article',
      images: [DEFAULT_OG_IMAGE],
    },
  }
}

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

const TOOL_LABELS: Record<string, string> = {
  source: 'Source',
  lextract: 'Lextract',
  destination: 'Destination',
}

const TOOL_STYLES: Record<string, string> = {
  source: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  lextract: 'bg-primary/10 text-primary',
  destination: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
}

export default async function WorkflowPage({ params }: WorkflowPageProps) {
  const { slug } = await params
  const workflow = getWorkflowBySlug(slug)

  if (!workflow) {
    notFound()
  }

  const allContent = await getAllContentItems()
  const keywords = [workflow.name, workflow.toolName, ...workflow.targetPersonas]
  const relatedArticles = getRelatedContentForPseo(allContent, 'workflows', keywords)
  const crossLinks = getSmartCrossLinks('workflows', keywords)

  const pageUrl = `${SITE_URL}/workflows/${workflow.slug}`
  const publishedDate = WORKFLOWS_PUBLISHED_AT
  const modifiedDate = WORKFLOWS_PUBLISHED_AT

  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Workflows', url: `${SITE_URL}/workflows` },
    { name: workflow.name, url: pageUrl },
  ]

  return (
    <>
      <JsonLd
        schema={buildArticleSchema({
          headline: workflow.name,
          description: workflow.metaDescription,
          url: pageUrl,
          datePublished: publishedDate,
          dateModified: modifiedDate,
          author: 'Angel Campa, Founder',
        })}
      />
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(workflow.faqs)} />
      <JsonLd
        schema={buildHowToSchema({
          name: workflow.name,
          steps: workflow.steps.map((s) => ({ name: s.name, text: s.description })),
        })}
      />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Workflows', href: '/workflows' },
            { label: workflow.name },
          ]}
        />

        <LastUpdated date="2026-03-17" />
        <AuthorByline />

        <header className="mb-8 mt-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-md px-3 py-1 text-xs font-medium ${CATEGORY_STYLES[workflow.category]}`}
            >
              {CATEGORY_LABELS[workflow.category]}
            </span>
            <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
              {workflow.toolName}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {workflow.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            By Angel Campa, Founder &middot; Updated March 2026 &middot; Saves{' '}
            <span className="font-medium text-foreground">{workflow.timeSaved}</span>
          </p>
        </header>

        {/* Problem Statement */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold">The Problem</h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            {workflow.problem}
          </p>
        </section>

        {/* Steps */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold">Step-by-Step Workflow</h2>
          <ol className="space-y-3">
            {workflow.steps.map((step, index) => (
              <li
                key={`step-${index}`}
                className="flex gap-4 rounded-xl border bg-card p-5 sm:p-6 shadow-sm"
              >
                <span aria-hidden="true" className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-medium text-sm">{step.name}</span>
                    <span
                      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${TOOL_STYLES[step.tool]}`}
                    >
                      {TOOL_LABELS[step.tool]}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Target Personas */}
        {workflow.targetPersonas.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold">Who Uses This Workflow</h2>
            <div className="flex flex-wrap gap-2">
              {workflow.targetPersonas.map((persona) => {
                const resolved = getPersonaByName(persona)
                return resolved ? (
                  <Link
                    key={persona}
                    href={`/for/${resolved.slug}`}
                    className="inline-flex items-center rounded-full border bg-muted/50 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                  >
                    {persona}
                  </Link>
                ) : (
                  <span
                    key={persona}
                    className="inline-flex items-center rounded-full border bg-muted/50 px-4 py-1.5 text-sm font-medium"
                  >
                    {persona}
                  </span>
                )
              })}
            </div>
          </section>
        )}

        {/* Integration Link */}
        <section className="mb-10 rounded-xl border bg-card p-6 sm:p-8 shadow-sm">
          <h2 className="mb-2 text-2xl sm:text-3xl lg:text-4xl font-semibold">
            How Lextract integrates with {workflow.toolName}
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Learn about the full integration between Lextract and {workflow.toolName},
            including supported export formats and critical fields.
          </p>
          <Link
            href={`/integrations/${workflow.toolSlug}`}
            className="inline-flex items-center text-sm font-medium text-primary hover:underline"
          >
            View {workflow.toolName} integration →
          </Link>
        </section>

        {/* FAQ */}
        {workflow.faqs.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {workflow.faqs.map((faq, index) => (
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

        {/* Related Workflows */}
        {workflow.relatedWorkflows.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold">Related Workflows</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {workflow.relatedWorkflows.map((wSlug) => {
                const relatedWorkflow = WORKFLOWS.find((w) => w.slug === wSlug)
                return (
                <Link
                  key={wSlug}
                  href={`/workflows/${wSlug}`}
                  className="group rounded-xl border bg-card p-5 sm:p-6 shadow-sm transition-all hover:shadow-md hover:bg-muted/50"
                >
                  <p className="font-medium group-hover:text-primary transition-colors">
                    {relatedWorkflow?.name ?? wSlug}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    View workflow →
                  </p>
                </Link>
                )
              })}
            </div>
          </section>
        )}

        <RelatedContent items={relatedArticles} heading="Related Articles" />

        <CrossVerticalLinks crossLinks={crossLinks} />

        <CrossSiteCallout tags={[workflow.name, workflow.toolName, ...workflow.targetPersonas.slice(0, 2)]} />

        <SeoFunnelLinks routeHref={`/workflows/${workflow.slug}`} />

        <ContentCta
          heading={`Start the ${workflow.name} workflow`}
          description={`Upload your lease PDF and get 126 structured fields ready to import into ${workflow.toolName}. Just $15 per lease - no subscription required.`}
          buttonText="Start Extracting - $15/lease"
          href="/upload"
        />
      </div>
    </>
  )
}
