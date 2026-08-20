import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE_URL, DEFAULT_OG_IMAGE } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/json-ld'
import { buildBreadcrumbSchema, buildFAQPageSchema, buildWebApplicationSchema, buildSpeakableSchema, buildServiceSchema } from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import type { FaqItem } from '@/lib/content-types'
import { PRICING, formatPrice } from '@/lib/pricing'

export const metadata: Metadata = {
  title: 'Lease Abstraction Services - AI Software vs. Outsourcing',
  description:
    `Compare lease abstraction services: AI software vs. outsourced BPO vs. in-house staff. Lextract provides instant AI abstraction at ${formatPrice(PRICING.single.price)}/lease - no contract, no waiting.`,
  alternates: {
    canonical: `${SITE_URL}/lease-abstraction-services`,
  },
  openGraph: {
    url: `${SITE_URL}/lease-abstraction-services`,
    title: 'Lease Abstraction Services - AI Software vs. Outsourcing | Lextract',
    description:
      `Compare lease abstraction services: AI software vs. outsourced BPO vs. in-house staff. Lextract provides instant AI abstraction at ${formatPrice(PRICING.single.price)}/lease - no contract, no waiting.`,
    type: 'website',
    images: [DEFAULT_OG_IMAGE],
  },
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'What are lease abstraction services?',
    answer:
      `Lease abstraction services extract structured data from commercial lease contracts. There are three delivery models. AI-powered software, such as Lextract at ${formatPrice(PRICING.single.price)} per lease. Outsourced abstraction firms, which commonly charge around $90 to $250 per lease. And in-house staff, who usually spend 4 to 8 hours per lease. Each model trades off speed, cost, review process, and scale differently.`,
  },
  {
    question: 'How much do lease abstraction services cost?',
    answer:
      `AI software (Lextract) is ${formatPrice(PRICING.single.price)} per lease, with results in 5 to 15 minutes. Outsourced abstraction firms commonly charge around $90 to $250 per lease. In-house staff costs vary with salary and the 4 to 8 hours of work each lease takes. Lextract is ${formatPrice(PRICING.single.price)} flat with no contract or minimum commitment.`,
  },
  {
    question: 'How long does lease abstraction take?',
    answer:
      'Lextract AI lease abstraction usually completes in 5 to 15 minutes per lease, depending on document length and complexity. Manual in-house abstraction takes about 4 to 8 hours per lease. Outsourced firms work on their own queue, so turnaround varies.',
  },
  {
    question: 'Which lease abstraction service is most accurate?',
    answer:
      'Lextract returns confidence-scored field extraction on standard commercial lease formats. Every field gets a confidence score (High, Medium, or Low) so reviewers can quickly see which fields need human verification. Always verify extracted data against the original lease. Outsourced quality depends on the vendor, the abstractor, and the QA process.',
  },
  {
    question: 'Can I use AI for commercial lease abstraction?',
    answer:
      `Yes. Lextract uses vision AI to read commercial lease PDFs directly. Every lease runs through three AI passes: primary extraction, adversarial validation, and an escalation pass on disputed critical fields. The result is 126 structured fields from a commercial lease PDF, including NNN, modified gross, full service gross, ground, and percentage leases. The pipeline handles both native digital PDFs and scanned paper leases. Processing usually completes in 5 to 15 minutes, depending on document length and complexity, at ${formatPrice(PRICING.single.price)} per lease.`,
  },
]

const SERVICE_TYPES = [
  {
    name: 'AI Lease Abstraction Software',
    price: `${formatPrice(PRICING.single.price)}/lease`,
    turnaround: '5–15 minutes',
    fields: '126 structured fields',
    accuracy: 'Confidence scores',
    contract: 'No contract required',
    bestFor:
      'CRE professionals processing leases regularly who need structured data exports (Excel, Word, PDF) for Yardi, MRI, or internal reporting.',
    highlight: true,
    examples: 'Lextract',
  },
  {
    name: 'Outsourced Services',
    price: '$90–$250/lease',
    turnaround: 'Queue dependent',
    fields: 'Varies',
    accuracy: 'Vendor QA',
    contract: 'Often required',
    bestFor:
      'Highly non-standard leases that need legal interpretation, edge-case provisions, or custom templates that automated tools do not support.',
    highlight: false,
    examples: 'Outsourced abstraction firms',
  },
  {
    name: 'In-House Staff',
    price: 'Labor cost',
    turnaround: '4–8 hours/lease',
    fields: 'Flexible (varies)',
    accuracy: 'Reviewer judgment',
    contract: 'N/A (FTE or contractor)',
    bestFor:
      'Large legal or property management teams with dedicated abstraction staff, portfolio context, and long-term lease management needs.',
    highlight: false,
    examples: 'Internal paralegal or lease admin team',
  },
]

