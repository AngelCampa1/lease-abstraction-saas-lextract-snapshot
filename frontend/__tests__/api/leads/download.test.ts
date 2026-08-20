/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getLeadMagnet,
  LEAD_MAGNETS_BUCKET,
  PROMOTED_LEAD_MAGNETS,
} from '@/data/lead-magnets'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(
  body: unknown,
  ip = '1.2.3.4',
  referer = 'https://lextract.io/templates/lease-abstraction-checklist',
): Request {
  return new Request('https://lextract.io/api/leads/download', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
      referer,
    },
    body: JSON.stringify(body),
  })
}

const VALID_BODY = {
  email: 'test@example.com',
  magnetSlug: 'lease-abstraction-checklist',
}

const WORKER_DOWNLOAD_RESPONSE = {
  success: true,
  downloadUrl: 'https://account.r2.cloudflarestorage.com/lextract-lead-magnets/lease-abstraction-checklist-v3.pdf?sig=abc',
  emailed: true,
}

// ---------------------------------------------------------------------------
// Module re-import helper — ensures rate-limit map is fresh between test suites
// ---------------------------------------------------------------------------

async function importRoute() {
  const mod = await import('@/app/api/leads/download/route')
  return mod.POST
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/leads/download', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ contact: { id: 'apollo-123' } }), { status: 200 }),
        )
        .mockResolvedValue(
          new Response(JSON.stringify(WORKER_DOWNLOAD_RESPONSE), { status: 200 }),
        ),
    )
    process.env.APOLLO_API_KEY = 'test-api-key'
    process.env.MARKETING_WORKER_URL = 'https://marketing.example.com'
    process.env.MARKETING_WORKER_SECRET = 'worker-secret'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    global.fetch = originalFetch
    delete process.env.APOLLO_API_KEY
    delete process.env.MARKETING_WORKER_URL
    delete process.env.MARKETING_WORKER_SECRET
    vi.resetModules()
  })

  // ── Happy path ──────────────────────────────────────────────────────────────

  describe('Success', () => {
    it('returns worker downloadUrl for valid email + slug', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn()
          .mockResolvedValueOnce(
            new Response(JSON.stringify({ contact: { id: 'apollo-123' } }), { status: 200 }),
          )
          .mockResolvedValueOnce(
            new Response(JSON.stringify(WORKER_DOWNLOAD_RESPONSE), { status: 200 }),
          ),
      )

      const POST = await importRoute()
      const res = await POST(makeRequest(VALID_BODY))
      expect(res.status).toBe(200)
      const json = await res.json() as { success: boolean; downloadUrl: string; emailed: boolean }
      expect(json.success).toBe(true)
      expect(json.downloadUrl).toContain('lextract-lead-magnets/lease-abstraction-checklist-v3.pdf')
      expect(json.emailed).toBe(true)
    })

    it('calls the marketing worker /lead-magnet endpoint (not the old backend)', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ contact: { id: 'abc' } }), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(WORKER_DOWNLOAD_RESPONSE), { status: 200 }),
        )
      vi.stubGlobal('fetch', mockFetch)

      const POST = await importRoute()
      await POST(makeRequest(VALID_BODY))

      // Second call should go to the worker, not the old backend
      const secondCall = mockFetch.mock.calls[1] as [string, RequestInit]
      expect(secondCall[0]).toBe('https://marketing.example.com/lead-magnet')
      const headers = secondCall[1].headers as Record<string, string>
      expect(headers['Authorization']).toBe('Bearer worker-secret')
    })

    it('forwards magnetSlug, sourcePath, and placement to the worker', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ contact: { id: 'abc' } }), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(WORKER_DOWNLOAD_RESPONSE), { status: 200 }),
        )
      vi.stubGlobal('fetch', mockFetch)

      const POST = await importRoute()
      await POST(makeRequest({
        ...VALID_BODY,
        sourcePath: '/red-flags/cam',
        placement: 'exit-popup',
      }))

      const [, init] = mockFetch.mock.calls[1] as [string, RequestInit]
      const body = JSON.parse(init.body as string) as {
        magnetSlug: string
        sourcePath: string
        placement: string
      }
      expect(body.magnetSlug).toBe('lease-abstraction-checklist')
      expect(body.sourcePath).toBe('/red-flags/cam')
      expect(body.placement).toBe('exit-popup')
    })

    it('returns emailed from worker response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn()
          .mockResolvedValueOnce(
            new Response(JSON.stringify({ contact: { id: 'apollo-123' } }), { status: 200 }),
          )
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify({ success: true, downloadUrl: 'https://account.r2.cloudflarestorage.com/lextract-lead-magnets/x.pdf', emailed: false }),
              { status: 200 },
            ),
          ),
      )

      const POST = await importRoute()
      const res = await POST(makeRequest(VALID_BODY))
      expect(res.status).toBe(200)
      const json = await res.json() as { emailed: boolean }
      expect(json.emailed).toBe(false)
    })

    it('returns 502 when worker returns no downloadUrl', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn()
          .mockResolvedValueOnce(
            new Response(JSON.stringify({ contact: { id: 'apollo-123' } }), { status: 200 }),
          )
          .mockResolvedValueOnce(
            new Response(JSON.stringify({ success: true, downloadUrl: null }), { status: 200 }),
          ),
      )

      const POST = await importRoute()
      const res = await POST(makeRequest(VALID_BODY))
      expect(res.status).toBe(502)
      const json = await res.json() as { success: boolean; error: string }
      expect(json.success).toBe(false)
      expect(json.error).toBe('We could not prepare your resource right now. Please try again.')
    })

    it('passes optional firstName and company through to worker', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ contact: { id: 'abc' } }), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(WORKER_DOWNLOAD_RESPONSE), { status: 200 }),
        )
      vi.stubGlobal('fetch', mockFetch)

      const POST = await importRoute()
      const res = await POST(
        makeRequest({
          email: 'alice@example.com',
          magnetSlug: 'lease-abstraction-checklist',
          firstName: 'Alice',
          company: 'Acme LLC',
        }),
      )
      expect(res.status).toBe(200)

      const apolloCall = mockFetch.mock.calls[0] as [string, RequestInit]
      const apolloPayload = JSON.parse(apolloCall[1].body as string) as {
        first_name: string
        organization_name: string
      }
      expect(apolloPayload.first_name).toBe('Alice')
      expect(apolloPayload.organization_name).toBe('Acme LLC')

      // Worker call also has firstName
      const workerCall = mockFetch.mock.calls[1] as [string, RequestInit]
      const workerPayload = JSON.parse(workerCall[1].body as string) as {
        firstName: string
      }
      expect(workerPayload.firstName).toBe('Alice')
    })
  })

  // ── Validation ──────────────────────────────────────────────────────────────

  describe('Validation', () => {
    it('returns 400 for invalid email', async () => {
      const POST = await importRoute()
      const res = await POST(makeRequest({ email: 'not-an-email', magnetSlug: 'lease-abstraction-checklist' }))
      expect(res.status).toBe(400)
      const json = await res.json() as { success: boolean; error: string }
      expect(json.success).toBe(false)
      expect(json.error).toBeTruthy()
    })

    it('returns 400 for missing email', async () => {
      const POST = await importRoute()
      const res = await POST(makeRequest({ magnetSlug: 'lease-abstraction-checklist' }))
      expect(res.status).toBe(400)
      const json = await res.json() as { success: boolean; error: string }
      expect(json.success).toBe(false)
    })

    it('returns 400 for invalid/unknown magnet slug', async () => {
      const POST = await importRoute()
      const res = await POST(makeRequest({ email: 'a@b.com', magnetSlug: 'unknown-slug' }))
      expect(res.status).toBe(400)
      const json = await res.json() as { success: boolean; error: string }
      expect(json.success).toBe(false)
      expect(json.error).toBeTruthy()
    })

    it('returns 400 for missing magnetSlug', async () => {
      const POST = await importRoute()
      const res = await POST(makeRequest({ email: 'a@b.com' }))
      expect(res.status).toBe(400)
      const json = await res.json() as { success: boolean; error: string }
      expect(json.success).toBe(false)
    })

    it('returns 400 for unparseable JSON body', async () => {
      const POST = await importRoute()
      const req = new Request('https://lextract.io/api/leads/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
        body: 'not-json',
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
    })

    it('accepts valid sourcePath field', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ contact: { id: 'abc' } }), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(WORKER_DOWNLOAD_RESPONSE), { status: 200 }),
        )
      vi.stubGlobal('fetch', mockFetch)
      const POST = await importRoute()
      const res = await POST(makeRequest({ ...VALID_BODY, sourcePath: '/pricing' }))
      expect(res.status).toBe(200)
    })
  })

  // ── Rate Limiting ───────────────────────────────────────────────────────────

  describe('Rate Limiting', () => {
    it('returns 429 when rate limited (6th request from same IP)', async () => {
      const POST = await importRoute()
      const ip = '9.9.9.9'

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
      const ip1 = '201.0.0.1'
      const ip2 = '201.0.0.2'

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

  // ── Graceful degradation ────────────────────────────────────────────────────

  describe('Graceful degradation', () => {
    it('returns 502 when worker fetch throws (network error)', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn()
          .mockResolvedValueOnce(
            new Response(JSON.stringify({ contact: { id: 'abc' } }), { status: 200 }),
          )
          .mockRejectedValueOnce(new Error('Worker unreachable')),
      )

      const POST = await importRoute()
      const res = await POST(makeRequest(VALID_BODY))
      expect(res.status).toBe(502)
      const json = await res.json() as { success: boolean; error: string }
      expect(json.success).toBe(false)
      expect(json.error).toBe('We could not prepare your resource right now. Please try again.')
    })

    it('returns 502 when worker returns 5xx', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn()
          .mockResolvedValueOnce(
            new Response(JSON.stringify({ contact: { id: 'abc' } }), { status: 200 }),
          )
          .mockResolvedValueOnce(new Response('Internal Server Error', { status: 500 })),
      )

      const POST = await importRoute()
      const res = await POST(makeRequest(VALID_BODY))
      expect(res.status).toBe(502)
      const json = await res.json() as { success: boolean; error: string }
      expect(json.success).toBe(false)
      expect(json.error).toBe('We could not prepare your resource right now. Please try again.')
    })

    it('returns 503 when MARKETING_WORKER_URL is not set', async () => {
      delete process.env.MARKETING_WORKER_URL
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ contact: { id: 'abc' } }), { status: 200 }),
      )
      vi.stubGlobal('fetch', mockFetch)

      const POST = await importRoute()
      const res = await POST(makeRequest(VALID_BODY))
      expect(res.status).toBe(503)
      const json = await res.json() as { success: boolean; error: string }
      expect(json.success).toBe(false)
      expect(json.error).toBe('We could not prepare your resource right now. Please try again.')
      // Only Apollo was called (not the worker)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('still delivers from worker when Apollo call fails', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn()
          .mockRejectedValueOnce(new Error('Apollo down'))
          .mockResolvedValueOnce(
            new Response(JSON.stringify(WORKER_DOWNLOAD_RESPONSE), { status: 200 }),
          ),
      )

      const POST = await importRoute()
      const res = await POST(makeRequest(VALID_BODY))
      expect(res.status).toBe(200)
      const json = await res.json() as { success: boolean; downloadUrl: string }
      expect(json.success).toBe(true)
      expect(json.downloadUrl).toContain('lextract-lead-magnets')
    })

    it('falls back to the public asset when the worker rejects the bearer token', async () => {
      delete process.env.MARKETING_WORKER_SECRET
      const mockFetch = vi.fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ contact: { id: 'abc' } }), { status: 200 }),
        )
        .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
      vi.stubGlobal('fetch', mockFetch)

      const POST = await importRoute()
      const res = await POST(makeRequest(VALID_BODY))
      expect(res.status).toBe(200)
      const json = await res.json() as {
        success: boolean
        downloadUrl: string
        emailed: boolean
      }
      expect(json.success).toBe(true)
      expect(json.downloadUrl).toBe(
        '/lead-magnets/lease-abstraction-checklist-v3.pdf',
      )
      expect(json.emailed).toBe(false)

      // Assert the Authorization header sent to the worker uses an empty bearer token
      const [, workerInit] = mockFetch.mock.calls[1] as [string, RequestInit]
      const headers = workerInit.headers as Record<string, string>
      expect(headers['Authorization']).toBe('Bearer ')
    })

    it('still delivers when APOLLO_API_KEY is not set', async () => {
      delete process.env.APOLLO_API_KEY
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValueOnce(
          new Response(JSON.stringify(WORKER_DOWNLOAD_RESPONSE), { status: 200 }),
        ),
      )
      const POST = await importRoute()
      const res = await POST(makeRequest(VALID_BODY))
      expect(res.status).toBe(200)
      const json = await res.json() as { success: boolean; downloadUrl: string }
      expect(json.success).toBe(true)
      expect(json.downloadUrl).toContain('lextract-lead-magnets')
    })
  })

  // ── Apollo payload ──────────────────────────────────────────────────────────

  describe('Apollo payload', () => {
    it('calls Apollo with correct labels and lowercased email', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ contact: { id: 'abc' } }), { status: 200 }),
      )
      vi.stubGlobal('fetch', mockFetch)

      const POST = await importRoute()
      await POST(
        makeRequest({
          email: 'USER@EXAMPLE.COM',
          magnetSlug: 'due-diligence-checklist',
        }),
      )

      expect(mockFetch).toHaveBeenCalled()
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
      expect(payload.label_names).toContain('lextract-lead-magnet')
      expect(payload.label_names).toContain('magnet:due-diligence-checklist')
      expect(payload.run_dedupe).toBe(true)
    })

    it('adds exit popup attribution when placement is exit-popup', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ contact: { id: 'abc' } }), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(WORKER_DOWNLOAD_RESPONSE), { status: 200 }),
        )
      vi.stubGlobal('fetch', mockFetch)

      const POST = await importRoute()
      const res = await POST(
        makeRequest({
          email: 'exit@example.com',
          magnetSlug: 'cam-reconciliation-checklist',
          placement: 'exit-popup',
        }),
      )

      expect(res.status).toBe(200)

      const [, apolloOptions] = mockFetch.mock.calls[0] as [string, RequestInit]
      const apolloPayload = JSON.parse(apolloOptions.body as string) as {
        label_names: string[]
      }
      expect(apolloPayload.label_names).toContain('lextract-lead-magnet')
      expect(apolloPayload.label_names).toContain('lextract-exit-popup')
      expect(apolloPayload.label_names).toContain('magnet:cam-reconciliation-checklist')

      // Worker gets called for delivery
      const [workerUrl, workerOptions] = mockFetch.mock.calls[1] as [string, RequestInit]
      expect(workerUrl).toBe('https://marketing.example.com/lead-magnet')
      const workerPayload = JSON.parse(workerOptions.body as string) as {
        magnetSlug: string
        placement: string
      }
      expect(workerPayload.magnetSlug).toBe('cam-reconciliation-checklist')
      expect(workerPayload.placement).toBe('exit-popup')
    })
  })
})

describe('lead magnet registry', () => {
  it('defines R2-backed promoted magnets and rejects unknown slugs', () => {
    expect(LEAD_MAGNETS_BUCKET).toBe('lextract-lead-magnets')
    expect(PROMOTED_LEAD_MAGNETS).toHaveLength(4)
    expect(getLeadMagnet('lease-audit-workbook')?.r2ObjectKey).toBe(
      'lease-audit-workbook-v3.xlsx',
    )
    expect(getLeadMagnet('unknown-slug')).toBeUndefined()
  })
})
