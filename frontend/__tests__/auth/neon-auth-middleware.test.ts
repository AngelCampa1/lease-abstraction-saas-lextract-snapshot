/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockResponseCookieSet, mockCookiesGet, mockCookiesGetAll } = vi.hoisted(() => {
  return {
    mockResponseCookieSet: vi.fn(),
    mockCookiesGet: vi.fn(),
    mockCookiesGetAll: vi.fn().mockReturnValue([]),
  }
})

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: mockCookiesGet,
    getAll: mockCookiesGetAll,
  }),
}))

vi.mock('next/server', () => {
  class MockNextResponse {
    body?: string | null
    status: number
    headers: Headers
    cookies: { set: ReturnType<typeof vi.fn> }

    constructor(body?: string | null, init?: { status?: number; headers?: Headers }) {
      this.body = body
      this.status = init?.status ?? 200
      this.headers = init?.headers ?? new Headers()
      this.cookies = { set: mockResponseCookieSet }
    }

    static next() {
      return new MockNextResponse()
    }

    static redirect(url: URL) {
      const resp = new MockNextResponse()
      resp.status = 302
      resp.headers.set('Location', url.toString())
      return resp
    }

    static json(body: unknown, init?: { status?: number }) {
      return new MockNextResponse(JSON.stringify(body), { status: init?.status ?? 200 })
    }
  }

  return { NextResponse: MockNextResponse }
})

import { createNeonAuth } from '@/lib/neon-auth/server'

