import { describe, expect, it } from 'vitest'

import {
  MAX_PDF_SIZE_BYTES,
  PdfValidationError,
  validatePdfUpload,
} from '../services/pdf'

function pdfBytes(body: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(`%PDF-1.7
${body}
%%EOF`)
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

describe('pdf upload validation', () => {
  it('accepts PDFs and returns the estimated page count', async () => {
    await expect(
      validatePdfUpload({
        bytes: pdfBytes('/Type /Page\n/Type /Page'),
        contentType: 'application/pdf; charset=utf-8',
      }),
    ).resolves.toEqual({ pageCount: 2 })

    await expect(
      validatePdfUpload({
        bytes: pdfBytes('catalog only'),
        contentType: 'application/x-pdf',
      }),
    ).resolves.toEqual({ pageCount: null })
  })

  it('rejects non-PDF content types, oversized files, and invalid magic bytes', async () => {
    await expect(
      validatePdfUpload({
        bytes: pdfBytes('/Type /Page'),
        contentType: 'text/plain',
      }),
    ).rejects.toMatchObject({
      message: 'Invalid file type: text/plain. Only PDF files are accepted.',
      status: 400,
    } satisfies Partial<PdfValidationError>)

    await expect(
      validatePdfUpload({
        bytes: new ArrayBuffer(MAX_PDF_SIZE_BYTES + 1),
        contentType: 'application/pdf',
      }),
    ).rejects.toMatchObject({
      message: 'File exceeds the maximum size limit of 50 MB.',
      status: 400,
    } satisfies Partial<PdfValidationError>)

    await expect(
      validatePdfUpload({
        bytes: new TextEncoder().encode('not a pdf').buffer,
        contentType: 'application/pdf',
      }),
    ).rejects.toMatchObject({
      message: 'Invalid file: not a valid PDF document.',
      status: 400,
    } satisfies Partial<PdfValidationError>)
  })

  it('rejects PDFs over the page limit with a 422-compatible error', async () => {
    const body = Array.from({ length: 501 }, () => '/Type /Page').join('\n')

    await expect(
      validatePdfUpload({
        bytes: pdfBytes(body),
        contentType: 'application/pdf',
      }),
    ).rejects.toMatchObject({
      message:
        'PDF has 501 pages, which exceeds the 500-page limit. Please split the document and upload each section separately.',
      status: 422,
    } satisfies Partial<PdfValidationError>)
  })
})
