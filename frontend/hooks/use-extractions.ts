import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'

export interface ExtractionListItem {
  id: string
  document_filename: string
  status: string
  payment_status: string
  property_type: string | null
  created_at: string
}

export interface ExtractionListResponse {
  items: ExtractionListItem[]
  total: number
  limit: number
  offset: number
}

export interface ExtractionListParams {
  limit?: number
  offset?: number
  status?: string
  dateFrom?: string
  dateTo?: string
  sort?: 'asc' | 'desc'
}

export const extractionListKeys = {
  all: ['extraction-list'] as const,
  list: (params: ExtractionListParams) => ['extraction-list', params] as const,
}

export function useExtractions(params: ExtractionListParams = {}) {
  const { limit = 20, offset = 0, status, dateFrom, dateTo, sort = 'desc' } = params

  const searchParams = new URLSearchParams()
  searchParams.set('limit', String(limit))
  searchParams.set('offset', String(offset))
  searchParams.set('sort', sort)
  if (status) searchParams.set('status', status)
  if (dateFrom) searchParams.set('date_from', dateFrom)
  if (dateTo) searchParams.set('date_to', dateTo)

  return useQuery({
    queryKey: extractionListKeys.list({ limit, offset, status, dateFrom, dateTo, sort }),
    queryFn: () => apiGet<ExtractionListResponse>(`/extractions?${searchParams.toString()}`),
    placeholderData: keepPreviousData,
  })
}
