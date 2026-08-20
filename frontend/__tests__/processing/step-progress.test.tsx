import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StepProgress, PIPELINE_STEPS } from '@/components/processing/step-progress'

vi.mock('motion/react', () => ({
  motion: {
    div: ({
      children,
      'data-testid': testId,
      className,
      ...rest
    }: Record<string, unknown>) => {
      const props: Record<string, unknown> = {}
      if (testId) props['data-testid'] = testId
      if (className) props['className'] = className
      // Capture animate width for progress bar testing
      const animate = rest.animate as Record<string, unknown> | undefined
      if (animate && typeof animate === 'object' && 'width' in animate) {
        props['style'] = { width: animate.width }
      }
      return <div {...props}>{children as React.ReactNode}</div>
    },
    span: ({
      children,
      'data-testid': testId,
      className,
    }: Record<string, unknown>) => {
      const props: Record<string, unknown> = {}
      if (testId) props['data-testid'] = testId
      if (className) props['className'] = className
      return <span {...props}>{children as React.ReactNode}</span>
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))

describe('PIPELINE_STEPS constants', () => {
  it('has 4 pipeline steps in correct order', () => {
    expect(PIPELINE_STEPS).toHaveLength(4)
    expect(PIPELINE_STEPS.map((s) => s.key)).toEqual([
      'uploading',
      'extracting',
      'scoring',
      'complete',
    ])
  })

  it('has progress values increasing from 20 to 100', () => {
    const progressValues = PIPELINE_STEPS.map((s) => s.progress)
    expect(progressValues).toEqual([20, 50, 85, 100])
    for (let i = 1; i < progressValues.length; i++) {
      expect(progressValues[i]).toBeGreaterThan(progressValues[i - 1])
    }
  })

  it('has labels for each step', () => {
    for (const step of PIPELINE_STEPS) {
      expect(step.label).toBeTruthy()
      expect(typeof step.label).toBe('string')
    }
  })

  it('does not have estimateSeconds property', () => {
    for (const step of PIPELINE_STEPS) {
      expect(step).not.toHaveProperty('estimateSeconds')
    }
  })
})

describe('StepProgress', () => {
  it('renders all pipeline step labels', () => {
    render(<StepProgress status="uploading" />)
    expect(screen.getByText('Uploading document...')).toBeInTheDocument()
    expect(screen.getByText('Reading PDF...')).toBeInTheDocument()
    expect(screen.getByText('Scoring confidence...')).toBeInTheDocument()
    expect(screen.getByText('Complete')).toBeInTheDocument()
  })

  it('marks completed steps with checkmark icons', () => {
    render(<StepProgress status="scoring" />)
    const checkmarks = screen.getAllByTestId('step-check')
    // uploading and extracting are completed (before scoring)
    expect(checkmarks).toHaveLength(2)
  })

  it('highlights current step with spinner', () => {
    render(<StepProgress status="extracting" />)
    expect(screen.getByTestId('step-spinner')).toBeInTheDocument()
  })

  it('shows future steps as inactive', () => {
    render(<StepProgress status="uploading" />)
    const futureSteps = screen.getAllByTestId('step-future')
    // extracting, scoring, complete are future
    expect(futureSteps).toHaveLength(3)
  })

  it('renders progress bar', () => {
    render(<StepProgress status="extracting" />)
    expect(screen.getByTestId('progress-bar')).toBeInTheDocument()
    expect(screen.getByTestId('progress-bar-fill')).toBeInTheDocument()
  })

  it('shows failed state with error icon', () => {
    render(<StepProgress status="failed" />)
    expect(screen.getByTestId('step-failed')).toBeInTheDocument()
  })

  it('shows all steps as completed when status is complete', () => {
    render(<StepProgress status="complete" />)
    const checkmarks = screen.getAllByTestId('step-check')
    // All 4 steps should have checkmarks
    expect(checkmarks).toHaveLength(4)
  })

  it('renders the overall progress percentage text', () => {
    render(<StepProgress status="extracting" />)
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('connects steps with connector lines', () => {
    render(<StepProgress status="uploading" />)
    const connectors = screen.getAllByTestId('step-connector')
    // 3 connectors between 4 steps
    expect(connectors).toHaveLength(3)
  })
})
