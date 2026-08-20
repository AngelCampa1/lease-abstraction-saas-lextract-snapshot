import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const frontendRoot = process.cwd()
const repoRoot = path.resolve(frontendRoot, '..')

function fileText(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

function frontendSourceFiles(relativeDirectory: string): string[] {
  const absoluteDirectory = path.join(repoRoot, relativeDirectory)
  const ignoredDirectories = new Set([
    '.next',
    '__tests__',
    'coverage',
    'node_modules',
    'public',
  ])
  const sourceExtensions = new Set(['.ts', '.tsx'])
  const files: string[] = []

  for (const entry of readdirSync(absoluteDirectory, { withFileTypes: true })) {
    const relativePath = path.join(relativeDirectory, entry.name)
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...frontendSourceFiles(relativePath))
      }
      continue
    }
    if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) {
      files.push(relativePath)
    }
  }

  return files
}

function apiV1Count(value: string): number {
  return value.match(/\/api\/v1/g)?.length ?? 0
}

function assignedEnvValue(text: string, name: string): string {
  const line = text
    .split(/\r?\n/u)
    .find((entry) => entry.startsWith(`${name}=`))
  if (line === undefined) {
    throw new Error(`Missing ${name}`)
  }
  return line.slice(name.length + 1)
}

describe('frontend API base URL contract', () => {
  it('documents production API base URLs with /api/v1 exactly once', () => {
    const rootValue = assignedEnvValue(fileText('.env.example'), 'NEXT_PUBLIC_API_URL')
    const frontendValue = assignedEnvValue(
      fileText('frontend/.env.example'),
      'NEXT_PUBLIC_API_URL',
    )

    expect(rootValue).toBe('https://api.lextract.io/api/v1')
    expect(frontendValue).toBe('https://api.lextract.io/api/v1')
    expect(apiV1Count(rootValue)).toBe(1)
    expect(apiV1Count(frontendValue)).toBe(1)
  })

  it('keeps local fallback API base URLs on /api/v1 exactly once', () => {
    const localhostFallbacks = ['frontend/app', 'frontend/components', 'frontend/hooks', 'frontend/lib']
      .flatMap((relativeDirectory) => frontendSourceFiles(relativeDirectory))
      .flatMap((relativePath) => {
        const matches = fileText(relativePath).match(/http:\/\/localhost:8000[^'"]*/g) ?? []
        return matches.map((value) => ({ relativePath, value }))
      })

    expect(localhostFallbacks.length).toBeGreaterThan(0)
    for (const fallback of localhostFallbacks) {
      expect(fallback.value, fallback.relativePath).toBe('http://localhost:8000/api/v1')
      expect(apiV1Count(fallback.value), fallback.relativePath).toBe(1)
    }
  })
})
