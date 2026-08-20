import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UploadProgress } from '@/components/upload/upload-progress'
import { DashboardSkeleton } from '@/components/skeletons'

vi.mock('motion/react', () => ({
  motion: {
    div: ({
      children,
      'data-testid': testId,
      className,
      style,
    }: Record<string, unknown>) => {
      const props: Record<string, unknown> = {}
      if (testId) props['data-testid'] = testId
      if (className) props['className'] = className
      if (style) props['style'] = style
      return <div {...props}>{children as React.ReactNode}</div>
    },
  },
}))

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}

describe('ARIA live regions', () => {
  it('UploadProgress has aria-live polite', () => {
    renderWithClient(<UploadProgress fileName="test.pdf" progress={50} />)
    const progressContainer = screen.getByTestId('upload-progress')
    expect(progressContainer).toHaveAttribute('aria-live', 'polite')
  })

  it('UploadProgress displays file name and percentage', () => {
    renderWithClient(<UploadProgress fileName="lease.pdf" progress={75} />)
    expect(screen.getByTestId('upload-file-name')).toHaveTextContent('lease.pdf')
    expect(screen.getByTestId('upload-percentage')).toHaveTextContent('75%')
  })

  it('UploadProgress clamps progress to 0-100', () => {
    renderWithClient(<UploadProgress fileName="test.pdf" progress={150} />)
    expect(screen.getByTestId('upload-percentage')).toHaveTextContent('100%')
  })

  it('skeleton components have role=status for screen readers', () => {
    const { container } = render(<DashboardSkeleton />)
    const statusElement = container.querySelector('[role="status"]')
    expect(statusElement).toBeInTheDocument()
  })
})
