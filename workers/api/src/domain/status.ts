export type ExtractionWorkflowStatus =
  | 'uploading'
  | 'extracting'
  | 'scoring'
  | 'complete'
  | 'failed'

const validTransitions: Readonly<Record<ExtractionWorkflowStatus, readonly ExtractionWorkflowStatus[]>> = {
  complete: [],
  extracting: ['scoring', 'failed'],
  failed: [],
  scoring: ['complete', 'failed'],
  uploading: ['extracting', 'failed'],
}

export class InvalidExtractionStatusTransitionError extends Error {
  constructor(
    readonly currentStatus: ExtractionWorkflowStatus,
    readonly targetStatus: ExtractionWorkflowStatus,
  ) {
    super(`Invalid status transition from '${currentStatus}' to '${targetStatus}'`)
    this.name = 'InvalidExtractionStatusTransitionError'
  }
}

export function validateExtractionStatusTransition(
  currentStatus: ExtractionWorkflowStatus,
  targetStatus: ExtractionWorkflowStatus,
): void {
  if (!validTransitions[currentStatus].includes(targetStatus)) {
    throw new InvalidExtractionStatusTransitionError(currentStatus, targetStatus)
  }
}

export function isExtractionWorkflowStatus(
  value: unknown,
): value is ExtractionWorkflowStatus {
  return (
    value === 'uploading' ||
    value === 'extracting' ||
    value === 'scoring' ||
    value === 'complete' ||
    value === 'failed'
  )
}
