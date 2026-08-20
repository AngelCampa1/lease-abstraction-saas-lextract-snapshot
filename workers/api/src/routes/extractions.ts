import { Hono } from 'hono'
import type { Context } from 'hono'
import { z } from 'zod'

import { exportKey, extractionPrefix } from '../domain/object-keys'
import type { OwnerStorageInput } from '../domain/object-keys'
import {
  coerceEditedFieldValue,
  editExtractionField,
  extractionOwnerStorageId,
  FieldEditValidationError,
  getExtraction,
  getExtractionById,
  getExtractionEditHistory,
  insertUpload,
  listExtractions,
  markUploadFailed,
  softDeleteExtraction,
} from '../repositories/extractions'
import type {
  ExtractionListInput,
  ExtractionListItem,
  ExtractionListResult,
  ExtractionRecord,
  ExtractionStatus,
  InsertUploadInput,
} from '../repositories/extractions'
import { createAuthMiddleware } from '../middleware/auth'
import { buildExportTaskId } from '../domain/task-status'
import { createStorage } from '../services/storage'
import {
  buildCamAuditPayload,
  buildCamAuditRedirectUrl,
} from '../services/camaudit'
import type { ExportFormat, ExportWorkflowInput } from '../workflows/export-workflow'
import { PdfValidationError, validatePdfUpload } from '../services/pdf'
import type { PdfValidationInput, PdfValidationResult } from '../services/pdf'
import type { AuthContext, AuthDependencies } from '../services/neon-auth'
import type { AppBindings, Env } from '../types'
import { buildLextractRegistry } from '../../../../packages/extract-core/src/index'

const extractionStatuses = [
  'uploading',
  'extracting',
  'scoring',
  'complete',
  'failed',
] as const

const listQuerySchema = z.object({
  date_from: z.string().date().optional(),
  date_to: z.string().date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sort: z.enum(['asc', 'desc']).default('desc'),
  status: z.enum(extractionStatuses).optional(),
})

const TEASER_FIELDS = [
  'landlord_legal_name',
  'tenant_legal_name',
  'premises_address',
  'commencement_date',
  'base_rent_annual',
] as const

const TEASER_BACKFILL_FIELDS = [
  'monthly_base_rent',
  'base_rent_per_rsf',
  'security_deposit_amount',
  'rentable_square_footage',
  'lease_term_months',
  'expiration_date',
  'rent_commencement_date',
  'lease_structure_type',
  'escalation_type',
  'renewal_terms',
  'suite_or_unit_number',
  'property_use_type',
  'governing_law_state',
] as const

const TEMPLATE_PLACEHOLDER_RE = /^\{.*\}$/
const ENUM_TOKEN_RE = /^[a-z]+(?:_[a-z]+)*$/
const DOCUMENT_PROXY_TTL_SECONDS = 3600
const exportFormats = ['docx', 'xlsx', 'pdf'] as const

function isExportFormat(value: string): value is ExportFormat {
  return exportFormats.some((format) => format === value)
}

const fieldEditSchema = z.object({
  field_name: z.string().min(1),
  value: z.unknown(),
})

const editHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const exportBodySchema = z.object({
  template: z.string().min(1).default('commercial'),
})

export type {
  ExtractionListInput,
  ExtractionListResult,
  ExtractionRecord,
  InsertUploadInput,
}

export interface StartExtractionWorkflowInput {
  extractionId: string
}

export interface DeleteExtractionInput {
  extractionId: string
  owner: OwnerStorageInput
}

export interface DeleteExtractionResult {
  alreadyDeleted: boolean
  notFound?: boolean
}

export interface EditFieldInput {
  extractionId: string
  fieldName: string
  value: unknown
  userId: string
}

export interface EditFieldResult {
  extractionId: string
  fieldName: string
  originalValue: unknown
  editedValue: unknown
  redFlags: readonly Record<string, unknown>[]
}

export interface EditHistoryResult {
  edits: readonly {
    id: string
    fieldName: string
    originalValue: unknown
    editedValue: unknown
    editedBy: string
    editedAt: string
  }[]
  total: number
}

export interface StoredObjectResult {
  body: ReadableStream
  contentType?: string
}

