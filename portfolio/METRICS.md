# Metrics

Every number below carries the command that produces it. That is the whole point of this file:
none of it should be read as an assertion; each line is reproducible against this tree.
[`scripts/repo-metrics.py`](../scripts/repo-metrics.py) counts only git-tracked files, so build
output, dependencies, and ignored scratch files can never inflate a total. Run it yourself:

```bash
python scripts/repo-metrics.py         # markdown report, same table as below plus commit history
python scripts/repo-metrics.py --json  # machine-readable
python scripts/repo-metrics.py --check # exit 1 if README.md's injected block has drifted
```

## Contents

- [Code and tests](#code-and-tests)
- [How many test files: the counting rule matters](#how-many-test-files-the-counting-rule-matters)
- [Extraction schema](#extraction-schema)
- [Docs and content](#docs-and-content)
- [Commit history](#commit-history)
- [What each number's command actually is](#what-each-numbers-command-actually-is)

---

## Code and tests

```bash
python scripts/repo-metrics.py
```

### Code

| Area | Source files / lines | Test files / lines | Tests |
| --- | ---: | ---: | ---: |
| Frontend (Next.js) | 384 / 74,571 | 190 / 35,463 | 2,282 |
| Cloudflare Workers | 43 / 8,390 | 28 / 9,195 | 261 |
| extract-core (TypeScript) | 13 / 1,482 | 7 / 1,304 | 52 |
| extract-sdk (Python, v1) | 27 / 6,823 | 26 / 10,040 | 673 |
| Backend (FastAPI, v1) | 77 / 13,725 | 94 / 34,221 | 1,463 |
| SQL migrations | 23 / 1,170 | 2 / 861 | 0 |
| **Total code** | **567 / 106,161** | **347 / 91,084** | **4,731** |
| Docs & content (md/mdx) | 324 / 55,529 | n/a | n/a |
| Other tracked code (tooling, vendored) | 8 / 3,046 | n/a | n/a |

### Extraction schema

- **126 fields** across **16 categories**
- 44 required, 19 CAM-relevant

The table above is the same one injected into the root README between its own
`<!-- METRICS:START -->` / `<!-- METRICS:END -->` markers: one source, two places it renders.
`python scripts/repo-metrics.py --check` exits non-zero if the README's copy ever drifts from
what the script now produces. Every row except **Docs & content** is exactly what
`python scripts/repo-metrics.py` prints when you run it; see
[Docs and content](#docs-and-content) below for why that one row needed a different, still fully
reproducible, method this cycle.

**Test counts are static declaration counts, not run-time counts.** Parameterized cases (`it.each`
in TypeScript, `@pytest.mark.parametrize` in Python) count once in the table above but expand when
the suite actually runs: `packages/extract-core` declares 52 tests and executes 68. See
[TESTING.md](TESTING.md) for the full breakdown of what each suite's gate actually enforces.

---

## How many test files: the counting rule matters

The **347** figure in the table above comes from a path pattern
(`scripts/repo-metrics.py`'s `TEST_PATH_RE`) that matches two different things at once: a file
sitting inside a `tests/`, `test/`, or `__tests__/` directory (which also catches `conftest.py`,
`__init__.py`, and non-test helper modules living in that directory), and a file whose own name
matches `test_*.py` or `*.test.ts`/`*.test.tsx`/`*.test.js`/`*.test.jsx`, wherever it lives. A
stricter rule that only counts a file if its own name says it is a test gives **328**:

```text
git ls-files | grep -E '\.(py|ts|tsx|js|jsx|mjs|sql)$' \
  | grep -E '(^|/)test_[^/]+\.py$|\.test\.[jt]sx?$' | wc -l
```

versus the 347-figure rule:

```text
git ls-files | grep -E '\.(py|ts|tsx|js|jsx|mjs|sql)$' \
  | grep -E '(^|/)(tests?|__tests__)(/|$)|\.test\.[jt]sx?$|(^|/)test_[^/]+\.py$' | wc -l
```

Applied to the frontend area alone, this is the same gap the root README calls out directly at
[By the numbers](../README.md#by-the-numbers): 190 files under the directory-inclusive rule, 187
under the filename-only rule. Neither number is more correct than the other: one answers "how
many files live in a test directory," the other answers "how many files are themselves named as a
test," so this document states both rather than picking one. [TESTING.md](TESTING.md) breaks the
19-file, whole-repo gap down by area.

---

## Extraction schema

```bash
python -c "
import json
from collections import Counter
d = json.load(open('docs/lextract_field_schema.json', encoding='utf-8'))
c = Counter(f.get('category') for f in d)
print(len(d), 'fields,', len(c), 'categories')
print(sum(1 for f in d if f.get('required')), 'required')
print(sum(1 for f in d if f.get('cam_relevant')), 'CAM-relevant')
"
```

This reads `docs/lextract_field_schema.json` directly and produces `126 fields, 16 categories`,
`44 required`, `19 CAM-relevant`: the same four numbers `scripts/repo-metrics.py` reports under
`collect_schema()`, and the same numbers `portfolio/PRD.md` §4.1 states in prose. §4.2 of that
same document (the per-category breakdown table) had drifted from this schema file (it summed
to 99 fields across 14 rows, missing two whole categories); it was corrected against this command's
output rather than left standing next to a contradicting headline figure. See `portfolio/PRD.md`
§4.2 for the corrected table and the note explaining the correction.

---

## Docs and content

`scripts/repo-metrics.py` counts every git-tracked `.md`/`.mdx` file except `README.md` itself,
excluded specifically so injecting this block does not change the count it just wrote, which would
mean `--inject` never reaches a fixpoint. Normally that command is:

```bash
python scripts/repo-metrics.py --json | python -c "import json,sys; d=json.load(sys.stdin); print(d['docs'])"
```

**This one row needed a different method during the cycle that added this file.** The script's
file list comes from `git ls-files`, which reflects what is staged, not what is on disk. This
repository's single commit had not yet caught up with several files a prior cycle had already
written on disk (`portfolio/README.md` among them) before this cycle started, and this cycle
added and renamed further files (`portfolio/METRICS.md`, `TESTING.md`, `ENGINEERING-LOG.md`,
and the `USER_FLOWS.md` → `USER-FLOWS.md` rename) that were staged by nobody yet either, since
staging and committing is the orchestrator's step, not an agent's, in this repository's workflow.
Run mid-cycle, `python scripts/repo-metrics.py --json` would have both undercounted the real
file total and, worse, silently counted the pre-rename `portfolio/USER_FLOWS.md` path as a
zero-line file (it still exists in the git index, but the rename deleted it from disk, and the
script's line counter treats a missing file as 0 lines rather than as gone) instead of reporting
it as removed. The 324 / 55,529 figures above were instead produced by walking the actual working
tree with the same file-selection and line-counting rules the script itself uses:

```bash
python -c "
from pathlib import Path
root = Path('.')
skip = {'.git', 'node_modules', '.next', '.open-next', '.wrangler', '.worktrees', 'coverage', '__pycache__', '.venv', 'venv'}
def count_lines(p):
    data = p.read_bytes()
    if not data:
        return 0
    n = data.count(b'\n')
    return n if data.endswith(b'\n') else n + 1
files = [p for p in root.rglob('*') if p.is_file()
         and not any(part in skip for part in p.parts)
         and p.suffix.lower() in ('.md', '.mdx')
         and p.relative_to(root).as_posix() != 'README.md']
print(len(files), sum(count_lines(f) for f in files))
"
```

This is not a permanent divergence from the script: once this cycle's renames and new files are
staged, `git ls-files` and the working tree agree again, `python scripts/repo-metrics.py --json`
reproduces the same 324 / 55,529 pair directly, and `--check` passes against the root README's
injected block without the workaround above. `portfolio/` holds 11 markdown files as of this
writing (`ARCHITECTURE.md`, `DEPLOYMENT.md`, `DESIGN.md`, `ENGINEERING-LOG.md`, `METRICS.md`,
`PRD.md`, `PRD-APPENDIX.md`, `README.md`, `SECURITY.md`, `TESTING.md`, `USER-FLOWS.md`); the rest
of the total lives in `docs/`, which is larger because it holds the dated working residue
`portfolio/` deliberately excludes: bug reports, audit runs, plans, and the field schema JSON
itself.

---

## Commit history

The root README's [By the numbers](../README.md#by-the-numbers) section states commit-history
figures (1,252 commits, 201 merges, a `fix`/`chore`/`feat`/`docs`/`test`/`refactor` breakdown) as
prose rather than injecting them here. That is deliberate, not an oversight: this repository is a
single-commit snapshot (see the root README's [About this
snapshot](../README.md#about-this-snapshot)), so `git log` inside this tree has nothing to
count. `scripts/repo-metrics.py`'s own `collect_git()` function returns `None` whenever the commit
count is 1 or fewer, specifically to avoid reporting an artifact of how the snapshot was made as if
it were a measurement. The 1,252-commit figure was measured from the private development
repository on 2026-08-07 and is stated here as attributed history, not as something this
repository's own `git log` can reproduce.

---

## What each number's command actually is

| Number | What it measures | Command |
| --- | --- | --- |
| 567 source files / 106,161 lines | All non-test, non-doc tracked code | `python scripts/repo-metrics.py` |
| 347 test files / 91,084 lines / 4,731 tests | Directory-inclusive test count (see above) | `python scripts/repo-metrics.py` |
| 328 test files | Filename-only test count | `git ls-files \| grep -E '\.(py\|ts\|tsx\|js\|jsx\|mjs\|sql)$' \| grep -E '(^\|/)test_[^/]+\.py$\|\.test\.[jt]sx?$' \| wc -l` |
| 126 fields / 16 categories | Extraction schema breadth | `python -c "..."` against `docs/lextract_field_schema.json`, [above](#extraction-schema) |
| 44 required / 19 CAM-relevant | Schema field flags | Same command as above |
| 324 docs files / 55,529 lines | Every `.md`/`.mdx` except `README.md` | `python scripts/repo-metrics.py --json`, or the working-tree walk [above](#docs-and-content) if run before this cycle's changes are staged |
| 1,252 commits, 201 merges | Private development history, not this snapshot | Stated as measured 2026-08-07; not reproducible from this tree |
| 618 public routes | Screenshot sweep coverage | `frontend/scripts/capture-archive.mjs`, per the root README's [Screenshots](../README.md#screenshots) section |
