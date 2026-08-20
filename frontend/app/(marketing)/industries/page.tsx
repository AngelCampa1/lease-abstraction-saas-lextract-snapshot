import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE_URL, DEFAULT_OG_IMAGE } from '@/lib/site-config'
import { INDEXABLE_INDUSTRIES as INDUSTRIES } from '@/data/industries'
import { JsonLd } from '@/components/seo/json-ld'
import { buildBreadcrumbSchema, buildFAQPageSchema } from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { ResourceHubDirectory } from '@/components/content/resource-hub-directory'
import { FaqSection } from '@/components/marketing/faq-section'
import { Building2 } from 'lucide-react'
import { BrowseVerticals } from '@/components/content/browse-verticals'

const FAQ_ITEMS = [
  {
    question: 'Which industries use commercial lease abstraction?',
    answer:
      'Commercial lease abstraction is used across any industry that occupies leased space. Lextract publishes industry-specific extraction guides for major sectors, including retail, office, industrial, healthcare, and restaurant. Each guide covers the dominant lease structures, critical fields, and common red flags for that sector.',
  },
  {
    question: 'Does lease abstraction differ by industry?',
    answer:
      'Yes. While the core 126-field schema applies to every lease, the relative importance of specific fields varies significantly by industry. Healthcare leases require close attention to permitted use restrictions and regulatory compliance provisions. Retail leases prioritize co-tenancy rights, exclusivity clauses, and percentage rent calculations. Industrial leases focus on NNN expense pass-throughs, hazardous materials provisions, and clear height restrictions.',
  },
  {
    question: 'How does Lextract handle retail vs. office lease abstractions?',
    answer:
      'Retail leases often include percentage rent provisions, exclusivity clauses, co-tenancy requirements, and radius restrictions that office leases lack. Lextract extracts and flags these. Office leases more often include expansion rights, first right of offer on adjacent space, and operating expense stop structures. Lextract\'s 126-field schema captures both lease types with confidence scoring on every field.',
  },
  {
    question: 'Is Lextract suitable for healthcare facility leases?',
    answer:
      'Yes. Healthcare leases often contain complex permitted use definitions tied to specific medical license categories, HIPAA-related provisions, extended notice requirements for landlord access, and specialized build-out terms for clinical environments. Lextract extracts permitted use language, tenant improvement allowances, operating hours restrictions, and all standard financial fields from medical office and clinic leases. Most documents take 5 to 15 minutes.',
  },
]

export const metadata: Metadata = {
  title: 'Commercial Real Estate Industry Lease Guides',
  description:
    'Lease abstraction for retail, office, industrial, healthcare, restaurant, and more. Industry-specific fields, red flags, and extraction guidance.',
  alternates: {
    canonical: `${SITE_URL}/industries`,
  },
  openGraph: {
    url: `${SITE_URL}/industries`,
    title: 'Commercial Real Estate Industry Lease Guides',
    description:
      'Lease abstraction for retail, office, industrial, healthcare, restaurant, and more. Industry-specific fields, red flags, and extraction guidance.',
    type: 'website',
    images: [DEFAULT_OG_IMAGE],
  },
}

export default function IndustriesIndexPage() {
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Industries', url: `${SITE_URL}/industries` },
  ]

  return (
    <>
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(FAQ_ITEMS)} />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Industries' },
          ]}
        />
        <header className="mb-12 mt-6 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-sm font-medium text-primary">
            <Building2 className="size-3.5" aria-hidden="true" />
            Priority Industry Guides
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Lease Abstraction by Industry
          </h1>
          <p className="mt-4 text-base text-muted-foreground max-w-2xl mx-auto sm:text-lg lg:text-xl">
            Commercial lease risk changes by industry. These pages cover the
            sectors where lease structure, use restrictions, and expense language
            differ enough to need their own guide.
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {INDUSTRIES.map((industry) => (
            <Link
              key={industry.slug}
              href={`/industries/${industry.slug}`}
              className="group rounded-xl border bg-card shadow-sm p-5 transition-colors hover:shadow-md hover:bg-muted/50 sm:p-6"
            >
              <h2 className="mb-2 text-lg font-semibold group-hover:text-primary transition-colors">
                {industry.shortName}
              </h2>
              <p className="mb-4 text-sm text-muted-foreground line-clamp-3">
                {industry.overview.split('.')[0]}.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {industry.dominantLeaseTypes.map((leaseType) => (
                  <span
                    key={leaseType}
                    className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                  >
                    {leaseType}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>

        <FaqSection items={FAQ_ITEMS} />

        <section className="mt-16 rounded-xl bg-primary/5 border border-primary/10 p-8 text-center">
          <h2 className="mb-3 text-2xl font-bold sm:text-3xl">Extract Any Commercial Lease in Minutes</h2>
          <p className="mb-6 text-muted-foreground max-w-xl mx-auto">
            Upload your lease PDF and get 126 structured fields extracted by AI, each with a
            confidence score. Industry red flag detection is included. Just $15 per lease.
          </p>
          <Link
            href="/upload"
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Upload Your Lease
          </Link>
        </section>
        <ResourceHubDirectory hubHref="/industries" />


        <BrowseVerticals current="industries" />
      </div>
    </>
  )
}
