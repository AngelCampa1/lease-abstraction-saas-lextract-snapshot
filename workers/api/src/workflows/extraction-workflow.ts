import { WorkflowEntrypoint } from 'cloudflare:workers'
import type { WorkflowEvent, WorkflowStep } from 'cloudflare:workers'

import {
  OpenRouterClient,
  buildExtractionPrompt,
  buildLextractRegistry,
  detectRedFlags,
  runMultiPassExtraction,
  scoreConfidence,
  scoreOverallConfidence,
  shouldShowCamAudit,
} from '../../../../packages/extract-core/src/index'
import type {
  ConfidenceScore,
  ExtractionResult,
  ExtractionPassRecord,
  MultiPassExtractionConfig,
  MultiPassExtractionResult,
  RedFlag,
} from '../../../../packages/extract-core/src/index'
import type { EmailQueueMessage } from '../queues/email-consumer'
import {
  loadWorkflowExtractionDocument,
  markExtractionFailed,
  persistConfidence,
  persistExtractionOutput,
  persistRedFlags,
  transitionExtractionStatus,
} from '../repositories/extractions'
import { createStorage } from '../services/storage'
import type { Env } from '../types'

export interface ExtractionWorkflowInput {
  extractionId: string
}

export interface LoadedExtractionPdf {
  documentFilename: string
  ownerId: string
  pdfBytes: ArrayBuffer
}

export interface ScoreConfidenceResult {
  confidenceScores: Record<string, ConfidenceScore | ReturnType<typeof scoreOverallConfidence>>
  overallConfidence: number
}

export interface DetectRedFlagsResult {
  redFlags: readonly RedFlag[]
  showCamAudit: boolean
}

export interface ExtractionWorkflowStep {
  do<T>(name: string, callback: () => Promise<T>): Promise<T>
}

export interface PersistExtractionWorkflowResultInput {
  extractionId: string
  extractedData: Record<string, unknown>
  passRecords: readonly Record<string, unknown>[]
  rawResponseObjectKeys: readonly string[]
  totalTokens: number
  extractionCostCents: number
  documentPageCount: number | null
}

export interface PreparedExtractionWorkflowResult {
  extraction: ExtractionResult
  extractionCostCents: number
  passRecords: readonly Record<string, unknown>[]
  rawResponseObjectKeys: readonly string[]
  totalTokens: number
}

export interface PersistConfidenceWorkflowInput {
  extractionId: string
  confidenceScores: Record<string, unknown>
  overallConfidence: number
}

export interface PersistRedFlagsWorkflowInput {
  extractionId: string
  redFlags: readonly Record<string, unknown>[]
  showCamAudit: boolean
}

export interface CompleteExtractionWorkflowInput {
  extractionId: string
}

export interface MarkFailedWorkflowInput {
  extractionId: string
  errorMessage: string
}

export interface ExtractionWorkflowDependencies {
  loadExtractionAndPdf(
    input: ExtractionWorkflowInput,
    env: Env,
  ): Promise<LoadedExtractionPdf>
  runExtraction(
    input: LoadedExtractionPdf,
    env: Env,
  ): Promise<MultiPassExtractionResult>
  persistExtractionResult(
    input: PersistExtractionWorkflowResultInput,
    env: Env,
  ): Promise<void>
  markScoring(input: { extractionId: string }, env: Env): Promise<boolean>
  scoreConfidence(
    extraction: ExtractionResult,
    env: Env,
  ): Promise<ScoreConfidenceResult>
  persistConfidence(input: PersistConfidenceWorkflowInput, env: Env): Promise<void>
  detectRedFlags(
    extraction: ExtractionResult,
    confidenceScores: Record<string, unknown>,
    env: Env,
  ): Promise<DetectRedFlagsResult>
  persistRedFlags(input: PersistRedFlagsWorkflowInput, env: Env): Promise<void>
  completeExtraction(
    input: CompleteExtractionWorkflowInput,
    env: Env,
  ): Promise<boolean>
  markFailed(input: MarkFailedWorkflowInput, env: Env): Promise<void>
}

const SAFE_EXTRACTION_FAILURE_MESSAGE =
  'We were unable to extract data from your document. Please try uploading again.'
