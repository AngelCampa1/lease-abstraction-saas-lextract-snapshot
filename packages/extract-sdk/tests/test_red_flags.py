"""Tests for red flag detection rules RF-001 through RF-020."""

from __future__ import annotations

from typing import Any

from extract_sdk.red_flags import (
    CAM_RELATED_RULE_IDS,
    CAM_RELEVANT_FIELDS,
    RedFlag,
    Severity,
    detect_red_flags,
    should_show_camaudit,
)
from extract_sdk.schema.lextract_schema import build_lextract_registry


def _make_data(**overrides: Any) -> dict[str, Any]:
    """Build a baseline extracted_data dict with safe defaults (no flags trigger)."""
    base: dict[str, Any] = {
        "management_fee_cap": 10.0,
        "audit_rights": True,
        "cam_cap_percentage": 5.0,
        "cap_cumulative_vs_annual": "annual",
        "lease_structure_type": "Full Service Gross",
        "gross_up_percentage": 95.0,
        "cam_exclusions": ["capital improvements", "leasing commissions"],
        "monetary_cure_period": 30,
        "holdover_rate": 150.0,
        "has_termination_option": True,
        "lease_term_months": 60,
        "restoration_requirement": False,
        "tenant_work_description": "Standard office buildout",
        "has_renewal_option": True,
        "recapture_right": False,
        "base_year_gross_up": True,
        "base_year": "2024",
        "reconciliation_frequency": "annual",
        "cam_audit_deadline_days": 120,
        # Safe defaults for RF-016 through RF-020
        "force_majeure_clause": True,
        "auto_renewal": False,
        "auto_renewal_terms": None,
        "casualty_termination_right": "Either party may terminate after substantial damage",
        "relocation_right": False,
        "has_purchase_option": False,
    }
    base.update(overrides)
    return base


class TestSeverityEnum:
    """Test Severity enum values."""

    def test_severity_values(self) -> None:
        assert Severity.HIGH == "high"
        assert Severity.MEDIUM == "medium"
        assert Severity.LOW == "low"


class TestRedFlagModel:
    """Test RedFlag dataclass."""

    def test_red_flag_creation(self) -> None:
        flag = RedFlag(
            rule_id="RF-001",
            name="Excessive Management Fee",
            severity=Severity.HIGH,
            description="Management fee cap exceeds 15%",
            triggered_value="18%",
        )
        assert flag.rule_id == "RF-001"
        assert flag.severity == Severity.HIGH
        assert flag.triggered_value == "18%"

    def test_red_flag_to_dict(self) -> None:
        flag = RedFlag(
            rule_id="RF-001",
            name="Excessive Management Fee",
            severity=Severity.HIGH,
            description="Management fee cap exceeds 15%",
            triggered_value="18%",
        )
        d = flag.to_dict()
        assert d["rule_id"] == "RF-001"
        assert d["name"] == "Excessive Management Fee"
        assert d["severity"] == "high"
        assert d["description"] == "Management fee cap exceeds 15%"
        assert d["triggered_value"] == "18%"


class TestDetectRedFlagsNoTriggers:
    """Test that safe data triggers no red flags."""

    def test_safe_data_no_flags(self) -> None:
        data = _make_data()
        flags = detect_red_flags(data)
        assert flags == []


class TestRF001ExcessiveManagementFee:
    """RF-001: management_fee_cap > 15% or null."""

    def test_triggers_when_above_15(self) -> None:
        data = _make_data(management_fee_cap=18.0)
        flags = detect_red_flags(data)
        rf001 = [f for f in flags if f.rule_id == "RF-001"]
        assert len(rf001) == 1
        assert rf001[0].severity == Severity.HIGH
        assert "18" in rf001[0].triggered_value

    def test_triggers_when_null(self) -> None:
        data = _make_data(management_fee_cap=None)
        flags = detect_red_flags(data)
        rf001 = [f for f in flags if f.rule_id == "RF-001"]
        assert len(rf001) == 1

    def test_triggers_when_missing(self) -> None:
        data = _make_data()
        del data["management_fee_cap"]
        flags = detect_red_flags(data)
        rf001 = [f for f in flags if f.rule_id == "RF-001"]
        assert len(rf001) == 1

    def test_does_not_trigger_at_15(self) -> None:
        data = _make_data(management_fee_cap=15.0)
        flags = detect_red_flags(data)
        rf001 = [f for f in flags if f.rule_id == "RF-001"]
        assert len(rf001) == 0

    def test_does_not_trigger_below_15(self) -> None:
        data = _make_data(management_fee_cap=10.0)
        flags = detect_red_flags(data)
        rf001 = [f for f in flags if f.rule_id == "RF-001"]
        assert len(rf001) == 0


