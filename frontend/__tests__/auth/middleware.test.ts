/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/server before importing the auth middleware entrypoint
vi.mock('next/server', () => {
  class MockNextResponse {
    status: number
    headers: Headers

    constructor(_body?: string | null, init?: { status?: number; headers?: Headers }) {
      this.status = init?.status ?? 200
      this.headers = init?.headers ?? new Headers()
    }

    static next() {
      return new MockNextResponse()
    }

    static redirect(url: URL, init?: { status?: number }) {
      const resp = new MockNextResponse(null, { status: init?.status ?? 302 })
      resp.headers.set('location', url.toString())
      return resp
    }
  }

  return {
    NextResponse: MockNextResponse,
    NextRequest: class MockNextRequest {},
  }
})

// Mock the neon-auth server module so middleware.ts can be imported
vi.mock('@/lib/neon-auth/server', () => ({
  auth: {
    middleware: vi.fn(() => vi.fn().mockResolvedValue({ status: 200, headers: new Headers() })),
  },
}))

describe('middleware config', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('does not include /results in the matcher', async () => {
    const mod = await import('@/middleware')
    const { matcher } = mod.config

    const hasResultsPattern = matcher.some(
      (pattern: string) => pattern.includes('results')
    )
    expect(hasResultsPattern).toBe(false)
  })

  it('protects /dashboard', async () => {
    const mod = await import('@/middleware')
    const { matcher } = mod.config

    expect(matcher).toContain(
      '/((?!api|_next/static|_next/image|favicon.ico).*)',
    )
  })

  it('protects /profile', async () => {
    const mod = await import('@/middleware')
    const { matcher } = mod.config

    expect(matcher).toContain(
      '/((?!api|_next/static|_next/image|favicon.ico).*)',
    )
  })
})

describe('middleware redirect behaviour', () => {
  it('appends return= param when auth middleware issues a redirect to /login', async () => {
    const { auth } = await import('@/lib/neon-auth/server')

    // Simulate auth middleware returning a 302 to /login
    vi.mocked(auth.middleware).mockReturnValue(
      vi.fn().mockResolvedValue({
        status: 302,
        headers: new Headers({ location: '/login' }),
      })
    )

    vi.resetModules()

    const { default: middleware } = await import('@/middleware')

    const mockRequest = {
      nextUrl: { pathname: '/dashboard', search: '' },
      url: 'http://localhost:3000/dashboard',
    }

    const response = await middleware(mockRequest as never)

    expect(response.status).toBe(307)
    const location = response.headers.get('location') ?? ''
    expect(location).toContain('/login')
    expect(location).toContain('return=%2Fdashboard')
  })

  it('passes through non-redirect responses from auth middleware unchanged', async () => {
    const { auth } = await import('@/lib/neon-auth/server')

    vi.mocked(auth.middleware).mockReturnValue(
      vi.fn().mockResolvedValue({ status: 200, headers: new Headers() })
    )

    vi.resetModules()

    const { default: middleware } = await import('@/middleware')

    const mockRequest = {
      nextUrl: { pathname: '/dashboard', search: '' },
      url: 'http://localhost:3000/dashboard',
    }

    const response = await middleware(mockRequest as never)
    expect(response.status).toBe(200)
  })
})
