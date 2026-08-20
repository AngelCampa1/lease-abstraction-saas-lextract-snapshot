"""Tests for PdfExporter.

Exercises PDF generation including content structure, template
selection, confidence coloring, and edge cases.

WeasyPrint requires system-level libraries (cairo, pango). The entire
module is skipped if the library is not available.
"""

import sys
from types import ModuleType

import pytest

try:
    import weasyprint  # noqa: F401
except (ImportError, OSError):
    fake_weasyprint = ModuleType("weasyprint")

    class FakeHTML:
        def __init__(self, string: str):
            self.string = string

        def write_pdf(self) -> bytes:
            return b"%PDF-FAKE\n" + self.string.encode()

    fake_weasyprint.HTML = FakeHTML
    sys.modules["weasyprint"] = fake_weasyprint

from app.services.exports.base import EXPORT_DISCLAIMER, ExportBase
from app.services.exports.pdf import CONFIDENCE_COLORS, PdfExporter

# -- Sample data --


SAMPLE_EXTRACTION = {
    "landlord_legal_name": {
        "value": "ABC Corp",
        "confidence": 0.95,
        "source_text": "ABC Corp",
    },
    "tenant_legal_name": {
        "value": "Acme Inc",
        "confidence": 0.88,
        "source_text": "Acme Inc",
    },
    "premises_address": {
        "value": "123 Main St",
        "confidence": 0.72,
        "source_text": "123 Main",
    },
    "base_rent_annual": {
        "value": 120000,
        "confidence": 0.90,
        "source_text": "$120,000",
    },
    "lease_term_months": {
        "value": 60,
        "confidence": 0.85,
        "source_text": "60 months",
    },
}

SAMPLE_CONFIDENCE = {
    "landlord_legal_name": {"score": 0.95, "tier": "high"},
    "tenant_legal_name": {"score": 0.88, "tier": "high"},
    "premises_address": {"score": 0.72, "tier": "medium"},
    "base_rent_annual": {"score": 0.90, "tier": "high"},
    "lease_term_months": {"score": 0.85, "tier": "high"},
}

SAMPLE_RED_FLAGS = [
    {
        "rule_id": "no_cam_cap",
        "name": "cam_cap_percentage",
        "severity": "HIGH",
        "description": "No CAM cap found",
        "triggered_value": "",
    },
]

SAMPLE_CONFIDENCE_WITH_NOT_FOUND = {
    "landlord_legal_name": {"score": 0.95, "tier": "high"},
    "tenant_legal_name": {"score": 0.88, "tier": "high"},
    "premises_address": {"score": 0.0, "tier": "not_found"},
    "base_rent_annual": {"score": 0.0, "tier": "not_found"},
    "lease_term_months": {"score": 0.85, "tier": "high"},
}


# -- Fixtures --


@pytest.fixture
def exporter():
    return PdfExporter()


# -- Property tests --


def test_pdf_exporter_is_export_base_subclass(exporter):
    assert isinstance(exporter, ExportBase)


def test_pdf_exporter_content_type(exporter):
    assert exporter.content_type == "application/pdf"


def test_pdf_exporter_extension(exporter):
    assert exporter.extension == "pdf"


# -- Generate tests --


def test_generate_returns_bytes(exporter):
    result = exporter.generate(
        extraction_data=SAMPLE_EXTRACTION,
        confidence_scores=SAMPLE_CONFIDENCE,
        red_flags=SAMPLE_RED_FLAGS,
        template="commercial",
        document_filename="test.pdf",
    )
    assert isinstance(result, bytes)
    assert result[:5] == b"%PDF-"


def test_generate_with_office_template(exporter):
    result = exporter.generate(
        extraction_data=SAMPLE_EXTRACTION,
        confidence_scores=SAMPLE_CONFIDENCE,
        red_flags=SAMPLE_RED_FLAGS,
        template="office",
        document_filename="test.pdf",
    )
    assert isinstance(result, bytes)
    assert result[:5] == b"%PDF-"


def test_generate_with_empty_data(exporter):
    result = exporter.generate(
        extraction_data={},
        confidence_scores={},
        red_flags=[],
        template="commercial",
        document_filename="empty.pdf",
    )
    assert isinstance(result, bytes)
    assert result[:5] == b"%PDF-"


