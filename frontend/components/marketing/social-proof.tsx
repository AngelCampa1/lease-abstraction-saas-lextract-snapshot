import { FadeIn } from '@/components/motion/fade-in'
import { PRICING, PROCESSING_TIME, formatPrice } from '@/lib/pricing'

const stats = [
  { value: PROCESSING_TIME.statShort, label: PROCESSING_TIME.statLabel },
  { value: '126', label: 'Fields per lease' },
  { value: formatPrice(PRICING.single.price), label: 'Per lease, no subscription' },
]

export function SocialProof() {
  return (
    <section className="border-y bg-muted/30 py-10 sm:py-14" data-testid="social-proof-section">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="sr-only">AI Lease Abstraction Software Results</h2>
        <FadeIn>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-0">
            {stats.map((stat, index) => (
              <div key={stat.label} className="flex items-center" data-testid="social-proof-stat">
                {index > 0 && (
                  <span className="mx-6 hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
                )}
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{stat.value}</span>
                  {' '}{stat.label.toLowerCase()}
                </p>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
