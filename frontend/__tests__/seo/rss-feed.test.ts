/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ContentMeta } from '@/lib/content-types'

// Mock getAllContent before importing the route handler
vi.mock('@/lib/content', () => ({
  getAllContent: vi.fn(),
}))

vi.mock('@/lib/site-config', () => ({
  SITE_URL: 'https://lextract.io',
  SITE_NAME: 'Lextract',
  DEFAULT_OG_IMAGE: {
    url: '/og-image.png',
    width: 1200,
    height: 630,
    alt: 'Lextract — AI-Powered Commercial Lease Abstraction',
  },
}))

const MOCK_ARTICLE: ContentMeta = {
  title: 'CAM Charges Explained',
  slug: 'cam-charges-explained',
  description: 'A guide to CAM charges in commercial leases.',
  publishedAt: '2026-03-01',
  updatedAt: '2026-03-01',
  author: 'Angel Campa, Founder',
  category: 'articles',
  silo: 'lease-abstraction',
  tags: ['CAM', 'commercial lease'],
  readingTime: 5,
  featured: false,
  funnelStage: 'tofu',
}

const MOCK_GUIDE: ContentMeta = {
  title: 'NNN Lease Guide',
  slug: 'nnn-lease-guide',
  description: 'Everything about triple net leases.',
  publishedAt: '2026-02-15',
  updatedAt: '2026-02-15',
  author: 'Angel Campa',
  category: 'guides',
  silo: 'lease-types',
  tags: ['NNN'],
  readingTime: 10,
  featured: true,
  funnelStage: 'mofu',
}

const UPDATED_ARTICLE: ContentMeta = {
  ...MOCK_ARTICLE,
  slug: 'updated-cam-guide',
  publishedAt: '2026-01-01',
  updatedAt: '2026-04-15',
}

async function getHandler() {
  // Re-import after mocks are set up
  const { GET } = await import('@/app/feed.xml/route')
  return GET
}

describe('GET /feed.xml', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns 200 with application/rss+xml content type', async () => {
    const { getAllContent } = await import('@/lib/content')
    vi.mocked(getAllContent).mockResolvedValueOnce([MOCK_ARTICLE]).mockResolvedValueOnce([MOCK_GUIDE])
    const GET = await getHandler()
    const response = await GET()
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('application/rss+xml')
  })

  it('returns valid XML with RSS 2.0 declaration', async () => {
    const { getAllContent } = await import('@/lib/content')
    vi.mocked(getAllContent).mockResolvedValueOnce([MOCK_ARTICLE]).mockResolvedValueOnce([MOCK_GUIDE])
    const GET = await getHandler()
    const response = await GET()
    const text = await response.text()
    expect(text).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(text).toContain('<rss version="2.0"')
    expect(text).toContain('</rss>')
  })

  it('includes channel metadata', async () => {
    const { getAllContent } = await import('@/lib/content')
    vi.mocked(getAllContent).mockResolvedValueOnce([]).mockResolvedValueOnce([])
    const GET = await getHandler()
    const response = await GET()
    const text = await response.text()
    expect(text).toContain('<title>Lextract</title>')
    expect(text).toContain('<link>https://lextract.io</link>')
    expect(text).toContain('<language>en-us</language>')
  })

  it('outputs article items with correct URLs', async () => {
    const { getAllContent } = await import('@/lib/content')
    vi.mocked(getAllContent).mockResolvedValueOnce([MOCK_ARTICLE]).mockResolvedValueOnce([])
    const GET = await getHandler()
    const response = await GET()
    const text = await response.text()
    expect(text).toContain('https://lextract.io/resources/articles/cam-charges-explained')
    expect(text).toContain('<title>CAM Charges Explained</title>')
  })

  it('outputs guide items with correct URLs', async () => {
    const { getAllContent } = await import('@/lib/content')
    vi.mocked(getAllContent).mockResolvedValueOnce([]).mockResolvedValueOnce([MOCK_GUIDE])
    const GET = await getHandler()
    const response = await GET()
    const text = await response.text()
    expect(text).toContain('https://lextract.io/resources/guides/nnn-lease-guide')
  })

  it('sorts items newest first', async () => {
    const { getAllContent } = await import('@/lib/content')
    vi.mocked(getAllContent).mockResolvedValueOnce([MOCK_ARTICLE]).mockResolvedValueOnce([MOCK_GUIDE])
    const GET = await getHandler()
    const response = await GET()
    const text = await response.text()
    const articlePos = text.indexOf('cam-charges-explained')
    const guidePos = text.indexOf('nnn-lease-guide')
    // Article (2026-03-01) should appear before Guide (2026-02-15)
    expect(articlePos).toBeLessThan(guidePos)
  })

  it('sorts and exposes feed freshness using updatedAt when present', async () => {
    const { getAllContent } = await import('@/lib/content')
    vi.mocked(getAllContent).mockResolvedValueOnce([UPDATED_ARTICLE]).mockResolvedValueOnce([MOCK_GUIDE])
    const GET = await getHandler()
    const response = await GET()
    const text = await response.text()
    const updatedPos = text.indexOf('updated-cam-guide')
    const guidePos = text.indexOf('nnn-lease-guide')

    expect(updatedPos).toBeLessThan(guidePos)
    expect(text).toContain(`<lastBuildDate>${new Date('2026-04-15').toUTCString()}</lastBuildDate>`)
  })

  it('formats author as RFC 822 email format', async () => {
    const { getAllContent } = await import('@/lib/content')
    vi.mocked(getAllContent).mockResolvedValueOnce([MOCK_ARTICLE]).mockResolvedValueOnce([])
    const GET = await getHandler()
    const response = await GET()
    const text = await response.text()
    // "Angel Campa, Founder" should be stripped to "Angel Campa" and formatted as email
    expect(text).toContain('<author>angel.campa@lextract.io (Angel Campa)</author>')
  })

  it('escapes XML special characters in title', async () => {
    const { getAllContent } = await import('@/lib/content')
    const articleWithSpecialChars: ContentMeta = {
      ...MOCK_ARTICLE,
      title: 'CAM & Operating Expenses: <A Guide>',
      description: 'Uses & and < in content',
    }
    vi.mocked(getAllContent).mockResolvedValueOnce([articleWithSpecialChars]).mockResolvedValueOnce([])
    const GET = await getHandler()
    const response = await GET()
    const text = await response.text()
    expect(text).toContain('CAM &amp; Operating Expenses: &lt;A Guide&gt;')
    expect(text).not.toContain('CAM & Operating')
  })

  it('includes Cache-Control header', async () => {
    const { getAllContent } = await import('@/lib/content')
    vi.mocked(getAllContent).mockResolvedValueOnce([]).mockResolvedValueOnce([])
    const GET = await getHandler()
    const response = await GET()
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=86400')
  })

  it('returns empty channel when no content', async () => {
    const { getAllContent } = await import('@/lib/content')
    vi.mocked(getAllContent).mockResolvedValueOnce([]).mockResolvedValueOnce([])
    const GET = await getHandler()
    const response = await GET()
    const text = await response.text()
    expect(text).toContain('<channel>')
    expect(text).not.toContain('<item>')
  })
})
