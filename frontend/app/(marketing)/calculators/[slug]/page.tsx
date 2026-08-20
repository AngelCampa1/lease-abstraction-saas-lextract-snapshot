import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCalculatorBySlug, getAllCalculatorSlugs } from '@/data/calculators'
import { SITE_URL } from '@/lib/site-config'
import { buildIndexableMarketingMetadata } from '@/lib/seo-metadata'
import { JsonLd } from '@/components/seo/json-ld'
import { buildBreadcrumbSchema, buildFAQPageSchema } from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { LastUpdated } from '@/components/content/last-updated'
import { AuthorByline } from '@/components/content/author-byline'
import { ContentCta } from '@/components/content/content-cta'
import { RelatedContent } from '@/components/content/related-content'
import { CrossVerticalLinks } from '@/components/content/cross-vertical-links'
import { CrossSiteCallout } from '@/components/content/cross-site-callout'
import { SeoFunnelLinks } from '@/components/content/seo-funnel-links'
import { getAllContentItems, getRelatedContentForPseo, getSmartCrossLinks } from '@/lib/content-matching'
import { InteractiveCalculator } from '@/components/calculators/interactive-calculator'

interface CalculatorPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllCalculatorSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: CalculatorPageProps): Promise<Metadata> {
  const { slug } = await params
  const calc = getCalculatorBySlug(slug)

  if (!calc) {
    return { title: 'Calculator Not Found' }
  }

  return buildIndexableMarketingMetadata({
    title: calc.metaTitle,
    description: calc.metaDescription,
    path: `/calculators/${calc.slug}`,
    type: 'website',
  })
}

export default async function CalculatorDetailPage({ params }: CalculatorPageProps) {
  const { slug } = await params
  const calc = getCalculatorBySlug(slug)

  if (!calc) {
    notFound()
  }

  const allContent = await getAllContentItems()
  const relatedArticles = getRelatedContentForPseo(allContent, 'calculators', [calc.title, calc.slug])
  const crossLinks = getSmartCrossLinks('calculators', [calc.title, calc.slug])

  const pageUrl = `${SITE_URL}/calculators/${calc.slug}`

  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Calculators', url: `${SITE_URL}/calculators` },
    { name: calc.title, url: pageUrl },
  ]

  const faqSchema = calc.faqs.map((f) => ({ question: f.question, answer: f.answer }))

  return (
    <>
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(faqSchema)} />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Calculators', href: '/calculators' },
            { label: calc.title },
          ]}
        />

        <header className="mb-10 mt-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {calc.headline}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{calc.description}</p>
          <LastUpdated date="2026-03-17" />
          <AuthorByline />
        </header>

        {/* Formula */}
        <section className="mb-10">
          <h2 className="mb-3 text-2xl font-bold">The Formula</h2>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="font-mono text-sm leading-relaxed">{calc.formula}</p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{calc.formulaNote}</p>
        </section>

        {/* Worked Example: Inputs */}
        <section className="mb-10">
          <h2 className="mb-3 text-2xl font-bold">Worked Example</h2>

          <div className="mb-6">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Example Inputs
            </h3>
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(calc.example.inputs).map(([label, value]) => (
                    <tr key={label} className="border-b last:border-0">
                      <td className="py-3 px-4 font-medium w-1/2">{label}</td>
                      <td className="py-3 px-4 text-muted-foreground">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Result highlight */}
          <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground mb-1">Result</p>
            <p className="text-lg font-bold">{calc.example.result}</p>
          </div>

          {/* Breakdown */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Step-by-Step Breakdown
            </h3>

            {/* Mobile card list (hidden on sm+) */}
            <div className="space-y-2 sm:hidden">
              {calc.example.breakdown.map((row) => (
                <div key={row.label} className="rounded-xl border bg-card px-4 py-3 shadow-sm">
                  <p className="text-sm font-medium">{row.label}</p>
                  <p className="mt-0.5 text-sm">{row.value}</p>
                  {row.note && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{row.note}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop table (hidden below sm) */}
            <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="py-3 px-4 text-left font-semibold">Line Item</th>
                    <th className="py-3 px-4 text-left font-semibold">Value</th>
                    <th className="py-3 px-4 text-left font-semibold text-muted-foreground">
                      Note
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {calc.example.breakdown.map((row) => (
                    <tr key={row.label} className="border-b last:border-0">
                      <td className="py-3 px-4 font-medium">{row.label}</td>
                      <td className="py-3 px-4">{row.value}</td>
                      {row.note && (
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {row.note}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Interactive Calculator - key resets component state when navigating between calculators */}
        <div className="mb-10">
          <InteractiveCalculator key={calc.slug} slug={calc.slug} />
        </div>

        {/* FAQ */}
        {calc.faqs.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {calc.faqs.map((faq) => (
                <div key={faq.question}>
                  <h3 className="mb-2 text-lg font-semibold">{faq.question}</h3>
                  <p className="text-base leading-relaxed text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related Resources */}
        {calc.relatedLinks.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold">Related Resources</h2>
            <div className="space-y-2">
              {calc.relatedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex min-h-[44px] items-center gap-2 py-2 text-sm text-primary underline-offset-4 hover:underline"
                >
                  <span aria-hidden="true">&rarr;</span>
                  {link.label}
                </Link>
              ))}
            </div>
          </section>
        )}

        <RelatedContent items={relatedArticles} heading="Related Articles" />

        <CrossVerticalLinks crossLinks={crossLinks} />

        <SeoFunnelLinks routeHref={`/calculators/${calc.slug}`} />

        <CrossSiteCallout tags={[calc.title, calc.slug]} />

        <ContentCta
          heading="Extract lease data automatically - no manual math"
          description="Lextract pulls rent amounts, escalation schedules, CAM caps, pro-rata share, and 120+ more fields from any commercial lease PDF in minutes. Just $15 per lease."
          buttonText="Upload Your Lease"
          href="/upload"
        />
      </div>
    </>
  )
}
