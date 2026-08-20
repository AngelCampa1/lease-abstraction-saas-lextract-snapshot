import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCompletionNotification } from '@/hooks/use-completion-notification'
import type { ExtractionStatus } from '@/hooks/use-extraction'

// Mock Notification constructor
class MockNotification {
  static permission: NotificationPermission = 'granted'
  title: string
  options: NotificationOptions | undefined
  onclick: ((ev: Event) => void) | null = null
  closed = false

  constructor(title: string, options?: NotificationOptions) {
    this.title = title
    this.options = options
    MockNotification.instances.push(this)
  }

  close() {
    this.closed = true
  }

  static instances: MockNotification[] = []
  static requestPermission = vi.fn().mockResolvedValue('granted')
}

// Access the module-level firedExtractionIds set via re-import trick:
// We reset it between tests by using unique ids per test.
let idCounter = 0
function uniqueId(): string {
  return `ext-${++idCounter}`
}

function setupNotification(permission: NotificationPermission = 'granted') {
  MockNotification.permission = permission
  MockNotification.instances = []
  Object.defineProperty(global, 'Notification', {
    value: MockNotification,
    writable: true,
    configurable: true,
  })
}

function setupDocument(hidden: boolean) {
  Object.defineProperty(document, 'hidden', {
    value: hidden,
    writable: true,
    configurable: true,
  })
}

