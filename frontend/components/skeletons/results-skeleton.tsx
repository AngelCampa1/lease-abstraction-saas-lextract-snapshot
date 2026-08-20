import { Skeleton } from '@/components/ui/skeleton'

export function ResultsSkeleton() {
  return (
    <div data-testid="results-skeleton" className="space-y-8" role="status" aria-label="Loading results">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}
