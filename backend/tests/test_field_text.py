"""Tests for shared extraction field-text normalization.

Exercises the placeholder detection and value normalization used by the
teaser, the full results endpoint, and the exports — every buyer-facing
surface that renders raw extracted values.
"""

from app.services.field_text import (
    clean_text_value,
    humanize_enum_value,
    is_template_placeholder,
    normalize_field_value,
)

# -- humanize_enum_value --


def test_humanize_single_lowercase_word():
    assert humanize_enum_value("gross") == "Gross"


def test_humanize_snake_case_token():
    assert humanize_enum_value("pro_rata_allocation") == "Pro Rata Allocation"


def test_humanize_leaves_prose_with_spaces_untouched():
    assert humanize_enum_value("Two (2) additional one year periods") == (
        "Two (2) additional one year periods"
    )


def test_humanize_leaves_capitalized_name_untouched():
    assert humanize_enum_value("GEORGIA BUILDING AUTHORITY") == (
        "GEORGIA BUILDING AUTHORITY"
    )


def test_humanize_leaves_numeric_string_untouched():
    assert humanize_enum_value("2000000.0") == "2000000.0"


def test_humanize_leaves_date_untouched():
    assert humanize_enum_value("2026-01-01") == "2026-01-01"


def test_humanize_leaves_filename_untouched():
    # A filename has a dot, so it is not an enum token and must not be mangled
    # into "My Lease.Pdf".
    assert humanize_enum_value("my_lease.pdf") == "my_lease.pdf"


# -- is_template_placeholder --


def test_brace_wrapped_token_is_placeholder():
    assert is_template_placeholder("{NAME OF TENANT}") is True


def test_insert_prefixed_token_is_placeholder():
    assert is_template_placeholder("insert address of property") is True


def test_insert_prefix_is_case_insensitive():
    assert is_template_placeholder("Insert mailing address") is True


def test_real_value_is_not_placeholder():
    assert is_template_placeholder("ABC Corp") is False


def test_value_with_inner_braces_is_not_placeholder():
    # Only a fully brace-wrapped token counts; a real address with a
    # bracketed suite number must survive.
    assert is_template_placeholder("Suite {2}, 100 Main St") is False


# -- clean_text_value --


def test_clean_strips_whitespace():
    assert clean_text_value("  ABC Corp  ") == "ABC Corp"


def test_clean_blank_becomes_none():
    assert clean_text_value("   ") is None


def test_clean_placeholder_becomes_none():
    assert clean_text_value("{insert base term of lease}") is None


# -- normalize_field_value --


def test_normalize_none():
    assert normalize_field_value(None) is None


def test_normalize_bool_true():
    assert normalize_field_value(True) == "Yes"


def test_normalize_bool_false():
    assert normalize_field_value(False) == "No"


def test_normalize_string():
    assert normalize_field_value("Acme LLC") == "Acme LLC"


def test_normalize_placeholder_string():
    assert normalize_field_value("{NAME OF TENANT}") is None


def test_normalize_list_joins_for_humans():
    assert normalize_field_value(["Taxes", "Insurance"]) == "Taxes, Insurance"


def test_normalize_list_filters_blanks_and_placeholders():
    assert normalize_field_value(["Taxes", "  ", "{insert item}"]) == "Taxes"


def test_normalize_empty_list_is_none():
    assert normalize_field_value([]) is None


def test_normalize_number_passes_through():
    assert normalize_field_value(42) == "42"


def test_normalize_humanizes_enum_string():
    assert normalize_field_value("pro_rata_allocation") == "Pro Rata Allocation"


def test_normalize_humanizes_list_enum_items():
    assert normalize_field_value(["stepped", "gross"]) == "Stepped, Gross"


def test_normalize_keeps_prose_string_untouched():
    assert normalize_field_value("Landlord maintains the HVAC") == (
        "Landlord maintains the HVAC"
    )
