/** @vitest-environment node */
import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockCaptureFrontendApiError, mockCaptureFrontendApiMessage } = vi.hoisted(
  () => ({
    mockCaptureFrontendApiError: vi.fn(),
    mockCaptureFrontendApiMessage: vi.fn(),
  }),
)

vi.mock('@/lib/sentry-reporting', () => ({
  captureFrontendApiError: mockCaptureFrontendApiError,
  captureFrontendApiMessage: mockCaptureFrontendApiMessage,
}))

describe('marketing worker client', () => {
  const originalFetch = global.fetch
  const originalUrl = process.env.MARKETING_WORKER_URL
  const originalSecret = process.env.MARKETING_WORKER_SECRET

  afterEach(() => {
    global.fetch = originalFetch
    if (originalUrl === undefined) {
      delete process.env.MARKETING_WORKER_URL
    } else {
      process.env.MARKETING_WORKER_URL = originalUrl
    }
    if (originalSecret === undefined) {
      delete process.env.MARKETING_WORKER_SECRET
    } else {
      process.env.MARKETING_WORKER_SECRET = originalSecret
    }
    vi.resetModules()
    vi.restoreAllMocks()
    mockCaptureFrontendApiError.mockClear()
    mockCaptureFrontendApiMessage.mockClear()
  })

  it('sends capture events with the configured bearer token', async () => {
    process.env.MARKETING_WORKER_URL = 'https://marketing.lextract.workers.dev/'
    process.env.MARKETING_WORKER_SECRET = 'secret-token'
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, leadId: 'lead-1' }), {
        status: 200,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { captureMarketingEvent } = await import('@/lib/marketing-worker')
    const result = await captureMarketingEvent({
      eventType: 'lead_magnet',
      email: 'USER@Example.com',
      magnetSlug: 'lease-abstraction-checklist',
      source: 'https://lextract.io/templates/lease-abstraction-checklist',
    })

    expect(result).toEqual({ success: true, leadId: 'lead-1' })
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://marketing.lextract.workers.dev/capture')
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer secret-token',
      'Content-Type': 'application/json',
    })
    expect(JSON.parse(init.body as string)).toMatchObject({
      event_type: 'lead_magnet',
      email: 'USER@Example.com',
      magnet_slug: 'lease-abstraction-checklist',
    })
  })

  it('skips persistence when worker configuration is absent', async () => {
    delete process.env.MARKETING_WORKER_URL
    delete process.env.MARKETING_WORKER_SECRET
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { captureMarketingEvent } = await import('@/lib/marketing-worker')
    const result = await captureMarketingEvent({
      eventType: 'email_gate',
      email: 'tenant@example.com',
    })

    expect(result).toEqual({ success: false, skipped: true })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(mockCaptureFrontendApiMessage).toHaveBeenCalledWith(
      'Marketing worker configuration is missing',
      expect.objectContaining({
        area: 'marketing',
        route: '/api/leads',
        externalService: 'marketing-worker',
        operation: 'capture',
      }),
    )
  })

  it('treats successful responses with unreadable JSON as successful captures', async () => {
    process.env.MARKETING_WORKER_URL = 'https://marketing.example.com'
    process.env.MARKETING_WORKER_SECRET = 'secret-token'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('not json', { status: 200 })),
    )

    const { captureMarketingEvent } = await import('@/lib/marketing-worker')
    const result = await captureMarketingEvent({
      eventType: 'email_gate',
      email: 'tenant@example.com',
    })

    expect(result).toEqual({ success: true, leadId: undefined })
  })

  it('swallows worker failures so marketing forms can degrade gracefully', async () => {
    process.env.MARKETING_WORKER_URL = 'https://marketing.example.com'
    process.env.MARKETING_WORKER_SECRET = 'secret-token'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bad', { status: 500 })))

    const { captureMarketingEvent } = await import('@/lib/marketing-worker')
    const result = await captureMarketingEvent({
      eventType: 'calculator',
      email: 'tenant@example.com',
      toolSlug: 'nnn-lease-cost-calculator',
    })

    expect(result.success).toBe(false)
    expect(result.skipped).toBe(false)
    expect(mockCaptureFrontendApiMessage).toHaveBeenCalledWith(
      'Marketing worker returned a non-OK response',
      expect.objectContaining({
        externalService: 'marketing-worker',
        statusCode: 500,
      }),
    )
  })

  it('reports network errors without blocking the caller', async () => {
    process.env.MARKETING_WORKER_URL = 'https://marketing.example.com'
    process.env.MARKETING_WORKER_SECRET = 'secret-token'
    const error = new Error('network down')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error))

    const { captureMarketingEvent } = await import('@/lib/marketing-worker')
    const result = await captureMarketingEvent({
      eventType: 'results_survey',
      email: 'tenant@example.com',
      payload: { wouldPay: true },
    })

    expect(result).toEqual({ success: false, skipped: false })
    expect(mockCaptureFrontendApiError).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        area: 'marketing',
        route: '/api/leads',
        externalService: 'marketing-worker',
        operation: 'capture',
      }),
    )
  })
})
