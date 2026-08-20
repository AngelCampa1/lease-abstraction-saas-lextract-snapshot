/** @vitest-environment node */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import {
  getAllIndexableUrls,
  buildIndexNowPayload,
  submitToIndexNow,
  INDEXNOW_BATCH_LIMIT,
} from '@/lib/indexnow'

const KEY_FILE_PATH = join(process.cwd(), 'public', 'a2364d14d6d545229354786738345e56.txt')

describe('IndexNow key file', () => {
  it('exists in public/', () => {
    expect(existsSync(KEY_FILE_PATH)).toBe(true)
  })

  it('contains only the key value', () => {
    const content = readFileSync(KEY_FILE_PATH, 'utf-8').trim()
    expect(content).toBe('a2364d14d6d545229354786738345e56')
  })

  it('key is 32 lowercase hex characters', () => {
    const content = readFileSync(KEY_FILE_PATH, 'utf-8').trim()
    expect(content).toMatch(/^[0-9a-f]{32}$/)
  })
})

describe('getAllIndexableUrls', () => {
  it('returns a substantial set of indexable URLs', async () => {
    const urls = await getAllIndexableUrls()
    expect(urls.length).toBeGreaterThan(300)
  })

  it('all URLs start with https://lextract.io', async () => {
    const urls = await getAllIndexableUrls()
    for (const url of urls) {
      expect(url).toMatch(/^https:\/\/lextract\.io/)
    }
  })

  it('no duplicate URLs', async () => {
    const urls = await getAllIndexableUrls()
    const unique = new Set(urls)
    expect(unique.size).toBe(urls.length)
  })

  it('includes core pages', async () => {
    const urls = await getAllIndexableUrls()
    expect(urls).toContain('https://lextract.io')
    expect(urls).toContain('https://lextract.io/upload')
    expect(urls).toContain('https://lextract.io/pricing')
    expect(urls).toContain('https://lextract.io/glossary')
    expect(urls).toContain('https://lextract.io/fields')
  })

  it('includes slug pages for every pSEO vertical', async () => {
    const urls = await getAllIndexableUrls()
    const verticals = [
      '/glossary/',
      '/fields/',
      '/red-flags/',
      '/for/',
      '/use-cases/',
      '/lease-types/',
      '/industries/',
      '/locations/',
      '/resources/comparisons/',
      '/resources/states/',
      '/clauses/',
      '/property-types/',
      '/templates/',
      '/integrations/',
      '/workflows/',
      '/case-studies/',
      '/faq/',
      '/calculators/',
    ]
    for (const vertical of verticals) {
      expect(urls.some((u) => u.includes(vertical))).toBe(true)
    }
  })

  it('stays within IndexNow batch limit', async () => {
    const urls = await getAllIndexableUrls()
    expect(urls.length).toBeLessThanOrEqual(INDEXNOW_BATCH_LIMIT)
  })
})

describe('buildIndexNowPayload', () => {
  const KEY = 'a2364d14d6d545229354786738345e56'

  it('returns correct structure', () => {
    const urls = ['https://lextract.io', 'https://lextract.io/pricing']
    const payload = buildIndexNowPayload(KEY, urls)

    expect(payload.host).toBe('lextract.io')
    expect(payload.key).toBe(KEY)
    expect(payload.keyLocation).toBe(`https://lextract.io/${KEY}.txt`)
    expect(payload.urlList).toEqual(urls)
  })

  it('throws when URL count exceeds batch limit', () => {
    const oversized = Array.from({ length: INDEXNOW_BATCH_LIMIT + 1 }, (_, i) => `https://lextract.io/page-${i}`)
    expect(() => buildIndexNowPayload(KEY, oversized)).toThrow(/batch limit exceeded/)
  })
})

describe('submitToIndexNow', () => {
  const KEY = 'a2364d14d6d545229354786738345e56'
  const URLS = ['https://lextract.io', 'https://lextract.io/pricing']

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('POSTs to api.indexnow.org with correct payload', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', mockFetch)

    await submitToIndexNow(KEY, URLS)

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.indexnow.org/indexnow')
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json; charset=utf-8' })

    const body = JSON.parse(init.body as string) as { host: string; key: string; urlList: string[] }
    expect(body.host).toBe('lextract.io')
    expect(body.key).toBe(KEY)
    expect(body.urlList).toEqual(URLS)
  })

  it('throws on non-2xx response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => 'Unprocessable Entity',
    })
    vi.stubGlobal('fetch', mockFetch)

    await expect(submitToIndexNow(KEY, URLS)).rejects.toThrow('HTTP 422')
  })

  it('propagates network errors', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network failure'))
    vi.stubGlobal('fetch', mockFetch)

    await expect(submitToIndexNow(KEY, URLS)).rejects.toThrow('Network failure')
  })
})
