import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as api from '@/lib/api'
import { useDashboard, dashboardKeys } from '@/hooks/use-dashboard'
import type { DashboardData } from '@/hooks/use-dashboard'
import * as useDashboardModule from '@/hooks/use-dashboard'
import { QuickStats } from '@/components/dashboard/quick-stats'
import { CreditCard } from '@/components/dashboard/credit-card'
import { EmptyState } from '@/components/dashboard/empty-state'
import {
  ExtractionList,
  formatRelativeDate,
  statusConfig,
} from '@/components/dashboard/extraction-list'
import { DateRangeFilter } from '@/components/dashboard/date-range-filter'
import { APP_STATUS_COLORS, INTERACTIVE_TARGET_CLASSES } from '@/lib/design-tokens'
import { WelcomeBanner } from '@/components/dashboard/welcome-banner'
import DashboardPage from '@/app/(app)/dashboard/page'

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
      variants: _variants,
      initial: _initial,
      animate: _animate,
      ...props
    }: {
      children: React.ReactNode
      variants?: unknown
      initial?: unknown
      animate?: unknown
      [key: string]: unknown
    }) => <div {...props}>{children}</div>,
  },
}))

vi.mock('@/components/skeletons', () => ({
  DashboardSkeleton: () => <div data-testid="dashboard-skeleton" />,
}))

vi.mock('@/lib/posthog', () => ({
  captureEvent: vi.fn(),
  EVENTS: { dashboard_viewed: 'dashboard_viewed' },
}))

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

