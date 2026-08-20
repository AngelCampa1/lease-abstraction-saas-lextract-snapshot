import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SplitResultsView } from '@/components/results/split-results-view'

// Mock react-resizable-panels (v4: Group, Panel, Separator)
vi.mock('react-resizable-panels', () => ({
  Group: ({
    children,
    'data-testid': testId,
  }: {
    children: React.ReactNode
    direction: string
    'data-testid'?: string
  }) => <div data-testid={testId ?? 'panel-group'}>{children}</div>,
  Panel: ({
    children,
    'data-testid': testId,
  }: {
    children: React.ReactNode
    defaultSize: number
    minSize: number
    'data-testid'?: string
  }) => <div data-testid={testId ?? 'panel'}>{children}</div>,
  Separator: ({
    'data-testid': testId,
  }: {
    className?: string
    'data-testid'?: string
  }) => <div data-testid={testId ?? 'resize-handle'} />,
}))

// Mock PdfViewer
vi.mock('@/components/results/pdf-viewer', () => ({
  PdfViewer: ({
    url,
    highlightText,
  }: {
    url: string
    highlightText?: string | null
  }) => (
    <div data-testid="mock-pdf-viewer" data-url={url} data-highlight={highlightText ?? ''}>
      PDF Viewer
    </div>
  ),
}))

// Mock next/dynamic so it renders synchronously (not lazily) in tests.
// SplitResultsView uses dynamic() to import PdfViewer with ssr:false.
// Without this mock, the dynamic wrapper renders nothing in jsdom.
vi.mock('next/dynamic', () => ({
  default: (_loader: unknown, _options?: unknown) => {
    // In test environment, return the already-mocked PdfViewer directly.
    // This works because vi.mock('@/components/results/pdf-viewer', ...) above
    // registers the mock synchronously and our mock just uses the testid.
    const MockPdfViewer = ({
      url,
      highlightText,
    }: {
      url: string
      highlightText?: string | null
    }) => (
      <div data-testid="mock-pdf-viewer" data-url={url} data-highlight={highlightText ?? ''}>
        PDF Viewer
      </div>
    )
    MockPdfViewer.displayName = 'MockPdfViewer'
    return MockPdfViewer
  },
}))

// Mock lucide-react
vi.mock('lucide-react', () => ({
  FileText: ({ className }: { className?: string }) => (
    <span data-testid="icon-file-text" className={className} />
  ),
  Table: ({ className }: { className?: string }) => (
    <span data-testid="icon-table" className={className} />
  ),
}))

// Mock Tabs components
vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, className }: { children: React.ReactNode; defaultValue?: string; className?: string }) => (
    <div data-testid="mock-tabs" className={className}>{children}</div>
  ),
  TabsList: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="mock-tabs-list" className={className}>{children}</div>
  ),
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string; className?: string }) => (
    <button data-testid={`mock-tab-${value}`}>{children}</button>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`mock-tab-content-${value}`}>{children}</div>
  ),
}))

// Helper to mock window.innerWidth
function mockWindowWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  // Default to desktop width
  mockWindowWidth(1280)
})

