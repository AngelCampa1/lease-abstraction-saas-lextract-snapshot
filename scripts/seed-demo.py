#!/usr/bin/env python3
"""Seed publishable demo data into a local Lextract Postgres database.

This is what makes the signed-in app usable after a fresh clone. It writes one
demo user, five extractions in mixed states, one fully populated extraction
result, a credit ledger, the payments those ledger rows point at, and an
anonymous session so the guest view of a result can be opened without logging
in.

Everything it writes is safe to publish. The lease content comes from two real
commercial leases filed publicly with the SEC and kept in this repository as
extraction fixtures:

  packages/extract-sdk/tests/fixtures/real-leases/05_warehouse_corsair.htm
      Industrial/warehouse lease, Opus Northwest, L.L.C. and Insignia
      Systems, Inc., Park West Business Center, Brooklyn Park, Minnesota.
      Filed as Exhibit 10.22 to the Insignia Systems, Inc. Form 10-K for
      fiscal year 2007.

  packages/extract-sdk/tests/fixtures/real-leases/04_medical_office_horizon.htm
      Medical office lease, Cambridge Properties and University Hospital
      Systems, LLP, 7501 Fannin Street, Houston, Texas.

No company, tenant, landlord, address or dollar figure below is made up. Every
value is copied from one of those two filings, and the ``source_text`` on each
field is the sentence it came from.

Two fields are the exception, and both are marked ``DERIVED`` in a comment where
they are defined: ``commencement_date`` on the industrial lease and
``cam_audit_deadline_days`` on the medical one. Neither value appears literally
in its filing; each is arithmetic on a sentence that does. Both are seeded below
the 0.6 medium-confidence threshold so they surface as low-confidence fields,
which is how a real extraction would report a value it had to infer.

Usage::

    python scripts/seed-demo.py

Connection comes from ``DATABASE_URL`` and defaults to the local stack defined
in ``backend/docker-compose.local.yml``. The script is idempotent: identifiers
are deterministic UUIDv5 values, so running it twice refreshes the same rows
instead of piling up duplicates.

Requires ``psycopg`` (already a backend dependency).
"""

from __future__ import annotations

import os
import sys
import uuid
from typing import Any

import psycopg
from psycopg.types.json import Jsonb

# ---------------------------------------------------------------------------
# connection
# ---------------------------------------------------------------------------

# Matches the postgres service in backend/docker-compose.local.yml, which maps
# container port 5432 to host port 5433.
DEFAULT_DATABASE_URL = "postgresql://lextract:lextract@127.0.0.1:5433/lextract"


def database_url() -> str:
    return os.environ.get("DATABASE_URL", DEFAULT_DATABASE_URL)


# ---------------------------------------------------------------------------
# deterministic identifiers
# ---------------------------------------------------------------------------

# Fixed namespace so every machine that seeds this database ends up with the
# same UUIDs. That keeps the auth stub env vars, docs and screenshots stable.
NAMESPACE = uuid.UUID("6f2a5c1e-9b3d-5a47-8c21-0d4e7f8a1b62")


def stable_id(name: str) -> uuid.UUID:
    return uuid.uuid5(NAMESPACE, name)


DEMO_USER_ID = stable_id("user:demo@example.com")
DEMO_USER_EMAIL = "demo@example.com"

ANON_SESSION_ID = stable_id("anonymous-session:guest-demo")
ANON_SESSION_TOKEN = stable_id("anonymous-session-token:guest-demo").hex

EXTRACTION_GUEST_INDUSTRIAL = stable_id("extraction:insignia-industrial")
EXTRACTION_MEDICAL_OFFICE = stable_id("extraction:cambridge-medical-office")
EXTRACTION_PROCESSING = stable_id("extraction:karyopharm-office")
EXTRACTION_FAILED = stable_id("extraction:childrens-place-retail")
EXTRACTION_UPLOADING = stable_id("extraction:svc-reit-ground-lease")

PAYMENT_CREDIT_PACK_5 = stable_id("payment:credit-pack-5")
PAYMENT_CREDIT_PACK_10 = stable_id("payment:credit-pack-10")
PAYMENT_GUEST_SINGLE = stable_id("payment:guest-single")

LEDGER_PACK_5 = stable_id("ledger:credit-pack-5")
LEDGER_USE_MEDICAL = stable_id("ledger:use-medical-office")
LEDGER_PACK_10 = stable_id("ledger:credit-pack-10")
LEDGER_USE_PROCESSING = stable_id("ledger:use-karyopharm")

# Product prices in cents, mirroring PRODUCT_PRICES in
# workers/api/src/services/stripe.ts.
PRICE_SINGLE_CENTS = 1500
PRICE_CREDIT_PACK_5_CENTS = 6500
PRICE_CREDIT_PACK_10_CENTS = 12000

# Storage keys follow documentKey() in workers/api/src/domain/object-keys.ts.
STORAGE_ROOT = "lextract-documents"

HIGH_THRESHOLD = 0.85
MEDIUM_THRESHOLD = 0.6


def user_document_key(extraction_id: uuid.UUID) -> str:
    return f"{STORAGE_ROOT}/{DEMO_USER_ID}/{extraction_id}/original.pdf"


def guest_document_key(extraction_id: uuid.UUID) -> str:
    return f"{STORAGE_ROOT}/anon/{ANON_SESSION_ID}/{extraction_id}/original.pdf"


# ---------------------------------------------------------------------------
# extraction payload helpers
# ---------------------------------------------------------------------------


def field(value: Any, confidence: float, source_text: str) -> dict[str, Any]:
    """Build one extracted_data entry.

    Shape matches serializedExtractionData() in
    workers/api/src/workflows/extraction-workflow.ts.
    """
    return {"confidence": confidence, "source_text": source_text, "value": value}


