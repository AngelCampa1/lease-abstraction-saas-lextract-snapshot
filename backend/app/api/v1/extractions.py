"""Extraction endpoints: upload, teaser, full results, list, delete, and export.

Accepts multipart PDF upload, validates the file, uploads it to Cloudflare R2,
creates an extraction database row, and dispatches the extraction Celery task.
Also provides read/list/delete endpoints and export generation.
"""

import asyncio
import base64
import hashlib
import hmac
import io
import json
import logging
from datetime import UTC, datetime, timedelta
from datetime import date as date_type
from typing import Any, Literal, cast
from urllib.parse import quote
from uuid import UUID, uuid4

import pypdf
from botocore.exceptions import ClientError
from extract_sdk.schema.lextract_schema import build_lextract_registry
from fastapi import (
    APIRouter,
    Body,
    Depends,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
    status,
)
from fastapi.responses import JSONResponse, StreamingResponse

from app.api.v1.tasks import build_export_task_id
from app.core.config import settings
from app.core.constants import MAX_PDF_PAGES
from app.core.dependencies import OptionalUser
from app.core.exceptions import ObjectStorageError
from app.database.client import NeonClientManager
from app.database.pg_client import PostgrestSingleError
from app.models.enums import ExtractionStatus
from app.models.results import (
    TEASER_BACKFILL_FIELDS,
    TEASER_FIELDS,
    ConfidenceDistribution,
    DocumentUrlResponse,
    EditHistoryItem,
    EditHistoryResponse,
    ExtractionListItem,
    ExtractionListResponse,
    ExtractionStatusResponse,
    FieldEditRequest,
    FieldEditResponse,
    FullResultsResponse,
    LockedCategory,
    TeaserFieldValue,
    TeaserResponse,
)
from app.models.user import AnonymousSession, User
from app.schemas.extraction import (
    CamAuditPayloadResponse,
    ExportResponse,
    ExportTaskResponse,
    UploadResponse,
)
from app.services.camaudit import CamAuditHandoffService
from app.services.exports.templates import DEFAULT_TEMPLATE, FIELD_LABELS, TEMPLATES
from app.services.field_editor import FieldEditorService, FieldTypeError
from app.services.field_text import normalize_field_value
from app.services.object_storage import (
    ObjectStorageService,
    get_object_storage_service,
)
from app.tasks.export import generate_export, get_available_export_formats
from app.tasks.pipeline import run_extraction_pipeline

logger = logging.getLogger(__name__)

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
DOCUMENT_PROXY_TTL_SECONDS = 3600

router = APIRouter(prefix="/extractions", tags=["Extractions"])


def _is_missing_column_error(exc: Exception, column_name: str) -> bool:
    """Return True when a DB error is caused by a missing selected column."""
    exc_str = str(exc).lower()
    return column_name.lower() in exc_str and "column" in exc_str


def _require_auth(
    current_user: User | AnonymousSession | None,
) -> User | AnonymousSession:
    """Raise 401 if the caller is unauthenticated."""
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: Bearer token or X-Session-Token",
        )
    return current_user


def _verify_ownership(
    record: dict[str, Any],
    current_user: User | AnonymousSession,
) -> None:
    """Raise 404 if user doesn't own this extraction.

    Uses 404 instead of 403 to avoid leaking existence of other users'
    extractions.
    """
    if isinstance(current_user, User):
        if str(record.get("user_id")) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Extraction not found",
            )
    else:
        if str(record.get("anonymous_session_id")) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Extraction not found",
            )


def _check_not_deleted(record: dict[str, Any]) -> None:
    """Raise 404 if the extraction has been soft-deleted."""
    if record.get("deleted_at") is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Extraction not found",
        )


def _build_document_owner_claim(record: dict[str, Any]) -> str:
    """Build a stable owner claim for document-proxy tokens."""
    user_id = record.get("user_id")
    if user_id:
        return f"user:{user_id}"
    anonymous_session_id = record.get("anonymous_session_id")
    if anonymous_session_id:
        return f"anon:{anonymous_session_id}"
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Document not found",
    )


def _urlsafe_b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _urlsafe_b64decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def _sign_document_payload(payload_b64: str) -> str:
    signature = hmac.new(
        settings.neon_service_role_key.encode("utf-8"),
        payload_b64.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return _urlsafe_b64encode(signature)


def _build_document_proxy_token(
    extraction_id: str,
    owner_claim: str,
    expires_in: int = DOCUMENT_PROXY_TTL_SECONDS,
) -> str:
    expires_at = int(datetime.now(UTC).timestamp()) + expires_in
    payload = {
        "extraction_id": extraction_id,
        "owner": owner_claim,
        "exp": expires_at,
    }
    payload_b64 = _urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )
    signature = _sign_document_payload(payload_b64)
    return f"{payload_b64}.{signature}"


def _is_valid_document_proxy_token(
    token: str,
    extraction_id: str,
    owner_claim: str,
) -> bool:
    try:
        payload_b64, signature = token.split(".", 1)
    except ValueError:
        return False

    expected_signature = _sign_document_payload(payload_b64)
    if not hmac.compare_digest(signature, expected_signature):
        return False

    try:
        payload = json.loads(_urlsafe_b64decode(payload_b64).decode("utf-8"))
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError):
        return False

    if not isinstance(payload, dict):
        return False

    payload_extraction_id = payload.get("extraction_id")
    payload_owner = payload.get("owner")
    payload_exp = payload.get("exp")

    if (
        not isinstance(payload_extraction_id, str)
        or not isinstance(payload_owner, str)
        or not isinstance(payload_exp, int)
    ):
        return False

    if payload_extraction_id != extraction_id or payload_owner != owner_claim:
        return False

    return payload_exp >= int(datetime.now(UTC).timestamp())


def _build_content_disposition(filename: str) -> str:
    """Build a safe Content-Disposition value for inline PDF viewing."""
    fallback = "".join(
        ch
        for ch in filename
        if ch.isprintable() and ch not in {'"', "\\", "\r", "\n", ";"}
    ).strip()
    if not fallback:
        fallback = "document.pdf"
    encoded = quote(filename, safe="")
    return f"""inline; filename="{fallback}"; filename*=UTF-8''{encoded}"""


