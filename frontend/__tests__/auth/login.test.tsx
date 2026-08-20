import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '@/components/auth/login-form'
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

function renderLoginForm(contextOverrides: Partial<AuthContextValue> = {}) {
  const ctx = createMockAuthContext(contextOverrides)
  return {
    ctx,
    ...render(
      <AuthContext.Provider value={ctx}>
        <LoginForm />
      </AuthContext.Provider>
    ),
  }
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockReturnValue(null)
  })

  it('renders the login form with all fields', () => {
    renderLoginForm()
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByTestId('google-oauth-button')).toBeInTheDocument()
  })

  it('shows validation errors for empty fields', async () => {
    const user = userEvent.setup()
    renderLoginForm()

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument()
      expect(screen.getByText('Password is required')).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup()
    renderLoginForm()

    await user.type(screen.getByLabelText('Email'), 'notvalid')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email')).toBeInTheDocument()
    })
  })

  it('calls signIn and redirects on success', async () => {
    const user = userEvent.setup()
    const { ctx } = renderLoginForm()

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(ctx.signIn).toHaveBeenCalledWith('test@example.com', 'password123')
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('redirects to return param on success', async () => {
    mockGet.mockReturnValue('/uploads')
    const user = userEvent.setup()
    renderLoginForm()

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/uploads')
    })
  })

  it('Bug #36: blocks open redirect via absolute URL in return param', async () => {
    mockGet.mockReturnValue('https://evil.com')
    const user = userEvent.setup()
    renderLoginForm()

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('Bug #36: blocks open redirect via protocol-relative URL', async () => {
    mockGet.mockReturnValue('//evil.com')
    const user = userEvent.setup()
    renderLoginForm()

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('shows server error on failed sign in', async () => {
    const authError = { message: 'Invalid login credentials' } as AuthError
    const user = userEvent.setup()
    renderLoginForm({
      signIn: vi.fn().mockResolvedValue({ error: authError }),
    })

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByTestId('server-error')).toHaveTextContent(
        'Invalid login credentials'
      )
    })
  })

  it('resets shaking state after timeout on error', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const authError = { message: 'Invalid credentials' } as AuthError
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderLoginForm({
      signIn: vi.fn().mockResolvedValue({ error: authError }),
    })

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrongpass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByTestId('server-error')).toBeInTheDocument()
    })

    // Advance past the 500ms timeout for setShaking(false)
    act(() => {
      vi.advanceTimersByTime(600)
    })

    vi.useRealTimers()
  })

  it('shows a fallback error when signIn rejects', async () => {
    const user = userEvent.setup()
    renderLoginForm({
      signIn: vi.fn().mockRejectedValue(new Error('network down')),
    })

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByTestId('server-error')).toHaveTextContent(
        'Something went wrong. Try again.'
      )
    })
  })

  it('clears the shake timer on unmount without updating state', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const authError = { message: 'Invalid credentials' } as AuthError
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const ctx = createMockAuthContext({
      signIn: vi.fn().mockResolvedValue({ error: authError }),
    })
    const { unmount } = render(
      <AuthContext.Provider value={ctx}>
        <LoginForm />
      </AuthContext.Provider>
    )

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrongpass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByTestId('server-error')).toBeInTheDocument()
    })

    // Unmount before the 500ms shake timer fires
    unmount()
    act(() => {
      vi.advanceTimersByTime(600)
    })

    // No "state update on unmounted component" warning should be logged
    expect(errorSpy).not.toHaveBeenCalled()

    errorSpy.mockRestore()
    vi.useRealTimers()
  })

  it('has a link to signup page', () => {
    renderLoginForm()
    const link = screen.getByRole('link', { name: /create account/i })
    expect(link).toHaveAttribute('href', '/signup')
  })

  it('links password resets to the reset request page', () => {
    renderLoginForm()
    const link = screen.getByRole('link', { name: /forgot password/i })
    expect(link).toHaveAttribute('href', '/forgot-password')
  })

  it('passes return param to signup link', () => {
    mockGet.mockReturnValue('/uploads')
    renderLoginForm()
    const link = screen.getByRole('link', { name: /create account/i })
    expect(link).toHaveAttribute('href', '/signup?return=%2Fuploads')
  })

  it('renders the Google OAuth button', () => {
    renderLoginForm()
    expect(screen.getByTestId('google-oauth-button')).toBeInTheDocument()
    expect(screen.getByText('Continue with Google')).toBeInTheDocument()
  })

  it('shows the terms agreement disclaimer with policy links', () => {
    renderLoginForm()
    const disclaimer = screen.getByTestId('login-terms-disclaimer')
    expect(disclaimer).toHaveTextContent(/by signing in, you agree to our/i)
    const termsLink = within(disclaimer).getByRole('link', { name: /terms of service/i })
    expect(termsLink).toHaveAttribute('href', '/terms')
    const privacyLink = within(disclaimer).getByRole('link', { name: /privacy policy/i })
    expect(privacyLink).toHaveAttribute('href', '/privacy')
  })
})
