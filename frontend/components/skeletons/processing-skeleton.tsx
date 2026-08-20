import { Skeleton } from '@/components/ui/skeleton'

export function ProcessingSkeleton() {
  return (
    <div data-testid="processing-skeleton" className="space-y-6" role="status" aria-label="Loading processing status">
      <Skeleton className="h-6 w-48" />
      <div className="space-y-4">
        <Skeleton className="h-2 w-full" />
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>
    </div>
  )
}
