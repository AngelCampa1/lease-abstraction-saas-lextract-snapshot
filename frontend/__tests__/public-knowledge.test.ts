import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { PUBLIC_KNOWLEDGE, validatePublicKnowledge } from '@/data/public-knowledge'
import {
  formatPublicPricingOffer,
  getContactEmail,
  getLeadMagnetPublicFacts,
  getPricingFacts,
  getProcessingFacts,
  getProductFacts,
} from '@/lib/public-facts'

const frontendRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(frontendRoot, '..')
const frontendGeneratedPath = path.join(
  frontendRoot,
  'public',
  'knowledge',
  'lextract-public-knowledge.json',
)
const backendGeneratedPath = path.resolve(
  repoRoot,
  'backend',
  'app',
  'services',
  'public_knowledge.generated.json',
)
const workerGeneratedPath = path.resolve(
  repoRoot,
  'workers',
  'marketing-data',
  'src',
  'public-knowledge.generated.json',
)
const workerPackagePath = path.resolve(repoRoot, 'workers', 'marketing-data', 'package.json')
const sourceScanRoots = [
  path.join(repoRoot, 'AGENTS.md'),
  path.join(repoRoot, 'CLAUDE.md'),
  path.join(repoRoot, 'tmp'),
  path.join(frontendRoot, 'app'),
  path.join(frontendRoot, 'components'),
  path.join(frontendRoot, 'content'),
  path.join(frontendRoot, 'data'),
  path.join(frontendRoot, 'lib'),
  path.join(repoRoot, 'backend', 'app', 'services', 'email_templates'),
  path.join(repoRoot, 'workers', 'marketing-data', 'src', 'templates'),
]
const sourceScanExtensions = new Set(['', '.ts', '.tsx', '.html', '.md', '.mdx', '.json'])
const allowedSourceScanFiles = new Set([
  path.normalize(path.join(frontendRoot, 'data', 'public-knowledge', 'schema.ts')),
])

function readGeneratedJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, 'utf-8'))
}

function listSourceFiles(root: string): string[] {
  if (!existsSync(root)) {
    return []
  }
  if (statSync(root).isFile()) {
    return sourceScanExtensions.has(path.extname(root)) ? [root] : []
  }

  const entries = readdirSync(root).flatMap((entry) => {
    const fullPath = path.join(root, entry)
    const stats = statSync(fullPath)
    if (stats.isDirectory()) {
      return listSourceFiles(fullPath)
    }
    return sourceScanExtensions.has(path.extname(fullPath)) ? [fullPath] : []
  })

  return entries
}

