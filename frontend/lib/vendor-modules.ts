import { existsSync } from 'fs'
import path from 'path'

/**
 * Whether the private `@ventora/ai-cs` package is installed.
 *
 * It lives on a private registry, is declared as an optional dependency, and is
 * therefore simply absent from any install that cannot authenticate. Both
 * `next.config.ts` and `vitest.config.ts` call this to decide whether to alias
 * `@ventora/ai-cs/react` to `components/ai-cs/vendor-stub.tsx`.
 *
 * Checked via the filesystem rather than `require.resolve` so it behaves the
 * same in the ESM config loaders Next and Vite use.
 */
export function hasAiCsVendor(projectRoot: string): boolean {
  return existsSync(path.join(projectRoot, 'node_modules', '@ventora', 'ai-cs', 'package.json'))
}

/** Module specifier the app imports the support widget from. */
export const AI_CS_VENDOR_SPECIFIER = '@ventora/ai-cs/react'

/** Path, relative to the frontend root, of the stub used when the vendor is absent. */
export const AI_CS_STUB_PATH = './components/ai-cs/vendor-stub.tsx'
