import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { AiCsWidgetProps } from '@ventora/ai-cs/react'

// Captured props from the most recent render of the stub
let capturedProps: AiCsWidgetProps | null = null

vi.mock('@ventora/ai-cs/react', () => ({
  AiCsWidget: (props: AiCsWidgetProps) => {
    capturedProps = props
    return <div data-testid="ventora-ai-cs" />
  },
}))

vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}))

import { useAuth } from '@/hooks/use-auth'
import { usePathname } from 'next/navigation'
import { AiCsWidget } from './ai-cs-widget'

const mockUseAuth = vi.mocked(useAuth)
const mockUsePathname = vi.mocked(usePathname)

describe('AiCsWidget', () => {
  beforeEach(() => {
    capturedProps = null
    vi.clearAllMocks()
  })

  it('renders the Ventora widget with correct props when a user is signed in', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u-42', email: 'test@example.com', name: 'Test User' },
      session: null,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      signInWithGoogle: vi.fn(),
      requestPasswordReset: vi.fn(),
      resetPassword: vi.fn(),
    })
    mockUsePathname.mockReturnValue('/docs/getting-started')

    render(<AiCsWidget />)

    expect(screen.getByTestId('ventora-ai-cs')).toBeInTheDocument()
    expect(capturedProps).not.toBeNull()
    expect(capturedProps!.api.baseUrl).toBe('/api/ai-cs')
    expect(capturedProps!.api.credentials).toBe('same-origin')
    expect(capturedProps!.session.appId).toBe('lextract')
    expect(capturedProps!.session.userId).toBe('u-42')
    expect(capturedProps!.session.currentPath).toBe('/docs/getting-started')
    expect(capturedProps!.brand).toEqual({ id: 'lextract' })
  })

  it('omits currentPath from session when pathname is null', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u-99', email: 'anon@example.com' },
      session: null,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      signInWithGoogle: vi.fn(),
      requestPasswordReset: vi.fn(),
      resetPassword: vi.fn(),
    })
    // usePathname() is typed `() => string`, but Next can return null before
    // hydration; cast to exercise the widget's defensive null guard.
    mockUsePathname.mockReturnValue(null as unknown as string)

    render(<AiCsWidget />)

    expect(screen.getByTestId('ventora-ai-cs')).toBeInTheDocument()
    expect(capturedProps!.session.currentPath).toBeUndefined()
  })

  it('renders nothing when there is no signed-in user', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      signInWithGoogle: vi.fn(),
      requestPasswordReset: vi.fn(),
      resetPassword: vi.fn(),
    })
    mockUsePathname.mockReturnValue('/dashboard')

    const { container } = render(<AiCsWidget />)

    expect(screen.queryByTestId('ventora-ai-cs')).not.toBeInTheDocument()
    expect(container).toBeEmptyDOMElement()
  })
})
