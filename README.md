# Smart Parking Lot Management System

A full-stack smart parking lot management system with role-based access control for Admins, Parking Owners, Staff, and Customers.

## Project Structure

```
smart-parking-lot-system/
├── smart-parking-api/          # FastAPI backend
├── smart-parking-frontend/      # React + TypeScript frontend
└── README.md                   # This file
```

## Tech Stack

### Backend (smart-parking-api)
- Python 3.12+, FastAPI, Uvicorn
- SQLAlchemy 2.0 ORM + Alembic migrations
- SQLite (default, swapable for Postgres/MySQL)
- JWT authentication with role-based access control (RBAC)
- Pydantic v2 for validation

### Frontend (smart-parking-frontend)
- React 19 + TypeScript + Vite
- Tailwind CSS v4
- shadcn/ui components
- React Router v7
- TanStack Query v5
- Zustand for state management
- Recharts for analytics

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- npm or yarn

### 1. Run the Backend API

```bash
cd smart-parking-api

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env

# Run database migrations
alembic upgrade head

# Seed default data (roles, packages, users, parking lot, slots…)
python -m scripts.seed

# Start the API server
uvicorn app.main:app --reload
```

The API will be available at:
- **Swagger UI**: http://127.0.0.1:8000/docs
- **ReDoc**: http://127.0.0.1:8000/redoc
- **Health check**: http://127.0.0.1:8000/health

### Seed Accounts

All accounts use the password **`asdffdsa`**.

| Role | Email | Name / Company / Managed Resource |
|------|-------|----------------------------------|
| **Admin** | `khunsithu350@gmail.com` | System Admin |
| **Owner** | `khunsithuaung50@gmail.com` | KST Parking Co., Ltd. (Pro Package) |
| **Owner** | `myoaung.owner@gmail.com` | MA Parking Solutions (Basic Package) |
| **Owner** | `thidawin.owner@gmail.com` | TW Premium Parking (Enterprise Package) |
| **Staff** | `khunsithu2003@gmail.com` | Assigned to: **Yangon Central Parking** |
| **Staff** | `ayemyatmon.staff@gmail.com` | Assigned to: **Bogyoke Market Parking** |
| **Staff** | `zawlin.staff@gmail.com` | Assigned to: **Sule Square Parking** |
| **Staff** | `susuhtwe.staff@gmail.com` | Assigned to: **Junction Square Parking** |
| **Staff** | `kyawkyaw.staff@gmail.com` | Assigned to: **Junction City Parking** |
| **Customer** | `khunsithuaung35@gmail.com` | Registered vehicle: `1A-1234` (Toyota Silver) |
| **Customer** | `nainglin.customer@gmail.com` | Registered vehicles: `2B-5678` (Honda), `3C-9012` (Suzuki) |

### Seeded Parking Lots (Yangon, Myanmar)

| Parking Lot | Type | Rate | Floors & Slots | GPS Coordinates |
|-------------|------|------|----------------|-----------------|
| **Yangon Central Parking** | Public | 500 MMK/hr | 2 Floors (G, L1), 12 Slots | 16.7741, 96.1594 |
| **Bogyoke Market Parking** | Public | 600 MMK/hr | 1 Floor (G), 8 Slots | 16.7821, 96.1543 |
| **Sule Square Parking** | Private | 800 MMK/hr | 2 Floors (B1, G), 12 Slots | 16.7769, 96.1589 |
| **Junction Square Parking** | Public | 700 MMK/hr | 3 Floors (B1, L1, L2), 22 Slots | 16.8315, 96.1345 |
| **Junction City Parking** | Private | 1000 MMK/hr | 2 Floors (B1, B2), 20 Slots | 16.7902, 96.1452 |

> The seed script is **idempotent** — re-running it is safe and skips any records that already exist.

### 2. Run the Frontend

Open a new terminal:

```bash
cd smart-parking-frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start the dev server
npm run dev
```

The frontend will be available at:
- **Application**: http://localhost:5173

### 3. Access the Application

1. Open http://localhost:5173 in your browser
2. Login with the default admin credentials or register a new customer account
3. Navigate through role-specific dashboards based on your user role

## User Roles & Feature Documentation

Detailed feature specifications, workflows, and API references are available for each role:

| Role | Detailed Feature Specification | Key Capabilities |
|------|--------------------------------|------------------|
| 🛡️ `ADMIN` | 📄 [ADMIN_FEATURES.md](docs/features/ADMIN_FEATURES.md) | Platform governance, package management, global analytics & wallet config |
| 🏢 `OWNER` | 📄 [OWNER_FEATURES.md](docs/features/OWNER_FEATURES.md) | Multi-lot management, 2D/3D floor layouts, staff management, revenue reports |
| 👮 `STAFF` | 📄 [STAFF_FEATURES.md](docs/features/STAFF_FEATURES.md) | Gate check-in/check-out, fee calculation, live slot grid, shift summaries |
| 🚗 `CUSTOMER` | 📄 [CUSTOMER_FEATURES.md](docs/features/CUSTOMER_FEATURES.md) | Yangon lot map finder, 3D slot visualizer, fleet registration, Digital Wallet payment |

👉 See the complete **[Role Features Index](docs/features/README.md)** or view the full checklist in **[English (FEATURES.md)](FEATURES.md)** / **[မြန်မာဘာသာ (FEATURES_MM.md)](FEATURES_MM.md)**.

## API Documentation

For detailed API documentation, see:
- Backend README: [smart-parking-api/README.md](smart-parking-api/README.md)
- Postman Collection: [smart-parking-api/Smart_Parking_API.postman_collection.json](smart-parking-api/Smart_Parking_API.postman_collection.json)

## Frontend Documentation

For detailed frontend documentation, see:
- Frontend README: [smart-parking-frontend/README.md](smart-parking-frontend/README.md)

## Database Management

### Apply New Migrations + Seed (no data loss)
```bash
cd smart-parking-api
./venv/bin/alembic upgrade head && ./venv/bin/python -m scripts.seed
```

### Fresh Reset (⚠️ drops all data)
Drops the schema, re-runs all migrations, then re-seeds.
```bash
# From the project root
bash migrate-fresh.sh
```

Or step by step:
```bash
cd smart-parking-api
./venv/bin/python -m scripts.reset_db   # drop & recreate schema
./venv/bin/alembic upgrade head          # run all migrations
./venv/bin/python -m scripts.seed        # insert seed data
```

### Other Useful Alembic Commands
```bash
cd smart-parking-api
alembic current          # show current migration version
alembic history          # list all migrations
alembic downgrade -1     # roll back one migration
alembic upgrade head     # apply all pending migrations
```

---

## Development

### Backend Development
```bash
cd smart-parking-api
source venv/bin/activate
uvicorn app.main:app --reload
```

### Frontend Development
```bash
cd smart-parking-frontend
npm run dev
```

### Running Tests

**Backend:**
```bash
cd smart-parking-api
pytest -q
```

**Frontend:**
```bash
cd smart-parking-frontend
npm run lint
```

## Environment Variables

### Backend (.env)
- `DATABASE_URL`: Database connection string (default: SQLite)
- `SECRET_KEY`: JWT secret key (change in production)
- `BACKEND_CORS_ORIGINS`: Allowed CORS origins

### Frontend (.env)
- `VITE_API_BASE_URL`: Backend API base URL (default: http://localhost:8000/api/v1)

## License

This project is for demonstration purposes.
