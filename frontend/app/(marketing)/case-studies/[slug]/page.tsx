import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { CaseStudyData } from '@/data/case-studies'
import { getCaseStudyBySlug, getAllCaseStudySlugs, CASE_STUDIES_PUBLISHED_DATE } from '@/data/case-studies'
import { SITE_URL, DEFAULT_OG_IMAGE } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/json-ld'
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildFAQPageSchema,
} from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { LastUpdated } from '@/components/content/last-updated'
import { AuthorByline } from '@/components/content/author-byline'
import { ContentCta } from '@/components/content/content-cta'
import { RelatedContent } from '@/components/content/related-content'
import { CrossVerticalLinks } from '@/components/content/cross-vertical-links'
import { SeoFunnelLinks } from '@/components/content/seo-funnel-links'
import { getRelatedContentForPseo, getAllContentItems, getSmartCrossLinks } from '@/lib/content-matching'

interface CaseStudyPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllCaseStudySlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: CaseStudyPageProps): Promise<Metadata> {
  const { slug } = await params
  const cs = getCaseStudyBySlug(slug)

  if (!cs) {
    return { title: 'Case Study Not Found' }
  }

  return {
    title: cs.metaTitle,
    description: cs.metaDescription,
    alternates: {
      canonical: `${SITE_URL}/case-studies/${cs.slug}`,
    },
    openGraph: {
      url: `${SITE_URL}/case-studies/${cs.slug}`,
      title: cs.metaTitle,
      description: cs.metaDescription,
      type: 'article',
      images: [DEFAULT_OG_IMAGE],
    },
  }
}