def _get_forwarded_header_value(value: str | None) -> str | None:
    if not value:
        return None
    first_value = value.split(",", 1)[0].strip()
    return first_value or None


def _is_local_host(host: str) -> bool:
    hostname = host.split(":", 1)[0].lower()
    return hostname in {"127.0.0.1", "localhost", "testserver"}


def _build_external_base_url(request: Request) -> str:
    """Build an absolute origin that respects trusted proxy headers."""
    forwarded_proto = _get_forwarded_header_value(
        request.headers.get("x-forwarded-proto")
    )
    forwarded_host = _get_forwarded_header_value(
        request.headers.get("x-forwarded-host") or request.headers.get("host")
    )

    if forwarded_proto in {"http", "https"} and forwarded_host:
        return f"{forwarded_proto}://{forwarded_host}"

    if (
        settings.environment == "production"
        and forwarded_host
        and not _is_local_host(forwarded_host)
    ):
        return f"https://{forwarded_host}"

    return str(request.base_url).rstrip("/")


def _fetch_extraction(
    extraction_id: str,
    columns: str = "*",
    *,
    include_deleted: bool = False,
) -> dict[str, Any]:
    """Fetch a single extraction row by ID, raising 404 if not found.

    By default soft-deleted rows are treated as missing (404). Pass
    ``include_deleted=True`` to surface them — callers that need
    idempotent behavior on already-deleted rows (e.g. DELETE) use this.
    """
    try:
        UUID(extraction_id)
    except (ValueError, TypeError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Extraction not found",
        ) from None
    db = NeonClientManager.get_service_client()
    try:
        if include_deleted:
            result = (
                db.table("extractions")
                .select(columns)
                .eq("id", extraction_id)
                .single()
                .execute()
            )
        else:
            result = (
                db.table("extractions")
                .select(columns)
                .eq("id", extraction_id)
                .is_("deleted_at", "null")
                .single()
                .execute()
            )
    except Exception as exc:
        # Only mask as 404 for PostgREST "no rows" errors
        # Let infrastructure errors (ConnectionError, TimeoutError) propagate
        exc_str = str(exc)
        if isinstance(exc, PostgrestSingleError) or any(
            s in exc_str
            for s in [
                "PGRST116",
                "No rows",
                "0 rows",
                "invalid_text_representation",
                "invalid UUID",
                "22P02",
            ]
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Extraction not found",
            )
        logger.error("Database error fetching extraction %s: %s", extraction_id, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service temporarily unavailable",
        )

    record = cast(dict[str, Any] | None, result.data)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Extraction not found",
        )
    if not record.get("document_object_key") and record.get("document_s3_key"):
        # Keep reads compatible during rollout in case legacy rows or a
        # partially migrated schema still only expose the old column.
        record = dict(record)
        record["document_object_key"] = record["document_s3_key"]
    return record


def _insert_extraction_row(
    *,
    db: Any,
    extraction_id: str,
    user_id: str | None,
    anonymous_session_id: str | None,
    filename: str,
    object_key: str,
) -> Any:
    """Insert an extraction row with rollout-safe storage-key compatibility."""
    base_payload: dict[str, Any] = {
        "id": extraction_id,
        "user_id": user_id,
        "anonymous_session_id": anonymous_session_id,
        "status": "uploading",
        "document_filename": filename,
    }

    try:
        return (
            db.table("extractions")
            .insert({**base_payload, "document_object_key": object_key})
            .execute()
        )
    except Exception as exc:
        if not _is_missing_column_error(exc, "document_object_key"):
            raise

    return (
        db.table("extractions")
        .insert({**base_payload, "document_s3_key": object_key})
        .execute()
    )


def _compute_confidence_distribution(
    confidence_scores: dict[str, Any] | None,
    total_fields: int | None = None,
) -> ConfidenceDistribution:
    """Count fields by confidence tier (high/medium/low/not_found).

    not_found fields are absent from the lease document and are counted
    separately so they do not inflate the low count.

    When ``total_fields`` is supplied, ``not_found`` is anchored to the
    canonical schema size: every field the model never emitted is treated as
    not found, so the four tiers always sum to ``total_fields`` (e.g. 126).
    This keeps the teaser chart and the advertised field count from drifting
    below the number quoted in marketing copy. The anchor only applies when
    some scores are present, so an empty/missing distribution stays all-zero.
    """
    high = 0
    medium = 0
    low = 0
    not_found = 0
    if confidence_scores:
        for name, field_data in confidence_scores.items():
            # Skip synthetic meta entries (e.g. ``_overall``) — they are
            # aggregates, not fields, and must not inflate the distribution
            # total beyond the field count shown elsewhere on the teaser.
            if name.startswith("_"):
                continue
            if isinstance(field_data, dict):
                tier = field_data.get("tier", "low")
            else:
                tier = "low"
            if tier == "high":
                high += 1
            elif tier == "medium":
                medium += 1
            elif tier == "not_found":
                not_found += 1
            else:
                low += 1
        if total_fields is not None:
            # Fields the model never returned (not even as an explicit
            # not_found entry) are genuinely "not in lease" — fold them into
            # not_found so the chart totals the full canonical schema size.
            not_found = max(0, total_fields - high - medium - low)
    return ConfidenceDistribution(
        high=high, medium=medium, low=low, not_found=not_found
    )


def _compute_overall_confidence(
    confidence_scores: dict[str, Any] | None,
) -> float | None:
    """Compute the average confidence score across extracted fields only.

    not_found fields (absent from the document) are excluded so they do not
    drag the overall score toward zero.
    """
    if not confidence_scores:
        return None
    scores: list[float] = []
    for name, field_data in confidence_scores.items():
        # Skip synthetic meta entries (e.g. ``_overall``) so the aggregate is
        # never averaged back into the per-field mean.
        if name.startswith("_"):
            continue
        if isinstance(field_data, dict) and "score" in field_data:
            if field_data.get("tier") == "not_found":
                continue
            scores.append(float(field_data["score"]))
    if not scores:
        return None
    return round(sum(scores) / len(scores), 2)


