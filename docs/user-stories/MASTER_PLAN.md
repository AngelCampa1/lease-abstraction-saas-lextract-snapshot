# Lextract.io — Master Development Plan

> AI-powered commercial lease abstraction — PDF in, 126 structured fields out, $15/lease.

## Overview

44 user stories across 7 phases. Stories within a phase can run **in parallel** (in separate git worktrees) once their explicit dependencies are met. No story may begin until every story in its `Depends On` column is complete.

## Phase Dependency Graph

```
Phase 1 ──── Phase 2 ──── Phase 3 ──── Phase 4 ──── Phase 5 ──── Phase 6 ──── Phase 7
Foundation   Modules      Integration   Results      Full Results  Advanced UI   Deploy
(4 stories)  (17 stories) (6 stories)   (7 stories)  (5 stories)  (3 stories)   (2 stories)
┃             ┃             ┃             ┃             ┃             ┃             ┃
┣ US-001 ─────╋─ US-011 ────╋─ US-017 ────╋─ US-022 ────╋─ US-024 ────╋─ US-028 ────╋─ US-034
┣ US-002 ─────╋─ US-004 ────╋─ US-014 ────╋─ US-015b ───╋─ US-025 ────╋─ US-029 ────╋─ US-035b
┣ US-003a ────╋─ US-005 ────╋─ US-015a ───╋─ US-019 ────╋─ US-026 ────╋─ US-031
┗ US-003b     ╋─ US-006 ────╋─ US-016 ────╋─ US-021a ───╋─ US-021b
              ╋─ US-007     ╋─ US-018 ────╋─ US-023 ────╋─ US-030
              ╋─ US-008     ╋─ US-020     ╋─ US-027
              ╋─ US-009                   ╋─ US-032
              ╋─ US-010
              ╋─ US-012
              ╋─ US-013
              ╋─ US-033
              ╋─ US-035a
              ╋─ US-036
              ╋─ US-037 ────── US-038
              ╋─ US-039
              ╗─ US-040
```

## Parallelism Rules

1. **Within a phase:** All stories can run in parallel in separate git worktrees, provided their explicit dependencies are complete.
2. **Across phases:** A story in Phase N+1 only starts after its specific `Depends On` stories are merged to `main`.
3. **Merge order:** When two stories touch the same file, the first to merge wins; the second must rebase.
4. **Agent claiming:** Before starting, update `TRACKER.md` with your worktree branch name. On completion, update with the merge commit SHA.

## Required Skills (all stories)

Every story must invoke these skills before implementation:

| Skill | When |
|-------|------|
| `superpowers:test-driven-development` | All stories — write tests first |
| `frontend-design:frontend-design` | Stories with user-facing UI (marked below) |
| `humanizer` | Stories with user-facing copy (marked below) |

---

## Phase 1 — Foundation

> **Goal:** Scaffold both apps and database. Unblocks everything.

| Story | Name | Type | Size | Depends On | Blocks | UI Skills |
|-------|------|------|------|-----------|--------|-----------|
| [US-001](phase-1-foundation/US-001-scaffold-frontend.md) | Scaffold Frontend | Frontend | Medium | — | US-011, US-012, US-013, US-033, US-035a, US-036, US-037, US-039, US-040 | — |
| [US-002](phase-1-foundation/US-002-scaffold-backend.md) | Scaffold Backend | Backend | Medium | — | US-004–US-010, US-033 | — |
| [US-003a](phase-1-foundation/US-003a-database-tables.md) | Database Tables & Enums | Infrastructure | Small | — | US-003b, US-004 | — |
| [US-003b](phase-1-foundation/US-003b-database-rls.md) | RLS Policies & Seed Data | Infrastructure | Small | US-003a | — | — |

**Parallel batches:**
- Batch 1: US-001, US-002, US-003a (all independent)
- Batch 2: US-003b (after US-003a)

---

## Phase 2 — Independent Modules

> **Goal:** Build all isolated backend services and frontend shells. Maximum parallelism.
>
> **SDK note:** US-006, US-007, US-008, and US-009 implement their core logic in `packages/extract-sdk/` with thin Celery task wrappers in `backend/app/tasks/`. See `portfolio/ARCHITECTURE.md` Section 1c for the SDK directory structure.
>
> **CamAudit-v2 reuse:** Core extraction modules (Textract client, Claude client, result parser, validation loop, dual extraction) are ported from CamAudit-v2's production-grade `services/extraction/` code and generalized for reuse. The SDK uses a **schema registry pattern** (`FieldDefinition` + `FieldRegistry`) making it schema-agnostic — Lextract uses a 126-field registry, CamAudit-v2 uses a 33-field registry, same extraction code. New patterns incorporated: **dual extraction verification** (re-extract critical fields with simpler prompt, compare for agreement), **reflexion-lite validation loop** (validate → error feedback → re-extract, up to 2 retries), and **circuit breaker protection** (pybreaker wrapping Textract and Claude calls).

