"""Pass 2 adversarial validation prompts for lease extraction.

The validation model acts as a HOSTILE REVIEWER — its job is to FIND ERRORS,
not confirm correctness.  It receives the Pass 1 extraction JSON and produces
a sparse patch of corrections.
"""

from __future__ import annotations

import json
from typing import Any

from extract_sdk.extraction.domain_knowledge import get_validation_knowledge

_VALIDATION_PREAMBLE = """\
You are an adversarial quality reviewer for commercial lease abstractions.
Your job is to FIND ERRORS in the extraction below — not to confirm what
looks correct.  Interrogate every field.

You will receive:
1. The Pass 1 extraction JSON (the result to review)
2. Domain knowledge about common errors and cross-field validation rules
3. The raw lease document text

For every error you find, propose a correction with:
- The original (incorrect) value
- The corrected value
- Your reasoning
- Your confidence in the correction (0.0 to 1.0)

If you find NO errors, return an empty corrections object.

**Output format — return ONLY valid JSON, no markdown or explanation:**

```
{
  "field_corrections": {
    "field_name": {
      "original_value": <the Pass 1 value>,
      "corrected_value": <your proposed correction>,
      "reasoning": "<brief explanation>",
      "confidence": <0.0 to 1.0>,
      "rule_relevance": []
    }
  }
}
```

If no corrections needed: `{"field_corrections": {}}`

"""

_FORENSIC_CHECKLIST = """\
## Forensic Validation Checklist

Check each of these systematically:

1. **Format checks**: All percentages must be decimals (0.0525, not 5.25).
   All currencies as numbers (no $ symbols).  All dates as ISO 8601
   (YYYY-MM-DD).  All booleans as true/false (not "yes"/"no" strings).
   Any percentage field with value > 1.0 is almost certainly wrong.

2. **Date consistency**: commencement_date ≤ rent_commencement_date ≤
   expiration_date.  lease_term_months should match the months between
   commencement and expiration (±1 month).

3. **Pro rata share**: Must be 0.001–1.0.  Should ≈ rentable_square_footage
   ÷ building_total_rsf (within 2% tolerance).

4. **Rent-escalation coherence**: If escalation_type = "cpi", then
   cpi_index_reference should be populated.  If "fixed_percentage", then
   fixed_escalation_rate should be populated.

5. **Lease structure consistency**: If NNN → pro_rata_share + cam_exclusions
   populated.  If Gross → check for base_year.  If Modified Gross →
   specific expense allocation described.

6. **Option consistency**: has_renewal_option=true → renewal_terms non-empty.
   has_termination_option=true → termination_penalty populated.

7. **Financial plausibility**: security_deposit ≈ 1–3× monthly rent.
   cam_cap_percentage < 0.15.  management_fee_cap < 0.20.
   holdover_rate between 1.0 and 3.0.

8. **CAM cap type classification**: Verify against source_text.
   "per year" alone = non_cumulative.  "carry forward"/"banked" = cumulative.
   "compound" = compounding.  This is the #1 misclassification risk.

9. **Missing critical fields**: base_rent_annual, pro_rata_share,
   lease_term_months should NOT be null unless truly absent from document.

10. **Amendment detection**: If document contains amendment language, check
    that extracted values reflect the amendment, not superseded original terms.

"""


def build_lease_validation_prompt(pass1_json: dict[str, Any]) -> str:
    """Build the Pass 2 adversarial validation prompt.

    Args:
        pass1_json: The Pass 1 extraction result as a dict.

    Returns:
        Complete validation prompt string.
    """
    validation_knowledge = get_validation_knowledge()
    pass1_text = json.dumps(pass1_json, indent=2, default=str)

    return (
        _VALIDATION_PREAMBLE
        + _FORENSIC_CHECKLIST
        + validation_knowledge
        + "\n\n## Pass 1 Extraction to Review\n\n"
        + "```json\n"
        + pass1_text
        + "\n```\n\n"
        + "## Raw Lease Document Text\n\n"
    )
