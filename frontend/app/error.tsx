'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { captureFrontendException } from '@/lib/sentry-reporting'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  const [trackingId, setTrackingId] = useState<string | undefined>(error.digest)

  useEffect(() => {
    const eventId = captureFrontendException(error, {
      area: 'app',
      route: 'root',
      surface: 'error-boundary',
    })
    queueMicrotask(() => setTrackingId(eventId ?? error.digest))
  }, [error])

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="max-w-md text-muted-foreground">
            An unexpected error occurred. Please try again, or contact support if the
            problem persists.
          </p>
          {trackingId && (
            <p className="font-mono text-xs text-muted-foreground">
              Tracking ID: {trackingId}
            </p>
          )}
          <Button onClick={reset}>Try again</Button>
        </div>
      </body>
    </html>
  )
}
