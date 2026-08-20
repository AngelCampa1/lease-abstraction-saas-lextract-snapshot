import React from 'react'
import { render, screen } from '@testing-library/react'
import { CrossSiteCallout } from '@/components/content/cross-site-callout'

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    target,
    rel,
  }: {
    href: string
    children: React.ReactNode
    className?: string
    target?: string
    rel?: string
  }) => (
    <a href={href} className={className} target={target} rel={rel}>
      {children}
    </a>
  ),
}))

// ─── Explicit audience prop (highest priority) ─────────────────────────────

describe('CrossSiteCallout — explicit audience prop', () => {
  it('audience="tenant" renders CAMAudit partner callout regardless of tags', () => {
    render(<CrossSiteCallout audience="tenant" tags={['landlord', 'property-manager']} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://partner.camaudit.io')
  })

  it('audience="landlord" renders capveri.com callout regardless of tags', () => {
    render(<CrossSiteCallout audience="landlord" tags={['cam', 'tenant']} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://app.capveri.com/auth/register')
  })

  it('audience="tenant" shows CAMAudit partner heading copy', () => {
    render(<CrossSiteCallout audience="tenant" />)
    expect(screen.getByText(/CAM recovery under your brand/i)).toBeInTheDocument()
  })

  it('audience="landlord" shows capveri heading copy', () => {
    render(<CrossSiteCallout audience="landlord" />)
    expect(screen.getByText(/Automate CAM reconciliation/i)).toBeInTheDocument()
  })

  it('audience="tenant" CTA links to partner.camaudit.io', () => {
    render(<CrossSiteCallout audience="tenant" />)
    const link = screen.getByRole('link')
    expect(link.textContent).toMatch(/partner program/i)
    expect(link).toHaveAttribute('href', 'https://partner.camaudit.io')
  })

  it('audience="landlord" CTA links to capveri.com/auth/register', () => {
    render(<CrossSiteCallout audience="landlord" />)
    const link = screen.getByRole('link')
    expect(link.textContent).toMatch(/capveri\.com/i)
    expect(link).toHaveAttribute('href', 'https://app.capveri.com/auth/register')
  })
})

// ─── Silo-based routing (secondary signal) ────────────────────────────────

describe('CrossSiteCallout — silo routing', () => {
  it('silo="cam-reconciliation" renders tenant/camaudit callout (was broken: showed capveri)', () => {
    render(<CrossSiteCallout silo="cam-reconciliation" />)
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://partner.camaudit.io')
  })

  it('silo="cam-audit" renders tenant/camaudit callout', () => {
    render(<CrossSiteCallout silo="cam-audit" />)
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://partner.camaudit.io')
  })

  it('silo="lease-negotiation" renders tenant/camaudit callout (was returning null)', () => {
    render(<CrossSiteCallout silo="lease-negotiation" />)
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://partner.camaudit.io')
  })

  it('silo="property-management" renders landlord/capveri callout', () => {
    render(<CrossSiteCallout silo="property-management" />)
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://app.capveri.com/auth/register')
  })

  it('silo="lease-administration" renders landlord/capveri callout', () => {
    render(<CrossSiteCallout silo="lease-administration" />)
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://app.capveri.com/auth/register')
  })

  it('silo="lease-abstraction" renders nothing (neutral content)', () => {
    const { container } = render(<CrossSiteCallout silo="lease-abstraction" />)
    expect(container.firstChild).toBeNull()
  })

  it('silo="due-diligence" renders nothing (neutral content)', () => {
    const { container } = render(<CrossSiteCallout silo="due-diligence" />)
    expect(container.firstChild).toBeNull()
  })

  it('neutral silo short-circuits tag matching — tenant tags are ignored', () => {
    // Intentional behavior: silo="compliance" overrides tenant-signal tags
    const { container } = render(
      <CrossSiteCallout silo="compliance" tags={['cam', 'tenant']} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('audience prop overrides silo (audience="landlord" + silo="cam-reconciliation" → capveri)', () => {
    render(<CrossSiteCallout audience="landlord" silo="cam-reconciliation" />)
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://app.capveri.com/auth/register')
  })
})

// ─── Tag-based routing (fallback, fixed bugs) ────────────────────────────

describe('CrossSiteCallout — tag routing', () => {
  it('tag "cam-reconciliation" renders tenant/camaudit callout (was broken: showed capveri)', () => {
    render(<CrossSiteCallout tags={['cam-reconciliation']} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://partner.camaudit.io')
  })

  it('tag "tenant-representative" renders tenant/camaudit callout (was returning null)', () => {
    render(<CrossSiteCallout tags={['tenant-representative']} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://partner.camaudit.io')
  })

  it('tag "lease-negotiation" renders tenant/camaudit callout (was returning null)', () => {
    render(<CrossSiteCallout tags={['lease-negotiation']} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://partner.camaudit.io')
  })

  it('tag "tenant-improvement" renders tenant/camaudit callout', () => {
    render(<CrossSiteCallout tags={['tenant-improvement']} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://partner.camaudit.io')
  })

  it('tag "renewal" renders tenant/camaudit callout', () => {
    render(<CrossSiteCallout tags={['renewal']} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://partner.camaudit.io')
  })

  it('tag "cam charges" renders tenant/camaudit callout via word-boundary match', () => {
    render(<CrossSiteCallout tags={['cam charges']} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://partner.camaudit.io')
  })

  it('"scam" tag does NOT match "cam" — word-boundary matching prevents false positives', () => {
    const { container } = render(<CrossSiteCallout tags={['scam']} />)
    expect(container.firstChild).toBeNull()
  })

  it('tag "property-manager" renders landlord/capveri callout', () => {
    render(<CrossSiteCallout tags={['property-manager']} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://app.capveri.com/auth/register')
  })

  it('tag "lease-administration" renders landlord/capveri callout', () => {
    render(<CrossSiteCallout tags={['lease-administration']} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://app.capveri.com/auth/register')
  })

  it('landlord tag takes precedence over tenant tag when both present', () => {
    render(<CrossSiteCallout tags={['property-manager', 'cam']} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://app.capveri.com/auth/register')
  })

  it('no matching tags renders nothing', () => {
    const { container } = render(<CrossSiteCallout tags={['commercial-real-estate', 'lease']} />)
    expect(container.firstChild).toBeNull()
  })

  it('empty tags array renders nothing', () => {
    const { container } = render(<CrossSiteCallout tags={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('no props renders nothing', () => {
    const { container } = render(<CrossSiteCallout />)
    expect(container.firstChild).toBeNull()
  })
})

// ─── Link security attributes ─────────────────────────────────────────────

describe('CrossSiteCallout — link attributes', () => {
  it('tenant callout link opens in new tab with noopener noreferrer', () => {
    render(<CrossSiteCallout audience="tenant" />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('landlord callout link opens in new tab with noopener noreferrer', () => {
    render(<CrossSiteCallout audience="landlord" />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
