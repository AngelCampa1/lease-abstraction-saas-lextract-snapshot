import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle2 } from 'lucide-react'
import { BRAND_ASSETS } from '@/lib/brand'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

const VALUE_PROPS = [
  '126 fields extracted from every lease',
  'Confidence scores on every value',
  '20 automated red-flag checks',
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/50 p-4 pb-20 sm:pb-4">
      <div className="flex w-full max-w-5xl flex-col items-center lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-14">
        {/* Left column (lg+): brand + value props */}
        <div className="hidden lg:flex lg:flex-col lg:gap-8" data-testid="auth-value-panel">
          <Link
            href="/"
            className="inline-flex items-center"
            aria-label="Go to Lextract homepage"
          >
            <Image
              src={BRAND_ASSETS.logoPng}
              alt="Lextract"
              width={158}
              height={42}
              priority
              className="h-10 w-auto rounded bg-white p-1"
            />
          </Link>
          <div>
            <h2 className="font-display text-3xl font-bold leading-tight text-brand-dark">
              AI lease abstraction for commercial real estate.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Pay per lease. No subscriptions. Credits never expire.
            </p>
          </div>
          <ul className="space-y-3">
            {VALUE_PROPS.map((prop) => (
              <li key={prop} className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span>{prop}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right column: brand mark on mobile, then card */}
        <div className="flex w-full flex-col items-center lg:items-stretch">
          <Link
            href="/"
            className="mb-8 inline-flex min-h-[44px] items-center lg:hidden"
            aria-label="Go to Lextract homepage"
          >
            <Image
              src={BRAND_ASSETS.logoPng}
              alt="Lextract"
              width={142}
              height={38}
              priority
              className="h-9 w-auto rounded bg-white p-1"
            />
          </Link>
          {children}
        </div>
      </div>
    </main>
  )
}
