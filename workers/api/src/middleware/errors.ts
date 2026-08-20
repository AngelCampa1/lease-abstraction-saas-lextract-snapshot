import type { Context, MiddlewareHandler } from 'hono'

import { isDevelopmentLike } from '../env'
import type { AppBindings, Env } from '../types'

export interface ErrorBody {
  detail: string
  request_id?: string
}

export function formatErrorBody(
  error: unknown,
  requestId: string,
  env: Env,
): ErrorBody {
  return {
    detail:
      error instanceof Error && isDevelopmentLike(env)
        ? error.message
        : 'Internal server error',
    request_id: requestId,
  }
}

export function errorResponse(
  error: Error,
  c: Context<AppBindings>,
): Response {
  const requestId = c.get('requestId')
  console.error('Unhandled API error', {
    errorName: error.name,
    environment: c.env.ENVIRONMENT ?? 'unknown',
    method: c.req.method,
    path: new URL(c.req.url).pathname,
    requestId,
  })
  return c.json(formatErrorBody(error, requestId, c.env), 500)
}

export const errorMiddleware: MiddlewareHandler<AppBindings> = async (
  _c,
  next,
) => {
  await next()
}
