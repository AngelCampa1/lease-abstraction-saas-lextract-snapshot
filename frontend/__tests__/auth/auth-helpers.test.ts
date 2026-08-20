import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api'
import { ANONYMOUS_SESSION_KEY } from '@/lib/neon-auth/types'
import { linkAnonymousSessionIfExists } from '@/lib/auth-helpers'

const mockApiPost = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return {
    ...actual,
    apiPost: mockApiPost,
  }
})

describe('auth helpers', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    localStorage.clear()
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('retries a 401 anonymous link once and removes the token only after success', async () => {
    localStorage.setItem(ANONYMOUS_SESSION_KEY, 'anon-token')
    mockApiPost
      .mockRejectedValueOnce(new ApiError(401, 'Token not ready'))
      .mockResolvedValueOnce({})

    const linked = await linkAnonymousSessionIfExists()

    expect(linked).toBe(true)
    expect(mockApiPost).toHaveBeenCalledTimes(2)
    expect(mockApiPost).toHaveBeenNthCalledWith(
      1,
      '/auth/link',
      { session_token: 'anon-token' },
      { forceTokenProbe: true },
    )
    expect(localStorage.getItem(ANONYMOUS_SESSION_KEY)).toBeNull()
  })

  it('keeps the anonymous token when all link attempts fail', async () => {
    localStorage.setItem(ANONYMOUS_SESSION_KEY, 'anon-token')
    mockApiPost.mockRejectedValue(new ApiError(401, 'Still unauthenticated'))

    const linked = await linkAnonymousSessionIfExists()

    expect(linked).toBe(false)
    expect(mockApiPost).toHaveBeenCalledTimes(2)
    expect(localStorage.getItem(ANONYMOUS_SESSION_KEY)).toBe('anon-token')
  })
})
