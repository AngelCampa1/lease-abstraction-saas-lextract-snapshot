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
  title: 'Commercial Lease Abstraction Software for Structured Exports and Review Workflows',
  description:
    'Lextract is commercial lease abstraction software for teams that need structured lease data, confidence scoring, export-ready outputs, and faster review workflows without buying a full enterprise platform.',
  alternates: {
    canonical: `${SITE_URL}/lease-abstraction-software`,
  },
  openGraph: {
    url: `${SITE_URL}/lease-abstraction-software`,
    title:
      'Commercial Lease Abstraction Software for Structured Exports and Review Workflows | Lextract',
    description:
      'Commercial lease abstraction software for structured outputs, review workflows, and faster handoff into Yardi, MRI, Excel, and downstream systems.',
    type: 'website',
    images: [DEFAULT_OG_IMAGE],
  },
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'What is lease abstraction software?',
    answer:
      'Lease abstraction software turns long lease documents into structured data. You can review that data, export it, and load it into other systems. Lextract is built for this job. It pulls the key terms, scores confidence on each field, and flags items to check. Then your accounting, property management, diligence, or reporting team can use the result.',
  },
  {
    question: 'How much does lease abstraction software cost?',
    answer:
      'Lextract charges per lease. It is $15 per lease. There is no subscription, no setup fee, and no annual commitment. That works well for acquisitions, backlog cleanup, portfolio reviews, and small teams. You get the abstraction step without buying a larger lease administration platform.',
  },
  {
    question: 'How accurate is AI lease abstraction software?',
    answer:
      'Lextract is built for review, not blind automation. Every extracted field comes with a confidence score. Lower-confidence fields are easy to spot. Reviewers can focus on the few fields that need a closer look instead of re-reading the full lease. You should always verify extracted data against the original lease.',
  },
  {
    question: 'What commercial lease types does Lextract support?',
    answer:
      'Lextract supports the major commercial lease structures: NNN, modified gross, gross, percentage, ground, and other negotiated formats. It reads both scanned and native PDFs. It keeps useful structure instead of forcing the document into a rigid template.',
  },
  {
    question: 'How is Lextract different from enterprise lease management software?',
    answer:
      'Enterprise platforms bundle abstraction with administration, reporting, approvals, and system-of-record tools. Lextract is narrower on purpose. It turns a lease PDF into structured output fast, with confidence scoring and review support. Teams can keep their current systems and still remove the manual abstraction step.',
  },
  {
    question: 'Can lease abstraction software handle scanned leases?',
    answer:
      'Yes. Lextract reads both scanned and native PDFs. It keeps useful layout cues such as tables, clause groupings, labels, and signatures. Document quality still matters. The workflow is built for real lease files, not just clean digital exports.',
  },
  {
    question: 'Does lease abstraction software help with ASC 842 and IFRS 16 prep?',
    answer:
      'Yes. For accounting prep, teams usually need the lease term, commencement details, rent schedule, renewal structure, and payment logic. Lextract extracts these into a format you can review and move into your accounting workflow.',
  },
  {
    question: 'What export formats does Lextract support?',
    answer:
      'Lextract exports to Excel, Word, and PDF. The same abstraction can move into spreadsheets, property-management imports, diligence packages, or client review documents without rework.',
  },
]

const HOW_TO_STEPS = [
  {
    name: 'Upload the lease PDF',
    text: 'Upload a native or scanned commercial lease PDF. Lextract is built for the files teams actually receive, including amendments and imperfect scans.',
  },
  {
    name: 'Run extraction and validation',
    text: 'Lextract reads the document and finds the key lease terms. It checks the output across multiple passes so the result is easier to review and trust.',
  },
  {
    name: 'Review confidence and flags',
    text: 'Each output includes confidence scores and red-flag checks. The reviewer can focus on exceptions and uncertain fields instead of starting from scratch.',
  },
  {
    name: 'Export into your workflow',
    text: 'Download the abstraction as Excel, Word, or PDF for import, analysis, reporting, diligence, or accounting prep.',
  },
]

