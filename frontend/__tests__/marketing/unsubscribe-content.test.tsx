import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UnsubscribeContent } from '@/app/(marketing)/unsubscribe/unsubscribe-content'

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('id=lead-123'),
}))

vi.mock('next/image', () => ({
  default: ({
    alt,
    priority,
  }: {
    alt: string
    priority?: boolean
    [key: string]: unknown
  }) => {
    void priority
    return <span aria-label={alt} role="img" />
  },
}))

function renderWithQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <UnsubscribeContent />
    </QueryClientProvider>,
  )
}

describe('UnsubscribeContent', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })))
  })

  it('confirms the user is off emails without naming a sequence', async () => {
    renderWithQueryClient()

    await waitFor(() => {
      expect(screen.getByText("You've been unsubscribed")).toBeInTheDocument()
    })

    expect(screen.getByText(/You won't receive any more emails/i)).toBeInTheDocument()
    expect(screen.queryByText(/sequence/i)).not.toBeInTheDocument()
  })
})
