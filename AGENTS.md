# Lextract.io

> **Status: retired.** Lextract is no longer live and lextract.io no longer serves it. Nothing in
> this file is deployed anywhere. It describes the system as it ran, and is kept so the repository
> stays readable and buildable locally.

## Design Canon

- **Buttons are pills.** Treat fully rounded button geometry as a standing product preference. Every button or button-styled CTA should use pill corners (`border-radius: 9999px`, `rounded-full`, or equivalent), including primary/secondary actions, link-buttons, toolbar buttons, segmented/toggle controls, and icon buttons (circular when square). Do not introduce square or mildly rounded button shapes unless the user explicitly asks for that exception.

## Before Starting Work

Run `git pull` before beginning any task. This repository is developed across multiple computers and your local copy may be behind.

AI-powered commercial lease abstraction — PDF in, 126 structured fields out, $15/lease.

## Documentation (READ BEFORE WORKING)

- **Architecture:** `portfolio/ARCHITECTURE.md` — repo layout, services map, data model, API surface, background jobs, deployment
- **PRD:** `portfolio/PRD.md` — full product requirements, pricing, fields, red flags
- **User flows:** `portfolio/USER-FLOWS.md` — 5 step-by-step user journeys
- **Field schema:** `docs/lextract_field_schema.json` — 126-field extraction schema
- **Implementation plan:** `docs/user-stories/MASTER_PLAN.md` — 44 stories across 7 phases
- **Progress tracker:** `docs/user-stories/TRACKER.md` — read before starting, update when done
- **Content research prompts:** `docs/content-research/` — ChatGPT Deep Research prompts for content generation
- **CamAudit v2 (reuse source):** `<camaudit-v2-repo>`

## Tech Stack

Production was Cloudflare-native end to end. `portfolio/DEPLOYMENT.md` is the authority; if this section and that file ever disagree, that file wins.

**Frontend** (`frontend/`) — Next.js 16 / React 19 / TypeScript strict / Tailwind 4 / Shadcn UI / TanStack Query — deployed to the Cloudflare Worker `lextract` via OpenNext (`lextract.io`). Deploy is manual: `npm run build:cf` then `npm run deploy:cf`.

**API** (`workers/api/`) — **This was the production backend.** TypeScript on Cloudflare Workers, deployed as `lextract-api` on `api.lextract.io`. Bindings: R2 (`DOCUMENTS_BUCKET`), Hyperdrive → Neon, Queues (`lextract-email`, `lextract-cleanup`, each with a DLQ and `max_retries: 5`), Workflows (`ExtractionWorkflow`, `ExportWorkflow`).

**Extract core** (`packages/extract-core/`) — Extraction domain logic in TypeScript with zero Worker bindings, so it stays testable in plain Vitest. Consumed directly by `workers/api`.

**Marketing data** (`workers/marketing-data/`) — Marketing events on Cloudflare D1.

**Services** — Neon Postgres (via Hyperdrive) · Neon Auth · Cloudflare R2 (PDF storage, zero egress) · OpenRouter → Google Gemini 3 Flash (vision-LLM extraction, native PDF multimodal input) · Stripe (payments) · Resend (transactional email) · Sentry (error tracking) · PostHog (product analytics)

### Superseded — present in the repo, not deployed

**Backend** (`backend/`) — v1 FastAPI / Python 3.12 / Pydantic v2 / Celery + Redis, formerly on Railway. Replaced by `workers/api` on 2026-06-12. **There is no Railway service, Redis broker, or Celery worker in production.** Still the home of the canonical schema at `backend/neon/migrations/`, and of the v1 test suite.

**Extract SDK** (`packages/extract-sdk/`) — v1 of `extract-core`, in Python. Superseded for Lextract; retained because CamAudit-v2 consumes it.

**`supabase/`** — Vestigial. The project began on Supabase and moved to Neon; two orphaned migrations were never folded into `backend/neon/migrations/`.

## Project Structure

