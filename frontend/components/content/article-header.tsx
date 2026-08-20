import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { ContentCategory } from '@/lib/content-types'

const ANGEL_CAMPA_AVATAR = '/images/angel-campa-avatar.svg'

interface ArticleHeaderProps {
  title: string
  author: string
  publishedAt: string
  updatedAt?: string
  readingTime: number
  category: ContentCategory
  tags?: string[]
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function ArticleHeader({
  title,
  author,
  publishedAt,
  updatedAt,
  readingTime,
  category,
  tags,
}: ArticleHeaderProps) {
  return (
    <header className="mb-10">
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize">
          {category}
        </span>
        <span className="text-sm text-muted-foreground">
          {readingTime} min read
        </span>
      </div>
      <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
        {title}
      </h1>
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        {author.toLowerCase().includes('angel campa') ? (
          <Link
            href="/about/angel-campa"
            className="inline-flex items-center gap-2 underline-offset-4 hover:underline hover:text-foreground transition-colors"
          >
            <Image
              src={ANGEL_CAMPA_AVATAR}
              alt=""
              aria-hidden="true"
              width={24}
              height={24}
              className="rounded-full"
            />
            {author}
          </Link>
        ) : (
          <span>{author}</span>
        )}
        <span aria-hidden="true" className="text-muted-foreground/40">|</span>
        <time dateTime={publishedAt}>{formatDate(publishedAt)}</time>
        {updatedAt !== undefined && updatedAt !== publishedAt && (
          <>
            <span aria-hidden="true" className="text-muted-foreground/40">·</span>
            <span>
              Last updated <time dateTime={updatedAt}>{formatDate(updatedAt)}</time>
            </span>
          </>
        )}
      </div>
      {tags && tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              data-testid="tag"
              className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </header>
  )
}

export { ArticleHeader, formatDate }
export type { ArticleHeaderProps }