class TestRF002MissingAuditRights:
    """RF-002: audit_rights is false or null."""

    def test_triggers_when_false(self) -> None:
        data = _make_data(audit_rights=False)
        flags = detect_red_flags(data)
        rf002 = [f for f in flags if f.rule_id == "RF-002"]
        assert len(rf002) == 1
        assert rf002[0].severity == Severity.HIGH

    def test_triggers_when_null(self) -> None:
        data = _make_data(audit_rights=None)
        flags = detect_red_flags(data)
        rf002 = [f for f in flags if f.rule_id == "RF-002"]
        assert len(rf002) == 1

    def test_triggers_when_missing(self) -> None:
        data = _make_data()
        del data["audit_rights"]
        flags = detect_red_flags(data)
        rf002 = [f for f in flags if f.rule_id == "RF-002"]
        assert len(rf002) == 1

    def test_does_not_trigger_when_true(self) -> None:
        data = _make_data(audit_rights=True)
        flags = detect_red_flags(data)
        rf002 = [f for f in flags if f.rule_id == "RF-002"]
        assert len(rf002) == 0


class TestRF003NoCAMCap:
    """RF-003: cam_cap_percentage is null."""

    def test_triggers_when_null(self) -> None:
        data = _make_data(cam_cap_percentage=None)
        flags = detect_red_flags(data)
        rf003 = [f for f in flags if f.rule_id == "RF-003"]
        assert len(rf003) == 1
        assert rf003[0].severity == Severity.HIGH

    def test_triggers_when_missing(self) -> None:
        data = _make_data()
        del data["cam_cap_percentage"]
        flags = detect_red_flags(data)
        rf003 = [f for f in flags if f.rule_id == "RF-003"]
        assert len(rf003) == 1

    def test_does_not_trigger_when_present(self) -> None:
        data = _make_data(cam_cap_percentage=5.0)
        flags = detect_red_flags(data)
        rf003 = [f for f in flags if f.rule_id == "RF-003"]
        assert len(rf003) == 0


class TestRF004CumulativeCAMCap:
    """RF-004: cap_cumulative_vs_annual == 'cumulative'."""

    def test_triggers_when_cumulative(self) -> None:
        data = _make_data(cap_cumulative_vs_annual="cumulative")
        flags = detect_red_flags(data)
        rf004 = [f for f in flags if f.rule_id == "RF-004"]
        assert len(rf004) == 1
        assert rf004[0].severity == Severity.MEDIUM

    def test_triggers_case_insensitive(self) -> None:
        data = _make_data(cap_cumulative_vs_annual="Cumulative")
        flags = detect_red_flags(data)
        rf004 = [f for f in flags if f.rule_id == "RF-004"]
        assert len(rf004) == 1

    def test_does_not_trigger_when_annual(self) -> None:
        data = _make_data(cap_cumulative_vs_annual="annual")
        flags = detect_red_flags(data)
        rf004 = [f for f in flags if f.rule_id == "RF-004"]
        assert len(rf004) == 0

    def test_does_not_trigger_when_null(self) -> None:
        data = _make_data(cap_cumulative_vs_annual=None)
        flags = detect_red_flags(data)
        rf004 = [f for f in flags if f.rule_id == "RF-004"]
        assert len(rf004) == 0


class TestRF005NoGrossUpProvision:
    """RF-005: lease_structure_type contains 'NNN' and gross_up_percentage is null."""

    def test_triggers_nnn_no_grossup(self) -> None:
        data = _make_data(lease_structure_type="NNN", gross_up_percentage=None)
        flags = detect_red_flags(data)
        rf005 = [f for f in flags if f.rule_id == "RF-005"]
        assert len(rf005) == 1
        assert rf005[0].severity == Severity.MEDIUM

    def test_triggers_triple_net_variant(self) -> None:
        data = _make_data(
            lease_structure_type="Triple Net (NNN)", gross_up_percentage=None
        )
        flags = detect_red_flags(data)
        rf005 = [f for f in flags if f.rule_id == "RF-005"]
        assert len(rf005) == 1

    def test_does_not_trigger_nnn_with_grossup(self) -> None:
        data = _make_data(lease_structure_type="NNN", gross_up_percentage=95.0)
        flags = detect_red_flags(data)
        rf005 = [f for f in flags if f.rule_id == "RF-005"]
        assert len(rf005) == 0

    def test_does_not_trigger_gross_lease(self) -> None:
        data = _make_data(
            lease_structure_type="Full Service Gross", gross_up_percentage=None
        )
        flags = detect_red_flags(data)
        rf005 = [f for f in flags if f.rule_id == "RF-005"]
        assert len(rf005) == 0


class TestRF006MissingCAMExclusions:
    """RF-006: cam_exclusions is null or empty."""

    def test_triggers_when_null(self) -> None:
        data = _make_data(cam_exclusions=None)
        flags = detect_red_flags(data)
        rf006 = [f for f in flags if f.rule_id == "RF-006"]
        assert len(rf006) == 1
        assert rf006[0].severity == Severity.HIGH

    def test_triggers_when_empty_list(self) -> None:
        data = _make_data(cam_exclusions=[])
        flags = detect_red_flags(data)
        rf006 = [f for f in flags if f.rule_id == "RF-006"]
        assert len(rf006) == 1

    def test_triggers_when_missing(self) -> None:
        data = _make_data()
        del data["cam_exclusions"]
        flags = detect_red_flags(data)
        rf006 = [f for f in flags if f.rule_id == "RF-006"]
        assert len(rf006) == 1

    def test_does_not_trigger_with_exclusions(self) -> None:
        data = _make_data(cam_exclusions=["capital improvements"])
        flags = detect_red_flags(data)
        rf006 = [f for f in flags if f.rule_id == "RF-006"]
        assert len(rf006) == 0


