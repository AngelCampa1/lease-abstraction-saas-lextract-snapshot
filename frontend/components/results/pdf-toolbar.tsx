'use client'

import { useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Minus, Plus, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { INTERACTIVE_TARGET_CLASSES } from '@/lib/design-tokens'

const MIN_SCALE = 0.5
const MAX_SCALE = 2.0
const SCALE_STEP = 0.25

interface PdfToolbarProps {
  currentPage: number
  totalPages: number
  scale: number
  onPageChange: (page: number) => void
  onScaleChange: (scale: number) => void
  onFitToWidth: () => void
}

export function PdfToolbar({
  currentPage,
  totalPages,
  scale,
  onPageChange,
  onScaleChange,
  onFitToWidth,
}: PdfToolbarProps) {
  const canGoPrev = currentPage > 1
  const canGoNext = currentPage < totalPages
  const canZoomOut = scale > MIN_SCALE
  const canZoomIn = scale < MAX_SCALE

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      switch (e.key) {
        case 'ArrowLeft':
          if (canGoPrev) {
            e.preventDefault()
            onPageChange(currentPage - 1)
          }
          break
        case 'ArrowRight':
          if (canGoNext) {
            e.preventDefault()
            onPageChange(currentPage + 1)
          }
          break
      }
    },
    [canGoPrev, canGoNext, currentPage, onPageChange],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div
      data-testid="pdf-toolbar"
      className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/50 px-3 py-2"
    >
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrev}
          aria-label="Previous page"
          className={`${INTERACTIVE_TARGET_CLASSES.icon} p-0`}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span
          data-testid="page-indicator"
          className="min-w-[4rem] text-center text-sm text-muted-foreground"
        >
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          aria-label="Next page"
          className={`${INTERACTIVE_TARGET_CLASSES.icon} p-0`}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onScaleChange(Math.max(MIN_SCALE, scale - SCALE_STEP))
          }
          disabled={!canZoomOut}
          aria-label="Zoom out"
          className={`${INTERACTIVE_TARGET_CLASSES.icon} p-0`}
        >
          <Minus className="size-4" />
        </Button>
        <span
          data-testid="scale-indicator"
          className="min-w-[3rem] text-center text-sm text-muted-foreground"
        >
          {Math.round(scale * 100)}%
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onScaleChange(Math.min(MAX_SCALE, scale + SCALE_STEP))
          }
          disabled={!canZoomIn}
          aria-label="Zoom in"
          className={`${INTERACTIVE_TARGET_CLASSES.icon} p-0`}
        >
          <Plus className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onFitToWidth}
          aria-label="Fit to width"
          className={`${INTERACTIVE_TARGET_CLASSES.icon} p-0`}
        >
          <Maximize2 className="size-4" />
        </Button>
      </div>
    </div>
  )
}
