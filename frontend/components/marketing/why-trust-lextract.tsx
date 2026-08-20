import { type ElementType } from 'react'
import Link from 'next/link'
import {
  ScanLine,
  LayoutGrid,
  ShieldCheck,
  Gauge,
  AlertTriangle,
  X,
} from 'lucide-react'
import { FadeIn } from '@/components/motion/fade-in'
import {
  StaggerChildren,
  StaggerItem,
} from '@/components/motion/stagger-children'
import { getProductFacts } from '@/lib/public-facts'

const productFacts = getProductFacts()

interface PipelineStep {
  number: string
  icon: ElementType
  label: string
  title: string
  description: string
  contrast: string
}

const steps: PipelineStep[] = [
  {
    number: '01',
    icon: ScanLine,
    label: 'Vision AI',
    title: 'Reads scanned and digital PDFs natively',
    description:
      'Vision AI reads every page, scanned or digital. It keeps the page layout, tables, signatures, and stamps in view. There is no separate OCR step.',
    contrast: 'Built to read scanned pages and table layouts, not just plain text.',
  },
  {
    number: '02',
    icon: LayoutGrid,
    label: 'Domain-Trained Prompts',
    title: `Extracts ${productFacts.fieldCount} named fields across ${productFacts.categoryCount} categories`,
    description: `Domain-trained prompts apply a ${productFacts.fieldCount}-field lease schema on every extraction. The fields cover parties, dates, financials, CAM provisions, options, and more. Each value is typed and normalized.`,
    contrast: 'Every result follows the same fixed field schema.',
  },
  {
    number: '03',
    icon: ShieldCheck,
    label: 'Multi-Pass Validation',
    title: 'Three independent AI passes challenge every answer',
    description:
      'First a primary extraction. Then a validation pass that reviews the result and checks percentage formats, date ordering, financial plausibility, and other rules. A final pass re-checks any disputed critical fields.',
    contrast: 'Three passes check the work instead of one.',
  },
  {
    number: '04',
    icon: Gauge,
    label: 'Score',
    title: 'Every field gets a confidence score',
    description:
      'Document and AI confidence are blended for each field. Checks across fields lower the score when values do not line up. You see green, yellow, or red on each value.',
    contrast: 'Shows you which fields to verify first.',
  },
  {
    number: '05',
    icon: AlertTriangle,
    label: 'Flag',
    title: `${productFacts.redFlagCount} risk rules run automatically`,
    description: `${productFacts.redFlagCount} rules across 3 severity levels check for risky terms like uncapped CAM, missing audit rights, and aggressive holdover clauses. These are provisions that can cost tenants real money.`,
    contrast: 'Risk rules are built in for commercial lease terms.',
  },
]

export function WhyTrustLextract() {
  return (
    <section className="bg-muted/50 py-12 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <FadeIn className="max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
            Purpose-Built Pipeline
          </p>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            Built for commercial lease review
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Lextract gives CRE teams {productFacts.fieldCount} structured fields, each with its own
            confidence score. Here&apos;s what happens when you upload a lease.
          </p>
        </FadeIn>

        {/* Pipeline steps: hero (step 01) + supporting row (02-05) on lg */}
        <StaggerChildren
          className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          staggerDelay={0.08}
        >
          {steps.map((step, index) => {
            const isHero = index === 0
            return (
              <StaggerItem
                key={step.number}
                className={`relative ${isHero ? 'sm:col-span-2 lg:col-span-4' : ''}`}
                data-testid={isHero ? 'pipeline-hero-card' : undefined}
              >
                <div
                  className={`flex h-full flex-col rounded-xl border bg-card shadow-sm ${
                    isHero
                      ? 'gap-4 border-primary/30 bg-gradient-to-br from-primary/8 via-card to-card p-6 lg:flex-row lg:items-center lg:gap-8 lg:p-8'
                      : 'p-6'
                  }`}
                >
                  {/* Step label + icon */}
                  <div
                    className={`flex items-center gap-3 ${
                      isHero ? 'lg:shrink-0 lg:flex-col lg:items-start lg:gap-4' : 'mb-4'
                    }`}
                  >
                    <div
                      className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-primary/15 ${
                        isHero ? 'size-14' : 'size-10'
                      }`}
                    >
                      <step.icon className={`${isHero ? 'size-7' : 'size-5'} text-primary`} aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Step {step.number}
                      </p>
                      <p className={`${isHero ? 'text-base' : 'text-sm'} font-semibold text-primary`}>
                        {step.label}
                      </p>
                    </div>
                  </div>

                  <div className={`flex flex-1 flex-col ${isHero ? '' : ''}`}>
                    <h3
                      className={`mb-2 font-semibold leading-snug ${
                        isHero ? 'text-xl sm:text-2xl' : 'text-sm'
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p
                      className={`grow leading-relaxed text-muted-foreground ${
                        isHero ? 'text-base' : 'text-sm'
                      }`}
                    >
                      {step.description}
                    </p>

                    <div className="mt-4 flex items-start gap-1.5 rounded-md bg-muted px-3 py-2">
                      <X
                        className="mt-0.5 size-3 shrink-0 text-muted-foreground/50"
                        aria-hidden="true"
                      />
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {step.contrast}
                      </p>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            )
          })}
        </StaggerChildren>

        {/* Bottom CTAs */}
        <FadeIn className="mt-10 flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-center">
          <Link
            href="/upload"
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:w-auto"
          >
            Get a free preview
          </Link>
          <Link
            href="/resources/comparisons/chatgpt-lease-review"
            className="inline-flex min-h-[44px] items-center text-sm text-primary underline-offset-4 hover:underline"
          >
            See ChatGPT vs Lextract in detail
          </Link>
        </FadeIn>
      </div>
    </section>
  )
}
