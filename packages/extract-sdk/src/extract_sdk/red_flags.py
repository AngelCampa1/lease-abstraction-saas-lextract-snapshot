"""Red flag detection for commercial lease extracted data.

Implements 20 rules (RF-001 through RF-020) that analyze extracted lease
fields for concerning terms and missing protections. Also provides
CamAudit upsell trigger logic.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import Any

from extract_sdk.schema.lextract_schema import get_lextract_registry

# CAM-relevant field names from lextract_field_schema.json metadata.
# Used by should_show_camaudit to check for low-confidence CAM fields.
CAM_RELEVANT_FIELDS: frozenset[str] = frozenset(
    field.field_name for field in get_lextract_registry() if field.cam_relevant
)

# Rule IDs that directly indicate CAM audit relevance (per PRD 6.3).
CAM_RELATED_RULE_IDS: set[str] = {
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

# Medium/low confidence threshold (at or below this value).
_CONFIDENCE_THRESHOLD = 0.6


class Severity(StrEnum):
    """Red flag severity levels."""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass(frozen=True, slots=True)
class RedFlag:
    """A single red flag detection result."""

    rule_id: str
    name: str
    severity: Severity
    description: str
    triggered_value: str

    def to_dict(self) -> dict[str, str]:
        """Serialize to dict matching the JSONB output spec."""
        return {
            "rule_id": self.rule_id,
            "name": self.name,
            "severity": self.severity.value,
            "description": self.description,
            "triggered_value": self.triggered_value,
        }


def _safe_float(value: Any) -> float | None:
    """Try to parse a value as float. Return None if unparseable."""
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, int | float):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return None
    return None


def _safe_bool(value: Any) -> bool | None:
    """Extract a boolean value, returning None for non-bool types."""
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    return None


def _normalize_fraction_percentage(value: float) -> float:
    """Normalize percentage values stored as fractions, e.g. 0.18 -> 18."""
    if 0 < abs(value) <= 1:
        return value * 100
    return value


def _normalize_multiplier_percentage(value: float) -> float:
    """Normalize multiplier-style percentages, e.g. 2.5 -> 250."""
    if 0 < abs(value) <= 10:
        return value * 100
    return value


def _str_contains_nnn(lease_type: Any) -> bool:
    """Check if a lease_structure_type value contains 'NNN' (case-insensitive)."""
    if not isinstance(lease_type, str):
        return False
    return "nnn" in lease_type.lower()


def _check_rf001(data: dict[str, Any]) -> RedFlag | None:
    """RF-001: Excessive Management Fee — management_fee_cap > 15% or null."""
    raw = data.get("management_fee_cap")
    val = _safe_float(raw)
    if val is None:
        return RedFlag(
            rule_id="RF-001",
            name="Excessive Management Fee",
            severity=Severity.HIGH,
            description=(
                "No management fee cap found. "
                "Missing cap means unlimited management fees."
            ),
            triggered_value="missing",
        )
    percent = _normalize_fraction_percentage(val)
    if percent > 15.0:
        return RedFlag(
            rule_id="RF-001",
            name="Excessive Management Fee",
            severity=Severity.HIGH,
            description=(
                f"Management fee cap of {percent}% exceeds the 15% threshold. "
                "Fees above 15% are typically exploitative."
            ),
            triggered_value=f"{percent}%",
        )
    return None


def _check_rf002(data: dict[str, Any]) -> RedFlag | None:
    """RF-002: Missing Audit Rights — audit_rights is false or null."""
    raw = data.get("audit_rights")
    val = _safe_bool(raw)
    if val is None or val is False:
        display = "missing" if val is None else "false"
        return RedFlag(
            rule_id="RF-002",
            name="Missing Audit Rights",
            severity=Severity.HIGH,
            description=(
                "Tenant does not have the right to audit landlord's "
                "CAM charges — major liability."
            ),
            triggered_value=display,
        )
    return None


def _check_rf003(data: dict[str, Any]) -> RedFlag | None:
    """RF-003: No CAM Cap — cam_cap_percentage is null."""
    raw = data.get("cam_cap_percentage")
    val = _safe_float(raw)
    if val is None:
        return RedFlag(
            rule_id="RF-003",
            name="No CAM Cap",
            severity=Severity.HIGH,
            description=(
                "No CAM cap percentage found. "
                "Without a cap, annual CAM increases have no ceiling."
            ),
            triggered_value="missing",
        )
    return None


def _check_rf004(data: dict[str, Any]) -> RedFlag | None:
    """RF-004: Cumulative CAM Cap — cap_cumulative_vs_annual == 'cumulative'."""
    raw = data.get("cap_cumulative_vs_annual")
    if isinstance(raw, str) and "cumulative" in raw.strip().lower():
        return RedFlag(
            rule_id="RF-004",
            name="Cumulative CAM Cap",
            severity=Severity.MEDIUM,
            description=(
                "CAM cap is cumulative/compounding rather than annual. "
                "Cumulative caps heavily favor the landlord."
            ),
            triggered_value=str(raw),
        )
    return None


def _check_rf005(data: dict[str, Any]) -> RedFlag | None:
    """RF-005: No Gross-Up Provision — NNN lease with no gross_up_percentage."""
    lease_type = data.get("lease_structure_type")
    if not _str_contains_nnn(lease_type):
        return None
    gross_up = data.get("gross_up_percentage")
    val = _safe_float(gross_up)
    if val is None:
        return RedFlag(
            rule_id="RF-005",
            name="No Gross-Up Provision",
            severity=Severity.MEDIUM,
            description=(
                "NNN lease has no gross-up percentage. In partially "
                "occupied buildings, tenant overpays for variable expenses."
            ),
            triggered_value="missing",
        )
    return None


def _check_rf006(data: dict[str, Any]) -> RedFlag | None:
    """RF-006: Missing CAM Exclusions — cam_exclusions is null or empty."""
    raw = data.get("cam_exclusions")
    if raw is None:
        triggered = "missing"
    elif isinstance(raw, list) and len(raw) == 0:
        triggered = "empty list"
    else:
        return None
    return RedFlag(
        rule_id="RF-006",
        name="Missing CAM Exclusions",
        severity=Severity.HIGH,
        description=(
            "No CAM exclusions found. Without exclusions, "
            "landlord can pass through any expense including capital expenditures."
        ),
        triggered_value=triggered,
    )


def _check_rf007(data: dict[str, Any]) -> RedFlag | None:
    """RF-007: Short Cure Period — monetary_cure_period < 10 days."""
    raw = data.get("monetary_cure_period")
    val = _safe_float(raw)
    if val is not None and val < 10.0:
        return RedFlag(
            rule_id="RF-007",
            name="Short Cure Period",
            severity=Severity.MEDIUM,
            description=(
                f"Monetary cure period of {int(val)} days is below the "
                "10-day minimum. Insufficient time to remedy payment defaults."
            ),
            triggered_value=f"{int(val)} days",
        )
    return None


def _check_rf008(data: dict[str, Any]) -> RedFlag | None:
    """RF-008: Aggressive Holdover Rate — holdover_rate > 200%."""
    raw = data.get("holdover_rate")
    val = _safe_float(raw)
    if val is not None:
        percent = _normalize_multiplier_percentage(val)
    if val is not None and percent > 200.0:
        return RedFlag(
            rule_id="RF-008",
            name="Aggressive Holdover Rate",
            severity=Severity.MEDIUM,
            description=(
                f"Holdover rate of {percent}% exceeds 200%. "
                "Punitive holdover penalties."
            ),
            triggered_value=f"{percent}%",
        )
    return None


def _check_rf009(data: dict[str, Any]) -> RedFlag | None:
    """RF-009: No Termination Option — no early exit on long lease (>60 months)."""
    term_opt = _safe_bool(data.get("has_termination_option"))
    term_months = _safe_float(data.get("lease_term_months"))
    if term_opt is False and term_months is not None and term_months > 60.0:
        return RedFlag(
            rule_id="RF-009",
            name="No Termination Option",
            severity=Severity.LOW,
            description=(
                f"Long-term lease ({int(term_months)} months) with no early "
                "termination option — high commitment risk."
            ),
            triggered_value=f"{int(term_months)} months, no termination",
        )
    return None


def _check_rf010(data: dict[str, Any]) -> RedFlag | None:
    """RF-010: Restoration required but scope undefined."""
    restoration = _safe_bool(data.get("restoration_requirement"))
    work_desc = data.get("tenant_work_description")
    if restoration is True and (work_desc is None or work_desc == ""):
        return RedFlag(
            rule_id="RF-010",
            name="Missing Restoration Clarity",
            severity=Severity.LOW,
            description=(
                "Restoration is required but tenant work description "
                "is missing. Scope of required restoration is undefined."
            ),
            triggered_value="restoration required, no work description",
        )
    return None


def _check_rf011(data: dict[str, Any]) -> RedFlag | None:
    """RF-011: No Renewal Option — has_renewal_option is false."""
    val = _safe_bool(data.get("has_renewal_option"))
    if val is False:
        return RedFlag(
            rule_id="RF-011",
            name="No Renewal Option",
            severity=Severity.LOW,
            description="No guaranteed right to extend occupancy.",
            triggered_value="false",
        )
    return None


def _check_rf012(data: dict[str, Any]) -> RedFlag | None:
    """RF-012: Recapture Right Present — recapture_right is true."""
    val = _safe_bool(data.get("recapture_right"))
    if val is True:
        return RedFlag(
            rule_id="RF-012",
            name="Recapture Right Present",
            severity=Severity.MEDIUM,
            description=(
                "Landlord can terminate lease upon assignment or " "subletting request."
            ),
            triggered_value="true",
        )
    return None


def _check_rf013(data: dict[str, Any]) -> RedFlag | None:
    """RF-013: No Base Year Gross-Up — base_year_gross_up false with base_year set."""
    gross_up = _safe_bool(data.get("base_year_gross_up"))
    base_year = data.get("base_year")
    if (gross_up is False or gross_up is None) and base_year is not None:
        display = "missing" if gross_up is None else "false"
        return RedFlag(
            rule_id="RF-013",
            name="No Base Year Gross-Up",
            severity=Severity.MEDIUM,
            description=(
                "Base year is not normalized to full occupancy. "
                "This can inflate future operating expense charges."
            ),
            triggered_value=f"base_year_gross_up={display}, base_year={base_year}",
        )
    return None


def _check_rf014(data: dict[str, Any]) -> RedFlag | None:
    """RF-014: No Reconciliation Frequency — null on NNN lease."""
    recon = data.get("reconciliation_frequency")
    lease_type = data.get("lease_structure_type")
    if recon is None and _str_contains_nnn(lease_type):
        return RedFlag(
            rule_id="RF-014",
            name="No Reconciliation Frequency",
            severity=Severity.MEDIUM,
            description=(
                "NNN lease has no defined CAM reconciliation schedule. "
                "Without a schedule, disputes are harder to initiate."
            ),
            triggered_value="missing",
        )
    return None


def _check_rf015(data: dict[str, Any]) -> RedFlag | None:
    """RF-015: Short Audit Window — cam_audit_deadline_days < 60."""
    raw = data.get("cam_audit_deadline_days")
    val = _safe_float(raw)
    if val is not None and val < 60.0:
        return RedFlag(
            rule_id="RF-015",
            name="Short Audit Window",
            severity=Severity.MEDIUM,
            description=(
                f"CAM audit deadline of {int(val)} days is below the "
                "60-day minimum. Insufficient time to dispute reconciliation."
            ),
            triggered_value=f"{int(val)} days",
        )
    return None


def _check_rf016(data: dict[str, Any]) -> RedFlag | None:
    """RF-016: Missing Force Majeure Clause — force_majeure_clause is false or null."""
    val = _safe_bool(data.get("force_majeure_clause"))
    if val is None or val is False:
        display = "missing" if val is None else "false"
        return RedFlag(
            rule_id="RF-016",
            name="Missing Force Majeure Clause",
            severity=Severity.MEDIUM,
            description=(
                "No force majeure clause found. Without this protection, "
                "tenants may remain liable for rent during unforeseeable events "
                "such as natural disasters, pandemics, or government mandates."
            ),
            triggered_value=display,
        )
    return None


def _check_rf017(data: dict[str, Any]) -> RedFlag | None:
    """RF-017: Auto-Renewal Without Explicit Notice Period."""
    auto_renew = _safe_bool(data.get("auto_renewal"))
    auto_renew_terms = data.get("auto_renewal_terms")
    if auto_renew is True and (auto_renew_terms is None or auto_renew_terms == ""):
        return RedFlag(
            rule_id="RF-017",
            name="Auto-Renewal Without Notice Terms",
            severity=Severity.MEDIUM,
            description=(
                "Lease auto-renews but no notice period terms are specified. "
                "Tenants risk unintended renewals if the required notice "
                "window is unclear."
            ),
            triggered_value="auto_renewal=true, no notice terms",
        )
    return None


def _check_rf018(data: dict[str, Any]) -> RedFlag | None:
    """RF-018: No Casualty Termination Right — casualty_termination_right is null."""
    raw = data.get("casualty_termination_right")
    if raw is None or raw == "":
        return RedFlag(
            rule_id="RF-018",
            name="No Casualty Termination Right",
            severity=Severity.MEDIUM,
            description=(
                "No casualty termination right found. If the premises are "
                "substantially damaged, neither party may have the right to "
                "terminate, trapping the tenant in an unusable space."
            ),
            triggered_value="missing",
        )
    return None


def _check_rf019(data: dict[str, Any]) -> RedFlag | None:
    """RF-019: Relocation Right Present — relocation_right is true (tenant risk)."""
    val = _safe_bool(data.get("relocation_right"))
    if val is True:
        return RedFlag(
            rule_id="RF-019",
            name="Relocation Right Present",
            severity=Severity.MEDIUM,
            description=(
                "Landlord has the right to relocate the tenant to different "
                "premises. This can disrupt operations and force costly "
                "business interruptions without adequate protection."
            ),
            triggered_value="true",
        )
    return None


def _check_rf020(data: dict[str, Any]) -> RedFlag | None:
    """RF-020: No Purchase Option Disclosure.

    Fires when has_purchase_option is not a proper boolean (ASC 842 risk).
    """
    val = _safe_bool(data.get("has_purchase_option"))
    if val is None:
        return RedFlag(
            rule_id="RF-020",
            name="No Purchase Option Disclosure",
            severity=Severity.LOW,
            description=(
                "Purchase option status not identified. Under ASC 842 / IFRS 16, "
                "a purchase option reasonably certain to be exercised must be "
                "included in lease liability calculations."
            ),
            triggered_value="missing",
        )
    return None


# Ordered list of all rule checkers
_RULE_CHECKERS = [
    _check_rf001,
    _check_rf002,
    _check_rf003,
    _check_rf004,
    _check_rf005,
    _check_rf006,
    _check_rf007,
    _check_rf008,
    _check_rf009,
    _check_rf010,
    _check_rf011,
    _check_rf012,
    _check_rf013,
    _check_rf014,
    _check_rf015,
    _check_rf016,
    _check_rf017,
    _check_rf018,
    _check_rf019,
    _check_rf020,
]


def detect_red_flags(extracted_data: dict[str, Any]) -> list[RedFlag]:
    """Detect red flags in extracted lease data.

    Pure function: takes extracted_data dict, returns list of triggered RedFlag
    instances. Each rule is evaluated independently.

    Args:
        extracted_data: Dictionary of extracted field name -> value pairs.

    Returns:
        List of RedFlag instances for all triggered rules, ordered by rule ID.
    """
    flags: list[RedFlag] = []
    for checker in _RULE_CHECKERS:
        result = checker(extracted_data)
        if result is not None:
            flags.append(result)
    return flags


def should_show_camaudit(
    red_flags: list[RedFlag],
    extracted_data: dict[str, Any],
    confidence_scores: dict[str, float] | None = None,
) -> bool:
    """Determine whether to show the CamAudit upsell CTA.

    Returns True if ANY of the following conditions are met (per PRD 10.1):
    1. Any CAM-related red flag fired (RF-001-006, RF-013-015)
    2. audit_rights == true (tenant CAN audit -> suggest they do)
    3. lease_structure_type is NNN or Modified Gross
    4. 3+ CAM-relevant fields have medium/low confidence (score <= 0.6)

    Args:
        red_flags: List of RedFlag instances from detect_red_flags().
        extracted_data: Dictionary of extracted field values.
        confidence_scores: Optional dict of field_name -> confidence (0.0-1.0).

    Returns:
        True if CamAudit CTA should be displayed.
    """
    # Condition 1: Any CAM-related red flag
    for flag in red_flags:
        if flag.rule_id in CAM_RELATED_RULE_IDS:
            return True

    # Condition 2: audit_rights == true
    audit_rights = _safe_bool(extracted_data.get("audit_rights"))
    if audit_rights is True:
        return True

    # Condition 3: NNN or Modified Gross lease
    lease_type = extracted_data.get("lease_structure_type")
    if isinstance(lease_type, str):
        lower = lease_type.lower()
        if "nnn" in lower or "modified gross" in lower:
            return True

    # Condition 4: 3+ CAM fields with medium/low confidence
    if confidence_scores is not None:
        low_confidence_cam_count = sum(
            1
            for field_name, score in confidence_scores.items()
            if field_name in CAM_RELEVANT_FIELDS and score <= _CONFIDENCE_THRESHOLD
        )
        if low_confidence_cam_count >= 3:
            return True

    return False
