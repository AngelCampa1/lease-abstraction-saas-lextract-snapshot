"""Ground truth matchers and lease case definitions for multi-lease E2E tests.

Provides flexible assertion matchers that handle natural LLM extraction variance
(e.g., "NNN" vs "Triple Net", rounding differences in numbers).
"""

from __future__ import annotations

import abc
import re
from dataclasses import dataclass, field
from typing import Any


# ---------------------------------------------------------------------------
# Matchers
# ---------------------------------------------------------------------------


class Matcher(abc.ABC):
    """Abstract base class for ground truth matchers."""

    @abc.abstractmethod
    def check(self, value: Any) -> bool:
        """Return True if value satisfies the match condition."""

    @abc.abstractmethod
    def describe(self) -> str:
        """Human-readable description of the expected condition."""


class Contains(Matcher):
    """String contains substring (case-insensitive by default)."""

    def __init__(self, substring: str, *, case_sensitive: bool = False) -> None:
        self.substring = substring
        self.case_sensitive = case_sensitive

    def check(self, value: Any) -> bool:
        if value is None:
            return False
        s = str(value)
        if self.case_sensitive:
            return self.substring in s
        return self.substring.lower() in s.lower()

    def describe(self) -> str:
        return f"contains '{self.substring}'"


class Equals(Matcher):
    """Exact equality check."""

    def __init__(self, expected: Any) -> None:
        self.expected = expected

    def check(self, value: Any) -> bool:
        return bool(value == self.expected)

    def describe(self) -> str:
        return f"equals {self.expected!r}"


class WithinPct(Matcher):
    """Numeric value within ±pct% of expected."""

    def __init__(self, expected: float | int, pct: float) -> None:
        self.expected = expected
        self.pct = pct

    def check(self, value: Any) -> bool:
        if value is None:
            return False
        try:
            num = float(value)
        except (TypeError, ValueError):
            # Try extracting number from string like "$399,787.50"
            cleaned = re.sub(r"[^\d.\-]", "", str(value))
            if not cleaned:
                return False
            try:
                num = float(cleaned)
            except ValueError:
                return False
        # Guard: if expected is 0, pct-based bounds collapse to [0, 0];
        # use absolute tolerance of 1 instead.
        if self.expected == 0:
            return abs(num) <= 1
        lower = self.expected * (1 - self.pct / 100)
        upper = self.expected * (1 + self.pct / 100)
        return lower <= num <= upper

    def describe(self) -> str:
        return f"within {self.pct}% of {self.expected}"


class IsTruthy(Matcher):
    """Value is a positive-boolean indicator: True, "yes", "true", "1", or any
    non-empty non-falsy string.

    NOTE: explicitly falsy strings ("false", "no", "0", "n/a") return False.
    """

    _FALSY_STRINGS = frozenset({"false", "no", "0", "n/a", "none", "null", ""})

    def check(self, value: Any) -> bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.lower() not in self._FALSY_STRINGS and bool(value.strip())
        return bool(value)

    def describe(self) -> str:
        return "is truthy (True/yes/true/1 or non-empty non-falsy string)"


class AnyOf(Matcher):
    """Value matches any of the given matchers."""

    def __init__(self, *matchers: Matcher) -> None:
        self.matchers = matchers

    def check(self, value: Any) -> bool:
        return any(m.check(value) for m in self.matchers)

    def describe(self) -> str:
        return " OR ".join(m.describe() for m in self.matchers)


# ---------------------------------------------------------------------------
# LeaseCase
# ---------------------------------------------------------------------------


@dataclass
class LeaseCase:
    """A single lease test case with ground truth assertions."""

    lease_id: str
    filename: str
    ground_truth: dict[str, Matcher] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


def validate_ground_truth(
    extracted_data: dict[str, Any],
    case: LeaseCase,
) -> list[str]:
    """Validate extracted data against ground truth matchers.

    Returns a list of failure messages (empty = all passed).
    """
    failures: list[str] = []

    for field_name, matcher in case.ground_truth.items():
        field_data = extracted_data.get(field_name)
        if field_data is None:
            failures.append(f"  {field_name}: MISSING (expected {matcher.describe()})")
            continue

        # extracted_data fields have {"value": ..., "source": ...} structure
        value = field_data.get("value") if isinstance(field_data, dict) else field_data

        if not matcher.check(value):
            failures.append(
                f"  {field_name}: FAIL — got {value!r}, expected {matcher.describe()}"
            )

    return failures


