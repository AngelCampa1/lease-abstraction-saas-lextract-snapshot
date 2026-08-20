import React from 'react'
import Link from 'next/link'
import { PRICING, formatPrice } from '@/lib/pricing'
import { getProductFacts } from '@/lib/public-facts'

const { fieldCount } = getProductFacts()

const DEFAULT_DESCRIPTION = `Upload your lease PDF. Get ${fieldCount} fields in minutes. See a free preview first. Pay just ${formatPrice(PRICING.single.price)} for the full report. No signup needed to try.`

interface ContentCtaProps {
  heading?: string
  description?: string
  buttonText?: string
  href?: string
}

function ContentCta({
  heading = 'See this in your own lease',
  description = DEFAULT_DESCRIPTION,
  buttonText = 'Get a free preview',
  href = '/upload',
}: ContentCtaProps) {
  return (
    <section className="my-12 rounded-xl bg-primary/5 border border-primary/10 p-6 sm:p-8 text-center">
      <h2 className="mb-3 text-2xl sm:text-3xl font-bold">{heading}</h2>
      <p className="mb-6 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">{description}</p>
      <Link
        href={href}
        className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 transition-colors hover:bg-primary/90 sm:w-auto"
      >
        {buttonText}
      </Link>
    </section>
  )
}

export { ContentCta }
