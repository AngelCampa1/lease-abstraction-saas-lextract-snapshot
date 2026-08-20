import { ownerStorageId } from '../domain/object-keys'
import type { OwnerStorageInput } from '../domain/object-keys'
import {
  isExtractionWorkflowStatus,
  validateExtractionStatusTransition,
} from '../domain/status'
import type { ExtractionWorkflowStatus } from '../domain/status'
import {
  buildLextractRegistry,
  detectRedFlags,
  shouldShowCamAudit,
} from '../../../../packages/extract-core/src/index'
import type { FieldDataType } from '../../../../packages/extract-core/src/index'
import { createConfiguredDb } from './db'
import type { DbPoolLike } from './db'
import type { Env } from '../types'

const DECIMAL_NUMBER_RE = /^[+-]?(?:\d+|\d+\.\d+)$/
const ISO_DATE_RE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ]([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\.[0-9]+)?(?:Z|[+-]([0-9]{2}):([0-9]{2}))?)?$/

export type ExtractionStatus =
  | 'uploading'
  | 'extracting'
  | 'scoring'
  | 'complete'
  | 'failed'

export interface ExtractionRecord {
  id: string
  userId: string | null
  anonymousSessionId: string | null
  deletedAt: string | null
  status: string
  paymentStatus: string
  documentFilename: string
  documentPageCount: number | null
  documentObjectKey: string | null
  documentObjectKeys?: readonly string[]
  rawResponseObjectKeys?: readonly string[]
  propertyType: string | null
  extractedData: Record<string, unknown> | null
  confidenceScores: Record<string, unknown> | null
  redFlags: readonly Record<string, unknown>[]
  showCamAudit: boolean
  overallConfidence: number | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface ExtractionListItem {
  id: string
  documentFilename: string
  status: string
  paymentStatus: string
  propertyType: string | null
  createdAt: string
}

export interface ExtractionListInput {
  owner: OwnerStorageInput
  limit: number
  offset: number
  sort: 'asc' | 'desc'
  status?: ExtractionStatus
  dateFrom?: string
  dateTo?: string
}

export interface ExtractionListResult {
  items: readonly ExtractionListItem[]
  total: number
  limit: number
  offset: number
}

export interface InsertUploadInput {
  extractionId: string
  owner: OwnerStorageInput
  documentFilename: string
  documentObjectKey: string
  documentPageCount: number | null
}

export interface WorkflowExtractionDocument {
  id: string
  status: ExtractionWorkflowStatus
  ownerId: string
  documentObjectKey: string
  documentFilename: string
}

export interface TransitionExtractionStatusInput {
  extractionId: string
  targetStatus: ExtractionWorkflowStatus
}

export interface PersistExtractionOutputInput {
  extractionId: string
  extractedData: Record<string, unknown>
  passRecords: readonly Record<string, unknown>[]
  rawResponseObjectKeys: readonly string[]
  totalTokens: number
  extractionCostCents: number
  documentPageCount: number | null
}

export interface PersistConfidenceInput {
  extractionId: string
  confidenceScores: Record<string, unknown>
  overallConfidence: number
}

export interface PersistRedFlagsInput {
  extractionId: string
  redFlags: readonly Record<string, unknown>[]
  showCamAudit: boolean
}

export interface MarkExtractionFailedInput {
  extractionId: string
  errorMessage: string
}

export interface EditExtractionFieldInput {
  extractionId: string
  fieldName: string
  value: unknown
  userId: string
}

export interface EditExtractionFieldResult {
  extractionId: string
  fieldName: string
  originalValue: unknown
  editedValue: unknown
  redFlags: readonly Record<string, unknown>[]
}

export class FieldEditValidationError extends Error {
  readonly status = 422

