import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useExportTaskStatus,
  EXPORT_TASK_TIMEOUT_MS,
  EXPORT_TASK_POLL_INTERVAL_MS,
} from '@/hooks/use-export'

const mockApiGet = vi.fn()
vi.mock('@/lib/api', () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPost: vi.fn(),
  apiDownloadBlob: vi.fn(),
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

describe('useExportTaskStatus', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    mockApiGet.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('is disabled and does not poll when taskId is null', () => {
    const { result } = renderHook(() => useExportTaskStatus(null), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(mockApiGet).not.toHaveBeenCalled()
  })

  it('polls the task status endpoint and stops on completion', async () => {
    mockApiGet.mockResolvedValue({ task_id: 'task-1', status: 'complete' })

    const { result } = renderHook(() => useExportTaskStatus('task-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.data?.status).toBe('complete')
    })
    expect(mockApiGet).toHaveBeenCalledWith('/tasks/task-1/status')
  })

  it('surfaces an error once the polling deadline is exceeded', async () => {
    const nowSpy = vi.spyOn(Date, 'now')
    // The first poll records the start time, then the elapsed-time check on the
    // same response already reports a time past the timeout, tripping the guard
    // without waiting for a second poll interval.
    nowSpy
      .mockReturnValueOnce(0) // start time recorded on first poll
      .mockReturnValue(EXPORT_TASK_TIMEOUT_MS + 1) // elapsed check is past deadline

    mockApiGet.mockResolvedValue({ task_id: 'task-slow', status: 'generating' })

    const { result } = renderHook(() => useExportTaskStatus('task-slow'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
    expect(result.current.error).toBeInstanceOf(Error)
    expect((result.current.error as Error).message).toContain('timed out')
  })

  it('reuses the recorded start time across repeated polls of the same task', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1000)
    mockApiGet
      .mockResolvedValueOnce({ task_id: 'task-2', status: 'generating' })
      .mockResolvedValueOnce({ task_id: 'task-2', status: 'complete' })

    const { result } = renderHook(() => useExportTaskStatus('task-2'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.data?.status).toBe('generating')
    })

    // Advance past the poll interval to trigger a second fetch that reuses the
    // previously recorded start time rather than recording a new one.
    await vi.advanceTimersByTimeAsync(EXPORT_TASK_POLL_INTERVAL_MS + 100)

    await waitFor(() => {
      expect(result.current.data?.status).toBe('complete')
    })
    expect(mockApiGet).toHaveBeenCalledTimes(2)
    nowSpy.mockRestore()
  })

  it('exposes named polling constants', () => {
    expect(EXPORT_TASK_TIMEOUT_MS).toBe(60_000)
    expect(EXPORT_TASK_POLL_INTERVAL_MS).toBe(2_000)
  })
})
