import type { MiddlewareHandler } from 'hono'

import { getAuthContext } from '../services/neon-auth'
import { AuthError } from '../services/neon-auth'
import type { AuthDependencies } from '../services/neon-auth'
import type { AppBindings } from '../types'

function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ detail: 'Authentication required' }), {
    headers: { 'Content-Type': 'application/json' },
    status: 401,
  })
}

export function createAuthMiddleware(
  dependencies?: AuthDependencies,
): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    try {
      c.set('authContext', await getAuthContext(c.req.raw, c.env, dependencies))
    } catch (error) {
      if (error instanceof AuthError) {
        return unauthorizedResponse()
      }
      throw error
    }
    await next()
  }
}

export function createRequireUserAuth(
  dependencies?: AuthDependencies,
): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    let authContext
    try {
      authContext = await getAuthContext(c.req.raw, c.env, dependencies)
    } catch (error) {
      if (error instanceof AuthError) {
        return c.json({ detail: 'Authentication required' }, 401)
      }
      throw error
    }
    if (authContext.kind !== 'user') {
      return c.json({ detail: 'Authentication required' }, 401)
    }

    c.set('authContext', authContext)
    await next()
  }
}

export const authMiddleware = createAuthMiddleware()

export const requireUserAuth = createRequireUserAuth()
