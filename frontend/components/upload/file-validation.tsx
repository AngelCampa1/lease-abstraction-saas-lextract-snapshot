'use client'

import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle } from 'lucide-react'

interface FileValidationProps {
  error: string | null
}

export function FileValidation({ error }: FileValidationProps) {
  return (
    <AnimatePresence>
      {error ? (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
          data-testid="file-validation-error"
        >
          <AlertTriangle className="size-4 shrink-0" />
          <span>{error}</span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
