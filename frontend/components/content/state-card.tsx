import React from 'react'
import Link from 'next/link'
import type { StateLandlordTenantData } from '@/data/states'
import { getStateExcerpt } from '@/data/states'

interface StateCardProps {
  state: StateLandlordTenantData
}

function StateCard({ state }: StateCardProps) {
  const excerpt = getStateExcerpt(state)
  const regulatoryStance = state.keyFacts.find(
    (f) => f.label === 'Regulatory Stance'
  )

  return (
    <article className="group rounded-xl border bg-card p-5 sm:p-6 shadow-sm transition-all hover:border-primary/30 hover:bg-muted/50 hover:shadow-md">
      <Link href={`/resources/states/${state.slug}`} className="block">
        <div className="mb-3 flex items-center gap-3">
          <span className="inline-flex items-center justify-center rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
            {state.stateCode}
          </span>
          {regulatoryStance && (
            <span className="text-xs text-muted-foreground">
              {regulatoryStance.value}
            </span>
          )}
        </div>
        <h3 className="mb-2 text-base sm:text-lg font-semibold group-hover:text-primary transition-colors">
          {state.state}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 break-words">
          {excerpt}
        </p>
        <span className="mt-4 inline-block text-sm font-medium text-primary">
          Learn more &rarr;
        </span>
      </Link>
    </article>
  )
}

export { StateCard }
