import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock('next/image', () => ({
  default: ({ alt, ...rest }: { alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element -- test stub for next/image
    <img alt={alt} {...rest} />
  ),
}))

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}))

import { MarketingHeader } from '@/components/marketing/header'
import { PERSONAS } from '@/data/personas'

describe('MarketingHeader "Who It\'s For" submenu', () => {
  it('renders a "Who It\'s For" trigger button', () => {
    render(<MarketingHeader />)
    expect(
      screen.getByRole('button', { name: /who it's for/i })
    ).toBeInTheDocument()
  })

  it('hides the persona menu until the trigger is opened', () => {
    render(<MarketingHeader />)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('exposes a link for every persona when opened', () => {
    render(<MarketingHeader />)
    fireEvent.click(screen.getByRole('button', { name: /who it's for/i }))
    const menu = screen.getByRole('menu')
    for (const persona of PERSONAS) {
      const link = within(menu).getByRole('link', { name: persona.role })
      expect(link).toHaveAttribute('href', `/for/${persona.slug}`)
    }
  })

  it('includes a "See all roles" link to the /for hub', () => {
    render(<MarketingHeader />)
    fireEvent.click(screen.getByRole('button', { name: /who it's for/i }))
    const menu = screen.getByRole('menu')
    const seeAll = within(menu).getByRole('link', { name: /see all roles/i })
    expect(seeAll).toHaveAttribute('href', '/for')
  })

  it('uses a pill-shaped trigger per the design canon', () => {
    render(<MarketingHeader />)
    const trigger = screen.getByRole('button', { name: /who it's for/i })
    expect(trigger.className).toContain('rounded-full')
  })
})
