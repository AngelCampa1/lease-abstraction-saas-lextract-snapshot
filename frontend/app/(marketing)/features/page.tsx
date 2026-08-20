import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { JsonLd } from '@/components/seo/json-ld'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { PRODUCT_FEATURES } from '@/data/features'
import { DEFAULT_OG_IMAGE, SITE_URL } from '@/lib/site-config'
import {
  buildBreadcrumbSchema,
  buildCollectionPageSchema,
  buildFAQPageSchema,
  buildItemListSchema,
  buildSpeakableSchema,
} from '@/lib/schema'
import { PRICING, formatPrice } from '@/lib/pricing'

const pageUrl = `${SITE_URL}/features`

const FAQ_ITEMS = [
  {
    question: 'What Lextract features matter most for lease abstraction?',
    answer:
      'The core features are 126-field extraction, PDF-native AI reading, multi-pass validation, confidence scoring, red flag detection, reviewable results, exports, and pay-per-lease pricing.',
  },
  {
    question: 'How does Lextract help teams evaluate lease abstraction features?',
    answer:
      'Each feature is tied to a common lease review bottleneck. Examples include uneven field capture, uncertain extraction quality, hidden CAM risk, and export cleanup. That makes it easier to decide which feature matters for your workflow.',
  },
  {
    question: 'Can I try these features without a subscription?',
    answer:
      `Yes. Lextract costs ${formatPrice(PRICING.single.price)} per lease. You can upload one lease without an annual subscription or setup fee.`,
  },
]

export const metadata: Metadata = {
  title: 'Commercial Lease Abstraction Features | Lextract',
  description:
    'Explore Lextract features by problem and solution: 126-field extraction, PDF-native AI, validation, confidence scoring, red flags, reviewable results, exports, and pay-per-lease pricing.',
  alternates: {
    canonical: pageUrl,
  },
  openGraph: {
    url: pageUrl,
    title: 'Commercial Lease Abstraction Features | Lextract',
    description:
      'Each Lextract feature page explains a lease review problem and how the product solves it, with links to help you evaluate the workflow.',
    type: 'website',
    images: [DEFAULT_OG_IMAGE],
  },
}

export default function FeaturesPage() {
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Features', url: pageUrl },
  ]

  const itemListItems = PRODUCT_FEATURES.map((feature) => ({
    name: feature.name,
    url: `${SITE_URL}/features/${feature.slug}`,
    description: feature.summary,
  }))

  return (
    <>
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd
        schema={buildCollectionPageSchema({
          name: 'Lextract commercial lease abstraction features',
          description:
            'Problem-first feature pages for Lextract commercial lease abstraction software.',
          url: pageUrl,
          parts: itemListItems,
        })}
      />
      <JsonLd
        schema={buildItemListSchema({
          name: 'Lextract feature landing pages',
          description: 'Feature pages for commercial lease abstraction workflows.',
          items: itemListItems,
        })}
      />
      <JsonLd schema={buildFAQPageSchema(FAQ_ITEMS)} />
      <JsonLd schema={buildSpeakableSchema(pageUrl, ['h1', '#feature-overview'])} />

      <main className="marketing-content">
        <section className="relative overflow-hidden border-b bg-gradient-to-b from-secondary/70 to-background section-y">
          <div className="marketing-container">
            <Breadcrumbs
              crumbs={[
                { label: 'Home', href: '/' },
                { label: 'Features' },
              ]}
            />
            <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.55fr)] lg:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
                  Product features
                </p>
                <h1 className="mt-4 max-w-4xl font-display text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl lg:text-5xl">
                  Commercial lease abstraction features built around lease review
                </h1>
                <p
                  id="feature-overview"
                  className="mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg"
                >
                  Lease PDFs are long, and key terms get missed. CAM exposure stays
                  hidden. Deadlines are buried in amendments. Lextract turns each lease
                  into reviewable data. You get structured fields, confidence scores,
                  red flag checks, and exports your team can use.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button size="lg" asChild className="w-full sm:w-auto">
                    <Link href="/upload">Upload a lease</Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
                    <Link href="/sample-report">View sample report</Link>
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border bg-card p-5 shadow-sm">
                <p className="text-sm font-semibold text-brand-dark">
                  Problem to solution, feature by feature
                </p>
                <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>Every page starts with the lease review problem.</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>Each solution is tied to a specific Lextract workflow.</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>Links connect features, reports, fields, red flags, and pricing.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="section-y">
          <div className="marketing-container">
            <div className="max-w-3xl">
              <h2 className="font-display text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl">
                Choose the feature that matches your bottleneck
              </h2>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                Some teams are fighting spreadsheet cleanup. Others need faster risk review,
                better PDF handling, or cleaner exports. Start with the feature closest to the
                work slowing your team down.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {PRODUCT_FEATURES.map((feature, index) => (
                <Link
                  key={feature.slug}
                  href={`/features/${feature.slug}`}
                  className="group rounded-lg border bg-card p-5 shadow-sm transition-colors hover:border-primary/40 hover:bg-secondary/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                        {String(index + 1).padStart(2, '0')} {feature.eyebrow}
                      </p>
                      <h3 className="mt-3 font-display text-xl font-semibold tracking-tight text-brand-dark">
                        {feature.name}
                      </h3>
                    </div>
                    <ArrowRight
                      className="mt-1 size-5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {feature.summary}
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Problem
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {feature.problem}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Solution
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {feature.solution}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30 section-y">
          <div className="marketing-container">
            <div className="grid gap-8 lg:grid-cols-[0.7fr_1fr] lg:items-start">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl">
                  Internal links for faster evaluation
                </h2>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  Feature pages connect the product story to the places buyers check next:
                  sample output, field coverage, red flags, pricing, and supporting lease
                  abstraction guides.
                </p>
              </div>
              <nav aria-label="Feature evaluation links" className="flex flex-wrap gap-3">
                {[
                  { label: 'Extracted fields', href: '/fields' },
                  { label: 'Red flags', href: '/red-flags' },
                  { label: 'Lease abstraction software', href: '/lease-abstraction-software' },
                  { label: 'Lease extraction software', href: '/lease-extraction-software' },
                  { label: 'Pricing', href: '/pricing' },
                  { label: 'Sample report', href: '/sample-report' },
                  { label: 'Resources', href: '/resources' },
                  { label: 'Upload', href: '/upload' },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="inline-flex min-h-[44px] items-center rounded-full border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
