import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProcessingContent } from '@/components/processing/processing-content'
import * as api from '@/lib/api'
import type { Extraction } from '@/hooks/use-extraction'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/processing/ext-1',
}))

vi.mock('@/lib/neon-auth/client', () => ({
  createAuthClient: () => ({
    getSession: vi.fn().mockResolvedValue({ data: null, error: null }),
    onAuthStateChange: () => () => {},
  }),
}))

vi.mock('motion/react', () => ({
  motion: {
    div: ({
      children,
      'data-testid': testId,
      className,
      ...rest
    }: Record<string, unknown>) => {
      const props: Record<string, unknown> = {}
      if (testId) props['data-testid'] = testId
      if (className) props['className'] = className
      const animate = rest.animate as Record<string, unknown> | undefined
      if (animate && typeof animate === 'object' && 'width' in animate) {
        props['style'] = { width: animate.width }
      }
      return <div {...props}>{children as React.ReactNode}</div>
    },
    span: ({
      children,
      'data-testid': testId,
      className,
    }: Record<string, unknown>) => {
      const props: Record<string, unknown> = {}
      if (testId) props['data-testid'] = testId
      if (className) props['className'] = className
      return <span {...props}>{children as React.ReactNode}</span>
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))

function mockExtraction(overrides: Partial<Extraction> = {}): Extraction {
  return {
    id: 'ext-1',
    document_filename: 'test.pdf',
    status: 'uploading',
    payment_status: 'unpaid',
    document_page_count: null,
    property_type: null,
    extracted_data: {},
    confidence_scores: {},
    red_flags: [],
    show_camaudit: false,
    overall_confidence: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

describe('ProcessingContent', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.restoreAllMocks()
    pushMock.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders stepper with pipeline steps when processing', async () => {
    vi.spyOn(api, 'apiGet').mockResolvedValue(
      mockExtraction({ status: 'extracting' })
    )

    renderWithProviders(<ProcessingContent id="ext-1" />)

    await waitFor(() => {
      expect(screen.getByText('Reading PDF...')).toBeInTheDocument()
    })
    expect(screen.getByText('Uploading document...')).toBeInTheDocument()
    expect(screen.getByText('Scoring confidence...')).toBeInTheDocument()
  })

  it('shows loading skeleton initially', () => {
    vi.spyOn(api, 'apiGet').mockReturnValue(new Promise(() => {}))

    renderWithProviders(<ProcessingContent id="ext-1" />)

    expect(screen.getByTestId('processing-skeleton')).toBeInTheDocument()
  })

  it('redirects to /results/{id} on complete', async () => {
    vi.spyOn(api, 'apiGet').mockResolvedValue(
      mockExtraction({ status: 'complete' })
    )

    renderWithProviders(<ProcessingContent id="ext-1" />)

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/results/ext-1')
    })
  })

  it('redirects to /results/{id} on completed status', async () => {
    vi.spyOn(api, 'apiGet').mockResolvedValue(
      mockExtraction({ status: 'complete' })
    )

    renderWithProviders(<ProcessingContent id="ext-1" />)

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/results/ext-1')
    })
  })

  it('shows error state when extraction not found', async () => {
    vi.spyOn(api, 'apiGet').mockRejectedValue(
      new api.ApiError(404, 'Not found', { requestId: 'req-processing-404' })
    )

    renderWithProviders(<ProcessingContent id="bad-id" />)

    // useProcessing has retry: 2, so we need to advance timers to exhaust retries
    await vi.advanceTimersByTimeAsync(10000)

    await waitFor(() => {
      expect(screen.getByText(/extraction not found/i)).toBeInTheDocument()
    }, { timeout: 5000 })
    expect(screen.getByText(/deleted, expired, or belongs to another account/i)).toBeInTheDocument()
    expect(screen.getByText(/tracking id: req-processing-404/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /upload/i })).toBeInTheDocument()
  })

  it('shows failed state with error message and upload link', async () => {
    vi.spyOn(api, 'apiGet').mockResolvedValue(
      mockExtraction({
        status: 'failed',
        error_message: 'Extraction failed to process document',
      })
    )

    renderWithProviders(<ProcessingContent id="ext-1" />)

    await waitFor(() => {
      expect(
        screen.getByText(/extraction failed to process document/i)
      ).toBeInTheDocument()
    })
    expect(
      screen.getByRole('link', { name: /upload another document/i })
    ).toBeInTheDocument()
    expect(screen.getByText(/contact support/i)).toBeInTheDocument()
  })

  it('shows concrete recovery causes when processing fails', async () => {
    vi.spyOn(api, 'apiGet').mockResolvedValue(
      mockExtraction({ status: 'failed' })
    )

    renderWithProviders(<ProcessingContent id="ext-1" />)

    expect(await screen.findByText(/scanned pages are too blurry/i)).toBeInTheDocument()
    expect(screen.getByText(/password protected/i)).toBeInTheDocument()
    expect(screen.getByText(/not a commercial lease/i)).toBeInTheDocument()
  })

  it('shows default error message when failed without error_message', async () => {
    vi.spyOn(api, 'apiGet').mockResolvedValue(
      mockExtraction({ status: 'failed' })
    )

    renderWithProviders(<ProcessingContent id="ext-1" />)

    await waitFor(() => {
      expect(
        screen.getByText(/an error occurred during processing/i)
      ).toBeInTheDocument()
    })
  })

  it('displays the document file name', async () => {
    vi.spyOn(api, 'apiGet').mockResolvedValue(
      mockExtraction({ status: 'extracting', document_filename: 'my-lease.pdf' })
    )

    renderWithProviders(<ProcessingContent id="ext-1" />)

    await waitFor(() => {
      expect(screen.getByText('my-lease.pdf')).toBeInTheDocument()
    })
  })

  it('keeps long document file names overflow-safe', async () => {
    const longFileName =
      'extremely-long-commercial-office-lease-document-name-without-natural-breaks-2026-final-executed-copy.pdf'
    vi.spyOn(api, 'apiGet').mockResolvedValue(
      mockExtraction({ status: 'extracting', document_filename: longFileName })
    )

    renderWithProviders(<ProcessingContent id="ext-1" />)

    const filename = await screen.findByText(longFileName)
    expect(filename).toHaveClass('truncate')
    expect(filename.parentElement).toHaveClass('min-w-0')
  })

  it('tells users successful processing auto-redirects and offers a secondary action', async () => {
    vi.spyOn(api, 'apiGet').mockResolvedValue(
      mockExtraction({ status: 'scoring' })
    )

    renderWithProviders(<ProcessingContent id="ext-1" />)

    expect(
      await screen.findByText(/we will take you to the results automatically/i)
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /upload another lease/i })
    ).toHaveAttribute('href', '/upload')
  })

  it('lets users cancel an in-progress extraction', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'apiGet').mockResolvedValue(
      mockExtraction({ status: 'extracting' })
    )
    const postSpy = vi.spyOn(api, 'apiPost').mockResolvedValue(
      mockExtraction({
        status: 'failed',
        error_message: 'Processing cancelled by user',
      })
    )

    renderWithProviders(<ProcessingContent id="ext-1" />)

    await user.click(await screen.findByRole('button', { name: /cancel processing/i }))

    expect(postSpy).toHaveBeenCalledWith('/extractions/ext-1/cancel')
    expect(
      await screen.findByText(/processing cancelled by user/i),
    ).toBeInTheDocument()
  })

  it('renders page heading', async () => {
    vi.spyOn(api, 'apiGet').mockResolvedValue(
      mockExtraction({ status: 'uploading' })
    )

    renderWithProviders(<ProcessingContent id="ext-1" />)

    await waitFor(() => {
      expect(
        screen.getByText('Processing your document')
      ).toBeInTheDocument()
    })
  })

  it('shows a retry button on failed status that calls POST /extractions/{id}/retry', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    vi.spyOn(api, 'apiGet').mockResolvedValue(
      mockExtraction({
        status: 'failed',
        error_message: 'Extraction failed to process document',
      })
    )
    const postSpy = vi.spyOn(api, 'apiPost').mockResolvedValue(
      mockExtraction({ status: 'extracting' })
    )

    renderWithProviders(<ProcessingContent id="ext-1" />)

    const retryButton = await screen.findByTestId('retry-extraction-button')
    await user.click(retryButton)

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith('/extractions/ext-1/retry')
    })
  })

  it('shows backend error in a card above the retry button when retry fails', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    vi.spyOn(api, 'apiGet').mockResolvedValue(
      mockExtraction({ status: 'failed', error_message: 'Original failure' })
    )
    vi.spyOn(api, 'apiPost').mockRejectedValue(
      new api.ApiError(409, 'Cannot retry: extraction already queued')
    )

    renderWithProviders(<ProcessingContent id="ext-1" />)

    const retryButton = await screen.findByTestId('retry-extraction-button')
    await user.click(retryButton)

    await waitFor(() => {
      expect(screen.getByTestId('retry-error-card')).toBeInTheDocument()
    })
    expect(
      screen.getByText(/cannot retry: extraction already queued/i),
    ).toBeInTheDocument()
  })

  it('Bug #53: redirect fires again when id prop changes to a new complete extraction', async () => {
    // First extraction is complete
    vi.spyOn(api, 'apiGet').mockResolvedValue(
      mockExtraction({ id: 'ext-1', status: 'complete' })
    )

    const { rerender } = renderWithProviders(<ProcessingContent id="ext-1" />)

    // Wait for first redirect
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/results/ext-1')
    })

    pushMock.mockClear()

    // Now switch to a second complete extraction — if navigatedRef is not reset,
    // the redirect will not fire because navigatedRef.current is still true.
    vi.spyOn(api, 'apiGet').mockResolvedValue(
      mockExtraction({ id: 'ext-2', status: 'complete' })
    )

    rerender(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ProcessingContent id="ext-2" />
      </QueryClientProvider>
    )

    // Bug #53 fix: navigatedRef is reset when id changes, so redirect fires again
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/results/ext-2')
    })
  })
})