def _extract_field_value(field_entry: object) -> str | None:
    """Extract a clean display value from a field entry (dict or raw)."""
    if isinstance(field_entry, dict):
        return normalize_field_value(field_entry.get("value"))
    return normalize_field_value(field_entry)


def _build_teaser_fields(
    extracted_data: dict[str, Any] | None,
) -> list[TeaserFieldValue]:
    """Build teaser fields from found values only, capped at 5.

    Selection order, all restricted to fields that actually have a value
    (no "Not found" padding):

    1. Primary priority fields (:data:`TEASER_FIELDS`) — parties, address,
       commencement, rent.
    2. Curated high-value lease terms (:data:`TEASER_BACKFILL_FIELDS`).
    3. Any other content-bearing (non-boolean) field, in document order.
    4. Boolean yes/no flags last — they make weak preview cards, so they
       only fill slots no richer field can.
    """
    if not extracted_data:
        return []

    found: dict[str, str] = {}
    bool_fields: set[str] = set()
    for name, entry in extracted_data.items():
        value = _extract_field_value(entry)
        if value is None:
            continue
        found[name] = value
        raw = entry.get("value") if isinstance(entry, dict) else entry
        if isinstance(raw, bool):
            bool_fields.add(name)

    used: set[str] = set()
    priority = [name for name in TEASER_FIELDS if name in found]
    used.update(priority)
    secondary = [
        name for name in TEASER_BACKFILL_FIELDS if name in found and name not in used
    ]
    used.update(secondary)
    text_remaining = [
        name for name in found if name not in used and name not in bool_fields
    ]
    used.update(text_remaining)
    bool_remaining = [name for name in found if name not in used]
    selected = (priority + secondary + text_remaining + bool_remaining)[:5]

    return [
        TeaserFieldValue(
            field_name=name,
            label=FIELD_LABELS.get(name, name.replace("_", " ").title()),
            value=found[name],
        )
        for name in selected
    ]


def _schema_category_count() -> int:
    """Return category count from the canonical extraction schema."""
    return len(build_lextract_registry().categories)


def _build_locked_categories(
    visible_fields: list[TeaserFieldValue],
) -> list[LockedCategory]:
    """Compute the schema categories locked behind payment in the teaser.

    For every category in the canonical field-schema registry, count the
    fields that are NOT shown in the teaser preview (the ``visible_fields``).
    A category with at least one locked field is returned with its locked
    field count, so the frontend can render real category names and counts
    instead of synthetic placeholders.

    Categories whose every field is already visible are omitted (their locked
    count would be zero).
    """
    visible_names = {field.field_name for field in visible_fields}
    registry = build_lextract_registry()

    locked: list[LockedCategory] = []
    for category in registry.categories:
        category_fields = registry.get_fields_by_category(category)
        locked_count = sum(
            1 for field in category_fields if field.field_name not in visible_names
        )
        if locked_count > 0:
            locked.append(LockedCategory(name=category, field_count=locked_count))

    return locked


@router.get("/{extraction_id}/teaser", response_model=TeaserResponse)
async def get_extraction_teaser(
    extraction_id: str,
    current_user: OptionalUser,
) -> TeaserResponse:
    """Get a teaser preview of extraction results.

    Returns 5 key fields, confidence distribution, and red flag count.
    Available before payment.
    """
    authed_user = _require_auth(current_user)
    record = _fetch_extraction(
        extraction_id,
        "id, user_id, anonymous_session_id, deleted_at, status, payment_status,"
        " document_filename, document_page_count, extracted_data, confidence_scores,"
        " red_flags, error_message",
    )
    _verify_ownership(record, authed_user)
    _check_not_deleted(record)

    extracted_data: dict[str, Any] | None = record.get("extracted_data")
    confidence_scores: dict[str, Any] | None = record.get("confidence_scores")
    red_flags: list[dict[str, Any]] = record.get("red_flags") or []

    visible_fields = _build_teaser_fields(extracted_data)
    locked_categories = _build_locked_categories(visible_fields) or None
    # Anchor the advertised total to the canonical schema size (126) so the
    # teaser never quotes fewer fields than the marketing copy, even when the
    # model omits some keys from its response.
    total_field_count = build_lextract_registry().field_count
    confidence_distribution = _compute_confidence_distribution(
        confidence_scores, total_fields=total_field_count
    )
    category_count = _schema_category_count()

    # Compute red flag severity and category breakdowns for the teaser UI.
    red_flag_severity_high = (
        sum(
            1
            for f in red_flags
            if isinstance(f, dict) and str(f.get("severity", "")).upper() == "HIGH"
        )
        or None
    )
    seen_categories: list[str] = []
    for f in red_flags:
        if isinstance(f, dict):
            cat = f.get("category") or f.get("name")
            if cat and cat not in seen_categories:
                seen_categories.append(str(cat))
    red_flag_categories = seen_categories if seen_categories else None

    return TeaserResponse(
        id=str(record["id"]),
        status=record["status"],
        payment_status=record["payment_status"],
        document_filename=record["document_filename"],
        document_page_count=record.get("document_page_count"),
        visible_fields=visible_fields,
        total_field_count=total_field_count,
        category_count=category_count,
        confidence_distribution=confidence_distribution,
        red_flag_count=len(red_flags),
        red_flag_severity_high=red_flag_severity_high,
        red_flag_categories=red_flag_categories,
        locked_categories=locked_categories,
        error_message=record.get("error_message"),
    )


@router.get("/{extraction_id}/status", response_model=ExtractionStatusResponse)
async def get_extraction_status(
    extraction_id: str,
    current_user: OptionalUser,
) -> ExtractionStatusResponse:
    """Get processing status without requiring payment."""
    authed_user = _require_auth(current_user)
    record = _fetch_extraction(
        extraction_id,
        "id, user_id, anonymous_session_id, deleted_at, status, payment_status,"
        " document_filename, document_page_count, error_message",
    )
    _verify_ownership(record, authed_user)
    _check_not_deleted(record)

    return ExtractionStatusResponse(
        id=str(record["id"]),
        status=record["status"],
        payment_status=record["payment_status"],
        document_filename=record["document_filename"],
        document_page_count=record.get("document_page_count"),
        error_message=record.get("error_message"),
    )


