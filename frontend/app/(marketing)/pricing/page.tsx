import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { SITE_URL, DEFAULT_OG_IMAGE } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/json-ld'
import { buildBreadcrumbSchema, buildFAQPageSchema, buildProductSchema, buildSpeakableSchema } from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { PRICING, SUPPORT_POLICY, PROCESSING_TIME, COMPETITOR_PRICE_RANGE, formatPrice } from '@/lib/pricing'
import { getContactEmail, getProductFacts } from '@/lib/public-facts'

const productFacts = getProductFacts()
const founderSalesEmail = getContactEmail('founderSales')

export const metadata: Metadata = {
  title: `Lease Abstraction Pricing - ${formatPrice(PRICING.single.price)} Per Lease`,
  description: `Simple per-lease pricing for AI-powered commercial lease abstraction. ${formatPrice(PRICING.single.price)} per extraction - all ${productFacts.fieldCount} fields, ${productFacts.redFlagCount} red flag checks, confidence scoring, and Excel, Word, and PDF export included. No subscription.`,
  alternates: {
    canonical: `${SITE_URL}/pricing`,
  },
  openGraph: {
    url: `${SITE_URL}/pricing`,
    title: `Lease Abstraction Pricing - ${formatPrice(PRICING.single.price)} Per Lease`,
    description: `${formatPrice(PRICING.single.price)} per commercial lease extraction. ${productFacts.fieldCount} fields, confidence scoring, red flag detection. No subscription required.`,
    type: 'website',
    images: [DEFAULT_OG_IMAGE],
  },
}

const INCLUDED_FEATURES = [
  `All ${productFacts.fieldCount} structured lease fields extracted`,
  `${productFacts.redFlagCount} automated red flag checks`,
  'AI-powered PDF reading (scanned and digital)',
  'Confidence scoring on every field',
  'Excel, Word, and PDF export',
  'Web dashboard to review results',
  'Email delivery when complete',
  'No subscription required',
  'Credits never expire',
]

const FAQ_ITEMS = [
  {
    question: 'Do credits expire?',
    answer:
      'No. Lextract credits never expire. Buy a credit pack when you need it and use it whenever you have a lease to abstract. There are no monthly fees, renewal charges, or expiration dates.',
  },
  {
    question: 'What file types does Lextract support?',
    answer:
      'Lextract processes PDF files up to 200 pages. Vision AI reads digital PDFs, scanned paper leases, and PDFs built from several documents. There is no separate OCR step. For scanned leases, confidence scores reflect the quality of the source document.',
  },
  {
    question: 'Is there a subscription or recurring fee?',
    answer: `No. Lextract is pay-per-lease. You buy extraction credits: ${formatPrice(PRICING.single.price)} for a single lease, ${formatPrice(PRICING.pack5.price)} for a 5-pack (${PRICING.pack5.savings}, ${formatPrice(PRICING.pack5.perLease)}/lease), or ${formatPrice(PRICING.pack10.price)} for a 10-pack (${PRICING.pack10.savings}, ${formatPrice(PRICING.pack10.perLease)}/lease). There are no monthly fees, platform fees, or minimum commitments.`,
  },
  {
    question: 'What if the extraction quality is poor?',
    answer:
      'Every field includes a confidence score: High, Medium, or Low. Low-confidence fields are flagged for human review. If a badly degraded source document hurts the result, contact support and we will review your case.',
  },
  {
    question: 'Can I extract bulk leases?',
    answer:
      'Yes. Multi-pack credits work for any volume. Buy a 10-pack and extract 10 leases one at a time or in batch. For larger portfolios, contact us about volume pricing and bulk import tools.',
  },
  {
    question: 'Do you offer API access or partnerships?',
    answer:
      `Yes. For API access, custom integrations, white-label use, and partnership inquiries, email ${founderSalesEmail}.`,
  },
  {
    question: 'Is my lease data secure?',
    answer:
      'All lease files are encrypted in transit with TLS 1.3 and at rest with AES-256. Files are stored in private cloud object storage. They can only be reached through pre-signed URLs. We do not share your data with third parties. Lease files are kept only as long as needed to deliver and review your results.',
  },
]

