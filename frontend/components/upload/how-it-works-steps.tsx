import { PRICING, formatPrice } from '@/lib/pricing'

export function HowItWorksSteps() {
  return (
    <ol
      aria-label="How it works"
      className="mb-6 flex items-center justify-center gap-2"
    >
      <Step num={1} line1="Upload" line2="PDF" showArrow />
      <Step num={2} line1="AI extracts" line2="126 fields" showArrow />
      <Step num={3} line1="Preview" line2="free" showArrow />
      <StepPaid />
    </ol>
  )
}

function Arrow() {
  return (
    <span
      aria-hidden="true"
      data-testid="step-arrow"
      className="text-sm text-muted-foreground"
    >
      {'>'}
    </span>
  )
}

function Step({
  num,
  line1,
  line2,
  showArrow = false,
}: {
  num: number
  line1: string
  line2: string
  showArrow?: boolean
}) {
  return (
    <li className="flex items-center gap-2">
      <div className="flex flex-col items-center gap-1">
        <span
          data-testid={`step-circle-${num}`}
          className="flex size-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
        >
          {num}
        </span>
        <span className="text-center text-xs uppercase tracking-wider text-muted-foreground">{line1}</span>
        <span className="text-center text-xs uppercase tracking-wider text-muted-foreground">{line2}</span>
      </div>
      {showArrow && <Arrow />}
    </li>
  )
}

function StepPaid() {
  return (
    <li className="flex flex-col items-center gap-1">
      <span
        data-testid="step-circle-4"
        className="flex size-7 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background"
      >
        4
      </span>
      <span className="text-center text-xs uppercase tracking-wider text-muted-foreground">Unlock</span>
      <span className="text-center text-xs uppercase tracking-wider font-bold text-primary">
        {formatPrice(PRICING.single.price)}
      </span>
    </li>
  )
}
