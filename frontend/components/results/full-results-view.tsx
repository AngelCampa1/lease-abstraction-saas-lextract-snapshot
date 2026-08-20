'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { RefreshCw, ChevronsUpDown, Search, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { useExtraction } from '@/hooks/use-extraction'
import { useDocumentUrl } from '@/hooks/use-document-url'
import { useEditHistory } from '@/hooks/use-edit-history'
import { ResultsHeader } from '@/components/results/results-header'
import { SortedCategoryList } from '@/components/results/category-accordion'
import { RedFlagPanel } from '@/components/results/red-flag-panel'
import { ExportPanel } from '@/components/results/export-panel'
import { SplitResultsView } from '@/components/results/split-results-view'
import { CamAuditBanner } from '@/components/results/camaudit-banner'
import { CamAuditPartnerCta } from '@/components/results/camaudit-partner-cta'
import { ExecSummaryCard } from '@/components/results/exec-summary-card'
import { EditDiscoveryToast } from '@/components/results/edit-discovery-toast'
import { CATEGORIES } from '@/types/extraction'
import { FullResultsSkeleton } from '@/components/skeletons'
import type { RedFlag } from '@/types/extraction'
import { HELP_CONTENT } from '@/lib/help-content'
import { captureEvent, EVENTS } from '@/lib/posthog'
import { SUCCESS_PANEL } from '@/lib/design-tokens'
import { getUserFacingError } from '@/lib/user-facing-errors'
import { RESULTS_ACCURACY_DISCLAIMER } from '@/lib/disclaimers'

interface FullResultsViewProps {
  extractionId: string
}

function FullResultsError({
  error,
  onRetry,
}: {
  error: unknown
  onRetry: () => void
}) {
  const message = getUserFacingError(error, 'results')

  return (
    <div
      data-testid="full-results-error"
      className="flex flex-col items-center gap-4 py-12 text-center"
    >
      <h2 className="text-xl font-semibold">{message.title}</h2>
      <p className="text-muted-foreground">{message.description}</p>
      {message.trackingId && (
        <p className="font-mono text-xs text-muted-foreground">
          Tracking ID: {message.trackingId}
        </p>
      )}
      <Button variant="outline" onClick={onRetry} aria-label="Retry">
        <RefreshCw className="mr-2 size-4" />
        Retry
      </Button>
    </div>
  )
}

