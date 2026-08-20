/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown, ip = '1.2.3.4'): Request {
  return new Request('https://lextract.io/api/leads/exit-popup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  })
}

const VALID_BODY = { email: 'test@example.com', leadMagnet: 'checklist' }

// ---------------------------------------------------------------------------
// Module re-import helper — needed so rate-limit map is fresh between suites
// ---------------------------------------------------------------------------

async function importRoute() {
  const mod = await import('@/app/api/leads/exit-popup/route')
  return mod.POST
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/leads/exit-popup', () => {
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
      const req = new Request('https://lextract.io/api/leads/exit-popup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.0.0.1' },
        body: 'not-json',
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const json = await res.json() as { success: boolean; error: string }
      expect(json.success).toBe(false)
      expect(json.error).toBeTruthy()
    })

    it('returns 400 when email is missing', async () => {
      const POST = await importRoute()
      const res = await POST(makeRequest({ leadMagnet: 'checklist' }, '10.0.0.2'))
      expect(res.status).toBe(400)
      const json = await res.json() as { success: boolean; error: string }
      expect(json.success).toBe(false)
      expect(json.error).toContain('email')
    })

    it('returns 400 when email is malformed', async () => {
      const POST = await importRoute()
      const res = await POST(makeRequest({ email: 'notanemail', leadMagnet: 'checklist' }, '10.0.0.3'))
      expect(res.status).toBe(400)
      const json = await res.json() as { success: boolean; error: string }
      expect(json.success).toBe(false)
      expect(json.error).toContain('email')
    })

    it('returns resource-only copy when leadMagnet is missing', async () => {
      const POST = await importRoute()
      const res = await POST(makeRequest({ email: 'test@example.com' }, '10.0.0.4'))
      expect(res.status).toBe(400)
      const json = await res.json() as { success: boolean; error: string }
      expect(json.success).toBe(false)
      expect(json.error).toBe('resource is required.')
      expect(json.error).not.toMatch(/lead magnet/i)
    })

    it('returns resource-only copy when leadMagnet is not in the allowlist', async () => {
      const POST = await importRoute()
      const res = await POST(makeRequest({ email: 'test@example.com', leadMagnet: 'evil-injection' }, '10.0.0.5'))
      expect(res.status).toBe(400)
      const json = await res.json() as { success: boolean; error: string }
      expect(json.success).toBe(false)
      expect(json.error).toBe('Please choose a valid resource.')
      expect(json.error).not.toMatch(/lead magnet/i)
    })

    it.each(['checklist', 'nnn-calculator', 'sample-report'])(
      'accepts valid leadMagnet value: %s',
      async (leadMagnet) => {
        const POST = await importRoute()
        const res = await POST(makeRequest({ email: 'test@example.com', leadMagnet }, '10.0.0.6'))
        expect(res.status).not.toBe(400)
      },
    )
  })

  // ── Rate Limiting ───────────────────────────────────────────────────────────

  describe('Rate Limiting', () => {
    it('allows 5 requests from the same IP and blocks the 6th with 429', async () => {
      const POST = await importRoute()
      const ip = '5.6.7.8'

      for (let i = 0; i < 5; i++) {
        const res = await POST(
          makeRequest({ ...VALID_BODY, email: `ip-limit-${i}@example.com` }, ip),
        )
        expect(res.status).toBe(200)
      }

      const blocked = await POST(
        makeRequest({ ...VALID_BODY, email: 'ip-limit-blocked@example.com' }, ip),
      )
      expect(blocked.status).toBe(429)
      const json = await blocked.json() as { success: boolean; error: string }
      expect(json.success).toBe(false)
      expect(json.error).toContain('Too many requests')
    })

    it('tracks different IPs independently', async () => {
      const POST = await importRoute()
      const ip1 = '100.0.0.1'
      const ip2 = '100.0.0.2'

      for (let i = 0; i < 5; i++) {
        await POST(makeRequest({ ...VALID_BODY, email: `ip1-${i}@example.com` }, ip1))
      }
      const ip1Blocked = await POST(
        makeRequest({ ...VALID_BODY, email: 'ip1-blocked@example.com' }, ip1),
      )
      expect(ip1Blocked.status).toBe(429)

      const ip2Res = await POST(makeRequest({ ...VALID_BODY, email: 'ip2@example.com' }, ip2))
      expect(ip2Res.status).toBe(200)
    })
  })

  // ── Apollo Integration ──────────────────────────────────────────────────────

  describe('Apollo Integration', () => {
    it('returns 500 when APOLLO_API_KEY is not set', async () => {
      delete process.env.APOLLO_API_KEY
      const POST = await importRoute()
      const res = await POST(makeRequest(VALID_BODY, '20.0.0.1'))
      expect(res.status).toBe(500)
      const json = await res.json() as { success: boolean; error: string }
      expect(json.success).toBe(false)
      expect(json.error).toContain('Service configuration error')
    })

    it('returns 200 when Apollo responds with a non-200 status', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Unauthorized', { status: 401 })))
      const POST = await importRoute()
      const res = await POST(makeRequest(VALID_BODY, '20.0.0.2'))
      expect(res.status).toBe(200)
      const json = await res.json() as { success: boolean }
      expect(json.success).toBe(true)
    })

    it('returns 200 when Apollo fetch throws a network error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
      const POST = await importRoute()
      const res = await POST(makeRequest(VALID_BODY, '20.0.0.3'))
      expect(res.status).toBe(200)
      const json = await res.json() as { success: boolean }
      expect(json.success).toBe(true)
    })

    it('calls Apollo with correct URL, headers, lowercased email, and label_names', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ contact: {} }), { status: 200 }),
      )
      vi.stubGlobal('fetch', mockFetch)

      const POST = await importRoute()
      const res = await POST(makeRequest(
        { email: 'User@Example.COM', leadMagnet: 'nnn-calculator' },
        '20.0.0.4',
      ))

      expect(res.status).toBe(200)
      expect(mockFetch).toHaveBeenCalledOnce()

      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('https://api.apollo.io/v1/contacts')

      const headers = options.headers as Record<string, string>
      expect(headers['Content-Type']).toBe('application/json')
      expect(headers['X-Api-Key']).toBe('test-api-key')

      const payload = JSON.parse(options.body as string) as {
        email: string
        label_names: string[]
        run_dedupe: boolean
      }
      expect(payload.email).toBe('user@example.com')
      expect(payload.label_names).toContain('lextract-exit-popup')
      expect(payload.label_names).toContain('nnn-calculator')
      expect(payload.run_dedupe).toBe(true)
    })
  })
})
