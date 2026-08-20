'use client'

import React, { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TurnstileField } from '@/components/marketing/turnstile-field'

// ─── Types ───────────────────────────────────────────────────────────────────

interface LeaseInputs {
  sqft: string
  baseRentPsf: string
  nnnPsf: string
  parkingMonthly: string
  escalationPct: string
  termYears: string
  freeRentMonths: string
  tiAllowance: string
}

interface LeaseMetrics {
  year1Cost: number
  fiveYearCost: number
  freeRentValue: number
  effectiveTotal: number
  effectiveAnnual: number
  effectivePsf: number
}

interface LeadPayload {
  email: string
  firstName: string
  calculatorSlug: string
  company_website: string
  turnstileToken: string
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_A: LeaseInputs = {
  sqft: '2500',
  baseRentPsf: '22',
  nnnPsf: '8',
  parkingMonthly: '0',
  escalationPct: '3',
  termYears: '5',
  freeRentMonths: '0',
  tiAllowance: '50000',
}

const DEFAULT_B: LeaseInputs = {
  sqft: '2500',
  baseRentPsf: '24',
  nnnPsf: '7',
  parkingMonthly: '0',
  escalationPct: '2.5',
  termYears: '5',
  freeRentMonths: '2',
  tiAllowance: '25000',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseNum(val: string): number {
  const n = parseFloat(val)
  return isNaN(n) ? 0 : n
}

function fmt(val: number): string {
  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function fmtDec(val: number): string {
  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function computeMetrics(inputs: LeaseInputs): LeaseMetrics {
  const sqft = parseNum(inputs.sqft)
  const baseRentPsf = parseNum(inputs.baseRentPsf)
  const nnnPsf = parseNum(inputs.nnnPsf)
  const parking = parseNum(inputs.parkingMonthly)
  const escalationPct = parseNum(inputs.escalationPct)
  const termYears = Math.max(1, parseNum(inputs.termYears))
  const freeRentMonths = parseNum(inputs.freeRentMonths)
  const tiAllowance = parseNum(inputs.tiAllowance)

  // Year 1 base occupancy cost
  const year1Cost = sqft * (baseRentPsf + nnnPsf) + parking * 12

  // N-year total: escalation applies only to contractual base rent.
  // NNN pass-throughs float with actual expenses (not the negotiated escalation rate).
  let nYearCost = 0
  for (let n = 1; n <= termYears; n++) {
    const escalationFactor = Math.pow(1 + escalationPct / 100, n - 1)
    nYearCost += sqft * baseRentPsf * escalationFactor + sqft * nnnPsf + parking * 12
  }

  // Effective rent adjustment
  const freeRentValue = year1Cost > 0 ? (year1Cost / 12) * freeRentMonths : 0
  const effectiveTotal = nYearCost - freeRentValue - tiAllowance
  const effectiveAnnual = effectiveTotal / termYears
  const effectivePsf = sqft > 0 ? effectiveAnnual / sqft : 0

  return {
    year1Cost,
    fiveYearCost: nYearCost,
    freeRentValue,
    effectiveTotal,
    effectiveAnnual,
    effectivePsf,
  }
}

// ─── LeaseColumn sub-component ───────────────────────────────────────────────

interface LeaseColumnProps {
  label: string
  inputs: LeaseInputs
  onChange: (field: keyof LeaseInputs, value: string) => void
  isPrimary: boolean
}

function LeaseColumn({ label, inputs, onChange, isPrimary }: LeaseColumnProps) {
  const headerClass = isPrimary
    ? 'rounded-t-xl border border-b-0 border-primary/40 bg-primary/5 px-6 py-4'
    : 'rounded-t-xl border border-b-0 border-border bg-muted/50 px-6 py-4'

  const bodyClass = isPrimary
    ? 'rounded-b-xl border border-primary/40 bg-card px-6 py-5 shadow-sm'
    : 'rounded-b-xl border border-border bg-card px-6 py-5 shadow-sm'

  const idPrefix = isPrimary ? 'lease-a' : 'lease-b'

  return (
    <div>
      <div className={headerClass}>
        <p className={`text-base font-bold ${isPrimary ? 'text-primary' : 'text-foreground'}`}>
          {label}
        </p>
      </div>
      <div className={bodyClass}>
        <div className="grid gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${idPrefix}-sqft`} className="text-sm font-medium">
              Square footage
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id={`${idPrefix}-sqft`}
                type="number"
                inputMode="decimal"
                value={inputs.sqft}
                min={0}
                step={100}
                onChange={(e) => onChange('sqft', e.target.value)}
                className="min-h-[44px] w-full rounded-lg text-base sm:max-w-[160px]"
                aria-label="Square footage"
              />
              <span className="text-sm text-muted-foreground">sq ft</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${idPrefix}-base`} className="text-sm font-medium">
              Base rent
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id={`${idPrefix}-base`}
                type="number"
                inputMode="decimal"
                value={inputs.baseRentPsf}
                min={0}
                step={0.5}
                onChange={(e) => onChange('baseRentPsf', e.target.value)}
                className="min-h-[44px] w-full rounded-lg text-base sm:max-w-[160px]"
                aria-label="Base rent per square foot per year"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">$/sq ft/yr</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${idPrefix}-nnn`} className="text-sm font-medium">
              NNN / operating expenses
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id={`${idPrefix}-nnn`}
                type="number"
                inputMode="decimal"
                value={inputs.nnnPsf}
                min={0}
                step={0.5}
                onChange={(e) => onChange('nnnPsf', e.target.value)}
                className="min-h-[44px] w-full rounded-lg text-base sm:max-w-[160px]"
                aria-label="NNN and operating expense pass-throughs per square foot per year"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">$/sq ft/yr</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${idPrefix}-parking`} className="text-sm font-medium">
              Monthly parking
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id={`${idPrefix}-parking`}
                type="number"
                inputMode="decimal"
                value={inputs.parkingMonthly}
                min={0}
                step={25}
                onChange={(e) => onChange('parkingMonthly', e.target.value)}
                className="min-h-[44px] w-full rounded-lg text-base sm:max-w-[160px]"
                aria-label="Monthly parking cost"
              />
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${idPrefix}-escalation`} className="text-sm font-medium">
              Annual escalation
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id={`${idPrefix}-escalation`}
                type="number"
                inputMode="decimal"
                value={inputs.escalationPct}
                min={0}
                max={20}
                step={0.1}
                onChange={(e) => onChange('escalationPct', e.target.value)}
                className="min-h-[44px] w-full rounded-lg text-base sm:max-w-[160px]"
                aria-label="Annual escalation rate percentage"
              />
              <span className="text-sm text-muted-foreground">% per year</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${idPrefix}-term`} className="text-sm font-medium">
              Lease term
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id={`${idPrefix}-term`}
                type="number"
                inputMode="decimal"
                value={inputs.termYears}
                min={1}
                max={30}
                step={1}
                onChange={(e) => onChange('termYears', e.target.value)}
                className="min-h-[44px] w-full rounded-lg text-base sm:max-w-[160px]"
                aria-label="Lease term in years"
              />
              <span className="text-sm text-muted-foreground">years</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${idPrefix}-freerent`} className="text-sm font-medium">
              Free rent
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id={`${idPrefix}-freerent`}
                type="number"
                inputMode="decimal"
                value={inputs.freeRentMonths}
                min={0}
                step={1}
                onChange={(e) => onChange('freeRentMonths', e.target.value)}
                className="min-h-[44px] w-full rounded-lg text-base sm:max-w-[160px]"
                aria-label="Free rent months"
              />
              <span className="text-sm text-muted-foreground">months</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${idPrefix}-ti`} className="text-sm font-medium">
              TI allowance
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id={`${idPrefix}-ti`}
                type="number"
                inputMode="decimal"
                value={inputs.tiAllowance}
                min={0}
                step={1000}
                onChange={(e) => onChange('tiAllowance', e.target.value)}
                className="min-h-[44px] w-full rounded-lg text-base sm:max-w-[160px]"
                aria-label="Tenant improvement allowance total dollars"
              />
              <span className="text-sm text-muted-foreground">total $</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── WinnerBadge sub-component ───────────────────────────────────────────────

type Winner = 'A' | 'B' | 'similar'

interface WinnerBadgeProps {
  side: 'A' | 'B'
  winner: Winner
}

function WinnerBadge({ side, winner }: WinnerBadgeProps) {
  if (winner === 'similar') {
    if (side === 'A') {
      return (
        <span className="ml-2 inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          Similar
        </span>
      )
    }
    return null
  }

  if (winner === side) {
    return (
      <span className="ml-2 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
        Better
      </span>
    )
  }

  return null
}

// ─── EmailCapture sub-component ──────────────────────────────────────────────

function EmailCapture() {
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
        calculatorSlug: 'lease-comparison',
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
        const message =
          typeof data['error'] === 'string'
            ? data['error']
            : 'Something went wrong. Please try again.'
        throw new Error(message)
      }

      setSubmitted(true)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <p className="text-sm font-semibold text-primary">Sent! Check your inbox.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;ve emailed this comparison to {email}.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-muted/30 p-6">
      <p className="text-sm font-semibold mb-1">Save this comparison to your email</p>
      <p className="text-sm text-muted-foreground mb-4">
        Get this side-by-side comparison emailed to you - no account required.
      </p>
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5 sm:flex-1">
            <Label htmlFor="compare-email" className="text-xs font-medium">
              Email address
            </Label>
            <Input
              id="compare-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              aria-required="true"
              aria-describedby={error ? 'compare-email-error' : undefined}
              className="min-h-[44px] text-base"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:w-40">
            <Label htmlFor="compare-firstname" className="text-xs font-medium">
              First name{' '}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="compare-firstname"
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
            id="compare-email-error"
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

// ─── Main component ───────────────────────────────────────────────────────────

function LeaseComparisonCalculator() {
  const [leaseA, setLeaseA] = useState<LeaseInputs>(DEFAULT_A)
  const [leaseB, setLeaseB] = useState<LeaseInputs>(DEFAULT_B)

  function handleChangeA(field: keyof LeaseInputs, value: string) {
    setLeaseA((prev) => ({ ...prev, [field]: value }))
  }

  function handleChangeB(field: keyof LeaseInputs, value: string) {
    setLeaseB((prev) => ({ ...prev, [field]: value }))
  }

  const metricsA = useMemo(() => computeMetrics(leaseA), [leaseA])
  const metricsB = useMemo(() => computeMetrics(leaseB), [leaseB])

  const termYearsA = Math.max(1, parseNum(leaseA.termYears))
  const termYearsB = Math.max(1, parseNum(leaseB.termYears))
  const termsMatch = termYearsA === termYearsB

  // Determine winner: lower effective PSF = better
  const winner = useMemo<Winner>(() => {
    const diff = Math.abs(metricsA.effectivePsf - metricsB.effectivePsf)
    const avg = (metricsA.effectivePsf + metricsB.effectivePsf) / 2
    if (avg === 0) return 'similar'
    if (diff / avg <= 0.02) return 'similar'
    return metricsA.effectivePsf <= metricsB.effectivePsf ? 'A' : 'B'
  }, [metricsA.effectivePsf, metricsB.effectivePsf])

  const savings = useMemo(() => {
    return Math.abs(metricsA.effectiveTotal - metricsB.effectiveTotal)
  }, [metricsA.effectiveTotal, metricsB.effectiveTotal])

  const summaryText = useMemo(() => {
    const termDesc = termsMatch
      ? `${termYearsA}-year term`
      : `${termYearsA}-year (A) and ${termYearsB}-year (B) terms`
    if (winner === 'similar') {
      return `Lease A and Lease B have similar effective rent per sq ft over their respective ${termDesc}.`
    }
    const betterLease = winner
    const betterPsf =
      winner === 'A' ? metricsA.effectivePsf : metricsB.effectivePsf
    return `With ${termDesc}, Lease ${betterLease} has a lower effective rent of ${fmtDec(betterPsf)}/sq ft/year - ${fmt(savings)} less in effective total cost.`
  }, [winner, termsMatch, termYearsA, termYearsB, metricsA.effectivePsf, metricsB.effectivePsf, savings])

  interface ComparisonRow {
    label: string
    valueA: string
    valueB: string
    isHighlight?: boolean
    winner?: Winner
  }

  const rows: ComparisonRow[] = useMemo(
    () => [
      {
        label: 'Square Footage',
        valueA: `${parseNum(leaseA.sqft).toLocaleString()} sq ft`,
        valueB: `${parseNum(leaseB.sqft).toLocaleString()} sq ft`,
      },
      {
        label: 'Base Rent (Year 1)',
        valueA: fmt(parseNum(leaseA.sqft) * parseNum(leaseA.baseRentPsf)) + '/yr',
        valueB: fmt(parseNum(leaseB.sqft) * parseNum(leaseB.baseRentPsf)) + '/yr',
      },
      {
        label: 'All-In Year 1 Cost',
        valueA: fmt(metricsA.year1Cost),
        valueB: fmt(metricsB.year1Cost),
      },
      {
        label: termsMatch ? `${termYearsA}-Year Total (face rent)` : 'Term Total (face rent)',
        valueA: fmt(metricsA.fiveYearCost),
        valueB: fmt(metricsB.fiveYearCost),
      },
      {
        label: 'Less: Concessions (TI + free rent)',
        valueA: fmt(metricsA.freeRentValue + parseNum(leaseA.tiAllowance)),
        valueB: fmt(metricsB.freeRentValue + parseNum(leaseB.tiAllowance)),
      },
      {
        label: termsMatch ? `Effective ${termYearsA}-Year Cost` : 'Effective Total Cost',
        valueA: fmt(metricsA.effectiveTotal),
        valueB: fmt(metricsB.effectiveTotal),
        winner,
      },
      {
        label: 'Effective Annual Rent',
        valueA: fmt(metricsA.effectiveAnnual),
        valueB: fmt(metricsB.effectiveAnnual),
      },
      {
        label: 'Effective Rent / Sq Ft',
        valueA: fmtDec(metricsA.effectivePsf) + '/sq ft/yr',
        valueB: fmtDec(metricsB.effectivePsf) + '/sq ft/yr',
        isHighlight: true,
        winner,
      },
    ],
    [leaseA, leaseB, metricsA, metricsB, termYearsA, termsMatch, winner],
  )

  return (
    <section aria-labelledby="lease-comparison-heading">
      <div className="mb-6 flex items-center gap-3">
        <h2 id="lease-comparison-heading" className="text-2xl font-bold">
          Compare Lease Proposals
        </h2>
        <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/8 px-2.5 py-0.5 text-xs font-medium text-primary">
          Interactive
        </span>
      </div>

      {/* Two-column form */}
      <div className="mb-8 grid gap-4 sm:gap-6 sm:grid-cols-2">
        <LeaseColumn
          label="Lease A"
          inputs={leaseA}
          onChange={handleChangeA}
          isPrimary={true}
        />
        <LeaseColumn
          label="Lease B"
          inputs={leaseB}
          onChange={handleChangeB}
          isPrimary={false}
        />
      </div>

      {/* Results comparison */}
      <div className="mb-6">
        <div className="mb-2 rounded-t-xl border-x border-t bg-muted/50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Side-by-Side Comparison
          </p>
        </div>

        {/* Mobile card list (hidden on sm+) */}
        <div className="space-y-2 rounded-b-xl border bg-card px-4 py-3 shadow-sm sm:hidden">
          {rows.map((row) => (
            <div
              key={row.label}
              className={`rounded-lg border px-3 py-2.5 ${row.isHighlight ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20'}`}
            >
              <p className={`mb-1 text-xs font-semibold uppercase tracking-wide ${row.isHighlight ? 'text-primary' : 'text-muted-foreground'}`}>
                {row.label}
                {row.isHighlight && (
                  <span className="ml-2 inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary normal-case tracking-normal">
                    Key metric
                  </span>
                )}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs font-medium text-primary">Lease A</p>
                  <p className={row.isHighlight ? 'font-semibold' : ''}>
                    {row.valueA}
                    {row.winner !== undefined && <WinnerBadge side="A" winner={row.winner} />}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Lease B</p>
                  <p className={row.isHighlight ? 'font-semibold' : ''}>
                    {row.valueB}
                    {row.winner !== undefined && <WinnerBadge side="B" winner={row.winner} />}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table (hidden below sm) */}
        <div className="hidden overflow-hidden rounded-b-xl border bg-card shadow-sm sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="py-3 px-4 text-left font-semibold text-muted-foreground w-2/5">
                  Metric
                </th>
                <th className="py-3 px-4 text-left font-semibold text-primary">Lease A</th>
                <th className="py-3 px-4 text-left font-semibold">Lease B</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.label}
                  className={`border-b last:border-0 ${row.isHighlight ? 'bg-primary/5' : ''}`}
                >
                  <td
                    className={`py-3 px-4 font-medium ${row.isHighlight ? 'text-primary font-semibold' : ''}`}
                  >
                    {row.label}
                    {row.isHighlight && (
                      <span className="ml-2 inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                        Key metric
                      </span>
                    )}
                  </td>
                  <td className={`py-3 px-4 ${row.isHighlight ? 'font-semibold' : ''}`}>
                    <span>{row.valueA}</span>
                    {row.winner !== undefined && (
                      <WinnerBadge side="A" winner={row.winner} />
                    )}
                  </td>
                  <td className={`py-3 px-4 ${row.isHighlight ? 'font-semibold' : ''}`}>
                    <span>{row.valueB}</span>
                    {row.winner !== undefined && (
                      <WinnerBadge side="B" winner={row.winner} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Text summary */}
      <div className="mb-8 rounded-xl border border-primary/20 bg-primary/5 px-6 py-4">
        <p className="text-base font-medium">{summaryText}</p>
      </div>

      {/* Email capture */}
      <EmailCapture />
    </section>
  )
}

export { LeaseComparisonCalculator }