const MAX_LOGGED_ERROR_MESSAGE_LENGTH = 240
const SAFE_ERROR_NAMES = new Set([
  'AggregateError',
  'Error',
  'EvalError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'TypeError',
  'URIError',
])

function sanitizeWorkflowErrorMessage(message: string): string {
  const flags: string[] = []
  if (/Bearer\s+[A-Za-z0-9._~+/-]+=*/i.test(message)) {
    flags.push('[redacted-bearer]')
  }
  if (/sk_(?:live|test)_[A-Za-z0-9._-]+/i.test(message)) {
    flags.push('[redacted-stripe-key]')
  }
  if (/data:application\/pdf;base64,/i.test(message)) {
    flags.push('[redacted-pdf-data-url]')
  }
  if (/[{}[\]"]/.test(message)) {
    flags.push('[redacted-structured-content]')
  }
  const statusMatch = message.match(/OpenRouter request failed with status (\d{3})/i)
  const noContentBodyShapeMatch = message.match(
    /OpenRouter response did not include message content \(body_type=(object|array|null|undefined|boolean|number|string); has_error=(true|false); error_status=(\d+|undefined|non_number); error_code=(\d+|context_length_exceeded|invalid_request_error|rate_limit_exceeded|provider_error|insufficient_quota|unknown_string|undefined|array|null|number|boolean|object); choices=(\d+|non_array); finish_reason=([A-Za-z0-9._-]+); content_type=([A-Za-z0-9._-]+)\)/i,
  )
  const noContentLegacyBodyShapeMatch = message.match(
    /OpenRouter response did not include message content \(body_type=(object|array|null|undefined|boolean|number|string); has_error=(true|false); choices=(\d+|non_array); finish_reason=([A-Za-z0-9._-]+); content_type=([A-Za-z0-9._-]+)\)/i,
  )
  const noContentMatch = message.match(
    /OpenRouter response did not include message content \(choices=(\d+|non_array); finish_reason=([A-Za-z0-9._-]+); content_type=([A-Za-z0-9._-]+)\)/i,
  )
  const summary =
    statusMatch !== null
      ? `OpenRouter request failed with status ${statusMatch[1]}`
      : noContentBodyShapeMatch !== null
        ? `OpenRouter response did not include message content body_type=${noContentBodyShapeMatch[1]} has_error=${noContentBodyShapeMatch[2]} error_status=${noContentBodyShapeMatch[3]} error_code=${noContentBodyShapeMatch[4]} choices=${noContentBodyShapeMatch[5]} finish_reason=${noContentBodyShapeMatch[6]} content_type=${noContentBodyShapeMatch[7]}`
        : noContentLegacyBodyShapeMatch !== null
          ? `OpenRouter response did not include message content body_type=${noContentLegacyBodyShapeMatch[1]} has_error=${noContentLegacyBodyShapeMatch[2]} choices=${noContentLegacyBodyShapeMatch[3]} finish_reason=${noContentLegacyBodyShapeMatch[4]} content_type=${noContentLegacyBodyShapeMatch[5]}`
          : noContentMatch === null
            ? 'Workflow dependency failed'
            : `OpenRouter response did not include message content choices=${noContentMatch[1]} finish_reason=${noContentMatch[2]} content_type=${noContentMatch[3]}`
  const safeMessage = [summary, ...flags].join(' ')
  if (safeMessage.length <= MAX_LOGGED_ERROR_MESSAGE_LENGTH) {
    return safeMessage
  }
  return `${safeMessage.slice(0, MAX_LOGGED_ERROR_MESSAGE_LENGTH - 1)}…`
}

function workflowErrorCode(message: string): string {
  const statusMatch = message.match(/OpenRouter request failed with status (\d{3})/i)
  if (statusMatch !== null) {
    return `openrouter_status_${statusMatch[1]}`
  }
  if (/OpenRouter response did not include message content/i.test(message)) {
    return 'openrouter_no_content'
  }
  if (
    /Model response did not contain valid JSON/i.test(message) ||
    /Model response is not a JSON object/i.test(message) ||
    /invalid .*extraction.*(?:json|response)|parse.*extraction/i.test(message)
  ) {
    return 'extraction_response_parse_failed'
  }
  if (/timed?\s*out|timeout/i.test(message)) {
    return 'dependency_timeout'
  }
  return 'dependency_failed'
}

function workflowErrorDetails(error: unknown): {
  errorCode: string
  errorMessage: string
  errorName: string
} {
  if (error instanceof Error) {
    return {
      errorCode: workflowErrorCode(error.message),
      errorMessage: sanitizeWorkflowErrorMessage(error.message),
      errorName: SAFE_ERROR_NAMES.has(error.name) ? error.name : 'Error',
    }
  }
  return {
    errorCode: 'non_error_throw',
    errorMessage: 'Non-Error workflow failure',
    errorName: typeof error,
  }
}

function serializedExtractionData(
  extraction: ExtractionResult,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(extraction.fields).map(([fieldName, field]) => [
      fieldName,
      {
        confidence: field.confidence,
        source_text: field.sourceText,
        value: field.value,
      },
    ]),
  )
}

