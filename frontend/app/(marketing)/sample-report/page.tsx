import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE_URL, DEFAULT_OG_IMAGE } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/json-ld'
import { buildBreadcrumbSchema, buildHowToSchema, buildFAQPageSchema } from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { ContentCta } from '@/components/content/content-cta'
import { FileText } from 'lucide-react'
import { CONFIDENCE_COLORS, SEVERITY_COLORS, STATUS_COLORS } from '@/lib/design-tokens'
import { PRICING, formatPrice } from '@/lib/pricing'

export const metadata: Metadata = {
  title: 'Sample Lease Extraction Report - See What Lextract Produces',
  description:
    'See an example Lextract extraction: 126 structured fields, per-field confidence scores, and red flag analysis from a commercial lease PDF. Try it yourself.',
  alternates: {
    canonical: `${SITE_URL}/sample-report`,
  },
  openGraph: {
    url: `${SITE_URL}/sample-report`,
    title: 'Sample Lease Extraction Report - See What Lextract Produces',
    description:
      'See an example Lextract extraction with 126 structured fields, confidence scores, and red flag analysis. Try it yourself for $15 per lease.',
    type: 'article',
    images: [DEFAULT_OG_IMAGE],
  },
  keywords: [
    'lease abstraction sample',
    'lease abstract example',
    'lease abstraction output',
    'lease abstract format',
    'what does a lease abstract include',
    'commercial lease extraction',
  ],
}

type ConfidenceLevel = 'high' | 'medium' | 'low'

interface SampleField {
  label: string
  value: string
  confidence: ConfidenceLevel
}

interface SampleCategory {
  name: string
  fields: SampleField[]
}

interface RedFlagItem {
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low'
}

const CONFIDENCE_STYLES: Record<ConfidenceLevel, string> = CONFIDENCE_COLORS

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

const SAMPLE_CATEGORIES: SampleCategory[] = [
  {
    name: 'Parties',
    fields: [
      { label: 'Tenant', value: 'Acme Corp LLC', confidence: 'high' },
      { label: 'Landlord', value: 'MainStreet Properties LP', confidence: 'high' },
      { label: 'Guarantor', value: 'John Smith (Personal Guarantee)', confidence: 'high' },
      { label: 'Tenant State of Formation', value: 'Delaware', confidence: 'high' },
    ],
  },
  {
    name: 'Key Dates',
    fields: [
      { label: 'Commencement Date', value: 'January 1, 2024', confidence: 'high' },
      { label: 'Expiration Date', value: 'December 31, 2028 (5-year term)', confidence: 'high' },
      { label: 'Rent Commencement Date', value: 'April 1, 2024 (3 months free rent)', confidence: 'high' },
      { label: 'Lease Execution Date', value: 'October 15, 2023', confidence: 'high' },
    ],
  },
  {
    name: 'Financial',
    fields: [
      {
        label: 'Base Rent',
        value: '$28.50/RSF/year ($142,500/year · $11,875/month)',
        confidence: 'high',
      },
      {
        label: 'Rent Escalation',
        value: '3% annually, compounding on each lease anniversary',
        confidence: 'high',
      },
      {
        label: 'Security Deposit',
        value: '$35,625 (3 months cash)',
        confidence: 'high',
      },
      {
        label: 'TI Allowance',
        value: '$75,000 ($15.00/RSF)',
        confidence: 'high',
      },
      {
        label: 'Free Rent',
        value: '3 months (January 1 – March 31, 2024)',
        confidence: 'high',
      },
      {
        label: 'Lease Type',
        value: 'Modified Gross - tenant pays own electricity',
        confidence: 'medium',
      },
    ],
  },
  {
    name: 'CAM & Operating Expenses',
    fields: [
      { label: 'CAM Estimate', value: '$8.50/RSF/year', confidence: 'high' },
      { label: 'Pro-Rata Share', value: '14.3% (5,000 RSF / 35,000 RSF building)', confidence: 'high' },
      { label: 'Management Fee Cap', value: '15% of controllable operating expenses', confidence: 'high' },
      {
        label: 'Annual CAM Cap',
        value: '5% cumulative increase over prior year controllable CAM',
        confidence: 'medium',
      },
      {
        label: 'CAM Exclusions',
        value: 'None specified in lease',
        confidence: 'low',
      },
      { label: 'Reconciliation Frequency', value: 'Annual - statement due within 90 days of year-end', confidence: 'high' },
      { label: 'Audit Rights', value: '12 months from CAM statement delivery', confidence: 'high' },
    ],
  },
  {
    name: 'Tenant Rights & Options',
    fields: [
      {
        label: 'Renewal Option',
        value: 'One 5-year option at fair market rent · 9 months notice required',
        confidence: 'high',
      },
      {
        label: 'Termination Option',
        value: 'Yes - at end of month 36 · 6 months advance notice · 3-month penalty',
        confidence: 'high',
      },
      {
        label: 'Right of First Offer',
        value: 'Suite 500 (2,500 RSF adjacent) - 10-day response window',
        confidence: 'medium',
      },
      {
        label: 'Subletting Rights',
        value: 'Permitted with landlord consent, not to be unreasonably withheld',
        confidence: 'high',
      },
      { label: 'Holdover Rate', value: '150% of last month\'s base rent (monthly tenancy)', confidence: 'high' },
    ],
  },
  {
    name: 'Property Details',
    fields: [
      { label: 'Premises Address', value: '123 Main Street, Suite 400, Chicago, IL 60601', confidence: 'high' },
      { label: 'Rentable Area', value: '5,000 RSF', confidence: 'high' },
      { label: 'Permitted Use', value: 'General office use only', confidence: 'high' },
      { label: 'Parking', value: '15 spaces (3/1,000 RSF) - $150/space/month reserved', confidence: 'high' },
    ],
  },
]

