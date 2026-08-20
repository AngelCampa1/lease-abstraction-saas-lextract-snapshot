import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import UploadPage from '@/app/(public-app)/upload/page'
import * as useUploadModule from '@/hooks/use-upload'
import type { UseUploadReturn } from '@/hooks/use-upload'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/hooks/use-upload', () => ({
  useUpload: vi.fn(),
}))

const mockCaptureEvent = vi.fn()
vi.mock('@/lib/posthog', () => ({
  captureEvent: (...args: unknown[]) => mockCaptureEvent(...args),
  EVENTS: {
    upload_completed: 'upload_completed',
    upload_sample_clicked: 'upload_sample_clicked',
  },
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    onClick,
    'data-testid': dataTestId,
    className,
  }: {
    children: React.ReactNode
    href: string
    onClick?: () => void
    'data-testid'?: string
    className?: string
  }) => (
    <a href={href} onClick={onClick} data-testid={dataTestId} className={className}>
      {children}
    </a>
  ),
}))

// Mock SampleTeaser so upload-page tests don't re-test its internals
vi.mock('@/components/upload/sample-teaser', () => ({
  SampleTeaser: () => <div data-testid="sample-teaser-mock" />,
}))

function createMockUpload(overrides: Partial<UseUploadReturn> = {}): UseUploadReturn {
  return {
    upload: vi.fn(),
    progress: 0,
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    extractionId: null,
    fileName: null,
    reset: vi.fn(),
    ...overrides,
  }
}

describe('UploadPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useUploadModule.useUpload).mockReturnValue(createMockUpload())
  })

  // ── Hero ────────────────────────────────────────────────────────────────────

  it('renders the updated hero heading', () => {
    render(<UploadPage />)
    expect(
      screen.getByRole('heading', { level: 1 }),
    ).toHaveTextContent('Upload a commercial lease. Get structured data back in minutes.')
  })

  it('keeps the upload promise clear before the file picker', () => {
    render(<UploadPage />)
    expect(screen.getAllByText(/free preview before you pay/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/126 fields, confidence scores, red flags, and exports/i)).toBeInTheDocument()
    expect(screen.getAllByText(/unlock the full report for \$15/i).length).toBeGreaterThanOrEqual(1)
  })

  // ── How It Works strip ──────────────────────────────────────────────────────

  it('renders the HowItWorksSteps strip with "126 fields" text', () => {
    render(<UploadPage />)
    expect(screen.getByText('126 fields')).toBeInTheDocument()
  })

  it('does NOT render the old hero dual-CTA buttons', () => {
    render(<UploadPage />)
    expect(screen.queryByTestId('try-sample-hero-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('upload-your-pdf-button')).not.toBeInTheDocument()
  })

  // ── Ghost sample CTA (below card) ───────────────────────────────────────────

  it('does not render the duplicate ghost sample CTA below the upload card', () => {
    render(<UploadPage />)
    expect(screen.queryByTestId('try-sample-ghost-button')).not.toBeInTheDocument()
  })

  // ── SampleTeaser ────────────────────────────────────────────────────────────

  it('renders the SampleTeaser component', () => {
    render(<UploadPage />)
    expect(screen.getByTestId('sample-teaser-mock')).toBeInTheDocument()
  })

  // ── Risk-reversal callout ────────────────────────────────────────────────────

  it('renders the risk-reversal callout section', () => {
    render(<UploadPage />)
    expect(screen.getByTestId('risk-reversal')).toBeInTheDocument()
  })

  it('risk-reversal mentions free preview', () => {
    render(<UploadPage />)
    expect(
      screen.getByText(/free preview.*see all extracted fields before paying/i),
    ).toBeInTheDocument()
  })

  it('shows beginner help for free preview, payment, security, and valid PDFs', () => {
    render(<UploadPage />)

    expect(
      screen.getByRole('button', { name: /what does free preview mean/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /what am i paying for/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /how is my lease protected/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /what kind of file should i upload/i }),
    ).toBeInTheDocument()
  })

  it('risk-reversal links to privacy policy', () => {
    render(<UploadPage />)
    const link = screen.getByTestId('privacy-policy-link')
    expect(link).toHaveAttribute('href', '/privacy')
    expect(link).toHaveTextContent('data retention policy')
  })

  // ── Upload card ─────────────────────────────────────────────────────────────

  it('renders the upload card with id for scroll target', () => {
    render(<UploadPage />)
    // Card title still present
    expect(screen.getByText('Start with the PDF')).toBeInTheDocument()
  })

  it('renders dropzone in default state', () => {
    render(<UploadPage />)
    expect(screen.getByTestId('dropzone')).toBeInTheDocument()
  })

  it('shows progress bar during upload', () => {
    vi.mocked(useUploadModule.useUpload).mockReturnValue(
      createMockUpload({ isPending: true, fileName: 'lease.pdf', progress: 60 }),
    )
    render(<UploadPage />)
    expect(screen.getByTestId('upload-progress')).toBeInTheDocument()
    expect(screen.getByTestId('upload-file-name')).toHaveTextContent('lease.pdf')
    expect(screen.getByTestId('upload-percentage')).toHaveTextContent('60%')
  })

  it('shows error state with retry button', () => {
    const mockReset = vi.fn()
    vi.mocked(useUploadModule.useUpload).mockReturnValue(
      createMockUpload({
        isError: true,
        error: { name: 'ApiError', status: 500, detail: 'Server error', message: 'Server error' },
        reset: mockReset,
      }),
    )
    render(<UploadPage />)
    expect(screen.getByTestId('file-validation-error')).toHaveTextContent('Server error')
    expect(screen.getByTestId('upload-retry-button')).toBeInTheDocument()
  })

  it('redirects to processing page on success', () => {
    vi.mocked(useUploadModule.useUpload).mockReturnValue(
      createMockUpload({ isSuccess: true, extractionId: 'ext-redirect-123' }),
    )
    render(<UploadPage />)
    expect(mockPush).toHaveBeenCalledWith('/processing/ext-redirect-123')
    expect(mockCaptureEvent).toHaveBeenCalledWith('upload_completed', { extraction_id: 'ext-redirect-123' })
  })

  it('does not redirect when not successful', () => {
    render(<UploadPage />)
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('does not redirect when isSuccess is true but extractionId is null', () => {
    vi.mocked(useUploadModule.useUpload).mockReturnValue(
      createMockUpload({ isSuccess: true, extractionId: null }),
    )
    render(<UploadPage />)
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('renders page wrapper with test id', () => {
    render(<UploadPage />)
    expect(screen.getByTestId('upload-page')).toBeInTheDocument()
  })

  // ── Social proof ─────────────────────────────────────────────────────────────

  it('renders updated social proof copy', () => {
    render(<UploadPage />)
    expect(
      screen.getByText(/skip 4 to 8 hours of manual work per lease/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/126 fields: rent, options, cam, insurance, termination/i),
    ).toBeInTheDocument()
  })
})
