/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ErrorEvent, EventHint } from '@sentry/core'

const mockSentryInit = vi.fn()
const mockCaptureRequestError = vi.fn()
const mockCaptureRouterTransitionStart = vi.fn()

vi.mock('@sentry/nextjs', () => ({
  init: mockSentryInit,
  captureRequestError: mockCaptureRequestError,
  captureRouterTransitionStart: mockCaptureRouterTransitionStart,
}))

type BrowserBeforeSend = (
  event: ErrorEvent,
  hint: EventHint,
) => PromiseLike<ErrorEvent | null> | ErrorEvent | null

interface BrowserInitOptions {
  beforeSend?: BrowserBeforeSend
}

function hasBrowserInitOptions(value: unknown): value is BrowserInitOptions {
  return typeof value === 'object' && value !== null && 'beforeSend' in value
}

function getBrowserBeforeSend(): BrowserBeforeSend {
  const options = mockSentryInit.mock.calls[0]?.[0]

  if (!hasBrowserInitOptions(options) || !options.beforeSend) {
    throw new Error('Expected browser Sentry init to configure beforeSend')
  }

  return options.beforeSend
}

describe('Sentry App Router setup', () => {
  beforeEach(() => {
    vi.resetModules()
    mockSentryInit.mockClear()
    mockCaptureRequestError.mockClear()
    mockCaptureRouterTransitionStart.mockClear()
    vi.unstubAllEnvs()
  })

  it('initializes browser Sentry from instrumentation-client when client reporting is enabled and a DSN exists', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://key@sentry.io/123')
    vi.stubEnv('NEXT_PUBLIC_SENTRY_ENABLED', 'true')
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'preview')

    await import('@/instrumentation-client')

    expect(mockSentryInit).toHaveBeenCalledOnce()
    expect(mockSentryInit).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://key@sentry.io/123',
        environment: 'preview',
        tracesSampleRate: 0.2,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
      }),
    )
  })

  it('uses production as the browser environment fallback', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://key@sentry.io/123')
    vi.stubEnv('NEXT_PUBLIC_SENTRY_ENABLED', 'true')

    await import('@/instrumentation-client')

    expect(mockSentryInit).toHaveBeenCalledWith(
      expect.objectContaining({
        environment: 'production',
      }),
    )
  })

  it('skips browser initialization when NEXT_PUBLIC_SENTRY_DSN is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_ENABLED', 'true')

    await import('@/instrumentation-client')

    expect(mockSentryInit).not.toHaveBeenCalled()
  })

  it('skips browser initialization unless client reporting is explicitly enabled', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://key@sentry.io/123')

    await import('@/instrumentation-client')

    expect(mockSentryInit).not.toHaveBeenCalled()
  })

  it('drops browser runtime sendMessage tab-not-found noise before sending', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://key@sentry.io/123')
    vi.stubEnv('NEXT_PUBLIC_SENTRY_ENABLED', 'true')
    const runtimeSendMessageEvent: ErrorEvent = {
      type: undefined,
      exception: {
        values: [
          {
            type: 'Error',
            value: 'Invalid call to runtime.sendMessage(). Tab not found.',
          },
        ],
      },
    }

    await import('@/instrumentation-client')

    const beforeSend = getBrowserBeforeSend()

    expect(beforeSend(runtimeSendMessageEvent, {})).toBeNull()
  })

  it('drops browser runtime sendMessage tab-not-found messages before sending', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://key@sentry.io/123')
    vi.stubEnv('NEXT_PUBLIC_SENTRY_ENABLED', 'true')
    const runtimeSendMessageEvent: ErrorEvent = {
      type: undefined,
      message: 'Invalid call to runtime.sendMessage(). Tab not found.',
    }

    await import('@/instrumentation-client')

    const beforeSend = getBrowserBeforeSend()

    expect(beforeSend(runtimeSendMessageEvent, {})).toBeNull()
  })

  it('keeps normal browser application errors before sending', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://key@sentry.io/123')
    vi.stubEnv('NEXT_PUBLIC_SENTRY_ENABLED', 'true')
    const applicationEvent: ErrorEvent = {
      type: undefined,
      exception: {
        values: [
          {
            type: 'Error',
            value: 'Application render failed',
          },
        ],
      },
    }

    await import('@/instrumentation-client')

    const beforeSend = getBrowserBeforeSend()

    expect(beforeSend(applicationEvent, {})).toBe(applicationEvent)
  })

  it('exports the official router transition hook', async () => {
    const instrumentationClient = await import('@/instrumentation-client')

    expect(instrumentationClient.onRouterTransitionStart).toBe(
      mockCaptureRouterTransitionStart,
    )
  })

  it('exports the official request error hook', async () => {
    const instrumentation = await import('@/instrumentation')

    expect(instrumentation.onRequestError).toBe(mockCaptureRequestError)
  })

  it('registers server Sentry config for the node runtime', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs')
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://key@sentry.io/123')

    const instrumentation = await import('@/instrumentation')
    await instrumentation.register()

    expect(mockSentryInit).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://key@sentry.io/123',
        environment: 'production',
        tracesSampleRate: 0.2,
      }),
    )
  })

  it('registers edge Sentry config for the edge runtime', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'edge')
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://key@sentry.io/123')

    const instrumentation = await import('@/instrumentation')
    await instrumentation.register()

    expect(mockSentryInit).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://key@sentry.io/123',
        environment: 'production',
        tracesSampleRate: 0.2,
      }),
    )
  })

  it('does not initialize edge Sentry config without a DSN', async () => {
    await import('@/sentry.edge.config')

    expect(mockSentryInit).not.toHaveBeenCalled()
  })

  it('does not initialize server Sentry when runtime config has no DSN', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs')

    const instrumentation = await import('@/instrumentation')
    await instrumentation.register()

    expect(mockSentryInit).not.toHaveBeenCalled()
  })
})
