import { describe, expect, it } from 'vitest'
import sampleFlagFixture from '../../extract-sdk/tests/fixtures/sample_extraction_for_flags.json' with { type: 'json' }
import {
  CAM_RELATED_RULE_IDS,
  CAM_RELEVANT_FIELDS,
  buildLextractRegistry,
  detectRedFlags,
  getCamRelatedRuleIds,
  getCamRelevantFields,
  redFlagRules,
  shouldShowCamAudit,
} from '../src/index.js'

const safeData = {
  management_fee_cap: 10,
  audit_rights: true,
  cam_cap_percentage: 5,
  cap_cumulative_vs_annual: 'annual',
  lease_structure_type: 'Full Service Gross',
  gross_up_percentage: 95,
  cam_exclusions: ['capital improvements'],
  monetary_cure_period: 30,
  holdover_rate: 150,
  has_termination_option: true,
  lease_term_months: 60,
  restoration_requirement: false,
  tenant_work_description: 'Standard office buildout',
  has_renewal_option: true,
  recapture_right: false,
  base_year_gross_up: true,
  base_year: '2024',
  reconciliation_frequency: 'annual',
  cam_audit_deadline_days: 120,
  force_majeure_clause: true,
  auto_renewal: false,
  auto_renewal_terms: null,
  casualty_termination_right: 'Either party may terminate after substantial damage',
  relocation_right: false,
  has_purchase_option: false,
} satisfies Record<string, unknown>

describe('detectRedFlags', () => {
  it('runs RF-001 through RF-020 from a table-driven rule list', () => {
    expect(redFlagRules.map((rule) => rule.id)).toEqual(
      Array.from({ length: 20 }, (_, index) => `RF-${String(index + 1).padStart(3, '0')}`),
    )
  })

  it('protects exported red flag collections from consumer mutation', () => {
    Reflect.set(redFlagRules, 'length', 0)
    const firstRule = redFlagRules[0]
    if (firstRule !== undefined) {
      Reflect.set(firstRule, 'id', 'RF-999')
    }
    Reflect.set(CAM_RELATED_RULE_IDS, 'length', 0)
    Reflect.set(CAM_RELEVANT_FIELDS, 'length', 0)
    expect(() => Set.prototype.delete.call(CAM_RELATED_RULE_IDS, 'RF-001')).toThrow(TypeError)
    expect(() => Set.prototype.delete.call(CAM_RELEVANT_FIELDS, 'management_fee_cap')).toThrow(TypeError)
    const copiedCamRules = getCamRelatedRuleIds()
    const copiedCamFields = getCamRelevantFields()
    Set.prototype.delete.call(copiedCamRules, 'RF-001')
    Set.prototype.delete.call(copiedCamFields, 'management_fee_cap')

    const flags = detectRedFlags({ ...safeData, management_fee_cap: 20 })

    expect(flags.map((flag) => flag.ruleId)).toContain('RF-001')
    expect(shouldShowCamAudit(flags, safeData)).toBe(true)
    expect(
      shouldShowCamAudit([], { lease_structure_type: 'Full Service Gross' }, {
        cam_cap_percentage: 0.4,
        cam_exclusions: 0.3,
        management_fee_cap: 0.45,
      }),
    ).toBe(true)
  })

  it('mirrors the Python fixture outcomes for the legacy RF-001 through RF-015 fixture', () => {
    const flags = detectRedFlags(sampleFlagFixture)
    const ruleIds = flags.map((flag) => flag.ruleId)

    expect(ruleIds).toEqual([
      ...Array.from({ length: 15 }, (_, index) => `RF-${String(index + 1).padStart(3, '0')}`),
      'RF-016',
      'RF-018',
      'RF-020',
    ])
    expect(flags[0]).toMatchObject({
      ruleId: 'RF-001',
      name: 'Excessive Management Fee',
      severity: 'high',
      triggeredValue: '18%',
    })
  })

  it.each([
    ['RF-016', { force_majeure_clause: false }],
    ['RF-017', { auto_renewal: true, auto_renewal_terms: '' }],
    ['RF-018', { casualty_termination_right: null }],
    ['RF-019', { relocation_right: true }],
    ['RF-020', { has_purchase_option: null }],
  ])('detects %s', (ruleId, override) => {
    const flags = detectRedFlags({ ...safeData, ...override })

    expect(flags.map((flag) => flag.ruleId)).toContain(ruleId)
  })

  it('treats empty data as missing for null-triggered protections', () => {
    const ruleIds = new Set(detectRedFlags({}).map((flag) => flag.ruleId))

    expect(ruleIds).toEqual(new Set(['RF-001', 'RF-002', 'RF-003', 'RF-006', 'RF-016', 'RF-018', 'RF-020']))
  })

  it('handles numeric edge cases from model output', () => {
    expect(detectRedFlags({ ...safeData, management_fee_cap: '18' }).map((flag) => flag.ruleId)).toContain('RF-001')
    expect(detectRedFlags({ ...safeData, management_fee_cap: 0.18 })[0]?.triggeredValue).toBe('18%')
    expect(detectRedFlags({ ...safeData, management_fee_cap: 'not a number' }).map((flag) => flag.ruleId)).toContain('RF-001')
    expect(detectRedFlags({ ...safeData, management_fee_cap: [15] }).map((flag) => flag.ruleId)).toContain('RF-001')
    expect(detectRedFlags({ ...safeData, holdover_rate: 2.5 })[0]?.triggeredValue).toBe('250%')
  })
})

describe('shouldShowCamAudit', () => {
  it('shows for CAM flags, audit rights, NNN leases, or three low-confidence CAM fields', () => {
    expect(shouldShowCamAudit(detectRedFlags({ ...safeData, management_fee_cap: 20 }), safeData)).toBe(true)
    expect(shouldShowCamAudit([], { audit_rights: true })).toBe(true)
    expect(shouldShowCamAudit([], { lease_structure_type: 'Modified Gross' })).toBe(true)
    expect(
      shouldShowCamAudit([], { lease_structure_type: 'Full Service Gross' }, {
        cam_cap_percentage: 0.4,
        cam_exclusions: 0.3,
        management_fee_cap: 0.45,
      }),
    ).toBe(true)
  })

  it('does not show for unrelated low-risk data', () => {
    expect(
      shouldShowCamAudit([], { lease_structure_type: 'Full Service Gross', audit_rights: false }, {
        cam_cap_percentage: 0.95,
        cam_exclusions: 0.9,
        management_fee_cap: 0.88,
      }),
    ).toBe(false)

    expect(shouldShowCamAudit([], { lease_structure_type: 'Full Service Gross' })).toBe(false)
  })

  it('exports CAM rule and schema-derived field sets', () => {
    const expectedCamFields = new Set(
      buildLextractRegistry()
        .fields.filter((field) => field.camRelevant)
        .map((field) => field.fieldName),
    )

    expect(CAM_RELATED_RULE_IDS).toEqual(['RF-001', 'RF-002', 'RF-003', 'RF-004', 'RF-005', 'RF-006', 'RF-013', 'RF-014', 'RF-015'])
    expect(CAM_RELEVANT_FIELDS).toEqual([...expectedCamFields])
    expect(getCamRelatedRuleIds()).toEqual(new Set(CAM_RELATED_RULE_IDS))
    expect(getCamRelevantFields()).toEqual(expectedCamFields)
  })
})
