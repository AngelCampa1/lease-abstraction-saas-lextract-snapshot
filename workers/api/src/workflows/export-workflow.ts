import { WorkflowEntrypoint } from 'cloudflare:workers'
import type { WorkflowEvent, WorkflowStep } from 'cloudflare:workers'

import { exportKey } from '../domain/object-keys'
import { getExtraction, extractionOwnerStorageId } from '../repositories/extractions'
import { createStorage } from '../services/storage'
import type { OwnerStorageInput } from '../domain/object-keys'
import type { ExtractionRecord } from '../repositories/extractions'
import type { Env } from '../types'

export type ExportFormat = 'docx' | 'xlsx' | 'pdf'

export interface ExportWorkflowInput {
  extractionId: string
  owner: OwnerStorageInput
  format: ExportFormat
  template: string
  taskId: string
  version: string
}

export interface GeneratedExportDocument {
  bytes: Uint8Array
  contentType: string
  extension: string
}

const DOCX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const PDF_CONTENT_TYPE = 'application/pdf'
const textEncoder = new TextEncoder()

function xmlEscape(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function displayValue(value: unknown): string {
  if (
    typeof value === 'object' &&
    value !== null &&
    'value' in value
  ) {
    return displayValue((value as { value: unknown }).value)
  }
  if (Array.isArray(value)) {
    return value.map(displayValue).join('; ')
  }
  return value === null || value === undefined ? '' : String(value)
}

function tableRows(record: ExtractionRecord): readonly [string, string][] {
  return Object.entries(record.extractedData ?? {}).map(([fieldName, value]) => [
    fieldName,
    displayValue(value),
  ])
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function writeUint16(output: number[], value: number): void {
  output.push(value & 0xff, (value >>> 8) & 0xff)
}

function writeUint32(output: number[], value: number): void {
  output.push(
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  )
}

function zip(entries: readonly { name: string; content: string }[]): Uint8Array {
  const encoder = new TextEncoder()
  const output: number[] = []
  const centralDirectory: number[] = []

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name)
    const contentBytes = encoder.encode(entry.content)
    const checksum = crc32(contentBytes)
    const offset = output.length

    writeUint32(output, 0x04034b50)
    writeUint16(output, 20)
    writeUint16(output, 0)
    writeUint16(output, 0)
    writeUint16(output, 0)
    writeUint16(output, 0)
    writeUint32(output, checksum)
    writeUint32(output, contentBytes.length)
    writeUint32(output, contentBytes.length)
    writeUint16(output, nameBytes.length)
    writeUint16(output, 0)
    output.push(...nameBytes, ...contentBytes)

    writeUint32(centralDirectory, 0x02014b50)
    writeUint16(centralDirectory, 20)
    writeUint16(centralDirectory, 20)
    writeUint16(centralDirectory, 0)
    writeUint16(centralDirectory, 0)
    writeUint16(centralDirectory, 0)
    writeUint16(centralDirectory, 0)
    writeUint32(centralDirectory, checksum)
    writeUint32(centralDirectory, contentBytes.length)
    writeUint32(centralDirectory, contentBytes.length)
    writeUint16(centralDirectory, nameBytes.length)
    writeUint16(centralDirectory, 0)
    writeUint16(centralDirectory, 0)
    writeUint16(centralDirectory, 0)
    writeUint16(centralDirectory, 0)
    writeUint32(centralDirectory, 0)
    writeUint32(centralDirectory, offset)
    centralDirectory.push(...nameBytes)
  }

  const centralOffset = output.length
  output.push(...centralDirectory)
  writeUint32(output, 0x06054b50)
  writeUint16(output, 0)
  writeUint16(output, 0)
  writeUint16(output, entries.length)
  writeUint16(output, entries.length)
  writeUint32(output, centralDirectory.length)
  writeUint32(output, centralOffset)
  writeUint16(output, 0)

  return new Uint8Array(output)
}

