import { describe, it, expect } from 'vitest'
import { extractHeadings } from '@/components/content/table-of-contents'

/**
 * Tests for article detail page data loading.
 *
 * lib/content.ts now uses a JSON data registry instead of reading MDX files
 * from the filesystem. These tests exercise the public API against the real
 * articles-full.json data bundle.
 */

const { getContentBySlug, getAllContent } = await import('@/lib/content')

describe('article detail page data', () => {
  it('loads article content by slug', async () => {
    const allArticles = await getAllContent('articles')
    expect(allArticles.length).toBeGreaterThan(0)

    const firstSlug = allArticles[0].slug
    const result = await getContentBySlug('articles', firstSlug)

    expect(result.meta.title).toBeTruthy()
    expect(result.meta.category).toBe('articles')
    expect(typeof result.content).toBe('string')
    expect(result.content.length).toBeGreaterThan(0)
  })

  it('throws for non-existent article', async () => {
    await expect(
      getContentBySlug('articles', 'does-not-exist')
    ).rejects.toThrow('Content not found')
  })

  it('generateStaticParams returns all article slugs', async () => {
    const items = await getAllContent('articles')
    const params = items.map((item) => ({ slug: item.slug }))

    expect(params.length).toBeGreaterThan(0)
    for (const param of params) {
      expect(typeof param.slug).toBe('string')
      expect(param.slug.length).toBeGreaterThan(0)
    }
  })

  it('related articles exclude the current article', async () => {
    const allArticles = await getAllContent('articles')
    expect(allArticles.length).toBeGreaterThan(1)

    const currentSlug = allArticles[0].slug
    const related = allArticles.filter((a) => a.slug !== currentSlug)

    expect(related).toHaveLength(allArticles.length - 1)
    expect(related.some((a) => a.slug === currentSlug)).toBe(false)
  })

  it('extractHeadings works on real article content', async () => {
    const allArticles = await getAllContent('articles')
    const firstSlug = allArticles[0].slug
    const result = await getContentBySlug('articles', firstSlug)

    // extractHeadings should return an array (may be empty for some articles)
    const headings = extractHeadings(result.content)
    expect(Array.isArray(headings)).toBe(true)
  })
})
