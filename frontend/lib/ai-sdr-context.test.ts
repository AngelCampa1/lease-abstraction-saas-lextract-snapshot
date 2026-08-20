import { describe, expect, it } from 'vitest'
import { MARKETING_KNOWLEDGE } from '@/data/public-knowledge/marketing'
import {
  AI_SDR_PRODUCT_ID,
  buildLextractProductContext,
  buildSignedContextResponse,
  verifyContextRequest,
} from './ai-sdr-context'
import { buildAssertionPayload, hmacSha256Hex } from './ai-sdr-signing'

const SECRET = 'context-secret'
const CONTEXT_URL = 'https://lextract.io/api/ai-sdr/context'

function signedRequest(opts: {
  timestamp: string
  nonce: string
  productId: string
  url?: string
  secret?: string
}): Request {
  const url = opts.url ?? CONTEXT_URL
  const { pathname, search } = new URL(url)
  const payload = buildAssertionPayload({
    timestamp: opts.timestamp,
    nonce: opts.nonce,
    method: 'GET',
    path: `${pathname}${search}`,
    body: { productId: opts.productId },
  })
  const signature = hmacSha256Hex(opts.secret ?? SECRET, payload)
  return new Request(url, {
    headers: {
      'X-Ventora-Timestamp': opts.timestamp,
      'X-Ventora-Nonce': opts.nonce,
      'X-Ventora-Signature': signature,
    },
  })
}

describe('buildLextractProductContext', () => {
  it('uses the lextract productId and product name from knowledge', () => {
    const ctx = buildLextractProductContext()
    expect(ctx.productId).toBe(AI_SDR_PRODUCT_ID)
    expect(ctx.name).toBe(MARKETING_KNOWLEDGE.product.name)
  })

  it('grounds the description in real knowledge figures (no invented claims)', () => {
    const ctx = buildLextractProductContext()
    expect(ctx.description).toContain(String(MARKETING_KNOWLEDGE.product.fieldCount))
    expect(ctx.description).toContain(`$${MARKETING_KNOWLEDGE.pricing.single.price}`)
    expect(ctx.description).toContain(MARKETING_KNOWLEDGE.pricing.supportPolicy)
    expect(ctx.description).not.toMatch(/money[- ]back|no\s+questions\s+asked/i)
  })

  it('exposes real lextract.io source URLs', () => {
    const urls = (buildLextractProductContext().sources ?? []).map((s) => s.url)
    expect(urls).toContain('https://lextract.io/')
    expect(urls).toContain('https://lextract.io/pricing')
    for (const url of urls) {
      expect(url.startsWith('https://lextract.io')).toBe(true)
    }
  })
})

describe('verifyContextRequest', () => {
  const nowMs = Date.parse('2026-06-01T00:00:00.000Z')

  it('accepts a correctly signed request', () => {
    const req = signedRequest({ timestamp: '2026-06-01T00:00:00.000Z', nonce: 'n1', productId: 'lextract' })
    expect(verifyContextRequest({ request: req, secret: SECRET, productId: 'lextract', nowMs })).toEqual({
      ok: true,
    })
  })

  it('rejects when signature headers are missing', () => {
    const req = new Request(CONTEXT_URL)
    const res = verifyContextRequest({ request: req, secret: SECRET, productId: 'lextract', nowMs })
    expect(res).toMatchObject({ ok: false, status: 401, code: 'MISSING_SIGNATURE_HEADERS' })
  })

  it('rejects a timestamp outside the skew window', () => {
    const req = signedRequest({ timestamp: '2026-06-01T01:00:00.000Z', nonce: 'n1', productId: 'lextract' })
    const res = verifyContextRequest({ request: req, secret: SECRET, productId: 'lextract', nowMs })
    expect(res).toMatchObject({ ok: false, status: 401, code: 'TIMESTAMP_SKEW' })
  })

  it('rejects an unparseable timestamp', () => {
    const req = signedRequest({ timestamp: 'not-a-date', nonce: 'n1', productId: 'lextract' })
    const res = verifyContextRequest({ request: req, secret: SECRET, productId: 'lextract', nowMs })
    expect(res).toMatchObject({ ok: false, status: 401, code: 'TIMESTAMP_SKEW' })
  })

  it('rejects an invalid signature (wrong secret)', () => {
    const req = signedRequest({
      timestamp: '2026-06-01T00:00:00.000Z',
      nonce: 'n1',
      productId: 'lextract',
      secret: 'wrong',
    })
    const res = verifyContextRequest({ request: req, secret: SECRET, productId: 'lextract', nowMs })
    expect(res).toMatchObject({ ok: false, status: 401, code: 'INVALID_SIGNATURE' })
  })

  it('rejects when the signed productId differs', () => {
    const req = signedRequest({ timestamp: '2026-06-01T00:00:00.000Z', nonce: 'n1', productId: 'other' })
    const res = verifyContextRequest({ request: req, secret: SECRET, productId: 'lextract', nowMs })
    expect(res).toMatchObject({ ok: false, status: 401, code: 'INVALID_SIGNATURE' })
  })
})

describe('buildSignedContextResponse', () => {
  it('signs the response over path + context and round-trips against the verifier formula', () => {
    const ctx = buildLextractProductContext()
    const res = buildSignedContextResponse({
      productContext: ctx,
      path: '/api/ai-sdr/context',
      secret: SECRET,
      timestamp: '2026-06-01T00:00:00.000Z',
      nonce: 'resp-nonce',
    })

    expect(JSON.parse(res.body)).toEqual(ctx)
    expect(res.headers['Cache-Control']).toBe('no-store')
    expect(res.headers['X-Ventora-Timestamp']).toBe('2026-06-01T00:00:00.000Z')

    const expectedSig = hmacSha256Hex(
      SECRET,
      buildAssertionPayload({
        timestamp: '2026-06-01T00:00:00.000Z',
        nonce: 'resp-nonce',
        method: 'GET',
        path: '/api/ai-sdr/context',
        body: ctx,
      }),
    )
    expect(res.headers['X-Ventora-Signature']).toBe(expectedSig)
  })

  it('defaults timestamp and nonce when omitted', () => {
    const res = buildSignedContextResponse({
      productContext: buildLextractProductContext(),
      path: '/api/ai-sdr/context',
      secret: SECRET,
    })
    expect(res.headers['X-Ventora-Nonce']).toMatch(/[0-9a-f-]{36}/)
    expect(Number.isNaN(Date.parse(res.headers['X-Ventora-Timestamp']))).toBe(false)
  })
})
