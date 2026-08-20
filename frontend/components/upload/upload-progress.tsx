'use client'

import { motion } from 'motion/react'
import { FileText } from 'lucide-react'

interface UploadProgressProps {
  fileName: string
  progress: number
}

export function UploadProgress({ fileName, progress }: UploadProgressProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress))

  return (
    <div className="space-y-3" data-testid="upload-progress" aria-live="polite">
      <div className="flex items-center gap-3">
        <FileText className="size-5 text-muted-foreground shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" data-testid="upload-file-name" title={fileName}>
            {fileName}
          </p>
        </div>
        <span className="text-sm font-medium tabular-nums text-muted-foreground" data-testid="upload-percentage">
          {Math.round(clampedProgress)}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ ease: 'easeOut', duration: 0.3 }}
          data-testid="upload-progress-bar"
        />
      </div>
    </div>
  )
}
