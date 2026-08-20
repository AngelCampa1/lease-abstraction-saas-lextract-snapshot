/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock posthog-js before importing our module
const mockPosthog = {
  init: vi.fn(),
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
}
vi.mock('posthog-js', () => ({
  default: mockPosthog,
}))

describe('posthog client', () => {
  beforeEach(() => {
    vi.resetModules()
    mockPosthog.init.mockClear()
    mockPosthog.capture.mockClear()
    mockPosthog.identify.mockClear()
    mockPosthog.reset.mockClear()
    vi.unstubAllEnvs()
  })

  describe('initPostHog', () => {
    it('initializes posthog in production with valid key and host', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test123')
      vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://app.posthog.com')

      const { initPostHog } = await import('@/lib/posthog')
      const result = initPostHog()

      expect(result).toBe(true)
      expect(mockPosthog.init).toHaveBeenCalledOnce()
      expect(mockPosthog.init).toHaveBeenCalledWith('phc_test123', expect.objectContaining({
        api_host: 'https://app.posthog.com',
      }))
    })

    it('does not initialize in development', async () => {
      vi.stubEnv('NODE_ENV', 'development')
      vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test123')
      vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://app.posthog.com')

      const { initPostHog } = await import('@/lib/posthog')
      const result = initPostHog()

      expect(result).toBe(false)
      expect(mockPosthog.init).not.toHaveBeenCalled()
    })

    it('does not initialize without a key', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      // No NEXT_PUBLIC_POSTHOG_KEY set

      const { initPostHog } = await import('@/lib/posthog')
      const result = initPostHog()

      expect(result).toBe(false)
      expect(mockPosthog.init).not.toHaveBeenCalled()
    })

    it('disables autocapture and manual page view capture', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test123')
      vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://app.posthog.com')

      const { initPostHog } = await import('@/lib/posthog')
      initPostHog()

      const initOptions = mockPosthog.init.mock.calls[0][1] as Record<string, unknown>
      expect(initOptions.autocapture).toBe(false)
      expect(initOptions.capture_pageview).toBe(false)
    })

    it('disables feature flag polling to avoid unauthorized /flags noise', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test123')
      vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://app.posthog.com')

      const { initPostHog } = await import('@/lib/posthog')
      initPostHog()

      const initOptions = mockPosthog.init.mock.calls[0][1] as Record<string, unknown>
      expect(initOptions.advanced_disable_flags).toBe(true)
    })

    it('uses default host when NEXT_PUBLIC_POSTHOG_HOST is not set', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test123')

      const { initPostHog } = await import('@/lib/posthog')
      initPostHog()

      const initOptions = mockPosthog.init.mock.calls[0][1] as Record<string, unknown>
      expect(initOptions.api_host).toBe('https://app.posthog.com')
    })
  })

  describe('captureEvent', () => {
    it('calls posthog.capture with name and properties', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test123')
      const { captureEvent, initPostHog, EVENTS } = await import('@/lib/posthog')
      initPostHog()
      captureEvent(EVENTS.upload_file_selected, { file_size: 1024 })

      expect(mockPosthog.capture).toHaveBeenCalledOnce()
      expect(mockPosthog.capture).toHaveBeenCalledWith('upload_file_selected', { file_size: 1024 })
    })

    it('calls posthog.capture with just a name', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test123')
      const { captureEvent, initPostHog } = await import('@/lib/posthog')
      initPostHog()
      captureEvent('$pageview')

      expect(mockPosthog.capture).toHaveBeenCalledOnce()
      expect(mockPosthog.capture).toHaveBeenCalledWith('$pageview', undefined)
    })
  })

  describe('identifyUser', () => {
    it('calls posthog.identify with user ID and traits', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test123')
      const { identifyUser, initPostHog } = await import('@/lib/posthog')
      initPostHog()
      identifyUser('user-123', { email: 'test@example.com', plan: 'pro' })

      expect(mockPosthog.identify).toHaveBeenCalledOnce()
      expect(mockPosthog.identify).toHaveBeenCalledWith('user-123', {
        email: 'test@example.com',
        plan: 'pro',
      })
    })

    it('calls posthog.identify with only user ID', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test123')
      const { identifyUser, initPostHog } = await import('@/lib/posthog')
      initPostHog()
      identifyUser('user-456')

      expect(mockPosthog.identify).toHaveBeenCalledOnce()
      expect(mockPosthog.identify).toHaveBeenCalledWith('user-456', undefined)
    })
  })

  describe('resetPostHog', () => {
    it('calls posthog.reset', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test123')
      const { resetPostHog, initPostHog } = await import('@/lib/posthog')
      initPostHog()
      resetPostHog()

      expect(mockPosthog.reset).toHaveBeenCalledOnce()
    })
  })
})