  constructor(message: string) {
    super(message)
    this.name = 'FieldEditValidationError'
  }
}

export interface GetExtractionEditHistoryResult {
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

interface ExtractionRow {
  id: string
  user_id: string | null
  anonymous_session_id: string | null
  deleted_at: Date | string | null
  status: string
  payment_status: string
  document_filename: string
  document_page_count: number | null
  document_object_key?: string | null
  document_s3_key?: string | null
  raw_extraction_object_keys?: readonly unknown[] | null
  property_type: string | null
  extracted_data: Record<string, unknown> | null
  confidence_scores: Record<string, unknown> | null
  red_flags: readonly Record<string, unknown>[] | null
  show_camaudit: boolean | null
  overall_confidence: number | string | null
  error_message: string | null
  created_at: Date | string
  updated_at: Date | string
}

interface ListRow {
  id: string
  document_filename: string
  status: string
  payment_status: string
  property_type: string | null
  created_at: Date | string
}

interface CountRow {
  count: number | string
}

interface WorkflowDocumentRow {
  id: string
  user_id: string | null
  anonymous_session_id: string | null
  status: string
  deleted_at: Date | string | null
  document_object_key: string | null
  document_filename: string | null
}

interface EditExtractionRow {
  extracted_data: Record<string, unknown> | null
}

interface EditHistoryRow {
  id: string
  field_name: string
  original_value: unknown
  edited_value: unknown
  edited_by: string
  edited_at: Date | string
}

let configuredExtractionsDb: ((env: Env) => DbPoolLike) | null = null

export function configureExtractionsRepositoryDb(
  createDb: ((env: Env) => DbPoolLike) | null,
): void {
  configuredExtractionsDb = createDb
}

function createDb(env: Env): DbPoolLike {
  return configuredExtractionsDb === null
    ? createConfiguredDb(env)
    : configuredExtractionsDb(env)
}

function query(pool: DbPoolLike): NonNullable<DbPoolLike['query']> {
  if (!pool.query) {
    throw new Error('Database pool does not support query')
  }
  return pool.query.bind(pool)
}

function jsonb(value: unknown): string {
  return JSON.stringify(value)
}

function dateString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}

function nullableDateString(value: Date | string | null): string | null {
  return value === null ? null : dateString(value)
}

function ownerClause(owner: OwnerStorageInput, startIndex: number): {
  clause: string
  values: readonly string[]
} {
  if (owner.kind === 'user') {
    return { clause: `user_id = $${startIndex}`, values: [owner.userId] }
  }
  return {
    clause: `anonymous_session_id = $${startIndex} AND user_id IS NULL`,
    values: [owner.sessionId],
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

function mapRecord(row: ExtractionRow): ExtractionRecord {
  const confidence =
    row.overall_confidence === null ? null : Number(row.overall_confidence)
  const rawKeys = (row.raw_extraction_object_keys ?? []).filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  )
  const documentKeys = [
    row.document_object_key,
    row.document_s3_key,
  ].filter(
    (value, index, values): value is string =>
      typeof value === 'string' &&
      value.length > 0 &&
      values.indexOf(value) === index,
  )
  return {
    anonymousSessionId: row.anonymous_session_id,
    confidenceScores: row.confidence_scores,
    createdAt: dateString(row.created_at),
    deletedAt: nullableDateString(row.deleted_at),
    documentFilename: row.document_filename,
    documentObjectKey: documentKeys[0] ?? null,
    documentObjectKeys: documentKeys,
    documentPageCount: row.document_page_count,
    errorMessage: row.error_message,
    extractedData: row.extracted_data,
    id: row.id,
    overallConfidence: Number.isFinite(confidence) ? confidence : null,
    paymentStatus: row.payment_status,
    propertyType: row.property_type,
    redFlags: row.red_flags ?? [],
    rawResponseObjectKeys: rawKeys,
    showCamAudit: row.show_camaudit ?? false,
    status: row.status,
    updatedAt: dateString(row.updated_at),
    userId: row.user_id,
  }
}

function mapListItem(row: ListRow): ExtractionListItem {
  return {
    createdAt: dateString(row.created_at),
    documentFilename: row.document_filename,
    id: row.id,
    paymentStatus: row.payment_status,
    propertyType: row.property_type,
    status: row.status,
  }
}

function valueFromField(entry: unknown): unknown {
  if (typeof entry === 'object' && entry !== null && 'value' in entry) {
    return (entry as { value: unknown }).value
  }
  return entry
}

function withEditedValue(entry: unknown, value: unknown): Record<string, unknown> {
  if (typeof entry === 'object' && entry !== null && 'value' in entry) {
    return { ...(entry as Record<string, unknown>), value }
  }
  return { confidence: 1, source_text: 'User edit', value }
}

function coerceNumberEdit(
  fieldName: string,
  value: unknown,
  dataType: FieldDataType,
): number | null {
  if (value === null) {
    return null
  }
  if (typeof value === 'boolean') {
    throw new FieldEditValidationError(`${fieldName} must be ${dataType}`)
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new FieldEditValidationError(`${fieldName} must be ${dataType}`)
    }
    return value
  }
  if (typeof value !== 'string') {
    throw new FieldEditValidationError(`${fieldName} must be ${dataType}`)
  }
  const trimmed = value.trim()
  if (!DECIMAL_NUMBER_RE.test(trimmed)) {
    throw new FieldEditValidationError(`${fieldName} must be ${dataType}`)
  }
  const parsed = trimmed.includes('.') ? Number.parseFloat(trimmed) : Number.parseInt(trimmed, 10)
  if (trimmed.length === 0 || !Number.isFinite(parsed)) {
    throw new FieldEditValidationError(`${fieldName} must be ${dataType}`)
  }
  return parsed
}

function coerceBooleanEdit(fieldName: string, value: unknown): boolean | null {
  if (value === null) {
    return null
  }
  if (typeof value === 'boolean') {
    return value
  }
  throw new FieldEditValidationError(`${fieldName} must be boolean`)
}

function validIsoDateLike(value: string): boolean {
  const match = ISO_DATE_RE.exec(value)
  if (match === null) {
    return false
  }
  const [
    ,
    yearRaw,
    monthRaw,
    dayRaw,
    hourRaw,
    minuteRaw,
    secondRaw,
    offsetHourRaw,
    offsetMinuteRaw,
  ] = match
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const day = Number(dayRaw)
  const hour = hourRaw === undefined ? 0 : Number(hourRaw)
  const minute = minuteRaw === undefined ? 0 : Number(minuteRaw)
  const second = secondRaw === undefined ? 0 : Number(secondRaw)
  const offsetHour = offsetHourRaw === undefined ? 0 : Number(offsetHourRaw)
  const offsetMinute = offsetMinuteRaw === undefined ? 0 : Number(offsetMinuteRaw)
  if (
    month < 1 ||
    month > 12 ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 23 ||
    offsetMinute > 59
  ) {
    return false
  }
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return day >= 1 && day <= daysInMonth
}

export function coerceEditedFieldValue(
  fieldName: string,
  value: unknown,
): string | number | boolean | null | readonly unknown[] {
  const field = buildLextractRegistry().getField(fieldName)
  if (field === undefined) {
    throw new FieldEditValidationError(`Unknown field: ${fieldName}`)
  }
  if (value === null) {
    return null
  }
  if (field.dataType === 'number' || field.dataType === 'currency' || field.dataType === 'percentage') {
    return coerceNumberEdit(fieldName, value, field.dataType)
  }
  if (field.dataType === 'boolean') {
    return coerceBooleanEdit(fieldName, value)
  }
  if (field.dataType === 'date') {
    if (typeof value !== 'string' || !validIsoDateLike(value)) {
      throw new FieldEditValidationError(`${fieldName} must be ISO 8601 date`)
    }
    return value
  }
  if (field.dataType === 'array') {
    if (Array.isArray(value)) {
      return value
    }
    throw new FieldEditValidationError(`${fieldName} must be array`)
  }
  if (typeof value !== 'string') {
    throw new FieldEditValidationError(`${fieldName} must be ${field.dataType}`)
  }
  return value
}

function flatValues(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).map(([fieldName, entry]) => [
      fieldName,
      valueFromField(entry),
    ]),
  )
}