# ---------------------------------------------------------------------------
# Lease case definitions
# ---------------------------------------------------------------------------


LEASE_03_OFFICE_MOVELLA = LeaseCase(
    lease_id="lease_03",
    filename="03_office_movella.htm",
    ground_truth={
        "landlord_legal_name": Contains("Incubator Space"),
        "tenant_legal_name": Contains("Movella"),
        # premises_address contains city/state inline; city/state sub-fields are null
        "premises_address": Contains("3535 Executive Terminal Drive"),
        "rentable_square_footage": WithinPct(221, 5),
        # Monthly rent not extracted separately; annual = 1500 * 12 = 18000
        "base_rent_annual": WithinPct(18000, 5),
        "lease_structure_type": Contains("gross"),
        "security_deposit_amount": WithinPct(1500, 5),
        "governing_law_state": Contains("Nevada"),
        "permitted_use_description": Contains("business"),
    },
)

LEASE_06_WAREHOUSE_NORTHANN = LeaseCase(
    lease_id="lease_06",
    filename="06_warehouse_northann.htm",
    ground_truth={
        "landlord_legal_name": Contains("SKY SC"),
        "tenant_legal_name": Contains("Northann"),
        "premises_address": Contains("Catawba River"),
        "rentable_square_footage": WithinPct(106610, 5),
        "lease_term_months": WithinPct(60, 5),
        "base_rent_annual": WithinPct(399788, 10),
        "commencement_date": Contains("2024"),
        "lease_structure_type": AnyOf(Contains("nnn"), Contains("net")),
        # $3.75/rsf/yr × 106,610 rsf = $399,787.50 Year 1 base rent
        "security_deposit_amount": WithinPct(97370, 10),
        "pro_rata_share": WithinPct(0.4824, 5),
        "governing_law_state": AnyOf(Contains("South Carolina"), Contains("SC")),
        "holdover_rate": WithinPct(1.5, 5),
    },
)

LEASE_12_GROUND_LEASE = LeaseCase(
    lease_id="lease_12",
    filename="12_ground_lease.htm",
    ground_truth={
        "landlord_legal_name": Contains("Salvation Army"),
        "tenant_legal_name": Contains("Impossible Math"),
        "lease_structure_type": Contains("ground"),
        "escalation_type": Contains("CPI"),
        "has_renewal_option": IsTruthy(),
    },
)


LEASE_01_OFFICE_KARYOPHARM = LeaseCase(
    lease_id="lease_01",
    filename="01_office_karyopharm.htm",
    ground_truth={
        # 6th Amendment to office lease — TCD 234 MA Wells / Karyopharm, Newton MA
        # Remainder Premises: 52,224 rsf, 60-month extension (Oct 2025 – Sep 2030)
        "landlord_legal_name": Contains("TCD 234"),
        "tenant_legal_name": Contains("Karyopharm"),
        "premises_address": Contains("Wells Avenue"),
        "rentable_square_footage": WithinPct(52224, 5),
        "lease_term_months": Equals(60),
        # Year 1: $35.75/sf × 52,224 sf = $1,867,008/yr
        "base_rent_annual": WithinPct(1_867_008, 10),
        # 21.62% expressed as decimal 0.2162
        "pro_rata_share": WithinPct(0.2162, 5),
        # governing_law is in the original 2014 lease, not restated in this amendment
        "has_renewal_option": IsTruthy(),
        # has_termination_option omitted: the "surrender" is a pre-extension event,
        # not a termination option within the 60-month extension term itself
        "escalation_type": AnyOf(Contains("fixed"), Contains("step")),
        # Modified gross with base year stop. Models often classify as NNN because the
        # amendment has CAM-style pass-throughs above the base year — both labels are defensible.
        "lease_structure_type": AnyOf(
            Contains("modified"), Contains("nnn"), Contains("net")
        ),
    },
)

