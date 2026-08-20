'use client'

import Link from 'next/link'
import Image from 'next/image'
import { NavLinks } from '@/components/layout/nav-links'
import { UserMenu } from '@/components/layout/user-menu'
import { CreditBadge } from '@/components/layout/credit-badge'
import { MobileNav } from '@/components/layout/mobile-nav'
import { useCredits } from '@/hooks/use-credits'
import { BRAND_ASSETS } from '@/lib/brand'

export function Header() {
  const { data, isLoading } = useCredits()

  return (
    <header
      className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      data-testid="app-header"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Logo + Desktop Nav */}
        <div className="flex items-center gap-6">
          <MobileNav />
          <Link
            href="/dashboard"
            className="flex items-center gap-2"
            aria-label="Lextract home"
            data-testid="header-logo"
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
          <div className="hidden md:block">
            <NavLinks />
          </div>
        </div>

        {/* Right: Credit badge + User menu */}
        <div className="flex items-center gap-3">
          <CreditBadge balance={data?.balance} loading={isLoading} />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
