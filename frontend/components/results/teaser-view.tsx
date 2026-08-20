'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { FileText, AlertTriangle, CheckCircle, Layers, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useTeaser } from '@/hooks/use-teaser'
import { useAuth } from '@/hooks/use-auth'
import { TeaserSkeleton } from '@/components/skeletons'
import { FieldDisplay } from '@/components/results/field-display'
import { BlurredFields } from '@/components/results/blurred-fields'
import { ConfidenceChart } from '@/components/results/confidence-chart'
import { PaymentCta } from '@/components/results/payment-cta'
import { GuestCheckoutCta } from '@/components/results/guest-checkout-cta'
import { SAMPLE_EXTRACTION_ID } from '@/lib/sample-extraction'
import { captureEvent, EVENTS } from '@/lib/posthog'
import { SUCCESS_PANEL } from '@/lib/design-tokens'
import { RESULTS_ACCURACY_DISCLAIMER } from '@/lib/disclaimers'

interface TeaserViewProps {
  extractionId: string
}

export function TeaserView({ extractionId }: TeaserViewProps) {
  const { user } = useAuth()
  const { data: teaser, isLoading, isError } = useTeaser(extractionId)
  const isSample = extractionId === SAMPLE_EXTRACTION_ID
  const trackedRef = useRef<string | null>(null)

  useEffect(() => {
    if (teaser && trackedRef.current !== extractionId) {
      trackedRef.current = extractionId
      captureEvent(EVENTS.teaser_viewed, {
        extraction_id: extractionId,
        field_count: teaser.total_field_count,
        red_flag_count: teaser.red_flag_count,
        is_sample: isSample,
      })
    }
  }, [teaser, extractionId, isSample])

  if (isLoading) {
    return <TeaserSkeleton />
  }

  if (isError || !teaser) {
    return (
      <div data-testid="teaser-error" className="py-12 text-center">
        <p className="text-muted-foreground">Failed to load extraction results.</p>
        <Link href="/upload" className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline">
          Upload a new lease →
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8" data-testid="teaser-view">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="document-filename">
          {teaser.document_filename}
        </h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="size-4" />
          <span>Extraction complete. Here is your preview.</span>
        </div>
      </header>

      {/* Visible fields */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">
          Key Lease Terms
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {teaser.visible_fields.length} of {teaser.total_field_count} {teaser.total_field_count === 1 ? 'field' : 'fields'} shown
          </span>
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teaser.visible_fields.map((field, index) => (
            <FieldDisplay
              key={field.field_name}
              field_name={field.field_name}
              label={field.label}
              value={field.value}
              index={index}
            />
          ))}
        </div>
      </section>

      {/* Stats row */}
      <section className="flex flex-wrap items-start gap-6 rounded-lg border bg-card p-4">
        <ConfidenceChart distribution={teaser.confidence_distribution} />
        <div className="flex flex-col items-center gap-2">
          {teaser.red_flag_count > 0 ? (
            <div className="flex flex-col items-center gap-1">
              <Badge variant="destructive" className="text-xs" data-testid="red-flag-badge">
                <AlertTriangle className="mr-1 size-3" />
                {teaser.red_flag_count} {teaser.red_flag_count === 1 ? 'red flag' : 'red flags'} detected
              </Badge>
              {teaser.red_flag_severity_high !== undefined && teaser.red_flag_severity_high > 0 && (
                <span className="text-xs font-medium text-destructive" data-testid="red-flag-severity">
                  {teaser.red_flag_severity_high} HIGH severity
                </span>
              )}
              {teaser.red_flag_categories && teaser.red_flag_categories.length > 0 && (
                <span className="text-xs text-muted-foreground" data-testid="red-flag-categories">
                  Including issues in {teaser.red_flag_categories.slice(0, 2).join(' and ')}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                Unlock to see full details
              </span>
            </div>
          ) : (
            <Badge variant="secondary" className={`${SUCCESS_PANEL.container} ${SUCCESS_PANEL.body} text-xs`} data-testid="no-red-flags-badge">
              <CheckCircle className="mr-1 size-3" />
              No red flags detected
            </Badge>
          )}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Layers className="size-3.5" />
            <span data-testid="total-field-count">
              {teaser.total_field_count} {teaser.total_field_count === 1 ? 'field' : 'fields'} across {teaser.category_count} {teaser.category_count === 1 ? 'category' : 'categories'}
            </span>
          </div>
        </div>
      </section>

      {/* Blurred preview */}
      <h2 className="text-lg font-semibold">See What&apos;s Inside</h2>
      <BlurredFields
        totalFields={teaser.total_field_count}
        visibleCount={teaser.visible_fields.length}
        locked_categories={teaser.locked_categories}
      />

      {/* CTA - sample shows upload prompt, real extractions show payment */}
      {isSample ? (
        <section className="rounded-xl border bg-primary/5 p-6 text-center" data-testid="sample-upload-cta">
          <h3 className="mb-2 text-lg font-semibold">Like what you see?</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Upload your own lease to get all {teaser.total_field_count} fields extracted with red flag analysis.
          </p>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 transition-colors hover:bg-primary/90"
          >
            <Upload className="size-4" />
            Upload Your Lease
          </Link>
        </section>
      ) : user ? (
        <PaymentCta
          extractionId={extractionId}
          totalFieldCount={teaser.total_field_count}
          redFlagCount={teaser.red_flag_count}
        />
      ) : (
        <GuestCheckoutCta
          extractionId={extractionId}
          totalFieldCount={teaser.total_field_count}
          redFlagCount={teaser.red_flag_count}
        />
      )}
      <p
        data-testid="teaser-accuracy-disclaimer"
        className="border-t pt-4 text-xs leading-relaxed text-muted-foreground"
      >
        {RESULTS_ACCURACY_DISCLAIMER}
      </p>
    </div>
  )
}
