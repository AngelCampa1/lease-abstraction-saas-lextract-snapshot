import type { Metadata } from 'next'
import Link from 'next/link'
import { INDEXABLE_RED_FLAGS as RED_FLAGS } from '@/data/red-flags'
import { SITE_URL } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/json-ld'
import { buildBreadcrumbSchema, buildFAQPageSchema } from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { ResourceHubDirectory } from '@/components/content/resource-hub-directory'
import { ContentCta } from '@/components/content/content-cta'
import { BrowseVerticals } from '@/components/content/browse-verticals'
import { FaqSection } from '@/components/marketing/faq-section'
import { ShieldAlert } from 'lucide-react'

export const metadata: Metadata = {
  title: '20 Commercial Lease Red Flags Lextract Detects',
  description:
    'Lextract checks every lease for 20 red flag rules, from missing CAM caps to high management fees. Learn what each flag means.',
  alternates: {
    canonical: `${SITE_URL}/red-flags`,
  },
}

const FAQ_ITEMS = [
  {
    question: 'What are lease red flags?',
    answer:
      'Lease red flags are clauses or missing protections that can create financial or legal risk for tenants. Examples include uncapped CAM charges and personal guarantees that extend beyond the lease end date. Finding them early gives tenants more room to negotiate.',
  },
  {
    question: 'How many red flag checks does Lextract perform?',
    answer:
      'Lextract runs 20 red flag rules on every lease extraction. The rules use three severity levels: high, medium, and low. They cover common risk factors such as missing CAM caps and high management fees. All 20 rules are included in the $15 per lease price.',
  },
  {
    question: 'What happens when Lextract detects a red flag?',
    answer:
      'Each red flag appears in your results with the field value that triggered it, a short risk description, and a severity level (High, Medium, or Low). Red flags are also included in the JSON and Excel exports. You can add them to your review workflow or share them with counsel.',
  },
  {
    question: 'What are the most common red flags in commercial leases?',
    answer:
      'Common red flags include uncapped CAM charges with no annual increase limit, high management fees, personal guarantees with no burn-down schedule, and renewal options that reset rent above market. These issues can add real cost over a lease term, so they are worth catching early.',
  },
  {
    question: 'Can I customize which red flags Lextract checks for?',
    answer:
      'The 20 red flag rules are the same for every extraction. Custom rule setup is not available in the current version. If you have specific compliance or portfolio risk criteria, contact us to discuss enterprise options.',
  },
]

const SEVERITY_STYLES = {
  high: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-900',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-900',
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-900',
} as const

export default function RedFlagsIndexPage() {
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Red Flags', url: `${SITE_URL}/red-flags` },
  ]

  const highFlags = RED_FLAGS.filter((f) => f.severity === 'high')
  const mediumFlags = RED_FLAGS.filter((f) => f.severity === 'medium')
  const lowFlags = RED_FLAGS.filter((f) => f.severity === 'low')

  return (
    <>
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(FAQ_ITEMS)} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Red Flags' },
          ]}
        />

        <header className="mb-12 mt-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-sm font-medium text-primary">
            <ShieldAlert className="size-3.5" aria-hidden="true" />
            20 Risk Indicators
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            20 Red Flags in Commercial Leases
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg lg:text-xl">
            Lextract checks your lease against 20 red flag rules. Each rule
            runs against the extracted field values. Every flag comes with a
            severity level so you know what to review first.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              {highFlags.length} high severity
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              {mediumFlags.length} medium severity
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              {lowFlags.length} low severity
            </span>
          </div>
        </header>

        {[
          { label: 'High Severity', flags: highFlags },
          { label: 'Medium Severity', flags: mediumFlags },
          { label: 'Low Severity', flags: lowFlags },
        ].map(({ label, flags }) => (
          <section key={label} className="mb-12">
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl">{label}</h2>
            <div className="space-y-3">
              {flags.map((flag) => (
                <Link
                  key={flag.ruleId}
                  href={`/red-flags/${flag.slug}`}
                  className="group flex items-start gap-4 rounded-xl border bg-card p-5 shadow-sm transition-colors hover:border-primary/30 hover:bg-muted/50 hover:shadow-md"
                >
                  <div className="flex shrink-0 flex-col items-center gap-1">
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold uppercase ${SEVERITY_STYLES[flag.severity]}`}>
                      {flag.severity}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {flag.ruleId}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium group-hover:text-primary transition-colors">
                      {flag.name}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {flag.summary}
                    </p>
                    {flag.isCamRelated && (
                      <span className="mt-2 inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        CAM related, CamAudit eligible
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
        <ResourceHubDirectory hubHref="/red-flags" />


        <BrowseVerticals current="red-flags" />

        <FaqSection items={FAQ_ITEMS} />

        <ContentCta
          heading="Check your lease for red flags"
          description="Upload your commercial lease PDF. Lextract checks all 20 red flag rules in minutes. Just $15 per lease."
          buttonText="Upload Your Lease"
          href="/upload"
        />
      </div>
    </>
  )
}
