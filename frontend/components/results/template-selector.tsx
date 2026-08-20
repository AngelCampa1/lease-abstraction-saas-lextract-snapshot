'use client'

import { APP_STATUS_COLORS, INTERACTIVE_TARGET_CLASSES } from '@/lib/design-tokens'

const TEMPLATE_OPTIONS = [
  { value: 'commercial', label: 'Commercial' },
  { value: 'office', label: 'Office' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'retail', label: 'Retail' },
] as const

interface TemplateSelectorProps {
  value: string
  onChange: (template: string) => void
}

export function TemplateSelector({ value, onChange }: TemplateSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1.5" data-testid="template-selector">
      {TEMPLATE_OPTIONS.map((option) => {
        const isSelected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            data-testid={`template-option-${option.value}`}
            data-selected={isSelected ? 'true' : 'false'}
            className={`min-h-10 px-3 py-1.5 text-sm font-medium transition-colors ${INTERACTIVE_TARGET_CLASSES.inline} ${
              isSelected
                ? APP_STATUS_COLORS.processing.badge
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
