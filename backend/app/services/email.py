"""Email notification service using Resend.

Sends transactional emails for extraction completion and CAM flag detection.
"""

from __future__ import annotations

import html
import logging
from pathlib import Path
from string import Template
from typing import Any

import resend

from app.core.config import settings
from app.services.brand import BRAND_ASSETS
from app.services.public_knowledge import (
    get_email_footer_copy,
    get_email_sender,
    render_public_subject,
)

logger = logging.getLogger(__name__)

_TEMPLATE_DIR = Path(__file__).resolve().parent / "email_templates"


def _get_from_address() -> str:
    """Return the configured from address, falling back to public knowledge."""
    configured = settings.resend_from_address.strip()
    if configured:
        return configured
    return get_email_sender("founder")


_SITE_URL = "https://lextract.io"


def _email_footer_vars() -> dict[str, str]:
    footer = get_email_footer_copy()
    return {
        "email_footer_unsubscribe": html.escape(footer["unsubscribe"]),
        "email_footer_support": html.escape(footer["support"]),
    }


class EmailService:
    """Sends transactional emails via Resend."""

    def __init__(self, api_key: str) -> None:
        """Initialize the email service with a Resend API key.

        Args:
            api_key: Resend API key for authentication.
        """
        self._api_key = api_key
        resend.api_key = api_key

    def _render_template(self, template_name: str, **kwargs: str) -> str:
        """Load and render an HTML email template.

        Args:
            template_name: Filename of the template in email_templates/.
            **kwargs: Template variables to substitute.

        Returns:
            Rendered HTML string.
        """
        template_path = _TEMPLATE_DIR / template_name
        raw = template_path.read_text(encoding="utf-8")
        return Template(raw).safe_substitute(
            logo_url=BRAND_ASSETS.email_logo_url,
            **_email_footer_vars(),
            **kwargs,
        )

    def send_extraction_complete(
        self,
        to: str,
        document_name: str,
        field_count: int,
        confidence_summary: str,
        results_url: str,
        unsubscribe_url: str = f"{_SITE_URL}/settings/notifications",
    ) -> dict[str, Any]:
        """Send extraction completion email.

        Args:
            to: Recipient email address.
            document_name: Original document filename.
            field_count: Number of fields extracted.
            confidence_summary: Human-readable confidence level.
            results_url: URL to view extraction results.
            unsubscribe_url: URL for managing email preferences (footer link).

        Returns:
            Dict with message id from Resend.
        """
        safe_name = html.escape(document_name)
        html_body = self._render_template(
            "extraction_complete.html",
            document_name=safe_name,
            field_count=str(field_count),
            confidence_summary=html.escape(confidence_summary),
            results_url=results_url,
            unsubscribe_url=unsubscribe_url,
        )
        plain_text = (
            f"Your lease extraction is ready - {document_name}\n\n"
            f"Document: {document_name}\n"
            f"Fields extracted: {field_count}\n"
            f"Confidence: {confidence_summary}\n\n"
            f"View results: {results_url}\n\n"
            f"Manage email preferences: {unsubscribe_url}\n"
        )

        subject = render_public_subject(
            "extraction-complete",
            document_name=document_name,
        )

        result = resend.Emails.send(
            {
                "from": _get_from_address(),
                "to": [to],
                "subject": subject,
                "html": html_body,
                "text": plain_text,
            }
        )

        logger.info(
            "Sent extraction complete email to %s (msg=%s)",
            to,
            result.get("id"),
        )
        # Convert SendResponse (dict subclass) to plain dict for type compat
        return dict(result)

    def send_cam_flags_found(
        self,
        to: str,
        document_name: str,
        flag_count: int,
        flag_names: list[str],
        camaudit_url: str,
        unsubscribe_url: str = f"{_SITE_URL}/settings/notifications",
    ) -> dict[str, Any]:
        """Send CAM flags detection email with CamAudit partner context.

        Args:
            to: Recipient email address.
            document_name: Original document filename.
            flag_count: Number of red flags detected.
            flag_names: List of flag names/descriptions.
            camaudit_url: URL to CamAudit landing page.
            unsubscribe_url: URL for managing email preferences (footer link).

        Returns:
            Dict with message id from Resend.
        """
        safe_name = html.escape(document_name)
        flag_list_html = "\n".join(
            f"<li>{html.escape(name)}</li>" for name in flag_names
        )
        html_body = self._render_template(
            "cam_flags_found.html",
            document_name=safe_name,
            flag_count=str(flag_count),
            flag_list_html=flag_list_html,
            camaudit_url=camaudit_url,
            unsubscribe_url=unsubscribe_url,
        )

        flag_list_text = "\n".join(f"  - {name}" for name in flag_names)
        plain_text = (
            f"{flag_count} potential issues found in {document_name}\n\n"
            f"Red flags detected:\n{flag_list_text}\n\n"
            f"Review CAM recovery options with CAMAudit: {camaudit_url}\n\n"
            f"Manage email preferences: {unsubscribe_url}\n"
        )

        subject = render_public_subject(
            "cam-flags-found",
            flag_count=flag_count,
            document_name=document_name,
        )

        result = resend.Emails.send(
            {
                "from": _get_from_address(),
                "to": [to],
                "subject": subject,
                "html": html_body,
                "text": plain_text,
            }
        )

        logger.info(
            "Sent CAM flags email to %s (msg=%s)",
            to,
            result.get("id"),
        )
        # Convert SendResponse (dict subclass) to plain dict for type compat
        return dict(result)

    def send_complete_your_account(
        self,
        to: str,
        results_url: str,
        password_reset_url: str,
    ) -> dict[str, Any]:
        """Send "complete your account" email after guest checkout.

        Sent when a guest pays without an account — prompts them to set a
        password so they can log in and access their results anytime.

        Args:
            to: Recipient email address (same as the guest_email they paid with).
            results_url: Direct URL to the unlocked extraction results.
            password_reset_url: One-time password reset / account setup link.

        Returns:
            Dict with message id from Resend.
        """
        subject = render_public_subject("guest-account-setup")
        safe_results_url = html.escape(results_url)
        safe_reset_url = html.escape(password_reset_url)
        footer = get_email_footer_copy()
        html_body = (
            "<!DOCTYPE html><html><body>"
            f'<p><img src="{BRAND_ASSETS.email_logo_url}" alt="Lextract" '
            'width="180" style="height:auto;max-width:180px;"><br>'
            '<span data-brand-text="Lextract" '
            'style="font-size:16px;font-weight:700;color:#111827;">'
            "Lextract</span></p>"
            "<p>Your results are ready.</p>"
            f'<p><a href="{safe_results_url}">View your lease analysis</a></p>'
            "<p>Set a password to access your account anytime:</p>"
            f'<p><a href="{safe_reset_url}">Set your password</a></p>'
            f"<p>{html.escape(footer['support'])}</p>"
            "<p>— The Lextract team</p>"
            "</body></html>"
        )
        plain_text = (
            "Your results are ready.\n\n"
            f"View your lease analysis: {results_url}\n\n"
            "Set a password to access your account anytime:\n"
            f"{password_reset_url}\n\n"
            f"{footer['support']}\n\n"
            "— The Lextract team"
        )

        result = resend.Emails.send(
            {
                "from": _get_from_address(),
                "to": [to],
                "subject": subject,
                "html": html_body,
                "text": plain_text,
            }
        )

        logger.info(
            "Sent complete-your-account email to %s (msg=%s)",
            to,
            result.get("id"),
        )
        return dict(result)
