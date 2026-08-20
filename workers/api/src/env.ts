import type { Env } from './types'

function isValidOrigin(origin: string): boolean {
  try {
    const url = new URL(origin)
    return (
      origin === url.origin &&
      (url.protocol === 'http:' || url.protocol === 'https:')
    )
  } catch {
    return false
  }
}

function isLocalhostOrigin(origin: string): boolean {
  const url = new URL(origin)
  return (
    (url.protocol === 'http:' || url.protocol === 'https:') &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  )
}

function configuredOrigins(env: Env): Set<string> {
  const origins = new Set<string>()

  for (const origin of (env.ALLOWED_ORIGINS ?? '').split(',')) {
    const trimmed = origin.trim()
    if (trimmed.length > 0 && isValidOrigin(trimmed)) {
      origins.add(trimmed)
    }
  }

  if (isValidOrigin(env.FRONTEND_URL)) {
    origins.add(env.FRONTEND_URL)
  }

  return origins
}

export function isDevelopmentLike(env: Env): boolean {
  return env.ENVIRONMENT === 'development' || env.ENVIRONMENT === 'test'
}

export function isAllowedCorsOrigin(origin: string | null, env: Env): boolean {
  if (origin === null || !isValidOrigin(origin)) {
    return false
  }

  if (configuredOrigins(env).has(origin)) {
    return true
  }

  return isDevelopmentLike(env) && isLocalhostOrigin(origin)
}
