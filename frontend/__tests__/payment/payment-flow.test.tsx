import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as api from '@/lib/api'
import {
  useCreateCheckout,
  useUseCredit,
  type CheckoutRequest,
} from '@/hooks/use-payment'
import { PaymentButtons } from '@/components/payment/payment-buttons'
import { usePaymentReturn } from '@/hooks/use-payment-return'

const mockCaptureEvent = vi.hoisted(() => vi.fn())

// ---- Mocks ----

vi.mock('@/lib/neon-auth/client', () => ({
  createAuthClient: () => ({
    getSession: vi.fn().mockResolvedValue({ data: null, error: null }),
    onAuthStateChange: () => () => {},
  }),
}))

const mockPush = vi.fn()
const mockReplace = vi.fn()
let mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}))

// Import toast after mock setup
import { toast } from 'sonner'

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    session: { access_token: 'token' },
    loading: false,
  }),
}))

vi.mock('@/lib/posthog', () => ({
  EVENTS: {
    credit_used: 'credit_used',
  },
  captureEvent: mockCaptureEvent,
  identifyUser: vi.fn(),
  resetPostHog: vi.fn(),
}))

// ---- Helpers ----

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

function createWrapperWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const wrapper = function Wrapper({
    children,
  }: {
    children: React.ReactNode
  }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
  return { wrapper, queryClient }
}

// ---- Hook Tests ----

describe('useCreateCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls apiPost with correct path and data', async () => {
    const checkoutUrl = 'https://checkout.stripe.com/session123'
    vi.spyOn(api, 'apiPost').mockResolvedValue({
      checkout_url: checkoutUrl,
    })

    // Mock window.location
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '' },
    })

    const { result } = renderHook(() => useCreateCheckout(), {
      wrapper: createWrapper(),
    })

    const request: CheckoutRequest = {
      product_type: 'single',
      extraction_id: 'ext-1',
      success_url: 'http://localhost/results/ext-1?payment=success',
      cancel_url: 'http://localhost/results/ext-1?payment=cancelled',
    }

    act(() => {
      result.current.mutate(request)
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(api.apiPost).toHaveBeenCalledWith('/payments/checkout', request)
    expect(window.location.href).toBe(checkoutUrl)

    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    })
  })

  it('sets error state on API failure', async () => {
    vi.spyOn(api, 'apiPost').mockRejectedValue(
      new api.ApiError(500, 'Internal error')
    )

    const { result } = renderHook(() => useCreateCheckout(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.mutate({
        product_type: 'single',
        success_url: 'http://localhost/results/ext-1?payment=success',
        cancel_url: 'http://localhost/results/ext-1?payment=cancelled',
      })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})

describe('useUseCredit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls apiPost with extraction_id', async () => {
    vi.spyOn(api, 'apiPost').mockResolvedValue({
      success: true,
      new_balance: 4,
    })

    const { wrapper } = createWrapperWithClient()

    const { result } = renderHook(() => useUseCredit(), { wrapper })

    act(() => {
      result.current.mutate({ extraction_id: 'ext-1' })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(api.apiPost).toHaveBeenCalledWith('/payments/use-credit', {
      extraction_id: 'ext-1',
    })
  })

  it('invalidates queries on success', async () => {
    vi.spyOn(api, 'apiPost').mockResolvedValue({
      success: true,
      new_balance: 4,
    })

    const { wrapper, queryClient } = createWrapperWithClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUseCredit(), { wrapper })

    act(() => {
      result.current.mutate({ extraction_id: 'ext-1' })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['extractions', 'ext-1'],
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['credits'],
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['teaser', 'ext-1'],
    })
    // Using a credit changes the server-side balance, so the dashboard
    // summary must be refetched to avoid showing a stale credit balance.
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['dashboard'],
    })
  })

  it('tracks confirmed credit usage only after successful API response', async () => {
    vi.spyOn(api, 'apiPost').mockResolvedValue({
      success: true,
      new_balance: 4,
    })

    const { result } = renderHook(() => useUseCredit(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.mutate({ extraction_id: 'ext-1' })
    })

    expect(mockCaptureEvent).not.toHaveBeenCalled()

    await waitFor(() => {
      expect(mockCaptureEvent).toHaveBeenCalledWith('credit_used', {
        extraction_id: 'ext-1',
        new_balance: 4,
      })
    })
  })

  it('does not track credit usage when API fails', async () => {
    vi.spyOn(api, 'apiPost').mockRejectedValue(
      new api.ApiError(402, 'Insufficient credits')
    )

    const { result } = renderHook(() => useUseCredit(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.mutate({ extraction_id: 'ext-1' })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(mockCaptureEvent).not.toHaveBeenCalled()
  })

  it('invalidates payment state even when analytics capture fails', async () => {
    vi.spyOn(api, 'apiPost').mockResolvedValue({
      success: true,
      new_balance: 4,
    })
    mockCaptureEvent.mockImplementationOnce(() => {
      throw new Error('PostHog unavailable')
    })

    const invalidateQueries = vi.fn()
    const wrapper = ({ children }: { children: React.ReactNode }) => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      })
      vi.spyOn(queryClient, 'invalidateQueries').mockImplementation(invalidateQueries)
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }

    const { result } = renderHook(() => useUseCredit(), { wrapper })

    act(() => {
      result.current.mutate({ extraction_id: 'ext-1' })
    })

    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalled()
    })
  })

  it('returns error on 402 insufficient credits', async () => {
    vi.spyOn(api, 'apiPost').mockRejectedValue(
      new api.ApiError(402, 'Insufficient credits')
    )

    const { result } = renderHook(() => useUseCredit(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.mutate({ extraction_id: 'ext-1' })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(api.ApiError)
  })
})

