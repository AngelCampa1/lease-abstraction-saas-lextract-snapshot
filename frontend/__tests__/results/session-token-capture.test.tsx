/**
 * Tests for SessionTokenCapture (inside results/[id]/page.tsx).
 *
 * Verifies:
 * 1. session_token is stored in localStorage when present in the URL and the
 *    user is unauthenticated.
 * 2. The token is removed from the URL after being stored (address-bar cleanup).
 * 3. An existing token in localStorage is replaced by the returned session.
 * 4. Nothing is stored when the user is authenticated.
 * 5. Nothing is stored when no session_token param is present.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import React, { Suspense } from 'react'

// --- module mocks -----------------------------------------------------------

// Must match the value exported from lib/neon-auth/types.ts
// vi.mock factories are hoisted, so we cannot reference a const — use the literal directly.
const ANON_KEY = 'lextract_session_token'

vi.mock('@/lib/neon-auth/types', () => ({
  // string literal — cannot reference ANON_KEY here because vi.mock is hoisted
  ANONYMOUS_SESSION_KEY: 'lextract_session_token',
}))

// Stub useParams — the page uses it but it is irrelevant to SessionTokenCapture
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'test-id' }),
  useSearchParams: vi.fn(),
}))

vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}))

// Stub heavy components that ResultsPage renders so they don't need providers
vi.mock('@/components/results/results-content', () => ({
  ResultsContent: ({ id }: { id: string }) => (
    <div data-testid="results-content">{id}</div>
  ),
}))

vi.mock('@/components/skeletons', () => ({
  ResultsSkeleton: () => <div data-testid="results-skeleton" />,
}))

// ---------------------------------------------------------------------------

import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import ResultsPage from '@/app/(public-app)/results/[id]/page'

// Helper: build a fake URLSearchParams-like object
function fakeSearchParams(params: Record<string, string>) {
  return {
    get: (key: string) => params[key] ?? null,
  }
}

describe('SessionTokenCapture', () => {
  beforeEach(() => {
    localStorage.clear()
    // Reset history state to a clean URL without session_token
    window.history.replaceState({}, '', '/results/test-id')
    vi.restoreAllMocks()
  })

  function makeAuthValue(user: ReturnType<typeof useAuth>['user']): ReturnType<typeof useAuth> {
    return {
      user,
      loading: false,
      session: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      signInWithGoogle: vi.fn(),
      requestPasswordReset: vi.fn(),
      resetPassword: vi.fn(),
    }
  }

  it('stores session_token in localStorage when unauthenticated', async () => {
    const token = 'tok_abc123'
    vi.mocked(useSearchParams).mockReturnValue(
      fakeSearchParams({ session_token: token }) as ReturnType<typeof useSearchParams>
    )
    vi.mocked(useAuth).mockReturnValue(makeAuthValue(null))

    await act(async () => {
      render(
        <Suspense fallback={null}>
          <ResultsPage />
        </Suspense>
      )
    })

    expect(localStorage.getItem(ANON_KEY)).toBe(token)
  })

  it('removes session_token from the URL after storing it', async () => {
    const token = 'tok_url_cleanup'
    window.history.replaceState({}, '', `/results/test-id?session_token=${token}&other=1`)

    vi.mocked(useSearchParams).mockReturnValue(
      fakeSearchParams({ session_token: token, other: '1' }) as ReturnType<typeof useSearchParams>
    )
    vi.mocked(useAuth).mockReturnValue(makeAuthValue(null))

    await act(async () => {
      render(
        <Suspense fallback={null}>
          <ResultsPage />
        </Suspense>
      )
    })

    // Token stored
    expect(localStorage.getItem(ANON_KEY)).toBe(token)
    // session_token removed from address bar
    expect(window.location.href).not.toContain('session_token')
    // Unrelated params preserved
    expect(window.location.search).toContain('other=1')
  })

  it('replaces an existing anonymous token with the returned session token', async () => {
    const existing = 'tok_existing'
    localStorage.setItem(ANON_KEY, existing)

    vi.mocked(useSearchParams).mockReturnValue(
      fakeSearchParams({ session_token: 'tok_new' }) as ReturnType<typeof useSearchParams>
    )
    vi.mocked(useAuth).mockReturnValue(makeAuthValue(null))

    await act(async () => {
      render(
        <Suspense fallback={null}>
          <ResultsPage />
        </Suspense>
      )
    })

    expect(localStorage.getItem(ANON_KEY)).toBe('tok_new')
  })

  it('does not store token when user is authenticated', async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      fakeSearchParams({ session_token: 'tok_auth' }) as ReturnType<typeof useSearchParams>
    )
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ id: 'user-1', email: 'user@example.com' }))

    await act(async () => {
      render(
        <Suspense fallback={null}>
          <ResultsPage />
        </Suspense>
      )
    })

    expect(localStorage.getItem(ANON_KEY)).toBeNull()
  })

  it('does not store anything when no session_token param is present', async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      fakeSearchParams({}) as ReturnType<typeof useSearchParams>
    )
    vi.mocked(useAuth).mockReturnValue(makeAuthValue(null))

    await act(async () => {
      render(
        <Suspense fallback={null}>
          <ResultsPage />
        </Suspense>
      )
    })

    expect(localStorage.getItem(ANON_KEY)).toBeNull()
  })
})
