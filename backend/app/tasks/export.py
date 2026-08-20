"""Celery task for generating and uploading export documents.

Reads extraction data from the database, generates the requested export
format, uploads to object storage, and returns a presigned download URL.
"""

import logging
from typing import Any

from app.core.celery_app import celery_app
from app.core.exceptions import ExportError
from app.services.exports.word import WordExporter
from app.tasks._helpers import _get_db_client

logger = logging.getLogger(__name__)


def _get_exporters() -> dict[str, type]:
    """Build the exporters registry, importing lazily.

    PDF export requires WeasyPrint system libraries (cairo, pango) which
    may not be installed in all environments. Excel and Word are always
    available.

    Returns:
        Dict mapping format name to exporter class.
    """
    from app.services.exports.excel import ExcelExporter

    exporters: dict[str, type] = {
        "docx": WordExporter,
        "xlsx": ExcelExporter,
    }

    try:
        from app.services.exports.pdf import PdfExporter

        exporters["pdf"] = PdfExporter
    except (ImportError, OSError):
        logger.warning(
            "WeasyPrint unavailable — PDF export disabled. "
            "Install system dependencies (cairo, pango) to enable."
        )

    return exporters


EXPORTERS: dict[str, type] = _get_exporters()


def get_available_export_formats() -> frozenset[str]:
    """Return the export formats that can currently be generated.

    Returns the exact registry the export task dispatches against (the
    module-level ``EXPORTERS`` snapshot), so PDF is excluded when
    WeasyPrint/system libraries were unavailable at import time. Callers (e.g.
    the export API endpoint) use this to reject unsupported formats up front
    rather than dispatching a Celery task that is doomed to raise
    ``ExportError``. Reusing the snapshot — rather than recomputing — guarantees
    the endpoint and the task can never disagree about format availability.
    """
    return frozenset(EXPORTERS)


def _get_object_storage_service() -> Any:
    """Get an object-storage service instance.

    Returns:
        ObjectStorageService instance.
    """
    from app.services.object_storage import get_object_storage_service

    return get_object_storage_service()


@celery_app.task(
    name="app.tasks.export.generate_export",
    max_retries=2,
    default_retry_delay=30,
)
def generate_export(
    extraction_id: str,
    export_format: str = "docx",
    template: str = "commercial",
    user_id: str | None = None,
    anonymous_session_id: str | None = None,
    **_legacy_kwargs: Any,
) -> dict[str, Any]:
    """Generate and upload an export document.

    Steps:
    1. Read extraction from DB (with user_id ownership check if provided)
    2. Verify payment_status == 'paid'
    3. Instantiate the appropriate exporter
    4. Generate the export document
    5. Upload to object storage
    6. Generate a presigned download URL (1 hour)

    Args:
        extraction_id: UUID of the extraction record.
        export_format: Export format (currently only 'docx').
        template: Template name ('commercial', 'office', etc.).
        user_id: Optional user ID for ownership verification.
        **_legacy_kwargs: Accepts deprecated ``format`` kwarg from in-flight
            queue messages.

    Returns:
        Dict with 'url' (presigned download URL) and 'format'.

    Raises:
        ExportError: If the extraction is unpaid or the format is invalid.
    """
    if "format" in _legacy_kwargs:
        export_format = _legacy_kwargs["format"]
    if export_format not in EXPORTERS:
        raise ExportError(f"Unsupported export format: {export_format}")

    db = _get_db_client()
    object_storage = _get_object_storage_service()

    # 1. Read extraction
    query = (
        db.table("extractions")
        .select(
            "id, user_id, anonymous_session_id, payment_status, extracted_data, "
            "confidence_scores, red_flags, document_filename, updated_at"
        )
        .eq("id", extraction_id)
        .is_("deleted_at", "null")
    )
    # Enforce ownership if an owner was provided
    if user_id:
        query = query.eq("user_id", user_id)
    if anonymous_session_id:
        query = query.eq("anonymous_session_id", anonymous_session_id)
    try:
        response = query.single().execute()
    except Exception as exc:
        exc_str = str(exc)
        if any(token in exc_str for token in ("Row not found", "PGRST116", "No rows")):
            raise ExportError(f"Extraction not found: {extraction_id}") from exc
        raise
    record = response.data

    if record is None:
        raise ExportError(f"Extraction not found: {extraction_id}")

    # 2. Verify paid
    if record.get("payment_status") != "paid":
        raise ExportError(
            f"Extraction {extraction_id} is not paid "
            f"(status: {record.get('payment_status')})"
        )

    user_id = record.get("user_id")
    anonymous_session_id = record.get("anonymous_session_id")
    if user_id:
        owner_key = str(user_id)
    elif anonymous_session_id:
        owner_key = f"anon/{anonymous_session_id}"
    else:
        raise ExportError(f"Extraction {extraction_id} has no owner")
    extraction_data: dict[str, Any] = record.get("extracted_data") or {}
    confidence_scores: dict[str, Any] = record.get("confidence_scores") or {}
    red_flags: list[dict[str, Any]] = record.get("red_flags") or []
    document_filename: str = record.get("document_filename") or "lease.pdf"

    # 3. Instantiate exporter
    exporter_class = EXPORTERS[export_format]
    exporter = exporter_class()

    # 4. Generate document
    doc_bytes = exporter.generate(
        extraction_data=extraction_data,
        confidence_scores=confidence_scores,
        red_flags=red_flags,
        template=template,
        document_filename=document_filename,
    )

    # 5. Upload to object storage — key includes an updated_at-derived version
    # segment so the cache-hit key computed by the export endpoint matches what
    # the task writes (and edits, which bump updated_at, bust the cache).
    # Use the class static method (not the possibly-mocked instance) so the
    # version token is a deterministic, sanitized string.
    from app.services.object_storage import ObjectStorageService

    version = ObjectStorageService.export_version_token(record.get("updated_at"))
    object_key = object_storage.upload_export(
        user_id=owner_key,
        extraction_id=extraction_id,
        file_content=doc_bytes,
        format_name=export_format,
        extension=exporter.extension,
        content_type=exporter.content_type,
        template=template,
        version=version,
    )

    # 6. Generate presigned URL
    presigned_url: str = object_storage.generate_presigned_url(object_key, expiry=3600)

    logger.info(
        "Export generated for extraction %s (format=%s, template=%s, size=%d)",
        extraction_id,
        export_format,
        template,
        len(doc_bytes),
    )

    return {
        "url": presigned_url,
        "format": export_format,
        # The version actually used to write the file (the task is the
        # authority — updated_at may have moved since dispatch). The poller
        # surfaces this so the client downloads the exact generated object.
        "version": version,
        "user_id": str(user_id) if user_id else None,
        "anonymous_session_id": (
            str(anonymous_session_id) if anonymous_session_id else None
        ),
    }
