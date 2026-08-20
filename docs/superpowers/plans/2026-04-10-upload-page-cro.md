# Upload Page CRO — Trust-First Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Increase `upload_file_selected` rate on `/upload` from ~9% to 20%+ by showing proof before asking users to upload, via a new `SampleTeaser` component and restructured page layout.

**Architecture:** Two changes — (1) a new static `SampleTeaser` component that renders 5 hardcoded extracted fields with confidence badges inline on the upload page, and (2) a restructured `upload/page.tsx` that leads with a dual CTA row and the teaser before presenting the upload dropzone. No new API calls or server-side changes required.

**Tech Stack:** Next.js 15 App Router · React 19 · TypeScript strict · Tailwind 4 · Shadcn UI (`Badge`, `Button`, `Card`) · Lucide React icons · Vitest + Testing Library · PostHog (`captureEvent` / `EVENTS`)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/components/upload/sample-teaser.tsx` | **Create** | Static 5-field teaser with confidence badges and red flag indicator |
| `frontend/__tests__/upload/sample-teaser.test.tsx` | **Create** | Tests for SampleTeaser rendering and analytics |
| `frontend/app/(public-app)/upload/page.tsx` | **Modify** | Restructured layout: new hero, dual CTA, teaser, risk-reversal block, updated social proof |
| `frontend/__tests__/upload/upload-page.test.tsx` | **Modify** | Update H1 assertion, add dual CTA tests, add teaser/risk-reversal tests, update social proof text |

---

## Task 1: `SampleTeaser` component

**Files:**
- Create: `frontend/components/upload/sample-teaser.tsx`
- Create (test first): `frontend/__tests__/upload/sample-teaser.test.tsx`

### Step 1.1 — Write the failing tests

Create `frontend/__tests__/upload/sample-teaser.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    onClick,
    ...rest
  }: {
    children: React.ReactNode
    href: string
    onClick?: () => void
    [key: string]: unknown
  }) => (
    <a href={href} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
}))

const mockCaptureEvent = vi.fn()
vi.mock('@/lib/posthog', () => ({
  captureEvent: (...args: unknown[]) => mockCaptureEvent(...args),
  EVENTS: { upload_sample_clicked: 'upload_sample_clicked' },
}))

vi.mock('@/lib/sample-extraction', () => ({
  SAMPLE_EXTRACTION_ID: 'sample',
}))

