import { parseExtractionResponse } from './response-parser.js'
import type {
  ExtractionResult,
  FieldExtractionValue,
  LextractRegistry,
} from '../models.js'

export type ExtractionPassKind = 'pass1' | 'pass2' | 'pass3'

export interface ModelCompletionInput {
  model: string
  passKind: ExtractionPassKind
  prompt: string
  pdfBytes: ArrayBuffer
  fileName: string
}

export interface ModelCompletionResult {
  model: string
  content: string
  inputTokens: number
  outputTokens: number
  costCents: number
}

export interface ModelClient {
  complete(input: ModelCompletionInput): Promise<ModelCompletionResult>
}

export interface MultiPassExtractionConfig {
  pass1Models: readonly string[]
  pass2Models: readonly string[]
  pass3Models: readonly string[]
  escalationThreshold: number
  costCeilingCents: number
}

export interface ExtractionPassRecord {
  passKind: ExtractionPassKind
  passNumber: number
  model: string
  inputTokens: number
  outputTokens: number
  costCents: number
  succeeded: boolean
  errorMessage?: string
}

export interface MultiPassExtractionResult {
  extraction: ExtractionResult
  passRecords: readonly ExtractionPassRecord[]
  rawResponses: readonly string[]
  totalTokens: number
  extractionCostCents: number
  costCeilingHit: boolean
}

export interface RunMultiPassExtractionInput {
  client: ModelClient
  config: MultiPassExtractionConfig
  registry: LextractRegistry
  pdfBytes: ArrayBuffer
  fileName: string
  prompt: string
}

interface PassSuccess {
  extraction: ExtractionResult
  rawResponse: string
}

function mergeFields(
  base: ExtractionResult,
  incoming: ExtractionResult,
): ExtractionResult {
  return { fields: { ...base.fields, ...incoming.fields } }
}

function lowConfidenceFields(
  extraction: ExtractionResult,
  threshold: number,
): string[] {
  return Object.entries(extraction.fields)
    .filter(([, field]) => field.value !== null && field.confidence < threshold)
    .map(([fieldName]) => fieldName)
}

function filteredExtraction(
  extraction: ExtractionResult,
  allowedFields: readonly string[],
): ExtractionResult {
  const allowed = new Set(allowedFields)
  const fields: Record<string, FieldExtractionValue> = {}
  for (const [fieldName, field] of Object.entries(extraction.fields)) {
    if (allowed.has(fieldName)) {
      fields[fieldName] = field
    }
  }
  return { fields }
}

export async function runMultiPassExtraction(
  input: RunMultiPassExtractionInput,
): Promise<MultiPassExtractionResult> {
  const passRecords: ExtractionPassRecord[] = []
  const rawResponses: string[] = []
  let totalTokens = 0
  let extractionCostCents = 0
  let costCeilingHit = false
  let passNumber = 0

  async function runPass(
    passKind: ExtractionPassKind,
    models: readonly string[],
  ): Promise<PassSuccess> {
    let lastError: Error | null = null
    for (const model of models) {
      passNumber += 1
      try {
        const completion = await input.client.complete({
          fileName: input.fileName,
          model,
          passKind,
          pdfBytes: input.pdfBytes,
          prompt: input.prompt,
        })
        totalTokens += completion.inputTokens + completion.outputTokens
        extractionCostCents += completion.costCents
        costCeilingHit ||= extractionCostCents >= input.config.costCeilingCents
        passRecords.push({
          costCents: completion.costCents,
          inputTokens: completion.inputTokens,
          model: completion.model,
          outputTokens: completion.outputTokens,
          passKind,
          passNumber,
          succeeded: true,
        })
        rawResponses.push(completion.content)
        return {
          extraction: parseExtractionResponse(completion.content, input.registry),
          rawResponse: completion.content,
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Model call failed')
        passRecords.push({
          costCents: 0,
          errorMessage: lastError.message,
          inputTokens: 0,
          model,
          outputTokens: 0,
          passKind,
          passNumber,
          succeeded: false,
        })
      }
    }
    throw lastError ?? new Error(`No models configured for ${passKind}`)
  }

  const pass1 = await runPass('pass1', input.config.pass1Models)
  const pass2 = await runPass('pass2', input.config.pass2Models)
  let extraction = mergeFields(pass1.extraction, pass2.extraction)

  const escalationFields = lowConfidenceFields(
    extraction,
    input.config.escalationThreshold,
  )
  if (
    escalationFields.length > 0 &&
    input.config.pass3Models.length > 0 &&
    !costCeilingHit
  ) {
    const pass3 = await runPass('pass3', input.config.pass3Models)
    extraction = mergeFields(
      extraction,
      filteredExtraction(pass3.extraction, escalationFields),
    )
  }

  return {
    costCeilingHit,
    extraction,
    extractionCostCents,
    passRecords,
    rawResponses,
    totalTokens,
  }
}