const FEATURES = [
  {
    stat: 'Structured output',
    label: 'For real workflows',
    description: 'Built for review, export, and handoff into other systems.',
  },
  {
    stat: 'Confidence scoring',
    label: 'Field by field',
    description: 'See where the output is strong and where a reviewer should double-check.',
  },
  {
    stat: 'Red-flag checks',
    label: 'Built in',
    description: 'Key exceptions show up next to the abstraction instead of staying buried in the document.',
  },
  {
    stat: formatPrice(PRICING.single.price),
    label: 'Per lease',
    description: 'No subscription and no platform commitment.',
  },
  {
    stat: 'Scanned and native PDFs',
    label: 'Supported',
    description: 'Built for the lease files teams actually receive, not just clean digital documents.',
  },
  {
    stat: 'Excel, Word, PDF',
    label: 'Exports',
    description: 'One extraction can support imports, reviews, diligence packages, and reporting.',
  },
]

const CLARITY_SECTIONS = [
  {
    title: 'What Lextract solves',
    body: 'Manual lease abstraction slows commercial real estate teams down. Critical dates, rent schedules, options, CAM language, and exceptions stay trapped in long documents, spreadsheets, and reviewer notes. That makes diligence, accounting, reporting, and property management harder.',
  },
  {
    title: 'How Lextract solves it',
    body: 'Lextract reads the PDF and extracts 126 structured fields. It checks the output, scores confidence on each field, and flags terms to review. You get an export-ready abstraction you can inspect, correct, and send into Excel, Word, PDF, or other systems.',
  },
  {
    title: 'Who uses Lextract',
    body: 'Lextract serves commercial real estate teams, brokers, attorneys, asset managers, lenders, operators, and consultants. They need lease data fast without adding another enterprise lease administration platform.',
  },
]

const EXTRACTION_CATEGORIES = [
  {
    title: 'Parties and premises',
    items: 'Tenant, landlord, guarantor, premises details, rentable area, and location identifiers.',
  },
  {
    title: 'Economics',
    items: 'Base rent schedules, escalations, concessions, deposits, and improvement allowances.',
  },
  {
    title: 'Critical dates',
    items: 'Commencement, expiration, notice deadlines, rent start dates, and option windows.',
  },
  {
    title: 'Options and rights',
    items: 'Renewals, expansion rights, termination language, purchase options, and protective rights.',
  },
  {
    title: 'Operating cost language',
    items: 'CAM structure, caps, exclusions, tax treatment, base years, and pass-through logic.',
  },
  {
    title: 'Restrictions and risk points',
    items: 'Use clauses, exclusives, co-tenancy, holdover language, and exception-heavy provisions.',
  },
]

const COMPARISON_ROWS = [
  {
    label: 'Best fit',
    manual: 'Low volume, high-touch review',
    outsourced: 'External overflow work',
    enterprise: 'Large portfolio system buyers',
    lextract: 'Teams that need abstraction without buying a new platform',
  },
  {
    label: 'Speed to first output',
    manual: 'Slowest',
    outsourced: 'Queue dependent',
    enterprise: 'Implementation dependent',
    lextract: 'Immediate pay-per-lease workflow',
  },
  {
    label: 'Reviewability',
    manual: 'Depends on reviewer',
    outsourced: 'Depends on vendor format',
    enterprise: 'Varies by platform',
    lextract: 'Confidence scoring plus export-ready structure',
  },
  {
    label: 'Commercial model',
    manual: 'Hourly labor',
    outsourced: 'Per abstract or contract',
    enterprise: 'Annual contract',
    lextract: '$15 per lease',
  },
]

