import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { AuthContext } from '@/components/auth/auth-provider'
import type { AuthContextValue, AuthUser } from '@/lib/neon-auth/types'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/dashboard',
}))

function createMockAuthContext(
  overrides: Partial<AuthContextValue> = {}
): AuthContextValue {
  return {
    user: null,
    session: null,
    loading: false,
    signIn: vi.fn().mockResolvedValue({ error: null }),
    signUp: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    signInWithGoogle: vi.fn().mockResolvedValue({ error: null }),
    requestPasswordReset: vi.fn().mockResolvedValue({ error: null }),
    resetPassword: vi.fn().mockResolvedValue({ error: null }),
    ...overrides,
  }
}

const mockUser: AuthUser = { id: 'user-1', email: 'test@example.com' }

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state while auth is initializing', () => {
    render(
      <AuthContext.Provider value={createMockAuthContext({ loading: true })}>
        <ProtectedRoute>
          <div>Protected content</div>
        </ProtectedRoute>
      </AuthContext.Provider>
    )

    expect(screen.getByTestId('auth-loading')).toBeInTheDocument()
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
  })

  it('renders children when user is authenticated', () => {
    render(
      <AuthContext.Provider value={createMockAuthContext({ user: mockUser })}>
        <ProtectedRoute>
          <div>Protected content</div>
        </ProtectedRoute>
      </AuthContext.Provider>
    )

    expect(screen.getByText('Protected content')).toBeInTheDocument()
  })

  it('redirects to login with return path when not authenticated', async () => {
    render(
      <AuthContext.Provider value={createMockAuthContext({ user: null, loading: false })}>
        <ProtectedRoute>
          <div>Protected content</div>
        </ProtectedRoute>
      </AuthContext.Provider>
    )

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login?return=%2Fdashboard')
    })
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
  })

  it('does not redirect while loading', () => {
    render(
      <AuthContext.Provider value={createMockAuthContext({ user: null, loading: true })}>
        <ProtectedRoute>
          <div>Protected content</div>
        </ProtectedRoute>
      </AuthContext.Provider>
    )

    expect(mockPush).not.toHaveBeenCalled()
  })
})
