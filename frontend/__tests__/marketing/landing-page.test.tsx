import { render, screen, within, fireEvent } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

// Mock IntersectionObserver which is not available in jsdom
beforeAll(() => {
  class MockIntersectionObserver {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
    constructor(_callback: IntersectionObserverCallback) {}
  }
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
})

// Mock next/link so it renders a plain anchor
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

// Mock next-themes for ThemeToggle
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'system', setTheme: vi.fn() }),
}))

// Controls the return value of useInView mock
let mockInView = true

// Mock motion to render plain divs (no animation in test)
vi.mock('motion/react', () => ({
  motion: {
    div: ({
      children,
      className,
      ...rest
    }: {
      children?: React.ReactNode
      className?: string
      [key: string]: unknown
    }) => {
      // Filter out motion-specific props
      const htmlProps: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(rest)) {
        if (
          !key.startsWith('while') &&
          !key.startsWith('initial') &&
          !key.startsWith('animate') &&
          !key.startsWith('exit') &&
          !key.startsWith('transition') &&
          !key.startsWith('viewport') &&
          key !== 'variants' &&
          key !== 'style'
        ) {
          htmlProps[key] = value
        }
      }
      return (
        <div className={className} {...htmlProps}>
          {children}
        </div>
      )
    },
    a: ({
      children,
      className,
      href,
      ...rest
    }: {
      children?: React.ReactNode
      className?: string
      href?: string
      [key: string]: unknown
    }) => {
      const htmlProps: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(rest)) {
        if (
          !key.startsWith('while') &&
          !key.startsWith('initial') &&
          !key.startsWith('animate') &&
          !key.startsWith('exit') &&
          !key.startsWith('transition') &&
          !key.startsWith('viewport') &&
          key !== 'variants' &&
          key !== 'style'
        ) {
          htmlProps[key] = value
        }
      }
      return (
        <a className={className} href={href} {...htmlProps}>
          {children}
        </a>
      )
    },
  },
  useInView: () => mockInView,
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  FileText: (props: Record<string, unknown>) => (
    <svg data-testid="icon-file-text" {...props} />
  ),
  Upload: (props: Record<string, unknown>) => (
    <svg data-testid="icon-upload" {...props} />
  ),
  Cpu: (props: Record<string, unknown>) => (
    <svg data-testid="icon-cpu" {...props} />
  ),
  CheckCircle: (props: Record<string, unknown>) => (
    <svg data-testid="icon-check-circle" {...props} />
  ),
  Shield: (props: Record<string, unknown>) => (
    <svg data-testid="icon-shield" {...props} />
  ),
  AlertTriangle: (props: Record<string, unknown>) => (
    <svg data-testid="icon-alert-triangle" {...props} />
  ),
  BarChart3: (props: Record<string, unknown>) => (
    <svg data-testid="icon-bar-chart" {...props} />
  ),
  Briefcase: (props: Record<string, unknown>) => (
    <svg data-testid="icon-briefcase" {...props} />
  ),
  Clock: (props: Record<string, unknown>) => (
    <svg data-testid="icon-clock" {...props} />
  ),
  DollarSign: (props: Record<string, unknown>) => (
    <svg data-testid="icon-dollar-sign" {...props} />
  ),
  Zap: (props: Record<string, unknown>) => (
    <svg data-testid="icon-zap" {...props} />
  ),
  ArrowRight: (props: Record<string, unknown>) => (
    <svg data-testid="icon-arrow-right" {...props} />
  ),
  Check: (props: Record<string, unknown>) => (
    <svg data-testid="icon-check" {...props} />
  ),
  X: (props: Record<string, unknown>) => (
    <svg data-testid="icon-x" {...props} />
  ),
  Minus: (props: Record<string, unknown>) => (
    <svg data-testid="icon-minus" {...props} />
  ),
  ExternalLink: (props: Record<string, unknown>) => (
    <svg data-testid="icon-external-link" {...props} />
  ),
  ChevronDown: (props: Record<string, unknown>) => (
    <svg data-testid="icon-chevron-down" {...props} />
  ),
  Target: (props: Record<string, unknown>) => (
    <svg data-testid="icon-target" {...props} />
  ),
  FileSearch: (props: Record<string, unknown>) => (
    <svg data-testid="icon-file-search" {...props} />
  ),
  Download: (props: Record<string, unknown>) => (
    <svg data-testid="icon-download" {...props} />
  ),
  Menu: (props: Record<string, unknown>) => (
    <svg data-testid="icon-menu" {...props} />
  ),
  Mail: (props: Record<string, unknown>) => (
    <svg data-testid="icon-mail" {...props} />
  ),
  Quote: (props: Record<string, unknown>) => (
    <svg data-testid="icon-quote" {...props} />
  ),
  Sun: (props: Record<string, unknown>) => (
    <svg data-testid="icon-sun" {...props} />
  ),
  Moon: (props: Record<string, unknown>) => (
    <svg data-testid="icon-moon" {...props} />
  ),
  Monitor: (props: Record<string, unknown>) => (
    <svg data-testid="icon-monitor" {...props} />
  ),
  Cloud: (props: Record<string, unknown>) => (
    <svg data-testid="icon-cloud" {...props} />
  ),
  LockKeyhole: (props: Record<string, unknown>) => (
    <svg data-testid="icon-lock-keyhole" {...props} />
  ),
  Infinity: (props: Record<string, unknown>) => (
    <svg data-testid="icon-infinity" {...props} />
  ),
  Building2: (props: Record<string, unknown>) => (
    <svg data-testid="icon-building2" {...props} />
  ),
  Landmark: (props: Record<string, unknown>) => (
    <svg data-testid="icon-landmark" {...props} />
  ),
  Factory: (props: Record<string, unknown>) => (
    <svg data-testid="icon-factory" {...props} />
  ),
  Users: (props: Record<string, unknown>) => (
    <svg data-testid="icon-users" {...props} />
  ),
  User: (props: Record<string, unknown>) => (
    <svg data-testid="icon-user" {...props} />
  ),
  ScanLine: (props: Record<string, unknown>) => (
    <svg data-testid="icon-scan-line" {...props} />
  ),
  LayoutGrid: (props: Record<string, unknown>) => (
    <svg data-testid="icon-layout-grid" {...props} />
  ),
  ShieldCheck: (props: Record<string, unknown>) => (
    <svg data-testid="icon-shield-check" {...props} />
  ),
  Gauge: (props: Record<string, unknown>) => (
    <svg data-testid="icon-gauge" {...props} />
  ),
  Sparkles: (props: Record<string, unknown>) => (
    <svg data-testid="icon-sparkles" {...props} />
  ),
  CheckCircle2: (props: Record<string, unknown>) => (
    <svg data-testid="icon-check-circle-2" {...props} />
  ),
}))

