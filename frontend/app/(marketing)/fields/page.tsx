import type { Metadata } from 'next'
import Link from 'next/link'
import { INDEXABLE_FIELDS as FIELDS, type FieldCategory } from '@/data/fields'
import { SITE_URL } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/json-ld'
import { buildBreadcrumbSchema, buildItemListSchema, buildFAQPageSchema } from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { ResourceHubDirectory } from '@/components/content/resource-hub-directory'
import { ContentCta } from '@/components/content/content-cta'
import { BrowseVerticals } from '@/components/content/browse-verticals'
import { RelatedContent } from '@/components/content/related-content'
import { FaqSection } from '@/components/marketing/faq-section'
import { getAllContentItems, getRelatedContentForPseo } from '@/lib/content-matching'
import { Search } from 'lucide-react'
import { PRODUCT_CATEGORY_COUNT, PRODUCT_FIELD_COUNT } from '@/lib/product-facts'

const FAQ_ITEMS = [
  {
    question: 'How many fields does Lextract extract from a lease?',
    answer:
      `Lextract extracts ${PRODUCT_FIELD_COUNT} structured fields from every commercial lease PDF. These fields span ${PRODUCT_CATEGORY_COUNT} categories including parties and property, key dates and term, rent and escalations, CAM and operating expenses, options, tenant improvements, insurance, assignment, default, exclusivity, parking, utilities, signage, and miscellaneous provisions.`,
  },
  {
    question: 'What types of fields are extracted from a commercial lease?',
    answer:
      'Extracted fields cover commercial lease data such as financial terms (base rent, CAM caps, operating expense stops), critical dates (commencement, expiration, option deadlines), tenant rights (renewal options, ROFO, termination rights), and legal provisions (assignment restrictions, SNDA requirements, holdover rent). Each field includes a confidence score of High, Medium, or Low based on AI extraction quality.',
  },
  {
    question: 'Are all 126 fields extracted from every lease?',
    answer:
      `Lextract attempts all ${PRODUCT_FIELD_COUNT} fields on every lease, but not every field is present in every document. For example, a gross lease will not have separate NNN expense fields, and a lease without options will not populate renewal option dates. Fields absent from the source document are returned as null with an explanation, so you always know what was found versus what was not present.`,
  },
  {
    question: 'What confidence scoring system does Lextract use for extracted fields?',
    answer:
      'Every extracted field receives one of three confidence levels. High means the AI found clear language and the source scan was clean. Medium means the provision was identified but the language was ambiguous or the scan quality was moderate. Low means the field was flagged for human review because of poor source quality or conflicting language. Low-confidence fields are highlighted in the results dashboard. Always verify extracted data against the original lease.',
  },
  {
    question: 'Which fields are most commonly used in lease abstracts?',
    answer:
      'The most referenced fields in commercial lease abstracts are base rent, lease commencement and expiration dates, tenant and landlord entity names, square footage, renewal options, CAM expense caps, rent escalation schedule, security deposit amount, and permitted use. Lextract treats all of these as required fields. They are always attempted and always included in exports.',
  },
]

export const metadata: Metadata = {
  title: 'Commercial Lease Fields for Abstraction Workflows',
  description:
    'Browse key commercial lease fields for rent, CAM, dates, options, insurance, and risk review.',
  alternates: {
    canonical: `${SITE_URL}/fields`,
  },
}

const CATEGORY_ORDER: { key: FieldCategory; label: string }[] = [
  { key: 'parties-property', label: 'Parties & Property' },
  { key: 'key-dates-term', label: 'Key Dates & Term' },
  { key: 'rent-escalations', label: 'Rent & Escalations' },
  { key: 'cam-operating-expenses', label: 'CAM & Operating Expenses' },
  { key: 'options', label: 'Options' },
  { key: 'tenant-improvements', label: 'Tenant Improvements & Construction' },
  { key: 'insurance-indemnity', label: 'Insurance & Indemnity' },
  { key: 'assignment-subletting', label: 'Assignment & Subletting' },
  { key: 'default-remedies', label: 'Default & Remedies' },
  { key: 'exclusivity-cotenancy', label: 'Exclusivity & Co-tenancy' },
  { key: 'parking-common-areas', label: 'Parking & Common Areas' },
  { key: 'utilities', label: 'Utilities' },
  { key: 'signage-permitted-use', label: 'Signage & Permitted Use' },
  { key: 'miscellaneous', label: 'Miscellaneous' },
]

