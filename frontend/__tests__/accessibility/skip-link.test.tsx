import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppShell } from '@/components/layout/app-shell'
import { PublicAppShell } from '@/components/layout/public-app-shell'
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

function renderWithAuth(ui: React.ReactElement) {
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

describe('Skip-to-content link', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders skip link in AppShell', () => {
    renderWithAuth(
      <AppShell>
        <div>Content</div>
      </AppShell>
    )
    const skipLink = screen.getByText('Skip to main content')
    expect(skipLink).toBeInTheDocument()
    expect(skipLink.tagName).toBe('A')
    expect(skipLink).toHaveAttribute('href', '#main-content')
  })

  it('renders skip link in PublicAppShell', () => {
    renderWithAuth(
      <PublicAppShell>
        <div>Content</div>
      </PublicAppShell>
    )
    const skipLink = screen.getByText('Skip to main content')
    expect(skipLink).toBeInTheDocument()
    expect(skipLink).toHaveAttribute('href', '#main-content')
  })

  it('skip link has correct CSS class for visibility', () => {
    renderWithAuth(
      <AppShell>
        <div>Content</div>
      </AppShell>
    )
    const skipLink = screen.getByText('Skip to main content')
    expect(skipLink).toHaveClass('skip-to-content')
  })

  it('main element has matching id target', () => {
    renderWithAuth(
      <AppShell>
        <div>Content</div>
      </AppShell>
    )
    const main = document.getElementById('main-content')
    expect(main).toBeInTheDocument()
    expect(main?.tagName).toBe('MAIN')
  })

  it('skip link appears before header in DOM order', () => {
    renderWithAuth(
      <AppShell>
        <div>Content</div>
      </AppShell>
    )
    const skipLink = screen.getByText('Skip to main content')
    const header = screen.getByTestId('app-header')
    const position = skipLink.compareDocumentPosition(header)
    // Node.DOCUMENT_POSITION_FOLLOWING = 4
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
