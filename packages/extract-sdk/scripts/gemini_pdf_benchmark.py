"""Benchmark harness for the PDF-native MultiPassOrchestrator on Gemini 3 Flash.

Runs the new PDF-native extraction pipeline against the 22 real-lease HTML
fixtures in ``packages/extract-sdk/tests/fixtures/real-leases/``, comparing
each extraction against the ground-truth matchers defined in
``backend/tests/e2e/ground_truth.py``.

Behavior summary
----------------
* Loads the fixture manifest (22 leases).  Two fixtures are excluded by
  ground_truth.py (lease 08 — Belgian/EUR; lease 14 — blank template) and
  are reported as ``skipped: no ground truth``.
* For each remaining lease, converts the HTML source to PDF via Playwright
  headless Chromium and caches the rendered bytes at
  ``tests/fixtures/real-leases/.pdf-cache/<basename>.pdf`` so reruns are
  instant.
* Sends the rendered PDF through ``MultiPassOrchestrator.run`` configured
  to call ``google/gemini-3-flash-preview`` for all three passes.
* For each lease, evaluates the extraction against the ground-truth matchers
  from ``LEASE_CASES`` using ``matcher.check(extracted_value)`` — exactly
  the same pass/fail logic as the e2e tests.  The accuracy denominator is
  the number of matchers defined for that lease (typically ~13), not the
  full 126-field schema.
* Prints a per-lease table (cost, latency, pass-by-pass tokens, accuracy)
  followed by an aggregate summary.
* Writes a JSON artifact to ``docs/audits/gemini-pdf-benchmark-<today>.json``.

Usage
-----
::

    export OPENROUTER_API_KEY=sk-or-v1-...
    python scripts/gemini_pdf_benchmark.py
    python scripts/gemini_pdf_benchmark.py --lease 06_warehouse_northann.htm
    python scripts/gemini_pdf_benchmark.py --no-pass-3 --output /tmp/pass1+2.json

Optional dependencies
---------------------
* ``playwright`` — required for HTML→PDF conversion.  Install with
  ``pip install playwright && playwright install chromium``.
* ``pypdf`` — used for accurate page counts.  Falls back to a regex over
  the PDF byte stream when not installed.

Cost
----
At ``$0.34 / 1M`` input tokens and ``$3.00 / 1M`` output tokens, a typical
3-pass run averages ~$0.02 per lease, so a full 20-lease benchmark costs
roughly ``$0.40`` and takes 10–20 minutes wall-clock.
"""

from __future__ import annotations

import argparse
import asyncio
import difflib
import importlib.util
import json
import logging
import os
import re
import statistics
import sys
import time
from collections.abc import Awaitable, Callable
from dataclasses import asdict, dataclass, field
from datetime import date
from decimal import Decimal
from io import BytesIO
from pathlib import Path
from types import ModuleType
from typing import Any

from extract_sdk.extraction.domain_knowledge import get_all_domain_knowledge
from extract_sdk.extraction.openrouter_client import OpenRouterClient
from extract_sdk.extraction.orchestrator import (
    MultiPassConfig,
    MultiPassOrchestrator,
)
from extract_sdk.extraction.prompt_builder import ExtractionPromptBuilder
from extract_sdk.models import MultiPassResult
from extract_sdk.schema.lextract_schema import build_lextract_registry

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MODEL_SLUG = "google/gemini-3-flash-preview"

# OpenRouter pricing for ``google/gemini-3-flash-preview`` as of 2026-04-16.
# Source: task spec (Gemini 3 Flash preview public pricing).
INPUT_PRICE_PER_M = Decimal("0.34")
OUTPUT_PRICE_PER_M = Decimal("3.00")
ONE_MILLION = Decimal("1000000")

logger = logging.getLogger("gemini_pdf_benchmark")


# ---------------------------------------------------------------------------
# Repo layout discovery
# ---------------------------------------------------------------------------


def _find_repo_root() -> Path:
    """Walk upward from this script until both monorepo markers are present."""
    start = Path(__file__).resolve().parent
    for candidate in (start, *start.parents):
        if (
            (candidate / "packages" / "extract-sdk").is_dir()
            and (candidate / "backend").is_dir()
        ):
            return candidate
    raise RuntimeError(
        "Could not locate the lextract repo root (looking for 'packages/extract-sdk' "
        "and 'backend' siblings)."
    )


