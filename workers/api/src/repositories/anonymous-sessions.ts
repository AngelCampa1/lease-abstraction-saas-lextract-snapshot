import { randomUUID } from 'node:crypto'

import { createConfiguredDb } from './db'
import type { DbPoolLike } from './db'
import type { Env } from '../types'

const ANONYMOUS_SESSION_TTL_HOURS = 72

export interface AnonymousSessionResult {
  sessionToken: string
  expiresAt: string
}

export interface SaveAnonymousEmailInput {
  sessionToken: string
  email: string
}

export interface LinkAnonymousSessionInput {
  sessionToken: string
  userId: string
}

interface AnonymousSessionRow {
  id: string
  expires_at: Date | string
  linked_user_id: string | null
}

interface CountRow {
  count: string | number
}

function query(pool: DbPoolLike): NonNullable<DbPoolLike['query']> {
  if (!pool.query) {
    throw new Error('Database pool does not support query')
  }

  return pool.query.bind(pool)
}

function isoString(value: Date): string {
  return value.toISOString()
}

export async function createAnonymousSession(
  env: Env,
): Promise<AnonymousSessionResult> {
  const pool = createConfiguredDb(env)
  const sessionToken = randomUUID()
  const expiresAt = new Date(
    Date.now() + ANONYMOUS_SESSION_TTL_HOURS * 60 * 60 * 1000,
  )

  try {
    await query(pool)(
      `INSERT INTO anonymous_sessions (session_token, expires_at)
       VALUES ($1, $2)`,
      [sessionToken, isoString(expiresAt)],
    )

    return {
      expiresAt: isoString(expiresAt),
      sessionToken,
    }
  } finally {
    await pool.end()
  }
}

export async function saveAnonymousEmail(
  input: SaveAnonymousEmailInput,
  env: Env,
): Promise<boolean> {
  const pool = createConfiguredDb(env)
  try {
    const result = await query(pool)<AnonymousSessionRow>(
      `UPDATE anonymous_sessions
       SET email = $2
       WHERE session_token = $1
         AND linked_user_id IS NULL
         AND expires_at > NOW()
       RETURNING id, expires_at, linked_user_id`,
      [input.sessionToken, input.email],
    )

    return result.rows.length > 0
  } finally {
    await pool.end()
  }
}

export async function linkAnonymousSession(
  input: LinkAnonymousSessionInput,
  env: Env,
): Promise<number> {
  const pool = createConfiguredDb(env)
  try {
    await query(pool)('BEGIN')
    const sessions = await query(pool)<AnonymousSessionRow>(
      `SELECT id, expires_at, linked_user_id
       FROM anonymous_sessions
       WHERE session_token = $1
       FOR UPDATE`,
      [input.sessionToken],
    )
    const session = sessions.rows[0]
    if (!session) {
      await query(pool)('ROLLBACK')
      throw new AnonymousSessionNotFoundError()
    }

    const expiresAt = new Date(session.expires_at)
    if (expiresAt.getTime() <= Date.now()) {
      await query(pool)('ROLLBACK')
      throw new AnonymousSessionExpiredError()
    }

    if (
      session.linked_user_id !== null &&
      session.linked_user_id !== input.userId
    ) {
      await query(pool)('ROLLBACK')
      throw new AnonymousSessionConflictError()
    }

    if (session.linked_user_id === null) {
      await query(pool)(
        `UPDATE anonymous_sessions
         SET linked_user_id = $2
         WHERE id = $1`,
        [session.id, input.userId],
      )
    }

    const transferResult = await query(pool)<CountRow>(
      `WITH transferred AS (
         UPDATE extractions
         SET user_id = $2,
             anonymous_session_id = NULL,
             updated_at = NOW()
         WHERE anonymous_session_id = $1
           AND user_id IS NULL
         RETURNING id
       )
       SELECT COUNT(*) AS count FROM transferred`,
      [session.id, input.userId],
    )
    await query(pool)('COMMIT')

    return Number(transferResult.rows[0]?.count ?? 0)
  } catch (error) {
    if (
      !(error instanceof AnonymousSessionNotFoundError) &&
      !(error instanceof AnonymousSessionExpiredError) &&
      !(error instanceof AnonymousSessionConflictError)
    ) {
      await query(pool)('ROLLBACK')
    }
    throw error
  } finally {
    await pool.end()
  }
}

export class AnonymousSessionNotFoundError extends Error {
  constructor() {
    super('Anonymous session not found or already linked')
    this.name = 'AnonymousSessionNotFoundError'
  }
}

export class AnonymousSessionExpiredError extends Error {
  constructor() {
    super('Anonymous session has expired')
    this.name = 'AnonymousSessionExpiredError'
  }
}

export class AnonymousSessionConflictError extends Error {
  constructor() {
    super('Session was linked by another user - please try again')
    this.name = 'AnonymousSessionConflictError'
  }
}
