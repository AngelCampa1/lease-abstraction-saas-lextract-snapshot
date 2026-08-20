"""Tests for the email notification service and Celery tasks."""

from __future__ import annotations

from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# EmailService tests
# ---------------------------------------------------------------------------


class TestEmailServiceExtractionComplete:
    """Tests for EmailService.send_extraction_complete."""

    def test_sends_extraction_complete_with_correct_params(self) -> None:
        """Email service should call resend with correct parameters."""
        from app.services.email import EmailService

        svc = EmailService(api_key="re_test_key")

        mock_send = MagicMock(return_value={"id": "msg-123"})
        with patch("app.services.email.resend") as mock_resend:
            mock_resend.Emails.send = mock_send

            result = svc.send_extraction_complete(
                to="user@example.com",
                document_name="lease.pdf",
                field_count=99,
                confidence_summary="High confidence (95%)",
                results_url="https://lextract.io/results/ext-1",
                unsubscribe_url="https://lextract.io/settings/notifications",
            )

            assert result == {"id": "msg-123"}
            mock_send.assert_called_once()
            call_args = mock_send.call_args[0][0]
            assert call_args["to"] == ["user@example.com"]
            assert "lease.pdf" in call_args["subject"]
            assert call_args["from"] == "Angel Campa <angel.campa@lextract.io>"
            assert "lease.pdf" in call_args["html"]
            assert "99" in call_args["html"]
            assert "https://lextract.io/results/ext-1" in call_args["html"]
            assert (
                'href="https://lextract.io/settings/notifications"' in call_args["html"]
            )
            assert "#0D9488" in call_args["html"]  # brand teal CTA
            assert "text" in call_args  # plain text version

    def test_sets_resend_api_key(self) -> None:
        """EmailService should set the resend API key on init."""
        from app.services.email import EmailService

        with patch("app.services.email.resend") as mock_resend:
            EmailService(api_key="re_secret")
            assert mock_resend.api_key == "re_secret"


class TestEmailServiceCamFlags:
    """Tests for EmailService.send_cam_flags_found."""

    def test_sends_cam_flags_with_correct_params(self) -> None:
        """Email service should send CAM flags email with flag details."""
        from app.services.email import EmailService

        svc = EmailService(api_key="re_test_key")

        mock_send = MagicMock(return_value={"id": "msg-456"})
        with patch("app.services.email.resend") as mock_resend:
            mock_resend.Emails.send = mock_send

            result = svc.send_cam_flags_found(
                to="user@example.com",
                document_name="office-lease.pdf",
                flag_count=3,
                flag_names=[
                    "Excessive admin fee",
                    "Missing audit rights",
                    "Uncapped management fee",
                ],
                camaudit_url="https://camaudit.io",
                unsubscribe_url="https://lextract.io/settings/notifications",
            )

            assert result == {"id": "msg-456"}
            mock_send.assert_called_once()
            call_args = mock_send.call_args[0][0]
            assert call_args["to"] == ["user@example.com"]
            assert "3" in call_args["subject"]
            assert "office-lease.pdf" in call_args["subject"]
            assert "Excessive admin fee" in call_args["html"]
            assert "Missing audit rights" in call_args["html"]
            assert "camaudit.io" in call_args["html"]
            assert (
                'href="https://lextract.io/settings/notifications"' in call_args["html"]
            )
            assert "#0D9488" in call_args["html"]
            assert "text" in call_args


class TestEmailServiceLeadMagnets:
    """Tests for guest account setup email."""

    def test_sends_complete_your_account_email(self) -> None:
        """Complete-account email should include results and reset links."""
        from app.services.email import EmailService
        from app.services.public_knowledge import get_email_footer_copy

        svc = EmailService(api_key="re_test_key")
        mock_send = MagicMock(return_value={"id": "msg-account-1"})
        footer = get_email_footer_copy()

        with patch("app.services.email.resend") as mock_resend:
            mock_resend.Emails.send = mock_send

            result = svc.send_complete_your_account(
                to="guest@example.com",
                results_url="https://lextract.io/results/ext-1",
                password_reset_url="https://lextract.io/reset/token",
            )

        assert result == {"id": "msg-account-1"}
        mock_send.assert_called_once()
        call_args = mock_send.call_args[0][0]
        assert call_args["subject"] == "Complete your Lextract account"
        assert "https://lextract.io/results/ext-1" in call_args["html"]
        assert "https://lextract.io/reset/token" in call_args["html"]
        assert footer["support"] in call_args["html"]
        assert "text" in call_args