export interface ExtractionRouteDependencies {
  authDependencies?: AuthDependencies
  getExtraction(
    extractionId: string,
    owner: OwnerStorageInput,
    env: Env,
  ): Promise<ExtractionRecord | null>
  getExtractionById?(extractionId: string, env: Env): Promise<ExtractionRecord | null>
  listExtractions(
    input: ExtractionListInput,
    env: Env,
  ): Promise<ExtractionListResult>
  insertUpload(input: InsertUploadInput, env: Env): Promise<void>
  markUploadFailed?(
    extractionId: string,
    message: string,
    env: Env,
  ): Promise<void>
  deleteExtraction(
    input: DeleteExtractionInput,
    env: Env,
  ): Promise<DeleteExtractionResult>
  validatePdf(input: PdfValidationInput): Promise<PdfValidationResult>
  putDocument(
    input: { owner: OwnerStorageInput; extractionId: string },
    bytes: ArrayBuffer,
    env: Env,
  ): Promise<string>
  deleteDocument?(documentObjectKey: string, env: Env): Promise<void>
  startWorkflow(
    input: StartExtractionWorkflowInput,
    env: Env,
  ): Promise<void>
  editField?(input: EditFieldInput, env: Env): Promise<EditFieldResult>
  getEditHistory?(
    extractionId: string,
    limit: number,
    offset: number,
    env: Env,
  ): Promise<EditHistoryResult>
  getDocumentObject?(objectKey: string, env: Env): Promise<StoredObjectResult | null>
  exportObjectExists?(objectKey: string, env: Env): Promise<boolean>
  getExportObject?(objectKey: string, env: Env): Promise<StoredObjectResult | null>
  startExportWorkflow?(input: ExportWorkflowInput, env: Env): Promise<void>
}

type AuthenticatedContext = Exclude<AuthContext, { kind: 'unauthenticated' }>

function requireAuthenticated(
  authContext: AuthContext,
): AuthenticatedContext | Response {
  if (authContext.kind === 'unauthenticated') {
    return Response.json(
      { detail: 'Authentication required: Bearer token or X-Session-Token' },
      { status: 401 },
    )
  }
  return authContext
}

function ownerFromAuth(authContext: AuthenticatedContext): OwnerStorageInput {
  if (authContext.kind === 'user') {
    return { kind: 'user', userId: authContext.id }
  }
  return { kind: 'anonymous', sessionId: authContext.id }
}

function recordOrNotFound(record: ExtractionRecord | null): ExtractionRecord | Response {
  if (record === null || record.deletedAt !== null) {
    return Response.json({ detail: 'Extraction not found' }, { status: 404 })
  }
  return record
}

function isTemplatePlaceholder(text: string): boolean {
  const stripped = text.trim()
  return (
    TEMPLATE_PLACEHOLDER_RE.test(stripped) ||
    stripped.toLowerCase().startsWith('insert ')
  )
}

function titleCase(text: string): string {
  return text.replace(
    /[A-Za-z]+/g,
    (word) => `${word[0]?.toUpperCase() ?? ''}${word.slice(1).toLowerCase()}`,
  )
}

function humanizeEnumValue(text: string): string {
  if (!ENUM_TOKEN_RE.test(text)) {
    return text
  }
  return titleCase(text.replace(/_/g, ' '))
}

function normalizeFieldValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  if (Array.isArray(value)) {
    const items = value
      .map(String)
      .filter((item) => item.trim() !== '' && !isTemplatePlaceholder(item))
      .map(humanizeEnumValue)
    return items.length > 0 ? items.join(', ') : null
  }
  const text = String(value)
  if (text.trim() === '' || isTemplatePlaceholder(text)) {
    return null
  }
  return humanizeEnumValue(text)
}

function fieldValue(entry: unknown): string | null {
  if (typeof entry === 'object' && entry !== null && 'value' in entry) {
    return normalizeFieldValue((entry as { value: unknown }).value)
  }
  return normalizeFieldValue(entry)
}

function rawFieldValue(entry: unknown): unknown {
  if (typeof entry === 'object' && entry !== null && 'value' in entry) {
    return (entry as { value: unknown }).value
  }
  return entry
}

function buildTeaserFields(extractedData: Record<string, unknown> | null): {
  field_name: string
  label: string
  value: string | null
}[] {
  if (extractedData === null) {
    return []
  }

  const registry = buildLextractRegistry()
  const found = new Map<string, string>()
  const booleanFields = new Set<string>()
  for (const [name, entry] of Object.entries(extractedData)) {
    const value = fieldValue(entry)
    if (value === null) {
      continue
    }
    found.set(name, value)
    if (typeof rawFieldValue(entry) === 'boolean') {
      booleanFields.add(name)
    }
  }

  const used = new Set<string>()
  const priority = TEASER_FIELDS.filter((name) => found.has(name))
  priority.forEach((name) => used.add(name))
  const secondary = TEASER_BACKFILL_FIELDS.filter(
    (name) => found.has(name) && !used.has(name),
  )
  secondary.forEach((name) => used.add(name))
  const textRemaining = [...found.keys()].filter(
    (name) => !used.has(name) && !booleanFields.has(name),
  )
  textRemaining.forEach((name) => used.add(name))
  const boolRemaining = [...found.keys()].filter((name) => !used.has(name))
  const selected = [
    ...priority,
    ...secondary,
    ...textRemaining,
    ...boolRemaining,
  ].slice(0, 5)

  return selected.map((name) => ({
    field_name: name,
    label:
      registry.getField(name)?.displayLabel ??
      titleCase(name.replace(/_/g, ' ')),
    value: found.get(name) ?? null,
  }))
}

