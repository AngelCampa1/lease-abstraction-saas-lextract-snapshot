'use client'

import { motion, AnimatePresence } from 'motion/react'
import { Check, X, Loader2 } from 'lucide-react'
import type { ExtractionStatus } from '@/hooks/use-extraction'
import { STATUS_COLORS } from '@/lib/design-tokens'

export interface PipelineStep {
  readonly key: string
  readonly label: string
  readonly progress: number
}

export const PIPELINE_STEPS: readonly PipelineStep[] = [
  { key: 'uploading', label: 'Uploading document...', progress: 20 },
  { key: 'extracting', label: 'Reading PDF...', progress: 50 },
  { key: 'scoring', label: 'Scoring confidence...', progress: 85 },
  { key: 'complete', label: 'Complete', progress: 100 },
] as const

function getStepIndex(status: ExtractionStatus): number {
  const index = PIPELINE_STEPS.findIndex((s) => s.key === status)
  return index === -1 ? 0 : index
}

function getProgressForStatus(status: ExtractionStatus): number {
  if (status === 'failed') return 0
  const index = getStepIndex(status)
  return PIPELINE_STEPS[index].progress
}

interface StepCircleProps {
  state: 'completed' | 'current' | 'future' | 'failed'
}

function StepCircle({ state }: StepCircleProps) {
  if (state === 'completed') {
    return (
      <motion.div
        data-testid="step-check"
        className={`flex size-8 items-center justify-center rounded-full ${STATUS_COLORS.success.bg} text-white`}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      >
        <Check className="size-4" />
      </motion.div>
    )
  }

  if (state === 'current') {
    return (
      <div
        data-testid="step-spinner"
        className={`flex size-8 items-center justify-center rounded-full ${STATUS_COLORS.active.bg} text-white`}
      >
        <Loader2 className="size-4 animate-spin" />
      </div>
    )
  }

  if (state === 'failed') {
    return (
      <motion.div
        data-testid="step-failed"
        className={`flex size-8 items-center justify-center rounded-full ${STATUS_COLORS.error.bg} text-white`}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      >
        <X className="size-4" />
      </motion.div>
    )
  }

  return (
    <div
      data-testid="step-future"
      className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
    >
      <div className="size-2 rounded-full bg-muted-foreground/40" />
    </div>
  )
}

function getStepState(
  stepIndex: number,
  currentIndex: number,
  status: ExtractionStatus
): 'completed' | 'current' | 'future' | 'failed' {
  const isTerminal = status === 'complete'

  if (isTerminal) return 'completed'
  if (status === 'failed' && stepIndex === currentIndex) return 'failed'
  if (stepIndex < currentIndex) return 'completed'
  if (stepIndex === currentIndex) return 'current'
  return 'future'
}

interface StepProgressProps {
  status: ExtractionStatus
}

export function StepProgress({ status }: StepProgressProps) {
  const currentIndex = getStepIndex(status)
  const progress = getProgressForStatus(status)

  return (
    <div className="space-y-6">
      {/* Overall progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Overall progress</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <div
          data-testid="progress-bar"
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
        >
          <motion.div
            data-testid="progress-bar-fill"
            className="h-full rounded-full bg-primary"
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 80, damping: 20 }}
          />
        </div>
      </div>

      {/* Vertical stepper */}
      <div className="space-y-0">
        {PIPELINE_STEPS.map((step, index) => {
          const state = getStepState(index, currentIndex, status)

          return (
            <div key={step.key}>
              <div className="flex items-center gap-3 py-2">
                <StepCircle state={state} />
                <AnimatePresence mode="wait">
                  <motion.span
                    key={`${step.key}-${state}`}
                    className={
                      state === 'completed'
                        ? `text-sm font-medium ${STATUS_COLORS.success.text}`
                        : state === 'current'
                          ? `text-sm font-medium ${STATUS_COLORS.active.text}`
                          : state === 'failed'
                            ? `text-sm font-medium ${STATUS_COLORS.error.text}`
                            : 'text-sm text-muted-foreground'
                    }
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    {step.label}
                  </motion.span>
                </AnimatePresence>
              </div>
              {/* Connector line between steps */}
              {index < PIPELINE_STEPS.length - 1 && (
                <div
                  data-testid="step-connector"
                  className={`ml-[15px] h-4 w-0.5 ${
                    index < currentIndex || status === 'complete'
                      ? STATUS_COLORS.success.bg
                      : 'bg-muted'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
