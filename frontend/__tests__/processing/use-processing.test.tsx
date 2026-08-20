import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useProcessing } from '@/hooks/use-processing'
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

function mockExtraction(
  overrides: Partial<Extraction> = {}
): Extraction {
  return {
    id: 'ext-1',
    document_filename: 'test.pdf',
    status: 'uploading',
    payment_status: 'unpaid',
    document_page_count: null,
    property_type: null,
    extracted_data: {},
    confidence_scores: {},
    red_flags: [],
    show_camaudit: false,
    overall_confidence: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('useProcessing', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fetches extraction data', async () => {
    const data = mockExtraction({ status: 'uploading' })
    vi.spyOn(api, 'apiGet').mockResolvedValue(data)

    const { result } = renderHook(() => useProcessing('ext-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.extraction).toEqual(data)
    })
    expect(api.apiGet).toHaveBeenCalledWith('/extractions/ext-1/status')
  })

  it('derives currentStep index from status', async () => {
    const data = mockExtraction({ status: 'extracting' })
    vi.spyOn(api, 'apiGet').mockResolvedValue(data)

    const { result } = renderHook(() => useProcessing('ext-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.currentStep).toBe(1) // extracting is index 1
    })
  })

  it('derives completedSteps from status', async () => {
    const data = mockExtraction({ status: 'scoring' })
    vi.spyOn(api, 'apiGet').mockResolvedValue(data)

    const { result } = renderHook(() => useProcessing('ext-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      // uploading and extracting are completed; scoring is current (index 2)
      expect(result.current.completedSteps).toEqual([0, 1])
    })
  })

  it('returns 100% progress for complete status', async () => {
    const data = mockExtraction({ status: 'complete' })
    vi.spyOn(api, 'apiGet').mockResolvedValue(data)

    const { result } = renderHook(() => useProcessing('ext-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.overallProgress).toBe(100)
    })
  })

  it('returns 100% progress for completed status', async () => {
    const data = mockExtraction({ status: 'complete' })
    vi.spyOn(api, 'apiGet').mockResolvedValue(data)

    const { result } = renderHook(() => useProcessing('ext-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.overallProgress).toBe(100)
    })
  })

  it('polls every 3 seconds while processing', async () => {
    const data = mockExtraction({ status: 'uploading' })
    const spy = vi.spyOn(api, 'apiGet').mockResolvedValue(data)

    renderHook(() => useProcessing('ext-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })

    await waitFor(() => {
      expect(spy.mock.calls.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('stops polling when status is complete', async () => {
    const data = mockExtraction({ status: 'complete' })
    const spy = vi.spyOn(api, 'apiGet').mockResolvedValue(data)

    renderHook(() => useProcessing('ext-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(1)
    })

    const callCount = spy.mock.calls.length

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000)
    })

    // Should not have polled further
    expect(spy.mock.calls.length).toBe(callCount)
  })

  it('stops polling when status is failed', async () => {
    const data = mockExtraction({ status: 'failed' })
    const spy = vi.spyOn(api, 'apiGet').mockResolvedValue(data)

    renderHook(() => useProcessing('ext-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(1)
    })

    const callCount = spy.mock.calls.length

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000)
    })

    expect(spy.mock.calls.length).toBe(callCount)
  })

  it('returns isLoading true initially', () => {
    vi.spyOn(api, 'apiGet').mockResolvedValue(mockExtraction())

    const { result } = renderHook(() => useProcessing('ext-1'), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)
  })

  it('returns isError when API fails', async () => {
    vi.spyOn(api, 'apiGet').mockRejectedValue(
      new api.ApiError(404, 'Not found')
    )

    const { result } = renderHook(() => useProcessing('ext-1'), {
      wrapper: createWrapper(),
    })

    // useProcessing has retry: 2, advance timers to exhaust retries
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    }, { timeout: 5000 })
  })

  it('continues polling after a transient status error', async () => {
    const spy = vi
      .spyOn(api, 'apiGet')
      .mockResolvedValueOnce(mockExtraction({ status: 'extracting' }))
      .mockRejectedValueOnce(new api.ApiError(503, 'Temporary outage'))
      .mockRejectedValueOnce(new api.ApiError(503, 'Temporary outage'))
      .mockRejectedValueOnce(new api.ApiError(503, 'Temporary outage'))
      .mockResolvedValueOnce(mockExtraction({ status: 'complete' }))

    const { result } = renderHook(() => useProcessing('ext-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.extraction?.status).toBe('extracting')
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })

    await waitFor(() => {
      expect(result.current.extraction?.status).toBe('complete')
    })
    expect(spy).toHaveBeenCalledTimes(5)
  })
})
