import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { JWTPayload, JWTVerifyGetKey, JWTVerifyOptions } from 'jose'

import {
  createConfiguredDb,
  findAnonymousSessionAuthRowByToken,
  findUserAuthRowBySubject,
} from '../repositories/db'
import type { DbPoolLike } from '../repositories/db'
import type { Env } from '../types'

export interface VerifiedJwt {
  subject: string
  email: string | null
}

export interface UserRecord {
  id: string
  authSubject: string
  email: string | null
}

export interface AnonymousSessionRecord {
  id: string
  sessionToken: string
  linkedUserId: string | null
  email: string | null
  expiresAt: Date
}

export type AuthContext =
  | {
      kind: 'user'
      id: string
      authSubject: string
      email: string | null
    }
  | {
      kind: 'anonymous'
      id: string
      sessionToken: string
      email: string | null
      expiresAt: Date
    }
  | { kind: 'unauthenticated' }

export interface AuthDependencies {
  verifyBearerToken(token: string, env: Env): Promise<VerifiedJwt>
  verifySessionToken?(token: string, env: Env): Promise<VerifiedJwt>
  findUserByAuthSubject(
    authSubject: string,
    env: Env,
  ): Promise<UserRecord | null>
  findAnonymousSession(
    sessionToken: string,
    env: Env,
  ): Promise<AnonymousSessionRecord | null>
}

export interface AuthRepositoryDependencies {
  createDb(env: Env): DbPoolLike
}

export interface TokenVerificationDependencies {
  createRemoteJwkSet(url: URL): JWTVerifyGetKey
  verifyJwt(
    token: string,
    key: JWTVerifyGetKey,
    options?: JWTVerifyOptions,
  ): Promise<{ payload: JWTPayload }>
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

const jwksResolverCache = new Map<string, JWTVerifyGetKey>()

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return null
  }

  const token = authorization.slice('Bearer '.length).trim()
  return token.length > 0 ? token : null
}

function emailFromPayload(payload: JWTPayload): string | null {
  const email = payload.email
  return typeof email === 'string' ? email : null
}

function sessionCookieHeader(token: string): string {
  return [
    `__Secure-neon-auth.session_token=${token}`,
    `better-auth.session_token=${token}`,
  ].join('; ')
}

export async function verifyNeonBearerToken(
  token: string,
  env: Env,
  dependencies: TokenVerificationDependencies = {
    createRemoteJwkSet: createRemoteJWKSet,
    verifyJwt: jwtVerify,
  },
): Promise<VerifiedJwt> {
  if (!env.NEON_AUTH_JWKS_URL) {
    throw new AuthError('NEON_AUTH_JWKS_URL is required')
  }

  let jwks = jwksResolverCache.get(env.NEON_AUTH_JWKS_URL)
  if (!jwks) {
    jwks = dependencies.createRemoteJwkSet(new URL(env.NEON_AUTH_JWKS_URL))
    jwksResolverCache.set(env.NEON_AUTH_JWKS_URL, jwks)
  }
  const verifyOptions =
    env.NEON_AUTH_ISSUER === undefined
      ? undefined
      : { issuer: env.NEON_AUTH_ISSUER }
  const result = await dependencies.verifyJwt(token, jwks, verifyOptions)

  if (!result.payload.sub) {
    throw new AuthError('Bearer token is missing subject')
  }

  return {
    email: emailFromPayload(result.payload),
    subject: result.payload.sub,
  }
}

export async function verifyNeonSessionToken(
  token: string,
  env: Env,
): Promise<VerifiedJwt> {
  if (!env.NEON_AUTH_BASE_URL) {
    throw new AuthError('NEON_AUTH_BASE_URL is required')
  }
  if (/[\r\n;]/.test(token)) {
    throw new AuthError('Session token contains invalid characters')
  }

  const response = await fetch(`${env.NEON_AUTH_BASE_URL}/get-session`, {
    headers: {
      Accept: 'application/json',
      Cookie: sessionCookieHeader(token),
    },
  })
  if (!response.ok) {
    throw new AuthError('Session token is invalid')
  }

  const data = (await response.json()) as unknown
  const user =
    typeof data === 'object' && data !== null
      ? Reflect.get(data, 'user')
      : undefined
  if (typeof user !== 'object' || user === null) {
    throw new AuthError('Session token has no user')
  }

  const subject = Reflect.get(user, 'id')
  if (typeof subject !== 'string' || subject.trim().length === 0) {
    throw new AuthError('Session token user is missing id')
  }
  const email = Reflect.get(user, 'email')

  return {
    email: typeof email === 'string' ? email : null,
    subject,
  }
}

export async function findUserByAuthSubject(
  authSubject: string,
  env: Env,
  dependencies: AuthRepositoryDependencies,
): Promise<UserRecord | null> {
  const pool = dependencies.createDb(env)
  try {
    const row = await findUserAuthRowBySubject(pool, authSubject)
    if (!row) {
      return null
    }

    return {
      authSubject: row.id,
      email: row.email,
      id: row.id,
    }
  } finally {
    await pool.end()
  }
}

export async function findAnonymousSession(
  sessionToken: string,
  env: Env,
  dependencies: AuthRepositoryDependencies,
): Promise<AnonymousSessionRecord | null> {
  const pool = dependencies.createDb(env)
  try {
    const row = await findAnonymousSessionAuthRowByToken(pool, sessionToken)
    if (!row) {
      return null
    }

    return {
      email: row.email,
      expiresAt: new Date(row.expires_at),
      id: row.id,
      linkedUserId: row.linked_user_id,
      sessionToken: row.session_token,
    }
  } finally {
    await pool.end()
  }
}

export const defaultAuthDependencies: AuthDependencies = {
  findAnonymousSession: (sessionToken: string, env: Env) =>
    findAnonymousSession(sessionToken, env, {
      createDb: createConfiguredDb,
    }),
  findUserByAuthSubject: (authSubject: string, env: Env) =>
    findUserByAuthSubject(authSubject, env, {
      createDb: createConfiguredDb,
    }),
  verifyBearerToken: verifyNeonBearerToken,
  verifySessionToken: verifyNeonSessionToken,
}

export async function getAuthContext(
  request: Request,
  env: Env,
  dependencies: AuthDependencies = defaultAuthDependencies,
): Promise<AuthContext> {
  const token = bearerToken(request)
  if (token) {
    let verified: VerifiedJwt
    try {
      verified = await dependencies.verifyBearerToken(token, env)
    } catch (error) {
      if (!dependencies.verifySessionToken) {
        throw error
      }
      try {
        verified = await dependencies.verifySessionToken(token, env)
      } catch {
        if (error instanceof AuthError) {
          throw error
        }
        throw new AuthError('Bearer token is invalid')
      }
    }
    const user = await dependencies.findUserByAuthSubject(verified.subject, env)

    return {
      authSubject: user?.authSubject ?? verified.subject,
      email: user?.email ?? verified.email,
      id: user?.id ?? verified.subject,
      kind: 'user',
    }
  }

  const sessionToken = request.headers.get('X-Session-Token')?.trim()
  if (sessionToken) {
    const session = await dependencies.findAnonymousSession(sessionToken, env)
    if (
      !session ||
      session.linkedUserId !== null ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw new AuthError('Anonymous session is invalid or expired')
    }

    return {
      email: session.email,
      expiresAt: session.expiresAt,
      id: session.id,
      kind: 'anonymous',
      sessionToken: session.sessionToken,
    }
  }

  return { kind: 'unauthenticated' }
}
