"""Shared normalization for raw extraction values shown to buyers.

A blank commercial-lease template leaves fill-in tokens like
``{NAME OF TENANT}`` or ``insert address of property`` where a real term
would go. Those tokens must never reach a buyer as if they were extracted
data — not on the teaser, not on the full results page, not in an export —
so every buyer-facing surface treats them as "not found".

The frontend mirrors :func:`is_template_placeholder` in
``frontend/types/extraction.ts`` (``formatFieldValue``); keep the two rules
in sync.
"""

import re

TEMPLATE_PLACEHOLDER_RE = re.compile(r"^\{.*\}$")

# An extraction enum is a bare lowercase token, optionally underscore-joined:
# ``gross``, ``stepped``, ``pro_rata_allocation``. Anything else — prose with
# spaces, a proper name, a number, a date, a filename like ``my_lease.pdf`` —
# is left exactly as extracted.
ENUM_TOKEN_RE = re.compile(r"[a-z]+(?:_[a-z]+)*")


def is_template_placeholder(text: str) -> bool:
    """Return True if a stripped string is a leftover blank-template token.

    A token counts as a placeholder when it is fully wrapped in braces
    (``{NAME OF TENANT}``) or begins with ``insert `` (``insert address``).
    A real value that merely contains braces (``Suite {2}, 100 Main St``) is
    not a placeholder.
    """
    stripped = text.strip()
    return bool(TEMPLATE_PLACEHOLDER_RE.match(stripped)) or stripped.lower().startswith(
        "insert "
    )


def humanize_enum_value(text: str) -> str:
    """Title-case a snake_case or lowercase enum token for buyers.

    Extraction enums arrive as bare lowercase tokens, optionally
    underscore-joined (``gross``, ``stepped``, ``pro_rata_allocation``). Those
    read as machine output, so they become ``Gross`` / ``Pro Rata Allocation``.
    Anything else — prose with spaces, a proper name, a number, a date, a
    filename like ``my_lease.pdf`` — is left exactly as extracted.
    """
    if not ENUM_TOKEN_RE.fullmatch(text):
        return text
    return text.replace("_", " ").title()


def clean_text_value(raw: str) -> str | None:
    """Strip a string value and drop blanks and leftover template tokens."""
    text = raw.strip()
    if not text:
        return None
    if is_template_placeholder(text):
        return None
    return text


def normalize_field_value(raw: object) -> str | None:
    """Turn a raw extracted value into clean, buyer-facing display text.

    Returns ``None`` when the value should read as "not found": missing,
    blank, or a literal fill-in token from a blank template. Booleans render
    as human ``Yes``/``No``; list fields render as comma-joined prose.
    """
    if raw is None:
        return None
    # bool is a subclass of int, so check it before any numeric coercion.
    if isinstance(raw, bool):
        return "Yes" if raw else "No"
    if isinstance(raw, str):
        cleaned = clean_text_value(raw)
        return humanize_enum_value(cleaned) if cleaned is not None else None
    if isinstance(raw, (list, tuple)):
        cleaned_items = [
            humanize_enum_value(item)
            for v in raw
            if (item := clean_text_value(str(v))) is not None
        ]
        return ", ".join(cleaned_items) if cleaned_items else None
    return str(raw)
