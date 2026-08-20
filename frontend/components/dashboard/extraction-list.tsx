'use client'

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, EyeIcon, Trash2Icon, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { apiDelete } from '@/lib/api'
import { captureEvent, EVENTS } from '@/lib/posthog'
import { dashboardKeys } from '@/hooks/use-dashboard'
import { DateRangeFilter } from '@/components/dashboard/date-range-filter'
import { PRICING, formatPrice } from '@/lib/pricing'
import { APP_STATUS_COLORS, INTERACTIVE_TARGET_CLASSES } from '@/lib/design-tokens'
import {
  useExtractions,
  extractionListKeys,
  type ExtractionListItem,
} from '@/hooks/use-extractions'

const statusConfig: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  uploading: { label: 'Uploading', variant: 'secondary' },
  extracting: { label: 'Extracting', variant: 'secondary' },
  scoring: { label: 'Scoring', variant: 'secondary' },
  complete: { label: 'Complete', variant: 'default' },
  failed: { label: 'Failed', variant: 'destructive' },
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function formatAbsoluteDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getDateGroupLabel(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor((today.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

type StatusFilter = 'all' | 'complete' | 'processing' | 'failed'

const PROCESSING_STATUSES = new Set(['uploading', 'extracting', 'scoring'])

const filterTabs: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'complete', label: 'Complete' },
  { value: 'processing', label: 'Processing' },
  { value: 'failed', label: 'Failed' },
]

function statusFilterToApiParam(filter: StatusFilter): string | undefined {
  if (filter === 'all') return undefined
  if (filter === 'complete') return 'complete'
  if (filter === 'failed') return 'failed'
  // 'processing' maps to multiple statuses - filter client-side instead
  return undefined
}

const PAGE_SIZE = 20

interface ExtractionListItemProps {
  extraction: ExtractionListItem
  onDelete: (extraction: ExtractionListItem) => void
}

const ExtractionListItemRow = React.memo(function ExtractionListItemRow({
  extraction,
  onDelete,
}: ExtractionListItemProps) {
  const config = statusConfig[extraction.status] ?? {
    label: extraction.status,
    variant: 'secondary' as const,
  }

  return (
    <div
      className="flex flex-col items-start justify-between gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"
      data-testid={`extraction-row-${extraction.id}`}
    >
      <div className="min-w-0 flex-1">
        <p className="break-words font-medium">{extraction.document_filename}</p>
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-muted-foreground" data-testid={`extraction-meta-${extraction.id}`}>
          {formatAbsoluteDate(extraction.created_at)}
          <span className="mx-1.5 text-muted-foreground/50">·</span>
          {formatRelativeDate(extraction.created_at)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto" data-testid={`extraction-actions-${extraction.id}`}>
        <Badge variant={config.variant} className="text-xs">{config.label}</Badge>
        {extraction.status === 'complete' && extraction.payment_status !== 'paid' && (
          <Link href={`/results/${extraction.id}`} aria-label={`Unlock ${extraction.document_filename} for ${formatPrice(PRICING.single.price)}`}>
            <span
              data-testid={`unlock-badge-${extraction.id}`}
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${APP_STATUS_COLORS.locked.badge}`}
            >
              Unlock for {formatPrice(PRICING.single.price)} →
            </span>
          </Link>
        )}
        {extraction.status === 'complete' && extraction.payment_status === 'paid' && (
          <span
            data-testid={`paid-badge-${extraction.id}`}
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${APP_STATUS_COLORS.paid.badge}`}
          >
            Paid ✓
          </span>
        )}
        <Button variant="ghost" size="icon-sm" asChild>
          <Link
            href={`/results/${extraction.id}`}
            aria-label={`View ${extraction.document_filename}`}
            onClick={() => captureEvent(EVENTS.extraction_clicked, { extraction_id: extraction.id, status: extraction.status })}
          >
            <EyeIcon className="size-4" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onDelete(extraction)}
          aria-label={`Delete ${extraction.document_filename}`}
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>
    </div>
  )
})

