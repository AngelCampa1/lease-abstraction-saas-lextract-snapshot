import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CategoryAccordion } from '@/components/results/category-accordion'
import { SortedCategoryList } from '@/components/results/category-accordion'
import type { CategoryDefinition, RedFlag } from '@/types/extraction'

// Mock motion/react to avoid animation dependencies in tests
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
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))

// Mock sonner
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
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

// Mock lucide-react for icons used in editable-field-row
vi.mock('lucide-react', () => ({
  Pencil: ({ className }: { className?: string }) => (
    <span data-testid="icon-pencil" className={className} />
  ),
  RotateCcw: ({ className }: { className?: string }) => (
    <span data-testid="icon-rotate-ccw" className={className} />
  ),
  Check: ({ className }: { className?: string }) => (
    <span data-testid="icon-check" className={className} />
  ),
  ChevronDown: ({ className }: { className?: string }) => (
    <span data-testid="icon-chevron-down" className={className} />
  ),
  Loader2: ({ className, 'data-testid': testId }: { className?: string; 'data-testid'?: string }) => (
    <span data-testid={testId ?? 'icon-loader'} className={className} />
  ),
  AlertTriangle: ({ className }: { className?: string }) => (
    <span data-testid="icon-alert-triangle" className={className} />
  ),
}))

const CAT_A: CategoryDefinition = {
  name: 'cat_a',
  displayName: 'Category A',
  fields: ['landlord_legal_name', 'tenant_legal_name'],
}

const CAT_B: CategoryDefinition = {
  name: 'cat_b',
  displayName: 'Category B',
  fields: ['base_rent_annual', 'base_rent_monthly', 'management_fee_cap'],
}

const CAT_C: CategoryDefinition = {
  name: 'cat_c',
  displayName: 'Category C',
  fields: ['expiration_date', 'commencement_date'],
}

const EXTRACTED: Record<string, import('@/types/extraction').ExtractionFieldValue> = {
  landlord_legal_name: { value: 'Landlord Inc.' },
  tenant_legal_name: { value: 'Tenant LLC' },
  base_rent_annual: { value: '$100,000' },
  base_rent_monthly: { value: '$8,333' },
  management_fee_cap: { value: '18%' },
  expiration_date: { value: '2030-01-01' },
  commencement_date: { value: '2025-01-01' },
}

const CONFIDENCE: Record<string, import('@/types/extraction').ConfidenceScoreEntry> = {
  landlord_legal_name: { score: 0.9, tier: 'high' },
  tenant_legal_name: { score: 0.9, tier: 'high' },
  base_rent_annual: { score: 0.88, tier: 'high' },
  base_rent_monthly: { score: 0.88, tier: 'high' },
  management_fee_cap: { score: 0.78, tier: 'medium' },
  expiration_date: { score: 0.85, tier: 'high' },
  commencement_date: { score: 0.85, tier: 'high' },
}

