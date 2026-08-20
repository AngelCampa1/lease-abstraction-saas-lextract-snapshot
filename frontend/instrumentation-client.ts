import * as Sentry from '@sentry/nextjs'
import type { ErrorEvent, EventHint } from '@sentry/core'

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
const browserSentryEnabled = process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true'
const runtimeSendMessageTabMissing =
  'Invalid call to runtime.sendMessage(). Tab not found.'

function isRuntimeSendMessageTabMissing(event: ErrorEvent): boolean {
  if (event.message === runtimeSendMessageTabMissing) {
    return true
  }

  return (
    event.exception?.values?.some(
      (exception) => exception.value === runtimeSendMessageTabMissing,
    ) ?? false
  )
}

function filterBrowserNoise(
  event: ErrorEvent,
  _hint: EventHint,
): ErrorEvent | null {
  if (isRuntimeSendMessageTabMissing(event)) {
    return null
  }

  return event
}

if (browserSentryEnabled && dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'production',
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    sendDefaultPii: false,
    beforeSend: filterBrowserNoise,
  })
}
