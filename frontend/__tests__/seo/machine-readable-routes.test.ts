/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import sitemap from '@/app/sitemap'
import { PRODUCT_FEATURES } from '@/data/features'
import { formatMachineReadablePricingLine } from '@/lib/machine-readable'

async function getLlmsHandler() {
  const { GET } = await import('@/app/llms.txt/route')
  return GET
}

async function getPricingMarkdownHandler() {
  const { GET } = await import('@/app/pricing.md/route')
  return GET
}

async function getLlmsFullHandler() {
  const { GET } = await import('@/app/llms-full.txt/route')
  return GET
}

async function getArticleMarkdownHandler() {
  const { GET } = await import('@/app/(marketing)/resources/article-markdown/[slug]/route')
  return GET
}

describe('GET /llms.txt', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns plaintext content with current pricing facts', async () => {
    const GET = await getLlmsHandler()
    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/plain; charset=utf-8')

    const text = await response.text()
    expect(text).toContain('Lextract')
    expect(text).toContain('$15 per lease (single)')
    expect(text).toContain('$65 for 5 leases ($13 each)')
    expect(text).toContain('$120 for 10 leases ($12 each)')
    expect(text).toContain('Processing time: Typically 5-15 minutes from PDF upload to structured output')
    expect(text).toContain('https://lextract.io/lease-abstraction-software')
    expect(text).toContain('https://lextract.io/features')
    for (const feature of PRODUCT_FEATURES) {
      expect(text).toContain(`https://lextract.io/features/${feature.slug}`)
    }
  })

  it('returns cache headers for crawler-friendly reuse', async () => {
    const GET = await getLlmsHandler()
    const response = await GET()

    expect(response.headers.get('Cache-Control')).toContain('s-maxage=86400')
  })

  it('rounds fractional machine-readable prices up to whole dollars', () => {
    expect(
      formatMachineReadablePricingLine({
        label: 'Fractional Pack',
        price: 64.01,
        credits: 5,
        perLease: 12.01,
      }),
    ).toBe('$65 for 5 leases ($13 each)')
  })

  it('only advertises canonical sitemap URLs', async () => {
    const GET = await getLlmsHandler()
    const response = await GET()
    const text = await response.text()
    const sitemapUrls = new Set((await sitemap()).map((entry) => entry.url))
    const advertisedUrls = [...text.matchAll(/https:\/\/lextract\.io\/[^\s)]+/g)].map(
      ([url]) => url,
    )

    expect(advertisedUrls.filter((url) => !sitemapUrls.has(url))).toEqual([])
  })
})

describe('GET /pricing.md', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns markdown with a machine-readable pricing summary', async () => {
    const GET = await getPricingMarkdownHandler()
    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/markdown; charset=utf-8')
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=86400')

    const text = await response.text()
    expect(text).toContain('# Lextract Pricing')
    expect(text).toContain('| Package | Price | Effective price per lease |')
    expect(text).toContain('| Single Lease | $15 | $15 |')
    expect(text).toContain('| 5-Pack | $65 | $13 |')
    expect(text).toContain('| 10-Pack | $120 | $12 |')
    expect(text).toContain('126 structured fields')
    expect(text).toContain('20 automated red flag checks')
    expect(text).toContain('https://lextract.io/pricing')
  })
})

describe('GET /llms-full.txt', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns the full machine-readable inventory route advertised by llms.txt', async () => {
    const GET = await getLlmsFullHandler()
    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/plain; charset=utf-8')
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=86400')

    const text = await response.text()
    expect(text).toContain('# Lextract Full Content Index')
    expect(text).toContain('Product extraction schema: 126 fields per lease')
    expect(text).toContain('Published field reference pages: 14')
    expect(text).toContain('Published red flag pages: 8')
    expect(text).toContain('https://lextract.io/fields/base-rent-annual')
    expect(text).toContain('https://lextract.io/red-flags/no-cam-cap')
    expect(text).toContain('https://lextract.io/glossary/base-rent')
    expect(text).toContain('https://lextract.io/features/confidence-scoring')
    expect(text).toContain('https://lextract.io/resources/articles/what-is-commercial-lease-abstraction')
    expect(text).toContain('https://lextract.io/resources/guides/ai-lease-extraction-guide')
    expect(text).toContain('https://lextract.io/resources/comparisons/leaselens')
    expect(text).toContain('https://lextract.io/calculators/rent-escalation-calculator')
    expect(text).toContain('https://lextract.io/templates/lease-abstraction-checklist')
  })

  it('only advertises URLs that are included in the canonical sitemap', async () => {
    const GET = await getLlmsFullHandler()
    const response = await GET()
    const text = await response.text()
    const sitemapUrls = new Set((await sitemap()).map((entry) => entry.url))
    const advertisedUrls = [...text.matchAll(/https:\/\/lextract\.io\/[^\s)]+/g)].map(
      ([url]) => url
    )

    expect(advertisedUrls.filter((url) => !sitemapUrls.has(url))).toEqual([])
  })
})

describe('GET /resources/articles/[slug].md', () => {
  it('returns a machine-readable article markdown page', async () => {
    const GET = await getArticleMarkdownHandler()
    const response = await GET(
      new Request('https://lextract.io/resources/articles/what-is-commercial-lease-abstraction.md'),
      { params: Promise.resolve({ slug: 'what-is-commercial-lease-abstraction' }) },
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/markdown; charset=utf-8')

    const text = await response.text()
    expect(text).toContain('# What Is Lease Abstraction? Definition, Process, Outputs, and Examples')
    expect(text).toContain('Canonical: https://lextract.io/resources/articles/what-is-commercial-lease-abstraction')
    expect(text).toContain('Author:')
    expect(text).toContain('Published:')
    expect(text).toContain('Updated:')
    expect(text).toContain(
      '[AI lease abstraction guide](https://lextract.io/resources/articles/ai-lease-abstraction-guide)',
    )
    expect(text).not.toContain('](/resources/')
  })

  it('returns 404 for a missing article markdown slug', async () => {
    const GET = await getArticleMarkdownHandler()

    await expect(() =>
      GET(
        new Request('https://lextract.io/resources/articles/not-real.md'),
        { params: Promise.resolve({ slug: 'not-real' }) },
      ),
    ).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
  })
})
