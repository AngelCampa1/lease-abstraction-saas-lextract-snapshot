import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MobileNav } from '@/components/layout/mobile-nav'

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}))

describe('MobileNav', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the hamburger toggle button', () => {
    render(<MobileNav />)
    const toggle = screen.getByTestId('mobile-nav-toggle')
    expect(toggle).toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-label', 'Open navigation menu')
  })

  it('opens the mobile nav panel when toggle is clicked', async () => {
    const user = userEvent.setup()
    render(<MobileNav />)

    await user.click(screen.getByTestId('mobile-nav-toggle'))

    await waitFor(() => {
      expect(screen.getByTestId('mobile-nav-panel')).toBeInTheDocument()
    })
    expect(screen.getByTestId('mobile-nav-toggle')).toHaveAttribute(
      'aria-expanded',
      'true'
    )
    expect(screen.getByTestId('mobile-nav-toggle')).toHaveAttribute(
      'aria-label',
      'Close navigation menu'
    )
  })

  it('shows navigation links in the panel', async () => {
    const user = userEvent.setup()
    render(<MobileNav />)

    await user.click(screen.getByTestId('mobile-nav-toggle'))

    await waitFor(() => {
      expect(screen.getByTestId('mobile-nav-panel')).toBeInTheDocument()
    })
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Upload')).toBeInTheDocument()
  })

  it('closes when toggle is clicked again', async () => {
    const user = userEvent.setup()
    render(<MobileNav />)

    // Open
    await user.click(screen.getByTestId('mobile-nav-toggle'))
    await waitFor(() => {
      expect(screen.getByTestId('mobile-nav-panel')).toBeInTheDocument()
    })

    // Close
    await user.click(screen.getByTestId('mobile-nav-toggle'))
    await waitFor(() => {
      expect(screen.queryByTestId('mobile-nav-panel')).not.toBeInTheDocument()
    })
  })

  it('closes when overlay is clicked', async () => {
    const user = userEvent.setup()
    render(<MobileNav />)

    await user.click(screen.getByTestId('mobile-nav-toggle'))
    await waitFor(() => {
      expect(screen.getByTestId('mobile-nav-overlay')).toBeInTheDocument()
    })

    await user.click(screen.getByTestId('mobile-nav-overlay'))
    await waitFor(() => {
      expect(screen.queryByTestId('mobile-nav-panel')).not.toBeInTheDocument()
    })
  })

  it('closes when a navigation link is clicked', async () => {
    const user = userEvent.setup()
    render(<MobileNav />)

    await user.click(screen.getByTestId('mobile-nav-toggle'))
    await waitFor(() => {
      expect(screen.getByTestId('mobile-nav-panel')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Dashboard'))
    await waitFor(() => {
      expect(screen.queryByTestId('mobile-nav-panel')).not.toBeInTheDocument()
    })
  })

  it('has role dialog on the panel', async () => {
    const user = userEvent.setup()
    render(<MobileNav />)

    await user.click(screen.getByTestId('mobile-nav-toggle'))
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it('closes with Escape and restores focus to the toggle', async () => {
    const user = userEvent.setup()
    render(<MobileNav />)

    const toggle = screen.getByTestId('mobile-nav-toggle')
    await user.click(toggle)
    await waitFor(() => {
      expect(screen.getByTestId('mobile-nav-panel')).toBeInTheDocument()
    })

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByTestId('mobile-nav-panel')).not.toBeInTheDocument()
    })
    expect(toggle).toHaveFocus()
  })

  it('keeps Tab focus inside the open mobile nav panel', async () => {
    const user = userEvent.setup()
    render(
      <>
        <MobileNav />
        <button type="button">Outside action</button>
      </>
    )

    await user.click(screen.getByTestId('mobile-nav-toggle'))
    const panel = await screen.findByTestId('mobile-nav-panel')
    const firstLink = screen.getByRole('link', { name: /dashboard/i })
    firstLink.focus()

    for (let i = 0; i < 8; i += 1) {
      await user.tab()
      expect(panel).toContainElement(document.activeElement as HTMLElement)
    }

    expect(screen.getByRole('button', { name: /outside action/i })).not.toHaveFocus()
  })
})
