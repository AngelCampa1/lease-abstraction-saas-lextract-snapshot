import type { Metadata } from 'next'
import Link from 'next/link'
import { FAQS } from '@/data/faqs'
import { SITE_URL } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/json-ld'
import { buildBreadcrumbSchema } from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { ResourceHubDirectory } from '@/components/content/resource-hub-directory'
import { ContentCta } from '@/components/content/content-cta'
import { BrowseVerticals } from '@/components/content/browse-verticals'
import { HelpCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Lease Abstraction FAQ - Common Questions Answered',
  description:
    'Answers to common questions about lease abstraction. What it is, how long it takes, what fields are extracted, and how much it costs.',
  alternates: {
    canonical: `${SITE_URL}/faq`,
  },
}

export default function FaqIndexPage() {
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'FAQ', url: `${SITE_URL}/faq` },
  ]

  return (
    <>
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'FAQ' },
          ]}
        />

        <header className="mb-12 mt-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-sm font-medium text-primary">
            <HelpCircle className="size-3.5" aria-hidden="true" />
            Common Questions Answered
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Lease Abstraction FAQ
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg lg:text-xl text-muted-foreground">
            Answers to common questions about commercial lease abstraction.
            What it is, how it works, and what it costs.
          </p>
        </header>

        <div className="space-y-4">
          {FAQS.map((faq) => (
            <Link
              key={faq.slug}
              href={`/faq/${faq.slug}`}
              className="group block rounded-xl border bg-card p-6 shadow-sm transition-colors hover:shadow-md hover:border-primary/30 hover:bg-muted/50"
            >
              <h2 className="text-lg font-semibold group-hover:text-primary transition-colors">
                {faq.question}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                {faq.shortAnswer.length > 160 ? `${faq.shortAnswer.slice(0, 160)}...` : faq.shortAnswer}
              </p>
            </Link>
          ))}
        </div>
        <ResourceHubDirectory hubHref="/faq" />


        <BrowseVerticals current="faq" />

        <ContentCta
          heading="Get structured lease data in minutes"
          description="Upload any commercial lease PDF. Lextract extracts 126 structured fields with per-field confidence scores in minutes. Just $15 per lease."
          buttonText="Upload Your Lease"
          href="/upload"
        />
      </div>
    </>
  )
}
