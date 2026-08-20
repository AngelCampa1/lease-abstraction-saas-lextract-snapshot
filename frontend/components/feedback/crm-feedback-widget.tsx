'use client'

import Script from 'next/script'

const DEFAULT_LOADER_URL = 'https://widgets.ventoralabs.com/w/v1.js'

/**
 * Injects the Ventora CRM feedback-button widget into the authenticated app surface.
 *
 * The widget is gated on NEXT_PUBLIC_CRM_WIDGET_KEY being set. When the env var
 * is absent (e.g. local dev without the key) this component renders nothing.
 *
 * The CRM enforces an origin allowlist server-side; on hosts other than
 * https://app.lextract.io the loader no-ops silently - that is expected.
 *
 * CSP note: https://widgets.ventoralabs.com is added to script-src and connect-src
 * in next.config.ts to allow the loader script and its widget data fetch.
 */
export function CrmFeedbackWidget() {
  const key = process.env.NEXT_PUBLIC_CRM_WIDGET_KEY
  const url = process.env.NEXT_PUBLIC_CRM_LOADER_URL || DEFAULT_LOADER_URL

  if (!key) return null

  return (
    <Script
      src={url}
      data-product={key}
      data-widget="feedback-button"
      strategy="afterInteractive"
    />
  )
}