function serializeRedFlag(flag: {
  name: string
  description: string
  ruleId: string
  severity: string
  triggeredValue: unknown
}): Record<string, unknown> {
  return {
    description: flag.description,
    name: flag.name,
    rule_id: flag.ruleId,
    severity: flag.severity,
    triggered_value: flag.triggeredValue,
  }
}

export function extractionOwnerStorageId(owner: OwnerStorageInput): string {
  return ownerStorageId(owner)
}

export async function getExtraction(
  extractionId: string,
  owner: OwnerStorageInput,
  env: Env,
  options: { includeDeleted?: boolean } = {},
): Promise<ExtractionRecord | null> {
  if (!isUuid(extractionId)) {
    return null
  }
  const ownership = ownerClause(owner, 2)
  const deletedClause = options.includeDeleted === true ? '' : 'AND deleted_at IS NULL'
  const pool = createDb(env)
  try {
    const result = await query(pool)<ExtractionRow>(
      `SELECT id, user_id, anonymous_session_id, deleted_at, status,
              payment_status, document_filename, document_page_count,
              document_object_key, document_s3_key, raw_extraction_object_keys, property_type,
              extracted_data, confidence_scores, red_flags, show_camaudit,
              overall_confidence, error_message, created_at, updated_at
       FROM extractions
       WHERE id = $1
         AND ${ownership.clause}
         ${deletedClause}
       LIMIT 1`,
      [extractionId, ...ownership.values],
    )
    const row = result.rows[0]
    return row === undefined ? null : mapRecord(row)
  } finally {
    await pool.end()
  }
}