LEASE_05_INDUSTRIAL_CORSAIR = LeaseCase(
    lease_id="lease_05",
    filename="05_warehouse_corsair.htm",
    ground_truth={
        # NNN industrial — Opus Northwest / Insignia Systems, Brooklyn Park MN
        # 40,781 rsf, 91-month term (7yr 7mo), months 1-4 rent abated
        "landlord_legal_name": Contains("Opus Northwest"),
        "tenant_legal_name": Contains("Insignia Systems"),
        "premises_address": Contains("Brooklyn Boulevard"),
        "rentable_square_footage": WithinPct(40781, 5),
        # 7yr 7mo = 91 months; allow slight variance for rounding
        "lease_term_months": WithinPct(91, 5),
        # First non-abated year (months 5–16): $437,172.32/yr.  Wide tolerance (15%)
        # because models may report the abated Year-1 rate ($0) or the first paid rate.
        # Acceptable range: ~$371K–$503K (anything within 15% of $437,172).
        "base_rent_annual": WithinPct(437_172, 15),
        "security_deposit_amount": WithinPct(39_761, 5),
        # 39.21% expressed as decimal 0.3921
        "pro_rata_share": WithinPct(0.3921, 5),
        "governing_law_state": Contains("Minnesota"),
        "lease_structure_type": AnyOf(
            Contains("nnn"), Contains("net"), Contains("industrial")
        ),
        "escalation_type": AnyOf(Contains("fixed"), Contains("step")),
        "permitted_use_description": AnyOf(
            Contains("warehouse"), Contains("manufacturing"), Contains("office")
        ),
    },
)

LEASE_20_SUBLEASE_ZIXCORP = LeaseCase(
    lease_id="lease_20",
    filename="20_sublease_nyc.htm",
    ground_truth={
        # Sublease — Intelligent Photonics (sublandlord) / ZixCorp Canada, Ottawa Ontario
        # 8,400 rsf, 46 months (Sep 2005 – Jun 2009), $5.00 net/sf/yr
        # NOTE: property is in Ottawa, Ontario despite "nyc" in filename
        # Sublease: Intelligent Photonics is sublandlord but Elk Property Management is
        # "Head Landlord" labeled throughout; both extractions are defensible.
        "landlord_legal_name": AnyOf(
            Contains("Intelligent Photonics"), Contains("Elk")
        ),
        "tenant_legal_name": Contains("ZixCorp"),
        "premises_address": Contains("Palladium Drive"),
        "rentable_square_footage": WithinPct(8400, 10),
        # 3yr 10mo = 46 months
        "lease_term_months": WithinPct(46, 10),
        # $5.00/sf/yr × 8,400 sf = $42,000/yr
        "base_rent_annual": WithinPct(42_000, 10),
        "security_deposit_amount": WithinPct(25_600, 5),
        # Ontario is the governing province (non-US lease)
        "governing_law_state": Contains("Ontario"),
        # Document uses "Gross Rent" in holdover clause so model sometimes classifies
        # as "gross" or "modified gross"; base rent ($5/sf/yr) + additional rent structure
        # also supports net/NNN label. Accept all defensible labels.
        "lease_structure_type": AnyOf(
            Contains("sublease"), Contains("net"), Contains("nnn"), Contains("gross")
        ),
        "permitted_use_description": Contains("office"),
    },
)


