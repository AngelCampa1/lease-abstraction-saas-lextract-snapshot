import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TeaserView } from '@/components/results/teaser-view'
import { FieldDisplay } from '@/components/results/field-display'
import { ConfidenceChart } from '@/components/results/confidence-chart'
import { BlurredFields } from '@/components/results/blurred-fields'
import { PaymentCta } from '@/components/results/payment-cta'
import { ResultsContent } from '@/components/results/results-content'
import { ApiError } from '@/lib/api'
import type { TeaserResponse, ConfidenceDistribution } from '@/hooks/use-teaser'
import type { AuthUser } from '@/lib/neon-auth/types'

const mockCaptureEvent = vi.hoisted(() => vi.fn())

// Mock react-pdf (transitively imported by full-results-view -> pdf-viewer)
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

// Mock useDocumentUrl (transitively imported by full-results-view)
vi.mock('@/hooks/use-document-url', () => ({
  useDocumentUrl: () => ({ data: null, isLoading: false, isError: false }),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

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
      // Pass through data attributes
      for (const [key, val] of Object.entries(rest)) {
        if (key.startsWith('data-')) props[key] = val
      }
      const animate = rest.animate as Record<string, unknown> | undefined
      if (animate && typeof animate === 'object' && 'width' in animate) {
        props['style'] = { ...((props['style'] as object) ?? {}), width: animate.width }
      }
      return <div {...props}>{children as React.ReactNode}</div>
    },
    span: ({ children, 'data-testid': testId, className }: Record<string, unknown>) => {
      const props: Record<string, unknown> = {}
      if (testId) props['data-testid'] = testId
      if (className) props['className'] = className
      return <span {...props}>{children as React.ReactNode}</span>
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock next/navigation
const mockPush = vi.fn()
const mockReplace = vi.fn()
const mockSearchParamsGet = vi.fn().mockReturnValue(null)
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => ({
    get: mockSearchParamsGet,
  }),
}))

// Mock api (needed for ExportPanel in PaidState)
const mockApiPost = vi.fn()
const mockApiPatch = vi.fn()
const MockApiError = vi.hoisted(
  () =>
    class ApiError extends Error {
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
    },
)
vi.mock('@/lib/api', () => ({
  ApiError: MockApiError,
  apiGet: vi.fn(),
  apiPatch: (...args: unknown[]) => mockApiPatch(...args),
  apiPost: (...args: unknown[]) => mockApiPost(...args),
}))

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('@/lib/posthog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/posthog')>()
  return {
    ...actual,
    captureEvent: mockCaptureEvent,
  }
})

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

// Mock useAuth
const mockUseAuth = vi.fn()
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock hooks
const mockUseTeaser = vi.fn()
vi.mock('@/hooks/use-teaser', () => ({
  useTeaser: (...args: unknown[]) => mockUseTeaser(...args),
  teaserKeys: { detail: (id: string) => ['teaser', id] },
}))

const mockUseExtraction = vi.fn()
vi.mock('@/hooks/use-extraction', () => ({
  useExtraction: (...args: unknown[]) => mockUseExtraction(...args),
  extractionKeys: { detail: (id: string) => ['extractions', id] },
}))

const mockUseCredits = vi.fn()
vi.mock('@/hooks/use-credits', () => ({
  useCredits: () => mockUseCredits(),
  creditsKeys: { all: ['credits'] as const },
}))

const mockUseCreateCheckout = vi.fn()
const mockUseUseCredit = vi.fn()
vi.mock('@/hooks/use-payment', () => ({
  useCreateCheckout: () => mockUseCreateCheckout(),
  useUseCredit: () => mockUseUseCredit(),
}))

// Mock lucide-react icons
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
  Lock: ({ className }: { className?: string }) => (
    <span data-testid="icon-lock" className={className} />
  ),
  Sparkles: ({ className }: { className?: string }) => (
    <span data-testid="icon-sparkles" className={className} />
  ),
  CreditCard: ({ className }: { className?: string }) => (
    <span data-testid="icon-credit-card" className={className} />
  ),
  Coins: ({ className }: { className?: string }) => (
    <span data-testid="icon-coins" className={className} />
  ),
  FileCheck: ({ className }: { className?: string }) => (
    <span data-testid="icon-file-check" className={className} />
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
  RefreshCw: ({ className }: { className?: string }) => (
    <span data-testid="icon-refresh" className={className} />
  ),
  ChevronDown: ({ className }: { className?: string }) => (
    <span data-testid="icon-chevron-down" className={className} />
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
  Loader2: ({
    className,
    'data-testid': testId,
  }: {
    className?: string
    'data-testid'?: string
  }) => <span data-testid={testId ?? 'icon-loader'} className={className} />,
  Check: ({ className }: { className?: string }) => (
    <span data-testid="icon-check" className={className} />
  ),
  Pencil: ({
    className,
    'data-testid': testId,
  }: {
    className?: string
    'data-testid'?: string
  }) => <span data-testid={testId ?? 'icon-pencil'} className={className} />,
  RotateCcw: ({ className }: { className?: string }) => (
    <span data-testid="icon-rotate-ccw" className={className} />
  ),
  Shield: ({ className }: { className?: string }) => (
    <span data-testid="icon-shield" className={className} />
  ),
  BookOpen: ({ className }: { className?: string }) => (
    <span data-testid="icon-book-open" className={className} />
  ),
  Layers: ({ className }: { className?: string }) => (
    <span data-testid="icon-layers" className={className} />
  ),
  Upload: ({ className }: { className?: string }) => (
    <span data-testid="icon-upload" className={className} />
  ),
  Star: ({ className }: { className?: string }) => (
    <span data-testid="icon-star" className={className} />
  ),
  CheckCircle: ({ className }: { className?: string }) => (
    <span data-testid="icon-check-circle-filled" className={className} />
  ),
  ChevronsUpDown: ({ className }: { className?: string }) => (
    <span data-testid="icon-chevrons" className={className} />
  ),
  Search: ({ className }: { className?: string }) => (
    <span data-testid="icon-search" className={className} />
  ),
  XIcon: ({ className }: { className?: string }) => (
    <span data-testid="icon-x" className={className} />
  ),
  Mail: ({ className }: { className?: string }) => (
    <span data-testid="icon-mail" className={className} />
  ),
  ShieldCheck: ({ className }: { className?: string }) => (
    <span data-testid="icon-shield-check" className={className} />
  ),
}))

