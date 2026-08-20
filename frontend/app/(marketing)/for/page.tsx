import type { Metadata } from 'next'
import Link from 'next/link'
import { PERSONAS } from '@/data/personas'
import { SITE_URL } from '@/lib/site-config'
import { JsonLd } from '@/components/seo/json-ld'
import { buildBreadcrumbSchema, buildFAQPageSchema } from '@/lib/schema'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { ResourceHubDirectory } from '@/components/content/resource-hub-directory'
import { ContentCta } from '@/components/content/content-cta'
import { BrowseVerticals } from '@/components/content/browse-verticals'
import { FaqSection } from '@/components/marketing/faq-section'
import { Users } from 'lucide-react'

const FAQ_ITEMS = [
  {
    question: 'Who uses Lextract for lease abstraction?',
    answer:
      'Many CRE roles use Lextract. That includes tenant reps, property managers, asset managers, CRE attorneys, lease administrators, and acquisition analysts. Paralegals, REIT portfolio teams, and individual tenants use it too. It costs $15 per lease with no subscription. That works for one lease or a whole portfolio.',
  },
  {
    question: 'Is Lextract suitable for individual attorneys or only large firms?',
    answer:
      'Lextract works for both. Solo attorneys use it to abstract leases for a deal. They skip hiring a separate firm. Large firms use it for big batches. They buy 10-packs at $12 per lease and run many at once. There is no minimum and no subscription.',
  },
  {
    question: 'How does Lextract help property managers?',
    answer:
      'Property managers use Lextract to keep clean lease records. It flags option deadlines and lease end dates. It checks CAM reconciliation inputs. It helps onboard new properties fast. You get 126 fields per lease in 5 to 15 minutes. That removes the manual data entry that slows down reporting.',
  },
  {
    question: 'Can tenants use Lextract to understand their lease?',
    answer:
      'Yes. Tenants use Lextract before they sign or renew. That includes business owners, retail operators, and office users. You get a clear breakdown of what the lease asks of you. It shows key dates, rent increases, CAM costs, and 20 red flags. That makes it easy to spot terms worth negotiating or sending to an attorney.',
  },
]

export const metadata: Metadata = {
  title: 'Lease Abstraction for CRE Professionals',
  description:
    'Lextract is built for tenant reps, property managers, asset managers, CRE attorneys, lease administrators, and acquisition analysts. See how each role uses AI lease abstraction.',
  alternates: {
    canonical: `${SITE_URL}/for`,
  },
}

export default function ForIndexPage() {
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Who It\'s For', url: `${SITE_URL}/for` },
  ]

  return (
    <>
      <JsonLd schema={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd schema={buildFAQPageSchema(FAQ_ITEMS)} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: "Who It's For" },
          ]}
        />

        <header className="mb-12 mt-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-sm font-medium text-primary">
            <Users className="size-3.5" aria-hidden="true" />
            {PERSONAS.length} Professional Roles
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Who Uses Lextract
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg lg:text-xl">
            From tenant representatives to acquisition analysts, Lextract fits
            the way CRE professionals work with commercial leases. See how your
            role uses AI-powered lease abstraction.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {PERSONAS.map((p) => (
            <Link
              key={p.slug}
              href={`/for/${p.slug}`}
              className="group rounded-xl border bg-card p-5 shadow-sm transition-all hover:border-primary/30 hover:bg-muted/50 hover:shadow-md sm:p-6"
            >
              <p className="text-lg font-semibold group-hover:text-primary transition-colors">
                {p.role}
              </p>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                {p.heroSubhead}
              </p>
            </Link>
          ))}
        </div>
        <ResourceHubDirectory hubHref="/for" />


        <BrowseVerticals current="for" />

        <FaqSection items={FAQ_ITEMS} />

        <ContentCta
          heading="Built for how you work"
          description="Upload a commercial lease PDF and get 126 structured fields extracted in minutes. No subscription required. Just $15 per lease."
          buttonText="Upload Your Lease"
          href="/upload"
        />
      </div>
    </>
  )
}
