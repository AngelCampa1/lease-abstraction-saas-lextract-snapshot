import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import type { Plugin } from 'vite'
import { AI_CS_VENDOR_SPECIFIER, hasAiCsVendor } from './lib/vendor-modules'

// Mirrors the alias in next.config.ts: the private `@ventora/ai-cs` package is
// optional, so fall back to the local stub when it is not installed.
const aiCsAlias: Record<string, string> = hasAiCsVendor(__dirname)
  ? {}
  : { [AI_CS_VENDOR_SPECIFIER]: path.resolve(__dirname, './components/ai-cs/vendor-stub.tsx') }

const htmlTextModulePlugin: Plugin = {
  name: 'html-text-module',
  enforce: 'pre',
  transform(code, id) {
    if (!id.endsWith('.html')) {
      return null
    }
    return {
      code: `export default ${JSON.stringify(code)}`,
      map: null,
    }
  },
}

export default defineConfig({
  plugins: [react(), htmlTextModulePlugin],
  test: {
    environment: 'jsdom',
    globals: true,
    pool: 'threads',
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 15000,
    exclude: [
      '**/node_modules/**',
      '**/.git/**',
      '**/.next/**',
      '**/.open-next/**',
      '**/.wrangler/**',
      '**/coverage/**',
      '**/dist/**',
      '**/build/**',
    ],
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: [
        'components/ui/**',
        'components/providers.tsx',
        'app/**',
        'types/**',
        'node_modules/**',
        'test/**',
        '__tests__/**',
        '.next/**',
      ],
      thresholds: {
        perFile: false,
        lines: 88,
        functions: 80,
        branches: 80.3,
        statements: 85.6,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      ...aiCsAlias,
    },
  },
})
