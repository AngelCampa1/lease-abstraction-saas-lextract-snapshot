'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle, Loader2, Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TurnstileField } from '@/components/marketing/turnstile-field'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LeadMagnetGateProps {
  magnetSlug: string
  magnetName: string
  fileFormat: 'PDF' | 'XLSX'
  description: string
}

type GateStatus = 'idle' | 'loading' | 'success' | 'error'

// ---------------------------------------------------------------------------
// Form schema
// ---------------------------------------------------------------------------

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  firstName: z.string().optional(),
  company: z.string().optional(),
  companyWebsite: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

// ---------------------------------------------------------------------------
// API response type
// ---------------------------------------------------------------------------

interface DownloadApiResponse {
  success: boolean
  downloadUrl?: string
  emailed?: boolean
  error?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LeadMagnetGate({
  magnetSlug,
  magnetName,
  fileFormat,
  description,
}: LeadMagnetGateProps) {
  const [status, setStatus] = useState<GateStatus>('idle')
  const [downloadUrl, setDownloadUrl] = useState<string>('')
  const [submittedEmail, setSubmittedEmail] = useState<string>('')
  const [emailed, setEmailed] = useState(false)
  const [apiError, setApiError] = useState<string>('')
  const [turnstileToken, setTurnstileToken] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(values: FormValues) {
    setStatus('loading')
    setApiError('')

    try {
      const res = await fetch('/api/leads/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: values.email,
          magnetSlug,
          firstName: values.firstName ?? '',
          company: values.company ?? '',
          company_website: values.companyWebsite ?? '',
          turnstileToken,
        }),
      })

      const data = await res.json() as DownloadApiResponse

      if (!res.ok || !data.success) {
        setApiError(data.error ?? 'Something went wrong. Please try again.')
        setStatus('error')
        return
      }

      setSubmittedEmail(values.email)
      setDownloadUrl(data.downloadUrl ?? '')
      setEmailed(Boolean(data.emailed))
      setStatus('success')
    } catch {
      setApiError('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return <SuccessState
      magnetName={magnetName}
      email={submittedEmail}
      downloadUrl={downloadUrl}
      emailed={emailed}
    />
  }

  const buttonLabel = fileFormat === 'XLSX'
    ? 'Download Free Excel'
    : 'Download Free PDF'

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <FileText className="size-5 text-primary" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Free {fileFormat}
          </p>
          <p className="text-sm font-semibold leading-snug text-foreground">
            {magnetName}
          </p>
        </div>
      </div>

      <p className="mb-5 text-base text-muted-foreground sm:text-lg lg:text-xl">{description}</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        {/* Email - required */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lmg-email">
            Work email <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <Input
            id="lmg-email"
            type="email"
            inputMode="email"
            placeholder="you@company.com"
            autoComplete="email"
            aria-required="true"
            aria-invalid={errors.email ? 'true' : 'false'}
            className="text-base"
            {...register('email')}
          />
          {errors.email && (
            <p role="alert" className="text-xs text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* First name - optional */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lmg-firstname">
            First name <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="lmg-firstname"
            type="text"
            placeholder="Alice"
            autoComplete="given-name"
            className="text-base"
            {...register('firstName')}
          />
        </div>

        {/* Company - optional */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lmg-company">
            Company <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="lmg-company"
            type="text"
            placeholder="Acme Properties"
            autoComplete="organization"
            className="text-base"
            {...register('company')}
          />
        </div>

        <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
          <Label htmlFor="lmg-company-website">Company website</Label>
          <Input
            id="lmg-company-website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            {...register('companyWebsite')}
          />
        </div>

        <TurnstileField onTokenChange={setTurnstileToken} />

        {/* API-level error */}
        {status === 'error' && apiError && (
          <p role="alert" className="text-sm text-destructive">
            {apiError}
          </p>
        )}

        <Button
          type="submit"
          disabled={status === 'loading'}
          className="w-full sm:w-auto"
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              Sending&hellip;
            </>
          ) : (
            buttonLabel
          )}
        </Button>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Success state
// ---------------------------------------------------------------------------

function SuccessState({
  magnetName,
  email,
  downloadUrl,
  emailed,
}: {
  magnetName: string
  email: string
  downloadUrl: string
  emailed: boolean
}) {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle className="size-7 text-primary" aria-hidden="true" />
        </span>

        <div>
          <h3 className="text-xl font-bold text-foreground sm:text-2xl">
            {emailed ? 'Check your inbox!' : 'Your download is ready'}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {emailed ? (
              <>
                We&apos;ve sent the{' '}
                <span className="font-medium text-foreground">{magnetName}</span> to{' '}
                <span className="font-medium text-foreground">{email}</span>.
                Download link included.
              </>
            ) : (
              <>
                We couldn&apos;t send an email copy right now, but your{' '}
                <span className="font-medium text-foreground">{magnetName}</span>{' '}
                is available below for immediate download.
              </>
            )}
          </p>
        </div>

        {downloadUrl ? (
          <Button asChild className="w-full sm:w-auto">
            <a href={downloadUrl} download>
              <Download className="mr-2 size-4" aria-hidden="true" />
              Download Now
            </a>
          </Button>
        ) : null}

        <p className="text-xs text-muted-foreground">
          {emailed
            ? "Didn't receive it? Use the direct download above."
            : 'Use the direct download above. You can request the file again later if needed.'}
        </p>
      </div>
    </div>
  )
}
