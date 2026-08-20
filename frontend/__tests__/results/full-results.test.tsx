import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FullResultsView } from '@/components/results/full-results-view'
import { ResultsHeader } from '@/components/results/results-header'
import { RedFlagPanel } from '@/components/results/red-flag-panel'
import { CategoryAccordion } from '@/components/results/category-accordion'
import type { FullExtraction, RedFlag, CategoryDefinition } from '@/types/extraction'
import { CATEGORIES } from '@/types/extraction'

// Mock react-pdf (must come before any component that imports it)
vi.mock('react-pdf', () => ({
  Document: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Page: () => <div />,
  pdfjs: { version: '4.0.0', GlobalWorkerOptions: { workerSrc: '' } },
}))
vi.mock('react-pdf/dist/Page/AnnotationLayer.css', () => ({}))
vi.mock('react-pdf/dist/Page/TextLayer.css', () => ({}))

// Mock react-resizable-panels (v4: Group, Panel, Separator)
vi.mock('react-resizable-panels', () => ({
  Group: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Panel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Separator: () => <div />,
}))

// Mock useDocumentUrl
vi.mock('@/hooks/use-document-url', () => ({
  useDocumentUrl: () => ({ data: null, isLoading: false, isError: false }),
}))

// Mock motion/react
vi.mock('motion/react', () => ({
  motion: {
    div: ({
      children,
      'data-testid': testId,
      className,
      style,
      ...rest
    }: Record<string, unknown>) => {
      const props: Record<string, unknown> = {}
      if (testId) props['data-testid'] = testId
      if (className) props['className'] = className
      if (style) props['style'] = style
      for (const [key, val] of Object.entries(rest)) {
        if (key.startsWith('data-') || key === 'role') props[key] = val
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
    section: ({
      children,
      'data-testid': testId,
      className,
      ...rest
    }: Record<string, unknown>) => {
      const props: Record<string, unknown> = {}
      if (testId) props['data-testid'] = testId
      if (className) props['className'] = className
      for (const [key, val] of Object.entries(rest)) {
        if (key.startsWith('data-')) props[key] = val
      }
      return <section {...props}>{children as React.ReactNode}</section>
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}))

// Mock lucide-react
vi.mock('lucide-react', () => ({
  FileText: ({ className }: { className?: string }) => (
    <span data-testid="icon-file-text" className={className} />
  ),
  AlertTriangle: ({ className }: { className?: string }) => (
    <span data-testid="icon-alert-triangle" className={className} />
  ),
  AlertCircle: ({ className }: { className?: string }) => (
    <span data-testid="icon-alert-circle" className={className} />
  ),
  ChevronDown: ({ className }: { className?: string }) => (
    <span data-testid="icon-chevron-down" className={className} />
  ),
  ChevronRight: ({ className }: { className?: string }) => (
    <span data-testid="icon-chevron-right" className={className} />
  ),
  CheckCircle2: ({ className }: { className?: string }) => (
    <span data-testid="icon-check-circle" className={className} />
  ),
  Building2: ({ className }: { className?: string }) => (
    <span data-testid="icon-building" className={className} />
  ),
  Calendar: ({ className }: { className?: string }) => (
    <span data-testid="icon-calendar" className={className} />
  ),
  Shield: ({ className }: { className?: string }) => (
    <span data-testid="icon-shield" className={className} />
  ),
  ShieldAlert: ({ className }: { className?: string }) => (
    <span data-testid="icon-shield-alert" className={className} />
  ),
  BadgePercent: ({ className }: { className?: string }) => (
    <span data-testid="icon-badge-percent" className={className} />
  ),
  BookOpen: ({ className }: { className?: string }) => (
    <span data-testid="icon-book-open" className={className} />
  ),
  RefreshCw: ({ className }: { className?: string }) => (
    <span data-testid="icon-refresh" className={className} />
  ),
  File: ({ className }: { className?: string }) => (
    <span data-testid="icon-file" className={className} />
  ),
  FileSpreadsheet: ({ className }: { className?: string }) => (
    <span data-testid="icon-file-spreadsheet" className={className} />
  ),
  Download: ({ className }: { className?: string }) => (
    <span data-testid="icon-download" className={className} />
  ),
  Loader2: ({ className, 'data-testid': testId }: { className?: string; 'data-testid'?: string }) => (
    <span data-testid={testId ?? 'icon-loader'} className={className} />
  ),
  Check: ({ className }: { className?: string }) => (
    <span data-testid="icon-check" className={className} />
  ),
  Pencil: ({ className, 'data-testid': testId }: { className?: string; 'data-testid'?: string }) => (
    <span data-testid={testId ?? 'icon-pencil'} className={className} />
  ),
  RotateCcw: ({ className }: { className?: string }) => (
    <span data-testid="icon-rotate-ccw" className={className} />
  ),
  Search: ({ className }: { className?: string }) => (
    <span data-testid="icon-search" className={className} />
  ),
  ChevronsUpDown: ({ className }: { className?: string }) => (
    <span data-testid="icon-chevrons-up-down" className={className} />
  ),
  CheckCircle: ({ className }: { className?: string }) => (
    <span data-testid="icon-check-circle-filled" className={className} />
  ),
  X: ({ className }: { className?: string }) => (
    <span data-testid="icon-x" className={className} />
  ),
  ExternalLink: ({ className }: { className?: string }) => (
    <span data-testid="icon-external-link" className={className} />
  ),
}))

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

// Mock useEditHistory
vi.mock('@/hooks/use-edit-history', () => ({
  useEditHistory: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
  }),
}))

// Mock useFieldEdit
vi.mock('@/hooks/use-field-edit', () => ({
  useFieldEdit: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
  }),
}))

