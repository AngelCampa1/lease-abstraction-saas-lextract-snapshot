import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FileValidation } from '@/components/upload/file-validation'

describe('FileValidation', () => {
  it('renders nothing when error is null', () => {
    const { container } = render(<FileValidation error={null} />)
    expect(container.textContent).toBe('')
    expect(screen.queryByTestId('file-validation-error')).not.toBeInTheDocument()
  })

  it('renders error message when error is provided', () => {
    render(<FileValidation error="Only PDF files are accepted." />)
    const alert = screen.getByTestId('file-validation-error')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent('Only PDF files are accepted.')
  })

  it('has role=alert for accessibility', () => {
    render(<FileValidation error="Something went wrong" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('renders with animation wrapper', () => {
    render(<FileValidation error="Error here" />)
    const alert = screen.getByTestId('file-validation-error')
    expect(alert).toBeInTheDocument()
  })
})
