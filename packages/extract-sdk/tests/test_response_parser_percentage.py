"""Tests for percentage coercion fixes (M25, M26).

M25: Value of exactly 1.0 should NOT be divided (it's 100% in decimal form).
M26: String "5.25" without % sign should be divided (> 1.0 = percent form).
"""

import pytest
from extract_sdk.extraction.response_parser import _coerce_field_value


class TestPercentageCoerceBoundary:
    """Tests for M25 and M26 percentage coercion edge cases."""

    def test_m25_exactly_1_0_not_divided(self) -> None:
        """M25: 1.0 stays as 1.0 (represents 100%, not 1%)."""
        result = _coerce_field_value(1.0, "percentage")
        assert result == 1.0, f"Expected 1.0 but got {result}"

    def test_value_above_1_divided(self) -> None:
        """Values > 1.0 are in percent form and get divided."""
        assert _coerce_field_value(5.0, "percentage") == pytest.approx(0.05)
        assert _coerce_field_value(50.0, "percentage") == pytest.approx(0.50)
        assert _coerce_field_value(100.0, "percentage") == pytest.approx(1.0)

    def test_value_below_1_not_divided(self) -> None:
        """Values <= 1.0 are in decimal form and stay as-is."""
        assert _coerce_field_value(0.05, "percentage") == pytest.approx(0.05)
        assert _coerce_field_value(0.5, "percentage") == pytest.approx(0.5)
        assert _coerce_field_value(1.0, "percentage") == pytest.approx(1.0)

    def test_m26_string_no_percent_above_1_divided(self) -> None:
        """M26: String '5.25' (no % sign, > 1.0) should be divided like numeric 5.25."""
        result = _coerce_field_value("5.25", "percentage")
        assert result == pytest.approx(0.0525)

    def test_string_with_percent_sign_divided(self) -> None:
        """String '5.25%' with explicit % sign always gets divided."""
        result = _coerce_field_value("5.25%", "percentage")
        assert result == pytest.approx(0.0525)

    def test_m26_string_no_percent_below_1_not_divided(self) -> None:
        """M26: String '0.05' (no % sign, <= 1.0) stays as-is (already decimal)."""
        result = _coerce_field_value("0.05", "percentage")
        assert result == pytest.approx(0.05)

    def test_m26_consistency_numeric_vs_string(self) -> None:
        """M26 fix: numeric 5.25 and string '5.25' produce the same result."""
        numeric_result = _coerce_field_value(5.25, "percentage")
        string_result = _coerce_field_value("5.25", "percentage")
        assert numeric_result == string_result, (
            f"Inconsistency: numeric 5.25 → {numeric_result}, string '5.25' → {string_result}"
        )
