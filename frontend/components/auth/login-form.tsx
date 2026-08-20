'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { motion } from 'motion/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { OAuthButtons } from '@/components/auth/oauth-buttons'
import { useAuth } from '@/hooks/use-auth'
import { loginSchema, type LoginFormValues } from '@/lib/auth-schemas'
import { captureEvent, EVENTS } from '@/lib/posthog'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnToParam = searchParams.get('return') ?? '/dashboard'
  // Prevent open redirect: only allow relative paths (not absolute or protocol-relative URLs)
  const returnTo =
    returnToParam.startsWith('/') && !returnToParam.startsWith('//')
      ? returnToParam
      : '/dashboard'
  const { signIn } = useAuth()
  const [serverError, setServerError] = useState<string | null>(null)
  const [shaking, setShaking] = useState(false)

  // Drive the shake reset from an effect so the timer is always cleared on
  // unmount (or before re-arming), preventing a state update after unmount.
  useEffect(() => {
    if (!shaking) return
    const timeoutId = setTimeout(() => setShaking(false), 500)
    return () => clearTimeout(timeoutId)
  }, [shaking])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(data: LoginFormValues) {
    setServerError(null)
    captureEvent(EVENTS.login_started)
    try {
      const { error } = await signIn(data.email, data.password)
      if (error) {
        const errorMessage = error.message ?? 'Sign in failed'
        captureEvent(EVENTS.login_failed, { error_message: errorMessage })
        setServerError(errorMessage)
        setShaking(true)
        return
      }
      captureEvent(EVENTS.login_completed)
      router.push(returnTo)
    } catch {
      captureEvent(EVENTS.login_failed, { error_message: 'Something went wrong. Try again.' })
      setServerError('Something went wrong. Try again.')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={shaking ? { x: [0, -8, 8, -8, 8, 0], opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <h1 className="text-3xl font-semibold leading-none sm:text-4xl">Welcome back</h1>
          <CardDescription>Sign in to your Lextract account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <OAuthButtons context="login" />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-sm uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                placeholder="you@company.com"
                autoComplete="email"
                aria-invalid={!!errors.email}
                aria-required="true"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="inline-flex min-h-[44px] items-center py-2.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Your password"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                aria-required="true"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            {serverError && (
              <p className="text-sm text-destructive" role="alert" data-testid="server-error">
                {serverError}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Sign in
            </Button>
          </form>

          <p
            className="text-center text-xs leading-relaxed text-muted-foreground"
            data-testid="login-terms-disclaimer"
          >
            By signing in, you agree to our{' '}
            <Link
              href="/terms"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link
              href="/privacy"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Privacy Policy
            </Link>
            .
          </p>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link
              href={`/signup${returnTo !== '/dashboard' ? `?return=${encodeURIComponent(returnTo)}` : ''}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Create account
            </Link>
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