class TestRF007ShortCurePeriod:
    """RF-007: monetary_cure_period < 10 days."""

    def test_triggers_below_10(self) -> None:
        data = _make_data(monetary_cure_period=5)
        flags = detect_red_flags(data)
        rf007 = [f for f in flags if f.rule_id == "RF-007"]
        assert len(rf007) == 1
        assert rf007[0].severity == Severity.MEDIUM
        assert "5" in rf007[0].triggered_value

    def test_does_not_trigger_at_10(self) -> None:
        data = _make_data(monetary_cure_period=10)
        flags = detect_red_flags(data)
        rf007 = [f for f in flags if f.rule_id == "RF-007"]
        assert len(rf007) == 0

    def test_does_not_trigger_above_10(self) -> None:
        data = _make_data(monetary_cure_period=30)
        flags = detect_red_flags(data)
        rf007 = [f for f in flags if f.rule_id == "RF-007"]
        assert len(rf007) == 0

    def test_does_not_trigger_when_null(self) -> None:
        data = _make_data(monetary_cure_period=None)
        flags = detect_red_flags(data)
        rf007 = [f for f in flags if f.rule_id == "RF-007"]
        assert len(rf007) == 0


class TestRF008AggressiveHoldoverRate:
    """RF-008: holdover_rate > 200%."""

    def test_triggers_above_200(self) -> None:
        data = _make_data(holdover_rate=250.0)
        flags = detect_red_flags(data)
        rf008 = [f for f in flags if f.rule_id == "RF-008"]
        assert len(rf008) == 1
        assert rf008[0].severity == Severity.MEDIUM
        assert "250" in rf008[0].triggered_value

    def test_does_not_trigger_at_200(self) -> None:
        data = _make_data(holdover_rate=200.0)
        flags = detect_red_flags(data)
        rf008 = [f for f in flags if f.rule_id == "RF-008"]
        assert len(rf008) == 0

    def test_does_not_trigger_below_200(self) -> None:
        data = _make_data(holdover_rate=150.0)
        flags = detect_red_flags(data)
        rf008 = [f for f in flags if f.rule_id == "RF-008"]
        assert len(rf008) == 0

    def test_does_not_trigger_when_null(self) -> None:
        data = _make_data(holdover_rate=None)
        flags = detect_red_flags(data)
        rf008 = [f for f in flags if f.rule_id == "RF-008"]
        assert len(rf008) == 0


class TestRF009NoTerminationOption:
    """RF-009: has_termination_option is false and lease_term_months > 60."""

    def test_triggers_no_termination_long_lease(self) -> None:
        data = _make_data(has_termination_option=False, lease_term_months=120)
        flags = detect_red_flags(data)
        rf009 = [f for f in flags if f.rule_id == "RF-009"]
        assert len(rf009) == 1
        assert rf009[0].severity == Severity.LOW

    def test_does_not_trigger_with_termination(self) -> None:
        data = _make_data(has_termination_option=True, lease_term_months=120)
        flags = detect_red_flags(data)
        rf009 = [f for f in flags if f.rule_id == "RF-009"]
        assert len(rf009) == 0

    def test_does_not_trigger_short_lease(self) -> None:
        data = _make_data(has_termination_option=False, lease_term_months=60)
        flags = detect_red_flags(data)
        rf009 = [f for f in flags if f.rule_id == "RF-009"]
        assert len(rf009) == 0

    def test_does_not_trigger_exactly_60_months(self) -> None:
        data = _make_data(has_termination_option=False, lease_term_months=60)
        flags = detect_red_flags(data)
        rf009 = [f for f in flags if f.rule_id == "RF-009"]
        assert len(rf009) == 0


class TestRF010MissingRestorationClarity:
    """RF-010: restoration_requirement == true AND tenant_work_description is null."""

    def test_triggers_restoration_no_description(self) -> None:
        data = _make_data(restoration_requirement=True, tenant_work_description=None)
        flags = detect_red_flags(data)
        rf010 = [f for f in flags if f.rule_id == "RF-010"]
        assert len(rf010) == 1
        assert rf010[0].severity == Severity.LOW

    def test_triggers_restoration_missing_description(self) -> None:
        data = _make_data(restoration_requirement=True)
        del data["tenant_work_description"]
        flags = detect_red_flags(data)
        rf010 = [f for f in flags if f.rule_id == "RF-010"]
        assert len(rf010) == 1

    def test_does_not_trigger_no_restoration_required(self) -> None:
        data = _make_data(restoration_requirement=False, tenant_work_description=None)
        flags = detect_red_flags(data)
        rf010 = [f for f in flags if f.rule_id == "RF-010"]
        assert len(rf010) == 0

    def test_does_not_trigger_with_description(self) -> None:
        data = _make_data(
            restoration_requirement=True, tenant_work_description="Remove all fixtures"
        )
        flags = detect_red_flags(data)
        rf010 = [f for f in flags if f.rule_id == "RF-010"]
        assert len(rf010) == 0


