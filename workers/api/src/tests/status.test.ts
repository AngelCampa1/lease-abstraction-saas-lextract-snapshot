import { describe, expect, it } from 'vitest'

import {
  InvalidExtractionStatusTransitionError,
  isExtractionWorkflowStatus,
  validateExtractionStatusTransition,
} from '../domain/status'

describe('extraction workflow status domain', () => {
  it('accepts valid workflow statuses and transitions', () => {
    expect(isExtractionWorkflowStatus('uploading')).toBe(true)
    expect(isExtractionWorkflowStatus('bogus')).toBe(false)

    expect(() =>
      validateExtractionStatusTransition('uploading', 'extracting'),
    ).not.toThrow()
    expect(() =>
      validateExtractionStatusTransition('extracting', 'scoring'),
    ).not.toThrow()
    expect(() =>
      validateExtractionStatusTransition('scoring', 'complete'),
    ).not.toThrow()
    expect(() =>
      validateExtractionStatusTransition('scoring', 'failed'),
    ).not.toThrow()
  })

  it('rejects invalid terminal or skipped transitions', () => {
    expect(() =>
      validateExtractionStatusTransition('uploading', 'complete'),
    ).toThrow(InvalidExtractionStatusTransitionError)
    expect(() =>
      validateExtractionStatusTransition('complete', 'failed'),
    ).toThrow("Invalid status transition from 'complete' to 'failed'")
  })
})