@router.post("/{extraction_id}/cancel", response_model=ExtractionStatusResponse)
async def cancel_extraction(
    extraction_id: str,
    current_user: OptionalUser,
) -> ExtractionStatusResponse:
    """Cancel an in-progress extraction and stop processing-page polling."""
    authed_user = _require_auth(current_user)
    record = _fetch_extraction(extraction_id)
    _verify_ownership(record, authed_user)
    _check_not_deleted(record)

    if record.get("status") in {
        ExtractionStatus.COMPLETE.value,
        ExtractionStatus.FAILED.value,
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Extraction is already complete",
        )

    error_message = "Processing cancelled by user"
    now = datetime.now(UTC).isoformat()
    db = NeonClientManager.get_service_client()
    result = (
        db.table("extractions")
        .update(
            {
                "status": ExtractionStatus.FAILED.value,
                "error_message": error_message,
                "processing_completed_at": now,
                "updated_at": now,
            }
        )
        .eq("id", extraction_id)
        .eq("status", str(record["status"]))
        .is_("deleted_at", "null")
        .execute()
    )

    updated_rows = getattr(result, "data", None)
    if not updated_rows or not isinstance(updated_rows, list):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Extraction status changed before cancellation could be saved",
        )

    updated = updated_rows[0]
    return ExtractionStatusResponse(
        id=str(record["id"]),
        status=str(updated.get("status") or ExtractionStatus.FAILED.value),
        payment_status=record["payment_status"],
        document_filename=record["document_filename"],
        document_page_count=record.get("document_page_count"),
        error_message=str(updated.get("error_message") or error_message),
    )


@router.post(
    "/{extraction_id}/retry",
    response_model=ExtractionStatusResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def retry_extraction(
    extraction_id: str,
    current_user: OptionalUser,
) -> JSONResponse:
    """Re-run the extraction pipeline for a failed extraction.

    Only extractions whose current status is ``failed`` may be retried. The
    status is reset to ``extracting`` and the Celery pipeline chain is
    re-dispatched. Returns 409 if the extraction is in any other state.
    """
    authed_user = _require_auth(current_user)
    record = _fetch_extraction(extraction_id)
    _verify_ownership(record, authed_user)
    _check_not_deleted(record)

    current_status = record.get("status")
    if current_status != ExtractionStatus.FAILED.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Only failed extractions can be retried "
                f"(current status: {current_status})."
            ),
        )

    now_iso = datetime.now(UTC).isoformat()
    db = NeonClientManager.get_service_client()
    update_result = (
        db.table("extractions")
        .update(
            {
                "status": ExtractionStatus.EXTRACTING.value,
                "error_message": None,
                # Clear stale results from the prior run. get_extraction_full
                # gates only on payment_status, not status, so a paid
                # extraction mid-retry would otherwise serve last run's data
                # until the new pipeline overwrites it.
                "extracted_data": None,
                "confidence_scores": None,
                "overall_confidence": None,
                "red_flags": None,
                "show_camaudit": None,
                "updated_at": now_iso,
            }
        )
        .eq("id", extraction_id)
        .eq("status", ExtractionStatus.FAILED.value)
        .is_("deleted_at", "null")
        .execute()
    )

    if not getattr(update_result, "data", None):
        # CAS lost — somebody else changed the status between the fetch and
        # the update (e.g. a parallel retry or the stuck-job cleanup task).
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Extraction status changed before retry could be dispatched",
        )

    try:
        await asyncio.to_thread(run_extraction_pipeline, extraction_id)
    except Exception as exc:
        logger.error(
            "Failed to re-dispatch extraction pipeline for %s: %s: %s",
            extraction_id,
            type(exc).__name__,
            exc,
        )
        # Best-effort rollback to failed so the user is not stuck looking at
        # a processing spinner for a retry that never made it to the queue.
        try:
            db.table("extractions").update(
                {
                    "status": ExtractionStatus.FAILED.value,
                    "error_message": (
                        "We couldn't restart processing for this lease. "
                        "Please try again."
                    ),
                    "updated_at": datetime.now(UTC).isoformat(),
                }
            ).eq("id", extraction_id).eq(
                "status", ExtractionStatus.EXTRACTING.value
            ).execute()
        except Exception:
            logger.exception("Failed to roll back retry status for %s", extraction_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Extraction service temporarily unavailable - please try again",
        ) from exc

    body = ExtractionStatusResponse(
        id=str(record["id"]),
        status=ExtractionStatus.EXTRACTING.value,
        payment_status=record["payment_status"],
        document_filename=record["document_filename"],
        document_page_count=record.get("document_page_count"),
        error_message=None,
    )
    return JSONResponse(
        status_code=status.HTTP_202_ACCEPTED,
        content=body.model_dump(),
    )


@router.get("/{extraction_id}", response_model=FullResultsResponse)
async def get_extraction_full(
    extraction_id: str,
    current_user: OptionalUser,
) -> FullResultsResponse:
    """Get full extraction results. Requires payment (payment_status='paid').

    Returns 403 if the extraction has not been paid for.
    """
    authed_user = _require_auth(current_user)
    record = _fetch_extraction(extraction_id)
    _verify_ownership(record, authed_user)
    _check_not_deleted(record)

    if record.get("payment_status") != "paid":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Payment required to access full results",
        )

    confidence_scores: dict[str, Any] | None = record.get("confidence_scores")
    # Use pre-computed overall confidence from DB (set by scoring task)
    overall_confidence = record.get("overall_confidence")
    if overall_confidence is None:
        overall_confidence = _compute_overall_confidence(confidence_scores)

    return FullResultsResponse(
        id=str(record["id"]),
        status=record["status"],
        payment_status=record["payment_status"],
        document_filename=record["document_filename"],
        document_page_count=record.get("document_page_count"),
        property_type=record.get("property_type"),
        extracted_data=record.get("extracted_data") or {},
        confidence_scores=confidence_scores or {},
        red_flags=record.get("red_flags") or [],
        show_camaudit=bool(record.get("show_camaudit")),
        overall_confidence=overall_confidence,
        created_at=str(record["created_at"]),
        updated_at=str(record["updated_at"]),
    )


