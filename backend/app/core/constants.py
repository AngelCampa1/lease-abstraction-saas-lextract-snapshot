"""Shared constants for backend services.

Centralizes magic numbers and limits referenced by multiple modules so they can
be adjusted in a single place without hunting through call sites.
"""

# Maximum number of PDF pages accepted by the extraction pipeline.
# Documents larger than this are rejected at upload time before any
# downstream processing (object-storage upload, Celery dispatch) is incurred.
MAX_PDF_PAGES: int = 500
