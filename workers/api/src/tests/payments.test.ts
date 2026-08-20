import { Hono } from 'hono'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  CheckoutNotFoundError,
  CheckoutValidationError,
  ConflictPaymentError,
  InsufficientCreditsPaymentError,
  NotFoundPaymentError,
  addCredits,
  claimWebhookEvent,
  completeWebhookEvent,
  configurePaymentRepositoryDb,
  failWebhookEvent,
  getCredits,
  getPaymentHistory,
  recordPayment,
  recordSinglePaymentAndUnlock,
  useCredit,
  validateCheckoutOwnership,
} from '../repositories/payments'
import type { DbPoolLike, DbQueryResult } from '../repositories/db'
import { createPaymentsRoutes } from '../routes/payments'
import { defaultPaymentRouteDependencies } from '../routes/payments'
import { StripeProviderError } from '../services/stripe'
import type { AuthDependencies } from '../services/neon-auth'
import type { Env, AppBindings } from '../types'
import { bearerRequest, jsonBody, routeTestEnv } from './route-test-helpers'

const env: Env = {
  ...routeTestEnv,
  HYPERDRIVE: {
    connectionString: 'postgres://user:pass@example.com:5432/lextract',
  } as Hyperdrive,
  STRIPE_SECRET_KEY: 'sk_test_secret',
}

function authDependencies(): AuthDependencies {
  return {
    findAnonymousSession: () => Promise.resolve(null),
    findUserByAuthSubject: () =>
      Promise.resolve({
        authSubject: 'user-id',
        email: 'owner@example.com',
        id: 'user-id',
      }),
    verifyBearerToken: () =>
      Promise.resolve({ email: 'owner@example.com', subject: 'user-id' }),
  }
}

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

afterEach(() => {
  configurePaymentRepositoryDb(null)
  vi.unstubAllGlobals()
})

