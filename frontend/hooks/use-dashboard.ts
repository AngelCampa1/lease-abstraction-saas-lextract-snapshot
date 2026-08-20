'use client'

import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'

export interface RecentExtraction {
  id: string
  document_filename: string
  status: string
  payment_status: string
  created_at: string
}

export interface QuickStats {
  completed: number
  processing: number
  failed: number
}

export interface DashboardData {
  extraction_count: number
  credit_balance: number
  recent_extractions: RecentExtraction[]
  quick_stats: QuickStats
}

export const dashboardKeys = {
  all: ['dashboard'] as const,
}

export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.all,
    queryFn: () => apiGet<DashboardData>('/user/dashboard'),
  })
}
