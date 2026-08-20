'use client'

import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { useHelpMode } from '@/components/help/help-mode-provider'
import { cn } from '@/lib/utils'

interface HelpTooltipProps {
  label: string
  children: ReactNode
  className?: string
  side?: 'top' | 'bottom'
  align?: 'center' | 'end'
}

export function HelpTooltip({
  label,
  children,
  className,
  side = 'top',
  align = 'center',
}: HelpTooltipProps) {
  const { helpModeEnabled } = useHelpMode()
  const tooltipId = useId()
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)

  const verticalClass = side === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'
  const alignClass =
    align === 'end'
      ? 'right-0'
      : 'left-1/2 -translate-x-1/2'

  return (
    <span className={cn('relative inline-flex align-middle', className)}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? tooltipId : undefined}
        onBlur={() => {
          if (!pinned) {
            setOpen(false)
          }
        }}
        onClick={() => {
          setPinned((current) => {
            const next = !current
            setOpen(next)
            return next
          })
        }}
        onFocus={() => {
          if (helpModeEnabled) {
            setOpen(true)
          }
        }}
        onMouseDown={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setPinned(false)
            setOpen(false)
          }
        }}
        onMouseEnter={() => {
          if (helpModeEnabled) {
            setOpen(true)
          }
        }}
        onMouseLeave={() => {
          if (!pinned) {
            setOpen(false)
          }
        }}
        className="inline-flex size-8 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-sm font-semibold leading-none text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:min-h-0 sm:min-w-0"
        data-testid="help-tooltip-trigger"
      >
        ?
      </button>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className={cn(
            'absolute z-50 w-72 max-w-[calc(100vw-2rem)] rounded-md border bg-popover p-3 text-left text-xs leading-relaxed text-popover-foreground shadow-lg',
            verticalClass,
            alignClass,
          )}
        >
          {children}
        </span>
      )}
    </span>
  )
}
