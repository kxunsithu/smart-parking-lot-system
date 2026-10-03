# 🛠️ Detailed Local Development Setup Guide

This guide provides comprehensive, step-by-step instructions on setting up and running the **Smart Parking Lot Management System** on your local machine.

---

## 📋 System Requirements

Ensure your development environment meets the following requirements:

- **Operating System**: Linux, macOS, or Windows (WSL2 recommended for Windows users)
- **Python**: `v3.10` or higher
- **Node.js**: `v18.0.0` or higher (Node 20+ recommended)
- **Package Managers**: `pip` (Python) and `npm` (Node)
- **Database (Optional)**: PostgreSQL (v14+) if not using SQLite locally
- **Docker & Docker Compose**: Optional for containerized setup

---

## 🏗️ Repository Structure

```text
smart-parking-lot-system/
├── smart-parking-api/          # FastAPI Backend (Python)
├── smart-parking-customer/     # Driver / Customer Web Portal (React + Vite)
├── smart-parking-management/   # Admin & Owner Management Portal (React + Vite)
├── docker-compose.yml          # Docker composition file
├── README.md                   # Project overview
└── LOCAL_SETUP.md              # This setup guide
```

---

## 🏃 Option 1: Running Locally (Recommended for Development)

### Part 1: Backend API (`smart-parking-api`)

#### 1. Open Terminal and navigate to the backend directory:
```bash
cd smart-parking-api
```

#### 2. Create Python Virtual Environment:
```bash
# On Linux/macOS:
python3 -m venv venv
source venv/bin/activate

# On Windows (Command Prompt):
python -m venv venv
venv\Scripts\activate

# On Windows (PowerShell):
python -m venv venv
.\venv\Scripts\Activate.ps1
```

#### 3. Install Python Dependencies:
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

#### 4. Configure Environment Variables:
Copy `.env.example` to create `.env`:
```bash
cp .env.example .env
```

*Note on Database:* By default, you can set `DATABASE_URL` in `.env`:
- For SQLite (Quickest local setup):
  ```env
  DATABASE_URL=sqlite:///./smart_parking.db
  ```
- For PostgreSQL:
  ```env
  DATABASE_URL=postgresql://postgres:password@localhost:5432/smart_parking
  ```

#### 5. Apply Database Migrations:
```bash
alembic upgrade head
```

#### 6. Seed Initial Data (Admin Accounts & Sample Parking Lots):
```bash
python -m scripts.seed
```

#### 7. Launch FastAPI Server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- **API URL**: `http://localhost:8000`
- **Swagger Documentation**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`

---

### Part 2: Customer App (`smart-parking-customer`)

Open a **new terminal window** or tab.

#### 1. Navigate to the customer app directory:
```bash
cd smart-parking-customer
```

#### 2. Install Node Dependencies:
```bash
npm install
```

#### 3. Setup Environment Variables:
Create `.env` file (or `.env.local`):
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

#### 4. Start Development Server:
```bash
npm run dev
```
- The application will start at `http://localhost:5174` (or `http://localhost:5173`).

---

### Part 3: Management App (`smart-parking-management`)

Open another **new terminal window** or tab.

#### 1. Navigate to the management app directory:
```bash
cd smart-parking-management
```

#### 2. Install Node Dependencies:
```bash
npm install
```

#### 3. Setup Environment Variables:
Create `.env` file (or `.env.local`):
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

#### 4. Start Development Server:
```bash
npm run dev
```
- The management dashboard will start at `http://localhost:5173`.

---

## 🐳 Option 2: Running with Docker Compose

If you have Docker and Docker Compose installed, you can spin up all 3 services and a PostgreSQL database with a single command:

```bash
# Start all containers in background
docker compose up --build -d
```

### Access Ports in Docker:
- **API**: `http://localhost:8000`
- **Management Web App**: `http://localhost:5173`
- **Customer Web App**: `http://localhost:5174`
- **PostgreSQL Database**: `localhost:5432`

### Container Management Commands:
```bash
# View logs
docker compose logs -f

# View logs for API only
docker compose logs -f api

# Stop all services
docker compose down

# Stop and wipe database volume
docker compose down -v
```

---

## 🔐 Default Credentials

After seeding the database (`python -m scripts.seed`), use these default logins:

| Portal | Role | Email | Password |
|---|---|---|---|
| **Management Dashboard** | System Admin | `admin@smartparking.com` | `Admin@12345` |
| **Management Dashboard** | Parking Owner | `owner@smartparking.com` | `Owner@12345` |

---

## 🧪 Testing & Verification

To run unit and integration tests for backend:

```bash
cd smart-parking-api
pytest -v
```

---

## 🛠️ Common Troubleshooting

1. **Port Conflicts (`8000`, `5173`, or `5174` already in use)**
   - Change port flags when starting `uvicorn` (e.g. `--port 8001`) or adjust `vite.config.ts`.

2. **Alembic Migration Error**
   - Reset local DB if needed: `python scripts/reset_db.py` and rerun `alembic upgrade head`.

3. **CORS Errors in Browser**
   - Ensure `BACKEND_CORS_ORIGINS` in `smart-parking-api/.env` includes `http://localhost:5173` and `http://localhost:5174`.

4. **Database Connection Error (`psycopg2.OperationalError: SSL connection...`)**
   - If you see an SSL error when connecting to a remote PostgreSQL database (such as Render), update your `smart-parking-api/.env` file:
     - **For quick local development**, set `DATABASE_URL=sqlite:///./smart_parking.db`.
     - **If using Render cloud database**, append `?sslmode=require` to your `DATABASE_URL`:
       `DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require`
