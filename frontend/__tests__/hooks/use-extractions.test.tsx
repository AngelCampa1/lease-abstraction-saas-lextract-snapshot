import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useExtractions, extractionListKeys, type ExtractionListResponse } from '@/hooks/use-extractions'
import * as api from '@/lib/api'

vi.mock('@/lib/neon-auth/client', () => ({
  createAuthClient: () => ({
    getSession: vi.fn().mockResolvedValue({ data: null, error: null }),
    onAuthStateChange: () => () => {},
  }),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe('extractionListKeys', () => {
  it('has a separate namespace from extraction detail keys', () => {
    expect(extractionListKeys.all).toEqual(['extraction-list'])
  })

  it('generates list keys with params', () => {
    const key = extractionListKeys.list({ limit: 10, sort: 'asc' })
    expect(key).toEqual(['extraction-list', { limit: 10, sort: 'asc' }])
  })
})

describe('useExtractions', () => {
  it('fetches extractions list with default params', async () => {
    const mockResponse: ExtractionListResponse = {
      items: [],
      total: 0,
      limit: 20,
      offset: 0,
    }

    vi.spyOn(api, 'apiGet').mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useExtractions(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockResponse)
    expect(api.apiGet).toHaveBeenCalledWith(
      '/extractions?limit=20&offset=0&sort=desc'
    )
  })

  it('fetches with custom params including date filters', async () => {
    vi.spyOn(api, 'apiGet').mockResolvedValue({
      items: [],
      total: 0,
      limit: 10,
      offset: 20,
    })

    const { result } = renderHook(
      () => useExtractions({
        limit: 10,
        offset: 20,
        status: 'complete',
        dateFrom: '2026-03-01',
        dateTo: '2026-03-31',
        sort: 'asc',
      }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(api.apiGet).toHaveBeenCalledWith(
      '/extractions?limit=10&offset=20&sort=asc&status=complete&date_from=2026-03-01&date_to=2026-03-31'
    )
  })
})