function confidenceDistribution(
  confidenceScores: Record<string, unknown> | null,
  totalFields: number,
): { high: number; medium: number; low: number; not_found: number } {
  let high = 0
  let medium = 0
  let low = 0
  let notFound = 0
  if (confidenceScores !== null) {
    for (const [name, value] of Object.entries(confidenceScores)) {
      if (name.startsWith('_')) {
        continue
      }
      const tier =
        typeof value === 'object' && value !== null && 'tier' in value
          ? (value as { tier?: unknown }).tier
          : 'low'
      if (tier === 'high') {
        high += 1
      } else if (tier === 'medium') {
        medium += 1
      } else if (tier === 'not_found') {
        notFound += 1
      } else {
        low += 1
      }
    }
    notFound = Math.max(0, totalFields - high - medium - low)
  }
  return { high, low, medium, not_found: notFound }
}

function lockedCategories(
  visibleFields: readonly { field_name: string }[],
): { name: string; field_count: number }[] | undefined {
  const visible = new Set(visibleFields.map((field) => field.field_name))
  const registry = buildLextractRegistry()
  const locked = registry.categories
    .map((category) => ({
      field_count: registry
        .getFieldsByCategory(category)
        .filter((field) => !visible.has(field.fieldName)).length,
      name: category,
    }))
    .filter((category) => category.field_count > 0)
  return locked.length === 0 ? undefined : locked
}

function overallConfidence(
  confidenceScores: Record<string, unknown> | null,
): number | null {
  if (confidenceScores === null) {
    return null
  }
  const scores: number[] = []
  for (const [name, value] of Object.entries(confidenceScores)) {
    if (name.startsWith('_')) {
      continue
    }
    if (typeof value === 'object' && value !== null) {
      const record = value as { score?: unknown; tier?: unknown }
      if (record.tier !== 'not_found' && typeof record.score === 'number') {
        scores.push(record.score)
      }
    }
  }
  if (scores.length === 0) {
    return null
  }
  return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100
}

function statusResponse(record: ExtractionRecord): Record<string, unknown> {
  return {
    document_filename: record.documentFilename,
    document_page_count: record.documentPageCount,
    error_message: record.errorMessage,
    id: record.id,
    payment_status: record.paymentStatus,
    status: record.status,
  }
}

function teaserResponse(record: ExtractionRecord): Record<string, unknown> {
  const registry = buildLextractRegistry()
  const visibleFields = buildTeaserFields(record.extractedData)
  const redFlags = record.redFlags
  const highSeverity = redFlags.filter(
    (flag) => String(flag.severity ?? '').toUpperCase() === 'HIGH',
  ).length
  const categories = [
    ...new Set(
      redFlags
        .map((flag) => flag.category ?? flag.name)
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
    ),
  ]
  const body: Record<string, unknown> = {
    category_count: registry.categories.length,
    confidence_distribution: confidenceDistribution(
      record.confidenceScores,
      registry.fields.length,
    ),
    document_filename: record.documentFilename,
    document_page_count: record.documentPageCount,
    error_message: record.errorMessage,
    id: record.id,
    locked_categories: lockedCategories(visibleFields),
    payment_status: record.paymentStatus,
    red_flag_categories: categories.length === 0 ? undefined : categories,
    red_flag_count: redFlags.length,
    red_flag_severity_high: highSeverity === 0 ? undefined : highSeverity,
    status: record.status,
    total_field_count: registry.fields.length,
    visible_fields: visibleFields,
  }
  return body
}

function fullResponse(record: ExtractionRecord): Record<string, unknown> {
  return {
    confidence_scores: record.confidenceScores ?? {},
    created_at: record.createdAt,
    document_filename: record.documentFilename,
    document_page_count: record.documentPageCount,
    extracted_data: record.extractedData ?? {},
    id: record.id,
    overall_confidence:
      record.overallConfidence ?? overallConfidence(record.confidenceScores),
    payment_status: record.paymentStatus,
    property_type: record.propertyType,
    red_flags: record.redFlags,
    show_camaudit: record.showCamAudit,
    status: record.status,
    updated_at: record.updatedAt,
  }
}

