import React from 'react'
import { render, screen } from '@testing-library/react'
import { ContentCta } from '@/components/content/content-cta'

// Mock next/link to render a plain anchor tag
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string
    children: React.ReactNode
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

describe('ContentCta', () => {
  it('renders with default heading', () => {
    render(<ContentCta />)
    expect(
      screen.getByText('See this in your own lease')
    ).toBeInTheDocument()
  })

  it('renders with default description', () => {
    render(<ContentCta />)
    expect(
      screen.getByText(/Upload your lease PDF/)
    ).toBeInTheDocument()
  })

  it('renders default button text', () => {
    render(<ContentCta />)
    expect(screen.getByRole('link', { name: 'Get a free preview' })).toBeInTheDocument()
  })

  it('links to /upload by default', () => {
    render(<ContentCta />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/upload')
  })

  it('renders custom heading', () => {
    render(<ContentCta heading="Custom Heading" />)
    expect(screen.getByText('Custom Heading')).toBeInTheDocument()
  })

  it('renders custom description', () => {
    render(<ContentCta description="Custom description text" />)
    expect(screen.getByText('Custom description text')).toBeInTheDocument()
  })

  it('renders custom button text', () => {
    render(<ContentCta buttonText="Get Started" />)
    expect(screen.getByRole('link', { name: 'Get Started' })).toBeInTheDocument()
  })

  it('renders custom href', () => {
    render(<ContentCta href="/pricing" />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/pricing')
  })

  it('renders section element', () => {
    const { container } = render(<ContentCta />)
    const section = container.querySelector('section')
    expect(section).toBeInTheDocument()
  })

  it('renders h2 heading', () => {
    render(<ContentCta />)
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toBeInTheDocument()
  })
})