@router.get("", response_model=ExtractionListResponse)
async def list_extractions(
    current_user: OptionalUser,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    status_filter: str | None = Query(default=None, alias="status"),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    sort: Literal["asc", "desc"] = Query(default="desc"),
) -> ExtractionListResponse:
    """List extractions for the current user with pagination.

    Supports optional status filtering, date range filtering, and sort
    direction. Excludes soft-deleted extractions.
    """
    authed_user = _require_auth(current_user)

    db = NeonClientManager.get_service_client()

    columns = (
        "id, document_filename, status, payment_status," " property_type, created_at"
    )

    query = db.table("extractions").select(columns, count="exact")

    if isinstance(authed_user, User):
        query = query.eq("user_id", str(authed_user.id))
    else:
        query = query.eq("anonymous_session_id", str(authed_user.id))

    query = query.is_("deleted_at", "null")

    if status_filter:
        valid_statuses = {s.value for s in ExtractionStatus}
        if status_filter not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Invalid status filter. Valid values: "
                    f"{', '.join(sorted(valid_statuses))}"
                ),
            )
        query = query.eq("status", status_filter)

    if date_from:
        try:
            date_type.fromisoformat(date_from)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date_from format. Expected YYYY-MM-DD.",
            ) from exc
        query = query.gte("created_at", date_from)
    if date_to:
        try:
            parsed_to = date_type.fromisoformat(date_to)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date_to format. Expected YYYY-MM-DD.",
            ) from exc
        next_day = (parsed_to + timedelta(days=1)).isoformat()
        query = query.lt("created_at", next_day)

    query = query.order("created_at", desc=(sort == "desc"))
    result = query.limit(limit).offset(offset).execute()

    rows = cast(list[dict[str, Any]], result.data or [])
    count_val = result.count
    total: int = count_val if count_val is not None else len(rows)

    items = [
        ExtractionListItem(
            id=str(row["id"]),
            document_filename=row["document_filename"],
            status=row["status"],
            payment_status=row["payment_status"],
            property_type=row.get("property_type"),
            created_at=str(row["created_at"]),
        )
        for row in rows
    ]

    return ExtractionListResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.delete("/{extraction_id}", status_code=204)
async def delete_extraction(
    extraction_id: str,
    current_user: OptionalUser,
) -> Response:
    """Delete an extraction's stored objects, then soft-delete its DB row.

    Returns 204 No Content on success.
    """
    authed_user = _require_auth(current_user)
    # Include soft-deleted rows so a retried DELETE is idempotent (returns 204)
    # rather than misleadingly 404 after the first successful delete.
    record = _fetch_extraction(extraction_id, include_deleted=True)
    _verify_ownership(record, authed_user)

    if record.get("deleted_at") is not None:
        # Already soft-deleted — storage objects were purged on the original
        # request. Returning 204 keeps clients that retry on network errors
        # from receiving a confusing 404 and from re-running object cleanup.
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    try:
        _delete_extraction_objects(record, authed_user, extraction_id)
    except ObjectStorageError as exc:
        logger.error(
            "Failed to delete stored objects for extraction %s: %s",
            extraction_id,
            exc.message,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document deletion temporarily unavailable",
        ) from exc

    db = NeonClientManager.get_service_client()
    db.table("extractions").update({"deleted_at": datetime.now(UTC).isoformat()}).eq(
        "id", extraction_id
    ).execute()

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/upload", response_model=UploadResponse, status_code=201)
async def upload_extraction(
    file: UploadFile,
    current_user: OptionalUser,
) -> UploadResponse:
    """Upload a PDF for lease extraction.

    Validates the file (PDF only, max 50MB), uploads to object storage, creates a
    database row, and dispatches the extraction background task.

    Works with both JWT-authenticated users and anonymous sessions.
    Returns 401 if no authentication is provided.
    """
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: Bearer token or X-Session-Token",
        )

    # Accept application/pdf and common variants (e.g., application/x-pdf,
    # application/pdf; charset=utf-8). Magic bytes are the authoritative check below.
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type not in ("application/pdf", "application/x-pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid file type: {file.content_type}. "
                "Only PDF files are accepted."
            ),
        )

    # Bug #57: Read in 1 MB chunks and reject as soon as MAX_FILE_SIZE is
    # exceeded. The previous code loaded the entire upload into memory before
    # checking size, enabling a DoS via a large malicious upload.
    chunks: list[bytes] = []
    total_size = 0
    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        total_size += len(chunk)
        if total_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File exceeds the maximum size limit of 50 MB.",
            )
        chunks.append(chunk)
    file_bytes = b"".join(chunks)
    if not file_bytes[:5].startswith(b"%PDF-"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file: not a valid PDF document.",
        )

    # Reject documents with more pages than the pipeline can reasonably handle
    # before any object-storage upload or Celery dispatch is incurred. If pypdf
    # cannot parse the file (e.g. encrypted, corrupted), allow the upload to
    # proceed so the downstream extraction task surfaces a meaningful failure
    # rather than a misleading 422 here.
    try:
        page_count = len(pypdf.PdfReader(io.BytesIO(file_bytes)).pages)
    except Exception:  # noqa: BLE001 — pypdf raises many error types
        page_count = None
    if page_count is not None and page_count > MAX_PDF_PAGES:
        raise HTTPException(
            status_code=422,
            detail=(
                f"PDF has {page_count} pages, which exceeds the "
                f"{MAX_PDF_PAGES}-page limit. Please split the document and "
                "upload each section separately."
            ),
        )

    extraction_id = str(uuid4())

    user_id: str | None = None
    anonymous_session_id: str | None = None
    owner_key: str

    if isinstance(current_user, User):
        user_id = str(current_user.id)
        owner_key = user_id
    else:
        anonymous_session_id = str(current_user.id)
        owner_key = f"anon/{anonymous_session_id}"

    object_storage = get_object_storage_service()
    try:
        object_key = object_storage.upload_file(
            owner_key,
            extraction_id,
            file_bytes,
            "application/pdf",
        )
    except ObjectStorageError as exc:
        logger.error(
            "Object storage upload failed for extraction %s: %s",
            extraction_id,
            exc.message,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="File upload failed — please try again",
        ) from exc

    filename = file.filename or "upload.pdf"
    db = NeonClientManager.get_service_client()
    try:
        insert_result = _insert_extraction_row(
            db=db,
            extraction_id=extraction_id,
            user_id=user_id,
            anonymous_session_id=anonymous_session_id,
            filename=filename,
            object_key=object_key,
        )
    except Exception as exc:
        logger.error(
            "Failed to insert extraction %s after object upload: %s: %s",
            extraction_id,
            type(exc).__name__,
            exc,
        )
        _cleanup_uploaded_file(object_storage, object_key, extraction_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create extraction record - please try again",
        ) from exc

    if not insert_result.data:
        logger.error(
            "Extraction insert returned no data for %s - row may not have been created",
            extraction_id,
        )
        _cleanup_uploaded_file(object_storage, object_key, extraction_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create extraction record - please try again",
        )

    # Dispatch pipeline via thread to avoid blocking the async event loop —
    # run_extraction_pipeline calls Celery's apply_async which is a sync Redis call.
    try:
        await asyncio.to_thread(run_extraction_pipeline, extraction_id)
    except Exception as exc:
        logger.error(
            "Failed to dispatch extraction pipeline for %s: %s: %s",
            extraction_id,
            type(exc).__name__,
            exc,
        )
        _mark_upload_failed(
            extraction_id,
            "We couldn't start processing this upload. Please try again.",
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Extraction service temporarily unavailable - please try again",
        ) from exc

    logger.info(
        "Upload started for extraction %s (owner=%s, file=%s)",
        extraction_id,
        owner_key,
        filename,
    )

    return UploadResponse(extraction_id=extraction_id, status="uploading")


