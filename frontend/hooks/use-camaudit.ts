'use client'

import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'

interface CamauditPayloadResponse {
  redirect_url: string
  extraction_id: string
}

interface UseCamauditOptions {
  extractionId: string
}

function getStorageKey(extractionId: string): string {
  return `camaudit-dismissed-${extractionId}`
}

function readDismissed(extractionId: string): boolean {
  try {
    return localStorage.getItem(getStorageKey(extractionId)) === 'true'
  } catch {
    return false
  }
}

export function useCamaudit({ extractionId }: UseCamauditOptions) {
  const [isDismissed, setIsDismissed] = useState<boolean>(() =>
    readDismissed(extractionId)
  )

  const dismiss = useCallback(() => {
    localStorage.setItem(getStorageKey(extractionId), 'true')
    setIsDismissed(true)
  }, [extractionId])

  const mutation = useMutation({
    mutationFn: async () => {
      const data = await apiGet<CamauditPayloadResponse>(
        `/extractions/${extractionId}/camaudit-payload`
      )
      // Validate the redirect URL inside mutationFn so a bad or spoofed URL
      // rejects the mutation (isError -> error banner). Validating here rather
      // than in onSuccess keeps the guard from depending on react-query's
      // internal "throw-in-onSuccess becomes an error" behavior and removes a
      // throwing side effect from the navigation callback.
      // startsWith('https://camaudit.io') would allow camaudit.io.evil.com, so
      // we parse the URL and compare the hostname exactly instead.
      let parsed: URL
      try {
        parsed = new URL(data.redirect_url)
      } catch {
        throw new Error('Invalid redirect URL: not a valid URL')
      }
      const allowedHostnames = ['camaudit.io', 'www.camaudit.io']
      if (
        parsed.protocol !== 'https:' ||
        !allowedHostnames.includes(parsed.hostname)
      ) {
        throw new Error('Invalid redirect URL: unexpected CamAudit hostname')
      }
      return data
    },
    onSuccess: (data) => {
      window.location.href = data.redirect_url
    },
  })

  return {
    isDismissed,
    dismiss,
    mutation,
  }
}
