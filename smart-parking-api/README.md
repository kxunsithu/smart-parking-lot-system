# Smart Parking Lot Management System — Backend API

A production-style FastAPI backend for managing a smart parking lot system: owners, staff, customers,
vehicles, parking lots/floors/slots, reservations, parking sessions, and payments — with JWT auth,
role-based access control (RBAC), and a clean layered architecture.

## Tech Stack

- **Python 3.12+**, **FastAPI**, **Uvicorn**
- **SQLAlchemy 2.0** ORM + **Alembic** migrations
- **SQLite** (default, file-based) — easy to swap for Postgres/MySQL via `DATABASE_URL`
- **Pydantic v2** for validation and settings
- **python-jose** (JWT) + **passlib/bcrypt** (password hashing)
- **pytest** + **httpx** for tests

## Architecture

```
app/
├── api/v1/            # Route handlers (thin controllers) grouped by resource
├── core/               # Security, exceptions, logging, enums/constants
├── config/             # Pydantic settings loaded from .env
├── database/           # SQLAlchemy engine/session/declarative base
├── models/             # SQLAlchemy ORM models (one table each)
├── schemas/            # Pydantic request/response DTOs
├── repositories/       # DB access layer (generic CRUD + pagination/search)
├── services/           # Business logic & authorization rules
├── dependencies/       # FastAPI dependencies (auth, RBAC, pagination)
├── middleware/         # Global exception handling & request logging
└── main.py             # FastAPI app wiring
migrations/             # Alembic migration scripts
scripts/seed.py         # Seeds default roles + a System Admin account
tests/                  # pytest test suite (in-memory SQLite)
```

**Design principles:** repository pattern for data access, service layer for business rules,
routers stay thin, dependency-injected DB sessions & current user, and a standardized JSON
response envelope for every endpoint.

## User Roles

| Role       | Capabilities |
|------------|--------------|
| `ADMIN`    | Manage owners, users, roles; view all resources & reports |
| `OWNER`    | Manage own lots, floors, slots, staff; view own reservations/sessions/revenue |
| `STAFF`    | Handle vehicle entry/exit, confirm reservations, update slot status, manage sessions |
| `CUSTOMER` | Register, manage own profile & vehicles, search lots, reserve slots, pay |

User hierarchy is tracked via `users.created_by` (Admin creates Owners, Owners create Staff).

## Getting Started

### 1. Create a virtual environment & install dependencies

```bash
cd smart-parking-api
python3 -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` as needed (especially `SECRET_KEY` before deploying anywhere real).

### 3. Run database migrations

```bash
alembic upgrade head
```

This creates `smart_parking.db` (SQLite) with all required tables.

### 4. Seed default roles + System Admin account

```bash
python -m scripts.seed
```

This creates the `ADMIN`, `OWNER`, `STAFF`, `CUSTOMER` roles and a default admin account using the
`DEFAULT_ADMIN_*` values from `.env` (default: `admin@smartparking.com` / `Admin@12345`).
**Change this password after first login.**

### 5. Run the API

```bash
uvicorn app.main:app --reload
```

- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc
- OpenAPI schema: http://127.0.0.1:8000/openapi.json
- Health check: http://127.0.0.1:8000/health

All business endpoints are versioned under `/api/v1`.

## Creating New Migrations

Whenever you change a model in `app/models/`, generate and apply a new migration:

```bash
alembic revision --autogenerate -m "describe your change"
alembic upgrade head
```

## Running Tests

```bash
pytest -q
```

Tests run against an isolated in-memory SQLite database (see `tests/conftest.py`) and cover:
- Authentication (register/login/refresh/logout/change-password)
- The full parking flow (owner → lot → floor → slot → reservation → session → payment)
- RBAC enforcement (cross-tenant and cross-role access denial)

## API Overview

All responses use a standard envelope:

```json
{ "success": true, "message": "...", "data": {}, "meta": { "page": 1, "limit": 10, "total": 100, "total_pages": 10 } }
```

Errors follow the same shape with `"success": false` and, for validation errors, an `errors` array
of `{ "field": "...", "message": "..." }` objects.

### Key endpoint groups (see `/docs` for full detail)

| Group | Base path | Notes |
|---|---|---|
| Auth | `/api/v1/auth` | register, login, refresh, logout, change-password, me |
| Users | `/api/v1/users` | Admin-only user management |
| Parking Owners | `/api/v1/parking-owners` | Admin creates/manages owners |
| Parking Staff | `/api/v1/parking-staff` | Owner/Admin creates/manages staff |
| Customers | `/api/v1/customers` | Customer self-service + Admin/Owner/Staff read |
| Vehicles | `/api/v1/vehicles` | Customer-owned, CRUD |
| Parking Lots | `/api/v1/parking-lots` | CRUD, search/filter by `type`/`owner_id` |
| Parking Floors | `/api/v1/parking-floors` | CRUD per lot |
| Parking Slots | `/api/v1/parking-slots` | CRUD + `PATCH /{id}/status` |
| Reservations | `/api/v1/reservations` | Create (AVAILABLE slots only), confirm/cancel/complete |
| Parking Sessions | `/api/v1/parking-sessions` | `/start`, `/{id}/finish` (auto fee calculation) |
| Payments | `/api/v1/payments` | Create, list, update status (refunds) |
| Dashboard | `/api/v1/dashboard` | Role-specific stats: `/admin`, `/owner`, `/staff` |

### Pagination, Search, Sorting, Filtering

List endpoints accept:
- `page`, `limit` — pagination
- `sort_by`, `order` (`asc`/`desc`) — sorting
- `search` — free-text search over relevant fields (name, address, plate number, etc.)
- Resource-specific filters, e.g. `type`, `owner_id`, `status`, `floor_id`, `customer_id`

## Business Rules Implemented

- Only `AVAILABLE` slots can be reserved; reserving sets the slot to `RESERVED`.
- Cancelling a reservation frees the slot back to `AVAILABLE`.
- Starting a parking session sets the slot to `OCCUPIED` and (if linked) completes the reservation.
- Finishing a session computes `duration` (minutes) and `fee` (based on `DEFAULT_HOURLY_RATE` or an
  override), and releases the slot back to `AVAILABLE`.
- Payments support `KBZPAY`, `WAVEPAY`, `AYAPAY`, `UABPAY`, and `CASH`, with `PENDING`/`PAID`/`REFUNDED` statuses.
- Ownership is enforced everywhere: Owners can only manage their own lots/floors/slots/staff;
  Customers can only manage their own vehicles/reservations/payments; Staff are scoped to their
  assigned parking lot.

## Notes & Possible Follow-ups

- Refresh token revocation (`logout`) is implemented via a `token_blacklist` table (by JWT `jti`);
  for high-throughput production use, consider Redis instead of a DB table.
- SQLite is used for simplicity; switch `DATABASE_URL` to Postgres/MySQL for production and re-run
  `alembic upgrade head`.
- Consider adding rate limiting and refresh-token rotation auditing for production hardening.