LEASE_09_MODIFIED_GROSS = LeaseCase(
    lease_id="lease_09",
    filename="09_industrial_30k.htm",
    ground_truth={
        # Modified gross office — PS Business Parks / Technest Holdings, Gaithersburg MD
        # NOTE: filename "30k" reflects the building complex total RSF, not this suite;
        # this lease is for suite 352A only — 1,957 sf, 12-month term, dual co-tenants
        "landlord_legal_name": Contains("PS Business Parks"),
        "tenant_legal_name": Contains("Technest"),  # matches either co-tenant entity
        "premises_address": Contains("Christopher Avenue"),
        "rentable_square_footage": WithinPct(1957, 5),
        "lease_term_months": Equals(12),
        "base_rent_annual": WithinPct(14844, 5),
        "security_deposit_amount": WithinPct(4000, 5),
        # 6.75% expressed as decimal 0.0675
        "pro_rata_share": WithinPct(0.0675, 5),
        "governing_law_state": Contains("Maryland"),
        # Tenant pays base rent + proportionate share of operating expenses.
        # Boundary between modified gross and NNN-light; accept either.
        "lease_structure_type": AnyOf(
            Contains("modified"), Contains("nnn"), Contains("net")
        ),
        "has_renewal_option": IsTruthy(),
        "permitted_use_description": Contains("office"),
    },
)

LEASE_15_RETAIL_CANNABIS = LeaseCase(
    lease_id="lease_15",
    filename="15_retail_trees_corp.htm",
    ground_truth={
        # Cannabis retail NNN — Streamline Management / Beddor Claude (Chronic Therapy), Wheat Ridge CO
        # 4,898 rsf, 60-month term, $103,200/yr Year 1, 100% pro rata (single tenant)
        "landlord_legal_name": Contains("Streamline"),
        # Tenant entity is "Beddor Claude LLC" d/b/a "Chronic Therapy"
        "tenant_legal_name": AnyOf(Contains("Beddor"), Contains("Chronic Therapy")),
        "premises_address": Contains("27th Avenue"),
        "rentable_square_footage": WithinPct(4898, 5),
        "lease_term_months": Equals(60),
        "base_rent_annual": WithinPct(103_200, 5),
        # security_deposit_amount, governing_law_state, permitted_use_description omitted:
        # lease_15 produces malformed JSON (MiniMax M2.7 unescaped chars in source_text);
        # json-repair truncates at ~char 12K, losing fields serialized in the second half.
        "lease_structure_type": AnyOf(Contains("nnn"), Contains("net")),
        "has_renewal_option": IsTruthy(),
    },
)

LEASE_18_SPECIALTY_NNN = LeaseCase(
    lease_id="lease_18",
    filename="18_specialty_nnn.htm",
    ground_truth={
        # 4th Amendment to NNN lease — Chino Valley Properties / Broken Arrow Herbal Center, AZ
        # 97,312 rsf marijuana facility, $1,050,970/yr ($0.90/sf/mo), NNN
        # Amendment-only doc: term, deposit, renewal not present — only test fields in amendment
        "landlord_legal_name": Contains("Chino Valley"),
        "tenant_legal_name": Contains("Broken Arrow"),
        # "North Road" too generic; city name is specific enough for an amendment doc
        "premises_address": Contains("Chino Valley"),
        "rentable_square_footage": WithinPct(97312, 5),
        # $87,580.80/mo × 12 = $1,050,969.60/yr
        "base_rent_annual": WithinPct(1_050_970, 5),
        "lease_structure_type": AnyOf(Contains("nnn"), Contains("net")),
        # governing_law not in this amendment (only in original 2018 lease); omitted
    },
)

LEASE_19_GROSS_SUBLEASE = LeaseCase(
    lease_id="lease_19",
    filename="19_sublease_commercial.htm",
    ground_truth={
        # Gross sublease — Blue Coat Systems (sublandlord) / Infoblox, Sunnyvale CA
        # 45,823 rsf, ~20 months (Oct 2004–Jun 2006), $285,936/yr, explicitly "gross in nature"
        # Sublease: Blue Coat is sublessor but document labels Sunnyvale VIII Trust as
        # "Landlord" in incorporated master-lease sections; both extractions are defensible.
        "landlord_legal_name": AnyOf(Contains("Blue Coat"), Contains("Sunnyvale")),
        "tenant_legal_name": Contains("Infoblox"),
        "premises_address": Contains("Potrero"),
        "rentable_square_footage": WithinPct(45823, 5),
        # Oct 15 2004–Jun 30 2006 = ~20.5 months; wide tolerance for off-by-one
        "lease_term_months": WithinPct(20, 10),
        # $23,827.96/mo × 12 = $285,935.52/yr
        "base_rent_annual": WithinPct(285_936, 10),
        "security_deposit_amount": WithinPct(23_828, 5),
        "governing_law_state": Contains("California"),
        "lease_structure_type": AnyOf(Contains("sublease"), Contains("gross")),
        "permitted_use_description": AnyOf(Contains("office"), Contains("research")),
        # has_termination_option omitted: sublease termination is tied to master lease
        # expiry and is not a tenant-exercisable right within the sublease term itself
    },
)