describe('PUBLIC_KNOWLEDGE', () => {
  it('validates the canonical schema and required top-level sections', () => {
    expect(validatePublicKnowledge(PUBLIC_KNOWLEDGE)).toEqual([])
    expect(PUBLIC_KNOWLEDGE).toHaveProperty('marketing')
    expect(PUBLIC_KNOWLEDGE).toHaveProperty('app')
    expect(PUBLIC_KNOWLEDGE).toHaveProperty('emails')
  })

  it('centralizes canonical public product facts', () => {
    expect(PUBLIC_KNOWLEDGE.marketing.product.fieldCount).toBe(126)
    expect(PUBLIC_KNOWLEDGE.marketing.product.redFlagCount).toBe(20)
    expect(PUBLIC_KNOWLEDGE.marketing.pricing.single.price).toBe(15)
    expect(PUBLIC_KNOWLEDGE.marketing.pricing.pack5.price).toBe(65)
    expect(PUBLIC_KNOWLEDGE.marketing.pricing.pack10.price).toBe(120)
    expect(PUBLIC_KNOWLEDGE.marketing.pricing.supportPolicy).toBe(
      'If an extraction looks wrong, email support and we will review it.',
    )
    expect(PUBLIC_KNOWLEDGE.marketing.processing.canonicalRange).toBe('5-15 minutes')
  })

  it('uses founder email for all contact addresses', () => {
    expect(PUBLIC_KNOWLEDGE.marketing.contacts.founderSales.email).toBe(
      'angel.campa@lextract.io',
    )
    expect(PUBLIC_KNOWLEDGE.marketing.contacts.support.email).toBe('angel.campa@lextract.io')
    expect(PUBLIC_KNOWLEDGE.marketing.contacts.legal.email).toBe('angel.campa@lextract.io')
    expect(PUBLIC_KNOWLEDGE.marketing.contacts.privacy.email).toBe('angel.campa@lextract.io')
  })

  it('contains required app workflow guidance', () => {
    expect(PUBLIC_KNOWLEDGE.app.upload.acceptedFormats).toEqual(['PDF'])
    expect(PUBLIC_KNOWLEDGE.app.upload.maxFileSizeMb).toBe(50)
    expect(PUBLIC_KNOWLEDGE.app.processing.statusMessages.complete).toBeTruthy()
    expect(PUBLIC_KNOWLEDGE.app.exports.formats.map((format) => format.id)).toEqual([
      'docx',
      'pdf',
      'xlsx',
    ])
  })

  it('contains required email knowledge entries', () => {
    const transactionalIds = PUBLIC_KNOWLEDGE.emails.transactional.map((email) => email.id)
    expect(transactionalIds).toEqual(
      expect.arrayContaining([
        'extraction-complete',
        'cam-flags-found',
        'guest-account-setup',
        'anonymous-notification',
        'lead-magnet-delivery',
      ]),
    )

    expect('nurtureSequences' in PUBLIC_KNOWLEDGE.emails).toBe(false)
  })

  it('contains canonical body templates for reusable public email copy', () => {
    const emailById = new Map(
      PUBLIC_KNOWLEDGE.emails.transactional.map((email) => [email.id, email]),
    )

    expect(emailById.get('anonymous-notification')?.bodyTemplates).toMatchObject({
      htmlTemplate:
        'Your lease extraction for <strong>{document_name}</strong> is complete.',
      textTemplate: 'Your lease extraction for {document_name} is complete.',
    })
    expect(emailById.get('lead-magnet-delivery')?.bodyTemplates).toMatchObject({
      htmlTemplate:
        'You can download it here: <a href="{download_url}">{download_url}</a>.',
    })
    expect('fallbackBodyTemplates' in PUBLIC_KNOWLEDGE.emails).toBe(false)
  })

  it('does not expose private implementation details in public JSON', () => {
    const serialized = JSON.stringify(PUBLIC_KNOWLEDGE)
    const bannedPatterns = [
      /OPENROUTER_API_KEY/i,
      /RESEND_API_KEY/i,
      /STRIPE_SECRET_KEY/i,
      /WEBHOOK_SECRET/i,
      /SERVICE_ROLE/i,
      /SECRET_ACCESS_KEY/i,
      /internal cost/i,
      /COGS/i,
      /model fallback/i,
      /raw response/i,
      /r2ObjectKey/i,
      /localAssetPath/i,
      /minimumBytes/i,
      /minimumPages/i,
      /minimumSheets/i,
      /api[_-]?key/i,
      /secret/i,
      /token/i,
      /password/i,
      /dsn/i,
      /postgres/i,
      /redis/i,
      /supabase/i,
      /railway/i,
      /vercel/i,
      /cloudflare/i,
      /bucket/i,
      /localhost/i,
      /127\.0\.0\.1/i,
      /C:\\Users\\/i,
    ]

    for (const pattern of bannedPatterns) {
      expect(serialized).not.toMatch(pattern)
    }
  })

  it('keeps non-public app configuration out of public knowledge', () => {
    expect(JSON.stringify(PUBLIC_KNOWLEDGE)).not.toContain('pollIntervalSeconds')
  })

  it('does not leave stale public fact literals in active public surfaces', () => {
    const bannedPatterns = [
      /\$20(?!0|\d)/,
      /15 Red Flag Rules/i,
      /14 categories/i,
      /six categories/i,
      /\b6 categories\b/i,
      /under 2 minutes/i,
      /3 full 126-field extractions/i,
      /Try Lextract free/i,
      /after the free tier/i,
      /Free tier:/i,
      /3 leases, no card/i,
      /\$10\/lease/i,
      /pricing ranges from \$10/i,
      /\$150 and \$300 per lease/i,
      /\$150 to \$400 per lease and takes 3 to 8 hours/i,
      /\$150-\$400 per lease/i,
      /\$90-\$250 per lease/i,
      /99 commercial lease fields/i,
      /unlock all 99 fields/i,
      /99-Field Schema/i,
      /3-5 hours manually/i,
      /3 to 5 hours per lease/i,
      /95 to 98% field-level accuracy/i,
      /\$18 each/i,
      /\$17 each/i,
      /60.?180 seconds/i,
      /in 90 seconds/i,
      /extract 126 fields in 90 seconds/i,
      /10 categories/i,
      /9 categories/i,
      /batch upload/i,
      /batch uploads/i,
      /batch processing/i,
      /30-day money[- ]back guarantee/i,
      /no questions asked/i,
      /[ï¿½ďż˝�]/,
    ]

    const matches = sourceScanRoots.flatMap((root) =>
      listSourceFiles(root).flatMap((filePath) => {
        if (allowedSourceScanFiles.has(path.normalize(filePath))) {
          return []
        }
        const source = readFileSync(filePath, 'utf-8')
        return bannedPatterns.flatMap((pattern) => {
          const found = source.match(pattern)
          return found ? [`${path.relative(repoRoot, filePath)}: ${found[0]}`] : []
        })
      }),
    )

    expect(matches).toEqual([])
  })

  it('generated JSON files match the TypeScript source exactly', () => {
    expect(existsSync(frontendGeneratedPath)).toBe(true)
    expect(existsSync(backendGeneratedPath)).toBe(true)
    expect(existsSync(workerGeneratedPath)).toBe(true)

    expect(readGeneratedJson(frontendGeneratedPath)).toEqual(PUBLIC_KNOWLEDGE)
    expect(readGeneratedJson(backendGeneratedPath)).toEqual(PUBLIC_KNOWLEDGE)
    expect(readGeneratedJson(workerGeneratedPath)).toEqual(PUBLIC_KNOWLEDGE)
  })

  it('protects worker deploys from stale generated public knowledge', () => {
    const packageJson = readGeneratedJson(workerPackagePath) as {
      scripts?: Record<string, string>
    }

    expect(packageJson.scripts?.check).toContain('workers/marketing-data')
    expect(packageJson.scripts?.check).toContain('verify:knowledge')
    expect(packageJson.scripts?.check).toContain('wrangler deploy --dry-run')
    expect(packageJson.scripts?.['verify:knowledge']).toContain('build:knowledge')
    expect(packageJson.scripts?.predeploy).toContain('verify:knowledge')
  })

  it('does not configure a worker sender that bypasses public knowledge', () => {
    const wranglerConfig = readFileSync(
      path.resolve(repoRoot, 'workers', 'marketing-data', 'wrangler.jsonc'),
      'utf-8',
    )

    expect(wranglerConfig).not.toContain('EMAIL_FROM')
  })

  it('exposes stable public-facts helpers for reusable product copy', () => {
    expect(getProductFacts()).toMatchObject({
      name: 'Lextract',
      fieldCount: 126,
      redFlagCount: 20,
      categoryCount: PUBLIC_KNOWLEDGE.marketing.product.categoryCount,
    })
    expect(getPricingFacts().pack5.display).toBe('$65 for 5 credits ($13 each)')
    expect(getPricingFacts().pack10.display).toBe('$120 for 10 credits ($12 each)')
    expect(getProcessingFacts().range).toBe('5-15 minutes')
    expect(getContactEmail('founderSales')).toBe('angel.campa@lextract.io')
    expect(getLeadMagnetPublicFacts('lease-audit-workbook')).toMatchObject({
      title: 'Lease Audit Workbook',
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    // This intentionally bypasses the slug union to exercise the runtime guard.
    const invalidSlug = 'unknown' as Parameters<typeof getLeadMagnetPublicFacts>[0]
    expect(() => getLeadMagnetPublicFacts(invalidSlug)).toThrow(
      'Unknown public lead magnet: unknown',
    )
  })

  it('rounds public pricing fact displays up to whole dollars', () => {
    expect(formatPublicPricingOffer({ price: 64.01, credits: 5, perLease: 12.01 })).toBe(
      '$65 for 5 credits ($13 each)',
    )
  })
})
