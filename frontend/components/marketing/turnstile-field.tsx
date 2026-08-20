'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          'expired-callback': () => void
          'error-callback': () => void
        },
      ) => string
      remove: (widgetId: string) => void
    }
  }
}

const SCRIPT_ID = 'cloudflare-turnstile-script'

function ensureTurnstileScript(): void {
  if (document.getElementById(SCRIPT_ID)) {
    return
  }

  const script = document.createElement('script')
  script.id = SCRIPT_ID
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
  script.async = true
  script.defer = true
  document.head.appendChild(script)
}

export function TurnstileField({
  onTokenChange,
}: {
  onTokenChange: (token: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()

  useEffect(() => {
    if (!siteKey) {
      return
    }

    ensureTurnstileScript()
    let cancelled = false
    const intervalId = window.setInterval(() => {
      if (cancelled || widgetIdRef.current || !containerRef.current || !window.turnstile) {
        return
      }
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: onTokenChange,
        'expired-callback': () => onTokenChange(''),
        'error-callback': () => onTokenChange(''),
      })
      window.clearInterval(intervalId)
    }, 100)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [onTokenChange, siteKey])

  if (!siteKey) {
    return null
  }

  return <div ref={containerRef} />
}
