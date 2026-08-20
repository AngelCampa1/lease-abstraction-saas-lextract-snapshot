import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE_URL, DEFAULT_OG_IMAGE } from '@/lib/site-config'
import { buildDefinedTermSetSchema, buildBreadcrumbSchema, buildItemListSchema, buildFAQPageSchema } from '@/lib/schema'
import { JsonLd } from '@/components/seo/json-ld'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { ResourceHubDirectory } from '@/components/content/resource-hub-directory'
import { ContentCta } from '@/components/content/content-cta'
import { BrowseVerticals } from '@/components/content/browse-verticals'
import { RelatedContent } from '@/components/content/related-content'
import { FaqSection } from '@/components/marketing/faq-section'
import { getAllContentItems, getRelatedContentForPseo } from '@/lib/content-matching'
import {
  INDEXABLE_GLOSSARY_TERMS as GLOSSARY_TERMS,
  GLOSSARY_CATEGORY_LABELS,
  getAlphabetIndex,
  getTermsByLetter,
} from '@/data/glossary'
import type { GlossaryCategory } from '@/data/glossary'
import { BookOpen } from 'lucide-react'
import { CATEGORY_COLORS } from '@/lib/design-tokens'

const FAQ_ITEMS = [
  {
    question: 'What commercial lease terms does this glossary cover?',
    answer:
      'The Lextract glossary focuses on the lease terms that show up repeatedly in abstraction, CAM review, lease accounting prep, and negotiation workflows. The library is organized across financial, legal, operational, party, and property concepts so teams can move quickly from an unfamiliar term to the practical implication behind it.',
  },
  {
    question: 'What is CAM in commercial real estate?',
    answer:
      'CAM stands for Common Area Maintenance. It is the landlord\'s cost of maintaining shared areas of a property, such as lobbies, parking lots, landscaping, HVAC, and roof repairs. These costs are passed through to tenants as part of their annual operating expense. In NNN and modified gross leases, tenants usually pay a pro-rata share of CAM based on their percentage of the building\'s total rentable square footage.',
  },
  {
    question: 'What does NNN mean in a lease?',
    answer:
      'NNN stands for Triple Net. In a NNN lease, the tenant pays base rent plus three additional expense categories: property taxes, building insurance, and common area maintenance (CAM). This shifts most ownership costs from the landlord to the tenant, resulting in lower base rent but significant additional monthly obligations that can vary year to year.',
  },
  {
    question: 'What is an estoppel certificate?',
    answer:
      'An estoppel certificate is a signed document in which a tenant confirms the current status of their lease. It covers the rent amount, the lease term, any outstanding landlord defaults, and whether any lease changes have been made. Lenders and buyers often require estoppel certificates from all tenants before closing a property sale or refinance. This lets them verify what the landlord said about the lease.',
  },
  {
    question: 'How many terms are in the Lextract lease glossary?',
    answer:
      'The glossary is intentionally curated rather than exhaustive. Lextract keeps the terms that matter most for active commercial lease work so the library stays useful for operators, analysts, and reviewers instead of becoming a thin dictionary of edge-case terminology.',
  },
]

export const metadata: Metadata = {
  title: 'Commercial Lease Glossary | High-Value CRE Terms in Plain English',
  description:
    'Plain-English definitions of the commercial lease terms that matter most in abstraction, CAM review, accounting prep, and CRE operations.',
  alternates: { canonical: `${SITE_URL}/glossary` },
  openGraph: {
    title: 'Commercial Lease Glossary | High-Value CRE Terms in Plain English',
    description:
      'Plain-English definitions of the commercial lease terms that matter most in abstraction, CAM review, accounting prep, and CRE operations.',
    url: `${SITE_URL}/glossary`,
    images: [DEFAULT_OG_IMAGE],
  },
}

const GLOSSARY_CATEGORY_COLORS: Record<GlossaryCategory, string> = {
  financial: CATEGORY_COLORS['financial'],
  legal: CATEGORY_COLORS['legal'],
  operational: CATEGORY_COLORS['operational'],
  parties: CATEGORY_COLORS['parties'],
  property: CATEGORY_COLORS['property'],
}