const COMPARISON_TIERS = [
  {
    name: 'Manual / In-House',
    type: 'Paralegal or admin abstractor',
    price: COMPETITOR_PRICE_RANGE,
    priceNote: 'per lease (outsourced)',
    time: '4 to 8 hours',
    fields: 'Varies by reviewer',
    confidence: 'No scoring',
    redFlags: 'Manual review only',
    highlight: false,
  },
  {
    name: 'Generic AI (ChatGPT)',
    type: 'LLM copy-paste workflow',
    price: 'Monthly subscription',
    priceNote: 'subscription, unlimited use',
    time: 'Varies',
    fields: 'Freeform, no schema',
    confidence: 'No scoring',
    redFlags: 'None',
    highlight: false,
  },
  {
    name: 'Lextract AI',
    type: 'Purpose-built extraction',
    price: formatPrice(PRICING.single.price),
    priceNote: 'per lease',
    time: PROCESSING_TIME.comparison,
    fields: `${productFacts.fieldCount} fields (always)`,
    confidence: 'Every field scored',
    redFlags: `${productFacts.redFlagCount} automated checks`,
    highlight: true,
  },
]

export default function PricingPage() {
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Pricing', url: `${SITE_URL}/pricing` },
  ]

  return (
    <>
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(FAQ_ITEMS)} />
      <JsonLd schema={buildProductSchema()} />
      <JsonLd schema={buildSpeakableSchema(`${SITE_URL}/pricing`, ['h1', '#pricing-cards'])} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Pricing' },
          ]}
        />

        <header className="mb-12 mt-6 text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl lg:text-5xl">
            One price per lease, no subscription
          </h1>
          <p className="mt-4 max-w-xl mx-auto text-base sm:text-lg lg:text-xl text-muted-foreground">
            See a free preview first. Pay {formatPrice(PRICING.single.price)} only for the full report. No monthly fees.
          </p>
        </header>

        <section className="mb-12 grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
          {[
            {
              title: 'What you are buying',
              body: `A complete lease abstraction: ${productFacts.fieldCount} fields, confidence scores, ${productFacts.redFlagCount} red flag checks, and export-ready output.`,
            },
            {
              title: 'How pricing works',
              body: `Upload and preview first. Unlock the full report for ${formatPrice(PRICING.single.price)}, or buy lower-cost packs when you have more leases.`,
            },
            {
              title: 'Who this fits',
              body: 'Commercial real estate teams, brokers, attorneys, tenant reps, operators, property managers, lenders, and investors.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-lg border bg-card p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-primary">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </section>

        {/* Price Callout */}
        <div className="mb-12 flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-8">
          {[
            { credits: PRICING.single.credits, price: PRICING.single.price, perLease: PRICING.single.perLease, savings: null, label: PRICING.single.label },
            { credits: PRICING.pack5.credits, price: PRICING.pack5.price, perLease: PRICING.pack5.perLease, savings: PRICING.pack5.savings, label: PRICING.pack5.label },
            { credits: PRICING.pack10.credits, price: PRICING.pack10.price, perLease: PRICING.pack10.perLease, savings: PRICING.pack10.savings, label: PRICING.pack10.label },
          ].map((tier) => (
            <div
              key={tier.credits}
              className={`relative flex w-full max-w-xs flex-col items-center rounded-2xl border p-8 text-center ${
                tier.credits === 1
                  ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-primary/15'
                  : 'bg-card'
              }`}
            >
              {tier.savings && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-sm font-bold text-primary-foreground">
                  {tier.savings}
                </span>
              )}
              <div className="mb-1 text-5xl font-extrabold tracking-tight">
                {formatPrice(tier.price)}
              </div>
              <div className="mb-2 text-sm text-muted-foreground">
                {tier.credits === 1
                  ? 'per lease'
                  : `${formatPrice(tier.perLease)} per lease`}
              </div>
              <div className="mb-6 text-sm font-medium">{tier.label}</div>
              <Link
                href="/upload"
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Get a free preview
              </Link>
            </div>
          ))}
        </div>

        {/* What's Included */}
        <section className="mb-12 rounded-xl border bg-muted/30 p-8">
          <h2 className="mb-6 text-center text-2xl font-bold sm:text-3xl lg:text-4xl">
            Everything Included at {formatPrice(PRICING.single.price)}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {INCLUDED_FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-3 w-3"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Comparison Table */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-bold sm:text-3xl lg:text-4xl">
            How Lextract Compares
          </h2>
          <p className="mb-2 text-sm text-muted-foreground sm:hidden">← Swipe to compare →</p>
          <div
            className="overflow-x-auto rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            tabIndex={0}
            role="group"
            aria-label="Comparison table, scroll horizontally to see all columns"
          >
            <table className="min-w-[600px] w-full border-collapse text-sm">
              <thead className="bg-primary text-primary-foreground">
                <tr>
                  <th scope="col" className="border-b border-primary-foreground/20 p-3 text-left font-medium">
                    <span className="sr-only">Provider</span>
                  </th>
                  {COMPARISON_TIERS.map((tier) => (
                    <th
                      key={tier.name}
                      scope="col"
                      className={`border-b p-3 text-center ${
                        tier.highlight
                          ? 'border-b-2 border-primary-foreground font-bold'
                          : 'border-primary-foreground/20 font-semibold'
                      }`}
                    >
                      <div>{tier.name}</div>
                      <div className="mt-0.5 text-sm font-normal text-primary-foreground">
                        {tier.type}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    label: 'Cost',
                    values: COMPARISON_TIERS.map(
                      (t) => `${t.price} ${t.priceNote}`
                    ),
                  },
                  {
                    label: 'Turnaround',
                    values: COMPARISON_TIERS.map((t) => t.time),
                  },
                  {
                    label: 'Fields Extracted',
                    values: COMPARISON_TIERS.map((t) => t.fields),
                  },
                  {
                    label: 'Confidence Scoring',
                    values: COMPARISON_TIERS.map((t) => t.confidence),
                  },
                  {
                    label: 'Red Flag Detection',
                    values: COMPARISON_TIERS.map((t) => t.redFlags),
                  },
                ].map((row, rowIndex) => (
                  <tr key={row.label} className={rowIndex % 2 === 0 ? 'bg-muted/20' : ''}>
                    <td className="border-b p-3 font-medium">{row.label}</td>
                    {row.values.map((value, colIndex) => (
                      <td
                        key={`${row.label}-${colIndex}`}
                        className={`border-b p-3 text-center ${
                          COMPARISON_TIERS[colIndex]?.highlight
                            ? 'bg-primary/10 font-bold text-brand-dark'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Want the full breakdown?{' '}
            <Link
              href="/resources/comparisons"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              See detailed comparisons against ChatGPT and abstraction services →
            </Link>
          </p>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-bold sm:text-3xl lg:text-4xl">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {FAQ_ITEMS.map((faq, index) => (
              <div key={`faq-${index}`}>
                <h3 className="mb-2 text-xl font-semibold sm:text-2xl">{faq.question}</h3>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-xl bg-primary/5 border border-primary/10 p-8 text-center">
          <h2 className="mb-3 text-2xl font-bold sm:text-3xl lg:text-4xl">
            Ready to extract your first lease?
          </h2>
          <p className="mb-6 max-w-xl mx-auto text-base sm:text-lg text-muted-foreground">
            Upload a lease PDF and get {productFacts.fieldCount} structured fields in minutes, not hours.
            No account needed to try. Pay when you are ready to extract.
          </p>
          <Link
            href="/upload"
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
          >
            Extract Your First Lease for {formatPrice(PRICING.single.price)}
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">
            No subscription. Credits never expire.
          </p>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" />
            {SUPPORT_POLICY}
          </p>
        </section>

        {/* API / Partnerships */}
        <p className="mt-8 text-center text-sm text-muted-foreground">
          API access and partnerships:{' '}
          <a
            href={`mailto:${founderSalesEmail}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {founderSalesEmail}
          </a>
        </p>
      </div>
    </>
  )
}
