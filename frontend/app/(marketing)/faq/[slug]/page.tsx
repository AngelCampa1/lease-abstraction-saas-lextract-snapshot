import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getFaqBySlug, getAllFaqSlugs, FAQS } from '@/data/faqs'
import { SITE_URL, DEFAULT_OG_IMAGE } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/json-ld'
import { buildBreadcrumbSchema, buildFAQPageSchema, buildSpeakableSchema } from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { LastUpdated } from '@/components/content/last-updated'
import { AuthorByline } from '@/components/content/author-byline'
import { ContentCta } from '@/components/content/content-cta'
import { FaqContentRenderer } from '@/components/content/faq-content-renderer'
import { RelatedContent } from '@/components/content/related-content'
import { CrossVerticalLinks } from '@/components/content/cross-vertical-links'
import { CrossSiteCallout } from '@/components/content/cross-site-callout'
import { SeoFunnelLinks } from '@/components/content/seo-funnel-links'
import { getRelatedContentForPseo, getAllContentItems, getSmartCrossLinks } from '@/lib/content-matching'

interface FaqPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllFaqSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: FaqPageProps): Promise<Metadata> {
  const { slug } = await params
  const faq = getFaqBySlug(slug)

  if (!faq) {
    return { title: 'FAQ Not Found' }
  }

  return {
    title: faq.metaTitle,
    description: faq.metaDescription,
    alternates: {
      canonical: `${SITE_URL}/faq/${faq.slug}`,
    },
    openGraph: {
      url: `${SITE_URL}/faq/${faq.slug}`,
      title: faq.metaTitle,
      description: faq.metaDescription,
      type: 'website',
      images: [DEFAULT_OG_IMAGE],
    },
  }
}

export default async function FaqDetailPage({ params }: FaqPageProps) {
  const { slug } = await params
  const faq = getFaqBySlug(slug)

  if (!faq) {
    notFound()
  }

  const pageUrl = `${SITE_URL}/faq/${faq.slug}`

  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'FAQ', url: `${SITE_URL}/faq` },
    { name: faq.question, url: pageUrl },
  ]

  const allContent = await getAllContentItems()
  const relatedArticles = getRelatedContentForPseo(allContent, 'faq', [faq.question])
  const crossLinks = getSmartCrossLinks('faq', faq.question.split(' ').slice(0, 6))

  const relatedFaqs = faq.relatedQuestions
    .map((rSlug) => FAQS.find((f) => f.slug === rSlug))
    .filter((f): f is NonNullable<typeof f> => f !== undefined)

  return (
    <>
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(faq.schema)} />
      <JsonLd schema={buildSpeakableSchema(pageUrl, ['#faq-short-answer', '#faq-full-answer'])} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-prose">
          <Breadcrumbs
            crumbs={[
              { label: 'Home', href: '/' },
              { label: 'FAQ', href: '/faq' },
              { label: faq.question },
            ]}
          />

          <header className="mb-10 mt-6">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {faq.question}
            </h1>
            <p id="faq-short-answer" className="mt-4 text-base text-muted-foreground sm:text-lg lg:text-xl">
              {faq.shortAnswer}
            </p>
            <LastUpdated date="2026-03-17" />
            <AuthorByline />
          </header>

          <article id="faq-full-answer" className="prose prose-neutral dark:prose-invert max-w-none">
            <FaqContentRenderer content={faq.fullAnswer} />
          </article>

          {relatedFaqs.length > 0 && (
            <section className="mb-10 mt-12">
              <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Related Questions</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {relatedFaqs.map((rf) => (
                  <Link
                    key={rf.slug}
                    href={`/faq/${rf.slug}`}
                    className="group rounded-xl border bg-card p-5 shadow-sm transition-all hover:border-primary/30 hover:bg-muted/50 hover:shadow-md sm:p-6"
                  >
                    <p className="text-sm font-medium transition-colors group-hover:text-primary">{rf.question}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {rf.shortAnswer.length > 100 ? `${rf.shortAnswer.slice(0, 100)}...` : rf.shortAnswer}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {faq.relatedLinks.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">Related Resources</h2>
              <div className="space-y-2">
                {faq.relatedLinks.map((link) => (
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

          <SeoFunnelLinks routeHref={`/faq/${faq.slug}`} />

          <CrossSiteCallout tags={faq.question.split(' ').slice(0, 6)} />

          <ContentCta
            heading="Ready to abstract your lease?"
            description="Upload any commercial lease PDF and get 126 structured fields extracted in minutes. Per-field confidence scores included. Just $15 per lease."
            buttonText="Upload Your Lease"
            href="/upload"
          />
        </div>
      </div>
    </>
  )
}
