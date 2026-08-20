/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(
  body: unknown,
  ip = '1.2.3.4',
): Request {
  return new Request('https://lextract.io/api/leads/calculator', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  })
}

const VALID_BODY = { email: 'test@example.com', calculatorSlug: 'nnn-lease-cost-calculator' }

// ---------------------------------------------------------------------------
// Module re-import helper — needed so rate-limit map is fresh between suites
// ---------------------------------------------------------------------------

async function importRoute() {
  const mod = await import('@/app/api/leads/calculator/route')
  return mod.POST
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/leads/calculator', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ contact: {} }), { status: 200 }),
    ))
    process.env.APOLLO_API_KEY = 'test-api-key'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    global.fetch = originalFetch
    delete process.env.APOLLO_API_KEY
    vi.resetModules()
  })

  // ── Validation ─────────────────────────────────────────────────────────────

  describe('Validation', () => {
    it('returns 400 when body is missing (unparseable JSON)', async () => {
      const POST = await importRoute()
      const req = new Request('https://lextract.io/api/leads/calculator', {
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
      const res = await POST(makeRequest({ calculatorSlug: 'nnn-lease-cost-calculator' }, '10.0.0.2'))
      expect(res.status).toBe(400)
      const json = await res.json() as { success: boolean; error: string }
      expect(json.success).toBe(false)
      expect(json.error).toContain('email')
    })

    it('returns 400 when email has no @ character', async () => {
      const POST = await importRoute()
      const res = await POST(makeRequest({ email: 'notanemail', calculatorSlug: 'nnn-lease-cost-calculator' }, '10.0.0.3'))
      expect(res.status).toBe(400)
      const json = await res.json() as { success: boolean; error: string }
      expect(json.success).toBe(false)
      expect(json.error).toContain('email')
    })

    it('returns 400 when calculatorSlug is missing', async () => {
      const POST = await importRoute()
      const res = await POST(makeRequest({ email: 'test@example.com' }, '10.0.0.4'))
      expect(res.status).toBe(400)
      const json = await res.json() as { success: boolean; error: string }
      expect(json.success).toBe(false)
      expect(json.error).toContain('calculatorSlug')
    })

    it('does not return 400 for a valid minimal body', async () => {
      const POST = await importRoute()
      const res = await POST(makeRequest(VALID_BODY, '10.0.0.5'))
      expect(res.status).not.toBe(400)
    })
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

      // Exhaust ip1
      for (let i = 0; i < 5; i++) {
        await POST(makeRequest({ ...VALID_BODY, email: `ip1-${i}@example.com` }, ip1))
      }
      const ip1Blocked = await POST(
        makeRequest({ ...VALID_BODY, email: 'ip1-blocked@example.com' }, ip1),
      )
      expect(ip1Blocked.status).toBe(429)

      // ip2 is not affected
      const ip2Res = await POST(makeRequest({ ...VALID_BODY, email: 'ip2@example.com' }, ip2))
      expect(ip2Res.status).toBe(200)
    })
  })

  // ── Apollo Integration ──────────────────────────────────────────────────────

  describe('Apollo Integration', () => {
    it('returns 500 with "Service configuration error" when APOLLO_API_KEY is not set', async () => {
      delete process.env.APOLLO_API_KEY
      const POST = await importRoute()
      const res = await POST(makeRequest(VALID_BODY, '20.0.0.1'))
      expect(res.status).toBe(500)
      const json = await res.json() as { success: boolean; error: string }
      expect(json.success).toBe(false)
      expect(json.error).toContain('Service configuration error')
    })

    it('returns 200 success when Apollo responds with a non-200 status', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
        new Response('Unauthorized', { status: 401 }),
      ))
      const POST = await importRoute()
      const res = await POST(makeRequest(VALID_BODY, '20.0.0.2'))
      expect(res.status).toBe(200)
      const json = await res.json() as { success: boolean }
      expect(json.success).toBe(true)
    })

    it('returns 200 success when Apollo fetch throws a network error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
      const POST = await importRoute()
      const res = await POST(makeRequest(VALID_BODY, '20.0.0.3'))
      expect(res.status).toBe(200)
      const json = await res.json() as { success: boolean }
      expect(json.success).toBe(true)
    })

    it('calls Apollo with correct URL, headers, and payload shape', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ contact: {} }), { status: 200 }),
      )
      vi.stubGlobal('fetch', mockFetch)

      const POST = await importRoute()
      const res = await POST(makeRequest(
        {
          email: 'User@Example.COM',
          calculatorSlug: 'effective-rent-calculator',
          firstName: 'Alice',
          lastName: 'Smith',
          company: 'Acme LLC',
        },
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
        first_name: string
        last_name: string
        organization_name: string
        label_names: string[]
        run_dedupe: boolean
      }
      // email normalised to lowercase
      expect(payload.email).toBe('user@example.com')
      expect(payload.first_name).toBe('Alice')
      expect(payload.last_name).toBe('Smith')
      expect(payload.organization_name).toBe('Acme LLC')
      expect(payload.label_names).toContain('lextract-lead-magnet')
      expect(payload.label_names).toContain('tool:effective-rent-calculator')
      expect(payload.run_dedupe).toBe(true)
    })
  })
})
