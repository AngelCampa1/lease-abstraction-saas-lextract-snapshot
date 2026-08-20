/**
 * Integration tests for error recovery.
 *
 * BUG #8: api.ts handleResponse does not wrap success-path response.json()
 * in try/catch. A 200 response with malformed JSON throws raw SyntaxError
 * instead of ApiError.
 *
 * BUG #10: Processing page shows "Extraction not found" for ALL API errors,
 * including 500 server errors. Should differentiate.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiGet, ApiError, getAuthHeaders } from '@/lib/api'

// Mock neon auth client
const mockGetSession = vi.fn()
vi.mock('@/lib/neon-auth/client', () => ({
  createAuthClient: () => ({
    getSession: mockGetSession,
    onAuthStateChange: () => () => {},
  }),
}))

describe('Error Recovery', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({ data: null, error: null })
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  describe('BUG #8: Malformed JSON on 200 response', () => {
    it('throws ApiError for malformed JSON on 200', async () => {
      // Server returns 200 OK with invalid JSON body
      global.fetch = vi.fn().mockResolvedValue(
        new Response('not valid json {{{', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      try {
        await apiGet('/extractions/test-id')
        expect.fail('Should have thrown an error')
      } catch (error) {
        // Fixed: malformed JSON on success path throws ApiError
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).detail).toBe('Invalid response format from server')
      }
    })

    it('error-path JSON parsing failure is handled gracefully', async () => {
      // Server returns 500 with invalid JSON body
      global.fetch = vi.fn().mockResolvedValue(
        new Response('Internal Server Error', {
          status: 500,
          headers: { 'Content-Type': 'text/plain' },
        }),
      )

      // The error path handles malformed JSON correctly (has try/catch)
      try {
        await apiGet('/extractions/test-id')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).status).toBe(500)
        // Falls back to default message when JSON parse fails
        expect((error as ApiError).detail).toContain('500')
      }
    })
  })

  describe('Auth header fallback', () => {
    it('falls back to anonymous token when auth client throws', async () => {
      // Auth client throws
      mockGetSession.mockRejectedValue(new Error('Auth unavailable'))

      // Set anonymous token in localStorage
      const mockStorage: Record<string, string> = {
        'lextract_session_token': 'anon-token-xyz',
      }
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
        (key: string) => mockStorage[key] ?? null,
      )

      const headers = await getAuthHeaders()

      // Should fall back to X-Session-Token
      expect(headers['X-Session-Token']).toBe('anon-token-xyz')
      expect(headers['Authorization']).toBeUndefined()

      vi.restoreAllMocks()
    })

    it('returns empty headers when no auth available', async () => {
      mockGetSession.mockResolvedValue({ data: null, error: null })
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null)

      const headers = await getAuthHeaders()

      expect(Object.keys(headers)).toHaveLength(0)

      vi.restoreAllMocks()
    })
  })

  describe('API error responses', () => {
    it('extracts detail from JSON error response', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ detail: 'Extraction not found' }),
          { status: 404 },
        ),
      )

      try {
        await apiGet('/extractions/missing')
        expect.fail('Should throw')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).status).toBe(404)
        expect((error as ApiError).detail).toBe('Extraction not found')
      }
    })

    it('provides default message for non-JSON error response', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response('Bad Gateway', { status: 502 }),
      )

      try {
        await apiGet('/extractions/test')
        expect.fail('Should throw')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).status).toBe(502)
        expect((error as ApiError).detail).toContain('502')
      }
    })
  })
})
