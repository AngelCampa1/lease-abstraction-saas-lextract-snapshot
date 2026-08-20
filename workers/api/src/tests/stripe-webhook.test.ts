import { Hono } from 'hono'
import { afterEach, describe, expect, it } from 'vitest'

import { createWebhooksRoutes } from '../routes/webhooks'
import { PermanentWebhookError, processCheckoutCompleted } from '../routes/webhooks'
import {
  configurePaymentRepositoryDb,
} from '../repositories/payments'
import type { DbPoolLike, DbQueryResult } from '../repositories/db'
import {
  createStripeCheckoutSession,
  verifyStripeWebhookSignature,
} from '../services/stripe'
import { StripeProviderError, StripeSignatureError } from '../services/stripe'
import type { AppBindings, Env } from '../types'
import { jsonBody } from './route-test-helpers'

const env: Env = {
  ENVIRONMENT: 'test',
  FRONTEND_URL: 'https://lextract.io',
  STRIPE_SECRET_KEY: 'sk_test_secret',
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
}

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

class SequencePool implements DbPoolLike {
  ended = false
  readonly queries: { text: string; values?: readonly unknown[] }[] = []

  constructor(private readonly results: readonly (readonly unknown[])[]) {}

  async end(): Promise<void> {
    this.ended = true
  }

  async query<Row>(
    text: string,
    values?: readonly unknown[],
  ): Promise<DbQueryResult<Row>> {
    this.queries.push(values === undefined ? { text } : { text, values })
    const next = this.results[this.queries.length - 1] ?? []
    return { rows: next as Row[] }
  }
}

function configurePools(pools: SequencePool[]): void {
  let index = 0
  configurePaymentRepositoryDb(() => {
    const pool = pools[index]
    index += 1
    if (!pool) {
      throw new Error('No test pool configured for repository call')
    }
    return pool
  })
}

async function signStripePayload(
  payload: string,
  secret: string,
  timestamp: number,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  )
  const hex = [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  return `t=${timestamp},v1=${hex}`
}