def test_generate_with_no_red_flags(exporter):
    result = exporter.generate(
        extraction_data=SAMPLE_EXTRACTION,
        confidence_scores=SAMPLE_CONFIDENCE,
        red_flags=[],
        template="commercial",
        document_filename="test.pdf",
    )
    assert isinstance(result, bytes)
    assert result[:5] == b"%PDF-"


def test_html_contains_document_filename(exporter):
    html = exporter._build_html(
        extraction_data=SAMPLE_EXTRACTION,
        confidence_scores=SAMPLE_CONFIDENCE,
        red_flags=SAMPLE_RED_FLAGS,
        template="commercial",
        document_filename="my_lease.pdf",
    )
    assert "my_lease.pdf" in html


def test_html_contains_title(exporter):
    html = exporter._build_html(
        extraction_data=SAMPLE_EXTRACTION,
        confidence_scores=SAMPLE_CONFIDENCE,
        red_flags=SAMPLE_RED_FLAGS,
        template="commercial",
        document_filename="test.pdf",
    )
    assert "Lease Abstraction Report" in html


def test_html_labels_red_flags_as_appendix(exporter):
    html = exporter._build_html(
        extraction_data=SAMPLE_EXTRACTION,
        confidence_scores=SAMPLE_CONFIDENCE,
        red_flags=SAMPLE_RED_FLAGS,
        template="commercial",
        document_filename="test.pdf",
    )
    assert "Appendix: Red Flags" in html


def test_html_contains_key_identifiers(exporter):
    html = exporter._build_html(
        extraction_data=SAMPLE_EXTRACTION,
        confidence_scores=SAMPLE_CONFIDENCE,
        red_flags=SAMPLE_RED_FLAGS,
        template="commercial",
        document_filename="test.pdf",
    )
    assert "ABC Corp" in html
    assert "Acme Inc" in html
    assert "123 Main St" in html


def test_html_contains_confidence_distribution(exporter):
    html = exporter._build_html(
        extraction_data=SAMPLE_EXTRACTION,
        confidence_scores=SAMPLE_CONFIDENCE,
        red_flags=SAMPLE_RED_FLAGS,
        template="commercial",
        document_filename="test.pdf",
    )
    assert "HIGH" in html
    assert "MEDIUM" in html


def test_html_contains_red_flags_section(exporter):
    html = exporter._build_html(
        extraction_data=SAMPLE_EXTRACTION,
        confidence_scores=SAMPLE_CONFIDENCE,
        red_flags=SAMPLE_RED_FLAGS,
        template="commercial",
        document_filename="test.pdf",
    )
    assert "Red Flags" in html
    assert "No CAM cap found" in html


def test_html_no_red_flags_section_when_empty(exporter):
    html = exporter._build_html(
        extraction_data=SAMPLE_EXTRACTION,
        confidence_scores=SAMPLE_CONFIDENCE,
        red_flags=[],
        template="commercial",
        document_filename="test.pdf",
    )
    assert "Red Flags" not in html


def test_html_contains_ai_disclaimer(exporter):
    html = exporter._build_html(
        extraction_data=SAMPLE_EXTRACTION,
        confidence_scores=SAMPLE_CONFIDENCE,
        red_flags=SAMPLE_RED_FLAGS,
        template="commercial",
        document_filename="test.pdf",
    )
    assert EXPORT_DISCLAIMER in html
    assert 'class="export-disclaimer"' in html


def test_html_contains_ai_disclaimer_without_red_flags(exporter):
    html = exporter._build_html(
        extraction_data=SAMPLE_EXTRACTION,
        confidence_scores=SAMPLE_CONFIDENCE,
        red_flags=[],
        template="commercial",
        document_filename="test.pdf",
    )
    assert EXPORT_DISCLAIMER in html


def test_html_contains_category_sections(exporter):
    html = exporter._build_html(
        extraction_data=SAMPLE_EXTRACTION,
        confidence_scores=SAMPLE_CONFIDENCE,
        red_flags=[],
        template="commercial",
        document_filename="test.pdf",
    )
    assert "Parties &amp; Property" in html or "Parties & Property" in html
    assert "Key Dates" in html
    assert "Rent &amp; Escalations" in html or "Rent & Escalations" in html


