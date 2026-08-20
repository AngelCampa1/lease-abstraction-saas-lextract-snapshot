# Architecture Documentation Design — 2026-03-03

## Context

Lextract.io is a greenfield AI-powered commercial lease abstraction platform. The codebase does not yet exist — only `docs/PRD.md` and supporting research files. Multiple Claude Code agents will build this system in parallel using git worktrees. They need a central reference to orient themselves without reading the full PRD every session.

## Decision

Three files, two purposes:

1. **`docs/ARCHITECTURE.md`** — Deep technical reference. Layer-first structure so agents can navigate spatially (where am I, what does the data look like, what are the contracts).
2. **`docs/USER_FLOWS.md`** — Step-by-step numbered sequences for all 5 user journeys. Agents working on UI or pipeline logic consult this.
3. **`CLAUDE.md`** — Very lightweight (~30 lines). Auto-loaded by Claude Code every session. Stack at a glance + pointers to the two docs above + 3-4 critical conventions.

## Repo Structure

Monorepo. Vercel deploys `/frontend`, Railway deploys `/backend`.

```
lextract/
├── frontend/          # Next.js 16 / React 19 / TypeScript / Tailwind 4
├── backend/           # FastAPI / Python 3.12 / Celery / Redis
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md      ← to create
│   ├── USER_FLOWS.md        ← to create
│   ├── plans/
│   └── lextract_field_schema.json
└── CLAUDE.md                ← to create
```

## ARCHITECTURE.md Sections

1. **Repo Layout** — Directory tree with one-line purpose per entry
2. **External Services Map** — Every third-party service, what it does, env var name(s)
3. **Data Model** — 7 tables, key columns, enums, RLS rules
4. **API Surface** — All endpoints grouped by route prefix (auth / extractions / payments / user / webhooks)
5. **Background Jobs** — Celery task names, triggers, success/failure paths
6. **Deployment** — Vercel config, Railway 2-service setup (web/worker), env vars list, and no Celery beat service

## USER_FLOWS.md Flows

1. Upload & Extract (anonymous) — drag-drop → S3 → Textract → Claude → teaser view
2. Payment & Unlock — Stripe checkout → webhook → credit deduct → full results
3. Edit & Export — inline edit → red flag re-run → Word/PDF/Excel download
4. CamAudit Handoff — trigger conditions → encrypted payload → redirect
5. Credit Pack Purchase — Stripe checkout → credit ledger → balance update

## CLAUDE.md Conventions (critical, always-on)

- TypeScript strict mode throughout frontend
- Pydantic v2 for all backend data validation
- RLS enabled on every Supabase table — no exceptions
- All payments go through credit ledger (`credit_transactions` table), never direct charge to extraction

## Audience

Claude Code agents operating in git worktrees. Documents must be:
- Dense with facts, no fluff
- Clear headers for fast scanning
- Self-contained — agent should not need to read PRD to proceed
