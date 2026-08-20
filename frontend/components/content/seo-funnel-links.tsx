import Link from 'next/link'
import { getFunnelLinksForRoute } from '@/lib/internal-linking'

interface SeoFunnelLinksProps {
  routeHref: string
}

const LINK_GROUPS = [
  { key: 'parent', heading: 'Hub' },
  { key: 'siblings', heading: 'Related in This Section' },
  { key: 'crossLinks', heading: 'Related Topics' },
  { key: 'nextSteps', heading: 'Next Steps' },
] as const

export function SeoFunnelLinks({ routeHref }: SeoFunnelLinksProps) {
  const links = getFunnelLinksForRoute(routeHref)
  const hasLinks = LINK_GROUPS.some((group) => links[group.key].length > 0)
  if (!hasLinks) return null

  return (
    <section className="mt-12 border-t pt-10">
      <h2 className="mb-6 text-2xl font-bold sm:text-3xl">Keep Exploring</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {LINK_GROUPS.map((group) => {
          const groupLinks = links[group.key]
          if (groupLinks.length === 0) return null

          return (
            <div key={group.key}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {group.heading}
              </h3>
              <div className="flex flex-wrap gap-2">
                {groupLinks.map((link) => (
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
          )
        })}
      </div>
    </section>
  )
}
