'use client'

import { useEffect, useRef } from 'react'
import type { ExtractionStatus } from '@/hooks/use-extraction'

const SESSION_STORAGE_KEY = 'lextract:fired-extraction-ids'

function getFiredIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  const raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
  if (!raw) return new Set()
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    // Corrupted value (extension interference, partial write). Treat as empty
    // so a mounting view never crashes; addFiredId overwrites it next time.
    return new Set()
  }
  if (!Array.isArray(parsed)) return new Set()
  // Safe after the Array.isArray guard above; ids are always written as strings.
  return new Set(parsed as string[])
}

function addFiredId(id: string): void {
  const ids = getFiredIds()
  ids.add(id)
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify([...ids]))
}

export function useCompletionNotification(
  id: string,
  status: ExtractionStatus | undefined,
  filename: string | undefined
) {
  // Reset tracking when id changes so a new extraction can fire its own notification.
  const prevIdRef = useRef(id)
  useEffect(() => {
    prevIdRef.current = id
  }, [id])

  useEffect(() => {
    if (status !== 'complete' && status !== 'failed') return
    if (getFiredIds().has(id)) return
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    if (!document.hidden) return

    addFiredId(id)

    const title =
      status === 'complete' ? 'Extraction complete' : 'Extraction failed'
    const body =
      status === 'complete'
        ? filename
          ? `${filename} is ready to view.`
          : 'Your extraction is ready to view.'
        : 'Something went wrong processing your document. Please try again.'

    const notification = new Notification(title, { body, icon: '/favicon.ico' })

    notification.onclick = () => {
      window.focus()
    }

    return () => {
      notification.close()
    }
  }, [id, status, filename])
}