class TestRF011NoRenewalOption:
    """RF-011: has_renewal_option is false."""

    def test_triggers_when_false(self) -> None:
        data = _make_data(has_renewal_option=False)
        flags = detect_red_flags(data)
        rf011 = [f for f in flags if f.rule_id == "RF-011"]
        assert len(rf011) == 1
        assert rf011[0].severity == Severity.LOW

    def test_does_not_trigger_when_true(self) -> None:
        data = _make_data(has_renewal_option=True)
        flags = detect_red_flags(data)
        rf011 = [f for f in flags if f.rule_id == "RF-011"]
        assert len(rf011) == 0

    def test_does_not_trigger_when_null(self) -> None:
        data = _make_data(has_renewal_option=None)
        flags = detect_red_flags(data)
        rf011 = [f for f in flags if f.rule_id == "RF-011"]
        assert len(rf011) == 0


class TestRF012RecaptureRight:
    """RF-012: recapture_right is true."""

    def test_triggers_when_true(self) -> None:
        data = _make_data(recapture_right=True)
        flags = detect_red_flags(data)
        rf012 = [f for f in flags if f.rule_id == "RF-012"]
        assert len(rf012) == 1
        assert rf012[0].severity == Severity.MEDIUM

    def test_does_not_trigger_when_false(self) -> None:
        data = _make_data(recapture_right=False)
        flags = detect_red_flags(data)
        rf012 = [f for f in flags if f.rule_id == "RF-012"]
        assert len(rf012) == 0

    def test_does_not_trigger_when_null(self) -> None:
        data = _make_data(recapture_right=None)
        flags = detect_red_flags(data)
        rf012 = [f for f in flags if f.rule_id == "RF-012"]
        assert len(rf012) == 0


class TestRF013NoBaseYearGrossUp:
    """RF-013: base_year_gross_up is false AND base_year is not null."""

    def test_triggers_no_grossup_with_base_year(self) -> None:
        data = _make_data(base_year_gross_up=False, base_year="2024")
        flags = detect_red_flags(data)
        rf013 = [f for f in flags if f.rule_id == "RF-013"]
        assert len(rf013) == 1
        assert rf013[0].severity == Severity.MEDIUM

    def test_triggers_null_grossup_with_base_year(self) -> None:
        data = _make_data(base_year_gross_up=None, base_year="2024")
        flags = detect_red_flags(data)
        rf013 = [f for f in flags if f.rule_id == "RF-013"]
        assert len(rf013) == 1

    def test_does_not_trigger_with_grossup(self) -> None:
        data = _make_data(base_year_gross_up=True, base_year="2024")
        flags = detect_red_flags(data)
        rf013 = [f for f in flags if f.rule_id == "RF-013"]
        assert len(rf013) == 0

    def test_does_not_trigger_no_base_year(self) -> None:
        data = _make_data(base_year_gross_up=False, base_year=None)
        flags = detect_red_flags(data)
        rf013 = [f for f in flags if f.rule_id == "RF-013"]
        assert len(rf013) == 0


class TestRF014NoReconciliationFrequency:
    """RF-014: reconciliation_frequency is null AND lease_structure_type contains 'NNN'."""

    def test_triggers_nnn_no_reconciliation(self) -> None:
        data = _make_data(reconciliation_frequency=None, lease_structure_type="NNN")
        flags = detect_red_flags(data)
        rf014 = [f for f in flags if f.rule_id == "RF-014"]
        assert len(rf014) == 1
        assert rf014[0].severity == Severity.MEDIUM

    def test_triggers_triple_net_variant(self) -> None:
        data = _make_data(
            reconciliation_frequency=None, lease_structure_type="Triple Net (NNN)"
        )
        flags = detect_red_flags(data)
        rf014 = [f for f in flags if f.rule_id == "RF-014"]
        assert len(rf014) == 1

    def test_does_not_trigger_with_frequency(self) -> None:
        data = _make_data(reconciliation_frequency="annual", lease_structure_type="NNN")
        flags = detect_red_flags(data)
        rf014 = [f for f in flags if f.rule_id == "RF-014"]
        assert len(rf014) == 0

    def test_does_not_trigger_gross_lease(self) -> None:
        data = _make_data(
            reconciliation_frequency=None, lease_structure_type="Full Service Gross"
        )
        flags = detect_red_flags(data)
        rf014 = [f for f in flags if f.rule_id == "RF-014"]
        assert len(rf014) == 0


class TestRF015ShortAuditWindow:
    """RF-015: cam_audit_deadline_days < 60."""

    def test_triggers_below_60(self) -> None:
        data = _make_data(cam_audit_deadline_days=30)
        flags = detect_red_flags(data)
        rf015 = [f for f in flags if f.rule_id == "RF-015"]
        assert len(rf015) == 1
        assert rf015[0].severity == Severity.MEDIUM
        assert "30" in rf015[0].triggered_value

    def test_does_not_trigger_at_60(self) -> None:
        data = _make_data(cam_audit_deadline_days=60)
        flags = detect_red_flags(data)
        rf015 = [f for f in flags if f.rule_id == "RF-015"]
        assert len(rf015) == 0

    def test_does_not_trigger_above_60(self) -> None:
        data = _make_data(cam_audit_deadline_days=120)
        flags = detect_red_flags(data)
        rf015 = [f for f in flags if f.rule_id == "RF-015"]
        assert len(rf015) == 0

    def test_does_not_trigger_when_null(self) -> None:
        data = _make_data(cam_audit_deadline_days=None)
        flags = detect_red_flags(data)
        rf015 = [f for f in flags if f.rule_id == "RF-015"]
        assert len(rf015) == 0


