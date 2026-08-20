# Lextract Design System

> [!IMPORTANT]
> **Status: retired.** Lextract.io no longer serves the product. This document describes the
> design system as it shipped, so read the components, tokens and screens below as a record of
> what was built, not as a live design language.

**Direction:** Bold Enterprise Color (Direction C) **Decided:** 2026-03-24 **Design tool:** Google
Stitch (project not public)

---

## Design Philosophy

Modern B2B SaaS: clean and confident, like Linear or Vercel but warmer. Targets commercial real
estate professionals who value clarity and trust over flashiness. The teal brand color signals
intelligence and reliability without the coldness of blue or the aggression of red.

---

## Color Tokens

All colors are defined as CSS custom properties in `frontend/app/globals.css`.

### Brand Colors (light mode)

| Token | CSS var | OKLCH | Hex approx | Usage |
|-------|---------|-------|------------|-------|
| Primary | `--primary` | `oklch(0.568 0.105 184)` | `#0D9488` | CTAs, links, active states, icons |
| Primary foreground | `--primary-foreground` | `oklch(1 0 0)` | `#FFFFFF` | Text on primary bg |
| Brand dark | `--brand-dark` (via `--color-brand-dark`) | `oklch(0.348 0.068 185)` | `#134E4A` | Headings, hero h1 |
| Brand | `--brand` (via `--color-brand`) | `oklch(0.568 0.105 184)` | `#0D9488` | Alias for primary |

### Surface Colors (light mode)

| Token | CSS var | OKLCH | Usage |
|-------|---------|-------|-------|
| Background | `--background` | `oklch(1 0 0)` | Page background (white) |
| Card | `--card` | `oklch(1 0 0)` | Card surfaces |
| Muted | `--muted` | `oklch(0.984 0.010 185)` | Subtle teal-tinted backgrounds |
| Accent | `--accent` | `oklch(0.986 0.015 180)` | Teal-50 tint (`#F0FDFA` equivalent) |
| Secondary | `--secondary` | `oklch(0.986 0.015 180)` | Same as accent |

### Text Colors (light mode)

| Token | CSS var | OKLCH | Usage |
|-------|---------|-------|-------|
| Foreground | `--foreground` | `oklch(0.145 0 0)` | Body text |
| Muted foreground | `--muted-foreground` | `oklch(0.550 0.012 260)` | Secondary text, labels |
| Secondary foreground | `--secondary-foreground` | `oklch(0.348 0.068 185)` | Text on secondary/accent bg |

### Dark Mode Overrides

| Token | Dark value | OKLCH |
|-------|-----------|-------|
| `--primary` | Lighter teal | `oklch(0.720 0.100 184)` |
| `--primary-foreground` | Dark text on teal | `oklch(0.145 0 0)` |
| `--brand-dark` | Lightened for contrast | `oklch(0.750 0.080 184)` |

---

## Typography

### Font Stack

| Role | Font | Variable | Tailwind class |
|------|------|----------|----------------|
| Display / headings | **Bricolage Grotesque** | `--font-bricolage` → `--font-display` | `font-display` |
| Body / UI | **Inter** | `--font-inter` → `--font-sans` | `font-sans` |
| Monospace | **Geist Mono** | `--font-geist-mono` → `--font-mono` | `font-mono` |

Both fonts loaded via `next/font/google` in `frontend/app/layout.tsx`: zero layout shift, no
external requests at runtime.

**Why Bricolage Grotesque:** Distinctive, geometric-but-warm, recognizably "not-Inter." Chosen
specifically to avoid the generic SaaS AI aesthetic. Weights 400 to 800 loaded.

### Usage Rules

- Hero `<h1>`: `font-display font-bold text-brand-dark`
- Section `<h2>`: `font-bold tracking-tight` (Inter, inherits from body)
- Body: default Inter via `font-sans`
- Data values (field extractions): `font-mono`

---

## Component Patterns

### Hero Badge Pill
```tsx
<div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-sm font-medium text-primary">
  <Sparkles className="size-3.5" aria-hidden="true" />
  AI-Powered Lease Intelligence
</div>
```

