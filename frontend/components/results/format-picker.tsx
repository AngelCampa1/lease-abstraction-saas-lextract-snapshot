'use client'

import { FileText, FileSpreadsheet, File } from 'lucide-react'
import type { ExportFormat } from '@/hooks/use-export'
import { APP_STATUS_COLORS, INTERACTIVE_TARGET_CLASSES } from '@/lib/design-tokens'

interface FormatOption {
  value: ExportFormat
  label: string
  description: string
  icon: typeof FileText
}

const FORMAT_OPTIONS: FormatOption[] = [
  { value: 'docx', label: 'Word', description: '.docx document', icon: FileText },
  { value: 'pdf', label: 'PDF', description: '.pdf report', icon: File },
  { value: 'xlsx', label: 'Excel', description: '.xlsx spreadsheet', icon: FileSpreadsheet },
]

interface FormatPickerProps {
  value: ExportFormat
  onChange: (format: ExportFormat) => void
}

export function FormatPicker({ value, onChange }: FormatPickerProps) {
  return (
    <div className="flex flex-wrap gap-2" data-testid="format-picker">
      {FORMAT_OPTIONS.map((option) => {
        const isSelected = value === option.value
        const Icon = option.icon
        return (
          <button
            key={option.value}
            type="button"
            data-testid={`format-option-${option.value}`}
            data-selected={isSelected ? 'true' : 'false'}
            className={`flex min-h-11 min-w-[7rem] flex-1 flex-col items-center gap-1 border p-3 text-center transition-colors ${INTERACTIVE_TARGET_CLASSES.inline} ${
              isSelected
                ? APP_STATUS_COLORS.processing.badge
                : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-accent'
            }`}
            aria-pressed={isSelected}
            onClick={() => onChange(option.value)}
          >
            <Icon className="size-5" />
            <span className="text-sm font-medium">{option.label}</span>
            <span className="text-xs opacity-70">{option.description}</span>
          </button>
        )
      })}
    </div>
  )
}
