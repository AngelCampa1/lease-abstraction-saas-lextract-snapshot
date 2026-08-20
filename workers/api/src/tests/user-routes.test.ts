import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'

import { createUserRoutes } from '../routes/user'
import { EmptyProfileUpdateError } from '../repositories/users'
import type { UserProfile } from '../repositories/users'
import type { AuthDependencies } from '../services/neon-auth'
import type { AppBindings } from '../types'
import { bearerRequest, jsonBody, routeTestEnv } from './route-test-helpers'

const userRow = {
  company: 'Lextract',
  createdAt: '2026-06-01T12:00:00.000Z',
  creditsBalance: 3,
  email: 'owner@example.com',
  fullName: 'Owner Name',
  id: 'user-id',
  role: 'attorney',
  updatedAt: '2026-06-02T12:00:00.000Z',
} satisfies UserProfile

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

describe('user routes', () => {
  it('returns the authenticated user profile', async () => {
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/user',
      createUserRoutes({
        authDependencies: authDependencies(),
        deleteAccount: () => Promise.resolve(),
        getDashboard: () => Promise.reject(new Error('unused')),
        getUserProfile: () => Promise.resolve(userRow),
        updateUserProfile: () => Promise.resolve(userRow),
      }),
    )

    const response = await app.fetch(
      bearerRequest('/api/v1/user/profile'),
      routeTestEnv,
    )

    expect(response.status).toBe(200)
    await expect(jsonBody<unknown>(response)).resolves.toEqual({
      company: 'Lextract',
      created_at: '2026-06-01T12:00:00.000Z',
      credits_balance: 3,
      email: 'owner@example.com',
      full_name: 'Owner Name',
      id: 'user-id',
      role: 'attorney',
      updated_at: '2026-06-02T12:00:00.000Z',
    })
  })

  it('returns 404 when the authenticated user row is missing', async () => {
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/user',
      createUserRoutes({
        authDependencies: authDependencies(),
        deleteAccount: () => Promise.resolve(),
        getDashboard: () => Promise.reject(new Error('unused')),
        getUserProfile: () => Promise.resolve(null),
        updateUserProfile: () => Promise.resolve(userRow),
      }),
    )

    const response = await app.fetch(
      bearerRequest('/api/v1/user/profile'),
      routeTestEnv,
    )

    expect(response.status).toBe(404)
    await expect(jsonBody<unknown>(response)).resolves.toEqual({
      detail: 'User not found',
    })
  })

  it('updates allowed user profile fields', async () => {
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/user',
      createUserRoutes({
        authDependencies: authDependencies(),
        deleteAccount: () => Promise.resolve(),
        getDashboard: () => Promise.reject(new Error('unused')),
        getUserProfile: () => Promise.resolve(userRow),
        updateUserProfile: (input) => {
          expect(input).toEqual({
            company: 'ACME',
            fullName: 'Owner Name',
            role: 'broker',
            userId: 'user-id',
          })
          return Promise.resolve({ ...userRow, company: 'ACME', role: 'broker' })
        },
      }),
    )

    const response = await app.fetch(
      bearerRequest('/api/v1/user/profile', {
        body: JSON.stringify({
          company: 'ACME',
          full_name: 'Owner Name',
          role: 'broker',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      }),
      routeTestEnv,
    )

    expect(response.status).toBe(200)
    await expect(jsonBody<unknown>(response)).resolves.toEqual({
      company: 'ACME',
      credits_balance: 3,
      email: 'owner@example.com',
      full_name: 'Owner Name',
      id: 'user-id',
      role: 'broker',
      updated_at: '2026-06-02T12:00:00.000Z',
    })
  })

  it('rejects empty profile updates', async () => {
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/user',
      createUserRoutes({
        authDependencies: authDependencies(),
        deleteAccount: () => Promise.resolve(),
        getDashboard: () => Promise.reject(new Error('unused')),
        getUserProfile: () => Promise.resolve(userRow),
        updateUserProfile: () => Promise.resolve(userRow),
      }),
    )

    const response = await app.fetch(
      bearerRequest('/api/v1/user/profile', {
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      }),
      routeTestEnv,
    )

    expect(response.status).toBe(400)
    await expect(jsonBody<unknown>(response)).resolves.toEqual({
      detail: 'No fields to update',
    })
  })

  it('maps repository empty profile update errors to 400', async () => {
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/user',
      createUserRoutes({
        authDependencies: authDependencies(),
        deleteAccount: () => Promise.resolve(),
        getDashboard: () => Promise.reject(new Error('unused')),
        getUserProfile: () => Promise.resolve(userRow),
        updateUserProfile: () =>
          Promise.reject(new EmptyProfileUpdateError()),
      }),
    )

    const response = await app.fetch(
      bearerRequest('/api/v1/user/profile', {
        body: JSON.stringify({ full_name: 'Owner Name' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      }),
      routeTestEnv,
    )

    expect(response.status).toBe(400)
  })

  it('returns 404 when updated user row is missing', async () => {
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/user',
      createUserRoutes({
        authDependencies: authDependencies(),
        deleteAccount: () => Promise.resolve(),
        getDashboard: () => Promise.reject(new Error('unused')),
        getUserProfile: () => Promise.resolve(userRow),
        updateUserProfile: () => Promise.resolve(null),
      }),
    )

    const response = await app.fetch(
      bearerRequest('/api/v1/user/profile', {
        body: JSON.stringify({ company: 'ACME' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      }),
      routeTestEnv,
    )

    expect(response.status).toBe(404)
    await expect(jsonBody<unknown>(response)).resolves.toEqual({
      detail: 'User not found',
    })
  })

  it('returns dashboard summary', async () => {
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/user',
      createUserRoutes({
        authDependencies: authDependencies(),
        deleteAccount: () => Promise.resolve(),
        getDashboard: (userId) => {
          expect(userId).toBe('user-id')
          return Promise.resolve({
            creditBalance: 3,
            extractionCount: 9,
            quickStats: { completed: 4, failed: 1, processing: 2 },
            recentExtractions: [
              {
                createdAt: '2026-06-10T12:00:00.000Z',
                documentFilename: 'lease.pdf',
                id: 'extraction-id',
                paymentStatus: 'paid',
                status: 'complete',
              },
            ],
          })
        },
        getUserProfile: () => Promise.resolve(userRow),
        updateUserProfile: () => Promise.resolve(userRow),
      }),
    )

    const response = await app.fetch(
      bearerRequest('/api/v1/user/dashboard'),
      routeTestEnv,
    )

    expect(response.status).toBe(200)
    await expect(jsonBody<unknown>(response)).resolves.toEqual({
      credit_balance: 3,
      extraction_count: 9,
      quick_stats: { completed: 4, failed: 1, processing: 2 },
      recent_extractions: [
        {
          created_at: '2026-06-10T12:00:00.000Z',
          document_filename: 'lease.pdf',
          id: 'extraction-id',
          payment_status: 'paid',
          status: 'complete',
        },
      ],
    })
  })

  it('soft deletes the authenticated account', async () => {
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/user',
      createUserRoutes({
        authDependencies: authDependencies(),
        deleteAccount: (userId) => {
          expect(userId).toBe('user-id')
          return Promise.resolve()
        },
        getDashboard: () => Promise.reject(new Error('unused')),
        getUserProfile: () => Promise.resolve(userRow),
        updateUserProfile: () => Promise.resolve(userRow),
      }),
    )

    const response = await app.fetch(
      bearerRequest('/api/v1/user', { method: 'DELETE' }),
      routeTestEnv,
    )

    expect(response.status).toBe(204)
    expect(await response.text()).toBe('')
  })
})
