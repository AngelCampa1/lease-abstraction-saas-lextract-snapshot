'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, Download, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'
import { captureEvent, EVENTS } from '@/lib/posthog'
import { PROMOTED_LEAD_MAGNETS } from '@/data/lead-magnets'
import type { LeadMagnetSlug } from '@/data/lead-magnets'
import { TurnstileField } from '@/components/marketing/turnstile-field'
import { magnetForPath } from '@/lib/page-magnet-map'

const SESSION_KEY = 'lextract-exit-popup-shown'
const TRIGGER_DELAY_MS = 5_000
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Status = 'idle' | 'submitting' | 'success' | 'error'

interface DownloadApiResponse {
  success: boolean
  downloadUrl?: string
  emailed?: boolean
  error?: string
}

function getMagnetBySlug(slug: LeadMagnetSlug) {
  return PROMOTED_LEAD_MAGNETS.find((m) => m.slug === slug)
}

function getAlternateMagnets(currentSlug: LeadMagnetSlug) {
  return PROMOTED_LEAD_MAGNETS.filter((m) => m.slug !== currentSlug)
}

export function ExitPopup() {
  const { user, loading } = useAuth()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<LeadMagnetSlug>('lease-abstraction-checklist')
  const [swapOpen, setSwapOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')

  useEffect(() => {
    if (loading || user || sessionStorage.getItem(SESSION_KEY)) return

    let mouseLeaveHandler: ((e: MouseEvent) => void) | null = null

    const timeoutId = setTimeout(() => {
      mouseLeaveHandler = (event: MouseEvent) => {
        if (event.clientY <= 0) {
          // Select the tailored magnet at trigger time so it reads the live pathname.
          setSelected(magnetForPath(window.location.pathname))
          setOpen(true)
          captureEvent(EVENTS.exit_popup_shown)
          sessionStorage.setItem(SESSION_KEY, '1')
          document.removeEventListener('mouseleave', mouseLeaveHandler!)
        }
      }
      document.addEventListener('mouseleave', mouseLeaveHandler)
    }, TRIGGER_DELAY_MS)

    return () => {
      clearTimeout(timeoutId)
      if (mouseLeaveHandler) {
        document.removeEventListener('mouseleave', mouseLeaveHandler)
      }
    }
  }, [loading, user])

  const selectedMagnet = getMagnetBySlug(selected)
  const alternateMagnets = getAlternateMagnets(selected)
  const trimmedEmail = email.trim()
  const isEmailValid = EMAIL_RE.test(trimmedEmail)
  const hasTurnstileToken = turnstileToken.length > 0
  const canSubmit = isEmailValid && hasTurnstileToken && status !== 'submitting'

  function handleMagnetSwap(slug: LeadMagnetSlug) {
    setSelected(slug)
    setSwapOpen(false)
    setStatus('idle')
    captureEvent(EVENTS.exit_popup_freebie_selected, { freebie_id: slug })
  }

  async function handleSubmit() {
    if (!isEmailValid || !hasTurnstileToken) return

    setStatus('submitting')
    try {
      const response = await fetch('/api/leads/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          magnetSlug: selected,
          placement: 'exit-popup',
          sourcePath: window.location.pathname,
          company_website: '',
          turnstileToken,
        }),
      })
      const data = (await response.json().catch(() => ({}))) as DownloadApiResponse

      if (!response.ok || !data.success || !data.downloadUrl) {
        setStatus('error')
        return
      }

      captureEvent(EVENTS.exit_popup_submitted, { freebie_id: selected })
      setDownloadUrl(data.downloadUrl)
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && status !== 'success') {
          captureEvent(EVENTS.exit_popup_dismissed)
        }
        setOpen(value)
      }}
    >
      <DialogContent className="sm:p-8 max-h-[calc(100vh-2rem)] overflow-y-auto">
        {status === 'success' ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center" aria-live="polite">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle className="size-6 text-primary" aria-hidden="true" />
            </span>
            <p className="text-lg font-semibold">Check your inbox.</p>
            <p className="text-sm text-muted-foreground">
              We sent a copy. Download it below if you want it now.
            </p>
            <a
              href={downloadUrl}
              className="inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Download className="mr-2 size-4" aria-hidden="true" />
              Download Now
            </a>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Free before you go</DialogTitle>
              <DialogDescription>
                Leave your email and we&apos;ll send it right now.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 flex flex-col gap-4">
              {/* Selected magnet display */}
              {selectedMagnet && (
                <div className="rounded-xl border bg-primary/5 p-3 text-sm font-medium">
                  {selectedMagnet.title}
                </div>
              )}

              {/* Swap disclosure */}
              <div>
                <button
                  type="button"
                  onClick={() => setSwapOpen((prev) => !prev)}
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  Need something else?
                </button>
                {swapOpen && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    {alternateMagnets.map((magnet) => (
                      <button
                        key={magnet.slug}
                        type="button"
                        onClick={() => handleMagnetSwap(magnet.slug)}
                        className="rounded-full border px-3 py-2 text-left text-sm hover:border-primary/40 hover:bg-muted/50"
                      >
                        {magnet.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Email field */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exit-popup-email">Work email</Label>
                <Input
                  id="exit-popup-email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    if (status !== 'idle') {
                      setStatus('idle')
                    }
                  }}
                  placeholder="you@company.com"
                  autoComplete="email"
                  aria-invalid={trimmedEmail.length > 0 && !isEmailValid}
                />
              </div>

              {/* Turnstile */}
              <TurnstileField onTokenChange={setTurnstileToken} />

              {/* Error */}
              <div aria-live="polite">
                {status === 'error' && (
                  <p className="text-sm text-destructive">That didn&apos;t work. Try again?</p>
                )}
              </div>

              {/* CTA */}
              <Button
                type="button"
                onClick={() => {
                  void handleSubmit()
                }}
                disabled={!canSubmit}
                className="w-full rounded-full"
              >
                {status === 'submitting' ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                    Sending...
                  </>
                ) : (
                  `Send me the ${selectedMagnet?.title ?? ''}`
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
