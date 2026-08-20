/**
 * Auth types for the Neon Auth (managed Better Auth) integration.
 *
 * These types decouple the app from any specific auth provider.
 * When `@neondatabase/auth` is connected to a live Neon project,
 * swap these lightweight definitions for the SDK's own re-exports.
 */

export interface AuthUser {
  id: string
  email: string
  name?: string
  image?: string
}

export interface AuthSession {
  id: string
  token: string
  expiresAt: Date
  userId: string
}

export interface AuthError {
  message?: string
  code?: string
  status: number
  statusText: string
}

export interface AuthState {
  user: AuthUser | null
  session: AuthSession | null
  loading: boolean
}

export interface AuthActions {
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  signInWithGoogle: () => Promise<{ error: AuthError | null; url?: string }>
  requestPasswordReset: (
    email: string,
    redirectTo: string
  ) => Promise<{ error: AuthError | null }>
  resetPassword: (
    token: string,
    newPassword: string
  ) => Promise<{ error: AuthError | null }>
}

export type AuthContextValue = AuthState & AuthActions

export const ANONYMOUS_SESSION_KEY = 'lextract_session_token'
