import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAuth } from '@/hooks/use-auth'
import { AuthContext } from '@/components/auth/auth-provider'
import type { AuthContextValue } from '@/lib/neon-auth/types'

function createWrapper(value: AuthContextValue) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  }
}

const mockContextValue: AuthContextValue = {
  user: null,
  session: null,
  loading: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  requestPasswordReset: async () => ({ error: null }),
  resetPassword: async () => ({ error: null }),
}

describe('useAuth', () => {
  it('returns context value when inside AuthProvider', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(mockContextValue),
    })

    expect(result.current.user).toBeNull()
    expect(result.current.session).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(typeof result.current.signIn).toBe('function')
    expect(typeof result.current.signUp).toBe('function')
    expect(typeof result.current.signOut).toBe('function')
    expect(typeof result.current.signInWithGoogle).toBe('function')
    expect(typeof result.current.requestPasswordReset).toBe('function')
    expect(typeof result.current.resetPassword).toBe('function')
  })

  it('throws when used outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within an AuthProvider')
  })
})
