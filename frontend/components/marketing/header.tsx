'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { getResourceMenuSections } from '@/lib/resource-menu'
import { BRAND_ASSETS } from '@/lib/brand'
import { PERSONAS } from '@/data/personas'

const simpleNavLinks = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Compare', href: '/resources/comparisons' },
]

const resourceColumns = getResourceMenuSections()

const personaLinks = PERSONAS.map((p) => ({
  label: p.role,
  href: `/for/${p.slug}`,
}))

export function MarketingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const [mobileResourcesOpen, setMobileResourcesOpen] = useState(false)
  const [personasOpen, setPersonasOpen] = useState(false)
  const [mobilePersonasOpen, setMobilePersonasOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const personasDropdownRef = useRef<HTMLDivElement>(null)
  const personasTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (personasTimeoutRef.current) clearTimeout(personasTimeoutRef.current)
    }
  }, [])

  // Lock body scroll when mobile nav is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  // Close dropdown on Escape key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && resourcesOpen) {
      setResourcesOpen(false)
    }
  }, [resourcesOpen])

  function handleMouseEnter() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setResourcesOpen(true)
  }

  function handleMouseLeave() {
    timeoutRef.current = setTimeout(() => setResourcesOpen(false), 150)
  }

  // Keep dropdown open while focus is inside it
  function handleFocusCapture() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setResourcesOpen(true)
  }

  function handleBlurCapture(e: React.FocusEvent) {
    if (dropdownRef.current && !dropdownRef.current.contains(e.relatedTarget as Node)) {
      setResourcesOpen(false)
    }
  }

  // Close personas dropdown on Escape key
  const handlePersonasKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && personasOpen) {
      setPersonasOpen(false)
    }
  }, [personasOpen])

  function handlePersonasMouseEnter() {
    if (personasTimeoutRef.current) clearTimeout(personasTimeoutRef.current)
    setPersonasOpen(true)
  }

  function handlePersonasMouseLeave() {
    personasTimeoutRef.current = setTimeout(() => setPersonasOpen(false), 150)
  }

  function handlePersonasFocusCapture() {
    if (personasTimeoutRef.current) clearTimeout(personasTimeoutRef.current)
    setPersonasOpen(true)
  }

  function handlePersonasBlurCapture(e: React.FocusEvent) {
    if (
      personasDropdownRef.current &&
      !personasDropdownRef.current.contains(e.relatedTarget as Node)
    ) {
      setPersonasOpen(false)
    }
  }

  return (
    <header
      className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      role="banner"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex min-h-[44px] items-center"
          aria-label="Lextract home"
          data-testid="marketing-logo"
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

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex" aria-label="Main navigation">
          {simpleNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}

          {/* Who It's For dropdown */}
          <div
            ref={personasDropdownRef}
            className="relative"
            onMouseEnter={handlePersonasMouseEnter}
            onMouseLeave={handlePersonasMouseLeave}
            onKeyDown={handlePersonasKeyDown}
            onFocusCapture={handlePersonasFocusCapture}
            onBlurCapture={handlePersonasBlurCapture}
          >
            <button
              type="button"
              className="flex min-h-[36px] items-center gap-1 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
              onClick={() => {
                if (personasTimeoutRef.current) clearTimeout(personasTimeoutRef.current)
                setPersonasOpen((prev) => !prev)
              }}
              aria-expanded={personasOpen}
              aria-haspopup="true"
            >
              Who It&apos;s For
              <ChevronDown className={`size-3.5 transition-transform ${personasOpen ? 'rotate-180' : ''}`} />
            </button>

            {personasOpen && (
              <div className="absolute right-0 top-full mt-2 w-[340px] max-w-[calc(100vw-2rem)] rounded-xl border bg-background p-4 shadow-lg" role="menu">
                <ul className="grid grid-cols-2 gap-1">
                  {personaLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="block rounded-lg px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-accent hover:text-primary"
                        onClick={() => setPersonasOpen(false)}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 border-t pt-3">
                  <Link
                    href="/for"
                    className="inline-flex min-h-[36px] items-center rounded-full px-3 text-sm font-medium text-primary transition-colors hover:bg-accent hover:text-primary/80"
                    onClick={() => setPersonasOpen(false)}
                  >
                    See all roles &rarr;
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Resources dropdown */}
          <div
            ref={dropdownRef}
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onKeyDown={handleKeyDown}
            onFocusCapture={handleFocusCapture}
            onBlurCapture={handleBlurCapture}
          >
            <button
              type="button"
              className="flex min-h-[36px] items-center gap-1 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
              onClick={() => {
                if (timeoutRef.current) clearTimeout(timeoutRef.current)
                setResourcesOpen((prev) => !prev)
              }}
              aria-expanded={resourcesOpen}
              aria-haspopup="true"
            >
              Resources
              <ChevronDown className={`size-3.5 transition-transform ${resourcesOpen ? 'rotate-180' : ''}`} />
            </button>

            {resourcesOpen && (
              <div className="absolute right-0 top-full mt-2 w-[560px] max-w-[calc(100vw-2rem)] rounded-xl border bg-background p-6 shadow-lg" role="menu">
                <div className="grid grid-cols-4 gap-6">
                  {resourceColumns.map((col) => (
                    <div key={col.heading}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {col.heading}
                      </p>
                      <ul className="space-y-1.5">
                        {col.links.map((link) => (
                          <li key={link.href}>
                            <Link
                              href={link.href}
                              className="block text-sm text-foreground/80 transition-colors hover:text-primary"
                              onClick={() => setResourcesOpen(false)}
                            >
                              {link.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-t pt-3">
                  <Link
                    href="/resources"
                    className="inline-flex min-h-[36px] items-center rounded-full px-3 text-sm font-medium text-primary transition-colors hover:bg-accent hover:text-primary/80"
                    onClick={() => setResourcesOpen(false)}
                  >
                    View all resources &rarr;
                  </Link>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          <ThemeToggle className="hidden sm:flex" />
          {/* Log In: hidden on mobile (moved into drawer), visible from sm */}
          <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
            <Link href="/login">Log In</Link>
          </Button>
          {/* Get a free preview: hidden on xs, visible from sm */}
          <Button size="sm" asChild className="hidden sm:flex">
            <Link href="/upload">Get a free preview</Link>
          </Button>
          {/* Mobile hamburger, 44x44 tap target */}
          <button
            type="button"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2.5 text-muted-foreground transition-colors hover:text-foreground md:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav drawer backdrop */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation backdrop"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-20 bg-background/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
          className="border-t bg-background px-4 pb-6 pt-4 md:hidden max-h-[calc(100vh-4rem)] overflow-y-auto"
        >
          <ul className="space-y-1">
            {simpleNavLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex min-h-[44px] items-center rounded-full px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}

            {/* Mobile Who It's For accordion */}
            <li>
              <button
                type="button"
                className="flex min-h-[44px] w-full items-center justify-between rounded-full px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
                onClick={() => setMobilePersonasOpen((prev) => !prev)}
                aria-expanded={mobilePersonasOpen}
              >
                Who It&apos;s For
                <ChevronDown className={`size-4 transition-transform ${mobilePersonasOpen ? 'rotate-180' : ''}`} />
              </button>
              {mobilePersonasOpen && (
                <div className="ml-3 mt-1 space-y-0.5 border-l pl-3">
                  {personaLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex min-h-[44px] items-center rounded-full px-2 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
                      onClick={() => {
                        setMobileOpen(false)
                        setMobilePersonasOpen(false)
                      }}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <Link
                    href="/for"
                    className="flex min-h-[44px] items-center rounded-full px-2 py-3 text-sm font-medium text-primary transition-colors hover:bg-accent"
                    onClick={() => {
                      setMobileOpen(false)
                      setMobilePersonasOpen(false)
                    }}
                  >
                    See all roles &rarr;
                  </Link>
                </div>
              )}
            </li>

            {/* Mobile resources accordion */}
            <li>
              <button
                type="button"
                className="flex min-h-[44px] w-full items-center justify-between rounded-full px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
                onClick={() => setMobileResourcesOpen((prev) => !prev)}
                aria-expanded={mobileResourcesOpen}
              >
                Resources
                <ChevronDown className={`size-4 transition-transform ${mobileResourcesOpen ? 'rotate-180' : ''}`} />
              </button>
              {mobileResourcesOpen && (
                <div className="ml-3 mt-1 space-y-3 border-l pl-3">
                  {resourceColumns.map((col) => (
                    <div key={col.heading}>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {col.heading}
                      </p>
                      <ul className="space-y-0.5">
                        {col.links.map((link) => (
                          <li key={link.href}>
                            <Link
                              href={link.href}
                              className="flex min-h-[44px] items-center rounded-full px-2 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
                              onClick={() => {
                                setMobileOpen(false)
                                setMobileResourcesOpen(false)
                              }}
                            >
                              {link.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <Link
                    href="/resources"
                    className="flex min-h-[44px] items-center rounded-full px-2 py-3 text-sm font-medium text-primary transition-colors hover:bg-accent"
                    onClick={() => {
                      setMobileOpen(false)
                      setMobileResourcesOpen(false)
                    }}
                  >
                    View all resources &rarr;
                  </Link>
                </div>
              )}
            </li>
          </ul>
          <div className="safe-bottom mt-4 flex flex-col gap-2 border-t pt-4">
            <div className="flex items-center justify-between px-3 py-1">
              <span className="text-sm text-muted-foreground">Theme</span>
              <ThemeToggle />
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                Log In
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/upload" onClick={() => setMobileOpen(false)}>
                Get a free preview
              </Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
