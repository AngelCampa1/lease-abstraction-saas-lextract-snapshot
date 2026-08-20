import React from 'react'
import type { StateNoticePeriod } from '@/data/states'

interface StateNoticePeriodTableProps {
  periods: StateNoticePeriod[]
}

function StateNoticePeriodTable({ periods }: StateNoticePeriodTableProps) {
  return (
    <section className="mt-12">
      <h2 className="mb-6 text-2xl font-bold tracking-tight">
        Notice Periods
      </h2>
      <p className="mb-2 text-sm text-muted-foreground sm:hidden" aria-hidden="true">
        ← Swipe →
      </p>
      <div className="overflow-x-auto rounded-xl border shadow-sm">
        <table className="w-full text-base">
          <thead>
            <tr className="border-b bg-primary text-primary-foreground">
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Period</th>
              <th className="px-4 py-3 text-left font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((period, index) => (
              <tr
                key={`period-${index}`}
                className="border-b last:border-b-0"
              >
                <td className="px-4 py-3 font-medium">{period.type}</td>
                <td className="px-4 py-3 whitespace-nowrap text-primary font-semibold">
                  {period.period}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {period.details}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export { StateNoticePeriodTable }
