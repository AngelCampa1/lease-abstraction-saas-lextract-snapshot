import fs from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const routeSpecs = [
  { route: '/', htmlCandidates: ['index.html'] },
  { route: '/pricing', htmlCandidates: ['pricing.html', 'pricing/index.html'] },
  {
    route: '/sample-report',
    htmlCandidates: ['sample-report.html', 'sample-report/index.html'],
  },
  { route: '/upload', htmlCandidates: ['upload.html', 'upload/index.html'] },
]

const htmlRoots = [
  path.join(projectRoot, '.next', 'server', 'app'),
  path.join(projectRoot, '.open-next', 'server-functions', 'default', '.next', 'server', 'app'),
]

const assetRoots = [
  path.join(projectRoot, '.next', 'static'),
  path.join(projectRoot, '.open-next', 'assets', '_next', 'static'),
]

function findFirstExistingPath(candidates) {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }
  return null
}

function readRouteHtml(routeSpec) {
  const candidates = []
  for (const root of htmlRoots) {
    for (const relativePath of routeSpec.htmlCandidates) {
      candidates.push(path.join(root, relativePath))
    }
  }

  const resolvedPath = findFirstExistingPath(candidates)
  if (!resolvedPath) {
    throw new Error(
      `Could not find prerendered HTML for ${routeSpec.route}. Checked:\n${candidates.join('\n')}`,
    )
  }

  return fs.readFileSync(resolvedPath, 'utf8')
}

function extractStaticAssets(html) {
  const assetPaths = new Set()
  const regex = /\/_next\/static\/[^"')\s>]+/g
  for (const match of html.matchAll(regex)) {
    assetPaths.add(match[0])
  }
  return [...assetPaths]
}

function assertAssetExists(assetPath) {
  const relativeAssetPath = assetPath.replace('/_next/static/', '')
  const candidates = assetRoots.map((root) => path.join(root, relativeAssetPath))
  const resolvedPath = findFirstExistingPath(candidates)

  if (!resolvedPath) {
    throw new Error(
      `Missing built asset ${assetPath}. Checked:\n${candidates.join('\n')}`,
    )
  }
}

for (const routeSpec of routeSpecs) {
  const html = readRouteHtml(routeSpec)
  const assetPaths = extractStaticAssets(html)

  if (assetPaths.length === 0) {
    throw new Error(`No /_next/static assets found in prerendered HTML for ${routeSpec.route}`)
  }

  for (const assetPath of assetPaths) {
    assertAssetExists(assetPath)
  }

  console.log(`[asset-integrity] ${routeSpec.route}: verified ${assetPaths.length} assets`)
}

console.log('[asset-integrity] All checked routes reference live static assets')
