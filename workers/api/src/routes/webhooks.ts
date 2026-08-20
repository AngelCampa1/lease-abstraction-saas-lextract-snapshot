import { Hono } from 'hono'

import {
  CheckoutValidationError,
  ConflictPaymentError,
  NotFoundPaymentError,
  addCredits,
  claimWebhookEvent,
  completeWebhookEvent,
  failWebhookEvent,
  recordPayment,
  recordSinglePaymentAndUnlock,
} from '../repositories/payments'
import type {
  RecordPaymentInput,
  SinglePaymentUnlockInput,
} from '../repositories/payments'
import { captureBackendEvent } from '../services/posthog'
import { verifyStripeWebhookSignature } from '../services/stripe'
import type { StripeEvent } from '../services/stripe'
import type { ProductType } from '../services/stripe'
import { StripeSignatureError } from '../services/stripe'
import type { AppBindings, Env } from '../types'

export interface WebhookRouteDependencies {
  verifyStripeWebhookSignature(
    payload: string,
    signatureHeader: string,
    secret: string,
  ): Promise<StripeEvent>
  claimWebhookEvent(
    input: { eventId: string; eventType: string },
    env: Env,
  ): Promise<'claimed' | 'processed'>
  completeWebhookEvent(eventId: string, env: Env): Promise<void>
  failWebhookEvent(eventId: string, reason: string, env: Env): Promise<void>
  processCheckoutCompleted(session: unknown, env: Env): Promise<void>
}

type CreditPackProductType = Exclude<ProductType, 'single'>

export class PermanentWebhookError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PermanentWebhookError'
  }
}

export async function processCheckoutCompleted(
  session: unknown,
  env: Env,
): Promise<void> {
  const checkout = parseCheckoutSession(session)
  if (
    !checkout.userId &&
    !(checkout.productType === 'single' && checkout.anonymousSessionId)
  ) {
    throw new PermanentWebhookError('user_id missing in Stripe checkout metadata')
  }

  if (checkout.productType === 'single') {
    if (!checkout.extractionId) {
      throw new PermanentWebhookError(
        'single purchase metadata missing extraction_id',
      )
    }
    const singleInput: SinglePaymentUnlockInput = {
      amountCents: checkout.amountTotal,
      extractionId: checkout.extractionId,
      stripeSessionId: checkout.stripeSessionId,
    }
    if (checkout.userId) {
      singleInput.userId = checkout.userId
    }
    if (checkout.anonymousSessionId !== undefined) {
      singleInput.guestAnonymousSessionId = checkout.anonymousSessionId
    }
    if (checkout.paymentIntentId !== undefined) {
      singleInput.stripePaymentIntentId = checkout.paymentIntentId
    }
    const result = await recordSinglePaymentAndUnlock(singleInput, env)
    if (result.created) {
      await captureBackendEvent(
        {
          distinctId: checkout.userId ?? checkout.anonymousSessionId ?? checkout.stripeSessionId,
          event: 'payment_succeeded',
          properties: {
            amount_cents: checkout.amountTotal,
            credits_purchased: 0,
            extraction_id: checkout.extractionId,
            product_type: checkout.productType,
            stripe_session_id: checkout.stripeSessionId,
          },
        },
        env,
      )
    }
    return
  }

  const userId = checkout.userId
  if (userId === undefined) {
    throw new PermanentWebhookError('user_id missing in Stripe checkout metadata')
  }
  const paymentInput: RecordPaymentInput = {
    amountCents: checkout.amountTotal,
    paymentType: checkout.productType,
    stripeSessionId: checkout.stripeSessionId,
    userId,
  }
  if (checkout.paymentIntentId !== undefined) {
    paymentInput.stripePaymentIntentId = checkout.paymentIntentId
  }
  const payment = await recordPayment(paymentInput, env)
  const credits = creditPackAmount(checkout.productType)
  const grant = await addCredits(
    {
      amount: credits,
      description:
        checkout.productType === 'credit_pack_5'
          ? '5-credit pack purchase'
          : '10-credit pack purchase',
      paymentId: payment.id,
      userId,
    },
    env,
  )
  if (grant.created) {
    await captureBackendEvent(
      {
        distinctId: userId,
        event: 'payment_succeeded',
        properties: {
          amount_cents: checkout.amountTotal,
          credits_purchased: credits,
          product_type: checkout.productType,
          stripe_session_id: checkout.stripeSessionId,
        },
      },
      env,
    )
  }
}

