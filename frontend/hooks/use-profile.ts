'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch } from '@/lib/api'

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  company: string | null
  role: string | null
}

export interface UpdateProfilePayload {
  full_name: string
  company?: string
  role?: string
}

export const profileKeys = {
  all: ['profile'] as const,
}

export function useProfile() {
  return useQuery({
    queryKey: profileKeys.all,
    queryFn: () => apiGet<UserProfile>('/user/profile'),
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateProfilePayload) =>
      apiPatch<UserProfile>('/user/profile', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.all })
    },
  })
}
