'use client'

import { Header } from '@/components/layout/header'
import { MarketingHeader } from '@/components/marketing/header'
import { PageTransition } from '@/components/layout/page-transition'
import { useAuth } from '@/hooks/use-auth'
import { FeedbackButton } from '@/components/feedback/feedback-button'

export function PublicAppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      {/* Authenticated users get the app header; anonymous users see the marketing header.
          Use `user` directly (without the `!loading` guard) so that an authenticated user
          whose session is still resolving doesn't flash the marketing header. */}
      {user ? <Header /> : <MarketingHeader />}
      <main id="main-content" className="flex-1" aria-label="Content">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
      <FeedbackButton />
    </div>
  )
}
