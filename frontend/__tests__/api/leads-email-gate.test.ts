/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown, ip = '1.2.3.4'): Request {
  return new Request('https://lextract.io/api/leads/email-gate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  })
}

const VALID_BODY = { email: 'test@example.com' }

async function importRoute() {
  const mod = await import('@/app/api/leads/email-gate/route')
  return mod.POST
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/leads/email-gate', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ contact: {} }), { status: 200 }),
      ),
    )
    process.env.APOLLO_API_KEY = 'test-api-key'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    global.fetch = originalFetch
    delete process.env.APOLLO_API_KEY
    vi.resetModules()
  })

  // ── Validation ──────────────────────────────────────────────────────────────

  describe('Validation', () => {
    it('returns 400 when body is unparseable JSON', async () => {
      const POST = await importRoute()
      const req = new Request('https://lextract.io/api/leads/email-gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.0.0.1' },
        body: 'not-json',
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const json = await res.json() as { success: boolean; error: string }
      expect(json.success).toBe(false)
    })

    it('returns 400 when email is missing', async () => {
      const POST = await importRoute()
      const res = await POST(makeRequest({}, '10.0.0.2'))
      expect(res.status).toBe(400)
      const json = await res.json() as { success: boolean; error: string }
      expect(json.success).toBe(false)
      expect(json.error).toContain('email')
    })

    it('returns 400 when email is malformed', async () => {
      const POST = await importRoute()
      const res = await POST(makeRequest({ email: 'notanemail' }, '10.0.0.3'))
      expect(res.status).toBe(400)
      const json = await res.json() as { success: boolean; error: string }
      expect(json.success).toBe(false)
      expect(json.error).toContain('email')
    })

    it('returns 200 for valid email', async () => {
      const POST = await importRoute()
      const res = await POST(makeRequest(VALID_BODY, '10.0.0.4'))
      expect(res.status).toBe(200)
      const json = await res.json() as { success: boolean }
      expect(json.success).toBe(true)
    })
  })

  // ── Rate Limiting ───────────────────────────────────────────────────────────

  describe('Rate Limiting', () => {
    it('allows 5 requests from the same IP and blocks the 6th with 429', async () => {
      const POST = await importRoute()
      const ip = '5.6.7.8'

      for (let i = 0; i < 5; i++) {
        const res = await POST(makeRequest({ email: `ip-limit-${i}@example.com` }, ip))
        expect(res.status).toBe(200)
      }

      const blocked = await POST(makeRequest({ email: 'ip-limit-blocked@example.com' }, ip))
      expect(blocked.status).toBe(429)
      const json = await blocked.json() as { success: boolean; error: string }
      expect(json.success).toBe(false)
      expect(json.error).toContain('Too many requests')
    })
  })

  // ── Apollo Integration ──────────────────────────────────────────────────────

  describe('Apollo Integration', () => {
    it('returns 200 when APOLLO_API_KEY is not set', async () => {
      delete process.env.APOLLO_API_KEY
      const POST = await importRoute()
      const res = await POST(makeRequest(VALID_BODY, '20.0.0.1'))
      expect(res.status).toBe(200)
      const json = await res.json() as { success: boolean }
      expect(json.success).toBe(true)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('returns 200 even when Apollo fails', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
      const POST = await importRoute()
      const res = await POST(makeRequest(VALID_BODY, '20.0.0.2'))
      expect(res.status).toBe(200)
      const json = await res.json() as { success: boolean }
      expect(json.success).toBe(true)
    })

    it('calls Apollo with lextract-email-gate label and lowercased email', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ contact: {} }), { status: 200 }),
      )
      vi.stubGlobal('fetch', mockFetch)

      const POST = await importRoute()
      await POST(makeRequest({ email: 'User@Example.COM' }, '20.0.0.3'))

      expect(mockFetch).toHaveBeenCalledOnce()
      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('https://api.apollo.io/v1/contacts')

      const headers = options.headers as Record<string, string>
      expect(headers['X-Api-Key']).toBe('test-api-key')

      const payload = JSON.parse(options.body as string) as {
        email: string
        label_names: string[]
        run_dedupe: boolean
      }
      expect(payload.email).toBe('user@example.com')
      expect(payload.label_names).toEqual(['lextract-email-gate'])
      expect(payload.run_dedupe).toBe(true)
    })

    it('returns 200 when Apollo responds with a non-OK status', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response('bad gateway', { status: 502 })),
      )

      const POST = await importRoute()
      const res = await POST(makeRequest(VALID_BODY, '20.0.0.4'))

      expect(res.status).toBe(200)
      const json = await res.json() as { success: boolean }
      expect(json.success).toBe(true)
    })
  })
})
