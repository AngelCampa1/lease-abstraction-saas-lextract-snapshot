import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE_URL, DEFAULT_OG_IMAGE } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/json-ld'
import {
  buildBreadcrumbSchema,
  buildFAQPageSchema,
  buildWebApplicationSchema,
  buildSpeakableSchema,
  buildHowToSchema,
} from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import type { FaqItem } from '@/lib/content-types'
import { PRICING, formatPrice } from '@/lib/pricing'

export const metadata: Metadata = {
  title: 'Lease Extraction Software - AI-Powered PDF to Structured Data',
  description:
    'Lextract is AI-powered lease extraction software that converts commercial lease PDFs into 126 structured data fields in minutes. Vision-AI extraction at $15 per lease. No subscription.',
  alternates: {
    canonical: `${SITE_URL}/lease-extraction-software`,
  },
  openGraph: {
    url: `${SITE_URL}/lease-extraction-software`,
    title: 'Lease Extraction Software - AI-Powered PDF to Structured Data | Lextract',
    description:
      'AI-powered lease extraction software. Convert any commercial lease PDF into 126 structured fields in minutes. $15 per lease. No subscription.',
    type: 'website',
    images: [DEFAULT_OG_IMAGE],
  },
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'What is lease extraction software?',
    answer:
      'Lease extraction software reads commercial lease PDFs and pulls structured data fields into a machine-readable format. Those fields include tenant name, rent amounts, lease dates, CAM provisions, and renewal options. Lextract is AI-powered lease extraction software. It reads scanned and digital PDFs directly. Every lease runs through multi-pass AI validation. The result is 126 structured fields in minutes, with per-field confidence scores and 20 automated red flag checks.',
  },
  {
    question: 'What is the best lease extraction software?',
    answer:
      'Lextract is a strong fit for commercial real estate professionals. It extracts 126 structured fields from a commercial lease PDF at $15 per lease with no subscription. Lextract combines per-field confidence scoring, 20 automated red flag checks, and structured exports to Excel, Word, and PDF, all at a pay-per-lease price.',
  },
  {
    question: 'How does lease extraction software work?',
    answer:
      'Lease extraction software uses AI to turn unstructured lease documents into structured data. Lextract reads scanned and digital PDFs directly, with no separate OCR step. It keeps page layout, tables, and signatures. Every lease then runs through three AI passes: primary extraction, adversarial validation, and an escalation pass on disputed critical fields. The output is 126 named fields in a structured format with per-field confidence scores.',
  },
  {
    question: 'How much does lease extraction software cost?',
    answer:
      'Lextract lease extraction software costs $15 per lease. There is no subscription, no setup fee, and no minimum commitment. Volume pricing brings the price down: $65 for 5 leases ($13 each, 13% off) and $120 for 10 leases ($12 each, 20% off). Credits never expire. Enterprise lease extraction platforms usually require an annual contract instead.',
  },
  {
    question: 'Is lease extraction software the same as lease abstraction software?',
    answer:
      'Yes. Lease extraction software and lease abstraction software are the same category of tools. "Lease extraction" points to the technical process of pulling data from a document. "Lease abstraction" is the term property managers, paralegals, and CRE professionals use. Lextract is both.',
  },
  {
    question: 'Can lease extraction software handle scanned leases?',
    answer:
      'Yes. Lextract uses vision AI to read scanned paper leases directly. It keeps document structure such as table rows, clause headers, defined terms, signatures, and stamps. Confidence scores reflect document quality. Clear scans tend to return High-confidence fields. Low-quality scans flag affected fields for review.',
  },
  {
    question: 'What data does lease extraction software extract?',
    answer:
      'Lextract extracts 126 structured fields from a commercial lease. These cover parties and premises (landlord, tenant, guarantors, square footage), financial terms (base rent, escalation schedule, CAM estimate, security deposit, TI allowance), key dates (commencement, expiration, renewal deadlines), options and rights (renewal, expansion, termination, ROFR), expense obligations (CAM cap, exclusions, base year), and restrictions (permitted use, exclusive use, co-tenancy, go-dark rights).',
  },
  {
    question: 'What export formats does lease extraction software support?',
    answer:
      'Lextract exports lease data to Excel (.xlsx) for spreadsheet analysis, Word (.docx) for client-ready reports, and PDF for formal documentation. Every export includes confidence scores and red flag annotations.',
  },
  {
    question: 'How accurate is AI lease extraction software?',
    answer:
      'Lextract returns confidence-scored field extraction on standard commercial lease formats (NNN, modified gross, full service gross). Every extracted field includes a confidence score (High, Medium, or Low). Low-confidence fields are automatically flagged for human review, so reviewers focus on the fields that need attention rather than re-reading the full document.',
  },
  {
    question: 'What is commercial lease extraction?',
    answer:
      'Commercial lease extraction turns unstructured commercial lease documents into structured, machine-readable data. Those documents include PDFs, scanned paper leases, and Word files. Residential leases follow standard templates. Commercial leases do not. They contain provisions like CAM structures, escalation schedules, co-tenancy clauses, and amendment chains. These need layout-aware, vision-AI field extraction. Lextract is commercial lease extraction software built for this. It extracts 126 structured fields from a commercial lease PDF at $15 per extraction.',
  },
  {
    question: 'What is the difference between commercial lease extraction and residential lease extraction?',
    answer:
      'Commercial lease extraction is more complex than residential extraction. Commercial leases can run up to 200 pages, while residential leases are usually short. Each commercial lease is negotiated on its own. It does not follow a standard template. They include operating expense pass-throughs like CAM and NNN structures that residential leases do not. They also include amendment chains where later documents override earlier ones. Lextract is built for commercial lease extraction. It covers all 126 fields relevant to commercial real estate, including CAM provisions, percentage rent, co-tenancy, and ASC 842 compliance data.',
  },
]

