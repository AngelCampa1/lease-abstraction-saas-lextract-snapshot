import { NextResponse } from 'next/server'
import {
  captureFrontendApiError,
  captureFrontendApiMessage,
} from '@/lib/sentry-reporting'
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

interface SurveyRequestBody {
  email: string
  accuracy: number
  missing?: string
  wouldPay: 'yes' | 'maybe' | 'no'
}

// ---------------------------------------------------------------------------
// In-memory rate limiter (same pattern as api/feedback)
// ---------------------------------------------------------------------------

const ipRateLimitMap: RateLimitStore = new Map()
const emailRateLimitMap: RateLimitStore = new Map()
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VALID_WOULD_PAY = new Set(['yes', 'maybe', 'no'])

function validateBody(
  body: unknown,
): { valid: true; data: SurveyRequestBody } | { valid: false; error: string } {
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

  if (typeof raw.accuracy !== 'number' || raw.accuracy < 1 || raw.accuracy > 5 || !Number.isInteger(raw.accuracy)) {
    return { valid: false, error: 'accuracy must be an integer between 1 and 5.' }
  }

  if (typeof raw.wouldPay !== 'string' || !VALID_WOULD_PAY.has(raw.wouldPay)) {
    return { valid: false, error: 'wouldPay must be one of: yes, maybe, no.' }
  }

  const data: SurveyRequestBody = {
    email: raw.email.trim().toLowerCase(),
    accuracy: raw.accuracy,
    wouldPay: raw.wouldPay as 'yes' | 'maybe' | 'no',
  }

  if (raw.missing !== undefined && raw.missing !== '') {
    if (typeof raw.missing !== 'string') {
      return { valid: false, error: 'missing must be a string.' }
    }
    data.missing = raw.missing.trim().slice(0, 500)
  }

  return { valid: true, data }
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

  const { email, accuracy, missing, wouldPay } = validation.data
  const ip = getClientIp(request)

  if (!(await verifyTurnstileToken(getTurnstileToken(rawBody), ip))) {
    return verificationFailedResponse()
  }

  if (
    isRateLimited(ipRateLimitMap, `ip:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS) ||
    isRateLimited(emailRateLimitMap, `email:${email}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)
  ) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.' },
      { status: 429 },
    )
  }

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.error('[leads/results-survey] RESEND_API_KEY is not set')
    captureFrontendApiMessage('Resend API key is not configured', {
      area: 'marketing',
      route: '/api/leads/results-survey',
      externalService: 'resend',
      operation: 'config',
      statusCode: 500,
    })
    return NextResponse.json(
      { success: false, error: 'Service configuration error' },
      { status: 500 },
    )
  }

  const feedbackEmail = process.env.FEEDBACK_EMAIL ?? 'angel.campa@lextract.io'

  await captureMarketingEvent({
    eventType: 'results_survey',
    email,
    source: request.headers.get('referer') ?? '',
    payload: {
      accuracy,
      missing: missing ?? '',
      wouldPay,
    },
  })

  const stars = '\u2605'.repeat(accuracy) + '\u2606'.repeat(5 - accuracy)

  const emailText = [
    `Post-Extraction Survey Response`,
    `================================`,
    ``,
    `From: ${email}`,
    ``,
    `1. Extraction Accuracy: ${stars} (${accuracy}/5)`,
    ``,
    `2. Missing/Wrong: ${missing || '(no response)'}`,
    ``,
    `3. Would pay $15/lease: ${wouldPay}`,
    ``,
    `Time: ${new Date().toISOString()}`,
    `IP: ${ip}`,
  ].join('\n')

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Angel Campa <angel.campa@lextract.io>',
        to: [feedbackEmail],
        subject: `Survey: ${accuracy}/5 accuracy, would pay: ${wouldPay} - ${email}`,
        text: emailText,
      }),
    })

    if (!resendRes.ok) {
      const errText = await resendRes.text().catch(() => '(unreadable)')
      console.error(`[leads/results-survey] Resend returned ${resendRes.status}: ${errText}`)
      captureFrontendApiMessage('Resend returned a non-OK response', {
        area: 'marketing',
        route: '/api/leads/results-survey',
        externalService: 'resend',
        operation: 'send-survey',
        statusCode: resendRes.status,
      })
      return NextResponse.json(
        { success: false, error: 'Failed to send survey.' },
        { status: 500 },
      )
    }
  } catch (err) {
    console.error('[leads/results-survey] Resend fetch failed:', err)
    captureFrontendApiError(err, {
      area: 'marketing',
      route: '/api/leads/results-survey',
      externalService: 'resend',
      operation: 'send-survey',
    })
    return NextResponse.json(
      { success: false, error: 'Failed to send survey.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
