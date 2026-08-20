import { ANONYMOUS_SESSION_KEY } from '@/lib/neon-auth/types'
import { getAuthStateSnapshot } from '@/lib/auth-state'
import { captureFrontendApiError } from '@/lib/sentry-reporting'

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

interface AuthHeaderOptions {
  forceTokenProbe?: boolean
}

type ApiRequestOptions = AuthHeaderOptions

export interface ApiErrorResponse {
  detail: string
  status: number
}

interface ApiErrorOptions {
  requestId?: string
  trackingId?: string
  userMessage?: string
}

export class ApiError extends Error {
  public readonly status: number
  public readonly detail: string
  public readonly requestId?: string
  public trackingId?: string
  public readonly userMessage?: string

  constructor(status: number, detail: string, options: ApiErrorOptions = {}) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
    this.requestId = options.requestId
    this.trackingId = options.trackingId ?? options.requestId
    this.userMessage = options.userMessage
  }
}

export async function getAuthHeaders(
  options: AuthHeaderOptions = {},
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {}
  const authState = getAuthStateSnapshot()

  if (options.forceTokenProbe || authState.status !== 'anonymous') {
    try {
      // Use the /api/auth/token endpoint which returns the EdDSA JWT directly in
      // the response body. Unlike /api/auth/get-session, this endpoint is never
      // served from the SDK's 5-minute session cache, so it always returns a fresh
      // JWT that the backend can verify via JWKS. Returns 401 when unauthenticated.
      const resp = await fetch('/api/auth/token', { credentials: 'include' })
      if (resp.ok) {
        const data: unknown = await resp.json()
        if (
          data !== null &&
          typeof data === 'object' &&
          'token' in data &&
          typeof (data as Record<string, unknown>).token === 'string'
        ) {
          headers['Authorization'] = `Bearer ${(data as Record<string, unknown>).token as string}`
          return headers
        }
      } else if (resp.status !== 401) {
        captureFrontendApiError(
          new ApiError(resp.status, 'Auth token endpoint unavailable'),
          {
            area: 'app',
            route: '/api/auth/token',
            externalService: 'auth-token-route',
            operation: 'auth-token-probe',
            statusCode: resp.status,
          },
        )
      }
    } catch (error) {
      captureFrontendApiError(
        error instanceof ApiError
          ? error
          : new ApiError(0, 'Auth token endpoint unavailable'),
        {
          area: 'app',
          route: '/api/auth/token',
          externalService: 'auth-token-route',
          operation: 'auth-token-probe',
          statusCode: error instanceof ApiError ? error.status : 0,
        },
      )
    }
  }

  if (typeof window !== 'undefined') {
    const sessionToken = localStorage.getItem(ANONYMOUS_SESSION_KEY)
    if (sessionToken) {
      headers['X-Session-Token'] = sessionToken
    }
  }

  return headers
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function stringField(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key]
  return typeof value === 'string' && value.trim() ? value : undefined
}

function shouldReportApiError(error: ApiError): boolean {
  return error.status === 0 || error.status >= 500 || error.status < 300
}

function apiArea(path: string): 'app' | 'marketing' | 'public-app' {
  if (path.startsWith('/leads') || path.startsWith('/feedback')) return 'marketing'
  if (path.startsWith('/extractions/upload')) return 'public-app'
  return 'app'
}

function reportApiError(error: ApiError, path: string): void {
  if (!shouldReportApiError(error)) return
  const eventId = captureFrontendApiError(error, {
    area: apiArea(path),
    route: path,
    externalService: 'backend-api',
    operation: 'backend-request',
    statusCode: error.status,
  })
  if (eventId && !error.trackingId) {
    error.trackingId = eventId
  }
}

async function handleResponse<T>(response: Response, path: string): Promise<T> {
  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`
    let userMessage: string | undefined
    let requestId: string | undefined
    let trackingId: string | undefined
    try {
      const body: unknown = await response.json()
      if (isRecord(body)) {
        detail = stringField(body, 'detail') ?? stringField(body, 'message') ?? detail
        userMessage = stringField(body, 'message')
        requestId = stringField(body, 'request_id')
        trackingId = stringField(body, 'tracking_id') ?? requestId
      }
    } catch {
      // Use default message
    }
    const error = new ApiError(response.status, detail, {
      requestId,
      trackingId,
      userMessage,
    })
    reportApiError(error, path)
    throw error
  }

  // 204 No Content has no body to parse
  if (response.status === 204) {
    // Safe: callers of DELETE/PUT endpoints returning 204 expect void/undefined as T
    return undefined as T
  }

  try {
    return await response.json() as T
  } catch {
    const error = new ApiError(
      response.status,
      'Invalid response format from server',
    )
    reportApiError(error, path)
    throw error
  }
}

async function fetchBackend(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${BASE_URL}${path}`, init)
  } catch {
    const error = new ApiError(0, 'Network error while contacting server')
    reportApiError(error, path)
    throw error
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const authHeaders = await getAuthHeaders()
  const response = await fetchBackend(path, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
  })
  return handleResponse<T>(response, path)
}

export async function apiPost<T>(
  path: string,
  body?: unknown,
  options: ApiRequestOptions = {},
): Promise<T> {
  const authHeaders = await getAuthHeaders(options)
  const response = await fetchBackend(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(response, path)
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const authHeaders = await getAuthHeaders()
  const response = await fetchBackend(path, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(response, path)
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const authHeaders = await getAuthHeaders()
  const response = await fetchBackend(path, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(response, path)
}

export async function apiDelete<T>(path: string): Promise<T> {
  const authHeaders = await getAuthHeaders()
  const response = await fetchBackend(path, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
  })
  return handleResponse<T>(response, path)
}

export async function apiDownloadBlob(path: string): Promise<Blob> {
  const authHeaders = await getAuthHeaders()
  const response = await fetchBackend(path, {
    method: 'GET',
    headers: authHeaders,
  })

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`
    try {
      const body: unknown = await response.json()
      if (isRecord(body)) {
        detail = stringField(body, 'detail') ?? stringField(body, 'message') ?? detail
      }
    } catch {
      // Use default message.
    }
    const error = new ApiError(response.status, detail)
    reportApiError(error, path)
    throw error
  }

  return response.blob()
}