// ---- Component Tests ----

describe('PaymentButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(api, 'apiPost').mockResolvedValue({
      checkout_url: 'https://checkout.stripe.com/test',
    })
  })

  it('renders unlock and credit pack buttons', () => {
    render(<PaymentButtons extractionId="ext-1" />, {
      wrapper: createWrapper(),
    })

    expect(
      screen.getByRole('button', { name: /unlock for \$15/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /buy 5 credits for \$65/i })
    ).toBeInTheDocument()
  })

  it('calls checkout API with single product on unlock click', async () => {
    const user = userEvent.setup()

    // Mock window.location
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '', origin: 'http://localhost:3000' },
    })

    render(<PaymentButtons extractionId="ext-1" />, {
      wrapper: createWrapper(),
    })

    await user.click(screen.getByRole('button', { name: /unlock for \$15/i }))

    await waitFor(() => {
      expect(api.apiPost).toHaveBeenCalledWith('/payments/checkout', {
        product_type: 'single',
        extraction_id: 'ext-1',
        success_url: 'http://localhost:3000/results/ext-1?payment=success',
        cancel_url: 'http://localhost:3000/results/ext-1?payment=cancelled',
      })
    })

    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    })
  })

  it('calls checkout API with credit_pack_5 on credits click', async () => {
    const user = userEvent.setup()

    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '', origin: 'http://localhost:3000' },
    })

    render(<PaymentButtons extractionId="ext-1" />, {
      wrapper: createWrapper(),
    })

    await user.click(screen.getByRole('button', { name: /buy 5 credits for \$65/i }))

    await waitFor(() => {
      expect(api.apiPost).toHaveBeenCalledWith('/payments/checkout', {
        product_type: 'credit_pack_5',
        success_url: 'http://localhost:3000/results/ext-1?payment=success',
        cancel_url: 'http://localhost:3000/results/ext-1?payment=cancelled',
      })
    })

    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    })
  })

  it('redirects to checkout URL on success', async () => {
    const user = userEvent.setup()
    const checkoutUrl = 'https://checkout.stripe.com/redirect-test'
    vi.spyOn(api, 'apiPost').mockResolvedValue({
      checkout_url: checkoutUrl,
    })

    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '', origin: 'http://localhost:3000' },
    })

    render(<PaymentButtons extractionId="ext-1" />, {
      wrapper: createWrapper(),
    })

    await user.click(screen.getByRole('button', { name: /unlock for \$15/i }))

    await waitFor(() => {
      expect(window.location.href).toBe(checkoutUrl)
    })

    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    })
  })

  it('shows loading state during checkout', async () => {
    // Make apiPost hang
    vi.spyOn(api, 'apiPost').mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()

    render(<PaymentButtons extractionId="ext-1" />, {
      wrapper: createWrapper(),
    })

    await user.click(screen.getByRole('button', { name: /unlock for \$15/i }))

    await waitFor(() => {
      expect(screen.getByText(/redirecting/i)).toBeInTheDocument()
    })

    // Buttons should be disabled
    const buttons = screen.getAllByRole('button')
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled()
    })
  })

  it('shows busy label only on the clicked credit-pack button', async () => {
    vi.spyOn(api, 'apiPost').mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()

    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '', origin: 'http://localhost:3000' },
    })

    render(<PaymentButtons extractionId="ext-1" />, {
      wrapper: createWrapper(),
    })

    await user.click(
      screen.getByRole('button', { name: /buy 5 credits for \$65/i }),
    )

    // The clicked credit-pack button shows the busy label...
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /redirecting/i }),
      ).toBeInTheDocument()
    })

    // ...while the single-unlock button keeps its static label (but is disabled).
    const unlockButton = screen.getByRole('button', { name: /unlock for \$15/i })
    expect(unlockButton).toBeDisabled()
    expect(unlockButton).not.toHaveTextContent(/redirecting/i)

    // Both buttons are disabled during the pending mutation.
    screen.getAllByRole('button').forEach((btn) => {
      expect(btn).toBeDisabled()
    })

    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    })
  })

  it('shows error message on checkout failure', async () => {
    vi.spyOn(api, 'apiPost').mockRejectedValue(
      new api.ApiError(500, 'Checkout failed')
    )
    const user = userEvent.setup()

    render(<PaymentButtons extractionId="ext-1" />, {
      wrapper: createWrapper(),
    })

    await user.click(screen.getByRole('button', { name: /unlock for \$15/i }))

    await waitFor(() => {
      expect(screen.getByText(/payment failed/i)).toBeInTheDocument()
    })
  })
})

