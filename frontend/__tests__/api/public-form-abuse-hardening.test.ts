/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function jsonRequest(url: string, body: unknown, ip: string): Request {
  return new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  })
}

const downloadBody = {
  email: 'target@example.com',
  magnetSlug: 'lease-abstraction-checklist',
}

describe('public marketing form abuse hardening', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    process.env.APOLLO_API_KEY = 'test-api-key'
    process.env.MARKETING_WORKER_SECRET = 'test-worker-secret'
    process.env.MARKETING_WORKER_URL = 'https://marketing.example.com'
    process.env.NEXT_PUBLIC_API_URL = 'https://api.lextract.io/api/v1'
    process.env.RESEND_API_KEY = 'test-resend-key'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            downloadUrl:
              'https://account.r2.cloudflarestorage.com/lextract-lead-magnets/lease-abstraction-checklist-v3.pdf?sig=abc',
          }),
          { status: 200 },
        ),
      ),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    global.fetch = originalFetch
    delete process.env.APOLLO_API_KEY
    delete process.env.MARKETING_WORKER_SECRET
    delete process.env.MARKETING_WORKER_URL
    delete process.env.NEXT_PUBLIC_API_URL
    delete process.env.RESEND_API_KEY
    delete process.env.TURNSTILE_SECRET_KEY
    delete process.env.VERCEL_ENV
    vi.resetModules()
  })

  it('fails closed before side effects when Turnstile is not configured in production', async () => {
    process.env.VERCEL_ENV = 'production'
    const { POST } = await import('@/app/api/leads/download/route')

    const response = await POST(
      jsonRequest('https://lextract.io/api/leads/download', downloadBody, '198.51.100.10'),
    )

    expect(response.status).toBe(403)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('silently no-ops honeypot submissions without Apollo or email delivery', async () => {
    const { POST } = await import('@/app/api/leads/download/route')

    const response = await POST(
      jsonRequest(
        'https://lextract.io/api/leads/download',
        { ...downloadBody, company_website: 'https://bot.example' },
        '198.51.100.11',
      ),
    )

    expect(response.status).toBe(200)
    const payload = await response.json() as { success: boolean; downloadUrl?: string }
    expect(payload.success).toBe(true)
    expect(payload.downloadUrl).toBeUndefined()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rate limits the same email even when IPs rotate', async () => {
    const { POST } = await import('@/app/api/leads/download/route')

    for (let index = 0; index < 3; index += 1) {
      const response = await POST(
        jsonRequest(
          'https://lextract.io/api/leads/download',
          downloadBody,
          `203.0.113.${index + 1}`,
        ),
      )
      expect(response.status).toBe(200)
    }

    const blocked = await POST(
      jsonRequest('https://lextract.io/api/leads/download', downloadBody, '203.0.113.50'),
    )

    expect(blocked.status).toBe(429)
  })

  it('protects feedback email sends with the same production Turnstile fail-closed check', async () => {
    process.env.VERCEL_ENV = 'production'
    const { POST } = await import('@/app/api/feedback/route')

    const response = await POST(
      jsonRequest(
        'https://lextract.io/api/feedback',
        { message: 'Please contact me', email: 'lead@example.com' },
        '198.51.100.12',
      ),
    )

    expect(response.status).toBe(403)
    expect(fetch).not.toHaveBeenCalled()
  })
})
