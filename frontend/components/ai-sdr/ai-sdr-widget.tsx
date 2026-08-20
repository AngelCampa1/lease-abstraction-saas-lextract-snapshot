'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AI_SDR_BFF_BASE_URL,
  AI_SDR_CLIENT_BUNDLE_URL,
  AI_SDR_MAX_POLL_ATTEMPTS,
  AI_SDR_POLL_INTERVAL_MS,
  AI_SDR_PRODUCT_ID,
  AI_SDR_SCRIPT_ID,
  AI_SDR_SURFACE,
  AI_SDR_WIDGET_ROOT_ID,
} from '@/lib/ai-sdr-widget-config'

interface AiSdrWidgetHandle {
  open: () => void
  destroy: () => void
}

interface VentoraAiSdrGlobal {
  createAiSdrWidget: (config: {
    target: HTMLElement
    api: { baseUrl: string }
    session: { productId: string; metadata?: Record<string, string> }
  }) => AiSdrWidgetHandle
}

declare global {
  interface Window {
    VentoraAiSdr?: VentoraAiSdrGlobal
  }
}

type LauncherStatus = 'idle' | 'loading' | 'error'

const LAUNCHER_LABELS: Record<LauncherStatus, string> = {
  idle: 'Chat with Lextract',
  loading: 'Starting chat…',
  error: 'Chat unavailable, try again',
}

function loadBundle(onError: () => void): void {
  if (document.getElementById(AI_SDR_SCRIPT_ID) !== null) {
    return
  }
  const script = document.createElement('script')
  script.async = true
  script.defer = true
  script.id = AI_SDR_SCRIPT_ID
  script.src = AI_SDR_CLIENT_BUNDLE_URL
  script.addEventListener('error', onError, { once: true })
  document.head.append(script)
}

/**
 * Renders the lextract AI-SDR entry point.
 *
 * The hosted bundle (`window.VentoraAiSdr.createAiSdrWidget`) does not paint any
 * UI until its `open()` is called, so this component owns a visible pill
 * launcher. On first click it loads the bundle once, creates the widget against
 * the same-origin BFF (keeping the signing secret server-side), opens it, and
 * hides its own launcher so the bundle's launcher/panel becomes the single
 * control. The bundle honors prefers-reduced-motion internally; the local pill
 * limits its own transition to `motion-safe`.
 */
export function AiSdrWidget() {
  const targetRef = useRef<HTMLDivElement | null>(null)
  const handleRef = useRef<AiSdrWidgetHandle | null>(null)
  const timerRef = useRef<number | undefined>(undefined)
  const [status, setStatus] = useState<LauncherStatus>('idle')
  const [mounted, setMounted] = useState(false)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current)
      timerRef.current = undefined
    }
  }, [])

  useEffect(() => {
    return () => {
      clearTimer()
      handleRef.current?.destroy()
      handleRef.current = null
    }
  }, [clearTimer])

  const openChat = useCallback(() => {
    setStatus('loading')
    clearTimer()
    loadBundle(() => {
      clearTimer()
      setStatus('error')
    })

    let attempts = 0
    const tryCreate = () => {
      const target = targetRef.current
      if (target === null) {
        setStatus('error')
        return
      }

      const global = window.VentoraAiSdr
      if (global === undefined) {
        attempts += 1
        if (attempts >= AI_SDR_MAX_POLL_ATTEMPTS) {
          setStatus('error')
          return
        }
        timerRef.current = window.setTimeout(tryCreate, AI_SDR_POLL_INTERVAL_MS)
        return
      }

      try {
        const handle = global.createAiSdrWidget({
          target,
          api: { baseUrl: AI_SDR_BFF_BASE_URL },
          session: {
            productId: AI_SDR_PRODUCT_ID,
            metadata: { surface: AI_SDR_SURFACE },
          },
        })
        handleRef.current = handle
        handle.open()
        setMounted(true)
      } catch {
        setStatus('error')
      }
    }

    tryCreate()
  }, [clearTimer])

  return (
    <>
      {!mounted ? (
        <button
          type="button"
          onClick={openChat}
          aria-haspopup="dialog"
          data-ai-sdr-launcher-trigger=""
          disabled={status === 'loading'}
          className="fixed bottom-5 right-5 z-[2147483000] rounded-full bg-[#b45309] px-5 py-3 text-sm font-semibold text-white shadow-lg outline-none hover:bg-[#92400e] focus-visible:ring-2 focus-visible:ring-[#b45309] focus-visible:ring-offset-2 disabled:cursor-progress disabled:opacity-80 motion-safe:transition-colors"
        >
          {LAUNCHER_LABELS[status]}
        </button>
      ) : null}
      <div id={AI_SDR_WIDGET_ROOT_ID} ref={targetRef} />
    </>
  )
}
