import Link from 'next/link'

const VERTICALS = [
  { label: 'Fields', href: '/fields', key: 'fields' },
  { label: 'Glossary', href: '/glossary', key: 'glossary' },
  { label: 'Clauses', href: '/clauses', key: 'clauses' },
  { label: 'Red Flags', href: '/red-flags', key: 'red-flags' },
  { label: 'Templates', href: '/templates', key: 'templates' },
  { label: 'Industries', href: '/industries', key: 'industries' },
  { label: 'Lease Types', href: '/lease-types', key: 'lease-types' },
  { label: 'Property Types', href: '/property-types', key: 'property-types' },
  { label: 'Use Cases', href: '/use-cases', key: 'use-cases' },
  { label: 'Workflows', href: '/workflows', key: 'workflows' },
  { label: 'Integrations', href: '/integrations', key: 'integrations' },
  { label: 'Locations', href: '/locations', key: 'locations' },
  { label: 'FAQ', href: '/faq', key: 'faq' },
  { label: 'Case Studies', href: '/case-studies', key: 'case-studies' },
  { label: 'By Role', href: '/for', key: 'for' },
  { label: 'Calculators', href: '/calculators', key: 'calculators' },
  { label: 'State Laws', href: '/resources/states', key: 'states' },
  { label: 'Comparisons', href: '/resources/comparisons', key: 'comparisons' },
  { label: 'Articles', href: '/resources/articles', key: 'articles' },
  { label: 'Guides', href: '/resources/guides', key: 'guides' },
]

type VerticalKey = typeof VERTICALS[number]['key']

interface BrowseVerticalsProps {
  current: VerticalKey
}

export function BrowseVerticals({ current }: BrowseVerticalsProps) {
  const filtered = VERTICALS.filter((v) => v.key !== current)

  return (
    <section className="mb-10">
      <h2 className="mb-4 text-2xl font-bold sm:text-3xl">Browse Other Categories</h2>
      <div className="flex flex-wrap gap-2">
        {filtered.map((v) => (
          <Link
            key={v.key}
            href={v.href}
            className="inline-flex min-h-[44px] items-center rounded-full border px-3 py-2.5 text-sm font-medium transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
          >
            {v.label}
          </Link>
        ))}
      </div>
    </section>
  )
}
