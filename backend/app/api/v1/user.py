"""User profile and dashboard API endpoints."""

import logging
from datetime import UTC, datetime
from typing import Any, cast

from fastapi import APIRouter, HTTPException, Response, status

from app.core.dependencies import CurrentUser
from app.database.client import NeonClientManager
from app.models.dashboard import (
    DashboardResponse,
    QuickStats,
    RecentExtraction,
)
from app.models.enums import ExtractionStatus
from app.schemas.user import (
    UpdateProfileRequest,
    UpdateProfileResponse,
    UserProfileResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/user", tags=["User"])

# Statuses that count as "processing" for the dashboard quick stats
_PROCESSING_STATUSES = frozenset(
    {
        ExtractionStatus.UPLOADING,
        ExtractionStatus.EXTRACTING,
        ExtractionStatus.SCORING,
    }
)


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(user: CurrentUser) -> DashboardResponse:
    """Return dashboard summary for the authenticated user.

    Includes total extraction count, credit balance, recent extractions
    (last 5), and quick stats grouped by status category.
    """
    admin_client = NeonClientManager.get_service_client()
    user_id = str(user.id)

    try:
        # Query 1: Get total count.
        total_result = (
            admin_client.table("extractions")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .is_("deleted_at", "null")
            .limit(0)
            .execute()
        )
        total = total_result.count if total_result.count is not None else 0

        # Query 1b-d: Per-status counts (avoids fetching all rows client-side).
        # PostgREST doesn't support GROUP BY, so we use count-only queries
        # per status category instead of fetching up to 10k rows.
        completed_result = (
            admin_client.table("extractions")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .is_("deleted_at", "null")
            .eq("status", ExtractionStatus.COMPLETE.value)
            .limit(0)
            .execute()
        )
        completed = completed_result.count or 0

        failed_result = (
            admin_client.table("extractions")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .is_("deleted_at", "null")
            .eq("status", ExtractionStatus.FAILED.value)
            .limit(0)
            .execute()
        )
        failed = failed_result.count or 0

        processing_statuses = [s.value for s in _PROCESSING_STATUSES]
        processing_result = (
            admin_client.table("extractions")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .is_("deleted_at", "null")
            .in_("status", processing_statuses)
            .limit(0)
            .execute()
        )
        processing = processing_result.count or 0

        # Query 2: Get last 5 recent extractions
        recent_result = (
            admin_client.table("extractions")
            .select("id, document_filename, status, payment_status, created_at")
            .eq("user_id", user_id)
            .is_("deleted_at", "null")
            .order("created_at", desc=True)
            .limit(5)
            .execute()
        )
        recent_rows = cast(list[dict[str, Any]], recent_result.data or [])

        recent_extractions = [
            RecentExtraction(
                id=str(row["id"]),
                document_filename=str(row["document_filename"]),
                status=str(row["status"]),
                payment_status=str(row["payment_status"]),
                created_at=row["created_at"],
            )
            for row in recent_rows
        ]

        return DashboardResponse(
            extraction_count=total,
            credit_balance=user.credits_balance,
            recent_extractions=recent_extractions,
            quick_stats=QuickStats(
                completed=completed,
                processing=processing,
                failed=failed,
            ),
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Dashboard query failed: %s: %s", type(exc).__name__, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load dashboard data",
        ) from exc


@router.get("/profile", response_model=UserProfileResponse)
async def get_profile(user: CurrentUser) -> UserProfileResponse:
    """Get the current user's profile."""
    return UserProfileResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        company=user.company,
        role=user.role,
        credits_balance=user.credits_balance,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.patch("/profile", response_model=UpdateProfileResponse)
async def update_profile(
    body: UpdateProfileRequest,
    user: CurrentUser,
) -> UpdateProfileResponse:
    """Update the current user's profile fields.

    Only non-None fields in the request body are updated.
    """
    update_data: dict[str, Any] = {}

    if body.full_name is not None:
        update_data["full_name"] = body.full_name
    if body.company is not None:
        update_data["company"] = body.company
    if body.role is not None:
        update_data["role"] = body.role

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    admin_client = NeonClientManager.get_service_client()
    try:
        result = (
            admin_client.table("users")
            .update(update_data)
            .eq("id", str(user.id))
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        updated_row = cast(list[dict[str, Any]], result.data)[0]

        return UpdateProfileResponse(
            id=str(updated_row["id"]),
            email=str(updated_row["email"]),
            full_name=updated_row.get("full_name"),
            company=updated_row.get("company"),
            role=updated_row.get("role"),
            credits_balance=updated_row.get("credits_balance", 0),
            updated_at=updated_row["updated_at"],
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Profile update failed: %s: %s", type(exc).__name__, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile",
        ) from exc


@router.delete(
    "",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete the current user's account",
    responses={
        204: {"description": "Account soft-deleted; R2 cleanup queued."},
        401: {"description": "Authentication required."},
        500: {"description": "Deletion failed."},
    },
)
async def delete_account(user: CurrentUser) -> Response:
    """Soft-delete the authenticated user and cascade soft-delete extractions.

    - Sets ``users.deleted_at`` on the caller's row.
    - Cascades by setting ``extractions.deleted_at`` for every extraction the
      user owns where ``deleted_at`` is still NULL (idempotent: an already-
      deleted account or extraction is left untouched on retry).
    - Queues ``cleanup_user_objects`` to purge R2 objects asynchronously.

    Returns 204 No Content. Owner-only: the dependency-injected
    ``CurrentUser`` guarantees a user can only delete their own account.
    """
    admin_client = NeonClientManager.get_service_client()
    user_id = str(user.id)
    now_iso = datetime.now(UTC).isoformat()

    try:
        # 1. Soft-delete the user row. Filtering on `deleted_at IS NULL`
        #    keeps the operation idempotent — a second DELETE on an
        #    already-deleted account succeeds with no-op semantics.
        admin_client.table("users").update(
            {"deleted_at": now_iso, "updated_at": now_iso}
        ).eq("id", user_id).is_("deleted_at", "null").execute()

        # 2. Cascade soft-delete to the user's extractions. Same
        #    `deleted_at IS NULL` guard prevents clobbering rows that
        #    were already tombstoned (preserves the original deletion
        #    timestamp for any audit trail).
        admin_client.table("extractions").update(
            {"deleted_at": now_iso, "updated_at": now_iso}
        ).eq("user_id", user_id).is_("deleted_at", "null").execute()

        # 3. Queue async R2 object cleanup so the API call doesn't block
        #    on potentially-many S3 deletes. Import here to avoid a
        #    module-import cycle (tasks import services which import this).
        from app.tasks.cleanup import cleanup_user_objects

        try:
            cleanup_user_objects.apply_async(args=[user_id])
        except ModuleNotFoundError:
            # Celery isn't installed in this environment (e.g. running
            # the API without a worker). Fall back to a synchronous run
            # so deletion still completes in dev/test.
            cleanup_user_objects(user_id)

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(
            "Account deletion failed for user %s: %s: %s",
            user_id,
            type(exc).__name__,
            exc,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete account",
        ) from exc

    return Response(status_code=status.HTTP_204_NO_CONTENT)
