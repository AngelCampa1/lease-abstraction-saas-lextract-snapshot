'use client'

/**
 * Analytics provider component.
 *
 * Initializes PostHog on mount, and tracks page views on route changes
 * via Next.js usePathname. Renders no visual output.
 */

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { initPostHog, captureEvent } from '@/lib/posthog'

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Initialize analytics once on mount. Sentry is initialized by App Router instrumentation.
  useEffect(() => {
    initPostHog()
  }, [])

  // Track page views on pathname changes
  useEffect(() => {
    captureEvent('$pageview', { path: pathname })
  }, [pathname])

  return <>{children}</>
}
