import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfidenceBadge } from '@/components/results/confidence-badge'
import { FieldRow } from '@/components/results/field-row'
import fieldSchema from '../../../docs/lextract_field_schema.json'
import {
  getConfidenceTier,
  formatFieldValue,
  CONFIDENCE_THRESHOLDS,
  FIELD_LABELS,
  CATEGORIES,
} from '@/types/extraction'
import type {
  ExtractionFieldValue,
  ConfidenceScoreEntry,
} from '@/types/extraction'

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
        if (key.startsWith('data-')) props[key] = val
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

// ============================================================
// getConfidenceTier tests
// ============================================================
describe('getConfidenceTier', () => {
  it('returns high for scores >= 0.85', () => {
    expect(getConfidenceTier(0.85)).toBe('high')
    expect(getConfidenceTier(0.99)).toBe('high')
    expect(getConfidenceTier(1.0)).toBe('high')
  })

  it('returns medium for scores >= 0.60 and < 0.85', () => {
    expect(getConfidenceTier(0.6)).toBe('medium')
    expect(getConfidenceTier(0.7)).toBe('medium')
    expect(getConfidenceTier(0.84)).toBe('medium')
  })

  it('returns low for scores < 0.60', () => {
    expect(getConfidenceTier(0.59)).toBe('low')
    expect(getConfidenceTier(0.0)).toBe('low')
    expect(getConfidenceTier(0.3)).toBe('low')
  })
})

// ============================================================
// formatFieldValue tests
// ============================================================
describe('formatFieldValue', () => {
  it('returns null for null', () => {
    expect(formatFieldValue(null)).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(formatFieldValue(undefined)).toBeNull()
  })

  it('returns "Yes" for true', () => {
    expect(formatFieldValue(true)).toBe('Yes')
  })

  it('returns "No" for false', () => {
    expect(formatFieldValue(false)).toBe('No')
  })

  it('joins arrays with commas', () => {
    expect(formatFieldValue(['Taxes', 'Insurance', 'CAM'])).toBe('Taxes, Insurance, CAM')
  })

  it('returns null for empty array', () => {
    expect(formatFieldValue([])).toBeNull()
  })

  it('converts numbers to string', () => {
    expect(formatFieldValue(42)).toBe('42')
  })

  it('passes through prose strings untouched', () => {
    expect(formatFieldValue('Landlord maintains the HVAC')).toBe('Landlord maintains the HVAC')
  })

  it('humanizes a single lowercase enum token', () => {
    expect(formatFieldValue('gross')).toBe('Gross')
  })

  it('humanizes a snake_case enum token', () => {
    expect(formatFieldValue('pro_rata_allocation')).toBe('Pro Rata Allocation')
  })

  it('humanizes enum tokens inside arrays', () => {
    expect(formatFieldValue(['stepped', 'gross'])).toBe('Stepped, Gross')
  })

  it('leaves capitalized names untouched', () => {
    expect(formatFieldValue('GEORGIA BUILDING AUTHORITY')).toBe('GEORGIA BUILDING AUTHORITY')
  })

  it('treats a brace-wrapped template token as not found', () => {
    expect(formatFieldValue('{NAME OF TENANT}')).toBeNull()
  })

  it('treats an "insert ..." template token as not found', () => {
    expect(formatFieldValue('insert address of property')).toBeNull()
  })

  it('keeps a real value that merely contains braces', () => {
    expect(formatFieldValue('Suite {2}, 100 Main St')).toBe('Suite {2}, 100 Main St')
  })

  it('returns null for a blank string', () => {
    expect(formatFieldValue('   ')).toBeNull()
  })

  it('filters placeholder and blank items out of arrays', () => {
    expect(formatFieldValue(['Taxes', '  ', '{insert item}', 'Insurance'])).toBe(
      'Taxes, Insurance',
    )
  })

  it('returns null when every array item is a placeholder', () => {
    expect(formatFieldValue(['{insert a}', 'insert b'])).toBeNull()
  })
})

// ============================================================
// CONFIDENCE_THRESHOLDS tests
// ============================================================
describe('CONFIDENCE_THRESHOLDS', () => {
  it('has HIGH at 0.85', () => {
    expect(CONFIDENCE_THRESHOLDS.HIGH).toBe(0.85)
  })

  it('has MEDIUM at 0.60', () => {
    expect(CONFIDENCE_THRESHOLDS.MEDIUM).toBe(0.6)
  })
})

