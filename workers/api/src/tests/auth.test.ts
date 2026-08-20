import { afterEach, describe, expect, it, vi } from 'vitest'
import type { JWTVerifyGetKey, JWTVerifyOptions } from 'jose'
import { JWSInvalid } from 'jose/errors'
import { Hono } from 'hono'

import { configureDbPoolProvider } from '../repositories/db'
import type { DbPoolConfig, DbPoolLike, DbQueryResult } from '../repositories/db'
import {
  authMiddleware,
  createAuthMiddleware,
  createRequireUserAuth,
  requireUserAuth,
} from '../middleware/auth'
import { getAuthContext } from '../services/neon-auth'
import type {
  AnonymousSessionRecord,
  AuthDependencies,
  AuthRepositoryDependencies,
  VerifiedJwt,
} from '../services/neon-auth'
import {
  AuthError,
  defaultAuthDependencies,
  findAnonymousSession,
  findUserByAuthSubject,
  verifyNeonBearerToken,
  verifyNeonSessionToken,
} from '../services/neon-auth'
import type { Env } from '../types'
import type { AppBindings } from '../types'

const env: Env = {
  ENVIRONMENT: 'test',
  FRONTEND_URL: 'https://lextract.io',
  NEON_AUTH_BASE_URL: 'https://auth.example.com/neondb/auth',
  NEON_AUTH_JWKS_URL: 'https://auth.example.com/.well-known/jwks.json',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getAuthContext', () => {
  it('returns a user auth context for a verified bearer token', async () => {
    const dependencies: AuthDependencies = {
      verifyBearerToken: (token: string): Promise<VerifiedJwt> => {
        expect(token).toBe('valid-jwt')
        return Promise.resolve({
          email: 'owner@example.com',
          subject: 'user-id-from-sub',
        })
      },
      findUserByAuthSubject: (authSubject: string) => {
        expect(authSubject).toBe('user-id-from-sub')
        return Promise.resolve({
          authSubject,
          email: 'owner@example.com',
          id: 'user-id-from-sub',
        })
      },
      findAnonymousSession: () => Promise.resolve(null),
    }

    const context = await getAuthContext(
      new Request('https://api.lextract.io/api/v1/user/profile', {
        headers: { Authorization: 'Bearer valid-jwt' },
      }),
      env,
      dependencies,
    )

    expect(context).toMatchObject({
      email: 'owner@example.com',
      id: 'user-id-from-sub',
      kind: 'user',
    })
  })

  it('returns an anonymous auth context for a valid session token', async () => {
    const session: AnonymousSessionRecord = {
      email: 'guest@example.com',
      expiresAt: new Date(Date.now() + 60_000),
      id: 'session-id',
      linkedUserId: null,
      sessionToken: 'session-token',
    }
    const dependencies: AuthDependencies = {
      verifyBearerToken: () => {
        throw new Error('bearer verification should not run')
      },
      findUserByAuthSubject: () => {
        throw new Error('user lookup should not run')
      },
      findAnonymousSession: (sessionToken: string) => {
        expect(sessionToken).toBe('session-token')
        return Promise.resolve(session)
      },
    }

    const context = await getAuthContext(
      new Request('https://api.lextract.io/api/v1/extractions/upload', {
        headers: { 'X-Session-Token': 'session-token' },
      }),
      env,
      dependencies,
    )

    expect(context).toMatchObject({
      email: 'guest@example.com',
      id: 'session-id',
      kind: 'anonymous',
      sessionToken: 'session-token',
    })
  })

  it('rejects anonymous sessions that are expired or linked', async () => {
    const dependencies: AuthDependencies = {
      verifyBearerToken: () => {
        throw new Error('bearer verification should not run')
      },
      findUserByAuthSubject: () => {
        throw new Error('user lookup should not run')
      },
      findAnonymousSession: () =>
        Promise.resolve({
          email: null,
          expiresAt: new Date(Date.now() - 60_000),
          id: 'session-id',
          linkedUserId: null,
          sessionToken: 'expired-token',
        }),
    }

    await expect(
      getAuthContext(
        new Request('https://api.lextract.io/api/v1/extractions/upload', {
          headers: { 'X-Session-Token': 'expired-token' },
        }),
        env,
        dependencies,
      ),
    ).rejects.toThrow(/anonymous session/i)
  })

  it('allows verified bearer tokens before the public user row exists', async () => {
    const context = await getAuthContext(
      new Request('https://api.lextract.io/api/v1/auth/sync-user', {
        headers: { Authorization: 'Bearer valid-jwt' },
      }),
      env,
      {
        verifyBearerToken: () =>
          Promise.resolve({
            email: 'owner@example.com',
            subject: 'missing-user',
          }),
        findUserByAuthSubject: () => Promise.resolve(null),
        findAnonymousSession: () => Promise.resolve(null),
      },
    )

    expect(context).toEqual({
      authSubject: 'missing-user',
      email: 'owner@example.com',
      id: 'missing-user',
      kind: 'user',
    })
  })

  it('accepts opaque Neon session tokens sent as bearer auth', async () => {
    const dependencies: AuthDependencies = {
      verifyBearerToken: (token: string) => {
        expect(token).toBe('opaque-session-token')
        return Promise.reject(new JWSInvalid('Invalid Compact JWS'))
      },
      verifySessionToken: (token: string) => {
        expect(token).toBe('opaque-session-token')
        return Promise.resolve({
          email: 'owner@example.com',
          subject: 'auth-user-id',
        })
      },
      findUserByAuthSubject: (authSubject: string) => {
        expect(authSubject).toBe('auth-user-id')
        return Promise.resolve({
          authSubject,
          email: 'owner@example.com',
          id: 'auth-user-id',
        })
      },
      findAnonymousSession: () => Promise.resolve(null),
    }

    const context = await getAuthContext(
      new Request('https://api.lextract.io/api/v1/user/profile', {
        headers: { Authorization: 'Bearer opaque-session-token' },
      }),
      env,
      dependencies,
    )

    expect(context).toMatchObject({
      email: 'owner@example.com',
      id: 'auth-user-id',
      kind: 'user',
    })
  })

  it('returns an unauthenticated context when no auth headers are present', async () => {
    const context = await getAuthContext(
      new Request('https://api.lextract.io/api/v1/health'),
      env,
      {
        verifyBearerToken: () => Promise.reject(new Error('not expected')),
        findUserByAuthSubject: () => Promise.resolve(null),
        findAnonymousSession: () => Promise.resolve(null),
      },
    )

    expect(context).toEqual({ kind: 'unauthenticated' })
  })

  it('preserves the original bearer error when no session verifier is configured', async () => {
    await expect(
      getAuthContext(
        new Request('https://api.lextract.io/api/v1/user/profile', {
          headers: { Authorization: 'Bearer invalid' },
        }),
        env,
        {
          verifyBearerToken: () => Promise.reject(new Error('jose exploded')),
          findUserByAuthSubject: () => Promise.resolve(null),
          findAnonymousSession: () => Promise.resolve(null),
        },
      ),
    ).rejects.toThrow(/jose exploded/i)
  })

  it('maps total bearer and session verification failure to AuthError', async () => {
    await expect(
      getAuthContext(
        new Request('https://api.lextract.io/api/v1/user/profile', {
          headers: { Authorization: 'Bearer invalid' },
        }),
        env,
        {
          verifyBearerToken: () => Promise.reject(new JWSInvalid('bad jwt')),
          verifySessionToken: () => Promise.reject(new AuthError('bad session')),
          findUserByAuthSubject: () => Promise.resolve(null),
          findAnonymousSession: () => Promise.resolve(null),
        },
      ),
    ).rejects.toThrow(AuthError)
  })

  it('keeps the original AuthError when both bearer and session verification reject as auth failures', async () => {
    await expect(
      getAuthContext(
        new Request('https://api.lextract.io/api/v1/user/profile', {
          headers: { Authorization: 'Bearer invalid' },
        }),
        env,
        {
          verifyBearerToken: () => Promise.reject(new AuthError('bad bearer')),
          verifySessionToken: () => Promise.reject(new AuthError('bad session')),
          findUserByAuthSubject: () => Promise.resolve(null),
          findAnonymousSession: () => Promise.resolve(null),
        },
      ),
    ).rejects.toThrow(/bad bearer/i)
  })
})

