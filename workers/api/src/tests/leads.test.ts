import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'

import { createLeadsRoutes } from '../routes/leads'
import type { AppBindings, Env } from '../types'
import { routeTestEnv } from './route-test-helpers'

function app(env: Env, fetchImpl: typeof fetch): { fetch(path: string): Promise<Response> } {
  const routes = new Hono<AppBindings>()
  routes.route('/api/v1/leads', createLeadsRoutes({ fetch: fetchImpl }))
  return {
    fetch: (path) =>
      Promise.resolve(routes.fetch(new Request(`https://api.lextract.io${path}`), env)),
  }
}

describe('leads routes', () => {
  it('forwards unsubscribe requests to the marketing Worker with the shared secret', async () => {
    const requests: { input: RequestInfo | URL; init: RequestInit | undefined }[] = []
    const client = app(
      {
        ...routeTestEnv,
        MARKETING_WORKER_SECRET: 'marketing-secret',
        MARKETING_WORKER_URL: 'https://marketing.lextract.workers.dev',
      },
      async (input, init) => {
        requests.push({ input, init })
        return Response.json({ success: true })
      },
    )

    const response = await client.fetch(
      '/api/v1/leads/unsubscribe?lead_id=11111111-1111-4111-8111-111111111111',
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true })
    expect(String(requests[0]?.input)).toBe(
      'https://marketing.lextract.workers.dev/unsubscribe',
    )
    expect(requests[0]?.init?.method).toBe('POST')
    expect(requests[0]?.init?.headers).toMatchObject({
      Authorization: 'Bearer marketing-secret',
      'Content-Type': 'application/json',
    })
    expect(JSON.parse(String(requests[0]?.init?.body))).toEqual({
      lead_id: '11111111-1111-4111-8111-111111111111',
    })
  })

  it('validates lead ids and maps marketing Worker failures', async () => {
    const missingConfig = app(routeTestEnv, () => Promise.resolve(Response.json({})))
    const unavailable = app(
      {
        ...routeTestEnv,
        MARKETING_WORKER_SECRET: 'marketing-secret',
        MARKETING_WORKER_URL: 'https://marketing.lextract.workers.dev',
      },
      () => Promise.resolve(Response.json({ success: false }, { status: 404 })),
    )
    const failing = app(
      {
        ...routeTestEnv,
        MARKETING_WORKER_SECRET: 'marketing-secret',
        MARKETING_WORKER_URL: 'https://marketing.lextract.workers.dev',
      },
      () => Promise.resolve(Response.json({ success: false }, { status: 500 })),
    )

    expect((await missingConfig.fetch('/api/v1/leads/unsubscribe?lead_id=bad')).status).toBe(
      422,
    )
    expect(
      (
        await missingConfig.fetch(
          '/api/v1/leads/unsubscribe?lead_id=11111111-1111-4111-8111-111111111111',
        )
      ).status,
    ).toBe(503)
    expect(
      (
        await unavailable.fetch(
          '/api/v1/leads/unsubscribe?lead_id=11111111-1111-4111-8111-111111111111',
        )
      ).status,
    ).toBe(404)
    expect(
      (
        await failing.fetch(
          '/api/v1/leads/unsubscribe?lead_id=11111111-1111-4111-8111-111111111111',
        )
      ).status,
    ).toBe(503)
  })
})
