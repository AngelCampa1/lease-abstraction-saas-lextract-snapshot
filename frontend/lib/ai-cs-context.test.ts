/**
 * @vitest-environment node
 *
 * Tests for the AI-CS signed app-context endpoint library.
 * The Ventora AI-CS Worker calls GET /api/ai-cs/context?appId=lextract&userId=…
 * signed with AI_CS_CONTEXT_SECRET over { appId, userId }. This suite verifies
 * the request-verification and response-signing logic independently of Next.js.
 */

import { describe, expect, it } from 'vitest'
import { MARKETING_KNOWLEDGE } from '@/data/public-knowledge/marketing'
import {
  AI_CS_APP_ID,
  buildLextractAppContext,
  buildSignedContextResponse,
  MAX_CLOCK_SKEW_MS,
  verifyContextRequest,
} from './ai-cs-context'
import { buildAssertionPayload, hmacSha256Hex } from './ai-sdr-signing'

const SECRET = 'test-ai-cs-context-secret'
const BASE_URL = 'https://lextract.io/api/ai-cs/context'

/**
 * Builds a signed inbound GET request the way the AI-CS worker would sign it:
 * signs over { appId, userId } with GET and full pathname+search.
 */
function makeSignedRequest(opts: {
  timestamp: string
  nonce: string
  appId: string
  userId: string
  url?: string
  secret?: string
}): Request {
  const urlStr = opts.url ?? `${BASE_URL}?appId=${opts.appId}&userId=${opts.userId}`
  const { pathname, search } = new URL(urlStr)
  const path = `${pathname}${search}`
  const payload = buildAssertionPayload({
    timestamp: opts.timestamp,
    nonce: opts.nonce,
    method: 'GET',
    path,
    body: { appId: opts.appId, userId: opts.userId },
  })
  const signature = hmacSha256Hex(opts.secret ?? SECRET, payload)
  return new Request(urlStr, {
    headers: {
      'X-Ventora-Timestamp': opts.timestamp,
      'X-Ventora-Nonce': opts.nonce,
      'X-Ventora-Signature': signature,
    },
  })
}

const NOW_MS = Date.parse('2026-06-01T00:00:00.000Z')
const VALID_TS = '2026-06-01T00:00:00.000Z'
const VALID_NONCE = 'test-nonce-001'

describe('buildLextractAppContext', () => {
  it('has assistantId ai-cs, appId lextract, and authenticatedOnly true', () => {
    const ctx = buildLextractAppContext()
    expect(ctx.assistantId).toBe('ai-cs')
    expect(ctx.appId).toBe(AI_CS_APP_ID)
    expect(ctx.appId).toBe('lextract')
    expect(ctx.authenticatedOnly).toBe(true)
  })

  it('appName matches the knowledge-base product name', () => {
    const ctx = buildLextractAppContext()
    expect(ctx.appName).toBe(MARKETING_KNOWLEDGE.product.name)
  })

  it('description is grounded in real knowledge figures', () => {
    const ctx = buildLextractAppContext()
    expect(ctx.description).toBeDefined()
    expect(ctx.description).toContain(String(MARKETING_KNOWLEDGE.product.fieldCount))
    expect(ctx.description).toContain(`$${MARKETING_KNOWLEDGE.pricing.single.price}`)
    expect(ctx.description).toContain(MARKETING_KNOWLEDGE.pricing.supportPolicy)
    expect(ctx.description).not.toMatch(/money[- ]back|no\s+questions\s+asked/i)
  })

  it('sources are real lextract.io URLs', () => {
    const ctx = buildLextractAppContext()
    expect(ctx.sources).toBeDefined()
    expect((ctx.sources ?? []).length).toBeGreaterThan(0)
    for (const source of ctx.sources ?? []) {
      expect(source.url.startsWith('https://lextract.io')).toBe(true)
      expect(source.id).toBeTruthy()
      expect(source.title).toBeTruthy()
    }
  })

  it('does not contain any secret or credential-like values', () => {
    const serialized = JSON.stringify(buildLextractAppContext())
    expect(serialized).not.toMatch(/secret/i)
    expect(serialized).not.toMatch(/password/i)
    expect(serialized).not.toMatch(/api[_-]?key/i)
  })
})

