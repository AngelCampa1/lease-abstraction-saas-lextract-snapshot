'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dropzone } from '@/components/upload/dropzone'
import { UploadProgress } from '@/components/upload/upload-progress'
import { FileValidation } from '@/components/upload/file-validation'
import { SampleTeaser } from '@/components/upload/sample-teaser'
import { HowItWorksSteps } from '@/components/upload/how-it-works-steps'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { useUpload } from '@/hooks/use-upload'
import { HELP_CONTENT } from '@/lib/help-content'
import { PRICING, formatPrice } from '@/lib/pricing'
import { getProductFacts } from '@/lib/public-facts'
import { captureEvent, EVENTS } from '@/lib/posthog'
import {
  RefreshCw,
  Eye,
  Shield,
  Clock,
  Users,
  CreditCard,
} from 'lucide-react'

export default function UploadPage() {
  const productFacts = getProductFacts()
  const router = useRouter()
  const {
    upload,
    progress,
    isPending,
    isSuccess,
    isError,
    error,
    extractionId,
    fileName,
    reset,
  } = useUpload()

  useEffect(() => {
    if (isSuccess && extractionId) {
      captureEvent(EVENTS.upload_completed, { extraction_id: extractionId })
      router.push(`/processing/${extractionId}`)
    }
  }, [isSuccess, extractionId, router])

  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6" data-testid="upload-page">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Upload a commercial lease. Get structured data back in minutes.
        </h1>
        <p className="mt-2 text-muted-foreground">
          See a free preview before you pay, then unlock the full abstract
          only when the extraction looks useful.
        </p>
      </div>

      <HowItWorksSteps />

      <Card id="upload-card">
        <CardHeader>
          <CardTitle className="text-2xl">Start with the PDF</CardTitle>
          <CardDescription className="flex items-start gap-2 leading-relaxed">
            <span>
              Drop in a commercial lease for a free preview before you pay. Lextract
              returns {productFacts.fieldCount} fields, confidence scores, red flags, and exports.
              Unlock the full report for {formatPrice(PRICING.single.price)}.
            </span>
            <HelpTooltip label="What kind of file should I upload?" side="bottom">
              {HELP_CONTENT.validPdf}
            </HelpTooltip>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPending && fileName ? (
            <UploadProgress fileName={fileName} progress={progress} />
          ) : isError ? (
            <div className="space-y-3">
              <FileValidation error={error?.userMessage ?? error?.detail ?? 'Upload failed. Please try again.'} />
              <Button
                variant="outline"
                onClick={reset}
                className="w-full"
                data-testid="upload-retry-button"
              >
                <RefreshCw aria-hidden="true" className="size-4" />
                Try again
              </Button>
            </div>
          ) : (
            <Dropzone onFileAccepted={upload} disabled={isPending} />
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <SampleTeaser />
      </div>

      <div
        data-testid="risk-reversal"
        className="mt-6 space-y-1.5 rounded-lg border bg-muted/50 px-4 py-3 text-sm"
      >
        <div className="flex items-center gap-2">
          <Eye aria-hidden="true" className="size-4 shrink-0 text-primary" />
          <span>Free preview - see all extracted fields before paying anything</span>
          <HelpTooltip label="What does free preview mean?">
            {HELP_CONTENT.freePreview}
          </HelpTooltip>
        </div>
        <div className="flex items-center gap-2">
          <CreditCard aria-hidden="true" className="size-4 shrink-0 text-primary" />
          <span>
            {formatPrice(PRICING.single.price)} to unlock the full report + export. No
            subscription.
          </span>
          <HelpTooltip label="What am I paying for?">
            {HELP_CONTENT.payment}
          </HelpTooltip>
        </div>
        <div className="flex items-center gap-2">
          <Shield aria-hidden="true" className="size-4 shrink-0 text-primary" />
          <span>
            Stored securely per our{' '}
            <Link
              href="/privacy"
              className="inline-flex min-h-[44px] items-center font-medium text-primary underline underline-offset-2 hover:no-underline"
              data-testid="privacy-policy-link"
            >
              data retention policy
            </Link>{' '}
            - permanently deleted on schedule.
          </span>
          <HelpTooltip label="How is my lease protected?">
            {HELP_CONTENT.security}
          </HelpTooltip>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock aria-hidden="true" className="size-3.5" />
          <span>Skip 4 to 8 hours of manual work per lease</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users aria-hidden="true" className="size-3.5" />
          <span>
            {productFacts.fieldCount} fields: rent, options, CAM, insurance, termination & more
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Shield aria-hidden="true" className="size-3.5" />
          <span>AES-256 encrypted at rest and in transit</span>
        </div>
      </div>
    </div>
  )
}