describe('payments routes', () => {
  it('creates authenticated checkout sessions for owned unpaid extractions', async () => {
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/payments',
      createPaymentsRoutes({
        authDependencies: authDependencies(),
        createCheckoutSession: (input) => {
          expect(input).toMatchObject({
            extractionId: 'extraction-id',
            productType: 'single',
            userId: 'user-id',
          })
          return Promise.resolve({
            checkoutUrl: 'https://checkout.stripe.com/session',
            sessionId: 'cs_test',
          })
        },
        getCredits: () => Promise.reject(new Error('unused')),
        getPaymentHistory: () => Promise.reject(new Error('unused')),
        useCredit: () => Promise.reject(new Error('unused')),
      }),
    )

    const response = await app.fetch(
      bearerRequest('/api/v1/payments/checkout', {
        body: JSON.stringify({
          cancel_url: 'https://lextract.io/cancel',
          extraction_id: 'extraction-id',
          product_type: 'single',
          success_url: 'https://lextract.io/success',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
      routeTestEnv,
    )

    expect(response.status).toBe(200)
    await expect(jsonBody<unknown>(response)).resolves.toEqual({
      checkout_url: 'https://checkout.stripe.com/session',
      session_id: 'cs_test',
    })
  })

  it('returns 404 for checkout ownership failures', async () => {
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/payments',
      createPaymentsRoutes({
        authDependencies: authDependencies(),
        createCheckoutSession: () =>
          Promise.reject(new CheckoutNotFoundError('Extraction not found')),
        getCredits: () => Promise.reject(new Error('unused')),
        getPaymentHistory: () => Promise.reject(new Error('unused')),
        useCredit: () => Promise.reject(new Error('unused')),
      }),
    )

    const response = await app.fetch(
      bearerRequest('/api/v1/payments/checkout', {
        body: JSON.stringify({
          cancel_url: 'https://lextract.io/cancel',
          extraction_id: 'extraction-id',
          product_type: 'single',
          success_url: 'https://lextract.io/success',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
      routeTestEnv,
    )

    expect(response.status).toBe(404)
  })

  it('requires auth or guest email for checkout', async () => {
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/payments',
      createPaymentsRoutes({
        authDependencies: {
          findAnonymousSession: () => Promise.resolve(null),
          findUserByAuthSubject: () => Promise.resolve(null),
          verifyBearerToken: () => Promise.reject(new Error('unused')),
        },
        createCheckoutSession: () => Promise.reject(new Error('unused')),
        getCredits: () => Promise.reject(new Error('unused')),
        getPaymentHistory: () => Promise.reject(new Error('unused')),
        useCredit: () => Promise.reject(new Error('unused')),
      }),
    )

    const response = await app.fetch(
      new Request('https://api.lextract.io/api/v1/payments/checkout', {
        body: JSON.stringify({
          cancel_url: 'https://lextract.io/cancel',
          product_type: 'credit_pack_5',
          success_url: 'https://lextract.io/success',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
      routeTestEnv,
    )

    expect(response.status).toBe(401)
  })

  it('rejects invalid checkout URLs and missing single extraction IDs', async () => {
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/payments',
      createPaymentsRoutes({
        authDependencies: authDependencies(),
        createCheckoutSession: () => Promise.reject(new Error('unused')),
        getCredits: () => Promise.reject(new Error('unused')),
        getPaymentHistory: () => Promise.reject(new Error('unused')),
        useCredit: () => Promise.reject(new Error('unused')),
      }),
    )

    const badUrl = await app.fetch(
      bearerRequest('/api/v1/payments/checkout', {
        body: JSON.stringify({
          cancel_url: 'http://lextract.io/cancel',
          product_type: 'credit_pack_5',
          success_url: 'https://lextract.io/success',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
      routeTestEnv,
    )
    const missingExtraction = await app.fetch(
      bearerRequest('/api/v1/payments/checkout', {
        body: JSON.stringify({
          cancel_url: 'https://lextract.io/cancel',
          product_type: 'single',
          success_url: 'https://lextract.io/success',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
      routeTestEnv,
    )

    expect(badUrl.status).toBe(422)
    expect(missingExtraction.status).toBe(422)
  })

  it('uses one credit and maps payment errors', async () => {
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/payments',
      createPaymentsRoutes({
        authDependencies: authDependencies(),
        createCheckoutSession: () => Promise.reject(new Error('unused')),
        getCredits: () => Promise.reject(new Error('unused')),
        getPaymentHistory: () => Promise.reject(new Error('unused')),
        useCredit: (input) => {
          expect(input).toEqual({ extractionId: 'extraction-id', userId: 'user-id' })
          return Promise.resolve({ extractionId: 'extraction-id', newBalance: 2 })
        },
      }),
    )

    const response = await app.fetch(
      bearerRequest('/api/v1/payments/use-credit', {
        body: JSON.stringify({ extraction_id: 'extraction-id' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
      routeTestEnv,
    )

    expect(response.status).toBe(200)
    await expect(jsonBody<unknown>(response)).resolves.toEqual({
      extraction_id: 'extraction-id',
      new_balance: 2,
      success: true,
    })
  })

  it('maps credit payment errors to their status codes', async () => {
    const errors = [
      { error: new InsufficientCreditsPaymentError('Insufficient credits'), status: 402 },
      { error: new ConflictPaymentError('Extraction is already paid'), status: 409 },
      { error: new NotFoundPaymentError('Extraction not found'), status: 404 },
    ]

    for (const item of errors) {
      const app = new Hono<AppBindings>()
      app.route(
        '/api/v1/payments',
        createPaymentsRoutes({
          authDependencies: authDependencies(),
          createCheckoutSession: () => Promise.reject(new Error('unused')),
          getCredits: () => Promise.reject(new Error('unused')),
          getPaymentHistory: () => Promise.reject(new Error('unused')),
          useCredit: () => Promise.reject(item.error),
        }),
      )
      const response = await app.fetch(
        bearerRequest('/api/v1/payments/use-credit', {
          body: JSON.stringify({ extraction_id: 'extraction-id' }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        }),
        routeTestEnv,
      )
      expect(response.status).toBe(item.status)
    }
  })

  it('rejects invalid payment history pagination', async () => {
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/payments',
      createPaymentsRoutes({
        authDependencies: authDependencies(),
        createCheckoutSession: () => Promise.reject(new Error('unused')),
        getCredits: () => Promise.reject(new Error('unused')),
        getPaymentHistory: () => Promise.reject(new Error('unused')),
        useCredit: () => Promise.reject(new Error('unused')),
      }),
    )

    const response = await app.fetch(
      bearerRequest('/api/v1/payments/history?page=0&page_size=101'),
      routeTestEnv,
    )

    expect(response.status).toBe(422)
  })

  it('returns credit balance and payment history in frontend shape', async () => {
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/payments',
      createPaymentsRoutes({
        authDependencies: authDependencies(),
        createCheckoutSession: () => Promise.reject(new Error('unused')),
        getCredits: () =>
          Promise.resolve({
            balance: 5,
            recentTransactions: [
              {
                amount: 5,
                balanceAfter: 5,
                createdAt: '2026-06-10T12:00:00.000Z',
                description: '5-credit pack purchase',
                id: 'tx-id',
              },
            ],
          }),
        getPaymentHistory: () =>
          Promise.resolve({
            page: 1,
            pageSize: 20,
            payments: [
              {
                amountCents: 6500,
                createdAt: '2026-06-10T12:00:00.000Z',
                currency: 'usd',
                id: 'payment-id',
                paymentType: 'credit_pack_5',
                status: 'completed',
              },
            ],
            total: 1,
          }),
        useCredit: () => Promise.reject(new Error('unused')),
      }),
    )

    const credits = await app.fetch(
      bearerRequest('/api/v1/payments/credits'),
      routeTestEnv,
    )
    const history = await app.fetch(
      bearerRequest('/api/v1/payments/history?page=1&page_size=20'),
      routeTestEnv,
    )

    expect(credits.status).toBe(200)
    await expect(jsonBody<unknown>(credits)).resolves.toEqual({
      balance: 5,
      recent_transactions: [
        {
          amount: 5,
          balance_after: 5,
          created_at: '2026-06-10T12:00:00.000Z',
          description: '5-credit pack purchase',
          id: 'tx-id',
        },
      ],
    })
    expect(history.status).toBe(200)
    await expect(jsonBody<unknown>(history)).resolves.toEqual({
      page: 1,
      page_size: 20,
      payments: [
        {
          amount_cents: 6500,
          created_at: '2026-06-10T12:00:00.000Z',
          currency: 'usd',
          id: 'payment-id',
          payment_type: 'credit_pack_5',
          status: 'completed',
        },
      ],
      total: 1,
    })
  })

  it('runs the default checkout dependency with repository validation and Stripe fetch', async () => {
    const pool = new SequencePool([[{ id: 'extraction-id' }]])
    configurePools([pool])
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            id: 'cs_test',
            url: 'https://checkout.stripe.com/session',
          }),
          { headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const dependencies = defaultPaymentRouteDependencies()
    dependencies.authDependencies = authDependencies()
    const app = new Hono<AppBindings>()
    app.route('/api/v1/payments', createPaymentsRoutes(dependencies))

    const response = await app.fetch(
      bearerRequest('/api/v1/payments/checkout', {
        body: JSON.stringify({
          cancel_url: 'https://lextract.io/cancel',
          extraction_id: 'extraction-id',
          product_type: 'single',
          success_url: 'https://lextract.io/success',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
      env,
    )

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(pool.queries[0]?.text).toContain('SELECT id')
  })

  it('runs default guest checkout with anonymous session metadata', async () => {
    const authDeps: AuthDependencies = {
      findAnonymousSession: () =>
        Promise.resolve({
          email: null,
          expiresAt: new Date(Date.now() + 60_000),
          id: 'session-id',
          linkedUserId: null,
          sessionToken: 'session-token',
        }),
      findUserByAuthSubject: () => Promise.resolve(null),
      verifyBearerToken: () => Promise.reject(new Error('unused')),
    }
    const pool = new SequencePool([[{ id: 'extraction-id' }]])
    configurePools([pool])
    const requests: Request[] = []
    vi.stubGlobal('fetch', (request: Request) => {
      requests.push(request)
      return Promise.resolve(
        new Response(
          JSON.stringify({
            id: 'cs_guest',
            url: 'https://checkout.stripe.com/guest',
          }),
          { headers: { 'Content-Type': 'application/json' } },
        ),
      )
    })

    const dependencies = defaultPaymentRouteDependencies()
    dependencies.authDependencies = authDeps
    const app = new Hono<AppBindings>()
    app.route('/api/v1/payments', createPaymentsRoutes(dependencies))

    const response = await app.fetch(
      new Request('https://api.lextract.io/api/v1/payments/checkout', {
        body: JSON.stringify({
          cancel_url: 'https://lextract.io/cancel',
          extraction_id: 'extraction-id',
          guest_email: 'guest@example.com',
          product_type: 'single',
          success_url: 'https://lextract.io/success',
        }),
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': 'session-token',
        },
        method: 'POST',
      }),
      env,
    )

    expect(response.status).toBe(200)
    expect(pool.queries[0]?.text).toContain('anonymous_session_id = $2')
    expect(pool.queries[0]?.values).toEqual([
      'extraction-id',
      'session-id',
      'guest@example.com',
    ])
    const body = new TextDecoder().decode(await requests[0]?.arrayBuffer())
    expect(body).toContain('customer_email=guest%40example.com')
    expect(body).toContain('metadata%5Banonymous_session_id%5D=session-id')
    expect(body).not.toContain('metadata%5Buser_id%5D=')
  })

  it('maps Stripe provider errors to 502', async () => {
    const app = new Hono<AppBindings>()
    app.route(
      '/api/v1/payments',
      createPaymentsRoutes({
        authDependencies: authDependencies(),
        createCheckoutSession: () =>
          Promise.reject(new StripeProviderError('Payment provider error - please try again')),
        getCredits: () => Promise.reject(new Error('unused')),
        getPaymentHistory: () => Promise.reject(new Error('unused')),
        useCredit: () => Promise.reject(new Error('unused')),
      }),
    )

    const response = await app.fetch(
      bearerRequest('/api/v1/payments/checkout', {
        body: JSON.stringify({
          cancel_url: 'https://lextract.io/cancel',
          product_type: 'credit_pack_5',
          success_url: 'https://lextract.io/success',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
      routeTestEnv,
    )

    expect(response.status).toBe(502)
  })

  it('rethrows unexpected checkout and credit errors', async () => {
    const checkoutApp = new Hono<AppBindings>()
    checkoutApp.route(
      '/api/v1/payments',
      createPaymentsRoutes({
        authDependencies: authDependencies(),
        createCheckoutSession: () => Promise.reject(new Error('database offline')),
        getCredits: () => Promise.reject(new Error('unused')),
        getPaymentHistory: () => Promise.reject(new Error('unused')),
        useCredit: () => Promise.reject(new Error('unused')),
      }),
    )
    const checkout = await checkoutApp.fetch(
      bearerRequest('/api/v1/payments/checkout', {
        body: JSON.stringify({
          cancel_url: 'https://lextract.io/cancel',
          product_type: 'credit_pack_5',
          success_url: 'https://lextract.io/success',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
      routeTestEnv,
    )
    expect(checkout.status).toBe(500)

    const creditApp = new Hono<AppBindings>()
    creditApp.route(
      '/api/v1/payments',
      createPaymentsRoutes({
        authDependencies: authDependencies(),
        createCheckoutSession: () => Promise.reject(new Error('unused')),
        getCredits: () => Promise.reject(new Error('unused')),
        getPaymentHistory: () => Promise.reject(new Error('unused')),
        useCredit: () => Promise.reject(new Error('database offline')),
      }),
    )
    const credit = await creditApp.fetch(
      bearerRequest('/api/v1/payments/use-credit', {
        body: JSON.stringify({ extraction_id: 'extraction-id' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
      routeTestEnv,
    )
    expect(credit.status).toBe(500)
  })
})

describe('payments repository', () => {
  it('validates checkout ownership for users and guests', async () => {
    const userPool = new SequencePool([[{ id: 'extraction-id' }]])
    configurePools([userPool])
    await expect(
      validateCheckoutOwnership(
        {
          extractionId: 'extraction-id',
          productType: 'single',
          userId: 'user-id',
        },
        env,
      ),
    ).resolves.toBeUndefined()

    const guestPool = new SequencePool([[{ id: 'extraction-id' }]])
    configurePools([guestPool])
    await expect(
      validateCheckoutOwnership(
        {
          anonymousSessionId: 'session-id',
          extractionId: 'extraction-id',
          guestEmail: 'guest@example.com',
          productType: 'single',
        },
        env,
      ),
    ).resolves.toBeUndefined()
    expect(guestPool.queries[0]?.text).toContain('guest_email')
  })

  it('rejects checkout validation failures', async () => {
    await expect(
      validateCheckoutOwnership({ productType: 'single', userId: 'user-id' }, env),
    ).rejects.toBeInstanceOf(CheckoutValidationError)

    const missingUserExtraction = new SequencePool([[]])
    configurePools([missingUserExtraction])
    await expect(
      validateCheckoutOwnership(
        {
          extractionId: 'missing',
          productType: 'single',
          userId: 'user-id',
        },
        env,
      ),
    ).rejects.toBeInstanceOf(CheckoutNotFoundError)

    const missingGuestExtraction = new SequencePool([[]])
    configurePools([missingGuestExtraction])
    await expect(
      validateCheckoutOwnership(
        {
          anonymousSessionId: 'session-id',
          extractionId: 'missing',
          guestEmail: 'guest@example.com',
          productType: 'single',
        },
        env,
      ),
    ).rejects.toBeInstanceOf(CheckoutNotFoundError)
  })

  it('skips checkout ownership validation for credit packs', async () => {
    configurePools([])
    await expect(
      validateCheckoutOwnership({ productType: 'credit_pack_5', userId: 'user-id' }, env),
    ).resolves.toBeUndefined()
  })

  it('deducts exactly one credit inside a transaction', async () => {
    const pool = new SequencePool([
      [],
      [{ id: 'extraction-id', payment_status: 'unpaid', user_id: 'user-id' }],
      [{ credits_balance: 3 }],
      [{ id: 'user-id' }],
      [],
      [{ id: 'extraction-id' }],
      [],
    ])
    configurePaymentRepositoryDb(() => pool)

    await expect(
      useCredit({ extractionId: 'extraction-id', userId: 'user-id' }, env),
    ).resolves.toEqual({ extractionId: 'extraction-id', newBalance: 2 })

    expect(pool.queries.map((query) => query.text.trim().split(/\s+/)[0])).toEqual([
      'BEGIN',
      'SELECT',
      'SELECT',
      'UPDATE',
      'INSERT',
      'UPDATE',
      'COMMIT',
    ])
    expect(pool.queries[4]?.text).toContain('credit_transactions')
    expect(pool.queries[4]?.values).toContain(-1)
    expect(pool.ended).toBe(true)
  })

  it('maps credit spending failures to typed errors', async () => {
    const missingExtraction = new SequencePool([[], []])
    configurePaymentRepositoryDb(() => missingExtraction)
    await expect(
      useCredit({ extractionId: 'missing', userId: 'user-id' }, env),
    ).rejects.toBeInstanceOf(NotFoundPaymentError)

    const alreadyPaid = new SequencePool([
      [],
      [{ id: 'extraction-id', payment_status: 'paid', user_id: 'user-id' }],
    ])
    configurePaymentRepositoryDb(() => alreadyPaid)
    await expect(
      useCredit({ extractionId: 'extraction-id', userId: 'user-id' }, env),
    ).rejects.toBeInstanceOf(ConflictPaymentError)

    const noCredits = new SequencePool([
      [],
      [{ id: 'extraction-id', payment_status: 'unpaid', user_id: 'user-id' }],
      [{ credits_balance: 0 }],
    ])
    configurePaymentRepositoryDb(() => noCredits)
    await expect(
      useCredit({ extractionId: 'extraction-id', userId: 'user-id' }, env),
    ).rejects.toBeInstanceOf(InsufficientCreditsPaymentError)
  })

  it('detects credit spending update conflicts', async () => {
    const userUpdateConflict = new SequencePool([
      [],
      [{ id: 'extraction-id', payment_status: 'unpaid', user_id: 'user-id' }],
      [{ credits_balance: 3 }],
      [],
    ])
    configurePools([userUpdateConflict])
    await expect(
      useCredit({ extractionId: 'extraction-id', userId: 'user-id' }, env),
    ).rejects.toBeInstanceOf(ConflictPaymentError)

    const extractionUpdateConflict = new SequencePool([
      [],
      [{ id: 'extraction-id', payment_status: 'unpaid', user_id: 'user-id' }],
      [{ credits_balance: 3 }],
      [{ id: 'user-id' }],
      [],
      [],
    ])
    configurePools([extractionUpdateConflict])
    await expect(
      useCredit({ extractionId: 'extraction-id', userId: 'user-id' }, env),
    ).rejects.toBeInstanceOf(ConflictPaymentError)
  })

  it('loads credits and payment history', async () => {
    const pool = new SequencePool([
      [{ credits_balance: 5 }],
      [
        {
          amount: 5,
          balance_after: 5,
          created_at: '2026-06-10T12:00:00.000Z',
          description: '5-credit pack purchase',
          id: 'tx-id',
        },
      ],
      [{ count: '1' }],
      [
        {
          amount_cents: 6500,
          created_at: '2026-06-10T12:00:00.000Z',
          currency: 'usd',
          id: 'payment-id',
          payment_type: 'credit_pack_5',
          status: 'completed',
        },
      ],
    ])
    configurePaymentRepositoryDb(() => pool)

    await expect(getCredits('user-id', env)).resolves.toMatchObject({
      balance: 5,
      recentTransactions: [{ id: 'tx-id' }],
    })
    await expect(
      getPaymentHistory({ page: 1, pageSize: 20, userId: 'user-id' }, env),
    ).resolves.toMatchObject({ payments: [{ id: 'payment-id' }], total: 1 })
  })

  it('claims webhook events idempotently', async () => {
    const pool = new SequencePool([[], [{ id: 'evt_1' }], []])
    configurePaymentRepositoryDb(() => pool)

    await expect(
      claimWebhookEvent({ eventId: 'evt_1', eventType: 'checkout.session.completed' }, env),
    ).resolves.toBe('claimed')

    const duplicatePool = new SequencePool([
      [],
      [],
      [{ processed_at: '2026-06-12T00:00:00.000Z', failed_at: null }],
      [],
    ])
    configurePaymentRepositoryDb(() => duplicatePool)
    await expect(
      claimWebhookEvent({ eventId: 'evt_1', eventType: 'checkout.session.completed' }, env),
    ).resolves.toBe('processed')
  })

  it('reclaims pending webhook events so Stripe retries can finish side effects', async () => {
    const pendingPool = new SequencePool([
      [],
      [],
      [{ processed_at: null, failed_at: null }],
      [],
      [],
    ])
    configurePaymentRepositoryDb(() => pendingPool)

    await expect(
      claimWebhookEvent({ eventId: 'evt_pending', eventType: 'checkout.session.completed' }, env),
    ).resolves.toBe('claimed')

    expect(pendingPool.queries.map((query) => query.text.trim().split(/\s+/)[0])).toEqual([
      'BEGIN',
      'INSERT',
      'SELECT',
      'UPDATE',
      'COMMIT',
    ])
  })

  it('records payments idempotently', async () => {
    const existingPool = new SequencePool([[{ id: 'payment-id' }]])
    configurePools([existingPool])
    await expect(
      recordPayment(
        {
          amountCents: 6500,
          paymentType: 'credit_pack_5',
          stripeSessionId: 'cs_test',
          userId: 'user-id',
        },
        env,
      ),
    ).resolves.toEqual({ created: false, id: 'payment-id' })

    const insertPool = new SequencePool([[], [{ id: 'new-payment-id' }]])
    configurePools([insertPool])
    await expect(
      recordPayment(
        {
          amountCents: 6500,
          paymentType: 'credit_pack_5',
          stripePaymentIntentId: 'pi_1',
          stripeSessionId: 'cs_test',
          userId: 'user-id',
        },
        env,
      ),
    ).resolves.toEqual({ created: true, id: 'new-payment-id' })
  })

  it('raises conflict when payment insert races without a retrievable row', async () => {
    const pool = new SequencePool([[], [], []])
    configurePools([pool])

    await expect(
      recordPayment(
        {
          amountCents: 6500,
          paymentType: 'credit_pack_5',
          stripeSessionId: 'cs_test',
          userId: 'user-id',
        },
      env,
    ),
    ).rejects.toBeInstanceOf(ConflictPaymentError)
  })

  it('returns the existing payment when insert races and a row appears', async () => {
    const pool = new SequencePool([[], [], [{ id: 'payment-id' }]])
    configurePools([pool])

    await expect(
      recordPayment(
        {
          amountCents: 6500,
          paymentType: 'credit_pack_5',
          stripeSessionId: 'cs_race',
          userId: 'user-id',
        },
        env,
      ),
    ).resolves.toEqual({ created: false, id: 'payment-id' })
  })

  it('adds credits once per payment id', async () => {
    const grantPool = new SequencePool([
      [],
      [{ credits_balance: 2 }],
      [],
      [],
      [],
      [],
    ])
    configurePools([grantPool])
    const grant = await addCredits(
      {
        amount: 5,
        description: '5-credit pack purchase',
        paymentId: 'payment-id',
        userId: 'user-id',
      },
      env,
    )
    expect(grant.created).toBe(true)
    expect(grantPool.queries.map((query) => query.text.trim().split(/\s+/)[0])).toEqual([
      'BEGIN',
      'SELECT',
      'SELECT',
      'UPDATE',
      'INSERT',
      'COMMIT',
    ])

    const existingPool = new SequencePool([
      [],
      [{ credits_balance: 7 }],
      [{ id: 'tx-id' }],
      [],
    ])
    configurePools([existingPool])
    await expect(
      addCredits(
        {
          amount: 5,
          description: '5-credit pack purchase',
          paymentId: 'payment-id',
          userId: 'user-id',
        },
        env,
      ),
    ).resolves.toEqual({ created: false, id: 'tx-id' })
  })

  it('rejects invalid credit grants', async () => {
    await expect(
      addCredits(
        {
          amount: 0,
          description: 'bad grant',
          paymentId: 'payment-id',
          userId: 'user-id',
        },
        env,
      ),
    ).rejects.toBeInstanceOf(CheckoutValidationError)

    const missingUser = new SequencePool([[], []])
    configurePools([missingUser])
    await expect(
      addCredits(
        {
          amount: 5,
          description: '5-credit pack purchase',
          paymentId: 'payment-id',
          userId: 'missing-user',
        },
        env,
      ),
    ).rejects.toBeInstanceOf(NotFoundPaymentError)
  })

  it('records single payments and unlocks extractions', async () => {
    const pool = new SequencePool([[], [], [], [{ id: 'extraction-id' }], []])
    configurePools([pool])

    const result = await recordSinglePaymentAndUnlock(
      {
        amountCents: 1500,
        extractionId: 'extraction-id',
        stripePaymentIntentId: 'pi_1',
        stripeSessionId: 'cs_test',
        userId: 'user-id',
      },
      env,
    )

    expect(result.created).toBe(true)
    expect(pool.queries.map((query) => query.text.trim().split(/\s+/)[0])).toEqual([
      'BEGIN',
      'SELECT',
      'INSERT',
      'UPDATE',
      'COMMIT',
    ])
  })

  it('handles existing and guest single payment unlocks', async () => {
    const existingPool = new SequencePool([
      [],
      [{ id: 'payment-id' }],
      [],
      [],
    ])
    configurePools([existingPool])
    await expect(
      recordSinglePaymentAndUnlock(
        {
          amountCents: 1500,
          extractionId: 'extraction-id',
          stripeSessionId: 'cs_test',
          userId: 'user-id',
        },
        env,
      ),
    ).resolves.toEqual({ created: false, id: 'payment-id' })

    const guestPool = new SequencePool([[], [], [], [{ id: 'extraction-id' }], []])
    configurePools([guestPool])
    await recordSinglePaymentAndUnlock(
      {
        amountCents: 1500,
        extractionId: 'extraction-id',
        guestAnonymousSessionId: 'session-id',
        stripeSessionId: 'cs_guest',
      },
      env,
    )
    expect(guestPool.queries[3]?.values).toContain('session-id')
    expect(guestPool.queries[2]?.values).toContain(null)
  })

  it('rejects new single payments when extraction unlock fails', async () => {
    const pool = new SequencePool([[], [], [], []])
    configurePools([pool])

    await expect(
      recordSinglePaymentAndUnlock(
        {
          amountCents: 1500,
          extractionId: 'missing',
          stripeSessionId: 'cs_test',
          userId: 'user-id',
        },
      env,
    ),
    ).rejects.toBeInstanceOf(NotFoundPaymentError)
  })

  it('rejects registered single payment unlocks without a user id', async () => {
    const pool = new SequencePool([[], [], []])
    configurePools([pool])

    await expect(
      recordSinglePaymentAndUnlock(
        {
          amountCents: 1500,
          extractionId: 'extraction-id',
          stripeSessionId: 'cs_missing_user',
        },
        env,
      ),
    ).rejects.toBeInstanceOf(CheckoutValidationError)
    expect(pool.queries.map((query) => query.text.trim().split(/\s+/)[0])).toEqual([
      'BEGIN',
      'SELECT',
      'INSERT',
      'ROLLBACK',
    ])
  })

  it('marks webhook events complete or failed', async () => {
    const completePool = new SequencePool([[]])
    const failPool = new SequencePool([[]])
    configurePools([completePool, failPool])

    await completeWebhookEvent('evt_1', env)
    await failWebhookEvent('evt_2', 'failure reason', env)

    expect(completePool.queries[0]?.text).toContain('processed_at')
    expect(failPool.queries[0]?.values).toEqual(['evt_2', 'failure reason'])
  })
})
