'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { captureEvent, EVENTS } from '@/lib/posthog'

export function StickyCta() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 600)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!visible) return null

  return (
    <>
      {/* Spacer to prevent fixed bar from overlapping bottom content; h-20 accounts for safe-area-inset-bottom (up to 34px) + 12px gap */}
      <div className="h-20 sm:hidden" aria-hidden="true" />
      <div
        data-testid="sticky-cta"
        className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 px-4 py-3 safe-bottom pointer-events-auto backdrop-blur sm:hidden"
      >
        <Button size="lg" className="w-full" asChild>
          <Link href="/upload" onClick={() => captureEvent(EVENTS.cta_clicked, { cta_text: 'Get a free preview', location: 'sticky' })}>Get a free preview</Link>
        </Button>
      </div>
    </>
  )
}
