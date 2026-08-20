import { Hono } from 'hono'
import { z } from 'zod'
import type { Context } from 'hono'

import {
  CheckoutNotFoundError,
  CheckoutValidationError,
  ConflictPaymentError,
  InsufficientCreditsPaymentError,
  NotFoundPaymentError,
  getCredits,
  getPaymentHistory,
  useCredit,
  validateCheckoutOwnership,
} from '../repositories/payments'
import type {
  CreditsSummary,
  PaymentHistory,
  PaymentHistoryInput,
  UseCreditInput,
  UseCreditResult,
} from '../repositories/payments'
import { createRequireUserAuth, createAuthMiddleware } from '../middleware/auth'
import type { AuthContext, AuthDependencies } from '../services/neon-auth'
import { createStripeCheckoutSession } from '../services/stripe'
import type { ProductType, StripeCheckoutInput, StripeCheckoutResult } from '../services/stripe'
import { StripeProviderError } from '../services/stripe'
import type { AppBindings, Env } from '../types'

const productTypeSchema = z.enum(['single', 'credit_pack_5', 'credit_pack_10'])
const httpsOrLocalUrl = z.string().min(1).max(2048).transform((value, context) => {
  const trimmed = value.trim()
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    context.addIssue({ code: 'custom', message: 'URL must be valid' })
    return z.NEVER
  }
  if (
    parsed.protocol === 'https:' ||
    (parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'))
  ) {
    return trimmed
  }
  context.addIssue({
    code: 'custom',
    message: 'URL must use https:// or localhost http://',
  })
  return z.NEVER
})
const optionalEmail = z
  .string()
  .trim()
  .email()
  .optional()
  .nullable()
  .transform((value) => (value === null ? undefined : value))
const checkoutSchema = z.object({
  cancel_url: httpsOrLocalUrl,
  extraction_id: z.string().min(1).optional().nullable(),
  guest_email: optionalEmail,
  product_type: productTypeSchema,
  success_url: httpsOrLocalUrl,
})
const useCreditSchema = z.object({
  extraction_id: z.string().min(1),
})

export interface CheckoutSessionInput {
  userId?: string
  productType: ProductType
  successUrl: string
  cancelUrl: string
  extractionId?: string
  guestEmail?: string
  anonymousSessionId?: string
}

export interface PaymentRouteDependencies {
  authDependencies?: AuthDependencies
  createCheckoutSession(input: CheckoutSessionInput, env: Env): Promise<StripeCheckoutResult>
  useCredit(input: UseCreditInput, env: Env): Promise<UseCreditResult>
  getCredits(userId: string, env: Env): Promise<CreditsSummary>
  getPaymentHistory(input: PaymentHistoryInput, env: Env): Promise<PaymentHistory>
}

type UserAuthContext = Extract<AuthContext, { kind: 'user' }>

function currentUser(c: Context<AppBindings>): UserAuthContext {
  // Safe because every caller is behind createRequireUserAuth middleware.
  return c.get('authContext') as UserAuthContext
}

async function defaultCreateCheckoutSession(
  input: CheckoutSessionInput,
  env: Env,
): Promise<StripeCheckoutResult> {
  await validateCheckoutOwnership(input, env)
  const stripeInput: StripeCheckoutInput = {
    cancelUrl: input.cancelUrl,
    productType: input.productType,
    successUrl: input.successUrl,
  }
  if (input.userId !== undefined) {
    stripeInput.userId = input.userId
  }
  if (input.extractionId !== undefined) {
    stripeInput.extractionId = input.extractionId
  }
  if (input.guestEmail !== undefined) {
    stripeInput.guestEmail = input.guestEmail
  }
  if (input.anonymousSessionId !== undefined) {
    stripeInput.anonymousSessionId = input.anonymousSessionId
  }
  return createStripeCheckoutSession(stripeInput, env)
}

export function defaultPaymentRouteDependencies(): PaymentRouteDependencies {
  return {
    createCheckoutSession: defaultCreateCheckoutSession,
    getCredits,
    getPaymentHistory,
    useCredit,
  }
}

function creditsResponse(summary: CreditsSummary): Record<string, unknown> {
  return {
    balance: summary.balance,
    recent_transactions: summary.recentTransactions.map((transaction) => ({
      amount: transaction.amount,
      balance_after: transaction.balanceAfter,
      created_at: transaction.createdAt,
      description: transaction.description,
      id: transaction.id,
    })),
  }
}

