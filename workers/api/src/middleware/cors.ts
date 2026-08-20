import type { MiddlewareHandler } from 'hono'

import { isAllowedCorsOrigin } from '../env'
import type { AppBindings } from '../types'

const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
const ALLOWED_HEADERS = [
  'Authorization',
  'Content-Type',
  'X-Session-Token',
  'X-Correlation-ID',
  'X-Request-ID',
].join(', ')

function applyCorsHeaders(headers: Headers, origin: string): void {
  headers.set('Access-Control-Allow-Origin', origin)
  headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS)
  headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS)
  headers.set('Access-Control-Max-Age', '86400')
  headers.append('Vary', 'Origin')
}

export const corsMiddleware: MiddlewareHandler<AppBindings> = async (
  c,
  next,
) => {
  const origin = c.req.header('Origin') ?? null
  const allowed = isAllowedCorsOrigin(origin, c.env)

  if (c.req.method === 'OPTIONS') {
    const headers = new Headers()
    if (allowed && origin !== null) {
      applyCorsHeaders(headers, origin)
    }
    return new Response(null, { headers, status: 204 })
  }

  await next()

  if (allowed && origin !== null) {
    applyCorsHeaders(c.res.headers, origin)
  }
}
