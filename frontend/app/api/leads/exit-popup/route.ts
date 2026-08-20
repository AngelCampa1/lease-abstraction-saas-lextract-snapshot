// APOLLO_API_KEY must be set in Vercel environment variables (Settings → Environment Variables)
// without it this route will return 500 rather than silently fail.

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

interface LeadRequestBody {
  email: string
  leadMagnet: string
}

interface ApolloContactPayload {
  email: string
  label_names: string[]
  run_dedupe: boolean
}

// ---------------------------------------------------------------------------
// In-memory rate limiter
// NOTE: This works for a single serverless instance. For multi-instance
// deployments, replace with a Redis-backed solution (e.g. Upstash) so
// limits are enforced across all replicas.
// ---------------------------------------------------------------------------

const ipRateLimitMap: RateLimitStore = new Map()
const emailRateLimitMap: RateLimitStore = new Map()

const RATE_LIMIT_MAX = 5
const EMAIL_RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const VALID_LEAD_MAGNETS = new Set(['checklist', 'nnn-calculator', 'sample-report'])

function validateBody(
  body: unknown,
): { valid: true; data: LeadRequestBody } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object.' }
  }

  // safe: typeof check above confirms body is a non-null object
  const raw = body as Record<string, unknown>

  if (typeof raw.email !== 'string' || !raw.email.trim()) {
    return { valid: false, error: 'email is required.' }
  }

  if (!EMAIL_RE.test(raw.email.trim())) {
    return { valid: false, error: 'email must be a valid email address.' }
  }

  if (typeof raw.leadMagnet !== 'string' || !raw.leadMagnet.trim()) {
    return { valid: false, error: 'resource is required.' }
  }

  if (!VALID_LEAD_MAGNETS.has(raw.leadMagnet.trim())) {
    return { valid: false, error: 'Please choose a valid resource.' }
  }

  return {
    valid: true,
    data: {
      email: raw.email.trim().toLowerCase(),
      leadMagnet: raw.leadMagnet.trim(),
    },
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<NextResponse> {
  // Parse + validate body before configuration checks so bot traffic gets
  // the same cheap defenses even if an external integration is misconfigured.
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

  const { email, leadMagnet } = validation.data
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

  const apolloApiKey = process.env.APOLLO_API_KEY
  if (!apolloApiKey) {
    console.error('[leads/exit-popup] APOLLO_API_KEY is not set')
    captureFrontendApiMessage('Apollo API key is not configured', {
      area: 'marketing',
      route: '/api/leads/exit-popup',
      externalService: 'apollo',
      operation: 'config',
      statusCode: 500,
    })
    return NextResponse.json(
      { success: false, error: 'Service configuration error' },
      { status: 500 },
    )
  }

  // 3. Build Apollo payload
  const apolloPayload: ApolloContactPayload = {
    email,
    label_names: ['lextract-exit-popup', leadMagnet],
    run_dedupe: true,
  }

  // 5. Call Apollo API - swallow errors so the user always gets success
  try {
    const apolloResponse = await fetch('https://api.apollo.io/v1/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apolloApiKey,
      },
      body: JSON.stringify(apolloPayload),
    })

    if (!apolloResponse.ok) {
      const errorText = await apolloResponse.text().catch(() => '(unreadable)')
      console.error(
        `[leads/exit-popup] Apollo returned ${apolloResponse.status}: ${errorText}`,
      )
      captureFrontendApiMessage('Apollo returned a non-OK response', {
        area: 'marketing',
        route: '/api/leads/exit-popup',
        externalService: 'apollo',
        operation: 'upsert-contact',
        statusCode: apolloResponse.status,
      })
      // Intentionally fall through - still return success to the client
      // (same pattern as leads/calculator - Apollo failure should not block the UX)
    }
  } catch (err) {
    console.error('[leads/exit-popup] Apollo fetch failed:', err)
    captureFrontendApiError(err, {
      area: 'marketing',
      route: '/api/leads/exit-popup',
      externalService: 'apollo',
      operation: 'upsert-contact',
    })
    // Intentionally swallowed - still return success to the client
  }

  await captureMarketingEvent({
    eventType: 'exit_popup',
    email,
    magnetSlug: leadMagnet,
    source: request.headers.get('referer') ?? '',
    payload: { leadMagnet },
  })

  return NextResponse.json({ success: true }, { status: 200 })
}