REPO_ROOT = _find_repo_root()
FIXTURES_DIR = (
    REPO_ROOT / "packages" / "extract-sdk" / "tests" / "fixtures" / "real-leases"
)
MANIFEST_PATH = FIXTURES_DIR / "real_lease_manifest.json"
PDF_CACHE_DIR = FIXTURES_DIR / ".pdf-cache"
GROUND_TRUTH_PATH = REPO_ROOT / "backend" / "tests" / "e2e" / "ground_truth.py"


def _default_output_path() -> Path:
    return REPO_ROOT / "docs" / "audits" / (
        f"gemini-pdf-benchmark-{date.today().isoformat()}.json"
    )


# ---------------------------------------------------------------------------
# Ground-truth loader (avoids polluting sys.path)
# ---------------------------------------------------------------------------


def _load_ground_truth_module() -> ModuleType:
    """Load ``backend/tests/e2e/ground_truth.py`` via importlib.

    Using ``spec_from_file_location`` keeps ``sys.path`` clean — backend's
    pydantic-settings configuration is not triggered because ground_truth.py
    only imports stdlib modules.
    """
    if not GROUND_TRUTH_PATH.is_file():
        raise FileNotFoundError(
            f"Ground-truth definitions not found at {GROUND_TRUTH_PATH}. "
            "The benchmark requires the backend tests directory to be present."
        )
    spec = importlib.util.spec_from_file_location(
        "lextract_e2e_ground_truth", GROUND_TRUTH_PATH
    )
    if spec is None or spec.loader is None:
        raise ImportError(f"Failed to build ImportSpec for {GROUND_TRUTH_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _build_lease_case_index(module: ModuleType) -> dict[str, Any]:
    """Index ground-truth ``LeaseCase`` objects by manifest filename."""
    cases: list[Any] = list(module.LEASE_CASES)
    return {case.filename: case for case in cases}


# ---------------------------------------------------------------------------
# HTML → PDF (Playwright, lazily imported)
# ---------------------------------------------------------------------------


async def _html_to_pdf(html_path: Path) -> bytes:
    """Render an HTML fixture to PDF bytes, caching the result on disk."""
    PDF_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_path = PDF_CACHE_DIR / (html_path.stem + ".pdf")
    if cache_path.is_file():
        logger.debug("PDF cache hit for %s", html_path.name)
        return cache_path.read_bytes()

    try:
        # Lazy import — keeps `--help` working without playwright installed.
        from playwright.async_api import async_playwright
    except ImportError as exc:
        raise RuntimeError(
            "Playwright is required to render HTML fixtures to PDF. "
            "Install it with:\n"
            "    pip install playwright\n"
            "    playwright install chromium"
        ) from exc

    html_text = html_path.read_text(encoding="utf-8", errors="replace")
    logger.info("Rendering %s with Playwright (first run)", html_path.name)

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        try:
            context = await browser.new_context()
            page = await context.new_page()
            await page.set_content(html_text, wait_until="networkidle")
            pdf_bytes = await page.pdf(format="Letter", print_background=True)
        finally:
            await browser.close()

    cache_path.write_bytes(pdf_bytes)
    return pdf_bytes


# ---------------------------------------------------------------------------
# PDF page count (pypdf, lazily imported)
# ---------------------------------------------------------------------------


_PAGE_FALLBACK_RE = re.compile(rb"/Type\s*/Page[^s]")


def _count_pages(pdf_bytes: bytes) -> int:
    """Return the number of pages in a PDF, falling back to a regex if needed."""
    try:
        from pypdf import PdfReader
    except ImportError:
        matches = _PAGE_FALLBACK_RE.findall(pdf_bytes)
        # Fallback under-counts when /Type and /Page are split across compressed
        # streams; an estimate is still useful for the audit artifact.
        logger.debug("pypdf not installed — using regex page-count fallback")
        return max(1, len(matches))

    reader = PdfReader(BytesIO(pdf_bytes))
    return len(reader.pages)


# ---------------------------------------------------------------------------
# Cost and field comparison helpers
# ---------------------------------------------------------------------------


def _compute_cost(input_tokens: int, output_tokens: int) -> Decimal:
    """Compute the USD cost of a single completion using Decimal math."""
    return (
        Decimal(input_tokens) * INPUT_PRICE_PER_M / ONE_MILLION
        + Decimal(output_tokens) * OUTPUT_PRICE_PER_M / ONE_MILLION
    )


def _classify_match_type(matcher: Any) -> str:
    """Map a ground-truth matcher onto an exact/tolerance/semantic label."""
    name = type(matcher).__name__
    if name == "WithinPct":
        return "tolerance"
    if name == "Equals":
        expected = getattr(matcher, "expected", None)
        if isinstance(expected, bool):
            return "exact"
        if isinstance(expected, int | float):
            return "exact_numeric"
        return "exact"
    if name in {"Contains", "IsTruthy", "AnyOf"}:
        return "semantic"
    return "semantic"


@dataclass
class FieldComparison:
    """Per-field outcome: did the extracted value satisfy the matcher?"""

    field_name: str
    extracted_value: Any
    expected_describe: str
    match_type: str
    passed: bool
    similarity_ratio: float


def _compare_field(
    field_name: str, extracted_value: Any, matcher: Any
) -> FieldComparison:
    """Build a FieldComparison for a single (field, matcher) pair."""
    expected = matcher.describe()
    similarity = difflib.SequenceMatcher(
        None, str(extracted_value or ""), expected
    ).ratio()
    return FieldComparison(
        field_name=field_name,
        extracted_value=extracted_value,
        expected_describe=expected,
        match_type=_classify_match_type(matcher),
        passed=bool(matcher.check(extracted_value)),
        similarity_ratio=round(similarity, 4),
    )


# ---------------------------------------------------------------------------
# Dataclasses for benchmark records
# ---------------------------------------------------------------------------


@dataclass
class PassMetrics:
    """Per-pass cost and latency metrics."""

    pass_number: int
    model: str
    input_tokens: int
    output_tokens: int
    duration_seconds: float
    cost_usd: Decimal


@dataclass
class LeaseBenchmark:
    """Aggregate benchmark record for a single lease."""

    lease_id: str
    filename: str
    page_count: int = 0
    pdf_size_bytes: int = 0
    error: str | None = None
    skipped_reason: str | None = None
    passes: list[PassMetrics] = field(default_factory=list)
    total_latency_seconds: float = 0.0
    total_cost_usd: Decimal = field(default_factory=lambda: Decimal("0"))
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    needs_review: bool = False
    field_comparisons: list[FieldComparison] = field(default_factory=list)
    matchers_defined: int = 0
    matchers_passed: int = 0
    critical_matchers_defined: int = 0
    critical_matchers_passed: int = 0


# ---------------------------------------------------------------------------
# Per-lease pipeline
# ---------------------------------------------------------------------------


def _passes_from_result(
    result: MultiPassResult,
) -> list[PassMetrics]:
    """Convert the orchestrator's pass records into PassMetrics with cost."""
    metrics: list[PassMetrics] = []
    for record in result.pass_records:
        cost = _compute_cost(record.input_tokens, record.output_tokens)
        metrics.append(
            PassMetrics(
                pass_number=record.pass_number,
                model=record.model,
                input_tokens=record.input_tokens,
                output_tokens=record.output_tokens,
                duration_seconds=record.duration_ms / 1000.0,
                cost_usd=cost,
            )
        )
    return metrics


async def _run_single_lease(
    orchestrator: MultiPassOrchestrator,
    prompt_text: str,
    manifest_entry: dict[str, Any],
    lease_case: Any | None,
    critical_field_names: set[str],
) -> LeaseBenchmark:
    """Run extraction on a single lease and grade against ground truth."""
    filename = manifest_entry["file"]
    benchmark = LeaseBenchmark(
        lease_id=manifest_entry["id"], filename=filename
    )

    if lease_case is None:
        benchmark.skipped_reason = "no ground truth"
        logger.info("[%s] skipped — no ground-truth matchers defined", filename)
        return benchmark

    html_path = FIXTURES_DIR / filename
    if not html_path.is_file():
        benchmark.error = f"fixture missing: {html_path}"
        return benchmark

    try:
        pdf_bytes = await _html_to_pdf(html_path)
    except Exception as exc:
        benchmark.error = f"html→pdf conversion failed: {exc}"
        logger.exception("[%s] html→pdf conversion failed", filename)
        return benchmark

    benchmark.pdf_size_bytes = len(pdf_bytes)
    benchmark.page_count = _count_pages(pdf_bytes)

    try:
        wall_start = time.monotonic()
        result = await orchestrator.run(pdf_bytes, filename, prompt_text)
        wall_elapsed = time.monotonic() - wall_start
    except Exception as exc:
        benchmark.error = f"orchestrator.run failed: {exc}"
        logger.exception("[%s] orchestrator.run raised", filename)
        return benchmark

    benchmark.passes = _passes_from_result(result)
    benchmark.total_input_tokens = sum(p.input_tokens for p in benchmark.passes)
    benchmark.total_output_tokens = sum(p.output_tokens for p in benchmark.passes)
    benchmark.total_cost_usd = sum(
        (p.cost_usd for p in benchmark.passes), start=Decimal("0")
    )
    pass_latency = sum(p.duration_seconds for p in benchmark.passes)
    # Pass durations sum may exceed wall time on retries; report the larger of
    # the two so cost-per-second math stays meaningful.
    benchmark.total_latency_seconds = max(pass_latency, wall_elapsed)
    benchmark.needs_review = result.needs_review

    for field_name, matcher in lease_case.ground_truth.items():
        extracted_value = result.extraction.get_field_value(field_name)
        comparison = _compare_field(field_name, extracted_value, matcher)
        benchmark.field_comparisons.append(comparison)
        benchmark.matchers_defined += 1
        if comparison.passed:
            benchmark.matchers_passed += 1
        if field_name in critical_field_names:
            benchmark.critical_matchers_defined += 1
            if comparison.passed:
                benchmark.critical_matchers_passed += 1

    return benchmark


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------


def _format_pct(passed: int, defined: int) -> str:
    if defined == 0:
        return "n/a"
    return f"{passed}/{defined} ({passed / defined * 100:.1f}%)"


def _print_lease_table(benchmark: LeaseBenchmark) -> None:
    """Print the per-lease summary table to stdout."""
    header = f"Lease: {benchmark.filename}"
    if benchmark.skipped_reason:
        print(f"{header} — SKIPPED ({benchmark.skipped_reason})")
        return
    if benchmark.error:
        print(f"{header} — ERROR: {benchmark.error}")
        return

    print(
        f"{header} ({benchmark.page_count} pages, "
        f"{benchmark.pdf_size_bytes / 1024:.1f} KB)"
    )
    pass_numbers_seen = {p.pass_number for p in benchmark.passes}
    for p in benchmark.passes:
        print(
            f"  Pass {p.pass_number} ({p.model}): "
            f"{p.duration_seconds:.1f}s, ${p.cost_usd:.4f} "
            f"({p.input_tokens} in / {p.output_tokens} out tokens)"
        )
    for missing in (2, 3):
        if missing not in pass_numbers_seen:
            print(f"  Pass {missing}: skipped (escalation not triggered)")
    print(
        f"  Total: {benchmark.total_latency_seconds:.1f}s, "
        f"${benchmark.total_cost_usd:.4f}"
    )
    accuracy = _format_pct(benchmark.matchers_passed, benchmark.matchers_defined)
    critical_accuracy = _format_pct(
        benchmark.critical_matchers_passed,
        benchmark.critical_matchers_defined,
    )
    print(f"  Accuracy: {accuracy}")
    print(f"  Critical accuracy: {critical_accuracy}")
    if benchmark.needs_review:
        print(
            "  needs_review: TRUE (orchestrator flagged low-confidence "
            "critical fields)"
        )


def _print_summary(benchmarks: list[LeaseBenchmark]) -> None:
    """Print the aggregate summary across all benchmarked leases."""
    scored = [b for b in benchmarks if not b.skipped_reason and not b.error]
    skipped = [b for b in benchmarks if b.skipped_reason]
    errored = [b for b in benchmarks if b.error]

    total_cost = sum((b.total_cost_usd for b in scored), start=Decimal("0"))
    latencies = [b.total_latency_seconds for b in scored]
    total_latency = sum(latencies)
    median_latency = statistics.median(latencies) if latencies else 0.0
    matchers_defined = sum(b.matchers_defined for b in scored)
    matchers_passed = sum(b.matchers_passed for b in scored)
    critical_defined = sum(b.critical_matchers_defined for b in scored)
    critical_passed = sum(b.critical_matchers_passed for b in scored)
    total_input = sum(b.total_input_tokens for b in scored)
    total_output = sum(b.total_output_tokens for b in scored)

    print()
    print("=" * 78)
    print("AGGREGATE SUMMARY")
    print("=" * 78)
    print(f"Leases scored:     {len(scored)}")
    print(f"Leases skipped:    {len(skipped)}")
    print(f"Leases errored:    {len(errored)}")
    print(f"Total cost:        ${total_cost:.4f}")
    print(f"Total latency:     {total_latency:.1f}s")
    print(f"Median latency:    {median_latency:.1f}s")
    print(f"Input tokens:      {total_input:,}")
    print(f"Output tokens:     {total_output:,}")
    print(f"Aggregate accuracy: {_format_pct(matchers_passed, matchers_defined)}")
    print(
        f"Critical accuracy:  {_format_pct(critical_passed, critical_defined)}"
    )


# ---------------------------------------------------------------------------
# JSON artifact
# ---------------------------------------------------------------------------


def _json_default(value: Any) -> Any:
    """Serialize Decimals as 6-decimal-place floats for the JSON artifact."""
    if isinstance(value, Decimal):
        return round(float(value), 6)
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def _benchmark_to_dict(benchmark: LeaseBenchmark) -> dict[str, Any]:
    """Convert a LeaseBenchmark dataclass to a JSON-friendly dict."""
    raw = asdict(benchmark)
    # ``asdict`` walks Decimals as-is; let _json_default handle them via
    # ``json.dumps(default=...)``.  No further transformation needed here.
    return raw


def _write_artifact(
    benchmarks: list[LeaseBenchmark], output_path: Path
) -> None:
    """Write the aggregated JSON artifact to disk."""
    output_path.parent.mkdir(parents=True, exist_ok=True)

    scored = [b for b in benchmarks if not b.skipped_reason and not b.error]
    skipped = [b for b in benchmarks if b.skipped_reason]
    errored = [b for b in benchmarks if b.error]

    total_cost = sum((b.total_cost_usd for b in scored), start=Decimal("0"))
    latencies = [b.total_latency_seconds for b in scored]
    median_latency = statistics.median(latencies) if latencies else 0.0
    matchers_defined = sum(b.matchers_defined for b in scored)
    matchers_passed = sum(b.matchers_passed for b in scored)
    critical_defined = sum(b.critical_matchers_defined for b in scored)
    critical_passed = sum(b.critical_matchers_passed for b in scored)

    artifact: dict[str, Any] = {
        "run_date": date.today().isoformat(),
        "model": MODEL_SLUG,
        "input_price_per_million_usd": float(INPUT_PRICE_PER_M),
        "output_price_per_million_usd": float(OUTPUT_PRICE_PER_M),
        "total_leases": len(scored),
        "skipped_leases": len(skipped),
        "errored_leases": len(errored),
        "summary": {
            "total_cost_usd": round(float(total_cost), 6),
            "total_latency_seconds": round(sum(latencies), 3),
            "median_latency_seconds": round(median_latency, 3),
            "aggregate_accuracy": (
                round(matchers_passed / matchers_defined, 4)
                if matchers_defined
                else None
            ),
            "critical_field_accuracy": (
                round(critical_passed / critical_defined, 4)
                if critical_defined
                else None
            ),
            "aggregate_input_tokens": sum(b.total_input_tokens for b in scored),
            "aggregate_output_tokens": sum(b.total_output_tokens for b in scored),
        },
        "per_lease": [_benchmark_to_dict(b) for b in benchmarks],
    }

    output_path.write_text(
        json.dumps(artifact, indent=2, default=_json_default),
        encoding="utf-8",
    )
    print(f"\nWrote benchmark artifact to {output_path}")


# ---------------------------------------------------------------------------
# CLI / main
# ---------------------------------------------------------------------------


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="gemini_pdf_benchmark.py",
        description=(
            "Benchmark the PDF-native MultiPassOrchestrator against the real-lease "
            f"fixtures using {MODEL_SLUG} via OpenRouter. Compares each extraction "
            "against ground-truth matchers and writes a JSON audit artifact."
        ),
    )
    parser.add_argument(
        "--lease",
        metavar="FILENAME",
        help=(
            "Run only the lease whose manifest 'file' field matches FILENAME "
            "(e.g. '06_warehouse_northann.htm')."
        ),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help=(
            "Path to write the JSON benchmark artifact "
            "(default: docs/audits/gemini-pdf-benchmark-<today>.json)."
        ),
    )
    parser.add_argument(
        "--no-pass-2",
        action="store_true",
        help="Disable Pass 2 (adversarial validation).",
    )
    parser.add_argument(
        "--no-pass-3",
        action="store_true",
        help="Disable Pass 3 (escalation).",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable INFO-level logging.",
    )
    return parser.parse_args(argv)


