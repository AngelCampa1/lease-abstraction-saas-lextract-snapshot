'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Lock, Loader2 } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiPost, ApiError } from '@/lib/api'
import { PRICING, formatPrice } from '@/lib/pricing'
import { captureEvent, EVENTS } from '@/lib/posthog'

const emailSchema = z.string().email('Please enter a valid email address.')

interface GuestCheckoutCtaProps {
  extractionId: string
  totalFieldCount: number
  redFlagCount: number
}

interface CheckoutResponse {
  checkout_url: string
  session_id: string
}

export function GuestCheckoutCta({
  extractionId,
  totalFieldCount,
  redFlagCount,
}: GuestCheckoutCtaProps) {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const viewTrackedRef = useRef<string | null>(null)

  // Record the guest inline-signup/checkout impression exactly once per
  // extraction so the funnel can distinguish guest paywall views from
  // authenticated ones. Analytics must never block rendering.
  useEffect(() => {
    if (viewTrackedRef.current === extractionId) return
    viewTrackedRef.current = extractionId
    try {
      captureEvent(EVENTS.inline_signup_viewed, {
        extraction_id: extractionId,
        field_count: totalFieldCount,
        red_flag_count: redFlagCount,
      })
    } catch {
      // Analytics failures must never break the checkout CTA.
    }
  }, [extractionId, totalFieldCount, redFlagCount])

  const validateEmail = (value: string): boolean => {
    const result = emailSchema.safeParse(value)
    if (!result.success) {
      const firstIssue = result.error.issues[0]
      setEmailError(firstIssue?.message ?? 'Please enter a valid email address.')
      return false
    }
    setEmailError(null)
    return true
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setEmail(val)
    // Clear error as user types (re-validate only on blur)
    if (emailError && val.trim()) {
      const result = emailSchema.safeParse(val)
      if (result.success) {
        setEmailError(null)
      }
    }
  }

  const handleEmailBlur = () => {
    if (email.trim()) {
      validateEmail(email)
    }
  }

  const getReturnUrl = () =>
    typeof window !== 'undefined'
      ? `${window.location.origin}/results/${extractionId}`
      : `/results/${extractionId}`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateEmail(email)) {
      return
    }

    setApiError(null)
    setIsLoading(true)

    try {
      try {
        captureEvent(EVENTS.checkout_started, {
          extraction_id: extractionId,
          product_type: 'single',
          checkout_mode: 'guest',
          field_count: totalFieldCount,
          red_flag_count: redFlagCount,
        })
      } catch {
        // Analytics must never block checkout.
      }
      const returnUrl = getReturnUrl()
      const data = await apiPost<CheckoutResponse>('/payments/checkout', {
        product_type: 'single',
        extraction_id: extractionId,
        guest_email: email,
        success_url: `${returnUrl}?payment=success&access=complete-account`,
        cancel_url: `${returnUrl}?payment=cancelled`,
      })
      // Redirect to Stripe Checkout
      window.location.href = data.checkout_url
    } catch (err) {
      if (err instanceof ApiError) {
        setApiError(err.detail)
      } else {
        setApiError('Something went wrong. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const isEmailEmpty = email.trim() === ''

  return (
    <Card
      data-testid="guest-checkout-cta"
      className="border-primary bg-primary/5"
    >
      <CardContent className="space-y-6 py-8">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold tracking-tight">
            Unlock all {totalFieldCount} fields for {formatPrice(PRICING.single.price)}
          </h2>
          <p className="text-muted-foreground">
            Enter your email to pay. You can sign in or create an account after checkout to access your results.
          </p>
          {redFlagCount > 0 && (
            <p className="text-sm font-medium text-destructive">
              {redFlagCount} red {redFlagCount === 1 ? 'flag' : 'flags'} detected. Unlock
              to see full details.
            </p>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-sm space-y-4"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="guest-email">Email</Label>
            <Input
              id="guest-email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              disabled={isLoading}
              aria-describedby={emailError ? 'guest-email-error' : undefined}
              aria-invalid={emailError !== null}
              autoComplete="email"
            />
            {emailError !== null && (
              <p
                id="guest-email-error"
                className="text-sm text-destructive"
                data-testid="email-error"
              >
                {emailError}
              </p>
            )}
          </div>

          {apiError !== null && (
            <p
              role="alert"
              className="text-sm text-destructive"
              data-testid="api-error"
            >
              {apiError}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isLoading || isEmailEmpty}
            data-testid="unlock-button"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Redirecting…
              </>
            ) : (
              `Unlock for ${formatPrice(PRICING.single.price)} →`
            )}
          </Button>
        </form>

        <div className="mx-auto max-w-sm">
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Already have an account?
              </span>
            </div>
          </div>

          <Button variant="ghost" className="w-full" asChild>
            <Link href={`/login?return=/results/${extractionId}`}>Sign in</Link>
          </Button>
        </div>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <Lock className="size-3" />
          Secure checkout via Stripe.
        </p>
      </CardContent>
    </Card>
  )
}
