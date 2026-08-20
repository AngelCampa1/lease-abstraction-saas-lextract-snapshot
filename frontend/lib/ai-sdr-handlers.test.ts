import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  handleAiSdrBffRequest,
  handleAiSdrContextRequest,
  isSameOrigin,
} from './ai-sdr-handlers'
import { buildLextractProductContext } from './ai-sdr-context'
import { buildAssertionPayload, hmacSha256Hex } from './ai-sdr-signing'

const ENV = {
  AI_SDR_WORKER_URL: 'https://worker.example.dev',
  AI_SDR_CLIENT_ASSERTION_SECRET: 'sek',
}
const CONTEXT_SECRET = 'context-secret'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function bffRequest(body: unknown, origin?: string): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (origin) {
    headers.origin = origin
  }
  return new Request('https://lextract.io/api/ai-sdr/v1/sessions', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

describe('isSameOrigin', () => {
  it('allows requests with no Origin header', () => {
    expect(isSameOrigin(new Request('https://lextract.io/x'))).toBe(true)
  })

  it('allows matching origin', () => {
    expect(isSameOrigin(bffRequest({}, 'https://lextract.io'))).toBe(true)
  })

  it('rejects mismatched origin', () => {
    expect(isSameOrigin(bffRequest({}, 'https://evil.example'))).toBe(false)
  })
})

describe('handleAiSdrBffRequest', () => {
  it('404s an unknown action', async () => {
    const res = await handleAiSdrBffRequest({ action: 'nope', request: bffRequest({}), env: ENV })
    expect(res.status).toBe(404)
  })

  it('403s a cross-origin request', async () => {
    const res = await handleAiSdrBffRequest({
      action: 'sessions',
      request: bffRequest({}, 'https://evil.example'),
      env: ENV,
    })
    expect(res.status).toBe(403)
  })

  it('400s an invalid JSON body', async () => {
    const req = new Request('https://lextract.io/api/ai-sdr/v1/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json',
    })
    const res = await handleAiSdrBffRequest({ action: 'sessions', request: req, env: ENV })
    expect(res.status).toBe(400)
  })

  it('503s when the worker is unconfigured', async () => {
    const res = await handleAiSdrBffRequest({ action: 'sessions', request: bffRequest({}), env: {} })
    expect(res.status).toBe(503)
  })

  it('forces productId=lextract on sessions and proxies to the worker', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await handleAiSdrBffRequest({
      action: 'sessions',
      request: bffRequest({ productId: 'spoofed', metadata: { surface: 'marketing-site' } }, 'https://lextract.io'),
      env: ENV,
      now: () => new Date('2026-06-01T00:00:00.000Z'),
      nonce: () => 'n',
    })

    expect(res.status).toBe(201)
    const [, init] = fetchMock.mock.calls[0]
    const forwarded = JSON.parse(init.body as string)
    expect(forwarded.productId).toBe('lextract')
    expect(forwarded.metadata).toEqual({ surface: 'marketing-site' })
    expect((init.headers as Headers).get('Origin')).toBe('https://lextract.io')
  })

  it('forwards chat bodies unchanged', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('data: x\n\n', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const req = new Request('https://lextract.io/api/ai-sdr/v1/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://lextract.io' },
      body: JSON.stringify({ sessionId: 's1', message: 'hi' }),
    })
    await handleAiSdrBffRequest({ action: 'chat', request: req, env: ENV })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://worker.example.dev/v1/chat')
    expect(JSON.parse(init.body as string)).toEqual({ sessionId: 's1', message: 'hi' })
  })
})

describe('handleAiSdrContextRequest', () => {
  const nowMs = Date.parse('2026-06-01T00:00:00.000Z')

  function signedContextRequest(secret = CONTEXT_SECRET): Request {
    const url = 'https://lextract.io/api/ai-sdr/context'
    const { pathname, search } = new URL(url)
    const timestamp = '2026-06-01T00:00:00.000Z'
    const nonce = 'req-nonce'
    const payload = buildAssertionPayload({
      timestamp,
      nonce,
      method: 'GET',
      path: `${pathname}${search}`,
      body: { productId: 'lextract' },
    })
    return new Request(url, {
      headers: {
        'X-Ventora-Timestamp': timestamp,
        'X-Ventora-Nonce': nonce,
        'X-Ventora-Signature': hmacSha256Hex(secret, payload),
      },
    })
  }

  it('503s when the context secret is unset', () => {
    const res = handleAiSdrContextRequest({ request: signedContextRequest(), env: {}, nowMs })
    expect(res.status).toBe(503)
  })

  it('401s an unsigned request', () => {
    const res = handleAiSdrContextRequest({
      request: new Request('https://lextract.io/api/ai-sdr/context'),
      env: { AI_SDR_CONTEXT_SECRET: CONTEXT_SECRET },
      nowMs,
    })
    expect(res.status).toBe(401)
  })

  it('200s with a signed ProductContext for a valid request', async () => {
    const res = handleAiSdrContextRequest({
      request: signedContextRequest(),
      env: { AI_SDR_CONTEXT_SECRET: CONTEXT_SECRET },
      nowMs,
      timestamp: '2026-06-01T00:00:01.000Z',
      nonce: 'resp-nonce',
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Ventora-Signature')).toMatch(/^[0-9a-f]{64}$/)
    expect(await res.json()).toEqual(buildLextractProductContext())
  })
})
