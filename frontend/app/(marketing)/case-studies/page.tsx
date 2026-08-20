import type { Metadata } from 'next'
import Link from 'next/link'
import { CASE_STUDIES } from '@/data/case-studies'
import { SITE_URL } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/json-ld'
import { buildBreadcrumbSchema, buildFAQPageSchema } from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { ResourceHubDirectory } from '@/components/content/resource-hub-directory'
import { ContentCta } from '@/components/content/content-cta'
import { BrowseVerticals } from '@/components/content/browse-verticals'
import { FaqSection } from '@/components/marketing/faq-section'
import { Trophy } from 'lucide-react'

const FAQ_ITEMS = [
  {
    question: 'What types of case studies does Lextract publish?',
    answer:
      'Lextract publishes case studies that show real lease extractions across major property types. These cover office, industrial, life sciences, retail, and specialty structures like REIT master leases and datacenter power leases. Each case study documents the lease structure, the extraction challenges, and the 126 structured fields Lextract produced.',
  },
  {
    question: 'How much time does Lextract save on lease abstraction?',
    answer:
      'Lextract typically processes a commercial lease PDF in 5 to 15 minutes. Manual abstraction usually takes 4 to 8 hours. Lextract costs $15 per lease. Outsourced or manual abstraction services commonly run $90 to $250 per lease.',
  },
  {
    question: 'Are these case studies from real customers?',
    answer:
      'No. These case studies show how the extraction pipeline handles different lease document types and complexity. They are not customer stories. Named tenants and landlords come from publicly available lease documents, often lease exhibits attached to public SEC filings, or are illustrative names used to frame a scenario. Their inclusion is not a claim that they are Lextract customers or that they endorse the product. The extraction outputs shown, such as fields, values, confidence scores, and red flags, are the actual results Lextract produced on the underlying document.',
  },
  {
    question: 'Can I submit my own case study?',
    answer:
      'If you have used Lextract on a complex lease and want to share the results, contact us. We feature interesting extractions such as unusual lease structures, multi-amendment chains, or industry-specific provisions that show what the 126-field schema can do.',
  },
]

export const metadata: Metadata = {
  title: 'Real Lease Extraction Case Studies',
  description:
    'See how Lextract extracts 126 structured fields from real commercial leases across office, industrial, life sciences, retail cannabis, subleases, datacenters, and REIT portfolios.',
  alternates: {
    canonical: `${SITE_URL}/case-studies`,
  },
}

const PROPERTY_TYPES = ['All', 'Office', 'Industrial', 'Life Sciences', 'Retail', 'Specialty'] as const

const PROPERTY_TYPE_DESCRIPTIONS: Record<string, string> = {
  Office: 'Office leases including amendments, expansions, subleases, and multi-amendment chains',
  Industrial: 'Warehouse, manufacturing, and cultivation facility NNN leases',
  'Life Sciences': 'Lab and medical facility leases with LOCs, modified gross, and specialized provisions',
  Retail: 'Cannabis dispensary and single-tenant retail NNN leases',
  Specialty: 'REIT master leases, datacenter power leases, and portfolio-level structures',
}

function formatRent(annualRent: number | null): string {
  if (annualRent === null) return 'Portfolio-level'
  if (annualRent >= 1_000_000) return `$${(annualRent / 1_000_000).toFixed(1)}M/yr`
  return `$${(annualRent / 1_000).toFixed(0)}K/yr`
}

function formatSqft(sqft: number | null): string {
  if (sqft === null) return 'Multi-property'
  return `${sqft.toLocaleString()} RSF`
}

export default function CaseStudiesIndexPage() {
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Case Studies', url: `${SITE_URL}/case-studies` },
  ]

  const propertyTypeCounts = PROPERTY_TYPES.filter((t) => t !== 'All').reduce<Record<string, number>>(
    (acc, type) => {
      acc[type] = CASE_STUDIES.filter((cs) => cs.propertyType === type).length
      return acc
    },
    {}
  )

  return (
    <>
      <JsonLd
        schema={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Real Lease Extraction Case Studies',
          description:
            'See how Lextract extracts 126 structured fields from real commercial leases across office, industrial, life sciences, retail cannabis, subleases, datacenters, and REIT portfolios.',
          url: `${SITE_URL}/case-studies`,
        }}
      />
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(FAQ_ITEMS)} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Case Studies' },
          ]}
        />

        <header className="mb-12 mt-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-sm font-medium text-primary">
            <Trophy className="size-3.5" aria-hidden="true" />
            15 Real Lease Extractions
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Real Lease Extraction Case Studies
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg lg:text-xl">
            We ran Lextract on 15 real commercial lease documents across every major
            property type. See how 126 structured fields are extracted from each document,
            including hard edge cases like amendment-only leases and multi-amendment chains.
          </p>

          {/* Stats bar */}
          <div className="mt-8 grid grid-cols-3 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/30 p-4 text-center">
              <p className="text-3xl font-bold text-primary">15</p>
              <p className="mt-1 text-sm text-muted-foreground">Real Leases</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4 text-center">
              <p className="text-3xl font-bold text-primary">
                {new Set(CASE_STUDIES.map((cs) => cs.propertyType)).size}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Property Types</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4 text-center">
              <p className="text-3xl font-bold text-primary">126</p>
              <p className="mt-1 text-sm text-muted-foreground">Fields Each</p>
            </div>
          </div>
        </header>

        {/* Grouped by property type */}
        {PROPERTY_TYPES.filter((t) => t !== 'All').map((type) => {
          const studies = CASE_STUDIES.filter((cs) => cs.propertyType === type)
          if (studies.length === 0) return null
          return (
            <section key={type} className="mb-14">
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-2xl font-bold sm:text-3xl">{type}</h2>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {propertyTypeCounts[type]}
                </span>
              </div>
              {PROPERTY_TYPE_DESCRIPTIONS[type] && (
                <p className="mb-5 text-sm text-muted-foreground">{PROPERTY_TYPE_DESCRIPTIONS[type]}</p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {studies.map((cs) => (
                  <Link
                    key={cs.slug}
                    href={`/case-studies/${cs.slug}`}
                    className="group rounded-xl border bg-card p-5 shadow-sm transition-colors hover:shadow-md hover:border-primary/30 hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-base font-semibold group-hover:text-primary transition-colors">
                        {cs.name}
                      </p>
                      <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {cs.leaseStructure}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{cs.location}</p>
                    <p className="mt-2.5 text-sm text-muted-foreground line-clamp-2">
                      {cs.challenge}
                    </p>
                    <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                      <span>{formatSqft(cs.squareFootage)}</span>
                      <span className="text-primary font-medium">{formatRent(cs.annualRent)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )
        })}
        <ResourceHubDirectory hubHref="/case-studies" />


        <BrowseVerticals current="case-studies" />

        <FaqSection items={FAQ_ITEMS} />

        <ContentCta
          heading="See Lextract extract your lease"
          description="Upload any commercial lease PDF and get 126 structured fields in minutes. Works for every property type and lease structure shown above. $15 per lease."
          buttonText="Upload Your Lease"
          href="/upload"
        />
      </div>
    </>
  )
}
