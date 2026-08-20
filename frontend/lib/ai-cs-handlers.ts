/**
 * Request handlers for the lextract AI-CS BFF.
 *
 * Kept in `lib/` (covered by tests) so the `app/api/ai-cs/[action]` route file
 * is a trivially thin wrapper. Mirrors the pattern of ai-sdr-handlers.ts.
 *
 * The BFF is auth-gated (Neon session required). Same-origin guarded to prevent
 * the signing proxy from being used as an oracle by third-party sites. The
 * browser Origin is forwarded to the worker so it can enforce its own allowlist.
 */

import {
  AI_CS_WORKER_BASE_URL,
  buildAiCsProxyRequest,
  validateAiCsAction,
} from './ai-cs-proxy'

export interface AiCsSession {
  user: { id: string; email?: string }
}

/** Injectable dependencies for testability. Mirrors the ai-sdr-handlers pattern. */
export interface AiCsHandlerDeps {
  /** Returns the authenticated session, or null if unauthenticated. */
  getSession: () => Promise<AiCsSession | null>
  /** fetch implementation (injectable for tests). */
  fetch: (url: string, init: RequestInit) => Promise<Response>
  /** The AI_CS_CLIENT_ASSERTION_SECRET value (empty string if unset). */
  secret: string
  now?: () => Date
  nonce?: () => string
}

/**
 * Same-origin guard: reject browser requests whose Origin header does not match
 * the request URL's own origin, so the signing BFF can't be used as an oracle
 * by another site. Requests with no Origin (server-to-server or same-origin
 * fetch) are allowed. This mirrors ai-sdr-handlers.ts isSameOrigin exactly.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (origin === null) {
    return true
  }
  return origin === new URL(request.url).origin
}

function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}

const PASSTHROUGH_RESPONSE_HEADERS = ['content-type', 'retry-after']

/**
 * Core handler for the AI-CS BFF proxy.
 *
 * - Auth-gates via getSession (401 if no session).
 * - Validates action (404 if unknown).
 * - Same-origin guards the request (403 if cross-origin browser request).
 * - Returns 500 if the assertion secret is not configured.
 * - Builds the signed proxy request via buildAiCsProxyRequest.
 * - Forwards the browser Origin to the worker (the worker enforces an allowlist).
 * - Wraps the upstream fetch; network failures map to 502.
 * - Streams the upstream body back unbuffered.
 */
export async function handleAiCsProxyRequest(
  request: Request,
  action: string,
  deps: AiCsHandlerDeps,
): Promise<Response> {
  const workerPath = validateAiCsAction(action)
  if (workerPath === null) {
    return jsonError(404, 'NOT_FOUND', 'Unknown AI-CS action.')
  }

  const session = await deps.getSession()
  if (session === null) {
    return jsonError(401, 'UNAUTHORIZED', 'Authentication required.')
  }

  if (!isSameOrigin(request)) {
    return jsonError(403, 'FORBIDDEN_ORIGIN', 'Cross-origin requests are not allowed.')
  }

  if (!deps.secret) {
    return jsonError(500, 'CONFIGURATION_ERROR', 'Service configuration error.')
  }

  let incomingBody: unknown
  try {
    incomingBody = await request.json()
  } catch {
    return jsonError(400, 'INVALID_JSON', 'Request body must be valid JSON.')
  }

  const proxyRequest = await buildAiCsProxyRequest({
    action,
    incomingBody,
    user: {
      id: session.user.id,
      email: session.user.email,
    },
    secret: deps.secret,
    now: deps.now,
    nonce: deps.nonce,
  })

  // Build outbound headers: start with the signing headers (Content-Type +
  // X-Ventora-*), then merge in the forwarded Origin if the browser sent one.
  // This mirrors how ai-sdr-proxy.ts builds its Headers object.
  const outboundHeaders = new Headers(proxyRequest.headers as Record<string, string>)
  const browserOrigin = request.headers.get('origin')
  if (browserOrigin !== null) {
    outboundHeaders.set('Origin', browserOrigin)
  }

  let upstream: Response
  try {
    upstream = await deps.fetch(`${AI_CS_WORKER_BASE_URL}${workerPath}`, {
      method: 'POST',
      headers: outboundHeaders,
      body: JSON.stringify(proxyRequest.body),
    })
  } catch {
    return jsonError(502, 'UPSTREAM_FAILED', 'The AI assistant is temporarily unavailable. Please try again.')
  }

  const responseHeaders = new Headers({ 'cache-control': 'no-store' })
  for (const name of PASSTHROUGH_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name)
    if (value !== null) {
      responseHeaders.set(name, value)
    }
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}