| Story | Name | Type | Size | Depends On | Blocks | UI Skills |
|-------|------|------|------|-----------|--------|-----------|
| [US-004](phase-2-modules/US-004-backend-auth.md) | Backend Auth & Security | Backend | Large | US-002, US-003a | US-014, US-016, US-019, US-020 | — |
| [US-005](phase-2-modules/US-005-backend-s3.md) | Backend S3 File Service | Backend | Small | US-002 | US-014 | — |
| [US-006b](phase-2-modules/US-006b-backend-gemini-pdf.md) | Gemini 3 Flash PDF Extraction (extract-sdk + backend tasks) — replaces former US-006 Textract OCR | Backend | Medium | US-002 | US-015a | — |
| [US-007](phase-2-modules/US-007-backend-claude-extraction.md) | Gemini 3-Pass Extraction Pipeline (extract-sdk + backend tasks) | Backend | Large | US-002 | US-015b | — |
| [US-008](phase-2-modules/US-008-backend-confidence-scoring.md) | Confidence Scoring (extract-sdk) | Backend | Small | US-002 | US-015b | — |
| [US-009](phase-2-modules/US-009-backend-red-flags.md) | Red Flag Detection (extract-sdk) | Backend | Medium | US-002 | US-015b | — |
| [US-010](phase-2-modules/US-010-backend-stripe.md) | Backend Stripe Integration | Backend | Medium | US-002 | US-016 | — |
| [US-011](phase-2-modules/US-011-frontend-auth.md) | Frontend Auth Pages | Frontend | Medium | US-001 | US-017, US-018 | `frontend-design`, `humanizer` |
| [US-012](phase-2-modules/US-012-frontend-app-shell.md) | Frontend App Shell | Frontend | Medium | US-001 | US-017, US-018, US-022, US-023, US-027 | `frontend-design` |
| [US-013](phase-2-modules/US-013-landing-page.md) | Landing Page | Frontend | Large | US-001, US-036 | — | `frontend-design`, `humanizer` |
| [US-033](phase-2-modules/US-033-error-tracking.md) | Error Tracking & Analytics | Full-stack | Small | US-001, US-002 | — | — |
| [US-035a](phase-2-modules/US-035a-dark-mode-setup.md) | Dark Mode Setup | Frontend | Small | US-001 | — | — |
| [US-036](phase-2-modules/US-036-seo-infrastructure.md) | SEO Infrastructure | Frontend | Medium | US-001 | US-013, US-038, US-039, US-040 | `frontend-design` |
| [US-037](phase-2-modules/US-037-content-infrastructure.md) | Content Infrastructure | Frontend | Medium | US-001 | US-038 | — |
| [US-038](phase-2-modules/US-038-blog-resource-guides.md) | Blog & Resource Guide Pages | Frontend | Large | US-037, US-036 | — | `frontend-design`, `humanizer` |
| [US-039](phase-2-modules/US-039-glossary-competitor-pages.md) | Glossary & Competitor Pages | Frontend | Medium | US-001, US-036 | — | `frontend-design`, `humanizer` |
| [US-040](phase-2-modules/US-040-state-pages.md) | State Commercial Lease Law Pages | Frontend | Medium | US-001, US-036 | — | `frontend-design`, `humanizer` |

**Parallel batches:**
- Batch 1: All stories except US-013, US-038, US-039, US-040 can run in parallel (all depend only on Phase 1 stories)
- Batch 2: US-013 (after US-036), US-038 (after US-036 + US-037), US-039 (after US-036), US-040 (after US-036)

---

## Phase 3 — Integration

> **Goal:** Wire modules together. Upload flow, pipeline, credits, frontend pages.

| Story | Name | Type | Size | Depends On | Blocks | UI Skills |
|-------|------|------|------|-----------|--------|-----------|
| [US-014](phase-3-integration/US-014-backend-upload-flow.md) | Backend Upload Flow | Backend | Medium | US-004, US-005 | — | — |
| [US-015a](phase-3-integration/US-015a-pipeline-orchestration.md) | Pipeline Orchestration | Backend | Large | US-006 | US-015b, US-019, US-021a, US-032 | — |
| [US-016](phase-3-integration/US-016-backend-credits.md) | Backend Credits & Payments | Backend | Large | US-004, US-010 | US-023 | — |
| [US-017](phase-3-integration/US-017-frontend-upload.md) | Frontend Upload Page | Frontend | Medium | US-011, US-012 | — | `frontend-design`, `humanizer` |
| [US-018](phase-3-integration/US-018-frontend-processing-status.md) | Frontend Processing Status | Frontend | Medium | US-011, US-012 | US-022 | `frontend-design` |
| [US-020](phase-3-integration/US-020-backend-dashboard-endpoints.md) | Backend Dashboard Endpoints | Backend | Small | US-004 | US-027 | — |

**Parallel batches:**
- All 6 stories can run in parallel once their specific dependencies are met

---

## Phase 4 — Results & Payment

> **Goal:** Full extraction pipeline, results display, payment flow, exports.

