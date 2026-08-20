import { createHash, createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  assertionHeaders,
  buildAssertionPayload,
  constantTimeEqual,
  hmacSha256Hex,
  sha256Hex,
  signClientAssertion,
  stableJson,
} from './ai-sdr-signing'

const SECRET = 'test-secret-value'

describe('stableJson', () => {
  it('sorts object keys by UTF-16 code unit recursively', () => {
    expect(stableJson({ b: 1, a: 2, c: { z: 1, a: 2 } })).toBe('{"a":2,"b":1,"c":{"a":2,"z":1}}')
  })

  it('omits undefined values but keeps null', () => {
    expect(stableJson({ a: undefined, b: null, c: 1 })).toBe('{"b":null,"c":1}')
  })

  it('preserves array order and sorts nested objects', () => {
    expect(stableJson({ list: [{ b: 1, a: 2 }, 3] })).toBe('{"list":[{"a":2,"b":1},3]}')
  })

  it('passes primitives through', () => {
    expect(stableJson('x')).toBe('"x"')
    expect(stableJson(5)).toBe('5')
    expect(stableJson(true)).toBe('true')
    expect(stableJson(null)).toBe('null')
  })

  it('coerces unsupported values (functions) to null', () => {
    expect(stableJson(() => undefined)).toBe('null')
  })
})

describe('sha256Hex / hmacSha256Hex', () => {
  it('matches node:crypto digests', () => {
    expect(sha256Hex('hello')).toBe(createHash('sha256').update('hello').digest('hex'))
    expect(hmacSha256Hex(SECRET, 'msg')).toBe(
      createHmac('sha256', SECRET).update('msg').digest('hex'),
    )
  })

  it('produces 64-char lowercase hex', () => {
    expect(hmacSha256Hex(SECRET, 'msg')).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('buildAssertionPayload', () => {
  it('builds the canonical payload with uppercased method and body hash', () => {
    const payload = buildAssertionPayload({
      timestamp: '2026-06-01T00:00:00.000Z',
      nonce: 'n-1',
      method: 'post',
      path: '/v1/sessions',
      body: { productId: 'lextract' },
    })
    const hash = createHash('sha256').update('{"productId":"lextract"}').digest('hex')
    expect(payload).toBe(`2026-06-01T00:00:00.000Z.n-1.POST./v1/sessions.${hash}`)
  })
})

describe('signClientAssertion', () => {
  it('signs deterministically when timestamp and nonce are provided', () => {
    const assertion = signClientAssertion({
      method: 'POST',
      path: '/v1/chat',
      body: { message: 'hi' },
      secret: SECRET,
      timestamp: '2026-06-01T00:00:00.000Z',
      nonce: 'fixed-nonce',
    })
    const expectedPayload = buildAssertionPayload({
      timestamp: '2026-06-01T00:00:00.000Z',
      nonce: 'fixed-nonce',
      method: 'POST',
      path: '/v1/chat',
      body: { message: 'hi' },
    })
    expect(assertion.timestamp).toBe('2026-06-01T00:00:00.000Z')
    expect(assertion.nonce).toBe('fixed-nonce')
    expect(assertion.signature).toBe(hmacSha256Hex(SECRET, expectedPayload))
  })

  it('defaults timestamp and nonce when omitted', () => {
    const assertion = signClientAssertion({ method: 'POST', path: '/v1/handoff', body: {}, secret: SECRET })
    expect(assertion.nonce).toMatch(/[0-9a-f-]{36}/)
    expect(Number.isNaN(Date.parse(assertion.timestamp))).toBe(false)
    expect(assertion.signature).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('assertionHeaders', () => {
  it('maps an assertion to the three X-Ventora headers', () => {
    expect(
      assertionHeaders({ timestamp: 't', nonce: 'n', signature: 's' }),
    ).toEqual({
      'X-Ventora-Timestamp': 't',
      'X-Ventora-Nonce': 'n',
      'X-Ventora-Signature': 's',
    })
  })
})

describe('constantTimeEqual', () => {
  it('returns true for equal strings', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true)
  })

  it('returns false for different lengths', () => {
    expect(constantTimeEqual('abc', 'abcd')).toBe(false)
  })

  it('returns false for same-length different content', () => {
    expect(constantTimeEqual('abc', 'abd')).toBe(false)
  })
})
