'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { ApiError } from '@/lib/api'
import { uploadFile } from '@/lib/api-upload'
import { ANONYMOUS_SESSION_KEY } from '@/lib/neon-auth/types'
import { authClient } from '@/lib/neon-auth/client'
import { captureEvent, EVENTS } from '@/lib/posthog'

export interface UseUploadReturn {
  upload: (file: File) => void
  progress: number
  isPending: boolean
  isSuccess: boolean
  isError: boolean
  error: ApiError | null
  extractionId: string | null
  fileName: string | null
  reset: () => void
}

async function ensureSession(): Promise<void> {
  // Check Neon Auth session first
  try {
    const { data } = await authClient.getSession()
    if (data?.session?.token) {
      return
    }
  } catch {
    // Auth client not available; continue
  }

  // Check anonymous session token
  if (typeof window !== 'undefined') {
    const existing = localStorage.getItem(ANONYMOUS_SESSION_KEY)
    if (existing) {
      return
    }
  }

  // Create anonymous session
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
  const response = await fetch(`${baseUrl}/auth/anonymous`, {
    method: 'POST',
  })

  if (!response.ok) {
    throw new ApiError(response.status, 'Failed to create anonymous session')
  }

  const data: unknown = await response.json()
  if (
    typeof data === 'object' &&
    data !== null &&
    'session_token' in data &&
    typeof (data as Record<string, unknown>).session_token === 'string'
  ) {
    const token = (data as Record<string, unknown>).session_token as string
    if (typeof window !== 'undefined') {
      localStorage.setItem(ANONYMOUS_SESSION_KEY, token)
    }
  } else {
    throw new ApiError(500, 'Invalid anonymous session response')
  }
}

export function useUpload(): UseUploadReturn {
  const [progress, setProgress] = useState(0)
  const [isPending, setIsPending] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [extractionId, setExtractionId] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const uploadSequenceRef = useRef(0)
  // Track whether the component is still mounted to avoid setState after unmount.
  const mountedRef = useRef(true)
  useEffect(() => {
    return () => {
      mountedRef.current = false
      abortControllerRef.current?.abort()
    }
  }, [])

  const upload = useCallback((file: File) => {
    const uploadSequence = uploadSequenceRef.current + 1
    uploadSequenceRef.current = uploadSequence
    setProgress(0)
    setIsPending(true)
    setIsSuccess(false)
    setIsError(false)
    setError(null)
    setExtractionId(null)
    setFileName(file.name)

    const controller = new AbortController()
    abortControllerRef.current = controller

    captureEvent(EVENTS.upload_started, { file_size: file.size })

    ensureSession()
      .then(() =>
        uploadFile(
          file,
          (percent) => {
            if (uploadSequenceRef.current === uploadSequence) {
              setProgress(percent)
            }
          },
          controller.signal
        )
      )
      .then((result) => {
        if (!mountedRef.current) return
        if (uploadSequenceRef.current !== uploadSequence) return
        setExtractionId(result.extraction_id)
        setIsSuccess(true)
        setIsPending(false)
      })
      .catch((err: unknown) => {
        if (!mountedRef.current) return
        if (uploadSequenceRef.current !== uploadSequence) return
        const errorMessage =
          err instanceof Error ? err.message : 'An unexpected error occurred'
        captureEvent(EVENTS.upload_failed, { error_message: errorMessage })
        if (err instanceof ApiError) {
          setError(err)
        } else if (err instanceof Error) {
          setError(new ApiError(0, err.message))
        } else {
          setError(new ApiError(0, 'An unexpected error occurred'))
        }
        setIsError(true)
        setIsPending(false)
      })
  }, [])

  const reset = useCallback(() => {
    uploadSequenceRef.current += 1
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setProgress(0)
    setIsPending(false)
    setIsSuccess(false)
    setIsError(false)
    setError(null)
    setExtractionId(null)
    setFileName(null)
  }, [])

  return {
    upload,
    progress,
    isPending,
    isSuccess,
    isError,
    error,
    extractionId,
    fileName,
    reset,
  }
}
