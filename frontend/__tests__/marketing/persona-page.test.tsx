import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock('@/lib/site-config', () => ({
  SITE_URL: 'https://lextract.io',
  DEFAULT_OG_IMAGE: {
    url: '/og-image.png',
    width: 1200,
    height: 630,
    alt: 'Lextract — AI-Powered Commercial Lease Abstraction',
  },
}))

// content-matching reads the content directory at runtime; stub it so the
// server component renders without filesystem access.
vi.mock('@/lib/content-matching', () => ({
  getAllContentItems: vi.fn(async () => []),
  getRelatedContentForPseo: vi.fn(() => []),
  getSmartCrossLinks: vi.fn(() => []),
}))

import PersonaPage from '@/app/(marketing)/for/[slug]/page'
import { getPersonaBySlug } from '@/data/personas'

async function renderPersona(slug: string) {
  const ui = await PersonaPage({ params: Promise.resolve({ slug }) })
  return render(ui)
}

describe('PersonaPage', () => {
  it('renders the h1 with the persona role', async () => {
    await renderPersona('tenant-representatives')
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toMatch(/Tenant Representatives/i)
  })

  it('renders the hero subhead with the speakable class', async () => {
    const persona = getPersonaBySlug('tenant-representatives')
    const { container } = await renderPersona('tenant-representatives')
    const subhead = container.querySelector('.persona-hero-subhead')
    expect(subhead).toBeInTheDocument()
    expect(subhead?.textContent).toBe(persona?.heroSubhead)
  })

  it('renders the ROI stat value, label, and detail', async () => {
    const persona = getPersonaBySlug('property-managers')
    await renderPersona('property-managers')
    expect(screen.getByText(persona!.roiStat.value)).toBeInTheDocument()
    expect(screen.getByText(persona!.roiStat.label)).toBeInTheDocument()
    expect(screen.getByText(persona!.roiStat.detail)).toBeInTheDocument()
  })

  it('renders every outcome in the outcomes list', async () => {
    const persona = getPersonaBySlug('property-managers')
    const { container } = await renderPersona('property-managers')
    const list = container.querySelector('.persona-outcomes')
    expect(list).toBeInTheDocument()
    for (const outcome of persona!.outcomes) {
      expect(within(list as HTMLElement).getByText(outcome)).toBeInTheDocument()
    }
  })

  it('renders the primary CTA linking to /upload', async () => {
    await renderPersona('tenant-representatives')
    const ctas = screen.getAllByRole('link', { name: /upload your lease/i })
    expect(ctas.length).toBeGreaterThanOrEqual(1)
    expect(ctas[0]).toHaveAttribute('href', '/upload')
  })

  it('renders breadcrumb navigation', async () => {
    await renderPersona('tenant-representatives')
    expect(
      screen.getByRole('navigation', { name: /breadcrumb/i })
    ).toBeInTheDocument()
  })

  it('renders JSON-LD including the speakable schema block', async () => {
    const { container } = await renderPersona('tenant-representatives')
    const scripts = container.querySelectorAll(
      'script[type="application/ld+json"]'
    )
    // article + breadcrumb + FAQ + speakable
    expect(scripts.length).toBeGreaterThanOrEqual(4)
    const hasSpeakable = Array.from(scripts).some((s) =>
      s.textContent?.includes('SpeakableSpecification')
    )
    expect(hasSpeakable).toBe(true)
  })

  it('links key fields that exist in the field schema', async () => {
    const { container } = await renderPersona('tenant-representatives')
    // cam_cap_percentage -> /fields/cam-cap-percentage
    const fieldLink = container.querySelector(
      'a[href="/fields/cam-cap-percentage"]'
    )
    expect(fieldLink).toBeInTheDocument()
  })

  it('links relevant red flags to their detail pages', async () => {
    const { container } = await renderPersona('tenant-representatives')
    const redFlagLinks = container.querySelectorAll('a[href^="/red-flags/"]')
    expect(redFlagLinks.length).toBeGreaterThan(0)
  })
})
