import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeftRight } from 'lucide-react'
import { SITE_URL, DEFAULT_OG_IMAGE } from '@/lib/site-config'
import { buildBreadcrumbSchema, buildItemListSchema, buildFAQPageSchema } from '@/lib/schema'
import { JsonLd } from '@/components/seo/json-ld'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { ResourceHubDirectory } from '@/components/content/resource-hub-directory'
import { ContentCta } from '@/components/content/content-cta'
import { BrowseVerticals } from '@/components/content/browse-verticals'
import { COMPARISONS } from '@/data/comparisons'
import { PRICING, PROCESSING_TIME, formatPrice } from '@/lib/pricing'
import { getProductFacts } from '@/lib/public-facts'

const productFacts = getProductFacts()

export const metadata: Metadata = {
  title: 'Best AI Lease Abstraction Software in 2026: Full Comparison',
  description:
    'Compare the best AI lease abstraction software: Lextract, LeaseLens, Prophia, Trullion, and MRI Contract Intelligence. Side-by-side pricing, field counts, and processing speed.',
  alternates: { canonical: `${SITE_URL}/resources/comparisons` },
  openGraph: {
    title: 'Best AI Lease Abstraction Software in 2026: Full Comparison',
    description:
      'Side-by-side comparison of AI lease abstraction tools: pricing, field counts, processing speed, and best-fit use cases.',
    url: `${SITE_URL}/resources/comparisons`,
    images: [DEFAULT_OG_IMAGE],
  },
  keywords: [
    'best ai lease abstraction software',
    'lease abstraction software comparison',
    'ai lease abstraction tools',
    'lextract vs prophia',
    'lextract vs leaselens',
    'lease abstraction software 2026',
  ],
}

interface ComparisonTool {
  name: string
  pricePerLease: string
  fieldsExtracted: string
  processingTime: string
  freeTrial: string
  bestFor: string
}

const TOOLS: ComparisonTool[] = [
  {
    name: 'Lextract',
    pricePerLease: `${formatPrice(PRICING.single.price)}/lease (no subscription)`,
    fieldsExtracted: `${productFacts.fieldCount} fields`,
    processingTime: PROCESSING_TIME.comparison,
    freeTrial: 'Yes - sample report',
    bestFor: 'Individual leases, due diligence, CRE professionals',
  },
  {
    name: 'LeaseLens',
    pricePerLease: '$25 to export',
    fieldsExtracted: 'Fewer fields',
    processingTime: 'Minutes',
    freeTrial: 'Limited',
    bestFor: 'Simple lease summaries',
  },
  {
    name: 'Prophia',
    pricePerLease: 'Enterprise pricing',
    fieldsExtracted: 'Portfolio-level',
    processingTime: 'Minutes',
    freeTrial: 'No',
    bestFor: 'Large portfolios, enterprise teams',
  },
  {
    name: 'Trullion',
    pricePerLease: 'Subscription (enterprise)',
    fieldsExtracted: 'Accounting-focused',
    processingTime: 'Minutes',
    freeTrial: 'No',
    bestFor: 'ASC 842 / IFRS 16 accounting compliance',
  },
  {
    name: 'MRI Contract Intelligence',
    pricePerLease: 'Enterprise (requires MRI stack)',
    fieldsExtracted: 'Variable',
    processingTime: 'Minutes',
    freeTrial: 'No',
    bestFor: 'Existing MRI Software customers',
  },
]

const comparisonFaqItems = [
  {
    question: 'Which AI lease abstraction software is cheapest?',
    answer:
      `Lextract is the lowest-cost AI lease abstraction tool at ${formatPrice(PRICING.single.price)} per lease with no subscription. LeaseLens charges $25 to export. Prophia, Trullion, and MRI Contract Intelligence all require enterprise subscription contracts. For teams processing fewer than 30 leases per month, Lextract's pay-per-lease model is significantly cheaper than any subscription alternative.`,
  },
  {
    question: 'Is Prophia better than Lextract for single leases?',
    answer:
      `No. Prophia is designed for enterprise portfolios and requires a subscription contract with minimum commitments. It does not offer single-lease pay-per-use pricing. Lextract is purpose-built for individual lease abstraction at ${formatPrice(PRICING.single.price)}/lease - no contract, no minimum volume, results in ${PROCESSING_TIME.comparison}.`,
  },
  {
    question: 'Can I use AI to abstract a lease for free?',
    answer:
      `ChatGPT and other general AI tools can summarize lease language but do not produce structured, field-by-field lease abstracts with consistent output, confidence scoring, or red flag detection. Lextract offers a free sample report showing exactly what a ${productFacts.fieldCount}-field AI extraction looks like before you buy. Single extractions start at ${formatPrice(PRICING.single.price)} with no subscription required.`,
  },
]

