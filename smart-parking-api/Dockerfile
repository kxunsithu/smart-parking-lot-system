FROM python:3.12-slim AS builder

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.12-slim

WORKDIR /app

COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

COPY . .

EXPOSE 8000

# Set FRESH_MIGRATE=1 in env vars to drop + recreate schema before migrating.
# Set SKIP_MIGRATIONS=1 or AUTO_MIGRATE=false / RUN_MIGRATIONS=false to bypass migrations & seed on deploy.
CMD ["sh", "-c", "\
  if [ \"$FRESH_MIGRATE\" = '1' ] || [ \"$FRESH_MIGRATE\" = 'true' ]; then \
    echo '⚠️  FRESH_MIGRATE=1 detected — dropping and recreating schema...' && \
    python -m scripts.reset_db; \
  fi && \
  if [ \"$SKIP_MIGRATIONS\" = '1' ] || [ \"$SKIP_MIGRATIONS\" = 'true' ] || [ \"$AUTO_MIGRATE\" = 'false' ] || [ \"$RUN_MIGRATIONS\" = 'false' ]; then \
    echo '⏭️  Skipping database migrations and seed script...'; \
  else \
    echo '🔄 Running database migrations and seed script...' && \
    alembic upgrade head && \
    python -m scripts.seed; \
  fi && \
  uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

