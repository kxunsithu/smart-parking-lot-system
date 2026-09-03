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

# Set FRESH_MIGRATE=1 in Coolify env vars to drop + recreate schema before migrating.
# Remove/unset it after the first deploy to return to normal (safe) behavior.
CMD ["sh", "-c", "\
  if [ \"$FRESH_MIGRATE\" = '1' ] || [ \"$FRESH_MIGRATE\" = 'true' ]; then \
    echo '⚠️  FRESH_MIGRATE=1 detected — dropping and recreating schema...' && \
    python -m scripts.reset_db; \
  fi && \
  alembic upgrade head && \
  python -m scripts.seed && \
  uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
