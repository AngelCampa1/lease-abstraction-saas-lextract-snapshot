'use client'

import { useSyncExternalStore, useCallback } from 'react'
import { Bell, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { INTERACTIVE_TARGET_CLASSES } from '@/lib/design-tokens'

const DISMISSED_KEY = 'notification-prompt-dismissed'

// useSyncExternalStore provides an SSR-safe, hydration-mismatch-free way to
// read sessionStorage without calling setState inside a useEffect.
// The server snapshot returns false so the component renders during SSR,
// and the real sessionStorage value is read on the client.
const dismissListeners = new Set<() => void>()

function subscribeDismissed(callback: () => void) {
  dismissListeners.add(callback)
  return () => {
    dismissListeners.delete(callback)
  }
}

function getDismissedSnapshot(): boolean {
  return sessionStorage.getItem(DISMISSED_KEY) === 'true'
}

// Exported for unit testing - useSyncExternalStore calls this only during SSR.
export function getDismissedServerSnapshot(): boolean {
  return false
}

function markDismissed() {
  sessionStorage.setItem(DISMISSED_KEY, 'true')
  dismissListeners.forEach((l) => l())
}

interface NotificationPromptProps {
  permission: NotificationPermission
  requestPermission: () => Promise<void>
  isSupported: boolean
}

export function NotificationPrompt({
  permission,
  requestPermission,
  isSupported,
}: NotificationPromptProps) {
  const dismissed = useSyncExternalStore(
    subscribeDismissed,
    getDismissedSnapshot,
    getDismissedServerSnapshot
  )

  const handleDismiss = useCallback(() => {
    markDismissed()
  }, [])

  if (!isSupported) return null
  if (permission !== 'default') return null
  if (dismissed) return null

  return (
    <div
      role="region"
      aria-label="Notification opt-in"
      className="mt-4 flex items-start gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3"
    >
      <Bell className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">
          Get notified when your extraction is ready
        </p>
        <Button
          type="button"
          variant="link"
          onClick={() => { requestPermission().catch(() => {}) }}
          className={`mt-1.5 h-auto justify-start px-0 py-0 text-xs ${INTERACTIVE_TARGET_CLASSES.compact}`}
        >
          Turn on notifications
        </Button>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className={`shrink-0 text-muted-foreground hover:text-foreground ${INTERACTIVE_TARGET_CLASSES.icon}`}
      >
        <X className="size-3.5" aria-hidden="true" />
      </Button>
    </div>
  )
}
