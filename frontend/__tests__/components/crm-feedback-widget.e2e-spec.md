# E2E spec — CRM feedback widget loader mount (unrun)

## Status: UNRUN

No Playwright harness exists in this repo (the repo uses vitest/jsdom for all
integration tests; `e2e-artifacts/` holds snapshot outputs from ad-hoc CLI runs
against production, not a reproducible local Playwright suite). This spec
documents the test that SHOULD be run manually or added to a future Playwright
suite.

## Preconditions

- Local dev server running at `http://localhost:3000` (or wherever `next dev` binds).
- `.env.local` contains `NEXT_PUBLIC_CRM_WIDGET_KEY=wk_LOCALTESTPLACEHOLDER00000000000000`.
- A valid test user account exists; credentials in `.env.e2e.local`.

## Test: loader script mounts on the authenticated app surface

```
1. Navigate to http://localhost:3000/dashboard (any authenticated route).
2. If not logged in, complete the sign-in flow.
3. Wait for the page to be fully hydrated (networkidle or DOMContentLoaded).
4. Assert: document.querySelector(
     'script[data-product="wk_LOCALTESTPLACEHOLDER00000000000000"][data-widget="feedback-button"]'
   ) is not null.
```

## Note on ingest assertion

Do NOT assert that the CRM widget data-fetch returns 200. The browser origin is
`localhost`, which is not on the CRM origin allowlist for lextract — the fetch
no-ops silently. Asserting script presence is the correct boundary.
