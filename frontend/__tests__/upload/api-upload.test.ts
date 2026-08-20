/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadFile, UPLOAD_TIMEOUT_MS, UploadTimeoutError } from '@/lib/api-upload'
import { ApiError } from '@/lib/api'
import { resetAuthStateSnapshot, setAuthStateSnapshot } from '@/lib/auth-state'

const mockCaptureFrontendApiError = vi.hoisted(() => vi.fn())

vi.mock('@/lib/sentry-reporting', () => ({
  captureFrontendApiError: mockCaptureFrontendApiError,
}))

vi.mock('@/lib/neon-auth/client', () => ({
  createAuthClient: () => ({
    getSession: vi.fn().mockResolvedValue({ data: null, error: null }),
    onAuthStateChange: () => () => {},
  }),
}))

interface MockXHR {
  open: ReturnType<typeof vi.fn>
  send: ReturnType<typeof vi.fn>
  setRequestHeader: ReturnType<typeof vi.fn>
  abort: ReturnType<typeof vi.fn>
  upload: { addEventListener: ReturnType<typeof vi.fn> }
  addEventListener: ReturnType<typeof vi.fn>
  status: number
  responseText: string
  timeout: number
  _listeners: Record<string, Array<(event?: unknown) => void>>
  _uploadListeners: Record<string, Array<(event?: unknown) => void>>
  _trigger: (event: string, data?: unknown) => void
  _triggerUpload: (event: string, data?: unknown) => void
}

let mockXhr: MockXHR

function createMockXhr(): MockXHR {
  const listeners: Record<string, Array<(event?: unknown) => void>> = {}
  const uploadListeners: Record<string, Array<(event?: unknown) => void>> = {}

  const xhr: MockXHR = {
    open: vi.fn(),
    send: vi.fn(),
    setRequestHeader: vi.fn(),
    abort: vi.fn(),
    upload: {
      addEventListener: vi.fn((event: string, handler: (event?: unknown) => void) => {
        if (!uploadListeners[event]) uploadListeners[event] = []
        uploadListeners[event].push(handler)
      }),
    },
    addEventListener: vi.fn((event: string, handler: (event?: unknown) => void) => {
      if (!listeners[event]) listeners[event] = []
      listeners[event].push(handler)
    }),
    status: 200,
    responseText: '{"extraction_id": "ext-123"}',
    timeout: 0,
    _listeners: listeners,
    _uploadListeners: uploadListeners,
    _trigger: (event: string, data?: unknown) => {
      (listeners[event] ?? []).forEach((fn) => fn(data))
    },
    _triggerUpload: (event: string, data?: unknown) => {
      (uploadListeners[event] ?? []).forEach((fn) => fn(data))
    },
  }
  return xhr
}

/** Wait for microtasks to flush so getAuthHeaders() resolves and XHR gets set up */
function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

beforeEach(() => {
  vi.restoreAllMocks()
  mockCaptureFrontendApiError.mockClear()
  resetAuthStateSnapshot()
  setAuthStateSnapshot({ status: 'anonymous' })
  mockXhr = createMockXhr()
  // Use function keyword so `new XMLHttpRequest()` works as a constructor.
  // Return the shared `mockXhr` singleton so primitive properties the
  // implementation assigns (e.g. `xhr.timeout`) are observable on the same
  // object the test inspects — a copy via Object.assign would lose them.
  vi.stubGlobal(
    'XMLHttpRequest',
    function MockXMLHttpRequest(this: MockXHR): MockXHR {
      return mockXhr
    }
  )

  const localStorageMock = {
    getItem: vi.fn((key: string) => (key === 'lextract_session_token' ? 'test-token' : null)),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  }
  vi.stubGlobal('localStorage', localStorageMock)
  vi.stubGlobal('window', { localStorage: localStorageMock })
})

