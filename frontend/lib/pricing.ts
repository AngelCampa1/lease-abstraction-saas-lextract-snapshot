import { PUBLIC_KNOWLEDGE } from '@/data/public-knowledge'

const { pricing, processing } = PUBLIC_KNOWLEDGE.marketing

export const PRICING = {
  single: {
    ...pricing.single,
    savings: pricing.single.savings ?? null,
  },
  pack5: {
    ...pricing.pack5,
    savings: pricing.pack5.savings ?? null,
  },
  pack10: {
    ...pricing.pack10,
    savings: pricing.pack10.savings ?? null,
  },
} as const

/** Format a public product price as a whole-dollar display string, rounding up fractional inputs. */
export function formatPrice(dollars: number): string {
  return `$${Math.ceil(dollars)}`
}

/** Support policy copy for payment and pricing surfaces. */
export const SUPPORT_POLICY = pricing.supportPolicy

/** Competitor price range for comparison copy */
export const COMPETITOR_PRICE_RANGE = pricing.competitorRange

/** Processing time claims - update here to change site-wide */
export const PROCESSING_TIME = {
  /** Hero/headline contexts - punchy and positive */
  headline: processing.headline,
  /** Trust indicator badge on hero */
  trustBadge: 'Results in minutes',
  /** Comparison table / specific numbers */
  comparison: processing.canonicalRange,
  /** Stat block display (short form) */
  statShort: '5-15 min',
  /** Stat block label */
  statLabel: 'Average processing',
  /** FAQ / detailed explanation */
  detailed: processing.detailed,
  /** Factual / llms.txt */
  factual: `Typically ${processing.canonicalRange} from PDF upload to structured output`,
  /** vs manual comparison */
  vsManual: processing.vsManual,
} as const

/** In-app processing time estimates */
export const PROCESSING_ESTIMATES = {
  extractingWithPageCount: (pages: number) =>
    PUBLIC_KNOWLEDGE.app.processing.estimates.withPageCountTemplate.replace(
      '{pages}',
      String(pages),
    ),
  extracting: PUBLIC_KNOWLEDGE.app.processing.estimates.fallback,
} as const