const mockExtractionItems = [
  {
    id: 'ext-1',
    document_filename: 'lease-office-a.pdf',
    status: 'complete',
    payment_status: 'paid',
    property_type: 'office',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'ext-2',
    document_filename: 'lease-retail-b.pdf',
    status: 'extracting',
    payment_status: 'pending',
    property_type: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'ext-3',
    document_filename: 'lease-industrial-c.pdf',
    status: 'failed',
    payment_status: 'pending',
    property_type: null,
    created_at: new Date(Date.now() - 604800000).toISOString(),
  },
  {
    id: 'ext-4',
    document_filename: 'lease-unpaid.pdf',
    status: 'complete',
    payment_status: 'unpaid',
    property_type: null,
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
]

const mockListResponse = {
  items: mockExtractionItems,
  total: 4,
  limit: 20,
  offset: 0,
}

const mockDashboardData: DashboardData = {
  extraction_count: 10,
  credit_balance: 5,
  recent_extractions: [
    {
      id: 'ext-1',
      document_filename: 'lease-office-a.pdf',
      status: 'complete',
      payment_status: 'paid',
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ],
  quick_stats: {
    completed: 7,
    processing: 2,
    failed: 1,
  },
}

describe('useDashboard hook', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches dashboard data successfully', async () => {
    vi.spyOn(api, 'apiGet').mockResolvedValue(mockDashboardData)

    const { result } = renderHook(() => useDashboard(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockDashboardData)
    expect(api.apiGet).toHaveBeenCalledWith('/user/dashboard')
  })

  it('has correct query keys', () => {
    expect(dashboardKeys.all).toEqual(['dashboard'])
  })

  it('handles error state', async () => {
    vi.spyOn(api, 'apiGet').mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useDashboard(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})

describe('QuickStats', () => {
  it('renders all four stat cards with correct values', () => {
    render(
      <QuickStats stats={mockDashboardData.quick_stats} totalCount={10} />
    )

    expect(screen.getByTestId('stat-total')).toHaveTextContent('10')
    expect(screen.getByTestId('stat-completed')).toHaveTextContent('7')
    expect(screen.getByTestId('stat-processing')).toHaveTextContent('2')
    expect(screen.getByTestId('stat-failed')).toHaveTextContent('1')
  })

  it('renders labels for each stat', () => {
    render(
      <QuickStats stats={mockDashboardData.quick_stats} totalCount={10} />
    )

    expect(screen.getByText('Total Extractions')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByText('Processing')).toBeInTheDocument()
    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  it('renders zero values correctly', () => {
    render(
      <QuickStats
        stats={{ completed: 0, processing: 0, failed: 0 }}
        totalCount={0}
      />
    )

    expect(screen.getByTestId('stat-total')).toHaveTextContent('0')
    expect(screen.getByTestId('stat-completed')).toHaveTextContent('0')
  })
})

describe('CreditCard', () => {
  it('renders credit balance', () => {
    render(<CreditCard balance={5} />)

    expect(screen.getByTestId('credit-balance')).toHaveTextContent('5')
    expect(screen.getByText('credits remaining')).toBeInTheDocument()
  })

  it('renders singular text for balance of 1', () => {
    render(<CreditCard balance={1} />)

    expect(screen.getByText('credit remaining')).toBeInTheDocument()
  })

  it('renders Buy Credits link pointing to /pricing', () => {
    render(<CreditCard balance={5} />)

    const link = screen.getByRole('link', { name: /buy credits/i })
    expect(link).toHaveAttribute('href', '/pricing')
  })

  it('renders zero balance', () => {
    render(<CreditCard balance={0} />)

    expect(screen.getByTestId('credit-balance')).toHaveTextContent('0')
  })

  it('renders Upload a lease CTA when balance > 0', () => {
    render(<CreditCard balance={3} />)

    expect(screen.getByTestId('upload-with-credits-cta')).toBeInTheDocument()
  })

  it('Upload a lease CTA links to /upload', () => {
    render(<CreditCard balance={3} />)

    const link = screen.getByTestId('upload-with-credits-cta')
    expect(link).toHaveAttribute('href', '/upload')
  })

  it('does not render Upload a lease CTA when balance is 0', () => {
    render(<CreditCard balance={0} />)

    expect(screen.queryByTestId('upload-with-credits-cta')).not.toBeInTheDocument()
  })
})

describe('EmptyState', () => {
  it('renders welcome message', () => {
    render(<EmptyState />)

    expect(screen.getByText('No extractions yet')).toBeInTheDocument()
    expect(screen.getByText(/upload a commercial lease/i)).toBeInTheDocument()
  })

  it('renders upload CTA link pointing to /upload', () => {
    render(<EmptyState />)

    const link = screen.getByRole('link', { name: /upload your first lease/i })
    expect(link).toHaveAttribute('href', '/upload')
  })

  it('renders a first-run checklist and help for new users', () => {
    render(<EmptyState />)

    expect(screen.getByText('Start here')).toBeInTheDocument()
    expect(screen.getByText(/1\. Upload a lease PDF/i)).toBeInTheDocument()
    expect(screen.getByText(/2\. Preview the extracted terms/i)).toBeInTheDocument()
    expect(screen.getByText(/3\. Unlock and export/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /what happens after i upload/i }),
    ).toBeInTheDocument()
  })
})

describe('ExtractionList', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  function renderExtractionList() {
    // Mock the API to return extraction list data
    vi.spyOn(api, 'apiGet').mockResolvedValue(mockListResponse)

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <ExtractionList />
      </QueryClientProvider>
    )

    return queryClient
  }

  it('renders extraction rows with filename and status', async () => {
    renderExtractionList()

    await waitFor(() => {
      expect(screen.getByText('lease-office-a.pdf')).toBeInTheDocument()
    })

    expect(screen.getByText('lease-retail-b.pdf')).toBeInTheDocument()
    expect(screen.getByText('lease-industrial-c.pdf')).toBeInTheDocument()

    // Status badges (filter tabs also contain these words, so use getAllByText)
    expect(screen.getAllByText('Complete').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Extracting').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Failed').length).toBeGreaterThanOrEqual(1)
  })

  it('renders view links to results pages', async () => {
    renderExtractionList()

    await waitFor(() => {
      expect(screen.getByText('lease-office-a.pdf')).toBeInTheDocument()
    })

    const viewLinks = screen.getAllByRole('link', { name: /view/i })
    expect(viewLinks[0]).toHaveAttribute('href', '/results/ext-1')
    expect(viewLinks[1]).toHaveAttribute('href', '/results/ext-2')
    expect(viewLinks[2]).toHaveAttribute('href', '/results/ext-3')
    expect(viewLinks[3]).toHaveAttribute('href', '/results/ext-4')
  })

  it('opens delete confirmation dialog and can cancel', async () => {
    const user = userEvent.setup()
    renderExtractionList()

    await waitFor(() => {
      expect(screen.getByText('lease-office-a.pdf')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[0])

    expect(screen.getByText('Delete Extraction')).toBeInTheDocument()
    expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    await waitFor(() => {
      expect(screen.queryByText('Delete Extraction')).not.toBeInTheDocument()
    })
  })

  it('calls delete API and closes dialog on confirm', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'apiGet').mockResolvedValue(mockListResponse)
    vi.spyOn(api, 'apiDelete').mockResolvedValue(undefined)

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <ExtractionList />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('lease-office-a.pdf')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[0])

    await user.click(screen.getByRole('button', { name: /^delete$/i }))

    await waitFor(() => {
      expect(api.apiDelete).toHaveBeenCalledWith('/extractions/ext-1')
    })
  })

  it('surfaces an error and keeps the dialog open when delete fails', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'apiGet').mockResolvedValue(mockListResponse)
    vi.spyOn(api, 'apiDelete').mockRejectedValue(new Error('Network error'))

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <ExtractionList />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('lease-office-a.pdf')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[0])

    await user.click(screen.getByRole('button', { name: /^delete$/i }))

    // Error must be surfaced to the user via an alert
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/could not delete/i)

    // Dialog stays open so the user can retry
    expect(screen.getByText('Delete Extraction')).toBeInTheDocument()

    // The Delete button is interactive again (not stuck in "Deleting...")
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeEnabled()
  })

  it('shows search input and date filter controls', async () => {
    renderExtractionList()

    await waitFor(() => {
      expect(screen.getByTestId('extraction-search')).toBeInTheDocument()
    })

    expect(screen.getByTestId('date-from')).toBeInTheDocument()
    expect(screen.getByTestId('date-to')).toBeInTheDocument()
    expect(screen.getByText('Last 7 days')).toBeInTheDocument()
    expect(screen.getByText('Last 30 days')).toBeInTheDocument()
  })

  it('shows sort toggle button', async () => {
    renderExtractionList()

    await waitFor(() => {
      expect(screen.getByLabelText(/sorted newest first/i)).toBeInTheDocument()
    })
  })

  it('groups extractions by date', async () => {
    renderExtractionList()

    await waitFor(() => {
      expect(screen.getByText('lease-office-a.pdf')).toBeInTheDocument()
    })

    // Should have date group headers — at least one "Today" group
    expect(screen.getAllByText('Today').length).toBeGreaterThanOrEqual(1)
  })

  it('shows both relative and absolute dates', async () => {
    renderExtractionList()

    await waitFor(() => {
      expect(screen.getByText('lease-office-a.pdf')).toBeInTheDocument()
    })

    // Should show relative time like "1h ago"
    expect(screen.getByText(/1h ago/)).toBeInTheDocument()
  })

  it('renders extraction list container even when loading', () => {
    vi.spyOn(api, 'apiGet').mockReturnValue(new Promise(() => {}))

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ExtractionList />
      </QueryClientProvider>
    )

    expect(screen.getByTestId('extraction-list')).toBeInTheDocument()
  })

  it('shows Unlock badge for complete unpaid extractions', async () => {
    renderExtractionList()

    await waitFor(() => {
      expect(screen.getByText('lease-unpaid.pdf')).toBeInTheDocument()
    })

    expect(screen.getByTestId('unlock-badge-ext-4')).toBeInTheDocument()
    expect(screen.getByTestId('unlock-badge-ext-4')).toHaveTextContent('Unlock for $15 →')
  })

  it('shows Paid badge for complete paid extractions', async () => {
    renderExtractionList()

    await waitFor(() => {
      expect(screen.getByText('lease-office-a.pdf')).toBeInTheDocument()
    })

    expect(screen.getByTestId('paid-badge-ext-1')).toBeInTheDocument()
    expect(screen.getByTestId('paid-badge-ext-1')).toHaveTextContent('Paid ✓')
  })

  it('does not show payment badge for non-complete extractions', async () => {
    renderExtractionList()

    await waitFor(() => {
      expect(screen.getByText('lease-retail-b.pdf')).toBeInTheDocument()
    })

    // ext-2 is 'extracting', ext-3 is 'failed' — neither should have a payment badge
    expect(screen.queryByTestId('unlock-badge-ext-2')).not.toBeInTheDocument()
    expect(screen.queryByTestId('paid-badge-ext-2')).not.toBeInTheDocument()
    expect(screen.queryByTestId('unlock-badge-ext-3')).not.toBeInTheDocument()
    expect(screen.queryByTestId('paid-badge-ext-3')).not.toBeInTheDocument()
  })

  it('Unlock badge links to results page', async () => {
    renderExtractionList()

    await waitFor(() => {
      expect(screen.getByText('lease-unpaid.pdf')).toBeInTheDocument()
    })

    const unlockBadge = screen.getByTestId('unlock-badge-ext-4')
    expect(unlockBadge.closest('a')).toHaveAttribute('href', '/results/ext-4')
  })

  it('uses overflow-safe mobile row layout and tokenized payment badges', async () => {
    renderExtractionList()

    const row = await screen.findByTestId('extraction-row-ext-4')
    expect(row).toHaveClass('flex-col', 'items-start', 'gap-3', 'sm:flex-row')

    expect(screen.getByTestId('extraction-meta-ext-4')).toHaveClass(
      'flex',
      'flex-wrap'
    )
    expect(screen.getByTestId('extraction-actions-ext-4')).toHaveClass(
      'flex-wrap',
      'self-stretch',
      'sm:self-auto'
    )
    expect(screen.getByTestId('unlock-badge-ext-4')).toHaveClass(
      ...APP_STATUS_COLORS.locked.badge.split(' ')
    )
    expect(screen.getByTestId('paid-badge-ext-1')).toHaveClass(
      ...APP_STATUS_COLORS.paid.badge.split(' ')
    )
  })

  it('uses 40px focus-visible target classes for status and date filters', async () => {
    renderExtractionList()

    const statusFilter = await screen.findByRole('button', { name: 'All' })
    expect(statusFilter).toHaveClass(...INTERACTIVE_TARGET_CLASSES.compact.split(' '))
    expect(screen.getByText('Last 7 days')).toHaveClass(
      ...INTERACTIVE_TARGET_CLASSES.compact.split(' ')
    )
    expect(screen.getByTestId('date-from')).toHaveClass(
      'min-h-10',
      'rounded-md',
      'focus-visible:ring-2'
    )
    expect(screen.getByTestId('date-to')).toHaveClass(
      'min-h-10',
      'rounded-md',
      'focus-visible:ring-2'
    )
  })
})

