import { describe, it, expect } from 'vitest'
import { extractHeadings } from '@/components/content/table-of-contents'

/**
 * Tests for guide detail page data loading.
 *
 * lib/content.ts now uses a JSON data registry instead of reading MDX files
 * from the filesystem. These tests exercise the public API against the real
 * guides-full.json data bundle.
 */

const { getContentBySlug, getAllContent } = await import('@/lib/content')

describe('guide detail page data', () => {
  it('loads guide content by slug', async () => {
    const allGuides = await getAllContent('guides')
    expect(allGuides.length).toBeGreaterThan(0)

    const firstSlug = allGuides[0].slug
    const result = await getContentBySlug('guides', firstSlug)

    expect(result.meta.title).toBeTruthy()
    expect(result.meta.category).toBe('guides')
    expect(typeof result.content).toBe('string')
    expect(result.content.length).toBeGreaterThan(0)
  })

  it('extracts table of contents headings from guide content', async () => {
    const allGuides = await getAllContent('guides')
    const firstSlug = allGuides[0].slug
    const result = await getContentBySlug('guides', firstSlug)

    const headings = extractHeadings(result.content)
    // Real guide content should have at least one h2
    expect(Array.isArray(headings)).toBe(true)
    expect(headings.length).toBeGreaterThan(0)
  })

  it('generateStaticParams returns all guide slugs', async () => {
    const items = await getAllContent('guides')
    const params = items.map((item) => ({ slug: item.slug }))

    expect(params.length).toBeGreaterThan(0)
    for (const param of params) {
      expect(typeof param.slug).toBe('string')
      expect(param.slug.length).toBeGreaterThan(0)
    }
  })

  it('related guides exclude the current guide', async () => {
    const allGuides = await getAllContent('guides')
    expect(allGuides.length).toBeGreaterThan(1)

    const currentSlug = allGuides[0].slug
    const related = allGuides.filter((g) => g.slug !== currentSlug)

    expect(related).toHaveLength(allGuides.length - 1)
    expect(related.some((g) => g.slug === currentSlug)).toBe(false)
  })

  it('throws for non-existent guide', async () => {
    await expect(
      getContentBySlug('guides', 'does-not-exist')
    ).rejects.toThrow('Content not found')
  })
})