class TestEmailTemplateRendering:
    """Tests for HTML template loading and rendering."""

    def test_extraction_complete_template_exists(self) -> None:
        """The extraction_complete template file should exist."""
        template_dir = (
            Path(__file__).resolve().parent.parent
            / "app"
            / "services"
            / "email_templates"
        )
        assert (template_dir / "extraction_complete.html").is_file()

    def test_cam_flags_template_exists(self) -> None:
        """The cam_flags_found template file should exist."""
        template_dir = (
            Path(__file__).resolve().parent.parent
            / "app"
            / "services"
            / "email_templates"
        )
        assert (template_dir / "cam_flags_found.html").is_file()

    def test_extraction_complete_template_renders_variables(self) -> None:
        """Template should render all placeholders."""
        from app.services.email import EmailService
        from app.services.public_knowledge import get_email_footer_copy

        svc = EmailService(api_key="re_test_key")
        footer = get_email_footer_copy()
        html = svc._render_template(
            "extraction_complete.html",
            document_name="test.pdf",
            field_count="42",
            confidence_summary="High",
            results_url="https://example.com/results/1",
            unsubscribe_url="https://lextract.io/settings/notifications",
        )
        assert "test.pdf" in html
        assert "42" in html
        assert "High" in html
        assert "https://example.com/results/1" in html
        assert 'href="https://lextract.io/settings/notifications"' in html
        assert footer["unsubscribe"] in html
        assert footer["support"] in html

    def test_extraction_complete_template_has_ai_disclaimer(self) -> None:
        """Template should warn the reader to verify AI results."""
        from app.services.email import EmailService

        svc = EmailService(api_key="re_test_key")
        html = svc._render_template(
            "extraction_complete.html",
            document_name="test.pdf",
            field_count="42",
            confidence_summary="High",
            results_url="https://example.com/results/1",
            unsubscribe_url="https://lextract.io/settings/notifications",
        )
        assert "Lextract uses AI and can get things wrong." in html
        assert "Check the fields against your lease before you use them." in html

    def test_cam_flags_template_renders_variables(self) -> None:
        """CAM flags template should render all placeholders."""
        from app.services.email import EmailService
        from app.services.public_knowledge import get_email_footer_copy

        svc = EmailService(api_key="re_test_key")
        footer = get_email_footer_copy()
        html = svc._render_template(
            "cam_flags_found.html",
            document_name="lease.pdf",
            flag_count="2",
            flag_list_html="<li>Flag A</li><li>Flag B</li>",
            camaudit_url="https://camaudit.io",
            unsubscribe_url="https://lextract.io/settings/notifications",
        )
        assert "lease.pdf" in html
        assert "2" in html
        assert "Flag A" in html
        assert "camaudit.io" in html
        assert footer["unsubscribe"] in html
        assert footer["support"] in html
        assert 'href="https://lextract.io/settings/notifications"' in html

# ---------------------------------------------------------------------------
# Celery email task tests
# ---------------------------------------------------------------------------


def _make_mock_db(
    extraction_data: dict[str, Any] | None = None,
    user_data: dict[str, Any] | None = None,
) -> MagicMock:
    """Build a mock Supabase client that returns extraction and user data."""
    mock_db = MagicMock()

    # For extractions table query
    extraction_response = MagicMock()
    extraction_response.data = extraction_data

    # For users table query
    user_response = MagicMock()
    user_response.data = user_data

    def table_router(table_name: str) -> MagicMock:
        mock_table = MagicMock()
        if table_name == "extractions":
            # Email tasks use .maybe_single() instead of .single()
            mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = (
                extraction_response
            )
        elif table_name == "users":
            mock_table.select.return_value.eq.return_value.single.return_value.execute.return_value = (
                user_response
            )
        return mock_table

    mock_db.table = MagicMock(side_effect=table_router)
    return mock_db


