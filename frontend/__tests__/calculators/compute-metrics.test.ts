/** @vitest-environment node */
import { describe, it, expect } from 'vitest'
import { CALCULATORS, type CalculatorResult } from '@/data/calculators'

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function getCompute(slug: string): (inputs: Record<string, number>) => CalculatorResult {
  const calc = CALCULATORS.find((c) => c.slug === slug)
  if (!calc?.compute) throw new Error(`No compute function found for slug: ${slug}`)
  return calc.compute
}

// ---------------------------------------------------------------------------
// nnn-lease-cost-calculator
// ---------------------------------------------------------------------------

describe('nnn-lease-cost-calculator compute', () => {
  const compute = getCompute('nnn-lease-cost-calculator')

  it('calculates total annual cost for a typical NNN lease', () => {
    // 5000 sqft × ($18 + $3.20 + $0.85 + $2.40) = $122,250/year
    const result = compute({ sqft: 5000, baseRent: 18, taxes: 3.20, insurance: 0.85, cam: 2.40 })
    expect(result.result).toContain('$122,250')
    expect(result.result).toContain('$10,187.50')
  })

  it('includes all charge components in the breakdown', () => {
    const result = compute({ sqft: 5000, baseRent: 18, taxes: 3.20, insurance: 0.85, cam: 2.40 })
    const labels = result.breakdown.map((b) => b.label)
    expect(labels).toContain('Base Rent')
    expect(labels).toContain('Property Taxes')
    expect(labels).toContain('Insurance')
    expect(labels).toContain('CAM / Maintenance')
    expect(labels).toContain('Total Annual Cost')
  })

  it('returns "Enter values" guard when sqft is 0', () => {
    const result = compute({ sqft: 0, baseRent: 18, taxes: 3.20, insurance: 0.85, cam: 2.40 })
    expect(result.result).toContain('Enter values')
    expect(result.breakdown).toHaveLength(0)
  })

  it('returns "Enter values" guard when all inputs are 0', () => {
    const result = compute({ sqft: 0, baseRent: 0, taxes: 0, insurance: 0, cam: 0 })
    expect(result.result).toContain('Enter values')
  })

  it('handles base-rent-only (no NNN charges)', () => {
    // 1000 sqft × $20 = $20,000
    const result = compute({ sqft: 1000, baseRent: 20, taxes: 0, insurance: 0, cam: 0 })
    expect(result.result).toContain('$20,000')
  })
})

// ---------------------------------------------------------------------------
// effective-rent-calculator
// ---------------------------------------------------------------------------

describe('effective-rent-calculator compute', () => {
  const compute = getCompute('effective-rent-calculator')

  it('calculates effective annual rent after free rent and TI', () => {
    // ($8500×60 - $8500×3 - $75000) / 5 = $81,900/year
    const result = compute({ monthlyRent: 8500, termYears: 5, freeRentMonths: 3, tiAllowance: 75000 })
    expect(result.result).toContain('$81,900')
  })

  it('includes net rent and discount rows in breakdown', () => {
    const result = compute({ monthlyRent: 8500, termYears: 5, freeRentMonths: 3, tiAllowance: 75000 })
    const labels = result.breakdown.map((b) => b.label)
    expect(labels).toContain('Less: Free Rent Value')
    expect(labels).toContain('Less: TI Allowance')
    expect(labels).toContain('Net Rent over Term')
    expect(labels).toContain('Effective Annual Rent')
  })

  it('returns "Enter values" when monthly rent is 0', () => {
    const result = compute({ monthlyRent: 0, termYears: 5, freeRentMonths: 3, tiAllowance: 0 })
    expect(result.result).toContain('Enter values')
    expect(result.breakdown).toHaveLength(0)
  })

  it('returns "Enter values" when term is 0', () => {
    const result = compute({ monthlyRent: 8500, termYears: 0, freeRentMonths: 3, tiAllowance: 75000 })
    expect(result.result).toContain('Enter values')
  })

  it('equals face rent when there are no concessions', () => {
    // No free rent, no TI → effective = face = $8500×12 = $102,000
    const result = compute({ monthlyRent: 8500, termYears: 5, freeRentMonths: 0, tiAllowance: 0 })
    expect(result.result).toContain('$102,000')
  })
})

