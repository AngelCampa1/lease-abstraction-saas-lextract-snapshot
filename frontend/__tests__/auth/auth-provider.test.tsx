import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { AuthProvider } from '@/components/auth/auth-provider'
import { useAuth } from '@/hooks/use-auth'

const {
  mockUseSession,
  mockSignInEmail,
  mockSignUpEmail,
  mockSignOut,
  mockSignInSocial,
  mockRequestPasswordReset,
  mockResetPassword,
} = vi.hoisted(() => ({
  mockUseSession: vi.fn().mockReturnValue({ data: null, isPending: true }),
  mockSignInEmail: vi.fn().mockResolvedValue({ error: null }),
  mockSignUpEmail: vi.fn().mockResolvedValue({ error: null }),
  mockSignOut: vi.fn().mockResolvedValue({ error: null }),
  mockSignInSocial: vi.fn().mockResolvedValue({ error: null }),
  mockRequestPasswordReset: vi.fn().mockResolvedValue({ error: null }),
  mockResetPassword: vi.fn().mockResolvedValue({ error: null }),
}))

vi.mock('@/lib/neon-auth/client', () => ({
  authClient: {
    useSession: mockUseSession,
    signIn: {
      email: mockSignInEmail,
      social: mockSignInSocial,
    },
    signUp: {
      email: mockSignUpEmail,
    },
    signOut: mockSignOut,
    requestPasswordReset: mockRequestPasswordReset,
    resetPassword: mockResetPassword,
  },
}))

function TestConsumer() {
  const auth = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(auth.loading)}</span>
      <span data-testid="user">{auth.user?.email ?? 'none'}</span>
      <button onClick={() => auth.signIn('test@email.com', 'pass')}>sign in</button>
      <button onClick={() => auth.signUp('test@email.com', 'pass', 'Test')}>sign up</button>
      <button onClick={() => auth.signOut()}>sign out</button>
      <button onClick={() => auth.signInWithGoogle()}>google</button>
      <button onClick={() => auth.requestPasswordReset('test@email.com', '/reset-password')}>
        request reset
      </button>
      <button onClick={() => auth.resetPassword('token-1', 'newpass123')}>reset</button>
    </div>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSession.mockReturnValue({ data: null, isPending: true })
  })

  it('provides initial loading state', async () => {
    mockUseSession.mockReturnValue({ data: null, isPending: true })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('loading')).toHaveTextContent('true')
    expect(screen.getByTestId('user')).toHaveTextContent('none')
  })

  it('updates user when session is available', async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: '1', email: 'user@test.com' },
        session: { id: 's1', token: 'tok', expiresAt: new Date() },
      },
      isPending: false,
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('user')).toHaveTextContent('user@test.com')
    expect(screen.getByTestId('loading')).toHaveTextContent('false')
  })

  it('reacts to auth state changes', async () => {
    // Start with no session
    mockUseSession.mockReturnValue({ data: null, isPending: false })

    const { rerender } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('user')).toHaveTextContent('none')

    // Simulate session becoming available
    mockUseSession.mockReturnValue({
      data: {
        user: { id: '2', email: 'new@test.com' },
        session: { id: 's2', token: 'new-token', expiresAt: new Date() },
      },
      isPending: false,
    })

    rerender(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('user')).toHaveTextContent('new@test.com')
  })

  it('calls signIn.email on signIn', async () => {
    mockUseSession.mockReturnValue({ data: null, isPending: false })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await act(async () => {
      screen.getByText('sign in').click()
    })

    expect(mockSignInEmail).toHaveBeenCalledWith({
      email: 'test@email.com',
      password: 'pass',
    })
  })

  it('calls signUp.email on signUp', async () => {
    mockUseSession.mockReturnValue({ data: null, isPending: false })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await act(async () => {
      screen.getByText('sign up').click()
    })

    expect(mockSignUpEmail).toHaveBeenCalledWith({
      email: 'test@email.com',
      password: 'pass',
      name: 'Test',
    })
  })

  it('calls signOut on the auth client', async () => {
    mockUseSession.mockReturnValue({ data: null, isPending: false })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await act(async () => {
      screen.getByText('sign out').click()
    })

    expect(mockSignOut).toHaveBeenCalled()
  })

  it('calls signIn.social for Google sign-in', async () => {
    mockUseSession.mockReturnValue({ data: null, isPending: false })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await act(async () => {
      screen.getByText('google').click()
    })

    expect(mockSignInSocial).toHaveBeenCalledWith({
      provider: 'google',
      callbackURL: expect.stringContaining('/api/auth/callback/google'),
    })
  })

  it('calls requestPasswordReset on the auth client', async () => {
    mockUseSession.mockReturnValue({ data: null, isPending: false })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await act(async () => {
      screen.getByText('request reset').click()
    })

    expect(mockRequestPasswordReset).toHaveBeenCalledWith({
      email: 'test@email.com',
      redirectTo: '/reset-password',
    })
  })

  it('calls resetPassword on the auth client', async () => {
    mockUseSession.mockReturnValue({ data: null, isPending: false })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await act(async () => {
      screen.getByText('reset').click()
    })

    expect(mockResetPassword).toHaveBeenCalledWith({
      token: 'token-1',
      newPassword: 'newpass123',
    })
  })

  it('clears user when auth state change has null session', async () => {
    // Start with a user
    mockUseSession.mockReturnValue({
      data: {
        user: { id: '1', email: 'user@test.com' },
        session: { id: 's1', token: 'tok', expiresAt: new Date() },
      },
      isPending: false,
    })

    const { rerender } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('user')).toHaveTextContent('user@test.com')

    // Session becomes null
    mockUseSession.mockReturnValue({ data: null, isPending: false })

    rerender(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('none')
    })
  })

  it('unsubscribes from auth changes on unmount', async () => {
    // This test verifies the component unmounts cleanly without errors
    mockUseSession.mockReturnValue({ data: null, isPending: false })

    const { unmount } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(() => unmount()).not.toThrow()
  })
})
