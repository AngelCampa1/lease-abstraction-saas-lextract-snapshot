import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EditableFieldRow } from '@/components/results/editable-field-row'
import { PdfToolbar } from '@/components/results/pdf-toolbar'
import type { ExtractionFieldValue, ConfidenceScoreEntry } from '@/types/extraction'

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

const mockMutateAsync = vi.fn()

vi.mock('@/hooks/use-field-edit', () => ({
  useFieldEdit: () => ({
    mutate: vi.fn(),
    mutateAsync: mockMutateAsync,
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
  }),
}))

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

describe('Keyboard navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMutateAsync.mockResolvedValue({
      extraction_id: 'ext-1',
      field_name: 'tenant_legal_name',
      original_value: 'Acme Corp',
      edited_value: 'New Tenant',
      red_flags: [],
    })
  })

  describe('EditableFieldRow keyboard support', () => {
    it('Enter key on clickable value enters edit mode', async () => {
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
      valueArea.focus()
      await user.keyboard('{Enter}')
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('Space key on clickable value enters edit mode', async () => {
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
      valueArea.focus()
      await user.keyboard(' ')
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('focus returns to clickable value after cancel', async () => {
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
      await waitFor(() => {
        expect(screen.getByTestId('field-value-clickable')).toHaveFocus()
      })
    })

    it('focus returns to clickable value after save', async () => {
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
      const input = screen.getByRole('textbox')
      await user.clear(input)
      await user.type(input, 'New Tenant{Enter}')
      await waitFor(() => {
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      })
      await waitFor(() => {
        expect(screen.getByTestId('field-value-clickable')).toHaveFocus()
      })
    })

    it('editable field row uses native button semantics for keyboard access', () => {
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
      expect(
        screen.getByRole('button', { name: 'Edit Tenant Name value' }),
      ).toBe(screen.getByTestId('field-value-clickable'))
    })
  })

  describe('PdfToolbar keyboard shortcuts', () => {
    it('ArrowLeft triggers previous page', async () => {
      const user = userEvent.setup()
      const onPageChange = vi.fn()
      render(
        <PdfToolbar
          currentPage={3}
          totalPages={10}
          scale={1}
          onPageChange={onPageChange}
          onScaleChange={vi.fn()}
          onFitToWidth={vi.fn()}
        />,
      )
      await user.keyboard('{ArrowLeft}')
      expect(onPageChange).toHaveBeenCalledWith(2)
    })

    it('ArrowRight triggers next page', async () => {
      const user = userEvent.setup()
      const onPageChange = vi.fn()
      render(
        <PdfToolbar
          currentPage={3}
          totalPages={10}
          scale={1}
          onPageChange={onPageChange}
          onScaleChange={vi.fn()}
          onFitToWidth={vi.fn()}
        />,
      )
      await user.keyboard('{ArrowRight}')
      expect(onPageChange).toHaveBeenCalledWith(4)
    })

    it('ArrowLeft does not fire on first page', async () => {
      const user = userEvent.setup()
      const onPageChange = vi.fn()
      render(
        <PdfToolbar
          currentPage={1}
          totalPages={10}
          scale={1}
          onPageChange={onPageChange}
          onScaleChange={vi.fn()}
          onFitToWidth={vi.fn()}
        />,
      )
      await user.keyboard('{ArrowLeft}')
      expect(onPageChange).not.toHaveBeenCalled()
    })

    it('ArrowRight does not fire on last page', async () => {
      const user = userEvent.setup()
      const onPageChange = vi.fn()
      render(
        <PdfToolbar
          currentPage={10}
          totalPages={10}
          scale={1}
          onPageChange={onPageChange}
          onScaleChange={vi.fn()}
          onFitToWidth={vi.fn()}
        />,
      )
      await user.keyboard('{ArrowRight}')
      expect(onPageChange).not.toHaveBeenCalled()
    })

    it('all toolbar buttons have aria-labels', () => {
      render(
        <PdfToolbar
          currentPage={1}
          totalPages={10}
          scale={1}
          onPageChange={vi.fn()}
          onScaleChange={vi.fn()}
          onFitToWidth={vi.fn()}
        />,
      )
      expect(screen.getByLabelText('Previous page')).toBeInTheDocument()
      expect(screen.getByLabelText('Next page')).toBeInTheDocument()
      expect(screen.getByLabelText('Zoom out')).toBeInTheDocument()
      expect(screen.getByLabelText('Zoom in')).toBeInTheDocument()
      expect(screen.getByLabelText('Fit to width')).toBeInTheDocument()
    })
  })
})