// ---------------------------------------------------------------------------
// cam-reconciliation-calculator
// ---------------------------------------------------------------------------

describe('cam-reconciliation-calculator compute', () => {
  const compute = getCompute('cam-reconciliation-calculator')

  it('calculates base true-up correctly (no gross-up)', () => {
    // proRata=10%, tenantShare=$24,000, paid=$22,800 → owe $1,200
    const result = compute({
      actualCam: 240000,
      buildingArea: 50000,
      tenantArea: 5000,
      monthlyEstimate: 1900,
      occupancyPct: 95,        // occupancyPct >= grossUpThreshold → no gross-up
      grossUpThreshold: 95,
    })
    expect(result.result).toContain('$1,200')
    // no gross-up rows when occupancy >= threshold
    const labels = result.breakdown.map((b) => b.label)
    const hasGrossUp = labels.some((l) => l.includes('Grossed-Up'))
    expect(hasGrossUp).toBe(false)
  })

  it('adds gross-up rows when occupancy is below threshold', () => {
    const result = compute({
      actualCam: 240000,
      buildingArea: 50000,
      tenantArea: 5000,
      monthlyEstimate: 1900,
      occupancyPct: 85,
      grossUpThreshold: 95,
    })
    const labels = result.breakdown.map((b) => b.label)
    const hasGrossUp = labels.some((l) => l.includes('Grossed-Up'))
    expect(hasGrossUp).toBe(true)
    // result shows both base and grossed-up figures
    expect(result.result).toContain('$1,200')
    expect(result.result).toContain('gross-up')
  })

  it('shows a credit when estimates exceed actual share', () => {
    // proRata=10%, tenantShare=$12,000, paid=$22,800 → credit of $10,800
    const result = compute({
      actualCam: 120000,
      buildingArea: 50000,
      tenantArea: 5000,
      monthlyEstimate: 1900,
      occupancyPct: 100,
      grossUpThreshold: 95,
    })
    expect(result.result).toContain('credit')
  })

  it('returns "Enter values" when buildingArea is 0', () => {
    const result = compute({
      actualCam: 240000,
      buildingArea: 0,
      tenantArea: 5000,
      monthlyEstimate: 1900,
      occupancyPct: 85,
      grossUpThreshold: 95,
    })
    expect(result.result).toContain('Enter values')
    expect(result.breakdown).toHaveLength(0)
  })

  it('returns "Enter values" when actualCam is 0', () => {
    const result = compute({
      actualCam: 0,
      buildingArea: 50000,
      tenantArea: 5000,
      monthlyEstimate: 1900,
      occupancyPct: 85,
      grossUpThreshold: 95,
    })
    expect(result.result).toContain('Enter values')
  })
})

// ---------------------------------------------------------------------------
// rent-escalation-calculator
// ---------------------------------------------------------------------------

