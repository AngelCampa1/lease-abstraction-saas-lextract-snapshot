/**
 * Shared test helpers for integration tests.
 */

import { QueryClient } from '@tanstack/react-query'
import type { FullExtraction } from '@/types/extraction'

/**
 * Creates a QueryClient configured for testing:
 * - No retries (fail fast)
 * - No stale time (always refetch)
 * - No garbage collection delay
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

/**
 * Creates a minimal valid FullExtraction (Extraction) object for testing.
 * Provide overrides to customize individual fields.
 */
export function createMockExtraction(
  overrides: Partial<FullExtraction> = {},
): FullExtraction {
  return {
    id: 'ext-test-1',
    status: 'complete',
    payment_status: 'paid',
    document_filename: 'test-lease.pdf',
    document_page_count: null,
    property_type: null,
    extracted_data: {
      landlord_legal_name: { value: 'ACME Corp' },
      tenant_legal_name: { value: 'Test Tenant LLC' },
    },
    confidence_scores: {
      landlord_legal_name: { score: 0.92, tier: 'high' },
      tenant_legal_name: { score: 0.78, tier: 'medium' },
    },
    red_flags: [],
    show_camaudit: false,
    overall_confidence: 0.85,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:01:00Z',
    ...overrides,
  }
}
