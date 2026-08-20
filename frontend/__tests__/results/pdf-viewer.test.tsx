import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { pdfjs } from 'react-pdf'
import { PdfViewer } from '@/components/results/pdf-viewer'

const mockPdfSearch = vi.hoisted(() => ({
  pageNumber: null as number | null,
}))
const mockTextLayer = vi.hoisted(() => ({
  text: 'The Tenant shall provide insurance coverage.',
}))

// Store callbacks at module level for tests to trigger PDF load events
const callbackStore: {
  onLoadSuccess: ((pdf: unknown) => void) | null
  onLoadError: (() => void) | null
} = {
  onLoadSuccess: null,
  onLoadError: null,
}

// Mock react-pdf
vi.mock('react-pdf', () => {
  const { useEffect } = require('react') // eslint-disable-line @typescript-eslint/no-require-imports -- vitest mock factory requires synchronous require

  const pdfjs = {
    version: '4.0.0',
    GlobalWorkerOptions: { workerSrc: '' },
  }

  function Document({
    children,
    onLoadSuccess,
    onLoadError,
  }: {
    file: string
    children: React.ReactNode
    onLoadSuccess?: (pdf: unknown) => void
    onLoadError?: () => void
    loading?: React.ReactNode
  }) {
    useEffect(() => {
      callbackStore.onLoadSuccess = onLoadSuccess ?? null
      callbackStore.onLoadError = onLoadError ?? null
    })
    return <div data-testid="pdf-document">{children}</div>
  }

  function Page({
    pageNumber,
    scale,
    customTextRenderer,
  }: {
    pageNumber: number
    scale: number
    renderTextLayer?: boolean
    renderAnnotationLayer?: boolean
    customTextRenderer?: (textItem: { str: string }) => string
  }) {
    return (
      <div data-testid="pdf-page" data-page={pageNumber} data-scale={scale}>
        Page {pageNumber}
        {customTextRenderer && (
          <span
            data-testid="pdf-highlight-sample"
            dangerouslySetInnerHTML={{
              __html: customTextRenderer({
                str: mockTextLayer.text,
              }),
            }}
          />
        )}
      </div>
    )
  }

  return { Document, Page, pdfjs }
})

// Mock the css imports
vi.mock('react-pdf/dist/Page/AnnotationLayer.css', () => ({}))
vi.mock('react-pdf/dist/Page/TextLayer.css', () => ({}))

// Mock use-pdf-search
vi.mock('@/hooks/use-pdf-search', () => ({
  usePdfSearch: () => ({ pageNumber: mockPdfSearch.pageNumber, isSearching: false }),
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ChevronLeft: ({ className }: { className?: string }) => (
    <span data-testid="icon-chevron-left" className={className} />
  ),
  ChevronRight: ({ className }: { className?: string }) => (
    <span data-testid="icon-chevron-right" className={className} />
  ),
  Minus: ({ className }: { className?: string }) => (
    <span data-testid="icon-minus" className={className} />
  ),
  Plus: ({ className }: { className?: string }) => (
    <span data-testid="icon-plus" className={className} />
  ),
  Maximize2: ({ className }: { className?: string }) => (
    <span data-testid="icon-maximize" className={className} />
  ),
  Loader2: ({ className }: { className?: string }) => (
    <span data-testid="icon-loader" className={className} />
  ),
}))

beforeEach(() => {
  vi.clearAllMocks()
  callbackStore.onLoadSuccess = null
  callbackStore.onLoadError = null
  mockPdfSearch.pageNumber = null
  mockTextLayer.text = 'The Tenant shall provide insurance coverage.'
})