class TestSendExtractionCompleteEmailTask:
    """Tests for the send_extraction_complete_email Celery task."""

    def test_sends_email_for_authenticated_user(self) -> None:
        """Task should send email when user has an email address."""
        from app.tasks.email import send_extraction_complete_email

        mock_db = _make_mock_db(
            extraction_data={
                "id": "ext-1",
                "user_id": "user-1",
                "document_filename": "lease.pdf",
                "overall_confidence": 0.95,
                "extracted_data": {
                    "field1": {"value": "v1"},
                    "field2": {"value": "v2"},
                },
            },
            user_data={"id": "user-1", "email": "user@example.com"},
        )

        mock_email_svc = MagicMock()
        mock_email_svc.send_extraction_complete.return_value = {"id": "msg-1"}

        with (
            patch("app.tasks.email._get_db_client", return_value=mock_db),
            patch("app.tasks.email._build_email_service", return_value=mock_email_svc),
            patch("app.tasks.email.settings") as mock_settings,
        ):
            mock_settings.frontend_url = "https://lextract.io"
            result = send_extraction_complete_email("ext-1")

            assert result["sent"] is True
            mock_email_svc.send_extraction_complete.assert_called_once()
            call_kwargs = mock_email_svc.send_extraction_complete.call_args[1]
            assert (
                call_kwargs["unsubscribe_url"]
                == "https://lextract.io/settings/notifications"
            )

    def test_skips_anonymous_extraction(self) -> None:
        """Task should skip when extraction has no user_id."""
        from app.tasks.email import send_extraction_complete_email

        mock_db = _make_mock_db(
            extraction_data={
                "id": "ext-1",
                "user_id": None,
                "document_filename": "lease.pdf",
                "overall_confidence": 0.90,
                "extracted_data": {"field1": {"value": "v1"}},
            },
        )

        with patch("app.tasks.email._get_db_client", return_value=mock_db):
            result = send_extraction_complete_email("ext-1")

            assert result["sent"] is False
            assert "anonymous" in result["reason"]

    def test_skips_when_extraction_not_found(self) -> None:
        """Task should return early when extraction doesn't exist (deleted between dispatch and execution)."""
        from app.tasks.email import send_extraction_complete_email

        mock_db = _make_mock_db(
            extraction_data=None,
            user_data=None,
        )

        with patch("app.tasks.email._get_db_client", return_value=mock_db):
            result = send_extraction_complete_email("ext-nonexistent")

            assert result["sent"] is False
            assert "not found" in result["reason"]

    def test_skips_user_without_email(self) -> None:
        """Task should skip when user has no email address."""
        from app.tasks.email import send_extraction_complete_email

        mock_db = _make_mock_db(
            extraction_data={
                "id": "ext-1",
                "user_id": "user-1",
                "document_filename": "lease.pdf",
                "overall_confidence": 0.90,
                "extracted_data": {"field1": {"value": "v1"}},
            },
            user_data={"id": "user-1", "email": None},
        )

        with patch("app.tasks.email._get_db_client", return_value=mock_db):
            result = send_extraction_complete_email("ext-1")

            assert result["sent"] is False
            assert "no email" in result["reason"]

    def test_raises_on_send_failure(self) -> None:
        """Task should propagate the exception so Celery can retry via autoretry_for."""
        from app.tasks.email import send_extraction_complete_email

        mock_db = _make_mock_db(
            extraction_data={
                "id": "ext-1",
                "user_id": "user-1",
                "document_filename": "lease.pdf",
                "overall_confidence": 0.90,
                "extracted_data": {"field1": {"value": "v1"}},
            },
            user_data={"id": "user-1", "email": "user@example.com"},
        )

        mock_email_svc = MagicMock()
        mock_email_svc.send_extraction_complete.side_effect = RuntimeError(
            "Resend API down"
        )

        with (
            patch("app.tasks.email._get_db_client", return_value=mock_db),
            patch(
                "app.tasks.email._build_email_service",
                return_value=mock_email_svc,
            ),
        ):
            with pytest.raises(RuntimeError, match="Resend API down"):
                send_extraction_complete_email("ext-1")


