import type { Metadata } from 'next'
import Link from 'next/link'
import { Calculator, GitCompare } from 'lucide-react'
import { SITE_URL } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/json-ld'
import { buildBreadcrumbSchema, buildFAQPageSchema } from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { ContentCta } from '@/components/content/content-cta'
import { FaqSection } from '@/components/marketing/faq-section'

export const metadata: Metadata = {
  title: 'Free Commercial Lease Tools - Interactive Calculators & Analyzers',
  description:
    'Free interactive commercial lease tools: NNN cost calculator, CAM reconciliation, rent escalation, effective rent, pro-rata share, percentage rent, lease comparison, and more.',
  alternates: {
    canonical: `${SITE_URL}/tools`,
  },
}

const FAQ_ITEMS = [
  {
    question: 'What free tools does Lextract offer?',
    answer:
      'Lextract offers eight free interactive calculators. These cover NNN cost, CAM reconciliation, rent escalation, effective rent, pro-rata share, percentage rent, and rent per square foot. There is also a lease proposal comparison tool. All tools run in the browser with no account required.',
  },
  {
    question: 'Is the lease comparison tool free to use?',
    answer:
      'Yes. The Lease Proposal Comparison Tool is free. Enter base rent, NNN charges, concessions, and escalation rates for two lease proposals. The tool calculates total cost, effective rent, and 5-year occupancy cost side by side so you can compare them.',
  },
  {
    question: 'How does the NNN expense calculator work?',
    answer:
      'The NNN Lease Cost Calculator breaks a triple-net lease into its four parts: base rent, property taxes, insurance, and CAM charges. It then computes your all-in monthly and annual occupancy cost. Enter the figures from your lease abstract and the calculator does the math.',
  },
  {
    question: 'Can I use Lextract tools without creating an account?',
    answer:
      'All free calculators and the lease comparison tool work without an account. Only the AI extraction service requires a credit purchase of $15 per lease. That service processes your lease PDF and returns 126 structured fields.',
  },
  {
    question: 'Are Lextract\'s tools suitable for lease negotiations?',
    answer:
      'Yes. The tools help tenants, brokers, and property managers prepare for lease negotiations. Use the effective rent calculator to evaluate concession packages. Use the escalation calculator to model multi-year rent. Use the comparison tool to show which proposal costs less.',
  },
]

interface ToolCard {
  title: string
  description: string
  href: string
}

const CALCULATORS: ToolCard[] = [
  {
    title: 'Commercial Lease Cost Calculator',
    description:
      'Calculate total annual and monthly occupancy cost including base rent, NNN charges, and parking for any commercial lease.',
    href: '/calculators/commercial-lease-cost-calculator',
  },
  {
    title: 'NNN Lease Cost Calculator',
    description:
      'Break down a triple-net lease into base rent, property taxes, insurance, and CAM charges to see your true all-in cost.',
    href: '/calculators/nnn-lease-cost-calculator',
  },
  {
    title: 'CAM Reconciliation Calculator',
    description:
      'Calculate CAM true-up amounts when actual operating expenses differ from estimated pass-through charges.',
    href: '/calculators/cam-reconciliation-calculator',
  },
  {
    title: 'Rent Escalation Calculator',
    description:
      'Project rent schedules over a full lease term using fixed percentage or CPI-based annual escalation rates.',
    href: '/calculators/rent-escalation-calculator',
  },
  {
    title: 'Effective Rent Calculator',
    description:
      'Calculate effective rent after accounting for free rent concessions and tenant improvement allowances.',
    href: '/calculators/effective-rent-calculator',
  },
  {
    title: 'Pro-Rata Share Calculator',
    description:
      "Determine your tenant's proportionate share of building operating expenses based on rentable square footage.",
    href: '/calculators/pro-rata-share-calculator',
  },
  {
    title: 'Percentage Rent Calculator',
    description:
      'Calculate percentage rent due above a natural breakpoint for retail leases with gross-sales-based rent clauses.',
    href: '/calculators/percentage-rent-calculator',
  },
  {
    title: 'Rent Per Square Foot Calculator',
    description:
      'Convert between annual rent per square foot, monthly rent per square foot, and total annual rent for any space size.',
    href: '/calculators/rent-per-sqft-calculator',
  },
]

const ANALYSIS_TOOLS: ToolCard[] = [
  {
    title: 'Lease Proposal Comparison Tool',
    description:
      'Compare two lease proposals side-by-side on total cost, effective rent, and 5-year cost. Enter base rent, NNN charges, concessions, and escalation for each option.',
    href: '/tools/lease-comparison',
  },
]

export default function ToolsIndexPage() {
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Tools', url: `${SITE_URL}/tools` },
  ]

  return (
    <>
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(FAQ_ITEMS)} />

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Tools' },
          ]}
        />

        <header className="mb-12 mt-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-sm font-medium text-primary">
            <Calculator className="size-3.5" aria-hidden="true" />
            Free Interactive CRE Tools
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Free Commercial Lease Tools
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Interactive calculators and analyzers for commercial tenants, brokers, and property
            managers.
          </p>
        </header>

        {/* Interactive Calculators */}
        <section className="mb-14" aria-labelledby="calculators-heading">
          <div className="mb-6 flex items-center gap-3">
            <Calculator className="size-5 text-primary" aria-hidden="true" />
            <h2 id="calculators-heading" className="text-2xl font-bold">
              Interactive Calculators
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {CALCULATORS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group rounded-xl border bg-card p-6 shadow-sm transition-colors hover:border-primary/30 hover:bg-muted/50 hover:shadow-md"
              >
                <p className="text-lg font-semibold transition-colors group-hover:text-primary">
                  {tool.title}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{tool.description}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Analysis Tools */}
        <section className="mb-14" aria-labelledby="analysis-tools-heading">
          <div className="mb-6 flex items-center gap-3">
            <GitCompare className="size-5 text-primary" aria-hidden="true" />
            <h2 id="analysis-tools-heading" className="text-2xl font-bold">
              Analysis Tools
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {ANALYSIS_TOOLS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group rounded-xl border bg-card p-6 shadow-sm transition-colors hover:border-primary/30 hover:bg-muted/50 hover:shadow-md"
              >
                <p className="text-lg font-semibold transition-colors group-hover:text-primary">
                  {tool.title}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{tool.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <FaqSection items={FAQ_ITEMS} />

        <ContentCta
          heading="Need the actual data from your lease?"
          description="Upload your lease PDF and Lextract extracts all 126 fields in 5 to 15 minutes. That includes rent amounts, escalations, CAM caps, options, and more."
          buttonText="Extract My Lease"
          href="/upload"
        />
      </div>
    </>
  )
}
