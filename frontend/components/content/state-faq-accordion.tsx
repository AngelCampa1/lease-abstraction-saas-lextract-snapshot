import React from 'react'
import type { StateFaq } from '@/data/states'

interface StateFaqAccordionProps {
  faqs: StateFaq[]
}

function StateFaqAccordion({ faqs }: StateFaqAccordionProps) {
  return (
    <section className="mt-12">
      <h2 className="mb-6 text-xl sm:text-2xl font-bold tracking-tight">
        Frequently Asked Questions
      </h2>
      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <details
            key={`faq-${index}`}
            className="group rounded-xl border bg-card shadow-sm p-0"
          >
            <summary className="cursor-pointer list-none px-5 min-h-[44px] flex items-center text-base font-medium transition-colors hover:text-primary [&::-webkit-details-marker]:hidden">
              {faq.question}
            </summary>
            <div className="border-t px-5 py-4 text-sm text-muted-foreground leading-relaxed break-words">
              {faq.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}

export { StateFaqAccordion }