### Primary CTA Button
Standard `<Button size="lg">`: uses `bg-primary text-primary-foreground` via token. Add
`shadow-md shadow-primary/20` on hero for visual lift.

All buttons are pills. The shared `<Button>`, bespoke `<button>` elements, and button-like CTA links
use `rounded-full`. Icon-only buttons render as circles.

**2026-05-07 note:** Button radius is standardized to `rounded-full` across user-visible controls.
Cards, inputs, dropdowns, tabs, badges, chips, tooltip panels, and navigation rows keep their
existing surface radius.

### Featured Pricing Card
```tsx
className="border-primary shadow-primary/15 ring-1 ring-primary"
```
Badge uses `bg-primary text-primary-foreground`.

### Table Header (data tables)
```tsx
<div className="border-b bg-primary px-6 py-4">
  <h3 className="font-semibold text-primary-foreground">...</h3>
</div>
```

### Category Chips (field extraction table)
```ts
const categoryColor: Record<string, string> = {
  Parties:   'bg-blue-50 text-blue-700',
  Dates:     'bg-violet-50 text-violet-700',
  Financial: 'bg-emerald-50 text-emerald-700',
  CAM:       'bg-amber-50 text-amber-700',
  Renewal:   'bg-rose-50 text-rose-700',
}
```

### Confidence Badges
- High: `bg-emerald-100 text-emerald-800`
- Medium: `bg-amber-100 text-amber-800`
- Low: `bg-red-100 text-red-800`

### Section Backgrounds (alternating)
- White sections: default `bg-background`
- Tinted sections: `bg-accent/40` (sample output) or `bg-accent/50` (footer)

---

## Accessibility Notes

- All decorative icons must have `aria-hidden="true"` (Sparkles, CheckCircle2 in hero)
- Trust indicator lists use `<ul>/<li>` semantics
- `text-brand-dark` has a dark-mode override (`oklch(0.750 0.080 184)`) that meets WCAG AA contrast
  on dark backgrounds
- Focus ring uses teal (`--ring: oklch(0.568 0.105 184)`)

---

## Mobile-First Standards

**Added 2026-05-16.** 50 to 90% of marketing traffic is mobile. Every component, screen, and button
must be designed for a 360 px viewport first, then enhanced upward. Violations of these rules block
PR review.

### Breakpoint policy

Design and write CSS at 360 px first. Layer up with Tailwind responsive prefixes: never start from
desktop and shrink down.

| Prefix | Min width | Typical use |
|--------|-----------|-------------|
| (none) | 360 px | Mobile portrait (baseline) |
| `sm:` | 640 px | Large phones landscape, small tablets |
| `md:` | 768 px | Tablets portrait |
| `lg:` | 1024 px | Tablets landscape, small desktops |
| `xl:` | 1280 px | Standard desktops |

**Rule:** if a className lists multiple step values, the bare value MUST be the mobile case.
`text-4xl sm:text-5xl` is correct. `lg:text-3xl` alone (without a bare value) usually means
desktop-first thinking: replace with `text-2xl lg:text-3xl`.

### Tap targets

- All interactive elements (buttons, links acting as buttons, form controls, icon-only triggers)
  must be **≥ 44 × 44 px** on mobile. This is non-negotiable: iOS HIG and WCAG 2.5.5 require it.
- `<Button size="lg">` and `size="default"` already clear this. `size="sm"` and `size="icon"` need
  `min-h-[44px]` added or a `sm:` qualifier so they only render at that size on tablet+.
- Inline text links inside running prose are exempt (no tap-area requirement for in-flow links), but
  **link-as-button patterns** (e.g. `<Link>` used as a primary CTA, footer column links arranged as
  a list) must hit 44 px: use `py-2.5` minimum.

### Responsive type ladder

Use these pairings; do not invent new ones.

