'use client'

import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Check, Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import type { ExportFormat } from '@/hooks/use-export'
import { useExport, useExportTaskStatus } from '@/hooks/use-export'
import { HELP_CONTENT } from '@/lib/help-content'
import { captureEvent, EVENTS } from '@/lib/posthog'
import { APP_STATUS_COLORS, SUCCESS_INLINE } from '@/lib/design-tokens'
import { apiDownloadBlob } from '@/lib/api'
import { FormatPicker } from './format-picker'
import { TemplateSelector } from './template-selector'

interface ExportPanelProps {
  extractionId: string
}

interface PendingExport {
  taskId: string
  format: ExportFormat
  template: string
}

function isTaskResponse(data: unknown): data is { task_id: string; status: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'task_id' in data &&
    !('url' in data)
  )
}

function exportFilename(format: ExportFormat): string {
  return `lease-abstraction-report.${format}`
}

async function downloadExport(
  extractionId: string,
  format: ExportFormat,
  template: string,
  version?: string,
): Promise<void> {
  // Pin the download to the exact generated file via its version token so a
  // field edit landing after export does not 404 the download (the backend
  // would otherwise recompute the key from the now-newer updated_at).
  const versionParam = version
    ? `&version=${encodeURIComponent(version)}`
    : ''
  const blob = await apiDownloadBlob(
    `/extractions/${extractionId}/export/${format}/download?template=${encodeURIComponent(template)}${versionParam}`,
  )
  const blobUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = blobUrl
  anchor.download = exportFilename(format)
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0)
}

