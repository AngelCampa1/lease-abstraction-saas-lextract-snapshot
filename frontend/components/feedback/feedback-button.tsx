'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { MessageCircle, X, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { captureEvent, EVENTS } from '@/lib/posthog'
import { TurnstileField } from '@/components/marketing/turnstile-field'

type FormState = 'idle' | 'submitting' | 'success' | 'error'

interface FeedbackButtonProps {
  placement?: 'default' | 'opposite-chat'
}

export function FeedbackButton({ placement = 'default' }: FeedbackButtonProps) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [formState, setFormState] = useState<FormState>('idle')
  const [errorText, setErrorText] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pathname = usePathname()
  const isOppositeChat = placement === 'opposite-chat'
  const horizontalPlacement = isOppositeChat ? 'left-4 right-auto' : 'right-4'

  const close = useCallback(() => {
    setOpen(false)
    setFormState('idle')
    setErrorText('')
  }, [])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, close])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        close()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, close])

  // Focus textarea on open
  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [open])

  // Auto-close after success
  useEffect(() => {
    if (formState !== 'success') return
    const timer = setTimeout(() => {
      close()
      setMessage('')
      setEmail('')
    }, 2000)
    return () => clearTimeout(timer)
  }, [formState, close])

  function handleToggle() {
    if (!open) {
      captureEvent(EVENTS.feedback_opened, { page: pathname })
    }
    setOpen((prev) => !prev)
    setFormState('idle')
    setErrorText('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return

    setFormState('submitting')
    setErrorText('')

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          email: email.trim() || undefined,
          page: pathname,
          company_website: '',
          turnstileToken,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Something went wrong.' }))
        setErrorText(body.error ?? 'Something went wrong.')
        setFormState('error')
        return
      }

      captureEvent(EVENTS.feedback_submitted, { page: pathname })
      setFormState('success')
    } catch {
      setErrorText('Network error. Please try again.')
      setFormState('error')
    }
  }

  return (
    <>
      {/* Popover panel */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Send feedback"
          className={`fixed bottom-24 z-50 w-80 rounded-xl border bg-card p-4 shadow-lg sm:bottom-16 ${
            horizontalPlacement
          }`}
        >
          {formState === 'success' ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Check className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">Thanks for your feedback!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Send Feedback</h3>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Close feedback form"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's on your mind?"
                aria-label="Feedback message"
                rows={3}
                maxLength={1000}
                required
                className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />

              <Input
                type="email"
                placeholder="Email (optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-8 text-sm"
              />

              {formState === 'error' && errorText && (
                <p className="text-xs text-destructive">{errorText}</p>
              )}

              <TurnstileField onTokenChange={setTurnstileToken} />

              <Button
                type="submit"
                size="sm"
                disabled={!message.trim() || formState === 'submitting'}
                className="w-full"
              >
                {formState === 'submitting' ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Feedback'
                )}
              </Button>
            </form>
          )}
        </div>
      )}

      {/* Floating trigger button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-label="Send feedback"
        aria-expanded={open}
        className={`fixed z-50 flex items-center justify-center gap-1.5 rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105 active:scale-95 max-sm:size-10 sm:h-8 sm:px-3 sm:text-xs sm:font-medium ${horizontalPlacement} bottom-4 max-sm:bottom-6`}
      >
        <MessageCircle className="size-4 sm:size-3.5" />
        <span className="max-sm:sr-only">Feedback</span>
      </button>
    </>
  )
}
