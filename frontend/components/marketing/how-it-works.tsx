import { Upload, Cpu, CheckCircle } from 'lucide-react'
import { FadeIn } from '@/components/motion/fade-in'
import {
  StaggerChildren,
  StaggerItem,
} from '@/components/motion/stagger-children'

const steps = [
  {
    number: '01',
    icon: Upload,
    title: 'Upload a commercial lease PDF',
    description:
      'Drag and drop a commercial lease PDF. We handle single-tenant, multi-tenant, NNN, gross, modified gross, full service gross, ground, and percentage leases up to 200 pages.',
  },
  {
    number: '02',
    icon: Cpu,
    title: 'Extract 126 structured fields',
    description:
      'The pipeline reads every page and finds the clauses. It scores confidence on each field and flags lease risks.',
  },
  {
    number: '03',
    icon: CheckCircle,
    title: 'Review results and export your report',
    description:
      'Check extracted data against the original PDF side by side. Edit any field, then export to Excel, Word, or PDF.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-12 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            From lease PDF to usable data
          </h2>
          <p className="mt-4 text-base sm:text-lg lg:text-xl text-muted-foreground">
            Three steps. No training needed. Upload a lease and get structured
            data back in minutes.
          </p>
        </FadeIn>

        <StaggerChildren className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {steps.map((step) => (
            <StaggerItem key={step.number}>
              <div className="relative rounded-xl border bg-card p-8 text-center">
                <div className="mb-4 inline-flex size-12 items-center justify-center rounded-lg bg-primary/10">
                  <step.icon className="size-6 text-primary" aria-hidden="true" />
                </div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Step {step.number}
                </p>
                <h3 className="text-xl font-semibold sm:text-2xl">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  )
}