export function FullResultsView({ extractionId }: FullResultsViewProps) {
  const fullResultsTrackedRef = useRef<string | null>(null)

  const {
    data: rawExtraction,
    isLoading,
    isError,
    error,
    refetch,
  } = useExtraction(extractionId)

  const { data: documentUrlData, isError: documentUrlIsError } =
    useDocumentUrl(extractionId)
  const { data: editHistoryData } = useEditHistory(extractionId)

  const [showPdf, setShowPdf] = useState(false)
  const [highlightSourceText, setHighlightSourceText] = useState<string | null>(
    null,
  )
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set())
  const [localRedFlags, setLocalRedFlags] = useState<RedFlag[] | null>(null)
  const [allExpanded, setAllExpanded] = useState(false)
  const [fieldSearch, setFieldSearch] = useState('')
  const [showSuccessBanner, setShowSuccessBanner] = useState(() => {
    if (typeof window === 'undefined') return false
    const params = new URLSearchParams(window.location.search)
    const isSuccess = params.get('payment') === 'success'
    if (isSuccess) {
      const url = new URL(window.location.href)
      url.searchParams.delete('payment')
      window.history.replaceState({}, '', url.toString())
    }
    return isSuccess
  })

  // Build original values from edit history
  const edits = editHistoryData?.edits
  const originalValues: Record<string, unknown> = {}
  if (edits) {
    for (const edit of edits) {
      if (!(edit.field_name in originalValues)) {
        originalValues[edit.field_name] = edit.original_value
      }
    }
  }

  // Combine locally tracked edits with history-based edits, memoized to avoid
  // creating a new Set on every render.
  const combinedEditedFields = useMemo(() => {
    const fromHistory = new Set<string>()
    if (edits) {
      for (const edit of edits) {
        fromHistory.add(edit.field_name)
      }
    }
    return new Set([...editedFields, ...fromHistory])
  }, [editedFields, edits])

  const handleEditComplete = useCallback(
    (fieldName: string, newRedFlags: RedFlag[]) => {
      setEditedFields((prev) => {
        const next = new Set(prev)
        next.add(fieldName)
        return next
      })
      setLocalRedFlags(newRedFlags)
    },
    [],
  )

  // Track full results viewed once per extraction.
  // Must be called before any early returns to satisfy Rules of Hooks.
  useEffect(() => {
    if (!rawExtraction || isLoading || isError) return
    if (
      typeof rawExtraction !== 'object' ||
      !('extracted_data' in rawExtraction) ||
      !('confidence_scores' in rawExtraction)
    ) return
    if (fullResultsTrackedRef.current !== extractionId) {
      fullResultsTrackedRef.current = extractionId
      captureEvent(EVENTS.full_results_viewed, {
        extraction_id: extractionId,
        field_count: rawExtraction.extracted_data
          ? Object.keys(rawExtraction.extracted_data).length
          : 0,
        red_flag_count: rawExtraction.red_flags?.length ?? 0,
      })
    }
  }, [extractionId, rawExtraction, isLoading, isError])

  const handleRetry = useCallback(() => { void refetch() }, [refetch])

  if (isLoading) {
    return <FullResultsSkeleton />
  }

  if (isError || !rawExtraction) {
    return <FullResultsError error={error} onRetry={handleRetry} />
  }

  // Verify the required FullExtraction fields exist so that a stale cache
  // hit causes a graceful error instead of crashing on downstream accesses.
  if (
    typeof rawExtraction !== 'object' ||
    rawExtraction === null ||
    !('extracted_data' in rawExtraction) ||
    !('confidence_scores' in rawExtraction)
  ) {
    return <FullResultsError error={error} onRetry={handleRetry} />
  }
  const extraction = rawExtraction

  const pdfUrl = documentUrlData?.url ?? null
  // Treat a fetch error (e.g. 404 when the underlying file was removed) as a
  // missing PDF so the viewer can render an explanation instead of an empty
  // container. SplitResultsView keys off `pdfUnavailable` to decide whether
  // to show the "View PDF" affordance with the unavailable state.
  const pdfUnavailable = documentUrlIsError || (!pdfUrl && !!documentUrlData)
  const redFlags = localRedFlags ?? extraction.red_flags ?? []

  const handleFieldClick = (sourceText: string) => {
    setHighlightSourceText(sourceText)
    if (!showPdf && (pdfUrl || pdfUnavailable)) {
      setShowPdf(true)
    }
  }

  return (
    <SplitResultsView
      showPdf={showPdf}
      pdfUrl={pdfUrl}
      pdfUnavailable={pdfUnavailable}
      highlightText={highlightSourceText}
      onTogglePdf={() => setShowPdf((prev) => !prev)}
    >
      <div className="space-y-6">
        <ExecSummaryCard
          extractedData={extraction.extracted_data ?? {}}
          redFlags={redFlags}
        />

        <EditDiscoveryToast />

        {showSuccessBanner && (
          <div
            data-testid="success-banner"
            className={`flex items-center gap-3 rounded-lg border p-4 ${SUCCESS_PANEL.container}`}
          >
            <CheckCircle className={`size-5 shrink-0 ${SUCCESS_PANEL.icon}`} />
            <div className="flex-1">
              <p className={`font-semibold ${SUCCESS_PANEL.heading}`}>
                All results unlocked.
              </p>
              <p className={`text-sm ${SUCCESS_PANEL.body}`}>
                You can now see all fields, view the PDF side by side, edit fields, and export.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSuccessBanner(false)}
              className={`rounded-full px-2 py-1 text-sm hover:bg-background/60 ${SUCCESS_PANEL.icon}`}
              aria-label="Dismiss success banner"
              data-testid="dismiss-success-banner"
            >
              Dismiss
            </button>
          </div>
        )}

        <ResultsHeader extraction={extraction} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search fields..."
              value={fieldSearch}
              onChange={(e) => setFieldSearch(e.target.value)}
              className="w-full rounded-md border bg-background py-2 pl-9 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              data-testid="field-search-input"
              aria-label="Search fields"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <HelpTooltip label="How do I search fields?" align="end">
                {HELP_CONTENT.searchFields}
              </HelpTooltip>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAllExpanded((prev) => !prev)}
              data-testid="expand-collapse-all"
            >
              <ChevronsUpDown className="mr-1.5 size-4" />
              {allExpanded ? 'Collapse All' : 'Expand All'}
            </Button>
            <HelpTooltip label="When should I expand all fields?">
              {HELP_CONTENT.expandFields}
            </HelpTooltip>
          </div>
        </div>

        <div
          data-testid="full-results-layout"
          className="flex flex-col gap-8 lg:grid lg:grid-cols-[2fr_1fr]"
        >
          {/* Right column: red flags and export actions */}
          <div className="space-y-4 lg:order-last lg:sticky lg:top-20 lg:self-start">
            <RedFlagPanel redFlags={redFlags} />
            <ExportPanel extractionId={extractionId} />
          </div>

          {/* Left column: categories */}
          <div className="space-y-4">
            <SortedCategoryList
              categories={CATEGORIES}
              extractedData={extraction.extracted_data ?? {}}
              confidenceScores={extraction.confidence_scores ?? {}}
              redFlags={redFlags}
              defaultOpenFirst={true}
              allExpanded={allExpanded}
              onFieldClick={(_fieldName, sourceText) => handleFieldClick(sourceText)}
              isEditable={true}
              editedFields={combinedEditedFields}
              extractionId={extractionId}
              onEditComplete={handleEditComplete}
              originalValues={originalValues}
              filterText={fieldSearch}
            />
          </div>
        </div>

        <CamAuditBanner
          extractionId={extractionId}
          redFlags={redFlags}
          paymentStatus={extraction.payment_status}
          showCamaudit={extraction.show_camaudit}
        />

        <CamAuditPartnerCta paymentStatus={extraction.payment_status} />

        <p
          data-testid="results-accuracy-disclaimer"
          className="border-t pt-4 text-xs leading-relaxed text-muted-foreground"
        >
          {RESULTS_ACCURACY_DISCLAIMER}
        </p>
      </div>
    </SplitResultsView>
  )
}
