import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RelatedResources } from '@/components/content/related-resources'

describe('RelatedResources', () => {
  it('renders nothing when links array is empty', () => {
    const { container } = render(<RelatedResources links={[]} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders heading and links', () => {
    const links = [
      { label: 'CAM Charges', href: '/glossary/cam-charges' },
      { label: 'Base Rent', href: '/fields/base-rent' },
    ]
    render(<RelatedResources links={links} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Related Resources')
    expect(screen.getByRole('link', { name: 'CAM Charges' })).toHaveAttribute('href', '/glossary/cam-charges')
    expect(screen.getByRole('link', { name: 'Base Rent' })).toHaveAttribute('href', '/fields/base-rent')
  })

  it('uses custom heading', () => {
    const links = [{ label: 'Test', href: '/test' }]
    render(<RelatedResources links={links} heading="Explore More" />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Explore More')
  })
})
