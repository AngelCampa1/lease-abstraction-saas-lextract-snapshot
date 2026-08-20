"""Task status endpoints for polling async background jobs."""

import hashlib
import hmac

from celery.result import AsyncResult
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.core.celery_app import celery_app
from app.core.config import settings
from app.core.dependencies import OptionalUser
from app.models.user import AnonymousSession, User

router = APIRouter(prefix="/tasks", tags=["Tasks"])


class TaskStatusResponse(BaseModel):
    """Response for a background task status poll."""

    task_id: str
    status: str  # generating | complete | failed
    url: str | None = None
    version: str | None = None


def _task_signature(message: str) -> str:
    return hmac.new(
        settings.neon_service_role_key.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()[:24]


def build_export_task_id(owner: User | AnonymousSession, task_key: str) -> str:
    """Build an owner-scoped Celery task ID for export polling."""
    if isinstance(owner, User):
        unsigned = f"export:user:{owner.id}:{task_key}"
    else:
        unsigned = f"export:session:{owner.id}:{task_key}"
    return f"{unsigned}:{_task_signature(unsigned)}"


def _task_belongs_to_current_user(
    task_id: str, current_user: User | AnonymousSession
) -> bool:
    owner_parts = task_id.split(":")
    if len(owner_parts) < 5 or owner_parts[0] != "export":
        return False

    owner_type = owner_parts[1]
    owner_id = owner_parts[2]
    unsigned = ":".join(owner_parts[:-1])
    if not hmac.compare_digest(owner_parts[-1], _task_signature(unsigned)):
        return False

    if isinstance(current_user, User):
        return owner_type == "user" and owner_id == str(current_user.id)
    return owner_type == "session" and owner_id == str(current_user.id)


def _result_belongs_to_current_user(
    task_result: dict[str, object], current_user: User | AnonymousSession
) -> bool:
    if isinstance(current_user, User):
        return str(task_result.get("user_id")) == str(current_user.id)
    return str(task_result.get("anonymous_session_id")) == str(current_user.id)


def _raise_not_found() -> None:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Task not found",
    )


@router.get("/{task_id}/status", response_model=TaskStatusResponse)
async def get_task_status(
    task_id: str,
    current_user: OptionalUser,
) -> TaskStatusResponse:
    """Poll the status of an async background task (e.g. export generation).

    Maps Celery task states to frontend-friendly statuses:
      - PENDING / STARTED / RETRY → generating
      - SUCCESS                   → complete  (result.url included when present)
      - FAILURE                   → failed

    Access control: the task_id signature gate rejects unowned/forged IDs with
    404 before Celery is queried, so raw Celery state is never exposed.

    Note on unknown IDs: a validly-signed task ID that was never enqueued (or
    whose result has expired) is reported as "generating", not 404. Celery's
    PENDING state is indistinguishable from a never-created task, so the backend
    cannot tell "in progress" apart from "never existed" and reports both as
    pending/generating.
    """
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: Bearer token or X-Session-Token",
        )

    if not _task_belongs_to_current_user(task_id, current_user):
        _raise_not_found()

    result: AsyncResult = AsyncResult(task_id, app=celery_app)
    celery_state: str = result.state

    if celery_state == "SUCCESS":
        task_result = result.result if isinstance(result.result, dict) else {}
        if task_result and not _result_belongs_to_current_user(
            task_result, current_user
        ):
            _raise_not_found()
        version = task_result.get("version")
        return TaskStatusResponse(
            task_id=task_id,
            status="complete",
            url=task_result.get("url"),
            version=str(version) if version is not None else None,
        )

    if celery_state == "FAILURE":
        return TaskStatusResponse(task_id=task_id, status="failed")

    # PENDING, STARTED, RETRY, or unknown task ID (all map to "generating")
    return TaskStatusResponse(task_id=task_id, status="generating")
