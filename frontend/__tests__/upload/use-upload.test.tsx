import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useUpload } from '@/hooks/use-upload'
import { ApiError } from '@/lib/api'
import * as apiUpload from '@/lib/api-upload'

vi.mock('@/lib/neon-auth/client', () => ({
  authClient: {
    getSession: vi.fn().mockResolvedValue({
      data: {
        session: { token: 'test-token', user: { id: '1', email: 'test@test.com' }, expiresAt: new Date() },
        user: { id: '1', email: 'test@test.com' },
      },
      error: null,
    }),
  },
}))

vi.mock('@/lib/api-upload', () => ({
  uploadFile: vi.fn(),
}))

describe('useUpload', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns initial state', () => {
    const { result } = renderHook(() => useUpload())

    expect(result.current.progress).toBe(0)
    expect(result.current.isPending).toBe(false)
    expect(result.current.isSuccess).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.extractionId).toBeNull()
    expect(result.current.fileName).toBeNull()
  })

  it('sets isPending and fileName during upload', async () => {
    let resolveUpload: (value: apiUpload.UploadResponse) => void
    vi.mocked(apiUpload.uploadFile).mockImplementation(
      () =>
        new Promise<apiUpload.UploadResponse>((resolve) => {
          resolveUpload = resolve
        })
    )

    const { result } = renderHook(() => useUpload())

    const file = new File(['pdf-content'], 'lease.pdf', { type: 'application/pdf' })

    act(() => {
      result.current.upload(file)
    })

    await waitFor(() => {
      expect(result.current.isPending).toBe(true)
    })
    expect(result.current.fileName).toBe('lease.pdf')

    // Complete the upload
    await act(async () => {
      resolveUpload!({ extraction_id: 'ext-456' })
    })

    await waitFor(() => {
      expect(result.current.isPending).toBe(false)
    })
  })

  it('sets isSuccess and extractionId on successful upload', async () => {
    vi.mocked(apiUpload.uploadFile).mockResolvedValue({
      extraction_id: 'ext-789',
    })

    const { result } = renderHook(() => useUpload())
    const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })

    act(() => {
      result.current.upload(file)
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.extractionId).toBe('ext-789')
    expect(result.current.isPending).toBe(false)
  })

  it('ignores stale completion when a newer upload has already started', async () => {
    let resolveFirstUpload: (value: apiUpload.UploadResponse) => void
    let resolveSecondUpload: (value: apiUpload.UploadResponse) => void
    vi.mocked(apiUpload.uploadFile)
      .mockImplementationOnce(
        () =>
          new Promise<apiUpload.UploadResponse>((resolve) => {
            resolveFirstUpload = resolve
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise<apiUpload.UploadResponse>((resolve) => {
            resolveSecondUpload = resolve
          })
      )

    const { result } = renderHook(() => useUpload())

    act(() => {
      result.current.upload(new File(['first'], 'first.pdf', { type: 'application/pdf' }))
      result.current.upload(new File(['second'], 'second.pdf', { type: 'application/pdf' }))
    })

    await waitFor(() => {
      expect(apiUpload.uploadFile).toHaveBeenCalledTimes(2)
    })

    await act(async () => {
      resolveSecondUpload!({ extraction_id: 'ext-new' })
    })

    await waitFor(() => {
      expect(result.current.extractionId).toBe('ext-new')
      expect(result.current.isSuccess).toBe(true)
    })

    await act(async () => {
      resolveFirstUpload!({ extraction_id: 'ext-stale' })
    })

    expect(result.current.extractionId).toBe('ext-new')
    expect(result.current.fileName).toBe('second.pdf')
    expect(result.current.isPending).toBe(false)
  })

  it('sets isError and error on failed upload', async () => {
    const apiError = new ApiError(500, 'Server error')
    vi.mocked(apiUpload.uploadFile).mockRejectedValue(apiError)

    const { result } = renderHook(() => useUpload())
    const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })

    act(() => {
      result.current.upload(file)
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(ApiError)
    expect(result.current.error?.detail).toBe('Server error')
    expect(result.current.isPending).toBe(false)
  })

  it('handles non-ApiError errors', async () => {
    vi.mocked(apiUpload.uploadFile).mockRejectedValue(new Error('Network failure'))

    const { result } = renderHook(() => useUpload())
    const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })

    act(() => {
      result.current.upload(file)
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error?.detail).toBe('Network failure')
  })

  it('resets all state on reset', async () => {
    vi.mocked(apiUpload.uploadFile).mockResolvedValue({
      extraction_id: 'ext-abc',
    })

    const { result } = renderHook(() => useUpload())
    const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })

    act(() => {
      result.current.upload(file)
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    act(() => {
      result.current.reset()
    })

    expect(result.current.progress).toBe(0)
    expect(result.current.isPending).toBe(false)
    expect(result.current.isSuccess).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.extractionId).toBeNull()
    expect(result.current.fileName).toBeNull()
  })

  it('handles unknown error types', async () => {
    vi.mocked(apiUpload.uploadFile).mockRejectedValue('string-error')

    const { result } = renderHook(() => useUpload())
    const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })

    act(() => {
      result.current.upload(file)
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error?.detail).toBe('An unexpected error occurred')
  })
})
