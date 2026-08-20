'use client'

import { Header } from '@/components/layout/header'
import { PageTransition } from '@/components/layout/page-transition'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { AiCsWidget } from '@/components/ai-cs/ai-cs-widget'
import { CrmFeedbackWidget } from '@/components/feedback/crm-feedback-widget'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col">
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>
        <Header />
        <main id="main-content" className="flex-1" aria-label="Application">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
        <CrmFeedbackWidget />
        <AiCsWidget />
      </div>
    </ProtectedRoute>
  )
}
