import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SignupForm } from '@/components/auth/signup-form'
import { AuthContext } from '@/components/auth/auth-provider'
import type { AuthContextValue, AuthError } from '@/lib/neon-auth/types'

const mockPush = vi.fn()
const mockGet = vi.fn().mockReturnValue(null)

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: mockGet }),
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

function renderSignupForm(contextOverrides: Partial<AuthContextValue> = {}) {
  const ctx = createMockAuthContext(contextOverrides)
  return {
    ctx,
    ...render(
      <AuthContext.Provider value={ctx}>
        <SignupForm />
      </AuthContext.Provider>
    ),
  }
}

describe('SignupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockReturnValue(null)
    localStorage.clear()
  })

  it('renders the signup form with all fields', () => {
    renderSignupForm()
    expect(screen.getByRole('heading', { level: 1, name: /create account/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Full name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('shows the terms agreement and AI accuracy disclaimer', () => {
    renderSignupForm()
    const disclaimer = screen.getByTestId('signup-terms-disclaimer')
    expect(disclaimer).toHaveTextContent(/by signing up, you agree to our/i)
    expect(disclaimer).toHaveTextContent(/AI can make mistakes/i)
    expect(disclaimer).toHaveTextContent(/check the results against your lease first/i)
    const termsLink = within(disclaimer).getByRole('link', { name: /terms of service/i })
    expect(termsLink).toHaveAttribute('href', '/terms')
    const privacyLink = within(disclaimer).getByRole('link', { name: /privacy policy/i })
    expect(privacyLink).toHaveAttribute('href', '/privacy')
  })

  it('shows validation errors for empty fields', async () => {
    const user = userEvent.setup()
    renderSignupForm()

    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText('Full name is required')).toBeInTheDocument()
      expect(screen.getByText('Email is required')).toBeInTheDocument()
      expect(screen.getByText('Password is required')).toBeInTheDocument()
    })
  })

  it('shows error for short password', async () => {
    const user = userEvent.setup()
    renderSignupForm()

    await user.type(screen.getByLabelText('Full name'), 'Jane Smith')
    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'short')
    await user.type(screen.getByLabelText('Confirm password'), 'short')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(
        screen.getByText('Password must be at least 8 characters')
      ).toBeInTheDocument()
    })
  })

  it('shows error for mismatched passwords', async () => {
    const user = userEvent.setup()
    renderSignupForm()

    await user.type(screen.getByLabelText('Full name'), 'Jane Smith')
    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.type(screen.getByLabelText('Confirm password'), 'different123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })
  })

  it('calls signUp and redirects on success', async () => {
    const user = userEvent.setup()
    const { ctx } = renderSignupForm()

    await user.type(screen.getByLabelText('Full name'), 'Jane Smith')
    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.type(screen.getByLabelText('Confirm password'), 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(ctx.signUp).toHaveBeenCalledWith('jane@example.com', 'password123', 'Jane Smith')
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('redirects to return param on success', async () => {
    mockGet.mockReturnValue('/uploads')
    const user = userEvent.setup()
    renderSignupForm()

    await user.type(screen.getByLabelText('Full name'), 'Jane Smith')
    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.type(screen.getByLabelText('Confirm password'), 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/uploads')
    })
  })

  it('shows server error on failed sign up', async () => {
    const authError = { message: 'User already registered' } as AuthError
    const user = userEvent.setup()
    renderSignupForm({
      signUp: vi.fn().mockResolvedValue({ error: authError }),
    })

    await user.type(screen.getByLabelText('Full name'), 'Jane Smith')
    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.type(screen.getByLabelText('Confirm password'), 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByTestId('server-error')).toHaveTextContent('User already registered')
    })
  })

  it('attempts to link anonymous session after successful signup', async () => {
    localStorage.setItem('lextract_session_token', 'anon-token-123')

    // Mock apiPost which is now used by linkAnonymousSession (Bug #34 fix)
    const apiPostSpy = vi.spyOn(
      await import('@/lib/api'),
      'apiPost',
    ).mockResolvedValue({ linked: true, extractions_transferred: 0 })

    const user = userEvent.setup()
    renderSignupForm()

    await user.type(screen.getByLabelText('Full name'), 'Jane Smith')
    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.type(screen.getByLabelText('Confirm password'), 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(apiPostSpy).toHaveBeenCalledWith(
        '/auth/link',
        { session_token: 'anon-token-123' },
        { forceTokenProbe: true },
      )
    })

    // Token should be removed from localStorage after successful linking
    await waitFor(() => {
      expect(localStorage.getItem('lextract_session_token')).toBeNull()
    })

    apiPostSpy.mockRestore()
  })

  it('resets shaking state after timeout on error', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const authError = { message: 'Error' } as AuthError
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderSignupForm({
      signUp: vi.fn().mockResolvedValue({ error: authError }),
    })

    await user.type(screen.getByLabelText('Full name'), 'Jane Smith')
    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.type(screen.getByLabelText('Confirm password'), 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByTestId('server-error')).toBeInTheDocument()
    })

    act(() => {
      vi.advanceTimersByTime(600)
    })

    vi.useRealTimers()
  })

  it('shows a fallback error when signUp rejects', async () => {
    const user = userEvent.setup()
    renderSignupForm({
      signUp: vi.fn().mockRejectedValue(new Error('network down')),
    })

    await user.type(screen.getByLabelText('Full name'), 'Jane Smith')
    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.type(screen.getByLabelText('Confirm password'), 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByTestId('server-error')).toHaveTextContent(
        'Something went wrong. Try again.'
      )
    })
  })

  it('clears the shake timer on unmount without updating state', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const authError = { message: 'Error' } as AuthError
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const ctx = createMockAuthContext({
      signUp: vi.fn().mockResolvedValue({ error: authError }),
    })
    const { unmount } = render(
      <AuthContext.Provider value={ctx}>
        <SignupForm />
      </AuthContext.Provider>
    )

    await user.type(screen.getByLabelText('Full name'), 'Jane Smith')
    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.type(screen.getByLabelText('Confirm password'), 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByTestId('server-error')).toBeInTheDocument()
    })

    // Unmount before the 500ms shake timer fires
    unmount()
    act(() => {
      vi.advanceTimersByTime(600)
    })

    expect(errorSpy).not.toHaveBeenCalled()

    errorSpy.mockRestore()
    vi.useRealTimers()
  })

  it('handles non-ok response from session linking', async () => {
    localStorage.setItem('lextract_session_token', 'anon-token-456')
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
    )

    const user = userEvent.setup()
    renderSignupForm()

    await user.type(screen.getByLabelText('Full name'), 'Jane Smith')
    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.type(screen.getByLabelText('Confirm password'), 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    // Should still redirect even if linking returns non-ok
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })

    // Token should NOT be removed from localStorage on failure
    expect(localStorage.getItem('lextract_session_token')).toBe('anon-token-456')

    fetchSpy.mockRestore()
  })

  it('skips session linking when no session token in localStorage', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const user = userEvent.setup()
    renderSignupForm()

    await user.type(screen.getByLabelText('Full name'), 'Jane Smith')
    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.type(screen.getByLabelText('Confirm password'), 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })

    // fetch should not have been called for linking
    expect(fetchSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/auth/link'),
      expect.anything()
    )

    fetchSpy.mockRestore()
  })

  it('handles failed anonymous session linking gracefully', async () => {
    localStorage.setItem('lextract_session_token', 'anon-token-123')
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))

    const user = userEvent.setup()
    renderSignupForm()

    await user.type(screen.getByLabelText('Full name'), 'Jane Smith')
    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.type(screen.getByLabelText('Confirm password'), 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    // Should still redirect even if linking fails
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })

    fetchSpy.mockRestore()
  })

  it('has a link to login page', () => {
    renderSignupForm()
    const link = screen.getByRole('link', { name: /sign in/i })
    expect(link).toHaveAttribute('href', '/login')
  })

  it('passes return param to login link', () => {
    mockGet.mockReturnValue('/uploads')
    renderSignupForm()
    const link = screen.getByRole('link', { name: /sign in/i })
    expect(link).toHaveAttribute('href', '/login?return=%2Fuploads')
  })
})
