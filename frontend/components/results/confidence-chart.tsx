'use client'

import { motion } from 'motion/react'
import type { ConfidenceDistribution } from '@/hooks/use-teaser'
import { CONFIDENCE_BAR_COLORS } from '@/lib/design-tokens'

interface ConfidenceChartProps {
  distribution: ConfidenceDistribution
}

export function ConfidenceChart({ distribution }: ConfidenceChartProps) {
  const notFoundCount = distribution.not_found ?? 0
  // All bars use the same denominator (total fields) so the chart is on a
  // consistent scale - each bar shows what fraction of all 126 schema fields
  // fell into that tier.
  const totalFields = distribution.high + distribution.medium + distribution.low + notFoundCount
  const highPct = totalFields > 0 ? (distribution.high / totalFields) * 100 : 0
  const mediumPct = totalFields > 0 ? (distribution.medium / totalFields) * 100 : 0
  const lowPct = totalFields > 0 ? (distribution.low / totalFields) * 100 : 0
  const notFoundPct = totalFields > 0 ? (notFoundCount / totalFields) * 100 : 0

  return (
    <div data-testid="confidence-chart" className="flex-1 space-y-3">
      <h3 className="text-sm font-semibold">Confidence Distribution</h3>

      <div className="space-y-2">
        <ConfidenceBar
          label="High"
          count={distribution.high}
          totalFields={totalFields}
          percentage={highPct}
          color={CONFIDENCE_BAR_COLORS.high}
          testId="confidence-bar-high"
        />
        <ConfidenceBar
          label="Medium"
          count={distribution.medium}
          totalFields={totalFields}
          percentage={mediumPct}
          color={CONFIDENCE_BAR_COLORS.medium}
          testId="confidence-bar-medium"
        />
        <ConfidenceBar
          label="Low"
          count={distribution.low}
          totalFields={totalFields}
          percentage={lowPct}
          color={CONFIDENCE_BAR_COLORS.low}
          testId="confidence-bar-low"
        />
        {notFoundCount > 0 && (
          <ConfidenceBar
            label="Not in lease"
            count={notFoundCount}
            totalFields={totalFields}
            percentage={notFoundPct}
            color={CONFIDENCE_BAR_COLORS.not_found}
            testId="confidence-bar-not-found"
          />
        )}
      </div>
    </div>
  )
}

interface ConfidenceBarProps {
  label: string
  count: number
  totalFields: number
  percentage: number
  color: string
  testId: string
}

function ConfidenceBar({ label, count, totalFields, percentage, color, testId }: ConfidenceBarProps) {
  const ariaLabel =
    label === 'Not in lease'
      ? `Not in lease: ${count} of ${totalFields} fields`
      : `${label} confidence: ${count} of ${totalFields} fields`
  return (
    <div
      data-testid={testId}
      className="space-y-1"
      role="img"
      aria-label={ariaLabel}
    >
      <div className="flex items-center justify-between text-xs" aria-hidden="true">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {count} {count === 1 ? 'field' : 'fields'}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 80, damping: 20, delay: 0.2 }}
          data-testid={`${testId}-fill`}
        />
      </div>
    </div>
  )
}
