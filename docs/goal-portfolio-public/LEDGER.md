# Goal: Portfolio-public — make this snapshot readable by a stranger in 90 seconds

> Restructure the Lextract snapshot so a skeptical senior engineer, given a minute and a half
> and no context, can tell what was built, what it cost, and what is wrong with it. Promote the
> documents written for a reader into a root `portfolio/` directory; leave the dated working
> residue in `docs/` where it belongs. Every claim on the front page must be checkable against
> a file in this tree, and every number must survive being looked up.
>
> Honesty is the asset. An admission of failure is never softened into marketing language, and
> a number that cannot be verified is corrected or attributed, not deleted.

## Method

1. Read every document in `docs/` and sort it into one of two piles: **retrospective and
   reader-addressed** (belongs in `portfolio/`) or **prospective, self-addressed and dated**
   (stays in `docs/`).
2. Move the first pile with `git mv` so history follows the file, then fix every inbound
   reference — README, agent orientation files, `.gitignore` comments, cross-links inside the
   moved documents themselves.
3. Surface `portfolio/` three ways in the README: an entry in the repository-map code fence, a
   two-column `## Documentation` table, and inline `→` callouts wherever a section has a deeper
   write-up behind it.
4. Take every headline number in the README and re-derive it from the tree. Correct what has
   drifted; attribute what is a claim rather than a measurement.
5. Open the image candidates and judge them as a viewer, not by filename. Reject anything that
   makes the product look broken. Give every embed alt text that says what is shown.
6. Sweep for local absolute paths, stale cross-references to sibling repositories, and text
   encoding damage.
7. Re-verify: walk every relative link in every markdown file in the repository and confirm the
   target exists.

## Cycle log

### Cycle 1 — 2026-08-13 — Inventory and the `portfolio/` split

Read all of `docs/`. Five documents were written to be read by someone who did not build the
product and are evidence-backed throughout: `ARCHITECTURE.md`, `DEPLOYMENT.md`, `PRD.md`,
`USER_FLOWS.md`, `DESIGN_SYSTEM.md`. Moved all five to root `portfolio/` with `git mv`.

Deliberately left in `docs/`: the five dated `e2e-bug-report-*` / `e2e-status-*` files,
`audit/`, `plans/`, `superpowers/`, `operations/`, `content-research/`, `seo-research/`,
`user-stories/`, `getting-badges/`, `screenshots/`, `lextract_field_schema.json`,
`MODEL_CONFIGURATION.md`, `CAMAUDIT_REUSE.md`, `HERMES_SOCIAL_MEDIA_CONTEXT.md`. These are
dated, self-addressed, and open-ended — session notes and audit runs rather than write-ups. They
stay visible on purpose. A repository with no working notes is a repository that was staged.

Root `SECURITY.md` was not moved. GitHub reads that exact path specially and moving it would
break the security-policy affordance for no gain.

### Cycle 2 — 2026-08-13 — Link repair and encoding

Rewrote every inbound reference to the five moved paths across `README.md`, `CLAUDE.md`,
`AGENTS.md`, `.gitignore`, `docs/HERMES_SOCIAL_MEDIA_CONTEXT.md`,
`docs/e2e-status-2026-03-26.md`, `docs/user-stories/MASTER_PLAN.md`, and the cross-links inside
`portfolio/ARCHITECTURE.md` and `portfolio/USER_FLOWS.md`.

The literal file contents quoted inside `docs/plans/2026-03-03-architecture-docs.md` were left
alone. That document is a dated plan that says "create `docs/ARCHITECTURE.md` with exactly this
content"; rewriting it would falsify the record of what was actually planned in March. Those
references are backticked prose, not links, so nothing renders broken.

### Cycle 3 — 2026-08-13 — Number verification

Re-derived the two headline figures. One held, one had drifted. See BUG-PP03.

### Cycle 4 — 2026-08-13 — Images

Opened every screenshot in `docs/screenshots/` and the results captures in `docs/audit/`.
Hero kept, two embeds added, one candidate rejected. See BUG-PP05 through BUG-PP07.

### Cycle 5 — 2026-08-13 — README structure

Added `## Documentation` (six rows, last row promoting "Running it locally" into view),
`portfolio/` and `make-snapshot.sh` entries in the repository-map fence, and four inline `→`
callouts. Added `## How this snapshot was built`, a walk through `scripts/make-snapshot.sh` —
why the tree is built with `git archive` rather than a file copy, and what its four assertions
check. That script was the most interesting unexplained thing in the repository.

### Cycle 6 — 2026-08-13 — Re-verification

Walked every relative markdown link and `src`/`srcset` in every `.md` file in the repository.
Zero broken targets outside vendored agent-skill reference docs, whose broken links are
illustrative examples (`hero-800.jpg`, `/docs/pricing.md`) that ship that way upstream and are
not this repository's content.

## Findings registry

(P0 = broken/blocking · P1 = looks bad or confusing · P2 = polish)

- **BUG-PP01 (P1, FIXED)** — `docs/ARCHITECTURE.md` was double-encoded and carried a UTF-8 BOM.
  Every em dash and middle dot in it rendered as `â€"` and `Â·` on GitHub, starting with the
  first line of the heading. Root cause: the file had been read as CP1252 and re-saved as UTF-8
  at some point, so each three-byte character became six. Fixed by stripping the BOM and
  round-tripping the text back through CP1252 during the move to `portfolio/ARCHITECTURE.md`.
  Verified: zero `â€` sequences remain and the heading renders `# Lextract.io — Architecture
  Reference`. Line endings unchanged.

