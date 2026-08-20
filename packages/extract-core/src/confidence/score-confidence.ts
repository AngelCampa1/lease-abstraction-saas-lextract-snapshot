import type { ExtractionResult, FieldExtractionValue, LextractRegistry } from '../models.js'

export type ConfidenceTier = 'high' | 'medium' | 'low' | 'not_found'

export interface ConfidenceScore {
  readonly score: number
  readonly tier: ConfidenceTier
  readonly llmConfidence: number
}

export interface OverallConfidence {
  readonly overallScore: number
  readonly tier: Exclude<ConfidenceTier, 'not_found'>
  readonly needsReview: boolean
  readonly lowConfidenceFields: readonly string[]
}

interface CrossFieldPenalty {
  readonly fieldName: string
  readonly penaltyFactor: number
}

const CROSS_FIELD_PENALTY = 0.7
const PRO_RATA_TOLERANCE = 0.02
const LEASE_TERM_TOLERANCE_MONTHS = 1
const HIGH_THRESHOLD = 0.85
const MEDIUM_THRESHOLD = 0.6

export function assignConfidenceTier(score: number): Exclude<ConfidenceTier, 'not_found'> {
  if (score >= HIGH_THRESHOLD) {
    return 'high'
  }
  if (score >= MEDIUM_THRESHOLD) {
    return 'medium'
  }
  return 'low'
}

function safeFloat(value: unknown): number | null {
  if (value === null || value === undefined || typeof value === 'boolean') {
    return null
  }
  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

function safeParseDate(value: unknown): Date | null {
  if (typeof value !== 'string') {
    return null
  }

  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function validateProRataShare(fields: Readonly<Record<string, FieldExtractionValue>>): CrossFieldPenalty[] {
  const proRata = safeFloat(fields.pro_rata_share?.value)
  const tenantRsf = safeFloat(fields.rentable_square_footage?.value)
  const buildingRsf = safeFloat(fields.building_total_rsf?.value)
  if (proRata === null || tenantRsf === null || buildingRsf === null || buildingRsf === 0) {
    return []
  }

  const expectedRatio = tenantRsf / buildingRsf
  if (expectedRatio === 0) {
    return []
  }

  const expectedPercent = expectedRatio * 100
  const expected = Math.abs(proRata - expectedRatio) < Math.abs(proRata - expectedPercent) ? expectedRatio : expectedPercent
  const relativeDiff = Math.abs(proRata - expected) / Math.abs(expected)

  if (relativeDiff <= PRO_RATA_TOLERANCE) {
    return []
  }

  return [
    { fieldName: 'pro_rata_share', penaltyFactor: CROSS_FIELD_PENALTY },
    { fieldName: 'rentable_square_footage', penaltyFactor: CROSS_FIELD_PENALTY },
    { fieldName: 'building_total_rsf', penaltyFactor: CROSS_FIELD_PENALTY },
  ]
}

function validateDateConsistency(fields: Readonly<Record<string, FieldExtractionValue>>): CrossFieldPenalty[] {
  const commencement = safeParseDate(fields.commencement_date?.value)
  const expiration = safeParseDate(fields.expiration_date?.value)
  if (commencement === null || expiration === null) {
    return []
  }

  const penalties: CrossFieldPenalty[] = []
  if (commencement.getTime() >= expiration.getTime()) {
    penalties.push(
      { fieldName: 'commencement_date', penaltyFactor: CROSS_FIELD_PENALTY },
      { fieldName: 'expiration_date', penaltyFactor: CROSS_FIELD_PENALTY },
    )
  }

  const rentCommencement = safeParseDate(fields.rent_commencement_date?.value)
  if (
    rentCommencement !== null &&
    commencement.getTime() < expiration.getTime() &&
    (rentCommencement.getTime() < commencement.getTime() || rentCommencement.getTime() > expiration.getTime())
  ) {
    penalties.push({ fieldName: 'rent_commencement_date', penaltyFactor: CROSS_FIELD_PENALTY })
  }

  return penalties
}

function validateLeaseTerm(fields: Readonly<Record<string, FieldExtractionValue>>): CrossFieldPenalty[] {
  const term = safeFloat(fields.lease_term_months?.value)
  const commencement = safeParseDate(fields.commencement_date?.value)
  const expiration = safeParseDate(fields.expiration_date?.value)
  if (term === null || commencement === null || expiration === null || commencement.getTime() >= expiration.getTime()) {
    return []
  }

  const monthDiff = (expiration.getUTCFullYear() - commencement.getUTCFullYear()) * 12 +
    (expiration.getUTCMonth() - commencement.getUTCMonth())

  if (Math.abs(term - monthDiff) <= LEASE_TERM_TOLERANCE_MONTHS) {
    return []
  }

  return [{ fieldName: 'lease_term_months', penaltyFactor: CROSS_FIELD_PENALTY }]
}

function runCrossFieldValidations(fields: Readonly<Record<string, FieldExtractionValue>>): CrossFieldPenalty[] {
  return [
    ...validateProRataShare(fields),
    ...validateDateConsistency(fields),
    ...validateLeaseTerm(fields),
  ]
}

function roundScore(score: number): number {
  return Math.round(score * 10000) / 10000
}

export function scoreConfidence(
  extraction: ExtractionResult,
  registry: LextractRegistry,
): Record<string, ConfidenceScore> {
  const penalties = runCrossFieldValidations(extraction.fields)
  const penaltyMap = new Map<string, number[]>()
  for (const penalty of penalties) {
    const existing = penaltyMap.get(penalty.fieldName) ?? []
    existing.push(penalty.penaltyFactor)
    penaltyMap.set(penalty.fieldName, existing)
  }

  const result: Record<string, ConfidenceScore> = {}
  for (const [fieldName, field] of Object.entries(extraction.fields)) {
    if (registry.getField(fieldName) === undefined) {
      continue
    }

    if (field.value === null) {
      result[fieldName] = { score: 0, tier: 'not_found', llmConfidence: 0 }
      continue
    }

    let score = Math.max(0, Math.min(1, field.confidence))
    for (const penaltyFactor of penaltyMap.get(fieldName) ?? []) {
      score *= penaltyFactor
    }
    const rounded = roundScore(Math.max(0, Math.min(1, score)))
    result[fieldName] = {
      score: rounded,
      tier: assignConfidenceTier(rounded),
      llmConfidence: field.confidence,
    }
  }
  return result
}

export function scoreOverallConfidence(
  fieldScores: Readonly<Record<string, ConfidenceScore>>,
  registry: LextractRegistry,
): OverallConfidence {
  let weightedSum = 0
  let totalWeight = 0
  const lowConfidenceFields: string[] = []

  for (const [fieldName, confidence] of Object.entries(fieldScores)) {
    const field = registry.getField(fieldName)
    if (field === undefined || confidence.tier === 'not_found') {
      continue
    }

    weightedSum += confidence.score * field.weight
    totalWeight += field.weight
    if (confidence.score < MEDIUM_THRESHOLD) {
      lowConfidenceFields.push(fieldName)
    }
  }

  const overallScore = totalWeight > 0 ? roundScore(weightedSum / totalWeight) : 0
  return {
    overallScore,
    tier: assignConfidenceTier(overallScore),
    needsReview: overallScore < HIGH_THRESHOLD || lowConfidenceFields.length > 0,
    lowConfidenceFields,
  }
}
