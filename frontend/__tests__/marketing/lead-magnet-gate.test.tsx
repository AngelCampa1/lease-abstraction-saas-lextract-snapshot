import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LeadMagnetGate } from '@/components/marketing/lead-magnet-gate'

const defaultProps = {
  magnetSlug: 'lease-abstraction-checklist',
  magnetName: 'Lease Abstraction Checklist',
  fileFormat: 'PDF' as const,
  description: 'A practical checklist for lease review.',
}

describe('LeadMagnetGate', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 }),
      ),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('keeps sequence and unsubscribe copy out of the form', () => {
    render(<LeadMagnetGate {...defaultProps} />)

    expect(screen.getByText('Lease Abstraction Checklist')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /download free pdf/i })).toBeInTheDocument()
    expect(screen.queryByText(/follow-up/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/sequence/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/unsubscribe/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/no spam/i)).not.toBeInTheDocument()
  })

  it('uses the Excel button label for workbook resources', () => {
    render(
      <LeadMagnetGate
        {...defaultProps}
        fileFormat="XLSX"
        magnetName="Lease Audit Workbook"
      />,
    )

    expect(screen.getByRole('button', { name: /download free excel/i })).toBeInTheDocument()
  })

  it('keeps spam and sequence copy out of the success state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            emailed: true,
            downloadUrl: 'https://example.com/resource.pdf',
          }),
          { status: 200 },
        ),
      ),
    )
    const user = userEvent.setup()
    render(<LeadMagnetGate {...defaultProps} />)

    await user.type(screen.getByLabelText(/work email/i), 'tenant@example.com')
    await user.click(screen.getByRole('button', { name: /download free pdf/i }))

    await waitFor(() => {
      expect(screen.getByText('Check your inbox!')).toBeInTheDocument()
    })
    expect(screen.queryByText(/spam/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/sequence/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/unsubscribe/i)).not.toBeInTheDocument()
  })

  it('shows direct-download copy when the resource email was not sent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            emailed: false,
            downloadUrl: 'https://example.com/resource.pdf',
          }),
          { status: 200 },
        ),
      ),
    )
    const user = userEvent.setup()
    render(<LeadMagnetGate {...defaultProps} />)

    await user.type(screen.getByLabelText(/work email/i), 'tenant@example.com')
    await user.click(screen.getByRole('button', { name: /download free pdf/i }))

    await waitFor(() => {
      expect(screen.getByText('Your download is ready')).toBeInTheDocument()
    })
    expect(screen.getByText(/available below for immediate download/i)).toBeInTheDocument()
    expect(screen.queryByText(/sent the/i)).not.toBeInTheDocument()
  })

  it('shows resource-only API errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: 'We could not prepare your resource right now. Please try again.',
          }),
          { status: 502 },
        ),
      ),
    )
    const user = userEvent.setup()
    render(<LeadMagnetGate {...defaultProps} />)

    await user.type(screen.getByLabelText(/work email/i), 'tenant@example.com')
    await user.click(screen.getByRole('button', { name: /download free pdf/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'We could not prepare your resource right now. Please try again.',
      )
    })
    expect(screen.queryByText(/lead magnet/i)).not.toBeInTheDocument()
  })
})
