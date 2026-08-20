import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageTransition } from '@/components/layout/page-transition'

describe('PageTransition', () => {
  it('renders children inside a motion wrapper', () => {
    render(
      <PageTransition>
        <div>Page content</div>
      </PageTransition>
    )
    expect(screen.getByText('Page content')).toBeInTheDocument()
    expect(screen.getByTestId('page-transition')).toBeInTheDocument()
  })

  it('wraps children in a container element', () => {
    render(
      <PageTransition>
        <p>Nested content</p>
      </PageTransition>
    )
    const wrapper = screen.getByTestId('page-transition')
    expect(wrapper).toContainElement(screen.getByText('Nested content'))
  })
})
