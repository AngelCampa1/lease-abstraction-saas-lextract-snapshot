'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Check, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FadeIn } from '@/components/motion/fade-in'
import {
  StaggerChildren,
  StaggerItem,
} from '@/components/motion/stagger-children'
import { PRICING, SUPPORT_POLICY, COMPETITOR_PRICE_RANGE, formatPrice } from '@/lib/pricing'
import { captureEvent, EVENTS } from '@/lib/posthog'

interface PricingTier {
  name: string
  price: string
  perLease: string
  description: string
  badge: string | null
  features: string[]
  highlighted: boolean
}

const tiers: PricingTier[] = [
  {
    name: PRICING.single.label,
    price: formatPrice(PRICING.single.price),
    perLease: `${formatPrice(PRICING.single.perLease)}/lease`,
    description: 'Try it on one lease. No commitment.',
    badge: null,
    features: [
      '126-field extraction',
      'Confidence scoring',
      'Red flag detection',
      'Word, PDF, and Excel export',
      'Side-by-side PDF viewer',
    ],
    highlighted: true,
  },
  {
    name: PRICING.pack5.label,
    price: formatPrice(PRICING.pack5.price),
    perLease: `${formatPrice(PRICING.pack5.perLease)}/lease`,
    description: 'Best for small portfolios and due diligence.',
    badge: PRICING.pack5.savings,
    features: [
      'Everything in Single Lease',
      `${PRICING.pack5.credits} lease credits`,
      'Credits never expire',
      'Use at your own pace',
      'Priority support',
    ],
    highlighted: false,
  },
  {
    name: PRICING.pack10.label,
    price: formatPrice(PRICING.pack10.price),
    perLease: `${formatPrice(PRICING.pack10.perLease)}/lease`,
    description: 'Best for teams and recurring abstractions.',
    badge: PRICING.pack10.savings,
    features: [
      'Everything in 5-Pack',
      `${PRICING.pack10.credits} lease credits`,
      'Credits never expire',
      'Use at your own pace',
      'Priority support',
    ],
    highlighted: false,
  },
]

export function PricingCards() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          captureEvent(EVENTS.pricing_viewed)
          observer.disconnect()
        }
      },
      { threshold: 0.3 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section id="pricing" ref={sectionRef} className="py-12 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            Lease Abstraction Pricing
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg lg:text-xl">
            Pay per lease. No subscriptions and no monthly fees.
            For comparison, outsourced manual abstraction runs {COMPETITOR_PRICE_RANGE} per lease.
          </p>
        </FadeIn>

        <StaggerChildren className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
          {tiers.map((tier) => (
            <StaggerItem key={tier.name}>
              <div
                className={`relative flex h-full flex-col rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md sm:p-8 ${
                  tier.highlighted
                    ? 'border-primary shadow-primary/15 ring-1 ring-primary'
                    : ''
                }`}
              >
                {tier.badge ? (
                  <Badge
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm ${
                      tier.highlighted
                        ? 'bg-amber-500 text-white hover:bg-amber-500/90'
                        : ''
                    }`}
                  >
                    {tier.badge}
                  </Badge>
                ) : null}

                <div className="text-center">
                  <h3 className="text-lg font-semibold">{tier.name}</h3>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{tier.price}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {tier.perLease}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {tier.description}
                  </p>
                </div>

                <ul className="mt-8 flex-1 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 flex-shrink-0 text-primary" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  <Button
                    className="w-full"
                    variant={tier.highlighted ? 'default' : 'outline'}
                    asChild
                  >
                    <Link href="/upload" onClick={() => captureEvent(EVENTS.cta_clicked, { cta_text: 'Get a free preview', location: 'pricing', tier: tier.name })}>Get a free preview</Link>
                  </Button>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>

        <FadeIn className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" />
          <span>{SUPPORT_POLICY}</span>
        </FadeIn>
      </div>
    </section>
  )
}
