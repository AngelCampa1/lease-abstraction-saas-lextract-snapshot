import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as api from '@/lib/api'
import {
  useProfile,
  useUpdateProfile,
  profileKeys,
} from '@/hooks/use-profile'
import type { UserProfile } from '@/hooks/use-profile'
import { ProfileForm, profileSchema } from '@/components/profile/profile-form'

vi.mock('@/lib/neon-auth/client', () => ({
  createAuthClient: () => ({
    getSession: vi.fn().mockResolvedValue({ data: null, error: null }),
    onAuthStateChange: () => () => {},
  }),
}))

const mockSignOut = vi.fn().mockResolvedValue({ error: null })
const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockPush, prefetch: vi.fn() }),
  usePathname: () => '/profile',
}))

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: null,
    session: null,
    loading: false,
    signIn: vi.fn().mockResolvedValue({ error: null }),
    signUp: vi.fn().mockResolvedValue({ error: null }),
    signOut: mockSignOut,
    signInWithGoogle: vi.fn().mockResolvedValue({ error: null }),
    requestPasswordReset: vi.fn().mockResolvedValue({ error: null }),
    resetPassword: vi.fn().mockResolvedValue({ error: null }),
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

const mockProfile: UserProfile = {
  id: 'user-1',
  email: 'test@example.com',
  full_name: 'John Doe',
  company: 'Acme Corp',
  role: 'broker',
}

describe('useProfile hook', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches user profile data', async () => {
    vi.spyOn(api, 'apiGet').mockResolvedValue(mockProfile)

    const { result } = renderHook(() => useProfile(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockProfile)
    expect(api.apiGet).toHaveBeenCalledWith('/user/profile')
  })

  it('has correct query keys', () => {
    expect(profileKeys.all).toEqual(['profile'])
  })

  it('handles error state', async () => {
    vi.spyOn(api, 'apiGet').mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useProfile(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})

describe('useUpdateProfile hook', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sends PATCH request with profile data', async () => {
    const updatedProfile = { ...mockProfile, full_name: 'Jane Doe' }
    vi.spyOn(api, 'apiPatch').mockResolvedValue(updatedProfile)

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ full_name: 'Jane Doe' })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(api.apiPatch).toHaveBeenCalledWith('/user/profile', {
      full_name: 'Jane Doe',
    })
  })
})

