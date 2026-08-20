/**
 * Integration tests for payment unlock flow.
 *
 * Tests the use-credit mutation and its query invalidation chain.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { useUseCredit, useCreateCheckout } from '@/hooks/use-payment'
import { extractionKeys } from '@/hooks/use-extraction'
import { creditsKeys } from '@/hooks/use-credits'
import { createTestQueryClient, createMockExtraction } from './helpers'

// Mock neon auth client
const mockGetSession = vi.fn()
vi.mock('@/lib/neon-auth/client', () => ({
  createAuthClient: () => ({
    getSession: mockGetSession,
    onAuthStateChange: () => () => {},
  }),
}))

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe('Payment Unlock Flow', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({ data: null, error: null })
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  describe('useUseCredit', () => {
    it('calls API and invalidates queries on success', async () => {
      const queryClient = createTestQueryClient()
      const extractionId = 'ext-pay-1'

      // Pre-populate cache
      queryClient.setQueryData(
        extractionKeys.detail(extractionId),
        createMockExtraction({ id: extractionId, payment_status: 'unpaid' }),
      )
      queryClient.setQueryData(creditsKeys.all, { balance: 5 })
      queryClient.setQueryData(['teaser', extractionId], { id: extractionId })

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      // Use mockImplementation to create fresh Response for each fetch call.
      // getAuthHeaders() makes the first fetch call (/api/auth/token) — each call
      // needs its own Response instance because the body stream is consumed on read.
      global.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ success: true, new_balance: 4 }),
            { status: 200 },
          ),
        ),
      )

      const { result } = renderHook(() => useUseCredit(), {
        wrapper: createWrapper(queryClient),
      })

      result.current.mutate({ extraction_id: extractionId })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Verify all three invalidations fired
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: extractionKeys.detail(extractionId),
        }),
      )
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: creditsKeys.all,
        }),
      )
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['teaser', extractionId],
        }),
      )
    })

    it('propagates 402 error on insufficient credits', async () => {
      const queryClient = createTestQueryClient()

      global.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ detail: 'Insufficient credits' }),
            { status: 402 },
          ),
        ),
      )

      const { result } = renderHook(() => useUseCredit(), {
        wrapper: createWrapper(queryClient),
      })

      result.current.mutate({ extraction_id: 'ext-no-credits' })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      // Error should be an ApiError with status 402
      expect(result.current.error).toBeTruthy()
    })
  })

  describe('useCreateCheckout', () => {
    it('sets window.location.href on success', async () => {
      const queryClient = createTestQueryClient()
      const checkoutUrl = 'https://checkout.stripe.com/c/pay_123'

      global.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ checkout_url: checkoutUrl }),
            { status: 200 },
          ),
        ),
      )

      // Mock window.location
      const originalHref = window.location.href
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...window.location, href: '' },
      })

      const { result } = renderHook(() => useCreateCheckout(), {
        wrapper: createWrapper(queryClient),
      })

      result.current.mutate({
        product_type: 'single',
        extraction_id: 'ext-checkout-1',
        success_url: 'https://lextract.io/success',
        cancel_url: 'https://lextract.io/cancel',
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(window.location.href).toBe(checkoutUrl)

      // Restore
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...window.location, href: originalHref },
      })
    })
  })
})
