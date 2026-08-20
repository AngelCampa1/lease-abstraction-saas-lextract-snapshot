'use client'

import { Suspense, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { ResultsContent } from '@/components/results/results-content'
import { ResultsSkeleton } from '@/components/skeletons'
import { useAuth } from '@/hooks/use-auth'
import { ANONYMOUS_SESSION_KEY } from '@/lib/neon-auth/types'

/**
 * Reads the `session_token` query param from the URL and stores it in
 * localStorage under ANONYMOUS_SESSION_KEY when no active user session exists.
 *
 * This supports the guest checkout return flow: after Stripe redirects the
 * guest back, the backend may append `?session_token=<tok>` so the frontend
 * can authenticate subsequent API requests as the newly-created anonymous
 * session linked to the extraction.
 */
function SessionTokenCapture() {
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (loading) return
    if (user) return // authenticated user - session_token not needed

    const sessionToken = searchParams.get('session_token')
    if (!sessionToken) return

    if (typeof window !== 'undefined') {
      localStorage.setItem(ANONYMOUS_SESSION_KEY, sessionToken)
      // Remove the token from the URL so it is not visible in the address bar
      // or accidentally shared; do this after storing so the value is never lost
      const url = new URL(window.location.href)
      url.searchParams.delete('session_token')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams, user, loading])

  return null
}

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>()
  return (
    <Suspense fallback={<div className="mx-auto max-w-4xl px-4 py-8"><ResultsSkeleton /></div>}>
      <SessionTokenCapture />
      <ResultsContent id={id} />
    </Suspense>
  )
}
