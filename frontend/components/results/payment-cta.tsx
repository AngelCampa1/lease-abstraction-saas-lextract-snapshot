'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { Sparkles, CreditCard, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { useCredits } from '@/hooks/use-credits'
import { useCreateCheckout, useUseCredit } from '@/hooks/use-payment'
import { HELP_CONTENT } from '@/lib/help-content'
import { PRICING, SUPPORT_POLICY, COMPETITOR_PRICE_RANGE, formatPrice } from '@/lib/pricing'
import { captureEvent, EVENTS } from '@/lib/posthog'
import { ApiError } from '@/lib/api'

interface PaymentCtaProps {
  extractionId: string
  totalFieldCount: number
  redFlagCount: number
}

/**
 * Map a failed credit-unlock mutation to a user-facing message. Only the
 * `/payments/use-credit` endpoint returns 402 (insufficient credits) and 409
 * (concurrent modification); the Stripe checkout endpoint returns 404/502 and
 * is therefore handled by the generic fallback. We map by the credit error
 * specifically so a non-credit failure can never surface a credit message.
 */
function creditErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 402) {
      return "You don't have enough credits. Purchase a credit pack or unlock this lease directly."
    }
    if (error.status === 409) {
      return 'This lease was just updated. Refresh the page and try again.'
    }
  }
  return 'Payment failed. Please try again.'
}

export function PaymentCta({ extractionId, totalFieldCount, redFlagCount }: PaymentCtaProps) {
  const { data: credits } = useCredits()
  const hasCredits = credits !== undefined && credits.balance > 0
  const checkout = useCreateCheckout()
  const useCredit = useUseCredit()
  const trackedRef = useRef(false)

  useEffect(() => {
    if (!trackedRef.current) {
      trackedRef.current = true
      captureEvent(EVENTS.paywall_viewed, { extraction_id: extractionId })
    }
  }, [extractionId])

  const getReturnUrl = () =>
    typeof window !== 'undefined'
      ? `${window.location.origin}/results/${extractionId}`
      : `/results/${extractionId}`

  const handleUnlock = () => {
    // Clear any prior credit-unlock error so the error region only ever
    // reflects the current action. Otherwise a stale credit error (e.g. a
    // 402) would mislabel a later checkout failure as "not enough credits".
    useCredit.reset()
    captureEvent(EVENTS.checkout_started, { extraction_id: extractionId, product_type: 'single' })
    const returnUrl = getReturnUrl()
    checkout.mutate({
      product_type: 'single',
      extraction_id: extractionId,
      success_url: `${returnUrl}?payment=success`,
      cancel_url: `${returnUrl}?payment=cancelled`,
    })
  }

  const handleUseCredit = () => {
    // Clear any prior checkout error for the same reason (see handleUnlock).
    checkout.reset()
    useCredit.mutate({ extraction_id: extractionId })
  }

  const isPending = checkout.isPending || useCredit.isPending

  return (
    <Card data-testid="payment-cta" className="border-primary/20 bg-primary/5">
      <CardContent className="space-y-6 py-8 text-center">
        <div className="space-y-2">
          <Sparkles className="mx-auto size-10 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">
            See Your Full Lease Report
          </h2>
          <div className="flex justify-center">
            <HelpTooltip label="What unlocks after payment?" side="bottom">
              {HELP_CONTENT.payment}
            </HelpTooltip>
          </div>
          <p className="mx-auto max-w-md text-muted-foreground">
            Get all {totalFieldCount} extracted fields, detailed confidence scores, and{' '}
            {redFlagCount} flagged {redFlagCount === 1 ? 'issue' : 'issues'}.
          </p>
          <p className="mx-auto max-w-md text-sm text-muted-foreground" data-testid="value-comparison">
            Manual lease abstraction costs {COMPETITOR_PRICE_RANGE} and takes 4–8 hours.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              size="lg"
              className="h-12 px-8 text-base"
              data-testid="unlock-button"
              onClick={handleUnlock}
              disabled={isPending}
            >
              <CreditCard className="mr-2 size-5" />
              {checkout.isPending ? 'Redirecting...' : `Unlock for ${formatPrice(PRICING.single.price)}`}
            </Button>
          </motion.div>

          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground" data-testid="support-policy">
            <ShieldCheck className="size-3.5 text-primary" />
            {SUPPORT_POLICY}
          </p>

          {hasCredits && (
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Button
                variant="secondary"
                size="lg"
                data-testid="credit-button"
                onClick={handleUseCredit}
                disabled={isPending}
              >
                {useCredit.isPending
                  ? 'Processing...'
                  : `Use 1 credit (${credits.balance} remaining)`}
              </Button>
            </motion.div>
          )}

          {(checkout.isError || useCredit.isError) && (
            <p className="text-sm text-destructive" role="alert">
              {useCredit.isError
                ? creditErrorMessage(useCredit.error)
                : 'Payment failed. Please try again.'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
