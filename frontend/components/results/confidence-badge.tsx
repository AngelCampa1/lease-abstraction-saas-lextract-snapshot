'use client'

import { motion } from 'motion/react'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { HELP_CONTENT } from '@/lib/help-content'
import { CONFIDENCE_COLORS } from '@/lib/design-tokens'

const TIER_CONFIG = {
  high: { label: 'HIGH', className: CONFIDENCE_COLORS.high, showPct: true },
  medium: { label: 'MED', className: CONFIDENCE_COLORS.medium, showPct: true },
  low: { label: 'LOW', className: CONFIDENCE_COLORS.low, showPct: true },
  not_found: { label: 'N/A', className: CONFIDENCE_COLORS.not_found, showPct: false },
} as const

interface ConfidenceBadgeProps {
  score: number
  tier: 'high' | 'medium' | 'low' | 'not_found'
  size?: 'sm' | 'md'
}

export function ConfidenceBadge({ score, tier, size = 'md' }: ConfidenceBadgeProps) {
  const config = TIER_CONFIG[tier]
  const percentage = Math.round(score * 100)
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-0.5'

  return (
    <motion.span
      data-testid="confidence-badge"
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClass} ${config.className}`}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <span>{config.label}</span>
      {config.showPct && <span>{percentage}%</span>}
      <HelpTooltip label="What does confidence mean?" align="end">
        {HELP_CONTENT.confidenceScore}
      </HelpTooltip>
    </motion.span>
  )
}