describe('verifyNeonBearerToken', () => {
  it('requires a JWKS URL before verifying bearer tokens', async () => {
    await expect(
      verifyNeonBearerToken('token', {
        ENVIRONMENT: 'test',
        FRONTEND_URL: 'https://lextract.io',
      }),
    ).rejects.toThrow(/jwks/i)
  })

  it('verifies bearer tokens through injectable JWKS dependencies', async () => {
    const keyResolver: JWTVerifyGetKey = () => Promise.reject(new Error('unused'))
    const verified = await verifyNeonBearerToken('token', env, {
      createRemoteJwkSet: (url: URL) => {
        expect(url.toString()).toBe(
          'https://auth.example.com/.well-known/jwks.json',
        )
        return keyResolver
      },
      verifyJwt: (
        token: string,
        key: JWTVerifyGetKey,
        options?: JWTVerifyOptions,
      ) => {
        expect(token).toBe('token')
        expect(key).toBe(keyResolver)
        expect(options).toBeUndefined()
        return Promise.resolve({
          payload: { email: 'owner@example.com', sub: 'auth-subject' },
        })
      },
    })

    expect(verified).toEqual({
      email: 'owner@example.com',
      subject: 'auth-subject',
    })
  })

  it('reuses JWKS resolvers for the same JWKS URL', async () => {
    const createdResolvers: JWTVerifyGetKey[] = []
    const memoizedEnv: Env = {
      ...env,
      NEON_AUTH_JWKS_URL: 'https://auth.example.com/memoized-jwks.json',
    }

    const dependencies = {
      createRemoteJwkSet: () => {
        const resolver: JWTVerifyGetKey = () =>
          Promise.reject(new Error('unused'))
        createdResolvers.push(resolver)
        return resolver
      },
      verifyJwt: (
        _token: string,
        key: JWTVerifyGetKey,
        _options?: JWTVerifyOptions,
      ) => {
        expect(key).toBe(createdResolvers[0])
        return Promise.resolve({ payload: { sub: 'auth-subject' } })
      },
    }

    await verifyNeonBearerToken('first-token', memoizedEnv, dependencies)
    await verifyNeonBearerToken('second-token', memoizedEnv, dependencies)

    expect(createdResolvers).toHaveLength(1)
  })

  it('passes an issuer option when one is configured', async () => {
    const keyResolver: JWTVerifyGetKey = () => Promise.reject(new Error('unused'))
    await verifyNeonBearerToken(
      'token',
      { ...env, NEON_AUTH_ISSUER: 'https://auth.example.com' },
      {
        createRemoteJwkSet: () => keyResolver,
        verifyJwt: (
          _token: string,
          _key: JWTVerifyGetKey,
          options?: JWTVerifyOptions,
        ) => {
          expect(options).toEqual({ issuer: 'https://auth.example.com' })
          return Promise.resolve({ payload: { sub: 'auth-subject' } })
        },
      },
    )
  })

  it('rejects verified tokens without a subject', async () => {
    const keyResolver: JWTVerifyGetKey = () => Promise.reject(new Error('unused'))
    await expect(
      verifyNeonBearerToken('token', env, {
        createRemoteJwkSet: () => keyResolver,
        verifyJwt: () => Promise.resolve({ payload: { email: 123 } }),
      }),
    ).rejects.toThrow(/subject/i)
  })
})

