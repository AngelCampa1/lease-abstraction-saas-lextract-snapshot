'use client'

import { useState, useEffect } from 'react'
import { Star, Loader2, CheckCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { captureEvent, EVENTS } from '@/lib/posthog'
import { PRICING, formatPrice } from '@/lib/pricing'
import { TurnstileField } from '@/components/marketing/turnstile-field'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SESSION_KEY = 'lextract-results-survey-shown'
const EMAIL_KEY = 'lextract_session_email'
const TRIGGER_DELAY_MS = 5_000

type WouldPay = 'yes' | 'maybe' | 'no'
type Status = 'idle' | 'submitting' | 'success' | 'error'

const WOULD_PAY_OPTIONS: { value: WouldPay; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'no', label: 'No' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ResultsSurveyPopup() {
  const { user, loading } = useAuth()
  const [open, setOpen] = useState(false)
  const [accuracy, setAccuracy] = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [missing, setMissing] = useState('')
  const [wouldPay, setWouldPay] = useState<WouldPay | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [turnstileToken, setTurnstileToken] = useState('')

  // Exit-intent detection - same pattern as marketing exit-popup
  useEffect(() => {
    if (loading) return

    // Don't show for authenticated users or if already shown this session
    if (user || sessionStorage.getItem(SESSION_KEY)) return

    // Don't show if no email captured (they haven't passed the email gate)
    if (!localStorage.getItem(EMAIL_KEY)) return

    // Exit-intent uses mouseleave - desktop-only by design (matches marketing exit popup).
    // Mobile users won't see this survey; acceptable since mobile traffic is low for B2B.
    let mouseLeaveHandler: ((e: MouseEvent) => void) | null = null

    const timeoutId = setTimeout(() => {
      mouseLeaveHandler = (e: MouseEvent) => {
        if (e.clientY <= 0) {
          setOpen(true)
          captureEvent(EVENTS.results_survey_shown)
          sessionStorage.setItem(SESSION_KEY, '1')
          document.removeEventListener('mouseleave', mouseLeaveHandler!)
        }
      }
      document.addEventListener('mouseleave', mouseLeaveHandler)
    }, TRIGGER_DELAY_MS)

    return () => {
      clearTimeout(timeoutId)
      if (mouseLeaveHandler) document.removeEventListener('mouseleave', mouseLeaveHandler)
    }
  }, [loading, user])

  async function handleSubmit() {
    if (accuracy === 0 || !wouldPay) return

    const email = localStorage.getItem(EMAIL_KEY)
    if (!email) return

    setStatus('submitting')
    try {
      const res = await fetch('/api/leads/results-survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          accuracy,
          missing: missing.trim() || undefined,
          wouldPay,
          company_website: '',
          turnstileToken,
        }),
      })
      const newStatus = res.ok ? 'success' : 'error'
      setStatus(newStatus)
      if (newStatus === 'success') {
        captureEvent(EVENTS.results_survey_submitted, {
          accuracy,
          would_pay: wouldPay,
          has_missing_feedback: !!missing.trim(),
        })
      }
    } catch {
      setStatus('error')
    }
  }

  // Auto-close after success
  useEffect(() => {
    if (status !== 'success') return
    const timer = setTimeout(() => setOpen(false), 2000)
    return () => clearTimeout(timer)
  }, [status])

  const canSubmit = accuracy > 0 && wouldPay !== null && status !== 'submitting'

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && status !== 'success') {
          captureEvent(EVENTS.results_survey_dismissed)
        }
        setOpen(value)
      }}
    >
      <DialogContent className="max-w-md">
        {status === 'success' ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center" aria-live="polite">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle className="size-6 text-primary" aria-hidden="true" />
            </span>
            <p className="text-lg font-semibold">Thanks for your feedback!</p>
            <p className="text-sm text-muted-foreground">
              Your input helps us build a better product.
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">
                Quick feedback on your extraction
              </DialogTitle>
              <DialogDescription>
                Help us improve - takes 10 seconds.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-2 flex flex-col gap-5">
              {/* Q1: Accuracy star rating */}
              <div className="space-y-2">
                <p id="accuracy-label" className="text-sm font-medium">
                  How accurate was the extraction?
                </p>
                <div
                  role="radiogroup"
                  aria-labelledby="accuracy-label"
                  aria-required="true"
                  className="flex gap-1"
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      role="radio"
                      aria-checked={accuracy === star}
                      onClick={() => setAccuracy(star)}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                      className="rounded-full p-0.5 transition-colors hover:bg-muted"
                      aria-label={`Rate ${star} out of 5`}
                    >
                      <Star
                        className={cn(
                          'size-7 transition-colors',
                          (hoveredStar || accuracy) >= star
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-muted-foreground/40',
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Q2: Missing/wrong (optional) */}
              <div className="space-y-2">
                <label htmlFor="survey-missing" className="text-sm font-medium">
                  Anything missing or wrong?{' '}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  id="survey-missing"
                  value={missing}
                  onChange={(e) => setMissing(e.target.value)}
                  placeholder="e.g., missed a renewal clause, wrong rent amount..."
                  rows={2}
                  maxLength={500}
                  className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>

              {/* Q3: Would pay */}
              <div className="space-y-2">
                <p id="would-pay-label" className="text-sm font-medium">
                  Would you pay {formatPrice(PRICING.single.price)} per lease for the full report?
                </p>
                <div
                  role="radiogroup"
                  aria-labelledby="would-pay-label"
                  aria-required="true"
                  className="flex gap-2"
                >
                  {WOULD_PAY_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={wouldPay === value}
                      onClick={() => setWouldPay(value)}
                      className={cn(
                        'flex-1 rounded-full border px-3 py-2 text-sm font-medium transition-colors',
                        wouldPay === value
                          ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                          : 'hover:border-primary/40 hover:bg-muted/50',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error message */}
              <div aria-live="polite">
                {status === 'error' && (
                  <p className="text-sm text-destructive">
                    Something went wrong. Please try again.
                  </p>
                )}
              </div>

              <TurnstileField onTokenChange={setTurnstileToken} />

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full"
              >
                {status === 'submitting' ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                    Sending...
                  </>
                ) : (
                  'Submit Feedback'
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
