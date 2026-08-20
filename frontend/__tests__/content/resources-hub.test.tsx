import { describe, it, expect } from 'vitest'

/**
 * Tests for resources hub data loading.
 *
 * lib/content.ts now uses a JSON data registry instead of reading MDX files
 * from the filesystem. These tests exercise the public API against the real
 * JSON data bundles.
 */

const { getAllContent } = await import('@/lib/content')

describe('resources hub data loading', () => {
  it('loads articles and guides for the hub page', async () => {
    const articles = await getAllContent('articles')
    expect(articles.length).toBeGreaterThan(0)
    for (const article of articles) {
      expect(article.category).toBe('articles')
    }

    const guides = await getAllContent('guides')
    expect(guides.length).toBeGreaterThan(0)
    for (const guide of guides) {
      expect(guide.category).toBe('guides')
    }
  })

  it('returns empty arrays when no content exists', async () => {
    // Unknown categories return empty arrays
    const articles = await getAllContent('nonexistent-articles')
    const guides = await getAllContent('nonexistent-guides')

    expect(articles).toEqual([])
    expect(guides).toEqual([])
  })
})