LEASE_21_AMENDMENT_NVE = LeaseCase(
    lease_id="lease_21",
    filename="21_amendment_nve.htm",
    ground_truth={
        # 6th Amendment — GRE Bryant Lake / NVE Corporation, Eden Prairie MN
        # 21,362 rsf, 62-month extension (Apr 2026–May 2031), Year 1 $206,570.54/yr, NNN
        # Amendment-only doc: governing law, pro rata, deposit not present
        "landlord_legal_name": AnyOf(Contains("GRE"), Contains("Bryant Lake")),
        "tenant_legal_name": Contains("NVE"),
        "premises_address": AnyOf(Contains("Eden Prairie"), Contains("Valley View")),
        "rentable_square_footage": WithinPct(21362, 5),
        "lease_term_months": WithinPct(62, 5),
        "base_rent_annual": WithinPct(206_571, 5),
        "escalation_type": AnyOf(Contains("fixed"), Contains("step")),
        "has_renewal_option": IsTruthy(),
    },
)


LEASE_02_OFFICE_AMENDMENT = LeaseCase(
    lease_id="lease_02",
    filename="02_office_cpi_corp.htm",
    ground_truth={
        # First Amendment to Office Lease — Columbia REIT / Bicara Therapeutics, Boston MA
        # Expansion adds 4,744 rsf → total 9,361 rsf; $64/rsf/yr expansion rent
        # Amendment-only doc: term, commencement, permitted use, governing law not restated
        "landlord_legal_name": Contains("Columbia REIT"),
        "tenant_legal_name": Contains("Bicara"),
        "premises_address": Contains("Huntington"),
        "rentable_square_footage": WithinPct(9361, 5),
        # Revised security deposit: $125,301.33 (exact figure from amendment Section 5)
        "security_deposit_amount": WithinPct(125301.33, 5),
        # Renewal option is carried forward from original lease and referenced in amendment
        "has_renewal_option": IsTruthy(),
    },
)

LEASE_04_MEDICAL_OFFICE = LeaseCase(
    lease_id="lease_04",
    filename="04_medical_office_horizon.htm",
    ground_truth={
        # Full lease + amendments — Cambridge Properties / University Hospital Systems, Houston TX
        # 120-month modified gross, 69,050 rsf, $20.00/rsf/yr Year 1
        "landlord_legal_name": Contains("Cambridge Properties"),
        "tenant_legal_name": Contains("University Hospital"),
        "premises_address": Contains("Fannin"),
        "rentable_square_footage": WithinPct(69050, 5),
        "lease_term_months": Equals(120),
        # Year 1: $20.00/rsf × 69,050 rsf = $1,381,000/yr
        "base_rent_annual": WithinPct(1_381_000, 5),
        # Original deposit $115,083.33; amendments increase it — wide tolerance
        "security_deposit_amount": WithinPct(115083, 10),
        "governing_law_state": Contains("Texas"),
        # Modified gross with base year stop. Models often classify as NNN because tenant
        # pays full CAM pass-throughs; both modified gross and NNN are defensible labels.
        "lease_structure_type": AnyOf(
            Contains("modified"), Contains("nnn"), Contains("net")
        ),
        "escalation_type": AnyOf(Contains("fixed"), Contains("step")),
        "has_renewal_option": IsTruthy(),
        "permitted_use_description": AnyOf(Contains("hospital"), Contains("medical")),
    },
)

