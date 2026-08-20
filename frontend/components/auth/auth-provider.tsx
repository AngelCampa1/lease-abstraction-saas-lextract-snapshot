'use client'

import { createContext, useCallback, useEffect, useMemo, useRef } from 'react'
import { authClient } from '@/lib/neon-auth/client'
import type { AuthUser, AuthContextValue } from '@/lib/neon-auth/types'
import { setAuthStateSnapshot } from '@/lib/auth-state'
import { identifyUser, resetPostHog } from '@/lib/posthog'

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data, isPending } = authClient.useSession()
  const identifiedRef = useRef<string | null>(null)
  const sessionUser = data?.user ?? null

  const user = useMemo<AuthUser | null>(
    () =>
      sessionUser
        ? {
            id: sessionUser.id,
            email: sessionUser.email,
            name: sessionUser.name,
            image: sessionUser.image ?? undefined,
          }
        : null,
    [sessionUser]
  )
  const session = data?.session ?? null

  useEffect(() => {
    if (isPending) {
      setAuthStateSnapshot({ status: 'unknown' })
      return
    }

    if (user) {
      setAuthStateSnapshot({ status: 'authenticated', userId: user.id })
      return
    }

    setAuthStateSnapshot({ status: 'anonymous' })
  }, [isPending, user])

  // Identify user in PostHog when session loads or changes
  useEffect(() => {
    if (user && user.id !== identifiedRef.current) {
      identifyUser(user.id, { email: user.email, name: user.name })
      identifiedRef.current = user.id
    } else if (!user && identifiedRef.current) {
      identifiedRef.current = null
    }
  }, [user])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await authClient.signIn.email({ email, password })
    return { error }
  }, [])

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      const { error } = await authClient.signUp.email({
        email,
        password,
        name: fullName,
      })
      return { error }
    },
    []
  )

  const signOut = useCallback(async () => {
    const { error } = await authClient.signOut()
    if (!error) {
      resetPostHog()
    }
    return { error }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const { data, error } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: `${window.location.origin}/api/auth/callback/google`,
    })
    return { error, url: data?.url }
  }, [])

  const requestPasswordReset = useCallback(async (email: string, redirectTo: string) => {
    const { error } = await authClient.requestPasswordReset({ email, redirectTo })
    return { error }
  }, [])

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    const { error } = await authClient.resetPassword({ token, newPassword })
    return { error }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading: isPending,
      signIn,
      signUp,
      signOut,
      signInWithGoogle,
      requestPasswordReset,
      resetPassword,
    }),
    [
      user,
      session,
      isPending,
      signIn,
      signUp,
      signOut,
      signInWithGoogle,
      requestPasswordReset,
      resetPassword,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
