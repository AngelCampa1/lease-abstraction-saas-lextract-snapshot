# Stage 1: Builder — install dependencies in a venv
FROM python:3.12-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpango1.0-dev libcairo2-dev libgdk-pixbuf-2.0-dev libffi-dev \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install extract-sdk first (local package, not on PyPI)
COPY packages/extract-sdk/ /tmp/extract-sdk/
RUN pip install --no-cache-dir /tmp/extract-sdk/

# Install backend dependencies
COPY backend/pyproject.toml /app/pyproject.toml
WORKDIR /app
RUN pip install --no-cache-dir -e .

# Copy application code
COPY backend/app /app/app

# Copy field schema (extract-sdk searches upward for docs/lextract_field_schema.json).
# The wildcard avoids a build failure if the file is missing from the build context;
# when present it is copied, when absent the COPY is a no-op.
COPY docs/lextract_field_schema.jso[n] /app/docs/

# Stage 2: Runner — minimal runtime image
FROM python:3.12-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 libpangocairo-1.0-0 libcairo2 libgdk-pixbuf-2.0-0 \
    libffi8 fonts-liberation shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN useradd --create-home appuser
USER appuser
WORKDIR /app
COPY --from=builder /app /app

EXPOSE 8000
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
