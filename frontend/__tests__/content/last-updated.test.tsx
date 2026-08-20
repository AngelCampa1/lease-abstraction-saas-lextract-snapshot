import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LastUpdated } from '@/components/content/last-updated'

describe('LastUpdated', () => {
  it('renders a time element with the correct dateTime attribute', () => {
    render(<LastUpdated date="2026-03-17" />)
    screen.getByRole('time')
    const el = document.querySelector('time')
    expect(el).not.toBeNull()
    expect(el?.getAttribute('dateTime')).toBe('2026-03-17')
  })

  it('displays "Last updated" prefix', () => {
    render(<LastUpdated date="2026-03-17" />)
    expect(screen.getByText(/Last updated/)).toBeTruthy()
  })

  it('formats a mid-month date to the exact display date', () => {
    render(<LastUpdated date="2026-03-17" />)
    expect(screen.getByText(/March 17, 2026/)).toBeTruthy()
  })

  it('formats the first day of a month without rolling back to the previous month', () => {
    // Guard against UTC-offset midnight rollback — '2026-03-01' without time suffix would be UTC
    // midnight and could display as February in negative-offset timezones.
    render(<LastUpdated date="2026-03-01" />)
    expect(screen.getByText(/March 1, 2026/)).toBeTruthy()
  })

  it('formats a December date correctly', () => {
    render(<LastUpdated date="2025-12-31" />)
    expect(screen.getByText(/December 31, 2025/)).toBeTruthy()
  })

  it('renders inside a paragraph with muted-foreground styling', () => {
    const { container } = render(<LastUpdated date="2026-03-17" />)
    const p = container.querySelector('p')
    expect(p).not.toBeNull()
    expect(p?.className).toContain('text-muted-foreground')
  })
})
