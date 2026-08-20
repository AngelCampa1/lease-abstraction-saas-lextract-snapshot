"""Abstract base class for document exporters."""

from abc import ABC, abstractmethod
from typing import Any

#: Disclaimer printed on every generated export so recipients know the report
#: is AI-generated, may contain errors, and must be verified against the source
#: lease. Kept here so the Word, Excel, and PDF exporters share one wording.
EXPORT_DISCLAIMER = (
    "This report was made by Lextract using AI. It may have errors. "
    "Check every field against the original lease before you rely on it. "
    "Lextract is not responsible for mistakes or for choices made from this report."
)


class ExportBase(ABC):
    """Abstract base class for document exporters.

    Subclasses implement generate() to produce export documents in a
    specific format (e.g., Word, PDF, Excel). Each exporter declares
    its MIME content_type and file extension.
    """

    @abstractmethod
    def generate(
        self,
        extraction_data: dict[str, Any],
        confidence_scores: dict[str, Any],
        red_flags: list[dict[str, Any]],
        template: str,
        document_filename: str,
    ) -> bytes:
        """Generate export document bytes.

        Args:
            extraction_data: Extracted lease fields keyed by field_name.
            confidence_scores: Confidence tier per field (HIGH/MEDIUM/LOW).
            red_flags: List of detected red flag dicts.
            template: Template name (e.g. 'commercial', 'office').
            document_filename: Original uploaded PDF filename.

        Returns:
            Raw bytes of the generated document.
        """
        ...

    @property
    @abstractmethod
    def content_type(self) -> str:
        """MIME type of the generated document."""
        ...

    @property
    @abstractmethod
    def extension(self) -> str:
        """File extension without dot (e.g., 'docx')."""
        ...
