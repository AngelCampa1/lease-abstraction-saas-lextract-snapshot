import type { Metadata } from 'next'
import Link from 'next/link'
import { INDEXABLE_LEASE_TYPES as LEASE_TYPES } from '@/data/lease-types'
import { SITE_URL } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/json-ld'
import { buildBreadcrumbSchema, buildFAQPageSchema } from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { ResourceHubDirectory } from '@/components/content/resource-hub-directory'
import { ContentCta } from '@/components/content/content-cta'
import { BrowseVerticals } from '@/components/content/browse-verticals'
import { FaqSection } from '@/components/marketing/faq-section'
import { FileText } from 'lucide-react'

const FAQ_ITEMS = [
  {
    question: 'What types of commercial leases does Lextract support?',
    answer:
      'Lextract supports the common commercial lease types: Triple Net (NNN), Modified Gross, Full Service Gross, Gross, Percentage, and Ground. It also handles single-tenant and multi-tenant structures. The 126-field schema captures the financial and operational provisions for each structure.',
  },
  {
    question: 'What is the difference between a gross lease and a net lease?',
    answer:
      'In a gross lease, the tenant pays one all-inclusive rent and the landlord covers most operating expenses such as taxes, insurance, and maintenance. In a net lease, the tenant pays a lower base rent but also reimburses the landlord for some or all operating expenses. The main difference is which party carries the risk of rising operating costs. That is why the CAM and expense pass-through fields in Lextract matter most for net leases.',
  },
  {
    question: 'Can Lextract abstract a modified gross lease?',
    answer:
      'Yes. Modified gross leases split expense responsibility between landlord and tenant in negotiated ways, and Lextract supports them. Lextract extracts the base rent, the expense categories each party is responsible for, any operating expense stops or base years, and CAM cap provisions. Confidence scoring flags any provision where the expense allocation language is unclear.',
  },
  {
    question: 'What makes NNN lease abstraction different from gross lease abstraction?',
    answer:
      'NNN lease abstraction means extracting three separate expense obligations: property taxes, building insurance, and CAM. It also means capturing any caps, exclusions, or audit rights that limit tenant exposure. Gross lease abstraction focuses more on the all-in rent and any carve-outs the tenant is responsible for. The CAM and expense fields in Lextract matter most for NNN leases, where these costs can add a large amount to the base rent.',
  },
  {
    question: 'Does lease type affect extraction?',
    answer:
      'Lease type mainly affects which fields get populated. NNN and modified gross leases populate more CAM and expense fields than full service gross leases. Ground leases and percentage leases use less standard language, so they may produce more medium-confidence fields. Lextract gives every field a confidence score so you can spot the fields that need human review, whatever the lease type.',
  },
]

export const metadata: Metadata = {
  title: 'Commercial Lease Types Explained',
  description:
    'NNN, Modified Gross, Full Service Gross, Ground Lease, and more. Understand every commercial lease type, what tenants pay, and what to watch for.',
  alternates: {
    canonical: `${SITE_URL}/lease-types`,
  },
}

export default function LeaseTypesIndexPage() {
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Lease Types', url: `${SITE_URL}/lease-types` },
  ]

  return (
    <>
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(FAQ_ITEMS)} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Lease Types' },
          ]}
        />

        <header className="mb-12 mt-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-sm font-medium text-primary">
            <FileText className="size-3.5" aria-hidden="true" />
            {LEASE_TYPES.length} Lease Types
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Commercial Lease Types Explained
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg lg:text-xl">
            From NNN to Full Service Gross to Ground Leases. Understand each commercial
            lease structure, who pays what, and the key fields and red flags to watch
            before you sign or acquire.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {LEASE_TYPES.map((lt) => (
            <Link
              key={lt.slug}
              href={`/lease-types/${lt.slug}`}
              className="group rounded-xl border bg-card shadow-sm p-5 transition-colors hover:shadow-md hover:border-primary/30 hover:bg-muted/50 sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-lg font-semibold group-hover:text-primary transition-colors">
                  {lt.name}
                </p>
                <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-xs font-mono font-medium text-muted-foreground">
                  {lt.abbreviation}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                {lt.metaDescription}
              </p>
              <div className="mt-4 flex flex-wrap gap-1">
                {lt.typicalIndustries.slice(0, 3).map((industry) => (
                  <span
                    key={industry}
                    className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {industry}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Typical term: {lt.typicalTermLength}
              </p>
            </Link>
          ))}
        </div>
        <ResourceHubDirectory hubHref="/lease-types" />


        <BrowseVerticals current="lease-types" />

        <FaqSection items={FAQ_ITEMS} />

        <ContentCta
          heading="Abstract any lease type in minutes"
          description="Upload your commercial lease PDF, whether NNN, Modified Gross, Ground Lease, or any other structure, and get 126 structured fields extracted with red flag detection. Just $15 per lease."
          buttonText="Upload Your Lease"
          href="/upload"
        />
      </div>
    </>
  )
}
