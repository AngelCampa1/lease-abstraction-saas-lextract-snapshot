# Plan: Ground-Truth Accuracy Assertions for E2E Test

## Context

The E2E test (`backend/tests/e2e/test_real_extraction.py`) runs the full extraction pipeline against lease 07 (industrial/San Carlos, ~9,740 sqft) via real OpenRouter APIs. Currently it only validates **structure** — fields are non-empty, positive numbers, correct types. It does NOT validate **accuracy** — a model returning hallucinated but plausible values would pass.

We need to add assertions that verify the extracted values match the actual lease content. The ground truth was manually verified by reading the raw HTML lease document.

## Key Design Decisions

### Fuzzy matching (not exact)
LLM output is non-deterministic. String fields need case-insensitive substring matching ("Alemany Plaza" matches "ALEMANY PLAZA, LLC, a California limited liability company"). Numbers need tolerance ranges (±5%). Dates need ISO normalization.

### Hard vs. soft assertions
- **Hard**: Unambiguous facts (landlord name, address, sqft, booleans). Test fails if wrong.
- **Soft**: Amendment-dependent values (expiration date, security deposit, term). Logged but don't fail. These have multiple correct answers depending on which amendment version the model focuses on.

### No new API calls
All assertions run against the existing `in_memory_db.record` after the 3 pipeline stages. Zero additional cost or time.

## Files to Create/Modify

### 1. NEW: `backend/tests/e2e/accuracy_helpers.py`

Assertion helpers + report dataclass. No external dependencies.

```python
@dataclasses.dataclass
class AccuracyReport:
    passed: list[str]
    failed: list[tuple[str, str]]       # (field, error_msg)
    soft_failed: list[tuple[str, str]]  # logged, non-blocking

def run_accuracy_suite(extracted_data, ground_truth, *, soft_fields=frozenset()) -> AccuracyReport
```

**Matcher functions** (all internal):
- `_check_contains_any(actual, values)` — case-insensitive substring: `any(v.lower() in str(actual).lower() for v in values)`
- `_check_numeric_approx(actual, expected, tolerance=0.05)` — `abs(actual - expected) / max(abs(expected), 1e-9) <= tolerance`
- `_check_numeric_one_of(actual, values, tolerance=0.05)` — passes if within tolerance of ANY value
- `_check_date_one_of(actual, values)` — normalize to `YYYY-MM-DD` and check membership
- `_check_bool(actual, expected)` — exact match

Each matcher returns `(ok: bool, error_msg: str)`. The `run_accuracy_suite` function iterates ground truth, calls the right matcher per spec type, and collects into `AccuracyReport`.

### 2. MODIFY: `backend/tests/e2e/conftest.py`

Add two constants after `E2E_EXTRACTION_ID`:

**`LEASE_07_GROUND_TRUTH`** — dict mapping field names to assertion specs:

**Hard assertions (~21 fields):**

| Field | Match Type | Expected |
|-------|-----------|----------|
| `landlord_legal_name` | contains_any | ["Alemany Plaza"] |
| `tenant_legal_name` | contains_any | ["Sutro Biopharma"] |
| `premises_address` | contains_any | ["894 Industrial"] |
| `suite_or_unit_number` | contains_any | ["2"] |
| `rentable_square_footage` | approx | 9740 ±5% |
| `commencement_date` | date_one_of | ["2011-08-01"] |
| `execution_date` | date_one_of | ["2011-05-18"] |
| `rent_payment_frequency` | contains_any | ["monthly"] |
| `lease_structure_type` | contains_any | ["nnn", "net", "triple net"] |
| `pro_rata_share` | numeric_one_of | [0.7215, 72.15] ±5% |
| `cgl_occurrence_limit` | approx | 1000000 ±1% |
| `cgl_aggregate_limit` | approx | 2000000 ±1% |
| `waiver_of_subrogation` | bool | true |
| `additional_insured_req` | bool | true |
| `has_renewal_option` | bool | true |
| `consent_required` | bool | true |
| `governing_law_state` | contains_any | ["California", "CA"] |
| `monetary_cure_period` | approx | 3 ±1% |
| `non_monetary_cure_period` | approx | 30 ±1% |
| `late_fee_percentage` | numeric_one_of | [0.05, 5.0] ±10% |
| `holdover_rate` | numeric_one_of | [1.5, 150] ±5% |

