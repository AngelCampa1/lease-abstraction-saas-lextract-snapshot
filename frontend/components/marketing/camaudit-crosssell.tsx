import { ExternalLink, BarChart3, Briefcase, Building2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FadeIn } from '@/components/motion/fade-in'

const PATHS = [
  {
    Icon: User,
    label: 'Tenant Relationships',
    heading: 'Your firm already advises tenants',
    description:
      'Offer CAM recovery as your own service line. CAMAudit powers the extraction, audit rules, and branded reports.',
    cta: 'Partner Signup',
    badge: 'White-label workflow',
    href: 'https://partner.camaudit.io',
  },
  {
    Icon: Briefcase,
    label: 'Broker / Tenant Rep',
    heading: 'Stay useful after the lease is signed',
    description:
      'Turn CAM-sensitive lease findings into a branded recovery review. You keep the client.',
    cta: 'Start Partner Setup',
    badge: null,
    href: 'https://partner.camaudit.io',
  },
  {
    Icon: Building2,
    label: 'Accounting / Advisory',
    heading: 'Add CAM recovery to client advisory work',
    description:
      'Use CAMAudit to review reconciliations and publish findings as reports under your brand.',
    cta: 'See Partner Program',
    badge: null,
    href: 'https://partner.camaudit.io',
  },
] as const

export function CamauditCrosssell() {
  return (
    <section className="py-12 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl border bg-card">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
            <div className="relative p-8 sm:p-12">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                <BarChart3 className="size-4" />
                Partner Product
              </div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                Found a CAM issue? Route it into a partner-owned recovery workflow.
              </h2>
              <p className="mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg lg:text-xl">
                Lextract extracts the lease terms. CAMAudit gives firms with tenant
                relationships white-label CAM recovery tools. That includes an audit
                queue, deterministic checks, branded reports, and client-ready evidence.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {PATHS.map(({ Icon, label, heading, description, cta, badge, href }) => (
                  <div
                    key={label}
                    className="flex flex-col rounded-xl border bg-background p-6"
                  >
                    <div className="mb-3 inline-flex size-9 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="size-5 text-primary" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {label}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold leading-snug sm:text-2xl">
                      {heading}
                    </h3>
                    <p className="mt-2 flex-1 text-sm text-muted-foreground">
                      {description}
                    </p>
                    <div className="mt-4">
                      <Button variant="outline" size="sm" asChild className="w-full">
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {cta}
                          <ExternalLink className="ml-1.5 size-3.5" />
                        </a>
                      </Button>
                      {badge && (
                        <p className="mt-1.5 text-center text-sm text-primary">
                          {badge}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
