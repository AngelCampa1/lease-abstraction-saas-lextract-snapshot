import type { Metadata } from 'next'
import { SITE_URL, DEFAULT_OG_IMAGE } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/json-ld'
import { buildBreadcrumbSchema, buildFAQPageSchema } from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { ContentCta } from '@/components/content/content-cta'
import { SeoFunnelLinks } from '@/components/content/seo-funnel-links'
import { LeaseComparisonCalculator } from '@/components/calculators/lease-comparison-calculator'

export const metadata: Metadata = {
  title: 'Lease Comparison Tool: Compare Two Lease Proposals Side-by-Side',
  description:
    'Compare two commercial lease proposals side-by-side. Calculate total cost, effective rent, monthly payments, and 5-year cost for any two lease scenarios.',
  alternates: {
    canonical: `${SITE_URL}/tools/lease-comparison`,
  },
  openGraph: {
    url: `${SITE_URL}/tools/lease-comparison`,
    title: 'Lease Comparison Tool: Compare Two Lease Proposals Side-by-Side',
    description:
      'Compare two commercial lease proposals side-by-side. Calculate total cost, effective rent, monthly payments, and 5-year cost for any two lease scenarios.',
    type: 'website',
    images: [DEFAULT_OG_IMAGE],
  },
}

const FAQS = [
  {
    question: 'What factors should I compare when evaluating two lease proposals?',
    answer:
      'Focus on total occupancy cost, not just base rent. Key factors: effective rent after concessions (TI allowance + free rent), NNN/operating expense pass-throughs, annual escalation rate, lease term, and option provisions. A lease with lower base rent but higher NNN charges or fewer concessions may cost more over the full term.',
  },
  {
    question: 'What is the best way to compare a gross lease vs NNN lease?',
    answer:
      'Convert both to effective rent per square foot per year, inclusive of all occupancy costs. For a gross lease, the base rent includes operating expenses - enter NNN charges as $0. For a NNN lease, add base rent plus all pass-throughs. The 5-year total cost comparison in this tool accounts for escalations and concessions.',
  },
]

export default function LeaseComparisonPage() {
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Tools', url: `${SITE_URL}/tools` },
    { name: 'Lease Comparison Tool', url: `${SITE_URL}/tools/lease-comparison` },
  ]

  return (
    <>
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(FAQS)} />

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Tools', href: '/tools' },
            { label: 'Lease Comparison Tool' },
          ]}
        />

        <header className="mb-10 mt-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Commercial Lease Comparison Tool
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Enter two lease proposals to compare total occupancy cost, effective rent, and 5-year
            expense - side-by-side.
          </p>
          <p className="mt-3 text-base text-muted-foreground">
            Use this tool when evaluating competing lease proposals or comparing renewal vs.
            relocation options. Enter the key financial terms for each lease and get an instant
            side-by-side cost breakdown.
          </p>
        </header>

        {/* Interactive Comparison Widget */}
        <div className="mb-12">
          <LeaseComparisonCalculator />
        </div>

        {/* FAQ */}
        <section className="mb-10" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="mb-6 text-2xl font-bold">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {FAQS.map((faq) => (
              <div key={faq.question}>
                <h3 className="mb-2 text-lg font-semibold">{faq.question}</h3>
                <p className="text-base leading-relaxed text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <SeoFunnelLinks routeHref="/tools/lease-comparison" />

        <ContentCta
          heading="Have a lease to review?"
          description="Lextract extracts all 126 fields from your actual lease - rent schedules, CAM caps, escalation clauses, options, and 20+ red flag checks - in 5-15 minutes for $15."
          buttonText="Extract My Lease"
          href="/upload"
        />
      </div>
    </>
  )
}
