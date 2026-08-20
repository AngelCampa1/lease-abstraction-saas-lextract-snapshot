/** @vitest-environment node */
import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api'
import { getUserFacingError } from '@/lib/user-facing-errors'

describe('user-facing error messages', () => {
  it('shows friendly copy with backend tracking IDs', () => {
    const message = getUserFacingError(
      new ApiError(503, 'OpenRouter unavailable', {
        requestId: 'req-123',
        trackingId: 'event-123',
      }),
      'upload',
    )

    expect(message.title).toBe('Upload is temporarily unavailable')
    expect(message.description).toBe(
      'Please try again in a few minutes. If this keeps happening, contact support with the tracking ID.',
    )
    expect(message.trackingId).toBe('event-123')
  })

  it('shows not-found copy without reporting internals', () => {
    const message = getUserFacingError(
      new ApiError(404, 'Database lookup failed: private details', {
        requestId: 'req-404',
      }),
      'results',
    )

    expect(message.title).toBe('Extraction not found')
    expect(message.description).toBe(
      'This extraction may have been deleted, expired, or belongs to another account.',
    )
    expect(message.trackingId).toBe('req-404')

    expect(
      getUserFacingError(new ApiError(404, 'Missing'), 'processing'),
    ).toMatchObject({
      title: 'Extraction not found',
    })

    expect(getUserFacingError(new ApiError(404, 'Missing'), 'marketing')).toMatchObject({
      title: 'Not found',
    })
  })

  it('maps authentication and rate limit errors', () => {
    expect(getUserFacingError(new ApiError(401, 'Token expired'), 'auth')).toMatchObject({
      title: 'Sign in required',
      description: 'Please sign in again to continue.',
    })

    expect(getUserFacingError(new ApiError(429, 'Too many'), 'generic')).toMatchObject({
      title: 'Too many requests',
      description: 'Please wait a minute and try again.',
    })
  })

  it('surfaces upload-timeout copy verbatim, falling back when no userMessage', () => {
    const withMessage = new ApiError(0, 'timeout', {
      userMessage: 'Upload timed out - please retry a smaller file',
    })
    withMessage.name = 'UploadTimeoutError'
    expect(getUserFacingError(withMessage, 'upload')).toMatchObject({
      title: 'Upload timed out',
      description: 'Upload timed out - please retry a smaller file',
    })

    const withoutMessage = new ApiError(0, 'timeout')
    withoutMessage.name = 'UploadTimeoutError'
    expect(getUserFacingError(withoutMessage, 'upload')).toMatchObject({
      title: 'Upload timed out',
      description: 'Upload timed out - please retry',
    })
  })

  it('maps 409 conflict to a distinct concurrent-edit message', () => {
    const message = getUserFacingError(
      new ApiError(409, 'Field was modified concurrently', {
        requestId: 'req-409',
      }),
      'results',
    )

    expect(message.title).toBe('This field was just changed')
    expect(message.description).toBe(
      "This field was just changed by someone else. We've refreshed it - please re-apply your edit if needed.",
    )
    expect(message.trackingId).toBe('req-409')
  })

  it('maps connection, generic, and non-upload server errors', () => {
    expect(getUserFacingError(new ApiError(0, 'Network'), 'generic')).toMatchObject({
      title: 'Connection problem',
      description: 'Check your connection and try again.',
    })

    expect(getUserFacingError(new ApiError(500, 'Failed'), 'payment')).toMatchObject({
      title: 'Something went wrong',
    })

    expect(getUserFacingError(new ApiError(418, 'Teapot'), 'generic')).toMatchObject({
      title: 'Something went wrong',
    })

    expect(getUserFacingError(new Error('boom'), 'generic')).toMatchObject({
      title: 'Something went wrong',
      trackingId: undefined,
    })
  })
})
