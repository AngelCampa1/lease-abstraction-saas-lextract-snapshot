import { getRedFlagRules, isCamRelatedRuleId, isCamRelevantField } from './rules.js'
import type { RedFlag } from './rules.js'

const CONFIDENCE_THRESHOLD = 0.6

export function detectRedFlags(extractedData: Readonly<Record<string, unknown>>): RedFlag[] {
  return getRedFlagRules().flatMap((rule) => {
    const result = rule.evaluate(extractedData)
    return result === null ? [] : [result]
  })
}

export function shouldShowCamAudit(
  redFlags: readonly RedFlag[],
  extractedData: Readonly<Record<string, unknown>>,
  confidenceScores?: Readonly<Record<string, number>>,
): boolean {
  if (redFlags.some((flag) => isCamRelatedRuleId(flag.ruleId))) {
    return true
  }

  if (extractedData.audit_rights === true) {
    return true
  }

  if (typeof extractedData.lease_structure_type === 'string') {
    const leaseType = extractedData.lease_structure_type.toLowerCase()
    if (leaseType.includes('nnn') || leaseType.includes('modified gross')) {
      return true
    }
  }

  if (confidenceScores !== undefined) {
    const lowConfidenceCamCount = Object.entries(confidenceScores).filter(
      ([fieldName, score]) => isCamRelevantField(fieldName) && score <= CONFIDENCE_THRESHOLD,
    ).length
    return lowConfidenceCamCount >= 3
  }

  return false
}
