"""PDF document exporter using WeasyPrint.

Generates a professional PDF lease abstraction report with cover page,
executive summary, 14 category sections with styled tables, and a
red flag appendix.
"""

from datetime import UTC, datetime
from html import escape
from typing import Any

from weasyprint import HTML  # requires system libs (cairo, pango)

from app.services.brand import BRAND_ASSETS
from app.services.exports.base import EXPORT_DISCLAIMER, ExportBase
from app.services.exports.templates import (
    DEFAULT_TEMPLATE,
    FIELD_LABELS,
    TEMPLATES,
    TemplateSection,
)
from app.services.exports.utils import (
    field_confidence_scores,
    format_value,
    get_confidence_tier,
    unwrap_field,
)

CONFIDENCE_COLORS: dict[str, str] = {
    "HIGH": "#008000",
    "MEDIUM": "#FFA500",
    "LOW": "#FF0000",
    "N/A": "#888888",
}

_CSS = """
@page {
    margin: 2cm;
    @bottom-center {
        content: "Page " counter(page) " of " counter(pages);
        font-size: 8pt;
        color: #666;
    }
}

body {
    font-family: Calibri, Arial, Helvetica, sans-serif;
    font-size: 10pt;
    line-height: 1.4;
    color: #333;
}

.cover-page {
    text-align: center;
    padding-top: 100px;
    page-break-after: always;
}

.cover-title {
    font-size: 28pt;
    font-weight: bold;
    color: #1F3864;
    margin-bottom: 10px;
}

.cover-logo {
    width: 210px;
    height: auto;
    margin-bottom: 30px;
}

.cover-subtitle {
    font-size: 14pt;
    color: #595959;
    margin-bottom: 5px;
}

.cover-date {
    font-size: 11pt;
    color: #595959;
    margin-bottom: 30px;
}

.cover-field {
    font-size: 12pt;
    margin: 5px 0;
}

.cover-field-label {
    font-weight: bold;
}

h1 {
    color: #1F3864;
    font-size: 18pt;
    margin-top: 20px;
    margin-bottom: 10px;
    page-break-after: avoid;
}

h2 {
    color: #1F3864;
    font-size: 14pt;
    margin-top: 15px;
    margin-bottom: 8px;
    page-break-after: avoid;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 15px;
    page-break-inside: auto;
}

tr {
    page-break-inside: avoid;
}

th {
    background-color: #1F3864;
    color: white;
    font-size: 9pt;
    font-weight: bold;
    text-align: left;
    padding: 6px 8px;
    border: 1px solid #1F3864;
}

td {
    font-size: 9pt;
    padding: 5px 8px;
    border: 1px solid #ddd;
    vertical-align: top;
}

tr:nth-child(even) td {
    background-color: #f8f9fa;
}

.field-label {
    font-weight: bold;
    width: 30%;
}

.field-value {
    width: 50%;
}

.field-confidence {
    width: 20%;
    font-weight: bold;
}

.summary-stats {
    margin: 10px 0;
}

.red-flags-header {
    color: #C00000;
}

.red-flag-table th {
    background-color: #8B0000;
    border-color: #8B0000;
}

.executive-summary {
    page-break-after: avoid;
}

.export-disclaimer {
    margin-top: 24px;
    padding-top: 10px;
    border-top: 1px solid #ddd;
    font-size: 8pt;
    font-style: italic;
    color: #595959;
    page-break-inside: avoid;
}
"""


