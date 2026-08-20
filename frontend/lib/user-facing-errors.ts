import { ApiError } from '@/lib/api'

export type ErrorContext =
  | 'auth'
  | 'upload'
  | 'processing'
  | 'results'
  | 'payment'
  | 'export'
  | 'marketing'
  | 'generic'

export interface UserFacingError {
  title: string
  description: string
  trackingId?: string
}

function trackingId(error: unknown): string | undefined {
  return error instanceof ApiError ? error.trackingId ?? error.requestId : undefined
}

export function getUserFacingError(
  error: unknown,
  context: ErrorContext = 'generic',
): UserFacingError {
  if (error instanceof ApiError) {
    // Upload timeouts use status 0 (no HTTP response) but carry a dedicated
    // name + userMessage. Surface those verbatim so the UI prompts the user
    // to retry instead of generic "Connection problem" copy.
    if (error.name === 'UploadTimeoutError') {
      return {
        title: 'Upload timed out',
        description: error.userMessage ?? 'Upload timed out - please retry',
        trackingId: trackingId(error),
      }
    }
    if (error.status === 401 || error.status === 403) {
      return {
        title: 'Sign in required',
        description: 'Please sign in again to continue.',
        trackingId: trackingId(error),
      }
    }
    if (error.status === 404) {
      return {
        title:
          context === 'results' || context === 'processing'
            ? 'Extraction not found'
            : 'Not found',
        description:
          'This extraction may have been deleted, expired, or belongs to another account.',
        trackingId: trackingId(error),
      }
    }
    if (error.status === 409) {
      return {
        title: 'This field was just changed',
        description:
          "This field was just changed by someone else. We've refreshed it - please re-apply your edit if needed.",
        trackingId: trackingId(error),
      }
    }
    if (error.status === 429) {
      return {
        title: 'Too many requests',
        description: 'Please wait a minute and try again.',
        trackingId: trackingId(error),
      }
    }
    if (error.status === 0) {
      return {
        title: 'Connection problem',
        description: 'Check your connection and try again.',
        trackingId: trackingId(error),
      }
    }
    if (error.status >= 500) {
      return {
        title:
          context === 'upload'
            ? 'Upload is temporarily unavailable'
            : 'Something went wrong',
        description:
          'Please try again in a few minutes. If this keeps happening, contact support with the tracking ID.',
        trackingId: trackingId(error),
      }
    }
  }

  return {
    title: 'Something went wrong',
    description:
      'Please try again. If this keeps happening, contact support with the tracking ID.',
    trackingId: trackingId(error),
  }
}
