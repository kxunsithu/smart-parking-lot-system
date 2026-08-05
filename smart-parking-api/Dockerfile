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

CMD ["sh", "-c", "python -m scripts.reset_db && alembic upgrade head && python -m scripts.seed && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
