import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getContentBySlug, getAllContent } from '@/lib/content'
import { getAllContentItems, getJourneyLinks, getPseoLinksForContent } from '@/lib/content-matching'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { ContentCta } from '@/components/content/content-cta'
import { ArticleHeader } from '@/components/content/article-header'
import { FunnelJourney } from '@/components/content/funnel-journey'
import { CrossSiteCallout } from '@/components/content/cross-site-callout'
import { SeoFunnelLinks } from '@/components/content/seo-funnel-links'
import { SourcesChecked } from '@/components/content/sources-checked'
import { TableOfContents, extractHeadings } from '@/components/content/table-of-contents'
import { FaqSection } from '@/components/marketing/faq-section'
import { JsonLd } from '@/components/seo/json-ld'
import { buildArticleSchema, buildBreadcrumbSchema, buildFAQPageSchema } from '@/lib/schema'
import { SITE_URL, DEFAULT_OG_IMAGE } from '@/lib/site-config'

interface GuidePageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const items = await getAllContent('guides')
  return items.map((item) => ({ slug: item.slug }))
}

export async function generateMetadata({
  params,
}: GuidePageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const { meta } = await getContentBySlug('guides', slug)
    const imageUrl =
      typeof DEFAULT_OG_IMAGE.url === 'string' && DEFAULT_OG_IMAGE.url.startsWith('http')
        ? DEFAULT_OG_IMAGE.url
        : `${SITE_URL}${DEFAULT_OG_IMAGE.url}`
    return {
      title: meta.title,
      description: meta.description,
      alternates: { canonical: `${SITE_URL}/resources/guides/${meta.slug}` },
      openGraph: {
        url: `${SITE_URL}/resources/guides/${meta.slug}`,
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
    return { title: 'Guide Not Found' }
  }
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params
  let content: Awaited<ReturnType<typeof getContentBySlug>>
  try {
    content = await getContentBySlug('guides', slug)
  } catch {
    notFound()
  }

  const { meta, content: mdxContent } = content

  const headings = extractHeadings(mdxContent)

  const allContent = await getAllContentItems()
  const { related, goDeeper } = getJourneyLinks(allContent, meta)
  const pseoLinks = getPseoLinksForContent(meta.tags, meta.funnelStage)

  const guideUrl = `${SITE_URL}/resources/guides/${meta.slug}`

  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Resources', url: `${SITE_URL}/resources` },
    { name: 'Guides', url: `${SITE_URL}/resources/guides` },
    { name: meta.title, url: guideUrl },
  ]

  return (
    <>
      <JsonLd
        schema={buildArticleSchema({
          headline: meta.title,
          description: meta.description,
          url: guideUrl,
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
      {meta.faq && meta.faq.length > 0 && (
        <JsonLd schema={buildFAQPageSchema(meta.faq)} />
      )}

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Resources', href: '/resources' },
            { label: 'Guides', href: '/resources/guides' },
            { label: meta.title },
          ]}
        />

        <div className="mx-auto mt-6 max-w-5xl lg:grid lg:grid-cols-[1fr_240px] lg:gap-12">
          <div>
            <ArticleHeader
              title={meta.title}
              author={meta.author}
              publishedAt={meta.publishedAt}
              updatedAt={meta.updatedAt}
              readingTime={meta.readingTime}
              category={meta.category}
              tags={meta.tags}
            />

            <article
              className="prose prose-neutral dark:prose-invert max-w-none [&_table]:block [&_table]:overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: mdxContent }}
            />

            <SourcesChecked sources={meta.sources} />

            <ContentCta />

            {meta.faq && meta.faq.length > 0 && (
              <FaqSection items={meta.faq} />
            )}

            <CrossSiteCallout tags={meta.tags ?? []} category={meta.category} silo={meta.silo} />

            <FunnelJourney
              pseoLinks={pseoLinks}
              goDeeper={goDeeper}
              related={related}
            />

            <SeoFunnelLinks routeHref={`/resources/guides/${meta.slug}`} />
          </div>

          <aside className="hidden lg:block">
            <TableOfContents headings={headings} />
          </aside>
        </div>
      </div>
    </>
  )
}