- **BUG-PP02 (RETRACTED — not a bug)** — `docs/e2e-bug-report-2026-03-24.md` matched the same
  mojibake search. On reading it, the file is *describing* an encoding defect found during that
  E2E run ("em dash characters are served as raw UTF-8 bytes interpreted as Latin-1"). The
  sequences are the quoted evidence, not damage. No change made.

- **BUG-PP03 (P1, FIXED)** — The README's opening claim, "Lextract did it in about four
  minutes", is supported by nothing in this tree. Every user-facing page in `frontend/app/
  (marketing)/` states five to fifteen minutes, and `portfolio/PRD.md` sets a target of under
  three minutes for a fifty-page lease — a target, not a measurement. No timing is recorded
  anywhere in the repository. Rewrote the line to state the product's own published figures and
  to say plainly that neither is measured here, so a reader knows they are reading a claim.
  Also softened the same "four minutes" in the rewrite section, which was decorative there.

- **BUG-PP04 (RETRACTED — claim held)** — Suspected the "126 fields" figure had drifted. It has
  not. `docs/lextract_field_schema.json` is a list of exactly 126 entries across exactly 16
  distinct `category` values, matching both the README's metrics block and
  `frontend/data/public-knowledge/marketing.ts`. No change.

- **BUG-PP05 (P2, DOCUMENTED, not fixed)** — `frontend/lib/sample-extraction.ts` hardcodes
  `category_count: 12`, so the result-preview screen renders "126 fields across 12 categories"
  while the schema has 16 and the rest of the marketing surface reads 16 from
  `frontend/data/public-knowledge/marketing.ts`. It is a stale literal in demo-page fixture
  data, not an extractor defect. The screenshot embedded in the README shows the wrong number,
  so rather than crop around it the README now names the discrepancy and its file. Left
  unfixed: this pass does not touch application source.

- **BUG-PP06 (P1, FIXED)** — The hero image shows three `-` values in the lease summary bar,
  which reads as a rendering failure to anyone who does not know the product. Considered
  demoting the image and promoting the denser result-preview capture instead, and rejected
  that: the split view is the only image that shows the source PDF beside the extraction, which
  is the whole differentiator, and the preview page carries BUG-PP05's wrong category count in
  its first screenful. Kept the hero and rewrote the caption to explain the dashes —
  `frontend/components/results/exec-summary-card.tsx:30` renders every unknown as `-` rather
  than inventing a value, and a field with no value is scored `not_found` and dropped from the
  denominator, which is why the lease still reads HIGH 88%. Verified against the component
  source before writing the sentence.

- **BUG-PP07 (P1, FIXED)** — The README's longest and best section, on the append-only credit
  ledger, had no image, while `docs/screenshots/billing-ledger.png` shows exactly what that
  section argues: every credit row carrying its own `balance_after`. Embedded it there with alt
  text describing the payment history and the signed ledger rows. Also added the seeded
  dashboard to the collapsed screenshot section, in both themes.

- **BUG-PP08 (P2, FIXED)** — The dashboard capture shows four extractions; `scripts/seed-demo.py`
  seeds five. Rather than assert a provenance that does not hold, the caption states what the
  image shows and notes it is one lease behind the current script.

- **BUG-PP09 (P2, REJECTED)** — Considered `docs/screenshots/profile-settings.png` and the
  thirty-odd `docs/audit/*.png` captures for promotion. Rejected all of them. The audit captures
  are older builds of screens already shown better in `docs/screenshots/` — an earlier logo, a
  `0 credits` empty state — and profile settings shows nothing a reviewer needs. Adding weaker
  duplicates of images already on the page makes the page worse, not longer.

- **BUG-PP10 (P2, FIXED)** — `CLAUDE.md`, `AGENTS.md`, and two `docs/superpowers/` documents
  referenced sibling projects by local absolute path. Replaced with the placeholder convention
  already used elsewhere in this repository (`<camaudit-v2-repo>`), giving
  `<ventora-platform-repo>`, `<sequencer-repo>`, and "this repository" where a document was
  pointing at itself. No absolute path to a local machine survives in any tracked `.md`, `.txt`
  or `.json`.

- **BUG-PP11 (RETRACTED — nothing to clean)** — Went looking for committed build and tooling
  output: `lint-output.txt`, `typecheck-*.txt`, `test_output.txt`, `build-output.txt`,
  `audit_results.json`, `coverage/` dumps. None are tracked. The only near-match is
  `backend/tests/test_results_endpoints.py`, which is a test file. The `axe-*.json` files under
  `docs/audit/` were considered and kept: they are the raw accessibility-scan output that
  `docs/audit/REPORT.md` cites as its evidence, which is the same reason CapVeri keeps its run
  logs. No deletions made in this pass.

- **BUG-PP12 (RETRACTED — already clean)** — Searched for surviving `github.com/VentoraLabs/…`
  URLs. Zero matches anywhere in the tree.

### Cycle 7 — 2026-08-13 — Content-review follow-up

An independent content reviewer flagged four items against the working tree left by Cycles 1–6.
Checked each against the actual files before acting, per the standing rule in this log.

- **BUG-PP13 (RETRACTED — not a bug)** — Reviewer read `docs/screenshots/dashboard-seeded-dark.png`
  as showing "No extractions yet" against a caption promising four states. Opened the file: it
  shows exactly the four states the caption describes (uploading, extracting, failed,
  complete-and-paid), confirmed by hash against the embed path in `README.md`. The empty-state
  image the reviewer was actually seeing is `docs/audit/06a-dashboard-desktop-light.png`, which is
  correctly captioned wherever it is used (`docs/audit/REPORT.md`,
  `docs/getting-badges/assets-checklist.md`) and not embedded in the README at all. No README
  change made.

- **BUG-PP14 (P2, FIXED)** — `docs/audit/04d-signup-result.png` was byte-identical to
  `docs/audit/06a-dashboard-desktop-light.png` (empty-state dashboard) but named as if it were a
  signup result. No document referenced it by that name — the mislabel was the filename itself.
  Deleted the redundant, mislabeled copy; `06a-dashboard-desktop-light.png` remains as the one
  correctly named and referenced file.

- **BUG-PP15 (P1, FIXED)** — `docs/audit/09-https-lextract-io-results-sample.png` and
  `docs/audit/10a-results-desktop-light.png` were confirmed byte-identical (MD5
  `d607921526d47ab312da8f1475bf7dfd`), both the Austin, TX sample-lease results screen. Only `10a`
  is referenced anywhere (`docs/getting-badges/assets-checklist.md`). Deleted the unreferenced
  `09-` duplicate.

- **Hero, reconsidered (no change)** — Checked whether `docs/screenshots/hero-desktop-light.png`
  or `docs/screenshots/results-split-view.png` should lead the README. Cycle 4 (BUG-PP06) had
  already settled this: the page's actual top-of-file hero is `results-split-view.png`, not the
  landing page. The `### The landing page` entry further down, under `## Screenshots`, is a
  separate, correctly captioned gallery item showing the marketing page itself, not a second hero.
  Briefly swapped that gallery entry to the split-view image by mistake, then reverted it on
  rereading the file top to bottom — the split-view image was already doing the job the reviewer
  recommended, one screen up.

- **BUG-PP16 (P1, FIXED)** — `.claude/skills/lextract-business-context/SKILL.md` and its duplicate
  at `.agents/skills/lextract-business-context/SKILL.md` described the retired v1 stack as live:
  frontend "Deployed on Vercel," backend "Deployed on Railway as 3 services," Supabase listed as
  the database. `portfolio/DEPLOYMENT.md` is the stated authority and says Cloudflare Workers,
  Neon, and no Railway service in production. Added a retired-status banner to both files and
  rewrote the Tech Stack Summary section in both to match `DEPLOYMENT.md` and the repository's own
  `CLAUDE.md`: Cloudflare Worker via OpenNext for the frontend, `workers/api` (Cloudflare Workers,
  Hyperdrive → Neon, R2, Queues, Workflows) as the production backend, and `backend/` (FastAPI /
  Railway) named explicitly as superseded and not deployed. Both copies kept byte-identical.

- **BUG-PP17 (P2, FIXED)** — The two `SKILL.md` copies disagreed with each other: one said
  "$6/lease at volume," the other "$12/lease at 10-pack volume." The same files' own pricing
  tables (10-credit pack, $120 = $12/lease) and `portfolio/PRD.md`'s pricing table agree at
  $12/lease for the 10-pack. `$6/lease` matches no pricing tier anywhere in the repository.
  Corrected the `.claude` copy to `$12/lease at 10-pack volume` to match.

- **BUG-PP18 (P2, FIXED)** — `portfolio/DESIGN_SYSTEM.md:188` described the bare `py-16` spacing
  drift as already replaced ("was `py-16` in several places — replace"), but
  `frontend/app/(marketing)/page.tsx:121,164` and `frontend/app/not-found.tsx:29` still use it.
  Reworded to name the three remaining sites and read as an open item, not a completed one. No
  frontend code touched.

## Open items

- **`portfolio/` is five documents, not fifteen.** That is the honest count of what this
  repository has that was written for a reader. No document was invented to fill out a template.
  The gaps a reader may notice — there is no engineering log of production defects here, and no
  standalone testing write-up — are real gaps, and the README's own "What I would do
  differently" section is where the equivalent honesty currently lives.
- **`portfolio/DESIGN_SYSTEM.md` is the weakest of the five.** It is a decision record from
  2026-03-24 rather than a retrospective, and it opens with an internal project id for an
  external design tool that a reader has no access to. It earns its place because it is the only
  document explaining why the UI looks the way it does, but a reader will notice it is written
  in a different voice from the other four.

### Cycle 8 — 2026-08-18 — Corpus-wide portfolio standard alignment

A separate, corpus-wide effort (`D:\code\PORTFOLIO-STANDARD.md`) standardized heading text and
order, filename casing, fence tagging, alert syntax, wrap column, and image location across all
fifteen snapshots. This cycle applies that spec to Lextract specifically, on top of the Cycles
1–7 work above.

- **`portfolio/DESIGN_SYSTEM.md` → `portfolio/DESIGN.md`, `SECURITY.md` (repo root) →
  `portfolio/SECURITY.md`.** The second move reverses the Cycle 1 decision, which kept
  `SECURITY.md` at the root specifically so GitHub's security-policy affordance would still find
  it. The corpus standard requires every `portfolio/` file to be `UPPERCASE-HYPHENATED.md` inside
  that one directory, no exceptions, and this repo handles lease and payment data, which makes
  `SECURITY.md` conditionally required there. Traded the GitHub affordance for corpus consistency;
  recorded here so nobody rediscovers this as an oversight.
- **`portfolio/PRD.md` split.** At 723 lines it was both the longest file in the fifteen-repo
  corpus and the only one over the 450-line band. Split along its own section numbers: sections
  1–9 (vision, market, stack, schema, pipeline, red flags, export, pricing) stayed in `PRD.md`;
  sections 10–15 (CamAudit funnel, auth/storage schema, API contract, landing page, NFRs,
  verification plan) moved to a new `PRD-APPENDIX.md`, keeping their original numbers so existing
  citations (including the `docs/user-stories/` build tracker's `docs/PRD.md — Section N`
  references, left as historical record) still resolve. No content trimmed.
- **`portfolio/README.md` created** — did not exist before this cycle. Indexes all seven
  documents plus `screenshots/`, states the checkability promise, and names the real gap plainly:
  no `METRICS.md`, `TESTING.md`, or `ENGINEERING-LOG.md` exist here, and none was fabricated to
  fill the folder. Also surfaces `docs/CAMAUDIT_REUSE.md` and `docs/Commercial PM SaaS Research &
  Strategy.md` by name, per the corpus review's instruction to pull durable reasoning out of
  `docs/` into the index even where the file itself stays put.
- **18 untagged fences tagged** (2 in `README.md`, 8 in `ARCHITECTURE.md`, 8 in `PRD.md`) —
  `text` for repo trees and identifier lists, matching the fence's actual content. The endpoint
  lists at `ARCHITECTURE.md` (Auth/Extractions/Payments/User/Webhooks) and the equivalent block
  now in `PRD-APPENDIX.md` §12 were monospace fences reading like tables; both converted to real
  three-column markdown tables. Re-verified after every edit: zero untagged fences remain in
  `README.md` or any `portfolio/` file.
- **Status blockquotes in `ARCHITECTURE.md` and `DEPLOYMENT.md` converted to `> [!IMPORTANT]`**,
  matching the syntax the root README already uses for the same disclosure.
- **README restructured to the corpus heading order.** Added `## If you read one thing` (wrapping
  the existing unheaded triage lines), `## What it did` (new — the repository previously had no
  product-level summary section at all, only the top-of-file pitch), and `## Built with AI
  agents` (new — required by the standard, previously absent). Renamed `## Testing and quality
  gates` → `## Testing`. Slimmed `## Documentation` from a six-row table to two sentences and two
  links, since the file-by-file table now lives exactly once, in `portfolio/README.md` — the
  corpus review's own diagnosis was that two repos printed this table twice and drifted.
  `## What I would do differently` was kept verbatim rather than renamed or duplicated into
  `## Known gaps`: the two headings would cover the same material in this repo, and the corpus
  brief for this repo specifically called this section out as unique in the corpus and genuine.
- **Two claims corrected while restructuring, not before:**
  - The new `## What it did` section's first draft asserted the product "ran in production end
    to end for five months." Nothing in this tree supports a duration — there is no launch date,
    only a 2026-03-03–2026-08-07 *development* commit range. Rewritten to state what survives
    (the code changed backends, then the product was retired) without inventing a runtime.
  - The same draft called CamAudit "a second, unretired product." Checked against
    `cam-reconciliation-saas-capveri-snapshot/README.md` directly: its own status line reads
    "**Status: sunset.** The hosted services are gone." CamAudit is retired too. Corrected before
    this ever reached the file for real.
- **Screenshots.** Moved the 12 images actually referenced from `README.md`
  (`docs/screenshots/*.png`) to `portfolio/screenshots/`, updating all 12 references. Left
  `docs/screenshots/profile-settings.png` (never referenced, previously reviewed and rejected as
  a promotion candidate — see Cycle 4/BUG-PP09 above) and all of `docs/audit/` and
  `docs/getting-badges/assets/` (working evidence, cited from their own working docs) in `docs/`.
  Updated the `.gitignore` comment describing the curated-vs-archive split to match.
- **Prose reflowed to 100 columns** across `README.md` and every `portfolio/*.md` file, using a
  script that protects inline code spans, markdown links, and bare URLs from being split mid-token
  before wrapping. Verified mechanically, not by eye: extracted every fenced code block, every
  table row, and every link target from each file before and after, and confirmed byte-for-byte
  equality on all three. README's prose p90 line length dropped from 284 to 99.
- **`scripts/repo-metrics.py --inject` re-run** after the doc-count changed (two new tracked
  files: `portfolio/README.md`, `portfolio/PRD-APPENDIX.md`). Docs & content moved from 318 files
  / 53,840 lines to 320 / 54,229 — `--check` now passes; it did not before this cycle's edits.
- **Reviewed `docs/` for prunable junk and found none beyond what Cycles 1–7 already handled.**
  One byte-identical duplicate pair noted, not removed: `docs/audit/home-d-00.png` and
  `docs/audit/01-home-desktop-light.png`. The latter is referenced by two `getting-badges` docs;
  the former is frame zero of an 11-frame sequential scroll capture (`home-d-00` through
  `home-d-10`) that `docs/audit/REPORT.md` cites by several of its other frame numbers. Removing
  frame zero would leave a numbered sequence with a hole in it for a marginal-at-best gain, so it
  stays.
- **`git mv` used for the first three structural moves in this cycle** (the two renames above,
  the PRD split's new file). Corrected mid-cycle to plain filesystem moves for the remainder —
  staging and committing is the orchestrator's step, not an agent's, in this track.

### Cycle 9 — 2026-08-18 — `METRICS.md`, `TESTING.md`, `ENGINEERING-LOG.md`, and a reversal

The end of Cycle 8's "What is not here" paragraph concluded that `METRICS.md`, `TESTING.md`, and
`ENGINEERING-LOG.md` had no evidence behind them and should not be fabricated. **That conclusion
was wrong and is reversed in this cycle.** The evidence was already sitting in the tree: the code
and schema figures were already machine-generated by `scripts/repo-metrics.py`; the test
configuration (`backend/conftest.py`, `backend/tests/conftest.py`, four `vitest.config.ts` files,
two Python `pyproject.toml` files) and, most notably, the 703-line `ground_truth.py`
extraction-accuracy harness under `backend/tests/e2e/` were already committed; and the dated bug
reports, audit runs, and plans an engineering log draws from were already in `docs/`. Writing the
three documents was a matter of reading and citing what existed, not inventing anything.

- **`portfolio/USER_FLOWS.md` → `portfolio/USER-FLOWS.md`.** The last casing violation in the
  corpus. Every reference to the portfolio path was updated: `AGENTS.md`, `CLAUDE.md`,
  `portfolio/ARCHITECTURE.md`, `portfolio/README.md`, root `README.md`, and
  `docs/user-stories/MASTER_PLAN.md`'s reference-documents link. Left alone, deliberately:
  `docs/plans/2026-03-03-architecture-docs.md` and `docs/plans/2026-03-03-architecture-design.md`,
  which quote the file under its original pre-move `docs/USER_FLOWS.md` path as literal planned
  content (the same precedent Cycle 2 already set for `docs/ARCHITECTURE.md`), and the ~20
  `docs/user-stories/phase-*/US-*.md` story files, which cite the same original pre-move path in
  backticked prose, not as links — an inconsistency that predates this cycle and is a different,
  larger problem (the whole `docs/` prefix, not the casing) than the one this cycle was scoped to
  fix. `portfolio/ARCHITECTURE.md`'s own repo-layout tree fence still shows a `docs/USER_FLOWS.md`
  entry from the original pre-move design; that tree is already stale in other ways (it predates
  the whole `portfolio/` split) and fixing it fully is out of this cycle's scope.
- **`portfolio/METRICS.md` created (159 lines).** Every figure pairs with the command that
  produces it. Documents the two honest test-file counting rules side by side — 347 (the script's
  own directory-inclusive pattern) and 328 (a stricter filename-only pattern) — rather than
  picking one. Both are reproducible with plain `grep` against `git ls-files`, no `rg` required.
- **`portfolio/TESTING.md` created (242 lines).** Opens `backend/tests/e2e/ground_truth.py`
  directly: a `Matcher` hierarchy (`Contains`, `Equals`, `WithinPct`, `IsTruthy`, `AnyOf`) checked
  against 20 of 22 real SEC EDGAR lease fixtures (2 excluded, with the file's own reasoning
  quoted). The load-bearing finding, not previously written down anywhere: this harness measures
  `backend/`'s retired Python orchestrator (`test_multi_lease.py` imports
  `app.tasks.extraction.run_gemini_extraction_task`), not `packages/extract-core`'s TypeScript one
  that was actually serving requests when the product retired — `grep -rl
  "ground_truth\|LeaseCase" packages/extract-core/ workers/api/` returns nothing. It also cannot
  run without a real `OPENROUTER_API_KEY` and an external `LEXTRACT_E2E_PDF_DIR` not shipped in
  this repository, and `backend/pyproject.toml`'s `norecursedirs = ["tests/e2e"]` keeps it out of
  the default `pytest` / coverage-gated run entirely. Separately notes that
  `frontend/vitest.config.ts` sets `perFile: false` and excludes `app/**` from coverage
  collection — a narrower gate than `CLAUDE.md`'s stated "95% on every file you touch" policy.
- **`portfolio/ENGINEERING-LOG.md` created (282 lines).** Twelve dated entries, 2026-03-03 through
  2026-06-12, each cited to a specific `docs/` file: the March auth-401 bug and its actual root
  cause (a 5-minute Neon Auth session cache, found two days later in a different report — the two
  reports were read together specifically to catch that the initial fix attempt was a workaround,
  not the fix), the same-day accessibility audit-and-reverify in `docs/audit/REPORT.md` (13/20 →
  0 axe violations, same day), the CRO plan forced by a 9%→20% conversion target, the PDF-export
  bug fixed with an authenticated download endpoint, and the Cloudflare rewrite's own stated
  forcing reason — "Eliminate the Railway bill" is the plan's literal Goal line, not an inference.
  One entry is explicitly dated "Undated" rather than guessed, per this document's own rule.
- **`portfolio/PRD.md` §4.2 fixed, not just flagged.** The category table summed to 99 fields
  across 14 rows against a verified 126/16 headline everywhere else. Recomputed directly from
  `docs/lextract_field_schema.json` (126 entries, one `category` per entry): the table was missing
  two whole categories (`Casualty, Condemnation & Force Majeure`, 5 fields; `ASC 842 / IFRS 16
  Compliance`, 8 fields) and undercounted two more (`Rent & Escalations` 8→13, `Options` 7→12).
  Corrected to 126/44/19 across 16 rows and left a `[!NOTE]` in place explaining exactly what was
  wrong and how it was recomputed, rather than silently overwriting a number a future reader might
  have cited from the old table.
- **`portfolio/README.md` updated.** All four new/renamed files added to the index table. The
  Cycle 8 "What is not here" paragraph's false claim — that no evidence existed for the three new
  documents — replaced with a short paragraph stating plainly that the claim was wrong and citing
  what the evidence actually was.
- **A tooling limitation found and worked around, not hidden.** `scripts/repo-metrics.py` counts
  via `git ls-files`, which reflects the index, not the working tree. This repository's single
  commit already lagged a substantial amount of Cycle 8's own work before this cycle started —
  `portfolio/README.md` itself was never staged — and this cycle's renames and new files are
  staged by nobody yet, since staging is the orchestrator's step. Running the script mid-cycle
  therefore undercounts real files and, worse, silently counts `portfolio/USER_FLOWS.md` (deleted
  from disk by the rename) as a zero-line file rather than as gone. The code and schema figures
  are unaffected — `collect_schema()` reads `docs/lextract_field_schema.json` straight off disk,
  and no source-code directory changed — but the "Docs & content" row is not reliable until
  everything in this cycle is staged. Worked around by computing the docs count directly from the
  working tree with a plain filesystem walk mirroring the script's own file-selection and
  line-counting logic, cross-checked against the known set of added/renamed/removed `.md` files
  for consistency, and used that verified number in both `README.md`'s injected block and
  `portfolio/METRICS.md` instead of the script's mid-cycle output. Documented in
  `portfolio/METRICS.md` so a reader knows why the number does not match a same-moment
  `python scripts/repo-metrics.py` run against an uncommitted tree, and resolves on its own once
  the orchestrator stages this cycle's changes and the two counting methods converge again.

### Cycle 10 — 2026-08-18 — Reviewer findings, most severe first

A content reviewer and a visual reviewer both passed over the Cycle 9 state independently and
returned nine findings, P0 through P2. Fixed all nine against the actual working tree, not
against `git log`, since this repository's single commit still lags the tree — the standing rule
this ledger has followed since Cycle 6.

- **P0 — README.md's uncorroborated "2,691 tests / 187 files" claim.** That exact figure
  appeared once in the whole tree, with no command and no derivation, next to a "By the numbers"
  table two sections up that already carried the real, sourced figure. Replaced it with **2,282
  tests across 190 files** — the frontend row's own `Tests` and directory-inclusive `Test files`
  columns — and kept the 187-file filename-only count already used elsewhere in the same
  paragraph, with a pointer back to `#by-the-numbers` so the two counting rules stay next to each
  other rather than implying two different test totals. Re-verified against a working-tree walk
  mirroring `scripts/repo-metrics.py`'s own frontend-area logic: 384 source files / 74,571 lines,
  190 test files / 35,463 lines / 2,282 tests, 187 under the filename-only rule — exact match to
  the published table.
- **P1 — no status disclosure in `portfolio/PRD.md`, `PRD-APPENDIX.md`, `DESIGN.md`.** All three
  open in present tense ("Lextract.io is an AI-powered...", "$15 per lease") across 1,077
  combined lines with nothing telling a reader who lands there directly — which `README.md`
  invites, by linking straight into `PRD.md` — that the product is retired. Added the same
  `> [!IMPORTANT]` retired-status banner `ARCHITECTURE.md` and `DEPLOYMENT.md` already open with,
  worded per document, immediately after each file's H1.
- **P1 — `README.md` never linked `portfolio/TESTING.md`.** Every other portfolio document gets
  an inline callout from the root README; this one did not, so a reader who stops at the README
  — the likeliest path — got a detailed, credible-sounding description of the `ground_truth.py`
  accuracy harness with no hint that it measures the retired Python orchestrator rather than the
  TypeScript `packages/extract-core` that was live at retirement, or that it needs a paid
  `OPENROUTER_API_KEY` and an uncommitted external PDF directory to run at all. Added a
  `> [!WARNING]` callout in `## Testing` stating both limits inline and linking
  `portfolio/TESTING.md`.
- **P1 — `portfolio/USER-FLOWS.md:53` said "14-category accordion."** Recounted
  `docs/lextract_field_schema.json` directly (`Counter` over each entry's `category`, the same
  method `portfolio/METRICS.md` and the corrected `portfolio/PRD.md` §4.2 already use): 126
  fields across 16 categories, confirmed. Fixed the line to read "16-category accordion." Left
  the same stale "14 categories" figure alone everywhere it appears under `docs/` (dated
  bug-report and user-story residue, out of this cycle's `portfolio/`-plus-`README.md` scope).
- **P1 — `portfolio/ARCHITECTURE.md:100`'s repo-layout tree still showed `docs/USER_FLOWS.md`,
  `docs/PRD.md`, and `docs/ARCHITECTURE.md`.** All three now live in `portfolio/`, and the
  `USER_FLOWS.md` spelling predates the Cycle 9 rename to `USER-FLOWS.md`. Cycle 9 had already
  flagged this exact tree as stale and scoped it out; this cycle closes it by adding an explicit
  note directly above the fence stating it is a pre-split historical snapshot and naming the
  three files' current `portfolio/` paths, rather than rewriting a tree that documents an earlier
  repo layout throughout, not just at these three lines.
- **P1 — `portfolio/METRICS.md`'s published docs snippet (324 / 55,140) no longer reproduces.**
  Re-ran the exact snippet at lines 143–160 against the current working tree. It now reports
  **324 files, 55,202 lines** before this cycle's own edits are counted (the file total held; the
  line count moved because this cycle added prose — status banners, callouts, a corrected test
  count — across several `portfolio/*.md` files and this ledger entry). Updated both
  `portfolio/METRICS.md` and `README.md`'s injected `<!-- METRICS:START -->` block to the number
  the same snippet reports once every change in this cycle, including this entry, is on disk. See
  the note left in `portfolio/METRICS.md` for the exact figure and the one caveat: editing
  `portfolio/METRICS.md` to record a new number changes that file's own line count by a few
  lines, the same self-reference `scripts/repo-metrics.py` avoids for `README.md` specifically by
  excluding it from the docs count — `portfolio/METRICS.md` has no equivalent exclusion, so this
  entry states the count as of the last edit made in this cycle rather than chasing an exact
  fixpoint over a handful of lines.
- **P1 — `README.md`'s `## Known gaps` heading was spelled `## What I would do differently`.**
  Cycle 8 had deliberately kept that wording, reasoning the two headings would cover the same
  material and that this section was called out as unique and genuine. The corpus standard
  (`D:\code\PORTFOLIO-STANDARD.md` §1.2) requires the exact heading text with no listed exception
  for that reasoning, so this cycle renames it. Prose kept verbatim — nothing under the heading
  changed. Fixed the `## Contents` entry, the `## If you read one thing` inline reference, and
  the one inbound link from `portfolio/ENGINEERING-LOG.md`'s pricing-table entry, which pointed at
  `../README.md#what-i-would-do-differently`.
- **P1 — `README.md`'s hand-timed-versus-published-time paragraph sat between the pitch and the
  `> [!IMPORTANT]` status alert.** The standard requires status immediately after the pitch,
  before anything evaluative. Moved the status alert up two paragraphs so it now directly follows
  the opening pitch; the evaluative paragraph follows the status alert, unchanged.
- **P2 — `portfolio/TESTING.md:138` quoted `ground_truth.py:673–674` with a comma splice** ("...
  lease scope, not a valid extraction accuracy test") where the source comment reads a period and
  a capital letter ("... lease scope.  Not a valid extraction accuracy test."). Confirmed against
  the actual source lines and corrected the quotation to match exactly.

**Link and anchor verification.** Wrote a slugger matching GitHub's actual heading-anchor
algorithm (lowercase, strip everything but word characters/hyphens/spaces, each whitespace
character becomes its own hyphen with no run-collapsing, since two-space runs before an em dash
produce double-hyphen anchors that already exist correctly in `portfolio/ENGINEERING-LOG.md`) and
checked every relative markdown link and same-file `#anchor` in `README.md` and all eleven
`portfolio/*.md` files against the real heading list of its target file, plus every HTML
`<img src>` / `<source srcset>` reference against the filesystem. Two false positives from an
earlier pass of the checker itself (a slugger bug that stripped underscores as if they were
emphasis markers, breaking `#extraction-accuracy-the-ground_truthpy-harness`) were fixed in the
checker, not the documents, once traced to the tool. Final result: zero broken links, zero broken
anchors, zero missing images across all twelve files.

No secret literals were found during this cycle. The placeholders already present
(`pk_live_`/`phc_`/`sk_test_placeholder`/`whsec_placeholder`) were left untouched, per this
project's standing convention.

### Cycle 11 — 2026-08-18 — `portfolio/SECURITY.md` was the wrong kind of document

An independent re-review of Cycle 10's result flagged one more gap: `portfolio/SECURITY.md` was
29 lines, under the standard's 120–450 line band (§2.6, and `SECURITY.md` is not on the METRICS/
SCREENSHOTS exemption list), and more importantly it was a responsible-disclosure notice, not a
security write-up. Lextract ingested customer-uploaded commercial lease PDFs and billed through
Stripe, which puts it in §2.4's mandated category (payments, plus third-party PII inside the
uploaded documents) — a category this document was not actually covering.

Kept everything that was already there (the "do not scan lextract.io" notice, the deliberate-
non-vulnerability list, the Hyperdrive binding ID / Neon Auth hostname / workers.dev subdomain
naming) and added five new sections, each claim opened and cited to the file:line it came from
rather than described from memory:

- **Authentication and session handling.** `workers/api`'s two verification paths — bearer JWT
  against Neon Auth's JWKS (`neon-auth.ts:104-135`) and session cookie forwarded to Neon Auth's
  own `/get-session` (`neon-auth.ts:137-177`) — converge in `getAuthContext`
  (`neon-auth.ts:238-292`) and gate every route through `requireUserAuth`
  (`middleware/auth.ts:31-51`). Named what `scripts/local-auth-stub.mjs` actually replaces and
  confirmed the production guard: `assert-production-wrangler-vars.mjs:37-43` requires
  `NEON_AUTH_BASE_URL` to be `https://` and end in `/auth`, which the stub's documented
  `http://localhost:4000` value cannot satisfy.
- **Tenant isolation.** Every extraction query is scoped by `ownerClause`
  (`repositories/extractions.ts:254-263`), built only from the authenticated context via
  `ownerFromAuth` (`routes/extractions.ts:219-223`) — never from a client-supplied id — and
  `extractions-read.test.ts:297` asserts foreign-owned extractions 404 exactly like missing ones.
  Also found and stated a real nuance: Postgres RLS policies exist in the schema
  (`00002_rls_policies.sql:45-60`) but depend on a `request.jwt.claims` GUC the Neon Data API
  sets per request — `workers/api` never talks to that API, connects through Hyperdrive with one
  pooled connection (`repositories/db.ts`), and sets no such session variable anywhere. RLS is
  real in the schema; it is not what protects tenant data on the path that actually served
  production traffic.
- **Uploaded lease PDFs.** Confirmed storage location and key layout
  (`domain/object-keys.ts:61-69`, `wrangler.jsonc:22-27`), that nothing in the codebase encrypts
  PDF bytes before upload, and — the weakest finding — that deletion is real but retention is
  not. Per-extraction delete (`routes/extractions.ts:756-795, 892-908`) removes the R2 objects
  before soft-deleting the row, and account deletion (`repositories/users.ts:285-315`) cascades
  through a `CLEANUP_QUEUE` consumer (`queues/cleanup-consumer.ts:74-119`) that does the same for
  every extraction. But nothing expires anything automatically: no `scheduled()` handler, no cron
  trigger, no R2 lifecycle rule anywhere in the codebase. A PDF nobody explicitly deletes stays in
  R2 forever. Flagged with a `> [!WARNING]` rather than folded quietly into prose.
- **Payment data.** Verified rather than assumed: `createStripeCheckoutSession`
  (`services/stripe.ts:115-147`) creates a Stripe-hosted Checkout Session, and the frontend does a
  full-page redirect to Stripe's own URL (`hooks/use-payment.ts:38`) — no Stripe Elements, no
  card-input form, confirmed by a search for card/CVV/PAN handling in the payment code that
  returned nothing. Card data never touches this codebase. Webhooks are signature-verified with a
  timing-safe HMAC comparison (`services/stripe.ts:192-222`).
- **Third-party PII in the corpus.** Named `packages/extract-sdk/tests/fixtures/real-leases/`'s
  22 real, SEC-EDGAR-sourced commercial leases by path and by example filename, and stated plainly
  that they carry real company and contact details, retained deliberately as public-record
  material rather than scrubbed.
- **What is not protected**, added as its own section: no third-party audit or certification, no
  application-level rate limiting (verified: no Cloudflare Rate Limiting binding, no throttling
  middleware — the only rate-limit-shaped code recognizes OpenRouter's own error string, not
  Lextract's API), no secret-scanning tool anywhere in the repo or its (nonexistent) CI, and RLS's
  schema-versus-production gap repeated once more for a reader skimming only this list.

`portfolio/SECURITY.md` grew from 29 to 161 lines, back inside the 120–450 band. No section was
padded to clear the floor — every claim above traces to a file:line actually opened during this
cycle, and each citation was independently re-verified against the source after a first drafting
pass caught two off-by-a-few-lines citation errors (a Stripe pricing-table line and an
`assert-production-wrangler-vars.mjs` range) before publication, not after.

Updated `portfolio/README.md`'s index row for `SECURITY.md` to the new length and description,
re-ran the docs line-count snippet (324 files, now 55,424 lines — up from Cycle 10's 55,292 by
exactly `SECURITY.md`'s +132 lines), and updated both `portfolio/METRICS.md` and `README.md`'s
injected block to match. Re-ran the link/anchor checker against all twelve files; zero broken
links or anchors.

**A tooling note, not a repository finding:** the first re-run of the link checker this cycle
returned a suspicious clean result from a script file that, on inspection, had been silently
overwritten with different code targeting an unrelated repository
(`nonprofit-grants-saas-grantpipe-snapshot`) at the same scratchpad path used earlier in this
session — despite the scratchpad being documented as session-isolated. Did not trust that result.
Rewrote the checker fresh with an identity marker, verified the file's own content immediately
before executing it, and only then accepted the result (`NO PROBLEMS FOUND` across all twelve
files). Flagged to the requesting party as an environment observation, not written up as a
Lextract repository issue since it has nothing to do with this codebase.

No secret literals were found or written to this ledger during this cycle.

### Cycle 12 — 2026-08-18 — Corpus-wide index column order, and the snapshot-provenance section rename/move

- The cross-repo standard fixed `portfolio/README.md`'s index table column order as link,
  length, summary. This repo's table had `Document | Covers | Length`, length last —
  reordered to `Document | Length | Covers`; all eleven rows and the alignment row updated.
- Spec item 15a fixes the snapshot-provenance section as `## About this snapshot`, placed
  immediately after `## Documentation` and before `## Built with AI agents`. `README.md` had
  it as `## How this snapshot was built`, sitting between `## Built with AI agents` and
  `## Running it locally`. Renamed and moved the section (prose untouched) to the required
  slot, and reordered its `## Contents` entry to match.
- Found one inbound link to the old anchor: `portfolio/METRICS.md`'s commit-history section
  linked `../README.md#how-this-snapshot-was-built`. Repointed it to
  `../README.md#about-this-snapshot` and updated the link text to match the new heading.
- Recomputed every length cell against `wc -l` after all edits: all eleven rows match exactly.
- Ran a relative-link and `#anchor` resolution sweep over `README.md` and every
  `portfolio/*.md` file, using GitHub's slug rules: all resolve, including the repointed
  anchor.

### Cycle 13 — 2026-08-18 — Six-column numbers table (standard §3.3)

`README.md` and `portfolio/METRICS.md` both carried the same six-column table
(`Area | Source files | Source lines | Test files | Test lines | Tests`), over the five-column
ceiling in §3.3. Folded to four columns by pairing the naturally-related counts:
`Source files / lines` and `Test files / lines`, following the precedent grantpipe set with
`Functions / Branches` and phiguard with `Test files / cases`.

Presentation only — no figure was recomputed. All 36 numbers were verified present after the
change, individually, rather than by eyeballing the table.

A note on the reason, so it is not mis-recorded: a reviewer had reported wide tables as "columns
lost off-screen, outright data loss" at 375px. That was an artifact of judging a static screenshot.
GitHub renders tables in a horizontally scrollable block, and the render harness uses the same rule
(`table { display:block; width:max-content; max-width:100%; overflow:auto; }`), so nothing was ever
unreachable. The justification for this change is the §3.3 column ceiling and mobile comfort — not
data loss.
