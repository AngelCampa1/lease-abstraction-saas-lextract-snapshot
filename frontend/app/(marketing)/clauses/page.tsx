import type { Metadata } from 'next'
import Link from 'next/link'
import { INDEXABLE_CLAUSES as CLAUSES, CLAUSE_CATEGORY_LABELS, type ClauseCategory } from '@/data/clauses'
import { SITE_URL } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/json-ld'
import { buildBreadcrumbSchema, buildFAQPageSchema } from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { ResourceHubDirectory } from '@/components/content/resource-hub-directory'
import { ContentCta } from '@/components/content/content-cta'
import { BrowseVerticals } from '@/components/content/browse-verticals'
import { FaqSection } from '@/components/marketing/faq-section'
import { Scale } from 'lucide-react'

const FAQ_ITEMS = [
  {
    question: 'What is a lease clause?',
    answer:
      'A lease clause is a single provision in a commercial lease that governs one right, obligation, or condition. Examples include how rent escalates each year, whether the tenant can sublet, or what happens if the landlord sells the building. A commercial lease often contains dozens of clauses. Each one can have a real financial or operational impact.',
  },
  {
    question: 'Which lease clauses does Lextract extract automatically?',
    answer:
      'Lextract identifies and extracts data from common high-impact clauses. The clause library covers financial clauses such as rent escalation, the operating expense stop, the base year clause, and the gross-up provision. It covers tenant rights such as co-tenancy, exclusive use, the go-dark clause, and the kick-out clause. It also covers legal clauses such as force majeure, the personal guarantee, and the good guy guarantee. Key clause terms are captured as structured fields within the 126-field extraction schema.',
  },
  {
    question: 'Why are certain clauses more important than others?',
    answer:
      'Clauses with direct financial impact get the most scrutiny. These include rent escalation, CAM reconciliation, holdover rent, and free rent periods. Errors or missed provisions here can cost tenants a large amount over a lease term. Options clauses such as renewal, purchase, and termination also matter because they expire if not exercised on time. Lextract flags high-stakes clauses for priority review.',
  },
  {
    question: 'How does Lextract flag unusual clauses?',
    answer:
      'Lextract runs 20 red flag checks against the extracted clause data and compares each provision to common market terms. Unusual terms are flagged with a severity level of High, Medium, or Low so reviewers know where to look first. Examples include holdover rent above 150% of base, CAM caps below 3%, or personal guarantees longer than 12 months.',
  },
  {
    question: 'What is the difference between a standard and non-standard lease clause?',
    answer:
      'A standard clause follows common terms for a given lease type and location. One example is a 3% annual rent escalation in a NNN retail lease. A non-standard clause moves away from those norms. It can favor the tenant, such as a below-market renewal option, or work against them, such as unlimited CAM pass-throughs with no cap. Lextract\'s red flag engine identifies non-standard provisions during extraction.',
  },
]

export const metadata: Metadata = {
  title: 'Commercial Lease Clauses Worth Reviewing First',
  description:
    'A curated guide to the commercial lease clauses that most often change economics, renewal leverage, CAM exposure, and operational flexibility.',
  alternates: {
    canonical: `${SITE_URL}/clauses`,
  },
}

const CATEGORY_ORDER: ClauseCategory[] = [
  'financial',
  'tenant-rights',
  'landlord-protections',
  'operational',
  'legal',
]

const CATEGORY_DESCRIPTIONS: Record<ClauseCategory, string> = {
  financial: 'Clauses that directly affect rent amounts, expense obligations, and total occupancy cost.',
  'tenant-rights': 'Provisions that protect the tenant\'s ability to operate, expand, and exit the lease.',
  'landlord-protections': 'Clauses that protect the landlord\'s revenue, property control, and tenant mix.',
  operational: 'Provisions governing how and when the tenant must operate the leased premises.',
  legal: 'Structural legal provisions governing lease transfer, lender rights, and holdover obligations.',
}

export default function ClausesIndexPage() {
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Clauses', url: `${SITE_URL}/clauses` },
  ]

  const clausesByCategory = new Map<ClauseCategory, typeof CLAUSES>()
  for (const clause of CLAUSES) {
    const existing = clausesByCategory.get(clause.category) ?? []
    existing.push(clause)
    clausesByCategory.set(clause.category, existing)
  }
  const renderedCategoryCount = CATEGORY_ORDER.filter(
    (categoryKey) => (clausesByCategory.get(categoryKey) ?? []).length > 0,
  ).length

  return (
    <>
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(FAQ_ITEMS)} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Clauses' },
          ]}
        />

        <header className="mb-12 mt-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-sm font-medium text-primary">
            <Scale className="size-3.5" aria-hidden="true" />
            Curated Clause Library
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Commercial Lease Clauses Worth Reviewing First
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg lg:text-xl">
            A commercial lease contains dozens of clauses. The wrong terms can cost a tenant a lot
            of money over a lease term. Learn what each clause means, why it matters, and how to
            negotiate it.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              {CLAUSES.length} high-impact clause types
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {renderedCategoryCount} categories
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Negotiation guidance
            </span>
          </div>
        </header>

        {CATEGORY_ORDER.map((categoryKey) => {
          const clauses = clausesByCategory.get(categoryKey) ?? []
          if (clauses.length === 0) return null
          const label = CLAUSE_CATEGORY_LABELS[categoryKey]
          const description = CATEGORY_DESCRIPTIONS[categoryKey]

          return (
            <section key={categoryKey} id={categoryKey} className="mb-12">
              <div className="mb-5">
                <h2 className="text-2xl font-bold sm:text-3xl">{label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {clauses.map((clause) => {
                  const firstSentence = clause.definition.split('. ')[0] + '.'
                  return (
                    <Link
                      key={clause.slug}
                      href={`/clauses/${clause.slug}`}
                      className="group rounded-xl border bg-card p-5 shadow-sm transition-colors hover:border-primary/30 hover:bg-muted/50 hover:shadow-md sm:p-6"
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <p className="font-medium group-hover:text-primary transition-colors">
                          {clause.name}
                        </p>
                        <span className="shrink-0 inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {firstSentence}
                      </p>
                    </Link>
                  )
                })}
              </div>
            </section>
          )
        })}
        <ResourceHubDirectory hubHref="/clauses" />


        <BrowseVerticals current="clauses" />

        <FaqSection items={FAQ_ITEMS} />

        <ContentCta
          heading="Extract clause data from your lease automatically"
          description="Upload your lease PDF and Lextract finds key clause language across all 126 extracted fields. Every field gets a confidence score and red flag detection. Just $15 per lease."
          buttonText="Upload Your Lease"
          href="/upload"
        />
      </div>
    </>
  )
}
