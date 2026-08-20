'use client'

import { useState, useCallback } from 'react'

function getNotificationSupport(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

function getCurrentPermission(): NotificationPermission {
  if (!getNotificationSupport()) return 'default'
  return Notification.permission
}

export function useNotificationPermission() {
  const isSupported = getNotificationSupport()
  const [permission, setPermission] = useState<NotificationPermission>(
    getCurrentPermission
  )

  const requestPermission = useCallback(async () => {
    if (!getNotificationSupport()) return
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
    } catch {
      // Browser rejected the request (e.g. sandboxed iframe). Leave permission
      // state unchanged — the prompt will remain visible on next render.
    }
  }, [])

  return { permission, requestPermission, isSupported }
}
