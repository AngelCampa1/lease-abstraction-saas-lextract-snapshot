import React from 'react'
import type { StateKeyStatute } from '@/data/states'

interface StateStatuteListProps {
  statutes: StateKeyStatute[]
}

function StateStatuteList({ statutes }: StateStatuteListProps) {
  return (
    <section className="mt-12">
      <h2 className="mb-6 text-xl sm:text-2xl font-bold tracking-tight">Key Statutes</h2>
      <div className="space-y-4">
        {statutes.map((statute, index) => (
          <div
            key={`statute-${index}`}
            className="rounded-xl border bg-card shadow-sm p-4 min-w-0"
          >
            <h3 className="text-base font-semibold break-words">{statute.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground break-words leading-relaxed">
              {statute.description}
            </p>
            {statute.url && (
              <a
                href={statute.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex min-h-[44px] items-center text-sm font-medium text-primary hover:underline"
              >
                View statute &rarr;
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

export { StateStatuteList }
