'use client'

import { useCallback, useState, useRef } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { CloudUpload } from 'lucide-react'
import { FileValidation } from '@/components/upload/file-validation'
import { captureEvent, EVENTS } from '@/lib/posthog'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

interface DropzoneProps {
  onFileAccepted: (file: File) => void
  disabled?: boolean
}

function mapRejectionToMessage(rejection: FileRejection): string {
  const error = rejection.errors[0]
  if (!error) {
    return 'This file could not be uploaded.'
  }
  switch (error.code) {
    case 'file-invalid-type':
      return 'Only PDF files are accepted.'
    case 'file-too-large':
      return 'File exceeds the 50 MB limit.'
    case 'too-many-files':
      return 'Only one file can be uploaded at a time.'
    default:
      return error.message
  }
}

export function Dropzone({ onFileAccepted, disabled = false }: DropzoneProps) {
  const [validationError, setValidationError] = useState<string | null>(null)
  const dropzoneRef = useRef<HTMLDivElement>(null)

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      setValidationError(null)

      if (rejections.length > 0) {
        const message = mapRejectionToMessage(rejections[0])
        setValidationError(message)
        captureEvent(EVENTS.upload_file_rejected, {
          error_code: rejections[0].errors[0]?.code,
          file_type: rejections[0].file.type,
          file_size: rejections[0].file.size,
        })
        requestAnimationFrame(() => dropzoneRef.current?.focus())
        return
      }

      if (accepted.length > 0) {
        captureEvent(EVENTS.upload_file_selected, {
          file_size: accepted[0].size,
        })
        onFileAccepted(accepted[0])
      }
    },
    [onFileAccepted]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: MAX_FILE_SIZE,
    maxFiles: 1,
    disabled,
  })

  return (
    <div className="space-y-3">
      <div
        ref={dropzoneRef}
        {...getRootProps({ 'aria-label': 'Upload a lease PDF. Drag a file here or press Enter to browse.' })}
        className={`flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 text-center transition-all duration-200 outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
          disabled
            ? 'cursor-not-allowed border-muted bg-muted/50 opacity-60'
            : isDragActive
              ? 'scale-[1.02] border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
        }`}
        data-testid="dropzone"
      >
        <input
          {...getInputProps({ 'aria-label': 'Upload a lease PDF' })}
          data-testid="dropzone-input"
        />
        <CloudUpload
          aria-hidden="true"
          className={`mb-3 size-10 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`}
        />
        {disabled ? (
          <p className="text-sm font-medium text-muted-foreground">Uploading in progress…</p>
        ) : isDragActive ? (
          <p className="text-sm font-medium text-primary">Drop your PDF here</p>
        ) : (
          <>
            <p className="text-sm font-medium">
              Drag and drop your lease PDF, or click to browse
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              PDF files up to 50 MB
            </p>
          </>
        )}
      </div>
      <FileValidation error={validationError} />
    </div>
  )
}
