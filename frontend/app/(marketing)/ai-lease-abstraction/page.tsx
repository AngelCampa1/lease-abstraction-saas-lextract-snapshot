import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE_URL, DEFAULT_OG_IMAGE } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/json-ld'
import {
  buildBreadcrumbSchema,
  buildFAQPageSchema,
  buildWebApplicationSchema,
  buildSpeakableSchema,
} from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import type { FaqItem } from '@/lib/content-types'
import { PRICING, formatPrice } from '@/lib/pricing'
import { PRODUCT_FIELD_COUNT, PRODUCT_RED_FLAG_COUNT } from '@/lib/product-facts'

export const metadata: Metadata = {
  title: `AI Lease Abstraction - ${PRODUCT_FIELD_COUNT} Fields Extracted in Minutes`,
  description:
    `Lextract uses AI to abstract commercial leases in minutes, not hours. Upload any lease PDF, get ${PRODUCT_FIELD_COUNT} structured fields with confidence scores and ${PRODUCT_RED_FLAG_COUNT} red flag checks. ${formatPrice(PRICING.single.price)} per lease.`,
  alternates: {
    canonical: `${SITE_URL}/ai-lease-abstraction`,
  },
  openGraph: {
    url: `${SITE_URL}/ai-lease-abstraction`,
    title: `AI Lease Abstraction - ${PRODUCT_FIELD_COUNT} Fields Extracted in Minutes | Lextract`,
    description:
      `Lextract uses AI to abstract commercial leases in minutes, not hours. Upload any lease PDF, get ${PRODUCT_FIELD_COUNT} structured fields with confidence scores and ${PRODUCT_RED_FLAG_COUNT} red flag checks. ${formatPrice(PRICING.single.price)} per lease.`,
    type: 'website',
    images: [DEFAULT_OG_IMAGE],
  },
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'What is AI lease abstraction?',
    answer:
      'AI lease abstraction uses vision AI to read commercial lease PDFs and extract structured data automatically. Lextract reads scanned and digital PDFs without a separate OCR step. Every lease then runs through three AI passes: a primary extraction, an adversarial validation, and an escalation pass on disputed critical fields. Lextract returns 126 structured fields. Processing takes 5 to 15 minutes. The price is $15 per lease.',
  },
  {
    question: 'How accurate is AI lease abstraction?',
    answer:
      'Lextract gives every extracted field a confidence score of High, Medium, or Low. The score tells reviewers what to check first. It is not a promise that the value is right. You should always verify extracted data against the original lease. All 20 red flag checks are included at no extra cost.',
  },
  {
    question: 'Can AI lease abstraction replace a paralegal?',
    answer:
      'AI lease abstraction handles the data extraction step. It reads the lease, identifies 126 structured fields, and flags 20 categories of risky provisions. This takes 5 to 15 minutes at $15 per lease. Paralegals still handle legal interpretation and business judgment. Many teams use both: AI for extraction, a paralegal for review.',
  },
  {
    question: 'Is AI lease abstraction software free?',
    answer:
      'Free AI tools like ChatGPT can summarize a lease. They are not built to return a consistent 126-field structured export, per-field confidence scores, or red flag detection. They tend to give narrative answers rather than repeatable exports. Lextract costs $15 per lease. It returns structured Excel, Word, and PDF output, a confidence score on every field, and 20 red flag checks.',
  },
  {
    question: 'What lease types does AI abstraction support?',
    answer:
      'Lextract supports NNN (triple net), modified gross, full service gross, ground leases, and percentage leases. Vision AI reads both native digital PDFs and scanned paper leases, up to 200 pages per document. It keeps page layout, tables, signatures, and stamps in view the way a human reviewer would.',
  },
  {
    question: 'How does Lextract AI differ from Prophia or Yardi?',
    answer:
      'Prophia and Yardi are enterprise platforms that combine lease abstraction with full portfolio management. They are usually sold on annual contracts. Lextract focuses on the extraction step alone. It costs $15 per lease with no subscription, no annual contract, and no minimum. That makes it a fit for CRE professionals who process leases one at a time or in small volume.',
  },
]

const FIELD_CATEGORIES = [
  {
    name: 'Parties & Premises',
    examples: 'Landlord, tenant, guarantor, premises address, suite, building',
  },
  {
    name: 'Financial Terms',
    examples: 'Base rent, rent schedule, CAM charges, security deposit, free rent',
  },
  {
    name: 'Key Dates',
    examples: 'Commencement, expiration, rent commencement, option deadlines',
  },
  {
    name: 'Options & Rights',
    examples: 'Renewal options, expansion rights, ROFR, ROFO, termination options',
  },
  {
    name: 'Expense Obligations',
    examples: 'Operating expenses, insurance, taxes, utilities, maintenance caps',
  },
  {
    name: 'Restrictions & Use',
    examples: 'Permitted use, exclusivity, co-tenancy, assignment, subletting',
  },
]

