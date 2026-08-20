import { NextResponse } from 'next/server'
import {
  captureFrontendApiError,
  captureFrontendApiMessage,
} from '@/lib/sentry-reporting'
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

interface FeedbackBody {
  message: string
  email?: string
  page?: string
}

// ---------------------------------------------------------------------------
// Rate limiter (same pattern as leads/exit-popup)
// ---------------------------------------------------------------------------

const ipRateLimitMap: RateLimitStore = new Map()
const emailRateLimitMap: RateLimitStore = new Map()
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateBody(
  body: unknown,
): { valid: true; data: FeedbackBody } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object.' }
  }

  const raw = body as Record<string, unknown>

  if (typeof raw.message !== 'string' || !raw.message.trim()) {
    return { valid: false, error: 'message is required.' }
  }

  const message = raw.message.trim()
  if (message.length > 1000) {
    return { valid: false, error: 'message must be 1000 characters or fewer.' }
  }

  const data: FeedbackBody = { message }

  if (raw.email !== undefined && raw.email !== '') {
    if (typeof raw.email !== 'string' || !EMAIL_RE.test(raw.email.trim())) {
      return { valid: false, error: 'email must be a valid email address.' }
    }
    data.email = raw.email.trim().toLowerCase()
  }

  if (typeof raw.page === 'string') {
    data.page = raw.page.trim().slice(0, 200)
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

  const { message, email, page } = validation.data
  const ip = getClientIp(request)

  if (!(await verifyTurnstileToken(getTurnstileToken(rawBody), ip))) {
    return verificationFailedResponse()
  }

  const emailKey = email ? `email:${email}` : `anon:${ip}`
  if (
    isRateLimited(ipRateLimitMap, `ip:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS) ||
    isRateLimited(emailRateLimitMap, emailKey, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)
  ) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.' },
      { status: 429 },
    )
  }

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.error('[api/feedback] RESEND_API_KEY is not set')
    captureFrontendApiMessage('Resend API key is not configured', {
      area: 'marketing',
      route: '/api/feedback',
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
  const time = new Date().toISOString()

  const emailHtml = [
    `<p><strong>Message:</strong></p>`,
    `<p>${message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>`,
    `<hr>`,
    email ? `<p><strong>From:</strong> ${email}</p>` : '',
    page ? `<p><strong>Page:</strong> ${page}</p>` : '',
    `<p><strong>Time:</strong> ${time}</p>`,
    `<p><strong>IP:</strong> ${ip}</p>`,
  ]
    .filter(Boolean)
    .join('\n')

  const emailText = [
    `Message:\n${message}`,
    email ? `\nFrom: ${email}` : '',
    page ? `Page: ${page}` : '',
    `\nTime: ${time}`,
    `IP: ${ip}`,
  ]
    .filter(Boolean)
    .join('\n')

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
        subject: `Feedback from ${email ?? 'anonymous'} - ${page ?? '/'}`,
        html: emailHtml,
        text: emailText,
      }),
    })

    if (!resendRes.ok) {
      const errText = await resendRes.text().catch(() => '(unreadable)')
      console.error(`[api/feedback] Resend returned ${resendRes.status}: ${errText}`)
      captureFrontendApiMessage('Resend returned a non-OK response', {
        area: 'marketing',
        route: '/api/feedback',
        externalService: 'resend',
        operation: 'send-feedback',
        statusCode: resendRes.status,
      })
      return NextResponse.json(
        { success: false, error: 'Failed to send feedback.' },
        { status: 500 },
      )
    }
  } catch (err) {
    console.error('[api/feedback] Resend fetch failed:', err)
    captureFrontendApiError(err, {
      area: 'marketing',
      route: '/api/feedback',
      externalService: 'resend',
      operation: 'send-feedback',
    })
    return NextResponse.json(
      { success: false, error: 'Failed to send feedback.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
