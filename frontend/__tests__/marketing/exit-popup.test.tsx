import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExitPopup } from '@/components/marketing/exit-popup'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const mockUseAuth = vi.fn()
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}))

// Auto-emit a Turnstile token when TurnstileField mounts.
vi.mock('@/components/marketing/turnstile-field', () => ({
  TurnstileField: ({ onTokenChange }: { onTokenChange: (t: string) => void }) => {
    onTokenChange('test-turnstile-token')
    return null
  },
}))

// Default: homepage path → lease-abstraction-checklist
Object.defineProperty(window, 'location', {
  value: { pathname: '/' },
  writable: true,
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SESSION_KEY = 'lextract-exit-popup-shown'
const TRIGGER_DELAY_MS = 5_000

function dispatchExitMouseLeave() {
  document.dispatchEvent(new MouseEvent('mouseleave', { clientY: 0, bubbles: false }))
}

async function triggerExitPopup() {
  await act(async () => {
    vi.advanceTimersByTime(TRIGGER_DELAY_MS + 100)
    dispatchExitMouseLeave()
  })
}

const DOWNLOAD_URL =
  'https://account.r2.cloudflarestorage.com/lextract-lead-magnets/lease-abstraction-checklist-v3.pdf?sig=abc'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ExitPopup', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })
    sessionStorage.removeItem(SESSION_KEY)
    vi.useFakeTimers()
    window.location.pathname = '/'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ success: true, downloadUrl: DOWNLOAD_URL, emailed: true }),
          { status: 200 },
        ),
      ),
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    sessionStorage.removeItem(SESSION_KEY)
  })

  // ── Suppression ─────────────────────────────────────────────────────────────

  describe('Suppression', () => {
    it('does not open the dialog on mount', () => {
      render(<ExitPopup />)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('does not open when user is logged in', async () => {
      mockUseAuth.mockReturnValue({ user: { id: '1', email: 'a@b.com' }, loading: false })
      render(<ExitPopup />)
      await triggerExitPopup()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('does not open when sessionStorage flag is already set', async () => {
      sessionStorage.setItem(SESSION_KEY, '1')
      render(<ExitPopup />)
      await triggerExitPopup()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('does not open before the trigger delay elapses', async () => {
      render(<ExitPopup />)
      await act(async () => { vi.advanceTimersByTime(TRIGGER_DELAY_MS - 100) })
      act(() => { dispatchExitMouseLeave() })
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('does not open when mouseleave fires with positive clientY', async () => {
      render(<ExitPopup />)
      await act(async () => { vi.advanceTimersByTime(TRIGGER_DELAY_MS + 100) })
      await act(async () => {
        document.dispatchEvent(new MouseEvent('mouseleave', { clientY: 50, bubbles: false }))
      })
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  // ── Trigger ──────────────────────────────────────────────────────────────────

  describe('Trigger', () => {
    it('opens the dialog after delay + mouseleave with clientY=0', async () => {
      render(<ExitPopup />)
      await triggerExitPopup()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('sets the sessionStorage flag when the popup opens', async () => {
      render(<ExitPopup />)
      await triggerExitPopup()
      expect(sessionStorage.getItem(SESSION_KEY)).toBe('1')
    })

    it('shows the final copy strings in the dialog', async () => {
      render(<ExitPopup />)
      await triggerExitPopup()
      expect(screen.getByText('Free before you go')).toBeInTheDocument()
      expect(screen.getByText('Leave your email and we\'ll send it right now.')).toBeInTheDocument()
    })

    it('shows the email field immediately on open (no card selection required)', async () => {
      render(<ExitPopup />)
      await triggerExitPopup()
      expect(screen.getByLabelText('Work email')).toBeInTheDocument()
    })

    it('shows the CTA with the default magnet title for homepage', async () => {
      render(<ExitPopup />)
      await triggerExitPopup()
      // Homepage → lease-abstraction-checklist
      expect(screen.getByRole('button', { name: /Send me the Lease Abstraction Checklist/i })).toBeInTheDocument()
    })

    it('shows a tailored magnet for a CAM path', async () => {
      window.location.pathname = '/red-flags/cam-overbilling'
      render(<ExitPopup />)
      await triggerExitPopup()
      expect(screen.getByRole('button', { name: /Send me the CAM Reconciliation Audit Checklist/i })).toBeInTheDocument()
    })

    it('shows a tailored magnet for a tools/audit path', async () => {
      window.location.pathname = '/tools/lease-comparison'
      render(<ExitPopup />)
      await triggerExitPopup()
      expect(screen.getByRole('button', { name: /Send me the Lease Audit Workbook/i })).toBeInTheDocument()
    })

    it('keeps sequence and unsubscribe copy out of the dialog', async () => {
      render(<ExitPopup />)
      await triggerExitPopup()
      expect(screen.queryByText(/sequence/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/unsubscribe/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/follow-up/i)).not.toBeInTheDocument()
    })
  })

  // ── Dismiss ──────────────────────────────────────────────────────────────────

  describe('Dismiss', () => {
    it('closes the dialog when Escape is pressed before submission', async () => {
      render(<ExitPopup />)
      await triggerExitPopup()
      vi.useRealTimers()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      const user = userEvent.setup()
      await user.keyboard('{Escape}')
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('closes the dialog after successful submission without error', async () => {
      const user = await (async () => {
        render(<ExitPopup />)
        await triggerExitPopup()
        vi.useRealTimers()
        const u = userEvent.setup()
        await u.type(screen.getByLabelText('Work email'), 'user@test.com')
        return u
      })()
      await user.click(screen.getByRole('button', { name: /Send me the/i }))
      await waitFor(() => {
        expect(screen.getByText('Check your inbox.')).toBeInTheDocument()
      })
      // Close after success — onOpenChange(false) with status==='success', no dismissed event
      await user.keyboard('{Escape}')
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })
  })

  // ── Swap disclosure ──────────────────────────────────────────────────────────

  describe('Swap disclosure', () => {
    async function openDialog() {
      render(<ExitPopup />)
      await triggerExitPopup()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      vi.useRealTimers()
    }

    it('shows the "Need something else?" disclosure link', async () => {
      await openDialog()
      expect(screen.getByText('Need something else?')).toBeInTheDocument()
    })

    it('reveals the other three magnets when disclosure is clicked', async () => {
      await openDialog()
      const user = userEvent.setup()
      await user.click(screen.getByText('Need something else?'))
      // On homepage, default is lease-abstraction-checklist, the other 3 show
      expect(screen.getByText('CAM Reconciliation Audit Checklist')).toBeInTheDocument()
      expect(screen.getByText('Due Diligence Checklist')).toBeInTheDocument()
      expect(screen.getByText('Lease Audit Workbook')).toBeInTheDocument()
    })

    it('updates the CTA title when a different magnet is selected', async () => {
      await openDialog()
      const user = userEvent.setup()
      await user.click(screen.getByText('Need something else?'))
      await user.click(screen.getByText('Due Diligence Checklist'))
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Send me the Due Diligence Checklist/i })).toBeInTheDocument()
      })
    })
  })

  // ── Form submission ──────────────────────────────────────────────────────────

  describe('Form submission', () => {
    async function openDialogAndFillEmail(email: string) {
      render(<ExitPopup />)
      await triggerExitPopup()
      vi.useRealTimers()
      const user = userEvent.setup()
      await user.type(screen.getByLabelText('Work email'), email)
      return user
    }

    it('submit is disabled when email is empty', async () => {
      render(<ExitPopup />)
      await triggerExitPopup()
      vi.useRealTimers()
      expect(screen.getByRole('button', { name: /Send me the/i })).toBeDisabled()
    })

    it('submit is disabled when email is invalid', async () => {
      const user = await openDialogAndFillEmail('notanemail')
      void user
      expect(screen.getByRole('button', { name: /Send me the/i })).toBeDisabled()
    })

    it('submit is enabled for a valid email with turnstile token', async () => {
      await openDialogAndFillEmail('valid@example.com')
      expect(screen.getByRole('button', { name: /Send me the/i })).not.toBeDisabled()
    })

    it('calls fetch with correct URL, email, magnetSlug, and sourcePath', async () => {
      window.location.pathname = '/pricing'
      render(<ExitPopup />)
      await triggerExitPopup()
      vi.useRealTimers()
      const user = userEvent.setup()
      await user.type(screen.getByLabelText('Work email'), 'hello@example.com')
      await user.click(screen.getByRole('button', { name: /Send me the/i }))

      await waitFor(() => {
        expect(vi.mocked(global.fetch)).toHaveBeenCalledOnce()
      })

      const [url, options] = vi.mocked(global.fetch).mock.calls[0] as [string, RequestInit]
      expect(url).toBe('/api/leads/download')
      const body = JSON.parse(options.body as string) as {
        email: string
        magnetSlug: string
        placement: string
        sourcePath: string
        turnstileToken: string
      }
      expect(body.email).toBe('hello@example.com')
      expect(body.magnetSlug).toBe('lease-abstraction-checklist')
      expect(body.placement).toBe('exit-popup')
      expect(body.sourcePath).toBe('/pricing')
      expect(body.turnstileToken).toBe('test-turnstile-token')
    })

    it('shows the success state with correct copy and Download Now link', async () => {
      const user = await openDialogAndFillEmail('user@test.com')
      await user.click(screen.getByRole('button', { name: /Send me the/i }))
      await waitFor(() => {
        expect(screen.getByText('Check your inbox.')).toBeInTheDocument()
      })
      expect(
        screen.getByText('We sent a copy. Download it below if you want it now.'),
      ).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /download now/i })).toHaveAttribute(
        'href',
        DOWNLOAD_URL,
      )
    })

    it('shows the error copy on a non-ok response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 500 })))
      render(<ExitPopup />)
      await triggerExitPopup()
      vi.useRealTimers()
      const user = userEvent.setup()
      await user.type(screen.getByLabelText('Work email'), 'bad@example.com')
      await user.click(screen.getByRole('button', { name: /Send me the/i }))
      await waitFor(() => {
        expect(screen.getByText("That didn't work. Try again?")).toBeInTheDocument()
      })
    })

    it('shows the error copy on network failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
      render(<ExitPopup />)
      await triggerExitPopup()
      vi.useRealTimers()
      const user = userEvent.setup()
      await user.type(screen.getByLabelText('Work email'), 'fail@example.com')
      await user.click(screen.getByRole('button', { name: /Send me the/i }))
      await waitFor(() => {
        expect(screen.getByText("That didn't work. Try again?")).toBeInTheDocument()
      })
    })

    it('resets error state when the user types again after an error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('{}', { status: 500 })))
      render(<ExitPopup />)
      await triggerExitPopup()
      vi.useRealTimers()
      const user = userEvent.setup()
      await user.type(screen.getByLabelText('Work email'), 'fail@example.com')
      await user.click(screen.getByRole('button', { name: /Send me the/i }))
      await waitFor(() => {
        expect(screen.getByText("That didn't work. Try again?")).toBeInTheDocument()
      })
      // Typing again should clear the error
      await user.type(screen.getByLabelText('Work email'), 'x')
      await waitFor(() => {
        expect(screen.queryByText("That didn't work. Try again?")).not.toBeInTheDocument()
      })
    })

    it('shows "Sending..." while the request is in flight', async () => {
      let resolveFetch!: () => void
      vi.stubGlobal(
        'fetch',
        vi.fn().mockReturnValue(
          new Promise<Response>((resolve) => {
            resolveFetch = () => resolve(
              new Response(JSON.stringify({ success: true, downloadUrl: DOWNLOAD_URL, emailed: true }), { status: 200 }),
            )
          }),
        ),
      )
      const user = await openDialogAndFillEmail('user@test.com')
      await user.click(screen.getByRole('button', { name: /Send me the/i }))
      await waitFor(() => {
        expect(screen.getByText('Sending...')).toBeInTheDocument()
      })
      // Resolve and verify success
      resolveFetch()
      await waitFor(() => {
        expect(screen.getByText('Check your inbox.')).toBeInTheDocument()
      })
    })
  })
})