def _build_client_factory(
    api_key: str,
) -> tuple[Callable[[str], OpenRouterClient], dict[str, OpenRouterClient]]:
    """Return a model→client factory plus the cache it closes over."""
    client_cache: dict[str, OpenRouterClient] = {}

    def factory(model_slug: str) -> OpenRouterClient:
        if model_slug not in client_cache:
            client_cache[model_slug] = OpenRouterClient(
                api_key=api_key, model=model_slug
            )
        return client_cache[model_slug]

    return factory, client_cache


async def _close_clients(cache: dict[str, OpenRouterClient]) -> None:
    """Close every OpenRouterClient instantiated during the run."""
    closers: list[Awaitable[None]] = [client.close() for client in cache.values()]
    if closers:
        await asyncio.gather(*closers, return_exceptions=True)


async def main_async(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    logging.basicConfig(
        level=logging.INFO if args.verbose else logging.WARNING,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        print(
            "ERROR: OPENROUTER_API_KEY environment variable is not set. "
            "Set it before running the benchmark.",
            file=sys.stderr,
        )
        return 2

    output_path = args.output or _default_output_path()

    registry = build_lextract_registry()
    builder = ExtractionPromptBuilder(
        registry, domain_knowledge=get_all_domain_knowledge()
    )
    prompt_text = builder.build_prompt()
    critical_field_names = set(registry.get_critical_field_names())

    config = MultiPassConfig(
        pass1_models=[MODEL_SLUG],
        pass2_models=[] if args.no_pass_2 else [MODEL_SLUG],
        pass3_models=[] if args.no_pass_3 else [MODEL_SLUG],
        pass2_enabled=not args.no_pass_2,
        pass3_enabled=not args.no_pass_3,
    )

    factory, client_cache = _build_client_factory(api_key)
    orchestrator = MultiPassOrchestrator(
        config=config, client_factory=factory, registry=registry
    )

    manifest_data = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    manifest_entries: list[dict[str, Any]] = list(manifest_data["leases"])

    ground_truth_module = _load_ground_truth_module()
    case_index = _build_lease_case_index(ground_truth_module)

    if args.lease:
        manifest_entries = [m for m in manifest_entries if m["file"] == args.lease]
        if not manifest_entries:
            print(
                f"ERROR: lease '{args.lease}' not found in manifest.",
                file=sys.stderr,
            )
            await _close_clients(client_cache)
            return 2

    benchmarks: list[LeaseBenchmark] = []
    try:
        for entry in manifest_entries:
            case = case_index.get(entry["file"])
            benchmark = await _run_single_lease(
                orchestrator,
                prompt_text,
                entry,
                case,
                critical_field_names,
            )
            benchmarks.append(benchmark)
            _print_lease_table(benchmark)
    finally:
        await _close_clients(client_cache)

    _print_summary(benchmarks)
    _write_artifact(benchmarks, output_path)
    return 0


def main() -> int:
    return asyncio.run(main_async())


if __name__ == "__main__":
    sys.exit(main())
