import { Skeleton } from '@/components/ui/skeleton'

export function ProfileSkeleton() {
  return (
    <div className="space-y-6" data-testid="profile-skeleton" role="status" aria-label="Loading profile">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-80 rounded-xl" />
    </div>
  )
}
