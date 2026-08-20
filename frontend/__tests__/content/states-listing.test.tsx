import React from 'react'
import { render, screen } from '@testing-library/react'
import { StateCard } from '@/components/content/state-card'
import type { StateLandlordTenantData } from '@/data/states'
import { stateData, getStateExcerpt } from '@/data/states'

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

const mockState: StateLandlordTenantData = stateData[0]

describe('StateCard', () => {
  it('renders state name', () => {
    render(<StateCard state={mockState} />)
    expect(screen.getByText('California')).toBeInTheDocument()
  })

  it('renders state code badge', () => {
    render(<StateCard state={mockState} />)
    expect(screen.getByText('CA')).toBeInTheDocument()
  })

  it('renders the excerpt from the overview', () => {
    render(<StateCard state={mockState} />)
    const excerpt = getStateExcerpt(mockState)
    expect(screen.getByText(excerpt)).toBeInTheDocument()
  })

  it('renders a link to the state page', () => {
    render(<StateCard state={mockState} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/resources/states/california')
  })

  it('renders "Learn more" text', () => {
    render(<StateCard state={mockState} />)
    expect(screen.getByText(/learn more/i)).toBeInTheDocument()
  })

  it('renders as an article element', () => {
    const { container } = render(<StateCard state={mockState} />)
    expect(container.querySelector('article')).toBeInTheDocument()
  })

  it('renders the regulatory stance from key facts', () => {
    render(<StateCard state={mockState} />)
    expect(screen.getByText('Tenant-Protective')).toBeInTheDocument()
  })

  it('renders all 10 state cards without errors', () => {
    for (const state of stateData) {
      const { unmount } = render(<StateCard state={state} />)
      expect(screen.getByText(state.state)).toBeInTheDocument()
      expect(screen.getByText(state.stateCode)).toBeInTheDocument()
      unmount()
    }
  })
})