function listResponse(result: ExtractionListResult): Record<string, unknown> {
  return {
    items: result.items.map((item: ExtractionListItem) => ({
      created_at: item.createdAt,
      document_filename: item.documentFilename,
      id: item.id,
      payment_status: item.paymentStatus,
      property_type: item.propertyType,
      status: item.status,
    })),
    limit: result.limit,
    offset: result.offset,
    total: result.total,
  }
}

async function currentRecord(
  c: Context<AppBindings>,
  dependencies: ExtractionRouteDependencies,
): Promise<ExtractionRecord | Response> {
  const auth = requireAuthenticated(c.get('authContext'))
  if (auth instanceof Response) {
    return auth
  }
  const extractionId = c.req.param('extractionId')
  if (extractionId === undefined) {
    return Response.json({ detail: 'Extraction not found' }, { status: 404 })
  }
  const record = await dependencies.getExtraction(
    extractionId,
    ownerFromAuth(auth),
    c.env,
  )
  return recordOrNotFound(record)
}

function queryObject(c: Context<AppBindings>): Record<string, string> {
  const query: Record<string, string> = {}
  for (const [key, value] of Object.entries(c.req.query())) {
    if (typeof value === 'string') {
      query[key] = value
    }
  }
  return query
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '')
}

function base64UrlDecode(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

async function hmacSignature(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return base64UrlEncode(new Uint8Array(signature))
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false
  }
  let diff = 0
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return diff === 0
}

function ownerClaim(record: ExtractionRecord): string | null {
  if (record.userId !== null) {
    return `user:${record.userId}`
  }
  return record.anonymousSessionId === null ? null : `anon:${record.anonymousSessionId}`
}

async function documentToken(input: {
  extractionId: string
  owner: string
  secret: string
  expiresInSeconds: number
}): Promise<string> {
  const payload = base64UrlEncode(
    new TextEncoder().encode(
      JSON.stringify({
        exp: Math.floor(Date.now() / 1000) + input.expiresInSeconds,
        extraction_id: input.extractionId,
        owner: input.owner,
      }),
    ),
  )
  return `${payload}.${await hmacSignature(payload, input.secret)}`
}

async function validDocumentToken(input: {
  token: string
  extractionId: string
  owner: string
  secret: string
}): Promise<boolean> {
  const [payload, signature] = input.token.split('.', 2)
  if (!payload || !signature) {
    return false
  }
  const expected = await hmacSignature(payload, input.secret)
  if (!timingSafeEqual(signature, expected)) {
    return false
  }
  try {
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as {
      exp?: unknown
      extraction_id?: unknown
      owner?: unknown
    }
    return (
      parsed.extraction_id === input.extractionId &&
      parsed.owner === input.owner &&
      typeof parsed.exp === 'number' &&
      parsed.exp >= Math.floor(Date.now() / 1000)
    )
  } catch {
    return false
  }
}

function documentProxyBaseUrl(c: Context<AppBindings>): string {
  const configured = c.env.PUBLIC_API_ORIGIN
  if (configured !== undefined) {
    try {
      return new URL(configured).origin
    } catch {
      return new URL(c.req.url).origin
    }
  }
  return new URL(c.req.url).origin
}

