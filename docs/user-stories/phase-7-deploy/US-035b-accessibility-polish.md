# US-035b: Accessibility & Loading Polish

**Phase:** 7 — Deploy & Polish | **Depends on:** Most UI stories (US-011, US-012, US-013, US-017, US-018, US-022, US-024, US-027) | **Blocks:** None
**Type:** Frontend
**Estimated session size:** Medium

## Description

Final polish pass across all frontend pages: add loading skeletons for every data-fetching page, ensure keyboard navigation works throughout, add ARIA attributes to all interactive components, verify responsive design, and integrate Sonner toast notifications for all user actions.

## Required Skills

- `superpowers:test-driven-development`
- `frontend-design:frontend-design` — polish work directly affects user experience

## Acceptance Criteria

- [ ] Loading skeletons for: dashboard, results (teaser + full), processing status, profile
- [ ] Skeletons match the layout of the loaded content (not generic spinners)
- [ ] Focus management: focus moves logically with Tab, modal traps focus, return focus on close
- [ ] Keyboard navigation: all interactive elements accessible via keyboard
- [ ] ARIA attributes on: accordion (expanded/collapsed), tabs (selected), badges (role=status), modals (role=dialog), dropdowns (role=menu)
- [ ] Sonner toasts for: upload success, payment success, field edit saved, export ready, errors
- [ ] Toast messages are concise and actionable
- [ ] Responsive audit: all pages verified at 375px, 768px, 1024px, 1440px breakpoints
- [ ] No layout overflow or horizontal scroll at any breakpoint
- [ ] Color contrast meets WCAG 2.1 AA (4.5:1 for text, 3:1 for large text) in both light and dark modes
- [ ] Loading skeleton components use CSS shimmer animation (not Motion — pure CSS for performance)
- [ ] Toast notifications use Motion-powered enter/exit transitions (if Sonner defaults are insufficient)
- [ ] All Motion animations respect `prefers-reduced-motion` media query (Motion handles this automatically)
- [ ] Screen reader: all images have alt text, all form fields have labels, all buttons have accessible names

## Technical Details

### Files to Create/Modify

- Create: `frontend/components/skeletons/dashboard-skeleton.tsx`
- Create: `frontend/components/skeletons/results-skeleton.tsx`
- Create: `frontend/components/skeletons/processing-skeleton.tsx`
- Create: `frontend/components/skeletons/profile-skeleton.tsx`
- Modify: `frontend/app/(app)/dashboard/page.tsx` (add Suspense with skeleton)
- Modify: `frontend/app/(app)/results/[id]/page.tsx` (add Suspense with skeleton)
- Modify: `frontend/app/(app)/processing/[id]/page.tsx` (add Suspense with skeleton)
- Modify: `frontend/app/(app)/profile/page.tsx` (add Suspense with skeleton)
- Modify: Various component files (add ARIA attributes, keyboard handlers)
- Create: `frontend/lib/toast.ts` (Sonner toast helper with consistent styling)
- Test: `frontend/__tests__/accessibility/keyboard-nav.test.tsx`
- Test: `frontend/__tests__/accessibility/aria.test.tsx`

### Key Implementation Notes

- Skeletons: use Shadcn Skeleton component with layout matching the real content
- Suspense boundaries: wrap data-fetching sections, show skeleton as fallback
- Focus trap: use `@radix-ui/react-focus-guard` (already part of Shadcn) for modals
- Sonner: already installed (US-001), configure with consistent position (top-right), duration (4s), styling
- Toast patterns: `toast.success("Field saved")`, `toast.error("Upload failed — please try again")`
- Responsive fixes: use Tailwind responsive utilities, check flexbox wrapping, text truncation
- ARIA audit: systematic pass through all components, add `role`, `aria-label`, `aria-expanded`, `aria-selected` as needed
- Color contrast: test with Chrome DevTools accessibility inspector or axe-core

### Integration Points

- Touches every frontend page created in Phases 2-6
- US-035a (Dark Mode) color tokens must pass contrast checks
- Sonner toast replaces any ad-hoc alert/notification patterns from earlier stories

## Verification

```bash
cd frontend
npm run build   # Build passes
npm test        # Accessibility tests pass
# Manual: navigate entire app with keyboard only — all features accessible
# Manual: run Lighthouse accessibility audit — score >= 90
# Manual: test with screen reader (VoiceOver or NVDA) — all content announced correctly
# Manual: verify all 4 breakpoints — no overflow, no broken layouts
# Manual: check skeletons — each page shows appropriate skeleton during loading
```

## Reference Docs

- `docs/PRD.md` — Section 12: Accessibility requirements (WCAG 2.1 AA)
- All UI story files — for page-specific component references
