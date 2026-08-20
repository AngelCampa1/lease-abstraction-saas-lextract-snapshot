'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { LogOut, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useUpdateProfile } from '@/hooks/use-profile'
import type { UserProfile } from '@/hooks/use-profile'
import { useAuth } from '@/hooks/use-auth'
import { apiDelete, ApiError } from '@/lib/api'

// Must stay in sync with the backend enum in app/schemas/user.py (VALID_ROLES).
// Sending any other value makes PATCH /user/profile reject the request with 422.
const ROLE_OPTIONS = [
  { value: 'tenant_rep', label: 'Tenant Rep' },
  { value: 'broker', label: 'Broker' },
  { value: 'attorney', label: 'Attorney' },
  { value: 'landlord', label: 'Landlord' },
  { value: 'investor', label: 'Investor' },
  { value: 'other', label: 'Other' },
] as const

// Safe assertion: ROLE_OPTIONS is a non-empty const array, so the mapped
// result is a non-empty tuple - the shape z.enum() requires.
const ROLE_VALUES = ROLE_OPTIONS.map((o) => o.value) as [string, ...string[]]

// Empty string represents "no role selected"; the backend treats role as
// optional, so we map '' to undefined on submit.
const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  company: z.string(),
  role: z.union([z.enum(ROLE_VALUES), z.literal('')]),
})

type ProfileFormValues = z.infer<typeof profileSchema>

/** Coerce a stored role into a valid select value, falling back to '' for
 * legacy free-text values that predate the enum. */
function normalizeRole(role: string | null | undefined): string {
  // Safe assertion: widening the readonly tuple to string[] only to use
  // .includes() as a membership test; no runtime value is changed.
  return role && (ROLE_VALUES as readonly string[]).includes(role) ? role : ''
}

interface ProfileFormProps {
  profile: UserProfile
}

function ProfileForm({ profile }: ProfileFormProps) {
  const updateProfile = useUpdateProfile()
  const { signOut } = useAuth()
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDeleteAccount() {
    setIsDeleting(true)
    try {
      await apiDelete<void>('/user')
      try {
        await signOut()
      } catch {
        // sign-out can fail if the session was already revoked server-side;
        // we still want the user redirected and informed.
      }
      toast.success('Account deleted')
      router.push('/')
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.userMessage ?? err.detail
          : 'Failed to delete account. Please try again.'
      toast.error(message)
      setIsDeleting(false)
      setDeleteOpen(false)
    }
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile.full_name ?? '',
      company: profile.company ?? '',
      role: normalizeRole(profile.role),
    },
  })

  useEffect(() => {
    reset({
      full_name: profile.full_name ?? '',
      company: profile.company ?? '',
      role: normalizeRole(profile.role),
    })
  }, [profile, reset])

  function onSubmit(data: ProfileFormValues) {
    updateProfile.mutate(
      {
        full_name: data.full_name,
        company: data.company || undefined,
        role: data.role || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Profile updated successfully')
        },
        onError: () => {
          toast.error('Failed to update profile')
        },
      }
    )
  }

  return (
    <Card data-testid="profile-form">
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profile.email}
              readOnly
              aria-readonly="true"
              aria-label="Email"
              className="cursor-not-allowed bg-muted/60 text-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              {...register('full_name')}
              aria-invalid={!!errors.full_name}
              aria-required="true"
              aria-label="Full Name"
            />
            {errors.full_name && (
              <p className="text-sm text-destructive" role="alert">
                {errors.full_name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              {...register('company')}
              aria-label="Company"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              {...register('role')}
              aria-label="Role"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select a role</option>
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div
            className="flex flex-wrap items-stretch justify-between gap-3 pt-2 sm:items-center"
            data-testid="profile-action-row"
          >
            <Button
              type="submit"
              disabled={!isDirty || isSubmitting || updateProfile.isPending}
              data-testid="profile-save-button"
              className="w-full sm:w-auto"
            >
              {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => { void signOut() }}
              className="w-full text-muted-foreground hover:text-foreground sm:w-auto"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </Button>
          </div>
        </form>

        <div className="mt-8 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Need to delete your account?{' '}
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="font-medium text-destructive underline-offset-4 hover:underline"
              data-testid="delete-account-link"
            >
              Permanently delete my account
            </button>
            .
          </p>
        </div>
      </CardContent>
      <Dialog open={deleteOpen} onOpenChange={(open) => {
        if (!isDeleting) setDeleteOpen(open)
      }}>
        <DialogContent data-testid="delete-account-dialog">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently removes your account, billing history, and any
              stored extractions. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isDeleting}
              data-testid="delete-account-cancel"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              data-testid="delete-account-confirm"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {isDeleting ? 'Deleting...' : 'Delete account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export { ProfileForm, profileSchema }