export default async function FieldsIndexPage() {
  const allContent = await getAllContentItems()
  const featuredArticles = getRelatedContentForPseo(
    allContent,
    'fields',
    ['base rent', 'cam', 'lease abstraction', 'rent escalation', 'operating expenses'],
    3
  )

  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Fields', url: `${SITE_URL}/fields` },
  ]

  const fieldsByCategory = new Map<FieldCategory, typeof FIELDS>()
  for (const field of FIELDS) {
    const existing = fieldsByCategory.get(field.category) ?? []
    existing.push(field)
    fieldsByCategory.set(field.category, existing)
  }

  const itemListSchema = buildItemListSchema({
    name: 'Priority Commercial Lease Fields',
    description: 'Key commercial lease fields for abstraction, audit, and import workflows.',
    items: FIELDS.map((f) => ({
      name: f.displayLabel,
      url: `${SITE_URL}/fields/${f.slug}`,
      description: f.description,
    })),
  })

  return (
    <>
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={itemListSchema} />
      <JsonLd schema={buildFAQPageSchema(FAQ_ITEMS)} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Fields' },
          ]}
        />

        <header className="mb-12 mt-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-sm font-medium text-primary">
            <Search className="size-3.5" aria-hidden="true" />
            Curated Field Library
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Commercial Lease Fields for Your Workflow
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg lg:text-xl">
            Start with the lease fields used for abstraction, CAM review, audit prep,
            and system import. This hub covers the common terms first. Browse by
            category to find the field you need.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {FIELDS.filter((field) => field.required).length} priority fields
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              {FIELDS.filter((field) => field.camRelevant).length} CAM-relevant fields
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              {PRODUCT_CATEGORY_COUNT} categories
            </span>
          </div>
        </header>

        {CATEGORY_ORDER.map(({ key, label }) => {
          const fields = fieldsByCategory.get(key) ?? []
          return (
            <section key={key} id={key} className="mb-12">
              <h2 className="mb-4 text-2xl font-bold sm:text-3xl">{label}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {fields.map((field) => (
                  <Link
                    key={field.slug}
                    href={`/fields/${field.slug}`}
                    className="group rounded-xl border bg-card p-5 shadow-sm transition-colors hover:border-primary/30 hover:bg-muted/50 hover:shadow-md sm:p-6"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium group-hover:text-primary transition-colors">
                        {field.displayLabel}
                      </p>
                      <div className="flex shrink-0 gap-1">
                        {field.required && (
                          <span className="h-2 w-2 rounded-full bg-emerald-500" title="Required" />
                        )}
                        {field.camRelevant && (
                          <span className="h-2 w-2 rounded-full bg-amber-500" title="CAM Relevant" />
                        )}
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {field.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )
        })}

        {featuredArticles.length > 0 && (
          <div className="mb-12">
            <RelatedContent
              items={featuredArticles}
              heading="Featured Articles"
              basePath="/resources"
            />
          </div>
        )}
        <ResourceHubDirectory hubHref="/fields" />


        <BrowseVerticals current="fields" />

        <FaqSection items={FAQ_ITEMS} />

        <ContentCta
          heading="Skip the manual review"
          description={`Upload your lease PDF and get all ${PRODUCT_FIELD_COUNT} fields extracted automatically with confidence scoring. Just $15 per lease.`}
          buttonText="Upload Your Lease"
          href="/upload"
        />
      </div>
    </>
  )
}
