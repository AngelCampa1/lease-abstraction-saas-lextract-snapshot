'use client'

import { useState, useEffect } from 'react'
import type { AuthError, AuthSession, AuthUser } from './types'

// ── Internal types ────────────────────────────────────────────────────────────

interface SignInEmailParams {
  email: string
  password: string
}

interface SignUpEmailParams {
  email: string
  password: string
  name: string
}

interface SocialSignInParams {
  provider: string
  callbackURL?: string
}

interface RequestPasswordResetParams {
  email: string
  redirectTo: string
}

interface ResetPasswordParams {
  token: string
  newPassword: string
}

interface SessionUserRaw {
  id: string
  email: string
  name?: string
  image?: string
}

interface SessionRaw {
  token: string
  expiresAt: string
  userId: string
}

interface SessionDataRaw {
  session: SessionRaw
  user: SessionUserRaw
}

// Better Auth sign-in/sign-up returns a flat { token, user } - no session wrapper
interface SignInResponseRaw {
  token: string
  user: SessionUserRaw
  redirect?: boolean
}

type AuthChangeListener = (event: string, session: AuthSession | null) => void

// ── Helpers ───────────────────────────────────────────────────────────────────

async function postJson<T>(
  url: string,
  body: Record<string, unknown>,
  failureMessage: string,
): Promise<{ data: T | null; error: AuthError | null }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      let message = failureMessage
      try {
        const json = (await res.json()) as { message?: string }
        if (json.message) message = json.message
      } catch {
        // body not JSON - use fallback message
      }
      return {
        data: null,
        error: { message, status: res.status, statusText: res.statusText },
      }
    }

    const data = (await res.json()) as T
    return { data, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : failureMessage
    return { data: null, error: { message, status: 0, statusText: '' } }
  }
}

function signInRawToAuthSession(raw: SignInResponseRaw): AuthSession {
  // Sign-in/sign-up returns { token, user } - expiresAt not provided, default 7 days
  return {
    id: raw.token,
    token: raw.token,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    userId: raw.user.id,
  }
}

// ── NeonAuthClient ─────────────────────────────────────────────────────────

type NeonAuthClient = ReturnType<typeof _createAuthClient>

function _createAuthClient() {
  const listeners: Set<AuthChangeListener> = new Set()

  function notify(event: string, session: AuthSession | null) {
    for (const listener of listeners) {
      listener(event, session)
    }
  }

  function onAuthStateChange(callback: AuthChangeListener): () => void {
    listeners.add(callback)
    return () => {
      listeners.delete(callback)
    }
  }

  const signIn = {
    async email(params: SignInEmailParams) {
      const result = await postJson<SignInResponseRaw>(
        '/api/auth/sign-in/email',
        // Safe: all SignInEmailParams fields are string - compatible with Record<string, unknown>
        params as unknown as Record<string, unknown>,
        'Sign in failed',
      )
      if (result.data) {
        notify('SIGNED_IN', signInRawToAuthSession(result.data))
      }
      return result
    },

    async social(params: SocialSignInParams) {
      const body: Record<string, unknown> = { provider: params.provider }
      if (params.callbackURL) body.callbackURL = params.callbackURL
      return postJson<{ url: string }>('/api/auth/sign-in/social', body, 'Social sign in failed')
    },
  }

  const signUp = {
    async email(params: SignUpEmailParams) {
      const result = await postJson<SignInResponseRaw>(
        '/api/auth/sign-up/email',
        // Safe: all SignUpEmailParams fields are string - compatible with Record<string, unknown>
        params as unknown as Record<string, unknown>,
        'Sign up failed',
      )
      if (result.data) {
        notify('SIGNED_IN', signInRawToAuthSession(result.data))
      }
      return result
    },
  }

  async function signOut() {
    try {
      const res = await fetch('/api/auth/sign-out', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })

      if (!res.ok) {
        return {
          error: {
            message: 'Sign out failed',
            status: res.status,
            statusText: res.statusText,
          } satisfies AuthError,
        }
      }

      notify('SIGNED_OUT', null)
      return { error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign out failed'
      return { error: { message, status: 0, statusText: '' } satisfies AuthError }
    }
  }

  async function requestPasswordReset(params: RequestPasswordResetParams) {
    const result = await postJson<{ ok?: boolean }>(
      '/api/auth/request-password-reset',
      // Safe: all RequestPasswordResetParams fields are string - compatible with Record<string, unknown>
      params as unknown as Record<string, unknown>,
      'Password reset request failed',
    )
    return { error: result.error }
  }

  async function resetPassword(params: ResetPasswordParams) {
    const result = await postJson<{ ok?: boolean }>(
      '/api/auth/reset-password',
      // Safe: all ResetPasswordParams fields are string - compatible with Record<string, unknown>
      params as unknown as Record<string, unknown>,
      'Password reset failed',
    )
    return { error: result.error }
  }

  async function getSession(): Promise<{
    data: {
      session: { token: string; expiresAt: Date }
      user: SessionUserRaw
    } | null
    error: AuthError | null
  }> {
    try {
      // Better Auth's session endpoint is /get-session, not /session
      const res = await fetch('/api/auth/get-session', {
        method: 'GET',
        credentials: 'include',
      })

      if (!res.ok) {
        return { data: null, error: null }
      }

      const raw = (await res.json()) as SessionDataRaw
      return {
        data: {
          session: {
            token: raw.session.token,
            expiresAt: new Date(raw.session.expiresAt),
          },
          user: raw.user,
        },
        error: null,
      }
    } catch {
      return { data: null, error: null }
    }
  }

  // ── useSession hook ─────────────────────────────────────────────────────────

  function useSession() {
    const [state, setState] = useState<{
      data: {
        user: AuthUser
        session: { id: string; token: string; expiresAt: Date; userId: string }
      } | null
      isPending: boolean
    }>({ data: null, isPending: true })

    useEffect(() => {
      let cancelled = false

      async function fetchAndSet() {
        try {
          const result = await getSession()
          if (cancelled) return
          if (result.data) {
            const { user, session } = result.data
            setState({
              data: {
                user: {
                  id: user.id,
                  email: user.email,
                  name: user.name,
                  image: user.image,
                },
                session: {
                  id: session.token,
                  token: session.token,
                  expiresAt: session.expiresAt,
                  userId: user.id,
                },
              },
              isPending: false,
            })
          } else {
            setState({ data: null, isPending: false })
          }
        } catch {
          if (!cancelled) setState({ data: null, isPending: false })
        }
      }

      void fetchAndSet()

      // Re-fetch whenever auth state changes (sign-in / sign-out).
      // Without this, ProtectedRoute sees stale null user after sign-in
      // because useSession() only ran once on mount.
      const unsubscribe = onAuthStateChange(() => {
        setState((prev) => ({ ...prev, isPending: true }))
        void fetchAndSet()
      })

      return () => {
        cancelled = true
        unsubscribe()
      }
    }, [])

    return state
  }

  return {
    signIn,
    signUp,
    signOut,
    requestPasswordReset,
    resetPassword,
    getSession,
    onAuthStateChange,
    useSession,
  }
}

// ── Singleton management ──────────────────────────────────────────────────────

let _instance: NeonAuthClient | null = null

/**
 * Creates or returns the cached auth client singleton.
 * Exported to allow singleton reset between tests via resetClient().
 */
export function createAuthClient(): NeonAuthClient {
  if (!_instance) {
    _instance = _createAuthClient()
  }
  return _instance
}

/**
 * Resets the cached auth client singleton. For use in tests only.
 */
export function resetClient(): void {
  _instance = null
}

export const authClient = createAuthClient()