```
lextract/
  frontend/              # Next.js 16 app
    app/                 # App Router pages + layouts
      (auth)/            # Login, signup routes
      (app)/             # Protected routes (require session)
      (marketing)/       # Landing page, content pages
    components/          # React components
      ui/                # Shadcn/Radix primitives
    lib/                 # Utilities (supabase, api client, content loading)
    hooks/               # Custom hooks
    types/               # Shared type exports
  backend/               # FastAPI app
    app/                 # Source code
      api/v1/            # Route handlers
      core/              # Config, deps, security
      models/            # Pydantic models
      services/          # App-specific services (object storage, Stripe, exports)
      tasks/             # Celery background jobs (call extract-sdk)
    tests/               # pytest tests (mirrors app/ structure)
  packages/              # Shared libraries
    extract-sdk/         # PDF extraction pipeline (Gemini 3 Flash via OpenRouter + 3-pass validation + scoring)
      src/extract_sdk/   # Library source
      tests/             # Library tests
  docs/                  # PRD, architecture, user stories, content research
  AGENTS.md              # This file — agent orientation
```

## Execution Expectations

**Work end-to-end without pausing for progress check-ins.** Do not stop after completing a batch or phase to ask "ready for feedback?" or "should I continue?". Execute the full plan autonomously from start to finish. Asking clarifying questions about implementation requirements is still expected and encouraged.

## Multi-Agent Workflow

Multiple agents work in parallel on independent stories. Follow these rules strictly:

### Tracker Protocol
1. **Before starting:** Read `docs/user-stories/TRACKER.md` to find your assigned task and verify its dependencies are `[x]`
2. **Taking a story:** Immediately mark it `[~]` (in progress) with your worktree branch name — do this before writing any code
3. **Finishing work:** After all commits for the story are done, mark it `[x]` (complete) with the merge commit SHA, then commit the tracker update
4. **If blocked:** Note the blocker in the tracker

**Both tracker updates require a commit** — one when you start (`chore(tracker): mark US-XXX in progress`) and one when you finish (`chore(tracker): mark US-XXX complete`).

### Git Discipline
- **Use worktrees for all parallel agent work.** Do not work directly on `main`.
- **Only commit files you created or modified for your task.** Do not `git add -A` or `git add .`
- Stage files explicitly by name: `git add path/to/file1 path/to/file2`
- Never commit unrelated changes, generated files from other tracks, or `.env` files
- Commit message format: `type(scope): description` — e.g., `feat(auth): add JWT validation middleware`
- Types: `feat`, `fix`, `test`, `refactor`, `chore`, `docs`
- Do not amend other agents' commits
- Do not force push

### Code Review Before Commit — MANDATORY
After finishing implementation (tests pass, linting clean), you **must** invoke the `superpowers:requesting-code-review` skill before committing. The workflow is:
1. Complete implementation and verify tests pass locally
2. Invoke the `superpowers:requesting-code-review` skill (this spins up a code-reviewer agent)
3. Address **all** issues the reviewer identifies — no skipping, no deferring
4. Re-run tests after fixes to confirm nothing broke
5. Only then proceed to commit

Do not commit until code review is clean. This is not optional.

