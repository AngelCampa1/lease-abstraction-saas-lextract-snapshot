import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OAuthButtons } from '@/components/auth/oauth-buttons'
import { AuthContext } from '@/components/auth/auth-provider'
import type { AuthContextValue, AuthError } from '@/lib/neon-auth/types'

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

function renderOAuthButtons(contextOverrides: Partial<AuthContextValue> = {}) {
  const ctx = createMockAuthContext(contextOverrides)
  return {
    ctx,
    ...render(
      <AuthContext.Provider value={ctx}>
        <OAuthButtons />
      </AuthContext.Provider>
    ),
  }
}

describe('OAuthButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the Google OAuth button', () => {
    renderOAuthButtons()
    expect(screen.getByTestId('google-oauth-button')).toBeInTheDocument()
    expect(screen.getByText('Continue with Google')).toBeInTheDocument()
  })

  it('calls signInWithGoogle when clicked', async () => {
    const user = userEvent.setup()
    const { ctx } = renderOAuthButtons()

    await user.click(screen.getByTestId('google-oauth-button'))
    expect(ctx.signInWithGoogle).toHaveBeenCalledOnce()
  })

  it('redirects the browser to the returned Google provider URL', async () => {
    const user = userEvent.setup()
    const assignSpy = vi.fn()
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, assign: assignSpy },
    })

    renderOAuthButtons({
      signInWithGoogle: vi.fn().mockResolvedValue({
        error: null,
        url: 'https://accounts.google.com/oauth/start',
      }),
    })

    await user.click(screen.getByTestId('google-oauth-button'))

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalledWith('https://accounts.google.com/oauth/start')
    })

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
  })

  it('shows loading state while signing in', async () => {
    const user = userEvent.setup()
    // Make signInWithGoogle hang (never resolve)
    const { ctx } = renderOAuthButtons({
      signInWithGoogle: vi.fn().mockReturnValue(new Promise(() => {})),
    })

    await user.click(screen.getByTestId('google-oauth-button'))
    expect(ctx.signInWithGoogle).toHaveBeenCalled()
    // Button should be disabled while loading
    expect(screen.getByTestId('google-oauth-button')).toBeDisabled()
  })

  it('shows error message on OAuth failure', async () => {
    const user = userEvent.setup()
    const authError = { message: 'OAuth provider error' } as AuthError
    renderOAuthButtons({
      signInWithGoogle: vi.fn().mockResolvedValue({ error: authError }),
    })

    await user.click(screen.getByTestId('google-oauth-button'))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('OAuth provider error')
    })
  })

  it('re-enables button after OAuth failure', async () => {
    const user = userEvent.setup()
    const authError = { message: 'OAuth provider error' } as AuthError
    renderOAuthButtons({
      signInWithGoogle: vi.fn().mockResolvedValue({ error: authError }),
    })

    await user.click(screen.getByTestId('google-oauth-button'))

    await waitFor(() => {
      expect(screen.getByTestId('google-oauth-button')).not.toBeDisabled()
    })
  })
})
