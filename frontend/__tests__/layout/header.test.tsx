import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Header } from '@/components/layout/header'
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

// Mock the useCredits hook
vi.mock('@/hooks/use-credits', () => ({
  useCredits: vi.fn().mockReturnValue({
    data: { balance: 5 },
    isLoading: false,
  }),
  creditsKeys: { all: ['credits'] },
}))

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

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={createMockAuthContext()}>
        {ui}
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the header element', () => {
    renderWithProviders(<Header />)
    expect(screen.getByTestId('app-header')).toBeInTheDocument()
  })

  it('renders the Lextract logo', () => {
    renderWithProviders(<Header />)
    expect(screen.getByTestId('header-logo')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Lextract' })).toBeInTheDocument()
  })

  it('renders desktop nav links', () => {
    renderWithProviders(<Header />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Upload')).toBeInTheDocument()
  })

  it('renders the credit badge', () => {
    renderWithProviders(<Header />)
    expect(screen.getByTestId('credit-badge')).toBeInTheDocument()
    expect(screen.getByText('5 credits')).toBeInTheDocument()
  })

  it('renders the user menu trigger', () => {
    renderWithProviders(<Header />)
    expect(screen.getByTestId('user-menu-trigger')).toBeInTheDocument()
  })

  it('renders the mobile nav toggle', () => {
    renderWithProviders(<Header />)
    expect(screen.getByTestId('mobile-nav-toggle')).toBeInTheDocument()
  })
})
