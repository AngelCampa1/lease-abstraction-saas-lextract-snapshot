'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, AlertCircle } from 'lucide-react'
import { ApiError } from '@/lib/api'
import { ERROR_PANEL } from '@/lib/design-tokens'
import { getUserFacingError } from '@/lib/user-facing-errors'
import { captureEvent, EVENTS } from '@/lib/posthog'
import { useProcessing } from '@/hooks/use-processing'
import { useNotificationPermission } from '@/hooks/use-notification-permission'
import { useCompletionNotification } from '@/hooks/use-completion-notification'
import { StepProgress } from '@/components/processing/step-progress'
import { TimeEstimate } from '@/components/processing/time-estimate'
import { NotificationPrompt } from '@/components/processing/notification-prompt'
import { ProcessingSkeleton } from '@/components/skeletons'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function ErrorState({ error }: { error: unknown }) {
  const message = getUserFacingError(error, 'processing')

  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <AlertCircle className="size-12 text-muted-foreground" />
      <h2 className="text-xl font-semibold">{message.title}</h2>
      <p className="text-muted-foreground">
        {message.description}
      </p>
      {message.trackingId && (
        <p className="font-mono text-xs text-muted-foreground">
          Tracking ID: {message.trackingId}
        </p>
      )}
      <Button asChild>
        <Link href="/upload">Upload a document</Link>
      </Button>
    </div>
  )
}

function ServerErrorState({ error }: { error: unknown }) {
  const message = getUserFacingError(error, 'processing')

  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <AlertCircle className="size-12 text-destructive" />
      <h2 className="text-xl font-semibold">{message.title}</h2>
      <p className="text-muted-foreground">
        {message.description}
      </p>
      {message.trackingId && (
        <p className="font-mono text-xs text-muted-foreground">
          Tracking ID: {message.trackingId}
        </p>
      )}
      <Button asChild>
        <Link href="/upload">Upload a document</Link>
      </Button>
    </div>
  )
}

// UUID pattern - error messages containing a UUID are technical/internal and should not be shown to users
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

interface FailedStateProps {
  errorMessage?: string
  onRetry: () => void
  isRetrying: boolean
  retryError: unknown
}

function FailedState({
  errorMessage,
  onRetry,
  isRetrying,
  retryError,
}: FailedStateProps) {
  const displayMessage = errorMessage && !UUID_PATTERN.test(errorMessage)
    ? errorMessage
    : 'An error occurred during processing. Please try again.'

  const retryErrorDetail =
    retryError instanceof ApiError
      ? retryError.userMessage ?? retryError.detail
      : retryError instanceof Error
        ? retryError.message
        : null

  return (
    <div className="space-y-4">
      {retryErrorDetail && (
        <Card data-testid="retry-error-card" className="border-destructive/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-destructive">
              Retry failed
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {retryErrorDetail}
          </CardContent>
        </Card>
      )}
      <div className={`rounded-lg border p-4 ${ERROR_PANEL.container}`}>
        <div className="flex items-start gap-3">
          <AlertCircle className={`mt-0.5 size-5 ${ERROR_PANEL.icon}`} />
          <div className="space-y-3">
            <p className={`font-medium ${ERROR_PANEL.heading}`}>
              Processing failed
            </p>
            <p className={`text-sm ${ERROR_PANEL.body}`}>
              {displayMessage}
            </p>
            <div className={`space-y-2 text-sm ${ERROR_PANEL.body}`}>
              <p className="font-medium">Common causes you can fix:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Scanned pages are too blurry or cut off.</li>
                <li>The PDF is password protected or encrypted.</li>
                <li>The file is not a commercial lease.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-2 pt-4">
        <Button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          data-testid="retry-extraction-button"
        >
          {isRetrying ? 'Retrying...' : 'Retry extraction'}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/upload">Upload another document</Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          If this issue persists, please contact support.
        </p>
      </div>
    </div>
  )
}

interface ProcessingContentProps {
  id: string
}

export function ProcessingContent({ id }: ProcessingContentProps) {
  const router = useRouter()
  const {
    extraction,
    isLoading,
    isError,
    error,
    cancel,
    isCancelling,
    cancelError,
    retry,
    isRetrying,
    retryError,
  } = useProcessing(id)
  const notificationPermission = useNotificationPermission()
  useCompletionNotification(id, extraction?.status, extraction?.document_filename)
  const navigatedRef = useRef(false)

  // Bug #53: Reset navigatedRef when id changes so the redirect fires
  // correctly if this component is reused with a different extraction id.
  useEffect(() => {
    navigatedRef.current = false
  }, [id])

  // Track processing page view once per extraction id
  const processingTrackedRef = useRef<string | null>(null)
  useEffect(() => {
    if (processingTrackedRef.current !== id) {
      processingTrackedRef.current = id
      captureEvent(EVENTS.processing_viewed, { extraction_id: id })
    }
  }, [id])

  useEffect(() => {
    if (extraction?.status === 'complete' && !navigatedRef.current) {
      navigatedRef.current = true
      captureEvent(EVENTS.processing_completed, { extraction_id: id })
      router.push(`/results/${id}`)
    }
  }, [extraction?.status, id, router])

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg py-12">
        <ProcessingSkeleton />
      </div>
    )
  }

  if (isError || !extraction) {
    const isClientError =
      error instanceof ApiError && error.status >= 400 && error.status < 500
    return (
      <div className="mx-auto max-w-lg py-12">
        {isClientError ? <ErrorState error={error} /> : <ServerErrorState error={error} />}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg py-12">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Processing your document
          </h1>
          <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <FileText className="size-4" />
            <span className="min-w-0 truncate">{extraction.document_filename}</span>
          </div>
        </div>

        {/* Card wrapper */}
        <div className="rounded-lg border bg-card p-6 shadow-sm" aria-live="polite" aria-atomic="true">
          {extraction.status === 'failed' ? (
            <FailedState
              errorMessage={extraction.error_message}
              onRetry={() => retry()}
              isRetrying={isRetrying}
              retryError={retryError}
            />
          ) : (
            <div className="space-y-6">
              <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                <span className="flex-1">
                  You can keep this tab open while we read the lease, check the answers,
                  and look for risk flags. We will take you to the results automatically
                  when processing finishes.
                </span>
                <HelpTooltip label="What is happening now?">
                  Lextract reads the PDF, verifies the extracted terms, scores confidence,
                  and checks for lease terms that may deserve review.
                </HelpTooltip>
              </div>
              <StepProgress status={extraction.status} />
              <TimeEstimate status={extraction.status} pageCount={extraction.document_page_count} />
              {cancelError && (
                <p className="text-center text-sm text-destructive">
                  Could not cancel processing. Please try again.
                </p>
              )}
              <div className="flex flex-col justify-center gap-2 border-t pt-4 sm:flex-row">
                <Button variant="outline" asChild>
                  <Link href="/upload">Upload another lease</Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => cancel()}
                  disabled={isCancelling}
                >
                  {isCancelling ? 'Cancelling...' : 'Cancel processing'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <NotificationPrompt
          permission={notificationPermission.permission}
          requestPermission={notificationPermission.requestPermission}
          isSupported={notificationPermission.isSupported}
        />
      </div>
    </div>
  )
}
