'use client'

import type { ExtractionStatus } from '@/hooks/use-extraction'
import { PROCESSING_ESTIMATES } from '@/lib/pricing'

interface TimeEstimateProps {
  status: ExtractionStatus
  pageCount?: number | null
}

function getMessage(status: ExtractionStatus, pageCount?: number | null): string | null {
  switch (status) {
    case 'uploading':
      return 'Uploading your document...'
    case 'extracting':
      if (pageCount != null && pageCount > 0) {
        return PROCESSING_ESTIMATES.extractingWithPageCount(pageCount)
      }
      return PROCESSING_ESTIMATES.extracting
    case 'scoring':
      return 'Running final quality checks...'
    default:
      return null
  }
}

export function TimeEstimate({ status, pageCount }: TimeEstimateProps) {
  const message = getMessage(status, pageCount)

  if (message === null) {
    return null
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="size-2 shrink-0 rounded-full bg-current animate-pulse" />
      <span>{message}</span>
    </div>
  )
}