describe('ProfileForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders form with pre-filled profile data', () => {
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ProfileForm profile={mockProfile} />
      </QueryClientProvider>
    )

    expect(screen.getByLabelText('Email')).toHaveValue('test@example.com')
    expect(screen.getByLabelText('Email')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-readonly', 'true')
    expect(screen.getByLabelText('Full Name')).toHaveValue('John Doe')
    expect(screen.getByLabelText('Company')).toHaveValue('Acme Corp')
    expect(screen.getByLabelText('Role')).toHaveValue('broker')
  })

  it('disables submit button when form is not dirty', () => {
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ProfileForm profile={mockProfile} />
      </QueryClientProvider>
    )

    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
  })

  it('enables submit button after editing a field', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ProfileForm profile={mockProfile} />
      </QueryClientProvider>
    )

    const nameInput = screen.getByLabelText('Full Name')
    await user.clear(nameInput)
    await user.type(nameInput, 'Jane Doe')

    expect(screen.getByRole('button', { name: /save changes/i })).toBeEnabled()
  })

  it('shows validation error for short name', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ProfileForm profile={mockProfile} />
      </QueryClientProvider>
    )

    const nameInput = screen.getByLabelText('Full Name')
    await user.clear(nameInput)
    await user.type(nameInput, 'A')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Name must be at least 2 characters'
      )
    })
  })

  it('shows validation error for empty name', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ProfileForm profile={mockProfile} />
      </QueryClientProvider>
    )

    const nameInput = screen.getByLabelText('Full Name')
    await user.clear(nameInput)
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('submits form and calls API on valid data', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'apiPatch').mockResolvedValue({
      ...mockProfile,
      full_name: 'Jane Doe',
    })

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ProfileForm profile={mockProfile} />
      </QueryClientProvider>
    )

    const nameInput = screen.getByLabelText('Full Name')
    await user.clear(nameInput)
    await user.type(nameInput, 'Jane Doe')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(api.apiPatch).toHaveBeenCalledWith('/user/profile', {
        full_name: 'Jane Doe',
        company: 'Acme Corp',
        role: 'broker',
      })
    })
  })

  it('submits the selected enum role value to the API', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'apiPatch').mockResolvedValue({
      ...mockProfile,
      role: 'attorney',
    })

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ProfileForm profile={mockProfile} />
      </QueryClientProvider>
    )

    await user.selectOptions(screen.getByLabelText('Role'), 'attorney')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(api.apiPatch).toHaveBeenCalledWith('/user/profile', {
        full_name: 'John Doe',
        company: 'Acme Corp',
        role: 'attorney',
      })
    })
  })

  it('normalizes a legacy free-text role to an unselected dropdown', () => {
    const legacyProfile: UserProfile = {
      id: 'user-3',
      email: 'legacy@example.com',
      full_name: 'Legacy User',
      company: 'Old Co',
      role: 'Analyst',
    }

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ProfileForm profile={legacyProfile} />
      </QueryClientProvider>
    )

    // 'Analyst' is not a valid enum value, so the select falls back to empty.
    expect(screen.getByLabelText('Role')).toHaveValue('')
  })

  it('shows success toast after successful update', async () => {
    const user = userEvent.setup()
    const { toast } = await import('sonner')
    vi.spyOn(api, 'apiPatch').mockResolvedValue({
      ...mockProfile,
      full_name: 'Jane Doe',
    })

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ProfileForm profile={mockProfile} />
      </QueryClientProvider>
    )

    const nameInput = screen.getByLabelText('Full Name')
    await user.clear(nameInput)
    await user.type(nameInput, 'Jane Doe')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Profile updated successfully')
    })
  })

  it('shows error toast on failed update', async () => {
    const user = userEvent.setup()
    const { toast } = await import('sonner')
    vi.spyOn(api, 'apiPatch').mockRejectedValue(new Error('Server error'))

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ProfileForm profile={mockProfile} />
      </QueryClientProvider>
    )

    const nameInput = screen.getByLabelText('Full Name')
    await user.clear(nameInput)
    await user.type(nameInput, 'Jane Doe')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update profile')
    })
  })

  it('sends empty optional fields as undefined', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'apiPatch').mockResolvedValue({
      ...mockProfile,
      full_name: 'Jane Doe',
      company: null,
      role: null,
    })

    const profileWithEmptyOptionals: UserProfile = {
      id: 'user-1',
      email: 'test@example.com',
      full_name: 'John Doe',
      company: '',
      role: '',
    }

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ProfileForm profile={profileWithEmptyOptionals} />
      </QueryClientProvider>
    )

    const nameInput = screen.getByLabelText('Full Name')
    await user.clear(nameInput)
    await user.type(nameInput, 'Jane Doe')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(api.apiPatch).toHaveBeenCalledWith('/user/profile', {
        full_name: 'Jane Doe',
        company: undefined,
        role: undefined,
      })
    })
  })

  it('shows "Saving..." text while mutation is pending', async () => {
    const user = userEvent.setup()
    let resolveUpdate: (value: unknown) => void = () => {}
    vi.spyOn(api, 'apiPatch').mockImplementation(
      () => new Promise((resolve) => { resolveUpdate = resolve })
    )

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ProfileForm profile={mockProfile} />
      </QueryClientProvider>
    )

    const nameInput = screen.getByLabelText('Full Name')
    await user.clear(nameInput)
    await user.type(nameInput, 'Jane Doe')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument()
    })

    resolveUpdate({ ...mockProfile, full_name: 'Jane Doe' })
  })

  it('handles profile with null fields', () => {
    const nullProfile: UserProfile = {
      id: 'user-2',
      email: 'null@example.com',
      full_name: null,
      company: null,
      role: null,
    }

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ProfileForm profile={nullProfile} />
      </QueryClientProvider>
    )

    expect(screen.getByLabelText('Full Name')).toHaveValue('')
    expect(screen.getByLabelText('Company')).toHaveValue('')
    expect(screen.getByLabelText('Role')).toHaveValue('')
  })

  it('opens a confirmation dialog when the delete-account link is clicked', async () => {
    const user = userEvent.setup()
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ProfileForm profile={mockProfile} />
      </QueryClientProvider>
    )

    await user.click(screen.getByTestId('delete-account-link'))

    expect(await screen.findByTestId('delete-account-dialog')).toBeInTheDocument()
    expect(screen.getByText(/permanently removes your account/i)).toBeInTheDocument()
  })

  it('cancel button closes the dialog without calling the API', async () => {
    const user = userEvent.setup()
    const deleteSpy = vi.spyOn(api, 'apiDelete')
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ProfileForm profile={mockProfile} />
      </QueryClientProvider>
    )

    await user.click(screen.getByTestId('delete-account-link'))
    await user.click(screen.getByTestId('delete-account-cancel'))

    await waitFor(() => {
      expect(screen.queryByTestId('delete-account-dialog')).not.toBeInTheDocument()
    })
    expect(deleteSpy).not.toHaveBeenCalled()
  })

  it('confirm calls DELETE /user, signs out, and redirects to /', async () => {
    const user = userEvent.setup()
    const { toast } = await import('sonner')
    mockPush.mockClear()
    mockSignOut.mockClear()
    vi.spyOn(api, 'apiDelete').mockResolvedValue(undefined as unknown as void)

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ProfileForm profile={mockProfile} />
      </QueryClientProvider>
    )

    await user.click(screen.getByTestId('delete-account-link'))
    await user.click(screen.getByTestId('delete-account-confirm'))

    await waitFor(() => {
      expect(api.apiDelete).toHaveBeenCalledWith('/user')
    })
    expect(mockSignOut).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/')
    expect(toast.success).toHaveBeenCalledWith('Account deleted')
  })

  it('shows an error toast and keeps the dialog open when DELETE fails', async () => {
    const user = userEvent.setup()
    const { toast } = await import('sonner')
    vi.spyOn(api, 'apiDelete').mockRejectedValue(
      new api.ApiError(409, 'Cannot delete account with open subscription'),
    )

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ProfileForm profile={mockProfile} />
      </QueryClientProvider>
    )

    await user.click(screen.getByTestId('delete-account-link'))
    await user.click(screen.getByTestId('delete-account-confirm'))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Cannot delete account with open subscription',
      )
    })
  })

  it('wraps profile action buttons cleanly on narrow screens', () => {
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ProfileForm profile={mockProfile} />
      </QueryClientProvider>
    )

    expect(screen.getByTestId('profile-action-row')).toHaveClass(
      'flex-wrap',
      'items-stretch',
      'sm:items-center'
    )
    expect(screen.getByTestId('profile-save-button')).toHaveClass('w-full', 'sm:w-auto')
    expect(screen.getByRole('button', { name: /sign out/i })).toHaveClass(
      'w-full',
      'sm:w-auto'
    )
  })
})

describe('profileSchema', () => {
  it('validates valid profile data', () => {
    const result = profileSchema.safeParse({
      full_name: 'John Doe',
      company: 'Acme',
      role: 'broker',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a role outside the backend enum', () => {
    const result = profileSchema.safeParse({
      full_name: 'John Doe',
      company: 'Acme',
      role: 'Analyst',
    })
    expect(result.success).toBe(false)
  })

  it('accepts every backend-supported role value', () => {
    for (const role of [
      'tenant_rep',
      'broker',
      'attorney',
      'landlord',
      'investor',
      'other',
    ]) {
      const result = profileSchema.safeParse({
        full_name: 'John Doe',
        company: 'Acme',
        role,
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects empty full_name', () => {
    const result = profileSchema.safeParse({
      full_name: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects full_name with less than 2 chars', () => {
    const result = profileSchema.safeParse({
      full_name: 'A',
    })
    expect(result.success).toBe(false)
  })

  it('allows empty company and role', () => {
    const result = profileSchema.safeParse({
      full_name: 'John Doe',
      company: '',
      role: '',
    })
    expect(result.success).toBe(true)
  })
})