describe('verifyContextRequest', () => {
  it('rejects when X-Ventora-Timestamp is missing', () => {
    const req = new Request(`${BASE_URL}?appId=lextract&userId=u1`, {
      headers: { 'X-Ventora-Nonce': 'n1', 'X-Ventora-Signature': 'abc' },
    })
    const result = verifyContextRequest({ request: req, secret: SECRET, appId: 'lextract', nowMs: NOW_MS })
    expect(result).toMatchObject({ ok: false, status: 401, code: 'MISSING_SIGNATURE_HEADERS' })
  })

  it('rejects when X-Ventora-Nonce is missing', () => {
    const req = new Request(`${BASE_URL}?appId=lextract&userId=u1`, {
      headers: { 'X-Ventora-Timestamp': VALID_TS, 'X-Ventora-Signature': 'abc' },
    })
    const result = verifyContextRequest({ request: req, secret: SECRET, appId: 'lextract', nowMs: NOW_MS })
    expect(result).toMatchObject({ ok: false, status: 401, code: 'MISSING_SIGNATURE_HEADERS' })
  })

  it('rejects when X-Ventora-Signature is missing', () => {
    const req = new Request(`${BASE_URL}?appId=lextract&userId=u1`, {
      headers: { 'X-Ventora-Timestamp': VALID_TS, 'X-Ventora-Nonce': 'n1' },
    })
    const result = verifyContextRequest({ request: req, secret: SECRET, appId: 'lextract', nowMs: NOW_MS })
    expect(result).toMatchObject({ ok: false, status: 401, code: 'MISSING_SIGNATURE_HEADERS' })
  })

  it('rejects when all three headers are absent', () => {
    const req = new Request(`${BASE_URL}?appId=lextract&userId=u1`)
    const result = verifyContextRequest({ request: req, secret: SECRET, appId: 'lextract', nowMs: NOW_MS })
    expect(result).toMatchObject({ ok: false, status: 401, code: 'MISSING_SIGNATURE_HEADERS' })
  })

  it('rejects a timestamp that is too far in the past', () => {
    const pastTs = new Date(NOW_MS - MAX_CLOCK_SKEW_MS - 1).toISOString()
    const req = makeSignedRequest({ timestamp: pastTs, nonce: VALID_NONCE, appId: 'lextract', userId: 'u1' })
    const result = verifyContextRequest({ request: req, secret: SECRET, appId: 'lextract', nowMs: NOW_MS })
    expect(result).toMatchObject({ ok: false, status: 401, code: 'TIMESTAMP_SKEW' })
  })

  it('rejects a timestamp that is too far in the future', () => {
    const futureTs = new Date(NOW_MS + MAX_CLOCK_SKEW_MS + 1).toISOString()
    const req = makeSignedRequest({ timestamp: futureTs, nonce: VALID_NONCE, appId: 'lextract', userId: 'u1' })
    const result = verifyContextRequest({ request: req, secret: SECRET, appId: 'lextract', nowMs: NOW_MS })
    expect(result).toMatchObject({ ok: false, status: 401, code: 'TIMESTAMP_SKEW' })
  })

  it('rejects an unparseable timestamp', () => {
    const req = new Request(`${BASE_URL}?appId=lextract&userId=u1`, {
      headers: {
        'X-Ventora-Timestamp': 'not-a-date',
        'X-Ventora-Nonce': VALID_NONCE,
        'X-Ventora-Signature': 'a'.repeat(64),
      },
    })
    const result = verifyContextRequest({ request: req, secret: SECRET, appId: 'lextract', nowMs: NOW_MS })
    expect(result).toMatchObject({ ok: false, status: 401, code: 'TIMESTAMP_SKEW' })
  })

  it('rejects a valid-timestamp request with the wrong secret', () => {
    const req = makeSignedRequest({
      timestamp: VALID_TS,
      nonce: VALID_NONCE,
      appId: 'lextract',
      userId: 'u1',
      secret: 'wrong-secret',
    })
    const result = verifyContextRequest({ request: req, secret: SECRET, appId: 'lextract', nowMs: NOW_MS })
    expect(result).toMatchObject({ ok: false, status: 401, code: 'INVALID_SIGNATURE' })
  })

  it('accepts a correctly signed request for a different appId (appId routing is the route layer concern)', () => {
    // The worker signs { appId, userId } where appId comes from the session.
    // verifyContextRequest validates signature integrity only. The route is
    // responsible for rejecting unknown appIds before or after calling this.
    const req = makeSignedRequest({ timestamp: VALID_TS, nonce: VALID_NONCE, appId: 'other-app', userId: 'u1' })
    const result = verifyContextRequest({ request: req, secret: SECRET, appId: 'other-app', nowMs: NOW_MS })
    expect(result).toEqual({ ok: true })
  })

  it('accepts a correctly signed request', () => {
    const req = makeSignedRequest({ timestamp: VALID_TS, nonce: VALID_NONCE, appId: 'lextract', userId: 'u1' })
    const result = verifyContextRequest({ request: req, secret: SECRET, appId: 'lextract', nowMs: NOW_MS })
    expect(result).toEqual({ ok: true })
  })

  it('accepts a request at exactly the edge of the skew window', () => {
    const edgeTs = new Date(NOW_MS - MAX_CLOCK_SKEW_MS).toISOString()
    const req = makeSignedRequest({ timestamp: edgeTs, nonce: VALID_NONCE, appId: 'lextract', userId: 'u1' })
    const result = verifyContextRequest({ request: req, secret: SECRET, appId: 'lextract', nowMs: NOW_MS })
    expect(result).toEqual({ ok: true })
  })

  it('rejects when appId and userId query params are absent (falls back to empty strings, signature mismatch)', () => {
    // A URL with no query params means appId='', userId=''. The worker would
    // always include them, but a malformed request without them should fail
    // signature verification because the body hash will not match.
    const req = makeSignedRequest({ timestamp: VALID_TS, nonce: VALID_NONCE, appId: 'lextract', userId: 'u1' })
    // Re-construct the request without query params so searchParams return null
    const urlNoParams = new URL(req.url)
    urlNoParams.searchParams.delete('appId')
    urlNoParams.searchParams.delete('userId')
    const reqNoParams = new Request(urlNoParams.toString(), {
      headers: {
        'X-Ventora-Timestamp': req.headers.get('X-Ventora-Timestamp') ?? '',
        'X-Ventora-Nonce': req.headers.get('X-Ventora-Nonce') ?? '',
        'X-Ventora-Signature': req.headers.get('X-Ventora-Signature') ?? '',
      },
    })
    const result = verifyContextRequest({ request: reqNoParams, secret: SECRET, appId: 'lextract', nowMs: NOW_MS })
    expect(result).toMatchObject({ ok: false, status: 401, code: 'INVALID_SIGNATURE' })
  })
})