class TestDetectRedFlagsMultiple:
    """Test multiple flags triggering together."""

    def test_multiple_flags_fire(self) -> None:
        data = _make_data(
            management_fee_cap=20.0,
            audit_rights=False,
            cam_cap_percentage=None,
        )
        flags = detect_red_flags(data)
        rule_ids = {f.rule_id for f in flags}
        assert "RF-001" in rule_ids
        assert "RF-002" in rule_ids
        assert "RF-003" in rule_ids

    def test_all_flags_can_fire(self) -> None:
        """Worst-case lease: every rule should trigger."""
        data = {
            "management_fee_cap": 20.0,
            "audit_rights": False,
            "cam_cap_percentage": None,
            "cap_cumulative_vs_annual": "cumulative",
            "lease_structure_type": "NNN",
            "gross_up_percentage": None,
            "cam_exclusions": [],
            "monetary_cure_period": 5,
            "holdover_rate": 300.0,
            "has_termination_option": False,
            "lease_term_months": 120,
            "restoration_requirement": True,
            "tenant_work_description": None,
            "has_renewal_option": False,
            "recapture_right": True,
            "base_year_gross_up": False,
            "base_year": "2024",
            "reconciliation_frequency": None,
            "cam_audit_deadline_days": 30,
            # RF-016 through RF-020 triggers
            "force_majeure_clause": False,
            "auto_renewal": True,
            "auto_renewal_terms": None,
            "casualty_termination_right": None,
            "relocation_right": True,
            "has_purchase_option": None,
        }
        flags = detect_red_flags(data)
        rule_ids = {f.rule_id for f in flags}
        for i in range(1, 21):
            assert f"RF-{i:03d}" in rule_ids, f"RF-{i:03d} did not trigger"
        assert len(flags) == 20

    def test_empty_data_triggers_null_rules(self) -> None:
        """Empty dict should trigger rules that fire on null/missing."""
        flags = detect_red_flags({})
        rule_ids = {f.rule_id for f in flags}
        # Null-triggered rules: RF-001, RF-002, RF-003, RF-006, RF-016, RF-018, RF-020
        assert "RF-001" in rule_ids
        assert "RF-002" in rule_ids
        assert "RF-003" in rule_ids
        assert "RF-006" in rule_ids
        assert "RF-016" in rule_ids
        assert "RF-018" in rule_ids
        assert "RF-020" in rule_ids

    def test_output_format_is_dict_list(self) -> None:
        data = _make_data(management_fee_cap=20.0)
        flags = detect_red_flags(data)
        assert len(flags) > 0
        flag = flags[0]
        assert isinstance(flag, RedFlag)
        d = flag.to_dict()
        assert set(d.keys()) == {
            "rule_id",
            "name",
            "severity",
            "description",
            "triggered_value",
        }


class TestCAMRelatedRuleIds:
    """Test that the CAM_RELATED_RULE_IDS constant is correct."""

    def test_cam_related_rule_ids(self) -> None:
        expected = {
            "RF-001",
            "RF-002",
            "RF-003",
            "RF-004",
            "RF-005",
            "RF-006",
            "RF-013",
            "RF-014",
            "RF-015",
        }
        assert CAM_RELATED_RULE_IDS == expected


class TestCAMRelevantFields:
    """Test CAM low-confidence trigger fields come from schema metadata."""

    def test_cam_relevant_fields_match_registry_metadata(self) -> None:
        registry = build_lextract_registry()
        expected = frozenset(
            field.field_name for field in registry if field.cam_relevant
        )

        assert CAM_RELEVANT_FIELDS == expected


