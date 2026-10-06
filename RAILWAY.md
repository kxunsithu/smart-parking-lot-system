# Railway Deployment Guide

This guide provides step-by-step instructions for deploying the **Smart Parking Lot Management System** on [Railway](https://railway.app/).

---

## 🏗️ Architecture Overview

The system consists of 4 services to deploy in your Railway project:

1. **Database**: Managed PostgreSQL instance (Railway Plugin).
2. **API Backend**: FastAPI application (`smart-parking-api`).
3. **Customer App**: Vite + React frontend (`smart-parking-customer`).
4. **Management App**: Vite + React frontend (`smart-parking-management`).

---

## 🚀 Step-by-Step Deployment

### 1. Create a New Project on Railway
1. Go to [Railway Dashboard](https://railway.app/dashboard).
2. Click **+ New Project** -> **Deploy from GitHub repo**.
3. Select your repository.

---

### 2. Add PostgreSQL Database
1. Inside your Railway project, click **+ New** -> **Database** -> **Add PostgreSQL**.
2. Railway will automatically provision Postgres and create a `${{Postgres.DATABASE_URL}}` variable.

---

### 3. Deploy the Backend API (`smart-parking-api`)

1. Click **+ New** -> **GitHub Repo** -> Select this repository.
2. Select the created service and go to **Settings**:
   - **Service Name**: `smart-parking-api`
   - **Root Directory**: `smart-parking-api`
3. Railway will automatically detect the `Dockerfile` inside `smart-parking-api/`.
4. Go to **Variables** tab and set the environment variables:

| Variable | Value / Description |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` *(Railway variable reference)* |
| `APP_NAME` | `Smart Parking Lot Management System` |
| `APP_ENV` | `production` |
| `DEBUG` | `False` |
| `API_V1_PREFIX` | `/api/v1` |
| `SECRET_KEY` | *(Generate a strong random secret)* |
| `ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` |
| `BACKEND_CORS_ORIGINS` | `["https://<customer-domain>.up.railway.app","https://<management-domain>.up.railway.app"]` |
| `DEFAULT_PAGE_SIZE` | `10` |
| `MAX_PAGE_SIZE` | `100` |
| `DEFAULT_HOURLY_RATE` | `1000.0` |
| `DEFAULT_ADMIN_NAME` | `System Admin` |
| `DEFAULT_ADMIN_EMAIL` | `admin@smartparking.com` |
| `DEFAULT_ADMIN_PASSWORD` | `<secure-admin-password>` |
| `DEFAULT_ADMIN_PHONE` | `+10000000000` |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `<your-email>` |
| `SMTP_PASSWORD` | `<your-app-password>` |
| `SMTP_FROM_EMAIL` | `<your-email>` |
| `SMTP_FROM_NAME` | `Smart Parking System` |
| `SMTP_USE_TLS` | `True` |
| `OTP_EXPIRE_MINUTES` | `10` |
| `OTP_LENGTH` | `6` |
| `WALLET_API_BASE_URL` | `https://digital-wallet-backend-api.up.railway.app` |
| `WALLET_REFERENCE_PREFIX` | `PP` |
| `WALLET_REDIRECT_BASE_URL` | `https://<api-domain>.up.railway.app` |
| `CUSTOMER_APP_URL` | `https://<customer-domain>.up.railway.app` |
| `MANAGEMENT_APP_URL` | `https://<management-domain>.up.railway.app` |

5. Under **Settings** -> **Networking**, click **Generate Domain** to get your public API URL (e.g., `smart-parking-api-production.up.railway.app`).

> ℹ️ **Note on Migrations & Seeding:**  
> The `Dockerfile` inside `smart-parking-api` automatically executes `alembic upgrade head` and `python -m scripts.seed` on start.
> - To skip migrations/seeding on deploy, set `SKIP_MIGRATIONS=1` or `AUTO_MIGRATE=false` in environment variables.
> - If you ever need to perform a clean database reset on deployment, set `FRESH_MIGRATE=1`, let it deploy once, and then remove it.

---

### 4. Deploy Customer App (`smart-parking-customer`)

1. Click **+ New** -> **GitHub Repo** -> Select this repository.
2. Go to service **Settings**:
   - **Service Name**: `smart-parking-customer`
   - **Root Directory**: `smart-parking-customer`
3. Go to **Variables** tab and set build environment variables:
   - `VITE_API_BASE_URL`: `https://<api-domain>.up.railway.app/api/v1`
4. Under **Settings** -> **Networking**, click **Generate Domain** (e.g., `smart-parking-customer-production.up.railway.app`).

---

### 5. Deploy Management App (`smart-parking-management`)

1. Click **+ New** -> **GitHub Repo** -> Select this repository.
2. Go to service **Settings**:
   - **Service Name**: `smart-parking-management`
   - **Root Directory**: `smart-parking-management`
3. Go to **Variables** tab and set build environment variables:
   - `VITE_API_BASE_URL`: `https://<api-domain>.up.railway.app/api/v1`
4. Under **Settings** -> **Networking**, click **Generate Domain** (e.g., `smart-parking-management-production.up.railway.app`).

---

### 6. Wire Up Final Configuration

After generating public domains for all 3 services on Railway, make sure to update the environment variables on the `smart-parking-api` service:

1. `BACKEND_CORS_ORIGINS`: Set to `["https://<customer-domain>.up.railway.app","https://<management-domain>.up.railway.app"]`
2. `WALLET_REDIRECT_BASE_URL`: Set to `https://<api-domain>.up.railway.app`
3. `CUSTOMER_APP_URL`: Set to `https://<customer-domain>.up.railway.app`
4. `MANAGEMENT_APP_URL`: Set to `https://<management-domain>.up.railway.app`

Re-deploy `smart-parking-api` (or save variables to trigger an automatic re-deploy).

---

## 🔍 Verification

1. **Health Check**: Open `https://<api-domain>.up.railway.app/health` (should return `{"status": "healthy"}`).
2. **Swagger Docs**: Open `https://<api-domain>.up.railway.app/docs`.
3. **Customer Portal**: Access `https://<customer-domain>.up.railway.app`.
4. **Management Portal**: Access `https://<management-domain>.up.railway.app` and log in with your admin credentials.
