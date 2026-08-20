/** @vitest-environment node */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOTS = ['app', 'components', 'data', 'lib', 'content', 'public']
const SOURCE_FILE_PATTERN = /\.(ts|tsx|mdx|json|txt|css)$/
const STALE_PRICING_PATTERNS: Array<string | RegExp> = [
  '$10 per lease',
  '$10/lease',
  '$10 per extraction',
  '$10 extraction',
  /priced at \$10(?![\d,])/,
  'costs $10',
  'Lextract | $10 (single)',
  '$37.50',
  '$7.50 per lease',
  '$7.50/lease',
  '$60 for 10',
  '$60/10-pack',
  '$6 per lease',
  '$6/lease',
  '$6 each',
  'Lextract is $10',
  '$10 vs.',
  '$17 per lease',
  'reduced to $12',
  'Lextract (10-pack rate) | $12',
  '$1,200 (10-pack pricing)',
  '$1,000 (AI)',
  '$500/year',
  '$1,750/year',
  '471% ROI',
  '25% off',
  '40% off',
  '5-pack is $75',
  '10-pack is $170',
  '$75 for a 5-pack',
  '$170 for a 10-pack',
  '$24,000 at the 10-pack rate',
  '$600 | $1,500',
  '$6,000 | $15,000',
  '$3,400 vs. $40,000',
  '92% cost reduction',
  '$20 per lease',
  '$20/lease',
  '$20 per extraction',
  'Pay $20',
  'for $20',
  '$90 for 5',
  '$90 for a 5-pack',
  '$90/5-pack',
  '$18/lease',
  '$18 per lease',
  '$170 for 10',
  '$170 for a 10-pack',
  '$170/10-pack',
  '$17/lease',
  '$17 per lease',
]
const FRACTIONAL_LEXTRACT_PRICE_PATTERNS: RegExp[] = [
  /\$1[0-9]\.\d{1,2}\s*(?:per\s+lease|\/lease|\/mo|per\s+month)/i,
  /\$[0-9]+\.\d{1,2}\s*(?:for\s+5|for\s+10|\/5-pack|\/10-pack)/i,
]
const RAW_PRICING_INTERPOLATION_PATTERNS: RegExp[] = [
  /\$\$\{PRICING\.[^}]+\.(?:price|perLease)\}/,
  /\$\{PRICING\.[^}]+\.(?:price|perLease)\}/,
]
const UNSUPPORTED_ACCURACY_PATTERNS: RegExp[] = [
  /near-?100%\s+accuracy/i,
  /false positives[^.?!]{0,120}\b\d+(?:-\d+)?%/i,
  /false negatives[^.?!]{0,120}\b\d+(?:-\d+)?%/i,
  /equally accurate/i,
  /trust AI for the \d+%/i,
]

const STALE_PROCESSING_PATTERNS: RegExp[] = [
  /\bunder\s+3\s+minutes\b/i,
  /\bLextract[^.?!]{0,240}\b(?:turns|processes|extracts|delivers|produces)[^.?!]{0,240}\b3\s+minutes\b/i,
]

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir)
  const files: string[] = []

  for (const entry of entries) {
    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      files.push(...collectSourceFiles(path))
    } else if (SOURCE_FILE_PATTERN.test(entry)) {
      files.push(path)
    }
  }

  return files
}

describe('public pricing copy', () => {
  it('does not contain stale Lextract $10-era pricing strings', () => {
    const staleMatches = ROOTS.flatMap((root) =>
      collectSourceFiles(root).flatMap((path) => {
        const content = readFileSync(path, 'utf8')
        return STALE_PRICING_PATTERNS
          .filter((pattern) =>
            typeof pattern === 'string' ? content.includes(pattern) : pattern.test(content),
          )
          .map((pattern) => `${path}: ${pattern}`)
      }),
    )

    expect(staleMatches).toEqual([])
  })

  it('does not contain stale under-3-minute Lextract processing claims', () => {
    const staleMatches = ROOTS.flatMap((root) =>
      collectSourceFiles(root).flatMap((path) => {
        const content = readFileSync(path, 'utf8').replace(/\s+/g, ' ')
        return STALE_PROCESSING_PATTERNS
          .filter((pattern) => pattern.test(content))
          .map((pattern) => `${path}: ${pattern}`)
      }),
    )

    expect(staleMatches).toEqual([])
  })

  it('does not expose fractional Lextract price points on public surfaces', () => {
    const matches = ROOTS.flatMap((root) =>
      collectSourceFiles(root).flatMap((path) => {
        const content = readFileSync(path, 'utf8')
        return FRACTIONAL_LEXTRACT_PRICE_PATTERNS.flatMap((pattern) => {
          const found = content.match(pattern)
          return found ? [`${path}: ${found[0]}`] : []
        })
      }),
    )

    expect(matches).toEqual([])
  })

  it('does not interpolate raw pricing numbers into public display strings', () => {
    const matches = ROOTS.flatMap((root) =>
      collectSourceFiles(root).flatMap((path) => {
        const content = readFileSync(path, 'utf8')
        return RAW_PRICING_INTERPOLATION_PATTERNS.flatMap((pattern) => {
          const found = content.match(pattern)
          return found ? [`${path}: ${found[0]}`] : []
        })
      }),
    )

    expect(matches).toEqual([])
  })

  it('does not use em dashes on public frontend surfaces', () => {
    const matches = ROOTS.flatMap((root) =>
      collectSourceFiles(root).flatMap((path) => {
        const content = readFileSync(path, 'utf8')
        return content.includes('—') ? [path] : []
      }),
    )

    expect(matches).toEqual([])
  })

  it('does not publish unsupported AI accuracy rate claims', () => {
    const matches = ROOTS.flatMap((root) =>
      collectSourceFiles(root).flatMap((path) => {
        const content = readFileSync(path, 'utf8').replace(/\s+/g, ' ')
        return UNSUPPORTED_ACCURACY_PATTERNS.flatMap((pattern) => {
          const found = content.match(pattern)
          return found ? [`${path}: ${found[0]}`] : []
        })
      }),
    )

    expect(matches).toEqual([])
  })
})
