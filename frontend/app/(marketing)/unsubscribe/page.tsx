import { Suspense } from 'react'
import type { Metadata } from 'next'
import { UnsubscribeContent } from './unsubscribe-content'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Unsubscribe',
  robots: {
    index: false,
    follow: false,
  },
}

export default function UnsubscribePage() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <Suspense fallback={<div className="text-slate-500 text-sm">Loading…</div>}>
        <UnsubscribeContent />
      </Suspense>
    </main>
  )
}
