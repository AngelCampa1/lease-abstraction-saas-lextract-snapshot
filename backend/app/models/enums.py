"""Database enum types for Lextract.io."""

from enum import StrEnum


class ExtractionStatus(StrEnum):
    """Lifecycle status of an extraction job.

    Valid states: uploading → extracting → scoring → complete | failed
    """

    UPLOADING = "uploading"
    EXTRACTING = "extracting"
    SCORING = "scoring"
    COMPLETE = "complete"
    FAILED = "failed"


class PaymentStatus(StrEnum):
    """Payment state of an extraction."""

    UNPAID = "unpaid"
    PAID = "paid"
    REFUNDED = "refunded"


class PaymentType(StrEnum):
    """Type of purchase made."""

    SINGLE = "single"
    CREDIT_PACK_5 = "credit_pack_5"
    CREDIT_PACK_10 = "credit_pack_10"
