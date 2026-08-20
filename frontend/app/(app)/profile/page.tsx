'use client'

import { useCallback } from 'react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { useProfile } from '@/hooks/use-profile'
import { ProfileForm } from '@/components/profile/profile-form'
import { ProfileSkeleton } from '@/components/skeletons'

export default function ProfilePage() {
  const { data: profile, isLoading, isError, refetch } = useProfile()
  const handleRetry = useCallback(() => { void refetch() }, [refetch])

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 font-display text-2xl font-bold text-brand-dark">Profile</h1>
        <ProfileSkeleton />
      </div>
    )
  }

  if (isError || !profile) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 font-display text-2xl font-bold text-brand-dark">Profile</h1>
        <div className="flex flex-col items-start gap-3" role="alert">
          <p className="text-destructive">Failed to load profile.</p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Try again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 font-display text-2xl font-bold text-brand-dark">Profile</h1>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <ProfileForm profile={profile} />
      </motion.div>
    </div>
  )
}
