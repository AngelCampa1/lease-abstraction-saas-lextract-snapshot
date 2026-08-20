import type { Metadata } from 'next'
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '@/lib/site-config'
import { PRICING, formatPrice } from '@/lib/pricing'
import { PRODUCT_CATEGORY_COUNT, PRODUCT_FIELD_COUNT } from '@/lib/product-facts'
import {
  buildWebApplicationSchema,
  buildFAQPageSchema,
  buildOrganizationWithSearchSchema,
} from '@/lib/schema'
import { JsonLd } from '@/components/seo/json-ld'
import { HeroSection } from '@/components/marketing/hero'
import { SocialProof } from '@/components/marketing/social-proof'
import { StickyCta } from '@/components/marketing/sticky-cta'
import { HowItWorks } from '@/components/marketing/how-it-works'
import { SampleOutput } from '@/components/marketing/sample-output'
import { RedFlagsShowcase } from '@/components/marketing/red-flags-showcase'
import { PricingCards } from '@/components/marketing/pricing-cards'
import { WhyTrustLextract } from '@/components/marketing/why-trust-lextract'
import { FaqSection } from '@/components/marketing/faq-section'
import { CamauditCrosssell } from '@/components/marketing/camaudit-crosssell'
import Link from 'next/link'

const faqItems = [
  {
    question: 'What types of commercial leases does Lextract support?',
    answer:
      'Lextract handles single-tenant, multi-tenant, NNN, gross, modified gross, full service gross, ground, and percentage leases. We support leases up to 200 pages in PDF format.',
  },
  {
    question: 'How accurate is the AI extraction?',
    answer:
      'Lextract returns confidence-scored field extraction on standard commercial lease formats like NNN, modified gross, and full service gross. Every field gets a confidence score of High, Medium, or Low. That score tells reviewers which fields to check first. It is a review priority, not a guarantee of accuracy. Always review the extracted data against the original lease.',
  },
  {
    question: 'How long does extraction take?',
    answer:
      'Lextract processes most commercial leases in 5 to 15 minutes. The exact time depends on document length and complexity. Manual abstraction takes about 4 to 8 hours per lease. You will get an email when your results are ready.',
  },
  {
    question: 'Do I need a subscription?',
    answer: `No. Lextract is pay-per-lease. Buy a single extraction for ${formatPrice(PRICING.single.price)}, or save with a 5-pack (${formatPrice(PRICING.pack5.price)}, ${PRICING.pack5.savings}) or 10-pack (${formatPrice(PRICING.pack10.price)}, ${PRICING.pack10.savings}). Credits never expire.`,
  },
  {
    question: 'What export formats are available?',
    answer:
      'You can export your abstraction results as a Word document, PDF report, or Excel spreadsheet. All formats include the full 126-field extraction with confidence scores and any red flags detected.',
  },
  {
    question: 'Is my lease data secure?',
    answer:
      'All data is encrypted in transit (TLS 1.3) and at rest (AES-256). Lease files are stored in private Cloudflare R2 storage and are accessible only through pre-signed URLs. We do not share your data with third parties.',
  },
  {
    question: 'Can AI create a lease abstract?',
    answer:
      'Yes. Lextract uses AI to create a lease abstract from a commercial lease PDF. Upload the document and the system extracts 126 structured fields. These cover parties, dates, financials, CAM provisions, options, and red flags. Most leases process in 5 to 15 minutes. Every field includes a confidence score so you know what to review.',
  },
  {
    question: 'How do I abstract a lease?',
    answer:
      'To abstract a lease by hand, you read the full document and pull key data points into a structured summary. That summary covers parties, term dates, base rent, escalation schedule, CAM provisions, options, and risk clauses. Lextract does this for you. Upload your PDF and the AI extracts all 126 fields in minutes. Manual abstraction takes about 4 to 8 hours.',
  },
  {
    question: 'Can ChatGPT abstract a lease?',
    answer:
      'ChatGPT can summarize lease language. It is a general tool, so it does not apply a fixed lease field schema, per-field confidence scores, or built-in red flag rules. Lextract is built for commercial lease abstraction. It returns 126 named fields in a structured format, with a confidence score on each field and 20 automated red flag checks.',
  },
  {
    question: 'What are red flags in a commercial lease?',
    answer:
      'Red flags are lease provisions that create financial risk or legal exposure for the tenant. Common examples include uncapped CAM charges, missing tenant audit rights, personal guarantee requirements, high management fee percentages, one-sided termination rights, and below-market renewal options. Lextract checks every extraction against 20 red flag rules. Each issue gets a severity rating.',
  },
  {
    question: 'How much does lease abstraction cost?',
    answer: `Outsourced and manual lease abstraction services often charge around $90 to $250 per lease, with several hours of work per lease. Lextract costs ${formatPrice(PRICING.single.price)} per lease and returns results in minutes. Volume packs lower the cost to ${formatPrice(PRICING.pack5.perLease)}/lease on the 5-pack or ${formatPrice(PRICING.pack10.perLease)}/lease on the 10-pack. Credits never expire.`,
  },
  {
    question: 'What is the difference between lease abstraction and lease administration?',
    answer:
      'Lease abstraction is the one-time process of pulling key data points from a lease into a structured summary. Lease administration is the ongoing management of those leases. It covers tracking critical dates, processing rent changes, managing CAM reconciliations, and handling renewals. Lextract handles the abstraction step. You get a structured data set that feeds into your lease administration system.',
  },
]

