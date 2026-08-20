/**
 * Shared HMAC signing primitives for the Ventora AI-SDR integration.
 *
 * lextract runs on Cloudflare Workers with `nodejs_compat`, so `node:crypto`
 * is available in route handlers. These helpers stay byte-compatible with the
 * `ventora-ai-sdr-worker` verifier (and with `@ventora/ai-assistant-contracts`
 * `buildHmacPayload` / `signHmacPayload`).
 *
 * Wire contract (must not drift):
 *   payload   = `${timestamp}.${nonce}.${METHOD}.${path}.${sha256Hex(stableJson(body))}`
 *   signature = hmacSha256Hex(secret, payload)   // 64-char lowercase hex
 *   stableJson = JSON.stringify with object keys sorted by UTF-16 code unit
 *                (default Array.prototype.sort), `undefined` children omitted,
 *                arrays preserved in order.
 */

import { createHash, createHmac, randomUUID } from 'node:crypto'

export interface AssertionPayloadInput {
  timestamp: string
  nonce: string
  method: string
  path: string
  body: unknown
}

export interface ClientAssertion {
  timestamp: string
  nonce: string
  signature: string
}

export interface SignClientAssertionInput {
  method: string
  path: string
  body: unknown
  secret: string
  /** Defaults to `new Date().toISOString()`. */
  timestamp?: string
  /** Defaults to `randomUUID()`. */
  nonce?: string
}

/**
 * Deterministic JSON serialization: object keys sorted recursively by UTF-16
 * code unit, `undefined` values dropped, arrays kept in order.
 */
export function stableJson(value: unknown): string {
  return JSON.stringify(sortStable(toStableJsonValue(value)))
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

export function hmacSha256Hex(secret: string, message: string): string {
  return createHmac('sha256', secret).update(message).digest('hex')
}

export function buildAssertionPayload(input: AssertionPayloadInput): string {
  const bodyHash = sha256Hex(stableJson(input.body))
  return `${input.timestamp}.${input.nonce}.${input.method.toUpperCase()}.${input.path}.${bodyHash}`
}

export function signClientAssertion(input: SignClientAssertionInput): ClientAssertion {
  const timestamp = input.timestamp ?? new Date().toISOString()
  const nonce = input.nonce ?? randomUUID()
  const payload = buildAssertionPayload({
    timestamp,
    nonce,
    method: input.method,
    path: input.path,
    body: input.body,
  })
  return {
    timestamp,
    nonce,
    signature: hmacSha256Hex(input.secret, payload),
  }
}

/** Builds the HTTP headers the AI-SDR worker expects for a signed request. */
export function assertionHeaders(assertion: ClientAssertion): Record<string, string> {
  return {
    'X-Ventora-Timestamp': assertion.timestamp,
    'X-Ventora-Nonce': assertion.nonce,
    'X-Ventora-Signature': assertion.signature,
  }
}

/**
 * Constant-time string comparison that does NOT early-return on content
 * mismatch. Unequal lengths return false without comparing content.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toStableJsonValue(
  value: unknown,
): null | boolean | number | string | unknown[] | Record<string, unknown> {
  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'string'
  ) {
    return value
  }
  if (Array.isArray(value)) {
    return value.map(toStableJsonValue)
  }
  if (isRecord(value)) {
    const result: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value)) {
      if (child !== undefined) {
        result[key] = toStableJsonValue(child)
      }
    }
    return result
  }
  return null
}

function sortStable(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortStable)
  }
  if (!isRecord(value)) {
    return value
  }
  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(value).sort()) {
    sorted[key] = sortStable(value[key])
  }
  return sorted
}