export default function LeaseAbstractionSoftwarePage() {
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Lease Abstraction Software', url: `${SITE_URL}/lease-abstraction-software` },
  ]

  return (
    <>
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(FAQ_ITEMS)} />
      <JsonLd schema={buildWebApplicationSchema()} />
      <JsonLd
        schema={buildSpeakableSchema(`${SITE_URL}/lease-abstraction-software`, ['h1', '#overview'])}
      />
      <JsonLd
        schema={buildHowToSchema({
          name: 'How commercial lease abstraction software works',
          steps: HOW_TO_STEPS,
        })}
      />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Lease Abstraction Software' },
          ]}
        />
        <p className="mt-2 text-sm text-muted-foreground">Last updated: April 2026</p>

        <header className="mb-12 mt-6 text-center">
          <h1
            id="overview"
            className="font-display text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl lg:text-5xl"
          >
            Lease abstraction software that returns 126 fields
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:text-xl">
            Lextract handles the part of lease operations that usually slows everything down:
            turning dense lease PDFs into usable structured data. Upload a lease. Get the key
            fields, confidence scores, and red-flag checks back in minutes. Then export the result
            into Excel, Word, PDF, or your own system.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/upload"
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
            >
              Extract Your First Lease - {formatPrice(PRICING.single.price)}
            </Link>
            <Link
              href="/sample-report"
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full border px-8 py-3 text-sm font-medium transition-colors hover:bg-muted/30 sm:w-auto"
            >
              View Sample Report
            </Link>
          </div>
        </header>

        <section className="mb-16 border-y bg-muted/20 py-10">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {CLARITY_SECTIONS.map((section) => (
              <div
                key={section.title}
                className="md:border-l md:pl-6 first:md:border-l-0 first:md:pl-0"
              >
                <h2 className="text-lg font-semibold tracking-tight text-brand-dark">
                  {section.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{section.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.stat} className="rounded-xl border bg-card p-5 shadow sm:p-6">
                <div className="mb-1 text-2xl font-extrabold tracking-tight text-primary">
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

        <section className="mb-16">
          <h2 className="mb-2 font-display text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl lg:text-4xl">
            How Lextract Lease Abstraction Software Works
          </h2>
          <p className="mb-8 text-muted-foreground">
            The workflow is built around review, not just extraction. Lextract reads the
            lease and checks the answers across multiple passes. It flags uncertain fields and
            returns an output your team can review and use.
          </p>
          <ol className="space-y-6">
            {HOW_TO_STEPS.map((step, index) => (
              <li key={step.name} className="flex gap-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
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

        <section className="mb-16">
          <h2 className="mb-2 font-display text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl lg:text-4xl">
            Where Lextract Fits
          </h2>
          <p className="mb-8 text-muted-foreground">
            The biggest decision is usually not &quot;AI or no AI.&quot; It is whether you need a
            dedicated abstraction layer or a much larger platform purchase. Lextract is for teams
            that want fast, structured, exportable output without changing systems.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-primary text-primary-foreground">
                <tr>
                  <th className="border-b border-primary-foreground/20 p-3 text-left font-medium"></th>
                  <th className="border-b border-primary-foreground/20 p-3 text-center font-semibold">
                    Manual review
                  </th>
                  <th className="border-b border-primary-foreground/20 p-3 text-center font-semibold">
                    Outsourced team
                  </th>
                  <th className="border-b border-primary-foreground/20 p-3 text-center font-semibold">
                    Enterprise suite
                  </th>
                  <th className="border-b border-primary-foreground/20 bg-primary-foreground/10 p-3 text-center font-semibold">
                    Lextract
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, rowIndex) => (
                  <tr key={row.label} className={rowIndex % 2 === 0 ? 'bg-muted/20' : ''}>
                    <td className="border-b p-3 font-medium">{row.label}</td>
                    <td className="border-b p-3 text-center text-muted-foreground">{row.manual}</td>
                    <td className="border-b p-3 text-center text-muted-foreground">
                      {row.outsourced}
                    </td>
                    <td className="border-b p-3 text-center text-muted-foreground">
                      {row.enterprise}
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

        <section className="mb-16">
          <h2 className="mb-2 font-display text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl lg:text-4xl">
            What Lextract Extracts
          </h2>
          <p className="mb-8 text-muted-foreground">
            Lextract groups extraction by the categories teams use most: parties, economics,
            dates, options, operating-cost language, and key restrictions.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EXTRACTION_CATEGORIES.map((category) => (
              <div key={category.title} className="rounded-xl border bg-muted/30 p-5 sm:p-6">
                <h3 className="mb-2 text-xl font-semibold sm:text-2xl">{category.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{category.items}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16" id="extraction-vs-abstraction">
          <h2 className="mb-2 font-display text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl lg:text-4xl">
            Lease Extraction Software vs. Lease Abstraction Software
          </h2>
          <p className="mb-4 text-base leading-relaxed text-muted-foreground">
            Lease extraction software and lease abstraction software describe the same core job:
            turn unstructured lease language into structured, usable data. &quot;Extraction&quot;
            usually describes the technical process. &quot;Abstraction&quot; is the term CRE teams
            use day to day. Lextract covers both. It reads the document, finds the key terms,
            checks them, and returns a structured abstraction you can move straight into review or
            import.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="mb-2 font-display text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl lg:text-4xl">
            Real-World Lease Extractions
          </h2>
          <p className="mb-8 text-muted-foreground">
            Lextract has been run against real commercial leases, amendments, and portfolio
            reviews. These are cases where teams need speed but still want a reviewer in control of
            the output.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link
              href="/case-studies/karyopharm-biotech-office"
              className="group rounded-xl border bg-card p-5 shadow-sm transition-all hover:bg-muted/50 hover:shadow-md sm:p-6"
            >
              <p className="font-semibold transition-colors group-hover:text-primary">
                Karyopharm Therapeutics - 6th Amendment
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Example extraction from a complex amendment with structured rent logic and multiple
                review-sensitive fields.
              </p>
            </Link>
            <Link
              href="/case-studies"
              className="group rounded-xl border bg-card p-5 shadow-sm transition-all hover:bg-muted/50 hover:shadow-md sm:p-6"
            >
              <p className="font-semibold transition-colors group-hover:text-primary">
                View All Case Studies
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                See how Lextract performs across retail, office, industrial, and other
                commercial leases.
              </p>
            </Link>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="mb-8 font-display text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl lg:text-4xl">
            Lease Abstraction Software FAQs
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

        <section className="mb-16">
          <h2 className="mb-4 font-display text-xl font-bold tracking-tight text-brand-dark">
            Related Pages
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/resources/articles/what-is-commercial-lease-abstraction"
              className="rounded-lg border p-4 text-sm transition-colors hover:bg-muted/50"
            >
              <span className="font-medium">What Is Lease Abstraction?</span>
              <p className="mt-1 text-muted-foreground">
                Educational guide for teams learning the abstraction workflow and outputs.
              </p>
            </Link>
            <Link
              href="/resources/articles/best-ai-lease-abstraction-tools-2026"
              className="rounded-lg border p-4 text-sm transition-colors hover:bg-muted/50"
            >
              <span className="font-medium">Best AI Lease Abstraction Tools</span>
              <p className="mt-1 text-muted-foreground">
                Buyer-focused comparison of the current tool landscape and fit by workflow.
              </p>
            </Link>
            <Link
              href="/resources/articles/lease-abstraction-services-vs-ai-software"
              className="rounded-lg border p-4 text-sm transition-colors hover:bg-muted/50"
            >
              <span className="font-medium">Services vs. AI Software</span>
              <p className="mt-1 text-muted-foreground">
                Compare manual, outsourced, and software-based approaches to lease abstraction.
              </p>
            </Link>
            <Link
              href="/sample-report"
              className="rounded-lg border p-4 text-sm transition-colors hover:bg-muted/50"
            >
              <span className="font-medium">Sample Report</span>
              <p className="mt-1 text-muted-foreground">
                See the output structure before you run a lease through the workflow.
              </p>
            </Link>
          </div>
        </section>

        <section className="rounded-xl border border-primary/10 bg-primary/5 p-6 text-center sm:p-8">
          <h2 className="mb-3 font-display text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl lg:text-4xl">
            Ready to Replace Manual Lease Abstraction?
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            Use Lextract when you need abstraction output fast and want confidence on the fields
            that matter. You do not have to buy a full enterprise platform just to get lease data
            out of a PDF.
          </p>
          <Link
            href="/upload"
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
          >
            Extract Your First Lease - {formatPrice(PRICING.single.price)}
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">No subscription. Credits never expire.</p>
        </section>
      </div>
    </>
  )
}
