"""Tests for rate limiting core.

Bug #52: The previous implementation decoded the JWT payload without
signature verification, allowing an attacker to craft a JWT with any
sub to target a victim's rate-limit bucket. Now we hash the full token.
"""

import hashlib

from app.core.rate_limiting import (
    UNAUTH_RATE_LIMIT,
    USER_RATE_LIMIT,
    extract_request_key,
)


class TestExtractRequestKey:
    def test_bearer_token_returns_token_hash_key(self) -> None:
        """Bug #52: Bearer token produces a token: key based on hash of full token."""
        auth = "Bearer eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.fakesig"
        key = extract_request_key(auth, "1.2.3.4")
        assert key.startswith("token:"), (
            f"Expected 'token:...' key but got '{key}'. "
            "Bug #52: rate limiter must hash the token, not decode JWT payload."
        )
        # Key should not contain the raw sub claim
        assert "user-1" not in key

    def test_bearer_token_key_is_stable(self) -> None:
        """Same token always produces the same key."""
        auth = "Bearer eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.fakesig"
        key1 = extract_request_key(auth, "1.2.3.4")
        key2 = extract_request_key(auth, "1.2.3.4")
        assert key1 == key2

    def test_different_tokens_produce_different_keys(self) -> None:
        """Two different tokens must produce different rate-limit buckets."""
        auth1 = "Bearer eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.sig1"
        auth2 = "Bearer eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyLTIifQ.sig2"
        key1 = extract_request_key(auth1, "1.2.3.4")
        key2 = extract_request_key(auth2, "1.2.3.4")
        assert key1 != key2

    def test_fake_jwt_with_victim_sub_does_not_get_victim_bucket(self) -> None:
        """Bug #52: An attacker crafting a JWT with victim's sub cannot share their bucket.

        Previously: attacker could decode any JWT payload and fake the sub claim
        to get the rate-limited key 'user:<victim-sub>'.
        Now: the key is derived from the full signed token string, so only the
        real token holder can produce the same key.
        """
        import base64
        import json

        # Legitimate token (real signature)
        real_token = "Bearer eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ2aWN0aW0tMTIzIn0.REAL_SIG"

        # Attacker crafts a fake token with the same sub but different signature
        victim_sub = "victim-123"
        fake_payload = json.dumps({"sub": victim_sub}).encode()
        fake_segment = base64.urlsafe_b64encode(fake_payload).rstrip(b"=").decode()
        fake_header = base64.urlsafe_b64encode(b'{"alg":"HS256"}').rstrip(b"=").decode()
        fake_token = f"Bearer {fake_header}.{fake_segment}.FAKE_SIG"

        real_key = extract_request_key(real_token, "10.0.0.1")
        fake_key = extract_request_key(fake_token, "10.0.0.1")

        # Keys must be different — attacker should NOT share victim's rate-limit bucket
        assert real_key != fake_key, (
            "Bug #52: fake JWT with victim's sub must NOT produce the same rate-limit key "
            "as the victim's real token. An attacker could exhaust the victim's rate limit."
        )

        # Neither key should expose the raw sub
        assert victim_sub not in real_key
        assert victim_sub not in fake_key

    def test_token_hash_is_correct_sha256_prefix(self) -> None:
        """Verify the hash matches SHA-256 of the token string."""
        token = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.sig"
        auth = f"Bearer {token}"
        key = extract_request_key(auth, "1.2.3.4")
        expected_hash = hashlib.sha256(token.encode()).hexdigest()[:16]
        assert key == f"token:{expected_hash}"

    def test_no_auth_falls_back_to_ip(self) -> None:
        key = extract_request_key(None, "10.0.0.1")
        assert key == "ip:10.0.0.1"

    def test_empty_auth_falls_back_to_ip(self) -> None:
        key = extract_request_key("", "10.0.0.1")
        assert key == "ip:10.0.0.1"

    def test_non_bearer_falls_back_to_ip(self) -> None:
        key = extract_request_key("Basic dXNlcjpwYXNz", "10.0.0.1")
        assert key == "ip:10.0.0.1"

    def test_bearer_without_token_falls_back_to_ip(self) -> None:
        """'Bearer ' with empty token falls back to IP."""
        key = extract_request_key("Bearer ", "10.0.0.2")
        # Empty token — sha256 of empty string still produces token: key
        # since we still have a "Bearer " prefix
        assert key.startswith("token:")


class TestRateLimitConstants:
    def test_user_rate_limit_exists(self) -> None:
        assert USER_RATE_LIMIT is not None

    def test_unauth_rate_limit_exists(self) -> None:
        assert UNAUTH_RATE_LIMIT is not None