class TestShouldShowCamaudit:
    """Test should_show_camaudit function."""

    def test_returns_true_for_cam_related_flag(self) -> None:
        data = _make_data(management_fee_cap=20.0)
        flags = detect_red_flags(data)
        assert should_show_camaudit(flags, data) is True

    def test_returns_true_audit_rights_true(self) -> None:
        """audit_rights == true means tenant CAN audit -> show CamAudit."""
        data = _make_data(audit_rights=True)
        flags = detect_red_flags(data)
        # No CAM flags, but audit_rights=True triggers the CTA
        assert should_show_camaudit(flags, data) is True

    def test_returns_true_nnn_lease(self) -> None:
        """NNN lease type triggers CamAudit CTA (condition 3)."""
        # Use neutral data with no flags and no audit_rights=True
        data: dict[str, Any] = {"lease_structure_type": "NNN"}
        flags: list[RedFlag] = []
        assert should_show_camaudit(flags, data) is True

    def test_returns_true_modified_gross_lease(self) -> None:
        """Modified Gross lease type triggers CamAudit CTA (condition 3)."""
        # Use neutral data with no flags and no audit_rights=True
        data: dict[str, Any] = {"lease_structure_type": "Modified Gross"}
        flags: list[RedFlag] = []
        assert should_show_camaudit(flags, data) is True

    def test_returns_true_3_plus_low_confidence_cam_fields(self) -> None:
        data = _make_data(
            audit_rights=True,  # Need this for non-flag trigger
        )
        # Override to non-CamAudit-trigger scenario
        data["audit_rights"] = False  # Will trigger RF-002 (CAM related)
        # RF-002 is CAM related so it triggers anyway; test with confidence separately
        # Reset to safe data, use confidence scores
        no_flag_data = _make_data()
        no_flag_data["lease_structure_type"] = "Full Service Gross"
        no_flag_data["audit_rights"] = True
        no_flags: list[RedFlag] = []
        confidence_scores: dict[str, float] = {
            "cam_cap_percentage": 0.4,
            "cam_exclusions": 0.3,
            "management_fee_cap": 0.45,
            "pro_rata_share": 0.5,
        }
        # audit_rights=True triggers CTA regardless
        assert should_show_camaudit(no_flags, no_flag_data, confidence_scores) is True

    def test_returns_true_3_low_confidence_cam_only(self) -> None:
        """Pure confidence-score path: no flags, no special lease type, no audit rights."""
        flags: list[RedFlag] = []
        data_neutral: dict[str, Any] = {
            "lease_structure_type": "Full Service Gross",
        }
        confidence_scores = {
            "cam_cap_percentage": 0.4,
            "cam_exclusions": 0.3,
            "management_fee_cap": 0.45,
        }
        result = should_show_camaudit(flags, data_neutral, confidence_scores)
        assert result is True

    def test_returns_false_no_triggers(self) -> None:
        """No CAM flags, no audit rights, not NNN, high confidence -> False."""
        data: dict[str, Any] = {
            "lease_structure_type": "Full Service Gross",
            "audit_rights": False,
        }
        flags: list[RedFlag] = []
        confidence_scores: dict[str, float] = {
            "cam_cap_percentage": 0.95,
            "cam_exclusions": 0.9,
            "management_fee_cap": 0.88,
        }
        result = should_show_camaudit(flags, data, confidence_scores)
        assert result is False

    def test_returns_false_high_confidence(self) -> None:
        """All CAM fields high confidence, no flags, Gross lease -> False."""
        data: dict[str, Any] = {"lease_structure_type": "Full Service Gross"}
        flags: list[RedFlag] = []
        confidence_scores: dict[str, float] = {
            "cam_cap_percentage": 0.99,
            "cam_exclusions": 0.95,
            "management_fee_cap": 0.92,
            "pro_rata_share": 0.98,
        }
        result = should_show_camaudit(flags, data, confidence_scores)
        assert result is False

    def test_confidence_threshold_is_medium_low(self) -> None:
        """Only scores <= 0.6 count as medium/low confidence."""
        data: dict[str, Any] = {"lease_structure_type": "Full Service Gross"}
        flags: list[RedFlag] = []
        # Two below threshold, one above -> not enough (need 3)
        confidence_scores: dict[str, float] = {
            "cam_cap_percentage": 0.4,
            "cam_exclusions": 0.3,
            "management_fee_cap": 0.7,
        }
        result = should_show_camaudit(flags, data, confidence_scores)
        assert result is False

    def test_defaults_confidence_scores_to_none(self) -> None:
        """When confidence_scores not provided, that path doesn't trigger."""
        data: dict[str, Any] = {"lease_structure_type": "Full Service Gross"}
        flags: list[RedFlag] = []
        result = should_show_camaudit(flags, data)
        assert result is False

    def test_cam_flag_rf006_triggers_camaudit(self) -> None:
        data = _make_data(cam_exclusions=[])
        flags = detect_red_flags(data)
        assert should_show_camaudit(flags, data) is True

    def test_non_cam_flag_alone_does_not_trigger(self) -> None:
        """RF-011 (No Renewal) is not CAM-related -> doesn't trigger CamAudit alone."""
        # Need to avoid any other triggers
        data: dict[str, Any] = {"lease_structure_type": "Full Service Gross"}
        flag = RedFlag(
            rule_id="RF-011",
            name="No Renewal Option",
            severity=Severity.LOW,
            description="No renewal option",
            triggered_value="false",
        )
        result = should_show_camaudit([flag], data)
        assert result is False


