import type { Metadata } from 'next'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SITE_URL, DEFAULT_OG_IMAGE } from '@/lib/site-config'
import { PRICING, formatPrice } from '@/lib/pricing'
import { PRODUCT_CATEGORY_COUNT, PRODUCT_FIELD_COUNT } from '@/lib/product-facts'
import { buildOrganizationSchema, buildFAQPageSchema } from '@/lib/schema'
import { JsonLd } from '@/components/seo/json-ld'
import { FaqSection } from '@/components/marketing/faq-section'

const FAQ_ITEMS = [
  {
    question: 'How does AI lease abstraction work?',
    answer:
      `Lextract uses vision AI to read your lease PDF from start to finish. It reads scanned and digital files. It keeps the page layout, tables, and signatures intact. Each lease then runs through three AI passes. The first pass extracts the data. The second pass checks that work. The third pass settles any disputed critical fields. The pipeline structures ${PRODUCT_FIELD_COUNT} fields across ${PRODUCT_CATEGORY_COUNT} categories in 5 to 15 minutes. Each field gets a confidence score of High, Medium, or Low so you know which values to verify.`,
  },
  {
    question: 'Who is Lextract for?',
    answer:
      'Lextract is built for commercial real estate professionals. That includes asset managers, acquisitions teams, attorneys, and property managers. We built it around the way these teams use leases.',
  },
  {
    question: 'Is Lextract suitable for non-technical users?',
    answer:
      'Yes. You upload a PDF through the web dashboard. You get a results page with all 126 fields organized by category. There is no API integration or technical setup. You can export to Excel or Word with one click.',
  },
  {
    question: 'How is Lextract different from manual lease abstraction?',
    answer:
      'Manual abstraction of a single commercial lease takes 4 to 8 hours. Outsourced services for it run about $90 to $250 per lease. Lextract handles the same lease in 5 to 15 minutes at $15 per lease. It extracts 126 standardized fields every time. Each field also includes a confidence score so you know what to verify.',
  },
  {
    question: 'What commercial lease types does Lextract support?',
    answer:
      'Lextract handles NNN, gross, modified gross, ground, and percentage leases. It works with single and multi-tenant leases. Vision AI reads native digital PDFs and scanned paper leases, up to 200 pages per document. Confidence scores reflect document quality when the source is a scanned lease.',
  },
]

export const metadata: Metadata = {
  title: 'About Lextract - AI Commercial Lease Abstraction',
  description:
    'Lextract is an AI commercial lease abstraction tool built for commercial real estate professionals. Learn about how it works and how we keep your data secure.',
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    url: `${SITE_URL}/about`,
    title: 'About Lextract',
    description:
      'Lextract is an AI commercial lease abstraction tool built for commercial real estate professionals. Learn about how it works and how we keep your data secure.',
    type: 'website',
    images: [DEFAULT_OG_IMAGE],
  },
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-prose px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
      <JsonLd schema={buildOrganizationSchema()} />
      <JsonLd schema={buildFAQPageSchema(FAQ_ITEMS)} />
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-sm font-medium text-primary">
        <Sparkles className="size-3.5" aria-hidden="true" />
        AI Lease Abstraction
      </div>

      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
        About Lextract
      </h1>

      <div className="mt-8 space-y-6 text-muted-foreground">
        <p className="text-base leading-relaxed sm:text-lg lg:text-xl">
          Lextract is an AI lease abstraction tool for commercial real estate
          professionals. We extract {PRODUCT_FIELD_COUNT} structured fields from a commercial
          lease PDF in 5 to 15 minutes. Each field comes with a confidence score,
          and we flag risky clauses for you.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-6 rounded-xl border bg-card p-6 shadow-sm sm:grid-cols-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{PRODUCT_FIELD_COUNT}</p>
            <p className="mt-1 text-sm text-muted-foreground">Fields extracted</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">5 to 15 min</p>
            <p className="mt-1 text-sm text-muted-foreground">Per lease</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{formatPrice(PRICING.single.price)}</p>
            <p className="mt-1 text-sm text-muted-foreground">No subscription</p>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-foreground border-l-2 border-primary pl-3 sm:text-2xl">Our Mission</h2>
        <p>
          Manual lease abstraction is slow and expensive. A single commercial
          lease takes 4 to 8 hours to abstract by hand. Outsourced services for
          it run about $90 to $250 per lease. We built Lextract to give asset
          managers, acquisitions teams, attorneys, and property managers a faster
          option. It costs {formatPrice(PRICING.single.price)} per lease with no subscription.
        </p>

        <h2 className="text-xl font-semibold text-foreground border-l-2 border-primary pl-3 sm:text-2xl">How It Works</h2>
        <p>
          Upload a lease PDF and our pipeline handles the rest. Vision AI reads
          the document directly, scanned or digital. It keeps the page layout,
          tables, and signatures intact. Each lease then runs through three AI
          passes. The first pass extracts the data. The second pass checks that
          work. The third pass settles any disputed critical fields. The output is
          {' '}{PRODUCT_FIELD_COUNT} structured fields across {PRODUCT_CATEGORY_COUNT} categories. Each field includes a
          confidence score so you know what to verify. We also flag risky clauses
          for you.
        </p>

        <h2 className="text-xl font-semibold text-foreground border-l-2 border-primary pl-3 sm:text-2xl">
          Security &amp; Privacy
        </h2>
        <p>
          Your lease documents are encrypted in transit (TLS 1.3) and at rest
          (AES-256). Files are stored in private cloud object storage. They are
          accessed only through time-limited pre-signed URLs. We never share your
          data with third parties.
        </p>

        <h2 className="text-xl font-semibold text-foreground border-l-2 border-primary pl-3 sm:text-2xl">Contact Us</h2>
        <p>
          Questions, feedback, or partnership inquiries? Reach us at{' '}
          <a
            href="mailto:angel.campa@lextract.io"
            className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
          >
            angel.campa@lextract.io
          </a>
          .
        </p>
      </div>

      <div className="mt-12">
        <Button size="lg" asChild className="w-full sm:w-auto">
          <Link href="/upload">Get a free preview</Link>
        </Button>
      </div>

      <FaqSection items={FAQ_ITEMS} />
    </div>
  )
}