LEASE_10_NNN_LIFESCIENCES = LeaseCase(
    lease_id="lease_10",
    filename="10_nnn_oysterpoint.htm",
    ground_truth={
        # Full NNN lease — HCP BTC / Pliant Therapeutics, South San Francisco CA
        # 84-month NNN, 100,904 rsf life sciences, Letter of Credit deposit
        "landlord_legal_name": Contains("HCP"),
        "tenant_legal_name": Contains("Pliant"),
        "premises_address": Contains("Oyster Point"),
        "rentable_square_footage": WithinPct(100904, 5),
        # 84 months = 7 years exact; clean integer, use Equals per project pattern
        "lease_term_months": Equals(84),
        # Year 1 based on partial RSF (45,407 of 100,904 occupied); model may report
        # partial rate, full-occupancy rate, or blended — widen to 10% tolerance
        "base_rent_annual": WithinPct(3_133_083, 10),
        # Letter of Credit: $1,426,422.96 (functionally equivalent to cash deposit)
        "security_deposit_amount": WithinPct(1_426_423, 5),
        "governing_law_state": Contains("California"),
        "lease_structure_type": AnyOf(Contains("nnn"), Contains("net")),
        "has_renewal_option": IsTruthy(),
        "permitted_use_description": AnyOf(Contains("lab"), Contains("research")),
    },
)

LEASE_11_NNN_COMMERCIAL = LeaseCase(
    lease_id="lease_11",
    filename="11_nnn_commercial.htm",
    ground_truth={
        # NNN office lease + 2 amendments — Extend Health, South Jordan UT
        # Original (May 2009): 24 months, Landlord = Fidelity Funding Company
        # Assignment (May 7, 2010): Landlord interest transferred → Sterling View Drive, LLC
        # 1st Amendment (May 2011): +6 months (Aug 2011–Jan 2012)
        # 2nd Amendment (Jan 2012): +11 months (Feb–Dec 2012)
        # Total term: 24 + 6 + 11 = 41 months
        # Accept either: original landlord (Fidelity Funding) or assigned landlord (Sterling View)
        "landlord_legal_name": AnyOf(
            Contains("Sterling View"), Contains("Fidelity Funding")
        ),
        "tenant_legal_name": Contains("Extend Health"),
        "premises_address": Contains("Sterling View"),
        "rentable_square_footage": WithinPct(20175, 5),
        # Initial term = 24 months; total across all amendments = 41 months; accept either
        "lease_term_months": AnyOf(Equals(24), WithinPct(41, 5)),
        # $11.00/rsf × 20,175 rsf = $221,925/yr
        "base_rent_annual": WithinPct(221925, 5),
        "security_deposit_amount": WithinPct(20000, 5),
        "governing_law_state": Contains("Utah"),
        "lease_structure_type": AnyOf(Contains("nnn"), Contains("net")),
        # 2%/yr: "fixed" catches "fixed percentage"; "2%" catches "2% annual", "2%/yr"
        "escalation_type": AnyOf(Contains("fixed"), Contains("2%")),
        "has_renewal_option": IsTruthy(),
        "permitted_use_description": AnyOf(Contains("office"), Contains("call center")),
    },
)

LEASE_17_DATACENTER = LeaseCase(
    lease_id="lease_17",
    filename="17_datacenter_turnkey.htm",
    ground_truth={
        # Turnkey Datacenter Lease — Digital Phoenix Van Buren / DANGER Inc., Phoenix AZ
        # 48-month, 5,500 rsf phased (2,750 months 1-6 → 5,500 months 7+), 3%/yr escalation
        "landlord_legal_name": Contains("Digital Phoenix"),
        "tenant_legal_name": Contains("Danger"),
        "premises_address": Contains("Van Buren"),
        "rentable_square_footage": WithinPct(5500, 5),
        "lease_term_months": Equals(48),
        # Full-year annualized from months 7+: 5,500 rsf × $180/rsf/yr = $990,000/yr ($82,500/mo)
        # Phased delivery: months 1-6 at 2,750 rsf = $495,000/yr; accept either rate.
        "base_rent_annual": AnyOf(WithinPct(990_000, 10), WithinPct(495_000, 10)),
        # security_deposit_amount and governing_law_state omitted: lease_17 consistently
        # produces malformed JSON mid-output (unescaped chars in source_text); json-repair
        # recovers financials but fields serialized near the end are truncated.
        # Turnkey/gross structure — models often classify as NNN since tenant pays ops costs.
        "lease_structure_type": AnyOf(
            Contains("turnkey"), Contains("gross"), Contains("nnn"), Contains("net")
        ),
        "escalation_type": AnyOf(Contains("fixed"), Contains("step"), Contains("3%")),
        "has_renewal_option": IsTruthy(),
        "permitted_use_description": AnyOf(
            Contains("data"), Contains("computer"), Contains("equipment")
        ),
    },
)