const COMPARISON_ROWS = [
  {
    label: 'Cost per lease',
    free: '~$0',
    manual: '$90–$250',
    lextract: formatPrice(PRICING.single.price),
  },
  {
    label: 'Time per lease',
    free: '30–60 min setup',
    manual: '4–8 hours',
    lextract: '5–15 minutes',
  },
  {
    label: 'Fields extracted',
    free: 'Inconsistent',
    manual: 'Varies by reviewer',
    lextract: '126 (always)',
  },
  {
    label: 'Review signal',
    free: 'Inconsistent',
    manual: 'Reviewer judgment',
    lextract: 'Confidence scores',
  },
  {
    label: 'Confidence scoring',
    free: 'No',
    manual: 'No',
    lextract: 'Every field',
  },
  {
    label: 'Red flag detection',
    free: 'No',
    manual: 'Manual only',
    lextract: '20 automated checks',
  },
  {
    label: 'Structured export',
    free: 'No',
    manual: 'Manual re-keying',
    lextract: 'Excel, Word, PDF',
  },
]

export default function AiLeaseAbstractionPage() {
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'AI Lease Abstraction', url: `${SITE_URL}/ai-lease-abstraction` },
  ]

  return (
    <>
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(FAQ_ITEMS)} />
      <JsonLd schema={buildWebApplicationSchema()} />
      <JsonLd schema={buildSpeakableSchema(`${SITE_URL}/ai-lease-abstraction`, ['h1', '#overview'])} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'AI Lease Abstraction' },
          ]}
        />
        <p className="mt-2 text-xs text-muted-foreground">Last updated: March 2026</p>

        {/* Hero */}
        <header className="mb-12 mt-6">
          <h1 className="font-display text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl lg:text-5xl">
            AI lease abstraction in minutes, not hours
          </h1>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg lg:text-xl">
            AI lease abstraction uses vision AI to read commercial lease PDFs and extract
            structured data for you. Lextract reads scanned and digital PDFs. Every lease then
            runs through three AI passes: a primary extraction, an adversarial validation, and
            an escalation pass on disputed critical fields. You get 126 fields, a confidence
            score on each one, and 20 red flag checks. The price is $15 per lease.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/upload"
              className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
            >
              Extract Your First Lease for {formatPrice(PRICING.single.price)}
            </Link>
            <Link
              href="/fields"
              className="inline-flex w-full items-center justify-center rounded-full border px-6 py-3 text-sm font-medium transition-colors hover:bg-muted/30 sm:w-auto"
            >
              See What Gets Extracted
            </Link>
          </div>
        </header>

        <section className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              title: 'What Lextract solves',
              body: 'Manual lease abstraction leaves reviewers copying clauses by hand and rebuilding spreadsheets. It is also hard to tell which fields still need a check.',
            },
            {
              title: 'How Lextract solves it',
              body: 'Lextract reads the PDF and extracts 126 structured fields. It validates the answers, scores confidence, checks 20 red flags, and exports the result.',
            },
            {
              title: 'Who uses Lextract',
              body: 'Commercial real estate teams use it to turn lease text into usable data. That includes brokers, attorneys, tenant reps, operators, property managers, lenders, and investors.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-lg border bg-card p-5 shadow-sm sm:p-6">
              <h2 className="text-sm font-semibold text-primary">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </section>

        {/* What Is AI Lease Abstraction */}
        <section className="mb-12 rounded-xl border bg-muted/30 p-6 sm:p-8">
          <h2 className="font-display mb-4 text-2xl font-bold text-brand-dark sm:text-3xl lg:text-4xl">
            What Is AI Lease Abstraction?
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            AI lease abstraction uses vision AI to extract structured data from commercial
            lease contracts. Manual abstraction takes about 4 to 8 hours per lease. A trained
            reviewer reads a 50 to 150 page document, finds each relevant clause, and types the
            data into a spreadsheet or property management system. AI does the extraction in 5
            to 15 minutes instead.
          </p>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Lextract reads scanned and digital PDFs without a separate OCR step. Vision AI sees
            page layout, tables, signatures, and stamps the way a human reviewer would. Every
            lease then runs through three AI passes: a primary extraction, an adversarial
            validation that challenges each answer, and an escalation pass that re-checks
            disputed critical fields. You get 126 structured fields. These include base rent
            schedules, CAM provisions, renewal options, and critical dates, plus 20 categories
            of risky provisions called red flags.
          </p>
        </section>

        {/* Confidence benchmarks */}
        <section className="mb-12">
          <h2 className="font-display mb-3 text-2xl font-bold text-brand-dark sm:text-3xl lg:text-4xl">
            How Lextract Compares to Manual Work and ChatGPT
          </h2>
          <p className="mb-6 text-base leading-relaxed text-muted-foreground">
            Lextract gives every extracted field a confidence score of High, Medium, or Low.
            The score tells reviewers which fields to check first. It is a review priority
            signal, not a guarantee of accuracy. You should always verify extracted data
            against the original lease. Here is how the three methods compare.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-primary text-primary-foreground">
                <tr>
                  <th className="border-b border-primary-foreground/20 p-3 text-left font-medium">
                    Method
                  </th>
                  <th className="border-b border-primary-foreground/20 p-3 text-center font-medium">
                    Cost/Lease
                  </th>
                  <th className="border-b border-primary-foreground/20 p-3 text-center font-medium">
                    Time/Lease
                  </th>
                  <th className="border-b border-primary-foreground/20 p-3 text-center font-medium">
                    Fields
                  </th>
                  <th className="border-b border-primary-foreground/20 p-3 text-center font-medium">
                    Review signal
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    method: 'Manual or outsourced abstraction',
                    cost: '$90–$250',
                    time: '4–8 hours',
                    fields: 'Varies by reviewer',
                    accuracy: 'Reviewer judgment',
                    highlight: false,
                  },
                  {
                    method: 'ChatGPT (manual prompting)',
                    cost: '~$0',
                    time: '30–60 min setup',
                    fields: 'Inconsistent',
                    accuracy: 'Inconsistent',
                    highlight: false,
                  },
                  {
                    method: 'Lextract AI',
                    cost: formatPrice(PRICING.single.price),
                    time: '5–15 min',
                    fields: '126',
                    accuracy: 'Confidence scores',
                    highlight: true,
                  },
                ].map((row, i) => (
                  <tr key={row.method} className={i % 2 === 0 ? 'bg-muted/20' : ''}>
                    <td
                      className={`border-b p-3 font-medium ${row.highlight ? 'text-primary' : ''}`}
                    >
                      {row.method}
                    </td>
                    <td
                      className={`border-b p-3 text-center ${row.highlight ? 'bg-primary/5 font-semibold text-primary' : 'text-muted-foreground'}`}
                    >
                      {row.cost}
                    </td>
                    <td
                      className={`border-b p-3 text-center ${row.highlight ? 'bg-primary/5 font-semibold text-primary' : 'text-muted-foreground'}`}
                    >
                      {row.time}
                    </td>
                    <td
                      className={`border-b p-3 text-center ${row.highlight ? 'bg-primary/5 font-semibold text-primary' : 'text-muted-foreground'}`}
                    >
                      {row.fields}
                    </td>
                    <td
                      className={`border-b p-3 text-center ${row.highlight ? 'bg-primary/5 font-semibold text-primary' : 'text-muted-foreground'}`}
                    >
                      {row.accuracy}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-12">
          <h2 className="font-display mb-6 text-2xl font-bold text-brand-dark sm:text-3xl lg:text-4xl">
            How AI Lease Abstraction Works
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {[
              {
                step: '1',
                title: 'Upload Lease PDF',
                body: 'Upload any commercial lease PDF, scanned or digital, up to 200 pages. Lextract accepts standard lease formats: NNN, modified gross, full service gross, ground leases, and percentage leases.',
              },
              {
                step: '2',
                title: 'Vision AI Reads the PDF',
                body: 'Vision AI reads the whole document, scanned or digital. It keeps page layout, tables, signatures, and stamps in view the way a human reviewer would. There is no separate OCR step.',
              },
              {
                step: '3',
                title: 'Multi-Pass AI Extraction',
                body: 'Three AI passes process the lease. The primary extraction finds 126 structured fields. The adversarial validation challenges each answer. The escalation pass re-checks disputed critical fields. The pipeline also detects 20 red flag patterns, such as personal liability, steep rent escalations, and burdensome CAM exclusions.',
              },
              {
                step: '4',
                title: 'Structured Output',
                body: 'You get the results as Excel (.xlsx), Word (.docx), or PDF. Each field has a confidence score of High, Medium, or Low, plus red flag notes. Processing usually takes 5 to 15 minutes, depending on document length and complexity.',
              },
            ].map((item) => (
              <div key={item.step} className="rounded-xl border bg-card p-5 sm:p-6">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {item.step}
                </div>
                <h3 className="mb-2 text-xl font-semibold sm:text-2xl">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What AI Abstraction Extracts */}
        <section className="mb-12">
          <h2 className="font-display mb-3 text-2xl font-bold text-brand-dark sm:text-3xl lg:text-4xl">
            What AI Lease Abstraction Extracts
          </h2>
          <p className="mb-6 text-base text-muted-foreground">
            Lextract extracts {PRODUCT_FIELD_COUNT} structured fields across the full lease
            schema. Every field includes a confidence score. Low-confidence fields are flagged
            so you know where to focus your review.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FIELD_CATEGORIES.map((cat) => (
              <div key={cat.name} className="rounded-xl border bg-card p-5 sm:p-6">
                <h3 className="mb-2 text-xl font-semibold sm:text-2xl">{cat.name}</h3>
                <p className="text-sm text-muted-foreground">{cat.examples}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            <Link href="/fields" className="text-primary underline underline-offset-4">
              See all 126 extracted fields
            </Link>
          </p>
        </section>

        {/* AI vs Manual vs Free Tools */}
        <section className="mb-12">
          <h2 className="font-display mb-3 text-2xl font-bold text-brand-dark sm:text-3xl lg:text-4xl">
            AI Lease Abstraction vs. Manual vs. Free Tools
          </h2>
          <p className="mb-4 text-base leading-relaxed text-muted-foreground">
            Free AI tools like ChatGPT can summarize a lease. They are not built to return a
            consistent 126-field structured export, per-field confidence scores, or red flag
            detection. They tend to give narrative answers, not machine-readable data for
            Yardi or MRI. Lextract costs $15 per lease. It returns structured Excel, Word, and
            PDF output, a confidence score on every field, and 20 red flag checks.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-primary text-primary-foreground">
                <tr>
                  <th className="border-b border-primary-foreground/20 p-3 text-left font-medium">
                    Capability
                  </th>
                  <th className="border-b border-primary-foreground/20 p-3 text-center font-medium">
                    Free (ChatGPT)
                  </th>
                  <th className="border-b border-primary-foreground/20 p-3 text-center font-medium">
                    Manual (Paralegal)
                  </th>
                  <th className="border-b border-primary-foreground/20 bg-primary-foreground/10 p-3 text-center font-semibold">
                    Lextract AI
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={row.label} className={i % 2 === 0 ? 'bg-muted/20' : ''}>
                    <td className="border-b p-3 font-medium">{row.label}</td>
                    <td className="border-b p-3 text-center text-muted-foreground">
                      {row.free}
                    </td>
                    <td className="border-b p-3 text-center text-muted-foreground">
                      {row.manual}
                    </td>
                    <td className="border-b bg-primary/5 p-3 text-center font-semibold text-primary">
                      {row.lextract}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="font-display mb-6 text-2xl font-bold text-brand-dark sm:text-3xl lg:text-4xl">
            AI Lease Abstraction FAQs
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
              <p className="mt-1 text-muted-foreground">126 fields, $15/lease, comparison vs manual and enterprise</p>
            </Link>
            <Link
              href="/lease-extraction-software"
              className="rounded-lg border p-4 text-sm transition-colors hover:bg-muted/50"
            >
              <span className="font-medium">Lease Extraction Software</span>
              <p className="mt-1 text-muted-foreground">AI-powered PDF to structured data extraction</p>
            </Link>
            <Link
              href="/lease-abstraction-services"
              className="rounded-lg border p-4 text-sm transition-colors hover:bg-muted/50"
            >
              <span className="font-medium">Lease Abstraction Services</span>
              <p className="mt-1 text-muted-foreground">AI software vs. outsourced BPO vs. in-house comparison</p>
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
            Try Lextract on your own lease
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            Upload any commercial lease PDF. See a free preview first. Pay{' '}
            {formatPrice(PRICING.single.price)} only for the full report. You get 126 fields in
            5 to 15 minutes. We also run 20 red flag checks. No subscription.
          </p>
          <Link
            href="/upload"
            className="inline-flex w-full items-center justify-center rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
          >
            Get a free preview
          </Link>
          <p className="mt-3 text-xs text-muted-foreground">
            No subscription. Credits never expire.
          </p>
        </section>
      </div>
    </>
  )
}
