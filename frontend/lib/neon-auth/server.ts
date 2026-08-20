import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

interface NeonAuthConfig {
  baseUrl: string
  cookies: {
    secret: string
    sessionDataTtl?: number
  }
}

interface SessionUser {
  id: string
  email: string
  name?: string
  image?: string
}

interface SessionData {
  user: SessionUser
}

interface AuthTokenSessionResponse {
  user?: unknown
}

type MiddlewareConfig = {
  loginUrl?: string
  publicPaths?: string[]
}

const DEFAULT_PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/api/auth',
  '/_next',
  '/favicon',
  '/og-image',
  '/robots.txt',
  '/sitemap',
  '/llms',
]

const AUTH_TOKEN_COOKIE_NAME = '__Secure-neon-auth.session_token'

function isPublicPath(pathname: string, publicPaths: string[]): boolean {
  return publicPaths.some(
    (p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p),
  )
}

function readCookieValue(cookieHeader: string, cookieName: string): string | null {
  for (const cookie of cookieHeader.split(';')) {
    const [name, ...valueParts] = cookie.trim().split('=')
    if (name !== cookieName || valueParts.length === 0) {
      continue
    }

    const value = valueParts.join('=').trim()
    return value.length > 0 ? value : null
  }

  return null
}

/**
 * Creates a NeonAuth server instance with middleware, handler, and getSession.
 *
 * This is a custom implementation that wraps the Neon Auth backend API,
 * allowing full control over middleware routing, request proxying, and
 * server-side session validation.
 */
