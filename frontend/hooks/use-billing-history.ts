'use client'

import { useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { AuthContext } from '@/components/auth/auth-provider'

export type PaymentType = 'single' | 'credit_pack_5' | 'credit_pack_10'

export interface PaymentHistoryItem {
  id: string
  payment_type: PaymentType | string
  amount_cents: number
  currency: string
  status: string
  created_at: string
}

export interface PaymentHistoryResponse {
  payments: PaymentHistoryItem[]
  total: number
  page: number
  page_size: number
}

export const billingHistoryKeys = {
  payments: ['billing', 'payments'] as const,
}

/**
 * Fetches the authenticated user's payment history from
 * `GET /api/v1/payments/history`. Disabled when no session is present so we do
 * not spam 401s for anonymous visitors.
 */
export function usePaymentHistory() {
  const authContext = useContext(AuthContext)
  const isAuthenticated = !!authContext?.session

  return useQuery({
    queryKey: billingHistoryKeys.payments,
    queryFn: () => apiGet<PaymentHistoryResponse>('/payments/history'),
    enabled: isAuthenticated,
  })
}
