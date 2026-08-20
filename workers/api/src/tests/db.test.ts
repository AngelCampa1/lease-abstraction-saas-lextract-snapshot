import { describe, expect, it } from 'vitest'

import {
  configureDefaultPgModuleLoader,
  configureDbPoolProvider,
  createConfiguredDb,
  createDb,
  createPgPoolProvider,
  missingHyperdriveMessage,
} from '../repositories/db'
import type {
  DbPoolConfig,
  DbPoolLike,
  DbPoolProvider,
  HyperdriveBinding,
} from '../repositories/db'
import type { Env } from '../types'

class FakePool implements DbPoolLike {
  readonly config: DbPoolConfig

  constructor(config: DbPoolConfig) {
    this.config = config
  }

  async end(): Promise<void> {
    return Promise.resolve()
  }
}

class QueryableFakePool extends FakePool {
  ended = false
  readonly queries: { text: string; values?: readonly unknown[] }[] = []

  override async end(): Promise<void> {
    this.ended = true
  }

  async query<Row>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Row[] }> {
    if (values === undefined) {
      this.queries.push({ text })
    } else {
      this.queries.push({ text, values })
    }
    return { rows: [{ id: 'row-id' }] as Row[] }
  }
}

const poolProvider: DbPoolProvider<FakePool> = {
  createPool: (config: DbPoolConfig) => new FakePool(config),
}

const hyperdrive: HyperdriveBinding = {
  connectionString: 'postgres://user:pass@example.com:5432/lextract',
}

describe('createDb', () => {
  it('constructs a pg-compatible pool from the Hyperdrive connection string', () => {
    const env: Env = {
      ENVIRONMENT: 'test',
      FRONTEND_URL: 'https://lextract.io',
      // Hyperdrive exposes more runtime properties; this adapter only consumes
      // the connection string, so the test uses the narrower contract.
      HYPERDRIVE: hyperdrive as Hyperdrive,
    }

    const pool = createDb(env, poolProvider)

    expect(pool.config).toEqual({
      connectionString: 'postgres://user:pass@example.com:5432/lextract',
    })
  })

  it('fails before constructing a pool when Hyperdrive is missing', () => {
    const env: Env = {
      ENVIRONMENT: 'test',
      FRONTEND_URL: 'https://lextract.io',
    }

    expect(() => createDb(env, poolProvider)).toThrow(missingHyperdriveMessage)
  })

  it('creates a default pg pool from Hyperdrive without prior provider configuration', () => {
    configureDbPoolProvider(null)

    const pool = createConfiguredDb({
      ENVIRONMENT: 'test',
      FRONTEND_URL: 'https://lextract.io',
      // Hyperdrive exposes more runtime properties; this adapter only consumes
      // the connection string, so the test uses the narrower contract.
      HYPERDRIVE: hyperdrive as Hyperdrive,
    })

    expect(pool).toHaveProperty('query')
    expect(pool).toHaveProperty('end')
  })

  it('lazily loads the default pg module on first query', async () => {
    configureDbPoolProvider(null)
    const createdPools: QueryableFakePool[] = []
    configureDefaultPgModuleLoader(() =>
      Promise.resolve({
        Pool: class extends QueryableFakePool {
          constructor(config: DbPoolConfig) {
            super(config)
            createdPools.push(this)
          }
        },
      }),
    )
    const pool = createConfiguredDb({
      ENVIRONMENT: 'test',
      FRONTEND_URL: 'https://lextract.io',
      // Hyperdrive exposes more runtime properties; this adapter only consumes
      // the connection string, so the test uses the narrower contract.
      HYPERDRIVE: hyperdrive as Hyperdrive,
    })
    if (!pool.query) {
      throw new Error('Expected lazy pg pool to expose query')
    }

    const result = await pool.query<{ id: string }>(
      'SELECT id FROM users WHERE id = $1',
      ['row-id'],
    )
    await pool.query<{ id: string }>('SELECT id FROM users')
    await pool.end()
    const createdPool = createdPools[0]
    if (!createdPool) {
      throw new Error('Expected lazy pg pool to create pg pool')
    }

    expect(result.rows).toEqual([{ id: 'row-id' }])
    expect(createdPool.config.connectionString).toBe(
      'postgres://user:pass@example.com:5432/lextract',
    )
    expect(createdPool.queries).toEqual([
      { text: 'SELECT id FROM users WHERE id = $1', values: ['row-id'] },
      { text: 'SELECT id FROM users', values: [] },
    ])
    expect(createdPool.ended).toBe(true)
  })

  it('does not load pg when ending an unused lazy pool', async () => {
    configureDbPoolProvider(null)
    let loadCount = 0
    configureDefaultPgModuleLoader(() => {
      loadCount += 1
      return Promise.resolve({ Pool: QueryableFakePool })
    })
    const pool = createConfiguredDb({
      ENVIRONMENT: 'test',
      FRONTEND_URL: 'https://lextract.io',
      // Hyperdrive exposes more runtime properties; this adapter only consumes
      // the connection string, so the test uses the narrower contract.
      HYPERDRIVE: hyperdrive as Hyperdrive,
    })

    await pool.end()

    expect(loadCount).toBe(0)
  })

  it('fails clearly when the default pg module has no Pool constructor', async () => {
    configureDbPoolProvider(null)
    configureDefaultPgModuleLoader(() => Promise.resolve({}))
    const pool = createConfiguredDb({
      ENVIRONMENT: 'test',
      FRONTEND_URL: 'https://lextract.io',
      // Hyperdrive exposes more runtime properties; this adapter only consumes
      // the connection string, so the test uses the narrower contract.
      HYPERDRIVE: hyperdrive as Hyperdrive,
    })

    await expect(pool.query?.('SELECT 1')).rejects.toThrow(/Pool constructor/i)
  })

  it('builds a provider around the pg Pool constructor', () => {
    class PgCompatiblePool extends FakePool {}

    const provider = createPgPoolProvider({ Pool: PgCompatiblePool })
    const pool = provider.createPool({
      connectionString: 'postgres://user:pass@example.com:5432/lextract',
    })

    expect(pool.config.connectionString).toBe(
      'postgres://user:pass@example.com:5432/lextract',
    )
  })

  it('creates configured db pools after a provider is registered', () => {
    configureDbPoolProvider(poolProvider)

    const pool = createConfiguredDb({
      ENVIRONMENT: 'test',
      FRONTEND_URL: 'https://lextract.io',
      // Hyperdrive exposes more runtime properties; this adapter only consumes
      // the connection string, so the test uses the narrower contract.
      HYPERDRIVE: hyperdrive as Hyperdrive,
    })

    expect(pool).toBeInstanceOf(FakePool)
  })
})
