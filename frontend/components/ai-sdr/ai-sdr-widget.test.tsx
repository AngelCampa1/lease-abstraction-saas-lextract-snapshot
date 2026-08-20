import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AI_SDR_BFF_BASE_URL,
  AI_SDR_CLIENT_BUNDLE_URL,
  AI_SDR_MAX_POLL_ATTEMPTS,
  AI_SDR_POLL_INTERVAL_MS,
  AI_SDR_PRODUCT_ID,
  AI_SDR_SCRIPT_ID,
  AI_SDR_SURFACE,
  AI_SDR_WIDGET_ROOT_ID,
} from '@/lib/ai-sdr-widget-config'
import { AiSdrWidget } from './ai-sdr-widget'

interface FakeHandle {
  open: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
}

function installBundle(): { createAiSdrWidget: ReturnType<typeof vi.fn>; handle: FakeHandle } {
  const handle: FakeHandle = { open: vi.fn(), destroy: vi.fn() }
  const createAiSdrWidget = vi.fn(() => handle)
  ;(window as unknown as { VentoraAiSdr?: unknown }).VentoraAiSdr = { createAiSdrWidget }
  return { createAiSdrWidget, handle }
}

function clearBundle(): void {
  delete (window as unknown as { VentoraAiSdr?: unknown }).VentoraAiSdr
}

// The launcher is the only button the component renders; its accessible name
// changes with status (idle/loading/error), so query by role without a name.
function launcher(): HTMLElement {
  return screen.getByRole('button')
}

describe('AiSdrWidget', () => {
  afterEach(() => {
    clearBundle()
    for (const node of document.querySelectorAll(`#${AI_SDR_SCRIPT_ID}`)) {
      node.remove()
    }
    vi.useRealTimers()
  })

  it('renders an always-visible pill launcher and a stable mount target', () => {
    render(<AiSdrWidget />)

    const button = launcher()
    expect(button).toBeInTheDocument()
    // Idle accessible name comes from the visible label (no stale aria-label).
    expect(button).toHaveAccessibleName('Chat with Lextract')
    expect(button.className).toContain('rounded-full')
    expect(button).toHaveAttribute('aria-haspopup', 'dialog')
    expect(document.getElementById(AI_SDR_WIDGET_ROOT_ID)).not.toBeNull()
  })

  it('loads the bundle once and mounts+opens the hosted widget on click, then hides its launcher', () => {
    const { createAiSdrWidget, handle } = installBundle()
    render(<AiSdrWidget />)

    fireEvent.click(launcher())

    // The hosted bundle script is injected exactly once with the configured src/id.
    const scripts = document.querySelectorAll(`#${AI_SDR_SCRIPT_ID}`)
    expect(scripts).toHaveLength(1)
    expect(scripts[0].getAttribute('src')).toBe(AI_SDR_CLIENT_BUNDLE_URL)

    // The widget is created against the same-origin BFF and opened.
    expect(createAiSdrWidget).toHaveBeenCalledTimes(1)
    const config = createAiSdrWidget.mock.calls[0][0]
    expect(config.target).toBe(document.getElementById(AI_SDR_WIDGET_ROOT_ID))
    expect(config.api).toEqual({ baseUrl: AI_SDR_BFF_BASE_URL })
    expect(config.session).toEqual({
      productId: AI_SDR_PRODUCT_ID,
      metadata: { surface: AI_SDR_SURFACE },
    })
    expect(handle.open).toHaveBeenCalledTimes(1)

    // Once mounted, the custom launcher is removed so the bundle owns the UI.
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('does not inject a second bundle script when one is already present', () => {
    const existing = document.createElement('script')
    existing.id = AI_SDR_SCRIPT_ID
    document.head.append(existing)
    installBundle()
    render(<AiSdrWidget />)

    fireEvent.click(launcher())

    expect(document.querySelectorAll(`#${AI_SDR_SCRIPT_ID}`)).toHaveLength(1)
    existing.remove()
  })

  it('polls for the bundle global and mounts once it appears', () => {
    vi.useFakeTimers()
    render(<AiSdrWidget />)

    fireEvent.click(launcher())
    // Bundle not ready yet: launcher stays, in a disabled loading state.
    expect(launcher()).toBeDisabled()
    expect(launcher()).toHaveTextContent('Starting chat…')

    act(() => {
      vi.advanceTimersByTime(AI_SDR_POLL_INTERVAL_MS * 2)
    })
    const { handle } = installBundle()
    act(() => {
      vi.advanceTimersByTime(AI_SDR_POLL_INTERVAL_MS)
    })

    expect(handle.open).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('shows a retryable error if the bundle never loads within the poll ceiling', () => {
    vi.useFakeTimers()
    render(<AiSdrWidget />)

    fireEvent.click(launcher())
    act(() => {
      vi.advanceTimersByTime(AI_SDR_POLL_INTERVAL_MS * (AI_SDR_MAX_POLL_ATTEMPTS + 2))
    })

    const button = launcher()
    expect(button).toHaveTextContent('Chat unavailable, try again')
    expect(button).not.toBeDisabled()
  })

  it('surfaces an error if the bundle script fails to load', () => {
    render(<AiSdrWidget />)

    fireEvent.click(launcher())
    const script = document.getElementById(AI_SDR_SCRIPT_ID) as HTMLScriptElement
    act(() => {
      script.dispatchEvent(new Event('error'))
    })

    expect(launcher()).toHaveTextContent('Chat unavailable, try again')
  })

  it('surfaces an error (and does not mount) if creating/opening the widget throws', () => {
    const handle: FakeHandle = {
      open: vi.fn(() => {
        throw new Error('open failed')
      }),
      destroy: vi.fn(),
    }
    ;(window as unknown as { VentoraAiSdr?: unknown }).VentoraAiSdr = {
      createAiSdrWidget: vi.fn(() => handle),
    }
    render(<AiSdrWidget />)

    fireEvent.click(launcher())

    // Launcher stays visible in a retryable error state rather than disappearing.
    expect(launcher()).toHaveTextContent('Chat unavailable, try again')
  })

  it('destroys the hosted widget and clears pending polls on unmount', () => {
    vi.useFakeTimers()
    const { handle } = installBundle()
    const { unmount } = render(<AiSdrWidget />)

    fireEvent.click(launcher())
    expect(handle.open).toHaveBeenCalledTimes(1)

    unmount()
    expect(handle.destroy).toHaveBeenCalledTimes(1)
  })

  it('clears a pending poll timer on unmount before the bundle resolves', () => {
    vi.useFakeTimers()
    const clearSpy = vi.spyOn(window, 'clearTimeout')
    const { unmount } = render(<AiSdrWidget />)

    fireEvent.click(launcher())
    // A poll timer is now pending (bundle global is absent).
    unmount()

    expect(clearSpy).toHaveBeenCalled()
    clearSpy.mockRestore()
  })
})
