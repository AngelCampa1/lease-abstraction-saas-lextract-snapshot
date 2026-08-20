import type { SourceItem } from '@/lib/content-types'
import { formatDate } from './article-header'

interface SourcesCheckedProps {
  sources?: SourceItem[]
}

export function SourcesChecked({ sources }: SourcesCheckedProps) {
  if (sources === undefined || sources.length === 0) {
    return null
  }

  return (
    <aside className="mt-8 rounded-lg border bg-muted/30 p-4 text-sm">
      <h2 className="text-sm font-semibold text-foreground">Sources checked</h2>
      <ul className="mt-3 space-y-2">
        {sources.map((source) => (
          <li key={`${source.url}-${source.title}`}>
            <a
              className="inline-flex min-h-[44px] items-center font-medium text-primary underline-offset-4 hover:underline"
              href={source.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              {source.title}
            </a>
            <span className="ml-2 text-muted-foreground">
              {source.publisher} - checked {formatDate(source.checkedAt)}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  )
}

export type { SourcesCheckedProps }
