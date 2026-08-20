# Production E2E Visual Audit - 2026-05-07

Environment: `https://lextract.io` production, desktop `1440x900`, mobile `390x844`, E2E account from local-only `.env.e2e.local`.

Artifacts: `e2e-artifacts/prod-e2e-2026-05-07/` (ignored locally).

Production extraction IDs are intentionally omitted from this committed report. The exact test-account URLs are available in the ignored local artifacts and browser history for reproduction.

## Coverage

- Public pages: `/`, `/pricing`, `/sample-report`, `/upload`, `/login`, `/signup`
- Auth: login, session persistence via app navigation, logout, protected-route redirect to `/login?return=%2Fdashboard`
- App: dashboard, profile, upload, processing, teaser, paid full results, failed results
- Uploads: invalid `.txt`, malformed `.pdf`, valid fixture `backend/tests/fixtures/real_lease_georgia_gov.pdf`
- Results: unpaid teaser, Stripe checkout redirect, paid PDF split view/mobile tabs, export buttons for DOCX/PDF/XLSX, CamAudit CTA
- Theme: authenticated dashboard light/dark on desktop and mobile

## Findings

### P1 - CamAudit handoff lands on a production 404

Status: fixed locally.

Evidence: `desktop-camaudit-handoff-after-click.png`; network shows `GET https://www.camaudit.io/import?... => 404`.

Steps:
1. Log in.
2. Open the paid E2E fixture result.
3. Click `Continue CAM Review Handoff`.

Expected: user lands on a live CamAudit handoff entrypoint.

Actual: CamAudit shows `Page not found`.

Fix: backend handoff now generates `https://www.camaudit.io/scan?payload=...` instead of `/import`.

Owner: backend `CamAuditHandoffService` / CamAudit integration.

### P2 - Failed result page can expose raw internal backend errors

Status: fixed locally.

Evidence: `desktop-failed-results.png`; failed historical result displayed `Invalid status transition from 'extracting' to 'extracting'`.

Steps:
1. Log in.
2. Open the failed E2E fixture result.

Expected: generic, user-actionable failure copy only.

Actual: raw internal state-machine text is displayed above the generic guidance.

Fix: results failed state now suppresses known internal/technical error patterns.

Owner: frontend results.

### P2 - Stripe checkout merchant name is not Lextract

Status: reported, not fixed in repo.

Evidence: `desktop-stripe-checkout-redirect.png`.

Steps:
1. Open the new unpaid E2E upload teaser result.
2. Click `Unlock for $15`.

Expected: Stripe Checkout clearly identifies Lextract.

Actual: checkout page title and merchant label show `Ventora Labs`.

Owner: Stripe account/checkout branding configuration.

### P3 - Repeated font preload warnings

Status: reported, not fixed.

Evidence: `public-pages-diagnostics.json`, console logs.

Impact: console noise only; no user-visible failure observed.

## Passed Checks

- No horizontal overflow detected on audited public/app pages at desktop or mobile widths.
- Login, dashboard data fetch, session persistence, logout, and protected redirects worked.
- Invalid non-PDF upload is rejected client-side with `Only PDF files are accepted.`
- Malformed PDF fails with generic processing-page guidance.
- Valid PDF upload completed and produced an unpaid teaser.
- DOCX, PDF, and XLSX exports returned `200`; DOCX/XLSX downloaded and PDF opened in a new tab.
- Paid result PDF viewer and mobile result tabs rendered without overflow.