describe('buildSignedContextResponse', () => {
  it('includes Cache-Control no-store header', () => {
    const ctx = buildLextractAppContext()
    const res = buildSignedContextResponse({
      appContext: ctx,
      path: '/api/ai-cs/context?appId=lextract&userId=u1',
      secret: SECRET,
      timestamp: VALID_TS,
      nonce: 'resp-nonce',
    })
    expect(res.headers['Cache-Control']).toBe('no-store')
  })

  it('body deserializes to the AiCsAppContext object', () => {
    const ctx = buildLextractAppContext()
    const res = buildSignedContextResponse({
      appContext: ctx,
      path: '/api/ai-cs/context?appId=lextract&userId=u1',
      secret: SECRET,
      timestamp: VALID_TS,
      nonce: 'resp-nonce',
    })
    expect(JSON.parse(res.body)).toEqual(ctx)
  })

  it('response signature verifies against the same payload formula the worker uses', () => {
    const ctx = buildLextractAppContext()
    const path = '/api/ai-cs/context?appId=lextract&userId=u1'
    const res = buildSignedContextResponse({
      appContext: ctx,
      path,
      secret: SECRET,
      timestamp: VALID_TS,
      nonce: 'resp-nonce',
    })

    const expectedSig = hmacSha256Hex(
      SECRET,
      buildAssertionPayload({
        timestamp: VALID_TS,
        nonce: 'resp-nonce',
        method: 'GET',
        path,
        body: ctx,
      }),
    )
    expect(res.headers['X-Ventora-Timestamp']).toBe(VALID_TS)
    expect(res.headers['X-Ventora-Nonce']).toBe('resp-nonce')
    expect(res.headers['X-Ventora-Signature']).toBe(expectedSig)
  })

  it('defaults timestamp and nonce when not supplied', () => {
    const ctx = buildLextractAppContext()
    const res = buildSignedContextResponse({
      appContext: ctx,
      path: '/api/ai-cs/context?appId=lextract&userId=u1',
      secret: SECRET,
    })
    expect(Number.isNaN(Date.parse(res.headers['X-Ventora-Timestamp']))).toBe(false)
    expect(res.headers['X-Ventora-Nonce']).toMatch(/[0-9a-f-]{36}/)
  })

  it('response does not include any secrets', () => {
    const ctx = buildLextractAppContext()
    const res = buildSignedContextResponse({
      appContext: ctx,
      path: '/api/ai-cs/context?appId=lextract&userId=u1',
      secret: SECRET,
    })
    expect(res.body).not.toContain(SECRET)
    expect(res.body).not.toMatch(/secret/i)
  })
})