| Story | Name | Type | Size | Depends On | Blocks | UI Skills |
|-------|------|------|------|-----------|--------|-----------|
| [US-015b](phase-4-results/US-015b-pipeline-full-integration.md) | Full Pipeline Integration | Backend | Large | US-015a, US-007, US-008, US-009 | US-025, US-026 | — |
| [US-019](phase-4-results/US-019-backend-results-endpoints.md) | Backend Results Endpoints | Backend | Medium | US-015a, US-004 | US-024 | — |
| [US-021a](phase-4-results/US-021a-export-word.md) | Export Framework & Word | Backend | Large | US-015a | US-021b, US-030 | — |
| [US-022](phase-4-results/US-022-frontend-teaser.md) | Frontend Teaser View | Frontend | Medium | US-012, US-018 | US-024 | `frontend-design`, `humanizer` |
| [US-023](phase-4-results/US-023-frontend-payment.md) | Frontend Payment Flow | Frontend | Medium | US-012, US-016 | — | `frontend-design`, `humanizer` |
| [US-027](phase-4-results/US-027-frontend-dashboard.md) | Frontend Dashboard | Frontend | Medium | US-012, US-020 | — | `frontend-design`, `humanizer` |
| [US-032](phase-4-results/US-032-email-notifications.md) | Email Notifications | Backend | Small | US-015a | — | `humanizer` |

**Parallel batches:**
- All 7 stories can run in parallel once their specific dependencies are met

---

## Phase 5 — Full Results & Editing

> **Goal:** Complete results view, field editing, CamAudit handoff, more exports.

| Story | Name | Type | Size | Depends On | Blocks | UI Skills |
|-------|------|------|------|-----------|--------|-----------|
| [US-021b](phase-5-full-results/US-021b-export-pdf-excel.md) | PDF & Excel Exports | Backend | Medium | US-021a | — | — |
| [US-024](phase-5-full-results/US-024-frontend-full-results.md) | Frontend Full Results View | Frontend | Large | US-019, US-022 | US-028, US-029, US-030, US-031 | `frontend-design` |
| [US-025](phase-5-full-results/US-025-backend-field-editing.md) | Backend Field Editing | Backend | Medium | US-015b | US-028 | — |
| [US-026](phase-5-full-results/US-026-backend-camaudit-handoff.md) | Backend CamAudit Handoff | Backend | Medium | US-015b | US-031 | — |
| [US-030](phase-5-full-results/US-030-frontend-export-download.md) | Frontend Export & Download | Frontend | Small | US-021a, US-024 | — | `frontend-design` |

**Parallel batches:**
- All 5 stories can run in parallel once their specific dependencies are met

---

## Phase 6 — Advanced UI

> **Goal:** Rich interactive features — inline editing, PDF viewer, CamAudit upsell.

| Story | Name | Type | Size | Depends On | Blocks | UI Skills |
|-------|------|------|------|-----------|--------|-----------|
| [US-028](phase-6-advanced-ui/US-028-frontend-inline-editing.md) | Frontend Inline Editing | Frontend | Medium | US-024, US-025 | — | `frontend-design` |
| [US-029](phase-6-advanced-ui/US-029-frontend-pdf-viewer.md) | Frontend PDF Viewer | Frontend | Large | US-024 | — | `frontend-design` |
| [US-031](phase-6-advanced-ui/US-031-frontend-camaudit-cta.md) | Frontend CamAudit CTA | Frontend | Medium | US-024, US-026 | — | `frontend-design`, `humanizer` |

**Parallel batches:**
- All 3 stories can run in parallel

---

## Phase 7 — Deploy & Polish

> **Goal:** Production deployment, accessibility, loading states.

| Story | Name | Type | Size | Depends On | Blocks | UI Skills |
|-------|------|------|------|-----------|--------|-----------|
| [US-034](phase-7-deploy/US-034-deployment-config.md) | Deployment Configuration | Infrastructure | Medium | All prior | — | — |
| [US-035b](phase-7-deploy/US-035b-accessibility-polish.md) | Accessibility & Polish | Frontend | Medium | Most UI stories | — | `frontend-design` |

**Parallel batches:**
- Both stories can run in parallel

---

## Summary Stats

| Metric | Count |
|--------|-------|
| Total stories | 44 |
| Backend | 18 |
| Frontend | 20 |
| Full-stack | 1 |
| Infrastructure | 4 |
| Stories requiring `frontend-design` | 20 |
| Stories requiring `humanizer` | 13 |
| Max parallel agents (Phase 2) | 13 (US-013, US-038, US-039, US-040 wait for US-036) |

## Reference Documents

- [`portfolio/ARCHITECTURE.md`](../../portfolio/ARCHITECTURE.md) — Repo layout, services, data model, API, jobs, deployment
- [`portfolio/PRD.md`](../../portfolio/PRD.md) — Full product requirements, pricing, fields, red flags
- [`portfolio/USER-FLOWS.md`](../../portfolio/USER-FLOWS.md) — 5 step-by-step user journeys
- [`docs/lextract_field_schema.json`](../lextract_field_schema.json) — 126-field extraction schema
