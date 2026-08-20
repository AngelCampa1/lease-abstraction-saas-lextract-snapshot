import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCredits, creditsKeys, useInvalidateCredits } from '@/hooks/use-credits'
import { AuthContext } from '@/components/auth/auth-provider'
import type { AuthContextValue } from '@/lib/neon-auth/types'
import * as api from '@/lib/api'

vi.mock('@/lib/neon-auth/client', () => ({
  createAuthClient: () => ({
    getSession: vi.fn().mockResolvedValue({ data: null, error: null }),
    onAuthStateChange: () => () => {},
  }),
}))

const MOCK_SESSION = {
  id: 's1',
  token: 'test-token',
  expiresAt: new Date(),
  userId: 'user-1',
}

const mockAuthContext: AuthContextValue = {
  user: { id: 'user-1', email: 'test@example.com' },
  session: MOCK_SESSION,
  loading: false,
  signIn: vi.fn().mockResolvedValue({ error: null }),
  signUp: vi.fn().mockResolvedValue({ error: null }),
  signOut: vi.fn().mockResolvedValue({ error: null }),
  signInWithGoogle: vi.fn().mockResolvedValue({ error: null }),
  requestPasswordReset: vi.fn().mockResolvedValue({ error: null }),
  resetPassword: vi.fn().mockResolvedValue({ error: null }),
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AuthContext.Provider value={mockAuthContext}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </AuthContext.Provider>
    )
  }
}

describe('useCredits', () => {
  it('fetches credit balance', async () => {
    vi.spyOn(api, 'apiGet').mockResolvedValue({ balance: 5 })

    const { result } = renderHook(() => useCredits(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual({ balance: 5 })
    expect(api.apiGet).toHaveBeenCalledWith('/payments/credits')
  })

  it('has correct query keys', () => {
    expect(creditsKeys.all).toEqual(['credits'])
  })
})

describe('useInvalidateCredits', () => {
  it('invalidates the credits query when called', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    function Wrapper({ children }: { children: React.ReactNode }) {
      return (
        <AuthContext.Provider value={mockAuthContext}>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </AuthContext.Provider>
      )
    }

    const { result } = renderHook(() => useInvalidateCredits(), {
      wrapper: Wrapper,
    })

    result.current()

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: creditsKeys.all })
  })

  it('returns a stable callback across re-renders', () => {
    const wrapper = createWrapper()
    const { result, rerender } = renderHook(() => useInvalidateCredits(), {
      wrapper,
    })

    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })
})
