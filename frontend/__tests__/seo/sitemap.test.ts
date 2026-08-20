/** @vitest-environment node */
import { describe, it, expect } from 'vitest'
import sitemap from '@/app/sitemap'

describe('sitemap', () => {
  it('returns a non-empty array of sitemap entries', async () => {
    const entries = await sitemap()
    expect(entries.length).toBeGreaterThan(0)
  })

  it('includes the homepage with priority 1.0', async () => {
    const entries = await sitemap()
    const home = entries.find((e) => e.url === 'https://lextract.io')
    expect(home).toBeDefined()
    expect(home?.priority).toBe(1.0)
    expect(home?.changeFrequency).toBe('weekly')
  })

  it('includes /upload with priority 0.9', async () => {
    const entries = await sitemap()
    const upload = entries.find((e) => e.url === 'https://lextract.io/upload')
    expect(upload).toBeDefined()
    expect(upload?.priority).toBe(0.9)
    expect(upload?.changeFrequency).toBe('monthly')
  })

  it('does not include private or noindex utility routes', async () => {
    const entries = await sitemap()
    const urls = entries.map((entry) => entry.url)

    expect(urls).not.toContain('https://lextract.io/login')
    expect(urls).not.toContain('https://lextract.io/signup')
    expect(urls).not.toContain('https://lextract.io/dashboard')
    expect(urls).not.toContain('https://lextract.io/profile')
    expect(urls).not.toContain('https://lextract.io/processing')
    expect(urls).not.toContain('https://lextract.io/results')
    expect(urls).not.toContain('https://lextract.io/unsubscribe')
    expect(urls.every((url) => !url.includes('/api/'))).toBe(true)
    expect(urls.every((url) => !url.includes('/auth/'))).toBe(true)
    expect(urls.every((url) => !url.includes('/dashboard/'))).toBe(true)
    expect(urls.every((url) => !url.includes('/profile/'))).toBe(true)
    expect(urls.every((url) => !url.includes('/processing/'))).toBe(true)
    expect(urls.every((url) => !url.includes('/results/'))).toBe(true)
  })

  it('includes representative indexable routes exactly once', async () => {
    const entries = await sitemap()
    const urls = entries.map((entry) => entry.url)
    const expectOnce = (url: string) => {
      expect(urls.filter((candidate) => candidate === url)).toHaveLength(1)
    }

    expectOnce('https://lextract.io')
    expectOnce('https://lextract.io/upload')
    expectOnce('https://lextract.io/pricing')
    expectOnce('https://lextract.io/fields/holdover-rate')
    expectOnce('https://lextract.io/glossary/cam-charges')
    expectOnce('https://lextract.io/locations/new-york-commercial-lease-abstraction')
    expectOnce('https://lextract.io/llms.txt')
    expectOnce('https://lextract.io/llms-full.txt')
    expectOnce('https://lextract.io/pricing.md')
  })

  it('only includes retained seo inventory pages', async () => {
    const entries = await sitemap()
    const urls = entries.map((entry) => entry.url)

    expect(urls).toContain('https://lextract.io/fields/holdover-rate')
    expect(urls).not.toContain('https://lextract.io/fields/landlord-legal-name')
    expect(urls).toContain('https://lextract.io/glossary/cam-charges')
    expect(urls).not.toContain('https://lextract.io/glossary/lease-abstraction')
    expect(urls).toContain('https://lextract.io/locations/new-york-commercial-lease-abstraction')
    expect(urls).not.toContain('https://lextract.io/locations/little-rock-commercial-lease-abstraction')
  })

  it('excludes merged content routes from sitemap', async () => {
    const entries = await sitemap()
    const urls = entries.map((entry) => entry.url)

    expect(urls).toContain(
      'https://lextract.io/resources/articles/what-is-commercial-lease-abstraction'
    )
    expect(urls).not.toContain(
      'https://lextract.io/resources/articles/what-is-lease-extraction'
    )
  })

  it('uses the fixed marketing update date for static page lastModified values', async () => {
    const entries = await sitemap()
    const expectedLastModified = new Date('2026-04-30')

    const staticUrls = [
      'https://lextract.io',
      'https://lextract.io/upload',
      'https://lextract.io/pricing',
      'https://lextract.io/about',
      'https://lextract.io/sample-report',
      'https://lextract.io/resources',
    ]

    for (const url of staticUrls) {
      const entry = entries.find((item) => item.url === url)
      expect(entry?.lastModified).toEqual(expectedLastModified)
    }
  })

  it('all entries have required fields', async () => {
    const entries = await sitemap()
    for (const entry of entries) {
      expect(entry.url).toBeTruthy()
      expect(entry.changeFrequency).toBeTruthy()
      expect(typeof entry.priority).toBe('number')
    }
  })

  it('all URLs start with the site URL', async () => {
    const entries = await sitemap()
    for (const entry of entries) {
      expect(entry.url).toMatch(/^https:\/\/lextract\.io/)
    }
  })
})
