import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CreditBadge } from '@/components/layout/credit-badge'

describe('CreditBadge', () => {
  it('renders loading state', () => {
    render(<CreditBadge balance={undefined} loading />)
    expect(screen.getByTestId('credit-badge-loading')).toBeInTheDocument()
  })

  it('renders "Buy credits" CTA when balance is 0', () => {
    render(<CreditBadge balance={0} />)
    const badge = screen.getByTestId('credit-badge')
    expect(badge).toHaveTextContent('Buy credits')
    expect(badge).toHaveClass('text-primary')
  })

  it('renders positive balance without outline styling', () => {
    render(<CreditBadge balance={10} />)
    const badge = screen.getByTestId('credit-badge')
    expect(badge).toHaveTextContent('10 credits')
    expect(badge).not.toHaveClass('text-primary')
  })

  it('renders singular "credit" for balance of 1', () => {
    render(<CreditBadge balance={1} />)
    expect(screen.getByTestId('credit-badge')).toHaveTextContent('1 credit')
  })

  it('renders "Buy credits" when balance is undefined and not loading', () => {
    render(<CreditBadge balance={undefined} />)
    expect(screen.getByTestId('credit-badge')).toHaveTextContent('Buy credits')
  })
})
