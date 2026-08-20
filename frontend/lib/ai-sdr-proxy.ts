/**
 * Server-side BFF for the Ventora AI-SDR worker.
 *
 * lextract's marketing site is PUBLIC (no auth). The browser widget posts to
 * same-origin `/api/ai-sdr/v1/{sessions,chat,handoff}`; these handlers sign a
 * short-lived HMAC client assertion server-side and forward to the worker so
 * the assertion secret never reaches the browser. The worker enforces an
 * Origin allowlist, so the BFF forwards this site's own Origin.
 */

import { assertionHeaders, signClientAssertion } from './ai-sdr-signing'

/** Worker-side paths mirrored under `/api/ai-sdr/v1/*`. */
export const AI_SDR_WORKER_PATHS = {
  sessions: '/v1/sessions',
  chat: '/v1/chat',
  handoff: '/v1/handoff',
} as const

export type AiSdrAction = keyof typeof AI_SDR_WORKER_PATHS
export type AiSdrWorkerPath = (typeof AI_SDR_WORKER_PATHS)[AiSdrAction]

export interface AiSdrWorkerConfig {
  baseUrl: string
  secret: string
}

export interface AiSdrProxyEnv {
  AI_SDR_WORKER_URL?: string
  AI_SDR_CLIENT_ASSERTION_SECRET?: string
}

/** Maps a route action segment to its worker path, or null if unsupported. */
export function validateAiSdrAction(action: string): AiSdrWorkerPath | null {
  return isAiSdrAction(action) ? AI_SDR_WORKER_PATHS[action] : null
}

/**
 * Resolves and validates the worker URL + assertion secret. Returns `null`
 * when the integration is not configured (callers respond 503).
 */
export function resolveWorkerConfig(env: AiSdrProxyEnv): AiSdrWorkerConfig | null {
  const rawUrl = env.AI_SDR_WORKER_URL?.trim()
  const secret = env.AI_SDR_CLIENT_ASSERTION_SECRET?.trim()

  if (!rawUrl || !secret) {
    return null
  }

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return null
  }

  if (parsed.protocol !== 'https:') {
    return null
  }

  return { baseUrl: rawUrl.replace(/\/+$/, ''), secret }
}

const PASSTHROUGH_RESPONSE_HEADERS = ['content-type', 'retry-after']

export interface ProxyToWorkerInput {
  config: AiSdrWorkerConfig
  workerPath: AiSdrWorkerPath
  body: unknown
  /** This site's own origin; must be in the worker's AI_SDR_ALLOWED_ORIGINS. */
  origin: string
  now?: () => Date
  nonce?: () => string
}

/**
 * Signs a client assertion for `body` against `workerPath` and forwards the
 * request to the AI-SDR worker. Streams the upstream body back unbuffered so
 * Server-Sent Events from `/v1/chat` reach the browser live. Network failures
 * map to a 502.
 */
export async function proxyToWorker(input: ProxyToWorkerInput): Promise<Response> {
  const { config, workerPath, body, origin } = input
  const serializedBody = JSON.stringify(body)

  const assertion = signClientAssertion({
    method: 'POST',
    path: workerPath,
    body,
    secret: config.secret,
    timestamp: input.now ? input.now().toISOString() : undefined,
    nonce: input.nonce ? input.nonce() : undefined,
  })

  const headers = new Headers({
    'content-type': 'application/json',
    Origin: origin,
    ...assertionHeaders(assertion),
  })

  let upstream: Response
  try {
    upstream = await fetch(`${config.baseUrl}${workerPath}`, {
      method: 'POST',
      headers,
      body: serializedBody,
    })
  } catch {
    return aiSdrUpstreamFailedResponse()
  }

  const responseHeaders = new Headers({ 'Cache-Control': 'no-store' })
  for (const name of PASSTHROUGH_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name)
    if (value) {
      responseHeaders.set(name, value)
    }
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}

export function aiSdrUnconfiguredResponse(): Response {
  return jsonError(503, 'AI_SDR_UNCONFIGURED', 'The AI assistant is not configured for this environment.')
}

export function aiSdrUpstreamFailedResponse(): Response {
  return jsonError(502, 'AI_SDR_UPSTREAM_FAILED', 'The AI assistant is temporarily unavailable. Please try again.')
}

export function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { 'content-type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

function isAiSdrAction(action: string): action is AiSdrAction {
  return Object.hasOwn(AI_SDR_WORKER_PATHS, action)
}
