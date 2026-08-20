import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'

import { AI_CS_STUB_PATH, AI_CS_VENDOR_SPECIFIER, hasAiCsVendor } from './vendor-modules'

const created: string[] = []

function makeProjectRoot(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'vendor-modules-'))
  created.push(dir)
  return dir
}

afterEach(() => {
  while (created.length > 0) {
    const dir = created.pop()
    if (dir !== undefined) rmSync(dir, { force: true, recursive: true })
  }
})

describe('hasAiCsVendor', () => {
  it('reports false when node_modules does not exist at all', () => {
    expect(hasAiCsVendor(makeProjectRoot())).toBe(false)
  })

  it('reports true once the package manifest is present', () => {
    const root = makeProjectRoot()
    const pkgDir = path.join(root, 'node_modules', '@ventora', 'ai-cs')
    mkdirSync(pkgDir, { recursive: true })
    writeFileSync(path.join(pkgDir, 'package.json'), '{"name":"@ventora/ai-cs"}')

    expect(hasAiCsVendor(root)).toBe(true)
  })

  // npm leaves an empty scope directory behind in some failed/partial installs.
  // Treating that as "installed" would alias the specifier to the real package
  // and break the build, so the probe checks for the manifest specifically.
  it('reports false when the package directory exists but has no manifest', () => {
    const root = makeProjectRoot()
    mkdirSync(path.join(root, 'node_modules', '@ventora', 'ai-cs'), { recursive: true })

    expect(hasAiCsVendor(root)).toBe(false)
  })
})

describe('alias constants', () => {
  it('names the specifier the app imports the widget from', () => {
    expect(AI_CS_VENDOR_SPECIFIER).toBe('@ventora/ai-cs/react')
  })

  it('points the stub path at a real file relative to the frontend root', () => {
    expect(AI_CS_STUB_PATH).toBe('./components/ai-cs/vendor-stub.tsx')
    expect(hasAiCsVendor(path.resolve(__dirname, '..'))).toBe(true)
  })
})