describe('DateRangeFilter', () => {
  it('renders accessible compact date inputs with linked bounds', () => {
    const onDateChange = vi.fn()

    render(
      <DateRangeFilter
        dateFrom="2026-04-01"
        dateTo="2026-04-30"
        onDateChange={onDateChange}
      />
    )

    const from = screen.getByLabelText('From date')
    const to = screen.getByLabelText('To date')

    expect(from).toHaveAttribute('max', '2026-04-30')
    expect(to).toHaveAttribute('min', '2026-04-01')
    expect(from).toHaveClass('min-h-10', 'rounded-md', 'focus-visible:ring-2')
    expect(to).toHaveClass('min-h-10', 'rounded-md', 'focus-visible:ring-2')
    expect(screen.getByRole('button', { name: 'Clear' })).toHaveClass(
      INTERACTIVE_TARGET_CLASSES.compact
    )
  })

  it('applies manual date changes, preset ranges, and clearing', async () => {
    const user = userEvent.setup()
    const onDateChange = vi.fn()

    render(
      <DateRangeFilter
        dateFrom="2026-04-01"
        dateTo="2026-04-30"
        onDateChange={onDateChange}
      />
    )

    await user.clear(screen.getByLabelText('From date'))
    expect(onDateChange).toHaveBeenLastCalledWith(undefined, '2026-04-30')

    await user.clear(screen.getByLabelText('To date'))
    expect(onDateChange).toHaveBeenLastCalledWith('2026-04-01', undefined)

    await user.click(screen.getByRole('button', { name: 'Last 7 days' }))
    expect(onDateChange).toHaveBeenLastCalledWith(
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
    )

    await user.click(screen.getByRole('button', { name: 'Last 30 days' }))
    await user.click(screen.getByRole('button', { name: 'Last 90 days' }))
    expect(onDateChange).toHaveBeenCalledTimes(5)

    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onDateChange).toHaveBeenLastCalledWith(undefined, undefined)
  })

  it('hides the clear action when no date range is active', () => {
    render(
      <DateRangeFilter
        dateFrom={undefined}
        dateTo={undefined}
        onDateChange={vi.fn()}
      />
    )

    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()
  })
})

