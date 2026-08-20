'use client'

import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { SAMPLE_EXTRACTION_ID, SAMPLE_TEASER } from '@/lib/sample-extraction'

export interface TeaserFieldValue {
  field_name: string
  label: string
  value: string | null
}

export interface ConfidenceDistribution {
  high: number
  medium: number
  low: number
  not_found?: number
}

export interface LockedCategory {
  name: string
  field_count: number
}

export interface TeaserResponse {
  id: string
  status: string
  payment_status: string
  document_filename: string
  document_page_count?: number | null
  visible_fields: TeaserFieldValue[]
  total_field_count: number
  category_count: number
  confidence_distribution: ConfidenceDistribution
  red_flag_count: number
  red_flag_severity_high?: number
  red_flag_categories?: string[]
  locked_categories?: LockedCategory[]
  error_message?: string | null
}

export const teaserKeys = {
  detail: (id: string) => ['teaser', id] as const,
}

export function useTeaser(id: string) {
  const isSample = id === SAMPLE_EXTRACTION_ID

  return useQuery({
    queryKey: teaserKeys.detail(id),
    queryFn: isSample
      ? () => Promise.resolve(SAMPLE_TEASER)
      : () => apiGet<TeaserResponse>(`/extractions/${id}/teaser`),
    enabled: !!id,
    staleTime: isSample ? Infinity : undefined,
  })
}
