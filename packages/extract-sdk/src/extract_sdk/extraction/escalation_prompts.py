"""Pass 3 escalation prompts for resolving disputed lease fields.

Pass 3 only runs when Pass 2 corrects a critical field or when a critical
field has low confidence.  The escalation model receives both values (Pass 1
and Pass 2) and the raw document to make the final determination.
"""

from __future__ import annotations

import json
from typing import Any

from extract_sdk.extraction.domain_knowledge import get_category_knowledge
from extract_sdk.models import ExtractionPatch

_ESCALATION_PREAMBLE = """\
You are a senior commercial real estate analyst resolving disputed lease
extraction values.  Two prior extraction passes disagreed on certain fields.
Your job is to read the raw lease document and determine the CORRECT value
for each disputed field.

For each field below, you will see:
- The Pass 1 (initial extraction) value
- The Pass 2 (adversarial review) proposed correction and reasoning

Read the raw lease text carefully and return your final determination.

**Output format — return ONLY valid JSON, no markdown or explanation:**

```
{
  "field_name": <final_correct_value>,
  "other_field": <final_correct_value>
}
```

Return ONLY the disputed fields listed below.  Do not include other fields.

"""


def build_lease_escalation_prompt(
    pass1_json: dict[str, Any],
    patch: ExtractionPatch,
    disputed_fields: list[str],
    field_categories: dict[str, str] | None = None,
) -> str:
    """Build the Pass 3 escalation prompt for disputed fields.

    Args:
        pass1_json: The Pass 1 extraction result as a dict.
        patch: The Pass 2 ExtractionPatch with corrections.
        disputed_fields: List of field names that need resolution.
        field_categories: Optional mapping of field_name → category name,
            used to inject relevant domain knowledge.

    Returns:
        Complete escalation prompt string.
    """
    parts: list[str] = [_ESCALATION_PREAMBLE]

    # Inject relevant category knowledge for disputed fields
    if field_categories:
        injected_categories: set[str] = set()
        for field_name in disputed_fields:
            category = field_categories.get(field_name, "")
            if category and category not in injected_categories:
                knowledge = get_category_knowledge(category)
                if knowledge:
                    parts.append(knowledge)
                    injected_categories.add(category)

    # List each disputed field with both values
    parts.append("\n## Disputed Fields\n\n")
    for field_name in disputed_fields:
        pass1_value = pass1_json.get(field_name)
        correction = patch.field_corrections.get(field_name)

        parts.append(f"### `{field_name}`\n")
        parts.append(f"- **Pass 1 value**: {json.dumps(pass1_value, default=str)}\n")

        if correction:
            parts.append(
                f"- **Pass 2 correction**: "
                f"{json.dumps(correction.corrected_value, default=str)}\n"
            )
            parts.append(f"- **Pass 2 reasoning**: {correction.reasoning}\n")
            parts.append(f"- **Pass 2 confidence**: {correction.confidence:.2f}\n")
        parts.append("\n")

    parts.append("## Raw Lease Document Text\n\n")

    return "".join(parts)