const HOW_TO_STEPS = [
  {
    name: 'Upload Your Lease PDF',
    text: 'Drag and drop any commercial lease PDF (up to 200 pages). Lextract lease extraction software accepts scanned paper leases and native digital PDFs.',
  },
  {
    name: 'Vision AI Reads the PDF',
    text: 'Vision AI reads the full document, scanned or digital. It keeps page layout, tables, signatures, and stamps. There is no separate OCR step.',
  },
  {
    name: 'Multi-Pass AI Extraction',
    text: 'Three AI passes process the lease. Primary extraction finds 126 structured fields (parties, rent schedule, CAM provisions, renewal options, critical dates, plus 20 red flag checks). Adversarial validation challenges every answer. An escalation pass re-checks disputed critical fields. Each field gets a confidence score.',
  },
  {
    name: 'Download Structured Data',
    text: 'Export your lease data as Excel (.xlsx), Word (.docx), or a PDF report. Every field includes a confidence score (High, Medium, or Low) so you can target your review.',
  },
]

const FEATURES = [
  {
    stat: '126 Fields',
    label: 'Extracted',
    description: 'Parties, financials, dates, CAM provisions, options, and red flags',
  },
  {
    stat: '5–15 Min',
    label: 'Per Lease',
    description: 'From PDF upload to full structured data output',
  },
  {
    stat: '20 Checks',
    label: 'Red Flags',
    description: 'Automated detection of risky provisions',
  },
  {
    stat: formatPrice(PRICING.single.price),
    label: 'Per Extraction',
    description: 'No subscription. Volume pricing: $65/5-pack, $120/10-pack',
  },
  {
    stat: 'Confidence',
    label: 'Scored',
    description: 'Per-field confidence scores flag low-confidence extractions',
  },
  {
    stat: '3 Formats',
    label: 'Export',
    description: 'Excel (.xlsx), Word (.docx), and PDF report',
  },
]