describe('rent-escalation-calculator compute', () => {
  const compute = getCompute('rent-escalation-calculator')

  it('calculates escalating rent for a 3-year term at 3%', () => {
    const result = compute({ baseRent: 65000, escalationRate: 3, termYears: 3 })
    const labels = result.breakdown.map((b) => b.label)
    expect(labels).toContain('Year 1')
    expect(labels).toContain('Year 2')
    expect(labels).toContain('Year 3')
    // Year 1 = $65,000
    const year1 = result.breakdown.find((b) => b.label === 'Year 1')
    expect(year1?.value).toContain('$65,000')
    // Year 2 = $66,950
    const year2 = result.breakdown.find((b) => b.label === 'Year 2')
    expect(year2?.value).toContain('$66,950')
    // Year 3 = $68,959
    const year3 = result.breakdown.find((b) => b.label === 'Year 3')
    expect(year3?.value).toContain('$68,959')
  })

  it('result string references Year 3 rent for a 3-year term', () => {
    const result = compute({ baseRent: 65000, escalationRate: 3, termYears: 3 })
    expect(result.result).toContain('Year 3')
    expect(result.result).toContain('$68,959')
  })

  it('returns a single year with 0% increase for a 1-year term', () => {
    const result = compute({ baseRent: 65000, escalationRate: 3, termYears: 1 })
    // Only Year 1 data row plus summary rows
    const yearRows = result.breakdown.filter((b) => b.label.startsWith('Year'))
    expect(yearRows).toHaveLength(1)
    expect(yearRows[0]?.value).toContain('$65,000')
    // Cumulative increase should be 0%
    expect(result.result).toContain('0.0%')
  })

  it('keeps all years the same when escalation rate is 0%', () => {
    const result = compute({ baseRent: 65000, escalationRate: 0, termYears: 3 })
    const yearRows = result.breakdown.filter((b) => b.label.startsWith('Year'))
    for (const row of yearRows) {
      expect(row.value).toContain('$65,000')
    }
  })

  it('returns "Enter values" when base rent is 0', () => {
    const result = compute({ baseRent: 0, escalationRate: 3, termYears: 5 })
    expect(result.result).toContain('Enter values')
  })

  it('returns "Enter values" when term is 0', () => {
    const result = compute({ baseRent: 65000, escalationRate: 3, termYears: 0 })
    expect(result.result).toContain('Enter values')
  })
})

// ---------------------------------------------------------------------------
// pro-rata-share-calculator
// ---------------------------------------------------------------------------

describe('pro-rata-share-calculator compute', () => {
  const compute = getCompute('pro-rata-share-calculator')

  it('calculates pro-rata share and tenant CAM responsibility', () => {
    // 4500/65000 ≈ 6.9231%  |  6.9231% × $200,000 ≈ $13,846
    const result = compute({ tenantArea: 4500, buildingArea: 65000, annualCamTotal: 200000 })
    expect(result.result).toContain('6.9231%')
    expect(result.result).toContain('$13,846')
  })

  it('includes pro-rata share and monthly CAM rows in breakdown', () => {
    const result = compute({ tenantArea: 4500, buildingArea: 65000, annualCamTotal: 200000 })
    const labels = result.breakdown.map((b) => b.label)
    expect(labels).toContain('Pro-Rata Share')
    expect(labels).toContain('Annual CAM Responsibility')
    expect(labels).toContain('Monthly CAM Payment')
  })

  it('returns "Enter values" when tenantArea is 0', () => {
    const result = compute({ tenantArea: 0, buildingArea: 65000, annualCamTotal: 200000 })
    expect(result.result).toContain('Enter values')
    expect(result.breakdown).toHaveLength(0)
  })

  it('returns "Enter values" when buildingArea is 0', () => {
    const result = compute({ tenantArea: 4500, buildingArea: 0, annualCamTotal: 200000 })
    expect(result.result).toContain('Enter values')
  })

  it('handles zero annualCamTotal without error', () => {
    const result = compute({ tenantArea: 4500, buildingArea: 65000, annualCamTotal: 0 })
    expect(result.result).toContain('6.9231%')
    // $0 CAM
    const camRow = result.breakdown.find((b) => b.label === 'Annual CAM Responsibility')
    expect(camRow?.value).toContain('$0')
  })
})

// ---------------------------------------------------------------------------
// lease-abstraction-roi-calculator
// ---------------------------------------------------------------------------

