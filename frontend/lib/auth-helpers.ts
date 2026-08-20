import { apiPost, ApiError } from '@/lib/api'
import { ANONYMOUS_SESSION_KEY } from '@/lib/neon-auth/types'

const LINK_RETRY_DELAY_MS = 150

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

/**
 * Link an anonymous session to the authenticated user's account.
 * Transfers any extractions created during the anonymous session.
 * Removes the anonymous session token from localStorage on success.
 */
export async function linkAnonymousSession(sessionToken: string): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await apiPost('/auth/link', { session_token: sessionToken }, { forceTokenProbe: true })
      localStorage.removeItem(ANONYMOUS_SESSION_KEY)
      return true
    } catch (err) {
      if (err instanceof ApiError && err.status === 401 && attempt === 0) {
        await delay(LINK_RETRY_DELAY_MS)
        continue
      }

      console.error('Failed to link anonymous session:', err)
      return false
    }
  }

  return false
}

/**
 * Check for and link any existing anonymous session.
 * Returns true if a session was found and successfully linked, false otherwise.
 */
export async function linkAnonymousSessionIfExists(): Promise<boolean> {
  const token = localStorage.getItem(ANONYMOUS_SESSION_KEY)
  if (!token) return false

  const linked = await linkAnonymousSession(token)
  if (!linked) {
    console.error('Anonymous session linking failed, extractions may not appear in dashboard')
  }
  return linked
}
