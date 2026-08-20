import { Skeleton } from '@/components/ui/skeleton'

export function FullResultsSkeleton() {
  return (
    <div data-testid="full-results-skeleton" className="space-y-6" role="status" aria-label="Loading full results">
      <Skeleton className="h-40 w-full rounded-lg" />
      <div className="lg:grid lg:grid-cols-[2fr_1fr] lg:gap-8">
        <div className="space-y-4">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="mt-6 h-64 w-full rounded-lg lg:mt-0" />
      </div>
    </div>
  )
}
