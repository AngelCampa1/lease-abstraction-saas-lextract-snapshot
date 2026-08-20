import { NextResponse } from 'next/server'

const TURNSTILE_SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export interface RateLimitEntry {
  count: number
  windowStart: number
}

export type RateLimitStore = Map<string, RateLimitEntry>

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function getClientIp(request: Request): string {
  const cfConnectingIp = request.headers.get('cf-connecting-ip')?.trim()
  if (cfConnectingIp) {
    return cfConnectingIp
  }

  const forwardedFor = request.headers.get('x-forwarded-for')
  const forwardedIp = forwardedFor?.split(',')[0]?.trim()
  if (forwardedIp) {
    return forwardedIp
  }

  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

export function isRateLimited(
  store: RateLimitStore,
  key: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  const now = Date.now()

  for (const [storedKey, value] of store) {
    if (now - value.windowStart >= windowMs) {
      store.delete(storedKey)
    }
  }

  const entry = store.get(key)
  if (!entry) {
    store.set(key, { count: 1, windowStart: now })
    return false
  }

  entry.count += 1
  return entry.count > maxRequests
}

export function isHoneypotFilled(body: unknown): boolean {
  if (!isRecord(body)) {
    return false
  }
  return ['company_website', 'companyWebsite', 'website'].some((field) => {
    const value = body[field]
    return typeof value === 'string' && value.trim().length > 0
  })
}

export function honeypotNoopResponse(): NextResponse {
  return NextResponse.json({ success: true }, { status: 200 })
}

function isProductionRuntime(): boolean {
  return process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production'
}

export function getTurnstileToken(body: unknown): string | null {
  if (!isRecord(body)) {
    return null
  }
  const token =
    body.turnstileToken ?? body.turnstile_token ?? body['cf-turnstile-response']
  return typeof token === 'string' && token.trim() ? token.trim() : null
}

export async function verifyTurnstileToken(
  token: string | null,
  remoteIp: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) {
    return !isProductionRuntime()
  }
  if (!token) {
    return false
  }

  const body = new URLSearchParams()
  body.set('secret', secret)
  body.set('response', token)
  if (remoteIp !== 'unknown') {
    body.set('remoteip', remoteIp)
  }

  try {
    const response = await fetch(TURNSTILE_SITEVERIFY_URL, {
      method: 'POST',
      body,
    })
    if (!response.ok) {
      return false
    }
    const data: unknown = await response.json()
    if (!isRecord(data)) {
      return false
    }
    return data.success === true
  } catch {
    return false
  }
}

export function verificationFailedResponse(): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Verification failed. Please try again.' },
    { status: 403 },
  )
}
