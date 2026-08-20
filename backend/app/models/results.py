"""Response models for extraction results endpoints."""

from typing import Any

from pydantic import BaseModel

TEASER_FIELDS: list[str] = [
    "landlord_legal_name",
    "tenant_legal_name",
    "premises_address",
    "commencement_date",
    "base_rent_annual",
]

# Secondary, content-rich lease terms used to backfill the teaser preview when
# the primary fields above are not all present. These are the economics and
# term details a buyer cares about most, so they outrank arbitrary
# document-order fields (and yes/no flags) when filling the preview.
TEASER_BACKFILL_FIELDS: list[str] = [
    "monthly_base_rent",
    "base_rent_per_rsf",
    "security_deposit_amount",
    "rentable_square_footage",
    "lease_term_months",
    "expiration_date",
    "rent_commencement_date",
    "lease_structure_type",
    "escalation_type",
    "renewal_terms",
    "suite_or_unit_number",
    "property_use_type",
    "governing_law_state",
]


class TeaserFieldValue(BaseModel):
    """A single teaser field with its label and extracted value."""

    field_name: str
    label: str
    value: str | None


class ConfidenceDistribution(BaseModel):
    """Counts of fields by confidence tier."""

    high: int
    medium: int
    low: int
    not_found: int = 0


class LockedCategory(BaseModel):
    """A field-schema category that is locked behind payment in the teaser.

    The shape mirrors the frontend ``LockedCategory`` type
    (``frontend/hooks/use-teaser.ts``): ``name`` is the human-readable category
    label and ``field_count`` is how many of its fields are not shown in the
    teaser preview.
    """

    name: str
    field_count: int


class TeaserResponse(BaseModel):
    """Preview of extraction results before payment."""

    id: str
    status: str
    payment_status: str
    document_filename: str
    document_page_count: int | None = None
    visible_fields: list[TeaserFieldValue]
    total_field_count: int
    category_count: int
    confidence_distribution: ConfidenceDistribution
    red_flag_count: int
    red_flag_severity_high: int | None = None
    red_flag_categories: list[str] | None = None
    locked_categories: list[LockedCategory] | None = None
    error_message: str | None = None


class ExtractionStatusResponse(BaseModel):
    """Processing status for an extraction before or after payment."""

    id: str
    status: str
    payment_status: str
    document_filename: str
    document_page_count: int | None = None
    error_message: str | None = None


class FullResultsResponse(BaseModel):
    """Complete extraction results (requires payment)."""

    id: str
    status: str
    payment_status: str
    document_filename: str
    document_page_count: int | None
    property_type: str | None
    extracted_data: dict[str, Any]
    confidence_scores: dict[str, Any]
    red_flags: list[dict[str, Any]]
    show_camaudit: bool = False
    overall_confidence: float | None
    created_at: str
    updated_at: str


class ExtractionListItem(BaseModel):
    """Summary of an extraction for list views."""

    id: str
    document_filename: str
    status: str
    payment_status: str
    property_type: str | None
    created_at: str


class ExtractionListResponse(BaseModel):
    """Paginated list of extractions."""

    items: list[ExtractionListItem]
    total: int
    limit: int
    offset: int


class FieldEditRequest(BaseModel):
    """Request body for editing a single extraction field."""

    field_name: str
    value: Any


class FieldEditResponse(BaseModel):
    """Response after a successful field edit."""

    extraction_id: str
    field_name: str
    original_value: Any
    edited_value: Any
    red_flags: list[dict[str, Any]]


class EditHistoryItem(BaseModel):
    """A single edit history entry."""

    id: str
    field_name: str
    original_value: Any
    edited_value: Any
    edited_by: str
    edited_at: str


class EditHistoryResponse(BaseModel):
    """Edit history for an extraction."""

    extraction_id: str
    edits: list[EditHistoryItem]
    total: int = 0  # Total number of edits (independent of limit/offset)


class DocumentUrlResponse(BaseModel):
    """Presigned URL for the original uploaded PDF."""

    url: str
    expires_in: int
