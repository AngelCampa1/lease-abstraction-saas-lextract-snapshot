import React from 'react'
import Link from 'next/link'
import type { BreadcrumbItem } from '@/lib/content-types'

interface BreadcrumbsProps {
  crumbs: BreadcrumbItem[]
  includeJsonLd?: boolean
}

function buildBreadcrumbJsonLd(crumbs: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.label,
      ...(crumb.href ? { item: crumb.href } : {}),
    })),
  }
}

function Breadcrumbs({ crumbs, includeJsonLd = false }: BreadcrumbsProps) {
  if (crumbs.length === 0) {
    return null
  }

  return (
    <>
      <nav aria-label="Breadcrumb">
        <ol className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1

            return (
              <li key={`${crumb.label}-${index}`} className={`flex items-center gap-2 ${isLast ? 'min-w-0 overflow-hidden' : 'shrink-0'}`}>
                {index > 0 && (
                  <span aria-hidden="true" className="shrink-0 text-muted-foreground/50">
                    /
                  </span>
                )}
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current={isLast ? 'page' : undefined} className={`flex min-h-[44px] items-center${isLast ? ' truncate' : ''}`}>
                    {crumb.label}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
      {includeJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            // Escape `<` to prevent a closing `</script>` inside a JSON string
            // value from terminating the script tag and enabling XSS injection.
            __html: JSON.stringify(buildBreadcrumbJsonLd(crumbs)).replace(
              /</g,
              '\\u003c',
            ),
          }}
        />
      )}
    </>
  )
}

export { Breadcrumbs, buildBreadcrumbJsonLd }