// ---- Payment Return Hook Tests ----

describe('usePaymentReturn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchParams = new URLSearchParams()
  })

  it('shows success toast and invalidates queries on payment=success', async () => {
    mockSearchParams = new URLSearchParams('payment=success')

    const { wrapper, queryClient } = createWrapperWithClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    renderHook(() => usePaymentReturn('ext-1'), { wrapper })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Payment successful! Your full results are now available.'
      )
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['extractions', 'ext-1'],
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['teaser', 'ext-1'],
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['credits'],
    })
    // A successful purchase changes the credit balance, so the dashboard
    // summary must be refetched to avoid showing a stale balance.
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['dashboard'],
    })

    expect(mockReplace).toHaveBeenCalledWith('/results/ext-1', {
      scroll: false,
    })
  })

  it('directs guest checkout returns to complete account access', async () => {
    mockSearchParams = new URLSearchParams('payment=success&access=complete-account')

    renderHook(() => usePaymentReturn('ext-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith(
        'Payment successful. Complete account access or sign in to view your full results.'
      )
    })

    expect(toast.success).not.toHaveBeenCalled()
    expect(mockReplace).toHaveBeenCalledWith('/results/ext-1', {
      scroll: false,
    })
  })

  it('shows info toast on payment=cancelled', async () => {
    mockSearchParams = new URLSearchParams('payment=cancelled')

    renderHook(() => usePaymentReturn('ext-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith(
        'Payment cancelled. You can try again anytime.'
      )
    })

    expect(mockReplace).toHaveBeenCalledWith('/results/ext-1', {
      scroll: false,
    })
  })

  it('does nothing when no payment param', () => {
    mockSearchParams = new URLSearchParams()

    renderHook(() => usePaymentReturn('ext-1'), {
      wrapper: createWrapper(),
    })

    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.info).not.toHaveBeenCalled()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('cleans URL for unknown payment param without showing toast', async () => {
    mockSearchParams = new URLSearchParams('payment=unknown_value')

    renderHook(() => usePaymentReturn('ext-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/results/ext-1', {
        scroll: false,
      })
    })

    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.info).not.toHaveBeenCalled()
  })

  it('does not re-handle the same payment param on re-render', async () => {
    mockSearchParams = new URLSearchParams('payment=success')

    const { wrapper } = createWrapperWithClient()
    const { rerender } = renderHook(() => usePaymentReturn('ext-1'), {
      wrapper,
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledTimes(1)
    })

    rerender()

    // Still only called once
    expect(toast.success).toHaveBeenCalledTimes(1)
  })
})
