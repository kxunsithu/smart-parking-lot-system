# Docker Build & Run Guide

Step-by-step guide for building and running the Smart Parking API in a Docker container.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed
- Docker daemon running

## Project Layout

```
smart-parking-lot-system/
├── .dockerignore
├── docker-compose.yml
├── smart-parking-api/
│   ├── Dockerfile
│   ├── .env
│   ├── .env.example
│   └── .env.production
```

The `Dockerfile` lives inside `smart-parking-api/` but must be built from the **project root** because it references `smart-parking-api/...` paths.

## Recommended: Run with Docker Compose (API + PostgreSQL)

The `docker-compose.yml` runs two services:

- **db** — PostgreSQL 16 (persistent data in a Docker volume)
- **api** — the FastAPI app (runs migrations + seed, then starts uvicorn)

### 1. Start everything

```bash
docker compose up --build -d
```

This builds the image, starts Postgres, waits for it to be healthy, then runs `alembic upgrade head`, `python -m scripts.seed`, and starts the API.

### 2. Verify

```bash
docker compose ps
curl http://localhost:8000/health
```

### 3. Useful commands

```bash
docker compose logs -f api          # API logs
docker compose logs -f db           # database logs
docker compose up --build -d        # rebuild + restart after code changes
docker compose down                 # stop and remove containers (keeps data)
docker compose down -v              # stop AND delete the database volume
docker compose exec db psql -U smart_parking -d smart_parking   # psql shell
```

### Default database credentials (local compose only)

| | |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| User | `smart_parking` |
| Password | `smart_parking` |
| Database | `smart_parking` |

The API connects to Postgres automatically; do **not** override `DATABASE_URL` in `.env.production` when using compose.

## 1. Build the Image

Run from the project root:

```bash
docker build -t smart-parking-api -f smart-parking-api/Dockerfile .
```

### Rebuild after code changes

```bash
docker stop smart-parking && docker rm smart-parking
docker build -t smart-parking-api -f smart-parking-api/Dockerfile .
```

If you changed `requirements.txt`, use `--no-cache` to force a fresh dependency install:

```bash
docker build --no-cache -t smart-parking-api -f smart-parking-api/Dockerfile .
```

## 2. Environment Variables

`.env` is excluded from the image by `.dockerignore`, so required settings must be passed at runtime. Use the existing production env file:

```bash
docker run -d --name smart-parking -p 8000:8000 --env-file smart-parking-api/.env.production smart-parking-api
```

Or pass individual variables:

```bash
docker run -d --name smart-parking -p 8000:8000 \
  -e SECRET_KEY=your-secret \
  -e SMTP_HOST=smtp.gmail.com \
  -e SMTP_PORT=587 \
  -e SMTP_USER=your-email@gmail.com \
  -e SMTP_PASSWORD=your-app-password \
  -e SMTP_FROM_EMAIL=your-email@gmail.com \
  -e SMTP_FROM_NAME="Smart Parking System" \
  -e SMTP_USE_TLS=True \
  smart-parking-api
```

Required variables (see `smart-parking-api/.env.example` for all):

| Variable | Example |
|----------|---------|
| `APP_NAME` | `Smart Parking Lot Management System` |
| `APP_ENV` | `production` |
| `DEBUG` | `False` |
| `API_V1_PREFIX` | `/api/v1` |
| `DATABASE_URL` | `sqlite:///./smart_parking.db` |
| `SECRET_KEY` | `change-me` |
| `ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` |
| `BACKEND_CORS_ORIGINS` | `["http://localhost:5173"]` |
| `DEFAULT_PAGE_SIZE` | `10` |
| `MAX_PAGE_SIZE` | `100` |
| `DEFAULT_HOURLY_RATE` | `1000.0` |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `your-email@gmail.com` |
| `SMTP_PASSWORD` | `your-app-password` |
| `SMTP_FROM_EMAIL` | `your-email@gmail.com` |
| `SMTP_FROM_NAME` | `Smart Parking System` |
| `SMTP_USE_TLS` | `True` |
| `OTP_EXPIRE_MINUTES` | `10` |
| `OTP_LENGTH` | `6` |

## 3. Run the Container

```bash
docker run -d --name smart-parking -p 8000:8000 --env-file smart-parking-api/.env.production smart-parking-api
```

- `-d` run in background
- `--name smart-parking` container name
- `-p 8000:8000` map host port 8000 to container port 8000
- `--env-file ...` load environment variables

## 4. Verify

```bash
docker ps
curl http://localhost:8000/health
```

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 5. Common Commands

```bash
docker logs -f smart-parking      # view logs
docker exec -it smart-parking sh  # shell into container
docker stop smart-parking         # stop container
docker start smart-parking        # start existing container
docker rm smart-parking           # remove container
docker rmi smart-parking-api      # remove image
```

## Notes / Known Limitations

- **Running the plain `docker run` method (without compose):** the image does not run migrations or the seed script automatically. Run them manually:

  ```bash
  docker exec -it smart-parking sh -c "alembic upgrade head && python -m scripts.seed"
  ```

  (With Docker Compose this is handled automatically.)

- **Standalone `docker run` + SQLite:** if you run the image without a database container, it falls back to SQLite which lives inside the container — data is lost when the container is removed. Use Docker Compose (PostgreSQL) or an external database for persistence.
- Change the default admin password (`admin@smartparking.com` / `Admin@12345`) after first login.
