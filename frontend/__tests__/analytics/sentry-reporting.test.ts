/** @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSetTag = vi.fn()
const mockCaptureException = vi.fn()
const mockCaptureMessage = vi.fn()
const mockWithScope = vi.fn(
  (callback: (scope: { setTag: (key: string, value: string) => void }) => void) => {
    callback({ setTag: mockSetTag })
  },
)

vi.mock('@sentry/nextjs', () => ({
  captureException: mockCaptureException,
  captureMessage: mockCaptureMessage,
  withScope: mockWithScope,
}))

describe('Sentry reporting helpers', () => {
  beforeEach(() => {
    mockSetTag.mockClear()
    mockCaptureException.mockClear()
    mockCaptureMessage.mockClear()
    mockWithScope.mockClear()
  })

  it('captures error-boundary exceptions with safe tags', async () => {
    const { captureFrontendException } = await import('@/lib/sentry-reporting')
    const error = new Error('render failed')

    captureFrontendException(error, {
      area: 'marketing',
      route: 'marketing',
      surface: 'error-boundary',
    })

    expect(mockSetTag).toHaveBeenCalledWith('area', 'marketing')
    expect(mockSetTag).toHaveBeenCalledWith('surface', 'error-boundary')
    expect(mockSetTag).toHaveBeenCalledWith('route', 'marketing')
    expect(mockSetTag).toHaveBeenCalledWith('handled', 'true')
    expect(mockCaptureException).toHaveBeenCalledWith(error)
  })

  it('captures non-Error API failures as Error instances', async () => {
    const { captureFrontendApiError } = await import('@/lib/sentry-reporting')

    captureFrontendApiError('network failed', {
      area: 'marketing',
      route: '/api/leads',
      externalService: 'apollo',
      operation: 'upsert-contact',
    })

    const captured = mockCaptureException.mock.calls[0]?.[0]
    expect(captured).toBeInstanceOf(Error)
    expect(captured.message).toBe('network failed')
    expect(mockSetTag).toHaveBeenCalledWith('surface', 'frontend-api')
    expect(mockSetTag).toHaveBeenCalledWith('external_service', 'apollo')
    expect(mockSetTag).toHaveBeenCalledWith('operation', 'upsert-contact')
  })

  it('uses a fallback Error when the thrown value is not useful', async () => {
    const { captureFrontendApiError } = await import('@/lib/sentry-reporting')

    captureFrontendApiError(undefined, {
      area: 'marketing',
      route: '/api/leads',
    })

    const captured = mockCaptureException.mock.calls[0]?.[0]
    expect(captured).toBeInstanceOf(Error)
    expect(captured.message).toBe('Frontend error')
  })

  it('captures API messages with status code tags', async () => {
    const { captureFrontendApiMessage } = await import('@/lib/sentry-reporting')

    captureFrontendApiMessage('Backend returned a non-OK response', {
      area: 'marketing',
      route: '/api/leads/download',
      externalService: 'backend-api',
      operation: 'create-lead-magnet',
      statusCode: 503,
    })

    expect(mockSetTag).toHaveBeenCalledWith('status_code', '503')
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      'Backend returned a non-OK response',
      { level: 'error' },
    )
  })
})