describe('verifyNeonSessionToken', () => {
  it('validates opaque session tokens through Neon Auth get-session', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        Response.json({
          user: {
            email: 'owner@example.com',
            id: 'auth-subject',
          },
        }),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const verified = await verifyNeonSessionToken('opaque-session-token', env)

    expect(verified).toEqual({
      email: 'owner@example.com',
      subject: 'auth-subject',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://auth.example.com/neondb/auth/get-session',
      {
        headers: {
          Accept: 'application/json',
          Cookie:
            '__Secure-neon-auth.session_token=opaque-session-token; better-auth.session_token=opaque-session-token',
        },
      },
    )
  })

  it('rejects session tokens when Neon Auth returns no user', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(Response.json({}))))

    await expect(
      verifyNeonSessionToken('opaque-session-token', env),
    ).rejects.toThrow(/no user/i)
  })

  it('rejects session tokens when Neon Auth returns null JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(Response.json(null))))

    await expect(
      verifyNeonSessionToken('opaque-session-token', env),
    ).rejects.toThrow(/no user/i)
  })

  it('rejects session tokens with invalid cookie characters', async () => {
    await expect(
      verifyNeonSessionToken('opaque;session', env),
    ).rejects.toThrow(/invalid characters/i)
  })

  it('rejects session tokens when Neon Auth returns an error status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json({}, { status: 401 }))),
    )

    await expect(
      verifyNeonSessionToken('opaque-session-token', env),
    ).rejects.toThrow(/invalid/i)
  })

  it('rejects session users without a usable id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json({ user: { email: 'owner@example.com' } }))),
    )

    await expect(
      verifyNeonSessionToken('opaque-session-token', env),
    ).rejects.toThrow(/missing id/i)
  })

  it('returns null email when the session user email is not a string', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json({ user: { email: null, id: 'auth-subject' } }))),
    )

    await expect(
      verifyNeonSessionToken('opaque-session-token', env),
    ).resolves.toEqual({ email: null, subject: 'auth-subject' })
  })

  it('requires a Neon Auth base URL for session token verification', async () => {
    await expect(
      verifyNeonSessionToken('opaque-session-token', {
        ENVIRONMENT: 'test',
        FRONTEND_URL: 'https://lextract.io',
      }),
    ).rejects.toThrow(/base_url/i)
  })
})