const EXTRACTION_CATEGORIES = [
  {
    title: 'Parties & Premises',
    items: 'Landlord, tenant, guarantors, suite number, rentable square footage, building address',
  },
  {
    title: 'Financial Terms',
    items: 'Base rent, escalation schedule, CAM estimate, security deposit, TI allowance, percentage rent',
  },
  {
    title: 'Key Dates',
    items: 'Commencement, expiration, rent commencement, renewal deadlines, option notice dates',
  },
  {
    title: 'Options & Rights',
    items: 'Renewal options, expansion rights, right of first refusal, termination options, purchase options',
  },
  {
    title: 'Expense Obligations',
    items: 'CAM cap, base year, gross-up, exclusions, management fee, audit rights',
  },
  {
    title: 'Restrictions & Use',
    items: 'Permitted use, exclusive use clause, co-tenancy, go-dark rights, assignment/subletting',
  },
]

const COMPARISON_ROWS = [
  {
    label: 'Cost per lease',
    manual: 'Labor cost',
    outsourced: '$90–$250',
    enterprise: 'Enterprise contract',
    lextract: formatPrice(PRICING.single.price),
  },
  {
    label: 'Time per lease',
    manual: '4–8 hours',
    outsourced: 'Queue dependent',
    enterprise: 'Minutes',
    lextract: '5–15 min',
  },
  {
    label: 'Fields extracted',
    manual: 'Varies',
    outsourced: 'Varies',
    enterprise: 'Varies',
    lextract: '126',
  },
  {
    label: 'Confidence scoring',
    manual: 'No',
    outsourced: 'No',
    enterprise: 'Varies',
    lextract: 'Every field',
  },
  {
    label: 'Red flag detection',
    manual: 'Manual',
    outsourced: 'Manual',
    enterprise: 'Limited',
    lextract: '20 automated checks',
  },
  {
    label: 'Contract required',
    manual: 'No',
    outsourced: 'Sometimes',
    enterprise: 'Annual contract',
    lextract: 'No',
  },
]

