'use client'

import React, { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getCalculatorBySlug } from '@/data/calculators'
import { TurnstileField } from '@/components/marketing/turnstile-field'
import type { CalculatorField, CalculatorResult } from '@/data/calculators'

// ─── Types ──────────────────────────────────────────────────────────────────

interface InteractiveCalculatorProps {
  slug: string
}

interface LeadPayload {
  email: string
  firstName: string
  calculatorSlug: string
  result: string
  company_website: string
  turnstileToken: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInputStep(field: CalculatorField): number {
  if (field.step !== undefined) return field.step
  switch (field.type) {
    case 'percent':
      return 0.1
    case 'currency':
      return 1
    case 'years':
      return 1
    case 'sqft':
      return 100
    default:
      return 1
  }
}

// ─── FieldInput sub-component ───────────────────────────────────────────────

interface FieldInputProps {
  field: CalculatorField
  value: string
  onChange: (name: string, value: string) => void
}

function FieldInput({ field, value, onChange }: FieldInputProps) {
  const inputId = `calc-field-${field.name}`

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={inputId} className="text-sm font-medium">
        {field.label}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id={inputId}
          type="number"
          inputMode="decimal"
          value={value}
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          step={getInputStep(field)}
          onChange={(e) => onChange(field.name, e.target.value)}
          className="min-h-[44px] w-full rounded-lg text-base sm:max-w-[160px]"
          aria-label={field.label}
        />
        {field.suffix && (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {field.suffix}
          </span>
        )}
      </div>
      {field.helpText && (
        <p className="text-xs text-muted-foreground">{field.helpText}</p>
      )}
    </div>
  )
}

// ─── ResultPanel sub-component ──────────────────────────────────────────────

interface ResultPanelProps {
  computed: CalculatorResult | null
  isEmpty: boolean
}

