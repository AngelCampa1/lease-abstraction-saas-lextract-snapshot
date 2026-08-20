const ROOT_PREFIX = 'lextract-documents'
const SAFE_SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

export interface ExtractionObjectKeyInput {
  ownerId: string
  extractionId: string
}

export interface ExportObjectKeyInput extends ExtractionObjectKeyInput {
  format: string
  extension: string
}

export interface RawExtractionPassKeyInput extends ExtractionObjectKeyInput {
  passKind: string
  model: string
}

export type OwnerStorageInput =
  | { kind: 'user'; userId: string }
  | { kind: 'anonymous'; sessionId: string }

function assertSafeSegment(segment: string): string {
  if (
    segment.length === 0 ||
    segment === '.' ||
    segment === '..' ||
    segment.includes('/') ||
    segment.includes('\\') ||
    segment.includes('..') ||
    /[\u0000-\u001F\u007F]/u.test(segment) ||
    !SAFE_SEGMENT_PATTERN.test(segment)
  ) {
    throw new Error('Unsafe storage segment')
  }

  return segment
}

export function ownerStorageId(input: OwnerStorageInput): string {
  if (input.kind === 'user') {
    return assertSafeSegment(input.userId)
  }

  return `anon/${assertSafeSegment(input.sessionId)}`
}

function safeOwnerPath(ownerId: string): string {
  const segments = ownerId.split('/')
  if (segments.length === 1) {
    return assertSafeSegment(ownerId)
  }

  if (segments.length === 2 && segments[0] === 'anon') {
    return `anon/${assertSafeSegment(segments[1] ?? '')}`
  }

  throw new Error('Unsafe storage segment')
}

export function extractionPrefix(input: ExtractionObjectKeyInput): string {
  return `${ROOT_PREFIX}/${safeOwnerPath(input.ownerId)}/${assertSafeSegment(
    input.extractionId,
  )}/`
}

export function documentKey(input: ExtractionObjectKeyInput): string {
  return `${extractionPrefix(input)}original.pdf`
}

export function exportPrefix(input: ExtractionObjectKeyInput): string {
  return `${extractionPrefix(input)}exports/`
}

export function exportKey(input: ExportObjectKeyInput): string {
  return `${exportPrefix(input)}${assertSafeSegment(input.format)}.${assertSafeSegment(
    input.extension,
  )}`
}

export function rawExtractionPassKey(
  input: RawExtractionPassKeyInput,
): string {
  return `${extractionPrefix(input)}raw/${assertSafeSegment(
    input.passKind,
  )}-${assertSafeSegment(input.model)}.json`
}
