import { getAuthHeaders, ApiError } from '@/lib/api'
import { captureFrontendApiError } from '@/lib/sentry-reporting'

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

/** Five minutes. Long enough for large lease PDFs over slow connections; short
 * enough that a wedged TCP connection surfaces as a real error instead of an
 * indefinite spinner. */
export const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000

/** Thrown when the upload XHR exceeds {@link UPLOAD_TIMEOUT_MS}. Surface as a
 * dedicated user-facing message so the UI can suggest retrying instead of
 * blaming the file or the server. */
export class UploadTimeoutError extends ApiError {
  constructor() {
    super(0, 'Upload timed out', {
      userMessage: 'Upload timed out - please retry',
    })
    this.name = 'UploadTimeoutError'
  }
}

export interface UploadResponse {
  extraction_id: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function stringField(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key]
  return typeof value === 'string' && value.trim() ? value : undefined
}

function reportUploadError(error: ApiError): void {
  if (error.status !== 0 && error.status >= 300 && error.status < 500) return
  const eventId = captureFrontendApiError(error, {
    area: 'public-app',
    route: '/extractions/upload',
    externalService: 'backend-api',
    operation: 'upload-pdf',
    statusCode: error.status,
  })
  if (eventId && !error.trackingId) {
    error.trackingId = eventId
  }
}

function rejectUpload(reject: (reason?: unknown) => void, error: ApiError): void {
  reportUploadError(error)
  reject(error)
}

export async function uploadFile(
  file: File,
  onProgress: (percent: number) => void,
  signal?: AbortSignal
): Promise<UploadResponse> {
  const headers = await getAuthHeaders()

  return new Promise<UploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort()
        reject(new ApiError(0, 'Upload cancelled'))
      })
    }

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100)
        onProgress(percent)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data: unknown = JSON.parse(xhr.responseText)
          if (
            typeof data === 'object' &&
            data !== null &&
            'extraction_id' in data &&
            typeof (data as Record<string, unknown>).extraction_id === 'string'
          ) {
            resolve({ extraction_id: (data as Record<string, unknown>).extraction_id as string })
          } else {
            rejectUpload(reject, new ApiError(xhr.status, 'Invalid response format'))
          }
        } catch {
          rejectUpload(reject, new ApiError(xhr.status, 'Failed to parse response'))
        }
      } else {
        let detail = `Upload failed with status ${xhr.status}`
        let userMessage: string | undefined
        let requestId: string | undefined
        let trackingId: string | undefined
        try {
          const body: unknown = JSON.parse(xhr.responseText)
          if (isRecord(body)) {
            detail = stringField(body, 'detail') ?? stringField(body, 'message') ?? detail
            userMessage = stringField(body, 'message')
            requestId = stringField(body, 'request_id')
            trackingId = stringField(body, 'tracking_id') ?? requestId
          }
        } catch {
          // Use default message
        }
        rejectUpload(reject, new ApiError(xhr.status, detail, {
          requestId,
          trackingId,
          userMessage,
        }))
      }
    })

    xhr.addEventListener('error', () => {
      rejectUpload(reject, new ApiError(0, 'Network error during upload'))
    })

    xhr.addEventListener('abort', () => {
      reject(new ApiError(0, 'Upload cancelled'))
    })

    xhr.addEventListener('timeout', () => {
      rejectUpload(reject, new UploadTimeoutError())
    })

    xhr.timeout = UPLOAD_TIMEOUT_MS

    const formData = new FormData()
    formData.append('file', file)

    xhr.open('POST', `${BASE_URL}/extractions/upload`)

    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value)
    }

    xhr.send(formData)
  })
}
