'use client'

import type { ExtractionStatus } from '@/hooks/use-extraction'

interface LeaseFactCardProps {
  status: ExtractionStatus
}

const FACTS: Record<Exclude<ExtractionStatus, 'failed'>, string> = {
  uploading:
    'Lextract reads every page of your PDF, including scanned and digital documents.',
  extracting:
    'CAM fees are a common source of lease disputes. Lextract checks for CAM risk patterns across your lease.',
  scoring:
    'Each field gets a confidence score (High, Medium, or Low) so you know where to check the lease yourself.',
  complete: 'Extraction complete. Your results are ready.',
}

export function LeaseFactCard({ status }: LeaseFactCardProps) {
  if (status === 'failed') return null

  const fact = FACTS[status]

  return (
    <div className="rounded-lg border bg-muted/50 px-4 py-3">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Did you know?
      </p>
      <p className="text-sm text-muted-foreground">{fact}</p>
    </div>
  )
}
