import { afterEach, describe, expect, it } from 'vitest'

import {
  AnonymousSessionConflictError,
  AnonymousSessionExpiredError,
  AnonymousSessionNotFoundError,
  createAnonymousSession,
  linkAnonymousSession,
  saveAnonymousEmail,
} from '../repositories/anonymous-sessions'
import { configureDbPoolProvider } from '../repositories/db'
import type { DbPoolConfig, DbPoolLike, DbQueryResult } from '../repositories/db'
import {
  EmptyProfileUpdateError,
  deleteAccount,
  getDashboard,
  getUserProfile,
  syncUser,
  updateUserProfile,
} from '../repositories/users'
import type { Env } from '../types'

const env: Env = {
  ENVIRONMENT: 'test',
  FRONTEND_URL: 'https://lextract.io',
  HYPERDRIVE: {
    connectionString: 'postgres://user:pass@example.com:5432/lextract',
  } as Hyperdrive,
}

class SequencePool implements DbPoolLike {
  ended = false
  readonly queries: { text: string; values?: readonly unknown[] }[] = []

  constructor(private readonly results: readonly (readonly unknown[])[]) {}

  async end(): Promise<void> {
    this.ended = true
  }

  async query<Row>(
    text: string,
    values?: readonly unknown[],
  ): Promise<DbQueryResult<Row>> {
    this.queries.push(values === undefined ? { text } : { text, values })
    const next = this.results[this.queries.length - 1] ?? []
    return { rows: next as Row[] }
  }
}

function configurePool(pool: SequencePool): void {
  configureDbPoolProvider({
    createPool: (_config: DbPoolConfig) => pool,
  })
}

afterEach(() => {
  configureDbPoolProvider(null)
})

describe('anonymous session repository', () => {
  it('creates anonymous sessions with insert-only SQL', async () => {
    const pool = new SequencePool([[]])
    configurePool(pool)

    const session = await createAnonymousSession(env)

    expect(session.sessionToken).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
    expect(new Date(session.expiresAt).getTime()).toBeGreaterThan(Date.now())
    expect(pool.queries[0]?.text).toContain('INSERT INTO anonymous_sessions')
    expect(pool.ended).toBe(true)
  })

  it('saves anonymous email only for active unlinked sessions', async () => {
    const pool = new SequencePool([[{ id: 'session-id' }]])
    configurePool(pool)

    await expect(
      saveAnonymousEmail(
        { email: 'guest@example.com', sessionToken: 'session-token' },
        env,
      ),
    ).resolves.toBe(true)

    expect(pool.queries[0]?.text).toContain('linked_user_id IS NULL')
    expect(pool.queries[0]?.values).toEqual([
      'session-token',
      'guest@example.com',
    ])
  })

  it('returns false when anonymous email cannot be saved', async () => {
    const pool = new SequencePool([[]])
    configurePool(pool)

    await expect(
      saveAnonymousEmail(
        { email: 'guest@example.com', sessionToken: 'missing-token' },
        env,
      ),
    ).resolves.toBe(false)
  })

  it('links anonymous sessions and transfers extractions transactionally', async () => {
    const pool = new SequencePool([
      [],
      [
        {
          expires_at: new Date(Date.now() + 60_000),
          id: 'session-id',
          linked_user_id: null,
        },
      ],
      [],
      [{ count: '2' }],
      [],
    ])
    configurePool(pool)

    await expect(
      linkAnonymousSession(
        { sessionToken: 'session-token', userId: 'user-id' },
        env,
      ),
    ).resolves.toBe(2)

    expect(pool.queries.map((query) => query.text.trim().split(/\s+/)[0])).toEqual([
      'BEGIN',
      'SELECT',
      'UPDATE',
      'WITH',
      'COMMIT',
    ])
  })

  it('treats already-linked sessions for the same user as idempotent', async () => {
    const pool = new SequencePool([
      [],
      [
        {
          expires_at: new Date(Date.now() + 60_000),
          id: 'session-id',
          linked_user_id: 'user-id',
        },
      ],
      [{ count: 0 }],
      [],
    ])
    configurePool(pool)

    await expect(
      linkAnonymousSession(
        { sessionToken: 'session-token', userId: 'user-id' },
        env,
      ),
    ).resolves.toBe(0)
  })

  it('rejects missing anonymous sessions', async () => {
    const pool = new SequencePool([[], []])
    configurePool(pool)

    await expect(
      linkAnonymousSession(
        { sessionToken: 'missing-token', userId: 'user-id' },
        env,
      ),
    ).rejects.toBeInstanceOf(AnonymousSessionNotFoundError)
  })

  it('rejects expired anonymous sessions', async () => {
    const pool = new SequencePool([
      [],
      [
        {
          expires_at: new Date(Date.now() - 60_000),
          id: 'session-id',
          linked_user_id: null,
        },
      ],
    ])
    configurePool(pool)

    await expect(
      linkAnonymousSession(
        { sessionToken: 'expired-token', userId: 'user-id' },
        env,
      ),
    ).rejects.toBeInstanceOf(AnonymousSessionExpiredError)
  })

  it('rejects sessions linked to another user', async () => {
    const pool = new SequencePool([
      [],
      [
        {
          expires_at: new Date(Date.now() + 60_000),
          id: 'session-id',
          linked_user_id: 'other-user-id',
        },
      ],
    ])
    configurePool(pool)

    await expect(
      linkAnonymousSession(
        { sessionToken: 'session-token', userId: 'user-id' },
        env,
      ),
    ).rejects.toBeInstanceOf(AnonymousSessionConflictError)
  })
})