function historyResponse(history: PaymentHistory): Record<string, unknown> {
  return {
    page: history.page,
    page_size: history.pageSize,
    payments: history.payments.map((payment) => ({
      amount_cents: payment.amountCents,
      created_at: payment.createdAt,
      currency: payment.currency,
      id: payment.id,
      payment_type: payment.paymentType,
      status: payment.status,
    })),
    total: history.total,
  }
}

function mapPaymentError(error: unknown): Response | null {
  if (error instanceof CheckoutValidationError) {
    return Response.json({ detail: error.message }, { status: 422 })
  }
  if (error instanceof CheckoutNotFoundError || error instanceof NotFoundPaymentError) {
    return Response.json({ detail: error.message }, { status: 404 })
  }
  if (error instanceof ConflictPaymentError) {
    return Response.json({ detail: error.message }, { status: 409 })
  }
  if (error instanceof InsufficientCreditsPaymentError) {
    return Response.json({ detail: error.message }, { status: 402 })
  }
  if (error instanceof StripeProviderError) {
    return Response.json({ detail: error.message }, { status: 502 })
  }
  return null
}

export function createPaymentsRoutes(
  dependencies: PaymentRouteDependencies = defaultPaymentRouteDependencies(),
): Hono<AppBindings> {
  const payments = new Hono<AppBindings>()
  const auth = createAuthMiddleware(dependencies.authDependencies)
  const requireUser = createRequireUserAuth(dependencies.authDependencies)

  payments.post('/checkout', auth, async (c) => {
    const parsed = checkoutSchema.safeParse(await c.req.json())
    if (!parsed.success) {
      return c.json({ detail: 'Invalid checkout request' }, 422)
    }
    const body = parsed.data
    const authContext = c.get('authContext')
    const isUser = authContext.kind === 'user'
    const isGuest =
      authContext.kind === 'anonymous' && body.guest_email !== undefined
    if (!isUser && !isGuest) {
      return c.json(
        { detail: 'Authentication required or guest_email must be provided' },
        401,
      )
    }
    if (body.product_type === 'single' && !body.extraction_id) {
      return c.json(
        { detail: 'extraction_id is required for single purchases' },
        422,
      )
    }

    try {
      const checkoutInput: CheckoutSessionInput = {
        cancelUrl: body.cancel_url,
        productType: body.product_type,
        successUrl: body.success_url,
      }
      if (authContext.kind === 'user') {
        checkoutInput.userId = authContext.id
      }
      if (authContext.kind === 'anonymous') {
        checkoutInput.anonymousSessionId = authContext.id
      }
      if (body.extraction_id !== undefined && body.extraction_id !== null) {
        checkoutInput.extractionId = body.extraction_id
      }
      if (body.guest_email !== undefined) {
        checkoutInput.guestEmail = body.guest_email
      }
      const session = await dependencies.createCheckoutSession(
        checkoutInput,
        c.env,
      )
      return c.json({
        checkout_url: session.checkoutUrl,
        session_id: session.sessionId,
      })
    } catch (error) {
      const response = mapPaymentError(error)
      if (response !== null) {
        return response
      }
      throw error
    }
  })

  payments.post('/use-credit', requireUser, async (c) => {
    const authContext = currentUser(c)
    const parsed = useCreditSchema.safeParse(await c.req.json())
    if (!parsed.success) {
      return c.json({ detail: 'Invalid credit request' }, 422)
    }
    const body = parsed.data
    try {
      const result = await dependencies.useCredit(
        { extractionId: body.extraction_id, userId: authContext.id },
        c.env,
      )
      return c.json({
        extraction_id: result.extractionId,
        new_balance: result.newBalance,
        success: true,
      })
    } catch (error) {
      const response = mapPaymentError(error)
      if (response !== null) {
        return response
      }
      throw error
    }
  })

  payments.get('/credits', requireUser, async (c) => {
    const authContext = currentUser(c)
    return c.json(creditsResponse(await dependencies.getCredits(authContext.id, c.env)))
  })

  payments.get('/history', requireUser, async (c) => {
    const authContext = currentUser(c)
    const page = Number(c.req.query('page') ?? '1')
    const pageSize = Number(c.req.query('page_size') ?? '20')
    if (
      !Number.isInteger(page) ||
      !Number.isInteger(pageSize) ||
      page < 1 ||
      pageSize < 1 ||
      pageSize > 100
    ) {
      return c.json({ detail: 'Invalid pagination parameters' }, 422)
    }
    return c.json(
      historyResponse(
        await dependencies.getPaymentHistory(
          { page, pageSize, userId: authContext.id },
          c.env,
        ),
      ),
    )
  })

  return payments
}

export const paymentsRoutes = createPaymentsRoutes()