| Role | Classes |
|------|---------|
| Hero h1 | `text-3xl sm:text-4xl lg:text-[3.75rem] lg:leading-[1.1]` |
| Section h2 | `text-2xl sm:text-3xl lg:text-4xl` |
| Subsection h3 | `text-xl sm:text-2xl` |
| Lead paragraph | `text-base sm:text-lg lg:text-xl` |
| Body | `text-base` (always 16 px on mobile, never `text-sm` for primary copy) |
| Caption / meta | `text-sm` |
| Eyebrow / label | `text-xs uppercase tracking-wider` |

Body copy below 16 px triggers iOS zoom-on-focus inside form fields: never use `text-sm` for
`<input>` text on mobile.

### Spacing scale

Single approved patterns: drift across sections is what makes mobile look broken.

| Pattern | Classes |
|---------|---------|
| Outer container | `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8` |
| Section vertical rhythm | `py-12 sm:py-20` (bare `py-16` still remains in a few places, e.g. `frontend/app/(marketing)/page.tsx:121,164`, `frontend/app/not-found.tsx:29`, replace) |
| Stacked block gap | `space-y-6 sm:space-y-8` |
| Card padding | `p-5 sm:p-6` (small cards) or `p-6 sm:p-8` (feature cards) |

### Grids

Never write `grid-cols-N` (where N ≥ 2) without a responsive step. Always start at `grid-cols-1`, or
`grid-cols-2` only if two-up is genuinely better than stacked at 360 px (e.g. compact stat tiles).

```tsx
// ✅ correct
className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"

// ❌ wrong: collapses to overflow on mobile
className="grid grid-cols-3 gap-6"
```

### Tables

Tables with more than 3 columns do not work on a 360 px viewport even with `overflow-x-auto`.
Required pattern:

1. Wrap the `<table>` in `overflow-x-auto rounded-xl border` (allows horizontal scroll as a
   fallback).
2. Add a "← Swipe →" hint visible only on `<sm` (`sm:hidden`).
3. **Provide a card-list mobile alternative** (`md:hidden`) for tables with more than 3 columns or
   content critical to the page's job. Hide the `<table>` at `<md` (`hidden md:table`).

`components/content/comparison-table.tsx` is the reference implementation for table + card-list
pattern.

### Safe area & sticky elements

Any element using `fixed bottom-0` or `position: fixed` near the bottom edge MUST account for the
iOS home-indicator inset:

```tsx
className="fixed bottom-0 ... pb-[env(safe-area-inset-bottom)]"
```

The root `<html>` meta viewport opts into `viewport-fit=cover` so these env values resolve.

### Text containers

Long-form body copy needs a reading measure cap even on mobile. Prefer:

```tsx
<div className="mx-auto max-w-prose px-4 sm:px-6">{body}</div>
```

Do not expand text containers to `max-w-7xl`: that's for hero/feature *layouts*, not paragraph
copy.

### Verification rules

A component is mobile-ready when, at 360 px viewport:

1. No horizontal scroll (`document.documentElement.scrollWidth === window.innerWidth`).
2. Every interactive element has computed `width >= 44 && height >= 44`.
3. No text below 14 px (computed font-size).
4. Hero CTAs visible without scroll on a 667 px-tall viewport (iPhone SE).
5. No element overlaps another at the bottom of the page (sticky CTA vs footer).

The Playwright verification harness in Phase 5 of the mobile overhaul enforces all five.

---

## Files Modified

| File | What changed |
|------|-------------|
| `frontend/app/globals.css` | All color tokens, font tokens, `--brand` / `--brand-dark` pair |
| `frontend/app/layout.tsx` | Added Bricolage_Grotesque font |
| `frontend/components/marketing/hero.tsx` | Full redesign: badge, display font, gradient bg, accessible list |
| `frontend/components/marketing/header.tsx` | Nav hover → `text-primary` |
| `frontend/components/marketing/footer.tsx` | Teal bg, dark teal headings, teal email link |
| `frontend/components/marketing/social-proof.tsx` | Stat values → `text-primary` |
| `frontend/components/marketing/pricing-cards.tsx` | "Most Popular" badge, teal featured card shadow |
| `frontend/components/marketing/sample-output.tsx` | Teal table header, category color chips |
