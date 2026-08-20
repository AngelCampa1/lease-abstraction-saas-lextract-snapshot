'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'lextract_edit_hint_dismissed'

export function EditDiscoveryToast() {
  // Lazy initializer reads localStorage once on mount, avoiding a cascading
  // render that would be caused by setState inside a useEffect body.
  const [dismissed, setDismissed] = useState<boolean>(
    () => typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'true'
  )

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setDismissed(true)
  }

  if (dismissed) return null

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-foreground text-background p-3">
      <div className="flex items-center gap-2 text-sm">
        <span aria-hidden="true">✏️</span>
        <span>
          Click any field value to correct it. Changes update red flags in real time.
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDismiss}
        className="shrink-0 text-background hover:text-background hover:bg-background/10"
        aria-label="Got it, dismiss hint"
      >
        Got it ✕
      </Button>
    </div>
  )
}
