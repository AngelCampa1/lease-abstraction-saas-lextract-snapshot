'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/api'
import type { ExtractionStatus } from '@/hooks/use-extraction'
import { PIPELINE_STEPS } from '@/components/processing/step-progress'

// Separate key namespace from extractionKeys (full results) to avoid cache
// collisions — both would use ['extractions', id] but hit different endpoints
// returning different data shapes.
export const processingKeys = {
  detail: (id: string) => ['processing', id] as const,
}

/** Lightweight shape matching the processing status endpoint response. */
interface ExtractionStatusDetail {
  id: string
  status: ExtractionStatus
  payment_status: string
  document_filename: string
  document_page_count?: number | null
  error_message?: string
}

function isTerminalStatus(status: ExtractionStatus | undefined): boolean {
  return status === 'complete' || status === 'failed'
}

function getStepIndex(status: ExtractionStatus): number {
  const index = PIPELINE_STEPS.findIndex((s) => s.key === status)
  return index === -1 ? 0 : index
}

function getCompletedSteps(status: ExtractionStatus): number[] {
  if (status === 'complete') {
    return PIPELINE_STEPS.map((_, i) => i)
  }
  const currentIndex = getStepIndex(status)
  const completed: number[] = []
  for (let i = 0; i < currentIndex; i++) {
    completed.push(i)
  }
  return completed
}

function getOverallProgress(status: ExtractionStatus): number {
  if (status === 'failed') return 0
  if (status === 'complete') return 100
  const index = getStepIndex(status)
  return PIPELINE_STEPS[index].progress
}

export function useProcessing(id: string) {
  const queryClient = useQueryClient()
  const {
    data: extraction,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: processingKeys.detail(id),
    queryFn: () => apiGet<ExtractionStatusDetail>(`/extractions/${id}/status`),
    enabled: !!id,
    retry: 2,
    refetchInterval: (query) => {
      if (isTerminalStatus(query.state.data?.status)) return false
      return 5000
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () =>
      apiPost<ExtractionStatusDetail>(`/extractions/${id}/cancel`),
    onSuccess: (data) => {
      queryClient.setQueryData(processingKeys.detail(id), data)
    },
  })

  const retryMutation = useMutation({
    mutationFn: async (): Promise<ExtractionStatusDetail | null> => {
      // Backend returns 202 Accepted, optionally with the new processing
      // status. Tolerate an empty body so the UI works regardless of whether
      // the backend chooses to include one.
      try {
        return await apiPost<ExtractionStatusDetail>(`/extractions/${id}/retry`)
      } catch (err) {
        // An "Invalid response format" parse error on an otherwise-successful
        // 202 means the body was empty — treat that as a successful retry
        // with no payload and let the next poll pick up the fresh status.
        if (
          err instanceof Error &&
          err.message === 'Invalid response format from server'
        ) {
          return null
        }
        throw err
      }
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData(processingKeys.detail(id), data)
      }
      queryClient.invalidateQueries({ queryKey: processingKeys.detail(id) })
    },
  })

  const status = extraction?.status
  const currentStep = status ? getStepIndex(status) : 0
  const completedSteps = status ? getCompletedSteps(status) : []
  const overallProgress = status ? getOverallProgress(status) : 0

  return {
    extraction,
    isLoading,
    isError,
    error,
    currentStep,
    completedSteps,
    overallProgress,
    cancel: cancelMutation.mutate,
    isCancelling: cancelMutation.isPending,
    cancelError: cancelMutation.error,
    retry: retryMutation.mutate,
    isRetrying: retryMutation.isPending,
    retryError: retryMutation.error,
  }
}