// Mock api
const MockApiError = vi.hoisted(() => class ApiError extends Error {
  public readonly status: number
  public readonly detail: string
  public readonly requestId?: string
  public trackingId?: string

  constructor(
    status: number,
    detail: string,
    options: { requestId?: string; trackingId?: string } = {},
  ) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
    this.requestId = options.requestId
    this.trackingId = options.trackingId ?? options.requestId
  }
})
vi.mock('@/lib/api', () => ({
  ApiError: MockApiError,
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}))

// Mock useExtraction
const mockUseExtraction = vi.fn()
vi.mock('@/hooks/use-extraction', () => ({
  useExtraction: (...args: unknown[]) => mockUseExtraction(...args),
  extractionKeys: { detail: (id: string) => ['extractions', id] },
}))

const MOCK_EXTRACTION: FullExtraction = {
  id: 'ext-123',
  status: 'complete',
  payment_status: 'paid',
  document_filename: 'office-lease-2026.pdf',
  document_page_count: 42,
  property_type: 'Office',
  extracted_data: {
    landlord_legal_name: { value: 'Realty Holdings LLC', confidence: 0.95 },
    tenant_legal_name: {
      value: 'Acme Corp',
      confidence: 0.92,
      source_text: 'The Tenant shall be Acme Corp...',
    },
    premises_address: { value: '123 Main St, New York, NY 10001', confidence: 0.88 },
    commencement_date: { value: '2026-01-01', confidence: 0.9 },
    expiration_date: { value: '2031-12-31', confidence: 0.9 },
    lease_term_months: { value: 72, confidence: 0.85 },
    base_rent_annual: { value: '$120,000', confidence: 0.88 },
    waiver_of_subrogation: { value: true, confidence: 0.8 },
  },
  confidence_scores: {
    landlord_legal_name: { score: 0.95, tier: 'high' },
    tenant_legal_name: { score: 0.92, tier: 'high' },
    premises_address: { score: 0.88, tier: 'high' },
    commencement_date: { score: 0.9, tier: 'high' },
    expiration_date: { score: 0.9, tier: 'high' },
    lease_term_months: { score: 0.85, tier: 'high' },
    base_rent_annual: { score: 0.88, tier: 'high' },
    waiver_of_subrogation: { score: 0.8, tier: 'medium' },
  },
  red_flags: [
    {
      rule_id: 'RF-003',
      name: 'cam_cap_percentage',
      severity: 'HIGH',
      description: 'No CAM cap found — tenant exposed to unlimited expense increases',
    },
    {
      name: 'audit_rights',
      severity: 'MEDIUM',
      description: 'Audit rights limited to 30 days after statement delivery',
    },
    {
      name: 'snda_provided',
      severity: 'LOW',
      description: 'SNDA not explicitly addressed in lease',
    },
  ],
  show_camaudit: true,
  overall_confidence: 0.88,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:01:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================
// ResultsHeader tests
// ============================================================
describe('ResultsHeader', () => {
  it('renders document filename', () => {
    render(<ResultsHeader extraction={MOCK_EXTRACTION} />)
    expect(screen.getByText('office-lease-2026.pdf')).toBeInTheDocument()
  })

  it('renders property address', () => {
    render(<ResultsHeader extraction={MOCK_EXTRACTION} />)
    expect(
      screen.getByText('123 Main St, New York, NY 10001'),
    ).toBeInTheDocument()
  })

  it('renders landlord name', () => {
    render(<ResultsHeader extraction={MOCK_EXTRACTION} />)
    expect(screen.getByText('Realty Holdings LLC')).toBeInTheDocument()
  })

  it('renders tenant name', () => {
    render(<ResultsHeader extraction={MOCK_EXTRACTION} />)
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
  })

  it('renders overall confidence badge', () => {
    render(<ResultsHeader extraction={MOCK_EXTRACTION} />)
    expect(
      screen.getByTestId('overall-confidence-badge'),
    ).toBeInTheDocument()
    expect(screen.getByText('88%')).toBeInTheDocument()
  })

  it('uses percentage units in the overall confidence status label', () => {
    render(<ResultsHeader extraction={MOCK_EXTRACTION} />)
    expect(
      screen.getByRole('status', { name: 'Overall confidence: 88%' }),
    ).toBeInTheDocument()
  })

  it('renders page count', () => {
    render(<ResultsHeader extraction={MOCK_EXTRACTION} />)
    expect(screen.getByText(/42 pages/)).toBeInTheDocument()
  })

  it('renders property type badge', () => {
    render(<ResultsHeader extraction={MOCK_EXTRACTION} />)
    expect(screen.getByText('Office')).toBeInTheDocument()
  })

  it('renders commencement and expiration dates', () => {
    render(<ResultsHeader extraction={MOCK_EXTRACTION} />)
    expect(screen.getByText(/2026-01-01/)).toBeInTheDocument()
    expect(screen.getByText(/2031-12-31/)).toBeInTheDocument()
  })

  it('handles missing extracted fields gracefully', () => {
    const emptyExtraction: FullExtraction = {
      ...MOCK_EXTRACTION,
      extracted_data: {},
      property_type: null,
      document_page_count: null,
      overall_confidence: null,
    }
    render(<ResultsHeader extraction={emptyExtraction} />)
    expect(screen.getByText('office-lease-2026.pdf')).toBeInTheDocument()
  })
})

// ============================================================
// RedFlagPanel tests
// ============================================================
describe('RedFlagPanel', () => {
  it('renders red flag count', () => {
    render(<RedFlagPanel redFlags={MOCK_EXTRACTION.red_flags} />)
    expect(screen.getByText(/Red Flags Detected/)).toBeInTheDocument()
    // The count "3" is inside the heading
    const heading = screen.getByText(/Red Flags Detected/)
    expect(heading.textContent).toContain('3')
  })

  it('renders visible help for red flags', () => {
    render(<RedFlagPanel redFlags={MOCK_EXTRACTION.red_flags} />)

    expect(
      screen.getByRole('button', { name: /what are red flags/i }),
    ).toBeInTheDocument()
  })

  it('renders individual flag messages', () => {
    render(<RedFlagPanel redFlags={MOCK_EXTRACTION.red_flags} />)
    expect(
      screen.getByText(
        'No CAM cap found — tenant exposed to unlimited expense increases',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Audit rights limited to 30 days after statement delivery',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText('SNDA not explicitly addressed in lease'),
    ).toBeInTheDocument()
  })

  it('renders severity badges for each flag', () => {
    render(<RedFlagPanel redFlags={MOCK_EXTRACTION.red_flags} />)
    expect(screen.getByText('HIGH')).toBeInTheDocument()
    expect(screen.getByText('MEDIUM')).toBeInTheDocument()
    expect(screen.getByText('LOW')).toBeInTheDocument()
  })

  it('renders field names for each flag', () => {
    render(<RedFlagPanel redFlags={MOCK_EXTRACTION.red_flags} />)
    expect(screen.getByText('cam_cap_percentage')).toBeInTheDocument()
    expect(screen.getByText('audit_rights')).toBeInTheDocument()
    expect(screen.getByText('snda_provided')).toBeInTheDocument()
  })

  it('shows "No issues detected" when no flags', () => {
    render(<RedFlagPanel redFlags={[]} />)
    expect(screen.getByText(/No issues detected/)).toBeInTheDocument()
  })

  it('shows success icon when no flags', () => {
    render(<RedFlagPanel redFlags={[]} />)
    expect(screen.getByTestId('icon-check-circle')).toBeInTheDocument()
  })

  it('applies red color class for HIGH severity', () => {
    const flags: RedFlag[] = [
      { name: 'cam_cap_percentage', severity: 'HIGH', description: 'test' },
    ]
    render(<RedFlagPanel redFlags={flags} />)
    const badge = screen.getByText('HIGH')
    expect(badge.className).toMatch(/red/)
  })

  it('applies amber color class for MEDIUM severity', () => {
    const flags: RedFlag[] = [
      { name: 'audit_rights', severity: 'MEDIUM', description: 'test' },
    ]
    render(<RedFlagPanel redFlags={flags} />)
    const badge = screen.getByText('MEDIUM')
    expect(badge.className).toMatch(/amber/)
  })

  it('applies yellow color class for LOW severity', () => {
    const flags: RedFlag[] = [
      { name: 'snda_provided', severity: 'LOW', description: 'test' },
    ]
    render(<RedFlagPanel redFlags={flags} />)
    const badge = screen.getByText('LOW')
    expect(badge.className).toMatch(/yellow/)
  })

  it('falls back to field name when label is not in FIELD_LABELS', () => {
    const flags: RedFlag[] = [
      { name: 'unknown_custom_field', severity: 'HIGH', description: 'test' },
    ]
    render(<RedFlagPanel redFlags={flags} />)
    expect(screen.getByText('unknown_custom_field')).toBeInTheDocument()
  })
})

// ============================================================
// CategoryAccordion tests
// ============================================================
describe('CategoryAccordion', () => {
  const category: CategoryDefinition = {
    name: 'parties_property',
    displayName: 'Parties & Property',
    fields: ['landlord_legal_name', 'tenant_legal_name', 'premises_address'],
  }

  it('renders category display name', () => {
    render(
      <CategoryAccordion
        category={category}
        extractedData={MOCK_EXTRACTION.extracted_data}
        confidenceScores={MOCK_EXTRACTION.confidence_scores}
      />,
    )
    expect(screen.getByText('Parties & Property')).toBeInTheDocument()
  })

  it('renders field count badge', () => {
    render(
      <CategoryAccordion
        category={category}
        extractedData={MOCK_EXTRACTION.extracted_data}
        confidenceScores={MOCK_EXTRACTION.confidence_scores}
      />,
    )
    expect(screen.getByText('3 fields')).toBeInTheDocument()
  })

  it('renders field rows when open', () => {
    render(
      <CategoryAccordion
        category={category}
        extractedData={MOCK_EXTRACTION.extracted_data}
        confidenceScores={MOCK_EXTRACTION.confidence_scores}
        defaultOpen
      />,
    )
    expect(screen.getByText('Landlord Name')).toBeInTheDocument()
    expect(screen.getByText('Tenant Name')).toBeInTheDocument()
    expect(screen.getByText('Premises Address')).toBeInTheDocument()
  })

  it('defaults to closed', () => {
    render(
      <CategoryAccordion
        category={category}
        extractedData={MOCK_EXTRACTION.extracted_data}
        confidenceScores={MOCK_EXTRACTION.confidence_scores}
      />,
    )
    const details = screen.getByTestId('category-accordion-parties_property')
    expect(details).not.toHaveAttribute('open')
  })

  it('defaults to open when defaultOpen is true', () => {
    render(
      <CategoryAccordion
        category={category}
        extractedData={MOCK_EXTRACTION.extracted_data}
        confidenceScores={MOCK_EXTRACTION.confidence_scores}
        defaultOpen
      />,
    )
    const details = screen.getByTestId('category-accordion-parties_property')
    expect(details).toHaveAttribute('open')
  })

  it('shows average confidence for the category', () => {
    render(
      <CategoryAccordion
        category={category}
        extractedData={MOCK_EXTRACTION.extracted_data}
        confidenceScores={MOCK_EXTRACTION.confidence_scores}
        defaultOpen
      />,
    )
    // Average of 0.95, 0.92, 0.88 = 0.9167 -> 92%
    expect(screen.getByTestId('category-avg-confidence')).toBeInTheDocument()
  })

  it('shows amber badge for medium average confidence', () => {
    const mediumScores: Record<string, import('@/types/extraction').ConfidenceScoreEntry> = {
      landlord_legal_name: { score: 0.7, tier: 'medium' },
      tenant_legal_name: { score: 0.65, tier: 'medium' },
      premises_address: { score: 0.72, tier: 'medium' },
    }
    render(
      <CategoryAccordion
        category={category}
        extractedData={MOCK_EXTRACTION.extracted_data}
        confidenceScores={mediumScores}
      />,
    )
    const badge = screen.getByTestId('category-avg-confidence')
    expect(badge.className).toMatch(/amber/)
  })

  it('shows red badge for low average confidence', () => {
    const lowScores: Record<string, import('@/types/extraction').ConfidenceScoreEntry> = {
      landlord_legal_name: { score: 0.3, tier: 'low' },
      tenant_legal_name: { score: 0.4, tier: 'low' },
      premises_address: { score: 0.2, tier: 'low' },
    }
    render(
      <CategoryAccordion
        category={category}
        extractedData={MOCK_EXTRACTION.extracted_data}
        confidenceScores={lowScores}
      />,
    )
    const badge = screen.getByTestId('category-avg-confidence')
    expect(badge.className).toMatch(/red/)
  })

  it('does not show confidence badge when no scores available', () => {
    render(
      <CategoryAccordion
        category={category}
        extractedData={{}}
        confidenceScores={{}}
      />,
    )
    expect(screen.queryByTestId('category-avg-confidence')).not.toBeInTheDocument()
  })
})

// Helper to wrap components that use TanStack Query hooks
function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}

// ============================================================
// FullResultsView tests
// ============================================================
describe('FullResultsView', () => {
  it('renders all canonical category sections when data loaded', () => {
    mockUseExtraction.mockReturnValue({
      data: MOCK_EXTRACTION,
      isLoading: false,
      isError: false,
    })
    renderWithQuery(<FullResultsView extractionId="ext-123" />)
    for (const cat of CATEGORIES) {
      expect(screen.getByText(cat.displayName)).toBeInTheDocument()
    }
  })

  it('renders results header with key identifiers', () => {
    mockUseExtraction.mockReturnValue({
      data: MOCK_EXTRACTION,
      isLoading: false,
      isError: false,
    })
    renderWithQuery(<FullResultsView extractionId="ext-123" />)
    expect(screen.getByText('office-lease-2026.pdf')).toBeInTheDocument()
    expect(screen.getByTestId('results-header')).toBeInTheDocument()
    // Landlord and tenant appear in both header and first accordion
    expect(screen.getAllByText('Realty Holdings LLC').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Acme Corp').length).toBeGreaterThanOrEqual(1)
  })

  it('keeps identity and review controls before risk, export, and CamAudit actions', () => {
    mockUseExtraction.mockReturnValue({
      data: MOCK_EXTRACTION,
      isLoading: false,
      isError: false,
    })
    renderWithQuery(<FullResultsView extractionId="ext-123" />)

    const header = screen.getByTestId('results-header')
    const search = screen.getByRole('textbox', { name: 'Search fields' })
    const redFlags = screen.getByTestId('red-flag-panel')
    const exportPanel = screen.getByTestId('export-panel')
    const firstCategory = screen.getByTestId(
      `category-accordion-${CATEGORIES[0].name}`,
    )
    const camauditBanner = screen.getByTestId('camaudit-banner')

    expect(
      header.compareDocumentPosition(redFlags) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(
      search.compareDocumentPosition(exportPanel) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(
      exportPanel.compareDocumentPosition(firstCategory) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(
      exportPanel.compareDocumentPosition(camauditBanner) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('shows the AI accuracy and liability disclaimer', () => {
    mockUseExtraction.mockReturnValue({
      data: MOCK_EXTRACTION,
      isLoading: false,
      isError: false,
    })
    renderWithQuery(<FullResultsView extractionId="ext-123" />)
    const disclaimer = screen.getByTestId('results-accuracy-disclaimer')
    expect(disclaimer).toHaveTextContent(/AI can make mistakes/i)
    expect(disclaimer).toHaveTextContent(
      /check each field against your lease before you rely on it/i,
    )
    expect(disclaimer).toHaveTextContent(/Lextract is not responsible for errors/i)
    expect(disclaimer).toHaveTextContent(
      /not responsible for choices you make from these results/i,
    )
  })

  it('renders red flag panel with flags', () => {
    mockUseExtraction.mockReturnValue({
      data: MOCK_EXTRACTION,
      isLoading: false,
      isError: false,
    })
    renderWithQuery(<FullResultsView extractionId="ext-123" />)
    expect(screen.getByText(/Red Flags Detected/i)).toBeInTheDocument()
    expect(
      screen.getByText(
        'No CAM cap found — tenant exposed to unlimited expense increases',
      ),
    ).toBeInTheDocument()
  })

  it('shows "No issues detected" when no flags', () => {
    const noFlagsExtraction = { ...MOCK_EXTRACTION, red_flags: [] }
    mockUseExtraction.mockReturnValue({
      data: noFlagsExtraction,
      isLoading: false,
      isError: false,
    })
    renderWithQuery(<FullResultsView extractionId="ext-123" />)
    expect(screen.getByText(/No issues detected/)).toBeInTheDocument()
  })

  it('shows loading skeleton', () => {
    mockUseExtraction.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    })
    renderWithQuery(<FullResultsView extractionId="ext-123" />)
    expect(screen.getByTestId('full-results-skeleton')).toBeInTheDocument()
  })

  it('shows error state with retry button', () => {
    mockUseExtraction.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    })
    renderWithQuery(<FullResultsView extractionId="ext-123" />)
    expect(screen.getByTestId('full-results-error')).toBeInTheDocument()
    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument()
  })

  it('has responsive layout classes', () => {
    mockUseExtraction.mockReturnValue({
      data: MOCK_EXTRACTION,
      isLoading: false,
      isError: false,
    })
    renderWithQuery(<FullResultsView extractionId="ext-123" />)
    const layout = screen.getByTestId('full-results-layout')
    expect(layout.className).toMatch(/lg:grid/)
  })

  it('first category defaults to open', () => {
    mockUseExtraction.mockReturnValue({
      data: MOCK_EXTRACTION,
      isLoading: false,
      isError: false,
    })
    renderWithQuery(<FullResultsView extractionId="ext-123" />)
    const firstAccordion = screen.getByTestId(
      `category-accordion-${CATEGORIES[0].name}`,
    )
    expect(firstAccordion).toHaveAttribute('open')
  })

  it('calls refetch when retry button is clicked', async () => {
    const mockRefetch = vi.fn()
    mockUseExtraction.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    })
    const user = userEvent.setup()
    renderWithQuery(<FullResultsView extractionId="ext-123" />)
    const retryButton = screen.getByRole('button', { name: /retry/i })
    await user.click(retryButton)
    expect(mockRefetch).toHaveBeenCalled()
  })

  it('handles extraction with missing optional fields gracefully', () => {
    // Simulate an extraction where extracted_data, confidence_scores, red_flags are missing/undefined
    const minimalExtraction = {
      ...MOCK_EXTRACTION,
      extracted_data: undefined,
      confidence_scores: undefined,
      red_flags: undefined,
    }
    mockUseExtraction.mockReturnValue({
      data: minimalExtraction,
      isLoading: false,
      isError: false,
    })
    renderWithQuery(<FullResultsView extractionId="ext-123" />)
    // Should render without crashing, showing "No issues detected"
    expect(screen.getByText(/No issues detected/)).toBeInTheDocument()
  })

  it('renders error state when data is null', () => {
    mockUseExtraction.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    })
    renderWithQuery(<FullResultsView extractionId="ext-123" />)
    expect(screen.getByTestId('full-results-error')).toBeInTheDocument()
  })
})
