import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { PUBLIC_KNOWLEDGE, validatePublicKnowledge } from '../data/public-knowledge'

const frontendRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(frontendRoot, '..')

const OUTPUT_PATHS = [
  path.join(frontendRoot, 'public', 'knowledge', 'lextract-public-knowledge.json'),
  path.join(repoRoot, 'backend', 'app', 'services', 'public_knowledge.generated.json'),
  path.join(repoRoot, 'workers', 'marketing-data', 'src', 'public-knowledge.generated.json'),
]

const errors = validatePublicKnowledge(PUBLIC_KNOWLEDGE)
if (errors.length > 0) {
  throw new Error(`Public knowledge validation failed:\n${errors.join('\n')}`)
}

const json = `${JSON.stringify(PUBLIC_KNOWLEDGE, null, 2)}\n`

for (const outputPath of OUTPUT_PATHS) {
  mkdirSync(path.dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, json, 'utf-8')
}

console.log(`Generated public knowledge JSON in ${OUTPUT_PATHS.length} locations.`)