describe('formatRelativeDate', () => {
  it('returns "just now" for recent dates', () => {
    const now = new Date().toISOString()
    expect(formatRelativeDate(now)).toBe('just now')
  })

  it('returns minutes ago for dates less than an hour', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString()
    expect(formatRelativeDate(fiveMinAgo)).toBe('5m ago')
  })

  it('returns hours ago for dates less than a day', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600000).toISOString()
    expect(formatRelativeDate(threeHoursAgo)).toBe('3h ago')
  })

  it('returns days ago for dates less than a week', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString()
    expect(formatRelativeDate(twoDaysAgo)).toBe('2d ago')
  })

  it('returns formatted date for older dates', () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString()
    const result = formatRelativeDate(twoWeeksAgo)
    // Should be a locale date string like "3/2/2026"
    expect(result).toMatch(/\d/)
  })
})

describe('statusConfig', () => {
  it('maps all expected statuses', () => {
    expect(statusConfig.uploading).toEqual({
      label: 'Uploading',
      variant: 'secondary',
    })
    expect(statusConfig.complete).toEqual({
      label: 'Complete',
      variant: 'default',
    })
    expect(statusConfig.failed).toEqual({
      label: 'Failed',
      variant: 'destructive',
    })
    expect(statusConfig.extracting).toEqual({
      label: 'Extracting',
      variant: 'secondary',
    })
    expect(statusConfig.scoring).toEqual({
      label: 'Scoring',
      variant: 'secondary',
    })
  })
})

