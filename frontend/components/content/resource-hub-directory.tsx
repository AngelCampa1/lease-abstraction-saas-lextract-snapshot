import Link from 'next/link'
import { getResourceHubByHref, getResourceHubChildren } from '@/lib/resource-hubs'

interface ResourceHubDirectoryProps {
  hubHref: string
  heading?: string
}

export function ResourceHubDirectory({
  hubHref,
  heading = 'All Resources in This Hub',
}: ResourceHubDirectoryProps) {
  const hub = getResourceHubByHref(hubHref)
  const children = getResourceHubChildren(hubHref)

  if (!hub || children.length === 0) return null

  return (
    <section className="mt-12 border-t pt-10 py-12 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">{heading}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {children.length} canonical resources connected to the {hub.label.toLowerCase()} hub.
            </p>
          </div>
          <Link
            href="/resources"
            className="inline-flex min-h-[44px] items-center text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            View all hubs
          </Link>
        </div>

        <nav aria-label={`${hub.label} resources`}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className="flex min-h-[44px] items-center rounded-lg border bg-card px-4 py-3 text-sm font-medium text-foreground/85 transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
              >
                {child.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </section>
  )
}
