"""Tests for export cache-key invalidation after a field edit.

A cached export becomes stale the moment any field is edited, so the export
endpoint must compute the object-storage key with an extraction-version
component (currently ``extractions.updated_at``). Without this, an edited
lease would download the pre-edit document.
"""

from __future__ import annotations

import re

from app.api.v1.extractions import _export_object_key
from app.models.user import User
from datetime import UTC, datetime


def _user() -> User:
    return User(
        id="00000000-0000-4000-a000-000000000001",
        email="u@e.com",
        full_name="U",
        company=None,
        role="user",
        credits_balance=5,
        stripe_customer_id=None,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


def _record(updated_at: str) -> dict:
    return {
        "id": "00000000-0000-4000-a000-000000000010",
        "user_id": "00000000-0000-4000-a000-000000000001",
        "anonymous_session_id": None,
        "updated_at": updated_at,
    }


class TestExportKeyIncludesUpdatedAt:
    def test_key_changes_when_updated_at_changes(self) -> None:
        user = _user()
        before = _record("2026-01-01T00:00:00+00:00")
        after = _record("2026-02-15T10:30:00+00:00")

        key_before = _export_object_key(
            before, user, str(before["id"]), "docx", "commercial"
        )
        key_after = _export_object_key(
            after, user, str(after["id"]), "docx", "commercial"
        )

        assert (
            key_before != key_after
        ), "Edits should bust the export cache — key must include updated_at"

    def test_key_stable_for_same_updated_at(self) -> None:
        user = _user()
        record = _record("2026-01-01T00:00:00+00:00")
        k1 = _export_object_key(record, user, str(record["id"]), "docx", "commercial")
        k2 = _export_object_key(record, user, str(record["id"]), "docx", "commercial")
        assert k1 == k2

    def test_key_does_not_contain_raw_colon_or_plus(self) -> None:
        """The R2 key must be filesystem-safe — sanitize the timestamp."""
        user = _user()
        record = _record("2026-01-01T00:00:00+00:00")
        key = _export_object_key(record, user, str(record["id"]), "docx", "commercial")
        # No raw ISO punctuation that could trip object-store path handling
        assert ":" not in key
        assert "+" not in key
        # Should still contain the date portion in some form
        assert re.search(r"2026", key)