const MOCK_TEASER: TeaserResponse = {
  id: 'ext-123',
  status: 'complete',
  payment_status: 'unpaid',
  document_filename: 'office-lease-2026.pdf',
  visible_fields: [
    { field_name: 'tenant_name', label: 'Tenant Name', value: 'Acme Corp' },
    { field_name: 'landlord_name', label: 'Landlord Name', value: 'Realty Holdings LLC' },
    { field_name: 'lease_start_date', label: 'Lease Start Date', value: '2026-01-01' },
    { field_name: 'lease_end_date', label: 'Lease End Date', value: '2031-12-31' },
    { field_name: 'base_rent', label: 'Base Rent', value: null },
  ],
  total_field_count: 126,
  category_count: 16,
  confidence_distribution: { high: 90, medium: 25, low: 11 },
  red_flag_count: 3,
}

const MOCK_AUTH_USER: AuthUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
}

const MOCK_AUTH_ACTIONS = {
  signIn: vi.fn().mockResolvedValue({ error: null }),
  signUp: vi.fn().mockResolvedValue({ error: null }),
  signOut: vi.fn().mockResolvedValue({ error: null }),
  signInWithGoogle: vi.fn().mockResolvedValue({ error: null }),
  requestPasswordReset: vi.fn().mockResolvedValue({ error: null }),
  resetPassword: vi.fn().mockResolvedValue({ error: null }),
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mockApiPatch.mockResolvedValue({})
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })))
  mockUseCredits.mockReturnValue({ data: undefined, isLoading: false })
  mockUseExtraction.mockReturnValue({ data: undefined, isLoading: false, isError: false })
  mockUseCreateCheckout.mockReturnValue({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  })
  mockUseUseCredit.mockReturnValue({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  })
  mockSearchParamsGet.mockReturnValue(null)
  // Default: authenticated user
  mockUseAuth.mockReturnValue({
    user: MOCK_AUTH_USER,
    session: { id: 's1', token: 'tok', expiresAt: new Date(), userId: 'user-1' },
    loading: false,
    ...MOCK_AUTH_ACTIONS,
  })
})
// TeaserView tests
// ============================================================

