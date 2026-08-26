# Docker Build - API Only (with DB)

Run only the backend (API + PostgreSQL) in Docker, while frontends run locally.

## Quick Start

```bash
# Build and start
docker compose -f docker-compose.api.yml up --build -d

# Check status
docker compose -f docker-compose.api.yml ps

# View logs
docker compose -f docker-compose.api.yml logs -f api
```

## Rebuild After Code Changes

```bash
docker compose -f docker-compose.api.yml up --build -d
```

## Stop

```bash
docker compose -f docker-compose.api.yml down
```

## Stop and Remove Data

```bash
docker compose -f docker-compose.api.yml down -v
```

## Services

| Service  | URL                  | Description       |
|----------|----------------------|-------------------|
| API      | http://localhost:8000 | FastAPI backend   |
| API Docs | http://localhost:8000/docs | Swagger UI   |
| DB       | localhost:5432        | PostgreSQL 16     |

## Run Frontend Locally

```bash
# Customer app (port 5174)
cd smart-parking-customer
npm install
npm run dev

# Management app (port 5173)
cd smart-parking-management
npm install
npm run dev
```

## Default Credentials

- **Admin Email:** khunsithu350@gmail.com
- **Admin Password:** asdffdsa

---

## Make API Public (Access from Any Device)

Expose your local API to the internet so any device can access it without being on the same network.

### Option 1: ngrok

```bash
# Install
sudo snap install ngrok

# Expose API
ngrok http 8000
```

Public URL: `https://xxxx.ngrok-free.app`

### Option 2: cloudflared (Cloudflare Tunnel)

```bash
# Install (macOS)
brew install cloudflare/cloudflare/cloudflared

# Install (Linux)
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/

# Expose API
cloudflared tunnel --url http://localhost:8000
```

Public URL: `https://xxxx.trycloudflare.com`

### After Getting Public URL

Update these files with the new URL:

1. **API env** — `docker-compose.api.yml`
   ```yaml
   environment:
     BACKEND_CORS_ORIGINS: '["https://YOUR-NEW-URL"]'
     WALLET_REDIRECT_BASE_URL: https://YOUR-NEW-URL
     CUSTOMER_APP_URL: https://YOUR-NEW-URL
     MANAGEMENT_APP_URL: https://YOUR-NEW-URL
   ```

2. **Customer frontend** — `smart-parking-customer/.env`
   ```
   VITE_API_BASE_URL=https://YOUR-NEW-URL/api/v1
   ```

3. **Management frontend** — `smart-parking-management/vite.config.ts`
   ```ts
   proxy: {
     "/api": {
       target: "https://YOUR-NEW-URL",
       changeOrigin: true,
     },
     "/uploads": {
       target: "https://YOUR-NEW-URL",
       changeOrigin: true,
     },
   },
   ```

4. Restart API:
   ```bash
   docker compose -f docker-compose.api.yml up --build -d
   ```

> **Note:** Free tunnel URLs change on restart. Use a paid plan or deploy to a cloud provider for a permanent URL.
