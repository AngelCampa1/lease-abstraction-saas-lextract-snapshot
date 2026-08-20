import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EditableFieldRow } from '@/components/results/editable-field-row'
import { ApiError } from '@/lib/api'
import { toast } from 'sonner'
import type { ExtractionFieldValue, ConfidenceScoreEntry } from '@/types/extraction'

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
        if (key.startsWith('data-') || key === 'onClick' || key === 'role') props[key] = val
      }
      return <div {...props}>{children as React.ReactNode}</div>
    },
    span: ({
      children,
      'data-testid': testId,
      className,
      ...rest
    }: Record<string, unknown>) => {
      const props: Record<string, unknown> = {}
      if (testId) props['data-testid'] = testId
      if (className) props['className'] = className
      for (const [key, val] of Object.entries(rest)) {
        if (
          key.startsWith('data-') ||
          ['onClick', 'onKeyDown', 'role', 'tabIndex'].includes(key)
        ) {
          props[key] = val
        }
      }
      return <span {...props}>{children as React.ReactNode}</span>
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))

// Mock the useFieldEdit hook
const mockMutate = vi.fn()
const mockMutateAsync = vi.fn()
let mockIsPending = false

vi.mock('@/hooks/use-field-edit', () => ({
  useFieldEdit: () => ({
    mutate: mockMutate,
    mutateAsync: mockMutateAsync,
    isPending: mockIsPending,
    isError: false,
    error: null,
    reset: vi.fn(),
  }),
}))

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function renderWithClient(ui: React.ReactElement) {
  const queryClient = createQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}

const defaultFieldData: ExtractionFieldValue = { value: 'Acme Corp' }
const defaultConfidence: ConfidenceScoreEntry = { score: 0.92, tier: 'high' }