describe('TeaserView', () => {
  it('renders 5 visible fields', () => {
    mockUseTeaser.mockReturnValue({ data: MOCK_TEASER, isLoading: false, isError: false })
    mockUseCredits.mockReturnValue({ data: undefined, isLoading: false })
    render(<TeaserView extractionId="ext-123" />, { wrapper: createWrapper() })
    const fields = screen.getAllByTestId('field-display')
    expect(fields).toHaveLength(5)
  })

  it('renders field labels and values', () => {
    mockUseTeaser.mockReturnValue({ data: MOCK_TEASER, isLoading: false, isError: false })
    mockUseCredits.mockReturnValue({ data: undefined, isLoading: false })
    render(<TeaserView extractionId="ext-123" />, { wrapper: createWrapper() })
    expect(screen.getByText('Tenant Name')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('Landlord Name')).toBeInTheDocument()
    expect(screen.getByText('Realty Holdings LLC')).toBeInTheDocument()
    expect(screen.getByText('Lease Start Date')).toBeInTheDocument()
    expect(screen.getByText('2026-01-01')).toBeInTheDocument()
  })

  it('renders confidence chart', () => {
    mockUseTeaser.mockReturnValue({ data: MOCK_TEASER, isLoading: false, isError: false })
    mockUseCredits.mockReturnValue({ data: undefined, isLoading: false })
    render(<TeaserView extractionId="ext-123" />, { wrapper: createWrapper() })
    expect(screen.getByTestId('confidence-chart')).toBeInTheDocument()
    expect(screen.getByTestId('confidence-bar-high')).toBeInTheDocument()
    expect(screen.getByTestId('confidence-bar-medium')).toBeInTheDocument()
    expect(screen.getByTestId('confidence-bar-low')).toBeInTheDocument()
  })

  it('renders red flag count', () => {
    mockUseTeaser.mockReturnValue({ data: MOCK_TEASER, isLoading: false, isError: false })
    mockUseCredits.mockReturnValue({ data: undefined, isLoading: false })
    render(<TeaserView extractionId="ext-123" />, { wrapper: createWrapper() })
    expect(screen.getByTestId('red-flag-badge')).toBeInTheDocument()
    expect(screen.getByText('3 red flags detected')).toBeInTheDocument()
  })

  it('renders payment CTA with unlock button', () => {
    mockUseTeaser.mockReturnValue({ data: MOCK_TEASER, isLoading: false, isError: false })
    mockUseCredits.mockReturnValue({ data: undefined, isLoading: false })
    render(<TeaserView extractionId="ext-123" />, { wrapper: createWrapper() })
    expect(screen.getByTestId('payment-cta')).toBeInTheDocument()
    expect(screen.getByTestId('unlock-button')).toBeInTheDocument()
    expect(screen.getByText('Unlock for $15')).toBeInTheDocument()
  })

  it('renders blurred fields section', () => {
    mockUseTeaser.mockReturnValue({ data: MOCK_TEASER, isLoading: false, isError: false })
    mockUseCredits.mockReturnValue({ data: undefined, isLoading: false })
    render(<TeaserView extractionId="ext-123" />, { wrapper: createWrapper() })
    expect(screen.getByTestId('blurred-fields-section')).toBeInTheDocument()
    expect(screen.getByTestId('blur-overlay')).toBeInTheDocument()
  })

  it('renders total field count', () => {
    mockUseTeaser.mockReturnValue({ data: MOCK_TEASER, isLoading: false, isError: false })
    mockUseCredits.mockReturnValue({ data: undefined, isLoading: false })
    render(<TeaserView extractionId="ext-123" />, { wrapper: createWrapper() })
    expect(screen.getByTestId('total-field-count')).toBeInTheDocument()
    expect(screen.getByText('126 fields across 16 categories')).toBeInTheDocument()
  })

  it('renders document filename in header', () => {
    mockUseTeaser.mockReturnValue({ data: MOCK_TEASER, isLoading: false, isError: false })
    mockUseCredits.mockReturnValue({ data: undefined, isLoading: false })
    render(<TeaserView extractionId="ext-123" />, { wrapper: createWrapper() })
    expect(screen.getByTestId('document-filename')).toBeInTheDocument()
    expect(screen.getByText('office-lease-2026.pdf')).toBeInTheDocument()
  })

  it('shows skeleton cards during loading', () => {
    mockUseTeaser.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    render(<TeaserView extractionId="ext-123" />, { wrapper: createWrapper() })
    expect(screen.getByTestId('teaser-skeleton')).toBeInTheDocument()
  })

  it('shows error state when teaser fetch fails', () => {
    mockUseTeaser.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    render(<TeaserView extractionId="ext-123" />, { wrapper: createWrapper() })
    expect(screen.getByTestId('teaser-error')).toBeInTheDocument()
  })

  it('renders extraction complete subtitle', () => {
    mockUseTeaser.mockReturnValue({ data: MOCK_TEASER, isLoading: false, isError: false })
    mockUseCredits.mockReturnValue({ data: undefined, isLoading: false })
    render(<TeaserView extractionId="ext-123" />, { wrapper: createWrapper() })
    expect(screen.getByText('Extraction complete. Here is your preview.')).toBeInTheDocument()
  })

  it('renders Key Lease Terms heading', () => {
    mockUseTeaser.mockReturnValue({ data: MOCK_TEASER, isLoading: false, isError: false })
    mockUseCredits.mockReturnValue({ data: undefined, isLoading: false })
    render(<TeaserView extractionId="ext-123" />, { wrapper: createWrapper() })
    expect(screen.getByText('Key Lease Terms')).toBeInTheDocument()
  })

  it('renders singular "red flag" when count is 1', () => {
    const teaserOneFlag = { ...MOCK_TEASER, red_flag_count: 1 }
    mockUseTeaser.mockReturnValue({ data: teaserOneFlag, isLoading: false, isError: false })
    mockUseCredits.mockReturnValue({ data: undefined, isLoading: false })
    render(<TeaserView extractionId="ext-123" />, { wrapper: createWrapper() })
    expect(screen.getByText('1 red flag detected')).toBeInTheDocument()
  })

  it('shows no red flags badge when count is zero', () => {
    const teaserNoFlags = { ...MOCK_TEASER, red_flag_count: 0 }
    mockUseTeaser.mockReturnValue({ data: teaserNoFlags, isLoading: false, isError: false })
    mockUseCredits.mockReturnValue({ data: undefined, isLoading: false })
    render(<TeaserView extractionId="ext-123" />, { wrapper: createWrapper() })
    expect(screen.queryByTestId('red-flag-badge')).not.toBeInTheDocument()
    expect(screen.getByTestId('no-red-flags-badge')).toBeInTheDocument()
    expect(screen.getByText('No red flags detected')).toBeInTheDocument()
  })

  it('shows red flag severity and categories when available', () => {
    const teaserWithDetails = {
      ...MOCK_TEASER,
      red_flag_count: 3,
      red_flag_severity_high: 2,
      red_flag_categories: ['Operating Expenses', 'Renewal Options'],
    }
    mockUseTeaser.mockReturnValue({ data: teaserWithDetails, isLoading: false, isError: false })
    mockUseCredits.mockReturnValue({ data: undefined, isLoading: false })
    render(<TeaserView extractionId="ext-123" />, { wrapper: createWrapper() })
    expect(screen.getByTestId('red-flag-severity')).toHaveTextContent('2 HIGH severity')
    expect(screen.getByTestId('red-flag-categories')).toHaveTextContent(
      'Including issues in Operating Expenses and Renewal Options',
    )
  })

  it('shows the AI accuracy and liability disclaimer', () => {
    mockUseTeaser.mockReturnValue({ data: MOCK_TEASER, isLoading: false, isError: false })
    mockUseCredits.mockReturnValue({ data: undefined, isLoading: false })
    render(<TeaserView extractionId="ext-123" />, { wrapper: createWrapper() })
    const disclaimer = screen.getByTestId('teaser-accuracy-disclaimer')
    expect(disclaimer).toHaveTextContent(/AI can make mistakes/i)
    expect(disclaimer).toHaveTextContent(
      /check each field against your lease before you rely on it/i,
    )
    expect(disclaimer).toHaveTextContent(/Lextract is not responsible for errors/i)
    expect(disclaimer).toHaveTextContent(
      /not responsible for choices you make from these results/i,
    )
  })

  it('passes locked_categories from teaser response through to BlurredFields', () => {
    const teaserWithLockedCategories = {
      ...MOCK_TEASER,
      locked_categories: [
        { name: 'CAM & Operating Expenses', field_count: 12 },
        { name: 'Renewal Options', field_count: 6 },
      ],
    }
    mockUseTeaser.mockReturnValue({
      data: teaserWithLockedCategories,
      isLoading: false,
      isError: false,
    })
    mockUseCredits.mockReturnValue({ data: undefined, isLoading: false })
    render(<TeaserView extractionId="test-id" />, { wrapper: createWrapper() })
    expect(screen.getByText('CAM & Operating Expenses')).toBeInTheDocument()
  })
})

