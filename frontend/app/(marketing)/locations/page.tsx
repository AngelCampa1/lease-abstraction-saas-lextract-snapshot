import type { Metadata } from 'next'
import Link from 'next/link'
import { INDEXABLE_LOCATIONS as LOCATIONS } from '@/data/locations'
import { SITE_URL } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/json-ld'
import { buildBreadcrumbSchema, buildFAQPageSchema } from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { ResourceHubDirectory } from '@/components/content/resource-hub-directory'
import { ContentCta } from '@/components/content/content-cta'
import { BrowseVerticals } from '@/components/content/browse-verticals'
import { FaqSection } from '@/components/marketing/faq-section'
import { MapPin } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Commercial Lease Abstraction by City',
  description:
    'Commercial lease abstraction guidance for the highest-priority US markets. Local lease norms, dominant structures, and key field context by market.',
  alternates: {
    canonical: `${SITE_URL}/locations`,
  },
}

const FAQ_ITEMS = [
  {
    question: 'Does Lextract work for leases from any U.S. state?',
    answer:
      'Yes. Lextract processes commercial leases from all 50 U.S. states. The AI extraction engine reads the actual lease text regardless of which state the property is located in, pulling all 126 structured fields from the document. State-specific terms and clauses are captured as written in the lease.',
  },
  {
    question: 'Do commercial lease laws vary significantly by state?',
    answer:
      'Yes, they vary a lot. States differ on permitted CAM exclusions, landlord lien rights, holdover penalty limits, and lease recording rules. Lextract extracts what the lease says on each point. Our location pages give context on how local norms and rules usually affect lease terms in each market.',
  },
  {
    question: 'Which states have the most complex commercial lease requirements?',
    answer:
      'California, New York, and Illinois tend to produce some of the most complex commercial leases. They have strong tenant-protection statutes, dense urban markets, and experienced landlord counsel. Lextract handles these leases the same as any other. Upload the PDF and get 126 fields extracted in 5 to 15 minutes.',
  },
  {
    question: 'Can Lextract handle leases from outside the United States?',
    answer:
      'Lextract is optimized for U.S. commercial real estate leases and the field schema reflects U.S. lease conventions. Leases from Canada, the UK, or Australia can be processed but field coverage may be lower for non-U.S. lease structures. Contact us if international support is a priority for your portfolio.',
  },
]

const TIER_LABELS: Record<string, string> = {
  'Tier 1': 'Major Market',
  'Tier 2': 'Secondary Market',
  'Tier 3': 'Emerging Market',
}

const TIER_COLORS: Record<string, string> = {
  'Tier 1': 'bg-primary/10 text-primary border-primary/20',
  'Tier 2': 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  'Tier 3': 'bg-muted text-muted-foreground border-border',
}

export default function LocationsIndexPage() {
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Locations', url: `${SITE_URL}/locations` },
  ]

  const tier1 = LOCATIONS.filter((l) => l.keyMarketStats.marketTier === 'Tier 1')
  const tier2 = LOCATIONS.filter((l) => l.keyMarketStats.marketTier === 'Tier 2')
  const tier3 = LOCATIONS.filter((l) => l.keyMarketStats.marketTier === 'Tier 3')

  return (
    <>
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(FAQ_ITEMS)} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Locations' },
          ]}
        />

        <header className="mb-12 mt-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-sm font-medium text-primary">
            <MapPin className="size-3.5" aria-hidden="true" />
            Priority US Markets
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Commercial Lease Abstraction by City
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg lg:text-xl">
            Market pages for the metros that come up most in active CRE work.
            Use the state hub for broader regional research. Use these pages for
            the markets that need dedicated coverage.
          </p>
        </header>

        {[
          { tier: 'Tier 1', locations: tier1, label: 'Major Markets' },
          { tier: 'Tier 2', locations: tier2, label: 'Secondary Markets' },
          { tier: 'Tier 3', locations: tier3, label: 'Emerging Markets' },
        ].map(({ tier, locations, label }) => (
          <section key={tier} className="mb-12">
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl">{label}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {locations.map((loc) => (
                <Link
                  key={loc.slug}
                  href={`/locations/${loc.slug}`}
                  className="group rounded-xl border bg-card p-5 shadow-sm transition-colors hover:shadow-md hover:border-primary/30 hover:bg-muted/50"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold group-hover:text-primary transition-colors">
                        {loc.city}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {loc.state}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${TIER_COLORS[tier]}`}
                    >
                      {TIER_LABELS[tier]}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {loc.keyMarketStats.totalCommercialSqFt} commercial
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {loc.dominantLeaseTypes.slice(0, 2).map((lt) => (
                      <span
                        key={lt}
                        className="rounded border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                      >
                        {lt}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
        <ResourceHubDirectory hubHref="/locations" />


        <BrowseVerticals current="locations" />

        <FaqSection items={FAQ_ITEMS} />

        <ContentCta
          heading="Get started with your market today"
          description="Upload any commercial lease PDF and get 126 structured fields extracted in minutes. Works for every US market. Just $15 per lease."
          buttonText="Upload Your Lease"
          href="/upload"
        />
      </div>
    </>
  )
}
