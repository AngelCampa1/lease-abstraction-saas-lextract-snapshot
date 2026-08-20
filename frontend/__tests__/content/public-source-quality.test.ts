/** @vitest-environment node */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(__dirname, '..', '..', '..')
const frontendRoot = path.join(repoRoot, 'frontend')

const auditedRoots = [
  path.join(frontendRoot, 'app', '(marketing)'),
  path.join(frontendRoot, 'components', 'marketing'),
  path.join(frontendRoot, 'content', 'articles'),
  path.join(frontendRoot, 'content', 'guides'),
  path.join(frontendRoot, 'data'),
  path.join(frontendRoot, 'lib'),
]

const auditedExtensions = new Set(['.ts', '.tsx', '.md', '.mdx'])
const skippedFiles = new Set([
  path.normalize(path.join(frontendRoot, 'lib', 'public-facts.ts')),
])

const unsupportedClaimPatterns: RegExp[] = [
  /\bindustry studies?\b/i,
  /\bstudies suggest\b/i,
  /\bindustry standard(?:s)?\b/i,
  /\baverage overcharges?\b/i,
  /\balmost always pay for themselves\b/i,
  /\btypical recoveries\b/i,
  /\brecoveries that typically run\b/i,
  /\bCAM audit recoveries typically cites\b/i,
  /\bpractical recovery range\b/i,
  /\bmid-single-digit to low-double-digit\b/i,
  /\b10% recovery\b/i,
  /\bovercharges exceeding 10%\b/i,
  /\bfield experience across thousands of CAM audits\b/i,
  /\bThe economics of an audit are favorable\b/i,
  /\bMost tenants\b[^.?!]{0,160}\boverpay CAM expenses\b/i,
  /\b\d{1,3}\s*[-–]\s*\d{1,3}%\s+of commercial tenants\b/i,
  /\b\d{1,3}%\s+to\s+\d{1,3}%\s+of CAM reconciliation statements\b/i,
]

function listAuditedFiles(root: string): string[] {
  if (!existsSync(root)) {
    return []
  }

  const stats = statSync(root)
  if (stats.isFile()) {
    return auditedExtensions.has(path.extname(root)) ? [root] : []
  }

  return readdirSync(root).flatMap((entry) => {
    const fullPath = path.join(root, entry)
    const entryStats = statSync(fullPath)
    if (entryStats.isDirectory()) {
      return listAuditedFiles(fullPath)
    }
    return auditedExtensions.has(path.extname(fullPath)) ? [fullPath] : []
  })
}

describe('public source quality', () => {
  it('does not publish unsupported broad market or source claims', () => {
    const matches = auditedRoots.flatMap((root) =>
      listAuditedFiles(root).flatMap((filePath) => {
        if (skippedFiles.has(path.normalize(filePath))) {
          return []
        }

        const source = readFileSync(filePath, 'utf8').replace(/\s+/g, ' ')
        return unsupportedClaimPatterns.flatMap((pattern) => {
          const found = source.match(pattern)
          return found ? [`${path.relative(repoRoot, filePath)}: ${found[0]}`] : []
        })
      }),
    )

    expect(matches).toEqual([])
  })

  it('does not use em dashes on public source surfaces', () => {
    const matches = auditedRoots.flatMap((root) =>
      listAuditedFiles(root).flatMap((filePath) => {
        const source = readFileSync(filePath, 'utf8')
        return source.includes('—') || source.includes('â€”')
          ? [path.relative(repoRoot, filePath)]
          : []
      }),
    )

    expect(matches).toEqual([])
  })
})
