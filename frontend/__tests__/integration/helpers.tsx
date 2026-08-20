/**
 * Shared test helpers for frontend integration tests.
 *
 * Provides renderWithProviders, mock factories, and fetch sequence helpers.
 */
import React, { type ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { FullExtraction } from '@/types/extraction'

// ── QueryClient Factory ─────────────────────────────────────────────────

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

// ── Wrapper ─────────────────────────────────────────────────────────────

interface WrapperProps {
  queryClient?: QueryClient
  children: React.ReactNode
}

function TestWrapper({ queryClient, children }: WrapperProps) {
  const qc = queryClient ?? createTestQueryClient()
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

export function renderWithProviders(
  ui: ReactElement,
  options?: RenderOptions & { queryClient?: QueryClient },
) {
  const queryClient = options?.queryClient ?? createTestQueryClient()
  return {
    queryClient,
    ...render(ui, {
      wrapper: ({ children }) => (
        <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
      ),
      ...options,
    }),
  }
}

// ── Mock Factories ──────────────────────────────────────────────────────

export function createMockExtraction(
  overrides?: Partial<FullExtraction>,
): FullExtraction {
  return {
    id: 'ext-test-123',
    status: 'complete',
    payment_status: 'paid',
    document_filename: 'lease.pdf',
    document_page_count: 10,
    extracted_data: {
      landlord_legal_name: {
        value: 'ACME Corp',
        confidence: 0.95,
        source_text: 'ACME Corp',
      },
      tenant_legal_name: {
        value: 'Tenant Inc',
        confidence: 0.90,
        source_text: 'Tenant Inc',
      },
      premises_address: {
        value: '123 Main St',
        confidence: 0.88,
        source_text: '123 Main St',
      },
    },
    confidence_scores: {
      landlord_legal_name: { score: 0.95, tier: 'high' },
      tenant_legal_name: { score: 0.90, tier: 'high' },
      premises_address: { score: 0.88, tier: 'high' },
    },
    overall_confidence: 0.91,
    red_flags: [],
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:05:00Z',
    ...overrides,
  } as FullExtraction
}

export function createMockTeaser(overrides?: Record<string, unknown>) {
  return {
    id: 'ext-test-123',
    status: 'complete',
    payment_status: 'unpaid',
    document_filename: 'lease.pdf',
    visible_fields: [
      { field_name: 'landlord_legal_name', label: 'Landlord', value: 'ACME Corp' },
      { field_name: 'tenant_legal_name', label: 'Tenant', value: 'Tenant Inc' },
      { field_name: 'premises_address', label: 'Premises', value: '123 Main St' },
      { field_name: 'commencement_date', label: 'Start Date', value: '2026-01-01' },
      { field_name: 'base_rent_annual', label: 'Rent', value: '$120,000' },
    ],
    total_field_count: 99,
    category_count: 14,
    confidence_distribution: { high: 80, medium: 15, low: 4 },
    red_flag_count: 2,
    ...overrides,
  }
}

// ── Fetch Helpers ───────────────────────────────────────────────────────

/**
 * Set up global.fetch to return a sequence of responses.
 * Each call to fetch returns the next response in the sequence.
 * After the sequence is exhausted, returns the last response.
 */
export function mockFetchSequence(responses: Array<{ status: number; body: unknown }>) {
  let callIndex = 0
  return vi.fn().mockImplementation(() => {
    const idx = Math.min(callIndex, responses.length - 1)
    callIndex++
    const resp = responses[idx]
    return Promise.resolve(
      new Response(JSON.stringify(resp.body), {
        status: resp.status,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  })
}

/**
 * Create a mock fetch that returns a fixed response.
 */
export function mockFetchResponse(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}
