import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-accent", className)}
      aria-hidden="true"
      {...props}
    >
      <div className="animate-shimmer h-full w-full rounded-[inherit]" />
    </div>
  )
}

export { Skeleton }
