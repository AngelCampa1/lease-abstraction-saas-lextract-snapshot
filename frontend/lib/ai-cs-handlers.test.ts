/** @vitest-environment node */
import { describe, expect, it } from 'vitest'
import { isSameOrigin, handleAiCsProxyRequest } from './ai-cs-handlers'
import type { AiCsHandlerDeps } from './ai-cs-handlers'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_SECRET = 'test-cs-secret'
const WORKER_ORIGIN = 'https://ventora-ai-cs-worker.REPLACE_WITH_ACCOUNT_SUBDOMAIN.workers.dev'

function makeSession() {
  return { user: { id: 'user_123', email: 'agent@lextract.io' } }
}

function makeRequest(
  action: string,
  body: unknown,
  opts: { origin?: string; url?: string } = {},
): Request {
  const url = opts.url ?? `https://lextract.io/api/ai-cs/${action}`
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (opts.origin !== undefined) {
    headers['origin'] = opts.origin
  }
  return new Request(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

function makeDeps(overrides: Partial<AiCsHandlerDeps> = {}): AiCsHandlerDeps {
  return {
    getSession: async () => makeSession(),
    fetch: async () => new Response('{"ok":true}', { status: 200 }),
    secret: VALID_SECRET,
    now: () => new Date('2026-06-01T00:00:00.000Z'),
    nonce: () => 'test-nonce',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// isSameOrigin
// ---------------------------------------------------------------------------

describe('isSameOrigin', () => {
  it('allows requests with no Origin header (server-to-server or same-origin fetch)', () => {
    const req = new Request('https://lextract.io/api/ai-cs/sessions', { method: 'POST' })
    expect(isSameOrigin(req)).toBe(true)
  })

  it('allows requests whose Origin matches the request URL origin', () => {
    const req = makeRequest('sessions', {}, { origin: 'https://lextract.io' })
    expect(isSameOrigin(req)).toBe(true)
  })

  it('rejects requests whose Origin does not match the request URL origin', () => {
    const req = makeRequest('sessions', {}, { origin: 'https://evil.example' })
    expect(isSameOrigin(req)).toBe(false)
  })

  it('rejects requests with a subdomain mismatch', () => {
    const req = makeRequest('sessions', {}, { origin: 'https://app.lextract.io' })
    expect(isSameOrigin(req)).toBe(false)
  })

  it('rejects requests with a scheme mismatch', () => {
    const req = makeRequest('sessions', {}, { origin: 'http://lextract.io' })
    expect(isSameOrigin(req)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// handleAiCsProxyRequest
// ---------------------------------------------------------------------------

describe('handleAiCsProxyRequest: 401 when unauthenticated', () => {
  it('returns 401 when getSession returns null', async () => {
    const res = await handleAiCsProxyRequest(
      makeRequest('sessions', {}),
      'sessions',
      makeDeps({ getSession: async () => null }),
    )
    expect(res.status).toBe(401)
  })
})

describe('handleAiCsProxyRequest: 404 for invalid actions', () => {
  it('returns 404 for an unknown action before checking auth', async () => {
    const res = await handleAiCsProxyRequest(
      makeRequest('nope', {}),
      'nope',
      makeDeps({ getSession: async () => null }),
    )
    expect(res.status).toBe(404)
  })

  it('returns 404 for a path-traversal action', async () => {
    const res = await handleAiCsProxyRequest(
      makeRequest('sessions/../chat', {}),
      'sessions/../chat',
      makeDeps(),
    )
    expect(res.status).toBe(404)
  })
})

describe('handleAiCsProxyRequest: 403 for cross-origin requests', () => {
  it('returns 403 when the Origin header is present and cross-origin', async () => {
    const res = await handleAiCsProxyRequest(
      makeRequest('sessions', {}, { origin: 'https://evil.example' }),
      'sessions',
      makeDeps(),
    )
    expect(res.status).toBe(403)
  })

  it('allows a same-origin Origin header through', async () => {
    const fetchFake = async () => new Response('{}', { status: 201 })
    const res = await handleAiCsProxyRequest(
      makeRequest('sessions', {}, { origin: 'https://lextract.io' }),
      'sessions',
      makeDeps({ fetch: fetchFake }),
    )
    expect(res.status).toBe(201)
  })
})

describe('handleAiCsProxyRequest: 500 when secret is missing', () => {
  it('returns 500 when the secret is empty string', async () => {
    const res = await handleAiCsProxyRequest(
      makeRequest('sessions', {}),
      'sessions',
      makeDeps({ secret: '' }),
    )
    expect(res.status).toBe(500)
  })
})

describe('handleAiCsProxyRequest: 502 on upstream network failure', () => {
  it('returns 502 when the upstream fetch throws a network error', async () => {
    const fetchFake = async (): Promise<Response> => {
      throw new TypeError('Failed to fetch')
    }
    const res = await handleAiCsProxyRequest(
      makeRequest('sessions', {}),
      'sessions',
      makeDeps({ fetch: fetchFake }),
    )
    expect(res.status).toBe(502)
  })
})

describe('handleAiCsProxyRequest: Origin forwarding to upstream', () => {
  it('forwards the browser Origin header to the worker when present', async () => {
    let capturedHeaders: Headers | undefined
    const fetchFake = async (_url: string, init: RequestInit): Promise<Response> => {
      capturedHeaders = init.headers as Headers
      return new Response('{}', { status: 200 })
    }
    await handleAiCsProxyRequest(
      makeRequest('sessions', {}, { origin: 'https://lextract.io' }),
      'sessions',
      makeDeps({ fetch: fetchFake }),
    )
    expect(capturedHeaders).toBeDefined()
    expect(capturedHeaders!.get('Origin')).toBe('https://lextract.io')
  })

  it('does NOT set an Origin header on the outbound request when Origin is absent', async () => {
    let capturedHeaders: Headers | undefined
    const fetchFake = async (_url: string, init: RequestInit): Promise<Response> => {
      capturedHeaders = init.headers as Headers
      return new Response('{}', { status: 200 })
    }
    await handleAiCsProxyRequest(
      makeRequest('sessions', {}),
      'sessions',
      makeDeps({ fetch: fetchFake }),
    )
    expect(capturedHeaders).toBeDefined()
    expect(capturedHeaders!.get('Origin')).toBeNull()
  })

  it('preserves X-Ventora signing headers alongside the forwarded Origin', async () => {
    let capturedHeaders: Headers | undefined
    const fetchFake = async (_url: string, init: RequestInit): Promise<Response> => {
      capturedHeaders = init.headers as Headers
      return new Response('{}', { status: 200 })
    }
    await handleAiCsProxyRequest(
      makeRequest('sessions', {}, { origin: 'https://lextract.io' }),
      'sessions',
      makeDeps({ fetch: fetchFake }),
    )
    expect(capturedHeaders!.get('Origin')).toBe('https://lextract.io')
    expect(capturedHeaders!.get('X-Ventora-Signature')).toMatch(/^[a-f0-9]{64}$/)
    expect(capturedHeaders!.get('X-Ventora-Timestamp')).toBeTruthy()
    expect(capturedHeaders!.get('X-Ventora-Nonce')).toBeTruthy()
    expect(capturedHeaders!.get('Content-Type')).toBe('application/json')
  })

  it('does NOT clobber Content-Type or signing headers when forwarding Origin', async () => {
    let capturedHeaders: Headers | undefined
    const fetchFake = async (_url: string, init: RequestInit): Promise<Response> => {
      capturedHeaders = init.headers as Headers
      return new Response('{}', { status: 200 })
    }
    await handleAiCsProxyRequest(
      makeRequest('chat', { sessionId: 's1', message: 'hi' }, { origin: 'https://lextract.io' }),
      'chat',
      makeDeps({ fetch: fetchFake }),
    )
    expect(capturedHeaders!.get('Content-Type')).toBe('application/json')
    expect(capturedHeaders!.get('X-Ventora-Signature')).toMatch(/^[a-f0-9]{64}$/)
    expect(capturedHeaders!.get('Origin')).toBe('https://lextract.io')
  })
})

describe('handleAiCsProxyRequest: upstream URL', () => {
  it('calls the worker at the correct URL for sessions', async () => {
    let capturedUrl: string | undefined
    const fetchFake = async (url: string): Promise<Response> => {
      capturedUrl = url
      return new Response('{}', { status: 200 })
    }
    await handleAiCsProxyRequest(
      makeRequest('sessions', {}),
      'sessions',
      makeDeps({ fetch: fetchFake }),
    )
    expect(capturedUrl).toBe(`${WORKER_ORIGIN}/v1/sessions`)
  })

  it('calls the worker at the correct URL for chat', async () => {
    let capturedUrl: string | undefined
    const fetchFake = async (url: string): Promise<Response> => {
      capturedUrl = url
      return new Response('data: x\n\n', { status: 200 })
    }
    await handleAiCsProxyRequest(
      makeRequest('chat', { sessionId: 's1', message: 'hi' }),
      'chat',
      makeDeps({ fetch: fetchFake }),
    )
    expect(capturedUrl).toBe(`${WORKER_ORIGIN}/v1/chat`)
  })

  it('calls the worker at the correct URL for escalations', async () => {
    let capturedUrl: string | undefined
    const fetchFake = async (url: string): Promise<Response> => {
      capturedUrl = url
      return new Response('{}', { status: 200 })
    }
    await handleAiCsProxyRequest(
      makeRequest('escalations', { sessionId: 's1' }),
      'escalations',
      makeDeps({ fetch: fetchFake }),
    )
    expect(capturedUrl).toBe(`${WORKER_ORIGIN}/v1/escalations`)
  })
})

describe('handleAiCsProxyRequest: happy path streams through with upstream status', () => {
  it('streams through the upstream response body and status', async () => {
    const upstreamBody = 'data: hello\n\ndata: world\n\n'
    const fetchFake = async (): Promise<Response> =>
      new Response(upstreamBody, {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      })
    const res = await handleAiCsProxyRequest(
      makeRequest('chat', { sessionId: 's1', message: 'hi' }),
      'chat',
      makeDeps({ fetch: fetchFake }),
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/event-stream')
    const text = await res.text()
    expect(text).toBe(upstreamBody)
  })

  it('preserves non-200 upstream status codes', async () => {
    const fetchFake = async (): Promise<Response> =>
      new Response('{"error":"rate limited"}', {
        status: 429,
        headers: { 'content-type': 'application/json', 'retry-after': '5' },
      })
    const res = await handleAiCsProxyRequest(
      makeRequest('chat', { sessionId: 's1', message: 'hi' }),
      'chat',
      makeDeps({ fetch: fetchFake }),
    )
    expect(res.status).toBe(429)
  })

  it('always sets Cache-Control: no-store on the response', async () => {
    const res = await handleAiCsProxyRequest(
      makeRequest('sessions', {}),
      'sessions',
      makeDeps(),
    )
    expect(res.headers.get('cache-control')).toBe('no-store')
  })
})

describe('handleAiCsProxyRequest: missing Origin is allowed (no-Origin same-origin fetch)', () => {
  it('proceeds normally when no Origin header is present', async () => {
    const fetchFake = async (): Promise<Response> =>
      new Response('{}', { status: 201 })
    const res = await handleAiCsProxyRequest(
      makeRequest('sessions', {}),
      'sessions',
      makeDeps({ fetch: fetchFake }),
    )
    expect(res.status).toBe(201)
  })
})

describe('handleAiCsProxyRequest: 400 for invalid JSON body', () => {
  it('returns 400 when the request body is not valid JSON', async () => {
    const req = new Request('https://lextract.io/api/ai-cs/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-json{{',
    })
    const res = await handleAiCsProxyRequest(req, 'sessions', makeDeps())
    expect(res.status).toBe(400)
  })
})
