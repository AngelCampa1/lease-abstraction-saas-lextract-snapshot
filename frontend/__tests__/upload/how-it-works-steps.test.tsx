import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HowItWorksSteps } from '@/components/upload/how-it-works-steps'

describe('HowItWorksSteps', () => {
  it('renders all 4 step labels', () => {
    render(<HowItWorksSteps />)
    expect(screen.getByText('Upload')).toBeInTheDocument()
    expect(screen.getByText('126 fields')).toBeInTheDocument()
    expect(screen.getByText('Preview')).toBeInTheDocument()
    expect(screen.getByText('$15')).toBeInTheDocument()
  })

  it('renders 4 step number circles (1, 2, 3, 4)', () => {
    render(<HowItWorksSteps />)
    expect(screen.getByTestId('step-circle-1')).toHaveTextContent('1')
    expect(screen.getByTestId('step-circle-2')).toHaveTextContent('2')
    expect(screen.getByTestId('step-circle-3')).toHaveTextContent('3')
    expect(screen.getByTestId('step-circle-4')).toHaveTextContent('4')
  })

  it('renders hidden separator arrows between steps', () => {
    render(<HowItWorksSteps />)
    const arrows = screen.getAllByTestId('step-arrow')
    expect(arrows).toHaveLength(3)
    arrows.forEach((arrow) => {
      expect(arrow).toHaveAttribute('aria-hidden', 'true')
      expect(arrow).toHaveTextContent('>')
    })
  })

  it('renders $15 with font emphasis', () => {
    render(<HowItWorksSteps />)
    expect(screen.getByText('$15')).toBeInTheDocument()
  })
})
