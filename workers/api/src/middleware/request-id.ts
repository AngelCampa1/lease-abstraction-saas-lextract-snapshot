import type { MiddlewareHandler } from 'hono'

import type { AppBindings } from '../types'

const MAX_REQUEST_ID_LENGTH = 128
const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]+$/

function createRequestId(): string {
  return crypto.randomUUID()
}

function isSafeRequestId(value: string | undefined): value is string {
  return (
    value !== undefined &&
    value.length > 0 &&
    value.length <= MAX_REQUEST_ID_LENGTH &&
    SAFE_REQUEST_ID_PATTERN.test(value)
  )
}

function inboundRequestId(candidates: readonly (string | undefined)[]): string {
  for (const candidate of candidates) {
    if (isSafeRequestId(candidate)) {
      return candidate
    }
  }

  return createRequestId()
}

export const requestIdMiddleware: MiddlewareHandler<AppBindings> = async (
  c,
  next,
) => {
  const requestId = inboundRequestId([
    c.req.header('X-Request-ID'),
    c.req.header('X-Correlation-ID'),
  ])

  c.set('requestId', requestId)

  await next()

  c.header('X-Request-ID', requestId)
  c.header('X-Correlation-ID', requestId)
}