class PdfExporter(ExportBase):
    """Generate PDF export of extraction results using WeasyPrint.

    Produces an HTML document styled for PDF rendering with:
    - Cover page with key identifiers
    - Executive summary with confidence overview
    - 14 category sections as styled tables
    - Red flag appendix (if any flags detected)
    """

    @property
    def content_type(self) -> str:
        """MIME type for PDF documents."""
        return "application/pdf"

    @property
    def extension(self) -> str:
        """File extension for PDF documents."""
        return "pdf"

    def generate(
        self,
        extraction_data: dict[str, Any],
        confidence_scores: dict[str, Any],
        red_flags: list[dict[str, Any]],
        template: str,
        document_filename: str,
    ) -> bytes:
        """Generate a PDF document export.

        Args:
            extraction_data: Extracted lease fields keyed by field_name.
            confidence_scores: Confidence tier per field.
            red_flags: List of detected red flag dicts.
            template: Template name (e.g. 'commercial', 'office').
            document_filename: Original uploaded PDF filename.

        Returns:
            Raw bytes of the generated PDF file.
        """
        html = self._build_html(
            extraction_data,
            confidence_scores,
            red_flags,
            template,
            document_filename,
        )
        pdf_bytes: bytes = HTML(string=html).write_pdf()
        return pdf_bytes

    def _build_html(
        self,
        extraction_data: dict[str, Any],
        confidence_scores: dict[str, Any],
        red_flags: list[dict[str, Any]],
        template: str,
        document_filename: str,
    ) -> str:
        """Build the complete HTML document for PDF rendering.

        Args:
            extraction_data: Extracted lease fields.
            confidence_scores: Confidence tier per field.
            red_flags: List of detected red flags.
            template: Template name.
            document_filename: Original PDF filename.

        Returns:
            Complete HTML string ready for WeasyPrint rendering.
        """
        parts: list[str] = []
        parts.append("<!DOCTYPE html>")
        parts.append("<html><head>")
        parts.append(f"<style>{_CSS}</style>")
        parts.append("</head><body>")

        # Cover page
        parts.append(self._build_cover_page(extraction_data, document_filename))

        # Executive summary
        parts.append(
            self._build_executive_summary(extraction_data, confidence_scores, red_flags)
        )

        # Category sections
        template_config = TEMPLATES.get(template, TEMPLATES[DEFAULT_TEMPLATE])
        for section in template_config.sections:
            parts.append(
                self._build_category_section(
                    section, extraction_data, confidence_scores
                )
            )

        # Red flags appendix
        if red_flags:
            parts.append(self._build_red_flags_section(red_flags))

        # AI-accuracy disclaimer
        parts.append(
            f'<div class="export-disclaimer">{escape(EXPORT_DISCLAIMER)}</div>'
        )

        parts.append("</body></html>")
        return "\n".join(parts)

    def _build_cover_page(
        self,
        extraction_data: dict[str, Any],
        document_filename: str,
    ) -> str:
        """Build the cover page HTML.

        Args:
            extraction_data: Extracted lease fields.
            document_filename: Original PDF filename.

        Returns:
            HTML string for the cover page.
        """
        landlord = escape(
            format_value(unwrap_field(extraction_data.get("landlord_legal_name")))
        )
        tenant = escape(
            format_value(unwrap_field(extraction_data.get("tenant_legal_name")))
        )
        premises = escape(
            format_value(unwrap_field(extraction_data.get("premises_address")))
        )
        date_str = datetime.now(UTC).strftime("%B %d, %Y")

        return f"""
<div class="cover-page">
    <img class="cover-logo" src="{BRAND_ASSETS.logo_data_uri}" alt="Lextract" />
    <div class="cover-title">Lease Abstraction Report</div>
    <div class="cover-subtitle">{escape(document_filename)}</div>
    <div class="cover-date">Generated: {date_str}</div>
    <div class="cover-field">
        <span class="cover-field-label">Landlord:</span> {landlord}
    </div>
    <div class="cover-field">
        <span class="cover-field-label">Tenant:</span> {tenant}
    </div>
    <div class="cover-field">
        <span class="cover-field-label">Premises:</span> {premises}
    </div>
</div>
"""

    def _build_executive_summary(
        self,
        extraction_data: dict[str, Any],
        confidence_scores: dict[str, Any],
        red_flags: list[dict[str, Any]],
    ) -> str:
        """Build the executive summary HTML.

        Args:
            extraction_data: Extracted lease fields.
            confidence_scores: Confidence tier per field.
            red_flags: List of detected red flags.

        Returns:
            HTML string for the executive summary section.
        """
        landlord = escape(
            format_value(unwrap_field(extraction_data.get("landlord_legal_name")))
        )
        tenant = escape(
            format_value(unwrap_field(extraction_data.get("tenant_legal_name")))
        )
        premises = escape(
            format_value(unwrap_field(extraction_data.get("premises_address")))
        )
        term = escape(
            format_value(unwrap_field(extraction_data.get("lease_term_months")))
        )
        rent = escape(
            format_value(unwrap_field(extraction_data.get("base_rent_annual")))
        )

        total_fields = len(extraction_data)
        field_scores = field_confidence_scores(confidence_scores)
        high_count = sum(
            1 for v in field_scores.values() if get_confidence_tier(v) == "HIGH"
        )
        medium_count = sum(
            1 for v in field_scores.values() if get_confidence_tier(v) == "MEDIUM"
        )
        low_count = sum(
            1 for v in field_scores.values() if get_confidence_tier(v) == "LOW"
        )
        na_count = sum(
            1 for v in field_scores.values() if get_confidence_tier(v) == "N/A"
        )

        return f"""
<div class="executive-summary">
<h1>Executive Summary</h1>
<p>This lease abstraction covers the agreement between {landlord} (Landlord)
and {tenant} (Tenant) for the premises at {premises}.
The lease term is {term} months with an annual base rent of {rent}.</p>
<div class="summary-stats">
<strong>Extraction Statistics:</strong>
{total_fields} fields extracted |
<span style="color: {CONFIDENCE_COLORS['HIGH']}">{high_count} HIGH</span> |
<span style="color: {CONFIDENCE_COLORS['MEDIUM']}">{medium_count} MEDIUM</span> |
<span style="color: {CONFIDENCE_COLORS['LOW']}">{low_count} LOW</span> |
<span style="color: {CONFIDENCE_COLORS['N/A']}">{na_count} N/A</span> |
{len(red_flags)} red flag(s) detected
</div>
</div>
"""

    def _build_category_section(
        self,
        section: TemplateSection,
        extraction_data: dict[str, Any],
        confidence_scores: dict[str, Any],
    ) -> str:
        """Build a category section with field table HTML.

        Args:
            section: Template section definition.
            extraction_data: Extracted lease fields.
            confidence_scores: Confidence tier per field.

        Returns:
            HTML string for the category section.
        """
        heading_tag = "h1" if section.emphasis else "h2"
        rows: list[str] = []

        for field_name in section.fields:
            raw_value = extraction_data.get(field_name)
            value = unwrap_field(raw_value)
            tier = get_confidence_tier(confidence_scores.get(field_name))
            label = FIELD_LABELS.get(field_name, field_name)

            color = CONFIDENCE_COLORS.get(tier, "#888")
            tier_html = (
                f'<span style="color: {color}">{escape(tier)}</span>' if tier else ""
            )

            rows.append(
                f"<tr>"
                f'<td class="field-label">{escape(label)}</td>'
                f'<td class="field-value">{escape(format_value(value))}</td>'
                f'<td class="field-confidence">{tier_html}</td>'
                f"</tr>"
            )

        return f"""
<{heading_tag}>{escape(section.display_name)}</{heading_tag}>
<table>
<tr><th>Field</th><th>Value</th><th>Confidence</th></tr>
{"".join(rows)}
</table>
"""

    def _build_red_flags_section(
        self,
        red_flags: list[dict[str, Any]],
    ) -> str:
        """Build the red flags appendix HTML.

        Args:
            red_flags: List of red flag dicts with 'name', 'severity',
                'description' keys.

        Returns:
            HTML string for the red flags section.
        """
        rows: list[str] = []
        for flag in red_flags:
            field_name = flag.get("name", "Unknown")
            label = FIELD_LABELS.get(field_name, field_name)
            severity = flag.get("severity", "Unknown")
            message = flag.get("description", "")

            rows.append(
                f"<tr>"
                f"<td>{escape(label)}</td>"
                f"<td><strong>{escape(str(severity))}</strong></td>"
                f"<td>{escape(str(message))}</td>"
                f"</tr>"
            )

        count = len(red_flags)
        desc = "were identified during the extraction process:"
        return f"""
<h1 class="red-flags-header">Appendix: Red Flags</h1>
<p>{count} potential issue(s) {desc}</p>
<table class="red-flag-table">
<tr><th>Field</th><th>Severity</th><th>Description</th></tr>
{"".join(rows)}
</table>
"""