const COMPARISON_ROWS = [
  {
    label: 'Cost per lease',
    ai: formatPrice(PRICING.single.price),
    bpo: '$90–$250',
    inhouse: 'Labor cost',
  },
  {
    label: 'Time per lease',
    ai: '5–15 minutes',
    bpo: 'Queue dependent',
    inhouse: '4–8 hours',
  },
  {
    label: 'Fields extracted',
    ai: '126 (always)',
    bpo: 'Varies',
    inhouse: 'Flexible',
  },
  {
    label: 'Consistency',
    ai: 'High (automated)',
    bpo: 'Medium',
    inhouse: 'Variable',
  },
  {
    label: 'Scalability',
    ai: 'Instant (no queue)',
    bpo: 'Limited by capacity',
    inhouse: 'Limited by headcount',
  },
  {
    label: 'Contract required',
    ai: 'No',
    bpo: 'Often yes',
    inhouse: 'N/A',
  },
  {
    label: 'Red flag detection',
    ai: '20 automated checks',
    bpo: 'Manual review only',
    inhouse: 'Manual review only',
  },
  {
    label: 'Export formats',
    ai: 'Excel, Word, PDF',
    bpo: 'Excel or custom',
    inhouse: 'Excel or custom',
  },
]

export default function LeaseAbstractionServicesPage() {
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Lease Abstraction Services', url: `${SITE_URL}/lease-abstraction-services` },
  ]

  return (
    <>
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(FAQ_ITEMS)} />
      {/* WebApplication + Service schemas: page covers both the software product and the service category */}
      <JsonLd schema={buildWebApplicationSchema()} />
      <JsonLd schema={buildServiceSchema({
        name: 'Lease Abstraction Services',
        description: 'AI-powered commercial lease abstraction services. Upload any lease PDF and receive 126 structured fields extracted in minutes with confidence scoring and red flag detection.',
        url: `${SITE_URL}/lease-abstraction-services`,
        serviceType: 'Lease Abstraction',
      })} />
      <JsonLd schema={buildSpeakableSchema(`${SITE_URL}/lease-abstraction-services`, ['h1', '#overview'])} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Lease Abstraction Services' },
          ]}
        />
        <p className="mt-2 text-xs text-muted-foreground">Last updated: March 2026</p>

        {/* Hero */}
        <header className="mb-12 mt-6">
          <h1 className="font-display text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl lg:text-5xl">
            Lease Abstraction Services - AI, Outsourced, or In-House?
          </h1>
          <p id="overview" className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg lg:text-xl">
            Lease abstraction services fall into three categories. AI-powered software
            ({formatPrice(PRICING.single.price)}/lease, results in minutes). Outsourced firms (commonly $90 to $250
            per lease). And in-house staff (about 4 to 8 hours per lease). Lextract is AI lease
            abstraction. It extracts 126 structured fields from a commercial lease PDF in
            minutes, not hours.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/upload"
              className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
            >
              Try AI Lease Abstraction - {formatPrice(PRICING.single.price)}
            </Link>
            <Link
              href="/pricing"
              className="inline-flex w-full items-center justify-center rounded-full border px-6 py-3 text-sm font-medium transition-colors hover:bg-muted/30 sm:w-auto"
            >
              View Pricing
            </Link>
          </div>
        </header>

        {/* Service Types */}
        <section className="mb-12">
          <h2 className="font-display mb-6 text-2xl font-bold text-brand-dark sm:text-3xl lg:text-4xl">
            Types of Lease Abstraction Services
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {SERVICE_TYPES.map((service) => (
              <div
                key={service.name}
                className={`relative rounded-2xl border p-5 sm:p-6 ${
                  service.highlight
                    ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-primary/15'
                    : 'bg-card'
                }`}
              >
                {service.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground">
                    Fast &amp; Low Cost
                  </span>
                )}
                <h3 className="mb-1 text-xl font-semibold sm:text-2xl">{service.name}</h3>
                <p className="mb-3 text-xs text-muted-foreground">{service.examples}</p>
                <div className="mb-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Price</span>
                    <span className={`font-semibold ${service.highlight ? 'text-primary' : ''}`}>
                      {service.price}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Turnaround</span>
                    <span className="font-medium">{service.turnaround}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fields</span>
                    <span className="font-medium">{service.fields}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Review signal</span>
                    <span className="font-medium">{service.accuracy}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Contract</span>
                    <span className="font-medium">{service.contract}</span>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  <strong>Best for:</strong> {service.bestFor}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison Table */}
        <section className="mb-12">
          <h2 className="font-display mb-6 text-2xl font-bold text-brand-dark sm:text-3xl lg:text-4xl">
            Lease Abstraction Services Compared
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-primary text-primary-foreground">
                <tr>
                  <th className="border-b border-primary-foreground/20 p-3 text-left font-medium"></th>
                  <th className="border-b border-primary-foreground/20 bg-primary-foreground/10 p-3 text-center font-semibold">
                    AI Software
                    <div className="mt-0.5 text-xs font-normal text-primary-foreground/70">
                      Lextract
                    </div>
                  </th>
                  <th className="border-b border-primary-foreground/20 p-3 text-center font-medium">
                    Outsourced
                    <div className="mt-0.5 text-xs font-normal text-primary-foreground/70">
                      Outsourced abstraction firms
                    </div>
                  </th>
                  <th className="border-b border-primary-foreground/20 p-3 text-center font-medium">
                    In-House Staff
                    <div className="mt-0.5 text-xs font-normal text-primary-foreground/70">
                      Paralegal or lease admin
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={row.label} className={i % 2 === 0 ? 'bg-muted/20' : ''}>
                    <td className="border-b p-3 font-medium">{row.label}</td>
                    <td className="border-b bg-primary/5 p-3 text-center font-semibold text-primary">
                      {row.ai}
                    </td>
                    <td className="border-b p-3 text-center text-muted-foreground">
                      {row.bpo}
                    </td>
                    <td className="border-b p-3 text-center text-muted-foreground">
                      {row.inhouse}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* When to Use Each */}
        <section className="mb-12">
          <h2 className="font-display mb-6 text-2xl font-bold text-brand-dark sm:text-3xl lg:text-4xl">
            Which Lease Abstraction Service Is Right for You?
          </h2>
          <div className="space-y-6">
            <div className="rounded-xl border bg-primary/5 p-5 sm:p-6">
              <h3 className="mb-3 text-xl font-semibold text-primary sm:text-2xl">
                Use AI Software (Lextract) When:
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">→</span>
                  Processing 1–500 leases and need results quickly (results in minutes, not hours)
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">→</span>
                  Structured data exports are required for Yardi, MRI, Excel, or internal reporting
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">→</span>
                  Working under a deadline, where a multi-day vendor turnaround will not work
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">→</span>
                  {`Cost matters: ${formatPrice(PRICING.single.price)}/lease versus $90 to $250 for outsourced services`}
                </li>
              </ul>
            </div>

            <div className="rounded-xl border bg-card p-5 sm:p-6">
              <h3 className="mb-3 text-xl font-semibold sm:text-2xl">Use Outsourced Services When:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">→</span>
                  Leases contain highly complex or non-standard language requiring legal interpretation
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">→</span>
                  Human judgment on edge cases and unusual provisions is essential
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">→</span>
                  Processing volume exceeds 500+ leases with custom abstraction templates required
                </li>
              </ul>
            </div>

            <div className="rounded-xl border bg-card p-5 sm:p-6">
              <h3 className="mb-3 text-xl font-semibold sm:text-2xl">Use In-House Staff When:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">→</span>
                  Institutional context and portfolio history are essential to the abstraction process
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">→</span>
                  A dedicated lease administration team is already in place and capacity is available
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">→</span>
                  Long-term portfolio management and ongoing lease tracking are required
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Lextract as a Service */}
        <section className="mb-12 rounded-xl border bg-muted/30 p-6 sm:p-8">
          <h2 className="font-display mb-4 text-2xl font-bold text-brand-dark sm:text-3xl lg:text-4xl">
            Lextract: AI-Powered Lease Abstraction as a Service
          </h2>
          <p className="mb-4 text-base leading-relaxed text-muted-foreground">
            Lextract is an AI lease abstraction service. It delivers 126 structured
            fields from a commercial lease PDF in minutes, not hours. Vision AI reads scanned
            and digital PDFs directly. Every lease runs through three AI passes: primary
            extraction, adversarial validation, and an escalation pass on disputed critical
            fields. The result is confidence-scored extraction across NNN, modified gross,
            full service gross, ground, and percentage lease formats.
          </p>
          <p className="mb-6 text-base leading-relaxed text-muted-foreground">
            Every Lextract abstraction includes 20 automated red flag checks, per-field
            confidence scoring, and structured export in Excel (.xlsx), Word (.docx),
            or PDF. It is {formatPrice(PRICING.single.price)} per lease, with no subscription, no annual contract,
            and credits that never expire. That makes Lextract a low-cost option for CRE
            professionals who process leases one at a time or in small to mid volume.
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              126 structured fields
            </div>
            <div className="rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              20 red flag checks
            </div>
            <div className="rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              5–15 minutes
            </div>
            <div className="rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              {`${formatPrice(PRICING.single.price)} per lease`}
            </div>
            <div className="rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              No subscription
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="font-display mb-6 text-2xl font-bold text-brand-dark sm:text-3xl lg:text-4xl">
            Lease Abstraction Services FAQs
          </h2>
          <div className="space-y-6">
            {FAQ_ITEMS.map((faq) => (
              <div key={faq.question}>
                <h3 className="mb-2 text-xl font-semibold sm:text-2xl">{faq.question}</h3>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Related Pages */}
        <section className="mb-12">
          <h2 className="font-display mb-4 text-xl font-bold tracking-tight text-brand-dark">
            Related Pages
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/lease-abstraction-software"
              className="rounded-lg border p-4 text-sm transition-colors hover:bg-muted/50"
            >
              <span className="font-medium">Lease Abstraction Software</span>
              <p className="mt-1 text-muted-foreground">126 fields, $15/lease, full feature comparison</p>
            </Link>
            <Link
              href="/lease-extraction-software"
              className="rounded-lg border p-4 text-sm transition-colors hover:bg-muted/50"
            >
              <span className="font-medium">Lease Extraction Software</span>
              <p className="mt-1 text-muted-foreground">AI-powered PDF to structured data extraction</p>
            </Link>
            <Link
              href="/ai-lease-abstraction"
              className="rounded-lg border p-4 text-sm transition-colors hover:bg-muted/50"
            >
              <span className="font-medium">AI Lease Abstraction</span>
              <p className="mt-1 text-muted-foreground">How vision AI and multi-pass validation power lease abstraction</p>
            </Link>
            <Link
              href="/automated-lease-abstraction"
              className="rounded-lg border p-4 text-sm transition-colors hover:bg-muted/50"
            >
              <span className="font-medium">Automated Lease Abstraction</span>
              <p className="mt-1 text-muted-foreground">How automation replaces manual paralegal work</p>
            </Link>
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-xl border border-primary/10 bg-primary/5 p-6 text-center sm:p-8">
          <h2 className="font-display mb-3 text-2xl font-bold text-brand-dark sm:text-3xl lg:text-4xl">
            Try AI Lease Abstraction - {formatPrice(PRICING.single.price)}
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            Upload a commercial lease PDF. Lextract extracts 126 structured fields in
            minutes, not hours. No subscription, no contract, and credits never expire.
          </p>
          <Link
            href="/upload"
            className="inline-flex w-full items-center justify-center rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
          >
            Try AI Lease Abstraction - {formatPrice(PRICING.single.price)}
          </Link>
          <p className="mt-3 text-xs text-muted-foreground">
            No subscription. Credits never expire.
          </p>
        </section>
      </div>
    </>
  )
}