// ============================================================
// FieldDisplay tests
// ============================================================

describe('FieldDisplay', () => {
  it('renders label and value', () => {
    render(
      <FieldDisplay field_name="tenant_name" label="Tenant Name" value="Acme Corp" index={0} />,
    )
    expect(screen.getByTestId('field-label')).toHaveTextContent('Tenant Name')
    expect(screen.getByTestId('field-value')).toHaveTextContent('Acme Corp')
  })

  it('renders "Not found" for null value', () => {
    render(<FieldDisplay field_name="base_rent" label="Base Rent" value={null} index={0} />)
    expect(screen.getByTestId('field-label')).toHaveTextContent('Base Rent')
    expect(screen.getByTestId('field-not-found')).toHaveTextContent('Not found')
    expect(screen.queryByTestId('field-value')).not.toBeInTheDocument()
  })

  it('renders with data-testid field-display', () => {
    render(<FieldDisplay field_name="test" label="Test" value="val" index={0} />)
    expect(screen.getByTestId('field-display')).toBeInTheDocument()
  })
})

// ============================================================
// ConfidenceChart tests
// ============================================================

describe('ConfidenceChart', () => {
  it('renders all three confidence bars', () => {
    const distribution: ConfidenceDistribution = { high: 70, medium: 20, low: 9 }
    render(<ConfidenceChart distribution={distribution} />)
    expect(screen.getByTestId('confidence-bar-high')).toBeInTheDocument()
    expect(screen.getByTestId('confidence-bar-medium')).toBeInTheDocument()
    expect(screen.getByTestId('confidence-bar-low')).toBeInTheDocument()
  })

  it('renders field counts', () => {
    const distribution: ConfidenceDistribution = { high: 70, medium: 20, low: 9 }
    render(<ConfidenceChart distribution={distribution} />)
    expect(screen.getByText('70 fields')).toBeInTheDocument()
    expect(screen.getByText('20 fields')).toBeInTheDocument()
    expect(screen.getByText('9 fields')).toBeInTheDocument()
  })

  it('renders singular "field" for count of 1', () => {
    const distribution: ConfidenceDistribution = { high: 1, medium: 0, low: 0 }
    render(<ConfidenceChart distribution={distribution} />)
    expect(screen.getByText('1 field')).toBeInTheDocument()
    const zeroFields = screen.getAllByText('0 fields')
    expect(zeroFields).toHaveLength(2)
  })

  it('renders heading', () => {
    const distribution: ConfidenceDistribution = { high: 50, medium: 30, low: 10 }
    render(<ConfidenceChart distribution={distribution} />)
    expect(screen.getByText('Confidence Distribution')).toBeInTheDocument()
  })

  it('handles zero total gracefully', () => {
    const distribution: ConfidenceDistribution = { high: 0, medium: 0, low: 0 }
    render(<ConfidenceChart distribution={distribution} />)
    expect(screen.getByTestId('confidence-chart')).toBeInTheDocument()
  })

  it('renders not-in-lease bar when not_found > 0', () => {
    const distribution: ConfidenceDistribution = { high: 15, medium: 10, low: 2, not_found: 80 }
    render(<ConfidenceChart distribution={distribution} />)
    expect(screen.getByTestId('confidence-bar-not-found')).toBeInTheDocument()
    expect(screen.getByText('80 fields')).toBeInTheDocument()
  })

  it('hides not-in-lease bar when not_found is 0', () => {
    const distribution: ConfidenceDistribution = { high: 15, medium: 10, low: 2, not_found: 0 }
    render(<ConfidenceChart distribution={distribution} />)
    expect(screen.queryByTestId('confidence-bar-not-found')).not.toBeInTheDocument()
  })

  it('hides not-in-lease bar when not_found is absent', () => {
    const distribution: ConfidenceDistribution = { high: 15, medium: 10, low: 2 }
    render(<ConfidenceChart distribution={distribution} />)
    expect(screen.queryByTestId('confidence-bar-not-found')).not.toBeInTheDocument()
  })
})

// ============================================================
// BlurredFields tests
// ============================================================

describe('BlurredFields', () => {
  it('renders blurred field cards', () => {
    render(<BlurredFields totalFields={126} visibleCount={5} />)
    const cards = screen.getAllByTestId('blurred-field-card')
    expect(cards.length).toBeGreaterThan(0)
  })

  it('does not render fake lease values without locked category data', () => {
    render(<BlurredFields totalFields={126} visibleCount={5} />)
    expect(screen.queryByText('Lease term value here')).not.toBeInTheDocument()
    expect(screen.getAllByText('Locked field preview')).not.toHaveLength(0)
  })

  it('renders overlay with lock icon', () => {
    render(<BlurredFields totalFields={126} visibleCount={5} />)
    expect(screen.getByTestId('blur-overlay')).toBeInTheDocument()
    expect(screen.getByTestId('icon-lock')).toBeInTheDocument()
  })

  it('shows remaining field count in overlay', () => {
    render(<BlurredFields totalFields={126} visibleCount={5} />)
    expect(screen.getByText('Unlock all 121 remaining fields')).toBeInTheDocument()
  })

  it('shows overlay description text', () => {
    render(<BlurredFields totalFields={126} visibleCount={5} />)
    expect(
      screen.getByText('Includes confidence scores, red flag analysis, and full export'),
    ).toBeInTheDocument()
  })

  it('renders with real category data when provided', () => {
    const categories = [
      { name: 'Operating Expenses', fieldCount: 7 },
      { name: 'Insurance', fieldCount: 3 },
    ]
    render(<BlurredFields totalFields={126} visibleCount={5} categories={categories} />)
    expect(screen.getByText('Operating Expenses')).toBeInTheDocument()
    expect(screen.getByText('Insurance')).toBeInTheDocument()
  })
})

// ============================================================
// PaymentCta tests
// ============================================================