describe('stripe service', () => {
  it('creates checkout sessions through Stripe REST form encoding', async () => {
    const requests: Request[] = []
    const session = await createStripeCheckoutSession(
      {
        cancelUrl: 'https://lextract.io/cancel',
        extractionId: 'extraction-id',
        productType: 'single',
        successUrl: 'https://lextract.io/success',
        userId: 'user-id',
      },
      env,
      {
        fetch: (request) => {
          requests.push(request)
          return Promise.resolve(
            new Response(
              JSON.stringify({
                id: 'cs_test',
                url: 'https://checkout.stripe.com/session',
              }),
              { headers: { 'Content-Type': 'application/json' } },
            ),
          )
        },
      },
    )

    expect(session).toEqual({
      checkoutUrl: 'https://checkout.stripe.com/session',
      sessionId: 'cs_test',
    })
    const body = new TextDecoder().decode(await requests[0]?.arrayBuffer())
    expect(body).toContain('mode=payment')
    expect(body).toContain('metadata%5Bproduct_type%5D=single')
    expect(requests[0]?.headers.get('Authorization')).toMatch(/^Basic /)
  })

  it('rejects Stripe checkout provider errors and invalid responses', async () => {
    await expect(
      createStripeCheckoutSession(
        {
          cancelUrl: 'https://lextract.io/cancel',
          productType: 'credit_pack_5',
          successUrl: 'https://lextract.io/success',
          userId: 'user-id',
        },
        { ENVIRONMENT: 'test', FRONTEND_URL: 'https://lextract.io' },
        { fetch: () => Promise.resolve(new Response('{}')) },
      ),
    ).rejects.toThrow(/STRIPE_SECRET_KEY/)

    await expect(
      createStripeCheckoutSession(
        {
          cancelUrl: 'https://lextract.io/cancel',
          productType: 'credit_pack_5',
          successUrl: 'https://lextract.io/success',
          userId: 'user-id',
        },
        env,
        { fetch: () => Promise.resolve(new Response('bad', { status: 500 })) },
      ),
    ).rejects.toBeInstanceOf(StripeProviderError)

    await expect(
      createStripeCheckoutSession(
        {
          cancelUrl: 'https://lextract.io/cancel',
          productType: 'credit_pack_5',
          successUrl: 'https://lextract.io/success',
          userId: 'user-id',
        },
        env,
        {
          fetch: () =>
            Promise.resolve(
              new Response(JSON.stringify({ id: 'cs_test' }), {
                headers: { 'Content-Type': 'application/json' },
              }),
            ),
        },
      ),
    ).rejects.toBeInstanceOf(StripeProviderError)
  })

  it('calls the default Stripe fetch with the global receiver', async () => {
    const receiverCheckingFetch = function (
      this: typeof globalThis,
      request: Request,
    ): Promise<Response> {
      expect(this).toBe(globalThis)
      expect(request.url).toBe('https://api.stripe.com/v1/checkout/sessions')
      return Promise.resolve(
        new Response(
          JSON.stringify({
            id: 'cs_test',
            url: 'https://checkout.stripe.com/session',
          }),
          { headers: { 'Content-Type': 'application/json' } },
        ),
      )
    } as typeof fetch
    globalThis.fetch = receiverCheckingFetch

    await expect(
      createStripeCheckoutSession(
        {
          cancelUrl: 'https://lextract.io/cancel',
          productType: 'credit_pack_5',
          successUrl: 'https://lextract.io/success',
          userId: 'user-id',
        },
        env,
      ),
    ).resolves.toEqual({
      checkoutUrl: 'https://checkout.stripe.com/session',
      sessionId: 'cs_test',
    })
  })

  it('verifies Stripe v1 webhook signatures with timestamp tolerance', async () => {
    const payload = '{"id":"evt_1","type":"checkout.session.completed"}'
    const timestamp = 1_799_712_000
    const header = await signStripePayload(payload, 'whsec_test', timestamp)

    await expect(
      verifyStripeWebhookSignature(payload, header, 'whsec_test', {
        nowSeconds: timestamp + 10,
      }),
    ).resolves.toEqual({
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: {},
    })
  })

  it('rejects invalid Stripe webhook signatures', async () => {
    await expect(
      verifyStripeWebhookSignature(
        '{"id":"evt_1"}',
        't=1799712000,v1=bad',
        'whsec_test',
        { nowSeconds: 1_799_712_000 },
      ),
    ).rejects.toThrow(/signature/i)
  })

  it('rejects stale, malformed, and invalid webhook payloads', async () => {
    const payload = '{"id":"evt_1","type":"checkout.session.completed"}'
    const header = await signStripePayload(payload, 'whsec_test', 1_799_712_000)

    await expect(
      verifyStripeWebhookSignature(payload, header, 'whsec_test', {
        nowSeconds: 1_799_712_500,
      }),
    ).rejects.toBeInstanceOf(StripeSignatureError)

    await expect(
      verifyStripeWebhookSignature(payload, 'v1=missing_timestamp', 'whsec_test', {
        nowSeconds: 1_799_712_000,
      }),
    ).rejects.toBeInstanceOf(StripeSignatureError)

    const invalidPayloadHeader = await signStripePayload(
      '{"object":"event"}',
      'whsec_test',
      1_799_712_000,
    )
    await expect(
      verifyStripeWebhookSignature(
        '{"object":"event"}',
        invalidPayloadHeader,
        'whsec_test',
        { nowSeconds: 1_799_712_000 },
      ),
    ).rejects.toBeInstanceOf(StripeSignatureError)
  })
})

describe('checkout webhook processor', () => {
  it('processes credit-pack checkout sessions', async () => {
    const paymentPool = new SequencePool([[], [{ id: 'payment-id' }]])
    const creditsPool = new SequencePool([
      [],
      [{ credits_balance: 2 }],
      [],
      [],
      [],
      [],
    ])
    configurePools([paymentPool, creditsPool])

    await processCheckoutCompleted(
      {
        amount_total: 6500,
        id: 'cs_test',
        metadata: { product_type: 'credit_pack_5', user_id: 'user-id' },
        payment_intent: 'pi_1',
      },
      env,
    )

    expect(paymentPool.queries[1]?.text).toContain('INSERT INTO payments')
    expect(creditsPool.queries[4]?.text).toContain('credit_transactions')
  })

  it('processes single checkout sessions', async () => {
    const singlePool = new SequencePool([
      [],
      [],
      [],
      [{ id: 'extraction-id' }],
      [],
    ])
    configurePools([singlePool])

    await processCheckoutCompleted(
      {
        amount_total: 1500,
        id: 'cs_single',
        metadata: {
          extraction_id: 'extraction-id',
          product_type: 'single',
          user_id: 'user-id',
        },
      },
      env,
    )

    expect(singlePool.queries[2]?.text).toContain('INSERT INTO payments')
    expect(singlePool.queries[3]?.text).toContain('UPDATE extractions')
  })

  it('processes guest single sessions with payment intent metadata', async () => {
    const singlePool = new SequencePool([
      [],
      [],
      [],
      [{ id: 'extraction-id' }],
      [],
    ])
    configurePools([singlePool])

    await processCheckoutCompleted(
      {
        amount_total: 1500,
        id: 'cs_single',
        metadata: {
          anonymous_session_id: 'session-id',
          extraction_id: 'extraction-id',
          product_type: 'single',
        },
        payment_intent: 'pi_1',
      },
      env,
    )

    expect(singlePool.queries[2]?.values).toContain(null)
    expect(singlePool.queries[2]?.values).toContain('pi_1')
    expect(singlePool.queries[3]?.values).toContain('session-id')
  })

  it('rejects permanently invalid checkout metadata', async () => {
    await expect(
      processCheckoutCompleted(
        {
          amount_total: 1500,
          id: 'cs_single',
          metadata: { product_type: 'single', user_id: 'user-id' },
        },
        env,
      ),
    ).rejects.toThrow(/extraction_id/i)
  })

  it('rejects checkout sessions without a user or known product type', async () => {
    await expect(processCheckoutCompleted(null, env)).rejects.toThrow(/product_type/i)

    await expect(
      processCheckoutCompleted(
        {
          amount_total: 6500,
          id: 'cs_pack',
          metadata: { product_type: 'credit_pack_5' },
        },
        env,
      ),
    ).rejects.toThrow(/user_id/i)

    await expect(
      processCheckoutCompleted(
        {
          amount_total: 6500,
          id: 'cs_pack',
          metadata: { product_type: 'unknown', user_id: 'user-id' },
        },
        env,
      ),
    ).rejects.toThrow(/product_type/i)
  })
})

