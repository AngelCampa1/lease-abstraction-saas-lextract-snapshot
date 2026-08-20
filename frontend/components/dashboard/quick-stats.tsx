'use client'

import { FileTextIcon, CheckCircleIcon, ClockIcon, XCircleIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { QuickStats as QuickStatsData } from '@/hooks/use-dashboard'
import { STATUS_COLORS } from '@/lib/design-tokens'

interface QuickStatsProps {
  stats: QuickStatsData
  totalCount: number
}

const statConfig = [
  {
    key: 'total' as const,
    label: 'Total Extractions',
    icon: FileTextIcon,
    colorClass: STATUS_COLORS.active.icon,
    bgClass: STATUS_COLORS.active.iconBg,
  },
  {
    key: 'completed' as const,
    label: 'Completed',
    icon: CheckCircleIcon,
    colorClass: STATUS_COLORS.success.icon,
    bgClass: STATUS_COLORS.success.iconBg,
  },
  {
    key: 'processing' as const,
    label: 'Processing',
    icon: ClockIcon,
    colorClass: STATUS_COLORS.warning.icon,
    bgClass: STATUS_COLORS.warning.iconBg,
  },
  {
    key: 'failed' as const,
    label: 'Failed',
    icon: XCircleIcon,
    colorClass: STATUS_COLORS.error.icon,
    bgClass: STATUS_COLORS.error.iconBg,
  },
]

function QuickStats({ stats, totalCount }: QuickStatsProps) {
  const values: Record<string, number> = {
    total: totalCount,
    completed: stats.completed,
    processing: stats.processing,
    failed: stats.failed,
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4" data-testid="quick-stats">
      {statConfig.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.key}>
            <CardContent className="flex items-center gap-4">
              <div className={`rounded-lg p-2 ${stat.bgClass}`}>
                <Icon className={`size-5 ${stat.colorClass}`} aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid={`stat-${stat.key}`}>
                  {values[stat.key]}
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export { QuickStats }