describe('PaymentCta', () => {
  it('renders unlock button', () => {
    mockUseCredits.mockReturnValue({ data: undefined, isLoading: false })
    render(<PaymentCta extractionId="ext-123" totalFieldCount={99} redFlagCount={3} />, {
      wrapper: createWrapper(),
    })
    expect(screen.getByTestId('unlock-button')).toBeInTheDocument()
    expect(screen.getByText('Unlock for $15')).toBeInTheDocument()
  })

  it('renders beginner help for payment unlock details', () => {
    mockUseCredits.mockReturnValue({ data: undefined, isLoading: false })
    render(<PaymentCta extractionId="ext-123" totalFieldCount={99} redFlagCount={3} />, {
      wrapper: createWrapper(),
    })

    expect(screen.getByRole('button', { name: /what unlocks after payment/i })).toBeInTheDocument()
  })

  it('renders value comparison text', () => {
    mockUseCredits.mockReturnValue({ data: undefined, isLoading: false })
    render(<PaymentCta extractionId="ext-123" totalFieldCount={99} redFlagCount={3} />, {
      wrapper: createWrapper(),
    })
    expect(screen.getByTestId('value-comparison')).toBeInTheDocument()
    expect(screen.getByTestId('support-policy')).toBeInTheDocument()
  })

  it('renders heading and description', () => {
    mockUseCredits.mockReturnValue({ data: undefined, isLoading: false })
    render(<PaymentCta extractionId="ext-123" totalFieldCount={126} redFlagCount={3} />, {
      wrapper: createWrapper(),
    })
    expect(screen.getByText('See Your Full Lease Report')).toBeInTheDocument()
    expect(screen.getByText(/Get all 126 extracted fields/)).toBeInTheDocument()
    expect(screen.getByText(/3 flagged issues/)).toBeInTheDocument()
  })

  it('shows credit option when user has credits', () => {
    mockUseCredits.mockReturnValue({ data: { balance: 5 }, isLoading: false })
    render(<PaymentCta extractionId="ext-123" totalFieldCount={99} redFlagCount={3} />, {
      wrapper: createWrapper(),
    })
    expect(screen.getByTestId('credit-button')).toBeInTheDocument()
    expect(screen.getByText('Use 1 credit (5 remaining)')).toBeInTheDocument()
  })

  it('does not show credit option when user has no credits', () => {
    mockUseCredits.mockReturnValue({ data: undefined, isLoading: false })
    render(<PaymentCta extractionId="ext-123" totalFieldCount={99} redFlagCount={3} />, {
      wrapper: createWrapper(),
    })
    expect(screen.queryByTestId('credit-button')).not.toBeInTheDocument()
  })

  it('does not show credit option when balance is zero', () => {
    mockUseCredits.mockReturnValue({ data: { balance: 0 }, isLoading: false })
    render(<PaymentCta extractionId="ext-123" totalFieldCount={99} redFlagCount={3} />, {
      wrapper: createWrapper(),
    })
    expect(screen.queryByTestId('credit-button')).not.toBeInTheDocument()
  })

  it('uses singular issue for single red flag', () => {
    mockUseCredits.mockReturnValue({ data: undefined, isLoading: false })
    render(<PaymentCta extractionId="ext-123" totalFieldCount={99} redFlagCount={1} />, {
      wrapper: createWrapper(),
    })
    expect(screen.getByText(/1 flagged issue\./)).toBeInTheDocument()
  })

  it('shows an insufficient-credits message on a 402 error', () => {
    mockUseCredits.mockReturnValue({ data: { balance: 1 }, isLoading: false })
    mockUseUseCredit.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: true,
      error: new ApiError(402, 'Insufficient credits'),
    })
    render(<PaymentCta extractionId="ext-123" totalFieldCount={99} redFlagCount={3} />, {
      wrapper: createWrapper(),
    })
    expect(screen.getByText(/don't have enough credits/i)).toBeInTheDocument()
    expect(screen.queryByText('Payment failed. Please try again.')).not.toBeInTheDocument()
  })

  it('shows a conflict message on a 409 error', () => {
    mockUseCredits.mockReturnValue({ data: { balance: 1 }, isLoading: false })
    mockUseUseCredit.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: true,
      error: new ApiError(409, 'Concurrent modification'),
    })
    render(<PaymentCta extractionId="ext-123" totalFieldCount={99} redFlagCount={3} />, {
      wrapper: createWrapper(),
    })
    expect(screen.getByText(/just updated/i)).toBeInTheDocument()
  })

  it('falls back to a generic message for other credit ApiError statuses', () => {
    mockUseCredits.mockReturnValue({ data: { balance: 1 }, isLoading: false })
    mockUseUseCredit.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: true,
      error: new ApiError(500, 'Server exploded'),
    })
    render(<PaymentCta extractionId="ext-123" totalFieldCount={99} redFlagCount={3} />, {
      wrapper: createWrapper(),
    })
    expect(screen.getByText('Payment failed. Please try again.')).toBeInTheDocument()
  })

  it('falls back to a generic message for non-ApiError credit failures', () => {
    mockUseCredits.mockReturnValue({ data: { balance: 1 }, isLoading: false })
    mockUseUseCredit.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: true,
      error: new Error('boom'),
    })
    render(<PaymentCta extractionId="ext-123" totalFieldCount={99} redFlagCount={3} />, {
      wrapper: createWrapper(),
    })
    expect(screen.getByText('Payment failed. Please try again.')).toBeInTheDocument()
  })

  it('shows the generic message when only the checkout mutation errors', () => {
    mockUseCredits.mockReturnValue({ data: undefined, isLoading: false })
    mockUseCreateCheckout.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: true,
      error: new ApiError(502, 'Payment provider error'),
    })
    render(<PaymentCta extractionId="ext-123" totalFieldCount={99} redFlagCount={3} />, {
      wrapper: createWrapper(),
    })
    expect(screen.getByText('Payment failed. Please try again.')).toBeInTheDocument()
  })

  it('starts a checkout with success and cancel URLs when unlock is clicked', () => {
    const mutate = vi.fn()
    mockUseCredits.mockReturnValue({ data: undefined, isLoading: false })
    mockUseCreateCheckout.mockReturnValue({
      mutate,
      reset: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    })
    render(<PaymentCta extractionId="ext-123" totalFieldCount={99} redFlagCount={3} />, {
      wrapper: createWrapper(),
    })
    fireEvent.click(screen.getByTestId('unlock-button'))
    expect(mutate).toHaveBeenCalledTimes(1)
    const payload = mutate.mock.calls[0][0]
    expect(payload.product_type).toBe('single')
    expect(payload.extraction_id).toBe('ext-123')
    expect(payload.success_url).toContain('/results/ext-123?payment=success')
    expect(payload.cancel_url).toContain('/results/ext-123?payment=cancelled')
  })

  it('clears any stale credit error when starting a checkout', () => {
    // A prior credit failure must not mislabel a later checkout failure.
    // handleUnlock resets the credit mutation so the error region only ever
    // reflects the current action.
    const reset = vi.fn()
    const mutate = vi.fn()
    mockUseCredits.mockReturnValue({ data: { balance: 1 }, isLoading: false })
    mockUseCreateCheckout.mockReturnValue({
      mutate,
      reset: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    })
    mockUseUseCredit.mockReturnValue({
      mutate: vi.fn(),
      reset,
      isPending: false,
      isError: true,
      error: new ApiError(402, 'Insufficient credits'),
    })
    render(<PaymentCta extractionId="ext-123" totalFieldCount={99} redFlagCount={3} />, {
      wrapper: createWrapper(),
    })
    fireEvent.click(screen.getByTestId('unlock-button'))
    expect(reset).toHaveBeenCalledTimes(1)
    expect(mutate).toHaveBeenCalledTimes(1)
  })

  it('spends a credit when the credit button is clicked', () => {
    const mutate = vi.fn()
    mockUseCredits.mockReturnValue({ data: { balance: 2 }, isLoading: false })
    mockUseUseCredit.mockReturnValue({
      mutate,
      reset: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    })
    render(<PaymentCta extractionId="ext-123" totalFieldCount={99} redFlagCount={3} />, {
      wrapper: createWrapper(),
    })
    fireEvent.click(screen.getByTestId('credit-button'))
    expect(mutate).toHaveBeenCalledWith({ extraction_id: 'ext-123' })
  })

  it('clears any stale checkout error when spending a credit', () => {
    const reset = vi.fn()
    const mutate = vi.fn()
    mockUseCredits.mockReturnValue({ data: { balance: 2 }, isLoading: false })
    mockUseCreateCheckout.mockReturnValue({
      mutate: vi.fn(),
      reset,
      isPending: false,
      isError: true,
      error: new ApiError(502, 'Payment provider error'),
    })
    mockUseUseCredit.mockReturnValue({
      mutate,
      reset: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    })
    render(<PaymentCta extractionId="ext-123" totalFieldCount={99} redFlagCount={3} />, {
      wrapper: createWrapper(),
    })
    fireEvent.click(screen.getByTestId('credit-button'))
    expect(reset).toHaveBeenCalledTimes(1)
    expect(mutate).toHaveBeenCalledWith({ extraction_id: 'ext-123' })
  })

  it('shows the generic checkout message even if a stale credit error is also present', () => {
    // Defensive: the error region must read off the credit mutation only when
    // the credit mutation is the one in error. With the reset in place these
    // are mutually exclusive at runtime, but the render logic must not surface
    // a credit message for a checkout-only failure.
    const reset = vi.fn()
    mockUseCredits.mockReturnValue({ data: { balance: 1 }, isLoading: false })
    mockUseCreateCheckout.mockReturnValue({
      mutate: vi.fn(),
      reset: vi.fn(),
      isPending: false,
      isError: true,
      error: new ApiError(502, 'Payment provider error'),
    })
    mockUseUseCredit.mockReturnValue({
      mutate: vi.fn(),
      reset,
      isPending: false,
      isError: false,
      error: null,
    })
    render(<PaymentCta extractionId="ext-123" totalFieldCount={99} redFlagCount={3} />, {
      wrapper: createWrapper(),
    })
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Payment failed. Please try again.')
    expect(screen.queryByText(/don't have enough credits/i)).not.toBeInTheDocument()
  })

  it('shows progress labels and disables buttons while pending', () => {
    mockUseCredits.mockReturnValue({ data: { balance: 2 }, isLoading: false })
    mockUseCreateCheckout.mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      isError: false,
      error: null,
    })
    mockUseUseCredit.mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      isError: false,
      error: null,
    })
    render(<PaymentCta extractionId="ext-123" totalFieldCount={99} redFlagCount={3} />, {
      wrapper: createWrapper(),
    })
    expect(screen.getByText('Redirecting...')).toBeInTheDocument()
    expect(screen.getByText('Processing...')).toBeInTheDocument()
    expect(screen.getByTestId('unlock-button')).toBeDisabled()
    expect(screen.getByTestId('credit-button')).toBeDisabled()
  })

  it('fires the paywall_viewed event only once across re-renders', () => {
    mockUseCredits.mockReturnValue({ data: undefined, isLoading: false })
    const { rerender } = render(
      <PaymentCta extractionId="ext-123" totalFieldCount={99} redFlagCount={3} />,
      { wrapper: createWrapper() },
    )
    rerender(<PaymentCta extractionId="ext-123" totalFieldCount={99} redFlagCount={3} />)
    const paywallCalls = mockCaptureEvent.mock.calls.filter(
      (call) => call[0] === 'paywall_viewed',
    )
    expect(paywallCalls).toHaveLength(1)
  })
})