def tier_for(score: float) -> str:
    if score >= HIGH_THRESHOLD:
        return "high"
    if score >= MEDIUM_THRESHOLD:
        return "medium"
    return "low"


def confidence_scores_for(
    extracted_data: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """Derive confidence_scores from extracted_data so the two cannot drift.

    Per-field shape matches ConfidenceScore and the ``_overall`` entry matches
    OverallConfidence in packages/extract-core/src/confidence/score-confidence.ts.
    """
    scores: dict[str, Any] = {}
    for field_name, entry in extracted_data.items():
        confidence = float(entry["confidence"])
        scores[field_name] = {
            "llmConfidence": confidence,
            "score": confidence,
            "tier": tier_for(confidence),
        }

    values = [float(entry["confidence"]) for entry in extracted_data.values()]
    overall = round(sum(values) / len(values), 2) if values else 0.0
    low_confidence_fields = sorted(
        name
        for name, entry in extracted_data.items()
        if float(entry["confidence"]) < MEDIUM_THRESHOLD
    )
    scores["_overall"] = {
        "lowConfidenceFields": low_confidence_fields,
        "needsReview": overall < HIGH_THRESHOLD or len(low_confidence_fields) > 0,
        "overallScore": overall,
        "tier": tier_for(overall),
    }
    return scores


def overall_score(confidence_scores: dict[str, Any]) -> float:
    overall = confidence_scores["_overall"]
    return float(overall["overallScore"])


def red_flag(
    rule_id: str, name: str, severity: str, description: str, triggered_value: str
) -> dict[str, str]:
    """Build one red_flags entry.

    Shape matches serializeRedFlags() in
    workers/api/src/workflows/extraction-workflow.ts. Rule ids, names, severities
    and descriptions are copied verbatim from
    packages/extract-core/src/red-flags/rules.ts, so what is seeded here is what
    the real rule engine would emit for this field data.
    """
    return {
        "description": description,
        "name": name,
        "rule_id": rule_id,
        "severity": severity,
        "triggered_value": triggered_value,
    }


# ---------------------------------------------------------------------------
# Lease 1: Opus Northwest / Insignia Systems industrial warehouse (guest view)
# ---------------------------------------------------------------------------

INDUSTRIAL_FILENAME = "insignia-systems-industrial-warehouse-lease.pdf"

INDUSTRIAL_DATA: dict[str, dict[str, Any]] = {
    "landlord_legal_name": field(
        "Opus Northwest, L.L.C.",
        0.97,
        "OPUS NORTHWEST, L.L.C., AS LANDLORD, AND INSIGNIA SYSTEMS, INC., AS TENANT.",
    ),
    "tenant_legal_name": field(
        "Insignia Systems, Inc.",
        0.97,
        "OPUS NORTHWEST, L.L.C., AS LANDLORD, AND INSIGNIA SYSTEMS, INC., AS TENANT.",
    ),
    "premises_address": field(
        "8701 Brooklyn Boulevard, Brooklyn Park, Minnesota 55445",
        0.95,
        "The Building is located at 8701 Brooklyn Boulevard, Brooklyn Park, Minnesota "
        "55445.",
    ),
    "rentable_square_footage": field(
        40781,
        0.96,
        "Premises: Approximately 40,781 rentable square feet located within the "
        "Building "
        'as depicted on EXHIBIT "C."',
    ),
    "building_total_rsf": field(
        104004,
        0.93,
        "The Building contains approximately 104,004 rentable square feet.",
    ),
    "property_use_type": field(
        "industrial",
        0.9,
        "INDUSTRIAL/WAREHOUSE LEASE AGREEMENT",
    ),
    "possession_date": field(
        "2008-07-24",
        0.9,
        "Delivery Date: July 24, 2008",
    ),
    # DERIVED, not quoted. The filing gives a Delivery Date of July 24, 2008 and
    # a 91 month term ending February 29, 2016; August 1 is the arithmetic that
    # reconciles the two. The source_text is the sentence the inference rests on,
    # not a sentence containing the date. Scored below the 0.6 medium threshold
    # so it shows up as low confidence, which is what an inferred value deserves.
    "commencement_date": field(
        "2008-08-01",
        0.48,
        "Delivery Date: July 24, 2008",
    ),
    "expiration_date": field(
        "2016-02-29",
        0.94,
        "The Term commences on the Commencement Date and expires ninety-one (91) "
        "months "
        "thereafter on February 29, 2016.",
    ),
    "lease_term_months": field(
        91,
        0.93,
        "Lease Term: seven (7) years, seven (7) months",
    ),
    "rent_abatement_period": field(
        "Months 1 through 4",
        0.91,
        "Months 1 -4: Zero Dollars ($0.00) (Base Rent is abated for the first four "
        "months of the term).",
    ),
    "base_rent_annual": field(
        437172.32,
        0.9,
        "Months 5 - 16: $437,172.32 per annum payable monthly, in advance, in equal "
        "monthly installments of $36,431.03",
    ),
    "monthly_base_rent": field(
        36431.03,
        0.92,
        "Months 5 - 16: $437,172.32 per annum payable monthly, in advance, in equal "
        "monthly installments of $36,431.03",
    ),
    "rent_payment_frequency": field(
        "monthly",
        0.95,
        "$437,172.32 per annum payable monthly, in advance, in equal monthly "
        "installments of $36,431.03",
    ),
    "escalation_type": field(
        "stepped",
        0.88,
        "Months 5 - 16: $437,172.32 per annum ... Months 77 - 91: $492,226.67 per "
        "annum",
    ),
    "lease_structure_type": field(
        "nnn",
        0.76,
        "Tenant will pay Tenant's Share of Property Expenses. Initial Tenant's Share "
        "of "
        "Property Expenses Percentage: 39.21%",
    ),
    "pro_rata_share": field(
        39.21,
        0.96,
        "Initial Tenant's Share of Property Expenses Percentage: 39.21% (subject to "
        "adjustment, if any, provided in Paragraph 1.1)",
    ),
    "audit_rights": field(
        True,
        0.93,
        "If Tenant desires to audit Landlord's determination of the actual amount of "
        "Tenant's Share of Property Expenses for any calendar year, Tenant must "
        "deliver "
        "to Landlord written notice of Tenant's election to audit within 180 days "
        "after "
        "Landlord's delivery of the statement of such amount under Section 3.4.",
    ),
    "cam_audit_deadline_days": field(
        180,
        0.9,
        "Tenant must deliver to Landlord written notice of Tenant's election to audit "
        "within 180 days after Landlord's delivery of the statement of such amount.",
    ),
    "reconciliation_frequency": field(
        "annual",
        0.71,
        "Landlord shall keep and maintain reasonably complete, legible and accurate "
        "records of the Property Expenses ... for any calendar year",
    ),
    "ti_allowance_amount": field(
        0,
        0.89,
        "Improvement Allowance: (Not Applicable)",
    ),
    "cgl_occurrence_limit": field(
        1000000,
        0.95,
        "Tenant will maintain commercial general liability insurance ... with minimum "
        "limits of $1,000,000 each occurrence and $2,000,000 general aggregate.",
    ),
    "cgl_aggregate_limit": field(
        2000000,
        0.95,
        "Tenant will maintain commercial general liability insurance ... with minimum "
        "limits of $1,000,000 each occurrence and $2,000,000 general aggregate.",
    ),
    "additional_insured_req": field(
        True,
        0.92,
        "Tenant's liability insurance will (a) name Landlord, Property Manager and the "
        "other Landlord Parties as additional insureds.",
    ),
    "property_insurance_bearer": field(
        "landlord",
        0.74,
        "10.2 Landlord's Insurance Obligations. 10.2.1 Property Insurance.",
    ),
    "waiver_of_subrogation": field(
        True,
        0.87,
        "10.3 Waivers and Releases of Claims and Subrogation.",
    ),
    "consent_required": field(
        True,
        0.96,
        "Tenant will not cause or allow a Transfer without obtaining Landlord's prior "
        "written consent.",
    ),
    "consent_standard": field(
        "reasonable",
        0.88,
        "Landlord may grant or withhold consent in Landlord's reasonable discretion.",
    ),
    "recapture_right": field(
        True,
        0.92,
        "Landlord may also, at Landlord's option by notifying Tenant, recapture any "
        "portion of the Premises that would be affected by such Transfer.",
    ),
    "permitted_transferees": field(
        ["Affiliates of Tenant"],
        0.85,
        "13.4 Transfers to Affiliates. ... Landlord shall not be entitled to recapture "
        "the Premises in connection with a Transfer to an Affiliate.",
    ),
    "monetary_cure_period": field(
        5,
        0.94,
        "Tenant fails to pay Base Rent ... and such failure is not cured within five "
        "days after Landlord notifies Tenant in writing.",
    ),
    "non_monetary_cure_period": field(
        30,
        0.93,
        "Tenant breaches or fails to perform any of Tenant's non-monetary obligations "
        "under this Lease and such breach or failure is not cured within 30 days after "
        "Landlord notifies Tenant.",
    ),
    "holdover_rate": field(
        150,
        0.93,
        "Tenant will pay Landlord a charge for each day of occupancy after expiration "
        "of "
        "the Term in an amount equal to 150% of Tenant's last Base Rent.",
    ),
    "permitted_use_description": field(
        "Office, warehouse, and light manufacturing operations (all subject to "
        "applicable law)",
        0.95,
        "Permitted Use: Office, warehouse, and light manufacturing operations (all "
        "subject to applicable law)",
    ),
    "security_deposit_amount": field(
        39761.48,
        0.96,
        "Security Deposit: $39,761.48",
    ),
    "governing_law_state": field(
        "Minnesota",
        0.79,
        "This Lease is governed by, and must be interpreted under, the internal laws "
        "of "
        "the state in which the Property is located.",
    ),
    "landlord_notice_address": field(
        "Opus Northwest, L.L.C., 10350 Bren Road West, Minnetonka, MN 55343, Attn: "
        "Vice President",
        0.91,
        "Address of Landlord for Notices: Opus Northwest, L.L.C. 10350 Bren Road West "
        "Minnetonka, MN 55343 Attn: Vice President",
    ),
    "tenant_notice_address": field(
        "Insignia Systems, Inc., 8799 Brooklyn Boulevard, Brooklyn Park, MN 55445, "
        "Attn: Chief Financial Officer",
        0.91,
        "Address of Tenant for Notices: Insignia Systems, Inc. 8799 Brooklyn Boulevard "
        "Brooklyn Park, MN 55445 Attn: Chief Financial Officer",
    ),
    "hazardous_materials_clause": field(
        True,
        0.89,
        "ARTICLE 5 HAZARDOUS MATERIALS. 5.1 Compliance with Hazardous Materials Laws.",
    ),
    "casualty_termination_right": field(
        True,
        0.86,
        "11.2 Not Tenantable Within 150 Days. 11.3 Property Substantially Damaged.",
    ),
    "casualty_rent_abatement": field(
        True,
        0.86,
        "11.5 Landlord's Repair; Rent Abatement. 11.6 Rent Abatement if Lease "
        "Terminates.",
    ),
    "condemnation_termination_right": field(
        True,
        0.86,
        "ARTICLE 12 EMINENT DOMAIN. 12.1 Termination of Lease.",
    ),
    "force_majeure_clause": field(
        True,
        0.83,
        "the date eight (8) days after the Delivery Date shall be extended by the "
        "number "
        "of days of delay in Substantial Completion and tender of possession arising "
        "out "
        "of Force Majeure and/or Tenant Delay.",
    ),
}

# Exactly what detectRedFlags() produces for INDUSTRIAL_DATA: no management fee
# cap, no CAM cap, an NNN structure with no gross-up, no CAM exclusions, a
# five-day monetary cure, a landlord recapture right, and no purchase option
# disclosure.
INDUSTRIAL_RED_FLAGS = [
    red_flag(
        "RF-001",
        "Excessive Management Fee",
        "high",
        "No management fee cap found. Missing cap means unlimited management fees.",
        "missing",
    ),
    red_flag(
        "RF-003",
        "No CAM Cap",
        "high",
        "No CAM cap percentage found. Without a cap, annual CAM increases have no "
        "ceiling.",
        "missing",
    ),
    red_flag(
        "RF-005",
        "No Gross-Up Provision",
        "medium",
        "NNN lease has no gross-up percentage. In partially occupied buildings, tenant "
        "overpays for variable expenses.",
        "missing",
    ),
    red_flag(
        "RF-006",
        "Missing CAM Exclusions",
        "high",
        "No CAM exclusions found. Without exclusions, landlord can pass through any "
        "expense including capital expenditures.",
        "missing",
    ),
    red_flag(
        "RF-007",
        "Short Cure Period",
        "medium",
        "Monetary cure period of 5 days is below the 10-day minimum. Insufficient time "
        "to remedy payment defaults.",
        "5 days",
    ),
    red_flag(
        "RF-012",
        "Recapture Right Present",
        "medium",
        "Landlord can terminate lease upon assignment or subletting request.",
        "true",
    ),
    red_flag(
        "RF-020",
        "No Purchase Option Disclosure",
        "low",
        "Purchase option status not identified. Under ASC 842 / IFRS 16, this can "
        "affect "
        "lease liability calculations.",
        "missing",
    ),
]

# ---------------------------------------------------------------------------
# Lease 2: Cambridge Properties / University Hospital Systems medical office
# ---------------------------------------------------------------------------

MEDICAL_FILENAME = "cambridge-properties-medical-office-lease-7501-fannin.pdf"

MEDICAL_DATA: dict[str, dict[str, Any]] = {
    "landlord_legal_name": field(
        "Cambridge Properties",
        0.9,
        "CAMBRIDGE PROPERTIES, a sole proprietorship of Dr. Timothy L. Sharma, "
        'hereinafter referred to as "Landlord"',
    ),
    "tenant_legal_name": field(
        "University Hospital Systems, LLP",
        0.95,
        "UNIVERSITY HOSPITAL SYSTEMS, LLP, a Delaware limited liability partnership, "
        'hereinafter referred to as "Tenant"',
    ),
    "premises_address": field(
        "7501 Fannin Street, Houston, Texas",
        0.94,
        "which Building is located at 7501 Fannin Street, Houston, Texas.",
    ),
    "rentable_square_footage": field(
        69050,
        0.92,
        "approximately 69,050 square feet of Net Rentable Area consisting of "
        "approximately 10,532 square feet of Net Rentable Area on the first floor and "
        "approximately 19,506 square feet of Net Rentable Area on each of the second, "
        "third and fourth floors",
    ),
    "property_use_type": field(
        "medical_office",
        0.88,
        "the Leased Premises shall be used and occupied by Tenant solely for the "
        "operation of (i) a general care hospital and related medical and "
        "medical/professional uses",
    ),
    "lease_term_months": field(
        120,
        0.91,
        "shall expire at 11:59 p.m. on the one hundred twentieth (120th) monthly "
        'anniversary of the Commencement Date (the "Expiration Date")',
    ),
    "base_rent_annual": field(
        1381000.00,
        0.93,
        "Months after Commencement Date 1-60, Rate Per Square Foot of Net Rentable "
        "Area "
        "$20.00, Annual Base Rent $1,381,000.00, Monthly Base Rent $115,083.33",
    ),
    "monthly_base_rent": field(
        115083.33,
        0.93,
        "Months after Commencement Date 1-60 ... Monthly Base Rent $115,083.33",
    ),
    "base_rent_per_rsf": field(
        20.00,
        0.92,
        "Months after Commencement Date 1-60, Rate Per Square Foot of Net Rentable "
        "Area "
        "$20.00",
    ),
    "escalation_type": field(
        "stepped",
        0.86,
        "1-60 $20.00 $1,381,000.00 $115,083.33; 61-120 $21.50 $1,484,575.00 "
        "$123,714.58",
    ),
    "rent_payment_frequency": field(
        "monthly",
        0.94,
        "in advance, without demand, set-off or counterclaim, on the first day of each "
        "calendar month during the term hereof",
    ),
    "management_fee_cap": field(
        3.0,
        0.87,
        "The property management fees incurred by Landlord and the office expenses for "
        "Landlord's on site office not to exceed three percent (3%) of gross rentals "
        "receipts from the Building.",
    ),
    "audit_rights": field(
        True,
        0.91,
        "the Records shall ... be made available to Tenant, Tenant's internal auditing "
        "personnel and/or an independent auditor selected by Tenant for purposes of "
        "auditing, reviewing and photocopying the Records.",
    ),
    # DERIVED, not quoted. The filing states an earlier-of test with two limbs,
    # nine months and three months. A single integer cannot express that, so this
    # takes the binding limb, three months, as 90 days. Scored below the 0.6
    # medium threshold because the field genuinely loses information here.
    "cam_audit_deadline_days": field(
        90,
        0.45,
        "on or before the earlier of (i) nine (9) months after the end of any calendar "
        "year or (ii) three (3) months after receiving a bill for any Operating "
        "Expenses "
        "applicable to a prior calendar year",
    ),
    "cam_exclusions": field(
        [
            "Costs and expenses of leasing space in the Complex, including "
            "advertising, "
            "promotion, marketing, commissions and legal fees",
            "General corporate overhead of Landlord or of any of its agents",
            "Any management fee in excess of that which would have been charged by a "
            "reputable unaffiliated management company",
            "Costs and expenses of any special events for which Landlord charges a fee "
            "or receives income",
            "Legal, architectural, engineering, accounting and other professional fees",
            "Costs attributable to hazardous wastes, substances or materials, "
            "including "
            "testing, investigation, remediation and removal",
        ],
        0.82,
        "Notwithstanding anything to the contrary set forth in this Lease, in no "
        "event, "
        "however, shall Operating Expenses include any of the following.",
    ),
    "has_renewal_option": field(
        True,
        0.89,
        "Tenant shall have the option and right to extend the Lease Term under the "
        "terms "
        'and conditions of Exhibit "C" attached hereto.',
    ),
    "rofo_space": field(
        "Right of First Offer Space, exercisable for one (1) year after the "
        "Commencement Date",
        0.84,
        "Tenant for a period of one (1) year after the Commencement Date ... shall "
        'have the right ("Tenant\'s Right of First Offer")',
    ),
    "cgl_occurrence_limit": field(
        5000000,
        0.93,
        "insuring Tenant, but naming Landlord as an additional insured, in the amount "
        "of "
        "at least $5,000,000.00 combined single limit coverage and containing a "
        "cross-liability endorsement.",
    ),
    "additional_insured_req": field(
        True,
        0.92,
        "insuring Tenant, but naming Landlord as an additional insured",
    ),
    "consent_required": field(
        True,
        0.94,
        "Tenant will not assign this Lease or sublease the Leased Premises or any part "
        "thereof ... without the prior express written consent of Landlord.",
    ),
    "consent_standard": field(
        "reasonable",
        0.88,
        "Notwithstanding the above, Landlord shall not unreasonably withhold "
        "Landlord's "
        "consent to any proposed assignment or subletting by Tenant.",
    ),
    "monetary_cure_period": field(
        5,
        0.92,
        "The failure of Tenant to pay any Rent within five (5) days after receipt of "
        "notice thereof from Landlord",
    ),
    "non_monetary_cure_period": field(
        30,
        0.91,
        "The failure of Tenant to perform, comply with or observe any of the other "
        "covenants or conditions and the continuance of such failure for a period of "
        "thirty (30) days after written notice to Tenant",
    ),
    "holdover_rate": field(
        150,
        0.9,
        "an amount equal to the greater of (i) 150% of the rent payable by Tenant for "
        "the month immediately preceding the holdover period",
    ),
    "exclusive_use_rights": field(
        "Tenant has the exclusive right to operate a general care facility in the "
        "Building "
        "as a primary and principal use",
        0.86,
        "Tenant shall have the exclusive right to operate in the Building a general "
        "care "
        "facility as a primary and principal use.",
    ),
    "reserved_parking_spaces": field(
        20,
        0.87,
        "parking permits ... for twenty (20) parking spaces ... All of Tenant's "
        "Building "
        "Basement Spaces will be reserved parking spaces.",
    ),
    "monthly_parking_cost": field(
        100,
        0.85,
        "Tenant shall pay for the remaining Parking Permits at a rate equal to $100 "
        "per "
        "month per Parking Permit plus all applicable taxes thereon.",
    ),
    "permitted_use_description": field(
        "General care hospital and related medical and medical/professional uses, a "
        "pharmacy, "
        "a medical diagnostic laboratory, an MRI/radiology facility, a physical "
        "therapy "
        "facility and/or a rehabilitation services facility",
        0.93,
        "the Leased Premises shall be used and occupied by Tenant solely for the "
        "operation of (i) a general care hospital and related medical and "
        "medical/professional uses, (ii) a pharmacy, (iii) a medical diagnostic "
        "laboratory, (iv) a MRI/radiology facility, (v) a physical therapy facility "
        "and/or (vi) a rehabilitation services facility and no other purpose",
    ),
    "monument_signage_rights": field(
        True,
        0.88,
        "During the entire Term, including all renewal terms, Tenant shall be "
        "entitled, "
        "at Tenant's expense, to a monument sign in front of the Building and a sign "
        "affixed to the Building.",
    ),
    "fascia_signage_rights": field(
        True,
        0.86,
        "Tenant shall be entitled, at Tenant's expense, to ... a sign affixed to the "
        "Building.",
    ),
    "security_deposit_amount": field(
        115083.33,
        0.95,
        "SEC. 5. SECURITY DEPOSIT: $115,083.33 payable on the Effective Date (the "
        '"Security Deposit").',
    ),
    "governing_law_state": field(
        "Texas",
        0.83,
        "the Maximum Rate permitted by the applicable laws of the State of Texas or "
        "the "
        "United States of America",
    ),
    "estoppel_turnaround_days": field(
        20,
        0.9,
        "within twenty (20) days after request in writing therefor from Landlord, "
        "Tenant "
        "agrees to execute and deliver to Landlord ... Tenant's Estoppel Certificate",
    ),
    "hazardous_materials_clause": field(
        True,
        0.87,
        "SEC. 41. HAZARDOUS SUBSTANCES",
    ),
}

# Exactly what detectRedFlags() produces for MEDICAL_DATA. The 3% management fee
# cap and the itemised CAM exclusions clear RF-001 and RF-006, so this result
# reads very differently from the industrial lease.
MEDICAL_RED_FLAGS = [
    red_flag(
        "RF-003",
        "No CAM Cap",
        "high",
        "No CAM cap percentage found. Without a cap, annual CAM increases have no "
        "ceiling.",
        "missing",
    ),
    red_flag(
        "RF-007",
        "Short Cure Period",
        "medium",
        "Monetary cure period of 5 days is below the 10-day minimum. Insufficient time "
        "to remedy payment defaults.",
        "5 days",
    ),
    red_flag(
        "RF-016",
        "Missing Force Majeure Clause",
        "medium",
        "No force majeure clause found. Without this protection, tenants may remain "
        "liable during unforeseeable events.",
        "missing",
    ),
    red_flag(
        "RF-018",
        "No Casualty Termination Right",
        "medium",
        "No casualty termination right found. If the premises are substantially "
        "damaged, "
        "the tenant may be trapped in unusable space.",
        "missing",
    ),
    red_flag(
        "RF-020",
        "No Purchase Option Disclosure",
        "low",
        "Purchase option status not identified. Under ASC 842 / IFRS 16, this can "
        "affect "
        "lease liability calculations.",
        "missing",
    ),
]

INDUSTRIAL_SCORES = confidence_scores_for(INDUSTRIAL_DATA)
MEDICAL_SCORES = confidence_scores_for(MEDICAL_DATA)

# Final credit balance after the four ledger rows below.
DEMO_CREDITS_BALANCE = 13


# ---------------------------------------------------------------------------
# writers
# ---------------------------------------------------------------------------


def seed_user(cursor: psycopg.Cursor[Any]) -> None:
    cursor.execute(
        """
        INSERT INTO public.users
            (id, email, full_name, company, role, credits_balance, stripe_customer_id,
             created_at, deleted_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, now() - INTERVAL '45 days', NULL)
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            company = EXCLUDED.company,
            role = EXCLUDED.role,
            credits_balance = EXCLUDED.credits_balance,
            stripe_customer_id = EXCLUDED.stripe_customer_id,
            deleted_at = NULL
        """,
        (
            DEMO_USER_ID,
            DEMO_USER_EMAIL,
            "Demo User",
            "Demo Tenant Advisors",
            "tenant_rep",
            DEMO_CREDITS_BALANCE,
            "cus_demo_local_only",
        ),
    )


def seed_anonymous_session(cursor: psycopg.Cursor[Any]) -> None:
    # linked_user_id must stay NULL. findAnonymousSessionAuthRowByToken() in
    # workers/api/src/repositories/db.ts rejects a session that has been linked
    # to a user, and rejects one that has expired, so the expiry is refreshed on
    # every run.
    cursor.execute(
        """
        INSERT INTO public.anonymous_sessions
            (id, session_token, linked_user_id, email, expires_at, created_at)
        VALUES (%s, %s, NULL, %s,
                now() + INTERVAL '72 hours',
                now() - INTERVAL '3 hours')
        ON CONFLICT (id) DO UPDATE SET
            session_token = EXCLUDED.session_token,
            linked_user_id = NULL,
            email = EXCLUDED.email,
            expires_at = EXCLUDED.expires_at
        """,
        (ANON_SESSION_ID, ANON_SESSION_TOKEN, "guest@example.com"),
    )


def seed_payments(cursor: psycopg.Cursor[Any]) -> None:
    rows = [
        (
            PAYMENT_CREDIT_PACK_5,
            DEMO_USER_ID,
            "cs_demo_pack5",
            "pi_demo_pack5",
            "credit_pack_5",
            PRICE_CREDIT_PACK_5_CENTS,
            "paid",
            "30 days",
        ),
        (
            PAYMENT_CREDIT_PACK_10,
            DEMO_USER_ID,
            "cs_demo_pack10",
            "pi_demo_pack10",
            "credit_pack_10",
            PRICE_CREDIT_PACK_10_CENTS,
            "paid",
            "3 days",
        ),
        (
            PAYMENT_GUEST_SINGLE,
            None,
            "cs_demo_guest_single",
            "pi_demo_guest_single",
            "single",
            PRICE_SINGLE_CENTS,
            "paid",
            "3 hours",
        ),
    ]
    for (
        payment_id,
        user_id,
        checkout_session,
        payment_intent,
        payment_type,
        amount_cents,
        status,
        age,
    ) in rows:
        cursor.execute(
            """
            INSERT INTO public.payments
                (id, user_id, stripe_checkout_session_id, stripe_payment_intent_id,
                 payment_type, amount_cents, currency, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, 'usd', %s, now() - %s::interval)
            ON CONFLICT (id) DO UPDATE SET
                user_id = EXCLUDED.user_id,
                stripe_checkout_session_id = EXCLUDED.stripe_checkout_session_id,
                stripe_payment_intent_id = EXCLUDED.stripe_payment_intent_id,
                payment_type = EXCLUDED.payment_type,
                amount_cents = EXCLUDED.amount_cents,
                status = EXCLUDED.status
            """,
            (
                payment_id,
                user_id,
                checkout_session,
                payment_intent,
                payment_type,
                amount_cents,
                status,
                age,
            ),
        )


def upsert_extraction(
    cursor: psycopg.Cursor[Any],
    *,
    extraction_id: uuid.UUID,
    user_id: uuid.UUID | None,
    anonymous_session_id: uuid.UUID | None,
    status: str,
    payment_status: str,
    payment_id: uuid.UUID | None,
    document_filename: str,
    document_object_key: str,
    document_page_count: int | None,
    property_type: str | None,
    extracted_data: dict[str, Any] | None,
    confidence_scores: dict[str, Any] | None,
    red_flags: list[dict[str, str]] | None,
    show_camaudit: bool,
    overall_confidence: float | None,
    error_message: str | None,
    created_age: str,
    processing_started_age: str | None,
    processing_completed_age: str | None,
) -> None:
    cursor.execute(
        """
        INSERT INTO public.extractions
            (id, user_id, anonymous_session_id, status, document_filename,
             document_object_key, document_page_count, property_type, extracted_data,
             confidence_scores, red_flags, show_camaudit, overall_confidence,
             error_message, payment_status, payment_id, processing_started_at,
             processing_completed_at, created_at, updated_at, deleted_at)
        VALUES
            (%s, %s, %s, %s::public.extraction_status, %s,
             %s, %s, %s, %s,
             %s, %s, %s, %s,
             %s, %s::public.payment_status, %s,
             now() - %s::interval,
             now() - %s::interval,
             now() - %s::interval, now() - %s::interval, NULL)
        ON CONFLICT (id) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            anonymous_session_id = EXCLUDED.anonymous_session_id,
            status = EXCLUDED.status,
            document_filename = EXCLUDED.document_filename,
            document_object_key = EXCLUDED.document_object_key,
            document_page_count = EXCLUDED.document_page_count,
            property_type = EXCLUDED.property_type,
            extracted_data = EXCLUDED.extracted_data,
            confidence_scores = EXCLUDED.confidence_scores,
            red_flags = EXCLUDED.red_flags,
            show_camaudit = EXCLUDED.show_camaudit,
            overall_confidence = EXCLUDED.overall_confidence,
            error_message = EXCLUDED.error_message,
            payment_status = EXCLUDED.payment_status,
            payment_id = EXCLUDED.payment_id,
            processing_started_at = EXCLUDED.processing_started_at,
            processing_completed_at = EXCLUDED.processing_completed_at,
            -- Every timestamp is `now() - interval`, so they all have to move
            -- together on a re-seed. Refreshing the processing pair but not
            -- these two would produce a row that started processing days after
            -- it was created, and would let the recent rows age into stale data.
            created_at = EXCLUDED.created_at,
            updated_at = EXCLUDED.updated_at,
            deleted_at = NULL
        """,
        (
            extraction_id,
            user_id,
            anonymous_session_id,
            status,
            document_filename,
            document_object_key,
            document_page_count,
            property_type,
            None if extracted_data is None else Jsonb(extracted_data),
            None if confidence_scores is None else Jsonb(confidence_scores),
            None if red_flags is None else Jsonb(red_flags),
            show_camaudit,
            overall_confidence,
            error_message,
            payment_status,
            payment_id,
            processing_started_age,
            processing_completed_age,
            created_age,
            created_age,
        ),
    )


def seed_extractions(cursor: psycopg.Cursor[Any]) -> None:
    # 1. Guest-owned, complete, fully populated. This is the extraction the
    #    anonymous session unlocks, so /results/<id> can be opened with no login.
    #    It must keep user_id NULL: the anonymous owner clause in
    #    workers/api/src/repositories/extractions.ts matches on
    #    "anonymous_session_id = $1 AND user_id IS NULL".
    upsert_extraction(
        cursor,
        extraction_id=EXTRACTION_GUEST_INDUSTRIAL,
        user_id=None,
        anonymous_session_id=ANON_SESSION_ID,
        status="complete",
        payment_status="paid",
        payment_id=PAYMENT_GUEST_SINGLE,
        document_filename=INDUSTRIAL_FILENAME,
        document_object_key=guest_document_key(EXTRACTION_GUEST_INDUSTRIAL),
        document_page_count=52,
        property_type="industrial",
        extracted_data=INDUSTRIAL_DATA,
        confidence_scores=INDUSTRIAL_SCORES,
        red_flags=INDUSTRIAL_RED_FLAGS,
        show_camaudit=True,
        overall_confidence=overall_score(INDUSTRIAL_SCORES),
        error_message=None,
        created_age="3 hours",
        processing_started_age="3 hours",
        processing_completed_age="2 hours 56 minutes",
    )

    # 2. Demo user, complete and paid with a credit, fully populated.
    upsert_extraction(
        cursor,
        extraction_id=EXTRACTION_MEDICAL_OFFICE,
        user_id=DEMO_USER_ID,
        anonymous_session_id=None,
        status="complete",
        payment_status="paid",
        payment_id=None,
        document_filename=MEDICAL_FILENAME,
        document_object_key=user_document_key(EXTRACTION_MEDICAL_OFFICE),
        document_page_count=78,
        property_type="office",
        extracted_data=MEDICAL_DATA,
        confidence_scores=MEDICAL_SCORES,
        red_flags=MEDICAL_RED_FLAGS,
        show_camaudit=True,
        overall_confidence=overall_score(MEDICAL_SCORES),
        error_message=None,
        created_age="6 days",
        processing_started_age="6 days",
        processing_completed_age="5 days 23 hours 55 minutes",
    )

    # 3. Demo user, still running. 'extracting' is the processing state in the
    #    public.extraction_status enum.
    upsert_extraction(
        cursor,
        extraction_id=EXTRACTION_PROCESSING,
        user_id=DEMO_USER_ID,
        anonymous_session_id=None,
        status="extracting",
        payment_status="paid",
        payment_id=None,
        document_filename="karyopharm-therapeutics-office-lease-newton-ma.pdf",
        document_object_key=user_document_key(EXTRACTION_PROCESSING),
        document_page_count=44,
        property_type="office",
        extracted_data=None,
        confidence_scores=None,
        red_flags=None,
        show_camaudit=False,
        overall_confidence=None,
        error_message=None,
        created_age="40 minutes",
        processing_started_age="39 minutes",
        processing_completed_age=None,
    )

    # 4. Demo user, failed.
    upsert_extraction(
        cursor,
        extraction_id=EXTRACTION_FAILED,
        user_id=DEMO_USER_ID,
        anonymous_session_id=None,
        status="failed",
        payment_status="unpaid",
        payment_id=None,
        document_filename="childrens-place-retail-lease-scanned.pdf",
        document_object_key=user_document_key(EXTRACTION_FAILED),
        document_page_count=None,
        property_type="retail",
        extracted_data=None,
        confidence_scores=None,
        red_flags=None,
        show_camaudit=False,
        overall_confidence=None,
        error_message=(
            "The document could not be read. Every page came back as an image with no "
            "selectable text, so there was nothing to extract."
        ),
        created_age="2 days",
        processing_started_age="2 days",
        processing_completed_age="1 day 23 hours 58 minutes",
    )

    # 5. Demo user, uploaded but not started.
    upsert_extraction(
        cursor,
        extraction_id=EXTRACTION_UPLOADING,
        user_id=DEMO_USER_ID,
        anonymous_session_id=None,
        status="uploading",
        payment_status="unpaid",
        payment_id=None,
        document_filename="service-properties-trust-ground-lease.pdf",
        document_object_key=user_document_key(EXTRACTION_UPLOADING),
        document_page_count=None,
        property_type=None,
        extracted_data=None,
        confidence_scores=None,
        red_flags=None,
        show_camaudit=False,
        overall_confidence=None,
        error_message=None,
        created_age="6 minutes",
        processing_started_age=None,
        processing_completed_age=None,
    )


def seed_credit_ledger(cursor: psycopg.Cursor[Any]) -> None:
    """Insert the credit ledger.

    The ledger is append-only. A BEFORE UPDATE OR DELETE trigger
    (prevent_credit_transaction_mutation) rejects any change to an existing row,
    so re-running this script must never try to update one. Every insert uses
    ON CONFLICT DO NOTHING with no conflict target, which also covers the
    partial unique index on (payment_id) WHERE payment_id IS NOT NULL AND
    amount > 0.

    balance_after is computed here and stored at insert time, in order, exactly
    as the application does it. The last value must equal users.credits_balance.
    """
    running_balance = 0
    rows = [
        (
            LEDGER_PACK_5,
            None,
            PAYMENT_CREDIT_PACK_5,
            5,
            "Credit pack purchase (5 credits)",
            "30 days",
        ),
        (
            LEDGER_USE_MEDICAL,
            EXTRACTION_MEDICAL_OFFICE,
            None,
            -1,
            "Credit used for extraction",
            "6 days",
        ),
        (
            LEDGER_PACK_10,
            None,
            PAYMENT_CREDIT_PACK_10,
            10,
            "Credit pack purchase (10 credits)",
            "3 days",
        ),
        (
            LEDGER_USE_PROCESSING,
            EXTRACTION_PROCESSING,
            None,
            -1,
            "Credit used for extraction",
            "40 minutes",
        ),
    ]

    for transaction_id, extraction_id, payment_id, amount, description, age in rows:
        running_balance += amount
        cursor.execute(
            """
            INSERT INTO public.credit_transactions
                (id, user_id, extraction_id, payment_id, amount, balance_after,
                 description, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, now() - %s::interval)
            ON CONFLICT DO NOTHING
            """,
            (
                transaction_id,
                DEMO_USER_ID,
                extraction_id,
                payment_id,
                amount,
                running_balance,
                description,
                age,
            ),
        )

    if running_balance != DEMO_CREDITS_BALANCE:
        raise RuntimeError(
            "Ledger does not reconcile: users.credits_balance is "
            f"{DEMO_CREDITS_BALANCE} but the ledger ends at {running_balance}."
        )


# ---------------------------------------------------------------------------
# entry point
# ---------------------------------------------------------------------------


def report() -> str:
    return "\n".join(
        [
            "",
            "Demo data seeded.",
            "",
            "Copy these into your shell before starting the local auth stub:",
            "",
            f"export DEMO_USER_ID={DEMO_USER_ID}",
            f"export DEMO_USER_EMAIL={DEMO_USER_EMAIL}",
            "",
            "Completed extraction with full field data, red flags and confidence "
            "scores:",
            "",
            f"  {EXTRACTION_GUEST_INDUSTRIAL}",
            "",
            "Anonymous session token for viewing that result without signing in",
            "(send it as the X-Session-Token request header):",
            "",
            f"  {ANON_SESSION_TOKEN}",
            "",
            "Second completed extraction, owned by the demo user:",
            "",
            f"  {EXTRACTION_MEDICAL_OFFICE}",
            "",
        ]
    )


def main() -> int:
    url = database_url()
    try:
        with psycopg.connect(url) as connection:
            with connection.cursor() as cursor:
                seed_user(cursor)
                seed_anonymous_session(cursor)
                seed_payments(cursor)
                seed_extractions(cursor)
                seed_credit_ledger(cursor)
            connection.commit()
    except psycopg.OperationalError as error:
        sys.stderr.write(
            f"Could not connect to {url}\n"
            f"{error}\n"
            "Start the local database first:\n"
            "  docker compose -f backend/docker-compose.yml "
            "-f backend/docker-compose.local.yml up -d postgres\n"
        )
        return 1
    except psycopg.errors.UndefinedTable as error:
        # Reaching here means the database is up but empty. Applying the
        # migrations is a separate manual step, so this is a likely first run.
        sys.stderr.write(
            f"Connected to {url}, but the schema is not there yet.\n"
            f"{error}\n"
            "Apply the migrations first, shim before migrations:\n"
            '  psql "$LOCAL_DATABASE_URL" -f '
            "backend/neon/local/00000_local_auth_shim.sql\n"
            "  for f in backend/neon/migrations/*.sql; do "
            'psql "$LOCAL_DATABASE_URL" -f "$f"; done\n'
        )
        return 1

    sys.stdout.write(report())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