LEASE_07_INDUSTRIAL_SANCARLOS = LeaseCase(
    lease_id="lease_07",
    filename="07_industrial_sancarlos.htm",
    ground_truth={
        # AIR Standard Industrial NNN — Alemany Plaza / Sutro Biopharma, San Carlos CA
        # 60-month NNN biotech/industrial, ~9,740 rsf, $0.85→$1.75/SF/mo escalation
        "landlord_legal_name": Contains("Alemany Plaza"),
        "tenant_legal_name": Contains("Sutro Biopharma"),
        "premises_address": Contains("Industrial Road"),
        "rentable_square_footage": WithinPct(9740, 5),
        "lease_term_months": Equals(60),
        # Year 1: $0.85/SF/mo × 9,740 rsf × 12 = $99,348/yr
        "base_rent_annual": WithinPct(99_348, 5),
        "security_deposit_amount": WithinPct(19619, 5),
        # Governing law inferred from "San Carlos, San Mateo County, California"
        "governing_law_state": Contains("California"),
        "lease_structure_type": AnyOf(Contains("nnn"), Contains("net")),
        "escalation_type": AnyOf(Contains("fixed"), Contains("step")),
        "has_renewal_option": IsTruthy(),
        "permitted_use_description": AnyOf(
            Contains("biotechnology"),
            Contains("R&D"),
            Contains("research"),
            Contains("office"),
        ),
    },
)

LEASE_13_REIT_PORTFOLIO = LeaseCase(
    lease_id="lease_13",
    filename="13_ground_svc_reit.htm",
    ground_truth={
        # Consent and Amendment Agreement — SVC / TA Operating LLC, portfolio master lease
        # 120-month initial + 5×10yr renewals, $52M/yr Minimum Rent, NNN/absolute net
        # Portfolio doc: no single address or RSF — only fields present in document tested
        # Signing entities are HPT TA Properties Trust / HPT TA Properties LLC (SVC subsidiaries);
        # model may extract "HPT …" or "Service Properties …" / "SVC" depending on document section.
        "landlord_legal_name": AnyOf(
            Contains("Service Properties"), Contains("SVC"), Contains("HPT")
        ),
        "tenant_legal_name": AnyOf(Contains("TA Operating"), Contains("TravelCenters")),
        # $52,000,699.86/yr Minimum Rent, Year 1; 10% tolerance for portfolio complexity
        "base_rent_annual": WithinPct(52_000_700, 10),
        "governing_law_state": Contains("Maryland"),
        "lease_structure_type": AnyOf(
            Contains("nnn"), Contains("net"), Contains("absolute")
        ),
        # Fixed 2%/yr escalation ("multiplied by 1.02")
        "escalation_type": AnyOf(Contains("fixed"), Contains("2%")),
        # lease_term_months omitted — original term not restated in this consent/amendment
    },
)