// ============================================================
// ResultsContent tests (routing logic)
// ============================================================

// Helper to build a minimal TeaserResponse for ResultsContent tests
function mockTeaser(overrides: Partial<TeaserResponse> = {}): TeaserResponse {
  return {
    id: 'ext-123',
    status: 'complete',
    payment_status: 'unpaid',
    document_filename: 'test.pdf',
    visible_fields: [],
    total_field_count: 126,
    category_count: 16,
    confidence_distribution: { high: 90, medium: 25, low: 11 },
    red_flag_count: 0,
    ...overrides,
  }
}

describe('ResultsContent', () => {
  it('shows skeleton during loading', () => {
    mockUseTeaser.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    render(<ResultsContent id="ext-123" />, { wrapper: createWrapper() })
    expect(screen.getByTestId('results-skeleton')).toBeInTheDocument()
  })

  it('shows error state when extraction not found', () => {
    mockUseTeaser.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError(404, 'Not found', { requestId: 'req-results-404' }),
    })
    render(<ResultsContent id="ext-123" />, { wrapper: createWrapper() })
    expect(screen.getByTestId('results-error')).toBeInTheDocument()
    expect(screen.getByText(/extraction not found/i)).toBeInTheDocument()
    expect(screen.getByText(/deleted, expired, or belongs to another account/i)).toBeInTheDocument()
    expect(screen.getByText(/tracking id: req-results-404/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Upload a document' })).toHaveAttribute(
      'href',
      '/upload',
    )
  })

  it('redirects to processing page when status is processing', () => {
    mockUseTeaser.mockReturnValue({
      data: mockTeaser({ status: 'extracting' }),
      isLoading: false,
      isError: false,
    })
    render(<ResultsContent id="ext-123" />, { wrapper: createWrapper() })
    expect(mockPush).toHaveBeenCalledWith('/processing/ext-123')
  })

  it('redirects for uploading status', () => {
    mockUseTeaser.mockReturnValue({
      data: mockTeaser({ status: 'uploading' }),
      isLoading: false,
      isError: false,
    })
    render(<ResultsContent id="ext-123" />, { wrapper: createWrapper() })
    expect(mockPush).toHaveBeenCalledWith('/processing/ext-123')
  })

  it('redirects for scoring status', () => {
    mockUseTeaser.mockReturnValue({
      data: mockTeaser({ status: 'scoring' }),
      isLoading: false,
      isError: false,
    })
    render(<ResultsContent id="ext-123" />, { wrapper: createWrapper() })
    expect(mockPush).toHaveBeenCalledWith('/processing/ext-123')
  })

  it('shows failed state for failed extraction', () => {
    mockUseTeaser.mockReturnValue({
      data: mockTeaser({ status: 'failed', error_message: 'Extraction failed' }),
      isLoading: false,
      isError: false,
    })
    render(<ResultsContent id="ext-123" />, { wrapper: createWrapper() })
    expect(screen.getByTestId('results-failed')).toBeInTheDocument()
    expect(screen.getByText('Extraction failed')).toBeInTheDocument()
    expect(screen.queryAllByText('Extraction failed')).toHaveLength(1)
  })

  it('shows failed state without extra message when no error_message provided', () => {
    mockUseTeaser.mockReturnValue({
      data: mockTeaser({ status: 'failed' }),
      isLoading: false,
      isError: false,
    })
    render(<ResultsContent id="ext-123" />, { wrapper: createWrapper() })
    expect(screen.getByTestId('results-failed')).toBeInTheDocument()
    expect(screen.getByText('Extraction failed')).toBeInTheDocument()
  })

  it('does not expose raw internal error messages for failed extractions', () => {
    mockUseTeaser.mockReturnValue({
      data: mockTeaser({
        status: 'failed',
        error_message: "Invalid status transition from 'extracting' to 'extracting'",
      }),
      isLoading: false,
      isError: false,
    })
    render(<ResultsContent id="ext-123" />, { wrapper: createWrapper() })
    expect(screen.getByTestId('results-failed')).toBeInTheDocument()
    expect(screen.queryByText(/invalid status transition/i)).not.toBeInTheDocument()
    expect(screen.getByText(/couldn't read this document clearly/i)).toBeInTheDocument()
  })

  it('shows paid state for paid extraction', () => {
    mockUseTeaser.mockReturnValue({
      data: mockTeaser({ payment_status: 'paid' }),
      isLoading: false,
      isError: false,
    })
    render(<ResultsContent id="ext-123" />, { wrapper: createWrapper() })
    expect(screen.getByTestId('results-paid')).toBeInTheDocument()
  })

  it('renders teaser view for unpaid complete extraction', () => {
    mockUseTeaser.mockReturnValue({ data: MOCK_TEASER, isLoading: false, isError: false })
    mockUseCredits.mockReturnValue({ data: undefined, isLoading: false })
    render(<ResultsContent id="ext-123" />, { wrapper: createWrapper() })
    expect(screen.getByTestId('teaser-view')).toBeInTheDocument()
  })

  it('does not show the anonymous email gate on sample results', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      ...MOCK_AUTH_ACTIONS,
    })
    mockUseTeaser.mockReturnValue({
      data: mockTeaser({ id: 'sample', document_filename: 'Sample Office Lease.pdf' }),
      isLoading: false,
      isError: false,
    })

    render(<ResultsContent id="sample" />, { wrapper: createWrapper() })

    expect(screen.getByTestId('teaser-view')).toBeInTheDocument()
    expect(screen.queryByText('Your extraction is ready!')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Work email')).not.toBeInTheDocument()
  })

  it('shows the anonymous email gate on real unpaid complete results', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      ...MOCK_AUTH_ACTIONS,
    })
    mockUseTeaser.mockReturnValue({
      data: mockTeaser({ id: 'ext-123', document_filename: 'Office Lease.pdf' }),
      isLoading: false,
      isError: false,
    })

    render(<ResultsContent id="ext-123" />, { wrapper: createWrapper() })

    expect(screen.getByTestId('teaser-view')).toBeInTheDocument()
    expect(screen.getByText('Your extraction is ready!')).toBeInTheDocument()
    expect(screen.getByLabelText('Work email')).toBeInTheDocument()
  })

  it('stores anonymous email gate submissions and closes the dialog', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      ...MOCK_AUTH_ACTIONS,
    })
    mockUseTeaser.mockReturnValue({
      data: mockTeaser({ id: 'ext-123', document_filename: 'Office Lease.pdf' }),
      isLoading: false,
      isError: false,
    })

    render(<ResultsContent id="ext-123" />, { wrapper: createWrapper() })
    fireEvent.change(screen.getByLabelText('Work email'), {
      target: { value: 'tenant@example.com' },
    })
    await waitFor(() => expect(screen.getByRole('button', { name: 'View My Results' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'View My Results' }))

    await waitFor(() => {
      expect(mockApiPatch).toHaveBeenCalledWith('/auth/anonymous/email', {
        email: 'tenant@example.com',
      })
    })
    expect(localStorage.getItem('lextract_session_email')).toBe('tenant@example.com')
    expect(screen.queryByText('Your extraction is ready!')).not.toBeInTheDocument()
  })

  it('still opens results when anonymous email persistence fails', async () => {
    mockApiPatch.mockRejectedValueOnce(new Error('anonymous session unavailable'))
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('lead capture unavailable')))
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      ...MOCK_AUTH_ACTIONS,
    })
    mockUseTeaser.mockReturnValue({
      data: mockTeaser({ id: 'ext-123', document_filename: 'Office Lease.pdf' }),
      isLoading: false,
      isError: false,
    })

    render(<ResultsContent id="ext-123" />, { wrapper: createWrapper() })
    fireEvent.change(screen.getByLabelText('Work email'), {
      target: { value: 'tenant@example.com' },
    })
    await waitFor(() => expect(screen.getByRole('button', { name: 'View My Results' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'View My Results' }))

    await waitFor(() => {
      expect(localStorage.getItem('lextract_session_email')).toBe('tenant@example.com')
    })
    expect(screen.queryByText('Your extraction is ready!')).not.toBeInTheDocument()
  })

  it('shows error state when teaser is null and no error', () => {
    mockUseTeaser.mockReturnValue({ data: null, isLoading: false, isError: false })
    render(<ResultsContent id="ext-123" />, { wrapper: createWrapper() })
    expect(screen.getByTestId('results-error')).toBeInTheDocument()
  })

  it('redirects unauthenticated user to login for paid extraction', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      ...MOCK_AUTH_ACTIONS,
    })
    mockUseTeaser.mockReturnValue({
      data: mockTeaser({ payment_status: 'paid' }),
      isLoading: false,
      isError: false,
    })
    render(<ResultsContent id="ext-123" />, { wrapper: createWrapper() })
    expect(mockPush).toHaveBeenCalledWith('/login?return=%2Fresults%2Fext-123')
  })

  it('handles guest payment return before redirecting paid anonymous results', async () => {
    const { toast } = await import('sonner')
    mockSearchParamsGet.mockImplementation((key: string) => {
      if (key === 'payment') return 'success'
      if (key === 'access') return 'complete-account'
      return null
    })
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      ...MOCK_AUTH_ACTIONS,
    })
    mockUseTeaser.mockReturnValue({
      data: mockTeaser({ payment_status: 'paid' }),
      isLoading: false,
      isError: false,
    })

    render(<ResultsContent id="ext-123" />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith(
        'Payment successful. Complete account access or sign in to view your full results.',
      )
    })
    expect(mockReplace).toHaveBeenCalledWith('/results/ext-123', { scroll: false })
    expect(mockPush).toHaveBeenCalledWith('/login?return=%2Fresults%2Fext-123')
  })

  it('tracks cancelled payment return once', () => {
    mockSearchParamsGet.mockImplementation((key: string) => (key === 'payment' ? 'cancelled' : null))
    mockUseTeaser.mockReturnValue({
      data: mockTeaser(),
      isLoading: false,
      isError: false,
    })

    render(<ResultsContent id="ext-123" />, { wrapper: createWrapper() })

    expect(mockCaptureEvent).toHaveBeenCalledWith('payment_cancelled', {
      extraction_id: 'ext-123',
    })
  })
})