interface ParsedCheckoutSession {
  stripeSessionId: string
  paymentIntentId?: string
  amountTotal: number
  userId?: string
  productType: ProductType
  extractionId?: string
  anonymousSessionId?: string
}

function objectValue(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return {}
  }
  // Safe because callers only read keys as unknown and narrow each value.
  return value as Record<string, unknown>
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function optionalString(value: unknown): string | undefined {
  const string = stringValue(value)
  return string.length > 0 ? string : undefined
}

function productType(value: string): ProductType {
  if (
    value === 'single' ||
    value === 'credit_pack_5' ||
    value === 'credit_pack_10'
  ) {
    return value
  }
  throw new PermanentWebhookError(
    `Unknown product_type in checkout metadata: ${value}`,
  )
}

function isPermanentWebhookError(error: unknown): boolean {
  return (
    error instanceof PermanentWebhookError ||
    error instanceof CheckoutValidationError ||
    error instanceof ConflictPaymentError ||
    error instanceof NotFoundPaymentError
  )
}

function creditPackAmount(value: CreditPackProductType): number {
  if (value === 'credit_pack_5') {
    return 5
  }
  return 10
}

function parseCheckoutSession(session: unknown): ParsedCheckoutSession {
  const record = objectValue(session)
  const metadata = objectValue(record.metadata)
  const parsed: ParsedCheckoutSession = {
    amountTotal:
      typeof record.amount_total === 'number' ? record.amount_total : 0,
    productType: productType(stringValue(metadata.product_type)),
    stripeSessionId: stringValue(record.id),
    userId: stringValue(metadata.user_id),
  }
  const anonymousSessionId = optionalString(metadata.anonymous_session_id)
  const extractionId = optionalString(metadata.extraction_id)
  const paymentIntentId = optionalString(record.payment_intent)
  if (anonymousSessionId !== undefined) {
    parsed.anonymousSessionId = anonymousSessionId
  }
  if (extractionId !== undefined) {
    parsed.extractionId = extractionId
  }
  if (paymentIntentId !== undefined) {
    parsed.paymentIntentId = paymentIntentId
  }
  return parsed
}

export function defaultWebhookRouteDependencies(): WebhookRouteDependencies {
  return {
    claimWebhookEvent,
    completeWebhookEvent,
    failWebhookEvent,
    processCheckoutCompleted,
    verifyStripeWebhookSignature,
  }
}

export function createWebhooksRoutes(
  dependencies: WebhookRouteDependencies = defaultWebhookRouteDependencies(),
): Hono<AppBindings> {
  const webhooks = new Hono<AppBindings>()

  webhooks.post('/stripe', async (c) => {
    const signature = c.req.header('Stripe-Signature')
    if (!signature) {
      return c.json({ detail: 'Missing stripe-signature header' }, 400)
    }
    if (!c.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('STRIPE_WEBHOOK_SECRET is required')
    }

    const payload = await c.req.text()
    let event: StripeEvent
    try {
      event = await dependencies.verifyStripeWebhookSignature(
        payload,
        signature,
        c.env.STRIPE_WEBHOOK_SECRET,
      )
    } catch (error) {
      if (error instanceof StripeSignatureError) {
        return c.json({ detail: 'Invalid webhook signature' }, 400)
      }
      throw error
    }

    const claim = await dependencies.claimWebhookEvent(
      { eventId: event.id, eventType: event.type },
      c.env,
    )
    if (claim === 'processed') {
      return c.json({ received: true })
    }

    try {
      if (event.type === 'checkout.session.completed') {
        await dependencies.processCheckoutCompleted(event.data.object, c.env)
      }
      await dependencies.completeWebhookEvent(event.id, c.env)
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown webhook error'
      if (isPermanentWebhookError(error)) {
        await dependencies.failWebhookEvent(event.id, reason, c.env)
      } else {
        throw error
      }
    }

    return c.json({ received: true })
  })

  return webhooks
}

export const webhooksRoutes = createWebhooksRoutes()
