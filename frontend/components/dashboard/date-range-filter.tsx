'use client'

import { CalendarIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { INTERACTIVE_TARGET_CLASSES } from '@/lib/design-tokens'

const DATE_INPUT_CLASSES =
  'min-h-10 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

interface DateRangeFilterProps {
  dateFrom: string | undefined
  dateTo: string | undefined
  onDateChange: (from: string | undefined, to: string | undefined) => void
}

function toLocalDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getPresetRange(days: number): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - days)
  return {
    from: toLocalDateString(from),
    to: toLocalDateString(to),
  }
}

function DateRangeFilter({ dateFrom, dateTo, onDateChange }: DateRangeFilterProps) {
  const hasFilter = dateFrom || dateTo

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <CalendarIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="date"
            value={dateFrom ?? ''}
            max={dateTo}
            onChange={(e) => onDateChange(e.target.value || undefined, dateTo)}
            className={`${DATE_INPUT_CLASSES} pl-9 text-sm`}
            aria-label="From date"
            data-testid="date-from"
          />
        </div>
        <span className="text-sm text-muted-foreground">to</span>
        <div className="relative flex-1">
          <CalendarIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="date"
            value={dateTo ?? ''}
            min={dateFrom}
            onChange={(e) => onDateChange(dateFrom, e.target.value || undefined)}
            className={`${DATE_INPUT_CLASSES} pl-9 text-sm`}
            aria-label="To date"
            data-testid="date-to"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        <Button
          variant="outline"
          size="sm"
          className={`${INTERACTIVE_TARGET_CLASSES.compact} text-xs`}
          onClick={() => {
            const r = getPresetRange(7)
            onDateChange(r.from, r.to)
          }}
        >
          Last 7 days
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={`${INTERACTIVE_TARGET_CLASSES.compact} text-xs`}
          onClick={() => {
            const r = getPresetRange(30)
            onDateChange(r.from, r.to)
          }}
        >
          Last 30 days
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={`${INTERACTIVE_TARGET_CLASSES.compact} text-xs`}
          onClick={() => {
            const r = getPresetRange(90)
            onDateChange(r.from, r.to)
          }}
        >
          Last 90 days
        </Button>
        {hasFilter && (
          <Button
            variant="ghost"
            size="sm"
            className={`${INTERACTIVE_TARGET_CLASSES.compact} text-xs`}
            onClick={() => onDateChange(undefined, undefined)}
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}

export { DateRangeFilter }