// ============================================================
// TeaserView auth-aware CTA tests
// ============================================================

describe('TeaserView auth-aware CTA', () => {
  it('shows PaymentCta for authenticated users', () => {
    mockUseTeaser.mockReturnValue({ data: MOCK_TEASER, isLoading: false, isError: false })
    mockUseCredits.mockReturnValue({ data: undefined, isLoading: false })
    render(<TeaserView extractionId="ext-123" />, { wrapper: createWrapper() })
    expect(screen.getByTestId('payment-cta')).toBeInTheDocument()
    expect(screen.queryByTestId('guest-checkout-cta')).not.toBeInTheDocument()
  })

  it('shows GuestCheckoutCta for anonymous users', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      ...MOCK_AUTH_ACTIONS,
    })
    mockUseTeaser.mockReturnValue({ data: MOCK_TEASER, isLoading: false, isError: false })
    render(<TeaserView extractionId="ext-123" />, { wrapper: createWrapper() })
    expect(screen.getByTestId('guest-checkout-cta')).toBeInTheDocument()
    expect(screen.queryByTestId('payment-cta')).not.toBeInTheDocument()
  })

  it('shows field count annotation in Key Lease Terms heading', () => {
    mockUseTeaser.mockReturnValue({ data: MOCK_TEASER, isLoading: false, isError: false })
    mockUseCredits.mockReturnValue({ data: undefined, isLoading: false })
    render(<TeaserView extractionId="ext-123" />, { wrapper: createWrapper() })
    expect(screen.getByText('5 of 126 fields shown')).toBeInTheDocument()
  })
})

// ============================================================
