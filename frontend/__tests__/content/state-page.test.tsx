import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StateFaqAccordion } from '@/components/content/state-faq-accordion'
import { StateFactGrid } from '@/components/content/state-fact-grid'
import { StateNoticePeriodTable } from '@/components/content/state-notice-table'
import { StateStatuteList } from '@/components/content/state-statute-list'
import { StateAuditRightsSection } from '@/components/content/state-audit-rights'
import StatePage from '@/app/(marketing)/resources/states/[state]/page'
import type {
  StateFaq,
  StateKeyFact,
  StateNoticePeriod,
  StateKeyStatute,
  StateAuditRights,
} from '@/data/states'

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string
    children: React.ReactNode
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

vi.mock('@/components/seo/json-ld', () => ({
  JsonLd: ({ schema }: { schema: unknown }) => (
    <script
      type="application/ld+json"
      data-testid="json-ld"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  ),
}))

describe('StateFaqAccordion', () => {
  const faqs: StateFaq[] = [
    { question: 'Can a landlord lock out a tenant?', answer: 'No, self-help evictions are illegal.' },
    { question: 'Is there a rent cap?', answer: 'No statutory cap exists for commercial leases.' },
    { question: 'What about security deposits?', answer: 'No limit for commercial tenancies.' },
  ]

  it('renders all FAQ questions', () => {
    render(<StateFaqAccordion faqs={faqs} />)
    for (const faq of faqs) {
      expect(screen.getByText(faq.question)).toBeInTheDocument()
    }
  })

  it('renders details/summary elements for accessibility', () => {
    const { container } = render(<StateFaqAccordion faqs={faqs} />)
    const details = container.querySelectorAll('details')
    expect(details).toHaveLength(3)
    const summaries = container.querySelectorAll('summary')
    expect(summaries).toHaveLength(3)
  })

  it('answers are present in the DOM', () => {
    render(<StateFaqAccordion faqs={faqs} />)
    for (const faq of faqs) {
      expect(screen.getByText(faq.answer)).toBeInTheDocument()
    }
  })

  it('opens and closes accordion items', async () => {
    const user = userEvent.setup()
    const { container } = render(<StateFaqAccordion faqs={faqs} />)

    const firstDetails = container.querySelector('details')
    expect(firstDetails).not.toHaveAttribute('open')

    const firstSummary = container.querySelector('summary')
    await user.click(firstSummary!)
    expect(firstDetails).toHaveAttribute('open')
  })

  it('renders a section heading', () => {
    render(<StateFaqAccordion faqs={faqs} />)
    expect(screen.getByRole('heading', { name: /frequently asked questions/i })).toBeInTheDocument()
  })
})

describe('StateFactGrid', () => {
  const facts: StateKeyFact[] = [
    { label: 'Regulatory Stance', value: 'Landlord-Friendly' },
    { label: 'Self-Help Evictions', value: 'Legal' },
    { label: 'Rent Tax', value: 'None' },
  ]

  it('renders all facts as cards', () => {
    render(<StateFactGrid facts={facts} />)
    for (const fact of facts) {
      expect(screen.getByText(fact.label)).toBeInTheDocument()
      expect(screen.getByText(fact.value)).toBeInTheDocument()
    }
  })

  it('renders a section heading', () => {
    render(<StateFactGrid facts={facts} />)
    expect(screen.getByRole('heading', { name: /key facts/i })).toBeInTheDocument()
  })

  it('renders the correct number of cards', () => {
    const { container } = render(<StateFactGrid facts={facts} />)
    const cards = container.querySelectorAll('[data-testid="fact-card"]')
    expect(cards).toHaveLength(3)
  })
})

describe('StateNoticePeriodTable', () => {
  const periods: StateNoticePeriod[] = [
    { type: 'Rent Default', period: '3 days', details: 'Notice before eviction filing.' },
    { type: 'Month-to-Month', period: '30 days', details: 'Written notice to terminate.' },
  ]

  it('renders table with headers', () => {
    render(<StateNoticePeriodTable periods={periods} />)
    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Period')).toBeInTheDocument()
    expect(screen.getByText('Details')).toBeInTheDocument()
  })

  it('renders all notice periods', () => {
    render(<StateNoticePeriodTable periods={periods} />)
    for (const period of periods) {
      expect(screen.getByText(period.type)).toBeInTheDocument()
      expect(screen.getByText(period.period)).toBeInTheDocument()
      expect(screen.getByText(period.details)).toBeInTheDocument()
    }
  })

  it('renders a section heading', () => {
    render(<StateNoticePeriodTable periods={periods} />)
    expect(screen.getByRole('heading', { name: /notice periods/i })).toBeInTheDocument()
  })

  it('renders as a table element', () => {
    render(<StateNoticePeriodTable periods={periods} />)
    expect(screen.getByRole('table')).toBeInTheDocument()
  })
})

describe('StateStatuteList', () => {
  const statutes: StateKeyStatute[] = [
    {
      name: 'Property Code Ch. 93',
      description: 'Governs commercial tenancies.',
      url: 'https://example.com',
    },
    {
      name: 'Section 91.001',
      description: 'Default notice periods.',
    },
  ]

  it('renders all statutes', () => {
    render(<StateStatuteList statutes={statutes} />)
    for (const statute of statutes) {
      expect(screen.getByText(statute.name)).toBeInTheDocument()
      expect(screen.getByText(statute.description)).toBeInTheDocument()
    }
  })

  it('renders links for statutes with URLs', () => {
    render(<StateStatuteList statutes={statutes} />)
    const link = screen.getByRole('link', { name: /view statute/i })
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('does not render link for statutes without URLs', () => {
    render(<StateStatuteList statutes={[statutes[1]]} />)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('renders a section heading', () => {
    render(<StateStatuteList statutes={statutes} />)
    expect(screen.getByRole('heading', { name: /key statutes/i })).toBeInTheDocument()
  })
})

describe('StateAuditRightsSection', () => {
  const auditRights: StateAuditRights = {
    summary: 'No statutory rights exist.',
    details: 'Commercial tenants must negotiate audit provisions in their lease.',
  }

  it('renders summary and details', () => {
    render(<StateAuditRightsSection auditRights={auditRights} />)
    expect(screen.getByText(auditRights.summary)).toBeInTheDocument()
    expect(screen.getByText(auditRights.details)).toBeInTheDocument()
  })

  it('renders a section heading', () => {
    render(<StateAuditRightsSection auditRights={auditRights} />)
    expect(
      screen.getByRole('heading', { name: /cam & operating expense audit rights/i })
    ).toBeInTheDocument()
  })
})

describe('StatePage', () => {
  it('renders source provenance for state-law claims', async () => {
    const Page = await StatePage({
      params: Promise.resolve({ state: 'california' }),
    })
    render(Page)

    expect(screen.getByRole('heading', { name: /sources checked/i })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /California Civil Code Section 1950\.9/i }),
    ).toHaveAttribute('href', 'https://leginfo.legislature.ca.gov')
  })
})
