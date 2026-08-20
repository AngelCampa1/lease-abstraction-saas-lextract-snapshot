'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { extractionKeys } from '@/hooks/use-extraction'
import { teaserKeys } from '@/hooks/use-teaser'
import { creditsKeys } from '@/hooks/use-credits'
import { dashboardKeys } from '@/hooks/use-dashboard'

export function usePaymentReturn(extractionId: string): void {
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const handledRef = useRef<string | null>(null)

  useEffect(() => {
    const payment = searchParams.get('payment')
    if (!payment) return
    if (handledRef.current === payment) return
    handledRef.current = payment
    const access = searchParams.get('access')

    if (payment === 'success') {
      if (access === 'complete-account') {
        toast.info(
          'Payment successful. Complete account access or sign in to view your full results.'
        )
      } else {
        toast.success(
          'Payment successful! Your full results are now available.'
        )
      }
      queryClient.invalidateQueries({
        queryKey: extractionKeys.detail(extractionId),
      })
      // Invalidate teaser so results-content.tsx re-checks payment_status
      // and transitions from teaser view to full results view.
      queryClient.invalidateQueries({
        queryKey: teaserKeys.detail(extractionId),
      })
      // Credit pack purchases and per-extraction unlocks both change the
      // server-side balance, so refetch credits on every successful return.
      queryClient.invalidateQueries({
        queryKey: creditsKeys.all,
      })
      // The dashboard summary caches the credit balance, so refetch it after
      // a purchase/unlock to avoid showing a stale balance on return.
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.all,
      })
    } else if (payment === 'cancelled') {
      toast.info('Payment cancelled. You can try again anytime.')
    }

    router.replace(`/results/${extractionId}`, { scroll: false })
  }, [searchParams, extractionId, queryClient, router])
}
