'use client'

import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { motion } from 'motion/react'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { HELP_CONTENT } from '@/lib/help-content'
import type { RedFlag } from '@/types/extraction'
import { SEVERITY_COLORS, STATUS_COLORS, SUCCESS_PANEL } from '@/lib/design-tokens'

interface RedFlagPanelProps {
  redFlags: RedFlag[]
}

const SEVERITY_CONFIG = {
  HIGH: {
    badgeClass: SEVERITY_COLORS.high.badge,
    borderClass: SEVERITY_COLORS.high.border,
  },
  MEDIUM: {
    badgeClass: SEVERITY_COLORS.medium.badge,
    borderClass: SEVERITY_COLORS.medium.border,
  },
  LOW: {
    badgeClass: SEVERITY_COLORS.low.badge,
    borderClass: SEVERITY_COLORS.low.border,
  },
} as const

export function RedFlagPanel({ redFlags }: RedFlagPanelProps) {
  if (redFlags.length === 0) {
    return (
      <motion.div
        data-testid="red-flag-panel-empty"
        className={`rounded-lg border p-6 ${SUCCESS_PANEL.container}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3">
          <CheckCircle2 className={`size-5 ${SUCCESS_PANEL.icon}`} />
          <div>
            <p className={`font-medium ${SUCCESS_PANEL.heading}`}>
              No issues detected
            </p>
            <p className={`text-sm ${SUCCESS_PANEL.body}`}>
              No red flags were found during analysis.
            </p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      data-testid="red-flag-panel"
      className="space-y-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className={`size-5 ${STATUS_COLORS.error.icon}`} />
        <h3 className="text-base font-semibold text-foreground">
          <span>{redFlags.length}</span> Red Flags Detected
        </h3>
        <HelpTooltip label="What are red flags?">
          {HELP_CONTENT.redFlags}
        </HelpTooltip>
      </div>
      <div className="space-y-3">
        {redFlags.map((flag, index) => {
          const config = SEVERITY_CONFIG[flag.severity.toUpperCase() as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.LOW
          return (
            <motion.div
              key={`${flag.rule_id ?? flag.name}-${index}`}
              className={`rounded-lg border bg-card p-3 ${config.borderClass}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, duration: 0.2 }}
            >
              <div className="flex items-start gap-2">
                <span
                  className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${config.badgeClass}`}
                >
                  {flag.severity}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {flag.name}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {flag.description}
                  </p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
