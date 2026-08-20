#!/usr/bin/env python3
"""Generate the repository metrics reported in README.md.

Every number in the README comes from this script, so the claims stay
reproducible instead of asserted. Only tracked files are counted -- the source
of truth is ``git ls-files``, which means build output, dependencies and
ignored scratch files can never inflate a total.

Usage::

    python scripts/repo-metrics.py              # print the markdown report
    python scripts/repo-metrics.py --inject     # rewrite the block in README.md
    python scripts/repo-metrics.py --check      # exit 1 if README.md is stale
    python scripts/repo-metrics.py --json       # machine-readable

No third-party dependencies. Run from anywhere inside the repository.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from collections import Counter
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path

# --------------------------------------------------------------------------
# git helpers
# --------------------------------------------------------------------------


def repo_root() -> Path:
    out = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"],
        capture_output=True,
        text=True,
        check=True,
    )
    return Path(out.stdout.strip())


def tracked_files(root: Path) -> list[str]:
    out = subprocess.run(
        ["git", "ls-files", "-z"],
        capture_output=True,
        check=True,
        cwd=root,
    )
    return [p for p in out.stdout.decode("utf-8", "replace").split("\0") if p]


def git_lines(root: Path, *args: str) -> list[str]:
    # No check=True: `git log` exits 128 on a repository with no commits, and a
    # metrics script should report that as "no history" rather than traceback.
    out = subprocess.run(["git", *args], capture_output=True, text=True, cwd=root)
    if out.returncode != 0:
        return []
    return out.stdout.splitlines()


# --------------------------------------------------------------------------
# counting
# --------------------------------------------------------------------------


def count_lines(path: Path) -> int:
    """Line count matching ``wc -l`` semantics closely enough for reporting.

    A trailing fragment with no final newline still counts as a line, which is
    what a reader comparing against an editor's line number would expect.
    """
    try:
        data = path.read_bytes()
    except OSError:
        return 0
    if not data:
        return 0
    n = data.count(b"\n")
    if not data.endswith(b"\n"):
        n += 1
    return n


TEST_PATH_RE = re.compile(
    r"(^|/)(tests?|__tests__)(/|$)|\.test\.[jt]sx?$|(^|/)test_[^/]+\.py$"
)

PY_TEST_FN_RE = re.compile(r"^\s*(?:async\s+)?def\s+test_", re.MULTILINE)
JS_TEST_FN_RE = re.compile(r"^\s*(?:it|test)\s*(?:\.\w+)?\s*\(", re.MULTILINE)


def is_test(path: str) -> bool:
    return bool(TEST_PATH_RE.search(path))


@dataclass
class Bucket:
    label: str
    files: int = 0
    lines: int = 0
    tests: int = 0

    def add(self, lines: int, tests: int = 0) -> None:
        self.files += 1
        self.lines += lines
        self.tests += tests


@dataclass
class Area:
    """A reported row: a named area, split into source and test halves."""

    label: str
    matches: Callable[[str], bool]
    source: Bucket = field(init=False)
    test: Bucket = field(init=False)

    def __post_init__(self) -> None:
        self.source = Bucket(f"{self.label} source")
        self.test = Bucket(f"{self.label} tests")


CODE_EXTS = {".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".sql"}


def build_areas() -> list[Area]:
    return [
        Area(
            "Frontend (Next.js)",
            lambda p: p.startswith("frontend/")
            and Path(p).suffix in {".ts", ".tsx", ".mjs", ".js"},
        ),
        Area(
            "Cloudflare Workers",
            lambda p: p.startswith("workers/")
            and Path(p).suffix in {".ts", ".mjs", ".js"},
        ),
        Area(
            "extract-core (TypeScript)",
            lambda p: p.startswith("packages/extract-core/")
            and Path(p).suffix == ".ts",
        ),
        Area(
            "extract-sdk (Python, v1)",
            lambda p: p.startswith("packages/extract-sdk/") and Path(p).suffix == ".py",
        ),
        Area(
            "Backend (FastAPI, v1)",
            lambda p: p.startswith("backend/") and Path(p).suffix == ".py",
        ),
        Area("SQL migrations", lambda p: Path(p).suffix == ".sql"),
    ]


def collect(root: Path, files: list[str]) -> dict:
    areas = build_areas()
    docs = Bucket("Docs & content (md/mdx)")
    other_code = Bucket("Other tracked code")

    for rel in files:
        path = root / rel
        suffix = Path(rel).suffix

        # README.md is where this report is published. Counting it would mean
        # every injection changed the docs total and invalidated the block it
        # had just written, so --inject would never reach a fixpoint.
        if rel == "README.md":
            continue

        if suffix in {".md", ".mdx"}:
            docs.add(count_lines(path))
            continue

        if suffix not in CODE_EXTS:
            continue

        placed = False
        for area in areas:
            if area.matches(rel):
                lines = count_lines(path)
                tests = 0
                if is_test(rel):
                    text = path.read_text("utf-8", "replace")
                    tests = len(
                        (PY_TEST_FN_RE if suffix == ".py" else JS_TEST_FN_RE).findall(
                            text
                        )
                    )
                    area.test.add(lines, tests)
                else:
                    area.source.add(lines)
                placed = True
                break

        if not placed:
            other_code.add(count_lines(path))

    return {"areas": areas, "docs": docs, "other": other_code}


def collect_git(root: Path) -> dict | None:
    """Summarise commit history, or None when there is no history to summarise.

    A snapshot repository holds a single commit. Reporting "1 commits, 0 merges,
    2026-08-07 to 2026-08-07" there would be worse than saying nothing: it reads
    as a measurement when it is really an artefact of how the snapshot was made.
    Returning None lets the caller omit the section entirely, the same way
    collect_schema() already handles a missing schema file.
    """
    subjects = git_lines(root, "log", "--format=%s")
    if len(subjects) <= 1:
        return None

    types = Counter()
    conventional = re.compile(r"^([a-z]+)(\([^)]*\))?!?:")
    for s in subjects:
        m = conventional.match(s)
        if m:
            types[m.group(1)] += 1

    dates = git_lines(root, "log", "--format=%cd", "--date=format:%Y-%m-%d")
    merges = git_lines(root, "log", "--merges", "--format=%h")

    return {
        "commits": len(subjects),
        "merges": len(merges),
        "first_commit": dates[-1] if dates else None,
        "last_commit": dates[0] if dates else None,
        "types": dict(types.most_common(8)),
    }


def collect_schema(root: Path) -> dict | None:
    schema_path = root / "docs" / "lextract_field_schema.json"
    if not schema_path.exists():
        return None
    fields = json.loads(schema_path.read_text("utf-8"))
    categories = Counter(f.get("category") for f in fields)
    return {
        "fields": len(fields),
        "categories": len(categories),
        "required": sum(1 for f in fields if f.get("required")),
        "cam_relevant": sum(1 for f in fields if f.get("cam_relevant")),
    }


# --------------------------------------------------------------------------
# rendering
# --------------------------------------------------------------------------


def render_markdown(
    data: dict, git: dict | None, schema: dict | None, *, include_history: bool = True
) -> str:
    """Render the report.

    ``include_history`` is False for the block injected into README.md. The
    published README is a snapshot, where commit counts cannot be read out of
    the repository at all, so those numbers are written as prose and stated as
    measured from the development repository. Injecting them as well would put
    two History sections on the page that drift apart on the next commit.

    The default stdout report still includes History, which is how you refresh
    the prose figures.
    """
    areas: list[Area] = data["areas"]
    docs: Bucket = data["docs"]

    lines = [
        "| Area | Source files | Source lines | Test files | Test lines | Tests |",
        "| --- | ---: | ---: | ---: | ---: | ---: |",
    ]

    tot = Counter()
    for area in areas:
        if area.source.files == 0 and area.test.files == 0:
            continue
        lines.append(
            f"| {area.label} | {area.source.files:,} | {area.source.lines:,} | "
            f"{area.test.files:,} | {area.test.lines:,} | {area.test.tests:,} |"
        )
        tot["sf"] += area.source.files
        tot["sl"] += area.source.lines
        tot["tf"] += area.test.files
        tot["tl"] += area.test.lines
        tot["t"] += area.test.tests

    lines.append(
        f"| **Total code** | **{tot['sf']:,}** | **{tot['sl']:,}** | "
        f"**{tot['tf']:,}** | **{tot['tl']:,}** | **{tot['t']:,}** |"
    )
    lines.append(
        f"| Docs & content (md/mdx) | {docs.files:,} | {docs.lines:,} | n/a | n/a | n/a |"
    )
    other: Bucket = data["other"]
    if other.files > 0:
        lines.append(
            "| Other tracked code (tooling, vendored) "
            f"| {other.files:,} | {other.lines:,} | n/a | n/a | n/a |"
        )

    out = ["### Code", "", *lines, ""]

    if git and include_history:
        out += [
            "### History",
            "",
            f"- **{git['commits']:,} commits** "
            f"({git['first_commit']} → {git['last_commit']}), "
            f"{git['merges']:,} merges",
        ]
        # An empty types dict would otherwise emit a bare "- By type:" label
        # with nothing after it.
        if git["types"]:
            out.append(
                "- By type: "
                + ", ".join(f"`{k}` {v:,}" for k, v in git["types"].items())
            )
        out.append("")

    if schema:
        out += [
            "### Extraction schema",
            "",
            f"- **{schema['fields']} fields** across "
            f"**{schema['categories']} categories**",
            f"- {schema['required']} required, {schema['cam_relevant']} CAM-relevant",
            "",
        ]

    return "\n".join(out)


def to_jsonable(data: dict, git: dict | None, schema: dict | None) -> dict:
    return {
        "areas": [
            {
                "label": a.label,
                "source": {"files": a.source.files, "lines": a.source.lines},
                "tests": {
                    "files": a.test.files,
                    "lines": a.test.lines,
                    "count": a.test.tests,
                },
            }
            for a in data["areas"]
        ],
        "docs": {"files": data["docs"].files, "lines": data["docs"].lines},
        "other": {"files": data["other"].files, "lines": data["other"].lines},
        "git": git,
        "schema": schema,
    }


MARKER_START = "<!-- METRICS:START -->"
MARKER_END = "<!-- METRICS:END -->"


def sync_readme(readme: Path, report: str, *, check_only: bool) -> int:
    """Replace the block between the METRICS markers in README.md.

    ``--check`` makes this a drift detector: it reports whether the committed
    numbers still match the repository, without writing anything.
    """
    if not readme.exists():
        print(f"error: {readme} not found", file=sys.stderr)
        return 1

    text = readme.read_text("utf-8")
    start = text.find(MARKER_START)
    end = text.find(MARKER_END)
    if start == -1 or end == -1 or end < start:
        print(
            f"error: could not find {MARKER_START} / {MARKER_END} in {readme.name}",
            file=sys.stderr,
        )
        return 1

    updated = (
        text[: start + len(MARKER_START)] + "\n" + report.rstrip() + "\n" + text[end:]
    )

    if updated == text:
        print("README metrics are up to date.")
        return 0

    if check_only:
        print("README metrics are STALE. Run: python scripts/repo-metrics.py --inject")
        return 1

    readme.write_text(updated, "utf-8", newline="\n")
    print(f"Updated metrics block in {readme.name}.")
    return 0


def main() -> int:
    # The report contains non-ASCII (arrows, em dashes) and Windows consoles
    # still default to cp1252, which cannot encode them.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--json", action="store_true", help="emit JSON instead of markdown"
    )
    parser.add_argument(
        "--inject",
        action="store_true",
        help="rewrite the metrics block in README.md in place",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="exit non-zero if README.md's metrics block is stale",
    )
    args = parser.parse_args()

    root = repo_root()
    files = tracked_files(root)
    data = collect(root, files)
    git = collect_git(root)
    schema = collect_schema(root)

    # What goes into README.md, and what gets printed, differ by one section.
    injected = render_markdown(data, git, schema, include_history=False)

    if args.json:
        print(json.dumps(to_jsonable(data, git, schema), indent=2))
        # --check is a drift gate; honour it even alongside --json.
        return (
            sync_readme(root / "README.md", injected, check_only=True)
            if args.check
            else 0
        )

    if args.inject or args.check:
        return sync_readme(root / "README.md", injected, check_only=args.check)

    print(render_markdown(data, git, schema))
    return 0


if __name__ == "__main__":
    sys.exit(main())