def test_html_contains_confidence_colors(exporter):
    html = exporter._build_html(
        extraction_data=SAMPLE_EXTRACTION,
        confidence_scores=SAMPLE_CONFIDENCE,
        red_flags=[],
        template="commercial",
        document_filename="test.pdf",
    )
    assert CONFIDENCE_COLORS["HIGH"] in html
    assert CONFIDENCE_COLORS["MEDIUM"] in html


def test_unknown_template_falls_back(exporter):
    html = exporter._build_html(
        extraction_data=SAMPLE_EXTRACTION,
        confidence_scores=SAMPLE_CONFIDENCE,
        red_flags=[],
        template="nonexistent",
        document_filename="test.pdf",
    )
    assert "Parties" in html


def test_confidence_colors_constants():
    assert CONFIDENCE_COLORS["HIGH"] == "#008000"
    assert CONFIDENCE_COLORS["MEDIUM"] == "#FFA500"
    assert CONFIDENCE_COLORS["LOW"] == "#FF0000"


def test_html_red_flags_uses_name_key(exporter):
    """Red flags must read 'name' field (SDK key), not 'field'."""
    html = exporter._build_html(
        extraction_data=SAMPLE_EXTRACTION,
        confidence_scores=SAMPLE_CONFIDENCE,
        red_flags=SAMPLE_RED_FLAGS,
        template="commercial",
        document_filename="test.pdf",
    )
    # cam_cap_percentage should appear — uses FIELD_LABELS lookup from 'name' key
    assert "No CAM cap found" in html
    # Must NOT show literal "Unknown" as the field label
    assert ">Unknown<" not in html


def test_html_red_flags_uses_description_key(exporter):
    """Red flags must read 'description' field (SDK key), not 'message'."""
    html = exporter._build_html(
        extraction_data=SAMPLE_EXTRACTION,
        confidence_scores=SAMPLE_CONFIDENCE,
        red_flags=SAMPLE_RED_FLAGS,
        template="commercial",
        document_filename="test.pdf",
    )
    assert "No CAM cap found" in html


def test_html_not_found_fields_show_na_in_table(exporter):
    """Fields with not_found tier must display 'N/A' not 'LOW' in the table."""
    html = exporter._build_html(
        extraction_data=SAMPLE_EXTRACTION,
        confidence_scores=SAMPLE_CONFIDENCE_WITH_NOT_FOUND,
        red_flags=[],
        template="commercial",
        document_filename="test.pdf",
    )
    assert "N/A" in html


def test_html_executive_summary_excludes_overall_meta_key(exporter):
    """The synthetic ``_overall`` aggregate must not be counted in the summary
    tier totals — otherwise MEDIUM is inflated by one on the paid export and
    the counts disagree with the field count."""
    confidence_with_overall = {
        **SAMPLE_CONFIDENCE,
        "_overall": {"tier": "medium", "overall_score": 0.86},
    }
    html = exporter._build_html(
        extraction_data=SAMPLE_EXTRACTION,
        confidence_scores=confidence_with_overall,
        red_flags=[],
        template="commercial",
        document_filename="test.pdf",
    )
    # SAMPLE_CONFIDENCE has 4 HIGH, 1 MEDIUM, 0 LOW. The _overall medium entry
    # must NOT bump MEDIUM to 2.
    assert "4 HIGH" in html
    assert "1 MEDIUM" in html
    assert "2 MEDIUM" not in html


def test_html_executive_summary_separates_na_from_low(exporter):
    """Executive summary stats must show N/A count separately from LOW count."""
    html = exporter._build_html(
        extraction_data=SAMPLE_EXTRACTION,
        confidence_scores=SAMPLE_CONFIDENCE_WITH_NOT_FOUND,
        red_flags=[],
        template="commercial",
        document_filename="test.pdf",
    )
    # 2 not_found fields should appear as N/A in stats, not mixed into LOW
    assert "N/A" in html
    assert "2 N/A" in html or "2&nbsp;N/A" in html or "2 not in lease" in html