const RED_FLAGS: RedFlagItem[] = [
  {
    description: 'No CAM exclusions defined - tenant has no protection against capital items, management company overhead, or above-market repairs being included in CAM.',
    severity: 'high',
  },
  {
    description: 'Cumulative CAM cap detected - provides less protection than a non-cumulative cap. Unused cap capacity accumulates and can result in larger increases in later years.',
    severity: 'medium',
  },
]

const RED_FLAG_SEVERITY_STYLES = {
  critical: SEVERITY_COLORS.critical.badge,
  high: SEVERITY_COLORS.high.badge,
  medium: SEVERITY_COLORS.medium.badge,
  low: SEVERITY_COLORS.low.badge,
}

const howToSteps = [
  {
    name: 'Identify the key parties',
    text: 'Locate and record the full legal names of the landlord and tenant, guarantor (if any), and their state of formation. These appear in the opening recitals of the lease.',
  },
  {
    name: 'Extract all critical dates',
    text: 'Record the commencement date, expiration date, rent commencement date, and lease execution date. Note any free rent periods that delay when rent actually starts.',
  },
  {
    name: 'Pull financial terms',
    text: 'Extract base rent, escalation schedule, security deposit, tenant improvement allowance, and free rent concessions. Calculate total lease value and effective rent per RSF.',
  },
  {
    name: 'Review CAM and operating expense provisions',
    text: 'Note the CAM estimate, pro-rata share, annual cap (cumulative vs. non-cumulative), any exclusions, management fee cap, and audit rights window. Missing CAM caps are a critical red flag.',
  },
  {
    name: 'Document tenant rights and options',
    text: 'Record renewal options (term, notice period, pricing mechanism), termination rights, right of first offer/refusal, subletting rights, and holdover provisions.',
  },
]

const sampleFaqItems = [
  {
    question: 'What should be included in a lease abstract?',
    answer:
      'A complete lease abstract includes: parties (tenant, landlord, guarantor), key dates (commencement, expiration, rent commencement), financial terms (base rent, escalation, CAM, security deposit, TI allowance), tenant rights (renewal, termination, ROFO, subletting), property details (address, RSF, permitted use), and any material risk provisions. Lextract extracts 126 named fields covering all of these categories.',
  },
  {
    question: 'How long does a lease abstract take?',
    answer:
      'Manual lease abstraction by a trained paralegal takes 4-8 hours for a standard commercial lease. Complex leases with heavy CAM provisions or multiple amendment riders may take longer. Lextract completes the same extraction in 5-15 minutes by running AI extraction across the full document simultaneously.',
  },
  {
    question: 'What is a standard lease abstract format?',
    answer:
      'A standard lease abstract is organized by category: parties, dates, financials, CAM and operating expenses, tenant rights, and property details. Each field shows the extracted value next to the source clause reference. Lextract exports abstracts in Excel, Word, and PDF formats. Each export uses this standard structure and adds a confidence score on every field.',
  },
]

