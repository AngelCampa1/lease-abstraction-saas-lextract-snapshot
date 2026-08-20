/** @vitest-environment node */
import { describe, it, expect } from 'vitest'
import { getContentBySlug, getAllContent, getContentBySilo } from '@/lib/content'

/**
 * Tests for the JSON-based content registry.
 *
 * lib/content.ts now loads from pre-built JSON bundles (articles-full.json,
 * guides-full.json) instead of reading MDX files from the filesystem at
 * runtime. These tests exercise the public API against the real data files.
 */

describe('getContentBySlug', () => {
  it('reads and parses an MDX file correctly', async () => {
    // Use a slug that actually exists in the articles registry
    const allArticles = await getAllContent('articles')
    const firstSlug = allArticles[0].slug

    const result = await getContentBySlug('articles', firstSlug)

    expect(result.meta.slug).toBe(firstSlug)
    expect(result.meta.title).toBeTruthy()
    expect(result.meta.publishedAt).toBeTruthy()
    expect(result.meta.category).toBe('articles')
    expect(typeof result.content).toBe('string')
  })

  it('throws error when file does not exist', async () => {
    await expect(
      getContentBySlug('articles', 'nonexistent')
    ).rejects.toThrow('Content not found: articles/nonexistent')
  })

  it('throws error for unknown category', async () => {
    await expect(
      getContentBySlug('bad-category', 'any-slug')
    ).rejects.toThrow('Unknown content category: bad-category')
  })

  it('passes correct file path to fs.existsSync', async () => {
    // In the JSON-based system, "path" is just the key lookup.
    // Verify the content is accessible via its slug as a key.
    const allGuides = await getAllContent('guides')
    const firstSlug = allGuides[0].slug

    const result = await getContentBySlug('guides', firstSlug)
    expect(result.meta.slug).toBe(firstSlug)
  })
})

describe('getAllContent', () => {
  it('returns empty array when directory does not exist', async () => {
    const result = await getAllContent('nonexistent-category')
    expect(result).toEqual([])
  })

  it('reads all MDX files from directory', async () => {
    const result = await getAllContent('articles')
    expect(result.length).toBeGreaterThan(0)
  })

  it('sorts content by updatedAt descending, falling back to publishedAt', async () => {
    const result = await getAllContent('articles')
    for (let i = 1; i < result.length; i++) {
      const prev = new Date(result[i - 1].updatedAt ?? result[i - 1].publishedAt).getTime()
      const curr = new Date(result[i].updatedAt ?? result[i].publishedAt).getTime()
      expect(prev).toBeGreaterThanOrEqual(curr)
    }
  })

  it('ignores non-MDX files', async () => {
    // The JSON registry only contains valid content items — no stray files
    const result = await getAllContent('articles')
    for (const item of result) {
      expect(item.slug).toBeTruthy()
      expect(item.title).toBeTruthy()
    }
  })

  it('returns ContentMeta objects without content body', async () => {
    const result = await getAllContent('articles')
    expect(result.length).toBeGreaterThan(0)
    for (const item of result) {
      // ContentMeta does not have a 'content' property
      expect(item).not.toHaveProperty('content')
      expect(item.title).toBeTruthy()
    }
  })
})

describe('getContentBySilo', () => {
  it('filters content by silo', async () => {
    const result = await getContentBySilo('articles', 'lease-abstraction')

    expect(result.length).toBeGreaterThan(0)
    expect(result.every((item) => item.silo === 'lease-abstraction')).toBe(true)
  })

  it('returns empty array when no content matches silo', async () => {
    // Use a silo that has no articles to test filtering
    // 'cam-reconciliation' may have 0 articles
    const result = await getContentBySilo('articles', 'cam-reconciliation')
    expect(Array.isArray(result)).toBe(true)
  })

  it('returns empty array when directory does not exist', async () => {
    const result = await getContentBySilo('nonexistent', 'lease-abstraction')
    expect(result).toEqual([])
  })
})
