import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FadeIn } from '@/components/motion/fade-in'
import {
  StaggerChildren,
  StaggerItem,
} from '@/components/motion/stagger-children'
import { CONFIDENCE_COLORS, CATEGORY_COLORS } from '@/lib/design-tokens'

interface SampleField {
  category: string
  name: string
  value: string
  confidence: 'High' | 'Medium' | 'Low'
}

const sampleFields: SampleField[] = [
  {
    category: 'Parties',
    name: 'Tenant Name',
    value: 'Meridian Health Systems, LLC',
    confidence: 'High',
  },
  {
    category: 'Parties',
    name: 'Landlord Name',
    value: 'Oakwood Properties Trust',
    confidence: 'High',
  },
  {
    category: 'Dates',
    name: 'Lease Start Date',
    value: 'January 1, 2024',
    confidence: 'High',
  },
  {
    category: 'Dates',
    name: 'Lease End Date',
    value: 'December 31, 2033',
    confidence: 'High',
  },
  {
    category: 'Financial',
    name: 'Base Rent (Monthly)',
    value: '$14,250.00',
    confidence: 'High',
  },
  {
    category: 'Financial',
    name: 'Annual Escalation',
    value: '3% per annum',
    confidence: 'Medium',
  },
  {
    category: 'CAM',
    name: 'CAM Cap',
    value: '5% cumulative, non-compounding',
    confidence: 'High',
  },
  {
    category: 'CAM',
    name: 'Audit Rights',
    value: 'Tenant may audit within 180 days of reconciliation',
    confidence: 'Medium',
  },
  {
    category: 'Renewal',
    name: 'Renewal Notice Period',
    value: 'Not specified',
    confidence: 'Low',
  },
]

function confidenceColor(level: SampleField['confidence']): string {
  const key = level.toLowerCase() as 'high' | 'medium' | 'low'
  return CONFIDENCE_COLORS[key]
}

export function SampleOutput() {
  return (
    <section className="bg-accent/50 py-12 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            What the output looks like
          </h2>
          <p className="mt-4 text-base sm:text-lg lg:text-xl text-muted-foreground">
            Here is what you get from a single lease upload. Every field
            includes a confidence score so you know what to double-check.
          </p>
        </FadeIn>

        <FadeIn className="mt-12" delay={0.2}>
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="border-b bg-primary px-6 py-4">
              <h3 className="font-semibold text-primary-foreground">
                Extracted Fields (9 of 126 shown)
              </h3>
            </div>

            <StaggerChildren className="divide-y">
              {sampleFields.map((field) => (
                <StaggerItem key={`${field.category}-${field.name}`}>
                  <div className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-sm font-medium ${CATEGORY_COLORS[field.category] ?? 'bg-muted text-muted-foreground'}`}
                        >
                          {field.category}
                        </span>
                      </div>
                      <p className="mt-1 font-medium">{field.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {field.value}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`text-sm ${confidenceColor(field.confidence)}`}
                    >
                      {field.confidence}
                    </Badge>
                  </div>
                </StaggerItem>
              ))}
            </StaggerChildren>

            {/* Blurred preview rows */}
            <div className="relative">
              <div className="divide-y blur-sm" aria-hidden="true">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-6 py-4"
                  >
                    <div>
                      <div className="h-3 w-20 rounded bg-muted" />
                      <div className="mt-2 h-4 w-40 rounded bg-muted" />
                      <div className="mt-1 h-3 w-56 rounded bg-muted" />
                    </div>
                    <div className="h-6 w-16 rounded-full bg-muted" />
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-card/80">
                <Button variant="outline" asChild>
                  <Link href="/upload">Upload yours to see all 126 fields</Link>
                </Button>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
