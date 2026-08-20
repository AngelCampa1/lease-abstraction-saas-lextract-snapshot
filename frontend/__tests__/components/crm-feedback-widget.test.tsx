import { render } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { CrmFeedbackWidget } from '@/components/feedback/crm-feedback-widget'

// next/script renders a <script> tag in jsdom; mock it so we can inspect the props.
// Use a <div> stand-in to avoid the @next/next/no-sync-scripts lint rule in test files.
vi.mock('next/script', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (props: Record<string, any>) => {
    return (
      <div
        data-testid="mock-script"
        data-src={props.src}
        data-product={props['data-product']}
        data-widget={props['data-widget']}
      />
    )
  },
}))

const DEFAULT_LOADER = 'https://widgets.ventoralabs.com/w/v1.js'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('CrmFeedbackWidget', () => {
  it('renders nothing when NEXT_PUBLIC_CRM_WIDGET_KEY is not set', () => {
    vi.stubEnv('NEXT_PUBLIC_CRM_WIDGET_KEY', '')
    const { container } = render(<CrmFeedbackWidget />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a script stand-in with correct src and data-attributes when key is set', () => {
    vi.stubEnv('NEXT_PUBLIC_CRM_WIDGET_KEY', 'wk_testkey123')
    const { container } = render(<CrmFeedbackWidget />)

    const el = container.querySelector('[data-testid="mock-script"]')
    expect(el).not.toBeNull()
    expect(el?.getAttribute('data-src')).toBe(DEFAULT_LOADER)
    expect(el?.getAttribute('data-product')).toBe('wk_testkey123')
    expect(el?.getAttribute('data-widget')).toBe('feedback-button')
  })

  it('uses NEXT_PUBLIC_CRM_LOADER_URL when provided', () => {
    vi.stubEnv('NEXT_PUBLIC_CRM_WIDGET_KEY', 'wk_testkey123')
    vi.stubEnv('NEXT_PUBLIC_CRM_LOADER_URL', 'https://crm.example.com/w/v1.js')
    const { container } = render(<CrmFeedbackWidget />)

    const el = container.querySelector('[data-testid="mock-script"]')
    expect(el?.getAttribute('data-src')).toBe('https://crm.example.com/w/v1.js')
  })

  it('falls back to default loader URL when NEXT_PUBLIC_CRM_LOADER_URL is not set', () => {
    vi.stubEnv('NEXT_PUBLIC_CRM_WIDGET_KEY', 'wk_somekey')
    vi.stubEnv('NEXT_PUBLIC_CRM_LOADER_URL', '')
    const { container } = render(<CrmFeedbackWidget />)

    const el = container.querySelector('[data-testid="mock-script"]')
    expect(el?.getAttribute('data-src')).toBe(DEFAULT_LOADER)
  })
})
