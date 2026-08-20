'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { useTeaser } from '@/hooks/use-teaser'
import { useAuth } from '@/hooks/use-auth'
import { usePaymentReturn } from '@/hooks/use-payment-return'
import { TeaserView } from '@/components/results/teaser-view'
import { FullResultsView } from '@/components/results/full-results-view'
import { EmailGateDialog } from '@/components/results/email-gate-dialog'
import { ResultsSurveyPopup } from '@/components/results/results-survey-popup'
import { ResultsSkeleton } from '@/components/skeletons'
import { apiPatch } from '@/lib/api'
import { captureEvent, EVENTS } from '@/lib/posthog'
import { SAMPLE_EXTRACTION_ID } from '@/lib/sample-extraction'
import { getUserFacingError } from '@/lib/user-facing-errors'

const EMAIL_GATE_KEY = 'lextract_session_email'

const PROCESSING_STATUSES = new Set(['uploading', 'extracting', 'scoring'])

function ErrorState({ error }: { error: unknown }) {
  const message = getUserFacingError(error, 'results')

  return (
    <div data-testid="results-error" className="flex flex-col items-center gap-4 py-12 text-center">
      <AlertCircle className="size-12 text-muted-foreground" />
      <h2 className="text-xl font-semibold">{message.title}</h2>
      <p className="text-muted-foreground">{message.description}</p>
      {message.trackingId && (
        <p className="font-mono text-xs text-muted-foreground">Tracking ID: {message.trackingId}</p>
      )}
      <Link
        href="/upload"
        className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Upload a document
      </Link>
    </div>
  )
}

interface FailedExtractionStateProps {
  filename: string
}

function FailedExtractionState({ filename }: FailedExtractionStateProps) {
  return (
    <div
      data-testid="results-failed"
      className="flex flex-col items-center gap-4 py-12 text-center"
    >
      <AlertCircle className="size-12 text-destructive" />
      <h2 className="text-xl font-semibold">Extraction failed</h2>
      <p className="text-muted-foreground">
        We were unable to process <span className="font-medium text-foreground">{filename}</span>.
      </p>
      <p className="text-sm text-muted-foreground">
        We couldn&apos;t read this document clearly. Please re-upload a higher-quality scan or
        digital PDF. Password-protected PDFs and non-lease documents are also not supported.
      </p>
      <Link
        href="/upload"
        className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Upload a new document
      </Link>
    </div>
  )
}

interface ResultsContentProps {
  id: string
}

export function ResultsContent({ id }: ResultsContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  usePaymentReturn(id)
  const isSample = id === SAMPLE_EXTRACTION_ID
  const { user, loading: authLoading } = useAuth()
  const paymentTrackedRef = useRef<string | null>(null)
  // Use the teaser endpoint - always accessible (no payment required) - to
  // determine status and payment_status so we can decide which view to render.
  const { data: teaser, isLoading, isError, error } = useTeaser(id)

  // Email gate state - anonymous users must provide email before seeing teaser
  const [emailGateOpen, setEmailGateOpen] = useState(false)
  const [emailGateSubmitting, setEmailGateSubmitting] = useState(false)
  const [emailGatePassed, setEmailGatePassed] = useState(() => {
    if (typeof window === 'undefined') return false
    return !!localStorage.getItem(EMAIL_GATE_KEY)
  })

  const handleEmailGateSubmit = useCallback(
    async (email: string, turnstileToken: string) => {
      setEmailGateSubmitting(true)
      try {
        // Track submission before any async calls so it fires regardless of backend outcome
        captureEvent(EVENTS.email_gate_submitted, { extraction_id: id })

        // Fire Apollo lead capture (fire-and-forget)
        fetch('/api/leads/email-gate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, company_website: '', turnstileToken }),
        }).catch(() => {
          /* swallow - Apollo failure should not block UX */
        })

        // Save email on anonymous session in database
        await apiPatch('/auth/anonymous/email', { email })

        // Persist locally so returning visits skip the gate
        localStorage.setItem(EMAIL_GATE_KEY, email)
        setEmailGatePassed(true)
        setEmailGateOpen(false)
      } catch {
        // If backend save fails, still let the user through - we captured
        // the email in Apollo and localStorage already
        localStorage.setItem(EMAIL_GATE_KEY, email)
        setEmailGatePassed(true)
        setEmailGateOpen(false)
      } finally {
        setEmailGateSubmitting(false)
      }
    },
    [id],
  )

  // Track payment completion / cancellation from Stripe redirect (fire once)
  useEffect(() => {
    const payment = searchParams.get('payment')
    if (!payment || paymentTrackedRef.current === id) return
    paymentTrackedRef.current = id
    if (payment === 'success') {
      captureEvent(EVENTS.payment_completed, { extraction_id: id })
    } else if (payment === 'cancelled') {
      captureEvent(EVENTS.payment_cancelled, { extraction_id: id })
    }
  }, [searchParams, id])

  useEffect(() => {
    if (teaser && PROCESSING_STATUSES.has(teaser.status)) {
      router.push(`/processing/${id}`)
    }
  }, [teaser, id, router])

  // Open the email gate when an anonymous user without email arrives at a completed teaser.
  // Guard on !authLoading so we never flash the gate for authenticated users who are still
  // loading - we only know someone is truly anonymous once auth has resolved.
  useEffect(() => {
    if (
      !authLoading &&
      !user &&
      !isSample &&
      !emailGatePassed &&
      teaser &&
      !PROCESSING_STATUSES.has(teaser.status) &&
      teaser.status !== 'failed' &&
      teaser.payment_status !== 'paid'
    ) {
      setEmailGateOpen(true)
    }
  }, [authLoading, user, isSample, emailGatePassed, teaser])

  // Paid results require authentication - redirect to login when auth has resolved and
  // user is not logged in. Must be declared before any conditional returns to satisfy
  // Rules of Hooks.
  useEffect(() => {
    if (teaser && teaser.payment_status === 'paid' && !authLoading && !user) {
      router.push(`/login?return=${encodeURIComponent(`/results/${id}`)}`)
    }
  }, [teaser, authLoading, user, id, router])

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <ResultsSkeleton />
      </div>
    )
  }

  if (isError || !teaser) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <ErrorState error={error} />
      </div>
    )
  }

  if (PROCESSING_STATUSES.has(teaser.status)) {
    return null
  }

  if (teaser.status === 'failed') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <FailedExtractionState filename={teaser.document_filename} />
      </div>
    )
  }

  if (teaser.payment_status === 'paid') {
    if (authLoading || !user) {
      return (
        <div className="mx-auto max-w-4xl px-4 py-8">
          <ResultsSkeleton />
        </div>
      )
    }
    return (
      <div data-testid="results-paid" className="mx-auto max-w-6xl px-4 py-8">
        <FullResultsView extractionId={id} />
      </div>
    )
  }

  const needsEmailGate = !user && !isSample && !emailGatePassed

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {needsEmailGate && (
        <EmailGateDialog
          open={emailGateOpen}
          onSubmit={handleEmailGateSubmit}
          isSubmitting={emailGateSubmitting}
        />
      )}
      {emailGatePassed && !user && <ResultsSurveyPopup />}
      <TeaserView extractionId={id} />
    </div>
  )
}
