import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserMenu } from '@/components/layout/user-menu'
import { AuthContext } from '@/components/auth/auth-provider'
import type { AuthContextValue, AuthUser } from '@/lib/neon-auth/types'

const mockPush = vi.fn()
const mockSetTheme = vi.fn()
let mockTheme = 'light'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/dashboard',
}))

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: mockTheme, setTheme: mockSetTheme }),
}))

function createMockAuthContext(
  overrides: Partial<AuthContextValue> = {}
): AuthContextValue {
  return {
    user: {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    },
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

function renderWithAuth(
  ui: React.ReactElement,
  overrides: Partial<AuthContextValue> = {}
) {
  return render(
    <AuthContext.Provider value={createMockAuthContext(overrides)}>
      {ui}
    </AuthContext.Provider>
  )
}

describe('UserMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTheme = 'light'
  })

  it('renders the user menu trigger with initials', () => {
    renderWithAuth(<UserMenu />)
    const trigger = screen.getByTestId('user-menu-trigger')
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveTextContent('TU')
  })

  it('shows email initials when no name', () => {
    renderWithAuth(<UserMenu />, {
      user: {
        id: 'user-1',
        email: 'hello@example.com',
      },
    })
    expect(screen.getByTestId('user-menu-trigger')).toHaveTextContent('HE')
  })

  it('opens dropdown and shows user info on click', async () => {
    const user = userEvent.setup()
    renderWithAuth(<UserMenu />)

    await user.click(screen.getByTestId('user-menu-trigger'))

    await waitFor(() => {
      expect(screen.getByTestId('user-menu-content')).toBeInTheDocument()
    })
    expect(screen.getByTestId('user-menu-name')).toHaveTextContent('Test User')
    expect(screen.getByTestId('user-menu-email')).toHaveTextContent(
      'test@example.com'
    )
  })

  it('shows profile, theme toggle, and sign out options', async () => {
    const user = userEvent.setup()
    renderWithAuth(<UserMenu />)

    await user.click(screen.getByTestId('user-menu-trigger'))

    await waitFor(() => {
      expect(screen.getByTestId('user-menu-profile')).toBeInTheDocument()
    })
    expect(screen.getByTestId('user-menu-theme')).toBeInTheDocument()
    expect(screen.getByTestId('user-menu-signout')).toBeInTheDocument()
  })

  it('toggles theme from light to dark', async () => {
    const user = userEvent.setup()
    renderWithAuth(<UserMenu />)

    await user.click(screen.getByTestId('user-menu-trigger'))
    await waitFor(() => {
      expect(screen.getByTestId('user-menu-theme')).toBeInTheDocument()
    })

    await user.click(screen.getByTestId('user-menu-theme'))
    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })

  it('toggles theme from dark to light', async () => {
    mockTheme = 'dark'
    const user = userEvent.setup()
    renderWithAuth(<UserMenu />)

    await user.click(screen.getByTestId('user-menu-trigger'))
    await waitFor(() => {
      expect(screen.getByTestId('user-menu-theme')).toBeInTheDocument()
    })

    await user.click(screen.getByTestId('user-menu-theme'))
    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })

  it('calls signOut and navigates to login on sign out', async () => {
    const mockSignOut = vi.fn().mockResolvedValue({ error: null })
    const user = userEvent.setup()

    // Track window.location.href changes
    const originalLocation = window.location
    const mockHrefSetter = vi.fn()
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, set href(v: string) { mockHrefSetter(v) } },
    })

    renderWithAuth(<UserMenu />, { signOut: mockSignOut })

    await user.click(screen.getByTestId('user-menu-trigger'))
    await waitFor(() => {
      expect(screen.getByTestId('user-menu-signout')).toBeInTheDocument()
    })

    await user.click(screen.getByTestId('user-menu-signout'))
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
    })
    expect(mockHrefSetter).toHaveBeenCalledWith('/login')

    // Restore
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    })
  })

  it('navigates to profile when profile item is clicked', async () => {
    const user = userEvent.setup()
    renderWithAuth(<UserMenu />)

    await user.click(screen.getByTestId('user-menu-trigger'))
    await waitFor(() => {
      expect(screen.getByTestId('user-menu-profile')).toBeInTheDocument()
    })

    await user.click(screen.getByTestId('user-menu-profile'))
    expect(mockPush).toHaveBeenCalledWith('/profile')
  })

  it('shows "Account" when user has no name or email', () => {
    renderWithAuth(<UserMenu />, {
      user: {
        id: 'user-1',
        email: '',
      } as AuthUser,
    })
    expect(screen.getByTestId('user-menu-trigger')).toHaveTextContent('AC')
  })

  it('has proper accessibility label on trigger', () => {
    renderWithAuth(<UserMenu />)
    expect(screen.getByTestId('user-menu-trigger')).toHaveAttribute(
      'aria-label',
      'Open user menu'
    )
  })
})
