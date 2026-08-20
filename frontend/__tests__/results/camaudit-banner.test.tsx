import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { RedFlag } from '@/types/extraction'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  X: ({ className, ...props }: Record<string, unknown>) => (
    <span data-testid="icon-x" className={className as string} {...props} />
  ),
  ExternalLink: ({ className, ...props }: Record<string, unknown>) => (
    <span data-testid="icon-external-link" className={className as string} {...props} />
  ),
  Loader2: ({ className, ...props }: Record<string, unknown>) => (
    <span data-testid="icon-loader" className={className as string} {...props} />
  ),
  AlertCircle: ({ className, ...props }: Record<string, unknown>) => (
    <span data-testid="icon-alert-circle" className={className as string} {...props} />
  ),
  ShieldAlert: ({ className, ...props }: Record<string, unknown>) => (
    <span data-testid="icon-shield-alert" className={className as string} {...props} />
  ),
  BadgePercent: ({ className, ...props }: Record<string, unknown>) => (
    <span data-testid="icon-badge-percent" className={className as string} {...props} />
  ),
}))

// Mock motion/react
vi.mock('motion/react', () => ({
  motion: {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Destructuring motion props to avoid passing them to DOM
    div: ({ children, initial, animate, transition, ...props }: Record<string, unknown>) => (
      <div {...props}>{children as React.ReactNode}</div>
    ),
  },
}))

