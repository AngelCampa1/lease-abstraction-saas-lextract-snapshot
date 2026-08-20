/**
 * Request handlers for the lextract AI-SDR BFF and context endpoint.
 *
 * Kept in `lib/` (covered by tests) so the `app/api/ai-sdr/**` route files are
 * trivially thin wrappers. The BFF is public (no auth) but same-origin guarded;
 * the context endpoint verifies the worker's HMAC signature.
 */

import {
  AI_SDR_PRODUCT_ID,
  buildLextractProductContext,
  buildSignedContextResponse,
  verifyContextRequest,
} from './ai-sdr-context'
import {
  type AiSdrProxyEnv,
  aiSdrUnconfiguredResponse,
  jsonError,
  proxyToWorker,
  resolveWorkerConfig,
  validateAiSdrAction,
} from './ai-sdr-proxy'

export interface BffHandlerInput {
  action: string
  request: Request
  env: AiSdrProxyEnv
  now?: () => Date
  nonce?: () => string
}

/**
 * Same-origin guard: reject browser requests whose Origin header does not match
 * the request URL's own origin, so the signing BFF can't be used as an oracle
 * by another site. Requests with no Origin (server-to-server) are allowed; the
 * worker still enforces its own assertion + origin allowlist.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (origin === null) {
    return true
  }
  return origin === new URL(request.url).origin
}

function normalizeBody(action: string, incoming: unknown): Record<string, unknown> {
  const body =
    typeof incoming === 'object' && incoming !== null && !Array.isArray(incoming)
      ? (incoming as Record<string, unknown>)
      : {}
  if (action === 'sessions') {
    // Force the productId server-side so a visitor can't redirect the worker to
    // another product's context endpoint via a spoofed body.
    return { ...body, productId: AI_SDR_PRODUCT_ID }
  }
  return body
}

export async function handleAiSdrBffRequest(input: BffHandlerInput): Promise<Response> {
  const { action, request, env } = input

  const workerPath = validateAiSdrAction(action)
  if (workerPath === null) {
    return jsonError(404, 'NOT_FOUND', 'Unknown AI-SDR action.')
  }

  if (!isSameOrigin(request)) {
    return jsonError(403, 'FORBIDDEN_ORIGIN', 'Cross-origin requests are not allowed.')
  }

  let incoming: unknown
  try {
    incoming = await request.json()
  } catch {
    return jsonError(400, 'INVALID_JSON', 'Request body must be valid JSON.')
  }

  const config = resolveWorkerConfig(env)
  if (config === null) {
    return aiSdrUnconfiguredResponse()
  }

  return proxyToWorker({
    config,
    workerPath,
    body: normalizeBody(action, incoming),
    origin: new URL(request.url).origin,
    now: input.now,
    nonce: input.nonce,
  })
}

export interface ContextHandlerInput {
  request: Request
  env: { AI_SDR_CONTEXT_SECRET?: string }
  nowMs?: number
  timestamp?: string
  nonce?: string
}

export function handleAiSdrContextRequest(input: ContextHandlerInput): Response {
  const secret = input.env.AI_SDR_CONTEXT_SECRET?.trim()
  if (!secret) {
    return aiSdrUnconfiguredResponse()
  }

  const verification = verifyContextRequest({
    request: input.request,
    secret,
    productId: AI_SDR_PRODUCT_ID,
    nowMs: input.nowMs ?? Date.now(),
  })
  if (!verification.ok) {
    return jsonError(verification.status, verification.code, verification.message)
  }

  const url = new URL(input.request.url)
  const signed = buildSignedContextResponse({
    productContext: buildLextractProductContext(),
    path: `${url.pathname}${url.search}`,
    secret,
    timestamp: input.timestamp,
    nonce: input.nonce,
  })

  return new Response(signed.body, { status: 200, headers: signed.headers })
}
