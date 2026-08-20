import { AlertTriangle, Shield } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { FadeIn } from '@/components/motion/fade-in'
import {
  StaggerChildren,
  StaggerItem,
} from '@/components/motion/stagger-children'
import { SEVERITY_COLORS, STATUS_COLORS } from '@/lib/design-tokens'

interface RedFlag {
  title: string
  description: string
  severity: 'High' | 'Medium' | 'Low'
  clause: string
}

const exampleFlags: RedFlag[] = [
  {
    title: 'Uncapped CAM Escalation',
    description:
      'No annual or cumulative cap on common area maintenance charges. Landlord can pass through unlimited cost increases year over year.',
    severity: 'High',
    clause: 'Section 7.2 - Operating Expenses',
  },
  {
    title: 'Missing Audit Rights',
    description:
      'Lease does not grant tenant the right to audit landlord operating expense reconciliations. No access to supporting documentation.',
    severity: 'High',
    clause: 'Section 7.4 - Reconciliation',
  },
  {
    title: 'Capital Expenditure Pass-Through',
    description:
      'Landlord may amortize capital improvements over useful life and pass costs to tenants as operating expenses without tenant consent.',
    severity: 'Low',
    clause: 'Section 7.3 - Capital Expenditures',
  },
  {
    title: 'Short Dispute Window',
    description:
      'Tenant has only 30 days from reconciliation statement to raise objections. Many leases give tenants longer audit windows, so this clause should be reviewed before the deadline passes.',
    severity: 'Medium',
    clause: 'Section 7.5 - Dispute Resolution',
  },
]

function severityColor(level: RedFlag['severity']): string {
  const key = level.toLowerCase() as 'high' | 'medium' | 'low'
  return SEVERITY_COLORS[key].badge
}

export function RedFlagsShowcase() {
  return (
    <section className="py-12 sm:py-20" data-testid="red-flags-section">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn className="max-w-2xl">
          <div className={`mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${SEVERITY_COLORS.high.badge}`}>
            <Shield className="size-4" aria-hidden="true" />
            Built-in Protection
          </div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            Catch Risky Lease Terms
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Every extraction checks your lease against 20 red flag rules. We
            flag risky clauses so you can review, negotiate, or plan ahead. The
            examples below show the kind of issues these rules look for.
          </p>
        </FadeIn>

        <StaggerChildren className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {exampleFlags.map((flag) => (
            <StaggerItem key={flag.title}>
              <div
                className="rounded-xl border bg-card p-6"
                data-testid="red-flag-item"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    <AlertTriangle className={`size-5 ${STATUS_COLORS.error.icon}`} aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold sm:text-2xl">{flag.title}</h3>
                      <Badge
                        variant="secondary"
                        className={`text-sm ${severityColor(flag.severity)}`}
                      >
                        {flag.severity}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {flag.description}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground/70">
                      Example clause: {flag.clause}
                    </p>
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  )
}
