import type { Metadata } from 'next'
import Link from 'next/link'
import { CALCULATORS } from '@/data/calculators'
import { SITE_URL } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/json-ld'
import { buildBreadcrumbSchema, buildFAQPageSchema } from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { ResourceHubDirectory } from '@/components/content/resource-hub-directory'
import { ContentCta } from '@/components/content/content-cta'
import { BrowseVerticals } from '@/components/content/browse-verticals'
import { FaqSection } from '@/components/marketing/faq-section'
import { Calculator } from 'lucide-react'

const FAQ_ITEMS = [
  {
    question: 'What lease calculators does Lextract offer?',
    answer:
      'Lextract provides free interactive calculators for common commercial lease math. These cover NNN expense totals, CAM reconciliation true-ups, rent escalation (fixed percentage and CPI-based), pro-rata share of operating expenses, effective rent, and lease abstraction ROI. Each calculator includes the formula and a worked example.',
  },
  {
    question: 'Are the calculators free to use?',
    answer:
      'Yes. All lease calculators on this page are free. No account or payment is required. You enter your own lease numbers and get results right away. The $15 per lease fee applies only when you upload a lease PDF for AI extraction of 126 structured fields.',
  },
  {
    question: 'How accurate are the lease calculation results?',
    answer:
      'The calculators use standard industry formulas. The result is only as good as the numbers you enter. For important financial decisions, check your inputs against your actual lease document. Lextract can extract the relevant figures, such as base rent, CAM caps, and pro-rata share, directly from your lease PDF in 5 to 15 minutes so you use the right numbers.',
  },
  {
    question: 'Can I use these calculators without uploading a lease?',
    answer:
      'Yes. The calculators are standalone tools. Enter any values by hand and get results right away. If you want Lextract to pull the figures from your lease PDF, upload the document for $15. All 126 fields are extracted automatically, including rent amounts, escalation schedules, and CAM caps.',
  },
  {
    question: 'What is a NNN expense calculator?',
    answer:
      'A NNN (triple-net) expense calculator computes the total monthly and annual occupancy cost for a tenant by adding base rent to the three "nets": property taxes, building insurance, and common area maintenance (CAM). This total cost is what tenants actually pay out of pocket each month under a NNN lease structure.',
  },
]

export const metadata: Metadata = {
  title: 'Commercial Lease Calculators - NNN, CAM, Escalation & ROI',
  description:
    'Free commercial lease calculators: NNN cost, CAM reconciliation true-up, rent escalation (fixed vs CPI), lease abstraction ROI, pro-rata share, and effective rent.',
  alternates: {
    canonical: `${SITE_URL}/calculators`,
  },
}

export default function CalculatorsIndexPage() {
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Calculators', url: `${SITE_URL}/calculators` },
  ]

  return (
    <>
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(FAQ_ITEMS)} />

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Calculators' },
          ]}
        />

        <header className="mb-12 mt-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-sm font-medium text-primary">
            <Calculator className="size-3.5" aria-hidden="true" />
            Free Interactive CRE Tools
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Commercial Lease Calculators
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Interactive calculators with formulas and worked examples for common
            commercial lease math. These cover NNN costs, CAM reconciliation, rent
            escalation, pro-rata share, effective rent, and lease abstraction ROI.
            Enter your own numbers and get results right away.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {CALCULATORS.map((calc) => (
            <Link
              key={calc.slug}
              href={`/calculators/${calc.slug}`}
              className="group rounded-xl border bg-card p-6 shadow-sm transition-colors hover:shadow-md hover:border-primary/30 hover:bg-muted/50"
            >
              <p className="text-lg font-semibold group-hover:text-primary transition-colors">
                {calc.title}
              </p>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                {calc.description.length > 140 ? `${calc.description.slice(0, 140)}...` : calc.description}
              </p>
              <p className="mt-3 text-sm font-mono text-muted-foreground/70">
                {calc.formula.split('|')[0].trim()}
              </p>
            </Link>
          ))}
        </div>

        <FaqSection items={FAQ_ITEMS} />

        <ContentCta
          heading="Skip the manual math. Extract lease data automatically."
          description="Upload any commercial lease PDF. Lextract extracts 126 structured fields, including rent amounts, escalation schedules, CAM caps, and pro-rata share. It takes 5 to 15 minutes. Just $15 per lease."
          buttonText="Upload Your Lease"
          href="/upload"
        />
        <ResourceHubDirectory hubHref="/calculators" />


        <BrowseVerticals current="calculators" />
      </div>
    </>
  )
}
