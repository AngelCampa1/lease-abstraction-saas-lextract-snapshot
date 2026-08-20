import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PdfToolbar } from '@/components/results/pdf-toolbar'

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
}))

describe('PdfToolbar audit affordances', () => {
  it('wraps toolbar controls and keeps icon buttons at least 44px square', () => {
    render(
      <PdfToolbar
        currentPage={2}
        totalPages={5}
        scale={1}
        onPageChange={vi.fn()}
        onScaleChange={vi.fn()}
        onFitToWidth={vi.fn()}
      />,
    )

    expect(screen.getByTestId('pdf-toolbar')).toHaveClass('flex-wrap')
    expect(screen.getByRole('button', { name: 'Previous page' })).toHaveClass(
      'min-h-11',
    )
    expect(screen.getByRole('button', { name: 'Previous page' })).toHaveClass(
      'min-w-11',
    )
    expect(screen.getByRole('button', { name: 'Fit to width' })).toHaveClass(
      'min-h-11',
    )
  })
})