export async function getExtractionById(
  extractionId: string,
  env: Env,
  options: { includeDeleted?: boolean } = {},
): Promise<ExtractionRecord | null> {
  if (!isUuid(extractionId)) {
    return null
  }
  const deletedClause = options.includeDeleted === true ? '' : 'AND deleted_at IS NULL'
  const pool = createDb(env)
  try {
    const result = await query(pool)<ExtractionRow>(
      `SELECT id, user_id, anonymous_session_id, deleted_at, status,
              payment_status, document_filename, document_page_count,
              document_object_key, document_s3_key, raw_extraction_object_keys, property_type,
              extracted_data, confidence_scores, red_flags, show_camaudit,
              overall_confidence, error_message, created_at, updated_at
       FROM extractions
       WHERE id = $1
         ${deletedClause}
       LIMIT 1`,
      [extractionId],
    )
    const row = result.rows[0]
    return row === undefined ? null : mapRecord(row)
  } finally {
    await pool.end()
  }
}

export async function listExtractions(
  input: ExtractionListInput,
  env: Env,
): Promise<ExtractionListResult> {
  const filters: string[] = ['deleted_at IS NULL']
  const params: unknown[] = []
  const ownership = ownerClause(input.owner, 1)
  filters.push(ownership.clause)
  params.push(...ownership.values)

  if (input.status !== undefined) {
    params.push(input.status)
    filters.push(`status = $${params.length}`)
  }
  if (input.dateFrom !== undefined) {
    params.push(input.dateFrom)
    filters.push(`created_at >= $${params.length}`)
  }
  if (input.dateTo !== undefined) {
    const nextDay = new Date(`${input.dateTo}T00:00:00.000Z`)
    nextDay.setUTCDate(nextDay.getUTCDate() + 1)
    params.push(nextDay.toISOString().slice(0, 10))
    filters.push(`created_at < $${params.length}`)
  }

  const whereClause = filters.join('\n         AND ')
  const pool = createDb(env)
  try {
    const count = await query(pool)<CountRow>(
      `SELECT COUNT(*) AS count
       FROM extractions
       WHERE ${whereClause}`,
      params,
    )
    const pageParams = [...params, input.limit, input.offset]
    const rows = await query(pool)<ListRow>(
      `SELECT id, document_filename, status, payment_status,
              property_type, created_at
       FROM extractions
       WHERE ${whereClause}
       ORDER BY created_at ${input.sort === 'asc' ? 'ASC' : 'DESC'}
       LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
      pageParams,
    )
    return {
      items: rows.rows.map(mapListItem),
      limit: input.limit,
      offset: input.offset,
      total: Number(count.rows[0]?.count ?? 0),
    }
  } finally {
    await pool.end()
  }
}

export async function insertUpload(
  input: InsertUploadInput,
  env: Env,
): Promise<void> {
  const userId = input.owner.kind === 'user' ? input.owner.userId : null
  const anonymousSessionId =
    input.owner.kind === 'anonymous' ? input.owner.sessionId : null
  const pool = createDb(env)
  try {
    await query(pool)(
      `INSERT INTO extractions
         (id, user_id, anonymous_session_id, status, payment_status,
          document_filename, document_page_count, document_object_key)
       VALUES ($1, $2, $3, 'uploading', 'unpaid', $4, $5, $6)`,
      [
        input.extractionId,
        userId,
        anonymousSessionId,
        input.documentFilename,
        input.documentPageCount,
        input.documentObjectKey,
      ],
    )
  } finally {
    await pool.end()
  }
}

export async function editExtractionField(
  input: EditExtractionFieldInput,
  env: Env,
): Promise<EditExtractionFieldResult> {
  const editedValue = coerceEditedFieldValue(input.fieldName, input.value)
  const pool = createDb(env)
  try {
    await query(pool)('BEGIN')
    const current = await query(pool)<EditExtractionRow>(
      `SELECT extracted_data
       FROM extractions
       WHERE id = $1
         AND user_id = $2
         AND payment_status = 'paid'
         AND deleted_at IS NULL
       FOR UPDATE`,
      [input.extractionId, input.userId],
    )
    const row = current.rows[0]
    if (row === undefined) {
      throw new Error('Extraction not found')
    }
    const existingData = row.extracted_data ?? {}
    const originalEntry = existingData[input.fieldName]
    const originalValue = valueFromField(originalEntry)
    const updatedData = {
      ...existingData,
      [input.fieldName]: withEditedValue(originalEntry, editedValue),
    }
    const flat = flatValues(updatedData)
    const detectedRedFlags = detectRedFlags(flat)
    const redFlags = detectedRedFlags.map(serializeRedFlag)
    const updated = await query(pool)<{ id: string }>(
      `UPDATE extractions
       SET extracted_data = $2,
           red_flags = $3,
           show_camaudit = $4,
           updated_at = NOW()
       WHERE id = $1
         AND user_id = $5
         AND payment_status = 'paid'
         AND deleted_at IS NULL
       RETURNING id`,
      [
        input.extractionId,
        updatedData,
        redFlags,
        shouldShowCamAudit(detectedRedFlags, flat, {}),
        input.userId,
      ],
    )
    if (updated.rows.length === 0) {
      throw new Error('Field edit persistence conflict')
    }
    await query(pool)(
      `INSERT INTO extraction_edits
         (extraction_id, field_name, original_value, edited_value, edited_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        input.extractionId,
        input.fieldName,
        originalValue,
        editedValue,
        input.userId,
      ],
    )
    await query(pool)('COMMIT')
    return {
      editedValue,
      extractionId: input.extractionId,
      fieldName: input.fieldName,
      originalValue,
      redFlags,
    }
  } catch (error) {
    await query(pool)('ROLLBACK')
    throw error
  } finally {
    await pool.end()
  }
}

