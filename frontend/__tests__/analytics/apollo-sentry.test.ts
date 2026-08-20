/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockCaptureFrontendApiError = vi.fn()
const mockCaptureFrontendApiMessage = vi.fn()

vi.mock('@/lib/sentry-reporting', () => ({
  captureFrontendApiError: mockCaptureFrontendApiError,
  captureFrontendApiMessage: mockCaptureFrontendApiMessage,
}))

describe('Apollo Sentry reporting', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    mockCaptureFrontendApiError.mockClear()
    mockCaptureFrontendApiMessage.mockClear()
    process.env.APOLLO_API_KEY = 'test-api-key'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    global.fetch = originalFetch
    delete process.env.APOLLO_API_KEY
    vi.resetModules()
  })

  it('returns Apollo contact id on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ contact: { id: 'contact-123' } }), {
          status: 200,
        }),
      ),
    )

    const { upsertApolloContact } = await import('@/lib/apollo')
    const result = await upsertApolloContact({
      email: 'Lead@Example.com',
      firstName: 'Lead',
      company: 'Acme',
      labelNames: ['lextract-test'],
    })

    expect(result).toBe('contact-123')
    expect(mockCaptureFrontendApiMessage).not.toHaveBeenCalled()
  })

  it('returns null when Apollo succeeds without a contact id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ contact: {} }), {
          status: 200,
        }),
      ),
    )

    const { upsertApolloContact } = await import('@/lib/apollo')
    const result = await upsertApolloContact({
      email: 'lead@example.com',
      labelNames: ['lextract-test'],
    })

    expect(result).toBeNull()
  })

  it('reports missing Apollo API key and skips fetch', async () => {
    delete process.env.APOLLO_API_KEY
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    const { upsertApolloContact } = await import('@/lib/apollo')
    const result = await upsertApolloContact({
      email: 'lead@example.com',
      labelNames: ['lextract-test'],
    })

    expect(result).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
    expect(mockCaptureFrontendApiMessage).toHaveBeenCalledWith(
      'Apollo API key is not configured',
      expect.objectContaining({
        externalService: 'apollo',
        operation: 'config',
      }),
    )
  })

  it('reports Apollo non-OK responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('bad gateway', { status: 502 })),
    )

    const { upsertApolloContact } = await import('@/lib/apollo')
    const result = await upsertApolloContact({
      email: 'lead@example.com',
      labelNames: ['lextract-test'],
    })

    expect(result).toBeNull()
    expect(mockCaptureFrontendApiMessage).toHaveBeenCalledWith(
      'Apollo returned a non-OK response',
      expect.objectContaining({
        externalService: 'apollo',
        operation: 'upsert-contact',
        statusCode: 502,
      }),
    )
  })

  it('reports Apollo non-OK responses when the response body is unreadable', async () => {
    const response = new Response('bad gateway', { status: 502 })
    vi.spyOn(response, 'text').mockRejectedValue(new Error('body locked'))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))

    const { upsertApolloContact } = await import('@/lib/apollo')
    const result = await upsertApolloContact({
      email: 'lead@example.com',
      labelNames: ['lextract-test'],
    })

    expect(result).toBeNull()
    expect(mockCaptureFrontendApiMessage).toHaveBeenCalledWith(
      'Apollo returned a non-OK response',
      expect.objectContaining({
        statusCode: 502,
      }),
    )
  })

  it('reports Apollo network errors', async () => {
    const error = new Error('network down')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error))

    const { upsertApolloContact } = await import('@/lib/apollo')
    const result = await upsertApolloContact({
      email: 'lead@example.com',
      labelNames: ['lextract-test'],
    })

    expect(result).toBeNull()
    expect(mockCaptureFrontendApiError).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        externalService: 'apollo',
        operation: 'upsert-contact',
      }),
    )
  })
})
