export const CAM_RELATED_RULE_IDS = new Set([
  'RF-001',
  'RF-002',
  'RF-003',
  'RF-004',
  'RF-005',
  'RF-006',
  'RF-013',
  'RF-014',
  'RF-015',
])

export const CAM_RULE_MESSAGES: Record<string, string> = {
  'RF-001':
    'Management fees over 15% can become a CAM recovery target once actual reconciliations arrive.',
  'RF-002':
    "Without audit rights, tenants have less leverage to verify CAM charges or demand records.",
  'RF-003':
    'No CAM cap means unlimited expense exposure and a stronger reason to review annual reconciliations.',
  'RF-004':
    'Cumulative caps compound year-over-year and can create reconciliation disputes.',
  'RF-005':
    'Missing gross-up means you overpay when the building is partially occupied.',
  'RF-006':
    'Without exclusions, capital expenditures can be passed through and should be checked against statements.',
  'RF-013':
    'Base year is not normalized to full occupancy, inflating future operating expense charges.',
  'RF-014':
    'No defined CAM reconciliation schedule makes disputes harder to initiate.',
  'RF-015':
    'Short audit window limits your ability to dispute reconciliation charges.',
}
