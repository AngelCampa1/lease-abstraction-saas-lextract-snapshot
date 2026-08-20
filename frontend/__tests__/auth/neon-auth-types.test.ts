/** @vitest-environment node */
import { describe, it, expect } from 'vitest'
import { ANONYMOUS_SESSION_KEY } from '@/lib/neon-auth/types'
import type { AuthUser, AuthSession, AuthError, AuthState, AuthActions, AuthContextValue } from '@/lib/neon-auth/types'

describe('neon-auth/types', () => {
  it('exports the correct anonymous session key', () => {
    expect(ANONYMOUS_SESSION_KEY).toBe('lextract_session_token')
  })

  it('AuthUser type has required shape', () => {
    const user: AuthUser = { id: '1', email: 'test@test.com' }
    expect(user.id).toBe('1')
    expect(user.email).toBe('test@test.com')
  })

  it('AuthUser type supports optional name and image', () => {
    const user: AuthUser = { id: '1', email: 'test@test.com', name: 'Test', image: 'https://example.com/pic.jpg' }
    expect(user.name).toBe('Test')
    expect(user.image).toBe('https://example.com/pic.jpg')
  })

  it('AuthSession type has required shape', () => {
    const session: AuthSession = {
      id: '1',
      token: 'tok',
      expiresAt: new Date(),
      userId: 'u1',
    }
    expect(session.token).toBe('tok')
    expect(session.id).toBe('1')
    expect(session.userId).toBe('u1')
    expect(session.expiresAt).toBeInstanceOf(Date)
  })

  it('AuthError type has required shape', () => {
    const error: AuthError = { message: 'Something failed', status: 0, statusText: '' }
    expect(error.message).toBe('Something failed')
  })

  it('AuthError type supports optional code', () => {
    const error: AuthError = { message: 'Bad request', code: 'BAD_REQUEST', status: 0, statusText: '' }
    expect(error.code).toBe('BAD_REQUEST')
  })

  it('AuthState type has required shape', () => {
    const state: AuthState = { user: null, session: null, loading: true }
    expect(state.loading).toBe(true)
    expect(state.user).toBeNull()
    expect(state.session).toBeNull()
  })

  it('AuthActions type has required methods', () => {
    const actions: AuthActions = {
      signIn: async () => ({ error: null }),
      signUp: async () => ({ error: null }),
      signOut: async () => ({ error: null }),
      signInWithGoogle: async () => ({ error: null }),
      requestPasswordReset: async () => ({ error: null }),
      resetPassword: async () => ({ error: null }),
    }
    expect(typeof actions.signIn).toBe('function')
    expect(typeof actions.signUp).toBe('function')
    expect(typeof actions.signOut).toBe('function')
    expect(typeof actions.signInWithGoogle).toBe('function')
    expect(typeof actions.requestPasswordReset).toBe('function')
    expect(typeof actions.resetPassword).toBe('function')
  })

  it('AuthContextValue combines AuthState and AuthActions', () => {
    const ctx: AuthContextValue = {
      user: null,
      session: null,
      loading: false,
      signIn: async () => ({ error: null }),
      signUp: async () => ({ error: null }),
      signOut: async () => ({ error: null }),
      signInWithGoogle: async () => ({ error: null }),
      requestPasswordReset: async () => ({ error: null }),
      resetPassword: async () => ({ error: null }),
    }
    expect(ctx.loading).toBe(false)
    expect(typeof ctx.signIn).toBe('function')
  })
})
