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

export const metadata: Metadata = {
  title: 'Automated Lease Abstraction Software - PDF to Structured Data',
  description:
    'Automate commercial lease abstraction with Lextract. Extract 126 structured fields from any lease PDF in minutes using vision AI. $15 per lease, no subscription.',
  alternates: {
    canonical: `${SITE_URL}/automated-lease-abstraction`,
  },
  openGraph: {
    url: `${SITE_URL}/automated-lease-abstraction`,
    title: 'Automated Lease Abstraction Software - PDF to Structured Data | Lextract',
    description:
      'Automate commercial lease abstraction with Lextract. Extract 126 structured fields from any lease PDF in minutes using vision AI. $15 per lease, no subscription.',
    type: 'website',
    images: [DEFAULT_OG_IMAGE],
  },
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'What is automated lease abstraction?',
    answer:
      'Automated lease abstraction uses vision AI to extract structured data fields from commercial lease PDFs without manual reading or data entry. Lextract reads scanned and digital PDFs. Every lease then runs through three AI passes: a primary extraction, an adversarial validation, and an escalation pass on disputed critical fields. You get 126 structured fields, including rent schedules, CAM provisions, renewal options, and critical dates. Processing takes 5 to 15 minutes. The price is $15 per lease.',
  },
  {
    question: 'How accurate is automated lease abstraction?',
    answer:
      'Lextract gives every extracted field a confidence score of High, Medium, or Low. The score tells reviewers what to check first. It is not a promise that the value is right. You should always verify extracted data against the original lease. All 20 red flag checks are included at no extra cost.',
  },
  {
    question: 'What gets automated in lease abstraction?',
    answer:
      'Lextract automates five steps. First, PDF reading: vision AI reads the whole lease, including scanned documents, and keeps layout, tables, and signatures in view. Second, field extraction: a primary AI pass finds all 126 structured fields. Third, multi-pass validation: an adversarial AI pass challenges each answer, and an escalation pass re-checks disputed critical fields. Fourth, red flag detection: 20 categories of risky provisions are flagged, with a confidence score on each field. Fifth, structured export: you get the results as Excel, Word, or PDF without manual re-keying.',
  },
  {
    question: 'Can automated abstraction handle scanned leases?',
    answer:
      'Yes. Lextract handles both native digital PDFs and scanned paper leases. Vision AI reads the whole document and keeps page layout, tables, signatures, and stamps in view the way a human reviewer would, even in low-quality scans. Confidence scores reflect the quality of the source. That helps reviewers spot fields where a poor scan may have affected extraction.',
  },
  {
    question: 'How much does automated lease abstraction cost?',
    answer:
      'Lextract costs $15 per lease for a single extraction, $65 for a 5-pack ($13/lease, 13% off), or $120 for a 10-pack ($12/lease, 20% off). There is no subscription and no annual contract. Outsourced and manual abstraction services typically run $90 to $250 per lease, so Lextract costs much less per lease.',
  },
]

const AUTOMATION_STEPS = [
  {
    step: '1',
    title: 'Upload Lease PDF',
    automated: 'Manual step',
    description:
      'Upload any commercial lease PDF, scanned or digital, up to 200 pages. Lextract accepts NNN, modified gross, full service gross, ground leases, and percentage lease formats.',
  },
  {
    step: '2',
    title: 'Vision AI Reads the PDF',
    automated: 'Fully automated',
    description:
      'Vision AI reads the whole document, scanned or digital. It keeps page layout, tables, signatures, and stamps in view the way a human reviewer would. There is no separate OCR step.',
  },
  {
    step: '3',
    title: 'Multi-Pass AI Extraction',
    automated: 'Fully automated',
    description:
      'Three AI passes process the lease. The primary extraction finds 126 structured fields. The adversarial validation challenges each answer. The escalation pass re-checks disputed critical fields. The pipeline also flags 20 red flag patterns. This replaces manual reading and data entry.',
  },
  {
    step: '4',
    title: 'Structured Output',
    automated: 'Fully automated',
    description:
      'You get the results as Excel (.xlsx), Word (.docx), or PDF, with a confidence score on each field and red flag notes. Processing usually takes 5 to 15 minutes, depending on document length and complexity.',
  },
]

const WHAT_GETS_AUTOMATED = [
  {
    process: 'Document digitization',
    manual: 'Scan and OCR setup by hand',
    automated: 'Vision AI reads PDFs directly, layout-aware',
  },
  {
    process: 'Field extraction',
    manual: 'Reading and data entry by hand',
    automated: 'Multi-pass AI identifies all 126 fields',
  },
  {
    process: 'Red flag detection',
    manual: 'Clause review by hand',
    automated: '20 risk checks, automatic',
  },
  {
    process: 'Quality review',
    manual: 'Full re-read for spot-checking',
    automated: 'Confidence score on every field (High/Medium/Low)',
  },
  {
    process: 'Structured export',
    manual: 'Manual re-keying into Yardi or MRI',
    automated: 'Excel, Word, PDF export',
  },
]

