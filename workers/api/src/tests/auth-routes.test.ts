import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'

import type { AuthDependencies } from '../services/neon-auth'
import { createAuthRoutes } from '../routes/auth'
import {
  AnonymousSessionConflictError,
  AnonymousSessionExpiredError,
  AnonymousSessionNotFoundError,
} from '../repositories/anonymous-sessions'
import type { AppBindings } from '../types'
import { bearerRequest, jsonBody, routeTestEnv } from './route-test-helpers'

function authDependencies(): AuthDependencies {
  return {
    findAnonymousSession: () => Promise.resolve(null),
    findUserByAuthSubject: () =>
      Promise.resolve({
        authSubject: 'auth-subject',
        email: 'owner@example.com',
        id: 'user-id',
      }),
    verifyBearerToken: () =>
      Promise.resolve({ email: 'owner@example.com', subject: 'auth-subject' }),
  }
}

describe('auth routes', () => {
  it('creates anonymous sessions with a 72-hour expiration', async () => {
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/auth',
      createAuthRoutes({
        authDependencies: authDependencies(),
        createAnonymousSession: () =>
          Promise.resolve({
            expiresAt: '2026-06-15T12:00:00.000Z',
            sessionToken: 'session-token',
          }),
        linkAnonymousSession: () => Promise.resolve(0),
        saveAnonymousEmail: () => Promise.resolve(true),
        syncUser: () => Promise.resolve(),
      }),
    )

    const response = await app.fetch(
      new Request('https://api.lextract.io/api/v1/auth/anonymous', {
        method: 'POST',
      }),
      routeTestEnv,
    )

    expect(response.status).toBe(201)
    await expect(
      jsonBody<unknown>(response),
    ).resolves.toEqual({
      expires_at: '2026-06-15T12:00:00.000Z',
      session_token: 'session-token',
    })
  })

  it('saves an email on an active anonymous session', async () => {
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/auth',
      createAuthRoutes({
        authDependencies: authDependencies(),
        createAnonymousSession: () => Promise.reject(new Error('unused')),
        linkAnonymousSession: () => Promise.resolve(0),
        saveAnonymousEmail: (input) => {
          expect(input).toEqual({
            email: 'guest@example.com',
            sessionToken: 'session-token',
          })
          return Promise.resolve(true)
        },
        syncUser: () => Promise.resolve(),
      }),
    )

    const response = await app.fetch(
      new Request('https://api.lextract.io/api/v1/auth/anonymous/email', {
        body: JSON.stringify({ email: 'guest@example.com' }),
        headers: { 'Content-Type': 'application/json', 'X-Session-Token': 'session-token' },
        method: 'PATCH',
      }),
      routeTestEnv,
    )

    expect(response.status).toBe(200)
    await expect(jsonBody<unknown>(response)).resolves.toEqual({ updated: true })
  })

  it('requires an anonymous token when saving anonymous email', async () => {
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/auth',
      createAuthRoutes({
        authDependencies: authDependencies(),
        createAnonymousSession: () => Promise.reject(new Error('unused')),
        linkAnonymousSession: () => Promise.resolve(0),
        saveAnonymousEmail: () => Promise.resolve(true),
        syncUser: () => Promise.resolve(),
      }),
    )

    const response = await app.fetch(
      new Request('https://api.lextract.io/api/v1/auth/anonymous/email', {
        body: JSON.stringify({ email: 'guest@example.com' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      }),
      routeTestEnv,
    )

    expect(response.status).toBe(401)
    await expect(jsonBody<unknown>(response)).resolves.toEqual({
      detail: 'X-Session-Token header required',
    })
  })

  it('returns 404 when anonymous email session is unavailable', async () => {
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/auth',
      createAuthRoutes({
        authDependencies: authDependencies(),
        createAnonymousSession: () => Promise.reject(new Error('unused')),
        linkAnonymousSession: () => Promise.resolve(0),
        saveAnonymousEmail: () => Promise.resolve(false),
        syncUser: () => Promise.resolve(),
      }),
    )

    const response = await app.fetch(
      new Request('https://api.lextract.io/api/v1/auth/anonymous/email', {
        body: JSON.stringify({ email: 'guest@example.com' }),
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': 'missing-token',
        },
        method: 'PATCH',
      }),
      routeTestEnv,
    )

    expect(response.status).toBe(404)
    await expect(jsonBody<unknown>(response)).resolves.toEqual({
      detail: 'Anonymous session not found or already linked',
    })
  })

  it('links an anonymous session to the authenticated user', async () => {
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/auth',
      createAuthRoutes({
        authDependencies: authDependencies(),
        createAnonymousSession: () => Promise.reject(new Error('unused')),
        linkAnonymousSession: (input) => {
          expect(input).toEqual({
            sessionToken: 'session-token',
            userId: 'user-id',
          })
          return Promise.resolve(2)
        },
        saveAnonymousEmail: () => Promise.resolve(true),
        syncUser: () => Promise.resolve(),
      }),
    )

    const response = await app.fetch(
      bearerRequest('/api/v1/auth/link', {
        body: JSON.stringify({ session_token: 'session-token' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
      routeTestEnv,
    )

    expect(response.status).toBe(200)
    await expect(jsonBody<unknown>(response)).resolves.toEqual({
      extractions_transferred: 2,
      linked: true,
    })
  })

  it('maps anonymous link not found to 404', async () => {
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/auth',
      createAuthRoutes({
        authDependencies: authDependencies(),
        createAnonymousSession: () => Promise.reject(new Error('unused')),
        linkAnonymousSession: () =>
          Promise.reject(new AnonymousSessionNotFoundError()),
        saveAnonymousEmail: () => Promise.resolve(true),
        syncUser: () => Promise.resolve(),
      }),
    )

    const response = await app.fetch(
      bearerRequest('/api/v1/auth/link', {
        body: JSON.stringify({ session_token: 'missing-token' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
      routeTestEnv,
    )

    expect(response.status).toBe(404)
  })

  it('maps expired anonymous links to 410', async () => {
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/auth',
      createAuthRoutes({
        authDependencies: authDependencies(),
        createAnonymousSession: () => Promise.reject(new Error('unused')),
        linkAnonymousSession: () =>
          Promise.reject(new AnonymousSessionExpiredError()),
        saveAnonymousEmail: () => Promise.resolve(true),
        syncUser: () => Promise.resolve(),
      }),
    )

    const response = await app.fetch(
      bearerRequest('/api/v1/auth/link', {
        body: JSON.stringify({ session_token: 'expired-token' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
      routeTestEnv,
    )

    expect(response.status).toBe(410)
  })

  it('maps conflicting anonymous links to 409', async () => {
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/auth',
      createAuthRoutes({
        authDependencies: authDependencies(),
        createAnonymousSession: () => Promise.reject(new Error('unused')),
        linkAnonymousSession: () =>
          Promise.reject(new AnonymousSessionConflictError()),
        saveAnonymousEmail: () => Promise.resolve(true),
        syncUser: () => Promise.resolve(),
      }),
    )

    const response = await app.fetch(
      bearerRequest('/api/v1/auth/link', {
        body: JSON.stringify({ session_token: 'session-token' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
      routeTestEnv,
    )

    expect(response.status).toBe(409)
  })

  it('syncs user rows from verified auth context email', async () => {
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/auth',
      createAuthRoutes({
        authDependencies: authDependencies(),
        createAnonymousSession: () => Promise.reject(new Error('unused')),
        linkAnonymousSession: () => Promise.resolve(0),
        saveAnonymousEmail: () => Promise.resolve(true),
        syncUser: (input) => {
          expect(input).toEqual({
            email: 'owner@example.com',
            fullName: 'Owner Name',
            userId: 'user-id',
          })
          return Promise.resolve()
        },
      }),
    )

    const response = await app.fetch(
      bearerRequest('/api/v1/auth/sync-user', {
        body: JSON.stringify({
          email: 'spoof@example.com',
          full_name: 'Owner Name',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
      routeTestEnv,
    )

    expect(response.status).toBe(200)
    await expect(jsonBody<unknown>(response)).resolves.toEqual({
      synced: true,
      user_id: 'user-id',
    })
  })

  it('syncs users without passing omitted full name', async () => {
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/auth',
      createAuthRoutes({
        authDependencies: authDependencies(),
        createAnonymousSession: () => Promise.reject(new Error('unused')),
        linkAnonymousSession: () => Promise.resolve(0),
        saveAnonymousEmail: () => Promise.resolve(true),
        syncUser: (input) => {
          expect(input).toEqual({
            email: 'owner@example.com',
            userId: 'user-id',
          })
          return Promise.resolve()
        },
      }),
    )

    const response = await app.fetch(
      bearerRequest('/api/v1/auth/sync-user', {
        body: JSON.stringify({ email: 'spoof@example.com' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
      routeTestEnv,
    )

    expect(response.status).toBe(200)
  })

  it('syncs first-login users before their public profile row exists', async () => {
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/auth',
      createAuthRoutes({
        authDependencies: {
          findAnonymousSession: () => Promise.resolve(null),
          findUserByAuthSubject: () => Promise.resolve(null),
          verifyBearerToken: () =>
            Promise.resolve({
              email: 'new-owner@example.com',
              subject: 'new-user-id',
            }),
        },
        createAnonymousSession: () => Promise.reject(new Error('unused')),
        linkAnonymousSession: () => Promise.resolve(0),
        saveAnonymousEmail: () => Promise.resolve(true),
        syncUser: (input) => {
          expect(input).toEqual({
            email: 'new-owner@example.com',
            fullName: 'New Owner',
            userId: 'new-user-id',
          })
          return Promise.resolve()
        },
      }),
    )

    const response = await app.fetch(
      bearerRequest('/api/v1/auth/sync-user', {
        body: JSON.stringify({ full_name: 'New Owner' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
      routeTestEnv,
    )

    expect(response.status).toBe(200)
    await expect(jsonBody<unknown>(response)).resolves.toEqual({
      synced: true,
      user_id: 'new-user-id',
    })
  })
})
