import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimeEstimate } from '@/components/processing/time-estimate'

describe('TimeEstimate', () => {
  it('shows uploading message for uploading status', () => {
    render(<TimeEstimate status="uploading" />)
    expect(screen.getByText('Uploading your document...')).toBeInTheDocument()
  })

  it('shows extracting message without page count for extracting status', () => {
    render(<TimeEstimate status="extracting" />)
    expect(
      screen.getByText(/reading the lease document/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/depending on document length/i)
    ).toBeInTheDocument()
  })

  it('shows extracting message with page count when pageCount is provided', () => {
    render(<TimeEstimate status="extracting" pageCount={12} />)
    expect(
      screen.getByText(/reading 12 pages/i)
    ).toBeInTheDocument()
  })

  it('does not show page count when pageCount is null', () => {
    render(<TimeEstimate status="extracting" pageCount={null} />)
    expect(
      screen.getByText(/depending on document length/i)
    ).toBeInTheDocument()
  })

  it('does not show page count when pageCount is 0', () => {
    render(<TimeEstimate status="extracting" pageCount={0} />)
    expect(
      screen.getByText(/depending on document length/i)
    ).toBeInTheDocument()
  })

  it('shows scoring message for scoring status', () => {
    render(<TimeEstimate status="scoring" />)
    expect(
      screen.getByText('Running final quality checks...')
    ).toBeInTheDocument()
  })

  it('returns null when status is complete', () => {
    const { container } = render(<TimeEstimate status="complete" />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when status is failed', () => {
    const { container } = render(<TimeEstimate status="failed" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a pulsing dot indicator', () => {
    render(<TimeEstimate status="uploading" />)
    const dot = document.querySelector('.animate-pulse')
    expect(dot).toBeInTheDocument()
  })

  it('does not render countdown or timer', () => {
    render(<TimeEstimate status="extracting" />)
    expect(screen.queryByText(/estimated time/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/~\d+s/)).not.toBeInTheDocument()
  })
})
