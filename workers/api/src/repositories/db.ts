import type { Pool as PgPool } from 'pg'

import type { Env } from '../types'

export const missingHyperdriveMessage = 'HYPERDRIVE binding is required'

export interface DbPoolConfig {
  connectionString: string
}

export interface HyperdriveBinding {
  connectionString: string
}

export interface DbQueryResult<Row> {
  rows: Row[]
}

export interface DbPoolLike {
  end(): Promise<void>
  query?<Row>(text: string, values?: readonly unknown[]): Promise<DbQueryResult<Row>>
}

export interface DbPoolProvider<Pool extends DbPoolLike = DbPoolLike> {
  createPool(config: DbPoolConfig): Pool
}

export interface UserAuthRow {
  id: string
  email: string | null
}

export interface AnonymousSessionAuthRow {
  id: string
  session_token: string
  linked_user_id: string | null
  email: string | null
  expires_at: Date | string
}

export interface PgModule<Pool extends DbPoolLike> {
  Pool: new (config: DbPoolConfig) => Pool
}

let configuredPoolProvider: DbPoolProvider | null = null
let configuredPgModuleLoader: (() => Promise<unknown>) | null = null

export function createPgPoolProvider<Pool extends DbPoolLike>(
  pgModule: PgModule<Pool>,
): DbPoolProvider<Pool> {
  return {
    createPool: (config: DbPoolConfig) => new pgModule.Pool(config),
  }
}

export function configureDbPoolProvider(provider: DbPoolProvider | null): void {
  configuredPoolProvider = provider
}

export function configureDefaultPgModuleLoader(
  loader: () => Promise<unknown>,
): void {
  configuredPgModuleLoader = loader
}

function isPgModule(value: unknown): value is PgModule<PgPool> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'Pool' in value &&
    typeof value.Pool === 'function'
  )
}

async function loadDefaultPgPoolProvider(): Promise<DbPoolProvider<PgPool>> {
  const pgModule: unknown =
    configuredPgModuleLoader === null
      ? await import('pg')
      : await configuredPgModuleLoader()
  if (!isPgModule(pgModule)) {
    throw new Error('pg module did not expose a Pool constructor')
  }

  return createPgPoolProvider(pgModule)
}

class LazyPgPool implements DbPoolLike {
  private pool: Promise<PgPool> | null = null

  constructor(private readonly config: DbPoolConfig) {}

  async end(): Promise<void> {
    if (!this.pool) {
      return
    }

    await (await this.pool).end()
  }

  async query<Row>(
    text: string,
    values?: readonly unknown[],
  ): Promise<DbQueryResult<Row>> {
    const pool = await this.getPool()
    const result = await pool.query(text, values === undefined ? [] : [...values])
    // Repository functions provide the expected row type at each call site.
    return { rows: result.rows as Row[] }
  }

  private getPool(): Promise<PgPool> {
    this.pool ??= loadDefaultPgPoolProvider().then((provider) =>
      provider.createPool(this.config),
    )
    return this.pool
  }
}

const defaultPgPoolProvider: DbPoolProvider<LazyPgPool> = {
  createPool: (config: DbPoolConfig) => new LazyPgPool(config),
}

export function createDb<Pool extends DbPoolLike>(
  env: Env,
  provider: DbPoolProvider<Pool>,
): Pool {
  if (!env.HYPERDRIVE) {
    throw new Error(missingHyperdriveMessage)
  }

  return provider.createPool({
    connectionString: env.HYPERDRIVE.connectionString,
  })
}

export function createConfiguredDb(env: Env): DbPoolLike {
  return createDb(env, configuredPoolProvider ?? defaultPgPoolProvider)
}

function requiredQuery(pool: DbPoolLike): NonNullable<DbPoolLike['query']> {
  if (!pool.query) {
    throw new Error('Database pool does not support query')
  }

  return pool.query.bind(pool)
}

export async function findUserAuthRowBySubject(
  pool: DbPoolLike,
  authSubject: string,
): Promise<UserAuthRow | null> {
  const query = requiredQuery(pool)
  const result = await query<UserAuthRow>(
    `SELECT id, email
     FROM users
     WHERE id = $1
       AND deleted_at IS NULL
     LIMIT 1`,
    [authSubject],
  )

  return result.rows[0] ?? null
}

export async function findAnonymousSessionAuthRowByToken(
  pool: DbPoolLike,
  sessionToken: string,
): Promise<AnonymousSessionAuthRow | null> {
  const query = requiredQuery(pool)
  const result = await query<AnonymousSessionAuthRow>(
    `SELECT id, session_token, linked_user_id, email, expires_at
     FROM anonymous_sessions
     WHERE session_token = $1
       AND linked_user_id IS NULL
       AND expires_at > NOW()
     LIMIT 1`,
    [sessionToken],
  )

  return result.rows[0] ?? null
}
