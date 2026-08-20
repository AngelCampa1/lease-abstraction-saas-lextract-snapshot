'use client'

import Link from 'next/link'
import { CheckCircle2, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WelcomeBannerProps {
  hasExtractions: boolean
  hasUnpaidExtractions: boolean
}

export function WelcomeBanner({ hasExtractions, hasUnpaidExtractions }: WelcomeBannerProps) {
  return (
    <div
      data-testid="welcome-banner"
      className="rounded-xl border border-primary/35 bg-primary/8 p-6 dark:bg-primary/12"
    >
      <h2 className="text-lg font-semibold">Get started with Lextract</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Follow these steps to run your first lease.
      </p>

      <ol className="mt-4 space-y-3">
        {/* Step 1 - always complete */}
        <li className="flex items-center gap-3 text-sm">
          <CheckCircle2 className="size-5 shrink-0 text-primary" aria-hidden="true" />
          <span className="text-foreground">Create your account</span>
        </li>

        {/* Step 2 - complete when hasExtractions */}
        <li className="flex items-center gap-3 text-sm">
          {hasExtractions ? (
            <>
              <CheckCircle2 className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <span className="text-foreground">Upload a lease PDF</span>
            </>
          ) : (
            <>
              <Circle className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <Link
                href="/upload"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Upload a lease PDF
              </Link>
            </>
          )}
        </li>

        {/* Step 3 - only shown when hasUnpaidExtractions */}
        {hasUnpaidExtractions && (
          <li className="flex items-center gap-3 text-sm">
            <Circle className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="text-foreground">
              <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                Unlock your first report
              </Link>
            </span>
          </li>
        )}
      </ol>

      {!hasExtractions && (
        <div className="mt-5">
          <Button size="sm" asChild>
            <Link href="/upload">Upload your first lease →</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