class TestEdgeCases:
    """Test edge cases and type coercion."""

    def test_string_numeric_values_handled(self) -> None:
        """If a numeric field arrives as a string, it should still work."""
        data = _make_data(management_fee_cap="18")
        flags = detect_red_flags(data)
        rf001 = [f for f in flags if f.rule_id == "RF-001"]
        assert len(rf001) == 1

    def test_percentage_as_decimal_below_threshold(self) -> None:
        """management_fee_cap of 0.10 means 10%, which is below the 15% cap."""
        data = _make_data(management_fee_cap=0.10)
        flags = detect_red_flags(data)
        rf001 = [f for f in flags if f.rule_id == "RF-001"]
        assert len(rf001) == 0

    def test_management_fee_decimal_scale_over_threshold_triggers(self) -> None:
        """management_fee_cap of 0.18 means 18%, which exceeds the 15% cap."""
        data = _make_data(management_fee_cap=0.18)
        flags = detect_red_flags(data)
        rf001 = [f for f in flags if f.rule_id == "RF-001"]
        assert len(rf001) == 1
        assert rf001[0].triggered_value == "18.0%"

    def test_holdover_rate_decimal_scale_over_threshold_triggers(self) -> None:
        """holdover_rate of 2.5 means 250%, which exceeds the 200% threshold."""
        data = _make_data(holdover_rate=2.5)
        flags = detect_red_flags(data)
        rf008 = [f for f in flags if f.rule_id == "RF-008"]
        assert len(rf008) == 1
        assert rf008[0].triggered_value == "250.0%"

    def test_holdover_rate_ten_x_multiplier_triggers(self) -> None:
        """holdover_rate of 10.0 means 1000%, which exceeds the 200% threshold."""
        data = _make_data(holdover_rate=10.0)
        flags = detect_red_flags(data)
        rf008 = [f for f in flags if f.rule_id == "RF-008"]
        assert len(rf008) == 1
        assert rf008[0].triggered_value == "1000.0%"

    def test_holdover_rate_as_string(self) -> None:
        data = _make_data(holdover_rate="250")
        flags = detect_red_flags(data)
        rf008 = [f for f in flags if f.rule_id == "RF-008"]
        assert len(rf008) == 1

    def test_non_numeric_value_treated_as_null(self) -> None:
        """If a numeric field has a non-parseable value, treat as None."""
        data = _make_data(management_fee_cap="not a number")
        flags = detect_red_flags(data)
        rf001 = [f for f in flags if f.rule_id == "RF-001"]
        # Treated as null -> triggers
        assert len(rf001) == 1

    def test_cam_exclusions_string_treated_as_present(self) -> None:
        """If cam_exclusions is a non-empty string, don't trigger."""
        data = _make_data(cam_exclusions="capital improvements")
        flags = detect_red_flags(data)
        rf006 = [f for f in flags if f.rule_id == "RF-006"]
        assert len(rf006) == 0

    def test_bool_in_numeric_field_treated_as_null(self) -> None:
        """Boolean True/False in a numeric field should be treated as null."""
        data = _make_data(management_fee_cap=True)
        flags = detect_red_flags(data)
        rf001 = [f for f in flags if f.rule_id == "RF-001"]
        assert len(rf001) == 1  # Treated as null -> triggers

    def test_list_in_numeric_field_treated_as_null(self) -> None:
        """A list in a numeric field should be treated as null."""
        data = _make_data(management_fee_cap=[15])
        flags = detect_red_flags(data)
        rf001 = [f for f in flags if f.rule_id == "RF-001"]
        assert len(rf001) == 1  # Treated as null -> triggers

    def test_string_in_bool_field_treated_as_null(self) -> None:
        """String 'true' in a boolean field should be treated as null."""
        data = _make_data(has_renewal_option="true")
        flags = detect_red_flags(data)
        rf011 = [f for f in flags if f.rule_id == "RF-011"]
        # String "true" is not bool True, treated as None -> does not trigger
        assert len(rf011) == 0

    def test_int_in_bool_field_treated_as_null(self) -> None:
        """Integer in a boolean field should be treated as null."""
        data = _make_data(recapture_right=1)
        flags = detect_red_flags(data)
        rf012 = [f for f in flags if f.rule_id == "RF-012"]
        # 1 is not bool True, treated as None -> does not trigger
        assert len(rf012) == 0


class TestRF016MissingForceMajeure:
    """RF-016: force_majeure_clause is false or null."""

    def test_triggers_when_false(self) -> None:
        data = _make_data(force_majeure_clause=False)
        flags = detect_red_flags(data)
        rf016 = [f for f in flags if f.rule_id == "RF-016"]
        assert len(rf016) == 1
        assert rf016[0].severity == Severity.MEDIUM
        assert rf016[0].triggered_value == "false"

    def test_triggers_when_null(self) -> None:
        data = _make_data(force_majeure_clause=None)
        flags = detect_red_flags(data)
        rf016 = [f for f in flags if f.rule_id == "RF-016"]
        assert len(rf016) == 1
        assert rf016[0].triggered_value == "missing"

    def test_triggers_when_missing(self) -> None:
        data = _make_data()
        del data["force_majeure_clause"]
        flags = detect_red_flags(data)
        rf016 = [f for f in flags if f.rule_id == "RF-016"]
        assert len(rf016) == 1

    def test_does_not_trigger_when_true(self) -> None:
        data = _make_data(force_majeure_clause=True)
        flags = detect_red_flags(data)
        rf016 = [f for f in flags if f.rule_id == "RF-016"]
        assert len(rf016) == 0


