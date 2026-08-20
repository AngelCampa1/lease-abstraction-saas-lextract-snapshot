"""Integration tests for auth session lifecycle.

BUG #5: Anonymous session linking has no CAS protection. Two concurrent
link_session calls can both read linked_user_id=null, pass the check,
and both update -- assigning the session to two different users.
"""

from unittest.mock import MagicMock, patch

from tests.integration.conftest import (
    USER_A_ID,
    USER_B_ID,
    AuthContext,
    auth_headers_for,
    build_anonymous_session,
    build_user,
)


class TestAnonymousSessionCreation:
    def test_create_anonymous_session_returns_token(self, app_client):
        """POST /auth/anonymous creates a 72-hour session (201 Created)."""
        mock_db = MagicMock()
        chain = MagicMock()
        chain.execute.return_value = MagicMock(data=[{}])
        mock_db.table.return_value.insert.return_value = chain

        with patch(
            "app.api.v1.auth.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            resp = app_client.post("/api/v1/auth/anonymous")

        assert resp.status_code == 201
        data = resp.json()
        assert "session_token" in data
        assert "expires_at" in data


class TestExpiredSession:
    def test_expired_session_returns_401_not_expired(self, app_client):
        """An expired anonymous session gets generic 401, not 'session expired'."""
        headers = {"X-Session-Token": "expired-token-xyz"}

        mock_db = MagicMock()
        select_chain = MagicMock()
        select_chain.eq.return_value = select_chain
        select_chain.is_.return_value = select_chain
        select_chain.gt.return_value = select_chain
        select_chain.limit.return_value = select_chain
        select_chain.execute.return_value = MagicMock(data=[])
        mock_db.table.return_value.select.return_value = select_chain

        with patch(
            "app.core.dependencies.NeonClientManager.get_service_client",
            return_value=mock_db,
        ):
            resp = app_client.get(
                "/api/v1/extractions",
                headers=headers,
            )

        assert resp.status_code == 401


class TestLinkSession:
    def _make_link_db(self, session, transfer_count=2):
        """Build mock DB that handles session lookup, update, and extraction transfer."""
        mock_db = MagicMock()
        table_calls: dict[str, int] = {}

        def route_table(name):
            table_calls[name] = table_calls.get(name, 0) + 1
            t = MagicMock()

            if name == "anonymous_sessions":
                if table_calls[name] == 1:
                    # First call: SELECT
                    select_chain = MagicMock()
                    select_chain.eq.return_value = select_chain
                    select_chain.is_.return_value = select_chain
                    select_chain.limit.return_value = select_chain
                    select_chain.execute.return_value = MagicMock(data=[session])
                    t.select.return_value = select_chain
                else:
                    # Second call: UPDATE
                    update_chain = MagicMock()
                    update_chain.eq.return_value = update_chain
                    update_chain.execute.return_value = MagicMock(data=[{}])
                    t.update.return_value = update_chain

            elif name == "extractions":
                transferred = [{"id": f"ext-{i}"} for i in range(transfer_count)]
                update_chain = MagicMock()
                update_chain.eq.return_value = update_chain
                update_chain.is_.return_value = update_chain
                update_chain.execute.return_value = MagicMock(data=transferred)
                t.update.return_value = update_chain

            return t

        mock_db.table = route_table
        return mock_db

    def test_link_transfers_extractions(self, app_client, rsa_keys):
        """Linking a session transfers all extractions to the authenticated user."""
        user = build_user()
        headers = auth_headers_for(rsa_keys)
        session = build_anonymous_session()
        mock_db = self._make_link_db(session, transfer_count=2)

        with AuthContext(rsa_keys, user):
            with patch(
                "app.api.v1.auth.NeonClientManager.get_service_client",
                return_value=mock_db,
            ):
                resp = app_client.post(
                    "/api/v1/auth/link",
                    json={"session_token": "anon-token-abc"},
                    headers=headers,
                )

        assert resp.status_code == 200
        data = resp.json()
        assert data["linked"] is True
        assert data["extractions_transferred"] == 2

    def test_link_already_linked_session_returns_404(self, app_client, rsa_keys):
        """A session that's already linked returns 404."""
        user = build_user()
        headers = auth_headers_for(rsa_keys)

        mock_db = MagicMock()
        select_chain = MagicMock()
        select_chain.eq.return_value = select_chain
        select_chain.is_.return_value = select_chain
        select_chain.limit.return_value = select_chain
        select_chain.execute.return_value = MagicMock(data=[])
        mock_db.table.return_value.select.return_value = select_chain

        with AuthContext(rsa_keys, user):
            with patch(
                "app.api.v1.auth.NeonClientManager.get_service_client",
                return_value=mock_db,
            ):
                resp = app_client.post(
                    "/api/v1/auth/link",
                    json={"session_token": "already-linked-token"},
                    headers=headers,
                )

        assert resp.status_code == 404


class TestConcurrentSessionLinking:
    """BUG #5: No CAS on session linking -- race condition."""

    def test_two_concurrent_links_second_fails(self, app_client, rsa_keys):
        """Two users try to link the same anonymous session simultaneously.
        CAS guard ensures the second link fails with 409.
        """
        user_a = build_user(user_id=USER_A_ID, email="alice@example.com")
        user_b = build_user(user_id=USER_B_ID, email="bob@example.com")
        session = build_anonymous_session()

        def make_link_mock(cas_succeeds=True):
            """Build a mock where the CAS update succeeds or fails."""
            mock = MagicMock()
            table_calls: dict[str, int] = {}

            def route_table(name):
                table_calls[name] = table_calls.get(name, 0) + 1
                t = MagicMock()

                if name == "anonymous_sessions":
                    if table_calls[name] == 1:
                        select_chain = MagicMock()
                        select_chain.eq.return_value = select_chain
                        select_chain.is_.return_value = select_chain
                        select_chain.limit.return_value = select_chain
                        select_chain.execute.return_value = MagicMock(data=[session])
                        t.select.return_value = select_chain
                    else:

                        def capture_update(data):
                            chain = MagicMock()
                            chain.eq.return_value = chain
                            chain.is_.return_value = chain
                            if cas_succeeds:
                                chain.execute.return_value = MagicMock(data=[{}])
                            else:
                                # CAS fails: linked_user_id is no longer null
                                chain.execute.return_value = MagicMock(data=[])
                            return chain

                        t.update = capture_update

                elif name == "extractions":
                    update_chain = MagicMock()
                    update_chain.eq.return_value = update_chain
                    update_chain.is_.return_value = update_chain
                    update_chain.execute.return_value = MagicMock(data=[])
                    t.update.return_value = update_chain

                return t

            mock.table = route_table
            return mock

        # User A links — succeeds
        headers_a = auth_headers_for(rsa_keys, USER_A_ID)
        with AuthContext(rsa_keys, user_a):
            with patch(
                "app.api.v1.auth.NeonClientManager.get_service_client",
                return_value=make_link_mock(cas_succeeds=True),
            ):
                resp_a = app_client.post(
                    "/api/v1/auth/link",
                    json={"session_token": "anon-token-abc"},
                    headers=headers_a,
                )

        # User B links the SAME session — CAS fails
        headers_b = auth_headers_for(rsa_keys, USER_B_ID)
        with AuthContext(rsa_keys, user_b):
            with patch(
                "app.api.v1.auth.NeonClientManager.get_service_client",
                return_value=make_link_mock(cas_succeeds=False),
            ):
                resp_b = app_client.post(
                    "/api/v1/auth/link",
                    json={"session_token": "anon-token-abc"},
                    headers=headers_b,
                )

        assert resp_a.status_code == 200
        assert (
            resp_b.status_code == 409
        ), "Second link should fail with 409 due to CAS guard"