describe('users repository', () => {
  it('syncs users with verified email and optional full name', async () => {
    const pool = new SequencePool([[]])
    configurePool(pool)

    await syncUser(
      {
        email: 'owner@example.com',
        fullName: 'Owner Name',
        userId: 'user-id',
      },
      env,
    )

    expect(pool.queries[0]?.text).toContain('ON CONFLICT (id) DO UPDATE')
    expect(pool.queries[0]?.values).toEqual([
      'user-id',
      'owner@example.com',
      'Owner Name',
    ])
  })

  it('syncs users without clobbering full name when omitted', async () => {
    const pool = new SequencePool([[]])
    configurePool(pool)

    await syncUser({ email: 'owner@example.com', userId: 'user-id' }, env)

    expect(pool.queries[0]?.text).not.toContain('full_name = EXCLUDED.full_name')
    expect(pool.queries[0]?.values).toEqual(['user-id', 'owner@example.com'])
  })

  it('loads user profiles and maps snake case rows', async () => {
    const pool = new SequencePool([
      [
        {
          company: 'Lextract',
          created_at: '2026-06-01T12:00:00.000Z',
          credits_balance: 5,
          email: 'owner@example.com',
          full_name: 'Owner Name',
          id: 'user-id',
          role: 'attorney',
          updated_at: '2026-06-02T12:00:00.000Z',
        },
      ],
    ])
    configurePool(pool)

    await expect(getUserProfile('user-id', env)).resolves.toMatchObject({
      creditsBalance: 5,
      fullName: 'Owner Name',
      role: 'attorney',
    })
  })

  it('returns null when a user profile is missing', async () => {
    const pool = new SequencePool([[]])
    configurePool(pool)

    await expect(getUserProfile('missing-user', env)).resolves.toBeNull()
  })

  it('updates user profiles with only changed fields', async () => {
    const pool = new SequencePool([
      [
        {
          company: 'ACME',
          created_at: new Date('2026-06-01T12:00:00.000Z'),
          credits_balance: 5,
          email: 'owner@example.com',
          full_name: 'Owner Name',
          id: 'user-id',
          role: 'broker',
          updated_at: new Date('2026-06-02T12:00:00.000Z'),
        },
      ],
    ])
    configurePool(pool)

    await expect(
      updateUserProfile(
        {
          company: 'ACME',
          fullName: 'Owner Name',
          role: 'broker',
          userId: 'user-id',
        },
        env,
      ),
    ).resolves.toMatchObject({ company: 'ACME', role: 'broker' })

    expect(pool.queries[0]?.values).toEqual([
      'Owner Name',
      'ACME',
      'broker',
      'user-id',
    ])
  })

  it('rejects empty profile update payloads', async () => {
    await expect(
      updateUserProfile({ userId: 'user-id' }, env),
    ).rejects.toBeInstanceOf(EmptyProfileUpdateError)
  })

  it('loads dashboard counts and recent extractions', async () => {
    const pool = new SequencePool([
      [{ credits_balance: 7 }],
      [{ count: '10' }],
      [{ count: '4' }],
      [{ count: '1' }],
      [{ count: '2' }],
      [
        {
          created_at: '2026-06-10T12:00:00.000Z',
          document_filename: 'lease.pdf',
          id: 'extraction-id',
          payment_status: 'paid',
          status: 'complete',
        },
      ],
    ])
    configurePool(pool)

    await expect(getDashboard('user-id', env)).resolves.toEqual({
      creditBalance: 7,
      extractionCount: 10,
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
  })

  it('soft deletes accounts and queues cleanup IDs only', async () => {
    const messages: unknown[] = []
    const pool = new SequencePool([[], [], []])
    configurePool(pool)
    const cleanupQueue: Queue = {
      metrics: () =>
        Promise.resolve({
          backlogBytes: 0,
          backlogCount: 0,
        }),
      send: (message: unknown) => {
        messages.push(message)
        return Promise.resolve({
          metadata: { metrics: { backlogBytes: 0, backlogCount: 0 } },
        })
      },
      sendBatch: () =>
        Promise.resolve({
          metadata: { metrics: { backlogBytes: 0, backlogCount: 0 } },
        }),
    }

    await deleteAccount('user-id', {
      ...env,
      CLEANUP_QUEUE: cleanupQueue,
    })

    expect(pool.queries.map((query) => query.text.trim().split(/\s+/)[0])).toEqual([
      'BEGIN',
      'UPDATE',
      'UPDATE',
      'COMMIT',
    ])
    expect(messages).toEqual([{ kind: 'user', userId: 'user-id' }])
  })
})
