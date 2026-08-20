'use client'

import Link from 'next/link'
import { Coins } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface CreditBadgeProps {
  balance: number | undefined
  loading?: boolean
}

export function CreditBadge({ balance, loading }: CreditBadgeProps) {
  if (loading) {
    return (
      <Badge variant="secondary" className="gap-1.5 text-xs" data-testid="credit-badge-loading">
        <Coins className="size-3.5" />
        <span className="inline-block h-3 w-8 animate-pulse rounded bg-muted-foreground/20" />
      </Badge>
    )
  }

  const count = balance ?? 0
  const hasCredits = count > 0

  return (
    <Badge
      asChild
      variant={hasCredits ? 'default' : 'outline'}
      className={cn(
        'gap-1.5 text-xs cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground',
        !hasCredits && 'border-primary/40 text-primary'
      )}
      data-testid="credit-badge"
    >
      <Link href="/pricing" aria-label={`${count} ${count === 1 ? 'credit' : 'credits'}, buy more`}>
        <Coins className="size-3.5" />
        {hasCredits
          ? `${count} ${count === 1 ? 'credit' : 'credits'}`
          : 'Buy credits'}
      </Link>
    </Badge>
  )
}
