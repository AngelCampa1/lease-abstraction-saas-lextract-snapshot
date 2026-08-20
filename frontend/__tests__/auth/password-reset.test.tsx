import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

const {
  mockRequestPasswordReset,
  mockResetPassword,
  mockPush,
  mockGet,
} = vi.hoisted(() => ({
  mockRequestPasswordReset: vi.fn(),
  mockResetPassword: vi.fn(),
  mockPush: vi.fn(),
  mockGet: vi.fn(),
}))

vi.mock('@/lib/neon-auth/client', () => ({
  authClient: {
    requestPasswordReset: mockRequestPasswordReset,
    resetPassword: mockResetPassword,
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: mockGet }),
}))

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequestPasswordReset.mockResolvedValue({ error: null })
    Object.defineProperty(window, 'location', {
      value: { ...window.location, origin: 'https://lextract.io' },
      writable: true,
    })
  })

  it('requests a reset email through Better Auth', async () => {
    const user = userEvent.setup()
    render(<ForgotPasswordForm />)

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    await waitFor(() => {
      expect(mockRequestPasswordReset).toHaveBeenCalledWith({
        email: 'user@example.com',
        redirectTo: 'https://lextract.io/reset-password',
      })
    })
    expect(screen.getByRole('status')).toHaveTextContent(
      'If an account exists, a reset link has been sent.'
    )
  })

  it('shows validation errors before contacting auth', async () => {
    const user = userEvent.setup()
    render(<ForgotPasswordForm />)

    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Email is required')
    })
    expect(mockRequestPasswordReset).not.toHaveBeenCalled()
  })

  it('shows auth provider errors', async () => {
    mockRequestPasswordReset.mockResolvedValue({
      error: { message: 'Email provider unavailable', status: 503, statusText: 'Service Unavailable' },
    })
    const user = userEvent.setup()
    render(<ForgotPasswordForm />)

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Email provider unavailable')
    })
  })
})

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockImplementation((key: string) => (key === 'token' ? 'valid-token' : null))
    mockResetPassword.mockResolvedValue({ error: null })
  })

  it('sets a new password with the token from the URL', async () => {
    const user = userEvent.setup()
    render(<ResetPasswordForm />)

    await user.type(screen.getByLabelText('New password'), 'new-password-123')
    await user.type(screen.getByLabelText('Confirm password'), 'new-password-123')
    await user.click(screen.getByRole('button', { name: /reset password/i }))

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith({
        token: 'valid-token',
        newPassword: 'new-password-123',
      })
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  it('blocks submission when the reset token is missing', async () => {
    mockGet.mockImplementation(() => null)
    const user = userEvent.setup()
    render(<ResetPasswordForm />)

    await user.type(screen.getByLabelText('New password'), 'new-password-123')
    await user.type(screen.getByLabelText('Confirm password'), 'new-password-123')
    await user.click(screen.getByRole('button', { name: /reset password/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Reset link is invalid or expired.'
      )
    })
    expect(mockResetPassword).not.toHaveBeenCalled()
  })

  it('requires matching passwords', async () => {
    const user = userEvent.setup()
    render(<ResetPasswordForm />)

    await user.type(screen.getByLabelText('New password'), 'new-password-123')
    await user.type(screen.getByLabelText('Confirm password'), 'different-password')
    await user.click(screen.getByRole('button', { name: /reset password/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match')
    })
    expect(mockResetPassword).not.toHaveBeenCalled()
  })

  it('shows auth provider errors while setting a new password', async () => {
    mockResetPassword.mockResolvedValue({
      error: { message: 'Invalid or expired token', status: 400, statusText: 'Bad Request' },
    })
    const user = userEvent.setup()
    render(<ResetPasswordForm />)

    await user.type(screen.getByLabelText('New password'), 'new-password-123')
    await user.type(screen.getByLabelText('Confirm password'), 'new-password-123')
    await user.click(screen.getByRole('button', { name: /reset password/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid or expired token')
    })
    expect(mockPush).not.toHaveBeenCalled()
  })
})
