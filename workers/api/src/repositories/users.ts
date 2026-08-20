import { createConfiguredDb } from './db'
import type { DbPoolLike } from './db'
import type { Env } from '../types'

export type UserRole =
  | 'tenant_rep'
  | 'broker'
  | 'attorney'
  | 'landlord'
  | 'investor'
  | 'other'

export interface SyncUserInput {
  userId: string
  email: string | null
  fullName?: string
}

export interface UserProfile {
  id: string
  email: string
  fullName: string | null
  company: string | null
  role: UserRole | null
  creditsBalance: number
  createdAt: string
  updatedAt: string
}

export interface UpdateUserProfileInput {
  userId: string
  fullName?: string
  company?: string
  role?: UserRole
}

export interface RecentExtraction {
  id: string
  documentFilename: string
  status: string
  paymentStatus: string
  createdAt: string
}

export interface QuickStats {
  completed: number
  processing: number
  failed: number
}

export interface DashboardSummary {
  extractionCount: number
  creditBalance: number
  recentExtractions: readonly RecentExtraction[]
  quickStats: QuickStats
}

interface UserProfileRow {
  id: string
  email: string
  full_name: string | null
  company: string | null
  role: UserRole | null
  credits_balance: number
  created_at: Date | string
  updated_at: Date | string
}

interface CountRow {
  count: string | number
}

interface RecentExtractionRow {
  id: string
  document_filename: string
  status: string
  payment_status: string
  created_at: Date | string
}

function query(pool: DbPoolLike): NonNullable<DbPoolLike['query']> {
  if (!pool.query) {
    throw new Error('Database pool does not support query')
  }

  return pool.query.bind(pool)
}

function dateString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}

function mapUserProfile(row: UserProfileRow): UserProfile {
  return {
    company: row.company,
    createdAt: dateString(row.created_at),
    creditsBalance: row.credits_balance,
    email: row.email,
    fullName: row.full_name,
    id: row.id,
    role: row.role,
    updatedAt: dateString(row.updated_at),
  }
}

function mapRecentExtraction(row: RecentExtractionRow): RecentExtraction {
  return {
    createdAt: dateString(row.created_at),
    documentFilename: row.document_filename,
    id: row.id,
    paymentStatus: row.payment_status,
    status: row.status,
  }
}

function numberFromCount(row: CountRow | undefined): number {
  return Number(row?.count ?? 0)
}

export async function syncUser(input: SyncUserInput, env: Env): Promise<void> {
  const pool = createConfiguredDb(env)
  try {
    const fullNameColumns =
      input.fullName === undefined ? '' : ', full_name = EXCLUDED.full_name'
    const columns =
      input.fullName === undefined
        ? '(id, email)'
        : '(id, email, full_name)'
    const values =
      input.fullName === undefined ? '($1, $2)' : '($1, $2, $3)'
    const params =
      input.fullName === undefined
        ? [input.userId, input.email]
        : [input.userId, input.email, input.fullName]

    await query(pool)(
      `INSERT INTO users ${columns}
       VALUES ${values}
       ON CONFLICT (id) DO UPDATE
       SET email = EXCLUDED.email${fullNameColumns},
           updated_at = NOW()`,
      params,
    )
  } finally {
    await pool.end()
  }
}

export async function getUserProfile(
  userId: string,
  env: Env,
): Promise<UserProfile | null> {
  const pool = createConfiguredDb(env)
  try {
    const result = await query(pool)<UserProfileRow>(
      `SELECT id, email, full_name, company, role, credits_balance,
              created_at, updated_at
       FROM users
       WHERE id = $1
         AND deleted_at IS NULL
       LIMIT 1`,
      [userId],
    )

    return result.rows[0] === undefined ? null : mapUserProfile(result.rows[0])
  } finally {
    await pool.end()
  }
}

