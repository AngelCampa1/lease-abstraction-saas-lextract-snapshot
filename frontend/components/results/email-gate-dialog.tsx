'use client'

import { useEffect, useRef, useState } from 'react'
import { Mail, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { captureEvent, EVENTS } from '@/lib/posthog'
import { TurnstileField } from '@/components/marketing/turnstile-field'

// ---------------------------------------------------------------------------
// Form schema
// ---------------------------------------------------------------------------

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
})

type EmailFormValues = z.infer<typeof emailSchema>

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface EmailGateDialogProps {
  open: boolean
  onSubmit: (email: string, turnstileToken: string) => void
  isSubmitting: boolean
}

export function EmailGateDialog({ open, onSubmit, isSubmitting }: EmailGateDialogProps) {
  const trackedRef = useRef(false)
  const [turnstileToken, setTurnstileToken] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    mode: 'onChange',
  })

  useEffect(() => {
    if (open && !trackedRef.current) {
      trackedRef.current = true
      captureEvent(EVENTS.email_gate_shown)
    }
  }, [open])

  function onFormSubmit({ email }: EmailFormValues) {
    onSubmit(email, turnstileToken)
  }

  return (
    <Dialog open={open} onOpenChange={() => { /* mandatory - prevent closing */ }}>
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        showCloseButton={false}
        data-testid="email-gate-dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Your extraction is ready!</DialogTitle>
          <DialogDescription>
            Enter your email to view your results.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="mt-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-gate-input">Work email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email-gate-input"
                type="email"
                placeholder="you@company.com"
                className="pl-10"
                autoFocus
                disabled={isSubmitting}
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <TurnstileField onTokenChange={setTurnstileToken} />

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Loading…
              </>
            ) : (
              'View My Results'
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            We&apos;ll only email you about this extraction.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}
