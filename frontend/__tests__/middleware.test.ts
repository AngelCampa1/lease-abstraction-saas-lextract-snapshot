/** @vitest-environment node */
import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const authMiddleware = vi.fn((request: NextRequest) => NextResponse.next({ request }))

vi.mock('@/lib/neon-auth/server', () => ({
  auth: {
    middleware: vi.fn(() => authMiddleware),
  },
}))

const { config, default: middleware } = await import('@/middleware')

function requestFor(url: string, headers?: HeadersInit): NextRequest {
  return new NextRequest(url, { headers })
}

describe('middleware canonicalization', () => {
  beforeEach(() => {
    authMiddleware.mockClear()
  })

  it('permanently redirects plain HTTP requests to HTTPS canonical host', async () => {
    const response = await middleware(requestFor('http://lextract.io/pricing'))

    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe('https://lextract.io/pricing')
    expect(response.headers.get('x-robots-tag')).toBeNull()
    expect(authMiddleware).not.toHaveBeenCalled()
  })

  it('adds noindex headers to protected HTTP canonical redirects', async () => {
    const response = await middleware(requestFor('http://lextract.io/dashboard'))

    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe('https://lextract.io/dashboard')
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow')
    expect(authMiddleware).not.toHaveBeenCalled()
  })

  it('does not redirect non-production HTTP hosts to production', async () => {
    const response = await middleware(requestFor('http://localhost:3000/pricing'))

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
    expect(authMiddleware).not.toHaveBeenCalled()
  })

  it('parses comma-separated forwarded proto values before redirecting', async () => {
    const response = await middleware(
      requestFor('https://lextract.io/resources', {
        'x-forwarded-proto': ' HTTP, https ',
      }),
    )

    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe('https://lextract.io/resources')
    expect(authMiddleware).not.toHaveBeenCalled()
  })

  it('permanently redirects forwarded HTTP requests to HTTPS canonical host', async () => {
    const response = await middleware(
      requestFor('https://lextract.io/resources', { 'x-forwarded-proto': 'http' }),
    )

    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe('https://lextract.io/resources')
    expect(authMiddleware).not.toHaveBeenCalled()
  })

  it('runs canonicalization middleware for robots and sitemap discovery files', () => {
    expect(config.matcher).toEqual([
      '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ])
  })

  it('permanently redirects HTTP robots and sitemap requests to HTTPS canonical URLs', async () => {
    const robotsResponse = await middleware(requestFor('http://lextract.io/robots.txt'))
    const sitemapResponse = await middleware(requestFor('http://lextract.io/sitemap.xml'))

    expect(robotsResponse.status).toBe(308)
    expect(robotsResponse.headers.get('location')).toBe('https://lextract.io/robots.txt')
    expect(sitemapResponse.status).toBe(308)
    expect(sitemapResponse.headers.get('location')).toBe('https://lextract.io/sitemap.xml')
    expect(authMiddleware).not.toHaveBeenCalled()
  })

  it('keeps HTTPS requests on the auth middleware path', async () => {
    const request = requestFor('https://lextract.io/dashboard')
    const response = await middleware(request)

    expect(response.status).toBe(200)
    expect(authMiddleware).toHaveBeenCalledWith(request)
  })

  it('adds noindex headers to protected app responses', async () => {
    const response = await middleware(requestFor('https://lextract.io/profile'))

    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow')
  })

  it('adds noindex headers when protected app routes redirect to login', async () => {
    authMiddleware.mockResolvedValueOnce(
      NextResponse.redirect(new URL('/login', 'https://lextract.io'), { status: 307 }),
    )

    const response = await middleware(requestFor('https://lextract.io/dashboard'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/login')
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow')
  })

  it('fails protected app routes closed when auth session validation is unavailable', async () => {
    authMiddleware.mockRejectedValueOnce(new Error('auth service unavailable'))

    const response = await middleware(requestFor('https://lextract.io/dashboard?tab=leases'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'https://lextract.io/login?return=%2Fdashboard%3Ftab%3Dleases',
    )
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow')
  })
})