describe('SampleTeaser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with data-testid', async () => {
    const { SampleTeaser } = await import('@/components/upload/sample-teaser')
    render(<SampleTeaser />)
    expect(screen.getByTestId('sample-teaser')).toBeInTheDocument()
  })

  it('renders all 5 field labels', async () => {
    const { SampleTeaser } = await import('@/components/upload/sample-teaser')
    render(<SampleTeaser />)
    expect(screen.getByText('Base Rent')).toBeInTheDocument()
    expect(screen.getByText('Lease Expiration')).toBeInTheDocument()
    expect(screen.getByText('Renewal Option')).toBeInTheDocument()
    expect(screen.getByText('CAM Cap')).toBeInTheDocument()
    expect(screen.getByText('Personal Guarantee')).toBeInTheDocument()
  })

  it('renders field values', async () => {
    const { SampleTeaser } = await import('@/components/upload/sample-teaser')
    render(<SampleTeaser />)
    expect(screen.getByText('$14,583/mo ($42.50/sqft/yr)')).toBeInTheDocument()
    expect(screen.getByText('Jun 30, 2030')).toBeInTheDocument()
  })

  it('renders a red flag indicator on Personal Guarantee', async () => {
    const { SampleTeaser } = await import('@/components/upload/sample-teaser')
    render(<SampleTeaser />)
    expect(screen.getByLabelText('red flag')).toBeInTheDocument()
  })

  it('renders confidence percentages as badges', async () => {
    const { SampleTeaser } = await import('@/components/upload/sample-teaser')
    render(<SampleTeaser />)
    expect(screen.getByText('98%')).toBeInTheDocument()
    expect(screen.getByText('99%')).toBeInTheDocument()
    expect(screen.getByText('94%')).toBeInTheDocument()
    expect(screen.getByText('91%')).toBeInTheDocument()
    expect(screen.getByText('87%')).toBeInTheDocument()
  })

  it('renders "See all 126 fields" link pointing to sample results', async () => {
    const { SampleTeaser } = await import('@/components/upload/sample-teaser')
    render(<SampleTeaser />)
    const link = screen.getByTestId('sample-teaser-link')
    expect(link).toHaveAttribute('href', '/results/sample')
    expect(link).toHaveTextContent('See all 126 fields')
  })

  it('fires upload_sample_clicked with location teaser_link when link is clicked', async () => {
    const { SampleTeaser } = await import('@/components/upload/sample-teaser')
    render(<SampleTeaser />)
    const link = screen.getByTestId('sample-teaser-link')
    await userEvent.click(link)
    expect(mockCaptureEvent).toHaveBeenCalledWith('upload_sample_clicked', { location: 'teaser_link' })
  })
})
```

### Step 1.2 — Run tests to confirm they fail

```bash
cd frontend && npx vitest run __tests__/upload/sample-teaser.test.tsx
```

Expected: all tests FAIL with `Cannot find module '@/components/upload/sample-teaser'`

### Step 1.3 — Implement `SampleTeaser`

Create `frontend/components/upload/sample-teaser.tsx`:

```tsx
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { CONFIDENCE_COLORS } from '@/lib/design-tokens'
import { SAMPLE_EXTRACTION_ID } from '@/lib/sample-extraction'
import { captureEvent, EVENTS } from '@/lib/posthog'

interface TeaserField {
  label: string
  value: string
  confidencePct: number
  confidenceTier: 'high' | 'medium' | 'low'
  redFlag?: boolean
}

const TEASER_FIELDS: TeaserField[] = [
  {
    label: 'Base Rent',
    value: '$14,583/mo ($42.50/sqft/yr)',
    confidencePct: 98,
    confidenceTier: 'high',
  },
  {
    label: 'Lease Expiration',
    value: 'Jun 30, 2030',
    confidencePct: 99,
    confidenceTier: 'high',
  },
  {
    label: 'Renewal Option',
    value: '2 × 5-year options',
    confidencePct: 94,
    confidenceTier: 'high',
  },
  {
    label: 'CAM Cap',
    value: '5% annually, non-compounding',
    confidencePct: 91,
    confidenceTier: 'medium',
  },
  {
    label: 'Personal Guarantee',
    value: 'Full-term guarantee required',
    confidencePct: 87,
    confidenceTier: 'medium',
    redFlag: true,
  },
]

