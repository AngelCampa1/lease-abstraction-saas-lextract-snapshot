import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as api from '@/lib/api'
import { GuestCheckoutCta } from '@/components/results/guest-checkout-cta'

const mockCaptureEvent = vi.hoisted(() => vi.fn())

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/neon-auth/client', () => ({
  createAuthClient: () => ({
    getSession: vi.fn().mockResolvedValue({ data: null, error: null }),
    onAuthStateChange: () => () => {},
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}))

vi.mock('@/lib/posthog', () => ({
  EVENTS: {
    checkout_started: 'checkout_started',
    inline_signup_viewed: 'inline_signup_viewed',
  },
  captureEvent: mockCaptureEvent,
}))

const DEFAULT_PROPS = {
  extractionId: 'ext-abc-123',
  totalFieldCount: 99,
  redFlagCount: 3,
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GuestCheckoutCta', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders email input and Unlock button', () => {
    render(<GuestCheckoutCta {...DEFAULT_PROPS} />)

    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /unlock for \$15/i }),
    ).toBeInTheDocument()
  })

  it('captures an inline_signup_viewed event once on mount', () => {
    render(<GuestCheckoutCta {...DEFAULT_PROPS} />)

    const viewedCalls = mockCaptureEvent.mock.calls.filter(
      (call) => call[0] === 'inline_signup_viewed',
    )
    expect(viewedCalls).toHaveLength(1)
    expect(viewedCalls[0][1]).toEqual({
      extraction_id: 'ext-abc-123',
      field_count: 99,
      red_flag_count: 3,
    })
  })

  it('renders total field count in the title', () => {
    render(<GuestCheckoutCta {...DEFAULT_PROPS} />)

    expect(screen.getByText(/unlock all 99 fields/i)).toBeInTheDocument()
  })

  it('explains that paid guests complete account access after checkout', () => {
    render(<GuestCheckoutCta {...DEFAULT_PROPS} />)

    expect(
      screen.getByText(/sign in or create an account after checkout to access your results/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/account created automatically/i),
    ).not.toBeInTheDocument()
  })

  it('button is disabled when email is empty', () => {
    render(<GuestCheckoutCta {...DEFAULT_PROPS} />)

    const button = screen.getByRole('button', { name: /unlock for \$15/i })
    expect(button).toBeDisabled()
  })

  it('shows error for invalid email format', async () => {
    const user = userEvent.setup()
    render(<GuestCheckoutCta {...DEFAULT_PROPS} />)

    const input = screen.getByRole('textbox', { name: /email/i })
    await user.type(input, 'notanemail')
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument()
    })
  })

  it('button is enabled when email is valid', async () => {
    const user = userEvent.setup()
    render(<GuestCheckoutCta {...DEFAULT_PROPS} />)

    const input = screen.getByRole('textbox', { name: /email/i })
    await user.type(input, 'user@example.com')

    const button = screen.getByRole('button', { name: /unlock for \$15/i })
    expect(button).not.toBeDisabled()
  })

  it('shows sign-in link pointing to correct URL', () => {
    render(<GuestCheckoutCta {...DEFAULT_PROPS} />)

    const link = screen.getByRole('link', { name: /sign in/i })
    expect(link).toHaveAttribute('href', '/login?return=/results/ext-abc-123')
  })

  it('calls checkout API with correct payload on valid submit', async () => {
    const user = userEvent.setup()
    const checkoutUrl = 'https://checkout.stripe.com/test-session'
    vi.spyOn(api, 'apiPost').mockResolvedValue({ checkout_url: checkoutUrl, session_id: 'cs_test' })

    // Mock window.location
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '', origin: 'https://lextract.io' },
    })

    render(<GuestCheckoutCta {...DEFAULT_PROPS} />)

    const input = screen.getByRole('textbox', { name: /email/i })
    await user.type(input, 'guest@example.com')
    await user.click(screen.getByRole('button', { name: /unlock for \$15/i }))

    await waitFor(() => {
      expect(api.apiPost).toHaveBeenCalledWith(
        '/payments/checkout',
        expect.objectContaining({
          product_type: 'single',
          extraction_id: 'ext-abc-123',
          guest_email: 'guest@example.com',
          success_url: expect.stringContaining('payment=success&access=complete-account'),
          cancel_url: expect.stringContaining('payment=cancelled'),
        }),
      )
    })

    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    })
  })

  it('tracks guest checkout start with product and extraction context', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'apiPost').mockResolvedValue({
      checkout_url: 'https://checkout.stripe.com/test-session',
      session_id: 'cs_test',
    })

    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '', origin: 'https://lextract.io' },
    })

    render(<GuestCheckoutCta {...DEFAULT_PROPS} />)

    await user.type(screen.getByRole('textbox', { name: /email/i }), 'guest@example.com')
    await user.click(screen.getByRole('button', { name: /unlock for \$15/i }))

    await waitFor(() => {
      expect(mockCaptureEvent).toHaveBeenCalledWith('checkout_started', {
        extraction_id: 'ext-abc-123',
        product_type: 'single',
        checkout_mode: 'guest',
        field_count: 99,
        red_flag_count: 3,
      })
    })

    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    })
  })

  it('still creates checkout when analytics capture fails', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'apiPost').mockResolvedValue({
      checkout_url: 'https://checkout.stripe.com/test-session',
      session_id: 'cs_test',
    })
    mockCaptureEvent.mockImplementationOnce(() => {
      throw new Error('PostHog unavailable')
    })

    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '', origin: 'https://lextract.io' },
    })

    render(<GuestCheckoutCta {...DEFAULT_PROPS} />)

    await user.type(screen.getByRole('textbox', { name: /email/i }), 'guest@example.com')
    await user.click(screen.getByRole('button', { name: /unlock for \$15/i }))

    await waitFor(() => {
      expect(api.apiPost).toHaveBeenCalledWith(
        '/payments/checkout',
        expect.objectContaining({
          product_type: 'single',
          extraction_id: 'ext-abc-123',
          guest_email: 'guest@example.com',
        }),
      )
    })

    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    })
  })

  it('redirects to Stripe URL on success', async () => {
    const user = userEvent.setup()
    const checkoutUrl = 'https://checkout.stripe.com/redirect-me'
    vi.spyOn(api, 'apiPost').mockResolvedValue({ checkout_url: checkoutUrl, session_id: 'cs_test' })

    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '', origin: 'https://lextract.io' },
    })

    render(<GuestCheckoutCta {...DEFAULT_PROPS} />)

    await user.type(screen.getByRole('textbox', { name: /email/i }), 'guest@example.com')
    await user.click(screen.getByRole('button', { name: /unlock for \$15/i }))

    await waitFor(() => {
      expect(window.location.href).toBe(checkoutUrl)
    })

    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    })
  })

  it('shows error message when API fails', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'apiPost').mockRejectedValue(
      new api.ApiError(502, 'Payment provider error'),
    )

    render(<GuestCheckoutCta {...DEFAULT_PROPS} />)

    await user.type(screen.getByRole('textbox', { name: /email/i }), 'guest@example.com')
    await user.click(screen.getByRole('button', { name: /unlock for \$15/i }))

    await waitFor(() => {
      expect(screen.getByText(/payment provider error/i)).toBeInTheDocument()
    })
  })

  it('shows secure checkout trust line', () => {
    render(<GuestCheckoutCta {...DEFAULT_PROPS} />)

    expect(screen.getByText(/secure checkout via stripe/i)).toBeInTheDocument()
  })

  it('shows loading state while checkout is pending', async () => {
    const user = userEvent.setup()
    // Make the API call hang
    vi.spyOn(api, 'apiPost').mockReturnValue(new Promise(() => {}))

    render(<GuestCheckoutCta {...DEFAULT_PROPS} />)

    await user.type(screen.getByRole('textbox', { name: /email/i }), 'guest@example.com')
    await user.click(screen.getByRole('button', { name: /unlock for \$15/i }))

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /redirecting|processing/i })
      expect(button).toBeDisabled()
    })
  })

  it('shows generic error message on non-ApiError failure', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'apiPost').mockRejectedValue(new Error('Network error'))

    render(<GuestCheckoutCta {...DEFAULT_PROPS} />)

    await user.type(screen.getByRole('textbox', { name: /email/i }), 'guest@example.com')
    await user.click(screen.getByRole('button', { name: /unlock for \$15/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})
