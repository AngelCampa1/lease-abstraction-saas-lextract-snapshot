/**
 * AI-CS App Context for lextract.
 *
 * The `ventora-ai-cs-worker` fetches this endpoint server-to-server (signed
 * with `AI_CS_CONTEXT_SECRET`) when it needs lextract-specific grounding for
 * an authenticated support chat turn. This module:
 *   1. Verifies the inbound HMAC signature the worker placed on GET
 *      /api/ai-cs/context?appId=lextract&userId=<id>&[currentPath=…].
 *   2. Returns a signed `AiCsAppContext` describing lextract's help surface.
 *
 * Worker→lextract request contract (confirmed from ai-cs-worker source):
 *   Method:  GET
 *   URL:     <endpoint>?appId=<appId>&userId=<userId>[&currentPath=<path>]
 *   Body hashed (for HMAC): { appId: string; userId: string }
 *   Path signed: pathname + full search string (includes ?appId&userId…)
 *   Headers: X-Ventora-Timestamp, X-Ventora-Nonce, X-Ventora-Signature
 *   Secret:  AI_CS_CONTEXT_SECRET
 *
 * Response contract: JSON `AiCsAppContext` plus the same three X-Ventora-*
 * headers so the worker can verify response integrity.
 *
 * All copy is sourced verbatim from `MARKETING_KNOWLEDGE`. No marketing claims
 * are invented here.
 */

import { randomUUID } from 'node:crypto'
import { MARKETING_KNOWLEDGE } from '@/data/public-knowledge/marketing'
import {
  buildAssertionPayload,
  constantTimeEqual,
  hmacSha256Hex,
} from './ai-sdr-signing'

export const AI_CS_APP_ID = 'lextract'

/** Maximum allowed clock skew in milliseconds (mirrors the worker verifier). */
export const MAX_CLOCK_SKEW_MS = 300_000

// ---------------------------------------------------------------------------
// AiCsAppContext: local interface that mirrors the worker contract.
// Do NOT import from @ventora/* (not installed in lextract yet).
// ---------------------------------------------------------------------------

export interface AiCsContextSource {
  id: string
  title: string
  url: string
  excerpt?: string
}

export interface AiCsAppContext {
  assistantId: 'ai-cs'
  appId: string
  appName: string
  authenticatedOnly: true
  description?: string
  sources?: AiCsContextSource[]
}

/**
 * Builds lextract's AiCsAppContext from MARKETING_KNOWLEDGE. Every figure
 * (field count, pricing, processing time, support policy) is read from the shared
 * knowledge base so the assistant cannot drift from the public site copy.
 */
