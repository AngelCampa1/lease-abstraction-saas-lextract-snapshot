import React from 'react'
import { cn } from '@/lib/utils'
import type { ComparisonFeature } from '@/data/comparisons'

interface ComparisonTableProps {
  features: ComparisonFeature[]
  competitorName: string
  /** Pre-computed win count from page - avoids recomputing in both page and table */
  lextractWinsCount?: number
}

function getAdvantageIndicator(advantage: ComparisonFeature['advantage']): {
  label: string
  icon: string
  className: string
  /** Truthy string = apply this class; empty string = fall back to alternating stripe */
  rowClassName: string
} {
  switch (advantage) {
    case 'lextract':
      return {
        label: 'Lextract',
        icon: '✓',
        className: 'bg-primary/10 text-primary',
        rowClassName: 'bg-primary/5',
      }
    case 'competitor':
      return {
        label: 'Competitor',
        icon: '✗',
        className: 'bg-muted text-muted-foreground',
        rowClassName: '',
      }
    case 'tie':
      return {
        label: 'Tie',
        icon: '=',
        className: 'bg-muted text-muted-foreground',
        rowClassName: '',
      }
  }
}

function ComparisonTable({ features, competitorName, lextractWinsCount }: ComparisonTableProps) {
  const lextractWins =
    lextractWinsCount ?? features.filter((f) => f.advantage === 'lextract').length

  return (
    <>
      {/* Mobile card list - shown below md, hidden at md+ */}
      <div className="md:hidden space-y-3" aria-label="Feature comparison">
        <p className="text-sm text-muted-foreground" aria-hidden="true">← Swipe cards to compare →</p>
        {features.map((feature) => {
          const indicator = getAdvantageIndicator(feature.advantage)
          return (
            <div
              key={feature.feature}
              className={cn(
                'rounded-xl border p-4 space-y-3',
                indicator.rowClassName ? 'border-primary/20 bg-primary/5' : 'bg-background'
              )}
            >
              <p className="text-base font-semibold text-foreground">{feature.feature}</p>
              <div className="grid grid-cols-2 gap-2 text-base">
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                    Lextract
                  </p>
                  {/* HTML is authored in comparisons.ts (static data file), never user-supplied */}
                  <p
                    className={
                      feature.advantage === 'lextract'
                        ? 'font-medium text-foreground'
                        : 'text-muted-foreground'
                    }
                    dangerouslySetInnerHTML={{ __html: feature.lextract }}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                    {competitorName}
                  </p>
                  {/* HTML is authored in comparisons.ts (static data file), never user-supplied */}
                  <p
                    className="text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: feature.competitor }}
                  />
                </div>
              </div>
              <div>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-medium',
                    indicator.className
                  )}
                >
                  <span aria-hidden="true">{indicator.icon}</span>
                  {indicator.label}
                </span>
              </div>
            </div>
          )
        })}
        <p className="text-base font-medium text-foreground pt-1">
          Lextract wins {lextractWins} of {features.length} categories
        </p>
      </div>

      {/* Desktop table - hidden below md, shown at md+ */}
      <div className="hidden md:block overflow-x-auto rounded-xl border shadow-sm">
        <table className="w-full text-base">
          <caption className="sr-only">Feature comparison table</caption>
          <thead>
            <tr className="border-b bg-primary text-primary-foreground">
              <th className="px-4 py-3 text-left font-medium">Feature</th>
              <th className="px-4 py-3 text-left font-medium">Lextract</th>
              <th className="px-4 py-3 text-left font-medium">
                {competitorName}
              </th>
              <th className="px-4 py-3 text-left font-medium">Advantage</th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature, index) => {
              const indicator = getAdvantageIndicator(feature.advantage)
              return (
                <tr
                  key={feature.feature}
                  className={cn(
                    // truthy rowClassName (Lextract win) overrides alternating stripe
                    indicator.rowClassName ||
                      (index % 2 === 0 ? 'bg-background' : 'bg-muted/20')
                  )}
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {feature.feature}
                  </td>
                  {/* HTML is authored in comparisons.ts (static data file), never user-supplied */}
                  <td
                    className={cn(
                      'px-4 py-3',
                      feature.advantage === 'lextract'
                        ? 'font-medium text-foreground'
                        : 'text-muted-foreground'
                    )}
                    dangerouslySetInnerHTML={{ __html: feature.lextract }}
                  />
                  {/* HTML is authored in comparisons.ts (static data file), never user-supplied */}
                  <td
                    className="px-4 py-3 text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: feature.competitor }}
                  />
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-medium',
                        indicator.className
                      )}
                    >
                      <span aria-hidden="true">{indicator.icon}</span>
                      {indicator.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/30">
              <td colSpan={4} className="px-4 py-3 text-base font-medium text-foreground">
                Lextract wins {lextractWins} of {features.length} categories
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  )
}

export { ComparisonTable, getAdvantageIndicator }
