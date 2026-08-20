'use client'

import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'

interface DocumentUrlResponse {
  url: string
  expires_in: number
}

export function useDocumentUrl(extractionId: string) {
  return useQuery({
    queryKey: ['extractions', extractionId, 'document-url'],
    queryFn: async () => {
      const data = await apiGet<DocumentUrlResponse>(
        `/extractions/${extractionId}/document-url`,
      )
      return data
    },
    // Use expires_in from the response to compute staleTime dynamically so we
    // never serve a cached URL that has already expired.  We use 80% of the
    // remaining TTL as a safety margin.  Default to 15 min if expires_in is
    // absent (older API versions may omit it).
    staleTime: (query) => {
      const expiresIn = query.state.data?.expires_in
      if (typeof expiresIn === 'number' && expiresIn > 0) {
        return Math.floor(expiresIn * 0.8) * 1000
      }
      return 15 * 60 * 1000 // 15 min default
    },
    enabled: !!extractionId,
  })
}