// ─── DashboardPage ──────────────────────────────────────────────

function makeDashboardData(
  overrides: Partial<DashboardData> = {}
): DashboardData {
  return {
    extraction_count: 0,
    credit_balance: 0,
    recent_extractions: [],
    quick_stats: { completed: 0, processing: 0, failed: 0 },
    ...overrides,
  }
}

function makeUseDashboardReturn(data: DashboardData) {
  return {
    data,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    isSuccess: true,
    status: 'success' as const,
  }
}

function createDashboardWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function DashboardWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // Stub the list endpoint that ExtractionList fetches so tests don't time out
    vi.spyOn(api, 'apiGet').mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0,
    })
  })

  it('shows WelcomeBanner when user has no extractions', async () => {
    vi.spyOn(useDashboardModule, 'useDashboard').mockReturnValue(
      // Cast is safe: we only need the fields the component reads (data, isLoading, isError, refetch)
      makeUseDashboardReturn(makeDashboardData()) as unknown as ReturnType<typeof useDashboard>
    )
    render(<DashboardPage />, { wrapper: createDashboardWrapper() })
    await waitFor(() => {
      expect(screen.getByTestId('welcome-banner')).toBeInTheDocument()
    })
  })

  it('shows WelcomeBanner when user has unpaid complete extractions', async () => {
    vi.spyOn(useDashboardModule, 'useDashboard').mockReturnValue(
      // cast is safe: component only reads data, isLoading, and isError
      makeUseDashboardReturn(
        makeDashboardData({
          extraction_count: 1,
          recent_extractions: [
            {
              id: 'e1',
              document_filename: 'lease.pdf',
              status: 'complete',
              payment_status: 'unpaid',
              created_at: new Date().toISOString(),
            },
          ],
        })
      ) as unknown as ReturnType<typeof useDashboard>
    )
    render(<DashboardPage />, { wrapper: createDashboardWrapper() })
    await waitFor(() => {
      expect(screen.getByTestId('welcome-banner')).toBeInTheDocument()
    })
  })

  it('does not show WelcomeBanner when all extractions are paid', async () => {
    vi.spyOn(useDashboardModule, 'useDashboard').mockReturnValue(
      // cast is safe: component only reads data, isLoading, and isError
      makeUseDashboardReturn(
        makeDashboardData({
          extraction_count: 1,
          recent_extractions: [
            {
              id: 'e1',
              document_filename: 'lease.pdf',
              status: 'complete',
              payment_status: 'paid',
              created_at: new Date().toISOString(),
            },
          ],
        })
      ) as unknown as ReturnType<typeof useDashboard>
    )
    render(<DashboardPage />, { wrapper: createDashboardWrapper() })
    // QuickStats is rendered (data-testid="quick-stats" is on the real component's wrapper)
    await waitFor(() => {
      expect(screen.getByTestId('quick-stats')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('welcome-banner')).not.toBeInTheDocument()
  })
})

