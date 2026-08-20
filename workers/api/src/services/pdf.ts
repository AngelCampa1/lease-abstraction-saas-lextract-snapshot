export const MAX_PDF_SIZE_BYTES = 50 * 1024 * 1024
export const MAX_PDF_PAGES = 500

export interface PdfValidationInput {
  bytes: ArrayBuffer
  contentType: string | null
}

export interface PdfValidationResult {
  pageCount: number | null
}

export class PdfValidationError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 422 = 400,
  ) {
    super(message)
    this.name = 'PdfValidationError'
  }
}

function normalizedContentType(contentType: string | null): string {
  return (contentType ?? '').split(';', 1)[0]?.trim().toLowerCase() ?? ''
}

function hasPdfMagic(bytes: ArrayBuffer): boolean {
  const header = new TextDecoder().decode(bytes.slice(0, 5))
  return header.startsWith('%PDF-')
}

function estimatePageCount(bytes: ArrayBuffer): number | null {
  const text = new TextDecoder('latin1').decode(bytes)
  const matches = text.match(/\/Type\s*\/Page\b/g)
  return matches?.length ?? null
}

export async function validatePdfUpload(
  input: PdfValidationInput,
): Promise<PdfValidationResult> {
  const contentType = normalizedContentType(input.contentType)
  if (contentType !== 'application/pdf' && contentType !== 'application/x-pdf') {
    throw new PdfValidationError(
      `Invalid file type: ${input.contentType ?? 'unknown'}. Only PDF files are accepted.`,
    )
  }

  if (input.bytes.byteLength > MAX_PDF_SIZE_BYTES) {
    throw new PdfValidationError('File exceeds the maximum size limit of 50 MB.')
  }

  if (!hasPdfMagic(input.bytes)) {
    throw new PdfValidationError('Invalid file: not a valid PDF document.')
  }

  const pageCount = estimatePageCount(input.bytes)
  if (pageCount !== null && pageCount > MAX_PDF_PAGES) {
    throw new PdfValidationError(
      `PDF has ${pageCount} pages, which exceeds the ${MAX_PDF_PAGES}-page limit. Please split the document and upload each section separately.`,
      422,
    )
  }

  return { pageCount }
}
