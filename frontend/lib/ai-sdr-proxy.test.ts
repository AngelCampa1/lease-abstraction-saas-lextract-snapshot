import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AI_SDR_WORKER_PATHS,
  aiSdrUnconfiguredResponse,
  aiSdrUpstreamFailedResponse,
  jsonError,
  proxyToWorker,
  resolveWorkerConfig,
  validateAiSdrAction,
} from './ai-sdr-proxy'
import { buildAssertionPayload, hmacSha256Hex } from './ai-sdr-signing'

const CONFIG = { baseUrl: 'https://worker.example.dev', secret: 'sek' }

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('validateAiSdrAction', () => {
  it('maps known actions to worker paths', () => {
    expect(validateAiSdrAction('sessions')).toBe('/v1/sessions')
    expect(validateAiSdrAction('chat')).toBe('/v1/chat')
    expect(validateAiSdrAction('handoff')).toBe('/v1/handoff')
  })

  it('returns null for unknown actions', () => {
    expect(validateAiSdrAction('escalations')).toBeNull()
    expect(validateAiSdrAction('__proto__')).toBeNull()
  })
})

describe('resolveWorkerConfig', () => {
  it('returns config and strips trailing slashes', () => {
    expect(
      resolveWorkerConfig({
        AI_SDR_WORKER_URL: 'https://worker.example.dev//',
        AI_SDR_CLIENT_ASSERTION_SECRET: ' sek ',
      }),
    ).toEqual({ baseUrl: 'https://worker.example.dev', secret: 'sek' })
  })

  it('returns null when url or secret missing', () => {
    expect(resolveWorkerConfig({ AI_SDR_CLIENT_ASSERTION_SECRET: 'sek' })).toBeNull()
    expect(resolveWorkerConfig({ AI_SDR_WORKER_URL: 'https://x.dev' })).toBeNull()
  })

  it('returns null for non-https or malformed url', () => {
    expect(
      resolveWorkerConfig({ AI_SDR_WORKER_URL: 'http://x.dev', AI_SDR_CLIENT_ASSERTION_SECRET: 's' }),
    ).toBeNull()
    expect(
      resolveWorkerConfig({ AI_SDR_WORKER_URL: 'not a url', AI_SDR_CLIENT_ASSERTION_SECRET: 's' }),
    ).toBeNull()
  })
})

describe('proxyToWorker', () => {
  it('signs the assertion, forwards Origin, and streams the upstream response', async () => {
    const upstream = new Response('data: hi\n\n', {
      status: 201,
      headers: { 'content-type': 'text/event-stream', 'retry-after': '5' },
    })
    const fetchMock = vi.fn().mockResolvedValue(upstream)
    vi.stubGlobal('fetch', fetchMock)

    const res = await proxyToWorker({
      config: CONFIG,
      workerPath: AI_SDR_WORKER_PATHS.sessions,
      body: { productId: 'lextract' },
      origin: 'https://lextract.io',
      now: () => new Date('2026-06-01T00:00:00.000Z'),
      nonce: () => 'fixed-nonce',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://worker.example.dev/v1/sessions')
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"productId":"lextract"}')

    const headers = init.headers as Headers
    expect(headers.get('Origin')).toBe('https://lextract.io')
    expect(headers.get('X-Ventora-Timestamp')).toBe('2026-06-01T00:00:00.000Z')
    expect(headers.get('X-Ventora-Nonce')).toBe('fixed-nonce')
    const expectedSig = hmacSha256Hex(
      CONFIG.secret,
      buildAssertionPayload({
        timestamp: '2026-06-01T00:00:00.000Z',
        nonce: 'fixed-nonce',
        method: 'POST',
        path: '/v1/sessions',
        body: { productId: 'lextract' },
      }),
    )
    expect(headers.get('X-Ventora-Signature')).toBe(expectedSig)

    expect(res.status).toBe(201)
    expect(res.headers.get('content-type')).toBe('text/event-stream')
    expect(res.headers.get('retry-after')).toBe('5')
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(await res.text()).toBe('data: hi\n\n')
  })

  it('returns 502 when the upstream fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    const res = await proxyToWorker({
      config: CONFIG,
      workerPath: AI_SDR_WORKER_PATHS.chat,
      body: {},
      origin: 'https://lextract.io',
    })
    expect(res.status).toBe(502)
    const json = (await res.json()) as { error: { code: string } }
    expect(json.error.code).toBe('AI_SDR_UPSTREAM_FAILED')
  })
})

describe('error responses', () => {
  it('builds a 503 unconfigured response', async () => {
    const res = aiSdrUnconfiguredResponse()
    expect(res.status).toBe(503)
    expect((await res.json()).error.code).toBe('AI_SDR_UNCONFIGURED')
  })

  it('builds a 502 upstream-failed response', async () => {
    const res = aiSdrUpstreamFailedResponse()
    expect(res.status).toBe(502)
  })

  it('jsonError sets no-store and json content-type', () => {
    const res = jsonError(400, 'BAD', 'bad')
    expect(res.status).toBe(400)
    expect(res.headers.get('content-type')).toBe('application/json')
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })
})
