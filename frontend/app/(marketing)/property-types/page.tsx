import type { Metadata } from 'next'
import Link from 'next/link'
import { PROPERTY_TYPES, PROPERTY_TYPES_COUNT } from '@/data/property-types'
import { SITE_URL } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/json-ld'
import { buildBreadcrumbSchema, buildFAQPageSchema } from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { ResourceHubDirectory } from '@/components/content/resource-hub-directory'
import { ContentCta } from '@/components/content/content-cta'
import { BrowseVerticals } from '@/components/content/browse-verticals'
import { FaqSection } from '@/components/marketing/faq-section'
import { Building } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Commercial Lease Abstraction by Property Type',
  description:
    'Lease abstraction guides for 15 commercial property types: office, retail, industrial, medical, restaurant, data center, and more. Understand what to extract from each lease type.',
  alternates: {
    canonical: `${SITE_URL}/property-types`,
  },
}

const FAQ_ITEMS = [
  {
    question: 'What types of commercial properties does Lextract support?',
    answer:
      'Lextract supports 15 commercial property types including office, retail, industrial, medical, restaurant, data center, self-storage, mixed-use, and more. The AI extraction engine handles the distinct lease structures and critical fields specific to each property type, delivering all 126 structured fields per extraction.',
  },
  {
    question: 'Is retail lease abstraction different from industrial lease abstraction?',
    answer:
      'Yes, the difference is large. Retail leases often include percentage rent clauses, co-tenancy protections, exclusivity rights, and marketing fund contributions that industrial leases rarely have. Industrial leases focus more on permitted use, dock and drive-in door specs, and environmental compliance. Lextract captures the fields that matter for each type.',
  },
  {
    question: 'Can Lextract abstract office, retail, and industrial leases equally well?',
    answer:
      'Yes. Lextract\'s 126-field schema covers the key fields for all three lease types, and the AI reads property-type-specific language. Every extraction produces the same structured output whatever the property type. Most documents take 5 to 15 minutes.',
  },
  {
    question: 'How does property type affect which lease fields matter most?',
    answer:
      'Property type determines which fields carry the most financial and legal risk. For retail, CAM caps and percentage rent breakpoints are critical. For medical office, permitted use restrictions and hazardous materials clauses matter most. Lextract extracts all 126 fields and flags red flags relevant to your specific lease structure.',
  },
  {
    question: 'Does Lextract handle mixed-use property leases?',
    answer:
      'Yes. Mixed-use leases combine retail, office, and sometimes residential components, and Lextract supports them. Lextract extracts the applicable fields from the document and gives each one a confidence score so you can quickly find the fields that need human review.',
  },
]

export default function PropertyTypesIndexPage() {
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Property Types', url: `${SITE_URL}/property-types` },
  ]

  return (
    <>
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(FAQ_ITEMS)} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Property Types' },
          ]}
        />

        <header className="mb-12 mt-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-sm font-medium text-primary">
            <Building className="size-3.5" aria-hidden="true" />
            {PROPERTY_TYPES.length} Property Types
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Lease Abstraction by Property Type
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg lg:text-xl">
            Each commercial property type has its own lease structures, key fields, and common
            pitfalls. Browse our guides to see what matters most for your lease type and what
            Lextract extracts for each.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              {PROPERTY_TYPES_COUNT} property types
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Critical fields per type
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Common red flags per type
            </span>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROPERTY_TYPES.map((propertyType) => {
            const firstSentence = propertyType.overview.split('. ')[0] + '.'
            return (
              <Link
                key={propertyType.slug}
                href={`/property-types/${propertyType.slug}`}
                className="group rounded-xl border bg-card shadow-sm p-5 transition-colors hover:shadow-md hover:border-primary/30 hover:bg-muted/50"
              >
                <p className="font-semibold group-hover:text-primary transition-colors">
                  {propertyType.name}
                </p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  Avg term: {propertyType.avgTermRange}
                </p>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                  {firstSentence}
                </p>
              </Link>
            )
          })}
        </div>
        <ResourceHubDirectory hubHref="/property-types" />


        <BrowseVerticals current="property-types" />

        <FaqSection items={FAQ_ITEMS} />

        <ContentCta
          heading="Abstract any commercial lease type in minutes"
          description="Upload your lease PDF, whether it's a strip center NNN, an office modified gross, or an industrial ground lease, and get 126 structured fields extracted automatically. Just $15 per lease."
          buttonText="Upload Your Lease"
          href="/upload"
        />
      </div>
    </>
  )
}
