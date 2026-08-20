'use client'

import { ChevronDown } from 'lucide-react'
import { FadeIn } from '@/components/motion/fade-in'
import { captureEvent, EVENTS } from '@/lib/posthog'

interface FaqItem {
  question: string
  answer: string
}

interface FaqSectionProps {
  items: FaqItem[]
  subtitle?: string
}

export function FaqSection({ items, subtitle }: FaqSectionProps) {
  return (
    <section className="py-12 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            Frequently Asked Questions
          </h2>
          {subtitle && (
            <p className="mt-4 text-base text-muted-foreground sm:text-lg lg:text-xl">
              {subtitle}
            </p>
          )}
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="mt-12 space-y-3">
            {items.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-lg border p-0"
                onToggle={(e) => {
                  // Safe: onToggle only fires on <details> elements
                  const isOpen = (e.currentTarget as HTMLDetailsElement).open
                  captureEvent(EVENTS.faq_toggled, { question: faq.question, is_open: isOpen })
                }}
              >
                <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between px-5 py-4 text-base font-medium transition-colors hover:text-primary [&::-webkit-details-marker]:hidden">
                  <span>{faq.question}</span>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="border-t px-5 py-4 text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
