'use client'

import { useCallback, useContext } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { AuthContext } from '@/components/auth/auth-provider'

export interface CreditTransaction {
  id: string
  amount: number
  balance_after: number
  description: string
  created_at: string
}

export interface CreditsResponse {
  balance: number
  recent_transactions?: CreditTransaction[]
}

export const creditsKeys = {
  all: ['credits'] as const,
}

export function useCredits() {
  // Read the auth context without throwing when outside an AuthProvider.
  // PublicAppShell renders the Header (which calls useCredits) for anonymous
  // visitors who have no session. We skip the API call for them to avoid
  // generating 401 noise in server logs.
  const authContext = useContext(AuthContext)
  const isAuthenticated = !!authContext?.session

  return useQuery({
    queryKey: creditsKeys.all,
    queryFn: () => apiGet<CreditsResponse>('/payments/credits'),
    enabled: isAuthenticated,
  })
}

/**
 * Returns a stable callback that invalidates the cached credit balance so the
 * next render fetches a fresh value. Use this after any action that changes the
 * server-side balance: Stripe checkout return, credit redemption, extraction
 * unlock, account-level credit grants, etc.
 */
export function useInvalidateCredits(): () => void {
  const queryClient = useQueryClient()
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: creditsKeys.all })
  }, [queryClient])
}
