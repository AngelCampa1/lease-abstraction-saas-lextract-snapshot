'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiPost } from '@/lib/api'
import { extractionKeys } from '@/hooks/use-extraction'
import { creditsKeys } from '@/hooks/use-credits'
import { teaserKeys } from '@/hooks/use-teaser'
import { dashboardKeys } from '@/hooks/use-dashboard'
import { captureEvent, EVENTS } from '@/lib/posthog'

export interface CheckoutRequest {
  product_type: 'single' | 'credit_pack_5' | 'credit_pack_10'
  extraction_id?: string
  success_url: string
  cancel_url: string
}

export interface CheckoutResponse {
  checkout_url: string
  session_id: string
}

export interface UseCreditRequest {
  extraction_id: string
}

export interface UseCreditResponse {
  success: boolean
  new_balance: number
  extraction_id: string
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: (data: CheckoutRequest) =>
      apiPost<CheckoutResponse>('/payments/checkout', data),
    onSuccess: (data) => {
      window.location.href = data.checkout_url
    },
  })
}

export function useUseCredit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UseCreditRequest) =>
      apiPost<UseCreditResponse>('/payments/use-credit', data),
    onSuccess: (data, variables) => {
      try {
        captureEvent(EVENTS.credit_used, {
          extraction_id: variables.extraction_id,
          new_balance: data.new_balance,
        })
      } catch {
        // Analytics must never block cache updates after a successful credit use.
      }
      queryClient.invalidateQueries({
        queryKey: extractionKeys.detail(variables.extraction_id),
      })
      // Invalidate teaser so results-content.tsx re-checks payment_status
      // and transitions from the teaser view to the full results view.
      queryClient.invalidateQueries({
        queryKey: teaserKeys.detail(variables.extraction_id),
      })
      queryClient.invalidateQueries({
        queryKey: creditsKeys.all,
      })
      // The dashboard summary caches the credit balance, so refetch it after
      // a credit is spent to avoid showing a stale balance on return.
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.all,
      })
    },
  })
}