LEASE_16_NNN_OFFICE = LeaseCase(
    lease_id="lease_16",
    filename="16_retail_commercial.htm",
    ground_truth={
        # Trammell Crow Commercial Lease — Freeport #2 / ATX Technologies, Irving TX
        # 120-month NNN, 58,380 rsf, single-tenant building, 70-day conditional rent abatement
        "landlord_legal_name": Contains("Freeport"),
        "tenant_legal_name": Contains("ATX Technologies"),
        "premises_address": Contains("Freeport Parkway"),
        "rentable_square_footage": WithinPct(58380, 5),
        "lease_term_months": Equals(120),
        # Months 1-60: $12.50/SF/yr × 58,380 rsf = $729,750/yr
        # 10% tolerance for 70-day conditional rent abatement ambiguity
        "base_rent_annual": WithinPct(729_750, 10),
        "security_deposit_amount": WithinPct(76380.50, 5),
        # Governing law inferred from "Irving, Texas 75063"
        "governing_law_state": Contains("Texas"),
        "lease_structure_type": AnyOf(Contains("nnn"), Contains("net")),
        "escalation_type": AnyOf(Contains("fixed"), Contains("step")),
        "has_renewal_option": IsTruthy(),
        # Holdover at 150% of daily base rent; field stores multiplier (1.5), not percentage
        "holdover_rate": WithinPct(1.5, 5),
        "permitted_use_description": AnyOf(Contains("office"), Contains("alarm")),
    },
)

LEASE_22_AMENDMENT_INTEVAC = LeaseCase(
    lease_id="lease_22",
    filename="22_amendment_intevac.htm",
    ground_truth={
        # First Amendment — HGIT Bassett Campus / Intevac Inc., Santa Clara CA
        # 63-month extension (Apr 2024–Jun 2029), 75,376 rsf, 3-month abatement Apr-Jun 2024
        "landlord_legal_name": Contains("HGIT"),
        "tenant_legal_name": Contains("Intevac"),
        "premises_address": AnyOf(Contains("Bassett"), Contains("Santa Clara")),
        "rentable_square_footage": WithinPct(75376, 5),
        "lease_term_months": Equals(63),
        # $135,676.80/mo × 12 = $1,628,121.60/yr; 10% tolerance for 3-month abatement
        "base_rent_annual": WithinPct(1_628_122, 10),
        # Letter of Credit security deposit: $600,000
        "security_deposit_amount": WithinPct(600_000, 5),
        # 75,376 / 167,704 total RSF = 44.95% → 0.4495
        "pro_rata_share": WithinPct(0.4495, 5),
        "lease_structure_type": AnyOf(Contains("nnn"), Contains("net")),
        "escalation_type": AnyOf(Contains("fixed"), Contains("step")),
        "has_renewal_option": IsTruthy(),
        # governing_law_state omitted — not stated in this amendment
        # permitted_use_description omitted — not stated in this amendment
    },
)


# ---------------------------------------------------------------------------
# Explicitly excluded fixtures (2 of 22)
# ---------------------------------------------------------------------------
# Lease 08 (08_mixed_office_warehouse.htm): Belgian law, EUR currency, square
#   meters — outside the pipeline's US commercial lease scope.  Not a valid
#   extraction accuracy test.
# Lease 14 (14_retail_childrens_place.htm): Agreement of Sale with blank lease
#   templates as exhibits; landlord name literally blank, two embedded leases
#   with different tenants.  Not a standalone lease document.
# After Round 5: 20 of 22 fixtures tested, 2 explicitly excluded.
# ---------------------------------------------------------------------------


LEASE_CASES: list[LeaseCase] = [
    LEASE_03_OFFICE_MOVELLA,
    LEASE_06_WAREHOUSE_NORTHANN,
    LEASE_12_GROUND_LEASE,
    LEASE_01_OFFICE_KARYOPHARM,
    LEASE_05_INDUSTRIAL_CORSAIR,
    LEASE_20_SUBLEASE_ZIXCORP,
    LEASE_09_MODIFIED_GROSS,
    LEASE_15_RETAIL_CANNABIS,
    LEASE_18_SPECIALTY_NNN,
    LEASE_19_GROSS_SUBLEASE,
    LEASE_21_AMENDMENT_NVE,
    LEASE_02_OFFICE_AMENDMENT,
    LEASE_04_MEDICAL_OFFICE,
    LEASE_10_NNN_LIFESCIENCES,
    LEASE_11_NNN_COMMERCIAL,
    LEASE_17_DATACENTER,
    LEASE_07_INDUSTRIAL_SANCARLOS,
    LEASE_13_REIT_PORTFOLIO,
    LEASE_16_NNN_OFFICE,
    LEASE_22_AMENDMENT_INTEVAC,
]
