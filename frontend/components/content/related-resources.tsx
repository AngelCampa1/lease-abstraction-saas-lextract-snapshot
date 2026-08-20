import Link from 'next/link'

interface RelatedResourcesProps {
  links: Array<{ label: string; href: string }>
  heading?: string
}

function RelatedResources({
  links,
  heading = 'Related Resources',
}: RelatedResourcesProps) {
  if (links.length === 0) {
    return null
  }

  return (
    <section className="mt-10 border-t pt-8">
      <h2 className="mb-4 text-2xl font-bold sm:text-3xl">{heading}</h2>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="inline-flex min-h-[44px] items-center rounded-full border bg-muted/50 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  )
}

export { RelatedResources }
export type { RelatedResourcesProps }