import { HeroSection } from '@/components/marketing/hero'
import { HowItWorks } from '@/components/marketing/how-it-works'
import { SampleOutput } from '@/components/marketing/sample-output'
import { RedFlagsShowcase } from '@/components/marketing/red-flags-showcase'
import { PricingCards } from '@/components/marketing/pricing-cards'
import { WhyTrustLextract } from '@/components/marketing/why-trust-lextract'
import { CamauditCrosssell } from '@/components/marketing/camaudit-crosssell'
import { MarketingFooter } from '@/components/marketing/footer'
import { MarketingHeader } from '@/components/marketing/header'
import { FadeIn } from '@/components/motion/fade-in'
import { StaggerChildren } from '@/components/motion/stagger-children'
import { TrustSignals } from '@/components/marketing/trust-signals'
import { FaqSection } from '@/components/marketing/faq-section'

// ─── Hero Section ─────────────────────────────────────────────────

describe('HeroSection', () => {
  it('renders the main headline as an h1', () => {
    render(<HeroSection />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeInTheDocument()
    expect(heading.textContent).toContain('Get 126 lease fields in minutes')
  })

  it('renders the subheadline with the clear problem and pricing promise', () => {
    render(<HeroSection />)
    const subheadline = screen.getByText(/stop re-reading long leases/i)
    expect(subheadline).toHaveTextContent(/free preview/i)
    expect(subheadline).toHaveTextContent(/no subscription/i)
    expect(screen.getByText(/\$15/i)).toBeInTheDocument()
  })

  it('answers what, how, and who on the first screen', () => {
    render(<HeroSection />)
    expect(screen.getByText('What we solve')).toBeInTheDocument()
    expect(screen.getByText(/reading leases by hand is slow/i)).toBeInTheDocument()
    expect(screen.getByText('How we solve it')).toBeInTheDocument()
    expect(screen.getByText(/Lextract pulls 126 fields/i)).toBeInTheDocument()
    expect(screen.getByText('Who it is for')).toBeInTheDocument()
    expect(screen.getByText(/CRE teams, brokers, tenant reps/i)).toBeInTheDocument()
  })

  it('renders primary CTA linking to /upload', () => {
    render(<HeroSection />)
    const cta = screen.getByRole('link', { name: /get a free preview/i })
    expect(cta).toHaveAttribute('href', '/upload')
  })

  it('renders secondary CTA linking to sample report', () => {
    render(<HeroSection />)
    const cta = screen.getByRole('link', { name: /see a sample report/i })
    expect(cta).toHaveAttribute('href', '/sample-report')
  })

  it('renders trust indicators', () => {
    render(<HeroSection />)
    // Trust indicators show "126 fields extracted" and processing time badge
    expect(screen.getByText('126 fields extracted')).toBeInTheDocument()
    expect(screen.getByText(/results in minutes/i)).toBeInTheDocument()
  })
})

// ─── How It Works ─────────────────────────────────────────────────

describe('HowItWorks', () => {
  it('renders section heading', () => {
    render(<HowItWorks />)
    expect(
      screen.getByRole('heading', { name: /from lease pdf to usable data/i })
    ).toBeInTheDocument()
  })

  it('renders the full extraction workflow', () => {
    render(<HowItWorks />)
    expect(screen.getByText(/upload a commercial lease pdf/i)).toBeInTheDocument()
    expect(screen.getByText(/extract 126 structured fields/i)).toBeInTheDocument()
    expect(screen.getByText(/scores confidence on each field and flags lease risks/i)).toBeInTheDocument()
    expect(screen.getByText(/export to excel, word, or pdf/i)).toBeInTheDocument()
  })

  it('has the correct section id for anchor links', () => {
    const { container } = render(<HowItWorks />)
    const section = container.querySelector('#how-it-works')
    expect(section).toBeInTheDocument()
  })
})

// ─── Sample Output ────────────────────────────────────────────────

describe('SampleOutput', () => {
  it('renders section heading', () => {
    render(<SampleOutput />)
    expect(
      screen.getByRole('heading', { name: /what the output looks like/i })
    ).toBeInTheDocument()
  })

  it('renders extracted field examples with confidence badges', () => {
    render(<SampleOutput />)
    // Should show field names from a mocked extraction
    expect(screen.getByText(/tenant name/i)).toBeInTheDocument()
    expect(screen.getByText(/lease start date/i)).toBeInTheDocument()
  })

  it('renders confidence level indicators for all levels', () => {
    render(<SampleOutput />)
    // Should show high, medium, and low confidence labels
    const highBadges = screen.getAllByText('High')
    expect(highBadges.length).toBeGreaterThan(0)
    const mediumBadges = screen.getAllByText('Medium')
    expect(mediumBadges.length).toBeGreaterThan(0)
    const lowBadges = screen.getAllByText('Low')
    expect(lowBadges.length).toBeGreaterThan(0)
  })

  it('renders CTA to upload', () => {
    render(<SampleOutput />)
    const cta = screen.getByRole('link', { name: /upload yours/i })
    expect(cta).toHaveAttribute('href', '/upload')
  })
})

// ─── Red Flags Showcase ───────────────────────────────────────────

describe('RedFlagsShowcase', () => {
  it('renders section heading', () => {
    render(<RedFlagsShowcase />)
    expect(
      screen.getByRole('heading', { name: /catch risky lease terms/i })
    ).toBeInTheDocument()
  })

  it('renders at least 3 example red flags', () => {
    render(<RedFlagsShowcase />)
    const section = screen.getByTestId('red-flags-section')
    const flags = within(section).getAllByTestId('red-flag-item')
    expect(flags.length).toBeGreaterThanOrEqual(3)
  })

  it('renders severity indicators for flags', () => {
    render(<RedFlagsShowcase />)
    const highSeverity = screen.getAllByText(/high|critical/i)
    expect(highSeverity.length).toBeGreaterThan(0)
  })
})

// ─── Pricing Cards ────────────────────────────────────────────────

describe('PricingCards', () => {
  it('renders section heading', () => {
    render(<PricingCards />)
    expect(
      screen.getByRole('heading', { name: /pricing/i })
    ).toBeInTheDocument()
  })

  it('renders three pricing tiers', () => {
    render(<PricingCards />)
    // Multiple elements may contain these prices
    const price15 = screen.getAllByText(/\$15/)
    expect(price15.length).toBeGreaterThanOrEqual(1)
    const price65 = screen.getAllByText(/\$65/)
    expect(price65.length).toBeGreaterThanOrEqual(1)
    const price120 = screen.getAllByText(/\$120/)
    expect(price120.length).toBeGreaterThanOrEqual(1)
  })

  it('renders single lease tier', () => {
    render(<PricingCards />)
    // "Single Lease" appears as tier name and in other tiers' feature lists
    const matches = screen.getAllByText(/single lease/i)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('renders 5-pack tier with discount', () => {
    render(<PricingCards />)
    // "5-Pack" appears as heading and in 10-Pack features list
    const matches = screen.getAllByText(/5-pack/i)
    expect(matches.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/13% off/i)).toBeInTheDocument()
  })

  it('renders 10-pack tier with discount', () => {
    render(<PricingCards />)
    const matches = screen.getAllByText(/10-pack/i)
    expect(matches.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/20% off/i)).toBeInTheDocument()
  })

  it('renders manual abstraction cost comparison', () => {
    render(<PricingCards />)
    expect(screen.getByText(/\$90-\$250/)).toBeInTheDocument()
  })

  it('has CTA buttons linking to upload', () => {
    render(<PricingCards />)
    const ctas = screen.getAllByRole('link', { name: /get a free preview/i })
    expect(ctas.length).toBe(3)
    for (const cta of ctas) {
      expect(cta).toHaveAttribute('href', '/upload')
    }
  })
})

// ─── Why Trust Lextract ───────────────────────────────────────────

describe('WhyTrustLextract', () => {
  it('renders section heading', () => {
    render(<WhyTrustLextract />)
    expect(
      screen.getByRole('heading', { name: /built for commercial lease review/i })
    ).toBeInTheDocument()
  })

  it('renders all five pipeline step labels', () => {
    render(<WhyTrustLextract />)
    expect(screen.getByText('Vision AI')).toBeInTheDocument()
    expect(screen.getByText('Domain-Trained Prompts')).toBeInTheDocument()
    expect(screen.getByText('Multi-Pass Validation')).toBeInTheDocument()
    expect(screen.getByText('Score')).toBeInTheDocument()
    expect(screen.getByText('Flag')).toBeInTheDocument()
  })

  it('renders all five step numbers', () => {
    render(<WhyTrustLextract />)
    expect(screen.getByText('Step 01')).toBeInTheDocument()
    expect(screen.getByText('Step 02')).toBeInTheDocument()
    expect(screen.getByText('Step 03')).toBeInTheDocument()
    expect(screen.getByText('Step 04')).toBeInTheDocument()
    expect(screen.getByText('Step 05')).toBeInTheDocument()
  })

  it('renders the structured-fields contrast in the subheading', () => {
    render(<WhyTrustLextract />)
    expect(
      screen.getByText(/structured fields, each with its own\s+confidence score/i)
    ).toBeInTheDocument()
  })

  it('primary CTA links to /upload', () => {
    render(<WhyTrustLextract />)
    const cta = screen.getByRole('link', { name: /get a free preview/i })
    expect(cta).toHaveAttribute('href', '/upload')
  })

  it('detail comparison link points to ChatGPT comparison page', () => {
    render(<WhyTrustLextract />)
    const link = screen.getByRole('link', { name: /chatgpt vs lextract/i })
    expect(link).toHaveAttribute('href', '/resources/comparisons/chatgpt-lease-review')
  })
})

// ─── CamAudit Cross-Sell ──────────────────────────────────────────

describe('CamauditCrosssell', () => {
  it('renders section heading mentioning CamAudit', () => {
    render(<CamauditCrosssell />)
    expect(
      screen.getByRole('heading', { name: /cam issue/i })
    ).toBeInTheDocument()
  })

  it('explains the CAM audit integration', () => {
    render(<CamauditCrosssell />)
    expect(screen.getByText(/white-label CAM recovery tools/i)).toBeInTheDocument()
  })

  it('links to camaudit.io', () => {
    render(<CamauditCrosssell />)
    const link = screen.getByRole('link', { name: /partner signup/i })
    expect(link).toHaveAttribute('href', 'https://partner.camaudit.io')
  })
})

// ─── Marketing Footer ────────────────────────────────────────────

describe('MarketingFooter', () => {
  it('renders the footer element', () => {
    render(<MarketingFooter />)
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('renders legal disclaimer', () => {
    render(<MarketingFooter />)
    expect(
      screen.getByText(/not.*legal.*tax.*accounting advice/i)
    ).toBeInTheDocument()
  })

  it('renders company name', () => {
    render(<MarketingFooter />)
    // Footer has multiple instances of "Lextract" (logo, description, copyright)
    const matches = screen.getAllByText(/lextract/i)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('links to the feature hub from the product section', () => {
    render(<MarketingFooter />)
    expect(screen.getByRole('link', { name: /features/i })).toHaveAttribute(
      'href',
      '/features'
    )
  })
})

// ─── Marketing Header ────────────────────────────────────────────

describe('MarketingHeader', () => {
  it('renders the header element', () => {
    render(<MarketingHeader />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('renders logo linking to home', () => {
    render(<MarketingHeader />)
    const logo = screen.getByTestId('marketing-logo')
    expect(logo).toHaveAttribute('href', '/')
  })

  it('renders navigation links', () => {
    render(<MarketingHeader />)
    expect(screen.getByRole('link', { name: /pricing/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /features/i })).toHaveAttribute(
      'href',
      '/features'
    )
  })

  it('renders sign up CTA', () => {
    render(<MarketingHeader />)
    const cta = screen.getAllByRole('link', { name: /get a free preview/i })[0]
    expect(cta).toHaveAttribute('href', '/upload')
  })

  it('renders resources link', () => {
    render(<MarketingHeader />)
    // Resources is rendered as a dropdown button in the desktop nav
    expect(
      screen.getByRole('button', { name: /resources/i })
    ).toBeInTheDocument()
  })

  it('renders hamburger button for mobile', () => {
    render(<MarketingHeader />)
    const hamburger = screen.getByRole('button', { name: /open menu/i })
    expect(hamburger).toBeInTheDocument()
    expect(hamburger).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens mobile nav drawer when hamburger is clicked', () => {
    render(<MarketingHeader />)
    const hamburger = screen.getByRole('button', { name: /open menu/i })
    fireEvent.click(hamburger)
    expect(screen.getByRole('dialog', { name: /mobile navigation/i })).toBeInTheDocument()
    expect(hamburger).toHaveAttribute('aria-expanded', 'true')
  })

  it('closes mobile nav drawer when close button is clicked', () => {
    render(<MarketingHeader />)
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }))
    expect(screen.getByRole('dialog', { name: /mobile navigation/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /close menu/i }))
    expect(screen.queryByRole('dialog', { name: /mobile navigation/i })).not.toBeInTheDocument()
  })

  it('closes mobile nav when a mobile nav link is clicked', () => {
    render(<MarketingHeader />)
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }))
    const mobileNav = screen.getByRole('dialog', { name: /mobile navigation/i })
    const mobileLink = within(mobileNav).getAllByRole('link')[0]
    fireEvent.click(mobileLink)
    expect(screen.queryByRole('dialog', { name: /mobile navigation/i })).not.toBeInTheDocument()
  })
})

// ─── FadeIn Component ─────────────────────────────────────────────

describe('FadeIn', () => {
  afterEach(() => {
    mockInView = true
  })

  it('renders children when in view', () => {
    mockInView = true
    render(
      <FadeIn>
        <p>Hello world</p>
      </FadeIn>
    )
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('renders children when not in view', () => {
    mockInView = false
    render(
      <FadeIn>
        <p>Hidden content</p>
      </FadeIn>
    )
    // Children still render (animation just differs)
    expect(screen.getByText('Hidden content')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <FadeIn className="custom-class">
        <p>Content</p>
      </FadeIn>
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('accepts a delay prop', () => {
    render(
      <FadeIn delay={0.3}>
        <p>Delayed content</p>
      </FadeIn>
    )
    expect(screen.getByText('Delayed content')).toBeInTheDocument()
  })
})

// ─── StaggerChildren Component ────────────────────────────────────

describe('StaggerChildren', () => {
  afterEach(() => {
    mockInView = true
  })

  it('renders children when in view', () => {
    mockInView = true
    render(
      <StaggerChildren>
        <div>Item 1</div>
        <div>Item 2</div>
      </StaggerChildren>
    )
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
  })

  it('renders children when not in view', () => {
    mockInView = false
    render(
      <StaggerChildren>
        <div>Hidden 1</div>
        <div>Hidden 2</div>
      </StaggerChildren>
    )
    expect(screen.getByText('Hidden 1')).toBeInTheDocument()
    expect(screen.getByText('Hidden 2')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <StaggerChildren className="grid-class">
        <div>Item</div>
      </StaggerChildren>
    )
    expect(container.firstChild).toHaveClass('grid-class')
  })

  it('accepts a custom staggerDelay', () => {
    render(
      <StaggerChildren staggerDelay={0.2}>
        <div>Staggered</div>
      </StaggerChildren>
    )
    expect(screen.getByText('Staggered')).toBeInTheDocument()
  })
})

// ─── Trust Signals ──────────────────────────────────────────────

describe('TrustSignals', () => {
  it('renders security indicators', () => {
    render(<TrustSignals />)
    expect(screen.getByText(/AES-256 encryption/i)).toBeInTheDocument()
    expect(screen.getByText(/do not sell your data/i)).toBeInTheDocument()
    // Guard against reintroducing a claim that contradicts our privacy policy:
    // the full PDF is shared with OpenRouter and downstream model providers.
    expect(screen.queryByText(/no data sharing/i)).not.toBeInTheDocument()
  })

  it('renders lease type grid heading', () => {
    render(<TrustSignals />)
    expect(
      screen.getByRole('heading', { name: /built for every lease type/i })
    ).toBeInTheDocument()
  })

  it('renders all six lease types', () => {
    render(<TrustSignals />)
    expect(screen.getByText('NNN (Triple Net)')).toBeInTheDocument()
    expect(screen.getByText('Gross Lease')).toBeInTheDocument()
    expect(screen.getByText('Modified Gross')).toBeInTheDocument()
    expect(screen.getByText('Ground Lease')).toBeInTheDocument()
    expect(screen.getByText('Multi-Tenant')).toBeInTheDocument()
    expect(screen.getByText('Single-Tenant')).toBeInTheDocument()
  })
})

// ─── FAQ Section ────────────────────────────────────────────────

describe('FaqSection', () => {
  const testItems = [
    { question: 'What is Lextract?', answer: 'AI-powered lease abstraction.' },
    { question: 'How much does it cost?', answer: '$15 per lease.' },
  ]

  it('renders section heading', () => {
    render(<FaqSection items={testItems} />)
    expect(
      screen.getByRole('heading', { name: /frequently asked questions/i })
    ).toBeInTheDocument()
  })

  it('renders all FAQ items', () => {
    render(<FaqSection items={testItems} />)
    expect(screen.getByText('What is Lextract?')).toBeInTheDocument()
    expect(screen.getByText('How much does it cost?')).toBeInTheDocument()
  })

  it('renders answer text within details elements', () => {
    render(<FaqSection items={testItems} />)
    expect(screen.getByText('AI-powered lease abstraction.')).toBeInTheDocument()
    expect(screen.getByText('$15 per lease.')).toBeInTheDocument()
  })

  it('renders chevron icons for expand/collapse', () => {
    render(<FaqSection items={testItems} />)
    const chevrons = screen.getAllByTestId('icon-chevron-down')
    expect(chevrons.length).toBe(2)
  })
})