function contentDispositionInline(filename: string): string {
  const fallback = filename.replace(/["\\\r\n;]/g, '').trim() || 'document.pdf'
  return `inline; filename="${fallback}"`
}

function exportVersionToken(value: string | null): string {
  return (value ?? new Date(0).toISOString()).replace(/[^A-Za-z0-9._-]/g, '_')
}

function normalizedTemplate(template: string): string {
  return /^[A-Za-z0-9._-]+$/.test(template) ? template : 'commercial'
}

function exportObjectKey(input: {
  record: ExtractionRecord
  owner: OwnerStorageInput
  extractionId: string
  format: ExportFormat
  template: string
  version: string
}): string {
  return exportKey({
    extension: input.format,
    extractionId: input.extractionId,
    format: `${input.template}-${input.version}`,
    ownerId: extractionOwnerStorageId(input.owner),
  })
}

function fileFromBody(value: unknown): File | null {
  return value instanceof File ? value : null
}

function safeFilename(filename: string): string {
  const trimmed = filename.trim()
  return trimmed.length === 0 ? 'upload.pdf' : trimmed
}

function allowedPdfContentType(contentType: string): boolean {
  const normalized = contentType.split(';', 1)[0]?.trim().toLowerCase() ?? ''
  return normalized === 'application/pdf' || normalized === 'application/x-pdf'
}

async function defaultPutDocument(
  input: { owner: OwnerStorageInput; extractionId: string },
  bytes: ArrayBuffer,
  env: Env,
): Promise<string> {
  return createStorage(env).putDocument(
    {
      extractionId: input.extractionId,
      ownerId: extractionOwnerStorageId(input.owner),
    },
    bytes,
  )
}

async function defaultDeleteDocument(
  documentObjectKey: string,
  env: Env,
): Promise<void> {
  await createStorage(env).deleteObject(documentObjectKey)
}

async function defaultStartWorkflow(
  input: StartExtractionWorkflowInput,
  env: Env,
): Promise<void> {
  if (!env.EXTRACTION_WORKFLOW) {
    throw new Error('EXTRACTION_WORKFLOW binding is required')
  }
  await env.EXTRACTION_WORKFLOW.create({
    params: {
      extractionId: input.extractionId,
    },
  })
}

async function defaultGetObject(
  objectKey: string,
  env: Env,
): Promise<StoredObjectResult | null> {
  const object = await createStorage(env).getObject(objectKey)
  if (
    typeof object !== 'object' ||
    object === null ||
    !('body' in object) ||
    !(object.body instanceof ReadableStream)
  ) {
    return null
  }
  const httpMetadata =
    'httpMetadata' in object && typeof object.httpMetadata === 'object'
      ? object.httpMetadata
      : null
  const contentType =
    httpMetadata !== null &&
    httpMetadata !== undefined &&
    'contentType' in httpMetadata &&
    typeof httpMetadata.contentType === 'string'
      ? httpMetadata.contentType
      : undefined
  return contentType === undefined
    ? { body: object.body }
    : { body: object.body, contentType }
}

async function defaultExportObjectExists(
  objectKey: string,
  env: Env,
): Promise<boolean> {
  return (await createStorage(env).getObject(objectKey)) !== null
}

async function defaultStartExportWorkflow(
  input: ExportWorkflowInput,
  env: Env,
): Promise<void> {
  if (!env.EXPORT_WORKFLOW) {
    throw new Error('EXPORT_WORKFLOW binding is required')
  }
  await env.EXPORT_WORKFLOW.create({ params: input })
}

async function defaultDeleteExtraction(
  input: DeleteExtractionInput,
  env: Env,
): Promise<DeleteExtractionResult> {
  const record = await getExtraction(input.extractionId, input.owner, env, {
    includeDeleted: true,
  })
  if (record === null) {
    return { alreadyDeleted: false, notFound: true }
  }
  if (record.deletedAt !== null) {
    return { alreadyDeleted: true }
  }
  const storage = createStorage(env)
  const ownerId = extractionOwnerStorageId(input.owner)
  const currentPrefix = extractionPrefix({
    extractionId: input.extractionId,
    ownerId,
  })
  const explicitKeys = new Set(
    [
      ...(record.documentObjectKeys ?? [record.documentObjectKey]),
      ...(record.rawResponseObjectKeys ?? []),
    ].filter(
      (value): value is string =>
        typeof value === 'string' &&
        value.length > 0 &&
        !value.startsWith(currentPrefix),
    ),
  )
  for (const key of explicitKeys) {
    await storage.deleteObject(key)
  }
  await storage.deleteExtractionObjects({
    extractionId: input.extractionId,
    ownerId,
  })
  const deleted = await softDeleteExtraction(input.extractionId, input.owner, env)
  return deleted ? { alreadyDeleted: false } : { alreadyDeleted: false, notFound: true }
}

export function defaultExtractionRouteDependencies(): ExtractionRouteDependencies {
  return {
    deleteExtraction: defaultDeleteExtraction,
    editField: editExtractionField,
    getExtraction,
    getExtractionById,
    getEditHistory: getExtractionEditHistory,
    insertUpload,
    listExtractions,
    markUploadFailed,
    deleteDocument: defaultDeleteDocument,
    exportObjectExists: defaultExportObjectExists,
    getDocumentObject: defaultGetObject,
    putDocument: defaultPutDocument,
    getExportObject: defaultGetObject,
    startExportWorkflow: defaultStartExportWorkflow,
    startWorkflow: defaultStartWorkflow,
    validatePdf: validatePdfUpload,
  }
}

function validationErrorResponse(error: unknown): Response | null {
  if (error instanceof PdfValidationError) {
    return Response.json({ detail: error.message }, { status: error.status })
  }
  if (error instanceof Error) {
    const knownValidationError =
      error.message.startsWith('Invalid file: ') ||
      error.message.startsWith('File exceeds ') ||
      error.message.startsWith('PDF has ')
    if (!knownValidationError) {
      return null
    }
    const status = error.message.startsWith('PDF has ') ? 422 : 400
    return Response.json({ detail: error.message }, { status })
  }
  return null
}

export function createExtractionsRoutes(
  dependencies: ExtractionRouteDependencies = defaultExtractionRouteDependencies(),
): Hono<AppBindings> {
  const extractions = new Hono<AppBindings>()
  const auth = createAuthMiddleware(dependencies.authDependencies)

  extractions.use('*', auth)

  extractions.get('/:extractionId/status', async (c) => {
    const record = await currentRecord(c, dependencies)
    return record instanceof Response ? record : c.json(statusResponse(record))
  })

  extractions.get('/:extractionId/teaser', async (c) => {
    const record = await currentRecord(c, dependencies)
    return record instanceof Response ? record : c.json(teaserResponse(record))
  })

  extractions.get('/:extractionId', async (c) => {
    const record = await currentRecord(c, dependencies)
    if (record instanceof Response) {
      return record
    }
    if (record.paymentStatus !== 'paid') {
      return c.json({ detail: 'Payment required to access full results' }, 403)
    }
    return c.json(fullResponse(record))
  })

  extractions.get('', async (c) => {
    const authContext = requireAuthenticated(c.get('authContext'))
    if (authContext instanceof Response) {
      return authContext
    }
    const parsed = listQuerySchema.safeParse(queryObject(c))
    if (!parsed.success) {
      return c.json({ detail: 'Invalid list query parameters' }, 400)
    }
    const input: ExtractionListInput = {
      limit: parsed.data.limit,
      offset: parsed.data.offset,
      owner: ownerFromAuth(authContext),
      sort: parsed.data.sort,
    }
    if (parsed.data.status !== undefined) {
      input.status = parsed.data.status as ExtractionStatus
    }
    if (parsed.data.date_from !== undefined) {
      input.dateFrom = parsed.data.date_from
    }
    if (parsed.data.date_to !== undefined) {
      input.dateTo = parsed.data.date_to
    }
    return c.json(listResponse(await dependencies.listExtractions(input, c.env)))
  })

  extractions.delete('/:extractionId', async (c) => {
    const authContext = requireAuthenticated(c.get('authContext'))
    if (authContext instanceof Response) {
      return authContext
    }
    const result = await dependencies.deleteExtraction(
      {
        extractionId: c.req.param('extractionId'),
        owner: ownerFromAuth(authContext),
      },
      c.env,
    )
    if (result.notFound === true) {
      return c.json({ detail: 'Extraction not found' }, 404)
    }
    return c.body(null, 204)
  })

  extractions.patch('/:extractionId/fields', async (c) => {
    const authContext = requireAuthenticated(c.get('authContext'))
    if (authContext instanceof Response) {
      return authContext
    }
    if (authContext.kind !== 'user') {
      return c.json({ detail: 'Field editing requires a registered account' }, 403)
    }
    const record = await currentRecord(c, dependencies)
    if (record instanceof Response) {
      return record
    }
    if (record.paymentStatus !== 'paid') {
      return c.json({ detail: 'Editing requires a paid extraction' }, 403)
    }
    const parsed = fieldEditSchema.safeParse(await c.req.json())
    if (!parsed.success) {
      return c.json({ detail: 'Invalid field edit request' }, 400)
    }
    if (!dependencies.editField) {
      return c.json({ detail: 'Field editing is not configured' }, 503)
    }
    let editedValue: ReturnType<typeof coerceEditedFieldValue>
    try {
      editedValue = coerceEditedFieldValue(parsed.data.field_name, parsed.data.value)
    } catch (error) {
      if (error instanceof FieldEditValidationError) {
        return c.json({ detail: error.message }, error.status)
      }
      throw error
    }
    const result = await dependencies.editField(
      {
        extractionId: record.id,
        fieldName: parsed.data.field_name,
        userId: authContext.id,
        value: editedValue,
      },
      c.env,
    )
    return c.json({
      edited_value: result.editedValue,
      extraction_id: result.extractionId,
      field_name: result.fieldName,
      original_value: result.originalValue,
      red_flags: result.redFlags,
    })
  })

  extractions.get('/:extractionId/edits', async (c) => {
    const record = await currentRecord(c, dependencies)
    if (record instanceof Response) {
      return record
    }
    const parsed = editHistoryQuerySchema.safeParse(queryObject(c))
    if (!parsed.success) {
      return c.json({ detail: 'Invalid edit history query parameters' }, 400)
    }
    if (!dependencies.getEditHistory) {
      return c.json({ detail: 'Edit history is not configured' }, 503)
    }
    const result = await dependencies.getEditHistory(
      record.id,
      parsed.data.limit,
      parsed.data.offset,
      c.env,
    )
    return c.json({
      edits: result.edits.map((edit) => ({
        edited_at: edit.editedAt,
        edited_by: edit.editedBy,
        edited_value: edit.editedValue,
        field_name: edit.fieldName,
        id: edit.id,
        original_value: edit.originalValue,
      })),
      extraction_id: record.id,
      total: result.total,
    })
  })

  extractions.get('/:extractionId/document-url', async (c) => {
    const record = await currentRecord(c, dependencies)
    if (record instanceof Response) {
      return record
    }
    if (record.paymentStatus !== 'paid') {
      return c.json({ detail: 'Payment required to access document' }, 403)
    }
    if (!record.documentObjectKey) {
      return c.json({ detail: 'Document not found' }, 404)
    }
    const owner = ownerClaim(record)
    if (owner === null || !c.env.DOCUMENT_PROXY_SECRET) {
      return c.json({ detail: 'Document proxy is not configured' }, 503)
    }
    const token = await documentToken({
      expiresInSeconds: DOCUMENT_PROXY_TTL_SECONDS,
      extractionId: record.id,
      owner,
      secret: c.env.DOCUMENT_PROXY_SECRET,
    })
    return c.json({
      expires_in: DOCUMENT_PROXY_TTL_SECONDS,
      url: `${documentProxyBaseUrl(c)}/api/v1/extractions/${record.id}/document?token=${token}`,
    })
  })

  extractions.get('/:extractionId/document', async (c) => {
    const extractionId = c.req.param('extractionId')
    const ownedRecord =
      dependencies.getExtractionById === undefined
        ? null
        : await dependencies.getExtractionById(extractionId, c.env)
    if (ownedRecord === null || ownedRecord.deletedAt !== null) {
      return c.json({ detail: 'Document not found' }, 404)
    }
    if (ownedRecord.paymentStatus !== 'paid') {
      return c.json({ detail: 'Payment required to access document' }, 403)
    }
    if (!ownedRecord.documentObjectKey) {
      return c.json({ detail: 'Document not found' }, 404)
    }
    const owner = ownerClaim(ownedRecord)
    const token = c.req.query('token')
    if (
      owner === null ||
      !token ||
      !c.env.DOCUMENT_PROXY_SECRET ||
      !(await validDocumentToken({
        extractionId,
        owner,
        secret: c.env.DOCUMENT_PROXY_SECRET,
        token,
      }))
    ) {
      return c.json({ detail: 'Invalid or expired document token' }, 403)
    }
    const object = await dependencies.getDocumentObject?.(
      ownedRecord.documentObjectKey,
      c.env,
    )
    if (object === undefined || object === null) {
      return c.json({ detail: 'Document not found' }, 404)
    }
    return new Response(object.body, {
      headers: {
        'Cache-Control': `private, max-age=${DOCUMENT_PROXY_TTL_SECONDS}`,
        'Content-Disposition': contentDispositionInline(ownedRecord.documentFilename),
        'Content-Type': object.contentType ?? 'application/pdf',
      },
    })
  })

  extractions.get('/:extractionId/camaudit-payload', async (c) => {
    const record = await currentRecord(c, dependencies)
    if (record instanceof Response) {
      return record
    }
    if (record.paymentStatus !== 'paid') {
      return c.json({ detail: 'CamAudit handoff requires a paid extraction' }, 403)
    }
    if (!record.showCamAudit) {
      return c.json(
        { detail: 'This extraction is not eligible for CamAudit handoff' },
        403,
      )
    }
    if (!c.env.CAMAUDIT_SHARED_KEY) {
      return c.json({ detail: 'CamAudit integration is not configured' }, 503)
    }
    const payload = buildCamAuditPayload({
      confidenceScores: record.confidenceScores ?? {},
      extractedData: record.extractedData ?? {},
      extractionId: record.id,
    })
    const redirectUrl = await buildCamAuditRedirectUrl({
      baseUrl: c.env.CAMAUDIT_BASE_URL ?? 'https://www.camaudit.io',
      extractionId: record.id,
      payload,
      sharedKey: c.env.CAMAUDIT_SHARED_KEY,
    })
    return c.json({ extraction_id: record.id, redirect_url: redirectUrl })
  })

  async function handleExportRequest(c: Context<AppBindings>) {
    const authContext = requireAuthenticated(c.get('authContext'))
    if (authContext instanceof Response) {
      return authContext
    }
    const format = c.req.param('format') ?? ''
    if (!isExportFormat(format)) {
      return c.json(
        {
          detail: `Unsupported export format: ${format}. Supported formats: docx, pdf, xlsx`,
        },
        400,
      )
    }
    const record = await currentRecord(c, dependencies)
    if (record instanceof Response) {
      return record
    }
    if (record.paymentStatus !== 'paid') {
      return c.json({ detail: 'Export requires a paid extraction' }, 403)
    }
    let requestedTemplate: string | undefined
    if (c.req.method === 'GET') {
      requestedTemplate = c.req.query('template')
    } else {
      const body = c.req.header('Content-Type')?.includes('application/json')
        ? await c.req.json()
        : {}
      const parsed = exportBodySchema.safeParse(body)
      requestedTemplate = parsed.success ? parsed.data.template : c.req.query('template')
    }
    const template = normalizedTemplate(requestedTemplate ?? 'commercial')
    const version = exportVersionToken(record.updatedAt)
    const owner = ownerFromAuth(authContext)
    const objectKey = exportObjectKey({
      extractionId: record.id,
      format,
      owner,
      record,
      template,
      version,
    })
    const url = `/api/v1/extractions/${record.id}/export/${format}/download?template=${template}&version=${version}`
    if (await dependencies.exportObjectExists?.(objectKey, c.env)) {
      return c.json({ format, url, version })
    }
    if (!c.env.TASK_SIGNING_SECRET || !dependencies.startExportWorkflow) {
      return c.json({ detail: 'Export service temporarily unavailable' }, 503)
    }
    const taskId = await buildExportTaskId(
      owner,
      `${record.id}:${template}:${format}:${version}`,
      c.env.TASK_SIGNING_SECRET,
    )
    await dependencies.startExportWorkflow(
      {
        extractionId: record.id,
        format,
        owner,
        taskId,
        template,
        version,
      },
      c.env,
    )
    return c.json({ status: 'generating', task_id: taskId, version }, 202)
  }

  extractions.get('/:extractionId/export/:format', handleExportRequest)
  extractions.post('/:extractionId/export/:format', handleExportRequest)

  extractions.get('/:extractionId/export/:format/download', async (c) => {
    const authContext = requireAuthenticated(c.get('authContext'))
    if (authContext instanceof Response) {
      return authContext
    }
    const format = c.req.param('format') ?? ''
    if (!isExportFormat(format)) {
      return c.json({ detail: 'Export file not found' }, 404)
    }
    const record = await currentRecord(c, dependencies)
    if (record instanceof Response) {
      return record
    }
    if (record.paymentStatus !== 'paid') {
      return c.json({ detail: 'Export requires a paid extraction' }, 403)
    }
    const template = normalizedTemplate(c.req.query('template') ?? 'commercial')
    const version = exportVersionToken(c.req.query('version') ?? record.updatedAt)
    const objectKey = exportObjectKey({
      extractionId: record.id,
      format,
      owner: ownerFromAuth(authContext),
      record,
      template,
      version,
    })
    const object = await dependencies.getExportObject?.(objectKey, c.env)
    if (object === undefined || object === null) {
      return c.json({ detail: 'Export file not found' }, 404)
    }
    return new Response(object.body, {
      headers: {
        'Content-Disposition': `attachment; filename="lease-abstraction-report.${format}"`,
        'Content-Type': object.contentType ?? 'application/octet-stream',
      },
    })
  })

  extractions.post('/upload', async (c) => {
    const authContext = requireAuthenticated(c.get('authContext'))
    if (authContext instanceof Response) {
      return authContext
    }
    const form = await c.req.parseBody()
    const file = fileFromBody(form.file)
    if (file === null) {
      return c.json({ detail: 'A PDF file is required.' }, 400)
    }
    if (!allowedPdfContentType(file.type)) {
      return c.json(
        {
          detail: `Invalid file type: ${file.type || 'unknown'}. Only PDF files are accepted.`,
        },
        400,
      )
    }
    const bytes = await file.arrayBuffer()
    let validation: PdfValidationResult
    try {
      validation = await dependencies.validatePdf({
        bytes,
        contentType: file.type,
      })
    } catch (error) {
      const response = validationErrorResponse(error)
      if (response !== null) {
        return response
      }
      throw error
    }

    const extractionId = crypto.randomUUID()
    const owner = ownerFromAuth(authContext)
    const documentObjectKey = await dependencies.putDocument(
      { extractionId, owner },
      bytes,
      c.env,
    )
    try {
      await dependencies.insertUpload(
        {
          documentFilename: safeFilename(file.name),
          documentObjectKey,
          documentPageCount: validation.pageCount,
          extractionId,
          owner,
        },
        c.env,
      )
    } catch (error) {
      await dependencies.deleteDocument?.(documentObjectKey, c.env)
      throw error
    }
    try {
      await dependencies.startWorkflow(
        {
          extractionId,
        },
        c.env,
      )
    } catch (error) {
      await dependencies.markUploadFailed?.(
        extractionId,
        "We couldn't start processing this upload. Please try again.",
        c.env,
      )
      return c.json(
        { detail: 'Extraction service temporarily unavailable - please try again' },
        503,
      )
    }

    return c.json({ extraction_id: extractionId, status: 'uploading' }, 201)
  })

  return extractions
}

export const extractionsRoutes = createExtractionsRoutes()
