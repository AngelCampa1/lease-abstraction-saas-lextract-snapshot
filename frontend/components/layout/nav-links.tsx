'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavLink {
  href: string
  label: string
  icon: React.ReactNode
}

const navLinks: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="size-4" /> },
  { href: '/upload', label: 'Upload', icon: <Upload className="size-4" /> },
]

interface NavLinksProps {
  className?: string
  onLinkClick?: () => void
  orientation?: 'horizontal' | 'vertical'
}

export function NavLinks({
  className,
  onLinkClick,
  orientation = 'horizontal',
}: NavLinksProps) {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        'flex gap-1',
        orientation === 'vertical' ? 'flex-col' : 'flex-row items-center',
        className
      )}
      aria-label="Main navigation"
    >
      {navLinks.map((link) => {
        const isActive = pathname.startsWith(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onLinkClick}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            {link.icon}
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
