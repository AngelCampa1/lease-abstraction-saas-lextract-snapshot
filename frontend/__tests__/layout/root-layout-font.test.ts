/** @vitest-environment node */
import fs from 'fs'
import path from 'path'

import { describe, expect, it } from 'vitest'

const frontendRoot = path.resolve(__dirname, '../..')

function readFrontendFile(relativePath: string): string {
  return fs.readFileSync(path.join(frontendRoot, relativePath), 'utf8')
}

describe('root layout font loading', () => {
  it('applies the sans font family at the root body without preloading route-late fonts', () => {
    const layout = readFrontendFile('app/layout.tsx')

    expect(layout).not.toContain('preload: true')
    expect(layout).toMatch(/<body[^>]*className=\{`[^`]*font-sans/)
  })
})
