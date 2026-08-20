import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NotificationPrompt, getDismissedServerSnapshot } from '@/components/processing/notification-prompt'

// The module-level inMemoryDismissed persists between tests in the same module.
// We work around this by clearing sessionStorage (which the store reads)
// and using a fresh render in each test. Since the module-level flag only
// ever goes true→false direction, we rely on sessionStorage being the
// source of truth when inMemoryDismissed is false.
//
// For tests that need a fully clean store (e.g. "already dismissed" test),
// we let sessionStorage drive the initial state since inMemoryDismissed
// starts false at module load time.

describe('NotificationPrompt', () => {
  const mockRequestPermission = vi.fn().mockResolvedValue(undefined)

  const defaultProps = {
    permission: 'default' as NotificationPermission,
    requestPermission: mockRequestPermission,
    isSupported: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  describe('visibility', () => {
    it('renders the prompt when permission is "default" and isSupported is true', () => {
      render(<NotificationPrompt {...defaultProps} />)

      expect(
        screen.getByText(/get notified when your extraction is ready/i)
      ).toBeInTheDocument()
    })

    it('renders the "Turn on notifications" button', () => {
      render(<NotificationPrompt {...defaultProps} />)

      expect(
        screen.getByRole('button', { name: /turn on notifications/i })
      ).toBeInTheDocument()
    })

    it('uses design-system button sizing and focus affordances', () => {
      render(<NotificationPrompt {...defaultProps} />)

      expect(
        screen.getByRole('button', { name: /turn on notifications/i })
      ).toHaveClass('min-h-10', 'focus-visible:ring-2')
      expect(screen.getByRole('button', { name: /dismiss/i })).toHaveClass(
        'min-h-11',
        'min-w-11',
        'focus-visible:ring-2'
      )
    })

    it('renders with role="region" and aria-label for accessibility', () => {
      render(<NotificationPrompt {...defaultProps} />)

      expect(
        screen.getByRole('region', { name: /notification opt-in/i })
      ).toBeInTheDocument()
    })

    it('does NOT render when permission is "granted"', () => {
      render(
        <NotificationPrompt {...defaultProps} permission="granted" />
      )

      expect(
        screen.queryByText(/get notified when your extraction is ready/i)
      ).not.toBeInTheDocument()
    })

    it('does NOT render when permission is "denied"', () => {
      render(
        <NotificationPrompt {...defaultProps} permission="denied" />
      )

      expect(
        screen.queryByText(/get notified when your extraction is ready/i)
      ).not.toBeInTheDocument()
    })

    it('does NOT render when isSupported is false', () => {
      render(
        <NotificationPrompt {...defaultProps} isSupported={false} />
      )

      expect(
        screen.queryByText(/get notified when your extraction is ready/i)
      ).not.toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls requestPermission when "Turn on notifications" is clicked', () => {
      render(<NotificationPrompt {...defaultProps} />)

      fireEvent.click(
        screen.getByRole('button', { name: /turn on notifications/i })
      )

      expect(mockRequestPermission).toHaveBeenCalledTimes(1)
    })

    it('does not throw when requestPermission rejects', async () => {
      const rejectingPermission = vi.fn().mockRejectedValue(new Error('Not allowed'))
      render(
        <NotificationPrompt
          {...defaultProps}
          requestPermission={rejectingPermission}
        />
      )

      // Should not throw — rejection is swallowed by .catch()
      await expect(
        async () =>
          fireEvent.click(
            screen.getByRole('button', { name: /turn on notifications/i })
          )
      ).not.toThrow()
    })

    it('hides the prompt after clicking the dismiss button', () => {
      render(<NotificationPrompt {...defaultProps} />)
      fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))

      expect(
        screen.queryByText(/get notified when your extraction is ready/i)
      ).not.toBeInTheDocument()
    })

    it('stores dismissal in sessionStorage', () => {
      render(<NotificationPrompt {...defaultProps} />)
      fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))

      expect(sessionStorage.getItem('notification-prompt-dismissed')).toBe('true')
    })

    it('getDismissedServerSnapshot returns false (SSR snapshot for hydration safety)', () => {
      expect(getDismissedServerSnapshot()).toBe(false)
    })

    it('does not render if sessionStorage flag is already set at mount', () => {
      // Pre-set the flag; module-level inMemoryDismissed is false here,
      // so getDismissedSnapshot() returns true via sessionStorage.
      sessionStorage.setItem('notification-prompt-dismissed', 'true')

      render(<NotificationPrompt {...defaultProps} />)

      expect(
        screen.queryByText(/get notified when your extraction is ready/i)
      ).not.toBeInTheDocument()
    })
  })
})
