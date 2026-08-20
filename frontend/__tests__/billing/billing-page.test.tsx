import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext } from '@/components/auth/auth-provider'
import type { AuthContextValue } from '@/lib/neon-auth/types'
import BillingPage from '@/app/(app)/billing/page'
import * as api from '@/lib/api'

vi.mock('@/lib/neon-auth/client', () => ({
  createAuthClient: () => ({
    getSession: vi.fn().mockResolvedValue({ data: null, error: null }),
    onAuthStateChange: () => () => {},
  }),
}))

const MOCK_SESSION = {
  id: 's1',
  token: 'test-token',
  expiresAt: new Date(),
  userId: 'user-1',
}

const mockAuthContext: AuthContextValue = {
  user: { id: 'user-1', email: 'test@example.com' },
  session: MOCK_SESSION,
  loading: false,
  signIn: vi.fn().mockResolvedValue({ error: null }),
  signUp: vi.fn().mockResolvedValue({ error: null }),
  signOut: vi.fn().mockResolvedValue({ error: null }),
  signInWithGoogle: vi.fn().mockResolvedValue({ error: null }),
  requestPasswordReset: vi.fn().mockResolvedValue({ error: null }),
  resetPassword: vi.fn().mockResolvedValue({ error: null }),
}

function renderBilling() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      <QueryClientProvider client={queryClient}>
        <BillingPage />
      </QueryClientProvider>
    </AuthContext.Provider>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('BillingPage', () => {
  it('renders payment history and credit transactions for authenticated users', async () => {
    vi.spyOn(api, 'apiGet').mockImplementation((path: string) => {
      if (path === '/payments/history') {
        return Promise.resolve({
          payments: [
            {
              id: 'pay-1',
              payment_type: 'single',
              amount_cents: 1500,
              currency: 'usd',
              status: 'completed',
              created_at: '2026-05-01T00:00:00Z',
            },
          ],
          total: 1,
          page: 1,
          page_size: 20,
        })
      }
      if (path === '/payments/credits') {
        return Promise.resolve({
          balance: 4,
          recent_transactions: [
            {
              id: 'ct-1',
              amount: -1,
              balance_after: 4,
              description: 'Unlocked extraction abc',
              created_at: '2026-05-02T00:00:00Z',
            },
          ],
        })
      }
      throw new Error(`unexpected path ${path}`)
    })

    renderBilling()

    expect(await screen.findByText('Single extraction')).toBeInTheDocument()
    expect(screen.getByText(/\$15\.00/)).toBeInTheDocument()
    expect(screen.getByText(/Unlocked extraction abc/)).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /receipt/i }),
    ).not.toBeInTheDocument()
  })

  it('shows empty states when there is no history', async () => {
    vi.spyOn(api, 'apiGet').mockImplementation((path: string) => {
      if (path === '/payments/history')
        return Promise.resolve({
          payments: [],
          total: 0,
          page: 1,
          page_size: 20,
        })
      if (path === '/payments/credits') {
        return Promise.resolve({ balance: 0, recent_transactions: [] })
      }
      throw new Error(`unexpected path ${path}`)
    })

    renderBilling()

    const empties = await screen.findAllByTestId('billing-empty')
    expect(empties).toHaveLength(2)
    expect(empties[0]).toHaveTextContent(/no payments yet/i)
    expect(empties[1]).toHaveTextContent(/no credit activity/i)
  })

  it('shows error state when payment history fetch fails', async () => {
    vi.spyOn(api, 'apiGet').mockImplementation((path: string) => {
      if (path === '/payments/history') {
        return Promise.reject(new api.ApiError(500, 'boom'))
      }
      if (path === '/payments/credits') {
        return Promise.resolve({ balance: 0, recent_transactions: [] })
      }
      throw new Error(`unexpected path ${path}`)
    })

    renderBilling()

    await waitFor(() => {
      expect(screen.getByTestId('billing-error')).toBeInTheDocument()
    })
    expect(
      screen.getByRole('button', { name: /try again/i }),
    ).toBeInTheDocument()
  })

  it('renders a loading state while fetching', () => {
    vi.spyOn(api, 'apiGet').mockReturnValue(new Promise(() => {}))

    renderBilling()

    expect(screen.getAllByTestId('billing-loading')).toHaveLength(2)
  })
})