### Conflict Prevention
- Each story owns its own files (listed in the story's user-story doc under "Files to Create/Modify")
- If you need to modify a shared file (e.g., `main.py`, `layout.tsx`), coordinate via tracker notes
- Prefer adding new files over editing shared files when possible

## Quality Gates — STRICTLY ENFORCED

### Zero Tolerance
- **No placeholder code.** Every function must be fully implemented.
- **No TODO/FIXME/HACK comments.** If it needs doing, do it now or don't write the comment.
- **No `pass` in non-abstract methods.** No empty function bodies. No `...` as implementation.
- **No `# type: ignore` without explanation.** If mypy complains, fix the types.
- **No `any` type in TypeScript.** Use proper types or `unknown` with narrowing.
- **No `as` type assertions without comment.** Explain why the assertion is safe.
- **No `eslint-disable` without explanation.** Fix the lint error instead.
- **No mock-only tests.** Tests must exercise real logic. Mocks are only for external boundaries (Neon, Supabase Auth, Stripe, Cloudflare R2, OpenRouter).

### Test-Driven Development (TDD) — MANDATORY

Every task follows this exact cycle. No exceptions:
1. **Write the failing test first.** The test must define expected behavior before any implementation exists.
2. **Run the test. Confirm it fails.** If it passes, your test is wrong.
3. **Write the minimal implementation** to make the test pass.
4. **Run the test. Confirm it passes.**
5. **Refactor** if needed, re-run tests to confirm still green.
6. **Commit.**

### Coverage Requirements
- **95% code coverage minimum on every file you touch.** Not the repo average — each individual file.
- Backend: `pytest --cov=app --cov-report=term-missing` — check per-file output
- Frontend: `npx vitest --coverage` — check per-file output
- If a file drops below 95%, you are not done. Write more tests.

### Database Migrations

If your task touches the database schema:
1. **Write the migration file first** (`supabase/migrations/`)
2. **Apply it locally** before writing any test or implementation code
3. **Commit migration and dependent code together** in the same commit

Never write tests or application code against a schema that hasn't been applied locally. Schema errors are not TDD red — they're setup failures.

## Critical Conventions

1. **TypeScript strict** — no `any`, no implicit returns, everywhere in `frontend/`
2. **Pydantic v2** — all backend request/response models use `model_validator`, `field_validator`
3. **RLS on every table** — no Supabase table is created without Row-Level Security policies
4. **Credit ledger is immutable** — never update `credit_transactions` rows; always insert new rows; `balance_after` must be computed and stored at insert time

## Code Style

### Python (Backend)
- Formatter: black (88 line length)
- Linter: ruff (E, F, I, N, W, UP rules)
- Import sorting: isort (black profile)
- Type checking: mypy (strict mode)
- Async: use `async def` for all route handlers and service methods that do I/O
- Models: Pydantic v2 `BaseModel` for all schemas

### TypeScript (Frontend)
- Strict TypeScript — no `any`, no `as` type assertions without comment
- React: functional components only, no default exports for components
- Data fetching: TanStack Query — no `useEffect` for data fetching
- Forms: React Hook Form + Zod schema validation
- Styling: Tailwind CSS utility classes, Shadcn/UI for base components

### Naming Conventions
- Python: `snake_case` for everything except classes (`PascalCase`)
- TypeScript: `camelCase` for variables/functions, `PascalCase` for components/types
- Files: `kebab-case.ts` for frontend, `snake_case.py` for backend
- Test files: `test_*.py` (backend), `*.test.ts` / `*.test.tsx` (frontend)

## Commands

```bash
# Backend
cd backend && python -m pytest                    # Run all tests with coverage
cd backend && python -m pytest tests/test_foo.py  # Run specific test file
cd backend && ruff check app/                     # Lint
cd backend && black --check app/                  # Format check
cd backend && mypy app/                           # Type check

# Extract SDK
cd packages/extract-sdk && python -m pytest       # Run SDK tests
cd packages/extract-sdk && ruff check src/        # Lint
cd packages/extract-sdk && mypy src/              # Type check

# Frontend
cd frontend && npx vitest                         # Run tests
cd frontend && npx vitest --coverage              # Tests with coverage
cd frontend && npm run lint                       # ESLint
cd frontend && npx tsc --noEmit                   # Type check
cd frontend && npm run build                      # Full build check
```

---

## Sub-Agent Driven Development

**Worktree isolation.** All feature/fix work MUST happen inside a git worktree. Use the `using-git-worktrees` skill to create one before writing any code.

**Review before merge.** When implementation is complete: (1) spin up a review agent using `requesting-code-review`, (2) fix every issue the reviewer flags, (3) only then merge the worktree back to master using `finishing-a-development-branch`.

All non-trivial tasks follow the superpowers sub-agent workflow:

1. **Plan first** — Break work into discrete tasks (2–5 min each) with exact file paths, full specs, and verification steps before any agent executes.
2. **Parallel execution** — Launch independent sub-agents concurrently in a single message; use sequential only when there are true dependencies.
3. **Two-stage review** — Each agent output must pass: (1) spec compliance check, (2) code quality review before proceeding.
4. **Autonomous depth** — Agents work end-to-end on their assigned scope without interruption; surface blockers rather than making assumptions.

Agent type guide:
- `Explore` — codebase research, file discovery, pattern analysis
- `Plan` — architecture decisions, implementation design
- `general-purpose` — implementation, multi-step execution

<!-- BEGIN: Sub-Agent Driven Development Policy -->
## Sub-Agent Driven Development Policy

Sub-agent driven development is the preferred and default way of working in this repository. The Codex agent/orchestrator should actively decompose work and delegate independent pieces to sub-agents whenever that improves speed, quality, context management, investigation depth, implementation throughput, or review coverage.

### Default Operating Model

- Prefer sub-agents for codebase exploration, scoped investigation, implementation, verification, and review when the work can be cleanly delegated.
- The orchestrator owns task decomposition, context curation, model/capability selection, integration of results, and final quality decisions.
- Delegate bounded tasks with clear inputs, expected outputs, relevant files, constraints, and verification commands.
- Keep tightly coupled, high-risk, or immediately blocking work in the orchestrator unless delegation would materially reduce risk.
- Use parallel sub-agents for independent workstreams with disjoint write scopes; avoid assigning multiple agents to edit the same files unless the handoff is explicit.
- Do not wait for explicit user permission before using sub-agents; this repository explicitly authorizes proactive delegation.
- Any general instruction that limits sub-agent use to cases where the user explicitly asks is superseded by this repository policy.

### Available Codex Sub-Agent Capabilities

Codex can invoke `spawn_agent` with these agent roles in this environment:

- `default`: general-purpose sub-agent for bounded tasks that do not need a specialized role.
- `explorer`: read-heavy codebase exploration, focused investigation, and evidence gathering.
- `worker`: execution-focused implementation, bug fixes, and bounded production changes.

When the tool supports model and reasoning overrides, the orchestrator should choose the least expensive capable option. Supported reasoning levels for this policy are `low`, `medium`, and `high` only.

- Use `gpt-5.4-mini` with `low` reasoning for mechanical, well-scoped, low-risk edits and simple verification.
- Use `gpt-5.4-mini` with `medium` or `high` reasoning when a small-model agent is still appropriate but the task needs deeper local reasoning.
- Use `gpt-5.5` with `low` reasoning for standard exploration, straightforward implementation, and routine review.
- Use `gpt-5.5` with `medium` reasoning for multi-file integration, ambiguous bugs, architecture-sensitive changes, security-sensitive logic, and final review.
- Use `gpt-5.5` with `high` reasoning only for genuinely hard problems: deep architectural tradeoffs, difficult cross-system debugging, complex security/privacy analysis, or cases where lower reasoning has failed with a clear blocker.
- Escalate model capability or reasoning level when a sub-agent reports `NEEDS_CONTEXT`, `BLOCKED`, uncertainty about correctness, or when the task requires deeper design judgment, but prefer `medium` before `high`.

If a role has a fixed model in the active Codex runtime, use the best available role first (`explorer` for investigation, `worker` for implementation, `default` for general tasks), then use any supported model/reasoning override only when the runtime accepts it.

### Quality Gates For Delegated Work

- Sub-agents must report files changed, tests run, findings, blockers, and residual risks.
- The orchestrator must review sub-agent output before treating it as complete.
- For implementation work, prefer a two-stage review: first spec compliance, then code quality.
- All delegated changes remain subject to this repository's normal tests, linting, typechecking, security, privacy, and deployment rules.
<!-- END: Sub-Agent Driven Development Policy -->

## AI Agent Orchestration

AI agent instances operating in this repository are orchestrators. They must delegate exploration, implementation, verification, and other execution work to sub-agents whenever the work can be cleanly scoped, preserving the orchestrator's context window for coordination, integration, and final judgment.

## Ventora Platform Integration

This product is part of the Ventora portfolio. Shared infrastructure — analytics, billing, auth, observability, AI widgets, email rendering, API clients — lives in the polyglot monorepo at `<ventora-platform-repo>` (TypeScript `@ventora/*` packages, Python `ventora_*` packages). **This repo does not duplicate those concerns; it consumes them as private dependencies.**

### Source of truth

- All `@ventora/*` and `ventora_*` source code lives in `ventora-platform`. Do not copy implementations into this repo. If a bug or missing feature is in a shared package, fix it there and bump the version here.
- Cross-repo contracts (analytics events, billing plans, redaction rules) are defined in `ventora-platform/schemas/`. Never duplicate or hand-edit generated event constants.
- Integration recipes: `ventora-platform/docs/AI_CS.md`, `ventora-platform/docs/AI_SDR.md`, `ventora-platform/docs/AI_WIDGET_EMBED_SNIPPETS.md`, `ventora-platform/docs/PUBLISHING.md` (registry consumer setup).

### Private registries

- TypeScript packages install from the Cloudflare-hosted private npm registry. Auth via `.npmrc` + `VENTORA_REGISTRY_TOKEN`.
- Python packages install from the Cloudflare-hosted private PEP 503/691 index via `uv`. Auth via `UV_INDEX_VENTORA_USERNAME=__token__` + `UV_INDEX_VENTORA_PASSWORD=<read-token>`.
- See `ventora-platform/docs/PUBLISHING.md` §4–5 for full consumer setup.

### Deployable workers (consumed over HTTP)

- `ventora-ai-sdr-worker` — embeddable AI sales widget session/chat/handoff API.
- `ventora-ai-cs-worker` — authenticated app-support session/chat/escalation API. Requires HMAC-signed requests (`X-Ventora-Timestamp` / `X-Ventora-Nonce` / `X-Ventora-Signature`); this product's backend must sign on behalf of the frontend.
- `ventora-email-renderer` — `POST /render` returning rendered React Email HTML; called by `ventora_email` from Python services.
- `ventora-package-registry`, `ventora-python-registry` — the private registries above.

### This product consumes

<!-- Maintain this list. Add packages as integrations land. Remove if removed. -->

- (none yet — initial integration in progress)

### Working in this repo

- Do **not** edit anything under `<ventora-platform-repo>/` from a session that opened this product repo. Open `ventora-platform` directly if a shared-package change is needed.
- Do **not** clone or vendor `@ventora/*` source into this repo. Always install from the registry.
- When integrating a new `@ventora/*` package: add to dependencies, add env vars to `.env.example`, follow the integration recipe in `ventora-platform/docs/AI_*.md`, write tests against the public API surface, update the "This product consumes" list above.
- HMAC keys for the AI-CS worker live only on this product's backend. The frontend never holds them — it gets short-lived signed session tokens from a BFF route.

### Reporting cross-repo defects

If a bug surfaces in a shared package while working here:
1. File the defect in `ventora-platform/.claude/INTEGRATION-QUEUE.md` under "Phase 4 — defect fixes".
2. Pin this product's `package.json` to the last-known-good version of the affected `@ventora/*` package until the fix lands.
3. Do not patch the shared package from this repo.

## Required marketing copy pass

For this repo, all marketing copy must pass through both writing checks before completion:

1. Use the `humanizer` skill to remove AI-sounding, bloated, or generic copy.
2. Use the `third-grade-copy` skill to rewrite and audit the result for a third-grade reading level.

This applies to landing pages, hero copy, CTAs, pricing copy, onboarding copy, emails, ads, popups, social copy, SEO pages, and user-facing UI text that sells, explains, persuades, activates, or reassures.

Do not apply this rule to code identifiers, logs, API docs, technical docs for developers, exact legal text, database values, or user-generated content unless the user asks.

<!-- BEGIN: User-Facing Copy Guardrails -->
## User-Facing Copy Guardrails

For any user-facing copy in this repo, run the copy through these guardrails before you call the work done. This applies to product UI text, landing pages, hero copy, CTAs, pricing copy, onboarding copy, emails, ads, popups, social posts, SEO pages, help text, empty states, reassurance text, and any copy that sells, explains, persuades, activates, or reassures.

Required order:

1. Run the globally installed `humanizer` skill to remove AI-sounding, bloated, or generic copy.
2. Run the globally installed `third-grade-copy` skill to rewrite and audit the result for a third-grade reading level. The source package for this skill lives in `<ventora-platform-repo>`; if the global skill is missing or stale, reinstall or sync it from there before finalizing copy.
3. Verify there are zero lies: no made-up numbers, claims, proof, testimonials, guarantees, rankings, integrations, prices, timelines, or capabilities. Check claims against the product source of truth before publishing.
4. Verify the message fits the whole place it appears: the page, flow, audience, offer, brand voice, surrounding copy, and user intent. Do not approve a line just because it is clear in isolation.

Do not apply this rule to code identifiers, logs, API docs, technical docs for developers, exact legal text, database values, or user-generated content unless the user asks.
<!-- END: User-Facing Copy Guardrails -->

## Working autonomously
- **Poll, don't idle.** When a task, build, test run, or hook is running, actively poll its status and output until it finishes. Don't just sit and wait passively for it to return.
- **Keep going.** When working toward a goal, finishing one chunk of work means moving straight to the next chunk. Don't stop and wait for further input mid-goal — continue until the goal is done or you are genuinely blocked.