import { Hono } from 'hono'
import { z } from 'zod'
import type { Context } from 'hono'

import {
  AnonymousSessionConflictError,
  AnonymousSessionExpiredError,
  AnonymousSessionNotFoundError,
  createAnonymousSession,
  linkAnonymousSession,
  saveAnonymousEmail,
} from '../repositories/anonymous-sessions'
import type {
  AnonymousSessionResult,
  LinkAnonymousSessionInput,
  SaveAnonymousEmailInput,
} from '../repositories/anonymous-sessions'
import { syncUser } from '../repositories/users'
import type { SyncUserInput } from '../repositories/users'
import { createRequireUserAuth } from '../middleware/auth'
import type { AuthContext } from '../services/neon-auth'
import type { AuthDependencies } from '../services/neon-auth'
import type { AppBindings, Env } from '../types'

const emailSchema = z.object({ email: z.email() })
const linkSchema = z.object({ session_token: z.string().min(1) })
const syncUserSchema = z.object({
  email: z.email().optional().nullable(),
  full_name: z.string().max(200).optional().nullable(),
})

export interface AuthRouteDependencies {
  authDependencies?: AuthDependencies
  createAnonymousSession(env: Env): Promise<AnonymousSessionResult>
  saveAnonymousEmail(input: SaveAnonymousEmailInput, env: Env): Promise<boolean>
  linkAnonymousSession(
    input: LinkAnonymousSessionInput,
    env: Env,
  ): Promise<number>
  syncUser(input: SyncUserInput, env: Env): Promise<void>
}

type UserAuthContext = Extract<AuthContext, { kind: 'user' }>

function currentUser(c: Context<AppBindings>): UserAuthContext {
  // Safe because every caller is behind createRequireUserAuth middleware.
  return c.get('authContext') as UserAuthContext
}

export function defaultAuthRouteDependencies(): AuthRouteDependencies {
  return {
    createAnonymousSession,
    linkAnonymousSession,
    saveAnonymousEmail,
    syncUser,
  }
}

export function createAuthRoutes(
  dependencies: AuthRouteDependencies = defaultAuthRouteDependencies(),
): Hono<AppBindings> {
  const auth = new Hono<AppBindings>()
  const requireUser = createRequireUserAuth(dependencies.authDependencies)

  auth.post('/anonymous', async (c) => {
    const session = await dependencies.createAnonymousSession(c.env)
    return c.json(
      {
        expires_at: session.expiresAt,
        session_token: session.sessionToken,
      },
      201,
    )
  })

  auth.patch('/anonymous/email', async (c) => {
    const sessionToken = c.req.header('X-Session-Token')?.trim()
    if (!sessionToken) {
      return c.json({ detail: 'X-Session-Token header required' }, 401)
    }

    const body = emailSchema.parse(await c.req.json())
    const updated = await dependencies.saveAnonymousEmail(
      { email: body.email, sessionToken },
      c.env,
    )
    if (!updated) {
      return c.json(
        { detail: 'Anonymous session not found or already linked' },
        404,
      )
    }

    return c.json({ updated: true })
  })

  auth.post('/link', requireUser, async (c) => {
    const body = linkSchema.parse(await c.req.json())
    const authContext = currentUser(c)

    try {
      const transferred = await dependencies.linkAnonymousSession(
        {
          sessionToken: body.session_token,
          userId: authContext.id,
        },
        c.env,
      )
      return c.json({ extractions_transferred: transferred, linked: true })
    } catch (error) {
      if (error instanceof AnonymousSessionExpiredError) {
        return c.json({ detail: error.message }, 410)
      }
      if (error instanceof AnonymousSessionConflictError) {
        return c.json({ detail: error.message }, 409)
      }
      if (error instanceof AnonymousSessionNotFoundError) {
        return c.json({ detail: error.message }, 404)
      }
      throw error
    }
  })

  auth.post('/sync-user', requireUser, async (c) => {
    const body = syncUserSchema.parse(await c.req.json())
    const authContext = currentUser(c)

    const input: SyncUserInput = {
      email: authContext.email,
      userId: authContext.id,
    }
    if (body.full_name !== undefined && body.full_name !== null) {
      input.fullName = body.full_name
    }

    await dependencies.syncUser(input, c.env)

    return c.json({ synced: true, user_id: authContext.id })
  })

  return auth
}

export const authRoutes = createAuthRoutes()
