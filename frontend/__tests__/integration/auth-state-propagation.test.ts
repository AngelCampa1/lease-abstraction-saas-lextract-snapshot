/** @vitest-environment node */
/**
 * Integration tests for auth state propagation.
 *
 * Tests that the API client correctly switches between Bearer token
 * and X-Session-Token based on auth state.
 *
 * getAuthHeaders() fetches /api/auth/token — it does NOT call createAuthClient.getSession().
 * Tests mock global.fetch to simulate authenticated vs anonymous states.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getAuthHeaders, apiGet } from '@/lib/api'
import { resetAuthStateSnapshot, setAuthStateSnapshot } from '@/lib/auth-state'

describe('Auth State Propagation', () => {
  const originalFetch = global.fetch
  const storage = new Map<string, string>()

  beforeEach(() => {
    vi.clearAllMocks()
    storage.clear()
    const localStorageMock = {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storage.set(key, value)
      }),
      removeItem: vi.fn((key: string) => {
        storage.delete(key)
      }),
      clear: vi.fn(() => {
        storage.clear()
      }),
    }
    vi.stubGlobal('localStorage', localStorageMock)
    vi.stubGlobal('window', { localStorage: localStorageMock })
  })

  afterEach(() => {
    global.fetch = originalFetch
    resetAuthStateSnapshot()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('getAuthHeaders', () => {
    it('returns Bearer token when authenticated', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ token: 'jwt-token-123' }), { status: 200 }),
      )

      const headers = await getAuthHeaders()
      expect(headers['Authorization']).toBe('Bearer jwt-token-123')
      expect(headers['X-Session-Token']).toBeUndefined()
    })

    it('returns X-Session-Token when anonymous', async () => {
      // /api/auth/token returns 401 for anonymous users
      global.fetch = vi.fn().mockResolvedValue(
        new Response(null, { status: 401 }),
      )
      vi.mocked(localStorage.getItem).mockReturnValue('anon-session-xyz')

      const headers = await getAuthHeaders()
      expect(headers['X-Session-Token']).toBe('anon-session-xyz')
      expect(headers['Authorization']).toBeUndefined()
    })

    it('Bearer token takes priority over anonymous token', async () => {
      // Both are available — Bearer should win
      global.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ token: 'jwt-token-456' }), { status: 200 }),
      )
      vi.mocked(localStorage.getItem).mockReturnValue('anon-token-still-here')

      const headers = await getAuthHeaders()

      // Bearer takes priority — anonymous token is NOT included
      expect(headers['Authorization']).toBe('Bearer jwt-token-456')
      expect(headers['X-Session-Token']).toBeUndefined()
    })

    it('falls back to anonymous when token endpoint returns non-token body', async () => {
      // 200 response but no `token` field — should fall through to anonymous
      global.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
      )
      vi.mocked(localStorage.getItem).mockReturnValue('anon-fallback')

      const headers = await getAuthHeaders()
      expect(headers['X-Session-Token']).toBe('anon-fallback')
    })

    it('returns empty headers when nothing available', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response(null, { status: 401 }),
      )
      vi.mocked(localStorage.getItem).mockReturnValue(null)

      const headers = await getAuthHeaders()
      expect(Object.keys(headers)).toHaveLength(0)
    })

    it('falls back to anonymous when fetch throws', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('network error'))
      vi.mocked(localStorage.getItem).mockReturnValue('anon-network-fail')

      const headers = await getAuthHeaders()
      expect(headers['X-Session-Token']).toBe('anon-network-fail')
    })

    it('does not probe /api/auth/token after auth resolves anonymous', async () => {
      setAuthStateSnapshot({ status: 'anonymous' })
      vi.mocked(localStorage.getItem).mockReturnValue('anon-resolved')
      global.fetch = vi.fn()

      const headers = await getAuthHeaders()

      expect(headers['X-Session-Token']).toBe('anon-resolved')
      expect(headers['Authorization']).toBeUndefined()
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('API client uses correct auth in requests', () => {
    it('includes Bearer token in API requests when authenticated', async () => {
      // First call to fetch: /api/auth/token → returns JWT
      // Second call to fetch: actual API request
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ token: 'jwt-for-api' }), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ data: 'test' }), { status: 200 }),
        )

      await apiGet('/test')

      // The second call (the actual API request) should have the Bearer header
      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(global.fetch).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer jwt-for-api',
          }),
        }),
      )
    })

    it('includes X-Session-Token when anonymous', async () => {
      vi.mocked(localStorage.getItem).mockReturnValue('anon-api-token')

      // First call: /api/auth/token → 401 (not authenticated)
      // Second call: actual API request
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status: 401 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ data: 'test' }), { status: 200 }),
        )

      await apiGet('/test')

      expect(global.fetch).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Session-Token': 'anon-api-token',
          }),
        }),
      )
    })

    it('uses anonymous session token without a probe after auth resolves anonymous', async () => {
      setAuthStateSnapshot({ status: 'anonymous' })
      vi.mocked(localStorage.getItem).mockReturnValue('anon-api-token')
      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ data: 'test' }), { status: 200 }),
      )

      await apiGet('/test')

      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Session-Token': 'anon-api-token',
          }),
        }),
      )
    })
  })
})