function docxDocument(record: ExtractionRecord): string {
  const rows = tableRows(record)
    .map(
      ([field, value]) =>
        `<w:p><w:r><w:t>${xmlEscape(field)}: ${xmlEscape(value)}</w:t></w:r></w:p>`,
    )
    .join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Lease Abstraction Report</w:t></w:r></w:p>
    <w:p><w:r><w:t>${xmlEscape(record.documentFilename)}</w:t></w:r></w:p>
    ${rows}
  </w:body>
</w:document>`
}

function generateDocx(record: ExtractionRecord): Uint8Array {
  return zip([
    {
      name: '[Content_Types].xml',
      content:
        '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    },
    {
      name: '_rels/.rels',
      content:
        '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    },
    { name: 'word/document.xml', content: docxDocument(record) },
  ])
}

function generateXlsx(record: ExtractionRecord): Uint8Array {
  const rows = [
    '<row r="1"><c r="A1" t="inlineStr"><is><t>Field</t></is></c><c r="B1" t="inlineStr"><is><t>Value</t></is></c></row>',
    ...tableRows(record).map(
      ([field, value], index) =>
        `<row r="${index + 2}"><c r="A${index + 2}" t="inlineStr"><is><t>${xmlEscape(
          field,
        )}</t></is></c><c r="B${index + 2}" t="inlineStr"><is><t>${xmlEscape(
          value,
        )}</t></is></c></row>`,
    ),
  ].join('')
  return zip([
    {
      name: '[Content_Types].xml',
      content:
        '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    },
    {
      name: '_rels/.rels',
      content:
        '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    },
    {
      name: 'xl/workbook.xml',
      content:
        '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Summary" sheetId="1" r:id="rId1"/></sheets></workbook>',
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content:
        '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    },
    {
      name: 'xl/worksheets/sheet1.xml',
      content: `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`,
    },
  ])
}

function byteLength(value: string): number {
  return textEncoder.encode(value).length
}

function pdfEscape(value: string): string {
  return value
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function generatePdf(record: ExtractionRecord): Uint8Array {
  const rows = [
    'Lease Abstraction Report',
    record.documentFilename,
    ...tableRows(record).map(([field, value]) => `${field}: ${value}`),
  ].slice(0, 44)
  const text = rows
    .map((line, index) => `BT /F1 10 Tf 50 ${760 - index * 16} Td (${pdfEscape(line)}) Tj ET`)
    .join('\n')
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n',
    `5 0 obj << /Length ${byteLength(text)} >> stream\n${text}\nendstream endobj\n`,
  ]
  let offset = byteLength('%PDF-1.4\n')
  const offsets = [0]
  for (const object of objects) {
    offsets.push(offset)
    offset += byteLength(object)
  }
  const xrefOffset = offset
  const xref = [
    'xref\n',
    `0 ${objects.length + 1}\n`,
    '0000000000 65535 f \n',
    ...offsets.slice(1).map((value) => `${String(value).padStart(10, '0')} 00000 n \n`),
    `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\n`,
    `startxref\n${xrefOffset}\n%%EOF\n`,
  ].join('')
  return textEncoder.encode(`%PDF-1.4\n${objects.join('')}${xref}`)
}

export function generateExportDocument(input: {
  record: ExtractionRecord
  format: ExportFormat
  template: string
}): GeneratedExportDocument {
  if (input.format === 'docx') {
    return { bytes: generateDocx(input.record), contentType: DOCX_CONTENT_TYPE, extension: 'docx' }
  }
  if (input.format === 'xlsx') {
    return { bytes: generateXlsx(input.record), contentType: XLSX_CONTENT_TYPE, extension: 'xlsx' }
  }
  return { bytes: generatePdf(input.record), contentType: PDF_CONTENT_TYPE, extension: 'pdf' }
}

export async function runExportWorkflow(
  input: ExportWorkflowInput,
  _step: WorkflowStep,
  env: Env,
): Promise<{ taskId: string; status: 'complete'; objectKey: string }> {
  const record = await getExtraction(input.extractionId, input.owner, env)
  if (record === null || record.paymentStatus !== 'paid') {
    throw new Error('Export extraction not found')
  }
  const generated = generateExportDocument({
    format: input.format,
    record,
    template: input.template,
  })
  const objectKey = exportKey({
    extension: generated.extension,
    extractionId: input.extractionId,
    format: `${input.template}-${input.version}`,
    ownerId: extractionOwnerStorageId(input.owner),
  })
  await createStorage(env).putObject(objectKey, generated.bytes, generated.contentType)
  return { objectKey, status: 'complete', taskId: input.taskId }
}

export class ExportWorkflow extends WorkflowEntrypoint<Env, ExportWorkflowInput> {
  override async run(
    event: WorkflowEvent<ExportWorkflowInput>,
    step: WorkflowStep,
  ): Promise<{ taskId: string; status: 'complete'; objectKey: string }> {
    return step.do('generate export', () =>
      runExportWorkflow(event.payload, step, this.env),
    )
  }
}
