import { render, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockCaptureException = vi.fn()

vi.mock('@sentry/nextjs', () => ({
  captureException: mockCaptureException,
  withScope: (callback: (scope: { setTag: (key: string, value: string) => void }) => void) => {
    callback({ setTag: vi.fn() })
  },
}))

describe('route error boundaries', () => {
  beforeEach(() => {
    vi.resetModules()
    mockCaptureException.mockClear()
  })

  it('captures marketing route errors in Sentry', async () => {
    const { default: MarketingError } = await import('@/app/(marketing)/error')
    const error = new Error('marketing failed')

    render(<MarketingError error={error} reset={vi.fn()} />)

    await waitFor(() => {
      expect(mockCaptureException).toHaveBeenCalledWith(error)
    })
  })

  it('captures app route errors in Sentry', async () => {
    const { default: AppError } = await import('@/app/(app)/error')
    const error = new Error('app failed')

    render(<AppError error={error} reset={vi.fn()} />)

    await waitFor(() => {
      expect(mockCaptureException).toHaveBeenCalledWith(error)
    })
  })

  it('shows a tracking ID when Sentry returns an event ID', async () => {
    mockCaptureException.mockReturnValueOnce('event-route-123')
    const { default: AppError } = await import('@/app/(app)/error')

    const { getByText } = render(<AppError error={new Error('app failed')} reset={vi.fn()} />)

    await waitFor(() => {
      expect(getByText('Tracking ID: event-route-123')).toBeTruthy()
    })
  })

  it('captures public app route errors in Sentry', async () => {
    const { default: PublicAppError } = await import('@/app/(public-app)/error')
    const error = new Error('public app failed')

    render(<PublicAppError error={error} reset={vi.fn()} />)

    await waitFor(() => {
      expect(mockCaptureException).toHaveBeenCalledWith(error)
    })
  })

  it('captures root route errors in Sentry', async () => {
    const { default: RootError } = await import('@/app/error')
    const error = new Error('root failed')

    render(<RootError error={error} reset={vi.fn()} />)

    await waitFor(() => {
      expect(mockCaptureException).toHaveBeenCalledWith(error)
    })
  })

  it('captures global app errors in Sentry', async () => {
    const { default: GlobalError } = await import('@/app/global-error')
    const error = new Error('global failed')

    render(<GlobalError error={error} reset={vi.fn()} />)

    await waitFor(() => {
      expect(mockCaptureException).toHaveBeenCalledWith(error)
    })
  })
})
