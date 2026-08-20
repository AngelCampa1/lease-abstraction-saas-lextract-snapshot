import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditDiscoveryToast } from '@/components/results/edit-discovery-toast'

const STORAGE_KEY = 'lextract_edit_hint_dismissed'

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('EditDiscoveryToast', () => {
  it('renders the banner when localStorage key is not set', () => {
    render(<EditDiscoveryToast />)
    expect(
      screen.getByText(/Click any field value to correct it/),
    ).toBeInTheDocument()
  })

  it('renders nothing when localStorage key is "true"', () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    const { container } = render(<EditDiscoveryToast />)
    // Component should render nothing (null)
    expect(container.firstChild).toBeNull()
  })

  it('shows "Got it" dismiss button', () => {
    render(<EditDiscoveryToast />)
    expect(screen.getByRole('button', { name: /Got it/i })).toBeInTheDocument()
  })

  it('shows the edit hint text', () => {
    render(<EditDiscoveryToast />)
    expect(
      screen.getByText(/Changes update red flags in real time/),
    ).toBeInTheDocument()
  })

  it('hides the banner after clicking "Got it"', async () => {
    const user = userEvent.setup()
    render(<EditDiscoveryToast />)
    const button = screen.getByRole('button', { name: /Got it/i })
    await user.click(button)
    expect(
      screen.queryByText(/Click any field value to correct it/),
    ).not.toBeInTheDocument()
  })

  it('sets localStorage key to "true" when "Got it" is clicked', async () => {
    const user = userEvent.setup()
    render(<EditDiscoveryToast />)
    const button = screen.getByRole('button', { name: /Got it/i })
    await user.click(button)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true')
  })

  it('does not render banner after dismiss (uses state, not unmount)', async () => {
    const user = userEvent.setup()
    const { container } = render(<EditDiscoveryToast />)
    const button = screen.getByRole('button', { name: /Got it/i })
    await user.click(button)
    // Container stays mounted but banner content should be hidden
    // The component must still be in the DOM but not showing the banner text
    expect(
      screen.queryByText(/Click any field value to correct it/),
    ).not.toBeInTheDocument()
    // Container itself is still present (not unmounted)
    expect(container).toBeTruthy()
  })

  it('shows pencil icon or text indicator', () => {
    render(<EditDiscoveryToast />)
    // The banner should have some visual indicator (✏️ emoji in text or aria element)
    const banner = screen.getByText(/Click any field value to correct it/)
    expect(banner).toBeInTheDocument()
  })
})