function flatExtractionValues(extraction: ExtractionResult): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(extraction.fields).map(([fieldName, field]) => [
      fieldName,
      field.value,
    ]),
  )
}

function flatConfidenceScores(
  confidenceScores: Record<string, unknown>,
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const [fieldName, value] of Object.entries(confidenceScores)) {
    if (
      fieldName !== '_overall' &&
      typeof value === 'object' &&
      value !== null &&
      'score' in value &&
      typeof (value as { score?: unknown }).score === 'number'
    ) {
      result[fieldName] = (value as { score: number }).score
    }
  }
  return result
}

function serializeRedFlags(flags: readonly RedFlag[]): Record<string, unknown>[] {
  return flags.map((flag) => ({
    description: flag.description,
    name: flag.name,
    rule_id: flag.ruleId,
    severity: flag.severity,
    triggered_value: flag.triggeredValue,
  }))
}

function defaultConfig(env: Env): MultiPassExtractionConfig {
  return {
    costCeilingCents: Number(env.OPENROUTER_COST_CEILING_CENTS ?? 300),
    escalationThreshold: Number(env.EXTRACTION_ESCALATION_THRESHOLD ?? 0.6),
    pass1Models: [
      env.PASS1_MODEL ?? 'google/gemini-3-flash',
      env.PASS1_FALLBACK_MODEL ?? 'google/gemini-2.5-flash',
    ],
    pass2Models: [
      env.PASS2_MODEL ?? 'google/gemini-3-flash',
      env.PASS2_FALLBACK_MODEL ?? 'google/gemini-2.5-flash',
    ],
    pass3Models: [
      env.PASS3_MODEL ?? 'google/gemini-3-flash',
      env.PASS3_FALLBACK_MODEL ?? 'google/gemini-2.5-flash',
    ],
  }
}

async function arrayBufferFromStoredObject(object: unknown): Promise<ArrayBuffer> {
  if (
    typeof object === 'object' &&
    object !== null &&
    'arrayBuffer' in object &&
    typeof object.arrayBuffer === 'function'
  ) {
    return (await object.arrayBuffer()) as ArrayBuffer
  }
  throw new Error('Stored PDF object was not found')
}

async function defaultLoadExtractionAndPdf(
  input: ExtractionWorkflowInput,
  env: Env,
): Promise<LoadedExtractionPdf> {
  const record = await loadWorkflowExtractionDocument(input.extractionId, env)
  await transitionExtractionStatus(
    { extractionId: input.extractionId, targetStatus: 'extracting' },
    env,
  )
  const stored = await createStorage(env).getObject(record.documentObjectKey)
  return {
    documentFilename: record.documentFilename,
    ownerId: record.ownerId,
    pdfBytes: await arrayBufferFromStoredObject(stored),
  }
}

async function defaultRunExtraction(
  input: LoadedExtractionPdf,
  env: Env,
): Promise<MultiPassExtractionResult> {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is required')
  }
  const registry = buildLextractRegistry()
  const clientOptions =
    env.OPENROUTER_BASE_URL === undefined
      ? { apiKey: env.OPENROUTER_API_KEY }
      : { apiKey: env.OPENROUTER_API_KEY, baseUrl: env.OPENROUTER_BASE_URL }
  return runMultiPassExtraction({
    client: new OpenRouterClient(clientOptions),
    config: defaultConfig(env),
    fileName: input.documentFilename,
    pdfBytes: input.pdfBytes,
    prompt: buildExtractionPrompt(registry),
    registry,
  })
}

