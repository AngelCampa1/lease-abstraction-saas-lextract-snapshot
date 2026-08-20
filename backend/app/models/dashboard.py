"""Dashboard response Pydantic models."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class QuickStats(BaseModel):
    """Aggregated extraction status counts for the dashboard."""

    model_config = ConfigDict(frozen=True)

    completed: int = Field(description="Number of completed extractions")
    processing: int = Field(
        description="Number of in-progress extractions"
        " (uploading, extracting, scoring)"
    )
    failed: int = Field(description="Number of failed extractions")


class RecentExtraction(BaseModel):
    """Summary of a recent extraction for the dashboard list."""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(description="Extraction UUID")
    document_filename: str = Field(description="Original uploaded filename")
    status: str = Field(description="Current extraction status")
    payment_status: str = Field(description="Payment status (unpaid, paid, refunded)")
    created_at: datetime = Field(description="When the extraction was created")


class DashboardResponse(BaseModel):
    """Response body for GET /user/dashboard."""

    model_config = ConfigDict(frozen=True)

    extraction_count: int = Field(description="Total number of extractions")
    credit_balance: int = Field(description="Current credit balance")
    recent_extractions: list[RecentExtraction] = Field(
        description="Last 5 extractions ordered by creation date"
    )
    quick_stats: QuickStats = Field(description="Aggregated counts by status category")
