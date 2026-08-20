'use client'

import { useRef } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/api'

export type ExportFormat = 'docx' | 'pdf' | 'xlsx'

interface ExportCachedResponse {
  url: string
  format: string
  /** Version token pinning the download to this exact generated file. */
  version?: string
}

interface ExportTaskResponse {
  task_id: string
  status: string
  version?: string
}

interface ExportTaskStatusResponse {
  task_id: string
  status: 'generating' | 'complete' | 'failed'
  url?: string
  /** Version token of the generated export; pass to the download endpoint. */
  version?: string
}

type ExportResponse = ExportCachedResponse | ExportTaskResponse
type ExportVariables = { format: ExportFormat; template: string }

/**
 * Maximum time to wait for an async export task to reach a terminal status
 * before giving up and surfacing an error. Guards against a task that never
 * completes (which would otherwise leave the spinner spinning forever).
 */
export const EXPORT_TASK_TIMEOUT_MS = 60_000

/** How often the export task status is polled while generation is in flight. */
export const EXPORT_TASK_POLL_INTERVAL_MS = 2_000

interface UseExportOptions {
  extractionId: string
  onSuccess?: (data: ExportResponse, variables: ExportVariables) => void
  onError?: (error: Error) => void
}

export function useExport({ extractionId, onSuccess, onError }: UseExportOptions) {
  return useMutation({
    mutationFn: async ({ format, template }: ExportVariables) => {
      // Export is a mutating operation, so POST avoids accidental caching/replay.
      const response = await apiPost<ExportResponse>(
        `/extractions/${extractionId}/export/${format}`,
        { template },
      )

      return response
    },
    onSuccess: (data, variables) => onSuccess?.(data, variables),
    onError: (error: Error) => onError?.(error),
  })
}

/**
 * Fetch the status of an export task once, enforcing the elapsed-time timeout.
 *
 * Records the first-seen start time per task (in the supplied map) and throws
 * once the configured timeout elapses without reaching a terminal status, so a
 * task that never completes surfaces an error instead of polling forever.
 */
async function pollExportTask(
  taskId: string,
  startTimes: Map<string, number>,
): Promise<ExportTaskStatusResponse> {
  const startedAt = startTimes.get(taskId) ?? Date.now()
  startTimes.set(taskId, startedAt)

  const response = await apiGet<ExportTaskStatusResponse>(
    `/tasks/${taskId}/status`,
  )

  if (response.status === 'complete' || response.status === 'failed') {
    startTimes.delete(taskId)
    return response
  }

  if (Date.now() - startedAt >= EXPORT_TASK_TIMEOUT_MS) {
    startTimes.delete(taskId)
    throw new Error('Export timed out. Please try again.')
  }

  return response
}

/**
 * Poll for an async export task until it completes or fails.
 * Only active when taskId is non-null (i.e., a 202 task was returned).
 */
export function useExportTaskStatus(taskId: string | null) {
  // Tracks when polling started for the active task so we can enforce a hard
  // timeout. Keyed by taskId so a retry that reuses an id still resets cleanly.
  const startTimes = useRef(new Map<string, number>())

  return useQuery({
    queryKey: ['export-task', taskId],
    queryFn: () => {
      // The query is gated by `enabled: !!taskId`, so taskId is always present
      // here; assert it to satisfy the type without a dead runtime guard.
      const activeTaskId = taskId as string
      return pollExportTask(activeTaskId, startTimes.current)
    },
    enabled: !!taskId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'complete' || status === 'failed') {
        return false
      }
      // Stop polling once the request itself has errored (including the
      // timeout above); the error state surfaces the failure to the user.
      if (query.state.status === 'error') {
        return false
      }
      return EXPORT_TASK_POLL_INTERVAL_MS
    },
    staleTime: 0,
  })
}
