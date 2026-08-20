import { contentFrontmatterSchema } from './content-schema'
import type { ContentItem, ContentMeta, SiloId } from './content-types'
import { getContentRedirectTarget, isIndexableContentSlug } from './seo-inventory'
import articlesFull from '@/content/articles-full.json'
import guidesFull from '@/content/guides-full.json'

const FULL_CONTENT: Record<string, Record<string, { meta: unknown; content: string }>> = {
  articles: articlesFull as Record<string, { meta: unknown; content: string }>,
  guides: guidesFull as Record<string, { meta: unknown; content: string }>,
}

export async function getContentBySlug(
  dir: string,
  slug: string
): Promise<ContentItem> {
  if (!isIndexableContentSlug(dir as 'articles' | 'guides', slug)) {
    throw new Error(`Content redirected: ${dir}/${slug}`)
  }
  const categoryData = FULL_CONTENT[dir]
  if (!categoryData) {
    throw new Error(`Unknown content category: ${dir}`)
  }
  const entry = categoryData[slug]
  if (!entry) {
    throw new Error(`Content not found: ${dir}/${slug}`)
  }
  const meta = contentFrontmatterSchema.parse(entry.meta)
  return { meta, content: entry.content }
}

export async function getAllContent(dir: string): Promise<ContentMeta[]> {
  const categoryData = FULL_CONTENT[dir]
  if (!categoryData) return []

  const items = Object.entries(categoryData)
    .filter(([slug]) => isIndexableContentSlug(dir as 'articles' | 'guides', slug))
    .map(([, entry]) => contentFrontmatterSchema.parse(entry.meta))

  items.sort((a, b) =>
    new Date(b.updatedAt ?? b.publishedAt).getTime() -
    new Date(a.updatedAt ?? a.publishedAt).getTime()
  )

  return items
}

export async function getContentBySilo(
  dir: string,
  silo: SiloId
): Promise<ContentMeta[]> {
  const allContent = await getAllContent(dir)
  return allContent.filter((item) => item.silo === silo)
}

export function getContentRedirectBySlug(dir: string, slug: string): string | null {
  return getContentRedirectTarget(dir as 'articles' | 'guides', slug)
}
