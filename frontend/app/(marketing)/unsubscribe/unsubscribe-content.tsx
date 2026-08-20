'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useMutation } from '@tanstack/react-query'
import { BRAND_ASSETS } from '@/lib/brand'

async function callUnsubscribe(leadId: string): Promise<void> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
  const res = await fetch(`${apiUrl}/leads/unsubscribe?lead_id=${encodeURIComponent(leadId)}`)
  if (res.status === 404) {
    throw new Error('already-unsubscribed')
  }
  if (!res.ok) {
    throw new Error('server-error')
  }
}

export function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const leadId = searchParams.get('id')

  const { mutate, status, error } = useMutation({ mutationFn: callUnsubscribe })

  useEffect(() => {
    if (leadId) mutate(leadId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId])

  const isAlready = error instanceof Error && error.message === 'already-unsubscribed'

  return (
    <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center">
      <Link href="/" className="mb-8 inline-flex rounded bg-white p-1" aria-label="Lextract home">
        <Image
          src={BRAND_ASSETS.logoPng}
          alt="Lextract"
          width={156}
          height={38}
          className="h-10 w-auto"
          priority
        />
      </Link>

      {!leadId && (
        <>
          <h1 className="text-2xl font-bold text-slate-900 mb-2 sm:text-3xl">Invalid unsubscribe link</h1>
          <p className="text-slate-500 text-base mb-6">
            This link appears to be incomplete. If you received an email from us and want to
            unsubscribe, please reply to that email and we&apos;ll remove you manually.
          </p>
          <Link href="/" className="text-slate-400 text-xs hover:text-slate-600">
            Return to lextract.io
          </Link>
        </>
      )}

      {leadId && status === 'idle' && (
        <p className="text-slate-500 text-sm">Processing your request…</p>
      )}

      {leadId && status === 'pending' && (
        <>
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Processing your request…</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2 sm:text-3xl">You&apos;ve been unsubscribed</h1>
          <p className="text-slate-500 text-base mb-6">
            You won&apos;t receive any more emails from us. You can still{' '}
            <Link href="/signup" className="text-teal-600 hover:underline">
              create a free account
            </Link>{' '}
            to try Lextract anytime.
          </p>
          <Link href="/" className="text-slate-400 text-xs hover:text-slate-600">
            Return to lextract.io
          </Link>
        </>
      )}

      {status === 'error' && isAlready && (
        <>
          <h1 className="text-2xl font-bold text-slate-900 mb-2 sm:text-3xl">Already unsubscribed</h1>
          <p className="text-slate-500 text-base mb-6">
            You&apos;re already off our list. No further emails will be sent.
          </p>
          <Link href="/" className="text-slate-400 text-xs hover:text-slate-600">
            Return to lextract.io
          </Link>
        </>
      )}

      {status === 'error' && !isAlready && (
        <>
          <h1 className="text-2xl font-bold text-slate-900 mb-2 sm:text-3xl">Something went wrong</h1>
          <p className="text-slate-500 text-base mb-6">
            We couldn&apos;t process your request. Please reply to the email directly and we&apos;ll
            remove you manually.
          </p>
          <Link href="/" className="text-slate-400 text-xs hover:text-slate-600">
            Return to lextract.io
          </Link>
        </>
      )}
    </div>
  )
}