async function defaultScoreConfidence(
  extraction: ExtractionResult,
): Promise<ScoreConfidenceResult> {
  const registry = buildLextractRegistry()
  const fieldScores = scoreConfidence(extraction, registry)
  const overall = scoreOverallConfidence(fieldScores, registry)
  return {
    confidenceScores: {
      ...fieldScores,
      _overall: overall,
    },
    overallConfidence: overall.overallScore,
  }
}

async function defaultDetectRedFlags(
  extraction: ExtractionResult,
  confidenceScores: Record<string, unknown>,
): Promise<DetectRedFlagsResult> {
  const flatData = flatExtractionValues(extraction)
  const redFlags = detectRedFlags(flatData)
  return {
    redFlags,
    showCamAudit: shouldShowCamAudit(
      redFlags,
      flatData,
      flatConfidenceScores(confidenceScores),
    ),
  }
}

export function defaultExtractionWorkflowDependencies(): ExtractionWorkflowDependencies {
  return {
    completeExtraction: async (input, env) => {
      const transitioned = await transitionExtractionStatus(
        { extractionId: input.extractionId, targetStatus: 'complete' },
        env,
      )
      if (transitioned && env.EMAIL_QUEUE) {
        const complete: EmailQueueMessage = {
          extractionId: input.extractionId,
          kind: 'extraction-complete',
        }
        const camFlags: EmailQueueMessage = {
          extractionId: input.extractionId,
          kind: 'cam-flags',
        }
        const anonymousNotify: EmailQueueMessage = {
          extractionId: input.extractionId,
          kind: 'anonymous-notify',
        }
        const results = await Promise.allSettled([
          env.EMAIL_QUEUE.send(complete),
          env.EMAIL_QUEUE.send(camFlags, { delaySeconds: 1800 }),
          env.EMAIL_QUEUE.send(anonymousNotify),
        ])
        for (const result of results) {
          if (result.status === 'rejected') {
            console.error('Failed to enqueue extraction email', {
              error:
                result.reason instanceof Error
                  ? result.reason.message
                  : 'Unknown queue error',
              extractionId: input.extractionId,
            })
          }
        }
      }
      return transitioned
    },
    detectRedFlags: defaultDetectRedFlags,
    loadExtractionAndPdf: defaultLoadExtractionAndPdf,
    markFailed: markExtractionFailed,
    persistConfidence,
    persistExtractionResult: persistExtractionOutput,
    persistRedFlags,
    runExtraction: defaultRunExtraction,
    scoreConfidence: defaultScoreConfidence,
    markScoring: (input, env) =>
      transitionExtractionStatus(
        { extractionId: input.extractionId, targetStatus: 'scoring' },
        env,
      ),
  }
}

function serializedPassRecords(
  passRecords: readonly ExtractionPassRecord[],
): Record<string, unknown>[] {
  return passRecords.map((record) => {
    const serialized: Record<string, unknown> = {
      costCents: record.costCents,
      inputTokens: record.inputTokens,
      model: record.model,
      outputTokens: record.outputTokens,
      passKind: record.passKind,
      passNumber: record.passNumber,
      succeeded: record.succeeded,
    }
    if (record.errorMessage !== undefined) {
      serialized.errorMessage = record.errorMessage
    }
    return serialized
  })
}

function safeModelSegment(model: string): string {
  const normalized = model.replace(/[^A-Za-z0-9._-]+/g, '_')
  return /^[A-Za-z0-9]/.test(normalized) ? normalized : `model_${normalized}`
}

async function storeRawResponses(
  input: {
    extractionId: string
    ownerId: string
    passRecords: readonly ExtractionPassRecord[]
    rawResponses: readonly string[]
  },
  env: Env,
): Promise<string[]> {
  if (input.rawResponses.length === 0) {
    return []
  }

  const storage = createStorage(env)
  const successfulPassRecords = input.passRecords.filter(
    (record) => record.succeeded,
  )
  const keys: string[] = []
  for (const [index, rawResponse] of input.rawResponses.entries()) {
    const record = successfulPassRecords[index]
    const passKind =
      record === undefined ? `pass-${index + 1}` : `${record.passKind}`
    const model = record === undefined ? `response-${index + 1}` : record.model
    const key = await storage.putRawExtractionResponse(
      {
        extractionId: input.extractionId,
        model: safeModelSegment(model),
        ownerId: input.ownerId,
        passKind,
      },
      rawResponse,
    )
    keys.push(key)
  }
  return keys
}

