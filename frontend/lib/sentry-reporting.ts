import * as Sentry from '@sentry/nextjs'

type FrontendArea = 'marketing' | 'app' | 'public-app'
type FrontendSurface = 'frontend-api' | 'error-boundary'
type ExternalService =
  | 'apollo'
  | 'resend'
  | 'backend-api'
  | 'marketing-worker'
  | 'auth-token-route'

interface FrontendSentryContext {
  area: FrontendArea
  route: string
  surface: FrontendSurface
  externalService?: ExternalService
  operation?: string
  statusCode?: number
  handled?: boolean
}

interface TagScope {
  setTag(key: string, value: string): void
}

function setTags(scope: TagScope, context: FrontendSentryContext): void {
  const tags: Record<string, string | undefined> = {
    area: context.area,
    surface: context.surface,
    route: context.route,
    external_service: context.externalService,
    operation: context.operation,
    status_code:
      context.statusCode === undefined ? undefined : String(context.statusCode),
    handled: String(context.handled ?? true),
  }

  for (const [key, value] of Object.entries(tags)) {
    if (value !== undefined) {
      scope.setTag(key, value)
    }
  }
}

function toError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) {
    return error
  }

  if (typeof error === 'string' && error.trim()) {
    return new Error(error)
  }

  return new Error(fallbackMessage)
}

export function captureFrontendException(
  error: unknown,
  context: FrontendSentryContext,
): string | undefined {
  let eventId: string | undefined
  Sentry.withScope((scope) => {
    setTags(scope, context)
    eventId = Sentry.captureException(toError(error, 'Frontend error'))
  })
  return eventId
}

export function captureFrontendApiError(
  error: unknown,
  context: Omit<FrontendSentryContext, 'surface'>,
): string | undefined {
  return captureFrontendException(error, {
    ...context,
    surface: 'frontend-api',
  })
}

export function captureFrontendApiMessage(
  message: string,
  context: Omit<FrontendSentryContext, 'surface'>,
): void {
  Sentry.withScope((scope) => {
    setTags(scope, {
      ...context,
      surface: 'frontend-api',
    })
    Sentry.captureMessage(message, { level: 'error' })
  })
}