export default function SampleReportPage() {
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Sample Report', url: `${SITE_URL}/sample-report` },
  ]

  const howToSchema = buildHowToSchema({
    name: 'How to Abstract a Commercial Lease',
    steps: howToSteps,
  })

  const faqSchema = buildFAQPageSchema(sampleFaqItems)

  return (
    <>
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={howToSchema} />
      <JsonLd schema={faqSchema} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Sample Report' },
          ]}
        />

        <header className="mb-8 mt-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-sm font-medium text-primary">
            <FileText className="size-3.5" aria-hidden="true" />
            Sample Extraction Report
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl lg:text-5xl">
            Sample Lease Extraction Report
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg lg:text-xl text-muted-foreground">
            This is an example extraction from a sample commercial lease PDF. It
            shows 126 structured fields, a confidence score on each field, and red
            flag analysis.
          </p>
        </header>

        {/* What Does a Lease Abstract Include */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">What Does a Lease Abstract Include?</h2>
          <p className="text-muted-foreground">
            A lease abstract is a structured summary of the key terms in a commercial lease.
            It turns a 30 to 200 page document into a short reference. It covers
            six core categories:
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li><span className="font-medium text-foreground">Parties:</span> Tenant, landlord, guarantor, and their legal entities</li>
            <li><span className="font-medium text-foreground">Key Dates:</span> Commencement, expiration, rent commencement, execution date</li>
            <li><span className="font-medium text-foreground">Financial Terms:</span> Base rent, escalation schedule, CAM estimates, security deposit, TI allowance</li>
            <li><span className="font-medium text-foreground">CAM &amp; Operating Expenses:</span> Pro-rata share, annual cap, exclusions, management fee, audit rights</li>
            <li><span className="font-medium text-foreground">Tenant Rights:</span> Renewal options, termination rights, right of first offer, subletting rights</li>
            <li><span className="font-medium text-foreground">Property Details:</span> Address, rentable area, permitted use, parking</li>
          </ul>
        </section>

        {/* How to Abstract a Lease */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">How to Abstract a Lease (5 Steps)</h2>
          <ol className="space-y-4">
            {howToSteps.map((step, i) => (
              <li key={step.name} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold">{step.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm text-muted-foreground">
            Lextract runs all five steps in minutes, not hours. Upload your lease
            PDF and download the abstract in Excel, Word, or PDF format.
          </p>
        </section>

        {/* Document Header */}
        <div className="mb-10 rounded-xl border bg-muted/30 p-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS.success.iconBg} ${STATUS_COLORS.success.text}`}>
              Extraction Complete
            </span>
            <span className="text-sm text-muted-foreground">
              Example processing time: about 9 minutes
            </span>
          </div>
          <h2 className="text-xl font-semibold">
            Sample office lease: 123 Main Street, Suite 400, Chicago, IL 60601
          </h2>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
            <div>
              <span className="font-medium text-foreground">Tenant:</span> Acme Corp LLC
            </div>
            <div>
              <span className="font-medium text-foreground">Landlord:</span> MainStreet Properties LP
            </div>
            <div>
              <span className="font-medium text-foreground">Term:</span> 5 years (Jan 2024 – Dec 2028)
            </div>
            <div>
              <span className="font-medium text-foreground">Size:</span> 5,000 RSF
            </div>
            <div>
              <span className="font-medium text-foreground">Base Rent:</span> $28.50/RSF/year
            </div>
            <div>
              <span className="font-medium text-foreground">Lease Type:</span> Modified Gross
            </div>
          </div>
        </div>

        {/* Red Flags - shown prominently */}
        <section className="mb-10">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl">Red Flags Detected</h2>
            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-sm font-bold text-red-800 dark:bg-red-950 dark:text-red-300">
              {RED_FLAGS.length} found
            </span>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Lextract checks every extraction against 20 red flag rules. In this
            sample, these issues need attention:
          </p>
          <div className="space-y-3">
            {RED_FLAGS.map((flag, index) => (
              <div
                key={`flag-${index}`}
                className={`flex gap-4 rounded-lg border p-4 ${SEVERITY_COLORS[flag.severity].border} ${flag.severity === 'high' || flag.severity === 'critical' ? 'bg-red-50 dark:bg-red-950/30' : 'bg-amber-50 dark:bg-amber-950/30'}`}
              >
                <span
                  className={`shrink-0 inline-flex items-center self-start rounded px-2 py-0.5 text-sm font-bold uppercase ${RED_FLAG_SEVERITY_STYLES[flag.severity]}`}
                >
                  {flag.severity}
                </span>
                <p className="text-sm leading-relaxed">{flag.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Extracted Fields by Category */}
        <section className="mb-10">
          <h2 className="mb-6 text-2xl font-bold sm:text-3xl lg:text-4xl">Extracted Fields</h2>

          {SAMPLE_CATEGORIES.map((category) => (
            <div key={category.name} className="mb-8">
              <h3 className="mb-3 text-xl font-semibold sm:text-2xl">{category.name}</h3>
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-primary">
                    <tr>
                      <th className="p-3 text-left font-medium text-primary-foreground w-1/3">
                        Field
                      </th>
                      <th className="p-3 text-left font-medium text-primary-foreground">
                        Extracted Value
                      </th>
                      <th className="p-3 text-right font-medium text-primary-foreground w-24">
                        Confidence
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {category.fields.map((field, index) => (
                      <tr
                        key={`${category.name}-${index}`}
                        className={index % 2 === 0 ? '' : 'bg-muted/20'}
                      >
                        <td className="border-t p-3 font-medium">{field.label}</td>
                        <td className="border-t p-3 text-muted-foreground">
                          {field.value}
                        </td>
                        <td className="border-t p-3 text-right">
                          <span
                            className={`inline-flex items-center rounded px-2 py-0.5 text-sm font-medium ${CONFIDENCE_STYLES[field.confidence]}`}
                          >
                            {CONFIDENCE_LABELS[field.confidence]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>

        {/* Confidence Score Legend */}
        <section className="mb-10 rounded-xl border bg-muted/30 p-6">
          <h2 className="mb-4 text-lg font-semibold">Confidence Score Legend</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <span className={`inline-flex shrink-0 items-center rounded px-2 py-0.5 text-sm font-medium ${CONFIDENCE_COLORS.high}`}>
                High
              </span>
              <p className="text-sm text-muted-foreground">
                Extracted with high certainty. Recommend spot-check only.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className={`inline-flex shrink-0 items-center rounded px-2 py-0.5 text-sm font-medium ${CONFIDENCE_COLORS.medium}`}>
                Medium
              </span>
              <p className="text-sm text-muted-foreground">
                Likely correct but verify against the source document.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className={`inline-flex shrink-0 items-center rounded px-2 py-0.5 text-sm font-medium ${CONFIDENCE_COLORS.low}`}>
                Low
              </span>
              <p className="text-sm text-muted-foreground">
                Flagged for human review - document quality or ambiguous language.
              </p>
            </div>
          </div>
        </section>

        {/* Export Section */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Export Formats</h2>
          <p className="mb-4 text-muted-foreground">
            Every Lextract report comes in three export formats. You can import
            them into property management and lease accounting platforms:
          </p>
          <div className="flex flex-wrap gap-3">
            {['Excel (Import-ready)', 'Word Report', 'PDF Report'].map((format) => (
              <span
                key={format}
                className="inline-flex items-center rounded-full border bg-card px-4 py-2 text-sm font-medium"
              >
                {format}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            See{' '}
            <Link href="/integrations" className="text-primary underline underline-offset-2 hover:no-underline">
              integrations
            </Link>{' '}
            to learn how Lextract data maps to Yardi, MRI, ARGUS, Visual Lease, and other platforms.
          </p>
        </section>

        {/* FAQ Section */}
        <section className="mb-10">
          <h2 className="mb-6 text-2xl font-bold sm:text-3xl lg:text-4xl">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {sampleFaqItems.map((item) => (
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
          heading={`Extract your first lease - ${formatPrice(PRICING.single.price)}`}
          description="Upload your commercial lease PDF and get a full 126-field extraction with confidence scoring and red flag analysis in minutes, not hours. No subscription required."
          buttonText={`Extract My Lease - ${formatPrice(PRICING.single.price)}`}
          href="/upload"
        />

        <p
          data-testid="sample-report-accuracy-disclaimer"
          className="mt-10 border-t pt-6 text-xs leading-relaxed text-muted-foreground"
        >
          This is a sample. AI can make mistakes. Check each field against your
          lease before you rely on it. Lextract is not responsible for errors.
          It is not responsible for choices you make from these results.
        </p>
      </div>
    </>
  )
}
