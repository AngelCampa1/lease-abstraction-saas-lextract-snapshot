import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppShell } from '@/components/layout/app-shell'
import { AuthContext } from '@/components/auth/auth-provider'
import type { AuthContextValue, AuthUser } from '@/lib/neon-auth/types'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/dashboard',
}))

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}))

vi.mock('@/hooks/use-credits', () => ({
  useCredits: vi.fn().mockReturnValue({
    data: { balance: 3 },
    isLoading: false,
  }),
  creditsKeys: { all: ['credits'] },
}))

vi.mock('@/components/feedback/crm-feedback-widget', () => ({
  CrmFeedbackWidget: () => <div data-testid="crm-feedback-widget" />,
}))

vi.mock('@/components/ai-cs/ai-cs-widget', () => ({ AiCsWidget: () => null }))

const mockUser: AuthUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
}

function createMockAuthContext(
  overrides: Partial<AuthContextValue> = {}
): AuthContextValue {
  return {
    user: mockUser,
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

function renderWithProviders(
  ui: React.ReactElement,
  overrides: Partial<AuthContextValue> = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={createMockAuthContext(overrides)}>
        {ui}
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders header and children when authenticated', () => {
    renderWithProviders(
      <AppShell>
        <div>App content</div>
      </AppShell>
    )
    expect(screen.getByTestId('app-header')).toBeInTheDocument()
    expect(screen.getByText('App content')).toBeInTheDocument()
  })

  it('shows loading state when auth is initializing', () => {
    renderWithProviders(
      <AppShell>
        <div>App content</div>
      </AppShell>,
      { loading: true, user: null }
    )
    expect(screen.getByTestId('auth-loading')).toBeInTheDocument()
    expect(screen.queryByText('App content')).not.toBeInTheDocument()
    expect(screen.queryByTestId('crm-feedback-widget')).not.toBeInTheDocument()
  })

  it('does not render content when not authenticated', () => {
    renderWithProviders(
      <AppShell>
        <div>App content</div>
      </AppShell>,
      { user: null, loading: false }
    )
    expect(screen.queryByText('App content')).not.toBeInTheDocument()
    expect(screen.queryByTestId('crm-feedback-widget')).not.toBeInTheDocument()
  })

  it('wraps content with page transition', () => {
    renderWithProviders(
      <AppShell>
        <div>App content</div>
      </AppShell>
    )
    expect(screen.getByTestId('page-transition')).toBeInTheDocument()
  })

  it('mounts the CRM feedback widget for authenticated app users', () => {
    renderWithProviders(
      <AppShell>
        <div>App content</div>
      </AppShell>
    )
    expect(screen.getByTestId('crm-feedback-widget')).toBeInTheDocument()
  })
})
