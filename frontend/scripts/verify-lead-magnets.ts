import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFileSync } from 'child_process'
import ExcelJS from 'exceljs'
import {
  LEAD_MAGNETS_BUCKET,
  PROMOTED_LEAD_MAGNETS,
} from '../data/lead-magnets'

const ROOT_DIR = process.cwd()
const BACKEND_NURTURE_DIR = path.join(
  ROOT_DIR,
  '..',
  'backend',
  'app',
  'services',
  'email_templates',
  'nurture',
)

function countPdfPages(buffer: Buffer): number {
  const body = buffer.toString('latin1')
  const matches = body.match(/\/Type\s*\/Page\b/g)
  return matches?.length ?? 0
}

function runNpx(args: string[]): void {
  if (process.platform === 'win32') {
    execFileSync('cmd.exe', ['/d', '/s', '/c', 'npx', ...args], {
      stdio: 'pipe',
    })
    return
  }

  execFileSync('npx', args, { stdio: 'pipe' })
}

async function countWorkbookSheets(filePath: string): Promise<number> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)
  return workbook.worksheets.length
}

async function verifyRemoteR2Object(
  magnet: (typeof PROMOTED_LEAD_MAGNETS)[number],
  failures: string[],
): Promise<void> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lead-magnet-r2-'))
  const remotePath = path.join(tempDir, path.basename(magnet.r2ObjectKey))

  try {
    runNpx([
      'wrangler',
      'r2',
      'object',
      'get',
      `${LEAD_MAGNETS_BUCKET}/${magnet.r2ObjectKey}`,
      '--file',
      remotePath,
      '--remote',
    ])

    const remoteBuffer = fs.readFileSync(remotePath)
    if (remoteBuffer.byteLength < magnet.minimumBytes) {
      failures.push(
        `${magnet.slug}: R2 object is ${remoteBuffer.byteLength} bytes; expected at least ${magnet.minimumBytes}`,
      )
    }

    if (magnet.fileFormat === 'PDF') {
      if (!remoteBuffer.subarray(0, 4).equals(Buffer.from('%PDF'))) {
        failures.push(`${magnet.slug}: R2 PDF object does not start with %PDF`)
      }
      const pages = countPdfPages(remoteBuffer)
      if (pages < (magnet.minimumPages ?? 0)) {
        failures.push(
          `${magnet.slug}: R2 PDF has ${pages} pages; expected at least ${magnet.minimumPages}`,
        )
      }
    } else {
      const sheets = await countWorkbookSheets(remotePath)
      if (sheets < (magnet.minimumSheets ?? 0)) {
        failures.push(
          `${magnet.slug}: R2 workbook has ${sheets} sheets; expected at least ${magnet.minimumSheets}`,
        )
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    failures.push(
      `${magnet.slug}: R2 object ${magnet.r2ObjectKey} could not be fetched from ${LEAD_MAGNETS_BUCKET}: ${message}`,
    )
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

async function verify(): Promise<void> {
  const failures: string[] = []

  for (const magnet of PROMOTED_LEAD_MAGNETS) {
    const assetPath = path.join(ROOT_DIR, magnet.localAssetPath)

    if (magnet.r2ObjectKey.trim().length === 0) {
      failures.push(`${magnet.slug}: missing R2 object key for ${LEAD_MAGNETS_BUCKET}`)
    }

    if (!fs.existsSync(assetPath)) {
      failures.push(`${magnet.slug}: missing local asset ${magnet.localAssetPath}`)
      continue
    }

    const buffer = fs.readFileSync(assetPath)
    await verifyRemoteR2Object(magnet, failures)

    if (buffer.byteLength < magnet.minimumBytes) {
      failures.push(
        `${magnet.slug}: asset is ${buffer.byteLength} bytes; expected at least ${magnet.minimumBytes}`,
      )
    }

    if (magnet.fileFormat === 'PDF') {
      if (!buffer.subarray(0, 4).equals(Buffer.from('%PDF'))) {
        failures.push(`${magnet.slug}: PDF asset does not start with %PDF`)
      }
      const pages = countPdfPages(buffer)
      if (pages < (magnet.minimumPages ?? 0)) {
        failures.push(
          `${magnet.slug}: PDF has ${pages} pages; expected at least ${magnet.minimumPages}`,
        )
      }
    } else {
      const sheets = await countWorkbookSheets(assetPath)
      if (sheets < (magnet.minimumSheets ?? 0)) {
        failures.push(
          `${magnet.slug}: workbook has ${sheets} sheets; expected at least ${magnet.minimumSheets}`,
        )
      }
    }

    const template = path.join(BACKEND_NURTURE_DIR, `${magnet.slug}_step_0.html`)
    if (!fs.existsSync(template)) {
      failures.push(`${magnet.slug}: missing lead magnet delivery template`)
    }
  }

  if (failures.length > 0) {
    throw new Error(`Lead magnet verification failed:\n- ${failures.join('\n- ')}`)
  }

  console.log(
    `Verified ${PROMOTED_LEAD_MAGNETS.length} lead magnets for ${LEAD_MAGNETS_BUCKET}.`,
  )
}

verify().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