SUPPORTED_EXPORT_FORMATS = {"docx", "pdf", "xlsx"}
EXPORT_CONTENT_TYPES = {
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "pdf": "application/pdf",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


def _export_owner_id(record: dict[str, Any], fallback_user_id: str) -> str:
    """Return the storage owner prefix for an extraction export."""
    if record.get("user_id"):
        return str(record["user_id"])
    if record.get("anonymous_session_id"):
        return f"anon/{record['anonymous_session_id']}"
    return fallback_user_id


def _export_object_key(
    record: dict[str, Any],
    authed_user: User | AnonymousSession,
    extraction_id: str,
    export_format: str,
    template: str,
    version: str | None = None,
) -> str:
    """Build the export object key.

    When ``version`` is given it is used (after sanitization) instead of the
    record's ``updated_at``-derived token. This lets the download endpoint
    stream the exact file a prior export produced even after a later field
    edit bumped ``updated_at`` — fixing the edit-after-export 404 race.
    Sanitizing through :meth:`export_version_token` strips any path-traversal
    characters from the client-supplied value.
    """
    owner_id = _export_owner_id(record, str(authed_user.id))
    resolved_version = ObjectStorageService.export_version_token(
        version if version else record.get("updated_at")
    )
    return ObjectStorageService.build_export_key(
        user_id=owner_id,
        extraction_id=extraction_id,
        format_name=export_format,
        extension=export_format,
        template=_normalize_export_template(template),
        version=resolved_version,
    )


def _iter_deletion_object_keys(
    record: dict[str, Any],
    authed_user: User | AnonymousSession,
    extraction_id: str,
) -> list[str]:
    """Return explicit object keys (document + raw artifacts) to remove.

    Export objects are NOT enumerated here — they live under a single prefix
    (see :func:`_delete_extraction_objects`) and are purged wholesale so that
    every cache-busting version produced by field edits is cleaned, not just
    the current one.
    """
    keys: list[str] = []
    seen: set[str] = set()

    def add_key(value: Any) -> None:
        if isinstance(value, str) and value and value not in seen:
            seen.add(value)
            keys.append(value)

    add_key(record.get("document_object_key"))
    add_key(record.get("document_s3_key"))

    raw_keys = record.get("raw_extraction_object_keys")
    if isinstance(raw_keys, list):
        for raw_key in raw_keys:
            add_key(raw_key)

    return keys


def _delete_extraction_objects(
    record: dict[str, Any],
    authed_user: User | AnonymousSession,
    extraction_id: str,
) -> None:
    """Delete original, raw, and export objects before the DB row is hidden."""
    object_storage = get_object_storage_service()
    for object_key in _iter_deletion_object_keys(record, authed_user, extraction_id):
        object_storage.delete_file(object_key)

    # Purge the entire export namespace for this extraction in one shot. This
    # covers every cache-busting version (each field edit bumps updated_at and
    # yields a fresh export key), which per-key enumeration would miss.
    owner_id = _export_owner_id(record, str(authed_user.id))
    object_storage.delete_prefix(
        ObjectStorageService.build_export_prefix(owner_id, extraction_id)
    )


def _normalize_export_template(template: str) -> str:
    """Return a known export template name, matching exporter fallback behavior."""
    return template if template in TEMPLATES else DEFAULT_TEMPLATE


@router.post(
    "/{extraction_id}/export/{export_format}",
    response_model=ExportResponse | ExportTaskResponse,
    responses={
        200: {"model": ExportResponse, "description": "Cached export URL"},
        202: {"model": ExportTaskResponse, "description": "Export generation started"},
    },
)
async def export_extraction(
    extraction_id: str,
    export_format: str,
    current_user: OptionalUser,
    template: str = Body(default="commercial", embed=True),
) -> Any:
    """Export an extraction as a downloadable document.

    If an export already exists in object storage (cache hit), returns a 200 with
    a presigned download URL. Otherwise dispatches a background task
    and returns 202 with the task ID.

    Requires authentication and a paid extraction.
    """
    # 1. Validate format
    if export_format not in SUPPORTED_EXPORT_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported export format: {export_format}. "
                f"Supported formats: {', '.join(sorted(SUPPORTED_EXPORT_FORMATS))}"
            ),
        )

    # 1b. Reject formats that are recognized but not currently generatable
    # (e.g. PDF when WeasyPrint/system libs are unavailable). Returning 400 here
    # avoids dispatching a Celery task that would only fail downstream.
    available_formats = get_available_export_formats()
    if export_format not in available_formats:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Export format '{export_format}' is not available on this "
                "server. Available formats: "
                f"{', '.join(sorted(available_formats))}"
            ),
        )

    # 2. Auth, fetch, ownership
    authed_user = _require_auth(current_user)
    record = _fetch_extraction(extraction_id)
    _verify_ownership(record, authed_user)

    # 3. Verify payment
    if record.get("payment_status") != "paid":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Export requires a paid extraction",
        )

    # 5. Check for cached export in object storage
    object_storage = get_object_storage_service()
    normalized_template = _normalize_export_template(template)
    dispatch_version = ObjectStorageService.export_version_token(
        record.get("updated_at")
    )
    object_key = _export_object_key(
        record,
        authed_user,
        extraction_id,
        export_format,
        normalized_template,
        version=dispatch_version,
    )

    cached_url = _try_presigned_url(object_storage, object_key)
    if cached_url is not None:
        return ExportResponse(
            url=cached_url, format=export_format, version=dispatch_version
        )

    # 6. Dispatch background task (via thread to avoid blocking async event loop)
    task_id = build_export_task_id(
        authed_user, f"{extraction_id}:{normalized_template}:{export_format}"
    )
    task_kwargs: dict[str, Any] = {
        "extraction_id": extraction_id,
        "export_format": export_format,
        "template": normalized_template,
    }
    if isinstance(authed_user, User):
        task_kwargs["user_id"] = str(authed_user.id)
    else:
        task_kwargs["anonymous_session_id"] = str(authed_user.id)

    try:
        task = await asyncio.to_thread(
            generate_export.apply_async,
            kwargs=task_kwargs,
            task_id=task_id,
        )
    except Exception as exc:
        exc_type = type(exc).__name__
        logger.error(
            "Failed to dispatch export task for %s: %s: %s",
            extraction_id,
            exc_type,
            exc,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Export service temporarily unavailable — please try again",
        ) from exc

    return JSONResponse(
        status_code=status.HTTP_202_ACCEPTED,
        content=ExportTaskResponse(
            task_id=str(task.id) if hasattr(task, "id") else "pending",
            status="generating",
            version=dispatch_version,
        ).model_dump(),
    )