function ExtractionList() {
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<ExtractionListItem | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [dateFrom, setDateFrom] = useState<string | undefined>(undefined)
  const [dateTo, setDateTo] = useState<string | undefined>(undefined)
  const [sort, setSort] = useState<'asc' | 'desc'>('desc')
  const [offset, setOffset] = useState(0)

  const apiStatus = statusFilterToApiParam(statusFilter)

  const { data, isLoading, isError, isFetching } = useExtractions({
    limit: PAGE_SIZE,
    offset,
    status: apiStatus,
    dateFrom,
    dateTo,
    sort,
  })

  const accumulatedRef = useRef<ExtractionListItem[]>([])
  const [items, setItems] = useState<ExtractionListItem[]>([])

  useEffect(() => {
    if (!data) return
    if (offset === 0) {
      accumulatedRef.current = data.items
    } else {
      const existingIds = new Set(accumulatedRef.current.map((e) => e.id))
      const newItems = data.items.filter((e) => !existingIds.has(e.id))
      accumulatedRef.current = [...accumulatedRef.current, ...newItems]
    }
    setItems(accumulatedRef.current)
  }, [data, offset])

  // Apply client-side filters (search + processing status)
  const filtered = useMemo(() => {
    let result = items

    if (search) {
      const q = search.toLowerCase()
      result = result.filter((e) => e.document_filename.toLowerCase().includes(q))
    }

    // Client-side processing filter (covers multiple statuses)
    if (statusFilter === 'processing') {
      result = result.filter((e) => PROCESSING_STATUSES.has(e.status))
    }

    return result
  }, [items, search, statusFilter])

  // Group by date
  const grouped = useMemo(() => {
    const groups: { label: string; items: ExtractionListItem[] }[] = []
    let currentLabel = ''

    for (const item of filtered) {
      const label = getDateGroupLabel(item.created_at)
      if (label !== currentLabel) {
        currentLabel = label
        groups.push({ label, items: [item] })
      } else {
        groups[groups.length - 1].items.push(item)
      }
    }

    return groups
  }, [filtered])

  const total = data?.total ?? 0
  const hasMore = items.length < total

  const handleLoadMore = useCallback(() => {
    setOffset((prev) => prev + PAGE_SIZE)
  }, [])

  const resetPagination = useCallback(() => {
    setOffset(0)
    accumulatedRef.current = []
    setItems([])
  }, [])

  const handleDateChange = useCallback((from: string | undefined, to: string | undefined) => {
    setDateFrom(from)
    setDateTo(to)
    resetPagination()
  }, [resetPagination])

  const handleSortToggle = useCallback(() => {
    setSort((prev) => (prev === 'desc' ? 'asc' : 'desc'))
    resetPagination()
  }, [resetPagination])

  const handleStatusChange = useCallback((value: StatusFilter) => {
    setStatusFilter(value)
    resetPagination()
  }, [resetPagination])

  const handleDeleteTarget = useCallback((extraction: ExtractionListItem) => {
    setDeleteTarget(extraction)
  }, [])

  const hasActiveFilters = search !== '' || statusFilter !== 'all' || dateFrom !== undefined || dateTo !== undefined

  const clearFilters = useCallback(() => {
    setSearch('')
    setStatusFilter('all')
    setDateFrom(undefined)
    setDateTo(undefined)
    resetPagination()
  }, [resetPagination])

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/extractions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
      queryClient.invalidateQueries({ queryKey: extractionListKeys.all })
      setDeleteTarget(null)
      resetPagination()
    },
  })

  return (
    <>
      {/* Filters */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by filename..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Search extractions"
              data-testid="extraction-search"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSortToggle}
            className="shrink-0 gap-1.5"
            aria-label={sort === 'desc' ? 'Sorted newest first, click to sort oldest first' : 'Sorted oldest first, click to sort newest first'}
          >
            {sort === 'desc' ? <ArrowDown className="size-4" /> : <ArrowUp className="size-4" />}
            <span className="hidden sm:inline">
              {sort === 'desc' ? 'Newest' : 'Oldest'}
            </span>
          </Button>
        </div>

        <div className="flex gap-1" role="group" aria-label="Filter by status">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleStatusChange(tab.value)}
              aria-pressed={statusFilter === tab.value}
              className={`${INTERACTIVE_TARGET_CLASSES.compact} px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === tab.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <DateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateChange={handleDateChange}
        />
      </div>

      {/* Results count */}
      {total > 0 && (
        <p className="mb-3 text-xs text-muted-foreground">
          {statusFilter === 'processing'
            ? `${filtered.length} processing extraction${filtered.length !== 1 ? 's' : ''} found`
            : `Showing ${filtered.length} of ${total} extraction${total !== 1 ? 's' : ''}`}
        </p>
      )}

      {/* List grouped by date */}
      <div data-testid="extraction-list">
        {isLoading && items.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading...</p>
        )}

        {isError && items.length === 0 && (
          <p className="py-6 text-center text-sm text-destructive" role="alert">
            Failed to load extractions. Please try again later.
          </p>
        )}

        {!isLoading && !isFetching && filtered.length === 0 && (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">No extractions match your filters.</p>
            {hasActiveFilters && (
              <Button variant="link" size="sm" className="mt-2 h-auto p-0 text-xs" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        )}

        {grouped.map((group, index) => (
          <div key={`${group.label}-${index}`} className="mb-4">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {group.label}
            </h3>
            <div className="space-y-2">
              {group.items.map((extraction) => (
                <ExtractionListItemRow
                  key={extraction.id}
                  extraction={extraction}
                  onDelete={handleDeleteTarget}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="mt-3 text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : `Show more (${total - items.length} remaining)`}
          </Button>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={() => { setDeleteTarget(null); deleteMutation.reset() }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete Extraction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium">{deleteTarget?.document_filename}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteMutation.isError && (
            <p className="text-sm text-destructive" role="alert">
              We could not delete this extraction. Please try again.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteTarget(null); deleteMutation.reset() }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export { ExtractionList, formatRelativeDate, statusConfig }
