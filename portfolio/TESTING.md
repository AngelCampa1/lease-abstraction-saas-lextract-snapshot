# Testing

This is the write-up the root README's [Testing](../README.md#testing) section points at. Every
number here is reproducible against this tree: the commands are given, not just the results.

## Contents

- [Suites and gates](#suites-and-gates)
- [How many test files: two honest counts](#how-many-test-files-two-honest-counts)
- [The bug-pinning convention](#the-bug-pinning-convention)
- [Extraction accuracy: the `ground_truth.py` harness](#extraction-accuracy-the-ground_truthpy-harness)
- [Python versus TypeScript, and what the migration did to testing](#python-versus-typescript-and-what-the-migration-did-to-testing)
- [Known limits](#known-limits)

---

## Suites and gates

| Suite | Command | Config | Gate |
| --- | --- | --- | --- |
| Backend (Python, v1) | `cd backend && python -m pytest` | `backend/pyproject.toml` | `--cov-fail-under=95`, branch coverage |
| Extract SDK (Python, v1) | `cd packages/extract-sdk && python -m pytest` | `packages/extract-sdk/pyproject.toml` | `--cov-fail-under=95`, branch coverage |
| Frontend (TypeScript) | `cd frontend && npx vitest run --coverage` | `frontend/vitest.config.ts` | lines 88 / functions 80 / branches 80.3 / statements 85.6, aggregate |
| extract-core (TypeScript) | `cd packages/extract-core && npm run test:coverage` | `packages/extract-core/vitest.config.ts` | coverage reported, no threshold configured |
| API Worker (TypeScript) | `cd workers/api && npm run check` | `workers/api/vitest.config.ts` | typecheck + `wrangler deploy --dry-run`; coverage reported, no threshold configured |

The two Python suites each carry their own `pytest.ini_options` block with `addopts =
["--cov=...", "--cov-report=term-missing", "--cov-fail-under=95"]`, so a suite that drops under
95% branch coverage fails the run itself, not a separate CI step: there is no CI in this
repository (see [Known limits](#known-limits)). `backend/conftest.py` puts `backend/` on
`sys.path` so `import app` resolves from `tests/`; `backend/tests/conftest.py` sets test-only env
vars (including the placeholder `sk_test_placeholder` and `whsec_placeholder` Stripe keys) before
the app is imported, and resets the rate limiter and cached Neon client between tests via
autouse fixtures.

`frontend/vitest.config.ts` sets `thresholds: { perFile: false, ... }`: the 88/80/80.3/85.6
numbers are aggregate across the whole suite, not enforced per file. Its `coverage.exclude` list
also drops `app/**` (the Next.js route tree) from collection entirely, along with `components/
ui/**` and `components/providers.tsx`. That is a narrower gate than `CLAUDE.md`'s stated policy
of "95% code coverage minimum on every file you touch. Not the repo average: each individual
file." The policy document and the tool that would enforce it disagree, and the tool is what
actually ran. Neither `packages/extract-core/vitest.config.ts` nor `workers/api/vitest.config.ts`
sets a `thresholds` block at all; both report coverage without failing the build on it, which is
why the root README's suite table already says "coverage is reported, not enforced" for the API
Worker.

Also enforced, per `backend/pyproject.toml` and `packages/extract-sdk/pyproject.toml`: `mypy`
strict on both Python packages, and `ruff`/`black` with the same rule set (`E, F, I, N, W, UP`)
in both. TypeScript strict with no `any` is a `frontend/tsconfig.json` / `workers/api/tsconfig.json`
setting, checked by `npx tsc --noEmit` in each package.

---

## How many test files: two honest counts

`scripts/repo-metrics.py` reports **347** test files in [By the
numbers](../README.md#by-the-numbers). That number comes from a path pattern that matches two
different things: a file sitting inside a `tests/`, `test/`, or `__tests__/` directory (which
catches `conftest.py`, `__init__.py`, and `backend/tests/e2e/ground_truth.py` itself, none of
which are test files by name), and a file whose own name matches `test_*.py` or `*.test.ts` /
`*.test.tsx` / `*.test.js` / `*.test.jsx`, wherever it lives.

Reproduce it:

```text
git ls-files | grep -E '\.(py|ts|tsx|js|jsx|mjs|sql)$' \
  | grep -E '(^|/)(tests?|__tests__)(/|$)|\.test\.[jt]sx?$|(^|/)test_[^/]+\.py$' | wc -l
```

A stricter rule (the file must itself be named as a test, not merely live in a test directory)
gives **328**:

```text
git ls-files | grep -E '\.(py|ts|tsx|js|jsx|mjs|sql)$' \
  | grep -E '(^|/)test_[^/]+\.py$|\.test\.[jt]sx?$' | wc -l
```

The 19-file gap is entirely non-test support code sitting inside test directories: `conftest.py`
files, `__init__.py` package markers, `ground_truth.py`, fixture and helper modules. Per area, the
split is:

| Area | Directory-inclusive (347 total) | Filename-only (328 total) |
| --- | ---: | ---: |
| Frontend | 190 | 187 |
| Cloudflare Workers | 28 | 26 |
| extract-core | 7 | 7 |
| extract-sdk (Python, v1) | 26 | 24 |
| Backend (Python, v1) | 94 | 84 |
| SQL migrations | 2 | 0 |

The 190/187 frontend split is the one the root README calls out directly at [By the
numbers](../README.md#by-the-numbers); the same counting rule applies everywhere else too. Neither
number is more "correct" than the other: they answer different questions, "how many files does a
reader open to find a test" versus "how many files live in the test tree," and this document uses
both rather than picking one and hiding the other.

---

## The bug-pinning convention

A large share of the Python test files exist to pin one specific bug that was found once, with a
name that says what it protects against rather than what it tests in the abstract:
`backend/tests/test_field_editor_cas_bug.py` and
`backend/tests/integration/test_credit_race_conditions.py` are two examples already named in the
root README. Reading `test_field_editor_cas_bug.py` directly: its module docstring is "Test for
Bug #3: Field editor `red_flags` update lacks CAS protection," and the test asserts that the
`red_flags` write carries the same `updated_at` compare-and-swap guard the `extracted_data` write
already had: a concurrent edit could otherwise leave the two fields out of sync. Neither file
carries a date, so the bug that prompted it cannot be placed on the [engineering
log](ENGINEERING-LOG.md) with a real date; the convention itself (write the regression test,
name it after the bug, keep it forever) is the evidence, not a specific incident.

---

## Extraction accuracy: the `ground_truth.py` harness

`backend/tests/e2e/ground_truth.py` (703 lines) is the most interesting file in the test suite,
because for a product whose entire value proposition is "these 126 fields are correct," a coverage
percentage says nothing about whether the extracted values are actually right. This file is the
one place in the repository that measures that directly.

**The `Matcher` hierarchy.** An abstract `Matcher` base class defines `check(value)` and
`describe()`; five concrete matchers implement it: `Contains` (case-insensitive substring),
`Equals` (exact), `WithinPct(expected, pct)` (numeric tolerance), `IsTruthy`, and `AnyOf` (any one
of several matchers passes). This exists because an LLM answering "what is the lease structure"
might correctly say "Triple Net," "NNN," or "net" for the same lease, and a naive `==` assertion
would fail all three interchangeably-correct answers. `WithinPct` does the same job for numbers:
a base rent computed from a per-square-foot rate can land a few dollars off a hand-checked figure
without being wrong.

**The fixture corpus.** 22 real commercial leases pulled from public SEC EDGAR filings live as
`.htm` source documents under `packages/extract-sdk/tests/fixtures/real-leases/`. 20 of the 22 have
a `LeaseCase` defined in `ground_truth.py`, each with a `ground_truth` dict checked field by field
against the source lease, mapping field names to matchers: for example,
`LEASE_06_WAREHOUSE_NORTHANN` asserts
`rentable_square_footage: WithinPct(106610, 5)` and `pro_rata_share: WithinPct(0.4824, 5)` against
a real 106,610 rsf industrial lease. The two excluded fixtures are named and reasoned about in a
comment rather than silently dropped: lease 08 is Belgian, EUR-denominated, and measured in square
meters: "outside the pipeline's US commercial lease scope. Not a valid extraction accuracy test.";
and lease 14 is an Agreement of Sale with blank lease templates as exhibits, including a
literally blank landlord name, so there is no single correct answer to check against.

**How a run actually checks a lease.** `validate_ground_truth()` takes the extracted-field dict and
a `LeaseCase`, and for every field the case defines a matcher for, pulls the field's `value` out of
the `{"value": ..., "source": ...}` structure the pipeline returns and calls `matcher.check(value)`
on it. A missing field and a wrong field are reported differently: `MISSING (expected ...)`
versus `FAIL — got ... expected ...`, so a failure report says whether the pipeline found
nothing or found the wrong thing.

`backend/tests/e2e/test_multi_lease.py` is what actually drives this: one
`@pytest.mark.parametrize` test per `LeaseCase`, running the real 3-stage pipeline
(`run_gemini_extraction_task → score_confidence_task → run_red_flags_task`) against a real lease
PDF, then calling `validate_ground_truth()` on whatever came back. Only the
`ObjectStorageService.download_file` boundary is mocked, to serve the fixture bytes instead of a
real R2 download: the OpenRouter call, the orchestrator, the scoring, and the red-flag detection
all run for real. A basic completeness floor also applies regardless of the ground-truth matchers:
`len(extracted_data) >= 20`.

**Why this cannot just be run.** The test module is marked `pytest.mark.e2e` and skipped unless
both `OPENROUTER_API_KEY` and `LEXTRACT_E2E_PDF_DIR` are set in the environment: a real API key
that spends real money per lease, and a directory of PDF fixtures that **is not checked into this
repository**. The module's own docstring explains why the checked-in `.htm` fixtures cannot
substitute: "the new PDF-native pipeline downloads PDF bytes from R2 and feeds them to
`MultiPassOrchestrator`; the legacy HTML fixtures are not consumable." `backend/pyproject.toml`
also sets `norecursedirs = ["tests/e2e"]`, so a plain `python -m pytest` run (the one in the
[suites table](#suites-and-gates) above, the one the 95% coverage gate applies to) never collects
this harness at all. Running it is a deliberate, separate, paid action, not something that happens
by default.

**The harness measures the retired backend, not the shipped one.** `test_multi_lease.py` imports
`run_gemini_extraction_task` from `app.tasks.extraction`: that is `backend/`, the Python/Celery/
Railway stack superseded on 2026-06-12 (see the root README's [the
rewrite](../README.md#the-rewrite-python-to-cloudflare-native-and-what-it-cost)). There is no
equivalent harness anywhere under `packages/extract-core/` or `workers/api/`: `grep -rl
"ground_truth\|LeaseCase" packages/extract-core/ workers/api/` returns nothing. The TypeScript
orchestrator that was actually running in production when Lextract retired has seven unit-level
test files (`orchestrator.test.ts`, `confidence.test.ts`, `red-flags.test.ts`,
`response-parser.test.ts`, `prompt-builder.test.ts`, `openrouter-client.test.ts`, `schema.test.ts`)
that exercise the pass-merge, escalation, and scoring logic against mocked model responses, but
nothing that checks its output against a real lease and a hand-verified answer the way
`ground_truth.py` does for the Python version. This is a real gap, not a close call, and it is
covered again under [Known limits](#known-limits).

---

## Python versus TypeScript, and what the migration did to testing

The root README states 2,136 Python tests at [the
rewrite](../README.md#the-rewrite-python-to-cloudflare-native-and-what-it-cost). That figure is
`backend/` (1,463 tests, per [By the numbers](../README.md#by-the-numbers)) plus `packages/
extract-sdk/` (673 tests), both parts of the v1 stack, neither deployed after 2026-06-12.

The TypeScript stack that actually ran in production carries 2,595 tests: frontend (2,282),
`workers/api` (261), and `packages/extract-core` (52). That is more tests than the retired Python
stack, but only barely, and the comparison understates how lopsided the *kind* of testing is. The
Python suite includes the one file that checks extraction accuracy against real, hand-verified
lease data (`ground_truth.py`, above). The TypeScript suite that replaced it (the one that was
live when the product retired) has no equivalent. The migration ported the orchestration logic
and kept its unit tests current, but did not carry the accuracy harness across, and nothing in this
repository built a new one for the pipeline that shipped.

Reproduce the split:

```text
python scripts/repo-metrics.py --json | python -c \
  "import json,sys; d=json.load(sys.stdin); \
  py=[a for a in d['areas'] if 'Python' in a['label']]; \
  ts=[a for a in d['areas'] if a not in py and a['label']!='SQL migrations']; \
  print('python tests:', sum(a['tests']['count'] for a in py)); \
  print('typescript tests:', sum(a['tests']['count'] for a in ts))"
```

---

## Known limits

- **No CI.** Every gate in the [suites table](#suites-and-gates) ran on one machine, locally.
  There is no GitHub Actions workflow in this repository, so none of these numbers are
  independently re-verified on every change the way a badge would imply.
- **The accuracy harness targets the wrong stack.** `ground_truth.py` and `test_multi_lease.py`
  exercise `backend/`'s Python orchestrator, not `packages/extract-core`'s TypeScript one, which
  is what was actually serving requests when the product retired. See [above](#extraction-accuracy-the-ground_truthpy-harness).
- **The accuracy harness cannot run out of the box.** It needs a real `OPENROUTER_API_KEY` (real
  spend) and a `LEXTRACT_E2E_PDF_DIR` of lease PDFs not part of this repository: only the source
  `.htm` documents are checked in, and the harness's own docstring says those are not consumable
  by the current, PDF-native pipeline.
- **Frontend coverage is aggregate, not per-file, and excludes the route tree.**
  `frontend/vitest.config.ts` sets `perFile: false` and drops `app/**` from collection, which is a
  narrower gate than `CLAUDE.md`'s stated "95% coverage on every file you touch" policy. The
  configured tool is the one that actually ran.
- **`extract-core` and `workers/api` enforce no coverage threshold at all.** Both report a number;
  neither fails a build on it. The `workers/api` `check` script still gates on typecheck and a
  `wrangler deploy --dry-run`, which catches a real class of deploy-time failure, just not a
  coverage regression.
- **Test counts are static declaration counts.** Parameterized cases (`it.each` in TypeScript,
  `@pytest.mark.parametrize` in Python) count once in every number on this page, but expand at
  run time: `packages/extract-core` reports 52 tests here and executes 68, per the root README's
  [By the numbers](../README.md#by-the-numbers) footnote. `packages/extract-core/tests/` uses
  `it.each` four times.
- **Bug-pinning tests are undated.** `test_field_editor_cas_bug.py` and
  `test_credit_race_conditions.py` document real, specific bugs, but neither the file nor any
  companion note records when the bug was found, so they cannot be placed on the [engineering
  log](ENGINEERING-LOG.md) with an actual date.