describe('createNeonAuth', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = vi.fn()
    mockResponseCookieSet.mockClear()
    mockCookiesGetAll.mockReturnValue([])
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('creates a NeonAuth object with middleware, handler, and getSession', () => {
    const auth = createNeonAuth({
      baseUrl: 'http://localhost:4000',
      cookies: { secret: 'test-secret' },
    })

    expect(auth.middleware).toBeTypeOf('function')
    expect(auth.handler).toBeTypeOf('function')
    expect(auth.getSession).toBeTypeOf('function')
  })

  describe('middleware', () => {
    const auth = createNeonAuth({
      baseUrl: 'http://localhost:4000',
      cookies: { secret: 'test-secret' },
    })
    const middlewareFn = auth.middleware({ loginUrl: '/login' })

    function createMockRequest(pathname: string, sessionCookieValue?: string) {
      return {
        cookies: {
          get: (name: string) =>
            name === 'neon_auth_session' && sessionCookieValue
              ? { value: sessionCookieValue }
              : undefined,
        },
        headers: {
          get: (name: string) =>
            name === 'cookie' && sessionCookieValue
              ? `better-auth.session_token=${sessionCookieValue}`
              : null,
        },
        nextUrl: {
          pathname,
        },
        url: `http://localhost:3000${pathname}`,
      }
    }

    it('allows public paths without session cookie', async () => {
      const request = createMockRequest('/login')
      const response = await middlewareFn(request as never)
      expect(response.status).not.toBe(302)
    })

    it('allows signup path without session cookie', async () => {
      const request = createMockRequest('/signup')
      const response = await middlewareFn(request as never)
      expect(response.status).not.toBe(302)
    })

    it('allows api/auth paths without session cookie', async () => {
      const request = createMockRequest('/api/auth/session')
      const response = await middlewareFn(request as never)
      expect(response.status).not.toBe(302)
    })

    it('redirects to login for protected paths without session cookie', async () => {
      const request = createMockRequest('/dashboard')
      const response = await middlewareFn(request as never)
      expect(response.status).toBe(302)
      expect(response.headers.get('Location')).toContain('/login')
      expect(response.headers.get('Location')).toContain('return=%2Fdashboard')
    })

    it('validates session cookie when present', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ user: { id: '1', email: 'u@t.com' }, session: {} }), {
          status: 200,
        }),
      )

      const request = createMockRequest('/dashboard', 'valid-session-cookie')
      const response = await middlewareFn(request as never)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:4000/get-session',
        expect.objectContaining({
          headers: { Cookie: 'better-auth.session_token=valid-session-cookie' },
        }),
      )
      expect(response.status).not.toBe(302)
    })

    it('redirects to login when session validation fails', async () => {
      vi.mocked(global.fetch).mockResolvedValue(new Response('', { status: 401 }))

      const request = createMockRequest('/dashboard', 'expired-session')
      const response = await middlewareFn(request as never)

      expect(response.status).toBe(302)
      expect(response.headers.get('Location')).toContain('/login')
    })

    it('redirects to login when auth backend is unreachable', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Connection refused'))

      const request = createMockRequest('/dashboard', 'some-session')
      const response = await middlewareFn(request as never)

      expect(response.status).toBe(302)
      expect(response.headers.get('Location')).toContain('/login')
      expect(response.headers.get('Location')).toContain('return=%2Fdashboard')
    })
  })

  describe('handler', () => {
    const auth = createNeonAuth({
      baseUrl: 'http://localhost:4000',
      cookies: { secret: 'test-secret' },
    })
    const { GET, POST } = auth.handler()

    it('returns GET and POST handlers', () => {
      expect(GET).toBeTypeOf('function')
      expect(POST).toBeTypeOf('function')
    })

    it('proxies GET requests to auth backend', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ user: { id: '1' } }), {
          status: 200,
          headers: new Headers({ 'Content-Type': 'application/json' }),
        }),
      )

      const request = {
        url: 'http://localhost:3000/api/auth/get-session',
        method: 'GET',
        headers: new Headers(),
        text: vi.fn().mockResolvedValue(''),
      }

      const response = await GET(request as never)
      expect(response).toBeDefined()
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:4000/get-session',
        expect.objectContaining({ method: 'GET' }),
      )
    })

    it('serves /api/auth/token from the validated secure session cookie', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(
          JSON.stringify({
            session: { token: 'raw-session-token' },
            user: { id: '1', email: 'user@example.com' },
          }),
          { status: 200 },
        ),
      )

      const request = {
        url: 'http://localhost:3000/api/auth/token',
        method: 'GET',
        headers: new Headers({
          cookie: '__Secure-neon-auth.session_token=signed-session-cookie; theme=dark',
        }),
        text: vi.fn().mockResolvedValue(''),
      }

      const response = await GET(request as never)
      expect(typeof response.body).toBe('string')
      const body = JSON.parse(String(response.body)) as { token?: string }

      expect(response.status).toBe(200)
      expect(body.token).toBe('signed-session-cookie')
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:4000/get-session',
        expect.objectContaining({ method: 'GET' }),
      )
    })

    it('serves /api/auth/token when upstream omits the raw session token', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ user: { id: '1', email: 'user@example.com' } }), {
          status: 200,
        }),
      )

      const request = {
        url: 'http://localhost:3000/api/auth/token',
        method: 'GET',
        headers: new Headers({
          cookie: '__Secure-neon-auth.session_token=signed-session-cookie',
        }),
        text: vi.fn().mockResolvedValue(''),
      }

      const response = await GET(request as never)
      expect(typeof response.body).toBe('string')
      const body = JSON.parse(String(response.body)) as { token?: string }

      expect(response.status).toBe(200)
      expect(body.token).toBe('signed-session-cookie')
    })

    it('returns 401 for /api/auth/token when the secure session cookie is missing', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(
          JSON.stringify({
            session: { token: 'raw-session-token' },
            user: { id: '1', email: 'user@example.com' },
          }),
          { status: 200 },
        ),
      )

      const request = {
        url: 'http://localhost:3000/api/auth/token',
        method: 'GET',
        headers: new Headers({ cookie: 'better-auth.session_token=local-session-cookie' }),
        text: vi.fn().mockResolvedValue(''),
      }

      const response = await GET(request as never)
      expect(response.status).toBe(401)
    })

    it('returns 401 for /api/auth/token when the secure session cookie is empty', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(
          JSON.stringify({
            session: { token: 'raw-session-token' },
            user: { id: '1', email: 'user@example.com' },
          }),
          { status: 200 },
        ),
      )

      const request = {
        url: 'http://localhost:3000/api/auth/token',
        method: 'GET',
        headers: new Headers({ cookie: '__Secure-neon-auth.session_token=; theme=dark' }),
        text: vi.fn().mockResolvedValue(''),
      }

      const response = await GET(request as never)
      expect(response.status).toBe(401)
    })

    it('passes through upstream /api/auth/token failures with set-cookie headers', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: 'expired' }), {
          status: 403,
          headers: new Headers({ 'set-cookie': 'expired-session=1; Path=/' }),
        }),
      )

      const request = {
        url: 'http://localhost:3000/api/auth/token',
        method: 'GET',
        headers: new Headers({
          cookie: '__Secure-neon-auth.session_token=signed-session-cookie',
        }),
        text: vi.fn().mockResolvedValue(''),
      }

      const response = await GET(request as never)
      expect(response.status).toBe(403)
      expect(response.headers.get('set-cookie')).toBe('expired-session=1; Path=/')
    })

    it('returns 401 for /api/auth/token when upstream omits user', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ session: { token: 'session-jwt' } }), {
          status: 200,
        }),
      )

      const request = {
        url: 'http://localhost:3000/api/auth/token',
        method: 'GET',
        headers: new Headers({
          cookie: '__Secure-neon-auth.session_token=signed-session-cookie',
        }),
        text: vi.fn().mockResolvedValue(''),
      }

      const response = await GET(request as never)
      expect(response.status).toBe(401)
    })

    it('returns 503 for /api/auth/token when upstream JSON is malformed', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response('{not json', {
          status: 200,
        }),
      )

      const request = {
        url: 'http://localhost:3000/api/auth/token',
        method: 'GET',
        headers: new Headers({
          cookie: '__Secure-neon-auth.session_token=signed-session-cookie',
        }),
        text: vi.fn().mockResolvedValue(''),
      }

      const response = await GET(request as never)
      expect(response.status).toBe(503)
    })

    it('proxies POST requests with body to auth backend', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: new Headers(),
        }),
      )

      const request = {
        url: 'http://localhost:3000/api/auth/sign-in/email',
        method: 'POST',
        headers: new Headers({
          'Content-Type': 'application/json',
          Origin: 'http://localhost:3000',
        }),
        text: vi
          .fn()
          .mockResolvedValue(JSON.stringify({ email: 'test@test.com', password: 'pass' })),
      }

      const response = await POST(request as never)
      expect(response).toBeDefined()
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:4000/sign-in/email',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@test.com', password: 'pass' }),
        }),
      )
    })

    it('rejects cross-site POST requests before proxying to auth backend', async () => {
      const request = {
        url: 'http://localhost:3000/api/auth/sign-out',
        method: 'POST',
        headers: new Headers({
          'Content-Type': 'application/json',
          Origin: 'https://evil.example',
          Cookie: '__Secure-neon-auth.session_token=signed-session-cookie',
          'Sec-Fetch-Site': 'cross-site',
        }),
        text: vi.fn().mockResolvedValue('{}'),
      }

      const response = await POST(request as never)
      expect(response.status).toBe(403)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('rejects contradictory POST request provenance headers', async () => {
      const request = {
        url: 'http://localhost:3000/api/auth/sign-out',
        method: 'POST',
        headers: new Headers({
          'Content-Type': 'application/json',
          Origin: 'https://evil.example',
          Cookie: '__Secure-neon-auth.session_token=signed-session-cookie',
          'Sec-Fetch-Site': 'same-origin',
        }),
        text: vi.fn().mockResolvedValue('{}'),
      }

      const response = await POST(request as never)
      expect(response.status).toBe(403)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('rejects malformed Origin headers before proxying auth POSTs', async () => {
      const request = {
        url: 'http://localhost:3000/api/auth/sign-out',
        method: 'POST',
        headers: new Headers({
          'Content-Type': 'application/json',
          Origin: '://not-a-url',
          Cookie: '__Secure-neon-auth.session_token=signed-session-cookie',
        }),
        text: vi.fn().mockResolvedValue('{}'),
      }

      const response = await POST(request as never)
      expect(response.status).toBe(403)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('rejects cross-site POST requests identified only by Fetch Metadata', async () => {
      const request = {
        url: 'http://localhost:3000/api/auth/sign-out',
        method: 'POST',
        headers: new Headers({
          'Content-Type': 'application/json',
          Cookie: '__Secure-neon-auth.session_token=signed-session-cookie',
          'Sec-Fetch-Site': 'cross-site',
        }),
        text: vi.fn().mockResolvedValue('{}'),
      }

      const response = await POST(request as never)
      expect(response.status).toBe(403)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('allows cookie-free POST requests without browser provenance headers', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const request = {
        url: 'http://localhost:3000/api/auth/sign-in/email',
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        text: vi.fn().mockResolvedValue('{}'),
      }

      const response = await POST(request as never)
      expect(response.status).toBe(200)
      expect(global.fetch).toHaveBeenCalled()
    })

    it('allows same-origin POST requests with cookies when Origin is omitted', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const request = {
        url: 'http://localhost:3000/api/auth/sign-out',
        method: 'POST',
        headers: new Headers({
          'Content-Type': 'application/json',
          Cookie: '__Secure-neon-auth.session_token=signed-session-cookie',
          'Sec-Fetch-Site': 'same-origin',
        }),
        text: vi.fn().mockResolvedValue('{}'),
      }

      const response = await POST(request as never)
      expect(response.status).toBe(200)
      expect(global.fetch).toHaveBeenCalled()
    })

    it('returns 503 when auth backend is unreachable', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('ECONNREFUSED'))

      const request = {
        url: 'http://localhost:3000/api/auth/session',
        method: 'GET',
        headers: new Headers(),
        text: vi.fn().mockResolvedValue(''),
      }

      const response = await GET(request as never)
      expect(response.status).toBe(503)
    })

    it('returns 503 when proxied POST JSON is malformed', async () => {
      vi.mocked(global.fetch).mockResolvedValue(new Response('{not json', { status: 200 }))

      const request = {
        url: 'http://localhost:3000/api/auth/sign-in/email',
        method: 'POST',
        headers: new Headers({
          'Content-Type': 'application/json',
          Origin: 'http://localhost:3000',
        }),
        text: vi
          .fn()
          .mockResolvedValue(JSON.stringify({ email: 'test@test.com', password: 'pass' })),
      }

      const response = await POST(request as never)
      expect(response.status).toBe(503)
    })

    it('falls back to the configured base URL when backend origin is invalid', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: new Headers(),
        }),
      )

      const invalidBaseAuth = createNeonAuth({
        baseUrl: 'not a url',
        cookies: { secret: 'test-secret' },
      })
      const { POST: invalidBasePost } = invalidBaseAuth.handler()
      const request = {
        url: 'http://localhost:3000/api/auth/sign-in/email',
        method: 'POST',
        headers: new Headers({
          'Content-Type': 'application/json',
          Origin: 'http://localhost:3000',
        }),
        text: vi
          .fn()
          .mockResolvedValue(JSON.stringify({ email: 'test@test.com', password: 'pass' })),
      }

      await invalidBasePost(request as never)

      expect(global.fetch).toHaveBeenCalledWith(
        'not a url/sign-in/email',
        expect.objectContaining({ method: 'POST' }),
      )
      const fetchOptions = vi.mocked(global.fetch).mock.calls[0]?.[1]
      const headers = fetchOptions instanceof Object ? Reflect.get(fetchOptions, 'headers') : null
      expect(headers).toBeInstanceOf(Headers)
      expect(headers instanceof Headers ? headers.get('origin') : null).toBe('not a url')
    })
  })

  describe('getSession', () => {
    it('returns session data when cookie exists and validation succeeds', async () => {
      mockCookiesGetAll.mockReturnValue([
        { name: 'better-auth.session_token', value: 'valid-cookie' },
      ])

      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ user: { id: '1', email: 'user@test.com', name: 'Test' } }), {
          status: 200,
        }),
      )

      const auth = createNeonAuth({
        baseUrl: 'http://localhost:4000',
        cookies: { secret: 'test-secret' },
      })

      const session = await auth.getSession()
      expect(session).not.toBeNull()
      expect(session?.user.email).toBe('user@test.com')
    })

    it('returns null when no session cookie exists', async () => {
      mockCookiesGetAll.mockReturnValue([])

      const auth = createNeonAuth({
        baseUrl: 'http://localhost:4000',
        cookies: { secret: 'test-secret' },
      })

      const session = await auth.getSession()
      expect(session).toBeNull()
    })

    it('returns null when session validation returns non-OK', async () => {
      mockCookiesGetAll.mockReturnValue([
        { name: 'better-auth.session_token', value: 'expired-cookie' },
      ])

      vi.mocked(global.fetch).mockResolvedValue(new Response('', { status: 401 }))

      const auth = createNeonAuth({
        baseUrl: 'http://localhost:4000',
        cookies: { secret: 'test-secret' },
      })

      const session = await auth.getSession()
      expect(session).toBeNull()
    })

    it('returns null when session validation omits user', async () => {
      mockCookiesGetAll.mockReturnValue([
        { name: 'better-auth.session_token', value: 'cookie-without-user' },
      ])

      vi.mocked(global.fetch).mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }))

      const auth = createNeonAuth({
        baseUrl: 'http://localhost:4000',
        cookies: { secret: 'test-secret' },
      })

      const session = await auth.getSession()
      expect(session).toBeNull()
    })

    it('returns null when an error occurs', async () => {
      mockCookiesGetAll.mockImplementation(() => {
        throw new Error('Server component required')
      })

      const auth = createNeonAuth({
        baseUrl: 'http://localhost:4000',
        cookies: { secret: 'test-secret' },
      })

      const session = await auth.getSession()
      expect(session).toBeNull()
    })
  })
})