describe('lease-abstraction-roi-calculator compute', () => {
  const compute = getCompute('lease-abstraction-roi-calculator')

  it('calculates annual savings correctly', () => {
    // reviewCost/lease = 20/60 * $75 = $25
    // savings = 50×$200 - 50x$15 - 50x$25 = $10,000 - $750 - $1,250 = $8,000
    const result = compute({
      leaseCount: 50,
      manualCost: 200,
      aiCost: 15,
      reviewTime: 20,
      reviewerRate: 75,
    })
    expect(result.result).toContain('$8,000')
  })

  it('includes all cost breakdown rows', () => {
    const result = compute({
      leaseCount: 50,
      manualCost: 200,
      aiCost: 15,
      reviewTime: 20,
      reviewerRate: 75,
    })
    const labels = result.breakdown.map((b) => b.label)
    expect(labels).toContain('Annual Manual Cost')
    expect(labels).toContain('Annual AI Tool Cost')
    expect(labels).toContain('Annual Review Labor')
    expect(labels).toContain('Annual Savings')
    expect(labels).toContain('ROI')
  })

  it('shows 400% ROI for the standard example', () => {
    // ROI = $8,000 / $2,000 x 100 = 400%
    const result = compute({
      leaseCount: 50,
      manualCost: 200,
      aiCost: 15,
      reviewTime: 20,
      reviewerRate: 75,
    })
    const roiRow = result.breakdown.find((b) => b.label === 'ROI')
    expect(roiRow?.value).toBe('400%')
  })

  it('returns "Enter values" when leaseCount is 0', () => {
    const result = compute({ leaseCount: 0, manualCost: 200, aiCost: 15, reviewTime: 20, reviewerRate: 75 })
    expect(result.result).toContain('Enter values')
  })

  it('handles zero review time gracefully', () => {
    // savings = 50x$200 - 50x$15 - 0 = $9,250
    const result = compute({ leaseCount: 50, manualCost: 200, aiCost: 15, reviewTime: 0, reviewerRate: 75 })
    expect(result.result).toContain('$9,250')
  })
})

// ---------------------------------------------------------------------------
// commercial-lease-cost-calculator
// ---------------------------------------------------------------------------

describe('commercial-lease-cost-calculator compute', () => {
  const compute = getCompute('commercial-lease-cost-calculator')

  it('calculates total annual cost without parking', () => {
    // 3500 × ($24 + $8.50) = $113,750/year
    const result = compute({ sqft: 3500, baseRentPsf: 24, nnnChargesPsf: 8.50, monthlyParking: 0 })
    expect(result.result).toContain('$113,750')
  })

  it('adds monthly parking to the annual total', () => {
    // $113,750 + $100×12 = $114,950
    const result = compute({ sqft: 3500, baseRentPsf: 24, nnnChargesPsf: 8.50, monthlyParking: 100 })
    expect(result.result).toContain('$114,950')
  })

  it('includes breakdown rows for all components', () => {
    const result = compute({ sqft: 3500, baseRentPsf: 24, nnnChargesPsf: 8.50, monthlyParking: 0 })
    const labels = result.breakdown.map((b) => b.label)
    expect(labels).toContain('Base Rent')
    expect(labels).toContain('NNN / Operating Expenses')
    expect(labels).toContain('Total Annual Cost')
    expect(labels).toContain('Monthly Payment')
  })

  it('returns "Enter values" when sqft is 0', () => {
    const result = compute({ sqft: 0, baseRentPsf: 24, nnnChargesPsf: 8.50, monthlyParking: 0 })
    expect(result.result).toContain('Enter values')
    expect(result.breakdown).toHaveLength(0)
  })

  it('handles gross lease (NNN = 0) correctly', () => {
    // 2000 × $30 = $60,000
    const result = compute({ sqft: 2000, baseRentPsf: 30, nnnChargesPsf: 0, monthlyParking: 0 })
    expect(result.result).toContain('$60,000')
  })
})

// ---------------------------------------------------------------------------
// percentage-rent-calculator
// ---------------------------------------------------------------------------

