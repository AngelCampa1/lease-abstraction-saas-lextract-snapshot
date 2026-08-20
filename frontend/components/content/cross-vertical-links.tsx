import Link from 'next/link'

interface CrossLink {
  label: string
  href: string
}

interface CrossVerticalLinksProps {
  /** Map of vertical name → array of links */
  crossLinks: Record<string, CrossLink[]>
  /** Optional heading override */
  heading?: string
}

const VERTICAL_LABELS: Record<string, string> = {
  glossary: 'Glossary Terms',
  fields: 'Lease Fields',
  clauses: 'Lease Clauses',
  workflows: 'Workflows',
  integrations: 'Integrations',
  'use-cases': 'Use Cases',
  'lease-types': 'Lease Types',
  'property-types': 'Property Types',
  'red-flags': 'Red Flags',
  templates: 'Templates',
  personas: 'For Your Role',
  industries: 'Industries',
  locations: 'Locations',
  states: 'State Guides',
  comparisons: 'Comparisons',
  'case-studies': 'Case Studies',
}

export function CrossVerticalLinks({ crossLinks, heading = 'Related Resources' }: CrossVerticalLinksProps) {
  const verticals = Object.keys(crossLinks).filter((v) => crossLinks[v].length > 0)
  if (verticals.length === 0) return null

  return (
    <section className="mt-10">
      <h2 className="mb-6 text-2xl font-bold sm:text-3xl">{heading}</h2>
      <div className="space-y-6">
        {verticals.map((vertical) => (
          <div key={vertical}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {VERTICAL_LABELS[vertical] ?? vertical}
            </h3>
            <div className="flex flex-wrap gap-2">
              {crossLinks[vertical].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex min-h-[44px] items-center rounded-full border bg-muted/50 px-4 py-2.5 text-sm font-medium transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
