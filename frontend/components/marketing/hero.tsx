'use client'

import Link from 'next/link'
import { CheckCircle2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FadeIn } from '@/components/motion/fade-in'
import { PRICING, PROCESSING_TIME, formatPrice } from '@/lib/pricing'
import { getProductFacts } from '@/lib/public-facts'
import { captureEvent, EVENTS } from '@/lib/posthog'

const productFacts = getProductFacts()

const trustIndicators = [
  `${productFacts.fieldCount} fields extracted`,
  PROCESSING_TIME.trustBadge,
  'AES-256 encrypted',
]

const clarityAnswers = [
  {
    label: 'What we solve',
    copy: 'Reading leases by hand is slow. It takes 4 to 8 hours per lease. Mistakes are easy to make.',
  },
  {
    label: 'How we solve it',
    copy: `Upload a PDF. Lextract pulls ${productFacts.fieldCount} fields with confidence scores and red flags. You get reports you can export.`,
  },
  {
    label: 'Who it is for',
    copy: 'Made for CRE teams, brokers, tenant reps, and lease admins. Anyone who works with leases.',
  },
]

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pb-16 pt-20 sm:pb-24 sm:pt-32">
      {/* Teal radial glow from top */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 110% 70% at 50% -5%, oklch(0.986 0.015 180) 0%, transparent 65%)',
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-sm font-medium text-primary">
            <Sparkles className="size-3.5" aria-hidden="true" />
            AI Lease Abstraction
          </div>

          <h1 className="font-display text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl lg:text-[3.75rem] lg:leading-[1.1]">
            Get {productFacts.fieldCount} lease fields in minutes
          </h1>

          <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg lg:text-xl">
            Stop re-reading long leases. Upload a PDF and get a free preview.
            Pay {formatPrice(PRICING.single.price)} only for the full report. No
            subscription.
          </p>

          <div className="mt-8 sm:mt-10 grid gap-3 text-left sm:grid-cols-3">
            {clarityAnswers.map((answer) => (
              <div
                key={answer.label}
                className="rounded-lg border bg-card/80 p-4 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {answer.label}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {answer.copy}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" asChild className="w-full shadow-md shadow-primary/20 sm:w-auto">
              <Link href="/upload" onClick={() => captureEvent(EVENTS.cta_clicked, { cta_text: 'Get a free preview', location: 'hero' })}>Get a free preview</Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="w-full sm:w-auto">
              <Link href="/sample-report" onClick={() => captureEvent(EVENTS.cta_clicked, { cta_text: 'See a sample report', location: 'hero' })}>See a sample report</Link>
            </Button>
          </div>

          {/* Trust indicators */}
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 sm:mt-12">
            {trustIndicators.map((label) => (
              <li
                key={label}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <CheckCircle2
                  className="size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </FadeIn>
      </div>
    </section>
  )
}
