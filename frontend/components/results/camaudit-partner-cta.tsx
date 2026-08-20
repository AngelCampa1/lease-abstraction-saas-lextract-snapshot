'use client'

import { useState } from 'react'
import { X, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

const DISMISS_KEY = 'camaudit-partner-dismissed'

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

interface CamAuditPartnerCtaProps {
  paymentStatus: string | null | undefined
}

export function CamAuditPartnerCta({ paymentStatus }: CamAuditPartnerCtaProps) {
  const [isDismissed, setIsDismissed] = useState<boolean>(() => readDismissed())

  if (paymentStatus !== 'paid' || isDismissed) return null

  function handleDismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // storage unavailable - dismiss in memory only
    }
    setIsDismissed(true)
  }

  return (
    <div className="relative rounded-lg border bg-muted/30 p-4">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-3 top-3 rounded-full text-muted-foreground/60 hover:text-muted-foreground"
        aria-label="Dismiss partner CTA"
      >
        <X className="size-4" />
      </button>
      <p className="pr-8 text-sm font-medium">Work in tenant rep or property management?</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        CAMAudit lets firms offer CAM recovery under their own brand.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <a
            href="https://partner.camaudit.io"
            target="_blank"
            rel="noopener noreferrer"
          >
            Partner signup
            <ExternalLink className="ml-1.5 size-3.5" />
          </a>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a
            href="https://partner.camaudit.io"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn more
            <ExternalLink className="ml-1.5 size-3.5" />
          </a>
        </Button>
      </div>
    </div>
  )
}