@router.get("/{extraction_id}/export/{export_format}/download")
async def download_export(
    extraction_id: str,
    export_format: str,
    current_user: OptionalUser,
    template: str = Query(default=DEFAULT_TEMPLATE),
    version: str | None = Query(default=None),
) -> StreamingResponse:
    """Stream an existing export through the API origin.

    This avoids making the browser fetch signed R2 URLs directly, which depends
    on bucket CORS and can fail even when direct navigation works.

    ``version`` pins the streamed object to a specific export version. The
    client obtains it from the export POST response (cache hit) or the
    task-status poll (async generation) and passes it back here, so the file
    that was generated is streamed even if a later field edit has since bumped
    the extraction's ``updated_at``. Without it the key is recomputed from the
    current ``updated_at`` and a post-export edit yields a spurious 404.
    """
    if export_format not in SUPPORTED_EXPORT_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported export format: {export_format}. "
                f"Supported formats: {', '.join(sorted(SUPPORTED_EXPORT_FORMATS))}"
            ),
        )

    authed_user = _require_auth(current_user)
    record = _fetch_extraction(extraction_id)
    _verify_ownership(record, authed_user)

    if record.get("payment_status") != "paid":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Export requires a paid extraction",
        )

    object_storage = get_object_storage_service()
    object_key = _export_object_key(
        record, authed_user, extraction_id, export_format, template, version=version
    )
    try:
        if not object_storage.object_exists(object_key):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Export file not found",
            )
        stream, stored_content_type = object_storage.stream_file(object_key)
    except HTTPException:
        raise
    except (ClientError, ObjectStorageError) as exc:
        logger.error(
            "Failed to stream export for %s (%s): %s",
            extraction_id,
            export_format,
            exc,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Export download temporarily unavailable - please try again",
        ) from exc

    filename = f"lease-abstraction-report.{export_format}"
    content_type = stored_content_type or EXPORT_CONTENT_TYPES[export_format]
    return StreamingResponse(
        stream,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _try_presigned_url(
    object_storage: ObjectStorageService, object_key: str
) -> str | None:
    """Attempt to generate a presigned URL for an existing object.

    Returns the URL if the object exists, or None if it does not.
    Only catches object-storage-specific errors; infrastructure errors propagate.

    Args:
        object_storage: Object storage service instance.
        object_key: The object key to check.

    Returns:
        Presigned URL string, or None.
    """
    try:
        if not object_storage.object_exists(object_key):
            return None
        return object_storage.generate_presigned_url(object_key, expiry=3600)
    except (ObjectStorageError, ClientError):
        return None


def _cleanup_uploaded_file(
    object_storage: ObjectStorageService,
    object_key: str,
    extraction_id: str,
) -> None:
    """Best-effort removal of an uploaded PDF after a later failure."""
    try:
        object_storage.delete_file(object_key)
    except ObjectStorageError as exc:
        logger.warning(
            "Failed to clean up uploaded file for extraction %s: %s",
            extraction_id,
            exc.message,
        )


def _mark_upload_failed(extraction_id: str, error_message: str) -> None:
    """Best-effort transition for uploads that fail before the pipeline starts."""
    try:
        NeonClientManager.get_service_client().table("extractions").update(
            {
                "status": ExtractionStatus.FAILED.value,
                "error_message": error_message,
                "updated_at": datetime.now(UTC).isoformat(),
            }
        ).eq("id", extraction_id).eq(
            "status", ExtractionStatus.UPLOADING.value
        ).execute()
    except Exception:
        logger.exception(
            "Failed to mark extraction %s as failed after upload dispatch error",
            extraction_id,
        )


@router.patch("/{extraction_id}/fields", response_model=FieldEditResponse)
async def edit_extraction_field(
    extraction_id: str,
    body: FieldEditRequest,
    current_user: OptionalUser,
) -> FieldEditResponse:
    """Edit a single extracted field value.

    Creates an immutable audit trail entry and re-evaluates red flags.
    Requires a registered user account (not anonymous) and a paid extraction.
    """
    authed_user = _require_auth(current_user)
    record = _fetch_extraction(extraction_id)
    _verify_ownership(record, authed_user)
    _check_not_deleted(record)

    # Must be a registered User, not anonymous
    if not isinstance(authed_user, User):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Field editing requires a registered account",
        )

    # Must be paid
    if record.get("payment_status") != "paid":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Editing requires a paid extraction",
        )

    # Validate field name
    try:
        FieldEditorService.validate_field_name(body.field_name)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    # Delegate to service
    try:
        result = FieldEditorService.edit_field(
            extraction_id=extraction_id,
            field_name=body.field_name,
            new_value=body.value,
            user_id=str(authed_user.id),
        )
    except FieldTypeError as exc:
        # Type mismatch against the declared data_type — surface as 422 so
        # clients see a validation failure rather than a generic 400.
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    return FieldEditResponse(**result)


