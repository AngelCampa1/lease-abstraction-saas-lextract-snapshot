import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { SITE_URL, DEFAULT_OG_IMAGE } from '@/lib/site-config'
import { buildPersonSchema, buildBreadcrumbSchema, buildFAQPageSchema } from '@/lib/schema'
import { JsonLd } from '@/components/seo/json-ld'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { getAllContentItems } from '@/lib/content-matching'
import { FaqSection } from '@/components/marketing/faq-section'

const FAQ_ITEMS = [
  {
    question: 'Who is Angel Campa?',
    answer:
      'Angel Campa is the founder of Lextract, an AI-powered commercial lease abstraction platform. He is a commercial real estate technology specialist who designed Lextract to solve the specific pain points CRE professionals face when abstracting leases at scale.',
  },
  {
    question: 'What is Angel\'s background in commercial real estate?',
    answer:
      'Angel previously built CamAudit, a CAM reconciliation tool used by property managers and tenants to audit operating expense charges. That work gave him deep familiarity with lease structures, CAM clauses, and the data quality problems that arise when lease terms are abstracted manually.',
  },
  {
    question: 'Why did Angel build Lextract?',
    answer:
      'Manual lease abstraction costs $65–$250 per lease and takes 4–8 hours, yet produces inconsistent output. Angel built Lextract to deliver 126 standardized fields with confidence scoring in 5–15 minutes at $15 per lease - making professional-grade lease abstraction accessible to any CRE team, regardless of size.',
  },
  {
    question: 'How can I contact Angel?',
    answer:
      'You can reach Angel through Lextract support at angel.campa@lextract.io, or connect on LinkedIn via the profile link on this page. For partnership or enterprise inquiries, email angel.campa@lextract.io with the subject line "Partnership" and Angel will respond directly.',
  },
]

// Replace this path with a real headshot (96×96px or larger, square crop) when available.
// The SVG avatar at /images/angel-campa-avatar.svg is used until then.
const AUTHOR_IMAGE_PATH = '/images/angel-campa-avatar.svg'

const AUTHOR_URL = `${SITE_URL}/about/angel-campa`
const LINKEDIN_URL = 'https://www.linkedin.com/in/angelcampa1/'

export const metadata: Metadata = {
  title: 'Angel Campa - Founder, Lextract',
  description:
    'Angel Campa is the founder of Lextract, an AI-powered commercial lease abstraction platform that extracts 126 structured fields from lease PDFs.',
  alternates: { canonical: AUTHOR_URL },
  openGraph: {
    title: 'Angel Campa - Founder, Lextract',
    description:
      'Angel Campa is the founder of Lextract, an AI-powered commercial lease abstraction platform that extracts 126 structured fields from lease PDFs.',
    url: AUTHOR_URL,
    type: 'profile',
    images: [DEFAULT_OG_IMAGE],
  },
}

export default async function AngelCampaPage() {
  const allContent = await getAllContentItems()
  const authoredContent = allContent.filter((item) =>
    item.author.toLowerCase().includes('angel campa')
  )

  const personSchema = buildPersonSchema({
    name: 'Angel Campa',
    jobTitle: 'Founder',
    profileUrl: AUTHOR_URL,
    imageUrl: `${SITE_URL}${AUTHOR_IMAGE_PATH}`,
    linkedInUrl: LINKEDIN_URL,
  })

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'About', url: `${SITE_URL}/about` },
    { name: 'Angel Campa', url: AUTHOR_URL },
  ])

  return (
    <div className="mx-auto max-w-prose px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
      <JsonLd schema={personSchema} />
      <JsonLd schema={breadcrumbSchema} />
      <JsonLd schema={buildFAQPageSchema(FAQ_ITEMS)} />

      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'About', href: '/about' },
          { label: 'Angel Campa' },
        ]}
      />

      <div className="mt-8">
        <div className="flex items-center gap-6 mb-6">
          <Image
            src={AUTHOR_IMAGE_PATH}
            alt="Angel Campa, Founder of Lextract"
            width={96}
            height={96}
            className="rounded-full ring-2 ring-border"
            priority
          />
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">Angel Campa</h1>
            <p className="mt-1 text-base text-muted-foreground sm:text-lg">Founder, Lextract</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            LinkedIn Profile
          </a>
        </div>

        <div className="mt-8 space-y-4 text-muted-foreground">
          <p className="text-base leading-relaxed">
            Angel Campa is the founder of Lextract, an AI-powered commercial lease abstraction
            platform built for CRE professionals. Lextract extracts 126 structured fields from any
            commercial lease PDF in 5–15 minutes, with confidence scoring and automatic red flag
            detection.
          </p>
          <p className="text-base leading-relaxed">
            Angel has deep expertise in commercial real estate technology, lease abstraction, and AI
            document processing. He previously built CamAudit, a CAM reconciliation tool for
            property managers and tenants.
          </p>
        </div>
      </div>

      {authoredContent.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">Published Content</h2>
          <ul className="space-y-4">
            {authoredContent.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/resources/${item.category}/${item.slug}`}
                  className="group block rounded-xl border bg-card p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
                >
                  <p className="font-medium group-hover:text-primary transition-colors">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {item.description}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground capitalize">
                    {item.category} &middot; {item.readingTime} min read
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <FaqSection items={FAQ_ITEMS} />
    </div>
  )
}
