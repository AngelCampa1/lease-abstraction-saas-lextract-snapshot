/**
 * Patches the Turbopack runtime in the Next.js build output (.next/) to inline
 * [root-of-the-server] and other server chunks BEFORE opennextjs-cloudflare
 * bundles the server function.
 *
 * On Windows, Next.js's file-tracing step fails with EINVAL for filenames
 * containing square brackets, so OpenNext's built-in patchTurbopackRuntime
 * gets an empty tracedFiles list and generates an empty switch. This script
 * fills it in by patching the source runtime before the OpenNext build runs,
 * so esbuild sees the require() calls and resolves them in the correct context.
 *
 * Usage: run AFTER `next build` and BEFORE `opennextjs-cloudflare build`.
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root = join(__dirname, '..')

const chunksDir = join(root, '.next/server/chunks')
const runtimePath = join(chunksDir, '[turbopack]_runtime.js')

// Collect all .js chunk files in the same directory (excluding the runtime itself)
const chunkFiles = readdirSync(chunksDir)
  .filter((f) => f.endsWith('.js') && !f.includes('[turbopack]_runtime'))
  .map((f) => {
    const requirePath = join(root, '.next/server/chunks', f).replace(/\\/g, '/')
    const chunkKey = 'server/chunks/' + f
    return { chunkKey, requirePath }
  })

console.log(`[patch-turbopack-chunks] Found ${chunkFiles.length} chunks to inline.`)

let runtime = readFileSync(runtimePath, 'utf8')

if (!runtime.includes('function requireChunk')) {
  console.log('[patch-turbopack-chunks] No requireChunk stub found — patch not needed.')
  process.exit(0)
}

// Check if already patched (has real cases)
if (!runtime.includes('function requireChunk(chunkPath){\n    switch') &&
    !runtime.includes("function requireChunk(chunkPath) {\n    switch")) {
  // Build the switch body using absolute paths so resolution is unambiguous
  const switchCases = chunkFiles
    .map(({ chunkKey, requirePath }) =>
      `      case "${chunkKey}": return require("${requirePath}");`)
    .join('\n')

  const replacement = `  function requireChunk(chunkPath) {
    switch(chunkPath) {
${switchCases}
      default:
        throw new Error(\`Not found \${chunkPath}\`);
    }
  }`

  const patched = runtime.replace(
    /function requireChunk\(chunkPath\)\s*\{[^}]*\}/,
    replacement,
  )

  if (patched === runtime) {
    console.error('[patch-turbopack-chunks] Pattern not matched. Trying alternate pattern.')
    // Try to find the empty switch form from OpenNext's earlier patch pass
    const patchedAlt = runtime.replace(
      /function requireChunk\(chunkPath\) \{\s*switch\(chunkPath\) \{\s*\n\s*default:\s*\n\s*throw new Error\(`Not found \$\{chunkPath\}`\);\s*\}\s*\}/,
      replacement,
    )
    if (patchedAlt === runtime) {
      console.error('[patch-turbopack-chunks] Both patterns failed — inspect runtime manually.')
      const idx = runtime.indexOf('function requireChunk')
      console.error(runtime.slice(idx, idx + 400))
      process.exit(1)
    }
    writeFileSync(runtimePath, patchedAlt, 'utf8')
  } else {
    writeFileSync(runtimePath, patched, 'utf8')
  }

  console.log(`[patch-turbopack-chunks] Patched ${runtimePath}`)
} else {
  console.log('[patch-turbopack-chunks] Already patched — skipping.')
}
