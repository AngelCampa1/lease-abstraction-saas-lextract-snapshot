/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiGet, apiPost, apiPut, apiPatch, apiDelete, ApiError, getAuthHeaders } from '@/lib/api'
import { resetAuthStateSnapshot, setAuthStateSnapshot } from '@/lib/auth-state'

const mockCaptureFrontendApiError = vi.hoisted(() => vi.fn())

vi.mock('@/lib/sentry-reporting', () => ({
  captureFrontendApiError: mockCaptureFrontendApiError,
}))

// Helper to build a Response from /api/auth/token
function makeTokenResponse(jwt: string | null, status = 200) {
  const body = jwt !== null ? JSON.stringify({ token: jwt }) : JSON.stringify({})
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeApiResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('API Client', () => {
  const originalFetch = global.fetch
  const storage = new Map<string, string>()

  beforeEach(() => {
    vi.clearAllMocks()
    mockCaptureFrontendApiError.mockClear()
    global.fetch = vi.fn()
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
    vi.unstubAllGlobals()
  })

  describe('getAuthHeaders', () => {
    it('returns Bearer JWT when token endpoint returns a token', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        makeTokenResponse('eddsajwt.abc.def')
      )

      const headers = await getAuthHeaders()

      expect(headers['Authorization']).toBe('Bearer eddsajwt.abc.def')
      expect(global.fetch).toHaveBeenCalledOnce()
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/token', { credentials: 'include' })
    })

    it('falls through to anonymous token when token endpoint returns non-ok status', async () => {
      localStorage.setItem('lextract_session_token', 'anon-session-xyz')
      vi.mocked(global.fetch).mockResolvedValueOnce(makeTokenResponse(null, 401))

      const headers = await getAuthHeaders()

      expect(headers['Authorization']).toBeUndefined()
      expect(headers['X-Session-Token']).toBe('anon-session-xyz')
    })

    it('falls through to anonymous token when token response has no token field', async () => {
      localStorage.setItem('lextract_session_token', 'anon-session-abc')
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ other: 'field' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const headers = await getAuthHeaders()

      expect(headers['Authorization']).toBeUndefined()
      expect(headers['X-Session-Token']).toBe('anon-session-abc')
    })

    it('returns empty headers when no auth and no anonymous session token', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(makeTokenResponse(null, 401))

      const headers = await getAuthHeaders()

      expect(headers['Authorization']).toBeUndefined()
      expect(headers['X-Session-Token']).toBeUndefined()
    })

    it('returns empty headers when window is unavailable', async () => {
      vi.unstubAllGlobals()
      global.fetch = vi.fn().mockResolvedValueOnce(makeTokenResponse(null, 401))

      const headers = await getAuthHeaders()

      expect(headers).toEqual({})
    })

    it('falls through to anonymous token when fetch throws', async () => {
      localStorage.setItem('lextract_session_token', 'fallback-token')
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

      const headers = await getAuthHeaders()

      expect(headers['X-Session-Token']).toBe('fallback-token')
      expect(mockCaptureFrontendApiError).toHaveBeenCalledWith(
        expect.any(ApiError),
        expect.objectContaining({
          route: '/api/auth/token',
          operation: 'auth-token-probe',
          statusCode: 0,
        }),
      )
    })

    it('reports auth token endpoint server failures while falling through', async () => {
      localStorage.setItem('lextract_session_token', 'fallback-token')
      vi.mocked(global.fetch).mockResolvedValueOnce(makeTokenResponse(null, 503))

      const headers = await getAuthHeaders()

      expect(headers['X-Session-Token']).toBe('fallback-token')
      expect(mockCaptureFrontendApiError).toHaveBeenCalledWith(
        expect.any(ApiError),
        expect.objectContaining({
          route: '/api/auth/token',
          externalService: 'auth-token-route',
          operation: 'auth-token-probe',
          statusCode: 503,
        }),
      )
    })

    it('reports unexpected non-401 token endpoint failures while falling through', async () => {
      localStorage.setItem('lextract_session_token', 'fallback-token')
      vi.mocked(global.fetch).mockResolvedValueOnce(makeTokenResponse(null, 429))

      const headers = await getAuthHeaders()

      expect(headers['X-Session-Token']).toBe('fallback-token')
      expect(mockCaptureFrontendApiError).toHaveBeenCalledWith(
        expect.any(ApiError),
        expect.objectContaining({
          route: '/api/auth/token',
          operation: 'auth-token-probe',
          statusCode: 429,
        }),
      )
    })

    it('uses anonymous session token from localStorage when unauthenticated', async () => {
      localStorage.setItem('lextract_session_token', 'anon-only-token')
      vi.mocked(global.fetch).mockResolvedValueOnce(makeTokenResponse(null, 401))

      const headers = await getAuthHeaders()

      expect(headers['X-Session-Token']).toBe('anon-only-token')
      expect(headers['Authorization']).toBeUndefined()
    })

    it('skips token probing once auth has resolved anonymous', async () => {
      localStorage.setItem('lextract_session_token', 'anon-resolved-token')
      setAuthStateSnapshot({ status: 'anonymous' })

      const headers = await getAuthHeaders()

      expect(headers['X-Session-Token']).toBe('anon-resolved-token')
      expect(headers['Authorization']).toBeUndefined()
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('forces token probing for auth-link calls even after auth resolves anonymous', async () => {
      localStorage.setItem('lextract_session_token', 'anon-resolved-token')
      setAuthStateSnapshot({ status: 'anonymous' })
      vi.mocked(global.fetch).mockResolvedValueOnce(makeTokenResponse('fresh-jwt'))

      const headers = await getAuthHeaders({ forceTokenProbe: true })

      expect(headers['Authorization']).toBe('Bearer fresh-jwt')
      expect(headers['X-Session-Token']).toBeUndefined()
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/token', { credentials: 'include' })
    })
  })

  describe('apiGet', () => {
    it('makes a GET request to the correct URL', async () => {
      const mockResponse = { id: '1', name: 'test' }
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(makeTokenResponse(null, 401)) // no auth
        .mockResolvedValueOnce(makeApiResponse(mockResponse))

      const result = await apiGet('/extractions/1')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/extractions/1',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      )
      expect(result).toEqual(mockResponse)
    })

    it('includes Bearer JWT in Authorization header', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(makeTokenResponse('the-jwt-token'))
        .mockResolvedValueOnce(makeApiResponse({}))

      await apiGet('/test')

      const apiCall = vi.mocked(global.fetch).mock.calls[1]
      const headers = apiCall[1]?.headers as Record<string, string>
      expect(headers['Authorization']).toBe('Bearer the-jwt-token')
    })

    it('includes X-Session-Token when no JWT and session token in localStorage', async () => {
      localStorage.setItem('lextract_session_token', 'anon-session-456')
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(makeTokenResponse(null, 401))
        .mockResolvedValueOnce(makeApiResponse({}))

      await apiGet('/test')

      const apiCall = vi.mocked(global.fetch).mock.calls[1]
      const headers = apiCall[1]?.headers as Record<string, string>
      expect(headers['X-Session-Token']).toBe('anon-session-456')
    })

    it('prefers JWT over anonymous session token', async () => {
      localStorage.setItem('lextract_session_token', 'anon-token')
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(makeTokenResponse('jwt-wins'))
        .mockResolvedValueOnce(makeApiResponse({}))

      await apiGet('/test')

      const apiCall = vi.mocked(global.fetch).mock.calls[1]
      const headers = apiCall[1]?.headers as Record<string, string>
      expect(headers['Authorization']).toBe('Bearer jwt-wins')
      expect(headers['X-Session-Token']).toBeUndefined()
    })

    it('throws ApiError on non-OK response with detail', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(makeTokenResponse(null, 401))
        .mockResolvedValueOnce(makeApiResponse({ detail: 'Not found' }, 404))

      await expect(apiGet('/missing')).rejects.toMatchObject({
        name: 'ApiError',
        status: 404,
        detail: 'Not found',
      })
    })

    it('preserves request and tracking IDs from standard backend errors', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(makeTokenResponse(null, 401))
        .mockResolvedValueOnce(makeApiResponse({
          status_code: 503,
          message: 'Service temporarily unavailable',
          detail: 'Please try again.',
          request_id: 'req-api-1',
          tracking_id: 'event-api-1',
        }, 503))

      await expect(apiGet('/extractions/1')).rejects.toMatchObject({
        name: 'ApiError',
        status: 503,
        detail: 'Please try again.',
        userMessage: 'Service temporarily unavailable',
        requestId: 'req-api-1',
        trackingId: 'event-api-1',
      })

      expect(mockCaptureFrontendApiError).toHaveBeenCalledWith(
        expect.any(ApiError),
        expect.objectContaining({
          area: 'app',
          route: '/extractions/1',
          externalService: 'backend-api',
          statusCode: 503,
        }),
      )
    })

    it('falls back to request ID when backend omits tracking ID', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(makeTokenResponse(null, 401))
        .mockResolvedValueOnce(makeApiResponse({
          message: 'Service temporarily unavailable',
          request_id: 'req-only',
        }, 503))

      await expect(apiGet('/extractions/1')).rejects.toMatchObject({
        requestId: 'req-only',
        trackingId: 'req-only',
      })
    })

    it('tags upload endpoint failures as public app area', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(makeTokenResponse(null, 401))
        .mockResolvedValueOnce(makeApiResponse({ message: 'Upload failed' }, 500))

      await expect(apiGet('/extractions/upload')).rejects.toMatchObject({
        status: 500,
      })

      expect(mockCaptureFrontendApiError).toHaveBeenCalledWith(
        expect.any(ApiError),
        expect.objectContaining({ area: 'public-app' }),
      )
    })

    it('does not report expected 404 responses to Sentry', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(makeTokenResponse(null, 401))
        .mockResolvedValueOnce(makeApiResponse({
          status_code: 404,
          message: 'Extraction not found',
          request_id: 'req-404',
        }, 404))

      await expect(apiGet('/extractions/missing')).rejects.toMatchObject({
        status: 404,
        requestId: 'req-404',
      })

      expect(mockCaptureFrontendApiError).not.toHaveBeenCalled()
    })

    it('throws ApiError with default message when body has no detail', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(makeTokenResponse(null, 401))
        .mockResolvedValueOnce(makeApiResponse({ error: 'something' }, 500))

      await expect(apiGet('/error')).rejects.toMatchObject({
        name: 'ApiError',
        status: 500,
        detail: expect.stringContaining('500'),
      })
    })

    it('throws ApiError when response body is not JSON', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(makeTokenResponse(null, 401))
        .mockResolvedValueOnce(
          new Response('Internal Server Error', {
            status: 500,
            headers: { 'Content-Type': 'text/plain' },
          })
        )

      await expect(apiGet('/error')).rejects.toBeInstanceOf(ApiError)
    })

    it('reports invalid successful JSON responses', async () => {
      mockCaptureFrontendApiError.mockReturnValueOnce('event-bad-json')
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(makeTokenResponse(null, 401))
        .mockResolvedValueOnce(new Response('not-json', { status: 200 }))

      await expect(apiGet('/bad-json')).rejects.toMatchObject({
        status: 200,
        detail: 'Invalid response format from server',
        trackingId: 'event-bad-json',
      })

      expect(mockCaptureFrontendApiError).toHaveBeenCalledWith(
        expect.any(ApiError),
        expect.objectContaining({
          area: 'app',
          route: '/bad-json',
          externalService: 'backend-api',
          statusCode: 200,
        }),
      )
    })

    it('reports fetch rejections as network failures', async () => {
      mockCaptureFrontendApiError.mockReturnValueOnce('event-network')
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(makeTokenResponse(null, 401))
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))

      await expect(apiGet('/network-down')).rejects.toMatchObject({
        status: 0,
        detail: 'Network error while contacting server',
        trackingId: 'event-network',
      })

      expect(mockCaptureFrontendApiError).toHaveBeenCalledWith(
        expect.any(ApiError),
        expect.objectContaining({
          area: 'app',
          route: '/network-down',
          statusCode: 0,
        }),
      )
    })

    it('tags marketing backend failures as marketing area', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(makeTokenResponse(null, 401))
        .mockResolvedValueOnce(makeApiResponse({ message: 'Bad gateway' }, 502))

      await expect(apiGet('/leads/magnet')).rejects.toMatchObject({
        status: 502,
      })

      expect(mockCaptureFrontendApiError).toHaveBeenCalledWith(
        expect.any(ApiError),
        expect.objectContaining({ area: 'marketing', route: '/leads/magnet' }),
      )
    })

    it('sends no auth headers when no JWT and no anonymous session token', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(makeTokenResponse(null, 401))
        .mockResolvedValueOnce(makeApiResponse({}))

      await apiGet('/test')

      const apiCall = vi.mocked(global.fetch).mock.calls[1]
      const headers = apiCall[1]?.headers as Record<string, string>
      expect(headers['Authorization']).toBeUndefined()
      expect(headers['X-Session-Token']).toBeUndefined()
    })

    it('falls through to anonymous session token when token endpoint throws', async () => {
      localStorage.setItem('lextract_session_token', 'fallback-token')
      vi.mocked(global.fetch)
        .mockRejectedValueOnce(new Error('Auth client unavailable'))
        .mockResolvedValueOnce(makeApiResponse({}))

      await apiGet('/test')

      const apiCall = vi.mocked(global.fetch).mock.calls[1]
      const headers = apiCall[1]?.headers as Record<string, string>
      expect(headers['X-Session-Token']).toBe('fallback-token')
    })
  })

  describe('apiPost', () => {
    it('sends POST with JSON body', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(makeTokenResponse(null, 401))
        .mockResolvedValueOnce(makeApiResponse({ id: '1' }, 201))

      const result = await apiPost('/extractions', { file_name: 'test.pdf' })

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/extractions',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ file_name: 'test.pdf' }),
        })
      )
      expect(result).toEqual({ id: '1' })
    })

    it('sends POST without body when undefined', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(makeTokenResponse(null, 401))
        .mockResolvedValueOnce(makeApiResponse({}))

      await apiPost('/trigger')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ method: 'POST', body: undefined })
      )
    })
  })

  describe('apiPut', () => {
    it('sends PUT with JSON body', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(makeTokenResponse(null, 401))
        .mockResolvedValueOnce(makeApiResponse({ updated: true }))

      const result = await apiPut('/extractions/1', { status: 'completed' })

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/extractions/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ status: 'completed' }),
        })
      )
      expect(result).toEqual({ updated: true })
    })

    it('sends PUT without body when undefined', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(makeTokenResponse(null, 401))
        .mockResolvedValueOnce(makeApiResponse({}))

      await apiPut('/trigger')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ method: 'PUT', body: undefined })
      )
    })

    it('handles 204 No Content response', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(makeTokenResponse(null, 401))
        .mockResolvedValueOnce(new Response(null, { status: 204 }))

      const result = await apiPut('/extractions/1/complete')
      expect(result).toBeUndefined()
    })
  })

  describe('apiPatch', () => {
    it('sends PATCH with JSON body', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(makeTokenResponse(null, 401))
        .mockResolvedValueOnce(makeApiResponse({ patched: true }))

      const result = await apiPatch('/extractions/1', { field: 'value' })

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/extractions/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ field: 'value' }),
        })
      )
      expect(result).toEqual({ patched: true })
    })

    it('sends PATCH without body when undefined', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(makeTokenResponse(null, 401))
        .mockResolvedValueOnce(makeApiResponse({}))

      await apiPatch('/trigger')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ method: 'PATCH', body: undefined })
      )
    })
  })

  describe('apiDelete', () => {
    it('sends DELETE request', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(makeTokenResponse(null, 401))
        .mockResolvedValueOnce(makeApiResponse({ deleted: true }))

      const result = await apiDelete('/extractions/1')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/extractions/1',
        expect.objectContaining({ method: 'DELETE' })
      )
      expect(result).toEqual({ deleted: true })
    })
  })

  describe('ApiError', () => {
    it('has correct name, status, and detail', () => {
      const error = new ApiError(422, 'Validation failed')
      expect(error.name).toBe('ApiError')
      expect(error.status).toBe(422)
      expect(error.detail).toBe('Validation failed')
      expect(error.message).toBe('Validation failed')
      expect(error).toBeInstanceOf(Error)
    })
  })
})