@router.get("/{extraction_id}/edits", response_model=EditHistoryResponse)
async def get_edit_history(
    extraction_id: str,
    current_user: OptionalUser,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> EditHistoryResponse:
    """Retrieve the edit history for an extraction.

    Returns edits ordered by timestamp descending with pagination.
    """
    authed_user = _require_auth(current_user)
    record = _fetch_extraction(extraction_id)
    _verify_ownership(record, authed_user)
    _check_not_deleted(record)

    raw_edits, total = FieldEditorService.get_edit_history(
        extraction_id, limit=limit, offset=offset
    )
    edit_items = [EditHistoryItem(**e) for e in raw_edits]

    return EditHistoryResponse(
        extraction_id=extraction_id,
        edits=edit_items,
        total=total,
    )


@router.get(
    "/{extraction_id}/document-url",
    response_model=DocumentUrlResponse,
)
async def get_document_url(
    extraction_id: str,
    request: Request,
    current_user: OptionalUser,
) -> DocumentUrlResponse:
    """Get a short-lived document proxy URL for the original uploaded document."""
    authed_user = _require_auth(current_user)
    record = _fetch_extraction(extraction_id)
    _verify_ownership(record, authed_user)
    _check_not_deleted(record)

    if record.get("payment_status") != "paid":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Payment required to access document",
        )

    object_key = record.get("document_object_key")
    if not object_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    owner_claim = _build_document_owner_claim(record)
    token = _build_document_proxy_token(
        extraction_id,
        owner_claim,
        expires_in=DOCUMENT_PROXY_TTL_SECONDS,
    )
    base_url = _build_external_base_url(request)
    url = (
        f"{base_url}{settings.api_v1_prefix}/extractions/"
        f"{extraction_id}/document?token={token}"
    )
    return DocumentUrlResponse(url=url, expires_in=DOCUMENT_PROXY_TTL_SECONDS)


@router.get("/{extraction_id}/document")
async def get_document_proxy(
    extraction_id: str,
    token: str = Query(..., min_length=1),
    object_storage: ObjectStorageService = Depends(get_object_storage_service),
) -> Response:
    """Stream the original uploaded PDF through the API using a signed token."""
    record = _fetch_extraction(extraction_id)
    _check_not_deleted(record)

    if record.get("payment_status") != "paid":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Payment required to access document",
        )

    object_key = record.get("document_object_key")
    if not object_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    owner_claim = _build_document_owner_claim(record)
    if not _is_valid_document_proxy_token(token, extraction_id, owner_claim):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or expired document token",
        )

    try:
        stream, content_type = object_storage.stream_file(object_key)
    except ObjectStorageError as exc:
        logger.warning("Failed to proxy document %s: %s", extraction_id, exc.message)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        ) from exc

    filename = record.get("document_filename") or "document.pdf"
    return StreamingResponse(
        stream,
        media_type=content_type or "application/pdf",
        headers={
            "Content-Disposition": _build_content_disposition(filename),
            "Cache-Control": f"private, max-age={DOCUMENT_PROXY_TTL_SECONDS}",
        },
    )


@router.get(
    "/{extraction_id}/camaudit-payload",
    response_model=CamAuditPayloadResponse,
)
async def get_camaudit_payload(
    extraction_id: str,
    current_user: OptionalUser,
) -> CamAuditPayloadResponse:
    """Generate encrypted CamAudit handoff payload.

    Returns a redirect URL with encrypted CAM-relevant field data.
    Only available for paid extractions with CAM-related red flags.
    """
    authed_user = _require_auth(current_user)
    record = _fetch_extraction(extraction_id)
    _verify_ownership(record, authed_user)
    _check_not_deleted(record)

    if record.get("payment_status") != "paid":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CamAudit handoff requires a paid extraction",
        )

    if not record.get("show_camaudit"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This extraction is not eligible for CamAudit handoff",
        )

    if not settings.camaudit_shared_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CamAudit integration is not configured",
        )

    extracted_data = record.get("extracted_data") or {}
    confidence_scores = record.get("confidence_scores") or {}

    service = CamAuditHandoffService(
        shared_key=settings.camaudit_shared_key,
        base_url=settings.camaudit_base_url,
    )
    payload = service.build_payload(extraction_id, extracted_data, confidence_scores)
    encrypted = service.encrypt_payload(payload)
    redirect_url = service.build_redirect_url(encrypted, extraction_id)

    return CamAuditPayloadResponse(
        redirect_url=redirect_url,
        extraction_id=extraction_id,
    )