describe('percentage-rent-calculator compute', () => {
  const compute = getCompute('percentage-rent-calculator')

  it('calculates percentage rent when sales exceed the natural breakpoint', () => {
    // naturalBreakpoint=$60,000/0.05=$1,200,000; overage=$300,000; pctRent=$15,000; total=$75,000
    const result = compute({
      grossSales: 1500000,
      annualBaseRent: 60000,
      percentageRate: 5,
      artificialBreakpoint: 0,
    })
    expect(result.result).toContain('$15,000')
    expect(result.result).toContain('$75,000')
  })

  it('includes natural breakpoint in the breakdown', () => {
    const result = compute({
      grossSales: 1500000,
      annualBaseRent: 60000,
      percentageRate: 5,
      artificialBreakpoint: 0,
    })
    const bpRow = result.breakdown.find((b) => b.label === 'Breakpoint (Natural)')
    expect(bpRow?.value).toContain('$1,200,000')
  })

  it('returns no percentage rent when sales are below the breakpoint', () => {
    // $1,000,000 < $1,200,000 → no overage
    const result = compute({
      grossSales: 1000000,
      annualBaseRent: 60000,
      percentageRate: 5,
      artificialBreakpoint: 0,
    })
    expect(result.result).toContain('No percentage rent')
    const overageRow = result.breakdown.find((b) => b.label === 'Sales Above Breakpoint')
    expect(overageRow?.note).toContain('No overage')
  })

  it('uses an artificial breakpoint when provided', () => {
    // artificial bp = $800,000 < $1,000,000 → overage = $200,000 → pctRent = $10,000
    const result = compute({
      grossSales: 1000000,
      annualBaseRent: 60000,
      percentageRate: 5,
      artificialBreakpoint: 800000,
    })
    expect(result.result).toContain('$10,000')
    const artRow = result.breakdown.find((b) => b.label === 'Breakpoint (Artificial)')
    expect(artRow).toBeDefined()
  })

  it('returns "Enter values" when grossSales is 0', () => {
    const result = compute({
      grossSales: 0,
      annualBaseRent: 60000,
      percentageRate: 5,
      artificialBreakpoint: 0,
    })
    expect(result.result).toContain('Enter values')
  })

  it('returns "Enter values" when annualBaseRent is 0', () => {
    const result = compute({
      grossSales: 1500000,
      annualBaseRent: 0,
      percentageRate: 5,
      artificialBreakpoint: 0,
    })
    expect(result.result).toContain('Enter values')
  })
})

// ---------------------------------------------------------------------------
// rent-per-sqft-calculator
// ---------------------------------------------------------------------------

describe('rent-per-sqft-calculator compute', () => {
  const compute = getCompute('rent-per-sqft-calculator')

  it('derives total from psf rate when annualRentTotal is 0', () => {
    // $22 × 2500 = $55,000 → monthly ≈ $4,583
    const result = compute({ sqft: 2500, rentPsf: 22, annualRentTotal: 0 })
    expect(result.result).toContain('$22.00')
    expect(result.result).toContain('$55,000')
    // monthly shown in result
    expect(result.result).toContain('$4,583')
  })

  it('derives psf from total rent when rentPsf is 0', () => {
    // $55,000 / 2500 = $22.00/sq ft
    const result = compute({ sqft: 2500, annualRentTotal: 55000, rentPsf: 0 })
    expect(result.result).toContain('$22.00')
    expect(result.result).toContain('$55,000')
  })

  it('prefers annualRentTotal when both inputs are provided', () => {
    // annualRentTotal takes priority per the code logic (checked first)
    const result = compute({ sqft: 2500, annualRentTotal: 55000, rentPsf: 30 })
    expect(result.result).toContain('$22.00')  // derived from 55000/2500
  })

  it('returns "Enter values" when sqft is 0', () => {
    const result = compute({ sqft: 0, rentPsf: 22, annualRentTotal: 0 })
    expect(result.result).toContain('Enter values')
    expect(result.breakdown).toHaveLength(0)
  })

  it('returns "Enter values" when both rent inputs are 0', () => {
    const result = compute({ sqft: 2500, rentPsf: 0, annualRentTotal: 0 })
    expect(result.result).toContain('Enter values')
  })

  it('includes daily and 5-year total rows in breakdown', () => {
    const result = compute({ sqft: 2500, rentPsf: 22, annualRentTotal: 0 })
    const labels = result.breakdown.map((b) => b.label)
    expect(labels).toContain('Daily Rent')
    expect(labels).toContain('5-Year Total')
    const fiveYearRow = result.breakdown.find((b) => b.label === '5-Year Total')
    expect(fiveYearRow?.value).toContain('$275,000')
  })
})
