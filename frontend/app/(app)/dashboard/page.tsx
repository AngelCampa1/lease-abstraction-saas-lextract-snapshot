'use client'

import { useEffect, useRef, useCallback } from 'react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { useDashboard } from '@/hooks/use-dashboard'
import { QuickStats } from '@/components/dashboard/quick-stats'
import { CreditCard } from '@/components/dashboard/credit-card'
import { ExtractionList } from '@/components/dashboard/extraction-list'
import { EmptyState } from '@/components/dashboard/empty-state'
import { WelcomeBanner } from '@/components/dashboard/welcome-banner'
import { DashboardSkeleton } from '@/components/skeletons'
import { captureEvent, EVENTS } from '@/lib/posthog'

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboard()
  const trackedRef = useRef(false)
  const handleRetry = useCallback(() => { void refetch() }, [refetch])

  useEffect(() => {
    if (data && !trackedRef.current) {
      trackedRef.current = true
      captureEvent(EVENTS.dashboard_viewed, {
        extraction_count: data.recent_extractions.length,
        credit_balance: data.credit_balance,
      })
    }
  }, [data])

  if (isLoading) {
    return (
      <div className="py-8">
        <h1 className="mb-6 font-display text-2xl font-bold text-brand-dark">Dashboard</h1>
        <DashboardSkeleton />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="py-8">
        <h1 className="mb-6 font-display text-2xl font-bold text-brand-dark">Dashboard</h1>
        <div className="flex flex-col items-start gap-3" role="alert">
          <p className="text-destructive">Failed to load dashboard data.</p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Try again
          </Button>
        </div>
      </div>
    )
  }

  const hasExtractions = data.recent_extractions.length > 0
  const hasUnpaidExtractions = data.recent_extractions.some(
    (e) => e.status === 'complete' && e.payment_status !== 'paid'
  )

  return (
    <div className="py-8">
      <h1 className="mb-6 font-display text-2xl font-bold text-brand-dark">Dashboard</h1>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {(!hasExtractions || hasUnpaidExtractions) && (
          <motion.div variants={fadeInUp}>
            <WelcomeBanner
              hasExtractions={hasExtractions}
              hasUnpaidExtractions={hasUnpaidExtractions}
            />
          </motion.div>
        )}

        {hasExtractions && (
          <motion.div variants={fadeInUp}>
            <QuickStats stats={data.quick_stats} totalCount={data.extraction_count} />
          </motion.div>
        )}

        {hasExtractions ? (
          <div className="grid gap-6 md:grid-cols-[1fr_300px]">
            <motion.div variants={fadeInUp}>
              <h2 className="mb-4 text-lg font-semibold">Extractions</h2>
              <ExtractionList />
            </motion.div>
            <motion.div variants={fadeInUp}>
              <CreditCard balance={data.credit_balance} />
            </motion.div>
          </div>
        ) : (
          <motion.div variants={fadeInUp}>
            <EmptyState />
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
