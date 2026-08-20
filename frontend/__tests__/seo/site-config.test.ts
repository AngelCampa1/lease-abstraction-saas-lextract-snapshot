/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('site-config', () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    if (originalSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl
    }
  })

  it('normalizes away a www host and trailing slash for canonical outputs', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.lextract.io/'

    const { SITE_URL, SITE_DISPLAY_DOMAIN } = await import('@/lib/site-config')

    expect(SITE_URL).toBe('https://lextract.io')
    expect(SITE_DISPLAY_DOMAIN).toBe('lextract.io')
  })
})
