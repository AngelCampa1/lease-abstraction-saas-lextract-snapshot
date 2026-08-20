# US-031: Frontend CamAudit CTA & Upsell

**Phase:** 6 — Advanced UI | **Depends on:** US-024, US-026 | **Blocks:** None
**Type:** Frontend
**Estimated session size:** Medium

## Description

Build the CamAudit upsell UI: a persistent banner when CAM risk flags are detected, contextual upsell messages tied to specific red flags, the paid handoff CTA button that redirects to CAMAudit with the encrypted payload.

## Required Skills

- `superpowers:test-driven-development`
- `frontend-design:frontend-design` — upsell UI must be visually compelling
- `humanizer` — upsell copy must be persuasive yet professional, not salesy or AI-generated

## Acceptance Criteria

- [ ] Persistent banner shown when `should_show_camaudit` criteria are met (from extraction data)
- [ ] Banner headline: "Your lease has {N} CAM risk factors" with summary
- [ ] 5 contextual upsell messages based on which red flags fired (from PRD Section 10.4):
  - RF-001: "Management fees over 15% could cost thousands annually"
  - RF-002: "Without audit rights, you can't verify CAM charges"
  - RF-003: "No CAM cap means unlimited expense exposure"
  - RF-006: "Missing exclusions let landlords pass through prohibited costs"
  - General: "Lextract found potential CAM issues — a forensic audit can quantify your exposure"
- [ ] Paid handoff context shown without a Lextract discount badge
- [ ] CTA button: "Get a Forensic CAM Audit" → calls backend for encrypted payload → redirects to CamAudit
- [ ] Export footer also includes CamAudit link when applicable
- [ ] Banner is dismissible but re-appears on next visit
- [ ] Not shown for extractions without CAM risk factors
- [ ] Copy is persuasive but professional — not pushy or AI-sounding

## Technical Details

### Files to Create/Modify

- Create: `frontend/components/results/camaudit-banner.tsx`
- Create: `frontend/components/results/camaudit-upsell-messages.tsx`
- Create: `frontend/components/results/camaudit-context-badge.tsx`
- Create: `frontend/hooks/use-camaudit.ts` (fetch handoff URL, track dismissal)
- Modify: `frontend/components/results/full-results-view.tsx` (integrate banner)
- Modify: `frontend/components/results/export-panel.tsx` (add CamAudit link in footer)
- Test: `frontend/__tests__/results/camaudit-banner.test.tsx`

### Key Implementation Notes

- Show/hide logic: check if extraction red_flags contain CAM-triggering rules (RF-001-006, RF-013-015) or other criteria
- CTA click flow: call `GET /api/v1/extractions/{id}/camaudit-payload` → receive redirect URL → `window.location.href = url`
- Dismissal: store in localStorage per extraction_id (`camaudit_dismissed_{id}`)
- Contextual messages: map specific triggered rule_ids to message copy
- Context badge: visually distinct paid handoff context without discount language
- Banner placement: sticky at top of results page, below header
- Don't show on teaser view — only on paid full results

### Integration Points

- US-026 (Backend CamAudit Handoff) provides the encrypted payload and redirect URL
- US-024 (Full Results) hosts the banner
- US-009 (Red Flags) criteria determine when to show the banner
- US-030 (Export) adds CamAudit link to export footer

## Verification

```bash
cd frontend
npm run build   # Build passes
npm test        # CamAudit banner tests pass
# Manual: extraction with CAM flags → banner shows with correct messages
# Manual: click CTA → redirected to CamAudit URL with payload
# Manual: dismiss banner → doesn't show on same extraction (shows on others)
# Manual: extraction without CAM flags → no banner
```

## Reference Docs

- `docs/PRD.md` — Section 10: CamAudit integration, contextual upsell messages
- `docs/USER_FLOWS.md` — Flow 4: CamAudit Handoff
