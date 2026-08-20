'use client'

import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import type { FullExtraction } from '@/types/extraction'

export type ExtractionStatus =
  | 'uploading'
  | 'extracting'
  | 'scoring'
  | 'complete'
  | 'failed'

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded'

export type { FullExtraction as Extraction }

export const extractionKeys = {
  all: ['extractions'] as const,
  detail: (id: string) => ['extractions', id] as const,
}

export function useExtraction(id: string) {
  return useQuery({
    queryKey: extractionKeys.detail(id),
    queryFn: () => apiGet<FullExtraction>(`/extractions/${id}`),
    enabled: !!id,
  })
}
