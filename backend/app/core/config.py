"""Application configuration via Pydantic Settings.

Loads from environment variables with validation.
"""

import json
from functools import lru_cache
from typing import Self

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Placeholder values that are safe in dev but must never reach production.
_INSECURE_DEFAULTS = frozenset(
    [
        "test-service-key",
        "test-openrouter-key",
        "sk_test_placeholder",
        "whsec_placeholder",
        "test-resend-key",
    ]
)

# Known valid environment identifiers
_VALID_ENVIRONMENTS = frozenset(["development", "test", "staging", "production"])


class Settings(BaseSettings):
    """Application settings loaded from environment variables.

    All settings can be overridden via environment variables.
    The .env file is loaded automatically if present.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App metadata
    app_name: str = "Lextract API"
    debug: bool = False
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"

    # CORS — production whitelist; dev origins appended by model_validator
    cors_origins: list[str] = [
        "https://lextract.io",
        "https://www.lextract.io",
    ]

    # Neon Data API (PostgREST)
    neon_data_api_url: str = "http://localhost:3001"
    neon_service_role_key: str = "test-service-key"
    neon_database_url: str = "postgresql://localhost:5432/lextract"

    # Neon Auth (managed Better Auth)
    neon_auth_base_url: str = "http://localhost:4000"
    # Explicit JWKS URL — overrides the URL constructed from neon_auth_base_url.
    # Set this to the full JWKS URL in production to avoid URL construction issues.
    neon_jwks_url: str | None = None

    # Cloudflare R2 object storage (zero egress)
    r2_endpoint_url: str = ""  # e.g. https://<account_id>.r2.cloudflarestorage.com
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = "lextract-documents"

    # Cloudflare R2 — lead-magnets bucket (separate API token, read-only)
    r2_lead_magnets_access_key_id: str = ""
    r2_lead_magnets_secret_access_key: str = ""
    r2_lead_magnets_endpoint_url: str = ""

    # OpenRouter (multi-pass pipeline)
    openrouter_api_key: str = "test-openrouter-key"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    # Multi-pass extraction pipeline (always enabled; legacy single-pass removed)
    multi_pass_enabled: bool = True
    validation_min_confidence: float = 0.70
    escalation_confidence_threshold: float = 0.80

    # Pass 1: Full extraction — strongest PDF model first.
    # Gemini 3 Flash: $0.50/$3.00 per M, 1M ctx, native PDF (file modality).
    pass1_model: str = "google/gemini-3-flash-preview"
    # Gemini 3.1 Flash Lite: $0.25/$1.50 per M, 1M ctx, native PDF.
    pass1_fallback_model: str = "google/gemini-3.1-flash-lite-preview"
    # GPT-5.4 Mini: $0.75/$4.50 per M, 400K ctx, native PDF, vendor diversity.
    pass1_fallback_model_2: str = "openai/gpt-5.4-mini"

    # Pass 2: Adversarial validation — cheap primary since it always runs.
    # Gemini 3.1 Flash Lite: cheapest PDF-capable model.
    pass2_model: str = "google/gemini-3.1-flash-lite-preview"
    # GPT-5.4 Mini: different vendor for genuine adversarial review.
    pass2_fallback_model: str = "openai/gpt-5.4-mini"
    # Gemini 3 Flash: last-resort fallback.
    pass2_fallback_model_2: str = "google/gemini-3-flash-preview"

    # Pass 3: Escalation — strongest model for tough disputes.
    pass3_model: str = "google/gemini-3-flash-preview"
    pass3_fallback_model: str = "google/gemini-3.1-flash-lite-preview"
    pass3_fallback_model_2: str = "openai/gpt-5.4-mini"

    # Dual-extract + judge architecture (Phase 4 port from CamAudit-v2).
    # Gated by extraction_dual_enabled (default False) — legacy 3-pass path
    # is the production default; flip to True for shadow validation.
    extraction_dual_enabled: bool = False

    # Sibling extraction (PDF input, runs in parallel with Pass 1 on dual path).
    # Different vendor from Pass 1 primary so the judge gets two genuinely
    # independent reads (Google + OpenAI).
    extraction_sibling_model: str = "openai/gpt-5.4-mini"
    extraction_sibling_fallback_model: str = "google/gemini-3.1-flash-lite-preview"
    extraction_sibling_fallback_model_2: str = "google/gemini-3-flash-preview"

    # Judge — text-only (sees JSON A + JSON B + schema, not the PDF).
    # GLM 5.1: highest reasoning index in chain (50.4), Zhipu vendor.
    extraction_judge_model: str = "z-ai/glm-5.1"
    # MiniMax M2.7: cheap text reasoning, MiniMax vendor.
    extraction_judge_fallback_model: str = "minimax/minimax-m2.7"
    # Kimi K2.6: text+image (judge only sees text), Moonshot vendor.
    extraction_judge_fallback_model_2: str = "moonshotai/kimi-k2.6"

    # Per-extraction LLM spend ceiling. When the running total reaches this
    # value the orchestrator skips Pass-2 / Pass-3 / judge calls and emits a
    # cost_ceiling event.  $0.50 default tracks Lextract's low per-lease price.
    max_extraction_llm_cost_usd: float = 0.50

    # Forensic dump: when True, raw model response JSON for every pass is
    # uploaded to R2 under extractions/{id}/raw/{pass}-{model}.json so that
    # extraction failures can be replayed without hitting the model again.
    raw_extraction_dump_enabled: bool = True

    # Redis / Celery
    redis_url: str = "redis://localhost:6379/0"

    # Stripe
    stripe_secret_key: str = "sk_test_placeholder"
    stripe_webhook_secret: str = "whsec_placeholder"

    # Resend
    resend_api_key: str = "test-resend-key"
    resend_from_address: str = "Angel Campa <angel.campa@lextract.io>"

    # Cloudflare Worker + D1 marketing data service
    marketing_worker_url: str = ""
    marketing_worker_secret: str = ""

    # Rate limiting
    rate_limit_auth: int = 100
    rate_limit_anon: int = 20

    # Logging
    log_level: str = "INFO"
    log_format: str = "text"

    # Frontend URL (used in emails) — different port from neon_data_api_url
    frontend_url: str = "http://localhost:3000"

    # Sentry — leave empty to disable
    sentry_dsn: str = ""

    # CamAudit
    camaudit_shared_key: str = ""
    camaudit_base_url: str = "https://www.camaudit.io"

    # Ventora AI-SDR signed product context

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: object) -> list[str]:
        """Accept JSON-array or comma-separated string for CORS_ORIGINS env var.

        Railway env vars are plain strings. Pydantic-settings passes the raw
        string value here before list coercion. We handle both formats so that
        CORS_ORIGINS=https://lextract.io,https://www.lextract.io works the same
        as CORS_ORIGINS=["https://lextract.io","https://www.lextract.io"].
        """
        if isinstance(v, list):
            return [str(o).strip() for o in v if str(o).strip()]
        if isinstance(v, str):
            stripped = v.strip()
            if not stripped:
                # Empty string — fall through to default (returned as-is; model
                # default list is used when the field value is empty list)
                return []
            # Try JSON array first
            if stripped.startswith("["):
                try:
                    parsed = json.loads(stripped)
                    if isinstance(parsed, list):
                        return [str(o).strip() for o in parsed if str(o).strip()]
                except json.JSONDecodeError:
                    pass
            # Comma-separated plain string
            return [o.strip() for o in stripped.split(",") if o.strip()]
        return []

    @field_validator("environment")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        """Reject unknown environment names to catch typos early."""
        if v not in _VALID_ENVIRONMENTS:
            raise ValueError(
                f"Unknown environment '{v}'. "
                f"Must be one of: {', '.join(sorted(_VALID_ENVIRONMENTS))}"
            )
        return v

    @model_validator(mode="after")
    def ensure_cors_origins_not_empty(self) -> Self:
        """Fall back to production defaults when CORS_ORIGINS env var is empty.

        An empty CORS_ORIGINS would silently block all cross-origin requests.
        If the value comes out empty after parsing (e.g. env var set to ""),
        restore the safe production defaults so the app keeps working.
        """
        production_defaults = [
            "https://lextract.io",
            "https://www.lextract.io",
        ]
        if not self.cors_origins:
            self.cors_origins = list(production_defaults)
        return self

    @model_validator(mode="after")
    def add_localhost_origins_in_dev(self) -> Self:
        """Append localhost origins in development mode."""
        if self.environment == "development":
            dev_origins = [
                "http://localhost:3000",
                "http://localhost:8000",
            ]
            for origin in dev_origins:
                if origin not in self.cors_origins:
                    self.cors_origins.append(origin)
        return self

    @model_validator(mode="after")
    def reject_insecure_defaults_in_production(self) -> Self:
        """Raise if any secret placeholder value reaches production.

        Insecure defaults are intentionally allowed in development and test
        so the app can start without a full .env file.  In production,
        every secret must be explicitly set to a real value.
        """
        if self.environment != "production":
            return self

        offenders: list[str] = []
        fields_to_check = {
            "openrouter_api_key": self.openrouter_api_key,
            "stripe_secret_key": self.stripe_secret_key,
            "stripe_webhook_secret": self.stripe_webhook_secret,
            "resend_api_key": self.resend_api_key,
            "camaudit_shared_key": self.camaudit_shared_key,
        }
        for field_name, value in fields_to_check.items():
            if value in _INSECURE_DEFAULTS:
                offenders.append(field_name)

        if offenders:
            raise ValueError(
                f"Production is using insecure placeholder values for: "
                f"{', '.join(offenders)}. Set real values via environment variables."
            )
        return self


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()


# Module-level instance imported by other modules.
# lru_cache defers instantiation until first import; settings is not
# evaluated at module parse time so tests can monkeypatch env vars first.
settings = get_settings()