export function ExportPanel({ extractionId }: ExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>('docx')
  const [template, setTemplate] = useState('commercial')
  const [pendingExport, setPendingExport] = useState<PendingExport | null>(null)
  const [downloadComplete, setDownloadComplete] = useState(false)
  const [downloadFailed, setDownloadFailed] = useState(false)
  const [exportTaskFailed, setExportTaskFailed] = useState(false)
  const queryClient = useQueryClient()

  const exportMutation = useExport({
    extractionId,
    onSuccess: (data, variables) => {
      if (isTaskResponse(data)) {
        queryClient.removeQueries({ queryKey: ['export-task', data.task_id] })
        setPendingExport({
          taskId: data.task_id,
          format: variables.format,
          template: variables.template,
        })
        return
      }

      downloadExport(extractionId, variables.format, variables.template, data.version)
        .then(() => {
          setDownloadComplete(true)
          captureEvent(EVENTS.export_completed, {
            extraction_id: extractionId,
            format: variables.format,
          })
        })
        .catch((error: unknown) => {
          const message =
            error instanceof Error ? error.message : 'Failed to download export. Please try again.'
          toast.error(message)
          setDownloadFailed(true)
          setDownloadComplete(false)
          captureEvent(EVENTS.export_failed, {
            extraction_id: extractionId,
            format: variables.format,
          })
        })
    },
    onError: () => {
      captureEvent(EVENTS.export_failed, { extraction_id: extractionId, format })
    },
  })

  const taskStatus = useExportTaskStatus(pendingExport?.taskId ?? null)
  const openedTaskRef = useRef<string | null>(null)
  const failedTaskRef = useRef<string | null>(null)
  const erroredTaskRef = useRef<string | null>(null)

  // A failed status-poll request (network/500/timeout) must surface the error
  // and clear the pending state so the spinner hides and the button re-enables.
  useEffect(() => {
    if (!pendingExport || !taskStatus.isError) {
      return undefined
    }
    if (pendingExport.taskId !== erroredTaskRef.current) {
      erroredTaskRef.current = pendingExport.taskId
      captureEvent(EVENTS.export_failed, {
        extraction_id: extractionId,
        format: pendingExport.format,
      })
    }
    const timeoutId = window.setTimeout(() => {
      setExportTaskFailed(true)
      setPendingExport(null)
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [taskStatus.isError, pendingExport, extractionId])

  useEffect(() => {
    if (pendingExport && taskStatus.data?.status === 'failed') {
      if (pendingExport.taskId !== failedTaskRef.current) {
        failedTaskRef.current = pendingExport.taskId
        captureEvent(EVENTS.export_failed, {
          extraction_id: extractionId,
          format: pendingExport.format,
        })
      }
      const timeoutId = window.setTimeout(() => {
        setExportTaskFailed(true)
        setPendingExport(null)
      }, 0)
      return () => window.clearTimeout(timeoutId)
    }

    if (
      !pendingExport ||
      taskStatus.data?.status !== 'complete' ||
      pendingExport.taskId === openedTaskRef.current
    ) {
      return
    }

    openedTaskRef.current = pendingExport.taskId
    downloadExport(
      extractionId,
      pendingExport.format,
      pendingExport.template,
      taskStatus.data?.version,
    )
      .then(() => {
        captureEvent(EVENTS.export_completed, {
          extraction_id: extractionId,
          format: pendingExport.format,
        })
        setDownloadComplete(true)
        setPendingExport(null)
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'Failed to download export. Please try again.'
        toast.error(message)
        setDownloadFailed(true)
        setPendingExport(null)
        setDownloadComplete(false)
        captureEvent(EVENTS.export_failed, {
          extraction_id: extractionId,
          format: pendingExport.format,
        })
      })

    return undefined
  }, [taskStatus.data, extractionId, pendingExport, queryClient])

  const handleDownload = () => {
    captureEvent(EVENTS.export_started, { extraction_id: extractionId, format, template })
    setPendingExport(null)
    openedTaskRef.current = null
    failedTaskRef.current = null
    erroredTaskRef.current = null
    setDownloadComplete(false)
    setDownloadFailed(false)
    setExportTaskFailed(false)
    exportMutation.mutate({ format, template })
  }

  const errorMessage = downloadFailed
    ? 'Failed to download export. Please try again.'
    : exportMutation.isError
      ? exportMutation.error instanceof Error
        ? exportMutation.error.message
        : 'Failed to export. Please try again.'
      : 'Export generation failed. Please try again.'

  const taskComplete = taskStatus.data?.status === 'complete'
  const hasActivePendingExport = !!pendingExport && !taskComplete

  const isGenerating = (exportMutation.isSuccess && hasActivePendingExport) || exportMutation.isPending

  const isError =
    downloadFailed || exportMutation.isError || exportTaskFailed || taskStatus.isError

  return (
    <Card data-testid="export-panel">
      <CardHeader>
        <CardTitle className="text-lg">Export Report</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-muted-foreground">Format</p>
            <HelpTooltip label="Which export format should I choose?">
              {HELP_CONTENT.exportFormat}
            </HelpTooltip>
          </div>
          <FormatPicker value={format} onChange={setFormat} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-muted-foreground">Template</p>
            <HelpTooltip label="Which export template should I choose?">
              {HELP_CONTENT.exportTemplate}
            </HelpTooltip>
          </div>
          <TemplateSelector value={template} onChange={setTemplate} />
        </div>

        <Button
          data-testid="download-button"
          className="w-full"
          size="lg"
          onClick={handleDownload}
          disabled={exportMutation.isPending || hasActivePendingExport}
        >
          {isGenerating ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="size-4" />
              Download
            </>
          )}
        </Button>

        {isError && (
          <div
            data-testid="export-error"
            className={`flex items-center gap-2 rounded-md border p-3 text-sm ${APP_STATUS_COLORS.error.badge}`}
          >
            <AlertCircle className="size-4 shrink-0" />
            <span className="flex-1">{errorMessage}</span>
            <button
              data-testid="retry-button"
              type="button"
              aria-label="Try export again"
              className="rounded-full px-2 py-1 font-medium underline underline-offset-2 hover:bg-background/60 hover:no-underline"
              onClick={handleDownload}
            >
              Try Again
            </button>
          </div>
        )}

        {pendingExport && taskStatus.data?.status !== 'complete' && (
          <div
            data-testid="export-generating"
            className={`flex items-center gap-2 rounded-md border p-3 text-sm ${APP_STATUS_COLORS.processing.badge}`}
          >
            <Loader2 className="size-4 animate-spin" />
            <span>Generating your {pendingExport.format.toUpperCase()} export... This usually takes 10-20 seconds.</span>
          </div>
        )}

        {downloadComplete && (
          <div
            data-testid="export-success"
            className={`flex items-center gap-2 rounded-md border p-3 text-sm ${SUCCESS_INLINE.container} ${SUCCESS_INLINE.text}`}
          >
            <Check className="size-4" />
            <span>Download started</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