export function SampleTeaser() {
  return (
    <div data-testid="sample-teaser" className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b bg-primary px-4 py-3">
        <span className="text-sm font-semibold text-primary-foreground">
          Sample extraction — Office Lease, Austin TX
        </span>
        <span className="text-xs text-primary-foreground/70">126 fields</span>
      </div>

      <div className="divide-y">
        {TEASER_FIELDS.map((field) => (
          <div
            key={field.label}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-2">
              {field.redFlag && (
                <span
                  className="shrink-0 text-amber-500"
                  aria-label="red flag"
                >
                  ⚠
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{field.label}</p>
                <p className="truncate text-xs text-muted-foreground">{field.value}</p>
              </div>
            </div>
            <Badge
              variant="secondary"
              className={CONFIDENCE_COLORS[field.confidenceTier]}
            >
              {field.confidencePct}%
            </Badge>
          </div>
        ))}
      </div>

      <div className="border-t px-4 py-3">
        <Link
          href={`/results/${SAMPLE_EXTRACTION_ID}`}
          className="text-sm font-medium text-primary hover:underline"
          onClick={() =>
            captureEvent(EVENTS.upload_sample_clicked, { location: 'teaser_link' })
          }
          data-testid="sample-teaser-link"
        >
          See all 126 fields →
        </Link>
      </div>
    </div>
  )
}
```

### Step 1.4 — Run tests to confirm they pass

```bash
cd frontend && npx vitest run __tests__/upload/sample-teaser.test.tsx
```

Expected: all 7 tests PASS

### Step 1.5 — Check coverage

```bash
cd frontend && npx vitest run --coverage __tests__/upload/sample-teaser.test.tsx
```

Expected: `components/upload/sample-teaser.tsx` at 95%+ lines/functions/branches

### Step 1.6 — Commit

```bash
cd frontend
git add components/upload/sample-teaser.tsx __tests__/upload/sample-teaser.test.tsx
git commit -m "feat(upload): add SampleTeaser component for CRO trust signal"
```

---

## Task 2: Restructure upload page

**Files:**
- Modify: `frontend/app/(public-app)/upload/page.tsx`
- Modify: `frontend/__tests__/upload/upload-page.test.tsx`

### Step 2.1 — Write failing tests first (update the test file)

Replace `frontend/__tests__/upload/upload-page.test.tsx` with:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UploadPage from '@/app/(public-app)/upload/page'
import * as useUploadModule from '@/hooks/use-upload'
import type { UseUploadReturn } from '@/hooks/use-upload'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/hooks/use-upload', () => ({
  useUpload: vi.fn(),
}))

const mockCaptureEvent = vi.fn()
vi.mock('@/lib/posthog', () => ({
  captureEvent: (...args: unknown[]) => mockCaptureEvent(...args),
  EVENTS: {
    upload_completed: 'upload_completed',
    upload_sample_clicked: 'upload_sample_clicked',
  },
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    onClick,
    ...rest
  }: {
    children: React.ReactNode
    href: string
    onClick?: () => void
    [key: string]: unknown
  }) => (
    <a href={href} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
}))

// Mock SampleTeaser so upload-page tests don't re-test its internals
vi.mock('@/components/upload/sample-teaser', () => ({
  SampleTeaser: () => <div data-testid="sample-teaser-mock" />,
}))

function createMockUpload(overrides: Partial<UseUploadReturn> = {}): UseUploadReturn {
  return {
    upload: vi.fn(),
    progress: 0,
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    extractionId: null,
    fileName: null,
    reset: vi.fn(),
    ...overrides,
  }
}

describe('UploadPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useUploadModule.useUpload).mockReturnValue(createMockUpload())
  })

  // ── Hero ────────────────────────────────────────────────────────────────────

  it('renders the updated hero heading', () => {
    render(<UploadPage />)
    expect(
      screen.getByRole('heading', { level: 1 }),
    ).toHaveTextContent('Your lease has 126 data points. Know all of them in minutes.')
  })

  // ── Dual CTA ────────────────────────────────────────────────────────────────

  it('renders the "Try a Sample Lease" hero CTA button', () => {
    render(<UploadPage />)
    expect(screen.getByTestId('try-sample-hero-button')).toBeInTheDocument()
  })

  it('fires upload_sample_clicked with location hero_cta when hero CTA is clicked', async () => {
    render(<UploadPage />)
    await userEvent.click(screen.getByTestId('try-sample-hero-button'))
    expect(mockCaptureEvent).toHaveBeenCalledWith('upload_sample_clicked', { location: 'hero_cta' })
  })

  it('navigates to sample results when hero CTA is clicked', async () => {
    render(<UploadPage />)
    await userEvent.click(screen.getByTestId('try-sample-hero-button'))
    expect(mockPush).toHaveBeenCalledWith('/results/sample')
  })

  it('renders the "Upload Your PDF" button', () => {
    render(<UploadPage />)
    expect(screen.getByTestId('upload-your-pdf-button')).toBeInTheDocument()
  })

  it('calls scrollIntoView when "Upload Your PDF" is clicked', async () => {
    const mockScrollIntoView = vi.fn()
    const mockGetElementById = vi.spyOn(document, 'getElementById').mockReturnValue({
      scrollIntoView: mockScrollIntoView,
    } as unknown as HTMLElement)

    render(<UploadPage />)
    await userEvent.click(screen.getByTestId('upload-your-pdf-button'))

    expect(mockGetElementById).toHaveBeenCalledWith('upload-card')
    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' })

    mockGetElementById.mockRestore()
  })

  // ── SampleTeaser ────────────────────────────────────────────────────────────

  it('renders the SampleTeaser component', () => {
    render(<UploadPage />)
    expect(screen.getByTestId('sample-teaser-mock')).toBeInTheDocument()
  })

  // ── Risk-reversal callout ────────────────────────────────────────────────────

  it('renders the risk-reversal callout section', () => {
    render(<UploadPage />)
    expect(screen.getByTestId('risk-reversal')).toBeInTheDocument()
  })

  it('risk-reversal mentions free preview', () => {
    render(<UploadPage />)
    expect(
      screen.getByText(/free preview.*see all extracted fields before paying/i),
    ).toBeInTheDocument()
  })

  it('risk-reversal links to privacy policy', () => {
    render(<UploadPage />)
    const link = screen.getByTestId('privacy-policy-link')
    expect(link).toHaveAttribute('href', '/privacy')
  })

  // ── Upload card ─────────────────────────────────────────────────────────────

  it('renders the upload card with id for scroll target', () => {
    render(<UploadPage />)
    // Card title still present
    expect(screen.getByText('Upload a Lease')).toBeInTheDocument()
  })

  it('renders dropzone in default state', () => {
    render(<UploadPage />)
    expect(screen.getByTestId('dropzone')).toBeInTheDocument()
  })

  it('shows progress bar during upload', () => {
    vi.mocked(useUploadModule.useUpload).mockReturnValue(
      createMockUpload({ isPending: true, fileName: 'lease.pdf', progress: 60 }),
    )
    render(<UploadPage />)
    expect(screen.getByTestId('upload-progress')).toBeInTheDocument()
    expect(screen.getByTestId('upload-file-name')).toHaveTextContent('lease.pdf')
    expect(screen.getByTestId('upload-percentage')).toHaveTextContent('60%')
  })

  it('shows error state with retry button', () => {
    const mockReset = vi.fn()
    vi.mocked(useUploadModule.useUpload).mockReturnValue(
      createMockUpload({
        isError: true,
        error: { name: 'ApiError', status: 500, detail: 'Server error', message: 'Server error' },
        reset: mockReset,
      }),
    )
    render(<UploadPage />)
    expect(screen.getByTestId('file-validation-error')).toHaveTextContent('Server error')
    expect(screen.getByTestId('upload-retry-button')).toBeInTheDocument()
  })

  it('redirects to processing page on success', () => {
    vi.mocked(useUploadModule.useUpload).mockReturnValue(
      createMockUpload({ isSuccess: true, extractionId: 'ext-redirect-123' }),
    )
    render(<UploadPage />)
    expect(mockPush).toHaveBeenCalledWith('/processing/ext-redirect-123')
  })

  it('does not redirect when not successful', () => {
    render(<UploadPage />)
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('renders page wrapper with test id', () => {
    render(<UploadPage />)
    expect(screen.getByTestId('upload-page')).toBeInTheDocument()
  })

  // ── Social proof ─────────────────────────────────────────────────────────────

  it('renders updated social proof copy', () => {
    render(<UploadPage />)
    expect(
      screen.getByText(/saves ~3 hours per lease vs\. manual abstraction/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/126 fields: rent, options, cam, insurance, termination/i),
    ).toBeInTheDocument()
  })
})
```

### Step 2.2 — Run tests to confirm the new assertions fail

```bash
cd frontend && npx vitest run __tests__/upload/upload-page.test.tsx
```

Expected: existing tests PASS, new tests FAIL (H1 mismatch, missing testids)

### Step 2.3 — Implement the updated upload page

Replace `frontend/app/(public-app)/upload/page.tsx` with:

```tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dropzone } from '@/components/upload/dropzone'
import { UploadProgress } from '@/components/upload/upload-progress'
import { FileValidation } from '@/components/upload/file-validation'
import { SampleTeaser } from '@/components/upload/sample-teaser'
import { useUpload } from '@/hooks/use-upload'
import { PRICING, formatPrice } from '@/lib/pricing'
import { SAMPLE_EXTRACTION_ID } from '@/lib/sample-extraction'
import { captureEvent, EVENTS } from '@/lib/posthog'
import {
  RefreshCw,
  Cpu,
  Eye,
  Unlock,
  Shield,
  FileSearch,
  Clock,
  Users,
  Zap,
  CreditCard,
  Upload,
} from 'lucide-react'

export default function UploadPage() {
  const router = useRouter()
  const {
    upload,
    progress,
    isPending,
    isSuccess,
    isError,
    error,
    extractionId,
    fileName,
    reset,
  } = useUpload()

  useEffect(() => {
    if (isSuccess && extractionId) {
      captureEvent(EVENTS.upload_completed, { extraction_id: extractionId })
      router.push(`/processing/${extractionId}`)
    }
  }, [isSuccess, extractionId, router])

  function handleSampleClick() {
    captureEvent(EVENTS.upload_sample_clicked, { location: 'hero_cta' })
    router.push(`/results/${SAMPLE_EXTRACTION_ID}`)
  }

  function handleScrollToUpload() {
    document.getElementById('upload-card')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="mx-auto max-w-xl" data-testid="upload-page">
      {/* Hero */}
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Your lease has 126 data points. Know all of them in minutes.
        </h1>
        <p className="mt-2 text-muted-foreground">
          Upload any commercial lease PDF. AI reads every page and returns
          structured data — rent, escalations, options, insurance, CAM
          caps — with confidence scores and red flag alerts.
        </p>
      </div>

      {/* Dual CTA */}
      <div className="mb-6 flex gap-3">
        <Button
          className="flex-1"
          onClick={handleSampleClick}
          data-testid="try-sample-hero-button"
        >
          <FileSearch className="size-4" />
          Try a Sample Lease
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleScrollToUpload}
          data-testid="upload-your-pdf-button"
        >
          <Upload className="size-4" />
          Upload Your PDF
        </Button>
      </div>

      {/* Inline sample teaser */}
      <div className="mb-6">
        <SampleTeaser />
      </div>

      {/* Risk-reversal callout */}
      <div
        data-testid="risk-reversal"
        className="mb-6 space-y-1.5 rounded-lg border bg-muted/50 px-4 py-3 text-sm"
      >
        <div className="flex items-center gap-2">
          <Eye className="size-4 shrink-0 text-primary" />
          <span>Free preview — see all extracted fields before paying anything</span>
        </div>
        <div className="flex items-center gap-2">
          <CreditCard className="size-4 shrink-0 text-primary" />
          <span>
            {formatPrice(PRICING.single.price)} to unlock the full report + export. No
            subscription.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="size-4 shrink-0 text-primary" />
          <span>
            Stored securely per our{' '}
            <Link
              href="/privacy"
              className="text-primary hover:underline"
              data-testid="privacy-policy-link"
            >
              data retention policy
            </Link>{' '}
            — permanently deleted on schedule.
          </span>
        </div>
      </div>

      {/* Upload card */}
      <Card id="upload-card">
        <CardHeader>
          <CardTitle className="text-2xl">Upload a Lease</CardTitle>
          <CardDescription>
            Drop in your commercial lease PDF and we will extract 126 key terms,
            flag potential issues, and have results ready in minutes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPending && fileName ? (
            <UploadProgress fileName={fileName} progress={progress} />
          ) : isError ? (
            <div className="space-y-3">
              <FileValidation error={error?.detail ?? 'Upload failed. Please try again.'} />
              <Button
                variant="outline"
                onClick={reset}
                className="w-full"
                data-testid="upload-retry-button"
              >
                <RefreshCw className="size-4" />
                Try again
              </Button>
            </div>
          ) : (
            <Dropzone onFileAccepted={upload} disabled={isPending} />
          )}
        </CardContent>
      </Card>

      {/* Social proof strip */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5" />
          <span>Saves ~3 hours per lease vs. manual abstraction</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="size-3.5" />
          <span>126 fields: rent, options, CAM, insurance, termination & more</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Shield className="size-3.5" />
          <span>
            Stored securely per our{' '}
            <Link href="/privacy" className="text-primary hover:underline">
              data retention policy
            </Link>
          </span>
        </div>
      </div>

      {/* What happens next */}
      <div className="mt-6 space-y-4 text-sm text-muted-foreground">
        <h3 className="font-medium text-foreground">What happens next</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Cpu className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>AI reads every page with OCR — even scanned leases work</span>
          </div>
          <div className="flex items-start gap-3">
            <Eye className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              <span className="font-medium text-foreground">Free preview</span>
              {' — see extracted fields and confidence scores before paying anything'}
            </span>
          </div>
          <div className="flex items-start gap-3">
            <Unlock className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              {`Full extraction with red flag analysis for ${formatPrice(PRICING.single.price)}`}
            </span>
          </div>
          <div className="flex items-start gap-3">
            <Zap className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>Export to Excel, PDF, or JSON — ready for your workflow</span>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### Step 2.4 — Run all upload tests

```bash
cd frontend && npx vitest run __tests__/upload/
```

Expected: all tests in `__tests__/upload/` PASS (sample-teaser + upload-page + dropzone + file-validation + upload-progress + use-upload)

### Step 2.5 — Full test suite + coverage check

```bash
cd frontend && npx vitest run --coverage
```

Expected:
- All tests PASS
- `components/upload/sample-teaser.tsx` ≥ 95% lines/functions/branches
- No coverage regressions on other files

### Step 2.6 — Type check

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

### Step 2.7 — Build check

```bash
cd frontend && npm run build
```

Expected: build succeeds with no errors

### Step 2.8 — Commit

```bash
cd frontend
git add app/(public-app)/upload/page.tsx __tests__/upload/upload-page.test.tsx
git commit -m "feat(upload): trust-first CRO redesign — dual CTA, teaser, risk-reversal block"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task covering it |
|-----------------|-----------------|
| Hero H1 rewrite | Task 2 step 2.3 |
| Dual CTA row (Try Sample primary, Upload Your PDF secondary) | Task 2 step 2.3 |
| SampleTeaser component with 5 fields + red flag + confidence + "See all 126 fields" link | Task 1 |
| `upload_sample_clicked` with `location: 'hero_cta'` | Task 2 step 2.3 |
| `upload_sample_clicked` with `location: 'teaser_link'` | Task 1 step 1.3 |
| Risk-reversal callout (free preview, price, privacy policy link) | Task 2 step 2.3 |
| Upload card moved below teaser (id="upload-card" for scroll) | Task 2 step 2.3 |
| Social proof copy updates | Task 2 step 2.3 |
| "data retention policy" links to /privacy | Task 2 step 2.3 |
| `COMPETITOR_PRICE_RANGE` removed from unlock step copy | Task 2 step 2.3 ✓ |

**Placeholder scan:** No TBDs, all code blocks complete.

**Type consistency:** `TeaserField.confidenceTier` used in both the field data and the `CONFIDENCE_COLORS[field.confidenceTier]` lookup — consistent. `EVENTS.upload_sample_clicked` used in both tasks — consistent with `lib/posthog.ts` definition.