export default function AutomatedLeaseAbstractionPage() {
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    {
      name: 'Automated Lease Abstraction',
      url: `${SITE_URL}/automated-lease-abstraction`,
    },
  ]

  return (
    <>
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(FAQ_ITEMS)} />
      <JsonLd schema={buildWebApplicationSchema()} />
      <JsonLd schema={buildSpeakableSchema(`${SITE_URL}/automated-lease-abstraction`, ['h1', '#overview'])} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Automated Lease Abstraction' },
          ]}
        />
        <p className="mt-2 text-xs text-muted-foreground">Last updated: March 2026</p>

        {/* Hero */}
        <header className="mb-12 mt-6">
          <h1 className="font-display text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl lg:text-5xl">
            Automated Lease Abstraction: From PDF to 126 Fields in Minutes
          </h1>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg lg:text-xl">
            Automated lease abstraction software replaces manual paralegal review with
            AI-powered field extraction. Lextract pulls 126 structured data fields from any
            commercial lease PDF in 5 to 15 minutes, at $15 per lease. A manual task that takes
            4 to 8 hours is done in minutes, with a confidence score on every field.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/upload"
              className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
            >
              Automate Your Lease Abstraction for {formatPrice(PRICING.single.price)}
            </Link>
            <Link
              href="/fields"
              className="inline-flex w-full items-center justify-center rounded-full border px-6 py-3 text-sm font-medium transition-colors hover:bg-muted/30 sm:w-auto"
            >
              See All 126 Fields
            </Link>
          </div>
        </header>

        <section className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              title: 'What Lextract solves',
              body: 'Manual abstraction makes teams read, copy, verify, and format every lease term by hand. The slow part is turning the document into data.',
            },
            {
              title: 'How Lextract solves it',
              body: 'Lextract automates the extraction path. It reads the PDF, returns 126 structured fields, scores confidence, runs 20 red flag checks, and gives you export-ready output.',
            },
            {
              title: 'Who uses Lextract',
              body: 'Commercial real estate teams use it for faster review. That includes brokers, attorneys, tenant reps, operators, property managers, lenders, and investors.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-lg border bg-card p-5 shadow-sm sm:p-6">
              <h2 className="text-sm font-semibold text-primary">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </section>

        {/* What Is Automated Lease Abstraction */}
        <section className="mb-12 rounded-xl border bg-muted/30 p-6 sm:p-8">
          <h2 className="font-display mb-4 text-2xl font-bold text-brand-dark sm:text-3xl lg:text-4xl">
            What Is Automated Lease Abstraction?
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            Automated lease abstraction uses AI to extract structured data from commercial
            lease contracts without manual document review or data entry. Manual abstraction
            takes a paralegal about 4 to 8 hours per lease. They read a 50 to 150 page
            document, find each relevant clause, and type the data into a spreadsheet or
            property management system.
          </p>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Lextract does this in 5 to 15 minutes instead. Vision AI reads scanned and digital
            PDFs and keeps page layout, tables, signatures, and stamps in view. Every lease
            then runs through three AI passes: a primary extraction, an adversarial validation
            that challenges each answer, and an escalation pass that re-checks disputed critical
            fields. You get 126 structured fields. These include base rent schedules, CAM
            provisions, renewal options, and critical dates, plus 20 categories of risky
            provisions. Every field gets a confidence score of High, Medium, or Low, so
            reviewers know which fields to check first.
          </p>
        </section>

        {/* Automation ROI */}
        <section className="mb-12">
          <h2 className="font-display mb-6 text-2xl font-bold text-brand-dark sm:text-3xl lg:text-4xl">
            The ROI of Automated Lease Abstraction
          </h2>
          <p className="mb-6 text-base text-muted-foreground">
            Automated lease abstraction with Lextract costs much less per lease than manual or
            outsourced abstraction. Manual abstraction also takes 4 to 8 hours per lease,
            versus 5 to 15 minutes of processing with Lextract.
          </p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-5 sm:p-6">
              <h3 className="mb-4 text-base font-semibold text-muted-foreground">
                Manual or outsourced (10 leases)
              </h3>
              <div className="mb-2 text-3xl font-extrabold">$900–$2,500</div>
              <div className="text-sm text-muted-foreground">
                $90 to $250 per lease, the typical market range
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                <strong>Time:</strong> 4 to 8 hours of review per lease
              </div>
            </div>
            <div className="rounded-xl border border-primary bg-primary/5 p-5 ring-1 ring-primary sm:p-6">
              <h3 className="mb-4 text-base font-semibold text-primary">
                Lextract (10 leases)
              </h3>
              <div className="mb-2 text-3xl font-extrabold text-primary">$120</div>
              <div className="text-sm text-muted-foreground">
                $120 with the 10-pack ($12 per lease)
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                <strong>Time:</strong> 5 to 15 minutes of processing per lease
              </div>
            </div>
            <div className="rounded-xl border bg-card p-5 sm:p-6">
              <h3 className="mb-4 text-base font-semibold text-muted-foreground">
                You still review the output
              </h3>
              <div className="mb-2 text-3xl font-extrabold text-emerald-600">126 fields</div>
              <div className="text-sm text-muted-foreground">
                each with a confidence score to guide review
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                <strong>Note:</strong> always verify fields against the original lease
              </div>
            </div>
          </div>
          <div className="mt-6 rounded-xl border bg-muted/30 p-5 sm:p-6">
            <h3 className="mb-3 text-xl font-semibold sm:text-2xl">Larger portfolios</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The cost gap grows with volume. At $90 to $250 per lease, outsourced or manual
              abstraction of 100 leases runs into the tens of thousands of dollars. With
              Lextract 10-pack pricing of $12 per lease, the same 100 leases cost about $1,200.
              You then review the output, guided by per-field confidence scores.
            </p>
          </div>
        </section>

        {/* How Automation Works */}
        <section className="mb-12">
          <h2 className="font-display mb-6 text-2xl font-bold text-brand-dark sm:text-3xl lg:text-4xl">
            How Lextract Automates Lease Abstraction
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {AUTOMATION_STEPS.map((item) => (
              <div key={item.step} className="rounded-xl border bg-card p-5 sm:p-6">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.automated === 'Fully automated'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {item.automated}
                  </span>
                </div>
                <h3 className="mb-2 text-xl font-semibold sm:text-2xl">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* What Gets Automated */}
        <section className="mb-12">
          <h2 className="font-display mb-3 text-2xl font-bold text-brand-dark sm:text-3xl lg:text-4xl">
            What Lextract Automates
          </h2>
          <p className="mb-6 text-base text-muted-foreground">
            Lextract replaces five manual processes. Together they make up the 4 to 8 hours of
            a traditional paralegal abstraction.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-primary text-primary-foreground">
                <tr>
                  <th className="border-b border-primary-foreground/20 p-3 text-left font-medium">
                    Process
                  </th>
                  <th className="border-b border-primary-foreground/20 p-3 text-center font-medium">
                    Manual Method
                  </th>
                  <th className="border-b border-primary-foreground/20 bg-primary-foreground/10 p-3 text-center font-semibold">
                    Lextract Automation
                  </th>
                </tr>
              </thead>
              <tbody>
                {WHAT_GETS_AUTOMATED.map((row, i) => (
                  <tr key={row.process} className={i % 2 === 0 ? 'bg-muted/20' : ''}>
                    <td className="border-b p-3 font-medium">{row.process}</td>
                    <td className="border-b p-3 text-center text-muted-foreground">
                      {row.manual}
                    </td>
                    <td className="border-b bg-primary/5 p-3 text-center font-semibold text-primary">
                      {row.automated}
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
            Automated Lease Abstraction FAQs
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
              href="/lease-abstraction-services"
              className="rounded-lg border p-4 text-sm transition-colors hover:bg-muted/50"
            >
              <span className="font-medium">Lease Abstraction Services</span>
              <p className="mt-1 text-muted-foreground">AI software vs. outsourced BPO vs. in-house comparison</p>
            </Link>
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-xl border border-primary/10 bg-primary/5 p-6 text-center sm:p-8">
          <h2 className="font-display mb-3 text-2xl font-bold text-brand-dark sm:text-3xl lg:text-4xl">
            Automate Your Lease Abstraction for {formatPrice(PRICING.single.price)}
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            Upload any commercial lease PDF. Lextract extracts 126 structured fields in 5 to 15
            minutes, with 20 red flag checks and a confidence score on every field. No
            subscription required.
          </p>
          <Link
            href="/upload"
            className="inline-flex w-full items-center justify-center rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
          >
            Automate Your Lease Abstraction for {formatPrice(PRICING.single.price)}
          </Link>
          <p className="mt-3 text-xs text-muted-foreground">
            No subscription. Credits never expire.
          </p>
        </section>
      </div>
    </>
  )
}