export default function LeaseExtractionSoftwarePage() {
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Lease Extraction Software', url: `${SITE_URL}/lease-extraction-software` },
  ]

  return (
    <>
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(FAQ_ITEMS)} />
      <JsonLd schema={buildWebApplicationSchema()} />
      <JsonLd schema={buildSpeakableSchema(`${SITE_URL}/lease-extraction-software`, ['h1', '#overview'])} />
      <JsonLd
        schema={buildHowToSchema({
          name: 'How Lease Extraction Software Converts PDFs to Structured Data',
          steps: HOW_TO_STEPS,
        })}
      />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Lease Extraction Software' },
          ]}
        />
        <p className="mt-2 text-sm text-muted-foreground">Last updated: April 2026</p>

        {/* Hero */}
        <header className="mb-12 mt-6 text-center" id="overview">
          <h1 className="font-display text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl lg:text-5xl">
            Lease Extraction Software - PDF to 126 Structured Fields
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:text-xl">
            Lextract is AI-powered lease extraction software. It turns a commercial lease PDF
            into 126 structured data fields in minutes. Upload a lease and get structured data
            back: parties, rent schedule, CAM provisions, dates, options, and 20 red flag checks,
            each with a confidence score. $15 per extraction. No subscription required.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/upload"
              className="inline-flex w-full items-center justify-center rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
            >
              Extract Your First Lease - {formatPrice(PRICING.single.price)}
            </Link>
            <Link
              href="/sample-report"
              className="inline-flex w-full items-center justify-center rounded-full border px-8 py-3 text-sm font-medium transition-colors hover:bg-muted/30 sm:w-auto"
            >
              View Sample Extraction
            </Link>
          </div>
        </header>

        <section className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              title: 'What Lextract solves',
              body: 'Lease data is usually trapped in PDFs, email attachments, and manual spreadsheets. That slows diligence, renewals, CAM review, and reporting.',
            },
            {
              title: 'How Lextract solves it',
              body: 'Lextract reads the PDF and extracts 126 structured fields. It scores confidence, flags lease risks, and exports clean data for review or other systems.',
            },
            {
              title: 'Who uses Lextract',
              body: 'Commercial real estate teams, brokers, attorneys, tenant reps, operators, property managers, lenders, and investors use it when they need lease data fast.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-lg border bg-card p-5 shadow-sm sm:p-6">
              <h2 className="text-sm font-semibold text-primary">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </section>

        {/* Features Grid */}
        <section className="mb-16">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.stat}
                className="rounded-xl border bg-card p-5 shadow sm:p-6"
              >
                <div className="mb-1 text-3xl font-extrabold tracking-tight text-primary">
                  {feature.stat}
                </div>
                <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {feature.label}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How Lease Extraction Works */}
        <section className="mb-16">
          <h2 className="mb-2 font-display text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl lg:text-4xl">
            How Lextract Lease Extraction Software Works
          </h2>
          <p className="mb-8 text-muted-foreground">
            Lextract combines vision AI that reads PDFs directly with multi-pass AI validation.
            The passes are primary extraction, adversarial review, and an escalation pass on
            disputed critical fields. Together they turn a commercial lease PDF into 126 structured
            data fields in minutes, not hours.
          </p>
          <ol className="space-y-6">
            {HOW_TO_STEPS.map((step, index) => (
              <li key={step.name} className="flex gap-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-sm text-primary-foreground">
                  {index + 1}
                </div>
                <div>
                  <h3 className="mb-1 text-xl font-semibold sm:text-2xl">{step.name}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* What Gets Extracted */}
        <section className="mb-16">
          <h2 className="mb-2 font-display text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl lg:text-4xl">
            What Lextract Lease Extraction Software Extracts
          </h2>
          <p className="mb-8 text-muted-foreground">
            Lextract extracts 126 fields across the full lease schema from every
            commercial lease: parties and premises, financial terms, key dates, options and rights,
            expense obligations, and use restrictions.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EXTRACTION_CATEGORIES.map((category) => (
              <div
                key={category.title}
                className="rounded-xl border bg-muted/30 p-5 sm:p-6"
              >
                <h3 className="mb-2 text-xl font-semibold sm:text-2xl">{category.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{category.items}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison Table */}
        <section className="mb-16">
          <h2 className="mb-2 font-display text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl lg:text-4xl">
            Lease Extraction Software Compared
          </h2>
          <p className="mb-8 text-muted-foreground">
            Lextract lease extraction software costs $15 per lease with no subscription. Outsourced
            abstraction services often run $90 to $250 per lease, and enterprise platforms usually
            require an annual contract.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-primary text-primary-foreground">
                <tr>
                  <th className="border-b border-primary-foreground/20 p-3 text-left font-medium"></th>
                  <th className="border-b border-primary-foreground/20 p-3 text-center font-semibold">
                    Manual Paralegal
                  </th>
                  <th className="border-b border-primary-foreground/20 p-3 text-center font-semibold">
                    Outsourced BPO
                  </th>
                  <th className="border-b border-primary-foreground/20 p-3 text-center font-semibold">
                    Enterprise Platform
                  </th>
                  <th className="border-b border-primary-foreground/20 p-3 text-center font-semibold bg-primary-foreground/10">
                    Lextract
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, rowIndex) => (
                  <tr key={row.label} className={rowIndex % 2 === 0 ? 'bg-muted/20' : ''}>
                    <td className="border-b p-3 font-medium">{row.label}</td>
                    <td className="border-b p-3 text-center text-muted-foreground">{row.manual}</td>
                    <td className="border-b p-3 text-center text-muted-foreground">{row.outsourced}</td>
                    <td className="border-b p-3 text-center text-muted-foreground">{row.enterprise}</td>
                    <td className="border-b p-3 text-center bg-primary/5 font-semibold text-primary">
                      {row.lextract}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Extraction vs Abstraction */}
        <section className="mb-16" id="extraction-vs-abstraction">
          <h2 className="mb-2 font-display text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl lg:text-4xl">
            Lease Extraction Software vs. Lease Abstraction Software
          </h2>
          <p className="mb-4 text-base leading-relaxed text-muted-foreground">
            Lease extraction software and{' '}
            <Link href="/lease-abstraction-software" className="text-primary hover:text-primary/80 font-medium">
              lease abstraction software
            </Link>{' '}
            are the same category of tools. Both read commercial lease PDFs and turn unstructured
            legal text into structured, machine-readable data fields. The term
            &quot;lease extraction&quot; points to the technical process of pulling data points from
            a document. &quot;Lease abstraction&quot; is the term property managers, paralegals, and
            CRE professionals use for the same workflow.
          </p>
          <p className="mb-4 text-base leading-relaxed text-muted-foreground">
            Lextract is both lease extraction software and lease abstraction software. Vision
            AI reads the lease PDF directly, including scanned documents. Multi-pass AI
            validation then extracts 126 structured fields with per-field confidence scores. Those
            fields include rent schedules, CAM provisions, renewal options, critical dates, and 20
            automated red flag checks. Whether you search for &quot;lease extraction software&quot;
            or &quot;lease abstraction software,&quot; Lextract gives the same output: structured
            lease data at $15 per lease, ready for import into Yardi, MRI, Excel, or your property
            management system.
          </p>
        </section>

        {/* Commercial Lease Extraction */}
        <section className="mb-16" id="commercial-lease-extraction">
          <h2 className="mb-2 font-display text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl lg:text-4xl">
            Commercial Lease Extraction Software
          </h2>
          <p className="mb-8 text-base leading-relaxed text-muted-foreground">
            Commercial lease extraction is harder than residential or equipment lease processing.
            Commercial leases can run up to 200 pages. They use cross-referenced defined terms,
            amendment chains that override base lease provisions, and CAM structures that vary by
            property type. Lextract is commercial lease extraction software built for this.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-muted/30 p-5 sm:p-6">
              <h3 className="mb-2 text-xl font-semibold sm:text-2xl">Portfolio Acquisition Due Diligence</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Extract structured data from a data room of leases in days, not months.
                Reconcile extracted rent rolls against seller-provided summaries to spot discrepancies
                before closing. Lextract processes each lease on its own at $15 per extraction with
                no volume commitment.
              </p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-5 sm:p-6">
              <h3 className="mb-2 text-xl font-semibold sm:text-2xl">ASC 842 / IFRS 16 Compliance</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Lextract extracts ASC 842 compliance fields such as lease classification, discount rate,
                purchase option, variable payments, residual value guarantee, lease incentives, the
                short-term election, and lease term. These sit alongside the rest of the 126 fields. Feed
                the structured output into your lease accounting system to help calculate right-of-use
                assets and lease liabilities.
              </p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-5 sm:p-6">
              <h3 className="mb-2 text-xl font-semibold sm:text-2xl">Multi-Tenant Retail Analysis</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Extract percentage rent breakpoints, co-tenancy clauses, exclusive use provisions, and
                radius restrictions from every tenant lease in a shopping center or mixed-use property.
                Structured data lets you model vacancy impact, find co-tenancy triggers, and flag
                overlapping exclusivity provisions across the tenant roster.
              </p>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="mb-16">
          <h2 className="mb-2 font-display text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl lg:text-4xl">
            Who Uses Lease Extraction Software
          </h2>
          <p className="mb-8 text-muted-foreground">
            Lextract lease extraction software serves CRE professionals who need structured data from
            lease documents for portfolio management, due diligence, compliance, and negotiation.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border bg-muted/30 p-5 sm:p-6">
              <h3 className="mb-2 text-xl font-semibold sm:text-2xl">Property Managers</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Extract rent escalation schedules, CAM caps, and critical dates to prevent revenue leakage and automate lease administration workflows.
              </p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-5 sm:p-6">
              <h3 className="mb-2 text-xl font-semibold sm:text-2xl">Tenant Representatives</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Extract client lease terms before negotiation to surface red flags, leverage points, and unfavorable provisions.
              </p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-5 sm:p-6">
              <h3 className="mb-2 text-xl font-semibold sm:text-2xl">CRE Attorneys &amp; Paralegals</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Generate structured lease summaries for client review and due diligence, reducing manual data entry from hours to minutes.
              </p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-5 sm:p-6">
              <h3 className="mb-2 text-xl font-semibold sm:text-2xl">Investors &amp; Acquirers</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Extract lease data from acquisition target portfolios for underwriting, rent roll verification, and ASC 842 compliance.
              </p>
            </div>
          </div>
        </section>

        {/* Real-World Extractions */}
        <section className="mb-16">
          <h2 className="mb-2 font-display text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl lg:text-4xl">
            Real-World Lease Extractions
          </h2>
          <p className="mb-8 text-muted-foreground">
            Lextract has been run against real commercial leases from publicly traded companies,
            lease amendments, and multi-tenant structures.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link
              href="/case-studies/karyopharm-biotech-office"
              className="group rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:bg-muted/50 sm:p-6"
            >
              <p className="font-semibold group-hover:text-primary transition-colors">
                Karyopharm Therapeutics - 6th Amendment
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Extracted 126 fields from a sixth amendment with step rent schedules across a
                60-month term. Modified gross, 52,000 RSF office in Newton, MA.
              </p>
            </Link>
            <Link
              href="/case-studies"
              className="group rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:bg-muted/50 sm:p-6"
            >
              <p className="font-semibold group-hover:text-primary transition-colors">
                View All Case Studies
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                NNN retail, industrial sublease, biotech office, and ground lease. Real lease
                extractions with full field breakdowns and complexity notes.
              </p>
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-16">
          <h2 className="mb-8 font-display text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl lg:text-4xl">
            Lease Extraction Software FAQs
          </h2>
          <div className="space-y-6">
            {FAQ_ITEMS.map((faq) => (
              <div key={faq.question}>
                <h3 className="mb-2 text-xl font-semibold sm:text-2xl">{faq.question}</h3>
                <p className="text-base leading-relaxed text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Related Pages */}
        <section className="mb-16">
          <h2 className="mb-4 font-display text-xl font-bold tracking-tight text-brand-dark">
            Related Pages
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/lease-abstraction-software"
              className="rounded-lg border p-4 text-sm transition-colors hover:bg-muted/50"
            >
              <span className="font-medium">Lease Abstraction Software</span>
              <p className="mt-1 text-muted-foreground">126 fields, $15/lease, comparison vs manual and enterprise platforms</p>
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
            <Link
              href="/automated-lease-abstraction"
              className="rounded-lg border p-4 text-sm transition-colors hover:bg-muted/50"
            >
              <span className="font-medium">Automated Lease Abstraction</span>
              <p className="mt-1 text-muted-foreground">How automation replaces manual paralegal abstraction</p>
            </Link>
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-xl border border-primary/10 bg-primary/5 p-6 text-center sm:p-8">
          <h2 className="mb-3 font-display text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl lg:text-4xl">
            Ready to Extract Your First Lease?
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            Lextract lease extraction software delivers 126 structured fields from any commercial
            lease PDF in minutes. $15 per extraction. No subscription required.
          </p>
          <Link
            href="/upload"
            className="inline-flex w-full items-center justify-center rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
          >
            Extract Your First Lease - {formatPrice(PRICING.single.price)}
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">
            No subscription. Credits never expire.
          </p>
        </section>
      </div>
    </>
  )
}
