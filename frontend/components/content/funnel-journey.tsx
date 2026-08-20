import Link from 'next/link'
import type { ContentMeta } from '@/lib/content-types'

interface PseoLink {
  label: string
  href: string
}

interface FunnelJourneyProps {
  /** pSEO links from auto-index (Explore Related Topics) */
  pseoLinks: PseoLink[]
  /** Articles/guides from the next funnel stage (Go Deeper) */
  goDeeper: ContentMeta[]
  /** Articles/guides from the same funnel stage (Related Reading) */
  related: ContentMeta[]
}

export function FunnelJourney({ pseoLinks, goDeeper, related }: FunnelJourneyProps) {
  const hasContent = pseoLinks.length > 0 || goDeeper.length > 0 || related.length > 0
  if (!hasContent) return null

  return (
    <div className="mt-12 space-y-10 border-t pt-10">
      {pseoLinks.length > 0 && (
        <section>
          <h2 className="mb-4 text-base sm:text-lg font-semibold">Explore Related Topics</h2>
          <div className="flex flex-wrap gap-2">
            {pseoLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center rounded-full border bg-muted/50 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary hover:border-primary/30"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      {goDeeper.length > 0 && (
        <section>
          <h2 className="mb-4 text-base sm:text-lg font-semibold">Go Deeper</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {goDeeper.map((item) => (
              <Link
                key={`${item.category}/${item.slug}`}
                href={`/resources/${item.category}/${item.slug}`}
                className="group rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:bg-muted/50"
              >
                <p className="font-medium group-hover:text-primary transition-colors line-clamp-2">
                  {item.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {item.description}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {item.readingTime} min read
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section>
          <h2 className="mb-4 text-base sm:text-lg font-semibold">Related Reading</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {related.map((item) => (
              <Link
                key={`${item.category}/${item.slug}`}
                href={`/resources/${item.category}/${item.slug}`}
                className="group rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:bg-muted/50"
              >
                <p className="font-medium group-hover:text-primary transition-colors line-clamp-2 text-sm">
                  {item.title}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {item.readingTime} min read
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
