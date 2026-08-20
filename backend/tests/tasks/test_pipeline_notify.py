"""Unit tests for _send_anonymous_notify_email in app.tasks.pipeline."""

from __future__ import annotations

from unittest.mock import MagicMock, patch


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_EXTRACTION_ID = "aaaa0000-0000-0000-0000-000000000001"
_SESSION_UUID = "bbbb0000-0000-0000-0000-000000000002"
_SESSION_TOKEN = "tok-abc123"
_NOTIFY_EMAIL = "tenant@example.com"
_FILENAME = "office-lease.pdf"


def _make_db_with_session(token: str | None) -> MagicMock:
    """Return a DB mock whose anonymous_sessions table yields ``token``."""
    db = MagicMock()

    session_data = {"session_token": token} if token is not None else None

    maybe_single_result = MagicMock()
    maybe_single_result.execute.return_value = MagicMock(data=session_data)

    sessions_table = MagicMock()
    sessions_table.select.return_value = sessions_table
    sessions_table.eq.return_value = sessions_table
    sessions_table.maybe_single.return_value = maybe_single_result

    db.table.return_value = sessions_table
    return db


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


class TestSendAnonymousNotifyEmailHappyPath:
    def test_sends_email_with_session_token_in_url(self) -> None:
        """Resend is called with a URL containing the session_token param."""
        from app.tasks.pipeline import _send_anonymous_notify_email

        db = _make_db_with_session(_SESSION_TOKEN)

        with patch("app.tasks.pipeline.resend") as mock_resend:
            _send_anonymous_notify_email(
                db=db,
                extraction_id=_EXTRACTION_ID,
                notify_email=_NOTIFY_EMAIL,
                anonymous_session_id=_SESSION_UUID,
                document_filename=_FILENAME,
            )

        mock_resend.Emails.send.assert_called_once()
        call_payload = mock_resend.Emails.send.call_args[0][0]
        assert call_payload["to"] == [_NOTIFY_EMAIL]
        assert call_payload["from"] == "Angel Campa <angel.campa@lextract.io>"
        assert call_payload["subject"] == "Your Lextract preview is ready"
        assert (
            "Your lease extraction for <strong>office-lease.pdf</strong> is complete."
            in call_payload["html"]
        )
        assert (
            "Your lease extraction for office-lease.pdf is complete."
            in call_payload["text"]
        )
        assert f"session_token={_SESSION_TOKEN}" in call_payload["html"]
        assert f"session_token={_SESSION_TOKEN}" in call_payload["text"]
        assert _EXTRACTION_ID in call_payload["html"]

    def test_sends_email_without_session_token_when_no_session(self) -> None:
        """When anonymous_session_id is None, email is sent without a token param."""
        from app.tasks.pipeline import _send_anonymous_notify_email

        db = _make_db_with_session(None)

        with patch("app.tasks.pipeline.resend") as mock_resend:
            _send_anonymous_notify_email(
                db=db,
                extraction_id=_EXTRACTION_ID,
                notify_email=_NOTIFY_EMAIL,
                anonymous_session_id=None,
                document_filename=_FILENAME,
            )

        mock_resend.Emails.send.assert_called_once()
        call_payload = mock_resend.Emails.send.call_args[0][0]
        assert "session_token" not in call_payload["html"]
        assert f"/results/{_EXTRACTION_ID}" in call_payload["html"]

    def test_sends_email_without_token_when_session_row_not_found(self) -> None:
        """When session lookup returns no data, email is sent without session_token."""
        from app.tasks.pipeline import _send_anonymous_notify_email

        db = _make_db_with_session(None)  # session_data is None -> no token

        with patch("app.tasks.pipeline.resend") as mock_resend:
            _send_anonymous_notify_email(
                db=db,
                extraction_id=_EXTRACTION_ID,
                notify_email=_NOTIFY_EMAIL,
                anonymous_session_id=_SESSION_UUID,
                document_filename=_FILENAME,
            )

        mock_resend.Emails.send.assert_called_once()
        call_payload = mock_resend.Emails.send.call_args[0][0]
        assert "session_token" not in call_payload["html"]


# ---------------------------------------------------------------------------
# Resend raises exception — error must be swallowed
# ---------------------------------------------------------------------------


