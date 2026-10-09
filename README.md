# AI-Based Parking Management System 🚗🅿️

A comprehensive, full-stack AI-Based Parking Management System comprising a **FastAPI backend REST API** and two **React (Vite) frontend applications** (Management & Customer Portal).

---

## 🌟 Project Architecture

The repository contains three primary applications:

| Application | Tech Stack | Port (Dev) | Description |
|---|---|---|---|
| **`smart-parking-api`** | Python 3.10+, FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL / SQLite | `http://localhost:8000` | Core backend REST API, auth, billing, slot allocation, wallet integration, and database management. Swagger UI available at `/docs`. |
| **`smart-parking-customer`** | React 19, Vite, TypeScript, Tailwind CSS | `http://localhost:5174` | Web portal for drivers & customers to search parking lots, reserve slots, view active sessions, and process payments. |
| **`smart-parking-management`** | React 19, Vite, TypeScript, Tailwind CSS, Recharts | `http://localhost:5173` | Management & admin dashboard for system admins, parking owners, and staff operators to manage floors, slots, pricing, and live monitoring. |

---

## 🚀 Quick Start — Local Setup Guide

For a detailed step-by-step guide on running locally or using Docker, please refer to **[LOCAL_SETUP.md](./LOCAL_SETUP.md)**.

### Prerequisites

Before starting, ensure you have the following installed on your machine:
- **Python**: `v3.10` or higher
- **Node.js**: `v18.0.0` or higher (with `npm`)
- **Git**

---

### Step 1: Backend API Setup (`smart-parking-api`)

1. **Navigate to the API directory:**
   ```bash
   cd smart-parking-api
   ```

2. **Create and activate a Virtual Environment:**
   - **Linux/macOS:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
   - **Windows:**
     ```cmd
     python -m venv venv
     venv\Scripts\activate
     ```

3. **Install Dependencies:**
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. **Environment Configuration:**
   Copy `.env.example` to create your `.env` file:
   ```bash
   cp .env.example .env
   ```
   *(By default, SQLite or local PostgreSQL can be configured in `.env` via `DATABASE_URL`)*.

5. **Run Database Migrations & Seed Data:**
   ```bash
   # Run database schema migrations
   alembic upgrade head

   # (Optional) Populate database with initial seed data (admin, sample lots, slots)
   python -m scripts.seed
   ```

6. **Start the FastAPI Backend:**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   - **Interactive API Documentation (Swagger UI):** `http://localhost:8000/docs`
   - **ReDoc:** `http://localhost:8000/redoc`

---

### Step 2: Customer Frontend Setup (`smart-parking-customer`)

1. **Navigate to the customer app directory:**
   ```bash
   cd ../smart-parking-customer
   ```

2. **Install Node dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Create `.env` file if needed (or default to port 8000 API):
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api/v1
   ```

4. **Start Dev Server:**
   ```bash
   npm run dev
   ```
   Access the customer app at `http://localhost:5174` (or port specified by Vite output).

---

### Step 3: Management Frontend Setup (`smart-parking-management`)

1. **Navigate to the management app directory:**
   ```bash
   cd ../smart-parking-management
   ```

2. **Install Node dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Create `.env` file if needed:
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api/v1
   ```

4. **Start Dev Server:**
   ```bash
   npm run dev
   ```
   Access the management app at `http://localhost:5173`.

---

## 🐳 Running with Docker Compose

Alternatively, you can run the entire system using Docker Compose:

```bash
# Build and start all services in detached mode
docker compose up --build -d

# View container logs
docker compose logs -f
```

To stop the services:
```bash
docker compose down
```

---

## 🔑 Default Credentials (Seed Data)

When you run `python -m scripts.seed`, the following default accounts are initialized:

| Role | Email | Password |
|---|---|---|
| **System Admin** | `admin@smartparking.com` | `Admin@12345` |
| **Parking Owner** | `owner@smartparking.com` | `Owner@12345` |

---

## 🧪 Running Tests

To run the automated Python backend test suite:

```bash
cd smart-parking-api
pytest -v
```

---

## 📄 License
This project is proprietary software for AI-Based Parking Management.