describe('EditableFieldRow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsPending = false
    mockMutateAsync.mockResolvedValue({
      extraction_id: 'ext-1',
      field_name: 'tenant_legal_name',
      original_value: 'Acme Corp',
      edited_value: 'New Tenant',
      red_flags: [],
    })
  })

  it('renders read-only by default', () => {
    renderWithClient(
      <EditableFieldRow
        fieldName="tenant_legal_name"
        fieldData={defaultFieldData}
        confidence={defaultConfidence}
        extractionId="ext-1"
        isEditable={false}
        isEdited={false}
        onEditComplete={vi.fn()}
      />,
    )
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('shows pencil icon on hover when editable', async () => {
    const user = userEvent.setup()
    renderWithClient(
      <EditableFieldRow
        fieldName="tenant_legal_name"
        fieldData={defaultFieldData}
        confidence={defaultConfidence}
        extractionId="ext-1"
        isEditable={true}
        isEdited={false}
        onEditComplete={vi.fn()}
      />,
    )
    const row = screen.getByTestId('editable-field-row')
    await user.hover(row)
    expect(screen.getByTestId('pencil-icon')).toBeInTheDocument()
  })

  it('does not show pencil icon when not editable', () => {
    renderWithClient(
      <EditableFieldRow
        fieldName="tenant_legal_name"
        fieldData={defaultFieldData}
        confidence={defaultConfidence}
        extractionId="ext-1"
        isEditable={false}
        isEdited={false}
        onEditComplete={vi.fn()}
      />,
    )
    expect(screen.queryByTestId('pencil-icon')).not.toBeInTheDocument()
  })

  it('clicking value enters edit mode', async () => {
    const user = userEvent.setup()
    renderWithClient(
      <EditableFieldRow
        fieldName="tenant_legal_name"
        fieldData={defaultFieldData}
        confidence={defaultConfidence}
        extractionId="ext-1"
        isEditable={true}
        isEdited={false}
        onEditComplete={vi.fn()}
      />,
    )
    const valueArea = screen.getByTestId('field-value-clickable')
    await user.click(valueArea)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('Enter saves and exits edit mode', async () => {
    const user = userEvent.setup()
    const onEditComplete = vi.fn()
    renderWithClient(
      <EditableFieldRow
        fieldName="tenant_legal_name"
        fieldData={defaultFieldData}
        confidence={defaultConfidence}
        extractionId="ext-1"
        isEditable={true}
        isEdited={false}
        onEditComplete={onEditComplete}
      />,
    )
    const valueArea = screen.getByTestId('field-value-clickable')
    await user.click(valueArea)
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'New Tenant{Enter}')
    expect(mockMutateAsync).toHaveBeenCalledWith({
      field_name: 'tenant_legal_name',
      value: 'New Tenant',
    })
  })

  it('Escape cancels and exits edit mode', async () => {
    const user = userEvent.setup()
    renderWithClient(
      <EditableFieldRow
        fieldName="tenant_legal_name"
        fieldData={defaultFieldData}
        confidence={defaultConfidence}
        extractionId="ext-1"
        isEditable={true}
        isEdited={false}
        onEditComplete={vi.fn()}
      />,
    )
    const valueArea = screen.getByTestId('field-value-clickable')
    await user.click(valueArea)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
  })

  it('shows "edited" badge for previously edited fields', () => {
    renderWithClient(
      <EditableFieldRow
        fieldName="tenant_legal_name"
        fieldData={defaultFieldData}
        confidence={defaultConfidence}
        extractionId="ext-1"
        isEditable={true}
        isEdited={true}
        onEditComplete={vi.fn()}
      />,
    )
    expect(screen.getByTestId('edited-badge')).toBeInTheDocument()
    expect(screen.getByText('edited')).toBeInTheDocument()
  })

  it('does not show "edited" badge for non-edited fields', () => {
    renderWithClient(
      <EditableFieldRow
        fieldName="tenant_legal_name"
        fieldData={defaultFieldData}
        confidence={defaultConfidence}
        extractionId="ext-1"
        isEditable={true}
        isEdited={false}
        onEditComplete={vi.fn()}
      />,
    )
    expect(screen.queryByTestId('edited-badge')).not.toBeInTheDocument()
  })

  it('shows loading indicator during save', async () => {
    const user = userEvent.setup()
    mockIsPending = true
    mockMutateAsync.mockReturnValue(new Promise(() => {})) // never resolves
    renderWithClient(
      <EditableFieldRow
        fieldName="tenant_legal_name"
        fieldData={defaultFieldData}
        confidence={defaultConfidence}
        extractionId="ext-1"
        isEditable={true}
        isEdited={false}
        onEditComplete={vi.fn()}
      />,
    )
    const valueArea = screen.getByTestId('field-value-clickable')
    await user.click(valueArea)
    // isPending is true from mock, so spinner should render
    expect(screen.getByTestId('save-spinner')).toBeInTheDocument()
  })

  it('reverts on save failure', async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockRejectedValue(new Error('Save failed'))
    renderWithClient(
      <EditableFieldRow
        fieldName="tenant_legal_name"
        fieldData={defaultFieldData}
        confidence={defaultConfidence}
        extractionId="ext-1"
        isEditable={true}
        isEdited={false}
        onEditComplete={vi.fn()}
      />,
    )
    const valueArea = screen.getByTestId('field-value-clickable')
    await user.click(valueArea)
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'New Tenant{Enter}')
    await waitFor(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
    // After failure, original value should be displayed
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
  })

  it('shows a distinct conflict message and NOT the generic one on 409', async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockRejectedValue(
      new ApiError(409, 'Field was modified concurrently'),
    )
    renderWithClient(
      <EditableFieldRow
        fieldName="tenant_legal_name"
        fieldData={defaultFieldData}
        confidence={defaultConfidence}
        extractionId="ext-1"
        isEditable={true}
        isEdited={false}
        onEditComplete={vi.fn()}
      />,
    )
    const valueArea = screen.getByTestId('field-value-clickable')
    await user.click(valueArea)
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'New Tenant{Enter}')

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "This field was just changed by someone else. We've refreshed it - please re-apply your edit if needed.",
      )
    })
    expect(toast.error).not.toHaveBeenCalledWith('Failed to save Tenant Name')
  })

  it('shows the generic message on a non-409 failure', async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockRejectedValue(new ApiError(500, 'Server exploded'))
    renderWithClient(
      <EditableFieldRow
        fieldName="tenant_legal_name"
        fieldData={defaultFieldData}
        confidence={defaultConfidence}
        extractionId="ext-1"
        isEditable={true}
        isEdited={false}
        onEditComplete={vi.fn()}
      />,
    )
    const valueArea = screen.getByTestId('field-value-clickable')
    await user.click(valueArea)
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'New Tenant{Enter}')

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to save Tenant Name')
    })
    expect(toast.error).not.toHaveBeenCalledWith(
      "This field was just changed by someone else. We've refreshed it - please re-apply your edit if needed.",
    )
  })

  it('shows the distinct conflict message when revert hits a 409', async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockRejectedValue(
      new ApiError(409, 'Field was modified concurrently'),
    )
    renderWithClient(
      <EditableFieldRow
        fieldName="tenant_legal_name"
        fieldData={defaultFieldData}
        confidence={defaultConfidence}
        extractionId="ext-1"
        isEditable={true}
        isEdited={true}
        originalValue="Original AI Value"
        onEditComplete={vi.fn()}
      />,
    )
    await user.click(screen.getByTestId('revert-button'))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "This field was just changed by someone else. We've refreshed it - please re-apply your edit if needed.",
      )
    })
    expect(toast.error).not.toHaveBeenCalledWith('Failed to revert Tenant Name')
  })

  it('shows "Revert to AI value" button for edited fields', () => {
    renderWithClient(
      <EditableFieldRow
        fieldName="tenant_legal_name"
        fieldData={defaultFieldData}
        confidence={defaultConfidence}
        extractionId="ext-1"
        isEditable={true}
        isEdited={true}
        originalValue="Original AI Value"
        onEditComplete={vi.fn()}
      />,
    )
    expect(screen.getByTestId('revert-button')).toBeInTheDocument()
    expect(screen.getByText('Revert to AI value')).toBeInTheDocument()
  })

  it('does not show "Revert to AI value" button for non-edited fields', () => {
    renderWithClient(
      <EditableFieldRow
        fieldName="tenant_legal_name"
        fieldData={defaultFieldData}
        confidence={defaultConfidence}
        extractionId="ext-1"
        isEditable={true}
        isEdited={false}
        onEditComplete={vi.fn()}
      />,
    )
    expect(screen.queryByTestId('revert-button')).not.toBeInTheDocument()
  })

  it('clicking revert button calls mutateAsync with original value', async () => {
    const user = userEvent.setup()
    renderWithClient(
      <EditableFieldRow
        fieldName="tenant_legal_name"
        fieldData={defaultFieldData}
        confidence={defaultConfidence}
        extractionId="ext-1"
        isEditable={true}
        isEdited={true}
        originalValue="Original AI Value"
        onEditComplete={vi.fn()}
      />,
    )
    const revertButton = screen.getByTestId('revert-button')
    await user.click(revertButton)
    expect(mockMutateAsync).toHaveBeenCalledWith({
      field_name: 'tenant_legal_name',
      value: 'Original AI Value',
    })
  })

  it('does not enter edit mode when not editable and clicked', async () => {
    const user = userEvent.setup()
    renderWithClient(
      <EditableFieldRow
        fieldName="tenant_legal_name"
        fieldData={defaultFieldData}
        confidence={defaultConfidence}
        extractionId="ext-1"
        isEditable={false}
        isEdited={false}
        onEditComplete={vi.fn()}
      />,
    )
    const valueArea = screen.getByTestId('field-value-display')
    await user.click(valueArea)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('renders confidence badge', () => {
    renderWithClient(
      <EditableFieldRow
        fieldName="tenant_legal_name"
        fieldData={defaultFieldData}
        confidence={defaultConfidence}
        extractionId="ext-1"
        isEditable={false}
        isEdited={false}
        onEditComplete={vi.fn()}
      />,
    )
    expect(screen.getByTestId('confidence-badge')).toBeInTheDocument()
  })

  it('opens source text detail with Space key', async () => {
    const onFieldClick = vi.fn()
    renderWithClient(
      <EditableFieldRow
        fieldName="tenant_legal_name"
        fieldData={{ value: 'Acme Corp', source_text: 'Tenant: Acme Corp' }}
        confidence={defaultConfidence}
        extractionId="ext-1"
        isEditable={false}
        isEdited={false}
        onEditComplete={vi.fn()}
        onFieldClick={onFieldClick}
      />,
    )

    fireEvent.keyDown(screen.getByTestId('source-text-trigger'), { key: ' ' })

    expect(onFieldClick).toHaveBeenCalledWith('tenant_legal_name', 'Tenant: Acme Corp')
  })

  it('hides the source tooltip on mouse leave and blur', async () => {
    const user = userEvent.setup()
    renderWithClient(
      <EditableFieldRow
        fieldName="tenant_legal_name"
        fieldData={{ value: 'Acme Corp', source_text: 'Tenant: Acme Corp' }}
        confidence={defaultConfidence}
        extractionId="ext-1"
        isEditable={false}
        isEdited={false}
        onEditComplete={vi.fn()}
      />,
    )
    const trigger = screen.getByTestId('source-text-trigger')

    await user.hover(trigger)
    expect(screen.getByTestId('source-text-tooltip')).toBeInTheDocument()

    await user.unhover(trigger)
    expect(screen.queryByTestId('source-text-tooltip')).not.toBeInTheDocument()

    fireEvent.focus(trigger)
    expect(screen.getByTestId('source-text-tooltip')).toBeInTheDocument()

    fireEvent.blur(trigger)
    expect(screen.queryByTestId('source-text-tooltip')).not.toBeInTheDocument()
  })

  it('does not throw when source trigger is clicked without an onFieldClick handler', async () => {
    const user = userEvent.setup()
    renderWithClient(
      <EditableFieldRow
        fieldName="tenant_legal_name"
        fieldData={{ value: 'Acme Corp', source_text: 'Tenant: Acme Corp' }}
        confidence={defaultConfidence}
        extractionId="ext-1"
        isEditable={false}
        isEdited={false}
        onEditComplete={vi.fn()}
      />,
    )
    const trigger = screen.getByTestId('source-text-trigger')
    await user.click(trigger)
    fireEvent.keyDown(trigger, { key: 'Enter' })
    // No handler provided — interaction is a no-op and the row stays rendered.
    expect(screen.getByTestId('editable-field-row')).toBeInTheDocument()
  })

  it('renders editable source text trigger as a labeled button', () => {
    renderWithClient(
      <EditableFieldRow
        fieldName="tenant_legal_name"
        fieldData={{ value: 'Acme Corp', source_text: 'Tenant: Acme Corp' }}
        confidence={defaultConfidence}
        extractionId="ext-1"
        isEditable={true}
        isEdited={false}
        onEditComplete={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'View source text for Tenant Name' }),
    ).toBe(screen.getByTestId('source-text-trigger'))
  })

  it('wraps long editable values and source excerpts safely', async () => {
    const user = userEvent.setup()
    renderWithClient(
      <EditableFieldRow
        fieldName="tenant_legal_name"
        fieldData={{
          value: 'TenantLegalNameWithoutNaturalBreaksThatShouldNotOverflowTheResultsColumn',
          source_text:
            'ThisIsAVeryLongSourceExcerptWithoutSpacesThatShouldWrapInsideTheTooltipInsteadOfOverflowingTheViewport',
        }}
        confidence={defaultConfidence}
        extractionId="ext-1"
        isEditable={true}
        isEdited={false}
        onEditComplete={vi.fn()}
      />,
    )

    expect(screen.getByTestId('field-value-clickable')).toHaveClass('min-w-0')
    expect(screen.getByTestId('field-value-clickable')).toHaveClass('break-words')

    await user.hover(screen.getByTestId('source-text-trigger'))
    expect(screen.getByTestId('source-text-tooltip')).toHaveClass(
      'max-w-[calc(100vw-2rem)]',
    )
    expect(screen.getByTestId('source-text-tooltip')).toHaveClass('break-words')
  })

  it('renders field label', () => {
    renderWithClient(
      <EditableFieldRow
        fieldName="tenant_legal_name"
        fieldData={defaultFieldData}
        confidence={defaultConfidence}
        extractionId="ext-1"
        isEditable={false}
        isEdited={false}
        onEditComplete={vi.fn()}
      />,
    )
    expect(screen.getByText('Tenant Name')).toBeInTheDocument()
  })
})
