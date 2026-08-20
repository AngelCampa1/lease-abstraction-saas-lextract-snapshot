'use client'

import { useRef, useEffect, useState } from 'react'

interface FieldEditInputProps {
  fieldName: string
  currentValue: unknown
  onSave: (value: unknown) => void
  onCancel: () => void
}

const NUMERIC_SUFFIXES = [
  '_days',
  '_months',
  '_percentage',
  '_psf',
  '_amount',
  '_total',
  '_rate',
  '_cost',
]

function getInputType(
  fieldName: string,
  currentValue: unknown,
): 'text' | 'number' | 'date' | 'boolean' {
  if (fieldName.endsWith('_date')) return 'date'
  if (typeof currentValue === 'boolean') return 'boolean'
  for (const suffix of NUMERIC_SUFFIXES) {
    if (fieldName.endsWith(suffix)) return 'number'
  }
  return 'text'
}

function toStringValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function toAccessibleLabel(fieldName: string): string {
  const words = fieldName.replace(/_/g, ' ').trim()
  if (words === '') return 'Edit field value'
  return `Edit ${words}`
}

export function FieldEditInput({
  fieldName,
  currentValue,
  onSave,
  onCancel,
}: FieldEditInputProps) {
  const inputType = getInputType(fieldName, currentValue)
  const accessibleLabel = toAccessibleLabel(fieldName)
  const inputRef = useRef<HTMLInputElement>(null)
  const selectRef = useRef<HTMLSelectElement>(null)
  const [textValue, setTextValue] = useState(toStringValue(currentValue))
  const [numberValue, setNumberValue] = useState<string>(
    currentValue !== null && currentValue !== undefined ? String(currentValue) : '',
  )
  const [dateValue, setDateValue] = useState(toStringValue(currentValue))
  const [booleanValue, setBooleanValue] = useState(
    currentValue === true ? 'true' : 'false',
  )

  useEffect(() => {
    if (inputType === 'boolean') {
      selectRef.current?.focus()
    } else {
      inputRef.current?.focus()
    }
  }, [inputType])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveCurrentValue()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  function saveCurrentValue() {
    switch (inputType) {
      case 'text':
        onSave(textValue)
        break
      case 'number': {
        if (numberValue === '') {
          onSave(null)
          break
        }
        const num = Number(numberValue)
        onSave(Number.isNaN(num) ? numberValue : num)
        break
      }
      case 'date':
        onSave(dateValue)
        break
      case 'boolean':
        onSave(booleanValue === 'true')
        break
    }
  }

  const baseClasses =
    'w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring'

  if (inputType === 'boolean') {
    return (
      <select
        ref={selectRef}
        value={booleanValue}
        onChange={(e) => setBooleanValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className={baseClasses}
        aria-label={accessibleLabel}
        data-testid="boolean-select"
      >
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    )
  }

  if (inputType === 'date') {
    return (
      <input
        ref={inputRef}
        type="date"
        value={dateValue}
        onChange={(e) => setDateValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className={baseClasses}
        aria-label={accessibleLabel}
        data-testid="date-input"
      />
    )
  }

  if (inputType === 'number') {
    return (
      <input
        ref={inputRef}
        type="number"
        value={numberValue}
        onChange={(e) => setNumberValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className={baseClasses}
        step="any"
        aria-label={accessibleLabel}
        data-testid="number-input"
      />
    )
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={textValue}
      onChange={(e) => setTextValue(e.target.value)}
      onKeyDown={handleKeyDown}
      className={baseClasses}
      aria-label={accessibleLabel}
      data-testid="text-input"
    />
  )
}
