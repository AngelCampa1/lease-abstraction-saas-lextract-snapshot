import { NextResponse } from 'next/server'
import { upsertApolloContact } from '@/lib/apollo'
import { captureMarketingEvent } from '@/lib/marketing-worker'
import {
  getClientIp,
  getTurnstileToken,
  honeypotNoopResponse,
  isHoneypotFilled,
  isRateLimited,
  type RateLimitStore,
  verificationFailedResponse,
  verifyTurnstileToken,
} from '@/lib/public-form-abuse'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LeadRequestBody {
  email: string
}

// ---------------------------------------------------------------------------
// In-memory rate limiter (same pattern as exit-popup)
// ---------------------------------------------------------------------------

const ipRateLimitMap: RateLimitStore = new Map()
const emailRateLimitMap: RateLimitStore = new Map()

const RATE_LIMIT_MAX = 5
const EMAIL_RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateBody(
  body: unknown,
): { valid: true; data: LeadRequestBody } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object.' }
  }

  const raw = body as Record<string, unknown>

  if (typeof raw.email !== 'string' || !raw.email.trim()) {
    return { valid: false, error: 'email is required.' }
  }

  if (!EMAIL_RE.test(raw.email.trim())) {
    return { valid: false, error: 'email must be a valid email address.' }
  }

  return {
    valid: true,
    data: { email: raw.email.trim().toLowerCase() },
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<NextResponse> {
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body.' },
      { status: 400 },
    )
  }

  if (isHoneypotFilled(rawBody)) {
    return honeypotNoopResponse()
  }

  const validation = validateBody(rawBody)
  if (!validation.valid) {
    return NextResponse.json(
      { success: false, error: validation.error },
      { status: 400 },
    )
  }

  const { email } = validation.data
  const ip = getClientIp(request)

  if (!(await verifyTurnstileToken(getTurnstileToken(rawBody), ip))) {
    return verificationFailedResponse()
  }

  if (
    isRateLimited(ipRateLimitMap, `ip:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS) ||
    isRateLimited(
      emailRateLimitMap,
      `email:${email}`,
      EMAIL_RATE_LIMIT_MAX,
      RATE_LIMIT_WINDOW_MS,
    )
  ) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.' },
      { status: 429 },
    )
  }

  await upsertApolloContact({
    email,
    labelNames: ['lextract-email-gate'],
  })

  await captureMarketingEvent({
    eventType: 'email_gate',
    email,
    source: request.headers.get('referer') ?? '',
  })

  return NextResponse.json({ success: true }, { status: 200 })
}