class TestRF017AutoRenewalWithoutNotice:
    """RF-017: auto_renewal is true but auto_renewal_terms is null/empty."""

    def test_triggers_when_auto_renewal_true_no_terms(self) -> None:
        data = _make_data(auto_renewal=True, auto_renewal_terms=None)
        flags = detect_red_flags(data)
        rf017 = [f for f in flags if f.rule_id == "RF-017"]
        assert len(rf017) == 1
        assert rf017[0].severity == Severity.MEDIUM

    def test_triggers_when_auto_renewal_true_empty_terms(self) -> None:
        data = _make_data(auto_renewal=True, auto_renewal_terms="")
        flags = detect_red_flags(data)
        rf017 = [f for f in flags if f.rule_id == "RF-017"]
        assert len(rf017) == 1

    def test_does_not_trigger_when_auto_renewal_false(self) -> None:
        data = _make_data(auto_renewal=False, auto_renewal_terms=None)
        flags = detect_red_flags(data)
        rf017 = [f for f in flags if f.rule_id == "RF-017"]
        assert len(rf017) == 0

    def test_does_not_trigger_when_terms_provided(self) -> None:
        data = _make_data(
            auto_renewal=True,
            auto_renewal_terms="Renews for 1 year unless 90 days notice given",
        )
        flags = detect_red_flags(data)
        rf017 = [f for f in flags if f.rule_id == "RF-017"]
        assert len(rf017) == 0

    def test_does_not_trigger_when_null(self) -> None:
        data = _make_data(auto_renewal=None, auto_renewal_terms=None)
        flags = detect_red_flags(data)
        rf017 = [f for f in flags if f.rule_id == "RF-017"]
        assert len(rf017) == 0


class TestRF018NoCasualtyTerminationRight:
    """RF-018: casualty_termination_right is null or empty."""

    def test_triggers_when_null(self) -> None:
        data = _make_data(casualty_termination_right=None)
        flags = detect_red_flags(data)
        rf018 = [f for f in flags if f.rule_id == "RF-018"]
        assert len(rf018) == 1
        assert rf018[0].severity == Severity.MEDIUM
        assert rf018[0].triggered_value == "missing"

    def test_triggers_when_empty_string(self) -> None:
        data = _make_data(casualty_termination_right="")
        flags = detect_red_flags(data)
        rf018 = [f for f in flags if f.rule_id == "RF-018"]
        assert len(rf018) == 1

    def test_triggers_when_missing(self) -> None:
        data = _make_data()
        del data["casualty_termination_right"]
        flags = detect_red_flags(data)
        rf018 = [f for f in flags if f.rule_id == "RF-018"]
        assert len(rf018) == 1

    def test_does_not_trigger_when_present(self) -> None:
        data = _make_data(
            casualty_termination_right="Either party may terminate if damage exceeds 50% of value"
        )
        flags = detect_red_flags(data)
        rf018 = [f for f in flags if f.rule_id == "RF-018"]
        assert len(rf018) == 0


class TestRF019RelocationRightPresent:
    """RF-019: relocation_right is true."""

    def test_triggers_when_true(self) -> None:
        data = _make_data(relocation_right=True)
        flags = detect_red_flags(data)
        rf019 = [f for f in flags if f.rule_id == "RF-019"]
        assert len(rf019) == 1
        assert rf019[0].severity == Severity.MEDIUM
        assert rf019[0].triggered_value == "true"

    def test_does_not_trigger_when_false(self) -> None:
        data = _make_data(relocation_right=False)
        flags = detect_red_flags(data)
        rf019 = [f for f in flags if f.rule_id == "RF-019"]
        assert len(rf019) == 0

    def test_does_not_trigger_when_null(self) -> None:
        data = _make_data(relocation_right=None)
        flags = detect_red_flags(data)
        rf019 = [f for f in flags if f.rule_id == "RF-019"]
        assert len(rf019) == 0

    def test_does_not_trigger_when_missing(self) -> None:
        data = _make_data()
        del data["relocation_right"]
        flags = detect_red_flags(data)
        rf019 = [f for f in flags if f.rule_id == "RF-019"]
        assert len(rf019) == 0


class TestRF020NoPurchaseOptionDisclosure:
    """RF-020: has_purchase_option is None (not disclosed)."""

    def test_triggers_when_null(self) -> None:
        data = _make_data(has_purchase_option=None)
        flags = detect_red_flags(data)
        rf020 = [f for f in flags if f.rule_id == "RF-020"]
        assert len(rf020) == 1
        assert rf020[0].severity == Severity.LOW
        assert rf020[0].triggered_value == "missing"

    def test_triggers_when_missing(self) -> None:
        data = _make_data()
        del data["has_purchase_option"]
        flags = detect_red_flags(data)
        rf020 = [f for f in flags if f.rule_id == "RF-020"]
        assert len(rf020) == 1

    def test_does_not_trigger_when_true(self) -> None:
        data = _make_data(has_purchase_option=True)
        flags = detect_red_flags(data)
        rf020 = [f for f in flags if f.rule_id == "RF-020"]
        assert len(rf020) == 0

    def test_does_not_trigger_when_false(self) -> None:
        data = _make_data(has_purchase_option=False)
        flags = detect_red_flags(data)
        rf020 = [f for f in flags if f.rule_id == "RF-020"]
        assert len(rf020) == 0

    def test_triggers_when_non_boolean_integer(self) -> None:
        """Non-boolean values (e.g. 0 from LLM) are not proper disclosures — should fire."""
        data = _make_data()
        data["has_purchase_option"] = 0
        flags = detect_red_flags(data)
        rf020 = [f for f in flags if f.rule_id == "RF-020"]
        assert len(rf020) == 1

    def test_triggers_when_non_boolean_string(self) -> None:
        """String 'false' is not a proper boolean disclosure — should fire."""
        data = _make_data()
        data["has_purchase_option"] = "false"
        flags = detect_red_flags(data)
        rf020 = [f for f in flags if f.rule_id == "RF-020"]
        assert len(rf020) == 1
