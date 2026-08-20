import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { InteractiveCalculator } from '@/components/calculators/interactive-calculator'

describe('InteractiveCalculator', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders nothing for calculators without an interactive definition', () => {
    const { container } = render(<InteractiveCalculator slug="missing-calculator" />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders default inputs, result, breakdown, suffixes, and email capture', () => {
    render(<InteractiveCalculator slug="nnn-lease-cost-calculator" />)

    expect(screen.getByRole('heading', { name: 'Try the Calculator' })).toBeInTheDocument()
    expect(screen.getByLabelText('Leased Square Footage')).toHaveValue(5000)
    expect(screen.getByText('sq ft')).toBeInTheDocument()
    expect(screen.getByText('Step-by-Step Breakdown')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Email me' })).toBeInTheDocument()
  })

  it('shows the empty state when a required value is cleared', async () => {
    const user = userEvent.setup()
    render(<InteractiveCalculator slug="nnn-lease-cost-calculator" />)

    await user.clear(screen.getByLabelText('Leased Square Footage'))

    expect(screen.getByText('Enter values above to see your result')).toBeInTheDocument()
  })

  it('validates and submits the email capture form', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<InteractiveCalculator slug="nnn-lease-cost-calculator" />)

    await user.click(screen.getByRole('button', { name: 'Email me' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Email address is required.')

    await user.type(screen.getByLabelText('Email address'), 'bad-email')
    await user.click(screen.getByRole('button', { name: 'Email me' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid email address.')

    await user.clear(screen.getByLabelText('Email address'))
    await user.type(screen.getByLabelText('Email address'), 'alex@example.com')
    await user.type(screen.getByLabelText(/First name/), 'Alex')
    await user.click(screen.getByRole('button', { name: 'Email me' }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/leads/calculator',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"firstName":"Alex"'),
      }),
    )
    expect(await screen.findByText('Sent! Check your inbox.')).toBeInTheDocument()
    expect(screen.getByText(/alex@example.com/)).toBeInTheDocument()
  })

  it('surfaces API error messages from failed email capture', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Lead capture failed.' }),
      }),
    )
    render(<InteractiveCalculator slug="nnn-lease-cost-calculator" />)

    await user.type(screen.getByLabelText('Email address'), 'alex@example.com')
    await user.click(screen.getByRole('button', { name: 'Email me' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Lead capture failed.')
  })
})
