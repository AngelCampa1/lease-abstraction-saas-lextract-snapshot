import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useExtraction, extractionKeys } from '@/hooks/use-extraction'
import type { Extraction } from '@/hooks/use-extraction'
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

describe('useExtraction', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches extraction by id', async () => {
    const mockExtraction: Extraction = {
      id: 'ext-1',
      document_filename: 'test.pdf',
      status: 'complete',
      payment_status: 'unpaid',
      document_page_count: null,
      property_type: null,
      extracted_data: {},
      confidence_scores: {},
      red_flags: [],
      show_camaudit: false,
      overall_confidence: 0.95,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }

    vi.spyOn(api, 'apiGet').mockResolvedValue(mockExtraction)

    const { result } = renderHook(() => useExtraction('ext-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockExtraction)
    expect(api.apiGet).toHaveBeenCalledWith('/extractions/ext-1')
  })

  it('does not fetch when id is empty', () => {
    vi.spyOn(api, 'apiGet')

    renderHook(() => useExtraction(''), {
      wrapper: createWrapper(),
    })

    expect(api.apiGet).not.toHaveBeenCalled()
  })

  it('has correct query keys', () => {
    expect(extractionKeys.all).toEqual(['extractions'])
    expect(extractionKeys.detail('abc')).toEqual(['extractions', 'abc'])
  })
})