class QueryPool implements DbPoolLike {
  ended = false
  readonly queries: { text: string; values?: readonly unknown[] }[] = []

  constructor(private readonly rows: readonly unknown[]) {}

  async end(): Promise<void> {
    this.ended = true
  }

  async query<Row>(
    text: string,
    values?: readonly unknown[],
  ): Promise<DbQueryResult<Row>> {
    if (values === undefined) {
      this.queries.push({ text })
    } else {
      this.queries.push({ text, values })
    }
    // Test rows are shaped to match the generic Row requested by the repository.
    return { rows: this.rows as Row[] }
  }
}

function repositoryDependencies(pool: QueryPool): AuthRepositoryDependencies {
  return {
    createDb: () => pool,
  }
}

describe('Neon auth repositories', () => {
  it('loads users by Neon auth subject and closes the pool', async () => {
    const pool = new QueryPool([
      {
        email: 'owner@example.com',
        id: 'auth-subject',
      },
    ])

    const user = await findUserByAuthSubject(
      'auth-subject',
      env,
      repositoryDependencies(pool),
    )

    expect(user).toEqual({
      authSubject: 'auth-subject',
      email: 'owner@example.com',
      id: 'auth-subject',
    })
    expect(pool.ended).toBe(true)
    expect(pool.queries[0]?.values).toEqual(['auth-subject'])
  })

  it('returns null when a user row does not exist', async () => {
    const user = await findUserByAuthSubject(
      'missing',
      env,
      repositoryDependencies(new QueryPool([])),
    )

    expect(user).toBeNull()
  })

  it('loads valid anonymous sessions and maps date strings', async () => {
    const pool = new QueryPool([
      {
        email: null,
        expires_at: '2026-06-12T18:00:00.000Z',
        id: 'session-id',
        linked_user_id: null,
        session_token: 'session-token',
      },
    ])

    const session = await findAnonymousSession(
      'session-token',
      env,
      repositoryDependencies(pool),
    )

    expect(session).toEqual({
      email: null,
      expiresAt: new Date('2026-06-12T18:00:00.000Z'),
      id: 'session-id',
      linkedUserId: null,
      sessionToken: 'session-token',
    })
  })

  it('returns null when an anonymous session row does not exist', async () => {
    const session = await findAnonymousSession(
      'missing',
      env,
      repositoryDependencies(new QueryPool([])),
    )

    expect(session).toBeNull()
  })

  it('fails when the db pool cannot query', async () => {
    const pool: DbPoolLike = {
      end: () => Promise.resolve(),
    }

    await expect(
      findUserByAuthSubject('auth-subject', env, {
        createDb: () => pool,
      }),
    ).rejects.toThrow(/query/i)
  })

  it('uses configured db providers in the default auth dependencies', async () => {
    configureDbPoolProvider({
      createPool: (_config: DbPoolConfig) =>
        new QueryPool([
          {
            email: 'owner@example.com',
            id: 'auth-subject',
          },
        ]),
    })

    const user = await defaultAuthDependencies.findUserByAuthSubject(
      'auth-subject',
      {
        ...env,
        HYPERDRIVE: {
          // The db adapter only reads connectionString from the Hyperdrive binding.
          connectionString: 'postgres://user:pass@example.com:5432/lextract',
        } as Hyperdrive,
      },
    )

    expect(user?.id).toBe('auth-subject')
  })
})