// ============================================================
// FIELD_LABELS tests
// ============================================================
describe('FIELD_LABELS', () => {
  it('has label for landlord_legal_name', () => {
    expect(FIELD_LABELS['landlord_legal_name']).toBe('Landlord Name')
  })

  it('has label for tenant_legal_name', () => {
    expect(FIELD_LABELS['tenant_legal_name']).toBe('Tenant Name')
  })

  it('returns undefined for unknown field', () => {
    expect(FIELD_LABELS['nonexistent_field']).toBeUndefined()
  })
})

// ============================================================
// CATEGORIES tests
// ============================================================
describe('CATEGORIES', () => {
  it('matches the canonical 126-field schema', () => {
    const schemaFieldNames = fieldSchema.map((field) => field.field_name)
    const categoryFieldNames = CATEGORIES.flatMap((category) => category.fields)
    const schemaCategories = Array.from(
      new Set(fieldSchema.map((field) => field.category)),
    )
    const expectedCategories = schemaCategories.map((categoryName) => ({
      displayName: categoryName,
      fields: fieldSchema
        .filter((field) => field.category === categoryName)
        .map((field) => field.field_name),
    }))

    expect(fieldSchema).toHaveLength(126)
    expect(CATEGORIES).toHaveLength(schemaCategories.length)
    expect(new Set(categoryFieldNames).size).toBe(schemaFieldNames.length)
    expect([...categoryFieldNames].sort()).toEqual([...schemaFieldNames].sort())
    expect(
      CATEGORIES.map((category) => ({
        displayName: category.displayName,
        fields: category.fields,
      })),
    ).toEqual(expectedCategories)
    expect(Object.keys(FIELD_LABELS).sort()).toEqual([...schemaFieldNames].sort())

    for (const field of fieldSchema) {
      expect(FIELD_LABELS[field.field_name]).toBe(field.display_label)
    }
  })

  it('first category is Parties & Property', () => {
    expect(CATEGORIES[0].displayName).toBe('Parties & Property')
  })

  it('last category matches the canonical schema order', () => {
    expect(CATEGORIES[CATEGORIES.length - 1].displayName).toBe(
      'Casualty, Condemnation & Force Majeure',
    )
  })

  it('all fields in categories exist in FIELD_LABELS', () => {
    for (const cat of CATEGORIES) {
      for (const field of cat.fields) {
        expect(FIELD_LABELS[field]).toBeDefined()
      }
    }
  })
})

// ============================================================
// ConfidenceBadge tests
// ============================================================
describe('ConfidenceBadge', () => {
  it('renders tier label and percentage', () => {
    render(<ConfidenceBadge score={0.92} tier="high" />)
    expect(screen.getByTestId('confidence-badge')).toBeInTheDocument()
    expect(screen.getByText('HIGH')).toBeInTheDocument()
    expect(screen.getByText('92%')).toBeInTheDocument()
  })

  it('renders medium tier with correct label', () => {
    render(<ConfidenceBadge score={0.72} tier="medium" />)
    expect(screen.getByText('MED')).toBeInTheDocument()
    expect(screen.getByText('72%')).toBeInTheDocument()
  })

  it('renders low tier with correct label', () => {
    render(<ConfidenceBadge score={0.3} tier="low" />)
    expect(screen.getByText('LOW')).toBeInTheDocument()
    expect(screen.getByText('30%')).toBeInTheDocument()
  })

  it('applies green classes for high tier', () => {
    render(<ConfidenceBadge score={0.9} tier="high" />)
    const badge = screen.getByTestId('confidence-badge')
    expect(badge.className).toMatch(/emerald/)
  })

  it('applies amber classes for medium tier', () => {
    render(<ConfidenceBadge score={0.7} tier="medium" />)
    const badge = screen.getByTestId('confidence-badge')
    expect(badge.className).toMatch(/amber/)
  })

  it('applies red classes for low tier', () => {
    render(<ConfidenceBadge score={0.3} tier="low" />)
    const badge = screen.getByTestId('confidence-badge')
    expect(badge.className).toMatch(/red/)
  })

  it('supports sm size variant', () => {
    render(<ConfidenceBadge score={0.9} tier="high" size="sm" />)
    const badge = screen.getByTestId('confidence-badge')
    expect(badge.className).toMatch(/text-xs/)
  })

  it('defaults to md size', () => {
    render(<ConfidenceBadge score={0.9} tier="high" />)
    const badge = screen.getByTestId('confidence-badge')
    expect(badge.className).toMatch(/text-sm/)
  })

  it('renders not_found tier as N/A without percentage', () => {
    render(<ConfidenceBadge score={0.0} tier="not_found" />)
    expect(screen.getByText('N/A')).toBeInTheDocument()
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
  })

  it('applies muted classes for not_found tier', () => {
    render(<ConfidenceBadge score={0.0} tier="not_found" />)
    const badge = screen.getByTestId('confidence-badge')
    expect(badge.className).toMatch(/muted/)
  })

  it('right-aligns confidence help for narrow result rows', async () => {
    const user = userEvent.setup()
    render(<ConfidenceBadge score={0.92} tier="high" />)

    await user.click(screen.getByRole('button', { name: 'What does confidence mean?' }))

    expect(screen.getByRole('tooltip')).toHaveClass('right-0')
    expect(screen.getByRole('tooltip')).toHaveClass('max-w-[calc(100vw-2rem)]')
  })
})