describe('webhook routes', () => {
  it('returns received true for duplicate webhook events without side effects', async () => {
    const payload = JSON.stringify({
      data: { object: { metadata: {} } },
      id: 'evt_1',
      type: 'checkout.session.completed',
    })
    const header = await signStripePayload(payload, 'whsec_test', 1_799_712_000)
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/webhooks',
      createWebhooksRoutes({
        claimWebhookEvent: () => Promise.resolve('processed'),
        completeWebhookEvent: () => Promise.reject(new Error('unused')),
        failWebhookEvent: () => Promise.reject(new Error('unused')),
        processCheckoutCompleted: () => Promise.reject(new Error('unused')),
        verifyStripeWebhookSignature: () =>
          Promise.resolve({
            data: { object: { metadata: {} } },
            id: 'evt_1',
            type: 'checkout.session.completed',
          }),
      }),
    )

    const response = await app.fetch(
      new Request('https://api.lextract.io/api/v1/webhooks/stripe', {
        body: payload,
        headers: { 'Stripe-Signature': header },
        method: 'POST',
      }),
      env,
    )

    expect(response.status).toBe(200)
    await expect(jsonBody<unknown>(response)).resolves.toEqual({ received: true })
  })

  it('claims and completes checkout session webhooks after side effects', async () => {
    const calls: string[] = []
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/webhooks',
      createWebhooksRoutes({
        claimWebhookEvent: () => {
          calls.push('claim')
          return Promise.resolve('claimed')
        },
        completeWebhookEvent: () => {
          calls.push('complete')
          return Promise.resolve()
        },
        failWebhookEvent: () => Promise.resolve(),
        processCheckoutCompleted: () => {
          calls.push('process')
          return Promise.resolve()
        },
        verifyStripeWebhookSignature: () =>
          Promise.resolve({
            data: { object: { metadata: { product_type: 'credit_pack_5' } } },
            id: 'evt_1',
            type: 'checkout.session.completed',
          }),
      }),
    )

    const response = await app.fetch(
      new Request('https://api.lextract.io/api/v1/webhooks/stripe', {
        body: '{"id":"evt_1"}',
        headers: { 'Stripe-Signature': 't=1,v1=test' },
        method: 'POST',
      }),
      env,
    )

    expect(response.status).toBe(200)
    expect(calls).toEqual(['claim', 'process', 'complete'])
  })

  it('rejects webhooks without signatures', async () => {
    const app = new Hono<AppBindings>()
    app.route('/api/v1/webhooks', createWebhooksRoutes())

    const response = await app.fetch(
      new Request('https://api.lextract.io/api/v1/webhooks/stripe', {
        body: '{}',
        method: 'POST',
      }),
      env,
    )

    expect(response.status).toBe(400)
  })

  it('throws when webhook secret is not configured', async () => {
    const app = new Hono<AppBindings>()
    app.route('/api/v1/webhooks', createWebhooksRoutes())

    const response = await app.fetch(
      new Request('https://api.lextract.io/api/v1/webhooks/stripe', {
        body: '{}',
        headers: { 'Stripe-Signature': 't=1,v1=test' },
        method: 'POST',
      }),
      { ENVIRONMENT: 'test', FRONTEND_URL: 'https://lextract.io' },
    )

    expect(response.status).toBe(500)
  })

  it('marks claimed webhook events failed when processing throws', async () => {
    const calls: string[] = []
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/webhooks',
      createWebhooksRoutes({
        claimWebhookEvent: () => Promise.resolve('claimed'),
        completeWebhookEvent: () => Promise.reject(new Error('unused')),
        failWebhookEvent: (_eventId, reason) => {
          calls.push(reason)
          return Promise.resolve()
        },
        processCheckoutCompleted: () =>
          Promise.reject(new PermanentWebhookError('permanent failure')),
        verifyStripeWebhookSignature: () =>
          Promise.resolve({
            data: { object: { metadata: { product_type: 'single' } } },
            id: 'evt_1',
            type: 'checkout.session.completed',
          }),
      }),
    )

    const response = await app.fetch(
      new Request('https://api.lextract.io/api/v1/webhooks/stripe', {
        body: '{"id":"evt_1"}',
        headers: { 'Stripe-Signature': 't=1,v1=test' },
        method: 'POST',
      }),
      env,
    )

    expect(response.status).toBe(200)
    expect(calls).toEqual(['permanent failure'])
  })

  it('rethrows transient webhook processing failures for Stripe retry', async () => {
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/webhooks',
      createWebhooksRoutes({
        claimWebhookEvent: () => Promise.resolve('claimed'),
        completeWebhookEvent: () => Promise.reject(new Error('unused')),
        failWebhookEvent: () => Promise.reject(new Error('unused')),
        processCheckoutCompleted: () =>
          Promise.reject(new Error('database offline')),
        verifyStripeWebhookSignature: () =>
          Promise.resolve({
            data: { object: { metadata: { product_type: 'single' } } },
            id: 'evt_1',
            type: 'checkout.session.completed',
          }),
      }),
    )

    const response = await app.fetch(
      new Request('https://api.lextract.io/api/v1/webhooks/stripe', {
        body: '{"id":"evt_1"}',
        headers: { 'Stripe-Signature': 't=1,v1=test' },
        method: 'POST',
      }),
      env,
    )

    expect(response.status).toBe(500)
  })

  it('runs default webhook dependencies end to end for duplicate events', async () => {
    const payload = JSON.stringify({
      id: 'evt_duplicate',
      type: 'charge.refunded',
    })
    const header = await signStripePayload(
      payload,
      'whsec_test',
      Math.floor(Date.now() / 1000),
    )
    const claimPool = new SequencePool([[]])
    configurePools([claimPool])
    const app = new Hono<AppBindings>()
    app.route('/api/v1/webhooks', createWebhooksRoutes())

    const response = await app.fetch(
      new Request('https://api.lextract.io/api/v1/webhooks/stripe', {
        body: payload,
        headers: { 'Stripe-Signature': header },
        method: 'POST',
      }),
      { ...env, STRIPE_WEBHOOK_SECRET: 'whsec_test' },
    )

    expect(response.status).toBe(200)
    expect(claimPool.queries.map((query) => query.text.trim().split(/\s+/)[0])).toEqual([
      'BEGIN',
      'INSERT',
      'SELECT',
      'COMMIT',
    ])
    expect(claimPool.queries[1]?.text).toContain('stripe_webhook_events')
  })

  it('maps invalid webhook signatures to 400', async () => {
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/webhooks',
      createWebhooksRoutes({
        claimWebhookEvent: () => Promise.reject(new Error('unused')),
        completeWebhookEvent: () => Promise.reject(new Error('unused')),
        failWebhookEvent: () => Promise.reject(new Error('unused')),
        processCheckoutCompleted: () => Promise.reject(new Error('unused')),
        verifyStripeWebhookSignature: () =>
          Promise.reject(new StripeSignatureError('bad signature')),
      }),
    )

    const response = await app.fetch(
      new Request('https://api.lextract.io/api/v1/webhooks/stripe', {
        body: '{}',
        headers: { 'Stripe-Signature': 't=1,v1=bad' },
        method: 'POST',
      }),
      env,
    )

    expect(response.status).toBe(400)
  })

  it('rethrows unexpected webhook verification errors', async () => {
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/webhooks',
      createWebhooksRoutes({
        claimWebhookEvent: () => Promise.reject(new Error('unused')),
        completeWebhookEvent: () => Promise.reject(new Error('unused')),
        failWebhookEvent: () => Promise.reject(new Error('unused')),
        processCheckoutCompleted: () => Promise.reject(new Error('unused')),
        verifyStripeWebhookSignature: () =>
          Promise.reject(new Error('verification service unavailable')),
      }),
    )

    const response = await app.fetch(
      new Request('https://api.lextract.io/api/v1/webhooks/stripe', {
        body: '{}',
        headers: { 'Stripe-Signature': 't=1,v1=test' },
        method: 'POST',
      }),
      env,
    )

    expect(response.status).toBe(500)
  })
})
