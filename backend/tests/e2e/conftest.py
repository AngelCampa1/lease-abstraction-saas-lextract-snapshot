"""Fixtures for E2E tests that exercise the Gemini extraction pipeline.

The PDF-native pipeline (post-migration 00007) downloads PDF bytes from
R2 via ObjectStorageService and hands them to MultiPassOrchestrator.run(pdf_bytes,
filename, prompt). The InMemoryExtractionDB now seeds the columns the
new task reads (``document_object_key`` and ``document_filename``) and no
longer carries the legacy ``ocr_text``/``ocr_metadata`` fields that were
dropped by the migration.

The HTML→text helper is preserved because some legacy tests still reference
it for diagnostic purposes; callers needing PDF bytes should provide them
directly via ObjectStorageService.download_file mocks.

``InMemoryExtractionDB`` supports two tables:
- ``extractions`` — single-record store with select/update semantics.
- ``extraction_pipeline_events`` — append-only store with insert/update semantics.
  The observer calls ``insert`` (returns a row with a generated UUID) then
  ``update`` to finalize each stage.  After a test run, inspect the
  ``pipeline_events`` property to assert on recorded stages.
"""

from __future__ import annotations

import uuid as _uuid_mod
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

import pytest

# Path to lease 07 — industrial/San Carlos, ~9,740 sqft (HTML reference copy)
_LEASE_07_PATH = (
    Path(__file__).parents[3]  # lextract/
    / "packages"
    / "extract-sdk"
    / "tests"
    / "fixtures"
    / "real-leases"
    / "07_industrial_sancarlos.htm"
)

E2E_EXTRACTION_ID = "e2e00000-0000-0000-0000-000000000007"
E2E_S3_KEY = f"extractions/e2e/{E2E_EXTRACTION_ID}/lease.pdf"
E2E_FILENAME = "07_industrial_sancarlos.pdf"


# ---------------------------------------------------------------------------
# HTML → plain text
# ---------------------------------------------------------------------------


class _TextExtractor(HTMLParser):
    """Minimal HTMLParser that accumulates visible text content."""

    def __init__(self) -> None:
        super().__init__()
        self._parts: list[str] = []
        self._skip = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"script", "style"}:
            self._skip = True

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style"}:
            self._skip = False

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        """Self-closing tags have no content — nothing to track.

        Overrides the default which calls handle_starttag + handle_endtag,
        which would toggle _skip on/off for <script .../> with no net effect,
        but is cleaner to no-op explicitly.
        """

    def handle_data(self, data: str) -> None:
        if self._skip:
            return
        stripped = data.strip()
        if stripped:
            self._parts.append(stripped)

    def get_text(self) -> str:
        return "\n".join(self._parts)


# ---------------------------------------------------------------------------
# In-memory DB — stateful replacement for Neon PostgREST
# ---------------------------------------------------------------------------


class MockResult:
    """Minimal stand-in for a PostgREST execute() result."""

    def __init__(self, data: Any) -> None:
        self.data = data


class InMemoryQueryBuilder:
    """Chainable query builder that reads/writes a shared record dict."""

    def __init__(self, record_ref: list[dict[str, Any]]) -> None:
        # record_ref is a 1-element list so mutations are visible to all callers
        self._record_ref = record_ref
        self._operation: str = "select"
        self._update_data: dict[str, Any] = {}
        self._filters: list[tuple[str, str, Any]] = []

    def select(self, *args: Any, **kwargs: Any) -> InMemoryQueryBuilder:
        self._operation = "select"
        return self

    def update(self, data: dict[str, Any]) -> InMemoryQueryBuilder:
        self._operation = "update"
        self._update_data = data
        return self

    def eq(self, col: str, val: Any) -> InMemoryQueryBuilder:
        self._filters.append(("eq", col, val))
        return self

    def is_(self, col: str, val: Any) -> InMemoryQueryBuilder:
        if val != "null":
            raise ValueError(f"Unsupported is_ filter value: {val!r}")
        self._filters.append(("is", col, val))
        return self

    def _matches_filters(self) -> bool:
        record = self._record_ref[0]
        for op, col, val in self._filters:
            current = record.get(col)
            if op == "eq" and str(current) != str(val):
                return False
            if op == "is" and current is not None:
                return False
        return True

    def single(self) -> InMemoryQueryBuilder:
        return self

    def execute(self) -> MockResult:
        if not self._matches_filters():
            return MockResult(data=[] if self._operation == "update" else None)
        if self._operation == "update":
            self._record_ref[0].update(self._update_data)
        return MockResult(data=dict(self._record_ref[0]))


