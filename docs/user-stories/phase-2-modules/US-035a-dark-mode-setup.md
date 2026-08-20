# US-035a: Dark Mode Setup

**Phase:** 2 — Independent Modules | **Depends on:** US-001 | **Blocks:** None
**Type:** Frontend
**Estimated session size:** Small

## Description

Set up the dark mode infrastructure: next-themes provider, CSS custom properties for light/dark color tokens, theme toggle component, and Tailwind dark mode configuration. This should be done early so all subsequent UI work respects the theme.

## Required Skills

- `superpowers:test-driven-development`

## Acceptance Criteria

- [ ] `next-themes` ThemeProvider wraps the application in root layout
- [ ] CSS custom properties defined for light and dark color tokens
- [ ] Tailwind `darkMode: 'class'` configured (next-themes adds/removes `dark` class)
- [ ] Theme toggle component: sun icon (light), moon icon (dark), system option
- [ ] Theme preference persisted in localStorage
- [ ] No flash of unstyled content (FOUC) on page load
- [ ] All Shadcn UI components respect dark mode automatically
- [ ] Color tokens cover: background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring

## Technical Details

### Files to Create/Modify

- Create: `frontend/components/theme/theme-provider.tsx` (next-themes wrapper)
- Create: `frontend/components/theme/theme-toggle.tsx` (sun/moon toggle button)
- Modify: `frontend/app/layout.tsx` (wrap with ThemeProvider)
- Modify: `frontend/app/globals.css` (CSS custom properties for light/dark)
- Modify: `frontend/tailwind.config.ts` (darkMode: 'class')
- Test: `frontend/__tests__/theme/theme-toggle.test.tsx`

### Key Implementation Notes

- Use `next-themes` with `attribute="class"` and `defaultTheme="system"`
- Shadcn UI already uses CSS variables — just redefine them under `.dark`
- Suppress hydration warning on `<html>` element (next-themes requirement)
- The toggle should cycle: light → dark → system (or just light/dark with system auto-detect)
- Use Lucide icons: `Sun`, `Moon` for the toggle

### Integration Points

- Every frontend story that creates UI will automatically inherit dark mode support
- US-035b (Accessibility Polish) may refine color contrast ratios
- US-012 (App Shell) header includes the theme toggle

## Verification

```bash
cd frontend
npm run build   # Build passes
npm test        # Theme toggle tests pass
# Manual: toggle between light/dark — all colors change appropriately
# Manual: refresh page — theme preference persists
# Manual: no FOUC on initial load
```

## Reference Docs

- `docs/PRD.md` — Section 12: UI requirements (dark mode support)