describe('useCompletionNotification', () => {
  beforeEach(() => {
    setupNotification('granted')
    setupDocument(true) // tab is backgrounded by default in tests
    vi.spyOn(window, 'focus').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('complete status', () => {
    it('fires a Notification when status becomes "complete" and tab is hidden', () => {
      renderHook(() =>
        useCompletionNotification(uniqueId(), 'complete', 'lease.pdf')
      )

      expect(MockNotification.instances).toHaveLength(1)
      expect(MockNotification.instances[0].title).toBe('Extraction complete')
    })

    it('includes the filename in the notification body', () => {
      renderHook(() =>
        useCompletionNotification(uniqueId(), 'complete', 'my-lease.pdf')
      )

      expect(MockNotification.instances[0].options?.body).toBe('my-lease.pdf is ready to view.')
    })

    it('sets the icon to /favicon.ico', () => {
      renderHook(() =>
        useCompletionNotification(uniqueId(), 'complete', 'lease.pdf')
      )

      expect(MockNotification.instances[0].options?.icon).toBe('/favicon.ico')
    })

    it('does NOT fire when tab is focused (document.hidden === false)', () => {
      setupDocument(false)

      renderHook(() =>
        useCompletionNotification(uniqueId(), 'complete', 'lease.pdf')
      )

      expect(MockNotification.instances).toHaveLength(0)
    })

    it('does NOT fire when Notification.permission is not "granted"', () => {
      setupNotification('default')

      renderHook(() =>
        useCompletionNotification(uniqueId(), 'complete', 'lease.pdf')
      )

      expect(MockNotification.instances).toHaveLength(0)
    })

    it('does NOT fire when Notification.permission is "denied"', () => {
      setupNotification('denied')

      renderHook(() =>
        useCompletionNotification(uniqueId(), 'complete', 'lease.pdf')
      )

      expect(MockNotification.instances).toHaveLength(0)
    })

    it('does NOT fire when status is not terminal', () => {
      const statuses: ExtractionStatus[] = [
        'uploading',
        'extracting',
        'scoring',
      ]

      for (const status of statuses) {
        MockNotification.instances = []
        renderHook(() => useCompletionNotification(uniqueId(), status, 'lease.pdf'))
        expect(MockNotification.instances).toHaveLength(0)
      }
    })

    it('calls window.focus() when the notification is clicked', () => {
      renderHook(() =>
        useCompletionNotification(uniqueId(), 'complete', 'lease.pdf')
      )

      const notification = MockNotification.instances[0]
      notification.onclick?.(new Event('click'))

      expect(window.focus).toHaveBeenCalledTimes(1)
    })

    it('does not fire more than once for the same extraction id (module-level dedup)', () => {
      const id = uniqueId()

      const { rerender } = renderHook(
        ({ filename }: { filename: string }) =>
          useCompletionNotification(id, 'complete', filename),
        { initialProps: { filename: 'lease.pdf' } }
      )

      // Change filename to re-trigger the effect; module-level Set should block
      rerender({ filename: 'other.pdf' })

      expect(MockNotification.instances).toHaveLength(1)
    })

    it('fires again for a different extraction id', () => {
      const id1 = uniqueId()
      const id2 = uniqueId()

      renderHook(() => useCompletionNotification(id1, 'complete', 'lease1.pdf'))
      renderHook(() => useCompletionNotification(id2, 'complete', 'lease2.pdf'))

      expect(MockNotification.instances).toHaveLength(2)
    })

    it('does NOT fire when Notification is not in window', () => {
      const saved = (window as unknown as Record<string, unknown>).Notification
      delete (window as unknown as Record<string, unknown>).Notification

      renderHook(() => useCompletionNotification(uniqueId(), 'complete', 'lease.pdf'))

      expect(MockNotification.instances).toHaveLength(0)

      ;(window as unknown as Record<string, unknown>).Notification = saved
    })

    it('uses fallback body when filename is undefined', () => {
      renderHook(() =>
        useCompletionNotification(uniqueId(), 'complete', undefined)
      )

      expect(MockNotification.instances).toHaveLength(1)
      expect(MockNotification.instances[0].options?.body).toBe(
        'Your extraction is ready to view.'
      )
    })

    it('closes the notification on effect cleanup', () => {
      const { unmount } = renderHook(() =>
        useCompletionNotification(uniqueId(), 'complete', 'lease.pdf')
      )

      expect(MockNotification.instances).toHaveLength(1)
      unmount()
      expect(MockNotification.instances[0].closed).toBe(true)
    })
  })

  describe('failed status', () => {
    it('fires a failure Notification when status becomes "failed" and tab is hidden', () => {
      renderHook(() =>
        useCompletionNotification(uniqueId(), 'failed', 'lease.pdf')
      )

      expect(MockNotification.instances).toHaveLength(1)
      expect(MockNotification.instances[0].title).toBe('Extraction failed')
    })

    it('includes fallback body text for failed notification', () => {
      renderHook(() =>
        useCompletionNotification(uniqueId(), 'failed', 'lease.pdf')
      )

      expect(MockNotification.instances[0].options?.body).toBeTruthy()
    })

    it('does NOT fire failed notification when tab is focused', () => {
      setupDocument(false)

      renderHook(() =>
        useCompletionNotification(uniqueId(), 'failed', 'lease.pdf')
      )

      expect(MockNotification.instances).toHaveLength(0)
    })
  })

  describe('undefined status', () => {
    it('does not fire when status is undefined', () => {
      renderHook(() =>
        useCompletionNotification(uniqueId(), undefined, 'lease.pdf')
      )

      expect(MockNotification.instances).toHaveLength(0)
    })
  })

  describe('corrupted session storage', () => {
    afterEach(() => {
      sessionStorage.clear()
    })

    it('does not throw and still fires when the stored fired-ids are corrupted', () => {
      // A malformed value (e.g. extension interference or a partial write)
      // must not crash the processing/results view that mounts this hook.
      sessionStorage.setItem('lextract:fired-extraction-ids', '{not valid json')

      expect(() =>
        renderHook(() =>
          useCompletionNotification(uniqueId(), 'complete', 'lease.pdf')
        )
      ).not.toThrow()

      expect(MockNotification.instances).toHaveLength(1)
    })

    it('recovers by overwriting corrupted storage with a valid array', () => {
      sessionStorage.setItem('lextract:fired-extraction-ids', 'null')

      const id = uniqueId()
      renderHook(() => useCompletionNotification(id, 'complete', 'lease.pdf'))

      const raw = sessionStorage.getItem('lextract:fired-extraction-ids')
      expect(raw).not.toBeNull()
      const parsed: unknown = JSON.parse(raw as string)
      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed as string[]).toContain(id)
    })
  })
})
