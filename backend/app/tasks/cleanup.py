"""Celery tasks for asynchronous cleanup of user-owned R2 objects.

Triggered after a user requests account deletion. The DB rows are already
soft-deleted by the API endpoint; this task removes the corresponding
objects from Cloudflare R2 so we don't pay storage for — or retain — the
tombstoned user's data.

Idempotent: re-running over already-cleared rows is a no-op because missing
keys are skipped and ``delete_prefix`` over an empty namespace deletes nothing.
"""

from __future__ import annotations

import logging
from typing import Any

from app.core.celery_app import celery_app
from app.core.exceptions import ObjectStorageError
from app.services.object_storage import (
    ObjectStorageService,
    get_object_storage_service,
)
from app.tasks._helpers import _get_db_client

logger = logging.getLogger(__name__)


def _iter_user_extractions(db: Any, user_id: str) -> list[dict[str, Any]]:
    """Return every soft-deleted extraction row owned by ``user_id``.

    Only soft-deleted rows are considered; cleaning up a live extraction is
    never the right behavior for an account-deletion cleanup. Selects all
    columns that reference R2 objects so the caller can purge originals, raw
    extraction artifacts, and exports — matching single-extraction deletion.
    """
    result = (
        db.table("extractions")
        .select("id, document_object_key, document_s3_key, raw_extraction_object_keys")
        .eq("user_id", user_id)
        .is_("deleted_at", "not null")
        .execute()
    )
    rows: list[dict[str, Any]] = result.data or []
    return rows


def _extraction_object_keys(row: dict[str, Any]) -> list[str]:
    """Return the explicit (non-prefix) R2 object keys for one extraction row.

    Mirrors ``app.api.v1.extractions._iter_deletion_object_keys`` so account
    deletion purges exactly what single-extraction deletion does: the current
    document object, any legacy ``document_s3_key`` original, and every raw
    extraction artifact. Exports are handled separately via prefix deletion.
    """
    keys: list[str] = []
    seen: set[str] = set()

    def add_key(value: Any) -> None:
        if isinstance(value, str) and value and value not in seen:
            seen.add(value)
            keys.append(value)

    add_key(row.get("document_object_key"))
    add_key(row.get("document_s3_key"))

    raw_keys = row.get("raw_extraction_object_keys")
    if isinstance(raw_keys, list):
        for raw_key in raw_keys:
            add_key(raw_key)

    return keys


@celery_app.task(name="app.tasks.cleanup.cleanup_user_objects", max_retries=3)
def cleanup_user_objects(user_id: str) -> dict[str, Any]:
    """Delete every R2 object owned by ``user_id``'s soft-deleted extractions.

    For each tombstoned extraction this removes the original document, any
    legacy original, all raw extraction artifacts, and the entire export
    namespace (every cache-busting version). Returns a summary dict
    ``{"user_id": ..., "deleted": N, "failed": M}`` where ``deleted`` counts
    explicit object keys removed. Failures on individual keys or export
    prefixes are logged and counted but never abort the batch — one poison-pill
    object must not block the rest of the user's cleanup.
    """
    db = _get_db_client()
    storage = get_object_storage_service()

    rows = _iter_user_extractions(db, user_id)
    deleted = 0
    failed = 0
    for row in rows:
        for key in _extraction_object_keys(row):
            try:
                storage.delete_file(key)
                deleted += 1
            except ObjectStorageError:
                logger.exception(
                    "Failed to delete R2 object during user cleanup",
                    extra={"user_id": user_id, "object_key": key},
                )
                failed += 1

        extraction_id = row.get("id")
        if extraction_id:
            prefix = ObjectStorageService.build_export_prefix(
                user_id, str(extraction_id)
            )
            try:
                storage.delete_prefix(prefix)
            except ObjectStorageError:
                logger.exception(
                    "Failed to delete export namespace during user cleanup",
                    extra={"user_id": user_id, "export_prefix": prefix},
                )
                failed += 1

    logger.info(
        "Cleanup of user objects complete",
        extra={"user_id": user_id, "deleted": deleted, "failed": failed},
    )
    return {"user_id": user_id, "deleted": deleted, "failed": failed}
