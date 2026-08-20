import type { Metadata } from 'next'
import Link from 'next/link'
import { FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MarketingHeader } from '@/components/marketing/header'
import { MarketingFooter } from '@/components/marketing/footer'

export const metadata: Metadata = {
  title: 'Page Not Found',
  robots: {
    index: false,
    follow: false,
  },
}

const POPULAR_LINKS = [
  { label: 'Upload a Lease', href: '/upload' },
  { label: 'Sample Report', href: '/sample-report' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Glossary', href: '/glossary' },
  { label: 'Red Flags', href: '/red-flags' },
  { label: 'About', href: '/about' },
]

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-muted">
          <FileQuestion className="size-10 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
          <p className="mt-3 max-w-sm text-muted-foreground">
            The page you are looking for does not exist or has been moved. Here are some helpful links:
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {POPULAR_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex min-h-[44px] items-center rounded-full border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <Button asChild variant="outline">
          <Link href="/">← Back to Home</Link>
        </Button>
      </main>
      <MarketingFooter />
    </div>
  )
}
