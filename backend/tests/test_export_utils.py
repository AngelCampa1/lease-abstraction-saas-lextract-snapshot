"""Tests for shared export utility functions.

Exercises unwrap_field, get_confidence_tier, and format_value helpers
used by all export format implementations.
"""

from app.services.exports.utils import (
    field_confidence_scores,
    format_value,
    get_confidence_tier,
    unwrap_field,
)

# -- field_confidence_scores tests --


def test_field_confidence_scores_strips_overall_meta_key():
    """The synthetic ``_overall`` aggregate must be excluded so export summary
    counts match the field count and do not inflate MEDIUM by one."""
    scores = {
        "landlord_legal_name": {"tier": "high"},
        "premises_address": {"tier": "low"},
        "_overall": {"tier": "medium", "overall_score": 0.83},
    }
    result = field_confidence_scores(scores)
    assert "_overall" not in result
    assert set(result) == {"landlord_legal_name", "premises_address"}


def test_field_confidence_scores_strips_any_underscore_key():
    scores = {"base_rent_annual": {"tier": "high"}, "_meta": {"tier": "low"}}
    assert set(field_confidence_scores(scores)) == {"base_rent_annual"}


def test_field_confidence_scores_none_returns_empty():
    assert field_confidence_scores(None) == {}


def test_field_confidence_scores_keeps_all_real_fields():
    scores = {"a": {"tier": "high"}, "b": {"tier": "low"}}
    assert field_confidence_scores(scores) == scores


# -- unwrap_field tests --


def test_unwrap_field_nested_dict():
    data = {"value": "ABC Corp", "confidence": 0.95, "source_text": "ABC Corp"}
    assert unwrap_field(data) == "ABC Corp"


def test_unwrap_field_plain_value():
    assert unwrap_field("plain string") == "plain string"


def test_unwrap_field_none():
    assert unwrap_field(None) is None


def test_unwrap_field_number():
    assert unwrap_field(42) == 42


def test_unwrap_field_dict_without_value_key():
    data = {"score": 0.95, "tier": "high"}
    assert unwrap_field(data) == data


def test_unwrap_field_nested_none_value():
    data = {"value": None, "confidence": 0.5}
    assert unwrap_field(data) is None


def test_unwrap_field_nested_bool_value():
    data = {"value": True, "confidence": 0.9}
    assert unwrap_field(data) is True


# -- get_confidence_tier tests --


def test_get_confidence_tier_dict_with_tier():
    data = {"score": 0.95, "tier": "high"}
    assert get_confidence_tier(data) == "HIGH"


def test_get_confidence_tier_string():
    assert get_confidence_tier("medium") == "MEDIUM"


def test_get_confidence_tier_uppercase_string():
    assert get_confidence_tier("LOW") == "LOW"


def test_get_confidence_tier_none():
    assert get_confidence_tier(None) == ""


def test_get_confidence_tier_empty_dict():
    assert get_confidence_tier({}) == ""


def test_get_confidence_tier_dict_without_tier():
    assert get_confidence_tier({"score": 0.5}) == ""


def test_get_confidence_tier_number():
    assert get_confidence_tier(42) == ""


def test_get_confidence_tier_not_found_returns_na():
    """not_found tier must display as N/A, not LOW, in exports."""
    data = {"score": 0.0, "tier": "not_found"}
    assert get_confidence_tier(data) == "N/A"


def test_get_confidence_tier_not_found_string():
    assert get_confidence_tier("not_found") == "N/A"


# -- format_value tests --


def test_format_value_none():
    assert format_value(None) == "Not found"


def test_format_value_bool_true():
    assert format_value(True) == "Yes"


def test_format_value_bool_false():
    assert format_value(False) == "No"


def test_format_value_list():
    assert format_value(["Taxes", "Insurance", "CAM"]) == "Taxes; Insurance; CAM"


def test_format_value_empty_list():
    assert format_value([]) == "None specified"


def test_format_value_string():
    assert format_value("Acme Holdings LLC") == "Acme Holdings LLC"


def test_format_value_number():
    assert format_value(42) == "42"


def test_format_value_float():
    assert format_value(3.14) == "3.14"


def test_format_value_brace_placeholder_is_not_found():
    """A blank-template token must not appear in a paid export."""
    assert format_value("{NAME OF TENANT}") == "Not found"


def test_format_value_insert_placeholder_is_not_found():
    assert format_value("insert address of property") == "Not found"


def test_format_value_real_value_with_inner_braces_kept():
    assert format_value("Suite {2}, 100 Main St") == "Suite {2}, 100 Main St"


def test_format_value_list_filters_placeholder_items():
    assert format_value(["Taxes", "{insert item}", "Insurance"]) == "Taxes; Insurance"


def test_format_value_list_all_placeholders_is_none_specified():
    assert format_value(["{insert a}", "insert b"]) == "None specified"


def test_format_value_humanizes_enum_token():
    assert format_value("pro_rata_allocation") == "Pro Rata Allocation"


def test_format_value_humanizes_list_enum_items():
    assert format_value(["stepped", "gross"]) == "Stepped; Gross"


def test_format_value_keeps_prose_untouched():
    assert format_value("Landlord maintains the HVAC") == "Landlord maintains the HVAC"
