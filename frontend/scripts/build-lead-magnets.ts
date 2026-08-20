import path from 'path'
import fs from 'fs'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'

// Import PDF documents
import LeaseAbstractionChecklist from '../content/lead-magnets/lease-abstraction-checklist'
import CamReconChecklist from '../content/lead-magnets/cam-reconciliation-checklist'
import DueDiligenceChecklist from '../content/lead-magnets/due-diligence-checklist'
import { buildLeaseAuditWorkbook } from '../content/lead-magnets/lease-audit-workbook'
import { getLeadMagnet } from '../data/lead-magnets'

const OUT_DIR = path.join(process.cwd(), 'public', 'lead-magnets')
fs.mkdirSync(OUT_DIR, { recursive: true })

async function buildPdfs(): Promise<void> {
  const docs: Array<{ component: React.ComponentType; filename: string }> = [
    {
      component: LeaseAbstractionChecklist,
      filename: getLeadMagnet('lease-abstraction-checklist')?.r2ObjectKey ?? '',
    },
    {
      component: CamReconChecklist,
      filename: getLeadMagnet('cam-reconciliation-checklist')?.r2ObjectKey ?? '',
    },
    {
      component: DueDiligenceChecklist,
      filename: getLeadMagnet('due-diligence-checklist')?.r2ObjectKey ?? '',
    },
  ]

  for (const { component, filename } of docs) {
    if (!filename) throw new Error('Missing lead magnet filename in registry')
    console.log(`Building ${filename}...`)
    const buffer = await renderToBuffer(React.createElement(component))
    fs.writeFileSync(path.join(OUT_DIR, filename), buffer)
    console.log(`  ✓ ${filename} (${(buffer.length / 1024).toFixed(0)}KB)`)
  }

  console.log('Building lease-audit-workbook...')
  const workbookBuffer = await buildLeaseAuditWorkbook()
  const workbookFilename = getLeadMagnet('lease-audit-workbook')?.r2ObjectKey
  if (!workbookFilename) throw new Error('Missing workbook filename in registry')
  fs.writeFileSync(path.join(OUT_DIR, workbookFilename), workbookBuffer)
  const xlsxKb = (workbookBuffer.length / 1024).toFixed(0)
  console.log(`  ✓ ${workbookFilename} (${xlsxKb}KB)`)

  console.log('\nAll lead magnet assets built successfully.')
}

buildPdfs().catch((err: unknown) => {
  console.error('Build failed:', err)
  process.exit(1)
})
