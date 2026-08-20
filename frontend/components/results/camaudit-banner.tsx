'use client'

import { ShieldAlert, X, ExternalLink, Loader2, AlertCircle } from 'lucide-react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { useCamaudit } from '@/hooks/use-camaudit'
import { CAM_RELATED_RULE_IDS, CAM_RULE_MESSAGES } from './camaudit-messages'
import type { RedFlag } from '@/types/extraction'

interface CamAuditBannerProps {
  extractionId: string
  redFlags: RedFlag[]
  paymentStatus: string
  showCamaudit?: boolean
}

const MAX_MESSAGES = 3

export function CamAuditBanner({
  extractionId,
  redFlags,
  paymentStatus,
  showCamaudit,
}: CamAuditBannerProps) {
  const { isDismissed, dismiss, mutation } = useCamaudit({ extractionId })

  const camFlags = redFlags.filter(
    (flag) => flag.rule_id !== undefined && CAM_RELATED_RULE_IDS.has(flag.rule_id)
  )
  const isEligible = showCamaudit ?? camFlags.length > 0

  if (!isEligible || paymentStatus !== 'paid' || isDismissed) {
    return null
  }

  const messages = camFlags
    .slice(0, MAX_MESSAGES)
    .map((flag) => {
      // rule_id is guaranteed non-undefined here because camFlags filters on it
      const ruleId = flag.rule_id as string
      return {
        ruleId,
        message: CAM_RULE_MESSAGES[ruleId] ?? flag.description,
      }
    })
  if (messages.length === 0) {
    messages.push({
      ruleId: 'camaudit-eligible',
      message:
        'This lease includes CAM provisions that may benefit from reconciliation review.',
    })
  }
  const headline =
    camFlags.length > 0
      ? `Your lease has ${camFlags.length} CAM risk factor${camFlags.length !== 1 ? 's' : ''}`
      : 'CAM review may be available'

  const errorMessage =
    mutation.error instanceof Error
      ? mutation.error.message
      : 'Failed to generate CamAudit redirect. Please try again.'

  return (
    <motion.div
      data-testid="camaudit-banner"
      className="relative overflow-hidden rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 p-5 dark:border-primary/30 dark:from-primary/5 dark:to-primary/10"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
        {/* Dismiss button */}
        <button
          data-testid="camaudit-dismiss"
          className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-primary/10 hover:text-foreground dark:hover:bg-primary/20"
          onClick={dismiss}
          aria-label="Dismiss CamAudit banner"
        >
          <X className="size-4" />
        </button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          {/* Icon and headline */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-primary dark:text-primary" />
              <h3 className="text-base font-semibold text-foreground">
                {headline}
              </h3>
            </div>

            {/* Contextual messages */}
            <ul className="space-y-1.5">
              {messages.map(({ ruleId, message }) => (
                <li
                  key={ruleId}
                  data-testid="camaudit-message"
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="mt-1.5 block size-1 shrink-0 rounded-full bg-primary" />
                  {message}
                </li>
              ))}
            </ul>
          </div>

          {/* CTA area */}
          <div className="flex shrink-0 flex-col items-center gap-2 sm:items-end">
            {/* Context badge */}
            <div
              data-testid="camaudit-context-badge"
              className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-sm"
            >
              Paid handoff
            </div>

            {/* CTA button */}
            <Button
              data-testid="camaudit-cta"
              className="bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90"
              size="sm"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  <ExternalLink className="size-4" />
                  Continue CAM Review Handoff
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Error state */}
        {mutation.isError && (
          <div
            data-testid="camaudit-error"
            className="mt-3 flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive"
          >
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
    </motion.div>
  )
}
