/** @vitest-environment node */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'

const LEAD_MAGNET_DIR = join('public', 'lead-magnets')
const PDF_ASSETS = [
  'lease-abstraction-checklist-v3.pdf',
  'cam-reconciliation-checklist-v3.pdf',
  'due-diligence-checklist-v3.pdf',
]
const XLSX_ASSETS = ['lease-audit-workbook-v3.xlsx']
const BLOCKED_PATTERNS: Array<string | RegExp> = [
  '—',
  '$10 per lease',
  '$10/lease',
  '$20 per lease',
  '$20/lease',
  '$37.50',
  '$7.50 per lease',
  '$7.50/lease',
  /\$1[0-9]\.\d{1,2}\s*(?:per\s+lease|\/lease)/i,
]

async function extractPdfText(path: string): Promise<string> {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const document = await getDocument({
    data: new Uint8Array(readFileSync(path)),
    disableFontFace: true,
    useSystemFonts: true,
  }).promise
  const pages: string[] = []

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber)
    const content = await page.getTextContent()
    pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '))
  }

  return pages.join('\n')
}

async function extractWorkbookText(path: string): Promise<string> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(path)
  const text: string[] = [
    workbook.title,
    workbook.subject,
    workbook.description,
    workbook.company,
  ].filter((value): value is string => typeof value === 'string')

  for (const worksheet of workbook.worksheets) {
    text.push(worksheet.name)
    worksheet.eachRow((row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        if (cell.value !== null && cell.value !== undefined) {
          text.push(String(cell.text || cell.value))
        }
      })
    })
  }

  return text.join('\n')
}

function findBlockedPatterns(path: string, text: string): string[] {
  return BLOCKED_PATTERNS.flatMap((pattern) => {
    if (typeof pattern === 'string') {
      return text.includes(pattern) ? [`${path}: ${pattern}`] : []
    }
    const found = text.match(pattern)
    return found ? [`${path}: ${found[0]}`] : []
  })
}

describe('public lead magnet assets', () => {
  it('does not publish em dashes or stale Lextract prices in generated PDFs', async () => {
    const matches = (
      await Promise.all(
        PDF_ASSETS.map(async (asset) => {
          const path = join(LEAD_MAGNET_DIR, asset)
          return findBlockedPatterns(path, await extractPdfText(path))
        }),
      )
    ).flat()

    expect(matches).toEqual([])
  })

  it('does not publish em dashes or stale Lextract prices in generated workbooks', async () => {
    const matches = (
      await Promise.all(
        XLSX_ASSETS.map(async (asset) => {
          const path = join(LEAD_MAGNET_DIR, asset)
          return findBlockedPatterns(path, await extractWorkbookText(path))
        }),
      )
    ).flat()

    expect(matches).toEqual([])
  })
})