describe('uploadFile', () => {
  it('sends FormData to correct endpoint', async () => {
    const file = new File(['pdf-content'], 'lease.pdf', { type: 'application/pdf' })
    const onProgress = vi.fn()

    const promise = uploadFile(file, onProgress)

    // Wait for getAuthHeaders to resolve so XHR is created
    await flushMicrotasks()
    mockXhr._trigger('load')

    const result = await promise

    expect(mockXhr.open).toHaveBeenCalledWith(
      'POST',
      'http://localhost:8000/api/v1/extractions/upload'
    )
    expect(mockXhr.send).toHaveBeenCalled()
    expect(result).toEqual({ extraction_id: 'ext-123' })
  })

  it('sets auth headers from getAuthHeaders', async () => {
    const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })
    const onProgress = vi.fn()

    const promise = uploadFile(file, onProgress)
    await flushMicrotasks()
    mockXhr._trigger('load')
    await promise

    expect(mockXhr.setRequestHeader).toHaveBeenCalledWith(
      'X-Session-Token',
      'test-token'
    )
  })

  it('calls onProgress with percentage during upload', async () => {
    const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })
    const onProgress = vi.fn()

    const promise = uploadFile(file, onProgress)
    await flushMicrotasks()

    mockXhr._triggerUpload('progress', {
      lengthComputable: true,
      loaded: 50,
      total: 100,
    })
    mockXhr._trigger('load')
    await promise

    expect(onProgress).toHaveBeenCalledWith(50)
  })

  it('rejects with ApiError on HTTP error', async () => {
    const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })
    const onProgress = vi.fn()

    mockXhr.status = 413
    mockXhr.responseText = '{"detail": "File too large"}'

    const promise = uploadFile(file, onProgress)
    await flushMicrotasks()
    mockXhr._trigger('load')

    await expect(promise).rejects.toBeInstanceOf(ApiError)
    try {
      await promise
    } catch (err) {
      expect(err).toMatchObject({ status: 413, detail: 'File too large' })
    }
    expect(mockCaptureFrontendApiError).not.toHaveBeenCalled()
  })

  it('uses default upload error when error body is not JSON', async () => {
    const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })
    const onProgress = vi.fn()

    mockXhr.status = 502
    mockXhr.responseText = 'not-json'

    const promise = uploadFile(file, onProgress)
    await flushMicrotasks()
    mockXhr._trigger('load')

    await expect(promise).rejects.toMatchObject({
      status: 502,
      detail: 'Upload failed with status 502',
    })
    expect(mockCaptureFrontendApiError).toHaveBeenCalled()
  })

  it('rejects with parse error when success body is not JSON', async () => {
    const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })
    const onProgress = vi.fn()

    mockXhr.responseText = 'not-json'

    const promise = uploadFile(file, onProgress)
    await flushMicrotasks()
    mockXhr._trigger('load')

    await expect(promise).rejects.toMatchObject({
      status: 200,
      detail: 'Failed to parse response',
    })
  })

  it('rejects with ApiError on network error', async () => {
    const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })
    const onProgress = vi.fn()
    mockCaptureFrontendApiError.mockReturnValueOnce('event-upload-network')

    const promise = uploadFile(file, onProgress)
    await flushMicrotasks()
    mockXhr._trigger('error')

    await expect(promise).rejects.toBeInstanceOf(ApiError)
    try {
      await promise
    } catch (err) {
      expect(err).toMatchObject({
        detail: 'Network error during upload',
        trackingId: 'event-upload-network',
      })
    }
    expect(mockCaptureFrontendApiError).toHaveBeenCalledWith(
      expect.any(ApiError),
      expect.objectContaining({
        area: 'public-app',
        route: '/extractions/upload',
        externalService: 'backend-api',
        operation: 'upload-pdf',
        statusCode: 0,
      }),
    )
  })

  it('reports backend 5xx upload failures with tracking IDs', async () => {
    const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })
    const onProgress = vi.fn()

    mockXhr.status = 502
    mockXhr.responseText = JSON.stringify({
      message: 'Service temporarily unavailable',
      detail: 'Please try again.',
      request_id: 'req-upload',
      tracking_id: 'event-upload',
    })

    const promise = uploadFile(file, onProgress)
    await flushMicrotasks()
    mockXhr._trigger('load')

    await expect(promise).rejects.toMatchObject({
      status: 502,
      userMessage: 'Service temporarily unavailable',
      requestId: 'req-upload',
      trackingId: 'event-upload',
    })
    expect(mockCaptureFrontendApiError).toHaveBeenCalledWith(
      expect.any(ApiError),
      expect.objectContaining({
        area: 'public-app',
        route: '/extractions/upload',
        externalService: 'backend-api',
        operation: 'upload-pdf',
        statusCode: 502,
      }),
    )
  })

  it('uses message when upload error body omits detail', async () => {
    const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })
    const onProgress = vi.fn()

    mockXhr.status = 500
    mockXhr.responseText = JSON.stringify({
      message: 'Upload service failed',
      request_id: 'req-upload-only',
    })

    const promise = uploadFile(file, onProgress)
    await flushMicrotasks()
    mockXhr._trigger('load')

    await expect(promise).rejects.toMatchObject({
      status: 500,
      detail: 'Upload service failed',
      trackingId: 'req-upload-only',
    })
  })

  it('aborts when signal is aborted', async () => {
    const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })
    const onProgress = vi.fn()
    const controller = new AbortController()

    const promise = uploadFile(file, onProgress, controller.signal)
    await flushMicrotasks()
    controller.abort()

    await expect(promise).rejects.toBeInstanceOf(ApiError)
    try {
      await promise
    } catch (err) {
      expect(err).toMatchObject({ detail: 'Upload cancelled' })
    }
  })

  it('rejects when the xhr abort event fires', async () => {
    const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })
    const onProgress = vi.fn()

    const promise = uploadFile(file, onProgress)
    await flushMicrotasks()
    mockXhr._trigger('abort')

    await expect(promise).rejects.toMatchObject({
      status: 0,
      detail: 'Upload cancelled',
    })
  })

  it('rejects with ApiError on invalid response format', async () => {
    const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })
    const onProgress = vi.fn()
    mockCaptureFrontendApiError.mockReturnValueOnce('event-upload-format')

    mockXhr.responseText = '{"other_field": "value"}'

    const promise = uploadFile(file, onProgress)
    await flushMicrotasks()
    mockXhr._trigger('load')

    await expect(promise).rejects.toBeInstanceOf(ApiError)
    try {
      await promise
    } catch (err) {
      expect(err).toMatchObject({
        detail: 'Invalid response format',
        trackingId: 'event-upload-format',
      })
    }
    expect(mockCaptureFrontendApiError).toHaveBeenCalledWith(
      expect.any(ApiError),
      expect.objectContaining({
        route: '/extractions/upload',
        operation: 'upload-pdf',
        statusCode: 200,
      }),
    )
  })

  it('reports parse failures on successful upload responses', async () => {
    const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })
    const onProgress = vi.fn()

    mockXhr.responseText = 'not-json'

    const promise = uploadFile(file, onProgress)
    await flushMicrotasks()
    mockXhr._trigger('load')

    await expect(promise).rejects.toMatchObject({
      status: 200,
      detail: 'Failed to parse response',
    })
    expect(mockCaptureFrontendApiError).toHaveBeenCalledWith(
      expect.any(ApiError),
      expect.objectContaining({ statusCode: 200 }),
    )
  })

  it('sets xhr.timeout to five minutes', async () => {
    const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })
    const onProgress = vi.fn()

    const promise = uploadFile(file, onProgress)
    await flushMicrotasks()
    mockXhr._trigger('load')
    await promise

    expect(UPLOAD_TIMEOUT_MS).toBe(5 * 60 * 1000)
    expect(mockXhr.timeout).toBe(UPLOAD_TIMEOUT_MS)
  })

  it('rejects with UploadTimeoutError on timeout event', async () => {
    const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })
    const onProgress = vi.fn()
    mockCaptureFrontendApiError.mockReturnValueOnce('event-upload-timeout')

    const promise = uploadFile(file, onProgress)
    await flushMicrotasks()
    mockXhr._trigger('timeout')

    await expect(promise).rejects.toBeInstanceOf(UploadTimeoutError)
    try {
      await promise
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect(err).toMatchObject({
        name: 'UploadTimeoutError',
        userMessage: 'Upload timed out - please retry',
      })
    }
  })

  it('does not fire progress for non-computable events', async () => {
    const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })
    const onProgress = vi.fn()

    const promise = uploadFile(file, onProgress)
    await flushMicrotasks()

    mockXhr._triggerUpload('progress', {
      lengthComputable: false,
      loaded: 0,
      total: 0,
    })
    mockXhr._trigger('load')
    await promise

    expect(onProgress).not.toHaveBeenCalled()
  })
})