async function runAndStoreExtraction(
  input: {
    extractionId: string
    loaded: LoadedExtractionPdf
  },
  env: Env,
  dependencies: ExtractionWorkflowDependencies,
): Promise<PreparedExtractionWorkflowResult> {
  const extracted = await dependencies.runExtraction(input.loaded, env)
  const rawResponseObjectKeys = await storeRawResponses(
    {
      extractionId: input.extractionId,
      ownerId: input.loaded.ownerId,
      passRecords: extracted.passRecords,
      rawResponses: extracted.rawResponses,
    },
    env,
  )
  return {
    extraction: extracted.extraction,
    extractionCostCents: extracted.extractionCostCents,
    passRecords: serializedPassRecords(extracted.passRecords),
    rawResponseObjectKeys,
    totalTokens: extracted.totalTokens,
  }
}

export async function runExtractionWorkflow(
  input: ExtractionWorkflowInput,
  step: ExtractionWorkflowStep,
  env: Env,
  dependencies: ExtractionWorkflowDependencies = defaultExtractionWorkflowDependencies(),
): Promise<{ extractionId: string; status: 'complete' }> {
  try {
    const extracted = await step.do('load PDF and run OpenRouter extraction', async () =>
      runAndStoreExtraction(
        {
          extractionId: input.extractionId,
          loaded: await dependencies.loadExtractionAndPdf(input, env),
        },
        env,
        dependencies,
      ),
    )
    await step.do('persist extraction result', () =>
      dependencies.persistExtractionResult(
        {
          documentPageCount: null,
          extractedData: serializedExtractionData(extracted.extraction),
          extractionCostCents: extracted.extractionCostCents,
          extractionId: input.extractionId,
          passRecords: extracted.passRecords,
          rawResponseObjectKeys: extracted.rawResponseObjectKeys,
          totalTokens: extracted.totalTokens,
        },
        env,
      ),
    )
    await step.do('mark extraction scoring', () =>
      dependencies.markScoring({ extractionId: input.extractionId }, env),
    )

    const scored = await step.do('score confidence', () =>
      dependencies.scoreConfidence(extracted.extraction, env),
    )
    await step.do('persist confidence', () =>
      dependencies.persistConfidence(
        {
          confidenceScores: scored.confidenceScores,
          extractionId: input.extractionId,
          overallConfidence: scored.overallConfidence,
        },
        env,
      ),
    )

    const flags = await step.do('detect red flags', () =>
      dependencies.detectRedFlags(
        extracted.extraction,
        scored.confidenceScores,
        env,
      ),
    )
    await step.do('persist red flags', () =>
      dependencies.persistRedFlags(
        {
          extractionId: input.extractionId,
          redFlags: serializeRedFlags(flags.redFlags),
          showCamAudit: flags.showCamAudit,
        },
        env,
      ),
    )

    await step.do('mark complete and enqueue emails', () =>
      dependencies.completeExtraction({ extractionId: input.extractionId }, env),
    )
    return { extractionId: input.extractionId, status: 'complete' }
  } catch (error) {
    console.error('Extraction workflow failed', {
      ...workflowErrorDetails(error),
      extractionId: input.extractionId,
    })
    try {
      await step.do('mark extraction failed', () =>
        dependencies.markFailed(
          {
            errorMessage: SAFE_EXTRACTION_FAILURE_MESSAGE,
            extractionId: input.extractionId,
          },
          env,
        ),
      )
    } catch {
      // Preserve the root extraction failure for observability and retries.
    }
    throw new Error('Extraction workflow failed')
  }
}

export class ExtractionWorkflow extends WorkflowEntrypoint<Env, ExtractionWorkflowInput> {
  override async run(
    event: WorkflowEvent<ExtractionWorkflowInput>,
    step: WorkflowStep,
  ): Promise<{ extractionId: string; status: 'complete' }> {
    return runExtractionWorkflow(event.payload, step, this.env)
  }
}