export function createNeonAuth(config: NeonAuthConfig) {
  const { baseUrl } = config

  /**
   * Next.js middleware factory. Validates session cookies and redirects
   * unauthenticated requests to loginUrl.
   */
  function middleware(opts?: MiddlewareConfig) {
    const loginUrl = opts?.loginUrl ?? '/login'
    const publicPaths = [...DEFAULT_PUBLIC_PATHS, loginUrl]

    return async function middlewareFn(request: NextRequest) {
      const { pathname } = request.nextUrl

      if (isPublicPath(pathname, publicPaths)) {
        return NextResponse.next()
      }

      const cookieHeader = request.headers.get('cookie') ?? ''

      if (!cookieHeader) {
        const url = new URL(loginUrl, request.url)
        url.searchParams.set('return', pathname)
        return NextResponse.redirect(url)
      }

      // Validate session with auth backend - forward all cookies so we're
      // not coupled to a specific session cookie name (Better Auth may use
      // 'better-auth.session_token' or a Neon-specific name).
      try {
        const res = await fetch(`${baseUrl}/get-session`, {
          headers: { Cookie: cookieHeader },
        })

        if (!res.ok) {
          const url = new URL(loginUrl, request.url)
          url.searchParams.set('return', pathname)
          return NextResponse.redirect(url)
        }

        // A 200 with no user means unauthenticated (Better Auth returns {} or null)
        const data = (await res.json()) as { user?: unknown }
        if (!data?.user) {
          const url = new URL(loginUrl, request.url)
          url.searchParams.set('return', pathname)
          return NextResponse.redirect(url)
        }

        return NextResponse.next()
      } catch {
        const url = new URL(loginUrl, request.url)
        url.searchParams.set('return', pathname)
        return NextResponse.redirect(url)
      }
    }
  }

  /**
   * Route handler factory. Returns GET and POST handlers that proxy
   * requests to the Neon Auth backend.
   *
   * IMPORTANT: We explicitly forward Set-Cookie headers from the upstream
   * response. Without this, session cookies set by the auth backend during
   * sign-in/sign-up would never reach the browser.
   *
   * We use an ALLOWLIST for forwarded headers. The Neon Auth backend (Better Auth)
   * validates the `origin` and `host` headers and rejects with INVALID_HOSTNAME if
   * they don't match its configured trusted origins. By only forwarding the headers
   * that are actually needed for auth operations, we avoid triggering those checks.
   */
  function handler() {
    // Only forward headers that auth operations actually need.
    // Allowlist is safer than denylist: origin/host/x-forwarded-* all trigger
    // Better Auth's INVALID_HOSTNAME check when the value is lextract.io.
    const FORWARD_HEADERS = new Set([
      'accept',
      'accept-language',
      'authorization',
      'content-type',
      'cookie',
    ])

    // Better Auth requires an `origin` header for CSRF validation on POST requests.
    // We set it to the auth backend's own origin (extracted from baseUrl) because
    // Better Auth unconditionally trusts its own origin - using the browser's origin
    // (lextract.io) requires it to be in the trusted_origins DB config, which may
    // not always be reflected in the running service's in-memory config.
    const backendOrigin = (() => {
      try {
        return new URL(baseUrl).origin
      } catch {
        return baseUrl
      }
    })()

    function buildUpstreamHeaders(incoming: Headers): Headers {
      const out = new Headers()
      for (const [key, value] of incoming.entries()) {
        if (FORWARD_HEADERS.has(key.toLowerCase())) {
          out.set(key, value)
        }
      }
      // Always set origin to the backend's own origin so Better Auth's CSRF
      // check passes unconditionally - no dependency on trusted_origins config.
      out.set('origin', backendOrigin)
      return out
    }

    function isSameOriginPost(request: NextRequest): boolean {
      const requestOrigin = new URL(request.url).origin
      const origin = request.headers.get('origin')
      if (origin !== null) {
        try {
          return new URL(origin).origin === requestOrigin
        } catch {
          return false
        }
      }

      const secFetchSite = request.headers.get('sec-fetch-site')?.toLowerCase()
      if (secFetchSite === 'cross-site') {
        return false
      }
      if (secFetchSite === 'same-origin') {
        return true
      }

      const hasCookies = (request.headers.get('cookie') ?? '').trim().length > 0
      return !hasCookies
    }

    function forwardCookies(upstream: Response, response: ReturnType<typeof NextResponse.json>) {
      // `headers.getSetCookie()` returns an array and is the correct API for
      // reading multiple Set-Cookie headers (unlike `headers.get('set-cookie')`
      // which concatenates them with commas and can corrupt cookie values).
      const setCookies: string[] =
        typeof upstream.headers.getSetCookie === 'function'
          ? upstream.headers.getSetCookie()
          : upstream.headers.get('set-cookie')
            ? [upstream.headers.get('set-cookie')!]
            : []

      for (const cookie of setCookies) {
        response.headers.append('set-cookie', cookie)
      }
    }

    function isTokenRequest(url: string): boolean {
      return new URL(url).pathname === '/api/auth/token'
    }

    async function handleTokenRequest(request: NextRequest) {
      try {
        const signedSessionCookie = readCookieValue(
          request.headers.get('cookie') ?? '',
          AUTH_TOKEN_COOKIE_NAME,
        )

        const upstream = await fetch(`${baseUrl}/get-session`, {
          method: 'GET',
          headers: buildUpstreamHeaders(request.headers),
        })
        const body = await upstream.text()

        if (!upstream.ok) {
          const response = NextResponse.json({}, { status: upstream.status })
          forwardCookies(upstream, response)
          return response
        }

        const data = (body ? JSON.parse(body) : {}) as AuthTokenSessionResponse
        const user = data.user
        const userId =
          typeof user === 'object' && user !== null ? Reflect.get(user, 'id') : undefined
        const hasUser = typeof userId === 'string' && userId.trim().length > 0
        if (!signedSessionCookie || !hasUser) {
          const response = NextResponse.json({}, { status: 401 })
          forwardCookies(upstream, response)
          return response
        }

        const response = NextResponse.json({ token: signedSessionCookie }, { status: 200 })
        forwardCookies(upstream, response)
        return response
      } catch {
        return NextResponse.json({ error: 'Auth service unavailable' }, { status: 503 })
      }
    }

    async function GET(request: NextRequest) {
      if (isTokenRequest(request.url)) {
        return handleTokenRequest(request)
      }

      // Strip origin + /api/auth prefix; baseUrl already contains the auth base path.
      // e.g. https://lextract.io/api/auth/sign-in/email
      //   → https://ep-....neonauth...neon.tech/neondb/auth/sign-in/email
      const url = request.url.replace(/^https?:\/\/[^/]+\/api\/auth/, baseUrl)
      try {
        const upstream = await fetch(url, {
          method: 'GET',
          headers: buildUpstreamHeaders(request.headers),
        })
        const body = await upstream.text()
        const response = NextResponse.json(body ? JSON.parse(body) : {}, {
          status: upstream.status,
        })
        forwardCookies(upstream, response)
        return response
      } catch {
        return NextResponse.json({ error: 'Auth service unavailable' }, { status: 503 })
      }
    }

    async function POST(request: NextRequest) {
      if (!isSameOriginPost(request)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Strip origin + /api/auth prefix; baseUrl already contains the auth base path.
      // e.g. https://lextract.io/api/auth/sign-in/email
      //   → https://ep-....neonauth...neon.tech/neondb/auth/sign-in/email
      const url = request.url.replace(/^https?:\/\/[^/]+\/api\/auth/, baseUrl)
      try {
        const body = await request.text()
        const upstream = await fetch(url, {
          method: 'POST',
          headers: buildUpstreamHeaders(request.headers),
          body,
        })
        const responseBody = await upstream.text()
        const response = NextResponse.json(responseBody ? JSON.parse(responseBody) : {}, {
          status: upstream.status,
        })
        forwardCookies(upstream, response)
        return response
      } catch {
        return NextResponse.json({ error: 'Auth service unavailable' }, { status: 503 })
      }
    }

    return { GET, POST }
  }

  /**
   * Server-side session getter. Reads the session cookie from Next.js headers
   * and validates it against the auth backend.
   */
  async function getSession(): Promise<SessionData | null> {
    try {
      const cookieStore = await cookies()
      const allCookies = cookieStore
        .getAll()
        .map((c) => `${c.name}=${c.value}`)
        .join('; ')

      if (!allCookies) {
        return null
      }

      const res = await fetch(`${baseUrl}/get-session`, {
        headers: { Cookie: allCookies },
      })

      if (!res.ok) {
        return null
      }

      const data = (await res.json()) as { user?: SessionData['user'] }
      if (!data?.user) {
        return null
      }
      return data as SessionData
    } catch {
      return null
    }
  }

  return { middleware, handler, getSession }
}

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    sessionDataTtl: 300,
  },
})