describe('auth middleware', () => {
  it('sets auth context for downstream handlers', async () => {
    configureDbPoolProvider({
      createPool: () =>
        new QueryPool([
          {
            email: null,
            expires_at: new Date(Date.now() + 60_000),
            id: 'session-id',
            linked_user_id: null,
            session_token: 'session-token',
          },
        ]),
    })
    const app = new Hono<AppBindings>()
    app.use('*', authMiddleware)
    app.get('/profile', (c) => c.json(c.get('authContext')))

    const response = await app.fetch(
      new Request('https://api.lextract.io/profile', {
        headers: { 'X-Session-Token': 'session-token' },
      }),
      {
        ...env,
        HYPERDRIVE: {
          // The db adapter only reads connectionString from the Hyperdrive binding.
          connectionString: 'postgres://user:pass@example.com:5432/lextract',
        } as Hyperdrive,
      },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      id: 'session-id',
      kind: 'anonymous',
    })
  })

  it('maps invalid auth middleware errors to 401 without leaking details', async () => {
    const app = new Hono<AppBindings>()
    app.use(
      '*',
      createAuthMiddleware({
        verifyBearerToken: () => Promise.reject(new AuthError('bad token')),
        findUserByAuthSubject: () => Promise.resolve(null),
        findAnonymousSession: () => Promise.resolve(null),
      }),
    )
    app.get('/profile', (c) => c.json(c.get('authContext')))

    const response = await app.fetch(
      new Request('https://api.lextract.io/profile', {
        headers: { Authorization: 'Bearer invalid-token' },
      }),
      env,
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      detail: 'Authentication required',
    })
  })

  it('does not swallow unexpected auth middleware errors', async () => {
    const app = new Hono<AppBindings>()
    app.use(
      '*',
      createAuthMiddleware({
        verifyBearerToken: () => Promise.reject(new Error('database offline')),
        findUserByAuthSubject: () => Promise.resolve(null),
        findAnonymousSession: () => Promise.resolve(null),
      }),
    )
    app.get('/profile', (c) => c.json(c.get('authContext')))

    const response = await app.fetch(
      new Request('https://api.lextract.io/profile', {
        headers: { Authorization: 'Bearer token' },
      }),
      env,
    )

    expect(response.status).toBe(500)
  })

  it('rejects non-user contexts in user-only middleware', async () => {
    const app = new Hono<AppBindings>()
    app.use('*', requireUserAuth)
    app.get('/profile', (c) => c.json(c.get('authContext')))

    const response = await app.fetch(
      new Request('https://api.lextract.io/profile'),
      env,
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      detail: 'Authentication required',
    })
  })

  it('maps invalid bearer auth errors to 401 without leaking details', async () => {
    const app = new Hono<AppBindings>()
    app.use(
      '*',
      createRequireUserAuth({
        verifyBearerToken: () => Promise.reject(new AuthError('bad jwks config')),
        findUserByAuthSubject: () => Promise.resolve(null),
        findAnonymousSession: () => Promise.resolve(null),
      }),
    )
    app.get('/profile', (c) => c.json(c.get('authContext')))

    const response = await app.fetch(
      new Request('https://api.lextract.io/profile', {
        headers: { Authorization: 'Bearer invalid-token' },
      }),
      env,
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      detail: 'Authentication required',
    })
  })

  it('maps invalid anonymous auth errors to 401 without leaking details', async () => {
    const app = new Hono<AppBindings>()
    app.use(
      '*',
      createRequireUserAuth({
        verifyBearerToken: () => Promise.reject(new Error('not expected')),
        findUserByAuthSubject: () => Promise.resolve(null),
        findAnonymousSession: () =>
          Promise.reject(new AuthError('expired anonymous token')),
      }),
    )
    app.get('/profile', (c) => c.json(c.get('authContext')))

    const response = await app.fetch(
      new Request('https://api.lextract.io/profile', {
        headers: { 'X-Session-Token': 'expired-token' },
      }),
      env,
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      detail: 'Authentication required',
    })
  })

  it('does not swallow unexpected user auth middleware errors', async () => {
    const app = new Hono<AppBindings>()
    app.use(
      '*',
      createRequireUserAuth({
        verifyBearerToken: () => Promise.reject(new Error('database offline')),
        findUserByAuthSubject: () => Promise.resolve(null),
        findAnonymousSession: () => Promise.resolve(null),
      }),
    )
    app.get('/profile', (c) => c.json(c.get('authContext')))

    const response = await app.fetch(
      new Request('https://api.lextract.io/profile', {
        headers: { Authorization: 'Bearer token' },
      }),
      env,
    )

    expect(response.status).toBe(500)
  })

  it('allows user contexts through user-only middleware', async () => {
    configureDbPoolProvider({
      createPool: () =>
        new QueryPool([
          {
            email: 'owner@example.com',
            id: 'auth-subject',
          },
        ]),
    })
    const app = new Hono<AppBindings>()
    app.use(
      '*',
      createRequireUserAuth({
        verifyBearerToken: () =>
          Promise.resolve({
            email: 'owner@example.com',
            subject: 'auth-subject',
          }),
        findUserByAuthSubject: () =>
          Promise.resolve({
            authSubject: 'auth-subject',
            email: 'owner@example.com',
            id: 'user-id',
          }),
        findAnonymousSession: () => Promise.resolve(null),
      }),
    )
    app.get('/profile', (c) => c.json(c.get('authContext')))

    const response = await app.fetch(
      new Request('https://api.lextract.io/profile', {
        headers: { Authorization: 'Bearer valid-jwt' },
      }),
      {
        ...env,
        HYPERDRIVE: {
          // The db adapter only reads connectionString from the Hyperdrive binding.
          connectionString: 'postgres://user:pass@example.com:5432/lextract',
        } as Hyperdrive,
      },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      id: 'user-id',
      kind: 'user',
    })
  })
})