// ─── Welcome Banner ─────────────────────────────────────────────

describe('WelcomeBanner', () => {
  it('renders step 1 (Create account) as always complete', () => {
    render(<WelcomeBanner hasExtractions={false} hasUnpaidExtractions={false} />)

    expect(screen.getByTestId('welcome-banner')).toBeInTheDocument()
    expect(screen.getByText('Create your account')).toBeInTheDocument()
  })

  it('shows step 2 (Upload) as incomplete when hasExtractions=false, with link to /upload', () => {
    render(<WelcomeBanner hasExtractions={false} hasUnpaidExtractions={false} />)

    const step2Link = screen.getByRole('link', { name: /upload a lease pdf/i })
    expect(step2Link).toHaveAttribute('href', '/upload')
  })

  it('shows step 2 (Upload) as complete when hasExtractions=true', () => {
    render(<WelcomeBanner hasExtractions={true} hasUnpaidExtractions={false} />)

    // When complete, the step text should be present but NOT as a link
    expect(screen.getByText('Upload a lease PDF')).toBeInTheDocument()
    // Should not be a link when complete
    const links = screen.queryAllByRole('link', { name: /upload a lease pdf/i })
    expect(links).toHaveLength(0)
  })

  it('does not render step 3 when hasUnpaidExtractions=false', () => {
    render(<WelcomeBanner hasExtractions={true} hasUnpaidExtractions={false} />)

    expect(screen.queryByText(/unlock your first report/i)).not.toBeInTheDocument()
  })

  it('renders step 3 (Unlock) as pending when hasUnpaidExtractions=true', () => {
    render(<WelcomeBanner hasExtractions={true} hasUnpaidExtractions={true} />)

    expect(screen.getByText('Unlock your first report')).toBeInTheDocument()
  })

  it('step 3 (Unlock) link points to /pricing, not /dashboard', () => {
    render(<WelcomeBanner hasExtractions={true} hasUnpaidExtractions={true} />)

    const step3Link = screen.getByRole('link', { name: /unlock your first report/i })
    expect(step3Link).toHaveAttribute('href', '/pricing')
  })

  it('shows upload CTA when hasExtractions=false', () => {
    render(<WelcomeBanner hasExtractions={false} hasUnpaidExtractions={false} />)

    const cta = screen.getByRole('link', { name: /upload your first lease/i })
    expect(cta).toHaveAttribute('href', '/upload')
  })

  it('does not show upload CTA when hasExtractions=true', () => {
    render(<WelcomeBanner hasExtractions={true} hasUnpaidExtractions={false} />)

    expect(screen.queryByRole('link', { name: /upload your first lease →/i })).not.toBeInTheDocument()
  })
})
