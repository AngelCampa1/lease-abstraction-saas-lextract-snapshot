import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNotificationPermission } from '@/hooks/use-notification-permission'

describe('useNotificationPermission', () => {
  const originalNotification = global.Notification

  afterEach(() => {
    // Restore global Notification
    if (originalNotification) {
      Object.defineProperty(global, 'Notification', {
        value: originalNotification,
        writable: true,
        configurable: true,
      })
    } else {
      // @ts-expect-error intentionally deleting for test
      delete global.Notification
    }
  })

  function mockNotification(
    permission: NotificationPermission,
    requestResult: NotificationPermission = 'granted'
  ) {
    const mockRequestPermission = vi.fn().mockResolvedValue(requestResult)
    Object.defineProperty(global, 'Notification', {
      value: class MockNotification {
        static permission = permission
        static requestPermission = mockRequestPermission
      },
      writable: true,
      configurable: true,
    })
    return mockRequestPermission
  }

  describe('isSupported', () => {
    it('returns false when Notification is not defined', () => {
      // @ts-expect-error intentionally removing for test
      delete global.Notification

      const { result } = renderHook(() => useNotificationPermission())
      expect(result.current.isSupported).toBe(false)
    })

    it('returns true when Notification is defined', () => {
      mockNotification('default')

      const { result } = renderHook(() => useNotificationPermission())
      expect(result.current.isSupported).toBe(true)
    })
  })

  describe('permission', () => {
    it('reflects Notification.permission === "default" on mount', () => {
      mockNotification('default')

      const { result } = renderHook(() => useNotificationPermission())
      expect(result.current.permission).toBe('default')
    })

    it('reflects Notification.permission === "granted" on mount', () => {
      mockNotification('granted')

      const { result } = renderHook(() => useNotificationPermission())
      expect(result.current.permission).toBe('granted')
    })

    it('reflects Notification.permission === "denied" on mount', () => {
      mockNotification('denied')

      const { result } = renderHook(() => useNotificationPermission())
      expect(result.current.permission).toBe('denied')
    })

    it('defaults to "default" when Notification is not supported', () => {
      // @ts-expect-error intentionally removing for test
      delete global.Notification

      const { result } = renderHook(() => useNotificationPermission())
      expect(result.current.permission).toBe('default')
    })
  })

  describe('requestPermission', () => {
    it('calls Notification.requestPermission()', async () => {
      const mockReq = mockNotification('default', 'granted')

      const { result } = renderHook(() => useNotificationPermission())

      await act(async () => {
        await result.current.requestPermission()
      })

      expect(mockReq).toHaveBeenCalledTimes(1)
    })

    it('updates permission state to "granted" after user grants', async () => {
      mockNotification('default', 'granted')

      const { result } = renderHook(() => useNotificationPermission())
      expect(result.current.permission).toBe('default')

      await act(async () => {
        await result.current.requestPermission()
      })

      expect(result.current.permission).toBe('granted')
    })

    it('updates permission state to "denied" after user denies', async () => {
      mockNotification('default', 'denied')

      const { result } = renderHook(() => useNotificationPermission())

      await act(async () => {
        await result.current.requestPermission()
      })

      expect(result.current.permission).toBe('denied')
    })

    it('does nothing when Notification is not supported', async () => {
      // @ts-expect-error intentionally removing for test
      delete global.Notification

      const { result } = renderHook(() => useNotificationPermission())

      // Should not throw
      await act(async () => {
        await result.current.requestPermission()
      })

      expect(result.current.permission).toBe('default')
    })
  })
})
