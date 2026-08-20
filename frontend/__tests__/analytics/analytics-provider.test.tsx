import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import React from 'react'

// Mock posthog-js
const mockPosthog = {
  init: vi.fn(),
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
}
vi.mock('posthog-js', () => ({
  default: mockPosthog,
}))

// Mock @sentry/nextjs
vi.mock('@sentry/nextjs', () => ({
  init: vi.fn(),
  setUser: vi.fn(),
}))

// Track pathname changes
let currentPathname = '/initial'
const pathnameCallbacks: Array<() => void> = []

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => currentPathname,
}))

// Mock the posthog module
vi.mock('@/lib/posthog', () => ({
  initPostHog: vi.fn().mockReturnValue(true),
  captureEvent: vi.fn(),
  identifyUser: vi.fn(),
  resetPostHog: vi.fn(),
}))

describe('AnalyticsProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentPathname = '/initial'
  })

  afterEach(() => {
    pathnameCallbacks.length = 0
  })

  it('renders children', async () => {
    const { AnalyticsProvider } = await import(
      '@/components/providers/analytics-provider'
    )

    const { getByText } = render(
      <AnalyticsProvider>
        <div>Test Content</div>
      </AnalyticsProvider>,
    )

    expect(getByText('Test Content')).toBeInTheDocument()
  })

  it('initializes PostHog on mount', async () => {
    const { initPostHog } = await import('@/lib/posthog')
    const { AnalyticsProvider } = await import(
      '@/components/providers/analytics-provider'
    )

    render(
      <AnalyticsProvider>
        <div>child</div>
      </AnalyticsProvider>,
    )

    expect(initPostHog).toHaveBeenCalled()
  })

  it('captures page view event on pathname change', async () => {
    const { captureEvent } = await import('@/lib/posthog')
    const { AnalyticsProvider } = await import(
      '@/components/providers/analytics-provider'
    )

    const { rerender } = render(
      <AnalyticsProvider>
        <div>child</div>
      </AnalyticsProvider>,
    )

    // Initial render captures page view for /initial
    expect(captureEvent).toHaveBeenCalledWith('$pageview', { path: '/initial' })

    // Simulate pathname change
    currentPathname = '/dashboard'
    await act(async () => {
      rerender(
        <AnalyticsProvider>
          <div>child</div>
        </AnalyticsProvider>,
      )
    })

    expect(captureEvent).toHaveBeenCalledWith('$pageview', { path: '/dashboard' })
  })

  it('does not render any visible wrapper element', async () => {
    const { AnalyticsProvider } = await import(
      '@/components/providers/analytics-provider'
    )

    const { container } = render(
      <AnalyticsProvider>
        <span data-testid="child">hello</span>
      </AnalyticsProvider>,
    )

    // The provider should not add any wrapper elements
    // The first child of container should be the span
    const firstChild = container.firstElementChild
    expect(firstChild?.tagName).toBe('SPAN')
  })
})