class InMemoryEventQueryBuilder:
    """Chainable query builder for the ``extraction_pipeline_events`` table.

    Supports the insert-then-update lifecycle the ``PipelineEventRecorder``
    uses:

    1. ``db.table("extraction_pipeline_events").insert(payload).execute()``
       → appends a new row, auto-generates ``id``, returns ``[row]`` as data.
    2. ``db.table("extraction_pipeline_events").update(payload).eq("id", v).execute()``
       → finds the matching row by id and merges the payload into it.
    """

    def __init__(self, events_ref: list[dict[str, Any]]) -> None:
        # events_ref is shared across all builder instances for the same DB
        self._events = events_ref
        self._operation: str = "select"
        self._insert_data: dict[str, Any] = {}
        self._update_data: dict[str, Any] = {}
        self._filter_col: str | None = None
        self._filter_val: Any = None

    def insert(self, data: dict[str, Any]) -> InMemoryEventQueryBuilder:
        self._operation = "insert"
        self._insert_data = dict(data)
        return self

    def update(self, data: dict[str, Any]) -> InMemoryEventQueryBuilder:
        self._operation = "update"
        self._update_data = dict(data)
        return self

    def select(self, *args: Any, **kwargs: Any) -> InMemoryEventQueryBuilder:
        self._operation = "select"
        return self

    def eq(self, col: str, val: Any) -> InMemoryEventQueryBuilder:
        self._filter_col = col
        self._filter_val = val
        return self

    def execute(self) -> MockResult:
        if self._operation == "insert":
            row = {**self._insert_data, "id": str(_uuid_mod.uuid4())}
            self._events.append(row)
            return MockResult(data=[row])

        if self._operation == "update":
            # Bulk update (no .eq() filter) is never valid on an append-only
            # events table and would silently corrupt all rows. Raise early so
            # caller bugs surface immediately rather than producing wrong data.
            if self._filter_col is None:
                raise RuntimeError(
                    "InMemoryEventQueryBuilder.update requires .eq() — "
                    "bulk update without a filter is not supported on "
                    "extraction_pipeline_events"
                )
            updated: list[dict[str, Any]] = []
            for row in self._events:
                if str(row.get(self._filter_col)) == str(self._filter_val):
                    row.update(self._update_data)
                    updated.append(row)
            return MockResult(data=updated)

        # select
        filtered = (
            self._events
            if self._filter_col is None
            else [
                r
                for r in self._events
                if str(r.get(self._filter_col)) == str(self._filter_val)
            ]
        )
        return MockResult(data=filtered)


class InMemoryExtractionDB:
    """Two-table in-memory database for pipeline task testing.

    Supports the PostgREST query chain pattern used by extraction,
    scoring, and red flag tasks:

        db.table("extractions").select(...).eq("id", ...).single().execute()
        db.table("extractions").update({...}).eq("id", ...).execute()

    Also supports the observer's pipeline-events lifecycle:

        db.table("extraction_pipeline_events").insert({...}).execute()
        db.table("extraction_pipeline_events").update({...}).eq("id", v).execute()

    State is mutable and persists across pipeline stages within a test.
    Inspect ``record`` for extraction state and ``pipeline_events`` for the
    ordered list of recorded stage events.
    """

    def __init__(self, initial_record: dict[str, Any]) -> None:
        self._record_ref: list[dict[str, Any]] = [dict(initial_record)]
        self._pipeline_events: list[dict[str, Any]] = []

    def table(
        self, table_name: str
    ) -> InMemoryQueryBuilder | InMemoryEventQueryBuilder:
        if table_name == "extraction_pipeline_events":
            return InMemoryEventQueryBuilder(self._pipeline_events)
        return InMemoryQueryBuilder(self._record_ref)

    @property
    def record(self) -> dict[str, Any]:
        """Current state of the extraction record."""
        return self._record_ref[0]

    @property
    def pipeline_events(self) -> list[dict[str, Any]]:
        """Snapshot of recorded pipeline stage events (insert-ordered)."""
        return list(self._pipeline_events)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def e2e_extraction_id() -> str:
    return E2E_EXTRACTION_ID


@pytest.fixture(scope="module")
def lease_html_text() -> str:
    """Plain text from lease 07 — industrial/San Carlos, ~9,740 sqft.

    Retained for diagnostic and reference use. The new PDF-native
    pipeline does not consume this — it downloads PDF bytes from R2.
    """
    raw_html = _LEASE_07_PATH.read_text(encoding="utf-8", errors="replace")
    extractor = _TextExtractor()
    extractor.feed(raw_html)
    return extractor.get_text()


@pytest.fixture
def in_memory_db() -> InMemoryExtractionDB:
    """Fresh in-memory DB seeded with all columns the Gemini task reads/writes.

    Schema reflects post-migration 00010 (extraction_pipeline_events +
    observability columns).
    """
    return InMemoryExtractionDB(
        {
            "id": E2E_EXTRACTION_ID,
            "status": "uploading",
            "document_object_key": E2E_S3_KEY,
            "document_filename": E2E_FILENAME,
            "user_id": None,
            "extracted_data": None,
            "confidence_scores": None,
            "overall_confidence": None,
            "red_flags": None,
            "pass_records": None,
            "extraction_tokens": None,
            # Observability columns added in migration 00010
            "extraction_cost_cents": 0,
            "stage_summary": None,
            "raw_extraction_object_keys": None,
            # Pass-2 / Pass-3 result columns
            "pass2_patch": None,
            "pass3_overrides": None,
        }
    )
