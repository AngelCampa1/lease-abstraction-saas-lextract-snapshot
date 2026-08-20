import { Shield, Cloud, LockKeyhole, Infinity, FileText, Building2, Landmark, Factory, Users, User } from 'lucide-react'
import { FadeIn } from '@/components/motion/fade-in'
import {
  StaggerChildren,
  StaggerItem,
} from '@/components/motion/stagger-children'

const securitySignals = [
  { icon: Shield, label: 'AES-256 encryption at rest' },
  { icon: Cloud, label: 'AI-powered extraction' },
  { icon: LockKeyhole, label: 'We do not sell your data' },
  { icon: Infinity, label: 'Credits never expire' },
]

const leaseTypes = [
  {
    icon: FileText,
    name: 'NNN (Triple Net)',
    description: 'Tenant pays base rent plus all operating expenses, insurance, and taxes.',
  },
  {
    icon: Building2,
    name: 'Gross Lease',
    description: 'Landlord covers most or all operating costs within the rent.',
  },
  {
    icon: Landmark,
    name: 'Modified Gross',
    description: 'Shared expenses between landlord and tenant with base year stops.',
  },
  {
    icon: Factory,
    name: 'Ground Lease',
    description: 'Long-term land lease where tenant owns improvements on the property.',
  },
  {
    icon: Users,
    name: 'Multi-Tenant',
    description: 'Shared building with pro rata expense allocations and CAM charges.',
  },
  {
    icon: User,
    name: 'Single-Tenant',
    description: 'Sole occupant lease with full building responsibility terms.',
  },
]

export function TrustSignals() {
  return (
    <section className="border-y bg-muted/30 py-12 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Security bar */}
        <FadeIn>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {securitySignals.map((signal) => (
              <div
                key={signal.label}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <signal.icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{signal.label}</span>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* Lease type grid */}
        <FadeIn className="mx-auto mt-12 max-w-2xl text-center" delay={0.1}>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Built for Every Lease Type
          </h2>
          <p className="mt-3 text-muted-foreground">
            Our extraction pipeline handles many commercial lease structures.
            That ranges from single-tenant agreements to multi-tenant NNN leases.
          </p>
        </FadeIn>

        <StaggerChildren className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {leaseTypes.map((type) => (
            <StaggerItem key={type.name}>
              <div className="rounded-xl border bg-card p-5">
                <div className="mb-3 inline-flex size-9 items-center justify-center rounded-lg bg-primary/10">
                  <type.icon className="size-5 text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-semibold">{type.name}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {type.description}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  )
}