class TestSendCamFlagsEmailTask:
    """Tests for the send_cam_flags_email Celery task."""

    def test_sends_email_when_camaudit_flags_present(self) -> None:
        """Task should send CAM flags email when flags exist and show_camaudit is True."""
        from app.tasks.email import send_cam_flags_email

        mock_db = _make_mock_db(
            extraction_data={
                "id": "ext-1",
                "user_id": "user-1",
                "document_filename": "lease.pdf",
                "show_camaudit": True,
                "red_flags": [
                    {"name": "Excessive admin fee"},
                    {"name": "Missing audit rights"},
                ],
            },
            user_data={"id": "user-1", "email": "user@example.com"},
        )

        mock_email_svc = MagicMock()
        mock_email_svc.send_cam_flags_found.return_value = {"id": "msg-2"}

        with (
            patch("app.tasks.email._get_db_client", return_value=mock_db),
            patch("app.tasks.email._build_email_service", return_value=mock_email_svc),
            patch("app.tasks.email.settings") as mock_settings,
        ):
            mock_settings.frontend_url = "https://lextract.io"
            result = send_cam_flags_email("ext-1")

            assert result["sent"] is True
            mock_email_svc.send_cam_flags_found.assert_called_once()
            call_kwargs = mock_email_svc.send_cam_flags_found.call_args[1]
            assert call_kwargs["flag_count"] == 2
            assert "Excessive admin fee" in call_kwargs["flag_names"]
            assert (
                call_kwargs["unsubscribe_url"]
                == "https://lextract.io/settings/notifications"
            )

    def test_skips_when_show_camaudit_false(self) -> None:
        """Task should skip when show_camaudit is False."""
        from app.tasks.email import send_cam_flags_email

        mock_db = _make_mock_db(
            extraction_data={
                "id": "ext-1",
                "user_id": "user-1",
                "document_filename": "lease.pdf",
                "show_camaudit": False,
                "red_flags": [{"name": "Flag A"}],
            },
            user_data={"id": "user-1", "email": "user@example.com"},
        )

        with patch("app.tasks.email._get_db_client", return_value=mock_db):
            result = send_cam_flags_email("ext-1")

            assert result["sent"] is False
            assert "camaudit" in result["reason"].lower()

    def test_skips_anonymous_extraction(self) -> None:
        """Task should skip when extraction has no user_id."""
        from app.tasks.email import send_cam_flags_email

        mock_db = _make_mock_db(
            extraction_data={
                "id": "ext-1",
                "user_id": None,
                "document_filename": "lease.pdf",
                "show_camaudit": True,
                "red_flags": [{"name": "Flag A"}],
            },
        )

        with patch("app.tasks.email._get_db_client", return_value=mock_db):
            result = send_cam_flags_email("ext-1")

            assert result["sent"] is False
            assert "anonymous" in result["reason"]

    def test_skips_when_no_red_flags(self) -> None:
        """Task should skip when there are no red flags."""
        from app.tasks.email import send_cam_flags_email

        mock_db = _make_mock_db(
            extraction_data={
                "id": "ext-1",
                "user_id": "user-1",
                "document_filename": "lease.pdf",
                "show_camaudit": True,
                "red_flags": [],
            },
            user_data={"id": "user-1", "email": "user@example.com"},
        )

        with patch("app.tasks.email._get_db_client", return_value=mock_db):
            result = send_cam_flags_email("ext-1")

            assert result["sent"] is False
            assert "no flags" in result["reason"].lower()

    def test_skips_when_red_flags_none(self) -> None:
        """Task should skip when red_flags is None."""
        from app.tasks.email import send_cam_flags_email

        mock_db = _make_mock_db(
            extraction_data={
                "id": "ext-1",
                "user_id": "user-1",
                "document_filename": "lease.pdf",
                "show_camaudit": True,
                "red_flags": None,
            },
            user_data={"id": "user-1", "email": "user@example.com"},
        )

        with patch("app.tasks.email._get_db_client", return_value=mock_db):
            result = send_cam_flags_email("ext-1")

            assert result["sent"] is False
            assert "no flags" in result["reason"].lower()

    def test_skips_user_without_email(self) -> None:
        """Task should skip CAM flags when user has no email address."""
        from app.tasks.email import send_cam_flags_email

        mock_db = _make_mock_db(
            extraction_data={
                "id": "ext-1",
                "user_id": "user-1",
                "document_filename": "lease.pdf",
                "show_camaudit": True,
                "red_flags": [{"name": "Flag A"}],
            },
            user_data={"id": "user-1", "email": None},
        )

        with patch("app.tasks.email._get_db_client", return_value=mock_db):
            result = send_cam_flags_email("ext-1")

            assert result["sent"] is False
            assert "no email" in result["reason"]

    def test_skips_when_extraction_not_found(self) -> None:
        """Task should return early when CAM flags extraction doesn't exist."""
        from app.tasks.email import send_cam_flags_email

        mock_db = _make_mock_db(extraction_data=None, user_data=None)

        with patch("app.tasks.email._get_db_client", return_value=mock_db):
            result = send_cam_flags_email("ext-nonexistent")

            assert result["sent"] is False
            assert "not found" in result["reason"]


class TestBuildEmailService:
    """Tests for the _build_email_service factory."""

    def test_creates_email_service_with_settings_key(self) -> None:
        """_build_email_service should return an EmailService using the settings API key."""
        from app.services.email import EmailService
        from app.tasks.email import _build_email_service

        with patch("app.tasks.email.settings") as mock_settings:
            mock_settings.resend_api_key = "re_test_abc"
            svc = _build_email_service()

        assert isinstance(svc, EmailService)
        assert svc._api_key == "re_test_abc"