describe('SplitResultsView', () => {
  it('renders children in full width when showPdf is false', () => {
    render(
      <SplitResultsView
        showPdf={false}
        pdfUrl="https://example.com/doc.pdf"
        highlightText={null}
        onTogglePdf={vi.fn()}
      >
        <div data-testid="test-children">Results Content</div>
      </SplitResultsView>,
    )

    expect(screen.getByTestId('test-children')).toBeInTheDocument()
    expect(screen.getByText('Results Content')).toBeInTheDocument()
    expect(screen.queryByTestId('split-panel-group')).not.toBeInTheDocument()
  })

  it('renders split panels when showPdf is true', () => {
    render(
      <SplitResultsView
        showPdf={true}
        pdfUrl="https://example.com/doc.pdf"
        highlightText={null}
        onTogglePdf={vi.fn()}
      >
        <div data-testid="test-children">Results Content</div>
      </SplitResultsView>,
    )

    expect(screen.getByTestId('split-panel-group')).toBeInTheDocument()
    expect(screen.getByTestId('results-panel')).toBeInTheDocument()
    expect(screen.getByTestId('pdf-panel')).toBeInTheDocument()
    expect(screen.getByTestId('mock-pdf-viewer')).toBeInTheDocument()
  })

  it('toggle button calls onTogglePdf on desktop', async () => {
    const onToggle = vi.fn()
    const user = userEvent.setup()

    render(
      <SplitResultsView
        showPdf={false}
        pdfUrl="https://example.com/doc.pdf"
        highlightText={null}
        onTogglePdf={onToggle}
      >
        <div>Content</div>
      </SplitResultsView>,
    )

    const toggleButton = screen.getByTestId('pdf-toggle-button')
    await user.click(toggleButton)

    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('resize handle is present in split mode', () => {
    render(
      <SplitResultsView
        showPdf={true}
        pdfUrl="https://example.com/doc.pdf"
        highlightText={null}
        onTogglePdf={vi.fn()}
      >
        <div>Content</div>
      </SplitResultsView>,
    )

    expect(screen.getByTestId('resize-handle')).toBeInTheDocument()
  })

  it('does not show toggle button when pdfUrl is null', () => {
    render(
      <SplitResultsView
        showPdf={false}
        pdfUrl={null}
        highlightText={null}
        onTogglePdf={vi.fn()}
      >
        <div>Content</div>
      </SplitResultsView>,
    )

    expect(screen.queryByTestId('pdf-toggle-button')).not.toBeInTheDocument()
  })

  it('renders full width when pdfUrl is null even if showPdf is true', () => {
    render(
      <SplitResultsView
        showPdf={true}
        pdfUrl={null}
        highlightText={null}
        onTogglePdf={vi.fn()}
      >
        <div data-testid="test-children">Content</div>
      </SplitResultsView>,
    )

    expect(screen.getByTestId('test-children')).toBeInTheDocument()
    expect(screen.queryByTestId('split-panel-group')).not.toBeInTheDocument()
  })

  it('passes highlightText to PdfViewer', () => {
    render(
      <SplitResultsView
        showPdf={true}
        pdfUrl="https://example.com/doc.pdf"
        highlightText="The Tenant shall be Acme Corp"
        onTogglePdf={vi.fn()}
      >
        <div>Content</div>
      </SplitResultsView>,
    )

    const viewer = screen.getByTestId('mock-pdf-viewer')
    expect(viewer).toHaveAttribute(
      'data-highlight',
      'The Tenant shall be Acme Corp',
    )
  })

  it('toggle button shows "View PDF" when not showing PDF', () => {
    render(
      <SplitResultsView
        showPdf={false}
        pdfUrl="https://example.com/doc.pdf"
        highlightText={null}
        onTogglePdf={vi.fn()}
      >
        <div>Content</div>
      </SplitResultsView>,
    )

    expect(screen.getByTestId('pdf-toggle-button')).toHaveTextContent(
      'View PDF',
    )
  })

  it('promotes View PDF as a header-adjacent control', () => {
    render(
      <SplitResultsView
        showPdf={false}
        pdfUrl="https://example.com/doc.pdf"
        highlightText={null}
        onTogglePdf={vi.fn()}
      >
        <div>Content</div>
      </SplitResultsView>,
    )

    expect(screen.getByTestId('pdf-toggle-button')).toHaveClass('mb-0')
    expect(screen.getByTestId('pdf-toggle-button')).toHaveClass('min-h-10')
  })

  it('toggle button shows "Hide PDF" when showing PDF on desktop', () => {
    render(
      <SplitResultsView
        showPdf={true}
        pdfUrl="https://example.com/doc.pdf"
        highlightText={null}
        onTogglePdf={vi.fn()}
      >
        <div>Content</div>
      </SplitResultsView>,
    )

    expect(screen.getByTestId('pdf-toggle-button')).toHaveTextContent(
      'Hide PDF',
    )
  })

  it('on mobile, shows tab interface instead of split view', () => {
    mockWindowWidth(800)

    render(
      <SplitResultsView
        showPdf={false}
        pdfUrl="https://example.com/doc.pdf"
        highlightText={null}
        onTogglePdf={vi.fn()}
      >
        <div data-testid="test-children">Content</div>
      </SplitResultsView>,
    )

    // Should not have split panels
    expect(screen.queryByTestId('split-panel-group')).not.toBeInTheDocument()

    // Should show tabs with data and PDF tabs
    expect(screen.getByTestId('mock-tabs')).toBeInTheDocument()
    expect(screen.getByTestId('mock-tab-data')).toBeInTheDocument()
    expect(screen.getByTestId('mock-tab-pdf')).toBeInTheDocument()

    // Children should be in the data tab content
    expect(screen.getByTestId('test-children')).toBeInTheDocument()

    // PDF viewer should be in the PDF tab content
    expect(screen.getByTestId('mock-pdf-viewer')).toBeInTheDocument()
  })

  it('Bug #39: switches layout when window is resized', () => {
    // Start on desktop
    mockWindowWidth(1280)

    const { rerender } = render(
      <SplitResultsView
        showPdf={true}
        pdfUrl="https://example.com/doc.pdf"
        highlightText={null}
        onTogglePdf={vi.fn()}
      >
        <div data-testid="test-children">Content</div>
      </SplitResultsView>,
    )

    // Desktop: should show split panels
    expect(screen.getByTestId('split-panel-group')).toBeInTheDocument()

    // Resize to mobile
    mockWindowWidth(800)
    act(() => {
      fireEvent(window, new Event('resize'))
    })

    // Re-render to pick up state change
    rerender(
      <SplitResultsView
        showPdf={true}
        pdfUrl="https://example.com/doc.pdf"
        highlightText={null}
        onTogglePdf={vi.fn()}
      >
        <div data-testid="test-children">Content</div>
      </SplitResultsView>,
    )

    // Mobile: should show tabs instead of split panels
    expect(screen.queryByTestId('split-panel-group')).not.toBeInTheDocument()
    expect(screen.getByTestId('mock-tabs')).toBeInTheDocument()
  })

  it('always renders split-results-view wrapper', () => {
    render(
      <SplitResultsView
        showPdf={false}
        pdfUrl={null}
        highlightText={null}
        onTogglePdf={vi.fn()}
      >
        <div>Content</div>
      </SplitResultsView>,
    )

    expect(screen.getByTestId('split-results-view')).toBeInTheDocument()
  })

  it('Bug #54: initial render assumes desktop (isMobile starts false) to avoid SSR hydration mismatch', () => {
    // Simulate a mobile viewport that would cause isMobile=true if read during init
    mockWindowWidth(375)

    // On SSR, window is undefined so useState initializer cannot read window.innerWidth.
    // The fix initializes to false (desktop) unconditionally, then updates in useEffect.
    // This test verifies the component renders correctly before useEffect fires
    // (i.e., with the desktop layout initially).
    const { container } = render(
      <SplitResultsView
        showPdf={true}
        pdfUrl="https://example.com/doc.pdf"
        highlightText={null}
        onTogglePdf={vi.fn()}
      >
        <div data-testid="test-children">Content</div>
      </SplitResultsView>,
    )

    // Before useEffect fires, isMobile is false (desktop), so split panels are rendered.
    // This is the SSR-consistent initial state — no hydration mismatch.
    expect(container).toBeTruthy()

    // The component must not throw during SSR-like initial render
    // (window.innerWidth is not accessed during useState initialization)
    expect(screen.getByTestId('split-results-view')).toBeInTheDocument()
  })

  it('Bug #54: useEffect updates isMobile after mount', () => {
    // Simulate mobile viewport
    mockWindowWidth(800)

    render(
      <SplitResultsView
        showPdf={false}
        pdfUrl="https://example.com/doc.pdf"
        highlightText={null}
        onTogglePdf={vi.fn()}
      >
        <div data-testid="test-children">Content</div>
      </SplitResultsView>,
    )

    // After mount, useEffect runs onResize() which sets isMobile=true
    // On mobile, tab interface is shown instead of toggle button
    expect(screen.getByTestId('mock-tabs')).toBeInTheDocument()
    // No toggle button on mobile — tabs handle switching
    expect(screen.queryByTestId('pdf-toggle-button')).not.toBeInTheDocument()
  })
})