export async function updateUserProfile(
  input: UpdateUserProfileInput,
  env: Env,
): Promise<UserProfile | null> {
  const updates: string[] = []
  const params: unknown[] = []

  if (input.fullName !== undefined) {
    params.push(input.fullName)
    updates.push(`full_name = $${params.length}`)
  }
  if (input.company !== undefined) {
    params.push(input.company)
    updates.push(`company = $${params.length}`)
  }
  if (input.role !== undefined) {
    params.push(input.role)
    updates.push(`role = $${params.length}`)
  }
  if (updates.length === 0) {
    throw new EmptyProfileUpdateError()
  }

  params.push(input.userId)
  const pool = createConfiguredDb(env)
  try {
    const result = await query(pool)<UserProfileRow>(
      `UPDATE users
       SET ${updates.join(', ')},
           updated_at = NOW()
       WHERE id = $${params.length}
         AND deleted_at IS NULL
       RETURNING id, email, full_name, company, role, credits_balance,
                 created_at, updated_at`,
      params,
    )

    return result.rows[0] === undefined ? null : mapUserProfile(result.rows[0])
  } finally {
    await pool.end()
  }
}

export async function getDashboard(
  userId: string,
  env: Env,
): Promise<DashboardSummary> {
  const pool = createConfiguredDb(env)
  try {
    const user = await query(pool)<{ credits_balance: number }>(
      `SELECT credits_balance
       FROM users
       WHERE id = $1
         AND deleted_at IS NULL
       LIMIT 1`,
      [userId],
    )
    const creditBalance = user.rows[0]?.credits_balance ?? 0
    const total = await query(pool)<CountRow>(
      `SELECT COUNT(*) AS count
       FROM extractions
       WHERE user_id = $1
         AND deleted_at IS NULL`,
      [userId],
    )
    const completed = await query(pool)<CountRow>(
      `SELECT COUNT(*) AS count
       FROM extractions
       WHERE user_id = $1
         AND deleted_at IS NULL
         AND status = 'complete'`,
      [userId],
    )
    const failed = await query(pool)<CountRow>(
      `SELECT COUNT(*) AS count
       FROM extractions
       WHERE user_id = $1
         AND deleted_at IS NULL
         AND status = 'failed'`,
      [userId],
    )
    const processing = await query(pool)<CountRow>(
      `SELECT COUNT(*) AS count
       FROM extractions
       WHERE user_id = $1
         AND deleted_at IS NULL
         AND status IN ('uploading', 'extracting', 'scoring')`,
      [userId],
    )
    const recent = await query(pool)<RecentExtractionRow>(
      `SELECT id, document_filename, status, payment_status, created_at
       FROM extractions
       WHERE user_id = $1
         AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 5`,
      [userId],
    )

    return {
      creditBalance,
      extractionCount: numberFromCount(total.rows[0]),
      quickStats: {
        completed: numberFromCount(completed.rows[0]),
        failed: numberFromCount(failed.rows[0]),
        processing: numberFromCount(processing.rows[0]),
      },
      recentExtractions: recent.rows.map(mapRecentExtraction),
    }
  } finally {
    await pool.end()
  }
}

export async function deleteAccount(userId: string, env: Env): Promise<void> {
  const pool = createConfiguredDb(env)
  try {
    await query(pool)('BEGIN')
    await query(pool)(
      `UPDATE users
       SET deleted_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
         AND deleted_at IS NULL`,
      [userId],
    )
    await query(pool)(
      `UPDATE extractions
       SET deleted_at = NOW(),
           updated_at = NOW()
       WHERE user_id = $1
         AND deleted_at IS NULL`,
      [userId],
    )
    await query(pool)('COMMIT')
    if (env.CLEANUP_QUEUE) {
      await env.CLEANUP_QUEUE.send({ kind: 'user', userId })
    }
  } catch (error) {
    await query(pool)('ROLLBACK')
    throw error
  } finally {
    await pool.end()
  }
}

export class EmptyProfileUpdateError extends Error {
  constructor() {
    super('No fields to update')
    this.name = 'EmptyProfileUpdateError'
  }
}
