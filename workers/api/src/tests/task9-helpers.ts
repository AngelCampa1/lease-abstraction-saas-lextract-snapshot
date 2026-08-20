import { Hono } from 'hono'

import type { AuthDependencies } from '../services/neon-auth'
import type { AppBindings, Env } from '../types'
import { routeTestEnv } from './route-test-helpers'

export const userAuthDependencies: AuthDependencies = {
  findAnonymousSession: () => Promise.resolve(null),
  findUserByAuthSubject: () =>
    Promise.resolve({ authSubject: 'user-id', email: 'user@example.com', id: 'user-id' }),
  verifyBearerToken: () =>
    Promise.resolve({ email: 'user@example.com', subject: 'user-id' }),
}

export const anonymousAuthDependencies: AuthDependencies = {
  findAnonymousSession: () =>
    Promise.resolve({
      email: null,
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      id: 'session-id',
      linkedUserId: null,
      sessionToken: 'valid-session',
    }),
  findUserByAuthSubject: () => Promise.resolve(null),
  verifyBearerToken: () =>
    Promise.resolve({ email: null, subject: 'session-id' }),
}

export function testApp(
  mountPath: string,
  routes: Hono<AppBindings>,
  env: Env = routeTestEnv,
): {
  fetch(path: string, init?: RequestInit): Promise<Response>
} {
  const app = new Hono<AppBindings>()
  app.route(mountPath, routes)
  return {
    fetch: async (path, init = {}) =>
      app.fetch(
        new Request(`https://api.lextract.io${path}`, {
          ...init,
          headers: {
            Authorization: 'Bearer valid-jwt',
            ...(init.headers ?? {}),
          },
        }),
        env,
      ),
  }
}
