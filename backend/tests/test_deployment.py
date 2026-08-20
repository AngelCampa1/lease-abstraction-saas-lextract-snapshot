"""Tests for deployment configuration files.

Validates Dockerfile, docker-compose, Cloudflare Workers config,
OpenNext config, and .env.example are correct and complete.
"""

from __future__ import annotations

from pathlib import Path

import yaml

# Repo root is two levels up from backend/tests/
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
FRONTEND_DIR = REPO_ROOT / "frontend"
API_WORKER_DIR = REPO_ROOT / "workers" / "api"


class TestEnvExample:
    """Validate .env.example contains all required environment variables."""

    def _parse_env_example(self) -> dict[str, str]:
        """Parse .env.example into a dict of var_name -> placeholder value."""
        env_path = REPO_ROOT / ".env.example"
        assert env_path.exists(), ".env.example must exist at repo root"
        result: dict[str, str] = {}
        for line in env_path.read_text().splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            if "=" in stripped:
                key, _, value = stripped.partition("=")
                result[key.strip()] = value.strip()
        return result

    def test_env_example_exists(self) -> None:
        env_path = REPO_ROOT / ".env.example"
        assert env_path.exists(), ".env.example must exist at repo root"

    def test_env_example_contains_all_required_vars(self) -> None:
        env_vars = self._parse_env_example()
        required_backend_vars = [
            "HYPERDRIVE",
            "NEON_AUTH_BASE_URL",
            "DOCUMENTS_BUCKET",
            "OPENROUTER_API_KEY",
            "STRIPE_SECRET_KEY",
            "STRIPE_WEBHOOK_SECRET",
            "RESEND_API_KEY",
        ]
        required_frontend_vars = [
            "NEXT_PUBLIC_API_URL",
        ]
        all_required = required_backend_vars + required_frontend_vars
        for var in all_required:
            assert var in env_vars, f"Required variable {var} missing from .env.example"

    def test_env_example_has_neon_vars(self) -> None:
        env_vars = self._parse_env_example()
        assert env_vars["HYPERDRIVE"] == "lextract-neon"
        assert "NEON_AUTH_BASE_URL" in env_vars

    def test_env_example_has_r2_vars(self) -> None:
        env_vars = self._parse_env_example()
        assert env_vars["DOCUMENTS_BUCKET"] == "lextract-documents"

    def test_env_example_has_frontend_public_vars(self) -> None:
        env_vars = self._parse_env_example()
        public_vars = [k for k in env_vars if k.startswith("NEXT_PUBLIC_")]
        assert (
            len(public_vars) >= 1
        ), "Expected at least 1 NEXT_PUBLIC_ variable in .env.example"


class TestDockerfile:
    """Validate backend Dockerfile structure."""

    def _read_dockerfile(self) -> str:
        dockerfile = BACKEND_DIR / "Dockerfile"
        assert dockerfile.exists(), "backend/Dockerfile must exist"
        return dockerfile.read_text()

    def test_dockerfile_exists(self) -> None:
        assert (BACKEND_DIR / "Dockerfile").exists()

    def test_dockerfile_has_required_stages(self) -> None:
        content = self._read_dockerfile()
        assert "AS builder" in content, "Dockerfile must have a 'builder' stage"
        assert "AS runner" in content, "Dockerfile must have a 'runner' stage"

    def test_dockerfile_uses_python_312_slim(self) -> None:
        content = self._read_dockerfile()
        assert (
            "python:3.12-slim" in content
        ), "Dockerfile must use python:3.12-slim base image"

    def test_dockerfile_installs_weasyprint_deps(self) -> None:
        content = self._read_dockerfile()
        weasyprint_deps = ["libpango", "libcairo"]
        for dep in weasyprint_deps:
            assert (
                dep in content
            ), f"Dockerfile must install WeasyPrint dependency: {dep}"

    def test_dockerfile_installs_extract_sdk(self) -> None:
        content = self._read_dockerfile()
        assert (
            "extract-sdk" in content
        ), "Dockerfile must install extract-sdk from local packages/"

    def test_dockerfile_uses_nonroot_user(self) -> None:
        content = self._read_dockerfile()
        assert (
            "useradd" in content or "adduser" in content
        ), "Dockerfile must create a non-root user"
        assert "USER" in content, "Dockerfile must switch to non-root USER"

    def test_dockerfile_exposes_port(self) -> None:
        content = self._read_dockerfile()
        assert "EXPOSE 8000" in content, "Dockerfile must expose port 8000"

    def test_dockerfile_has_cmd(self) -> None:
        content = self._read_dockerfile()
        assert "uvicorn" in content, "Dockerfile CMD must run uvicorn"


class TestDockerignore:
    """Validate backend .dockerignore exists and excludes sensitive files."""

    def test_dockerignore_exists(self) -> None:
        assert (BACKEND_DIR / ".dockerignore").exists()

    def test_dockerignore_excludes_env(self) -> None:
        content = (BACKEND_DIR / ".dockerignore").read_text()
        assert ".env" in content, ".dockerignore must exclude .env files"

    def test_dockerignore_excludes_pycache(self) -> None:
        content = (BACKEND_DIR / ".dockerignore").read_text()
        assert "__pycache__" in content, ".dockerignore must exclude __pycache__"

    def test_dockerignore_excludes_git(self) -> None:
        content = (BACKEND_DIR / ".dockerignore").read_text()
        assert ".git" in content, ".dockerignore must exclude .git"