export default async function GlossaryPage() {
  const allContent = await getAllContentItems()
  const featuredArticles = getRelatedContentForPseo(
    allContent,
    'glossary',
    ['nnn', 'cam', 'lease abstraction', 'estoppel', 'holdover', 'sublease'],
    3
  )

  const alphabetIndex = getAlphabetIndex()
  const termsByLetter = getTermsByLetter()

  const definedTermSetSchema = buildDefinedTermSetSchema(GLOSSARY_TERMS)
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Glossary', url: `${SITE_URL}/glossary` },
  ])
  const itemListSchema = buildItemListSchema({
    name: 'Commercial Lease Glossary',
    description: 'Plain-English definitions of common commercial lease terms.',
    items: GLOSSARY_TERMS.map((t) => ({
      name: t.term,
      url: `${SITE_URL}/glossary/${t.slug}`,
      description: t.definition,
    })),
  })

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
      <JsonLd schema={definedTermSetSchema} />
      <JsonLd schema={breadcrumbSchema} />
      <JsonLd schema={itemListSchema} />
      <JsonLd schema={buildFAQPageSchema(FAQ_ITEMS)} />

      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Glossary' },
        ]}
      />

      {/* Hero */}
      <div className="mb-12 mt-6">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-sm font-medium text-primary">
          <BookOpen className="size-3.5" aria-hidden="true" />
          Curated CRE Glossary
        </div>
        <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          Commercial Lease Glossary
        </h1>
        <p className="text-base text-muted-foreground sm:text-lg lg:text-xl">
          Plain-English definitions for the lease terms that drive abstraction, CAM review,
          lease accounting prep, negotiations, and portfolio reporting. This is a working
          glossary for CRE teams, not a catch-all dictionary.
        </p>
      </div>

      {/* A-Z Navigation */}
      <nav aria-label="Alphabetical navigation" className="mb-12">
        <div className="grid grid-cols-7 gap-2 sm:grid-cols-9 md:grid-cols-[repeat(13,minmax(0,1fr))]">
          {alphabetIndex.map((letter) => (
            <a
              key={letter}
              href={`#letter-${letter}`}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              {letter}
            </a>
          ))}
        </div>
      </nav>

      {/* Terms grouped by letter */}
      <div className="space-y-12">
        {alphabetIndex.map((letter) => (
          <section key={letter} id={`letter-${letter}`}>
            <h2 className="mb-6 border-b pb-2 text-2xl font-bold text-foreground sm:text-3xl">
              {letter}
            </h2>
            <div className="space-y-8">
              {termsByLetter[letter].map((term) => (
                <article
                  key={term.slug}
                  id={term.slug}
                  className="scroll-mt-24 rounded-xl border bg-card p-5 shadow-sm sm:p-6"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <Link
                      href={`/glossary/${term.slug}`}
                      className="inline-flex min-h-[44px] items-center transition-colors hover:text-primary focus-visible:text-primary"
                    >
                      <h3 className="text-xl font-semibold text-foreground">
                        {term.term}
                      </h3>
                    </Link>
                    <span
                      className={`inline-block rounded-full px-3 py-0.5 text-sm font-medium ${GLOSSARY_CATEGORY_COLORS[term.category]}`}
                    >
                      {GLOSSARY_CATEGORY_LABELS[term.category]}
                    </span>
                  </div>

                  <p className="mb-4 text-muted-foreground">{term.definition}</p>

                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-primary hover:underline">
                      Read more
                    </summary>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {term.extendedDefinition}
                    </p>
                  </details>

                  {term.relatedTerms.length > 0 && (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="text-sm text-muted-foreground">Related:</span>
                      {term.relatedTerms.map((relatedSlug) => {
                        const relatedTerm = GLOSSARY_TERMS.find(
                          (t) => t.slug === relatedSlug
                        )
                        if (!relatedTerm) return null
                        return (
                          <Link
                            key={relatedSlug}
                            href={`/glossary/${relatedSlug}`}
                            className="inline-flex min-h-[44px] items-center rounded-full bg-muted px-3 py-0.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                          >
                            {relatedTerm.term}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      {featuredArticles.length > 0 && (
        <div className="mt-16">
          <RelatedContent
            items={featuredArticles}
            heading="Featured Articles"
            basePath="/resources"
          />
        </div>
      )}
        <ResourceHubDirectory hubHref="/glossary" />


      <BrowseVerticals current="glossary" />

      <FaqSection items={FAQ_ITEMS} />

      <ContentCta
        heading="Extract these terms from your leases automatically"
        description="Upload a commercial lease PDF and get 126 structured fields extracted in minutes. That includes the terms defined above. $15 per lease."
      />
    </div>
  )
}
