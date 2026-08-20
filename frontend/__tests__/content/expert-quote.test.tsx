import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ExpertQuote, ExpertQuotes } from '@/components/content/expert-quote'
import type { ExpertQuoteItem } from '@/lib/content-types'

const sampleQuote: ExpertQuoteItem = {
  quote: 'Tenant improvement allowances in Class A office markets have averaged $80 to $120 per square foot.',
  name: 'CBRE Research',
  title: 'North America Office Figures Q4 2025',
  organization: 'CBRE',
}

describe('ExpertQuote', () => {
  it('renders the quote text wrapped in curly quotes', () => {
    render(<ExpertQuote {...sampleQuote} />)
    expect(screen.getByText(/Tenant improvement allowances/)).toBeInTheDocument()
  })

  it('renders the name in a strong element', () => {
    render(<ExpertQuote {...sampleQuote} />)
    const strong = screen.getByText('CBRE Research')
    expect(strong.tagName).toBe('STRONG')
  })

  it('renders the title', () => {
    render(<ExpertQuote {...sampleQuote} />)
    expect(screen.getByText(/North America Office Figures Q4 2025/)).toBeInTheDocument()
  })

  it('renders the organization', () => {
    render(<ExpertQuote {...sampleQuote} />)
    expect(screen.getByText(/North America Office Figures Q4 2025, CBRE/)).toBeInTheDocument()
  })

  it('renders as a blockquote element', () => {
    const { container } = render(<ExpertQuote {...sampleQuote} />)
    expect(container.querySelector('blockquote')).not.toBeNull()
  })

  it('renders a footer element inside the blockquote', () => {
    const { container } = render(<ExpertQuote {...sampleQuote} />)
    expect(container.querySelector('blockquote footer')).not.toBeNull()
  })

  it('renders title and organization in the footer', () => {
    render(<ExpertQuote {...sampleQuote} />)
    const footer = screen.getByText(/North America Office Figures Q4 2025, CBRE/)
    expect(footer).toBeInTheDocument()
  })
})

describe('ExpertQuotes', () => {
  const quotes: ExpertQuoteItem[] = [
    sampleQuote,
    {
      quote: 'Manual lease abstraction by trained paralegals typically takes 4 to 8 hours per document.',
      name: 'CCIM Institute',
      title: 'Technology and the Commercial Lease Lifecycle',
      organization: 'CCIM Institute',
    },
  ]

  it('renders all quotes when array is non-empty', () => {
    render(<ExpertQuotes quotes={quotes} />)
    expect(screen.getByText(/Tenant improvement allowances/)).toBeInTheDocument()
    expect(screen.getByText(/Manual lease abstraction/)).toBeInTheDocument()
  })

  it('renders section heading "Industry Perspective"', () => {
    render(<ExpertQuotes quotes={quotes} />)
    expect(screen.getByText('Industry Perspective')).toBeInTheDocument()
  })

  it('returns null when quotes array is empty', () => {
    const { container } = render(<ExpertQuotes quotes={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders correct number of blockquotes', () => {
    const { container } = render(<ExpertQuotes quotes={quotes} />)
    expect(container.querySelectorAll('blockquote')).toHaveLength(2)
  })

  it('renders a single quote correctly', () => {
    const { container } = render(<ExpertQuotes quotes={[sampleQuote]} />)
    expect(container.querySelectorAll('blockquote')).toHaveLength(1)
    expect(screen.getByText('CBRE Research')).toBeInTheDocument()
  })
})
