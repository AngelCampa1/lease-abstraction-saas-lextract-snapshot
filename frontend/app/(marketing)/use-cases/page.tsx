import type { Metadata } from 'next'
import Link from 'next/link'
import { USE_CASES } from '@/data/use-cases'
import { SITE_URL } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/json-ld'
import { buildBreadcrumbSchema, buildFAQPageSchema } from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { ResourceHubDirectory } from '@/components/content/resource-hub-directory'
import { ContentCta } from '@/components/content/content-cta'
import { BrowseVerticals } from '@/components/content/browse-verticals'
import { FaqSection } from '@/components/marketing/faq-section'
import { Workflow } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Lease Abstraction Use Cases',
  description:
    'How CRE professionals use Lextract for due diligence, portfolio review, CAM reconciliation, lease audits, and more. See workflow examples and time savings.',
  alternates: {
    canonical: `${SITE_URL}/use-cases`,
  },
}

const FAQ_ITEMS = [
  {
    question: 'What are the most common use cases for lease abstraction?',
    answer:
      'Common use cases include acquisition due diligence, annual portfolio reviews, lease renewal prep, CAM reconciliation audits, and FASB ASC 842 or IFRS 16 compliance reporting. Each one starts with 126 structured fields pulled from the lease. Lextract takes 5 to 15 minutes per lease. Manual abstraction takes 4 to 8 hours.',
  },
  {
    question: 'How does Lextract help with portfolio management?',
    answer:
      'Lextract turns each lease PDF into the same 126 structured fields. With consistent data, you can track critical dates, compare CAM structures, watch escalation schedules, and spot leases that are close to expiring. You read one export instead of rereading every document.',
  },
  {
    question: 'Can Lextract be used for due diligence on commercial acquisitions?',
    answer:
      'Yes. Due diligence is a common use case. In a typical acquisition, buyers must review many leases on a tight timeline. Lextract processes each PDF in 5 to 15 minutes and runs 20 red flag rules on every lease. This helps your team review faster and apply the same checks across the whole portfolio.',
  },
  {
    question: 'How does lease abstraction support lease renewals and negotiations?',
    answer:
      'Before a renewal negotiation, it helps to know your current lease terms in detail. Lextract extracts all 126 fields, including option exercise windows, rent reset terms, and holdover provisions. You walk into the negotiation with the full picture. A single extraction costs $15.',
  },
]

export default function UseCasesIndexPage() {
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Use Cases', url: `${SITE_URL}/use-cases` },
  ]

  return (
    <>
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(FAQ_ITEMS)} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Use Cases' },
          ]}
        />

        <header className="mb-12 mt-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-sm font-medium text-primary">
            <Workflow className="size-3.5" aria-hidden="true" />
            {USE_CASES.length} Use Cases
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Lease Abstraction Use Cases
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg lg:text-xl">
            See how CRE professionals use Lextract for acquisition due
            diligence, portfolio reviews, and more. Get structured lease data in
            minutes instead of hours.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {USE_CASES.map((uc) => (
            <Link
              key={uc.slug}
              href={`/use-cases/${uc.slug}`}
              className="group rounded-xl border bg-card shadow-sm p-5 transition-colors hover:shadow-md hover:border-primary/30 hover:bg-muted/50 sm:p-6"
            >
              <p className="text-lg font-semibold group-hover:text-primary transition-colors">
                {uc.name}
              </p>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                {uc.metaDescription}
              </p>
              <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
                <span>Manual: {uc.timeSaving.manual}</span>
                <span className="text-primary font-medium">
                  Lextract: {uc.timeSaving.lextract}
                </span>
              </div>
            </Link>
          ))}
        </div>
        <ResourceHubDirectory hubHref="/use-cases" />


        <BrowseVerticals current="use-cases" />

        <FaqSection items={FAQ_ITEMS} />

        <ContentCta
          heading="Pick your use case and get started"
          description="Upload your commercial lease PDF and get 126 structured fields extracted in minutes. Works for any use case. Just $15 per lease."
          buttonText="Upload Your Lease"
          href="/upload"
        />
      </div>
    </>
  )
}