// ============================================================
// SortedCategoryList tests — sort logic
// ============================================================
describe('SortedCategoryList — sorting by red flags', () => {
  const RED_FLAGS_B: RedFlag[] = [
    { name: 'base_rent_annual', severity: 'HIGH', description: 'rent issue' },
    { name: 'base_rent_monthly', severity: 'MEDIUM', description: 'rent issue 2' },
  ]

  const RED_FLAGS_C: RedFlag[] = [
    { name: 'expiration_date', severity: 'LOW', description: 'date issue' },
  ]

  function renderSorted(categories: CategoryDefinition[], redFlags: RedFlag[]) {
    return render(
      <SortedCategoryList
        categories={categories}
        extractedData={EXTRACTED}
        confidenceScores={CONFIDENCE}
        redFlags={redFlags}
      />,
    )
  }

  it('categories with red flags appear before categories without', () => {
    renderSorted([CAT_A, CAT_B, CAT_C], RED_FLAGS_B)
    const accordions = screen.getAllByRole('group')
    const names = accordions.map((el) => el.getAttribute('data-testid'))
    const catBIdx = names.indexOf('category-accordion-cat_b')
    const catAIdx = names.indexOf('category-accordion-cat_a')
    // cat_b has flags, cat_a does not — cat_b must come first
    expect(catBIdx).toBeLessThan(catAIdx)
  })

  it('maps SDK-shaped rule titles to categories by rule_id', () => {
    renderSorted(
      [CAT_A, CAT_B, CAT_C],
      [
        {
          rule_id: 'RF-001',
          name: 'Excessive Management Fee',
          severity: 'HIGH',
          description: 'Management fee cap exceeds the 15% threshold.',
          triggered_value: '18%',
        },
      ],
    )

    const accordions = screen.getAllByRole('group')
    const names = accordions.map((el) => el.getAttribute('data-testid'))

    expect(names[0]).toBe('category-accordion-cat_b')
    expect(screen.getByTestId('red-flag-indicator')).toHaveTextContent('1')
  })

  it('categories with more flags appear before those with fewer', () => {
    renderSorted([CAT_A, CAT_B, CAT_C], [...RED_FLAGS_B, ...RED_FLAGS_C])
    const accordions = screen.getAllByRole('group')
    const names = accordions.map((el) => el.getAttribute('data-testid'))
    const catBIdx = names.indexOf('category-accordion-cat_b')
    const catCIdx = names.indexOf('category-accordion-cat_c')
    // cat_b has 2 flags, cat_c has 1 — cat_b first
    expect(catBIdx).toBeLessThan(catCIdx)
  })

  it('categories without flags maintain original order relative to each other', () => {
    // Only cat_b has flags — cat_a and cat_c have none
    // Original order: A, B, C → after sort: B, A, C
    renderSorted([CAT_A, CAT_B, CAT_C], RED_FLAGS_B)
    const accordions = screen.getAllByRole('group')
    const names = accordions.map((el) => el.getAttribute('data-testid'))
    const catAIdx = names.indexOf('category-accordion-cat_a')
    const catCIdx = names.indexOf('category-accordion-cat_c')
    // Neither A nor C has flags — A was originally before C, so A should still be before C
    expect(catAIdx).toBeLessThan(catCIdx)
  })

  it('renders all categories even when none have flags', () => {
    renderSorted([CAT_A, CAT_B, CAT_C], [])
    expect(screen.getByTestId('category-accordion-cat_a')).toBeInTheDocument()
    expect(screen.getByTestId('category-accordion-cat_b')).toBeInTheDocument()
    expect(screen.getByTestId('category-accordion-cat_c')).toBeInTheDocument()
  })
})

// ============================================================
// CategoryAccordion — red flag indicator
// ============================================================
describe('CategoryAccordion — red flag indicator', () => {
  it('shows red flag indicator when redFlagCount is provided and > 0', () => {
    render(
      <CategoryAccordion
        category={CAT_A}
        extractedData={EXTRACTED}
        confidenceScores={CONFIDENCE}
        redFlagCount={2}
      />,
    )
    expect(screen.getByTestId('red-flag-indicator')).toBeInTheDocument()
  })

  it('does not show red flag indicator when redFlagCount is 0', () => {
    render(
      <CategoryAccordion
        category={CAT_A}
        extractedData={EXTRACTED}
        confidenceScores={CONFIDENCE}
        redFlagCount={0}
      />,
    )
    expect(screen.queryByTestId('red-flag-indicator')).not.toBeInTheDocument()
  })

  it('does not show red flag indicator when redFlagCount is not provided', () => {
    render(
      <CategoryAccordion
        category={CAT_A}
        extractedData={EXTRACTED}
        confidenceScores={CONFIDENCE}
      />,
    )
    expect(screen.queryByTestId('red-flag-indicator')).not.toBeInTheDocument()
  })

  it('shows flag count alongside field count when redFlagCount > 0', () => {
    render(
      <CategoryAccordion
        category={CAT_A}
        extractedData={EXTRACTED}
        confidenceScores={CONFIDENCE}
        redFlagCount={3}
        defaultOpen
      />,
    )
    // Should show flag count
    expect(screen.getByTestId('red-flag-indicator')).toHaveTextContent('3')
  })
})
