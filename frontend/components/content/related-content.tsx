import React from 'react'
import type { ContentMeta } from '@/lib/content-types'
import { ContentCard } from '@/components/content/content-card'

interface RelatedContentProps {
  items: ContentMeta[]
  heading?: string
  basePath?: string
}

const MAX_RELATED_ITEMS = 3

function RelatedContent({
  items,
  heading = 'Related Articles',
  basePath = '/resources',
}: RelatedContentProps) {
  if (items.length === 0) {
    return null
  }

  const displayItems = items.slice(0, MAX_RELATED_ITEMS)

  return (
    <section className="mt-16 border-t pt-10">
      <h2 className="mb-6 text-2xl font-bold sm:text-3xl">{heading}</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {displayItems.map((item) => (
          <ContentCard key={item.slug} content={item} basePath={basePath} />
        ))}
      </div>
    </section>
  )
}

export { RelatedContent }
export type { RelatedContentProps }
