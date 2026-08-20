import Link from 'next/link'

// Only valid SiloId values for tenant content (see lib/content-types.ts)
const TENANT_SILOS = ['cam-reconciliation', 'cam-audit', 'lease-negotiation']

// Only valid SiloId values for landlord/PM content
const LANDLORD_SILOS = ['property-management', 'lease-administration']

const LANDLORD_TAGS = [
  'landlord',
  'property-manager',
  'portfolio',
  'asset-manager',
  'property-management',
  'revenue-leakage',
  'lease-administration',
  'yardi',
  'mri',
  'appfolio',
  'property-management-system',
  'pms',
]

const TENANT_TAGS = [
  // All tags in this list are long enough that substring collisions are not a
  // realistic concern in this codebase's controlled tag vocabulary.
  // 'cam' is intentionally kept short - it correctly matches "cam charges",
  // "cam reconciliation", etc. via whole-word boundary matching below.
  'cam',
  'reconciliation',
  'cam-audit',
  'tenant',
  'dispute',
  'overcharge',
  'cam-charges',
  'cam-clause',
  'operating-expenses',
  'nnn',
  'triple-net',
  'nnn-lease',
  'expense-stop',
  'base-year',
  'gross-up',
  'pro-rata',
  'pro-rata-share',
  'management-fee',
  'lease-negotiation',
  'tenant-representative',
  'tenant-rep',
  'tenant-improvement',
  'tia',
  'renewal',
  'audit-rights',
]

interface CrossSiteCalloutProps {
  tags?: string[]
  category?: string
  silo?: string
  audience?: 'tenant' | 'landlord'
}

// Uses word-boundary matching to prevent short tags like 'cam' from matching
// substrings of unrelated words (e.g. 'scam', 'became').
function containsWordBoundary(signal: string, tag: string): boolean {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?:^|[\\s\\-])${escaped}(?:[\\s\\-]|$)`).test(signal)
}

function resolveAudience(
  props: CrossSiteCalloutProps,
): 'tenant' | 'landlord' | null {
  if (props.audience) return props.audience

  // Silo is a reliable structural signal - when present it short-circuits tag
  // matching entirely. An article with a neutral silo (e.g. 'compliance') will
  // produce no callout even if its tags contain tenant signals.
  if (props.silo !== undefined) {
    const s = props.silo.toLowerCase()
    if (TENANT_SILOS.includes(s)) return 'tenant'
    if (LANDLORD_SILOS.includes(s)) return 'landlord'
    return null
  }

  const signals = [
    ...(props.tags ?? []).map((t) => t.toLowerCase()),
    (props.category ?? '').toLowerCase(),
  ]

  const isLandlord = LANDLORD_TAGS.some((t) =>
    signals.some((s) => containsWordBoundary(s, t)),
  )
  if (isLandlord) return 'landlord'

  const isTenant = TENANT_TAGS.some((t) =>
    signals.some((s) => containsWordBoundary(s, t)),
  )
  if (isTenant) return 'tenant'

  return null
}

export function CrossSiteCallout(props: CrossSiteCalloutProps) {
  const audience = resolveAudience(props)

  if (audience === 'landlord') {
    return (
      <section className="mt-10 rounded-xl border border-border bg-card shadow-sm p-5 sm:p-6">
        <p className="text-sm font-semibold mb-1">
          Automate CAM reconciliation across your portfolio
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          <strong className="text-foreground">capveri.com</strong> automates
          reconciliation from your Yardi, MRI, or AppFolio exports - no new
          integrations needed.
        </p>
        <Link
          href="https://app.capveri.com/auth/register"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full min-h-[44px] items-center gap-1 text-sm font-medium transition-colors hover:text-primary sm:w-auto"
        >
          Start Free Trial at capveri.com →
        </Link>
      </section>
    )
  }

  if (audience === 'tenant') {
    return (
      <section className="mt-10 rounded-xl border border-border bg-card shadow-sm p-5 sm:p-6">
        <p className="text-sm font-semibold mb-1">
          Need CAM recovery under your brand?
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          <strong className="text-foreground">CAMAudit</strong> gives firms
          white-label CAM recovery infrastructure while they keep the client
          relationship and deliver branded reports.
        </p>
        <Link
          href="https://partner.camaudit.io"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full min-h-[44px] items-center gap-1 text-sm font-medium transition-colors hover:text-primary sm:w-auto"
        >
          Explore the partner program →
        </Link>
      </section>
    )
  }

  return null
}
