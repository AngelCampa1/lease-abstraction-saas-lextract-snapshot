import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createAuthClient, resetClient } from '@/lib/neon-auth/client'

describe('createAuthClient', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    resetClient()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('creates an auth client with required methods', () => {
    const client = createAuthClient()
    expect(client).toBeDefined()
    expect(client.signIn).toBeDefined()
    expect(client.signIn.email).toBeTypeOf('function')
    expect(client.signIn.social).toBeTypeOf('function')
    expect(client.signUp).toBeDefined()
    expect(client.signUp.email).toBeTypeOf('function')
    expect(client.signOut).toBeTypeOf('function')
    expect(client.requestPasswordReset).toBeTypeOf('function')
    expect(client.resetPassword).toBeTypeOf('function')
    expect(client.getSession).toBeTypeOf('function')
    expect(client.onAuthStateChange).toBeTypeOf('function')
  })

  it('returns the same client on subsequent calls (singleton)', () => {
    const client1 = createAuthClient()
    const client2 = createAuthClient()
    expect(client1).toBe(client2)
  })

  it('resets the cached client via resetClient', () => {
    const client1 = createAuthClient()
    resetClient()
    const client2 = createAuthClient()
    expect(client1).not.toBe(client2)
  })

  describe('signIn.email', () => {
    it('makes a POST request to /api/auth/sign-in/email', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(
          JSON.stringify({
            token: 'test-token',
            user: { id: '1', email: 'test@test.com' },
          }),
          { status: 200 }
        )
      )

      const client = createAuthClient()
      const result = await client.signIn.email({ email: 'test@test.com', password: 'password' })

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/sign-in/email',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@test.com', password: 'password' }),
        })
      )
      expect(result.error).toBeNull()
      expect(result.data).not.toBeNull()
    })

    it('returns error on failed sign in', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 401 })
      )

      const client = createAuthClient()
      const result = await client.signIn.email({ email: 'test@test.com', password: 'wrong' })

      expect(result.error).not.toBeNull()
      expect(result.error?.message).toBe('Invalid credentials')
      expect(result.data).toBeNull()
    })

    it('returns error on network failure', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'))

      const client = createAuthClient()
      const result = await client.signIn.email({ email: 'test@test.com', password: 'pass' })

      expect(result.error).not.toBeNull()
      expect(result.error?.message).toBe('Network error')
    })

    it('returns generic error when response has no message field', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({}), { status: 401 })
      )

      const client = createAuthClient()
      const result = await client.signIn.email({ email: 'test@test.com', password: 'wrong' })

      expect(result.error?.message).toBe('Sign in failed')
    })

    it('returns generic error when response body is not JSON', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response('Server Error', { status: 500 })
      )

      const client = createAuthClient()
      const result = await client.signIn.email({ email: 'test@test.com', password: 'pass' })

      expect(result.error?.message).toBe('Sign in failed')
    })

    it('returns fallback message when non-Error is thrown', async () => {
      vi.mocked(global.fetch).mockRejectedValue('string error')

      const client = createAuthClient()
      const result = await client.signIn.email({ email: 'test@test.com', password: 'pass' })

      expect(result.error?.message).toBe('Sign in failed')
    })
  })

  describe('signUp.email', () => {
    it('makes a POST request to /api/auth/sign-up/email', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(
          JSON.stringify({
            token: 'new-token',
            user: { id: '2', email: 'new@test.com', name: 'New User' },
          }),
          { status: 200 }
        )
      )

      const client = createAuthClient()
      const result = await client.signUp.email({ email: 'new@test.com', password: 'pass123', name: 'New User' })

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/sign-up/email',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'new@test.com', password: 'pass123', name: 'New User' }),
        })
      )
      expect(result.error).toBeNull()
      expect(result.data?.user.name).toBe('New User')
    })

    it('returns error on failed sign up', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ message: 'Email taken' }), { status: 409 })
      )

      const client = createAuthClient()
      const result = await client.signUp.email({ email: 'taken@test.com', password: 'pass', name: 'Test' })

      expect(result.error?.message).toBe('Email taken')
    })

    it('returns generic error on network failure', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Connection refused'))

      const client = createAuthClient()
      const result = await client.signUp.email({ email: 't@t.com', password: 'p', name: 'N' })

      expect(result.error?.message).toBe('Connection refused')
    })

    it('returns generic error when response has no message field', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({}), { status: 400 })
      )

      const client = createAuthClient()
      const result = await client.signUp.email({ email: 't@t.com', password: 'p', name: 'N' })

      expect(result.error?.message).toBe('Sign up failed')
    })

    it('returns fallback message when non-Error is thrown', async () => {
      vi.mocked(global.fetch).mockRejectedValue('string error')

      const client = createAuthClient()
      const result = await client.signUp.email({ email: 't@t.com', password: 'p', name: 'N' })

      expect(result.error?.message).toBe('Sign up failed')
    })

    it('returns generic error when response body is not JSON', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response('Internal Error', { status: 500 })
      )

      const client = createAuthClient()
      const result = await client.signUp.email({ email: 't@t.com', password: 'p', name: 'N' })

      expect(result.error?.message).toBe('Sign up failed')
    })

    it('notifies listeners on successful signup', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(
          JSON.stringify({
            token: 'new-tok',
            user: { id: '2', email: 'n@t.com', name: 'N' },
          }),
          { status: 200 }
        )
      )

      const client = createAuthClient()
      const listener = vi.fn()
      client.onAuthStateChange(listener)

      await client.signUp.email({ email: 'n@t.com', password: 'p', name: 'N' })

      expect(listener).toHaveBeenCalledWith('SIGNED_IN', expect.objectContaining({ token: 'new-tok' }))
    })
  })

  describe('signOut', () => {
    it('makes a POST request to /api/auth/sign-out', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({}), { status: 200 })
      )

      const client = createAuthClient()
      const result = await client.signOut()

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/sign-out',
        expect.objectContaining({ method: 'POST', credentials: 'include' })
      )
      expect(result.error).toBeNull()
    })

    it('returns error on failed sign out', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response('', { status: 500 })
      )

      const client = createAuthClient()
      const result = await client.signOut()

      expect(result.error?.message).toBe('Sign out failed')
    })

    it('returns error on network failure', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Offline'))

      const client = createAuthClient()
      const result = await client.signOut()

      expect(result.error?.message).toBe('Offline')
    })

    it('returns fallback message when non-Error is thrown', async () => {
      vi.mocked(global.fetch).mockRejectedValue(42)

      const client = createAuthClient()
      const result = await client.signOut()

      expect(result.error?.message).toBe('Sign out failed')
    })
  })

  describe('requestPasswordReset', () => {
    it('requests a password reset email with a redirect target', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      )

      const client = createAuthClient()
      const result = await client.requestPasswordReset({
        email: 'reset@test.com',
        redirectTo: 'https://lextract.io/reset-password',
      })

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/request-password-reset',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({
            email: 'reset@test.com',
            redirectTo: 'https://lextract.io/reset-password',
          }),
        })
      )
      expect(result.error).toBeNull()
    })

    it('returns provider errors from password reset requests', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ message: 'Email provider unavailable' }), {
          status: 503,
        })
      )

      const client = createAuthClient()
      const result = await client.requestPasswordReset({
        email: 'reset@test.com',
        redirectTo: 'https://lextract.io/reset-password',
      })

      expect(result.error?.message).toBe('Email provider unavailable')
    })
  })

  describe('resetPassword', () => {
    it('submits a new password with the reset token', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      )

      const client = createAuthClient()
      const result = await client.resetPassword({
        token: 'valid-token',
        newPassword: 'new-password-123',
      })

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/reset-password',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({
            token: 'valid-token',
            newPassword: 'new-password-123',
          }),
        })
      )
      expect(result.error).toBeNull()
    })

    it('returns provider errors from password reset submission', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ message: 'Invalid or expired token' }), {
          status: 400,
        })
      )

      const client = createAuthClient()
      const result = await client.resetPassword({
        token: 'expired-token',
        newPassword: 'new-password-123',
      })

      expect(result.error?.message).toBe('Invalid or expired token')
    })
  })

  describe('getSession', () => {
    it('makes a GET request to /api/auth/get-session', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(
          JSON.stringify({
            session: { token: 'sess-token', user: { id: '1', email: 'u@t.com' }, expiresAt: '2026-12-31T00:00:00Z' },
            user: { id: '1', email: 'u@t.com' },
          }),
          { status: 200 }
        )
      )

      const client = createAuthClient()
      const result = await client.getSession()

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/get-session',
        expect.objectContaining({ method: 'GET', credentials: 'include' })
      )
      expect(result.data?.session.token).toBe('sess-token')
    })

    it('returns null data when no session exists', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response('', { status: 401 })
      )

      const client = createAuthClient()
      const result = await client.getSession()

      expect(result.data).toBeNull()
      expect(result.error).toBeNull()
    })

    it('returns null data on network error', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Offline'))

      const client = createAuthClient()
      const result = await client.getSession()

      expect(result.data).toBeNull()
    })
  })

  describe('signIn.social', () => {
    it('makes a POST request to /api/auth/sign-in/social', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ url: 'https://accounts.google.com/auth' }), { status: 200 })
      )

      // Mock window.location.href setter
      const locationSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
        ...window.location,
        origin: 'http://localhost:3000',
        href: 'http://localhost:3000',
      })

      // Override href assignment to prevent navigation
      Object.defineProperty(window, 'location', {
        value: { ...window.location, origin: 'http://localhost:3000', href: '' },
        writable: true,
      })

      const client = createAuthClient()
      const result = await client.signIn.social({ provider: 'google' })

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/sign-in/social',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"provider":"google"'),
        })
      )
      expect(result.error).toBeNull()
      expect(result.data?.url).toBe('https://accounts.google.com/auth')

      locationSpy.mockRestore()
    })

    it('returns error on social sign in failure', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ message: 'Provider error' }), { status: 400 })
      )

      const client = createAuthClient()
      const result = await client.signIn.social({ provider: 'google' })

      expect(result.error?.message).toBe('Provider error')
    })

    it('returns generic error when response has no message field', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({}), { status: 400 })
      )

      const client = createAuthClient()
      const result = await client.signIn.social({ provider: 'google' })

      expect(result.error?.message).toBe('Social sign in failed')
    })

    it('returns error on network failure for social sign in', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network down'))

      const client = createAuthClient()
      const result = await client.signIn.social({ provider: 'google' })

      expect(result.error?.message).toBe('Network down')
    })

    it('returns fallback message when non-Error is thrown for social', async () => {
      vi.mocked(global.fetch).mockRejectedValue(null)

      const client = createAuthClient()
      const result = await client.signIn.social({ provider: 'google' })

      expect(result.error?.message).toBe('Social sign in failed')
    })

    it('returns generic error when social sign in response body is not JSON', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response('Bad Gateway', { status: 502 })
      )

      const client = createAuthClient()
      const result = await client.signIn.social({ provider: 'google' })

      expect(result.error?.message).toBe('Social sign in failed')
    })

    it('uses custom callbackURL when provided', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ url: 'https://example.com' }), { status: 200 })
      )

      Object.defineProperty(window, 'location', {
        value: { ...window.location, origin: 'http://localhost:3000', href: '' },
        writable: true,
      })

      const client = createAuthClient()
      await client.signIn.social({ provider: 'google', callbackURL: 'http://custom/callback' })

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/sign-in/social',
        expect.objectContaining({
          body: JSON.stringify({ provider: 'google', callbackURL: 'http://custom/callback' }),
        })
      )
    })
  })

  describe('onAuthStateChange', () => {
    it('registers a listener and returns an unsubscribe function', () => {
      const client = createAuthClient()
      const listener = vi.fn()
      const unsubscribe = client.onAuthStateChange(listener)

      expect(typeof unsubscribe).toBe('function')
    })

    it('notifies listeners on sign in', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(
          JSON.stringify({
            token: 'tok',
            user: { id: '1', email: 'e@e.com' },
          }),
          { status: 200 }
        )
      )

      const client = createAuthClient()
      const listener = vi.fn()
      client.onAuthStateChange(listener)

      await client.signIn.email({ email: 'e@e.com', password: 'p' })

      expect(listener).toHaveBeenCalledWith('SIGNED_IN', expect.objectContaining({ token: 'tok' }))
    })

    it('notifies listeners on sign out', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response('{}', { status: 200 })
      )

      const client = createAuthClient()
      const listener = vi.fn()
      client.onAuthStateChange(listener)

      await client.signOut()

      expect(listener).toHaveBeenCalledWith('SIGNED_OUT', null)
    })

    it('stops notifying after unsubscribe', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response('{}', { status: 200 })
      )

      const client = createAuthClient()
      const listener = vi.fn()
      const unsubscribe = client.onAuthStateChange(listener)

      unsubscribe()
      await client.signOut()

      expect(listener).not.toHaveBeenCalled()
    })
  })
})