export const metadata: Metadata = {
  title: `AI Lease Abstraction Tool - 126 Fields, ${formatPrice(PRICING.single.price)}/Lease`,
  description: `AI-powered commercial lease abstraction. Upload a PDF and get 126 structured fields in minutes. ${formatPrice(PRICING.single.price)} per lease, no subscription required.`,
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: 'Extract 126 Fields from Any Commercial Lease in Minutes',
    description: `AI-powered commercial lease abstraction. ${PRODUCT_FIELD_COUNT} fields, ${PRODUCT_CATEGORY_COUNT} categories, confidence scoring, red flag detection. ${formatPrice(PRICING.single.price)} per lease, no subscription required.`,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: 'website',
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Lease Abstraction - 126 Fields in Minutes',
    description: `Upload a commercial lease PDF and get 126 structured fields extracted with confidence scoring and red flag detection. ${formatPrice(PRICING.single.price)} per lease.`,
  },
}

export default function LandingPage() {
  return (
    <>
      <JsonLd schema={buildOrganizationWithSearchSchema()} />
      <JsonLd schema={buildWebApplicationSchema()} />
      <JsonLd schema={buildFAQPageSchema(faqItems)} />

      <HeroSection />
      <SocialProof />
      <HowItWorks />
      <SampleOutput />
      <RedFlagsShowcase />
      <PricingCards />
      <WhyTrustLextract />

      {/* AI-extractable "best" section - self-contained for AI citation */}
      <section id="best-lease-abstraction-software" className="border-t py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-6 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Lease Abstraction Software for Commercial Real Estate
          </h2>
          <p className="mb-4 text-base leading-relaxed text-muted-foreground">
            Lextract is lease abstraction software for commercial real estate teams that need
            structured, exportable data from lease PDFs. Lextract extracts 126 structured fields
            from a commercial lease PDF. These cover parties, rent schedules, CAM provisions,
            renewal options, and critical dates. It also runs 20 automated red flag checks. Most
            leases process in 5 to 15 minutes at {formatPrice(PRICING.single.price)} per lease, with
            no subscription. Outsourced and manual abstraction often costs around $90 to $250 per
            lease and takes several hours. Lextract gives you a confidence score on each field so
            you know what to review, plus structured exports to Excel, Word, and PDF. It supports
            NNN, modified gross, full service gross, ground, and percentage leases. Credits never
            expire.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              href="/lease-abstraction-software"
              className="inline-flex min-h-[44px] items-center py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Learn more about lease abstraction software &rarr;
            </Link>
            <Link
              href="/lease-extraction-software"
              className="inline-flex min-h-[44px] items-center py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Lease extraction software &rarr;
            </Link>
            <Link
              href="/ai-lease-abstraction"
              className="inline-flex min-h-[44px] items-center py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              See how AI lease abstraction works &rarr;
            </Link>
          </div>
        </div>
      </section>

      <CamauditCrosssell />
      <FaqSection items={faqItems} />

      <section className="border-t py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Explore Resources
          </h2>
          <p className="mb-8 text-muted-foreground">
            Everything you need to understand, negotiate, and manage commercial leases.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {/* Featured row - two wider cards */}
            <Link
              href="/glossary"
              className="group rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:bg-muted/50 sm:col-span-2 lg:col-span-3"
            >
              <p className="text-lg font-semibold group-hover:text-primary transition-colors">Glossary</p>
              <p className="mt-1 text-sm text-muted-foreground">100+ commercial lease terms defined, from abatement to yield spread.</p>
            </Link>
            <Link
              href="/fields"
              className="group rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:bg-muted/50 sm:col-span-2 lg:col-span-3"
            >
              <p className="text-lg font-semibold group-hover:text-primary transition-colors">Extracted Fields</p>
              <p className="mt-1 text-sm text-muted-foreground">Browse all 126 fields Lextract pulls from every lease, organized by category.</p>
            </Link>
            {/* Standard row - three cards */}
            <Link
              href="/clauses"
              className="group rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:bg-muted/50 lg:col-span-2"
            >
              <p className="font-semibold group-hover:text-primary transition-colors">Lease Clauses</p>
              <p className="mt-1 text-sm text-muted-foreground">What each clause means and what to watch for.</p>
            </Link>
            <Link
              href="/red-flags"
              className="group rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:bg-muted/50 lg:col-span-2"
            >
              <p className="font-semibold group-hover:text-primary transition-colors">Red Flags</p>
              <p className="mt-1 text-sm text-muted-foreground">20 risky provisions Lextract detects automatically.</p>
            </Link>
            <Link
              href="/resources/guides"
              className="group rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:bg-muted/50 lg:col-span-2"
            >
              <p className="font-semibold group-hover:text-primary transition-colors">Guides</p>
              <p className="mt-1 text-sm text-muted-foreground">Step-by-step guides to lease abstraction and review.</p>
            </Link>
            {/* Bottom row - three cards */}
            <Link
              href="/calculators"
              className="group rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:bg-muted/50 lg:col-span-2"
            >
              <p className="font-semibold group-hover:text-primary transition-colors">Calculators</p>
              <p className="mt-1 text-sm text-muted-foreground">NNN costs, CAM reconciliation, rent escalations, and more.</p>
            </Link>
            <Link
              href="/use-cases"
              className="group rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:bg-muted/50 lg:col-span-2"
            >
              <p className="font-semibold group-hover:text-primary transition-colors">Use Cases</p>
              <p className="mt-1 text-sm text-muted-foreground">How teams use Lextract across due diligence, renewals, and more.</p>
            </Link>
            <Link
              href="/resources/comparisons"
              className="group rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:bg-muted/50 lg:col-span-2"
            >
              <p className="font-semibold group-hover:text-primary transition-colors">Comparisons</p>
              <p className="mt-1 text-sm text-muted-foreground">Lextract vs alternatives, feature by feature.</p>
            </Link>
          </div>
        </div>
      </section>

      <StickyCta />
    </>
  )
}