// Mock api
const mockApiGet = vi.fn()
vi.mock('@/lib/api', () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

function makeCamFlag(ruleId: string, fieldName: string): RedFlag {
  return {
    rule_id: ruleId,
    name: fieldName,
    severity: 'HIGH',
    description: `Issue with ${fieldName}`,
  }
}

function makeNonCamFlag(): RedFlag {
  return {
    rule_id: 'RF-099',
    name: 'some_field',
    severity: 'MEDIUM',
    description: 'Unrelated flag',
  }
}

const EXTRACTION_ID = 'ext-cam-001'

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

describe('CamAuditBanner', () => {
  it('renders nothing when no CAM-related flags', async () => {
    const { CamAuditBanner } = await import(
      '@/components/results/camaudit-banner'
    )
    const { container } = render(
      <CamAuditBanner
        extractionId={EXTRACTION_ID}
        redFlags={[makeNonCamFlag()]}
        paymentStatus="paid"
      />,
      { wrapper: createWrapper() }
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when paymentStatus is not paid', async () => {
    const { CamAuditBanner } = await import(
      '@/components/results/camaudit-banner'
    )
    const flags = [makeCamFlag('RF-001', 'management_fee_cap')]
    const { container } = render(
      <CamAuditBanner
        extractionId={EXTRACTION_ID}
        redFlags={flags}
        paymentStatus="pending"
      />,
      { wrapper: createWrapper() }
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when dismissed in localStorage', async () => {
    localStorage.setItem(`camaudit-dismissed-${EXTRACTION_ID}`, 'true')
    const { CamAuditBanner } = await import(
      '@/components/results/camaudit-banner'
    )
    const flags = [makeCamFlag('RF-001', 'management_fee_cap')]
    const { container } = render(
      <CamAuditBanner
        extractionId={EXTRACTION_ID}
        redFlags={flags}
        paymentStatus="paid"
      />,
      { wrapper: createWrapper() }
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders banner with correct flag count', async () => {
    const { CamAuditBanner } = await import(
      '@/components/results/camaudit-banner'
    )
    const flags = [
      makeCamFlag('RF-001', 'management_fee_cap'),
      makeCamFlag('RF-002', 'audit_rights'),
      makeCamFlag('RF-003', 'cam_cap_percentage'),
    ]
    render(
      <CamAuditBanner
        extractionId={EXTRACTION_ID}
        redFlags={flags}
        paymentStatus="paid"
      />,
      { wrapper: createWrapper() }
    )
    expect(screen.getByTestId('camaudit-banner')).toBeInTheDocument()
    expect(screen.getByText(/3 CAM risk factors/)).toBeInTheDocument()
  })

  it('shows contextual messages for specific rule_ids', async () => {
    const { CamAuditBanner } = await import(
      '@/components/results/camaudit-banner'
    )
    const flags = [
      makeCamFlag('RF-001', 'management_fee_cap'),
      makeCamFlag('RF-003', 'cam_cap_percentage'),
    ]
    render(
      <CamAuditBanner
        extractionId={EXTRACTION_ID}
        redFlags={flags}
        paymentStatus="paid"
      />,
      { wrapper: createWrapper() }
    )
    expect(
      screen.getByText(/Management fees over 15%/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/No CAM cap means unlimited/)
    ).toBeInTheDocument()
  })

  it('shows at most 3 contextual messages', async () => {
    const { CamAuditBanner } = await import(
      '@/components/results/camaudit-banner'
    )
    const flags = [
      makeCamFlag('RF-001', 'management_fee_cap'),
      makeCamFlag('RF-002', 'audit_rights'),
      makeCamFlag('RF-003', 'cam_cap_percentage'),
      makeCamFlag('RF-004', 'cam_cap_type'),
      makeCamFlag('RF-005', 'gross_up_percentage'),
    ]
    render(
      <CamAuditBanner
        extractionId={EXTRACTION_ID}
        redFlags={flags}
        paymentStatus="paid"
      />,
      { wrapper: createWrapper() }
    )
    const messages = screen.getAllByTestId('camaudit-message')
    expect(messages).toHaveLength(3)
  })

  it('shows paid handoff context badge', async () => {
    const { CamAuditBanner } = await import(
      '@/components/results/camaudit-banner'
    )
    const flags = [makeCamFlag('RF-001', 'management_fee_cap')]
    render(
      <CamAuditBanner
        extractionId={EXTRACTION_ID}
        redFlags={flags}
        paymentStatus="paid"
      />,
      { wrapper: createWrapper() }
    )
    expect(screen.getByTestId('camaudit-context-badge')).toBeInTheDocument()
    expect(screen.getByText('Paid handoff')).toBeInTheDocument()
  })

  it('dismiss button hides banner and sets localStorage', async () => {
    const { CamAuditBanner } = await import(
      '@/components/results/camaudit-banner'
    )
    const flags = [makeCamFlag('RF-001', 'management_fee_cap')]
    const { container } = render(
      <CamAuditBanner
        extractionId={EXTRACTION_ID}
        redFlags={flags}
        paymentStatus="paid"
      />,
      { wrapper: createWrapper() }
    )
    expect(screen.getByTestId('camaudit-banner')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('camaudit-dismiss'))

    await waitFor(() => {
      expect(container.innerHTML).toBe('')
    })
    expect(localStorage.getItem(`camaudit-dismissed-${EXTRACTION_ID}`)).toBe(
      'true'
    )
  })

  it('CTA button triggers mutation', async () => {
    mockApiGet.mockResolvedValue({
      redirect_url: 'https://camaudit.io/start?ref=ext-cam-001',
      extraction_id: EXTRACTION_ID,
    })
    const { CamAuditBanner } = await import(
      '@/components/results/camaudit-banner'
    )
    const flags = [makeCamFlag('RF-001', 'management_fee_cap')]
    render(
      <CamAuditBanner
        extractionId={EXTRACTION_ID}
        redFlags={flags}
        paymentStatus="paid"
      />,
      { wrapper: createWrapper() }
    )

    fireEvent.click(screen.getByTestId('camaudit-cta'))

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith(
        `/extractions/${EXTRACTION_ID}/camaudit-payload`
      )
    })
  })

  it('shows loading state during redirect generation', async () => {
    let resolveApi: (value: unknown) => void
    mockApiGet.mockReturnValue(
      new Promise((resolve) => {
        resolveApi = resolve
      })
    )
    const { CamAuditBanner } = await import(
      '@/components/results/camaudit-banner'
    )
    const flags = [makeCamFlag('RF-001', 'management_fee_cap')]
    render(
      <CamAuditBanner
        extractionId={EXTRACTION_ID}
        redFlags={flags}
        paymentStatus="paid"
      />,
      { wrapper: createWrapper() }
    )

    fireEvent.click(screen.getByTestId('camaudit-cta'))

    await waitFor(() => {
      expect(screen.getByTestId('camaudit-cta')).toBeDisabled()
      expect(screen.getByText('Redirecting...')).toBeInTheDocument()
    })

    // Resolve to clean up
    resolveApi!({
      redirect_url: 'https://camaudit.io/start',
      extraction_id: EXTRACTION_ID,
    })
  })

  it('shows error state if mutation fails', async () => {
    mockApiGet.mockRejectedValue(new Error('Handoff failed'))
    const { CamAuditBanner } = await import(
      '@/components/results/camaudit-banner'
    )
    const flags = [makeCamFlag('RF-001', 'management_fee_cap')]
    render(
      <CamAuditBanner
        extractionId={EXTRACTION_ID}
        redFlags={flags}
        paymentStatus="paid"
      />,
      { wrapper: createWrapper() }
    )

    fireEvent.click(screen.getByTestId('camaudit-cta'))

    await waitFor(() => {
      expect(screen.getByTestId('camaudit-error')).toBeInTheDocument()
      expect(screen.getByText('Handoff failed')).toBeInTheDocument()
    })
  })

  it('shows error state when the backend returns a non-https redirect URL', async () => {
    // A bad/spoofed redirect_url must surface as an error, not silently
    // dead-end the CTA. Validation lives in mutationFn so the rejection
    // routes to mutation.isError (a throw inside onSuccess would not).
    mockApiGet.mockResolvedValue({
      redirect_url: 'http://camaudit.io/start',
      extraction_id: EXTRACTION_ID,
    })
    const { CamAuditBanner } = await import(
      '@/components/results/camaudit-banner'
    )
    const flags = [makeCamFlag('RF-001', 'management_fee_cap')]
    render(
      <CamAuditBanner
        extractionId={EXTRACTION_ID}
        redFlags={flags}
        paymentStatus="paid"
      />,
      { wrapper: createWrapper() }
    )

    fireEvent.click(screen.getByTestId('camaudit-cta'))

    await waitFor(() => {
      expect(screen.getByTestId('camaudit-error')).toBeInTheDocument()
    })
  })

  it('shows error state when the redirect URL is on an unexpected hostname', async () => {
    // camaudit.io.evil.com must be rejected: we compare the parsed hostname
    // exactly rather than using startsWith on the URL string.
    mockApiGet.mockResolvedValue({
      redirect_url: 'https://camaudit.io.evil.com/start',
      extraction_id: EXTRACTION_ID,
    })
    const { CamAuditBanner } = await import(
      '@/components/results/camaudit-banner'
    )
    const flags = [makeCamFlag('RF-001', 'management_fee_cap')]
    render(
      <CamAuditBanner
        extractionId={EXTRACTION_ID}
        redFlags={flags}
        paymentStatus="paid"
      />,
      { wrapper: createWrapper() }
    )

    fireEvent.click(screen.getByTestId('camaudit-cta'))

    await waitFor(() => {
      expect(screen.getByTestId('camaudit-error')).toBeInTheDocument()
    })
  })

  it('renders nothing when redFlags array is empty', async () => {
    const { CamAuditBanner } = await import(
      '@/components/results/camaudit-banner'
    )
    const { container } = render(
      <CamAuditBanner
        extractionId={EXTRACTION_ID}
        redFlags={[]}
        paymentStatus="paid"
      />,
      { wrapper: createWrapper() }
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders when backend marks the extraction eligible without CAM rule flags', async () => {
    const { CamAuditBanner } = await import(
      '@/components/results/camaudit-banner'
    )
    render(
      <CamAuditBanner
        extractionId={EXTRACTION_ID}
        redFlags={[]}
        paymentStatus="paid"
        showCamaudit
      />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByTestId('camaudit-banner')).toBeInTheDocument()
    expect(screen.getByText('CAM review may be available')).toBeInTheDocument()
    expect(
      screen.getByText(/CAM provisions that may benefit from reconciliation review/),
    ).toBeInTheDocument()
  })

  it('filters non-CAM flags and only counts CAM-related ones', async () => {
    const { CamAuditBanner } = await import(
      '@/components/results/camaudit-banner'
    )
    const flags = [
      makeCamFlag('RF-001', 'management_fee_cap'),
      makeNonCamFlag(),
      makeCamFlag('RF-002', 'audit_rights'),
    ]
    render(
      <CamAuditBanner
        extractionId={EXTRACTION_ID}
        redFlags={flags}
        paymentStatus="paid"
      />,
      { wrapper: createWrapper() }
    )
    expect(screen.getByText(/2 CAM risk factors/)).toBeInTheDocument()
  })

  it('shows generic error for non-Error mutation failure', async () => {
    mockApiGet.mockRejectedValue('unexpected string error')
    const { CamAuditBanner } = await import(
      '@/components/results/camaudit-banner'
    )
    const flags = [makeCamFlag('RF-001', 'management_fee_cap')]
    render(
      <CamAuditBanner
        extractionId={EXTRACTION_ID}
        redFlags={flags}
        paymentStatus="paid"
      />,
      { wrapper: createWrapper() }
    )

    fireEvent.click(screen.getByTestId('camaudit-cta'))

    await waitFor(() => {
      expect(screen.getByTestId('camaudit-error')).toBeInTheDocument()
      expect(
        screen.getByText('Failed to generate CamAudit redirect. Please try again.')
      ).toBeInTheDocument()
    })
  })

  it('renders singular text for exactly 1 CAM risk factor', async () => {
    const { CamAuditBanner } = await import(
      '@/components/results/camaudit-banner'
    )
    const flags = [makeCamFlag('RF-001', 'management_fee_cap')]
    render(
      <CamAuditBanner
        extractionId={EXTRACTION_ID}
        redFlags={flags}
        paymentStatus="paid"
      />,
      { wrapper: createWrapper() }
    )
    expect(screen.getByText(/1 CAM risk factor$/)).toBeInTheDocument()
  })

  it('falls back to flag.message when rule_id has no CAM_RULE_MESSAGE', async () => {
    // Temporarily add a rule ID to the set that has no corresponding message
    const { CAM_RELATED_RULE_IDS } = await import(
      '@/components/results/camaudit-messages'
    )
    CAM_RELATED_RULE_IDS.add('RF-999')

    const { CamAuditBanner } = await import(
      '@/components/results/camaudit-banner'
    )
    const flags: RedFlag[] = [
      {
        rule_id: 'RF-999',
        name: 'custom_field',
        severity: 'HIGH',
        description: 'Custom fallback message from red flag',
      },
    ]
    render(
      <CamAuditBanner
        extractionId={EXTRACTION_ID}
        redFlags={flags}
        paymentStatus="paid"
      />,
      { wrapper: createWrapper() }
    )
    expect(
      screen.getByText('Custom fallback message from red flag')
    ).toBeInTheDocument()

    // Clean up: remove the temporary rule ID
    CAM_RELATED_RULE_IDS.delete('RF-999')
  })

  it('handles flags without rule_id gracefully', async () => {
    const { CamAuditBanner } = await import(
      '@/components/results/camaudit-banner'
    )
    const flagWithoutRuleId: RedFlag = {
      name: 'some_field',
      severity: 'HIGH',
      description: 'No rule_id',
    }
    const { container } = render(
      <CamAuditBanner
        extractionId={EXTRACTION_ID}
        redFlags={[flagWithoutRuleId]}
        paymentStatus="paid"
      />,
      { wrapper: createWrapper() }
    )
    expect(container.innerHTML).toBe('')
  })
})

describe('camaudit-messages', () => {
  it('CAM_RELATED_RULE_IDS contains expected IDs', async () => {
    const { CAM_RELATED_RULE_IDS } = await import(
      '@/components/results/camaudit-messages'
    )
    expect(CAM_RELATED_RULE_IDS.has('RF-001')).toBe(true)
    expect(CAM_RELATED_RULE_IDS.has('RF-006')).toBe(true)
    expect(CAM_RELATED_RULE_IDS.has('RF-015')).toBe(true)
    expect(CAM_RELATED_RULE_IDS.has('RF-099')).toBe(false)
  })

  it('CAM_RULE_MESSAGES has entries for all CAM rule IDs', async () => {
    const { CAM_RELATED_RULE_IDS, CAM_RULE_MESSAGES } = await import(
      '@/components/results/camaudit-messages'
    )
    for (const ruleId of CAM_RELATED_RULE_IDS) {
      expect(CAM_RULE_MESSAGES[ruleId]).toBeDefined()
      expect(typeof CAM_RULE_MESSAGES[ruleId]).toBe('string')
      expect(CAM_RULE_MESSAGES[ruleId].length).toBeGreaterThan(0)
    }
  })
})

describe('useCamaudit', () => {
  it('returns false when localStorage throws', async () => {
    const { renderHook } = await import('@testing-library/react')
    const { useCamaudit } = await import('@/hooks/use-camaudit')

    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('localStorage disabled')
    })

    const { result } = renderHook(
      () => useCamaudit({ extractionId: 'test-error' }),
      { wrapper: createWrapper() }
    )

    expect(result.current.isDismissed).toBe(false)

    spy.mockRestore()
  })

  it('isDismissed reads from localStorage', async () => {
    const { renderHook } = await import('@testing-library/react')
    const { useCamaudit } = await import('@/hooks/use-camaudit')

    localStorage.setItem('camaudit-dismissed-test-123', 'true')

    const { result } = renderHook(
      () => useCamaudit({ extractionId: 'test-123' }),
      { wrapper: createWrapper() }
    )

    expect(result.current.isDismissed).toBe(true)
  })

  it('dismiss sets localStorage and updates state', async () => {
    const { renderHook, act } = await import('@testing-library/react')
    const { useCamaudit } = await import('@/hooks/use-camaudit')

    const { result } = renderHook(
      () => useCamaudit({ extractionId: 'test-456' }),
      { wrapper: createWrapper() }
    )

    expect(result.current.isDismissed).toBe(false)

    act(() => {
      result.current.dismiss()
    })

    expect(result.current.isDismissed).toBe(true)
    expect(localStorage.getItem('camaudit-dismissed-test-456')).toBe('true')
  })

  it('mutation calls correct API endpoint', async () => {
    mockApiGet.mockResolvedValue({
      redirect_url: 'https://camaudit.io/start',
      extraction_id: 'test-789',
    })

    const { renderHook, act } = await import('@testing-library/react')
    const { useCamaudit } = await import('@/hooks/use-camaudit')

    const { result } = renderHook(
      () => useCamaudit({ extractionId: 'test-789' }),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.mutation.mutate()
    })

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith(
        '/extractions/test-789/camaudit-payload'
      )
    })
  })
})