function ResultPanel({ computed, isEmpty }: ResultPanelProps) {
  if (isEmpty || !computed) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Enter values above to see your result
        </p>
      </div>
    )
  }

  const hasBreakdown = computed.breakdown.length > 0

  return (
    <div className="space-y-4">
      {/* Result highlight */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground mb-1">Result</p>
        <p className="text-lg font-bold">{computed.result}</p>
      </div>

      {/* Breakdown table */}
      {hasBreakdown && (
        <div>
          <h4 className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Step-by-Step Breakdown
          </h4>
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-3 px-4 text-left font-semibold">Line Item</th>
                  <th className="py-3 px-4 text-left font-semibold">Value</th>
                  <th className="py-3 px-4 text-left font-semibold text-muted-foreground hidden sm:table-cell">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody>
                {computed.breakdown.map((row) => (
                  <tr key={row.label} className="border-b last:border-0">
                    <td className="py-3 px-4 font-medium">
                      {row.label}
                      {row.note && (
                        <span className="block sm:hidden text-xs text-muted-foreground mt-1">
                          {row.note}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">{row.value}</td>
                    {row.note && (
                      <td className="py-3 px-4 text-xs text-muted-foreground hidden sm:table-cell">
                        {row.note}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── EmailCapture sub-component ─────────────────────────────────────────────

interface EmailCaptureProps {
  slug: string
  computedResult: string
}

function EmailCapture({ slug, computedResult }: EmailCaptureProps) {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Email address is required.')
      return
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }

    setIsSubmitting(true)

    try {
      const payload: LeadPayload = {
        email: email.trim(),
        firstName: firstName.trim(),
        calculatorSlug: slug,
        result: computedResult,
        company_website: '',
        turnstileToken,
      }

      const res = await fetch('/api/leads/calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as Record<string, unknown>
        const message = typeof data['error'] === 'string' ? data['error'] : 'Something went wrong. Please try again.'
        throw new Error(message)
      }

      setSubmitted(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <p className="text-sm font-semibold text-primary">
          Sent! Check your inbox.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;ve emailed this calculation to {email}.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-muted/30 p-6">
      <p className="text-sm font-semibold mb-1">Save this calculation</p>
      <p className="text-sm text-muted-foreground mb-4">
        Get this result emailed to you - no account required.
      </p>
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5 sm:flex-1">
            <Label htmlFor="calc-email" className="text-xs font-medium">
              Email address
            </Label>
            <Input
              id="calc-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              aria-required="true"
              aria-describedby={error ? 'calc-email-error' : undefined}
              className="min-h-[44px] text-base"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:w-40">
            <Label htmlFor="calc-firstname" className="text-xs font-medium">
              First name{' '}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="calc-firstname"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Alex"
              autoComplete="given-name"
              className="min-h-[44px] text-base"
            />
          </div>
          <TurnstileField onTokenChange={setTurnstileToken} />
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/20 transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:self-end h-9"
          >
            {isSubmitting ? 'Sending…' : 'Email me'}
          </button>
        </div>
        {error && (
          <p
            id="calc-email-error"
            role="alert"
            className="mt-2 text-xs text-destructive"
          >
            {error}
          </p>
        )}
      </form>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

function InteractiveCalculator({ slug }: InteractiveCalculatorProps) {
  const calc = getCalculatorBySlug(slug)
  const fields = calc?.fields
  const compute = calc?.compute

  // Build initial string-valued input state from defaultValues
  const initialInputs = useMemo<Record<string, string>>(() => {
    if (!fields) return {}
    return Object.fromEntries(
      fields.map((f) => [f.name, f.defaultValue !== undefined ? String(f.defaultValue) : ''])
    )
  }, [fields])

  const [rawInputs, setRawInputs] = useState<Record<string, string>>(initialInputs)

  function handleChange(name: string, value: string) {
    setRawInputs((prev) => ({ ...prev, [name]: value }))
  }

  // Convert string inputs to numbers for compute - empty strings become NaN
  const numericInputs = useMemo<Record<string, number>>(() => {
    return Object.fromEntries(
      Object.entries(rawInputs).map(([k, v]) => [k, v === '' ? NaN : Number(v)])
    )
  }, [rawInputs])

  // Determine if all required inputs have valid values
  const allFieldsValid = useMemo(() => {
    if (!fields) return false
    return fields.every((f) => {
      const val = numericInputs[f.name]
      return !isNaN(val) && isFinite(val)
    })
  }, [fields, numericInputs])

  const computed = useMemo<CalculatorResult | null>(() => {
    if (!compute) return null
    if (!allFieldsValid) return null
    try {
      return compute(numericInputs)
    } catch {
      return { result: 'Enter values above to calculate', breakdown: [] }
    }
  }, [compute, numericInputs, allFieldsValid])

  // If this calculator has no interactive definition, render nothing -
  // the page will fall back to the static worked example.
  if (!fields || !compute) {
    return null
  }

  const resultText = computed?.result ?? ''

  return (
    <section aria-labelledby="interactive-calc-heading">
      {/* Section header */}
      <div className="mb-6 flex items-center gap-3">
        <h2
          id="interactive-calc-heading"
          className="text-2xl font-bold"
        >
          Try the Calculator
        </h2>
        <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/8 px-2.5 py-0.5 text-xs font-medium text-primary">
          Interactive
        </span>
      </div>

      <div className="space-y-6">
        {/* Inputs card */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="mb-5 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Your Inputs
          </h3>
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
            {fields.map((field) => (
              <FieldInput
                key={field.name}
                field={field}
                value={rawInputs[field.name] ?? ''}
                onChange={handleChange}
              />
            ))}
          </div>
        </div>

        {/* Results panel */}
        <ResultPanel computed={computed} isEmpty={!allFieldsValid} />

        {/* Email capture - only shown when there is a computed result */}
        {computed && allFieldsValid && (
          <EmailCapture slug={slug} computedResult={resultText} />
        )}
      </div>
    </section>
  )
}

export { InteractiveCalculator }
