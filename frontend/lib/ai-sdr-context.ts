/**
 * AI-SDR Product Context for lextract.
 *
 * The `ventora-ai-sdr-worker` fetches this server-to-server (signed with
 * `AI_SDR_CONTEXT_SECRET`) when it needs lextract-specific grounding for a
 * chat turn. This module verifies the inbound worker signature and returns a
 * signed `ProductContext`. All copy is sourced verbatim from
 * `MARKETING_KNOWLEDGE` (no marketing claims are invented here).
 */

import { randomUUID } from 'node:crypto'
import { MARKETING_KNOWLEDGE } from '@/data/public-knowledge/marketing'
import {
  buildAssertionPayload,
  constantTimeEqual,
  hmacSha256Hex,
} from './ai-sdr-signing'

export const AI_SDR_PRODUCT_ID = 'lextract'

/** Maximum allowed clock skew in milliseconds (mirrors the worker verifier). */
export const MAX_CLOCK_SKEW_MS = 300_000

export interface ProductContextSource {
  id: string
  title: string
  url: string
  excerpt?: string
}

export interface ProductContext {
  productId: string
  name: string
  description?: string
  sources?: ProductContextSource[]
}

/**
 * Builds lextract's ProductContext from MARKETING_KNOWLEDGE. Every figure
 * (field count, pricing, processing time, support policy) is read from the shared
 * knowledge base so the assistant cannot drift from the public site copy.
 */
export function buildLextractProductContext(): ProductContext {
  const { product, pricing, processing } = MARKETING_KNOWLEDGE

  const description =
    `${product.oneLine} ${product.name} extracts ${product.fieldCount} structured fields ` +
    `across ${product.categoryCount} categories with confidence scores and ${product.redFlagCount} red-flag checks. ` +
    `Pricing is $${pricing.single.price} for a single lease, $${pricing.pack5.price} for ${pricing.pack5.credits} credits, ` +
    `and $${pricing.pack10.price} for ${pricing.pack10.credits} credits, with no subscription. ${pricing.supportPolicy} ` +
    `Results ${processing.detailed}.`

  return {
    productId: AI_SDR_PRODUCT_ID,
    name: product.name,
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
    ],
  }
}

export type VerifyContextResult =
  | { ok: true }
  | { ok: false; status: 400 | 401; code: string; message: string }

export interface VerifyContextInput {
  request: Request
  secret: string
  productId: string
  nowMs: number
}

/**
 * Verifies the worker's signed GET request for product context. The worker
 * signs over `{ productId }` with method GET and path = pathname + search.
 */
export function verifyContextRequest(input: VerifyContextInput): VerifyContextResult {
  const { request, secret, productId, nowMs } = input

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

  const payload = buildAssertionPayload({
    timestamp,
    nonce,
    method: 'GET',
    path,
    body: { productId },
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

export interface SignedContextResponse {
  body: string
  headers: Record<string, string>
}

export interface BuildSignedContextInput {
  productContext: ProductContext
  path: string
  secret: string
  timestamp?: string
  nonce?: string
}

/**
 * Signs the ProductContext response over the same path (pathname + search)
 * using a fresh response timestamp/nonce so the worker can verify integrity.
 */
export function buildSignedContextResponse(input: BuildSignedContextInput): SignedContextResponse {
  const responseTimestamp = input.timestamp ?? new Date().toISOString()
  const responseNonce = input.nonce ?? randomUUID()

  const payload = buildAssertionPayload({
    timestamp: responseTimestamp,
    nonce: responseNonce,
    method: 'GET',
    path: input.path,
    body: input.productContext,
  })
  const signature = hmacSha256Hex(input.secret, payload)

  return {
    body: JSON.stringify(input.productContext),
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Ventora-Timestamp': responseTimestamp,
      'X-Ventora-Nonce': responseNonce,
      'X-Ventora-Signature': signature,
    },
  }
}
