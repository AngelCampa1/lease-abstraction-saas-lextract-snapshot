import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { JsonLd } from '@/components/seo/json-ld'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import {
  getAllFeatureSlugs,
  getFeatureBySlug,
  getRelatedFeatures,
} from '@/data/features'
import { DEFAULT_OG_IMAGE, SITE_URL } from '@/lib/site-config'
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildFAQPageSchema,
  buildItemListSchema,
  buildSpeakableSchema,
} from '@/lib/schema'

function uniqueLinks<T extends { href: string }>(links: T[]): T[] {
  const seen = new Set<string>()
  const result: T[] = []
  for (const link of links) {
    if (seen.has(link.href)) continue
    seen.add(link.href)
    result.push(link)
  }
  return result
}

interface FeaturePageProps {
  params: Promise<{ slug: string }>
}

const publishedDate = '2026-05-31'
const modifiedDate = '2026-05-31'

export function generateStaticParams() {
  return getAllFeatureSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: FeaturePageProps): Promise<Metadata> {
  const { slug } = await params
  const feature = getFeatureBySlug(slug)

  if (!feature) {
    return { title: 'Feature Not Found' }
  }

  const pageUrl = `${SITE_URL}/features/${feature.slug}`
  const imageUrl =
    typeof DEFAULT_OG_IMAGE.url === 'string' && DEFAULT_OG_IMAGE.url.startsWith('http')
      ? DEFAULT_OG_IMAGE.url
      : `${SITE_URL}${DEFAULT_OG_IMAGE.url}`

  return {
    title: feature.metaTitle,
    description: feature.metaDescription,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      url: pageUrl,
      title: feature.metaTitle,
      description: feature.metaDescription,
      type: 'article',
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: feature.metaTitle,
      description: feature.metaDescription,
      images: [imageUrl],
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default async function FeaturePage({ params }: FeaturePageProps) {
  const { slug } = await params
  const feature = getFeatureBySlug(slug)

  if (!feature) {
    notFound()
  }

  const pageUrl = `${SITE_URL}/features/${feature.slug}`
  const relatedFeatures = getRelatedFeatures(feature)
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Features', url: `${SITE_URL}/features` },
    { name: feature.name, url: pageUrl },
  ]

  const internalLinks = uniqueLinks(feature.internalLinks)
  const relatedItems = [
    ...relatedFeatures.map((related) => ({
      name: related.name,
      url: `${SITE_URL}/features/${related.slug}`,
      description: related.summary,
    })),
    ...internalLinks.map((link) => ({
      name: link.label,
      url: `${SITE_URL}${link.href}`,
      description: `Related Lextract page for ${feature.name}.`,
    })),
  ]

  return (
    <>
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(feature.faqs)} />
      <JsonLd
        schema={buildArticleSchema({
          headline: feature.metaTitle,
          description: feature.metaDescription,
          url: pageUrl,
          datePublished: publishedDate,
          dateModified: modifiedDate,
          author: 'Angel Campa, Founder',
          image:
            typeof DEFAULT_OG_IMAGE.url === 'string' && DEFAULT_OG_IMAGE.url.startsWith('http')
              ? DEFAULT_OG_IMAGE.url
              : `${SITE_URL}${DEFAULT_OG_IMAGE.url}`,
        })}
      />
      <JsonLd
        schema={buildItemListSchema({
          name: `${feature.name} related pages`,
          description: `Internal links for the ${feature.name} feature.`,
          items: relatedItems,
        })}
      />
      <JsonLd schema={buildSpeakableSchema(pageUrl, ['h1', '#problem', '#solution'])} />

      <main className="marketing-content">
        <section className="relative overflow-hidden border-b bg-gradient-to-b from-secondary/70 to-background section-y">
          <div className="marketing-container">
            <Breadcrumbs
              crumbs={[
                { label: 'Home', href: '/' },
                { label: 'Features', href: '/features' },
                { label: feature.name },
              ]}
            />

            <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.55fr)] lg:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
                  {feature.eyebrow}
                </p>
                <h1 className="mt-4 max-w-4xl font-display text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl lg:text-5xl">
                  {feature.name} for commercial lease abstraction
                </h1>
                <p className="mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  {feature.summary}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button size="lg" asChild className="w-full sm:w-auto">
                    <Link href="/upload">Upload a lease</Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
                    <Link href="/sample-report">View sample report</Link>
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border bg-card p-5 shadow-sm">
                <p className="text-sm font-semibold text-brand-dark">
                  Fast answer
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {feature.fastAnswer}
                </p>
                <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                  {feature.bestFor.slice(0, 3).map((item) => (
                    <li key={item} className="flex gap-2">
                      <CheckCircle2
                        className="mt-0.5 size-4 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="section-y">
          <div className="marketing-container">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1fr]">
              <div>
                <h2
                  id="problem"
                  className="font-display text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl"
                >
                  The problem
                </h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  {feature.problem}
                </p>
              </div>
              <div>
                <h2
                  id="solution"
                  className="font-display text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl"
                >
                  How Lextract solves it
                </h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  {feature.solution}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y bg-muted/30 section-y">
          <div className="marketing-container">
            <div className="grid gap-8 lg:grid-cols-[0.7fr_1fr]">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl">
                  What changes after the feature is in the workflow
                </h2>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  The point is not more software for its own sake. The point is less
                  manual rework between PDF review, lease data cleanup, and downstream
                  reporting.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {feature.whatChanges.map((change) => (
                  <div key={change} className="rounded-lg border bg-card p-4 shadow-sm">
                    <CheckCircle2 className="size-5 text-primary" aria-hidden="true" />
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {change}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section-y">
          <div className="marketing-container">
            <div className="grid gap-8 lg:grid-cols-[0.75fr_1fr]">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl">
                  Proof points to check
                </h2>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  Use these points when you compare Lextract against manual abstraction,
                  outsourced abstraction, or generic AI document tools.
                </p>
              </div>
              <div className="overflow-hidden rounded-lg border">
                <div className="divide-y">
                  {feature.proof.map((proof, index) => (
                    <div key={proof} className="grid gap-3 p-4 sm:grid-cols-[120px_1fr]">
                      <p className="text-sm font-semibold text-primary">
                        Check {index + 1}
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {proof}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30 section-y">
          <div className="marketing-container">
            <div className="grid gap-8 lg:grid-cols-[0.7fr_1fr] lg:items-start">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl">
                  Related feature links
                </h2>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  Follow the surrounding feature pages and supporting resources to evaluate
                  the whole lease abstraction workflow.
                </p>
              </div>
              <nav aria-label="Related feature links" className="grid gap-3 sm:grid-cols-2">
                <Link
                  href="/features"
                  className="group rounded-full border bg-background px-4 py-3 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <span className="inline-flex min-h-[20px] items-center gap-2">
                    View all features
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </Link>
                {relatedFeatures.map((related) => (
                  <Link
                    key={related.slug}
                    href={`/features/${related.slug}`}
                    className="group rounded-full border bg-background px-4 py-3 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    <span className="inline-flex min-h-[20px] items-center gap-2">
                      {related.name}
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </Link>
                ))}
                {internalLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group rounded-full border bg-background px-4 py-3 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    <span className="inline-flex min-h-[20px] items-center gap-2">
                      {link.label}
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </section>

        <section className="section-y">
          <div className="marketing-container">
            <div className="max-w-3xl">
              <h2 className="font-display text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl">
                Questions teams ask about {feature.shortName}
              </h2>
              <div className="mt-8 divide-y rounded-lg border">
                {feature.faqs.map((faq) => (
                  <div key={faq.question} className="p-5">
                    <h3 className="text-base font-semibold text-brand-dark">
                      {faq.question}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