class TestSendAnonymousNotifyEmailErrorHandling:
    def test_swallows_resend_exception_and_returns_normally(self) -> None:
        """If Resend raises, the function must not propagate the exception."""
        from app.tasks.pipeline import _send_anonymous_notify_email

        db = _make_db_with_session(_SESSION_TOKEN)

        with patch("app.tasks.pipeline.resend") as mock_resend:
            mock_resend.Emails.send.side_effect = RuntimeError("Resend API unavailable")

            # Must not raise
            _send_anonymous_notify_email(
                db=db,
                extraction_id=_EXTRACTION_ID,
                notify_email=_NOTIFY_EMAIL,
                anonymous_session_id=_SESSION_UUID,
                document_filename=_FILENAME,
            )

    def test_swallows_db_exception_and_returns_normally(self) -> None:
        """If the DB session lookup raises, the function must not propagate."""
        from app.tasks.pipeline import _send_anonymous_notify_email

        db = MagicMock()
        db.table.side_effect = Exception("DB connection lost")

        with patch("app.tasks.pipeline.resend"):
            # Must not raise
            _send_anonymous_notify_email(
                db=db,
                extraction_id=_EXTRACTION_ID,
                notify_email=_NOTIFY_EMAIL,
                anonymous_session_id=_SESSION_UUID,
                document_filename=_FILENAME,
            )


# ---------------------------------------------------------------------------
# Guard: anonymous-only
# ---------------------------------------------------------------------------


class TestMarkExtractionCompleteAnonymousGuard:
    """mark_extraction_complete must only call _send_anonymous_notify_email
    when the extraction has no user_id (anonymous path)."""

    def _make_complete_db(
        self, *, user_id: str | None, notify_email: str | None
    ) -> MagicMock:
        db = MagicMock()
        extraction_data = {
            "user_id": user_id,
            "notify_email": notify_email,
            "anonymous_session_id": _SESSION_UUID,
            "document_filename": _FILENAME,
        }
        record_result = MagicMock()
        record_result.data = extraction_data

        extractions_table = MagicMock()
        extractions_table.select.return_value = extractions_table
        extractions_table.eq.return_value = extractions_table
        extractions_table.single.return_value = MagicMock(
            execute=MagicMock(return_value=record_result)
        )

        db.table.return_value = extractions_table
        return db

    def test_notify_email_not_sent_when_user_id_present(self) -> None:
        """For authenticated users, _send_anonymous_notify_email must not be called."""
        from app.tasks.pipeline import mark_extraction_complete

        db = self._make_complete_db(user_id="user-123", notify_email=_NOTIFY_EMAIL)

        with (
            patch("app.tasks.pipeline.update_extraction_status"),
            patch("app.tasks.pipeline._get_db_client", return_value=db),
            patch("app.tasks.pipeline._send_anonymous_notify_email") as mock_notify,
            patch("app.tasks.email.send_extraction_complete_email"),
            patch("app.tasks.email.send_cam_flags_email"),
        ):
            mark_extraction_complete("ext-abc")

        mock_notify.assert_not_called()

    def test_notify_email_sent_when_no_user_id(self) -> None:
        """For anonymous extractions with a notify_email, the helper must be called."""
        from app.tasks.pipeline import mark_extraction_complete

        db = self._make_complete_db(user_id=None, notify_email=_NOTIFY_EMAIL)

        with (
            patch("app.tasks.pipeline.update_extraction_status"),
            patch("app.tasks.pipeline._get_db_client", return_value=db),
            patch("app.tasks.pipeline._send_anonymous_notify_email") as mock_notify,
        ):
            mark_extraction_complete("ext-abc")

        mock_notify.assert_called_once()

    def test_email_dispatch_exception_is_non_fatal(self) -> None:
        """Completion should still succeed if notification dispatch lookup fails."""
        from app.tasks.pipeline import mark_extraction_complete

        with (
            patch("app.tasks.pipeline.update_extraction_status"),
            patch(
                "app.tasks.pipeline._get_db_client", side_effect=RuntimeError("db down")
            ),
        ):
            result = mark_extraction_complete("ext-abc")

        assert result == {"extraction_id": "ext-abc", "status": "complete"}

    def test_status_update_failure_marks_pipeline_failed_and_reraises(self) -> None:
        """Finalization failures must trigger the shared pipeline failure path."""
        import pytest

        from app.tasks.pipeline import mark_extraction_complete

        with (
            patch(
                "app.tasks.pipeline.update_extraction_status",
                side_effect=RuntimeError("status update failed"),
            ),
            patch("app.tasks.pipeline.on_pipeline_failure") as mock_failure,
        ):
            with pytest.raises(RuntimeError, match="status update failed"):
                mark_extraction_complete("ext-abc")

        mock_failure.assert_called_once()


def test_run_extraction_pipeline_dispatches_expected_task_chain() -> None:
    """Pipeline dispatch should enqueue the extraction, scoring, flags, and complete chain."""
    from app.tasks.pipeline import run_extraction_pipeline

    chain_result = MagicMock()

    with patch("app.tasks.pipeline.chain", return_value=chain_result) as mock_chain:
        run_extraction_pipeline("ext-abc")

    mock_chain.assert_called_once()
    task_signatures = mock_chain.call_args.args
    assert len(task_signatures) == 4
    chain_result.apply_async.assert_called_once()
