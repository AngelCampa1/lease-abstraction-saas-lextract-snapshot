import React from 'react'
import Link from 'next/link'
import type { ContentMeta } from '@/lib/content-types'

interface ContentCardProps {
  content: ContentMeta
  basePath?: string
}

function ContentCard({ content, basePath = '/resources' }: ContentCardProps) {
  const href = `${basePath}/${content.category}/${content.slug}`

  return (
    <article className="group rounded-xl border bg-card p-5 sm:p-6 shadow-sm transition-all hover:border-primary/30 hover:bg-muted/50 hover:shadow-md">
      <Link href={href} className="block min-h-[44px]">
        <div className="mb-3 flex items-center gap-3">
          <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary capitalize">
            {content.category}
          </span>
          <span className="text-sm text-muted-foreground">
            {content.readingTime} min read
          </span>
        </div>
        <h3 className="mb-2 text-xl sm:text-2xl font-semibold group-hover:text-primary transition-colors">
          {content.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {content.description}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {content.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded bg-muted px-2 py-0.5 text-sm text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </Link>
    </article>
  )
}

export { ContentCard }
