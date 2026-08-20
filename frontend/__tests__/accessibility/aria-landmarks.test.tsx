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

describe('ARIA landmarks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('AppShell has a labeled main landmark', () => {
    renderWithAuth(
      <AppShell>
        <div>Content</div>
      </AppShell>
    )
    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('aria-label', 'Application')
  })

  it('PublicAppShell has a labeled main landmark', () => {
    renderWithAuth(
      <PublicAppShell>
        <div>Content</div>
      </PublicAppShell>
    )
    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('aria-label', 'Content')
  })

  it('PublicAppShell mounts the global feedback trigger', () => {
    renderWithAuth(
      <PublicAppShell>
        <div>Content</div>
      </PublicAppShell>
    )
    expect(screen.getByRole('button', { name: 'Send feedback' })).toBeInTheDocument()
  })

  it('AppShell has a header landmark', () => {
    renderWithAuth(
      <AppShell>
        <div>Content</div>
      </AppShell>
    )
    const header = screen.getByRole('banner')
    expect(header).toBeInTheDocument()
  })

  it('navigation landmark has aria-label', () => {
    renderWithAuth(
      <AppShell>
        <div>Content</div>
      </AppShell>
    )
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    expect(nav).toBeInTheDocument()
  })

  it('main element has id for skip link target', () => {
    renderWithAuth(
      <AppShell>
        <div>Content</div>
      </AppShell>
    )
    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', 'main-content')
  })
})
