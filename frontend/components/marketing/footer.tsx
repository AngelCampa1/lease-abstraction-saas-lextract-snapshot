import Link from 'next/link'
import Image from 'next/image'
import { Mail } from 'lucide-react'
import { getResourceMenuSections } from '@/lib/resource-menu'
import { BRAND_ASSETS } from '@/lib/brand'
import { getContactEmail, getProductFacts } from '@/lib/public-facts'

const productLinks = [
  { label: 'Upload a Lease', href: '/upload' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Sample Report', href: '/sample-report' },
  { label: 'Features', href: '/features' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Lease Abstraction Software', href: '/lease-abstraction-software' },
  { label: 'Lease Extraction Software', href: '/lease-extraction-software' },
  { label: 'AI Lease Abstraction', href: '/ai-lease-abstraction' },
  { label: 'Automated Lease Abstraction', href: '/automated-lease-abstraction' },
  { label: 'Lease Abstraction Services', href: '/lease-abstraction-services' },
]

const resourceSections = getResourceMenuSections()
const resourceLinks = [
  { label: 'All Resources', href: '/resources' },
  ...resourceSections
    .filter((section) => section.heading === 'Learn' || section.heading === 'Reference')
    .flatMap((section) => section.links),
]

const exploreLinks = [
  { label: 'Tools', href: '/tools' },
  ...resourceSections
    .filter((section) => section.heading === 'Segments' || section.heading === 'Tools')
    .flatMap((section) => section.links),
]

const companyLinks = [
  { label: 'About', href: '/about' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
]

const relatedLinks = [
  { label: 'CamAudit CAM Audit', href: 'https://www.camaudit.io' },
  { label: 'CapVeri CRE FinOps', href: 'https://www.capveri.com' },
]

export function MarketingFooter() {
  const productFacts = getProductFacts()
  const supportEmail = getContactEmail('support')

  return (
    <footer className="border-t bg-accent/50 pb-20 sm:pb-0" role="contentinfo">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-6">
          {/* Brand */}
          <div>
            <Link
              href="/"
              className="flex min-h-[44px] items-center"
              aria-label="Lextract home"
            >
              <Image
                src={BRAND_ASSETS.logoPng}
                alt="Lextract"
                width={142}
                height={38}
                className="h-9 w-auto rounded bg-white p-1"
              />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              AI-powered commercial lease abstraction. Upload a lease PDF and
              get {productFacts.fieldCount} structured fields extracted in minutes.
            </p>
            <a
              href={`mailto:${supportEmail}`}
              className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 py-2.5 text-sm text-primary transition-colors hover:text-primary/80"
              data-testid="support-email"
            >
              <Mail className="size-3.5" />
              {supportEmail}
            </a>
          </div>

          {/* Product */}
          <div>
            <p className="font-semibold text-brand-dark">Product</p>
            <ul className="mt-4 space-y-2">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex min-h-[44px] items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <p className="font-semibold text-brand-dark">Resources</p>
            <ul className="mt-4 space-y-2">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex min-h-[44px] items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Explore */}
          <div>
            <p className="font-semibold text-brand-dark">Explore</p>
            <ul className="mt-4 space-y-2">
              {exploreLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex min-h-[44px] items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="font-semibold text-brand-dark">Company</p>
            <ul className="mt-4 space-y-2">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex min-h-[44px] items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Related Tools */}
          <div>
            <p className="font-semibold text-brand-dark">Related Tools</p>
            <ul className="mt-4 space-y-2">
              {relatedLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-[44px] items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t pt-8">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Lextract does not provide legal, tax, or accounting advice. All
            extracted data is informational only. Users must verify extracted
            fields against original lease documents. No guarantee of extraction
            accuracy; confidence scores indicate reliability.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Lextract. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
