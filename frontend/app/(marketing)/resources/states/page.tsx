import type { Metadata } from 'next'
import { MapPin } from 'lucide-react'
import { stateData } from '@/data/states'
import { StateCard } from '@/components/content/state-card'
import { SITE_URL, DEFAULT_OG_IMAGE } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/json-ld'
import { buildBreadcrumbSchema, buildFAQPageSchema } from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { ResourceHubDirectory } from '@/components/content/resource-hub-directory'
import { ContentCta } from '@/components/content/content-cta'
import { BrowseVerticals } from '@/components/content/browse-verticals'
import { FaqSection } from '@/components/marketing/faq-section'

const FAQ_ITEMS = [
  {
    question: 'Do commercial lease laws differ by state?',
    answer:
      'Yes, significantly. States vary in their landlord-tenant statutes, required notice periods, CAM audit rights, permitted lease clauses, and eviction procedures for commercial tenants. A triple-net lease in California carries different legal implications than the same structure in Texas or New York. Understanding state law is essential before signing or abstracting any commercial lease.',
  },
  {
    question: 'Which states have the most complex commercial lease regulations?',
    answer:
      'California, New York, and Illinois consistently rank among the most complex jurisdictions for commercial leases. California imposes detailed disclosure requirements and limits on certain landlord remedies. New York has distinct holdover provisions and rent stabilization carve-outs. Illinois has specific eviction timelines and notice requirements that differ from the commercial default rules in most other states.',
  },
  {
    question: 'Does Lextract handle state-specific lease provisions automatically?',
    answer:
      'Yes. Lextract extracts all 126 structured fields regardless of the originating state, including state-specific clauses like California prop 13 tax protection provisions, Texas mineral rights language, and New York surrender obligations. The AI reads the actual lease text - not a generic template - so state-specific provisions are captured as written.',
  },
  {
    question: 'Are there states where specific lease clauses are required by law?',
    answer:
      'Some states require certain disclosures or provisions to be present in commercial leases. For example, California requires specific lead paint and asbestos disclosures for older properties. Several states mandate that permitted-use clauses meet minimum specificity standards. Lextract flags missing or unusual clauses through its 20 automated red flag checks, which helps surface compliance gaps during review.',
  },
  {
    question: "How does Lextract's AI handle state-specific lease language?",
    answer:
      "Lextract uses vision AI trained on a broad corpus of legal and real estate documents. The AI interprets state-specific phrasing - including jurisdiction-specific defined terms, local custom provisions, and regulatory references - and maps them to the appropriate fields in the 126-field extraction schema. Processing takes 5–15 minutes per lease at $15 per extraction.",
  },
]

export const metadata: Metadata = {
  title: 'Commercial Lease Laws by State',
  description:
    'State-by-state guide to commercial landlord-tenant laws across all 50 U.S. states. Key statutes, notice periods, audit rights, and eviction rules for CRE professionals.',
  alternates: { canonical: `${SITE_URL}/resources/states` },
  openGraph: {
    url: `${SITE_URL}/resources/states`,
    title: 'Commercial Lease Laws by State',
    description:
      'State-by-state guide to commercial landlord-tenant laws across all 50 U.S. states.',
    type: 'website',
    images: [DEFAULT_OG_IMAGE],
  },
}

export default function StatesPage() {
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Resources', url: `${SITE_URL}/resources` },
    { name: 'States', url: `${SITE_URL}/resources/states` },
  ]

  return (
    <>
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(FAQ_ITEMS)} />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Resources', href: '/resources' },
            { label: 'States' },
          ]}
        />

        <header className="mb-12 mt-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-sm font-medium text-primary">
            <MapPin className="size-3.5" aria-hidden="true" />
            {stateData.length} State Guides
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Commercial Lease Laws by State
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg lg:text-xl">
            Every state handles commercial landlord-tenant relationships
            differently. Explore key statutes, notice requirements, CAM audit
            rights, and eviction rules across all {stateData.length} U.S. states.
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {stateData.map((state) => (
            <StateCard key={state.slug} state={state} />
          ))}
        </div>

        <FaqSection items={FAQ_ITEMS} />

        <ContentCta
          heading="Extract any commercial lease - regardless of state"
          description="Lextract applies state-specific rules automatically. Upload a lease PDF and get 126 structured fields extracted in 5-15 minutes. Just $15 per lease."
        />
        <ResourceHubDirectory hubHref="/resources/states" />


        <BrowseVerticals current="states" />
      </div>
    </>
  )
}