**Soft assertions (~10 fields) — `LEASE_07_SOFT_FIELDS` set:**

| Field | Match Type | Expected |
|-------|-----------|----------|
| `expiration_date` | date_one_of | ["2016-07-31", "2021-07-31"] |
| `lease_term_months` | numeric_one_of | [60, 120] ±1% |
| `base_rent_monthly` | numeric_one_of | [8279] ±10% |
| `base_rent_annual` | numeric_one_of | [99348] ±10% |
| `security_deposit_amount` | numeric_one_of | [19619, 27139, 29160] ±5% |
| `escalation_type` | contains_any | ["fixed", "annual", "percentage"] |
| `fixed_escalation_rate` | numeric_one_of | [0.02, 0.03, 2.0, 3.0] ±15% |
| `property_insurance_bearer` | contains_any | ["landlord", "lessor"] |
| `permitted_use_description` | contains_any | ["office", "laboratory", "biotech", "industrial"] |
| `rent_commencement_date` | date_one_of | ["2011-08-01"] |

### 3. MODIFY: `backend/tests/e2e/test_real_extraction.py`

Add accuracy block at the bottom of `test_full_pipeline_real_openrouter`, after line 162 (existing structural assertions remain as fast-fail guards):

```python
# -----------------------------------------------------------------------
# Ground-truth accuracy — lease 07
# -----------------------------------------------------------------------
from .accuracy_helpers import run_accuracy_suite
from .conftest import LEASE_07_GROUND_TRUTH, LEASE_07_SOFT_FIELDS

report = run_accuracy_suite(extracted_data, LEASE_07_GROUND_TRUTH, soft_fields=LEASE_07_SOFT_FIELDS)

# Print report for CI visibility
print(f"\n{'='*60}")
print(f"ACCURACY: {len(report.passed)}/{len(report.passed)+len(report.failed)} hard, "
      f"{soft_pass}/{len(LEASE_07_SOFT_FIELDS)} soft")
for field, msg in report.failed:
    print(f"  HARD FAIL: {field}: {msg}")
for field, msg in report.soft_failed:
    print(f"  SOFT FAIL: {field}: {msg}")
print(f"{'='*60}\n")

assert not report.failed, f"{len(report.failed)} accuracy failures: {[f for f, _ in report.failed]}"
```

### 4. NEW: `backend/tests/e2e/test_accuracy_helpers.py`

Unit tests for the matcher functions using synthetic data (no API calls, runs instantly). Covers:
- String containment (case-insensitive, substring)
- Numeric tolerance (exact boundary, within, outside)
- Numeric one-of (matches any candidate independently)
- Date normalization and matching
- Bool exact match
- AccuracyReport aggregation (hard vs soft split)
- Full `run_accuracy_suite` with a mix of passing/failing specs

## Workflow

Work from a **git worktree** on a feature branch (`feat/e2e-accuracy-assertions`). Implement, run the helper unit tests, then review-merge back to master.

## Verification

1. Run unit tests for helpers (no API key needed):
   ```bash
   cd backend && python -m pytest tests/e2e/test_accuracy_helpers.py -v --no-cov
   ```

2. Run full E2E with accuracy assertions:
   ```bash
   cd backend && OPENROUTER_API_KEY=sk-or-... python -m pytest tests/e2e/ -m e2e -v -s --no-cov
   ```

3. Expected output includes accuracy report showing pass/fail per field
4. All hard assertions should pass; soft failures are informational
