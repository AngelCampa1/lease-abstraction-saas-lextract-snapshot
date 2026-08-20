/** @vitest-environment node */
import { describe, expect, it } from 'vitest'
import nextConfig from '@/next.config'

async function getRewriteEntries(): Promise<Array<{ source: string; destination: string }>> {
  const rewrites = (await nextConfig.rewrites?.()) ?? []
  return Array.isArray(rewrites)
    ? rewrites
    : [...(rewrites.beforeFiles ?? []), ...(rewrites.afterFiles ?? []), ...(rewrites.fallback ?? [])]
}

async function getHeaderEntries(): Promise<Array<{ source: string }>> {
  return (await nextConfig.headers?.()) ?? []
}

describe('article markdown routing', () => {
  it('rewrites literal .md article URLs to the internal markdown route', async () => {
    await expect(getRewriteEntries()).resolves.toContainEqual({
      source: '/resources/articles/:slug.md',
      destination: '/resources/article-markdown/:slug',
    })
  })

  it('sets markdown content type on literal .md article URLs', async () => {
    const headers = await getHeaderEntries()
    expect(headers).toContainEqual(
      expect.objectContaining({
        source: '/resources/articles/:slug.md',
        headers: expect.arrayContaining([
          { key: 'Content-Type', value: 'text/markdown; charset=utf-8' },
        ]),
      }),
    )
  })
})
