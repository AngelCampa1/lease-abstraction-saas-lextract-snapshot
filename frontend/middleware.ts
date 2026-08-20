import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/neon-auth/server'

const _authMiddleware = auth.middleware({ loginUrl: '/login' })
const PROTECTED_PATH_PREFIXES = ['/dashboard', '/profile']
const PRODUCTION_HOSTS = new Set(['lextract.io', 'www.lextract.io'])
const PROTECTED_ROUTE_ROBOTS_HEADER = 'noindex, nofollow'

function getForwardedProto(request: NextRequest): string | null {
  return (
    request.headers
      ?.get('x-forwarded-proto')
      ?.split(',')[0]
      ?.trim()
      .toLowerCase() ?? null
  )
}

function withProtectedRouteNoindex(response: NextResponse): NextResponse {
  response.headers.set('X-Robots-Tag', PROTECTED_ROUTE_ROBOTS_HEADER)
  return response
}

function redirectToLogin(request: NextRequest): NextResponse {
  const returnPath = request.nextUrl.pathname + request.nextUrl.search
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('return', returnPath)
  return withProtectedRouteNoindex(NextResponse.redirect(loginUrl, { status: 307 }))
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )
}

export default async function middleware(request: NextRequest): Promise<NextResponse> {
  const forwardedProto = getForwardedProto(request)
  const isProductionHost = PRODUCTION_HOSTS.has(request.nextUrl.hostname)
  if (
    isProductionHost &&
    (request.nextUrl.protocol === 'http:' || forwardedProto === 'http')
  ) {
    const url = request.nextUrl.clone()
    url.protocol = 'https:'
    url.hostname = 'lextract.io'
    url.port = ''
    const response = NextResponse.redirect(url, { status: 308 })
    return isProtectedPath(request.nextUrl.pathname)
      ? withProtectedRouteNoindex(response)
      : response
  }

  if (!isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next()
  }

  let response: NextResponse
  try {
    response = await _authMiddleware(request)
  } catch {
    return redirectToLogin(request)
  }

  // When the Neon Auth middleware redirects to /login, append the original
  // path as ?return= so the login form can redirect back after sign-in.
  if (response.status === 302 || response.status === 307) {
    const loc = response.headers.get('location') ?? ''
    if (loc === '/login' || loc.endsWith('/login')) {
      return redirectToLogin(request)
    }
  }

  return withProtectedRouteNoindex(response)
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
