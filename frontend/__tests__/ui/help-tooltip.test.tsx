import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { HelpModeProvider, useHelpMode } from '@/components/help/help-mode-provider'
import { HELP_CONTENT } from '@/lib/help-content'

beforeEach(() => {
  localStorage.clear()
})

function HelpModeProbe() {
  const { helpModeEnabled, toggleHelpMode } = useHelpMode()

  return (
    <button type="button" onClick={toggleHelpMode}>
      {helpModeEnabled ? 'Help on' : 'Help off'}
    </button>
  )
}

describe('HelpTooltip', () => {
  it('renders an always-visible help trigger with an accessible label', () => {
    render(
      <HelpTooltip label="Confidence score help">
        Confidence tells you how certain Lextract is about this answer.
      </HelpTooltip>,
    )

    expect(
      screen.getByRole('button', { name: 'Confidence score help' }),
    ).toBeInTheDocument()
  })

  it('opens help content on focus and closes with Escape', () => {
    render(
      <HelpTooltip label="Red flag help">
        A red flag is something worth reviewing before you rely on the lease.
      </HelpTooltip>,
    )

    const trigger = screen.getByRole('button', { name: 'Red flag help' })
    fireEvent.focus(trigger)
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      /worth reviewing before you rely on the lease/i,
    )

    fireEvent.keyDown(trigger, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('toggles help content on click for touch users', async () => {
    const user = userEvent.setup()
    render(
      <HelpTooltip label="Source text help">
        Source text shows the lease language Lextract used for this field.
      </HelpTooltip>,
    )

    const trigger = screen.getByRole('button', { name: 'Source text help' })
    await user.click(trigger)
    expect(screen.getByRole('tooltip')).toHaveTextContent(/lease language/i)

    await user.click(trigger)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('does not auto-open on hover when help mode is off, but still opens on click', async () => {
    localStorage.setItem('lextract_help_mode', 'off')
    const user = userEvent.setup()
    render(
      <HelpModeProvider>
        <HelpTooltip label="Payment help">Payment unlocks the full report.</HelpTooltip>
      </HelpModeProvider>,
    )

    const trigger = screen.getByRole('button', { name: 'Payment help' })
    await waitFor(() => {
      expect(localStorage.getItem('lextract_help_mode')).toBe('off')
    })
    await user.hover(trigger)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    await user.click(trigger)
    expect(screen.getByRole('tooltip')).toHaveTextContent(/full report/i)
  })

  it('supports right-aligned mobile-safe tooltip content', async () => {
    const user = userEvent.setup()
    render(
      <HelpTooltip label="Search help" align="end">
        Search by field name.
      </HelpTooltip>,
    )

    await user.click(screen.getByRole('button', { name: 'Search help' }))
    expect(screen.getByRole('tooltip')).toHaveClass(
      'max-w-[calc(100vw-2rem)]',
    )
    expect(screen.getByRole('tooltip')).toHaveClass('right-0')
  })
})

describe('HELP_CONTENT', () => {
  it('defines plain-language explanations for core beginner concepts', () => {
    expect(HELP_CONTENT.confidenceScore).toMatch(/how sure/i)
    expect(HELP_CONTENT.redFlags).toMatch(/review/i)
    expect(HELP_CONTENT.sourceText).toMatch(/lease/i)
    expect(HELP_CONTENT.exportTemplate).toMatch(/report/i)
    expect(HELP_CONTENT.freePreview).toMatch(/before you pay/i)
  })
})

describe('HelpModeProvider', () => {
  it('uses a safe default context outside the provider', async () => {
    const user = userEvent.setup()
    render(<HelpModeProbe />)

    const trigger = screen.getByRole('button', { name: 'Help on' })
    await user.click(trigger)

    expect(trigger).toHaveTextContent('Help on')
  })

  it('renders enabled help mode during server rendering', () => {
    const html = renderToString(
      <HelpModeProvider>
        <HelpModeProbe />
      </HelpModeProvider>,
    )

    expect(html).toContain('Help on')
  })

  it('defaults help mode on and persists toggles', async () => {
    const user = userEvent.setup()
    render(
      <HelpModeProvider>
        <HelpModeProbe />
      </HelpModeProvider>,
    )

    expect(screen.getByRole('button', { name: 'Help on' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Help on' }))

    expect(screen.getByRole('button', { name: 'Help off' })).toBeInTheDocument()
    expect(localStorage.getItem('lextract_help_mode')).toBe('off')
  })

  it('can turn help mode back on from a saved off preference', async () => {
    localStorage.setItem('lextract_help_mode', 'off')
    const user = userEvent.setup()
    render(
      <HelpModeProvider>
        <HelpModeProbe />
      </HelpModeProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Help off' }))

    expect(screen.getByRole('button', { name: 'Help on' })).toBeInTheDocument()
    expect(localStorage.getItem('lextract_help_mode')).toBe('on')
  })

  it('updates when another tab changes the stored help preference', async () => {
    render(
      <HelpModeProvider>
        <HelpModeProbe />
      </HelpModeProvider>,
    )

    localStorage.setItem('lextract_help_mode', 'off')
    fireEvent(
      window,
      new StorageEvent('storage', {
        key: 'lextract_help_mode',
        newValue: 'off',
      }),
    )

    expect(await screen.findByRole('button', { name: 'Help off' })).toBeInTheDocument()
  })

  it('ignores storage events for unrelated keys', () => {
    render(
      <HelpModeProvider>
        <HelpModeProbe />
      </HelpModeProvider>,
    )

    fireEvent(
      window,
      new StorageEvent('storage', {
        key: 'unrelated',
        newValue: 'off',
      }),
    )

    expect(screen.getByRole('button', { name: 'Help on' })).toBeInTheDocument()
  })
})