describe('PdfViewer', () => {
  it('uses a same-origin bundled PDF.js worker instead of the CSP-blocked CDN', () => {
    expect(pdfjs.GlobalWorkerOptions.workerSrc).toContain('pdf.worker')
    expect(pdfjs.GlobalWorkerOptions.workerSrc).not.toContain('unpkg.com')
  })

  it('renders loading state while PDF loads', () => {
    render(<PdfViewer url="https://example.com/test.pdf" />)
    expect(screen.getByTestId('pdf-viewer-loading')).toBeInTheDocument()
  })

  it('renders the missing-object panel on load failure', () => {
    render(<PdfViewer url="https://example.com/bad.pdf" />)

    act(() => {
      callbackStore.onLoadError?.()
    })

    expect(screen.getByTestId('pdf-viewer-unavailable')).toBeInTheDocument()
    expect(screen.getByText(/PDF unavailable/i)).toBeInTheDocument()
    expect(
      screen.getByText(/file may have been removed/i),
    ).toBeInTheDocument()
  })

  it('renders the missing-object panel when url is null', () => {
    render(<PdfViewer url={null} />)
    expect(screen.getByTestId('pdf-viewer-unavailable')).toBeInTheDocument()
    expect(
      screen.getByText(/file may have been removed/i),
    ).toBeInTheDocument()
  })

  it('shows page navigation controls after loading', () => {
    render(<PdfViewer url="https://example.com/test.pdf" />)

    act(() => {
      callbackStore.onLoadSuccess?.({ numPages: 5 })
    })

    expect(screen.getByTestId('pdf-toolbar')).toBeInTheDocument()
    expect(screen.getByTestId('page-indicator')).toHaveTextContent('1 / 5')
  })

  it('page forward works correctly', async () => {
    const user = userEvent.setup()
    render(<PdfViewer url="https://example.com/test.pdf" />)

    act(() => {
      callbackStore.onLoadSuccess?.({ numPages: 5 })
    })

    const nextButton = screen.getByRole('button', { name: /next page/i })
    await user.click(nextButton)

    expect(screen.getByTestId('page-indicator')).toHaveTextContent('2 / 5')
  })

  it('page backward works correctly', async () => {
    const user = userEvent.setup()
    render(<PdfViewer url="https://example.com/test.pdf" />)

    act(() => {
      callbackStore.onLoadSuccess?.({ numPages: 5 })
    })

    // Go to page 2 first
    const nextButton = screen.getByRole('button', { name: /next page/i })
    await user.click(nextButton)
    expect(screen.getByTestId('page-indicator')).toHaveTextContent('2 / 5')

    // Go back to page 1
    const prevButton = screen.getByRole('button', { name: /previous page/i })
    await user.click(prevButton)
    expect(screen.getByTestId('page-indicator')).toHaveTextContent('1 / 5')
  })

  it('previous page button is disabled on first page', () => {
    render(<PdfViewer url="https://example.com/test.pdf" />)

    act(() => {
      callbackStore.onLoadSuccess?.({ numPages: 5 })
    })

    const prevButton = screen.getByRole('button', { name: /previous page/i })
    expect(prevButton).toBeDisabled()
  })

  it('next page button is disabled on last page', async () => {
    const user = userEvent.setup()
    render(<PdfViewer url="https://example.com/test.pdf" />)

    act(() => {
      callbackStore.onLoadSuccess?.({ numPages: 2 })
    })

    const nextButton = screen.getByRole('button', { name: /next page/i })
    await user.click(nextButton)

    expect(nextButton).toBeDisabled()
  })

  it('zoom in changes scale', async () => {
    const user = userEvent.setup()
    render(<PdfViewer url="https://example.com/test.pdf" />)

    act(() => {
      callbackStore.onLoadSuccess?.({ numPages: 1 })
    })

    const scaleIndicator = screen.getByTestId('scale-indicator')
    expect(scaleIndicator).toHaveTextContent('100%')

    const zoomInButton = screen.getByRole('button', { name: /zoom in/i })
    await user.click(zoomInButton)

    expect(scaleIndicator).toHaveTextContent('125%')
  })

  it('zoom out changes scale', async () => {
    const user = userEvent.setup()
    render(<PdfViewer url="https://example.com/test.pdf" />)

    act(() => {
      callbackStore.onLoadSuccess?.({ numPages: 1 })
    })

    const zoomOutButton = screen.getByRole('button', { name: /zoom out/i })
    await user.click(zoomOutButton)

    const scaleIndicator = screen.getByTestId('scale-indicator')
    expect(scaleIndicator).toHaveTextContent('75%')
  })

  it('fits the page scale to the viewer width', async () => {
    const user = userEvent.setup()
    render(<PdfViewer url="https://example.com/test.pdf" />)

    act(() => {
      callbackStore.onLoadSuccess?.({ numPages: 1 })
    })

    Object.defineProperty(screen.getByTestId('pdf-viewer'), 'clientWidth', {
      configurable: true,
      value: 306,
    })

    await user.click(screen.getByRole('button', { name: /fit to width/i }))

    expect(screen.getByTestId('scale-indicator')).toHaveTextContent('50%')
  })

  it('navigates to the first page returned by PDF search', async () => {
    const onPageChange = vi.fn()
    mockPdfSearch.pageNumber = 3

    render(
      <PdfViewer
        url="https://example.com/test.pdf"
        highlightText="insurance"
        onPageChange={onPageChange}
      />,
    )

    act(() => {
      callbackStore.onLoadSuccess?.({ numPages: 5 })
    })

    await screen.findByText('Page 3')
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('navigates to a PDF search result when no page callback is provided', async () => {
    mockPdfSearch.pageNumber = 2

    render(<PdfViewer url="https://example.com/test.pdf" highlightText="rent" />)

    act(() => {
      callbackStore.onLoadSuccess?.({ numPages: 5 })
    })

    await screen.findByText('Page 2')
  })

  it('highlights matching source text in the PDF text layer', () => {
    render(
      <PdfViewer
        url="https://example.com/test.pdf"
        highlightText="insurance"
      />,
    )

    act(() => {
      callbackStore.onLoadSuccess?.({ numPages: 5 })
    })

    const sample = screen.getByTestId('pdf-highlight-sample')
    const highlight = sample.querySelector('mark')

    expect(highlight).not.toBeNull()
    expect(highlight).toHaveTextContent('insurance')
  })

  it('highlights source text containing HTML-significant characters safely', () => {
    mockTextLayer.text = "Tenant's A&B LLC <suite>"

    render(
      <PdfViewer
        url="https://example.com/test.pdf"
        highlightText="A&B"
      />,
    )

    act(() => {
      callbackStore.onLoadSuccess?.({ numPages: 5 })
    })

    const sample = screen.getByTestId('pdf-highlight-sample')
    const highlight = sample.querySelector('mark')

    expect(highlight).not.toBeNull()
    expect(highlight).toHaveTextContent('A&B')
    expect(sample).toHaveTextContent("Tenant's")
    expect(sample.innerHTML).toContain('&lt;suite&gt;')
  })

  it('treats regex metacharacters in highlight text as literal text', () => {
    mockTextLayer.text = 'Monthly rent (base) is $15.00.'

    render(
      <PdfViewer
        url="https://example.com/test.pdf"
        highlightText="rent (base)"
      />,
    )

    act(() => {
      callbackStore.onLoadSuccess?.({ numPages: 5 })
    })

    const highlight = screen
      .getByTestId('pdf-highlight-sample')
      .querySelector('mark')

    expect(highlight).not.toBeNull()
    expect(highlight).toHaveTextContent('rent (base)')
  })

  it('renders the missing-object panel when url is empty', () => {
    render(<PdfViewer url="" />)
    expect(screen.getByTestId('pdf-viewer-unavailable')).toBeInTheDocument()
    expect(
      screen.getByText(/file may have been removed/i),
    ).toBeInTheDocument()
  })

  it('calls onPageChange when page changes', async () => {
    const onPageChange = vi.fn()
    const user = userEvent.setup()
    render(
      <PdfViewer
        url="https://example.com/test.pdf"
        onPageChange={onPageChange}
      />,
    )

    act(() => {
      callbackStore.onLoadSuccess?.({ numPages: 5 })
    })

    const nextButton = screen.getByRole('button', { name: /next page/i })
    await user.click(nextButton)

    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('hides loading state after document loads', () => {
    render(<PdfViewer url="https://example.com/test.pdf" />)

    expect(screen.getByTestId('pdf-viewer-loading')).toBeInTheDocument()

    act(() => {
      callbackStore.onLoadSuccess?.({ numPages: 3 })
    })

    expect(screen.queryByTestId('pdf-viewer-loading')).not.toBeInTheDocument()
  })

  it('renders pdf page with correct page number', () => {
    render(<PdfViewer url="https://example.com/test.pdf" />)

    act(() => {
      callbackStore.onLoadSuccess?.({ numPages: 3 })
    })

    const page = screen.getByTestId('pdf-page')
    expect(page).toHaveAttribute('data-page', '1')
  })
})