class TestExtractionCompleteConfidenceEdge:
    """Edge-case coverage for send_extraction_complete_email."""

    def test_uses_na_when_overall_confidence_is_none(self) -> None:
        """Task should format confidence as 'N/A' when overall_confidence is None."""
        from app.tasks.email import send_extraction_complete_email

        mock_db = _make_mock_db(
            extraction_data={
                "id": "ext-1",
                "user_id": "user-1",
                "document_filename": "lease.pdf",
                "overall_confidence": None,
                "extracted_data": {"f1": {"value": "v1"}},
            },
            user_data={"id": "user-1", "email": "user@example.com"},
        )

        mock_email_svc = MagicMock()
        mock_email_svc.send_extraction_complete.return_value = {"id": "msg-1"}

        with (
            patch("app.tasks.email._get_db_client", return_value=mock_db),
            patch("app.tasks.email._build_email_service", return_value=mock_email_svc),
        ):
            result = send_extraction_complete_email("ext-1")

        assert result["sent"] is True
        call_kwargs = mock_email_svc.send_extraction_complete.call_args[1]
        assert call_kwargs["confidence_summary"] == "N/A"


# ---------------------------------------------------------------------------
# Pipeline integration tests
# ---------------------------------------------------------------------------


class TestPipelineEmailDispatch:
    """Tests for email dispatch in mark_extraction_complete."""

    def test_dispatches_emails_after_completion(self) -> None:
        """mark_extraction_complete should dispatch email tasks on success."""
        from app.tasks.pipeline import mark_extraction_complete

        mock_db = MagicMock()
        mock_response = MagicMock()
        mock_response.data = {"user_id": "user-1"}
        (
            mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value
        ) = mock_response

        with (
            patch("app.tasks.pipeline.update_extraction_status"),
            patch("app.tasks.pipeline._get_db_client", return_value=mock_db),
            patch(
                "app.tasks.email.send_extraction_complete_email"
            ) as mock_complete_email,
            patch("app.tasks.email.send_cam_flags_email") as mock_flags_email,
        ):
            mock_complete_email.delay = MagicMock()
            mock_flags_email.apply_async = MagicMock()

            result = mark_extraction_complete("ext-123")

            assert result["status"] == "complete"
            mock_complete_email.delay.assert_called_once_with("ext-123")
            mock_flags_email.apply_async.assert_called_once_with(
                args=["ext-123"], countdown=1800
            )

    def test_skips_email_for_anonymous_extraction(self) -> None:
        """mark_extraction_complete should skip email for anonymous users."""
        from app.tasks.pipeline import mark_extraction_complete

        mock_db = MagicMock()
        mock_response = MagicMock()
        mock_response.data = {"user_id": None}
        (
            mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value
        ) = mock_response

        with (
            patch("app.tasks.pipeline.update_extraction_status"),
            patch("app.tasks.pipeline._get_db_client", return_value=mock_db),
            patch(
                "app.tasks.email.send_extraction_complete_email"
            ) as mock_complete_email,
        ):
            mock_complete_email.delay = MagicMock()

            result = mark_extraction_complete("ext-123")

            assert result["status"] == "complete"
            mock_complete_email.delay.assert_not_called()

    def test_email_failure_does_not_fail_pipeline(self) -> None:
        """Email dispatch errors must not fail the pipeline."""
        from app.tasks.pipeline import mark_extraction_complete

        mock_db = MagicMock()
        mock_db.table.side_effect = RuntimeError("DB error in email dispatch")

        with (
            patch("app.tasks.pipeline.update_extraction_status"),
            patch("app.tasks.pipeline._get_db_client", return_value=mock_db),
        ):
            result = mark_extraction_complete("ext-123")

            assert result["status"] == "complete"

    def test_no_email_dispatch_when_no_data(self) -> None:
        """mark_extraction_complete should handle missing record data."""
        from app.tasks.pipeline import mark_extraction_complete

        mock_db = MagicMock()
        mock_response = MagicMock()
        mock_response.data = None
        (
            mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value
        ) = mock_response

        with (
            patch("app.tasks.pipeline.update_extraction_status"),
            patch("app.tasks.pipeline._get_db_client", return_value=mock_db),
            patch(
                "app.tasks.email.send_extraction_complete_email"
            ) as mock_complete_email,
        ):
            mock_complete_email.delay = MagicMock()

            result = mark_extraction_complete("ext-123")

            assert result["status"] == "complete"
            mock_complete_email.delay.assert_not_called()
