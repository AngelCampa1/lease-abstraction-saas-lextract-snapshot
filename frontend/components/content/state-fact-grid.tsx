import React from 'react'
import type { StateKeyFact } from '@/data/states'

interface StateFactGridProps {
  facts: StateKeyFact[]
}

function StateFactGrid({ facts }: StateFactGridProps) {
  return (
    <section className="mt-12">
      <h2 className="mb-6 text-xl sm:text-2xl font-bold tracking-tight">Key Facts</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {facts.map((fact, index) => (
          <div
            key={`fact-${index}`}
            data-testid="fact-card"
            className="rounded-xl border bg-card shadow-sm p-3 sm:p-4 min-w-0"
          >
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground break-words">
              {fact.label}
            </dt>
            <dd className="mt-1 text-sm font-semibold text-primary break-words">{fact.value}</dd>
          </div>
        ))}
      </div>
    </section>
  )
}

export { StateFactGrid }
