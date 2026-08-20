import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { getContentBySlug, getAllContent, getContentRedirectBySlug } from '@/lib/content'
import { getAllContentItems, getJourneyLinks, getPseoLinksForContent } from '@/lib/content-matching'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { ContentCta } from '@/components/content/content-cta'
import { ArticleHeader } from '@/components/content/article-header'
import { FunnelJourney } from '@/components/content/funnel-journey'
import { CrossSiteCallout } from '@/components/content/cross-site-callout'
import { SeoFunnelLinks } from '@/components/content/seo-funnel-links'
import { SourcesChecked } from '@/components/content/sources-checked'
import { JsonLd } from '@/components/seo/json-ld'
import { ExpertQuotes } from '@/components/content/expert-quote'
import { buildArticleSchema, buildBreadcrumbSchema, buildFAQPageSchema, buildSpeakableSchema } from '@/lib/schema'
import { SITE_URL, DEFAULT_OG_IMAGE } from '@/lib/site-config'

interface ArticlePageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const items = await getAllContent('articles')
  return items.map((item) => ({ slug: item.slug }))
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params
  const redirectTarget = getContentRedirectBySlug('articles', slug)
  if (redirectTarget) permanentRedirect(redirectTarget)
  try {
    const { meta } = await getContentBySlug('articles', slug)
    const imageUrl =
      typeof DEFAULT_OG_IMAGE.url === 'string' && DEFAULT_OG_IMAGE.url.startsWith('http')
        ? DEFAULT_OG_IMAGE.url
        : `${SITE_URL}${DEFAULT_OG_IMAGE.url}`
    return {
      title: meta.title,
      description: meta.description,
      alternates: { canonical: `${SITE_URL}/resources/articles/${meta.slug}` },
      openGraph: {
        url: `${SITE_URL}/resources/articles/${meta.slug}`,
        title: meta.title,
        description: meta.description,
        type: 'article',
        publishedTime: meta.publishedAt,
        modifiedTime: meta.updatedAt ?? meta.publishedAt,
        images: [DEFAULT_OG_IMAGE],
      },
      twitter: {
        card: 'summary_large_image',
        title: meta.title,
        description: meta.description,
        images: [imageUrl],
      },
      robots: {
        index: true,
        follow: true,
      },
    }
  } catch {
    return { title: 'Article Not Found' }
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params
  const redirectTarget = getContentRedirectBySlug('articles', slug)
  if (redirectTarget) permanentRedirect(redirectTarget)
  let content: Awaited<ReturnType<typeof getContentBySlug>>
  try {
    content = await getContentBySlug('articles', slug)
  } catch {
    notFound()
  }

  const { meta, content: mdxContent } = content

  const allContent = await getAllContentItems()
  const { related, goDeeper } = getJourneyLinks(allContent, meta)
  const pseoLinks = getPseoLinksForContent(meta.tags, meta.funnelStage)

  const articleUrl = `${SITE_URL}/resources/articles/${meta.slug}`

  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Resources', url: `${SITE_URL}/resources` },
    { name: 'Articles', url: `${SITE_URL}/resources/articles` },
    { name: meta.title, url: articleUrl },
  ]

  return (
    <>
      <JsonLd
        schema={buildArticleSchema({
          headline: meta.title,
          description: meta.description,
          url: articleUrl,
          datePublished: meta.publishedAt,
          dateModified: meta.updatedAt ?? meta.publishedAt,
          author: meta.author,
          image:
            typeof DEFAULT_OG_IMAGE.url === 'string' && DEFAULT_OG_IMAGE.url.startsWith('http')
              ? DEFAULT_OG_IMAGE.url
              : `${SITE_URL}${DEFAULT_OG_IMAGE.url}`,
        })}
      />
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildSpeakableSchema(articleUrl, ['h1', '.article-summary', 'h2:first-of-type'])} />
      {meta.faq !== undefined && meta.faq.length > 0 && (
        <JsonLd schema={buildFAQPageSchema(meta.faq)} />
      )}

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Resources', href: '/resources' },
            { label: 'Articles', href: '/resources/articles' },
            { label: meta.title },
          ]}
        />

        <div className="mx-auto mt-6 max-w-prose">
          <ArticleHeader
            title={meta.title}
            author={meta.author}
            publishedAt={meta.publishedAt}
            updatedAt={meta.updatedAt}
            readingTime={meta.readingTime}
            category={meta.category}
            tags={meta.tags}
          />

          {meta.quotes !== undefined && meta.quotes.length > 0 && (
            <ExpertQuotes quotes={meta.quotes} />
          )}

          <p className="article-summary mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {meta.description}
          </p>

          <article
            className="prose prose-neutral dark:prose-invert max-w-none [&_table]:block [&_table]:overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: mdxContent }}
          />

          <SourcesChecked sources={meta.sources} />

          <ContentCta />

          <CrossSiteCallout tags={meta.tags ?? []} category={meta.category} silo={meta.silo} />

          <FunnelJourney
            pseoLinks={pseoLinks}
            goDeeper={goDeeper}
            related={related}
          />

          <SeoFunnelLinks routeHref={`/resources/articles/${meta.slug}`} />
        </div>
      </div>
    </>
  )
}