export default function ComparisonsPage() {
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Resources', url: `${SITE_URL}/resources` },
    { name: 'Comparisons', url: `${SITE_URL}/resources/comparisons` },
  ])

  const itemListSchema = buildItemListSchema({
    name: 'Best AI Lease Abstraction Software in 2026',
    description: 'Side-by-side comparison of the top AI lease abstraction tools by price, field count, and use case.',
    items: COMPARISONS.map((c) => ({
      name: `Lextract vs ${c.competitor}`,
      url: `${SITE_URL}/resources/comparisons/${c.competitorSlug}`,
      description: c.competitorDescription,
    })),
  })

  const faqSchema = buildFAQPageSchema(comparisonFaqItems)

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
      <JsonLd schema={breadcrumbSchema} />
      <JsonLd schema={itemListSchema} />
      <JsonLd schema={faqSchema} />

      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Resources', href: '/resources' },
          { label: 'Comparisons' },
        ]}
      />

      <div className="mb-10 mt-6">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-sm font-medium text-primary">
          <ArrowLeftRight className="size-3.5" aria-hidden="true" />
          Tool Comparisons
        </div>
        <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          Best AI Lease Abstraction Software in 2026: Full Comparison
        </h1>
        <p className="text-base text-muted-foreground sm:text-lg lg:text-xl">
          We compared the top AI lease abstraction tools on price per lease, fields
          extracted, processing speed, and best-fit use case. Here is the full
          breakdown - including where Lextract wins and where alternatives might
          make sense for your workflow.
        </p>
      </div>

      {/* Comparison Table */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold sm:text-3xl">How We Compared These Tools</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Each tool was evaluated on four criteria: price transparency (pay-per-use
          vs. subscription), structured field count (more fields = less manual work),
          turnaround time, and whether a free trial or sample output is available
          before purchase.
        </p>
        <p className="mb-2 text-sm text-muted-foreground sm:hidden">← Swipe to compare →</p>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-4 text-left font-medium text-muted-foreground">Tool</th>
                <th className="p-4 text-left font-medium text-muted-foreground">Price per lease</th>
                <th className="p-4 text-left font-medium text-muted-foreground">Fields extracted</th>
                <th className="p-4 text-left font-medium text-muted-foreground">Processing time</th>
                <th className="p-4 text-left font-medium text-muted-foreground">Free trial</th>
                <th className="p-4 text-left font-medium text-muted-foreground">Best for</th>
              </tr>
            </thead>
            <tbody>
              {TOOLS.map((tool, i) => (
                <tr
                  key={tool.name}
                  className={`border-t ${i === 0 ? 'bg-primary/5 font-medium' : ''}`}
                >
                  <td className="p-4">{tool.name}</td>
                  <td className="p-4 text-muted-foreground">{tool.pricePerLease}</td>
                  <td className="p-4 text-muted-foreground">{tool.fieldsExtracted}</td>
                  <td className="p-4 text-muted-foreground">{tool.processingTime}</td>
                  <td className="p-4 text-muted-foreground">{tool.freeTrial}</td>
                  <td className="p-4 text-muted-foreground">{tool.bestFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Individual comparison deep-links */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold sm:text-3xl">Detailed Head-to-Head Comparisons</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Each comparison page covers features, pricing, strengths, weaknesses, and
          which tool wins for specific use cases.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {COMPARISONS.map((comparison) => (
            <Link
              key={comparison.competitorSlug}
              href={`/resources/comparisons/${comparison.competitorSlug}`}
              className="block rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md sm:p-6"
            >
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">
                Lextract vs
              </p>
              <h3 className="mb-2 text-xl font-semibold text-foreground">
                {comparison.competitor}
              </h3>
              <p className="text-sm text-muted-foreground">
                {comparison.competitorDescription}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-12">
        <h2 className="mb-6 text-2xl font-bold sm:text-3xl">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {comparisonFaqItems.map((item) => (
            <div key={item.question} className="rounded-lg border p-5">
              <h3 className="font-semibold">{item.question}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </section>

      <ContentCta
        heading="Ready to see Lextract in action?"
        description={`Upload a commercial lease PDF and get ${productFacts.fieldCount} structured fields extracted in ${PROCESSING_TIME.comparison}. ${formatPrice(PRICING.single.price)} per lease, no subscription.`}
      />
        <ResourceHubDirectory hubHref="/resources/comparisons" />


      <BrowseVerticals current="comparisons" />
    </div>
  )
}
