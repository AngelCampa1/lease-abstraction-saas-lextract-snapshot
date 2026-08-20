import { Hono } from 'hono'
import { z } from 'zod'
import type { Context } from 'hono'

import {
  EmptyProfileUpdateError,
  deleteAccount,
  getDashboard,
  getUserProfile,
  updateUserProfile,
} from '../repositories/users'
import type {
  DashboardSummary,
  UpdateUserProfileInput,
  UserProfile,
} from '../repositories/users'
import { createRequireUserAuth } from '../middleware/auth'
import type { AuthContext } from '../services/neon-auth'
import type { AuthDependencies } from '../services/neon-auth'
import type { AppBindings, Env } from '../types'

const roleSchema = z.enum([
  'tenant_rep',
  'broker',
  'attorney',
  'landlord',
  'investor',
  'other',
])

const updateProfileSchema = z.object({
  company: z.string().max(200).optional().nullable(),
  full_name: z.string().max(200).optional().nullable(),
  role: roleSchema.optional().nullable(),
})

export interface UserRouteDependencies {
  authDependencies?: AuthDependencies
  getUserProfile(userId: string, env: Env): Promise<UserProfile | null>
  updateUserProfile(
    input: UpdateUserProfileInput,
    env: Env,
  ): Promise<UserProfile | null>
  getDashboard(userId: string, env: Env): Promise<DashboardSummary>
  deleteAccount(userId: string, env: Env): Promise<void>
}

type UserAuthContext = Extract<AuthContext, { kind: 'user' }>

function currentUser(c: Context<AppBindings>): UserAuthContext {
  // Safe because every user route is behind createRequireUserAuth middleware.
  return c.get('authContext') as UserAuthContext
}

export function defaultUserRouteDependencies(): UserRouteDependencies {
  return {
    deleteAccount,
    getDashboard,
    getUserProfile,
    updateUserProfile,
  }
}

function profileResponse(profile: UserProfile): Record<string, unknown> {
  return {
    company: profile.company,
    created_at: profile.createdAt,
    credits_balance: profile.creditsBalance,
    email: profile.email,
    full_name: profile.fullName,
    id: profile.id,
    role: profile.role,
    updated_at: profile.updatedAt,
  }
}

function updateProfileResponse(profile: UserProfile): Record<string, unknown> {
  return {
    company: profile.company,
    credits_balance: profile.creditsBalance,
    email: profile.email,
    full_name: profile.fullName,
    id: profile.id,
    role: profile.role,
    updated_at: profile.updatedAt,
  }
}

function dashboardResponse(summary: DashboardSummary): Record<string, unknown> {
  return {
    credit_balance: summary.creditBalance,
    extraction_count: summary.extractionCount,
    quick_stats: summary.quickStats,
    recent_extractions: summary.recentExtractions.map((extraction) => ({
      created_at: extraction.createdAt,
      document_filename: extraction.documentFilename,
      id: extraction.id,
      payment_status: extraction.paymentStatus,
      status: extraction.status,
    })),
  }
}

export function createUserRoutes(
  dependencies: UserRouteDependencies = defaultUserRouteDependencies(),
): Hono<AppBindings> {
  const user = new Hono<AppBindings>()
  const requireUser = createRequireUserAuth(dependencies.authDependencies)

  user.use('*', requireUser)

  user.get('/profile', async (c) => {
    const authContext = currentUser(c)

    const profile = await dependencies.getUserProfile(authContext.id, c.env)
    if (!profile) {
      return c.json({ detail: 'User not found' }, 404)
    }

    return c.json(profileResponse(profile))
  })

  user.patch('/profile', async (c) => {
    const authContext = currentUser(c)

    const body = updateProfileSchema.parse(await c.req.json())
    const input: UpdateUserProfileInput = { userId: authContext.id }
    if (body.full_name !== undefined && body.full_name !== null) {
      input.fullName = body.full_name
    }
    if (body.company !== undefined && body.company !== null) {
      input.company = body.company
    }
    if (body.role !== undefined && body.role !== null) {
      input.role = body.role
    }
    if (
      input.fullName === undefined &&
      input.company === undefined &&
      input.role === undefined
    ) {
      return c.json({ detail: 'No fields to update' }, 400)
    }

    try {
      const profile = await dependencies.updateUserProfile(input, c.env)
      if (!profile) {
        return c.json({ detail: 'User not found' }, 404)
      }

      return c.json(updateProfileResponse(profile))
    } catch (error) {
      if (error instanceof EmptyProfileUpdateError) {
        return c.json({ detail: error.message }, 400)
      }
      throw error
    }
  })

  user.get('/dashboard', async (c) => {
    const authContext = currentUser(c)

    return c.json(
      dashboardResponse(await dependencies.getDashboard(authContext.id, c.env)),
    )
  })

  user.delete('', async (c) => {
    const authContext = currentUser(c)

    await dependencies.deleteAccount(authContext.id, c.env)
    return c.body(null, 204)
  })

  return user
}

export const userRoutes = createUserRoutes()