export async function getExtractionEditHistory(
  extractionId: string,
  limit: number,
  offset: number,
  env: Env,
): Promise<GetExtractionEditHistoryResult> {
  const pool = createDb(env)
  try {
    const count = await query(pool)<CountRow>(
      `SELECT COUNT(*) AS count
       FROM extraction_edits
       WHERE extraction_id = $1`,
      [extractionId],
    )
    const rows = await query(pool)<EditHistoryRow>(
      `SELECT id, field_name, original_value, edited_value, edited_by, edited_at
       FROM extraction_edits
       WHERE extraction_id = $1
       ORDER BY edited_at DESC
       LIMIT $2 OFFSET $3`,
      [extractionId, limit, offset],
    )
    return {
      edits: rows.rows.map((row) => ({
        editedAt: dateString(row.edited_at),
        editedBy: row.edited_by,
        editedValue: row.edited_value,
        fieldName: row.field_name,
        id: row.id,
        originalValue: row.original_value,
      })),
      total: Number(count.rows[0]?.count ?? 0),
    }
  } finally {
    await pool.end()
  }
}

export async function markUploadFailed(
  extractionId: string,
  message: string,
  env: Env,
): Promise<void> {
  const pool = createDb(env)
  try {
    await query(pool)(
      `UPDATE extractions
       SET status = 'failed',
           error_message = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [extractionId, message],
    )
  } finally {
    await pool.end()
  }
}

export async function softDeleteExtraction(
  extractionId: string,
  owner: OwnerStorageInput,
  env: Env,
): Promise<boolean> {
  if (!isUuid(extractionId)) {
    return false
  }
  const ownership = ownerClause(owner, 2)
  const pool = createDb(env)
  try {
    const result = await query(pool)<{ id: string }>(
      `UPDATE extractions
       SET deleted_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
         AND ${ownership.clause}
         AND deleted_at IS NULL
       RETURNING id`,
      [extractionId, ...ownership.values],
    )
    return result.rows.length > 0
  } finally {
    await pool.end()
  }
}

export async function loadWorkflowExtractionDocument(
  extractionId: string,
  env: Env,
): Promise<WorkflowExtractionDocument> {
  const pool = createDb(env)
  try {
    const result = await query(pool)<WorkflowDocumentRow>(
      `SELECT id, user_id, anonymous_session_id, status, deleted_at,
              document_object_key, document_filename
       FROM extractions
       WHERE id = $1
       LIMIT 1`,
      [extractionId],
    )
    const row = result.rows[0]
    if (
      row === undefined ||
      row.deleted_at !== null ||
      !isExtractionWorkflowStatus(row.status) ||
      (row.user_id === null && row.anonymous_session_id === null) ||
      !row.document_object_key
    ) {
      throw new Error('Extraction not found')
    }
    const ownerId =
      row.user_id === null
        ? ownerStorageId({
            kind: 'anonymous',
            sessionId: row.anonymous_session_id ?? '',
          })
        : ownerStorageId({ kind: 'user', userId: row.user_id })
    return {
      documentFilename: row.document_filename ?? 'upload.pdf',
      documentObjectKey: row.document_object_key,
      id: row.id,
      ownerId,
      status: row.status,
    }
  } finally {
    await pool.end()
  }
}

export async function transitionExtractionStatus(
  input: TransitionExtractionStatusInput,
  env: Env,
): Promise<boolean> {
  const pool = createDb(env)
  try {
    const current = await query(pool)<{ status: string; deleted_at: Date | string | null }>(
      `SELECT status, deleted_at
       FROM extractions
       WHERE id = $1
       LIMIT 1`,
      [input.extractionId],
    )
    const row = current.rows[0]
    if (
      row === undefined ||
      row.deleted_at !== null ||
      !isExtractionWorkflowStatus(row.status)
    ) {
      throw new Error('Extraction not found')
    }
    if (row.status === input.targetStatus) {
      return false
    }
    validateExtractionStatusTransition(row.status, input.targetStatus)

    const payloadColumns = ['status = $2', 'updated_at = NOW()']
    if (input.targetStatus === 'extracting') {
      payloadColumns.push('processing_started_at = NOW()')
    }
    if (input.targetStatus === 'complete' || input.targetStatus === 'failed') {
      payloadColumns.push('processing_completed_at = NOW()')
    }
    const updated = await query(pool)<{ id: string }>(
      `UPDATE extractions
       SET ${payloadColumns.join(', ')}
       WHERE id = $1
         AND status = $3
         AND deleted_at IS NULL
       RETURNING id`,
      [input.extractionId, input.targetStatus, row.status],
    )
    if (updated.rows.length === 0) {
      throw new Error('Status update conflict')
    }
    return true
  } finally {
    await pool.end()
  }
}

export async function persistExtractionOutput(
  input: PersistExtractionOutputInput,
  env: Env,
): Promise<void> {
  const pool = createDb(env)
  try {
    const result = await query(pool)<{ id: string }>(
      `UPDATE extractions
       SET extracted_data = $2,
           extraction_tokens = $3,
           pass_records = $4,
           raw_extraction_object_keys = $5,
           extraction_cost_cents = $6,
           document_page_count = COALESCE($7, document_page_count),
           updated_at = NOW()
       WHERE id = $1
         AND status = 'extracting'
         AND deleted_at IS NULL
       RETURNING id`,
      [
        input.extractionId,
        jsonb(input.extractedData),
        jsonb({ total_tokens: input.totalTokens }),
        jsonb(input.passRecords),
        input.rawResponseObjectKeys.length > 0 ? jsonb(input.rawResponseObjectKeys) : null,
        input.extractionCostCents,
        input.documentPageCount,
      ],
    )
    if (result.rows.length === 0) {
      throw new Error('Extraction output persistence conflict')
    }
  } finally {
    await pool.end()
  }
}

export async function persistConfidence(
  input: PersistConfidenceInput,
  env: Env,
): Promise<void> {
  const pool = createDb(env)
  try {
    const result = await query(pool)<{ id: string }>(
      `UPDATE extractions
       SET confidence_scores = $2,
           overall_confidence = $3,
           updated_at = NOW()
       WHERE id = $1
         AND status = 'scoring'
         AND deleted_at IS NULL
       RETURNING id`,
      [input.extractionId, jsonb(input.confidenceScores), input.overallConfidence],
    )
    if (result.rows.length === 0) {
      throw new Error('Confidence persistence conflict')
    }
  } finally {
    await pool.end()
  }
}

export async function persistRedFlags(
  input: PersistRedFlagsInput,
  env: Env,
): Promise<void> {
  const pool = createDb(env)
  try {
    const result = await query(pool)<{ id: string }>(
      `UPDATE extractions
       SET red_flags = $2,
           show_camaudit = $3,
           updated_at = NOW()
       WHERE id = $1
         AND status = 'scoring'
         AND deleted_at IS NULL
       RETURNING id`,
      [input.extractionId, jsonb(input.redFlags), input.showCamAudit],
    )
    if (result.rows.length === 0) {
      throw new Error('Red flag persistence conflict')
    }
  } finally {
    await pool.end()
  }
}

export async function markExtractionFailed(
  input: MarkExtractionFailedInput,
  env: Env,
): Promise<void> {
  const pool = createDb(env)
  try {
    const result = await query(pool)<{ id: string }>(
      `UPDATE extractions
       SET status = 'failed',
           error_message = $2,
           processing_completed_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
         AND status IN ('uploading', 'extracting', 'scoring')
         AND deleted_at IS NULL
       RETURNING id`,
      [input.extractionId, input.errorMessage],
    )
    if (result.rows.length === 0) {
      throw new Error('Failure status persistence conflict')
    }
  } finally {
    await pool.end()
  }
}
