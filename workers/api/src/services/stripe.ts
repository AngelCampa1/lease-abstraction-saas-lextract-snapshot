import type { Env } from '../types'

export type ProductType = 'single' | 'credit_pack_5' | 'credit_pack_10'

export interface StripeCheckoutInput {
  userId?: string
  productType: ProductType
  successUrl: string
  cancelUrl: string
  extractionId?: string
  guestEmail?: string
  anonymousSessionId?: string
}

export interface StripeCheckoutResult {
  checkoutUrl: string
  sessionId: string
}

export interface StripeEvent {
  id: string
  type: string
  data: { object?: unknown }
}

export interface StripeFetchDependencies {
  fetch(request: Request): Promise<Response>
}

export interface StripeSignatureOptions {
  nowSeconds?: number
  toleranceSeconds?: number
}

const PRODUCT_PRICING: Record<ProductType, number> = {
  credit_pack_10: 12000,
  credit_pack_5: 6500,
  single: 1500,
}

const PRODUCT_NAMES: Record<ProductType, string> = {
  credit_pack_10: 'Lextract 10-Credit Pack',
  credit_pack_5: 'Lextract 5-Credit Pack',
  single: 'Lextract Single Lease Extraction',
}

const PRODUCT_CREDITS: Record<ProductType, number> = {
  credit_pack_10: 10,
  credit_pack_5: 5,
  single: 1,
}

function stripeApiBaseUrl(env: Env): string {
  return env.STRIPE_API_BASE_URL ?? 'https://api.stripe.com'
}

function requireStripeSecret(env: Env): string {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is required')
  }
  return env.STRIPE_SECRET_KEY
}

function appendCheckoutParams(params: URLSearchParams, input: StripeCheckoutInput): void {
  const amount = PRODUCT_PRICING[input.productType]
  const productName = PRODUCT_NAMES[input.productType]
  const credits = PRODUCT_CREDITS[input.productType]
  const metadata: Record<string, string> = {
    credits: String(credits),
    extraction_id: input.extractionId ?? '',
    product_type: input.productType,
  }
  if (input.userId !== undefined) {
    metadata.user_id = input.userId
  }
  if (input.guestEmail !== undefined) {
    metadata.guest_email = input.guestEmail
  }
  if (input.anonymousSessionId !== undefined) {
    metadata.anonymous_session_id = input.anonymousSessionId
  }

  params.set('mode', 'payment')
  params.set('locale', 'en')
  params.set('success_url', input.successUrl)
  params.set('cancel_url', input.cancelUrl)
  params.set('line_items[0][price_data][currency]', 'usd')
  params.set('line_items[0][price_data][product_data][name]', productName)
  params.set('line_items[0][price_data][unit_amount]', String(amount))
  params.set('line_items[0][quantity]', '1')
  params.set('payment_intent_data[statement_descriptor]', 'Lextract')
  for (const [key, value] of Object.entries(metadata)) {
    params.set(`metadata[${key}]`, value)
    params.set(`payment_intent_data[metadata][${key}]`, value)
  }
  if (input.guestEmail !== undefined) {
    params.set('customer_email', input.guestEmail)
  }
}

function isStripeCheckoutResponse(value: unknown): value is {
  id: string
  url: string
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'url' in value &&
    typeof value.id === 'string' &&
    typeof value.url === 'string'
  )
}

export async function createStripeCheckoutSession(
  input: StripeCheckoutInput,
  env: Env,
  dependencies: StripeFetchDependencies = {
    fetch: (request) => globalThis.fetch(request),
  },
): Promise<StripeCheckoutResult> {
  const params = new URLSearchParams()
  appendCheckoutParams(params, input)

  const response = await dependencies.fetch(
    new Request(`${stripeApiBaseUrl(env)}/v1/checkout/sessions`, {
      body: params,
      headers: {
        Authorization: `Basic ${btoa(`${requireStripeSecret(env)}:`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
    }),
  )
  if (!response.ok) {
    throw new StripeProviderError('Payment provider error - please try again')
  }
  const body: unknown = await response.json()
  if (!isStripeCheckoutResponse(body)) {
    throw new StripeProviderError('Payment provider returned an invalid session')
  }

  return {
    checkoutUrl: body.url,
    sessionId: body.id,
  }
}

function signatureParts(header: string): { timestamp: number; signatures: string[] } {
  const parts = header.split(',')
  const timestampPart = parts.find((part) => part.startsWith('t='))
  const timestamp = Number(timestampPart?.slice(2))
  const signatures = parts
    .filter((part) => part.startsWith('v1='))
    .map((part) => part.slice(3))

  if (!Number.isFinite(timestamp) || signatures.length === 0) {
    throw new StripeSignatureError('Invalid Stripe signature header')
  }

  return { signatures, timestamp }
}

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false
  }
  let mismatch = 0
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return mismatch === 0
}

function isStripeEvent(value: unknown): value is StripeEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'type' in value &&
    typeof value.id === 'string' &&
    typeof value.type === 'string'
  )
}

export async function verifyStripeWebhookSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
  options: StripeSignatureOptions = {},
): Promise<StripeEvent> {
  const { signatures, timestamp } = signatureParts(signatureHeader)
  const nowSeconds = options.nowSeconds ?? Math.floor(Date.now() / 1000)
  const toleranceSeconds = options.toleranceSeconds ?? 300
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    throw new StripeSignatureError('Stripe signature timestamp is outside tolerance')
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign'],
  )
  const expected = toHex(
    await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(`${timestamp}.${payload}`),
    ),
  )
  if (!signatures.some((signature) => timingSafeEqual(signature, expected))) {
    throw new StripeSignatureError('Invalid Stripe webhook signature')
  }

  const parsed: unknown = JSON.parse(payload)
  if (!isStripeEvent(parsed)) {
    throw new StripeSignatureError('Invalid Stripe webhook payload')
  }

  return {
    data:
      typeof parsed.data === 'object' && parsed.data !== null
        ? parsed.data
        : {},
    id: parsed.id,
    type: parsed.type,
  }
}

export class StripeProviderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StripeProviderError'
  }
}

export class StripeSignatureError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StripeSignatureError'
  }
}
