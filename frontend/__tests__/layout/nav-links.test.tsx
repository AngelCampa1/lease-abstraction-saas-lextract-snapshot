import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NavLinks } from '@/components/layout/nav-links'

const mockPathname = vi.fn().mockReturnValue('/dashboard')

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}))

describe('NavLinks', () => {
  it('renders Dashboard and Upload links', () => {
    render(<NavLinks />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Upload')).toBeInTheDocument()
  })

  it('marks active link with aria-current="page"', () => {
    mockPathname.mockReturnValue('/dashboard')
    render(<NavLinks />)
    const dashboardLink = screen.getByText('Dashboard').closest('a')
    expect(dashboardLink).toHaveAttribute('aria-current', 'page')
    const uploadLink = screen.getByText('Upload').closest('a')
    expect(uploadLink).not.toHaveAttribute('aria-current')
  })

  it('applies active styling to current route', () => {
    mockPathname.mockReturnValue('/upload')
    render(<NavLinks />)
    const uploadLink = screen.getByText('Upload').closest('a')
    expect(uploadLink).toHaveAttribute('aria-current', 'page')
    expect(uploadLink).toHaveClass('bg-accent')
  })

  it('renders in vertical orientation', () => {
    render(<NavLinks orientation="vertical" />)
    const nav = screen.getByRole('navigation')
    expect(nav).toHaveClass('flex-col')
  })

  it('renders in horizontal orientation by default', () => {
    render(<NavLinks />)
    const nav = screen.getByRole('navigation')
    expect(nav).toHaveClass('flex-row')
  })

  it('calls onLinkClick when a link is clicked', () => {
    const onLinkClick = vi.fn()
    render(<NavLinks onLinkClick={onLinkClick} />)
    fireEvent.click(screen.getByText('Dashboard'))
    expect(onLinkClick).toHaveBeenCalledTimes(1)
  })

  it('has proper navigation aria label', () => {
    render(<NavLinks />)
    expect(screen.getByRole('navigation')).toHaveAttribute(
      'aria-label',
      'Main navigation'
    )
  })
})