class TestDockerCompose:
    """Validate docker-compose.yml services and configuration."""

    def _load_compose(self) -> dict:
        compose_path = BACKEND_DIR / "docker-compose.yml"
        assert compose_path.exists(), "backend/docker-compose.yml must exist"
        with open(compose_path) as f:
            return yaml.safe_load(f)

    def test_docker_compose_exists(self) -> None:
        assert (BACKEND_DIR / "docker-compose.yml").exists()

    def test_docker_compose_has_no_beat_service(self) -> None:
        compose = self._load_compose()
        services = compose.get("services", {})
        expected = {"redis", "web", "worker"}
        assert (
            set(services.keys()) == expected
        ), f"Expected services {expected}, got {set(services.keys())}"

    def test_docker_compose_redis_service(self) -> None:
        compose = self._load_compose()
        redis = compose["services"]["redis"]
        assert "redis" in redis.get("image", ""), "Redis service must use redis image"

    def test_docker_compose_web_service(self) -> None:
        compose = self._load_compose()
        web = compose["services"]["web"]
        assert "build" in web, "Web service must have build config"
        assert "ports" in web, "Web service must expose ports"

    def test_docker_compose_worker_service(self) -> None:
        compose = self._load_compose()
        worker = compose["services"]["worker"]
        assert "command" in worker, "Worker service must have a command"

    def test_docker_compose_celery_module_path(self) -> None:
        compose = self._load_compose()
        worker_cmd = compose["services"]["worker"]["command"]
        cmd_str = worker_cmd if isinstance(worker_cmd, str) else " ".join(worker_cmd)
        assert (
            "app.core.celery_app" in cmd_str
        ), "Worker command must reference app.core.celery_app"

    def test_docker_compose_has_no_app_healthchecks(self) -> None:
        compose = self._load_compose()
        for service_name in ("web", "worker"):
            assert "healthcheck" not in compose["services"][service_name]

    def test_docker_compose_build_context_is_repo_root(self) -> None:
        compose = self._load_compose()
        web = compose["services"]["web"]
        build = web["build"]
        if isinstance(build, dict):
            context = build.get("context", "")
            assert (
                context == ".."
            ), f"Build context must be '..' (repo root), got '{context}'"
        else:
            raise AssertionError("Web service build must be a dict with context")

    def test_docker_compose_web_depends_on_redis(self) -> None:
        compose = self._load_compose()
        web = compose["services"]["web"]
        depends = web.get("depends_on", [])
        if isinstance(depends, dict):
            assert "redis" in depends
        else:
            assert "redis" in depends, "Web service must depend on redis"


class TestApiWorkerConfig:
    """Validate Cloudflare API Worker production configuration."""

    def _read_config(self) -> str:
        path = API_WORKER_DIR / "wrangler.jsonc"
        assert path.exists(), "workers/api/wrangler.jsonc must exist"
        return path.read_text()

    def test_repo_root_has_no_shared_railway_toml(self) -> None:
        assert not (REPO_ROOT / "railway.toml").exists(), (
            "Shared repo-root railway.toml should be removed to avoid applying "
            "web health checks to services that should stay idle"
        )

    def test_railway_service_configs_removed(self) -> None:
        for name in ("web", "worker", "beat"):
            assert not (BACKEND_DIR / f"railway.{name}.json").exists()

    def test_worker_config_uses_cloudflare_bindings(self) -> None:
        content = self._read_config()
        for required in (
            '"HYPERDRIVE"',
            '"DOCUMENTS_BUCKET"',
            '"EXTRACTION_WORKFLOW"',
            '"EXPORT_WORKFLOW"',
            '"EMAIL_QUEUE"',
            '"CLEANUP_QUEUE"',
        ):
            assert required in content

    def test_worker_config_has_api_domain_origin(self) -> None:
        content = self._read_config()
        assert '"PUBLIC_API_ORIGIN": "https://api.lextract.io"' in content
        assert '"https://lextract.io,https://www.lextract.io"' in content

    def test_backend_env_example_documents_actual_dev_cors_defaults(self) -> None:
        content = (BACKEND_DIR / ".env.example").read_text()

        assert "http://localhost:3000" in content
        assert "http://localhost:8000" in content
        assert "http://localhost:3001" not in content


class TestCloudflareConfig:
    """Validate frontend Cloudflare Workers configuration."""

    def _wrangler_path(self) -> Path:
        toml_path = FRONTEND_DIR / "wrangler.toml"
        if toml_path.exists():
            return toml_path
        jsonc_path = FRONTEND_DIR / "wrangler.jsonc"
        assert (
            jsonc_path.exists()
        ), "frontend must define either wrangler.toml or wrangler.jsonc"
        return jsonc_path

    def _read_wrangler(self) -> str:
        return self._wrangler_path().read_text()

    def test_wrangler_toml_exists(self) -> None:
        assert self._wrangler_path().exists()

    def test_wrangler_toml_has_worker_name(self) -> None:
        content = self._read_wrangler()
        assert 'name = "lextract"' in content or '"name": "lextract"' in content

    def test_wrangler_toml_has_nodejs_compat(self) -> None:
        content = self._read_wrangler()
        assert "nodejs_compat" in content

    def test_wrangler_toml_has_assets_config(self) -> None:
        content = self._read_wrangler()
        assert "[assets]" in content or '"assets"' in content
        assert ".open-next/assets" in content

    def test_open_next_config_exists(self) -> None:
        assert (FRONTEND_DIR / "open-next.config.ts").exists()

    def test_open_next_config_uses_cloudflare(self) -> None:
        content = (FRONTEND_DIR / "open-next.config.ts").read_text()
        assert "@opennextjs/cloudflare" in content
        assert "defineCloudflareConfig" in content or "defineConfig" in content
