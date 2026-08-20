import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import UploadPage from '@/app/(public-app)/upload/page'
import type React from 'react'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('@/hooks/use-upload', () => ({
  useUpload: () => ({
    upload: vi.fn(),
    progress: 0,
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    extractionId: null,
    fileName: null,
    reset: vi.fn(),
  }),
}))

vi.mock('@/components/upload/dropzone', () => ({
  Dropzone: () => <div data-testid="dropzone">Upload dropzone</div>,
}))

vi.mock('@/components/ui/help-tooltip', () => ({
  HelpTooltip: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}))

vi.mock('@/lib/posthog', () => ({
  captureEvent: vi.fn(),
  EVENTS: {
    upload_completed: 'upload_completed',
    upload_sample_clicked: 'upload_sample_clicked',
  },
}))

describe('Upload page audit fixes', () => {
  beforeEach(() => {
    pushMock.mockClear()
  })

  it('places the upload card before sample and proof support content', () => {
    render(<UploadPage />)

    const page = screen.getByTestId('upload-page')
    const uploadCard = page.querySelector('#upload-card')
    const sampleTeaser = screen.getByTestId('sample-teaser')
    const riskReversal = screen.getByTestId('risk-reversal')

    expect(uploadCard).not.toBeNull()
    expect(uploadCard?.compareDocumentPosition(sampleTeaser)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    expect(uploadCard?.compareDocumentPosition(riskReversal)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
  })

  it('keeps only one sample CTA on the upload page', () => {
    render(<UploadPage />)

    expect(screen.queryByTestId('try-sample-ghost-button')).not.toBeInTheDocument()
    expect(screen.getByTestId('sample-teaser-link')).toBeInTheDocument()
  })

  it('renders how-it-works as an ordered list with hidden decorative arrows', () => {
    const { container } = render(<UploadPage />)

    const list = screen.getByRole('list', { name: /how it works/i })
    expect(list.tagName).toBe('OL')
    expect(
      Array.from(list.children).every((child) => child.tagName === 'LI'),
    ).toBe(true)
    expect(within(list).getAllByRole('listitem')).toHaveLength(4)

    const visibleArrow = container.querySelector('[data-testid="step-arrow"]:not([aria-hidden="true"])')
    expect(visibleArrow).toBeNull()
  })
})
