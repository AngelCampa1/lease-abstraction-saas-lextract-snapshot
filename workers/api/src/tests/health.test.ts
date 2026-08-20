import { Hono } from 'hono'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { isAllowedCorsOrigin } from '../env'
import app from '../index'
import {
  errorMiddleware,
  errorResponse,
  formatErrorBody,
} from '../middleware/errors'
import { requestIdMiddleware } from '../middleware/request-id'
import type { AppBindings, Env } from '../types'

const env: Env = {
  ALLOWED_ORIGINS: 'https://lextract.io, https://www.lextract.io',
  ENVIRONMENT: 'test',
  FRONTEND_URL: 'https://lextract.io',
}

describe('api worker health and cors', () => {
  it('returns health status at /health', async () => {
    const response = await app.fetch(
      new Request('https://api.lextract.io/health'),
      env,
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: 'ok' })
  })

  it('answers CORS preflight for frontend API calls', async () => {
    const request = new Request('https://api.lextract.io/api/v1/extractions', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://lextract.io',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization, X-Session-Token',
      },
    })

    const response = await app.fetch(request, env)
    const allowedHeaders = response.headers.get('Access-Control-Allow-Headers')

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://lextract.io',
    )
    expect(allowedHeaders).toContain('Authorization')
    expect(allowedHeaders).toContain('Content-Type')
    expect(allowedHeaders).toContain('X-Session-Token')
    expect(allowedHeaders).toContain('X-Correlation-ID')
    expect(allowedHeaders).toContain('X-Request-ID')
  })

  it('allows configured non-local origins from ALLOWED_ORIGINS', async () => {
    const configuredEnv: Env = {
      ...env,
      ALLOWED_ORIGINS: 'https://preview.lextract.io',
      ENVIRONMENT: 'production',
      FRONTEND_URL: 'https://app.lextract.io',
    }

    const response = await app.fetch(
      new Request('https://api.lextract.io/health', {
        headers: { Origin: 'https://preview.lextract.io' },
      }),
      configuredEnv,
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://preview.lextract.io',
    )
  })

  it('allows FRONTEND_URL configured non-local origins', () => {
    const configuredEnv: Env = {
      ...env,
      ALLOWED_ORIGINS: '',
      ENVIRONMENT: 'production',
      FRONTEND_URL: 'https://app.lextract.io',
    }

    expect(isAllowedCorsOrigin('https://app.lextract.io', configuredEnv)).toBe(
      true,
    )
  })

  it('allows localhost origins in test environments', async () => {
    const request = new Request('https://api.lextract.io/api/v1/extractions', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
      },
    })

    const response = await app.fetch(request, env)

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      'http://localhost:3000',
    )
  })

  it('does not allow localhost origins in production', () => {
    const productionEnv: Env = {
      ...env,
      ENVIRONMENT: 'production',
    }

    expect(isAllowedCorsOrigin('http://localhost:3000', productionEnv)).toBe(
      false,
    )
  })

  it('does not echo unconfigured preflight origins', async () => {
    const response = await app.fetch(
      new Request('https://api.lextract.io/api/v1/extractions', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://example.com',
          'Access-Control-Request-Method': 'GET',
        },
      }),
      env,
    )

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('allows FRONTEND_URL when ALLOWED_ORIGINS is unset', () => {
    const configuredEnv: Env = {
      ENVIRONMENT: 'production',
      FRONTEND_URL: 'https://app.lextract.io',
    }

    expect(isAllowedCorsOrigin('https://app.lextract.io', configuredEnv)).toBe(
      true,
    )
  })

  it('ignores invalid configured origins', () => {
    const configuredEnv: Env = {
      ALLOWED_ORIGINS: 'not a url',
      ENVIRONMENT: 'production',
      FRONTEND_URL: 'not a url',
    }

    expect(isAllowedCorsOrigin('https://app.lextract.io', configuredEnv)).toBe(
      false,
    )
  })

  it('rejects malformed origins', () => {
    expect(isAllowedCorsOrigin('not a valid url', env)).toBe(false)
  })
})

describe('api worker request and error middleware', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function errorApp(error: unknown): Hono<AppBindings> {
    const testApp = new Hono<AppBindings>()
    testApp.use('*', requestIdMiddleware)
    testApp.use('*', errorMiddleware)
    testApp.onError(errorResponse)
    testApp.get('/boom', () => {
      throw error
    })
    return testApp
  }

  it('returns centralized error responses with generic detail in production', async () => {
    const productionEnv: Env = {
      ...env,
      ENVIRONMENT: 'production',
    }
    const response = await errorApp(new Error('database password leaked')).fetch(
      new Request('https://api.lextract.io/boom', {
        headers: { 'X-Request-ID': 'req_123' },
      }),
      productionEnv,
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      detail: 'Internal server error',
      request_id: 'req_123',
    })
  })

  it('logs centralized errors without leaking production error messages', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const productionEnv: Env = {
      ...env,
      ENVIRONMENT: 'production',
    }
    const response = await errorApp(new Error('database password leaked')).fetch(
      new Request('https://api.lextract.io/boom', {
        headers: { 'X-Request-ID': 'req_500' },
      }),
      productionEnv,
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      detail: 'Internal server error',
      request_id: 'req_500',
    })
    expect(errorSpy).toHaveBeenCalledWith('Unhandled API error', {
      errorName: 'Error',
      environment: 'production',
      method: 'GET',
      path: '/boom',
      requestId: 'req_500',
    })
  })

  it('can expose error messages in development and test', () => {
    expect(formatErrorBody(new Error('route failed'), 'req_456', env)).toEqual({
      detail: 'route failed',
      request_id: 'req_456',
    })
  })

  it('formats generic details for non-error values', () => {
    expect(formatErrorBody('route failed', 'req_789', env)).toEqual({
      detail: 'Internal server error',
      request_id: 'req_789',
    })
  })

  it('keeps valid inbound request ids', async () => {
    const response = await app.fetch(
      new Request('https://api.lextract.io/health', {
        headers: { 'X-Request-ID': 'req-123_ABC' },
      }),
      env,
    )

    expect(response.headers.get('X-Request-ID')).toBe('req-123_ABC')
  })

  it('generates a request id when the inbound id has unsafe characters', async () => {
    const response = await app.fetch(
      new Request('https://api.lextract.io/health', {
        headers: { 'X-Request-ID': 'bad id with spaces' },
      }),
      env,
    )

    expect(response.headers.get('X-Request-ID')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })

  it('generates a request id when the inbound id is oversized', async () => {
    const response = await app.fetch(
      new Request('https://api.lextract.io/health', {
        headers: { 'X-Request-ID': 'a'.repeat(129) },
      }),
      env,
    )

    expect(response.headers.get('X-Request-ID')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })
})