// ============================================================
// FieldRow tests
// ============================================================
describe('FieldRow', () => {
  it('renders field label from FIELD_LABELS', () => {
    const fieldData: ExtractionFieldValue = { value: 'Acme Corp' }
    const confidence: ConfidenceScoreEntry = { score: 0.92, tier: 'high' }
    render(
      <FieldRow
        fieldName="tenant_legal_name"
        fieldData={fieldData}
        confidence={confidence}
      />,
    )
    expect(screen.getByText('Tenant Name')).toBeInTheDocument()
  })

  it('renders formatted string value', () => {
    const fieldData: ExtractionFieldValue = { value: 'Acme Corp' }
    render(
      <FieldRow
        fieldName="tenant_legal_name"
        fieldData={fieldData}
        confidence={undefined}
      />,
    )
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
  })

  it('renders editable values as labeled buttons', async () => {
    const user = userEvent.setup()
    const handleEdit = vi.fn()
    const fieldData: ExtractionFieldValue = { value: 'Acme Corp' }

    render(
      <FieldRow
        fieldName="tenant_legal_name"
        fieldData={fieldData}
        confidence={undefined}
        onEdit={handleEdit}
      />,
    )

    const editButton = screen.getByRole('button', {
      name: 'Edit Tenant Name value',
    })
    expect(editButton).toHaveTextContent('Acme Corp')

    await user.click(editButton)
    expect(handleEdit).toHaveBeenCalledOnce()
  })

  it('renders "Not found in lease" for undefined fieldData', () => {
    render(
      <FieldRow
        fieldName="tenant_legal_name"
        fieldData={undefined}
        confidence={undefined}
      />,
    )
    expect(screen.getByText('Not found in lease')).toBeInTheDocument()
  })

  it('renders "Not found in lease" for null value', () => {
    const fieldData: ExtractionFieldValue = { value: null }
    render(
      <FieldRow
        fieldName="tenant_legal_name"
        fieldData={fieldData}
        confidence={undefined}
      />,
    )
    expect(screen.getByText('Not found in lease')).toBeInTheDocument()
  })

  it('renders boolean true as "Yes"', () => {
    const fieldData: ExtractionFieldValue = { value: true }
    render(
      <FieldRow
        fieldName="waiver_of_subrogation"
        fieldData={fieldData}
        confidence={undefined}
      />,
    )
    expect(screen.getByText('Yes')).toBeInTheDocument()
  })

  it('renders boolean false as "No"', () => {
    const fieldData: ExtractionFieldValue = { value: false }
    render(
      <FieldRow
        fieldName="waiver_of_subrogation"
        fieldData={fieldData}
        confidence={undefined}
      />,
    )
    expect(screen.getByText('No')).toBeInTheDocument()
  })

  it('renders array values joined with commas', () => {
    const fieldData: ExtractionFieldValue = {
      value: ['Snow removal', 'Landscaping'],
    }
    render(
      <FieldRow
        fieldName="cam_exclusions"
        fieldData={fieldData}
        confidence={undefined}
      />,
    )
    expect(screen.getByText('Snow removal, Landscaping')).toBeInTheDocument()
  })

  it('shows confidence badge with correct tier', () => {
    const fieldData: ExtractionFieldValue = { value: 'Acme Corp' }
    const confidence: ConfidenceScoreEntry = { score: 0.92, tier: 'high' }
    render(
      <FieldRow
        fieldName="tenant_legal_name"
        fieldData={fieldData}
        confidence={confidence}
      />,
    )
    expect(screen.getByTestId('confidence-badge')).toBeInTheDocument()
    expect(screen.getByText('HIGH')).toBeInTheDocument()
    expect(screen.getByText('92%')).toBeInTheDocument()
  })

  it('does not show confidence badge when confidence is undefined', () => {
    const fieldData: ExtractionFieldValue = { value: 'Acme Corp' }
    render(
      <FieldRow
        fieldName="tenant_legal_name"
        fieldData={fieldData}
        confidence={undefined}
      />,
    )
    expect(screen.queryByTestId('confidence-badge')).not.toBeInTheDocument()
  })

  it('shows source text indicator when source_text present', () => {
    const fieldData: ExtractionFieldValue = {
      value: 'Acme Corp',
      source_text: 'The Tenant shall be Acme Corp...',
    }
    render(
      <FieldRow
        fieldName="tenant_legal_name"
        fieldData={fieldData}
        confidence={undefined}
      />,
    )
    expect(screen.getByTestId('source-text-trigger')).toBeInTheDocument()
  })

  it('renders source text trigger as a labeled button', () => {
    const fieldData: ExtractionFieldValue = {
      value: 'Acme Corp',
      source_text: 'The Tenant shall be Acme Corp...',
    }
    render(
      <FieldRow
        fieldName="tenant_legal_name"
        fieldData={fieldData}
        confidence={undefined}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'View source text for Tenant Name' }),
    ).toBe(screen.getByTestId('source-text-trigger'))
  })

  it('wraps long field values and source excerpts safely', async () => {
    const user = userEvent.setup()
    const fieldData: ExtractionFieldValue = {
      value: 'TenantLegalNameWithoutNaturalBreaksThatShouldNotOverflowTheResultsColumn',
      source_text:
        'ThisIsAVeryLongSourceExcerptWithoutSpacesThatShouldWrapInsideTheTooltipInsteadOfOverflowingTheViewport',
    }
    render(
      <FieldRow
        fieldName="tenant_legal_name"
        fieldData={fieldData}
        confidence={undefined}
      />,
    )

    const value = screen.getByText(
      'TenantLegalNameWithoutNaturalBreaksThatShouldNotOverflowTheResultsColumn',
    )
    expect(value).toHaveClass('min-w-0')
    expect(value).toHaveClass('break-words')

    await user.hover(screen.getByTestId('source-text-trigger'))
    const tooltip = screen.getByTestId('source-text-tooltip')
    expect(tooltip).toHaveClass('max-w-[calc(100vw-2rem)]')
    expect(tooltip).toHaveClass('break-words')
  })

  it('does not show source text indicator when source_text absent', () => {
    const fieldData: ExtractionFieldValue = { value: 'Acme Corp' }
    render(
      <FieldRow
        fieldName="tenant_legal_name"
        fieldData={fieldData}
        confidence={undefined}
      />,
    )
    expect(
      screen.queryByTestId('source-text-trigger'),
    ).not.toBeInTheDocument()
  })

  it('shows source text content on hover', async () => {
    const user = userEvent.setup()
    const fieldData: ExtractionFieldValue = {
      value: 'Acme Corp',
      source_text: 'The Tenant shall be Acme Corp...',
    }
    render(
      <FieldRow
        fieldName="tenant_legal_name"
        fieldData={fieldData}
        confidence={undefined}
      />,
    )
    const trigger = screen.getByTestId('source-text-trigger')
    await user.hover(trigger)
    expect(
      screen.getByText('The Tenant shall be Acme Corp...'),
    ).toBeInTheDocument()
  })

  it('uses field name as fallback label for unknown fields', () => {
    const fieldData: ExtractionFieldValue = { value: 'test' }
    render(
      <FieldRow
        fieldName="unknown_field_xyz"
        fieldData={fieldData}
        confidence={undefined}
      />,
    )
    expect(screen.getByText('unknown_field_xyz')).toBeInTheDocument()
  })

  it('hides source text tooltip on mouse leave', async () => {
    const user = userEvent.setup()
    const fieldData: ExtractionFieldValue = {
      value: 'Acme Corp',
      source_text: 'The Tenant shall be Acme Corp...',
    }
    render(
      <FieldRow
        fieldName="tenant_legal_name"
        fieldData={fieldData}
        confidence={undefined}
      />,
    )
    const trigger = screen.getByTestId('source-text-trigger')
    await user.hover(trigger)
    expect(
      screen.getByText('The Tenant shall be Acme Corp...'),
    ).toBeInTheDocument()
    await user.unhover(trigger)
    expect(
      screen.queryByText('The Tenant shall be Acme Corp...'),
    ).not.toBeInTheDocument()
  })
})
