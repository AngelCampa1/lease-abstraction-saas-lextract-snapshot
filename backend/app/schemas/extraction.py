"""Extraction API response schemas."""

from pydantic import BaseModel, Field


class UploadResponse(BaseModel):
    """Response returned after a successful PDF upload."""

    extraction_id: str = Field(description="UUID of the created extraction")
    status: str = Field(description="Current extraction status")


class ExportResponse(BaseModel):
    """Response returned when a cached export is available."""

    url: str = Field(description="Presigned Cloudflare R2 download URL")
    format: str = Field(description="Export format (e.g. docx)")
    version: str | None = Field(
        default=None,
        description=(
            "Cache-busting version token for the export. Pass to the download "
            "endpoint to stream the exact generated file even after later edits."
        ),
    )


class ExportTaskResponse(BaseModel):
    """Response returned when an export task is dispatched."""

    task_id: str = Field(description="Celery task ID for polling")
    status: str = Field(description="Task status (generating)")
    version: str | None = Field(
        default=None,
        description=(
            "Dispatch-time version token. The authoritative version for an "
            "async export is the one returned by the task-status poll."
        ),
    )


class CamAuditPayloadResponse(BaseModel):
    """Response returned with an encrypted CamAudit handoff URL."""

    redirect_url: str = Field(description="CamAudit import URL with encrypted payload")
    extraction_id: str = Field(description="Source extraction UUID")
