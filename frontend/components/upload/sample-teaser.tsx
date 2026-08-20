import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CONFIDENCE_COLORS, STATUS_COLORS } from '@/lib/design-tokens'
import { SAMPLE_EXTRACTION_ID } from '@/lib/sample-extraction'
import { captureEvent, EVENTS } from '@/lib/posthog'

interface TeaserField {
  label: string
  value: string
  confidencePct: number
  confidenceTier: 'high' | 'medium' | 'low'
  redFlag?: boolean
}

const TEASER_FIELDS: TeaserField[] = [
  {
    label: 'Base Rent',
    value: '$14,583/mo ($42.50/sqft/yr)',
    confidencePct: 98,
    confidenceTier: 'high',
  },
  {
    label: 'Lease Expiration',
    value: 'Jun 30, 2030',
    confidencePct: 99,
    confidenceTier: 'high',
  },
  {
    label: 'Renewal Option',
    value: '2 × 5-year options',
    confidencePct: 94,
    confidenceTier: 'high',
  },
  {
    label: 'CAM Cap',
    value: '5% annually, non-compounding',
    confidencePct: 91,
    confidenceTier: 'medium',
  },
  {
    label: 'Personal Guarantee',
    value: 'Full-term guarantee required',
    confidencePct: 87,
    confidenceTier: 'medium',
    redFlag: true,
  },
]

export function SampleTeaser() {
  return (
    <div data-testid="sample-teaser" className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b bg-primary px-4 py-3">
        <span className="min-w-0 truncate text-sm font-semibold text-primary-foreground">
          Sample extraction - Office Lease, Austin TX
        </span>
        <span className="shrink-0 text-sm text-primary-foreground">126 fields</span>
      </div>

      <div className="divide-y">
        {TEASER_FIELDS.map((field) => (
          <div
            key={field.label}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-2">
              {field.redFlag && (
                <AlertTriangle className={`size-4 shrink-0 ${STATUS_COLORS.warning.icon}`} aria-label="red flag" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{field.label}</p>
                <p className="truncate text-sm text-muted-foreground">{field.value}</p>
              </div>
            </div>
            <Badge
              variant="secondary"
              className={`text-sm ${CONFIDENCE_COLORS[field.confidenceTier]}`}
            >
              {field.confidencePct}%
            </Badge>
          </div>
        ))}
      </div>

      <div className="border-t px-4 py-3">
        <Link
          href={`/results/${SAMPLE_EXTRACTION_ID}`}
          className="inline-flex min-h-[44px] items-center text-sm font-medium text-primary hover:underline"
          onClick={() =>
            captureEvent(EVENTS.upload_sample_clicked, { location: 'teaser_link' })
          }
          data-testid="sample-teaser-link"
        >
          See sample preview →
        </Link>
      </div>
    </div>
  )
}