function slugToLabel(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
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

export default async function CaseStudyPage({ params }: CaseStudyPageProps) {
  const { slug } = await params
  const cs = getCaseStudyBySlug(slug)

  if (!cs) return notFound()

  const allContent = await getAllContentItems()
  const relatedArticles = getRelatedContentForPseo(allContent, 'case-studies', [
    cs.name,
    cs.propertyType,
    cs.leaseStructure,
    cs.location,
    cs.tenantName,
  ])

  const crossLinks = getSmartCrossLinks('case-studies', [
    cs.name,
    cs.propertyType,
    cs.leaseStructure,
    cs.location,
    cs.tenantName,
    ...cs.complexityFactors,
  ])

  // Use the curated related-case-studies list from the data (cross-type recommendations)
  const relatedStudies = cs.relatedCaseStudies
    .map((s) => getCaseStudyBySlug(s))
    .filter((study): study is CaseStudyData => study !== undefined)

  const pageUrl = `${SITE_URL}/case-studies/${cs.slug}`
  const publishedDate = CASE_STUDIES_PUBLISHED_DATE
  const modifiedDate = CASE_STUDIES_PUBLISHED_DATE

  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Case Studies', url: `${SITE_URL}/case-studies` },
    { name: cs.name, url: pageUrl },
  ]

  return (
    <>
      <JsonLd
        schema={buildArticleSchema({
          headline: cs.metaTitle,
          description: cs.metaDescription,
          url: pageUrl,
          datePublished: publishedDate,
          dateModified: modifiedDate,
          author: 'Angel Campa, Founder',
        })}
      />
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(cs.faqs)} />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:py-20 sm:px-6 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Case Studies', href: '/case-studies' },
            { label: cs.name },
          ]}
        />

        <LastUpdated date="2026-03-17" />
        <AuthorByline />

        {/* Header */}
        <header className="mb-10 mt-6">
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="inline-flex items-center rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium transition-colors hover:bg-primary/10 hover:text-primary hover:border-primary/30">
              {cs.propertyType}
            </span>
            <span className="inline-flex items-center rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium transition-colors hover:bg-primary/10 hover:text-primary hover:border-primary/30">
              {cs.leaseStructure}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">{cs.name}</h1>
          <p className="mt-4 text-base sm:text-lg lg:text-xl text-muted-foreground">{cs.metaDescription}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            By Angel Campa, Founder &middot; Updated March 2026
          </p>

          {/* Key metrics */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border bg-card p-4 sm:p-5 text-center shadow-sm">
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="mt-0.5 text-sm font-semibold">{cs.location}</p>
            </div>
            <div className="rounded-xl border bg-card p-4 sm:p-5 text-center shadow-sm">
              <p className="text-xs text-muted-foreground">Size</p>
              <p className="mt-0.5 text-sm font-semibold">{formatSqft(cs.squareFootage)}</p>
            </div>
            <div className="rounded-xl border bg-card p-4 sm:p-5 text-center shadow-sm">
              <p className="text-xs text-muted-foreground">Annual Rent</p>
              <p className="mt-0.5 text-sm font-semibold text-primary">{formatRent(cs.annualRent)}</p>
            </div>
            <div className="rounded-xl border bg-card p-4 sm:p-5 text-center shadow-sm">
              <p className="text-xs text-muted-foreground">Term</p>
              <p className="mt-0.5 text-sm font-semibold">{cs.leaseTerm}</p>
            </div>
          </div>
        </header>

        {/* Source disclaimer */}
        <section className="mb-6 rounded-md border border-muted bg-muted/40 p-4">
          <p className="text-xs text-muted-foreground">
            <strong>About this case study.</strong> Lextract case studies show how the extraction
            pipeline handles a specific lease document type and complexity profile. Named parties
            are drawn either from publicly available lease documents (such as lease exhibits
            attached to SEC filings) or are illustrative names used to demonstrate a scenario.
            In either case, their inclusion on this page is not a claim that the named tenant or
            landlord is a Lextract customer or endorses the product. Extraction outputs shown
            (fields, values, confidence) reflect the actual results of running the underlying
            document through Lextract.
          </p>
        </section>

        {/* Tenant / Landlord */}
        <section className="mb-10">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border bg-card p-5 sm:p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tenant</p>
              <p className="mt-1 font-medium">{cs.tenantName}</p>
            </div>
            <div className="rounded-xl border bg-card p-5 sm:p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Landlord</p>
              <p className="mt-1 font-medium">{cs.landlordName}</p>
            </div>
          </div>
        </section>

        {/* The Challenge */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">The Challenge</h2>
          <p className="text-base leading-relaxed text-muted-foreground">{cs.challenge}</p>
        </section>

        {/* How Lextract Handled It */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">How Lextract Handled It</h2>
          <p className="text-base leading-relaxed text-muted-foreground">{cs.solution}</p>
          <div className="mt-4 flex gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{cs.fieldsExtracted}</p>
              <p className="text-xs text-muted-foreground">Fields Extracted</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{cs.extractionTime}</p>
              <p className="text-xs text-muted-foreground">Extraction Time</p>
            </div>
          </div>
        </section>

        {/* Extracted Highlights */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Extracted Highlights</h2>
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold">Field</th>
                  <th className="px-4 py-3 text-left font-semibold">Extracted Value</th>
                  <th className="hidden px-4 py-3 text-left font-semibold sm:table-cell">Why It Matters</th>
                </tr>
              </thead>
              <tbody>
                {cs.extractedHighlights.map((highlight) => (
                  <tr
                    key={highlight.field}
                    className="border-b last:border-0 transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{highlight.field}</td>
                    <td className="px-4 py-3 text-primary font-medium">{highlight.value}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{highlight.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Complexity Factors */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Complexity Factors</h2>
          <ul className="space-y-2">
            {cs.complexityFactors.map((factor) => (
              <li key={factor} className="flex items-start gap-2 text-base text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {factor}
              </li>
            ))}
          </ul>
        </section>

        {/* Related Case Studies (curated from data) */}
        {relatedStudies.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Related Case Studies</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {relatedStudies.slice(0, 4).map((other) => (
                <Link
                  key={other.slug}
                  href={`/case-studies/${other.slug}`}
                  className="group rounded-xl border bg-card p-5 sm:p-6 shadow-sm transition-all hover:shadow-md hover:bg-muted/50"
                >
                  <p className="font-medium group-hover:text-primary transition-colors">{other.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{other.location} &middot; {other.leaseStructure}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Cross-vertical links: industries, lease types, property types, use cases */}
        {(cs.relatedIndustries.length > 0 ||
          cs.relatedLeaseTypes.length > 0 ||
          cs.relatedPropertyTypes.length > 0 ||
          cs.relatedUseCases.length > 0) && (
          <section className="mb-10">
            <h2 className="mb-6 text-2xl font-bold sm:text-3xl lg:text-4xl">Related Resources</h2>
            <div className="space-y-5">
              {cs.relatedIndustries.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Industries
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {cs.relatedIndustries.map((slug) => (
                      <Link
                        key={slug}
                        href={`/industries/${slug}`}
                        className="inline-flex items-center rounded-full border bg-muted/50 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                      >
                        {slugToLabel(slug)}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {cs.relatedLeaseTypes.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Lease Types
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {cs.relatedLeaseTypes.map((slug) => (
                      <Link
                        key={slug}
                        href={`/lease-types/${slug}`}
                        className="inline-flex items-center rounded-full border bg-muted/50 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                      >
                        {slugToLabel(slug)}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {cs.relatedPropertyTypes.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Property Types
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {cs.relatedPropertyTypes.map((slug) => (
                      <Link
                        key={slug}
                        href={`/property-types/${slug}`}
                        className="inline-flex items-center rounded-full border bg-muted/50 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                      >
                        {slugToLabel(slug)}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {cs.relatedUseCases.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Use Cases
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {cs.relatedUseCases.map((slug) => (
                      <Link
                        key={slug}
                        href={`/use-cases/${slug}`}
                        className="inline-flex items-center rounded-full border bg-muted/50 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                      >
                        {slugToLabel(slug)}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {cs.faqs.map((faq) => (
              <div key={faq.question}>
                <h3 className="mb-2 text-xl font-semibold sm:text-2xl">{faq.question}</h3>
                <p className="text-base leading-relaxed text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <RelatedContent items={relatedArticles} heading="Related Articles" />

        <CrossVerticalLinks crossLinks={crossLinks} heading="Explore More" />

        <SeoFunnelLinks routeHref={`/case-studies/${cs.slug}`} />

        <ContentCta
          heading="Extract your lease in minutes"
          description="Upload any commercial lease PDF and get 126 structured fields extracted - just like the case study above. Works for any property type, lease structure, or jurisdiction. $15 per lease."
          buttonText="Upload Your Lease"
          href="/upload"
        />
      </div>
    </>
  )
}
