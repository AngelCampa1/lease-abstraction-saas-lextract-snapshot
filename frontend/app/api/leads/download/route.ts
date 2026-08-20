import { NextResponse } from 'next/server'
import { z } from 'zod'
import { upsertApolloContact } from '@/lib/apollo'
import {
  captureFrontendApiError,
  captureFrontendApiMessage,
} from '@/lib/sentry-reporting'
import { getLeadMagnet, LEAD_MAGNET_SLUGS } from '@/data/lead-magnets'
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

const RESOURCE_UNAVAILABLE_ERROR =
  'We could not prepare your resource right now. Please try again.'
const WORKER_AUTH_FAILURE_STATUSES = new Set([401, 403])

function publicLeadMagnetUrl(magnetSlug: string): string | null {
  const magnet = getLeadMagnet(magnetSlug)
  if (!magnet) {
    return null
  }
  return `/${magnet.localAssetPath.replace(/^public\//, '')}`
}

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const DownloadSchema = z.object({
  email: z.string().email(),
  magnetSlug: z.enum(LEAD_MAGNET_SLUGS),
  firstName: z.string().max(100).optional().default(''),
  company: z.string().max(200).optional().default(''),
  placement: z.enum(['template-page', 'exit-popup']).optional().default('template-page'),
  sourcePath: z.string().max(500).optional(),
})

// ---------------------------------------------------------------------------
// In-memory rate limiters.
// NOTE: Single serverless instance only; Cloudflare/WAF rules remain the
// cross-instance enforcement layer.
// ---------------------------------------------------------------------------

const ipRateLimitMap: RateLimitStore = new Map()
const emailRateLimitMap: RateLimitStore = new Map()

const IP_RATE_LIMIT_MAX = 5
const EMAIL_RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<NextResponse> {
  // 1. Parse body before side effects so cheap bot checks can run first.
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

  const parsed = DownloadSchema.safeParse(rawBody)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    return NextResponse.json(
      { success: false, error: firstIssue?.message ?? 'Validation error.' },
      { status: 400 },
    )
  }

  const { email, magnetSlug, firstName, company, placement, sourcePath } = parsed.data
  const ip = getClientIp(request)

  if (!(await verifyTurnstileToken(getTurnstileToken(rawBody), ip))) {
    return verificationFailedResponse()
  }

  if (
    isRateLimited(ipRateLimitMap, `ip:${ip}`, IP_RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS) ||
    isRateLimited(
      emailRateLimitMap,
      `email:${email.toLowerCase()}`,
      EMAIL_RATE_LIMIT_MAX,
      RATE_LIMIT_WINDOW_MS,
    )
  ) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.' },
      { status: 429 },
    )
  }

  const labelNames = ['lextract-lead-magnet', `magnet:${magnetSlug}`]
  if (placement === 'exit-popup') {
    labelNames.push('lextract-exit-popup')
  }

  // 3. Upsert contact in Apollo - errors swallowed inside upsertApolloContact
  await upsertApolloContact({
    email,
    firstName: firstName || undefined,
    company: company || undefined,
    labelNames,
  })

  // 4. Call the marketing-data Worker to trigger Sequencer download+enrollment.
  let downloadUrl: string | null = null
  let emailed = false
  const workerUrl = process.env.MARKETING_WORKER_URL?.trim().replace(/\/+$/, '')
  const workerSecret = process.env.MARKETING_WORKER_SECRET?.trim()

  if (!workerUrl) {
    return NextResponse.json(
      { success: false, error: RESOURCE_UNAVAILABLE_ERROR },
      { status: 503 },
    )
  }

  try {
    const workerRes = await fetch(`${workerUrl}/lead-magnet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${workerSecret ?? ''}`,
      },
      body: JSON.stringify({
        email,
        magnetSlug,
        firstName,
        company,
        placement,
        sourcePath,
      }),
    })

    if (workerRes.ok) {
      const data = (await workerRes.clone().json()) as {
        downloadUrl?: string
        emailed?: boolean
      }
      downloadUrl = data.downloadUrl ?? null
      emailed = Boolean(data.emailed)
    } else {
      const errText = await workerRes.text().catch(() => '(unreadable)')
      console.error(
        `[leads/download] Worker returned ${workerRes.status}: ${errText}`,
      )
      if (WORKER_AUTH_FAILURE_STATUSES.has(workerRes.status)) {
        const fallbackDownloadUrl = publicLeadMagnetUrl(magnetSlug)
        if (fallbackDownloadUrl) {
          return NextResponse.json(
            { success: true, downloadUrl: fallbackDownloadUrl, emailed: false },
            { status: 200 },
          )
        }
      }
      captureFrontendApiMessage(
        'Marketing worker lead-magnet endpoint returned a non-OK response',
        {
          area: 'marketing',
          route: '/api/leads/download',
          externalService: 'marketing-worker',
          operation: 'lead-magnet-download',
          statusCode: workerRes.status,
        },
      )
      return NextResponse.json(
        { success: false, error: RESOURCE_UNAVAILABLE_ERROR },
        { status: 502 },
      )
    }
  } catch (err) {
    console.error('[leads/download] Worker fetch failed:', err)
    captureFrontendApiError(err, {
      area: 'marketing',
      route: '/api/leads/download',
      externalService: 'marketing-worker',
      operation: 'lead-magnet-download',
    })
    return NextResponse.json(
      { success: false, error: RESOURCE_UNAVAILABLE_ERROR },
      { status: 502 },
    )
  }

  if (!downloadUrl) {
    return NextResponse.json(
      { success: false, error: RESOURCE_UNAVAILABLE_ERROR },
      { status: 502 },
    )
  }

  return NextResponse.json({ success: true, downloadUrl, emailed }, { status: 200 })
}