export function buildLextractAppContext(): AiCsAppContext {
  const { product, pricing, processing } = MARKETING_KNOWLEDGE

  const description =
    `${product.oneLine} ${product.name} extracts ${product.fieldCount} structured fields ` +
    `across ${product.categoryCount} categories with confidence scores and ${product.redFlagCount} red-flag checks. ` +
    `Pricing is $${pricing.single.price} for a single lease, $${pricing.pack5.price} for ${pricing.pack5.credits} credits, ` +
    `and $${pricing.pack10.price} for ${pricing.pack10.credits} credits, with no subscription. ${pricing.supportPolicy} ` +
    `Results ${processing.detailed}.`

  return {
    assistantId: 'ai-cs',
    appId: AI_CS_APP_ID,
    appName: product.name,
    authenticatedOnly: true,
    description,
    sources: [
      {
        id: 'home',
        title: `${product.name}: ${product.category}`,
        url: 'https://lextract.io/',
        excerpt: product.oneLine,
      },
      {
        id: 'pricing',
        title: `${product.name} Pricing`,
        url: 'https://lextract.io/pricing',
        excerpt:
          `$${pricing.single.price} per lease, $${pricing.pack5.price} for ${pricing.pack5.credits} (${pricing.pack5.savings}), ` +
          `$${pricing.pack10.price} for ${pricing.pack10.credits} (${pricing.pack10.savings}). ${pricing.supportPolicy}`,
      },
      {
        id: 'sample-report',
        title: 'Sample Lease Abstract',
        url: 'https://lextract.io/sample-report',
        excerpt: `${product.fieldCount} structured fields with confidence scores, exportable to ${product.exports.join(', ')}.`,
      },
      {
        id: 'upload',
        title: 'Upload Your First Lease',
        url: 'https://lextract.io/upload',
        excerpt: `Upload a commercial lease PDF and receive results ${processing.detailed}.`,
      },
      {
        id: 'faq',
        title: `${product.name} FAQ`,
        url: 'https://lextract.io/faq',
        excerpt: MARKETING_KNOWLEDGE.faqs.map((f) => f.shortAnswer).join(' '),
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// Inbound-request verification
// ---------------------------------------------------------------------------

export type VerifyContextResult =
  | { ok: true }
  | { ok: false; status: 400 | 401; code: string; message: string }

export interface VerifyContextInput {
  request: Request
  secret: string
  appId: string
  nowMs: number
}

/**
 * Verifies the AI-CS worker's signed GET request for app context.
 *
 * The worker signs over `{ appId, userId }` with method GET and path =
 * pathname + search (which includes the ?appId and ?userId query params it
 * appended before fetching). Both parts must match for the HMAC to validate.
 */
export function verifyContextRequest(input: VerifyContextInput): VerifyContextResult {
  const { request, secret, nowMs } = input

  const timestamp = request.headers.get('X-Ventora-Timestamp')
  const nonce = request.headers.get('X-Ventora-Nonce')
  const signature = request.headers.get('X-Ventora-Signature')

  if (!timestamp || !nonce || !signature) {
    return {
      ok: false,
      status: 401,
      code: 'MISSING_SIGNATURE_HEADERS',
      message: 'X-Ventora-Timestamp, X-Ventora-Nonce, and X-Ventora-Signature are required.',
    }
  }

  const parsedTs = Date.parse(timestamp)
  if (Number.isNaN(parsedTs) || Math.abs(nowMs - parsedTs) > MAX_CLOCK_SKEW_MS) {
    return {
      ok: false,
      status: 401,
      code: 'TIMESTAMP_SKEW',
      message: 'Request timestamp is outside the acceptable window.',
    }
  }

  const url = new URL(request.url)
  const path = `${url.pathname}${url.search}`

  // The worker sets ?appId=<appId>&userId=<userId>[&currentPath=…] before
  // signing, so we read those values back from the URL.
  const appId = url.searchParams.get('appId') ?? ''
  const userId = url.searchParams.get('userId') ?? ''

  const payload = buildAssertionPayload({
    timestamp,
    nonce,
    method: 'GET',
    path,
    body: { appId, userId },
  })
  const expected = hmacSha256Hex(secret, payload)

  if (!constantTimeEqual(expected, signature)) {
    return {
      ok: false,
      status: 401,
      code: 'INVALID_SIGNATURE',
      message: 'Request signature is invalid.',
    }
  }

  return { ok: true }
}

// ---------------------------------------------------------------------------
// Response signing
// ---------------------------------------------------------------------------

export interface SignedContextResponse {
  body: string
  headers: Record<string, string>
}

export interface BuildSignedContextInput {
  appContext: AiCsAppContext
  path: string
  secret: string
  timestamp?: string
  nonce?: string
}

/**
 * Signs the AiCsAppContext response over the same path (pathname + search)
 * using a fresh response timestamp/nonce so the worker can verify integrity.
 * The worker verifies the response with the same HMAC formula as the request.
 */
export function buildSignedContextResponse(input: BuildSignedContextInput): SignedContextResponse {
  const responseTimestamp = input.timestamp ?? new Date().toISOString()
  const responseNonce = input.nonce ?? randomUUID()

  const payload = buildAssertionPayload({
    timestamp: responseTimestamp,
    nonce: responseNonce,
    method: 'GET',
    path: input.path,
    body: input.appContext,
  })
  const signature = hmacSha256Hex(input.secret, payload)

  return {
    body: JSON.stringify(input.appContext),
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Ventora-Timestamp': responseTimestamp,
      'X-Ventora-Nonce': responseNonce,
      'X-Ventora-Signature': signature,
    },
  }
}
