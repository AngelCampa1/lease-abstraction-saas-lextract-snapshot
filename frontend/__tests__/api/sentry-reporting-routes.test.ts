/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockCaptureFrontendApiError = vi.fn()
const mockCaptureFrontendApiMessage = vi.fn()

vi.mock('@/lib/sentry-reporting', () => ({
  captureFrontendApiError: mockCaptureFrontendApiError,
  captureFrontendApiMessage: mockCaptureFrontendApiMessage,
}))

function makeJsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '203.0.113.10',
      referer: 'https://lextract.io/resources',
    },
    body: JSON.stringify(body),
  })
}

describe('frontend API Sentry reporting', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    mockCaptureFrontendApiError.mockClear()
    mockCaptureFrontendApiMessage.mockClear()
    process.env.APOLLO_API_KEY = 'test-api-key'
    process.env.RESEND_API_KEY = 'test-resend-key'
    process.env.NEXT_PUBLIC_API_URL = 'https://api.lextract.io/api/v1'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    global.fetch = originalFetch
    delete process.env.APOLLO_API_KEY
    delete process.env.RESEND_API_KEY
    delete process.env.NEXT_PUBLIC_API_URL
    delete process.env.MARKETING_WORKER_URL
    delete process.env.MARKETING_WORKER_SECRET
    vi.resetModules()
  })

  it('reports swallowed Apollo failures while preserving calculator success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 502 })))

    const { POST } = await import('@/app/api/leads/calculator/route')
    const response = await POST(makeJsonRequest('https://lextract.io/api/leads/calculator', {
      email: 'lead@example.com',
      calculatorSlug: 'nnn-lease-cost-calculator',
    }))

    expect(response.status).toBe(200)
    expect(mockCaptureFrontendApiMessage).toHaveBeenCalledWith(
      'Apollo returned a non-OK response',
      expect.objectContaining({
        route: '/api/leads/calculator',
        area: 'marketing',
        externalService: 'apollo',
        statusCode: 502,
      }),
    )
  })

  it('reports Resend failures while preserving feedback 500 response shape', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bad', { status: 500 })))

    const { POST } = await import('@/app/api/feedback/route')
    const response = await POST(makeJsonRequest('https://lextract.io/api/feedback', {
      message: 'The page failed',
    }))

    expect(response.status).toBe(500)
    expect(mockCaptureFrontendApiMessage).toHaveBeenCalledWith(
      'Resend returned a non-OK response',
      expect.objectContaining({
        route: '/api/feedback',
        area: 'marketing',
        externalService: 'resend',
        statusCode: 500,
      }),
    )
  })

  it('reports backend lead magnet failures without falling back to public files', async () => {
    process.env.MARKETING_WORKER_URL = 'https://marketing.example.com'
    process.env.MARKETING_WORKER_SECRET = 'test-secret'
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ contact: { id: 'apollo-1' } }), { status: 200 }))
        .mockResolvedValueOnce(new Response('worker failed', { status: 503 })),
    )

    const { POST } = await import('@/app/api/leads/download/route')
    const response = await POST(makeJsonRequest('https://lextract.io/api/leads/download', {
      email: 'lead@example.com',
      magnetSlug: 'lease-abstraction-checklist',
    }))

    expect(response.status).toBe(502)
    expect(mockCaptureFrontendApiMessage).toHaveBeenCalledWith(
      'Marketing worker lead-magnet endpoint returned a non-OK response',
      expect.objectContaining({
        route: '/api/leads/download',
        area: 'marketing',
        externalService: 'marketing-worker',
        operation: 'lead-magnet-download',
        statusCode: 503,
      }),
    )
  })
})
