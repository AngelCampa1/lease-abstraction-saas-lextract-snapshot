import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmailGateDialog } from '@/components/results/email-gate-dialog'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCaptureEvent = vi.fn()
vi.mock('@/lib/posthog', () => ({
  captureEvent: (...args: unknown[]) => mockCaptureEvent(...args),
  EVENTS: {
    email_gate_shown: 'email_gate_shown',
    email_gate_submitted: 'email_gate_submitted',
  },
}))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EmailGateDialog', () => {
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dialog content when open', () => {
    render(
      <EmailGateDialog open={true} onSubmit={mockOnSubmit} isSubmitting={false} />,
    )

    expect(screen.getByText('Your extraction is ready!')).toBeInTheDocument()
    expect(screen.getByText('Enter your email to view your results.')).toBeInTheDocument()
    expect(screen.getByLabelText('Work email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View My Results' })).toBeInTheDocument()
  })

  it('fires email_gate_shown PostHog event on open', () => {
    render(
      <EmailGateDialog open={true} onSubmit={mockOnSubmit} isSubmitting={false} />,
    )

    expect(mockCaptureEvent).toHaveBeenCalledWith('email_gate_shown')
  })

  it('does not fire event when not open', () => {
    render(
      <EmailGateDialog open={false} onSubmit={mockOnSubmit} isSubmitting={false} />,
    )

    expect(mockCaptureEvent).not.toHaveBeenCalled()
  })

  it('validates email and shows error for invalid input', async () => {
    const user = userEvent.setup()
    render(
      <EmailGateDialog open={true} onSubmit={mockOnSubmit} isSubmitting={false} />,
    )

    const input = screen.getByLabelText('Work email')
    await user.type(input, 'notanemail')
    // Trigger blur to validate
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument()
    })
  })

  it('calls onSubmit with email and Turnstile token on valid form submission', async () => {
    const user = userEvent.setup()
    render(
      <EmailGateDialog open={true} onSubmit={mockOnSubmit} isSubmitting={false} />,
    )

    const input = screen.getByLabelText('Work email')
    await user.type(input, 'test@example.com')
    await user.click(screen.getByRole('button', { name: 'View My Results' }))

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('test@example.com', '')
    })
  })

  it('disables submit button when isSubmitting is true', () => {
    render(
      <EmailGateDialog open={true} onSubmit={mockOnSubmit} isSubmitting={true} />,
    )

    expect(screen.getByText('Loading…')).toBeInTheDocument()
    const buttons = screen.getAllByRole('button')
    const submitButton = buttons.find((b) => b.textContent?.includes('Loading'))
    expect(submitButton).toBeDisabled()
  })

  it('disables input when isSubmitting is true', () => {
    render(
      <EmailGateDialog open={true} onSubmit={mockOnSubmit} isSubmitting={true} />,
    )

    expect(screen.getByLabelText('Work email')).toBeDisabled()
  })

  it('shows extraction-only email context', () => {
    render(
      <EmailGateDialog open={true} onSubmit={mockOnSubmit} isSubmitting={false} />,
    )

    expect(
      screen.getByText("We'll only email you about this extraction."),
    ).toBeInTheDocument()
    expect(screen.queryByText(/no spam/i)).not.toBeInTheDocument()
  })
})
