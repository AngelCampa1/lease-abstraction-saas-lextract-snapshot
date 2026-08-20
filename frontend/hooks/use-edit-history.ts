'use client'

import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import type { EditHistoryItem } from '@/types/extraction'

interface EditHistoryResponse {
  extraction_id: string
  edits: EditHistoryItem[]
}

export function useEditHistory(extractionId: string | undefined) {
  return useQuery({
    queryKey: ['extractions', extractionId, 'edits'],
    queryFn: () =>
      apiGet<EditHistoryResponse>(`/extractions/${extractionId}/edits`),
    enabled: !!extractionId,
  })
}
