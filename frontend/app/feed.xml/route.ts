import { getAllContent } from '@/lib/content'
import { SITE_URL, SITE_NAME } from '@/lib/site-config'
import type { ContentMeta } from '@/lib/content-types'

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildRssItem(item: ContentMeta, dir: string): string {
  const url = escapeXml(`${SITE_URL}/resources/${dir}/${item.slug}`)
  const pubDate = new Date(item.updatedAt ?? item.publishedAt).toUTCString()
  // RSS 2.0 <author> must be an email address (RFC 822). Strip the optional
  // ", Title" suffix from "Name, Title" frontmatter format.
  const authorName = item.author.split(',')[0].trim()
  const authorEmail = `angel.campa@lextract.io (${authorName})`
  return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(item.description)}</description>
      <pubDate>${pubDate}</pubDate>
      <author>${authorEmail}</author>
    </item>`
}

export async function GET(): Promise<Response> {
  const [articles, guides] = await Promise.all([
    getAllContent('articles'),
    getAllContent('guides'),
  ])

  const allItems: Array<ContentMeta & { dir: string }> = [
    ...articles.map((a) => ({ ...a, dir: 'articles' })),
    ...guides.map((g) => ({ ...g, dir: 'guides' })),
  ].sort((a, b) => {
    const bDate = new Date(b.updatedAt ?? b.publishedAt).getTime()
    const aDate = new Date(a.updatedAt ?? a.publishedAt).getTime()
    return bDate - aDate
  })

  const siteUrl = escapeXml(SITE_URL)
  const lastBuildDate = allItems[0]
    ? new Date(allItems[0].updatedAt ?? allItems[0].publishedAt).toUTCString()
    : new Date(0).toUTCString()
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${siteUrl}</link>
    <description>${escapeXml('AI-powered commercial lease abstraction. Articles and guides on lease abstraction, CAM reconciliation, ASC 842 compliance, and commercial real estate.')}</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
${allItems.map((item) => buildRssItem(item, item.dir)).join('\n')}
  </channel>
</rss>`

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 's-maxage=86400, stale-while-revalidate=3600',
    },
  })
}
