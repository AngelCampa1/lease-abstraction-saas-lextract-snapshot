/** @vitest-environment node */
import { describe, expect, it } from 'vitest'

import nextConfig from '../../next.config'

describe('next config SEO redirects', () => {
  it('permanently redirects comparison alias URLs instead of rewriting them', async () => {
    const redirects = (await nextConfig.redirects?.()) ?? []
    const rewrites = (await nextConfig.rewrites?.()) ?? []
    const rewriteEntries = Array.isArray(rewrites)
      ? rewrites
      : [...(rewrites.beforeFiles ?? []), ...(rewrites.afterFiles ?? []), ...(rewrites.fallback ?? [])]

    expect(redirects).toContainEqual({
      source: '/resources/comparisons/lextract-vs-:slug',
      destination: '/resources/comparisons/:slug',
      permanent: true,
    })
    expect(rewriteEntries).not.toContainEqual(
      expect.objectContaining({
        source: '/resources/comparisons/lextract-vs-:slug',
      })
    )
  })

  it('serves all machine-readable files from .well-known aliases', async () => {
    const rewrites = (await nextConfig.rewrites?.()) ?? []
    const rewriteEntries = Array.isArray(rewrites)
      ? rewrites
      : [...(rewrites.beforeFiles ?? []), ...(rewrites.afterFiles ?? []), ...(rewrites.fallback ?? [])]

    expect(rewriteEntries).toEqual(
      expect.arrayContaining([
        { source: '/.well-known/llms.txt', destination: '/llms.txt' },
        { source: '/.well-known/llms-full.txt', destination: '/llms-full.txt' },
        { source: '/.well-known/pricing.md', destination: '/pricing.md' },
      ])
    )
  })

  it('sets explicit utf-8 content type headers for machine-readable files and aliases', async () => {
    const headers = (await nextConfig.headers?.()) ?? []

    expect(headers).toEqual(
      expect.arrayContaining([
        {
          source: '/llms.txt',
          headers: [{ key: 'Content-Type', value: 'text/plain; charset=utf-8' }],
        },
        {
          source: '/llms-full.txt',
          headers: [{ key: 'Content-Type', value: 'text/plain; charset=utf-8' }],
        },
        {
          source: '/pricing.md',
          headers: [{ key: 'Content-Type', value: 'text/markdown; charset=utf-8' }],
        },
        {
          source: '/.well-known/llms.txt',
          headers: [{ key: 'Content-Type', value: 'text/plain; charset=utf-8' }],
        },
        {
          source: '/.well-known/llms-full.txt',
          headers: [{ key: 'Content-Type', value: 'text/plain; charset=utf-8' }],
        },
        {
          source: '/.well-known/pricing.md',
          headers: [{ key: 'Content-Type', value: 'text/markdown; charset=utf-8' }],
        },
      ])
    )
  })
})
