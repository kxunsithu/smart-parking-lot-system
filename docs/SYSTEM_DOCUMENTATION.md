# Smart Parking Lot Management System — System Documentation

> Comprehensive reference for the Smart Parking Lot Management System: architecture,
> tech stack, data model, API, business rules, the digital wallet integration, the
> frontend applications, deployment, and known limitations.

---

## Table of Contents

1. [Overview](#1-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Repository Layout](#4-repository-layout)
5. [Users, Roles & RBAC](#5-users-roles--rbac)
6. [Data Model](#6-data-model)
7. [API Reference](#7-api-reference)
8. [Core Business Flows](#8-core-business-flows)
9. [Digital Wallet Integration](#9-digital-wallet-integration)
10. [Business Rules & Constraints](#10-business-rules--constraints)
11. [Frontend Applications](#11-frontend-applications)
12. [Configuration & Environment Variables](#12-configuration--environment-variables)
13. [Deployment](#13-deployment)
14. [Testing](#14-testing)
15. [Known Limitations](#15-known-limitations)

---

## 1. Overview

The Smart Parking Lot Management System is a full-stack, role-based parking management
platform that connects **Parking Owners**, **Parking Staff**, and **Customers** through a
single backend API and two frontend applications.

Customers can register with email + OTP verification, register their cars, browse parking
lots (including interactive 3D views), book a slot for a future time window, and pay with
their **digital wallet**. Parking Owners subscribe to a package, configure their lots,
floors, slots and staff, and receive session fees into their wallet. Staff monitor slot
occupancy and finish sessions. A System Administrator manages owners, users, packages,
subscriptions and platform payments.

### Key capabilities

- **Role-based access control** with four roles: `ADMIN`, `OWNER`, `STAFF`, `CUSTOMER`.
- **Email verification** via one-time passwords (OTP) before registration.
- **JWT authentication** with rotating refresh tokens and a server-side blacklist.
- **Subscription packages** that gate owner operations (e.g. number of parking lots).
- **Digital wallet payments** (external system API) for both parking sessions and
  subscriptions, with a hosted payment page and server-to-server callback verification.
- **Smart booking engine** that prevents double-booking and enforces a 2-hour buffer gap
  between sessions on the same slot.
- **Role-specific dashboards** with live availability and revenue analytics.
- **Interactive 3D lot/slot views** rendered in the browser with Three.js.

---

## 2. System Architecture

The system is composed of one FastAPI backend, two React frontends, a PostgreSQL database,
and an external **Digital Wallet Backend** (a separate Laravel application) that actually
moves money.

```
                          ┌──────────────────────────────────────────────┐
                          │              Digital Wallet Backend          │
                          │            (Laravel, HTTP :8001)             │
                          │  ExternalPaymentController                   │
                          │  Auth: X-API-Key (external_systems table)    │
                          └───────────────▲──────────────────────────────┘
                                          │ POST /api/external/payments/*
                                          │ GET  /api/external/payments/{ref}
                          (server-to-server, X-API-Key header)
                                          │
              ┌───────────────────────────┴───────────────────────────┐
              │                  Smart Parking API                    │
              │             (FastAPI / Uvicorn, HTTP :8000)          │
              │  Auth (JWT/RBAC) · Booking · Payments · Subscriptions │
              │  Subscription/booking 3rd-party wallet client         │
              └────────────▲───────────────────────┬──────────────────┘
                           │                       │
              HTTP :5173   │                       │   HTTP :5174
        ┌──────────────────┴──────┐        ┌───────┴─────────────────┐
        │  Management Frontend     │        │  Customer Frontend     │
        │  (ADMIN / OWNER / STAFF) │        │  (CUSTOMER)            │
        └─────────────────────────┘        └─────────────────────────┘
                    │                                    │
              PostgreSQL :5432                  PostgreSQL :5434
              (smart_parking DB)                (wallet DB — owned by wallet project)
```

**Data flow highlights**

- The parking API never moves money directly. It registers each receiving account in the
  wallet backend as an **External System**, stores the wallet's `X-API-Key`, and asks the
  wallet to initiate/confirm payments.
- The wallet hosted payment page redirects the customer's **browser** back to the parking
  API callback, which re-verifies the payment server-to-server before finalizing.
- The frontends talk only to the parking API (`/api/v1`); they never see wallet credentials.

---

## 3. Technology Stack

### Backend — `smart-parking-api`

| Concern | Technology |
|---|---|
| Language / runtime | Python 3.12+, Uvicorn |
| Web framework | FastAPI 0.115 |
| ORM | SQLAlchemy 2.0 (Mapped/mapped_column style) |
| Migrations | Alembic 1.14 |
| Validation | Pydantic v2 + pydantic-settings |
| Auth | python-jose (JWT, HS256), passlib[bcrypt] |
| Email / OTP | aiosmtplib (SMTP), custom OTP service |
| HTTP client | httpx |
| Database | SQLite (dev default) / PostgreSQL 16 (Docker) |

### Frontend — `smart-parking-management` and `smart-parking-customer`

| Concern | Technology |
|---|---|
| Framework | React 19 + TypeScript + Vite |
| UI | Tailwind CSS v4, shadcn/ui (Base UI "base-nova"), lucide-react, sonner |
| Routing | React Router v7 |
| State | Zustand 5 (persisted auth) |
| Server state | Axios with JWT + single-flight refresh interceptors |
| Forms | React Hook Form + Zod |
| Charts | Recharts (management app only) |
| 3D | three, @react-three/fiber, @react-three/drei |

---

## 4. Repository Layout

```
smart-parking-lot-system/
├── docker-compose.yml                 # PostgreSQL + API (runs migrations + seed)
├── DOCKER.md                          # Docker build/run guide
├── README.md                          # Top-level quick start
├── docs/
│   └── SYSTEM_DOCUMENTATION.md        # This document
├── smart-parking-api/                 # FastAPI backend
│   ├── app/
│   │   ├── api/v1/                    # Routers (auth, users, lots, sessions, …)
│   │   ├── config/settings.py         # Pydantic-settings config
│   │   ├── core/                      # constants, security, exceptions, logging
│   │   ├── database/                  # engine, session, Base
│   │   ├── dependencies/              # auth (RBAC), pagination
│   │   ├── middleware/                # logging + exception handlers
│   │   ├── models/                    # SQLAlchemy models
│   │   ├── repositories/              # data-access layer
│   │   ├── schemas/                   # Pydantic request/response models
│   │   ├── services/                  # business logic
│   │   └── main.py                    # app entry point
│   ├── migrations/versions/           # Alembic migrations
│   ├── scripts/seed.py                # seeds roles + admin + packages
│   ├── tests/                         # pytest suite
│   ├── Smart_Parking_API.postman_collection.json
│   ├── table-design.sql / insert-data.sql
│   └── Dockerfile
├── smart-parking-management/          # ADMIN / OWNER / STAFF frontend (:5173)
└── smart-parking-customer/            # CUSTOMER frontend (:5174)
```

---

## 5. Users, Roles & RBAC

### 5.1 Roles

Defined in `app/core/constants.py` (`RoleName`) and seeded into the `roles` table.

| Role | Capabilities |
|---|---|
| `ADMIN` | System admin. Manages owners, users, packages, subscriptions, platform wallet account; views all lots/sessions/payments and the global dashboard. Exempt from subscription gates. |
| `OWNER` | Parking owner. Registers with email verification, purchases/renews subscriptions, configures own lots/floors/slots/staff, links own wallet account (receives session fees), views own dashboards/revenue. |
| `STAFF` | Parking staff. Assigned to one lot. Views slot occupancy, monitors/finishes sessions for that lot. |
| `CUSTOMER` | End customer. Registers, verifies email via OTP, manages own cars, searches lots, books slots (future time windows), pays via digital wallet, tracks own sessions. |

### 5.2 Enforcement

- JWT **access token** (default 30 min) is required on every protected endpoint via
  `get_current_user` (`app/dependencies/auth.py`).
- Role restriction uses the `require_roles(*roles)` dependency factory; a wrong role gets
  **403**.
- An `ADMIN` can act on behalf of any owner by passing `owner_id` where supported.
- Inactive users (`is_active = False`) are rejected with **403**.

### 5.3 Registration & verification

- `POST /auth/send-otp` → email verification code (6 digits, 10 min).
- `POST /auth/verify-otp` → marks the OTP used and the user verified (if they exist).
- `POST /auth/register` (customer) / `POST /auth/register-owner` (owner) require that a
  used OTP exists for the email; otherwise the account is created unverified.
- Email delivery uses SMTP; when SMTP is not configured the OTP is **printed to the server
  log** (`[DEV MODE] OTP for <email>: <code>`).

---

## 6. Data Model

Below is the logical schema. All primary keys are auto-incrementing `id`. See
`app/models/*.py` for exact column definitions.

```mermaid
erDiagram
    ROLES ||--o{ USERS : assigns
    USERS ||--o| PARKING_OWNERS : "owner profile"
    USERS ||--o| PARKING_STAFF : "staff profile"
    USERS ||--o| CUSTOMERS : "customer profile"
    USERS ||--o{ PAYMENTS : pays
    PARKING_OWNERS ||--o{ PARKING_LOTS : owns
    PARKING_OWNERS ||--o{ OWNER_SUBSCRIPTIONS : subscribes
    PARKING_OWNERS |o--o| WALLET_ACCOUNTS : receives
    PARKING_LOTS ||--o{ PARKING_FLOORS : has
    PARKING_FLOORS ||--o{ PARKING_SLOTS : has
    PARKING_SLOTS ||--o{ PARKING_SESSIONS : hosts
    CUSTOMERS ||--o{ CARS : owns
    CARS ||--o{ PARKING_SESSIONS : used_by
    PACKAGES ||--o{ OWNER_SUBSCRIPTIONS : purchased
    WALLET_ACCOUNTS ||--o{ PAYMENTS : credentials
    PARKING_SESSIONS |o--o{ PAYMENTS : charged
    OWNER_SUBSCRIPTIONS |o--o{ PAYMENTS : charged

    ROLES {
      int id PK
      string name UK
      string description
    }
    USERS {
      int id PK
      string name
      string email UK
      string password
      int role_id FK
      bool is_active
      bool is_verified
      string phone
      datetime created_at
    }
    PARKING_OWNERS {
      int id PK
      int user_id FK UK
      string company_name
    }
    PARKING_STAFF {
      int id PK
      int user_id FK UK
      int parking_lot_id FK
      int created_by FK
    }
    CUSTOMERS {
      int id PK
      int user_id FK UK
      float current_lat
      float current_lng
    }
    CARS {
      int id PK
      int customer_id FK
      string plate_number UK
      string brand
      string color
    }
    PARKING_LOTS {
      int id PK
      int owner_id FK
      string name
      string google_map_url
      string type  "PUBLIC|PRIVATE"
      bool is_active
      float rate_per_hour
      datetime created_at
    }
    PARKING_FLOORS {
      int id PK
      int parking_lot_id FK
      string floor_name
    }
    PARKING_SLOTS {
      int id PK
      int floor_id FK
      string slot_number
      string section
      float latitude
      float longitude
      string status "AVAILABLE|OCCUPIED"
    }
    PARKING_SESSIONS {
      int id PK
      int car_id FK
      int slot_id FK
      datetime start_time
      datetime end_time
      int duration
      float fee
      string status "PENDING|ACTIVE|FINISHED"
    }
    PACKAGES {
      int id PK
      string name
      string description
      float price
      int duration_days
      int max_lots
      int max_staff
      bool is_active
    }
    OWNER_SUBSCRIPTIONS {
      int id PK
      int owner_id FK
      int package_id FK
      datetime started_at
      datetime expires_at
      string status "PENDING|ACTIVE|EXPIRED|CANCELLED"
      float amount
    }
    WALLET_ACCOUNTS {
      int id PK
      int owner_id FK "NULL = platform/admin account"
      string name
      string wallet_phone
      string api_key
      bool is_active
    }
    PAYMENTS {
      int id PK
      int user_id FK
      int wallet_account_id FK
      int session_id FK
      int subscription_id FK
      string reference UK "PP-XXXXXXXXXX"
      string wallet_payment_reference "PAY-…"
      string wallet_payment_url
      string wallet_transaction_number "TX-…"
      float amount
      float fee
      float total
      string status "PENDING|COMPLETED|FAILED|EXPIRED"
      string message
      datetime paid_at
    }
    OTP {
      int id PK
      string email
      string code
      datetime expires_at
      bool is_used
    }
    TOKEN_BLACKLIST {
      int id PK
      string jti UK
      datetime expires_at
    }
```

### Key model notes

- `wallet_accounts.owner_id = NULL` identifies the **platform (admin)** account that
  receives subscription fees; a non-null `owner_id` account receives session fees for that
  owner's lots.
- `payments.wallet_account_id` records which wallet credential was used (i.e. who
  received the money).
- Unique constraints: `parking_slots(floor_id, slot_number)`,
  `cars.plate_number`, `users.email`, `payments.reference`, `roles.name`,
  `wallet_accounts.owner_id`.
- Indexed hot paths: session `car_id` and `(car_id, status)`, payment `session_id`,
  `subscription_id`, `wallet_account_id`.

### Alembic migration history

| Revision | Purpose |
|---|---|
| `83055a782cfd` | Initial schema (roles, users, owners, staff, customers, cars, lots, floors, slots, sessions, packages, subscriptions, OTP, blacklist, payments) |
| `b52fe6a6f933` | Drop `otp_code` from `payments` |
| `b7c2a91f4e12` | Wallet payments (add wallet references/transaction number to payments) |
| `c8a1d3f5b9e2` | Wallet accounts (create `wallet_accounts`, link payments) |
| `d4e2f6a8c1b0` | Add `payments.wallet_payment_url` |

---

## 7. API Reference

All endpoints are prefixed with `/api/v1` (configurable via `API_V1_PREFIX`). Responses
follow a common envelope: `{"success": bool, "message": str, "data": …, "meta": {…}?}`.
Interactive docs are at `/docs` (Swagger) and `/redoc` (ReDoc). A Postman collection lives
at `smart-parking-api/Smart_Parking_API.postman_collection.json`.

Legend: **Auth** column lists allowed roles; `*` = any authenticated user; `-` = public.

### 7.1 Authentication — `/auth`

| Method & path | Auth | Description |
|---|---|---|
| `POST /auth/send-otp` | - | Send 6-digit email verification code |
| `GET /auth/otp-status` | - | Check whether an email is verified |
| `POST /auth/verify-otp` | - | Verify code; returns tokens |
| `POST /auth/register` | - | Register a customer (requires used OTP) |
| `POST /auth/register-owner` | - | Register a parking owner (requires used OTP) |
| `POST /auth/login` | - | Email + password login → access/refresh tokens |
| `POST /auth/refresh` | - | Rotate a refresh token → new token pair |
| `POST /auth/logout` | - | Revoke refresh token (blacklist jti) |
| `POST /auth/change-password` | * | Change own password (old password required) |
| `GET /auth/me` | * | Current user profile (with role) |
| `PUT /auth/me` | * | Update own profile |

### 7.2 Users — `/users` (ADMIN only on the router)

| Method & path | Auth | Description |
|---|---|---|
| `GET /users` | ADMIN | List users (paginated, searchable) |
| `GET /users/{user_id}` | ADMIN | Get a user |
| `PUT /users/{user_id}` | ADMIN | Update a user |
| `PATCH /users/{user_id}/activate` | ADMIN | Activate a user |
| `PATCH /users/{user_id}/deactivate` | ADMIN | Deactivate a user |
| `DELETE /users/{user_id}` | ADMIN | Delete a user |

### 7.3 Parking owners — `/parking-owners`

| Method & path | Auth | Description |
|---|---|---|
| `GET /parking-owners` | ADMIN | List owners (paginated) |
| `GET /parking-owners/{owner_id}` | ADMIN | Get an owner |
| `GET /parking-owners/me` | OWNER | Own owner profile |
| `PUT /parking-owners/{owner_id}` | ADMIN | Update an owner |
| `DELETE /parking-owners/{owner_id}` | ADMIN | Delete an owner |
| `PATCH /parking-owners/{owner_id}/toggle-status` | ADMIN | Toggle owner status |

### 7.4 Parking staff — `/parking-staff` (ADMIN, OWNER on the router)

| Method & path | Auth | Description |
|---|---|---|
| `POST /parking-staff` | ADMIN, OWNER | Create staff (assigned to a lot) |
| `GET /parking-staff` | ADMIN, OWNER | List staff (filter by `parking_lot_id`) |
| `GET /parking-staff/{staff_id}` | ADMIN, OWNER | Get staff |
| `PUT /parking-staff/{staff_id}` | ADMIN, OWNER | Update staff |
| `DELETE /parking-staff/{staff_id}` | ADMIN, OWNER | Delete staff |

### 7.5 Customers — `/customers`

| Method & path | Auth | Description |
|---|---|---|
| `GET /customers` | ADMIN, OWNER, STAFF | List customers (paginated) |
| `GET /customers/me` | CUSTOMER | Own customer profile |
| `PUT /customers/me` | CUSTOMER | Update own profile |
| `GET /customers/{customer_id}` | ADMIN, OWNER, STAFF | Get a customer |

### 7.6 Cars — `/cars` (CUSTOMER)

| Method & path | Auth | Description |
|---|---|---|
| `POST /cars` | CUSTOMER | Add a car (unique `plate_number`) |
| `GET /cars` | CUSTOMER | List own cars |
| `GET /cars/{car_id}` | CUSTOMER | Get own car |
| `PUT /cars/{car_id}` | CUSTOMER | Update own car |
| `DELETE /cars/{car_id}` | CUSTOMER | Delete own car |

### 7.7 Parking lots — `/parking-lots`

| Method & path | Auth | Description |
|---|---|---|
| `POST /parking-lots` | ADMIN, OWNER | Create lot (owner gated by subscription `max_lots`) |
| `GET /parking-lots` | * | List lots (paginated, filter `type`, `owner_id`, `with_staff_count`) |
| `GET /parking-lots/{lot_id}` | * | Get a lot |
| `PUT /parking-lots/{lot_id}` | ADMIN, OWNER | Update lot (owner must be the owner) |
| `DELETE /parking-lots/{lot_id}` | ADMIN, OWNER | Delete lot |
| `PATCH /parking-lots/{lot_id}/toggle-status` | ADMIN, OWNER | Toggle `is_active` |

### 7.8 Parking floors — `/parking-floors` (ADMIN, OWNER)

| Method & path | Description |
|---|---|
| `POST /parking-floors` | Create floor under a lot |
| `GET /parking-floors` | List floors (filter by lot) |
| `GET /parking-floors/{floor_id}` | Get floor |
| `PUT /parking-floors/{floor_id}` | Update floor |
| `DELETE /parking-floors/{floor_id}` | Delete floor |

### 7.9 Parking slots — `/parking-slots`

| Method & path | Auth | Description |
|---|---|---|
| `POST /parking-slots` | ADMIN, OWNER | Create slot under a floor (unique slot number per floor) |
| `GET /parking-slots` | * | List slots (filter by floor/section/status) |
| `GET /parking-slots/{slot_id}` | * | Get slot |
| `PUT /parking-slots/{slot_id}` | ADMIN, OWNER | Update slot |
| `PATCH /parking-slots/{slot_id}/status` | ADMIN, OWNER, STAFF | Set slot status (AVAILABLE/OCCUPIED) |
| `DELETE /parking-slots/{slot_id}` | ADMIN, OWNER | Delete slot |

### 7.10 Parking sessions — `/parking-sessions`

| Method & path | Auth | Description |
|---|---|---|
| `POST /parking-sessions/book` | CUSTOMER | Book a session (creates PENDING + estimated fee) |
| `POST /parking-sessions/{id}/pay/initiate` | * | Initiate wallet payment (returns OTP / payment URL) |
| `POST /parking-sessions/{id}/pay/confirm` | * | Confirm wallet payment with OTP + PIN (activates session) |
| `POST /parking-sessions/start` | * | **Disabled stub** — always returns 403 (customers use `/book`) |
| `GET /parking-sessions` | * | List sessions (filters: `status`, `car_id`, `slot_id`, `plate_number`) |
| `GET /parking-sessions/{session_id}` | * | Get a session |
| `PATCH /parking-sessions/{session_id}/finish` | CUSTOMER, STAFF, OWNER, ADMIN | Finish an ACTIVE session; slot returns to AVAILABLE |

### 7.11 Dashboards — `/dashboard`

| Method & path | Auth | Data |
|---|---|---|
| `GET /dashboard/admin` | ADMIN | Owners, staff, customers, lots, total revenue (finished sessions) |
| `GET /dashboard/owner` | OWNER | Lots, floors, available/occupied slots, staff, sessions, revenue |
| `GET /dashboard/staff` | STAFF | Lot id, available/occupied slots, active sessions |

### 7.12 Packages — `/packages`

| Method & path | Auth | Description |
|---|---|---|
| `POST /packages` | ADMIN | Create a package |
| `GET /packages` | ADMIN, OWNER | List packages |
| `GET /packages/{package_id}` | ADMIN, OWNER | Get a package |
| `PUT /packages/{package_id}` | ADMIN | Update a package |
| `DELETE /packages/{package_id}/delete` | ADMIN | Permanently delete a package |
| `DELETE /packages/{package_id}` | ADMIN | Disable a package (soft) |
| `PATCH /packages/{package_id}/enable` | ADMIN | Re-enable a package |

### 7.13 Subscriptions — `/subscriptions`

| Method & path | Auth | Description |
|---|---|---|
| `POST /subscriptions/purchase` | OWNER, ADMIN | Create PENDING subscription |
| `POST /subscriptions/renew` | OWNER, ADMIN | Create PENDING renewal |
| `POST /subscriptions/{id}/pay/initiate` | * | Initiate wallet payment for subscription |
| `POST /subscriptions/{id}/pay/confirm` | * | Confirm wallet payment (activates subscription) |
| `GET /subscriptions/me` | OWNER | Own subscription history |
| `GET /subscriptions/active` | OWNER | Current ACTIVE subscription (or null) |
| `GET /subscriptions` | ADMIN | List all subscriptions (paginated) |
| `PATCH /subscriptions/{id}/toggle-status` | ADMIN | Toggle ACTIVE/PENDING ↔ CANCELLED |

### 7.14 Wallet accounts — `/wallet-accounts`

| Method & path | Auth | Description |
|---|---|---|
| `GET /wallet-accounts/me` | OWNER | Own wallet account (404 if not set) |
| `POST /wallet-accounts/me` | OWNER | Create own wallet account |
| `PUT /wallet-accounts/me` | OWNER | Update own wallet account |
| `DELETE /wallet-accounts/me` | OWNER | Delete own wallet account |
| `GET /wallet-accounts/platform` | ADMIN | Platform (admin) receiving account |
| `POST /wallet-accounts/platform` | ADMIN | Create platform account (409 if exists) |
| `PUT /wallet-accounts/platform` | ADMIN | Update platform account |
| `DELETE /wallet-accounts/platform` | ADMIN | Delete platform account |
| `GET /wallet-accounts` | ADMIN | List all wallet accounts |

### 7.15 Wallet payment callback — `/wallet-payment` (public)

| Method & path | Description |
|---|---|
| `GET /wallet-payment/callback?reference=&order_reference=&app=&status=&message=` | Browser redirect target after the wallet hosted page; verifies payment server-to-server, finalizes locally, then 303-redirects the browser to the matching frontend `/wallet-payment/result` page |

### 7.16 Misc

| Path | Description |
|---|---|
| `/` | Health/info (`{"success": true, …}`) |
| `/health` | Liveness check |
| `/docs`, `/redoc`, `/openapi.json` | OpenAPI docs |

---

## 8. Core Business Flows

### 8.1 Customer booking + wallet payment

```
Customer registers (OTP) → logs in → adds a Car
  → browses Parking Lots → picks Floor/Slot → sets start/end time
  → POST /parking-sessions/book        → PENDING session + estimated fee
  → POST /parking-sessions/{id}/pay/initiate
        → parking API calls wallet POST /api/external/payments/initiate
        → wallet sends OTP to customer phone, returns payment_reference + payment_url
  → customer redirected to wallet hosted page (payment_url)
        → enters OTP + PIN on the wallet page
  → wallet redirects browser → GET /api/v1/wallet-payment/callback
        → parking API re-verifies status with wallet (GET /external/payments/{ref})
        → session becomes ACTIVE
        → browser redirected to customer app /wallet-payment/result?status=completed
  → (optional) customer finishes session early via PATCH /parking-sessions/{id}/finish
        → fee recalculated to exit time, slot → AVAILABLE, session → FINISHED
```

Alternative: a customer can confirm directly with OTP + PIN collected in-app via
`POST /parking-sessions/{id}/pay/confirm` (backwards-compatible path).

### 8.2 Owner subscription + wallet payment

```
Owner registers (OTP) → logs in → browses Packages
  → POST /subscriptions/purchase          → PENDING subscription
  → POST /subscriptions/{id}/pay/initiate → wallet initiate (receiver = platform account)
  → wallet hosted page (OTP + PIN)
  → callback → verify → subscription → ACTIVE, started_at/expires_at computed
  → browser redirected to management app /wallet-payment/result
```

Renewal (`POST /subscriptions/renew`) creates a new PENDING subscription; when paid it
**extends from the previous expiry** and expires the previous ACTIVE subscription.

### 8.3 Payment lifecycle

- A payment record is created in `PENDING` when the wallet initiate succeeds.
- `amount` is the requested amount; `fee` and `total` are echoed back from the wallet
  (the wallet computes its transfer fee). `total = amount + fee`.
- A **unique** parking-side reference `PP-<10 hex>` is sent as `order_reference`.
- Completion is applied by `PaymentService._finalize`:
  - session payment → PENDING session becomes **ACTIVE**;
  - subscription payment → PENDING subscription becomes **ACTIVE** (period computed).
- Only one pending payment is kept per session/subscription; re-initiating returns the
  existing pending payment.

---

## 9. Digital Wallet Integration

The parking API integrates with an external **Digital Wallet Backend** (Laravel app,
this monorepo's sibling project `digital-wallet-management-system/digital-wallet-backend-api`)
through its **external system API**.

### 9.1 Contract (wallet side)

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/external/payments/initiate` | POST | `X-API-Key` | Create a pending external payment; send OTP to customer phone |
| `/api/external/payments/confirm` | POST | `X-API-Key` | Verify OTP + PIN and complete the transfer |
| `/api/external/payments/{reference}` | GET | `X-API-Key` | Poll payment status |

- Authentication is a `sha256` hash of the API key matched against the wallet's
  `external_systems` table (`EnsureExternalApi` middleware). Inactive systems → **401**.
- The wallet only accepts a payment if the external system is **linked to an active agent**
  (the money lands in that agent's wallet) and the customer exists as an active wallet
  customer.

### 9.2 How the parking API supplies credentials

The parking API stores one wallet credential per **receiving account** in the
`wallet_accounts` table:

- **Platform account** (`owner_id = NULL`) — receives **subscription fees**. Configured by
  an ADMIN via `/wallet-accounts/platform`.
- **Owner account** (per owner) — receives **session fees**. Configured by each OWNER via
  `/wallet-accounts/me`.

The `api_key` in a wallet account must be the `X-API-Key` of an external system registered
in the wallet backend. Setup steps:

1. In the wallet backend, an agent creates an **External System** and generates an API key
   (e.g. `sk_live_…`). The wallet stores only the sha256 hash.
2. Copy that key into the parking API wallet account (platform or owner).
3. Payments now use that key; the money flows to the agent's wallet that owns the external
   system.

> Troubleshooting tip: a **401 Unauthorized** from the wallet almost always means the
> `X-API-Key` sent by the parking API does not match an *active* `external_systems` row in
> the wallet database (missing, rotated, or deactivated key).

### 9.3 Callback & redirect chain

- Initiate requests include `redirect_url` → `{WALLET_REDIRECT_BASE_URL}/api/v1/wallet-payment/callback?app=customer|management`.
- After OTP/PIN on the wallet page, the browser hits that callback with `reference`,
  `order_reference`, `status`, `message`.
- The callback re-verifies via the wallet GET status endpoint, then 303-redirects to the
  frontend result page:
  - session payment → `{CUSTOMER_APP_URL}/wallet-payment/result`
  - subscription payment → `{MANAGEMENT_APP_URL}/wallet-payment/result`

Relevant env vars: `WALLET_API_BASE_URL`, `WALLET_REDIRECT_BASE_URL`,
`CUSTOMER_APP_URL`, `MANAGEMENT_APP_URL`, `WALLET_REFERENCE_PREFIX`.

---

## 10. Business Rules & Constraints

### 10.1 Booking (customer)

- Only `CUSTOMER` can book; the car must belong to the customer.
- `start_time` must be in the future; `end_time` must be after `start_time`.
- A car cannot have another ACTIVE/PENDING session overlapping the requested window.
- A slot cannot host a session overlapping an existing ACTIVE/PENDING session with a
  **2-hour buffer** before and after.
- Fee = `⌈duration_minutes / 60⌉ × rate_per_hour`, minimum 1 minute billed.
- Rate resolution: slot → floor → lot `rate_per_hour` → `DEFAULT_HOURLY_RATE` (1000 MMK).
- Slot status is **not** changed at booking; it changes only when finishing a session.

### 10.2 Sessions

- PENDING → ACTIVE (payment) → FINISHED (finish) is the only valid progression.
- Finishing recalculates duration/fee at exit time using the lot rate (or an optional
  `rate_per_hour` override passed by staff), frees the slot, and marks the session FINISHED.
- Customers may only finish their own sessions; staff/owner/admin can finish any.

### 10.3 Subscriptions & packages

- Packages define `price`, `duration_days`, `max_lots`, `max_staff`, `is_active`.
- Only active packages can be purchased.
- `max_lots` is enforced on lot creation for non-admin owners (403 when exceeded).
- `max_staff` is currently **not** enforced (see Known Limitations).
- Renewal extends from the current ACTIVE subscription's expiry and expires the previous one.

### 10.4 Payments

- Wallet receiver must exist and be `is_active`, otherwise payment initiation is rejected.
- A phone number is required for the payer (customer profile `phone` or explicit
  `wallet_phone`).
- Payments are finalized only after wallet-side confirmation or server-verified callback.

### 10.5 Auth & security

- Passwords hashed with **bcrypt**.
- JWT HS256; access token 30 min (default); refresh token 7 days (default).
- Refresh tokens are **rotated** and old `jti` values blacklisted (persisted, purged at
  startup and on expiry).
- RBAC enforced server-side on every endpoint.

---

## 11. Frontend Applications

### 11.1 Management portal — `smart-parking-management` (port 5173)

Audience: **ADMIN**, **OWNER**, **STAFF**. Customers are rejected at the login screen.

| Area | Routes | Purpose |
|---|---|---|
| Auth | `/login`, `/register-owner`, `/forgot-password`, `/verify-email` | Login, owner signup, OTP verification |
| ADMIN | `/admin/dashboard`, `/admin/lots`, `/admin/owners`, `/admin/users`, `/admin/packages`, `/admin/subscriptions`, `/admin/payments` | Global management + analytics |
| OWNER | `/owner/dashboard`, `/owner/subscription`, `/owner/wallet`, `/owner/lots`, `/owner/staff`, `/owner/sessions` | Manage own business + subscription + wallet account |
| STAFF | `/staff/dashboard`, `/staff/slots`, `/staff/sessions` | Monitor slots and sessions |
| Shared | `/profile`, `/map`, `/lot-3d`, `/slot-detail`, `/wallet-payment/result`, `/unauthorized`, `/not-found` | Cross-role views |

Notable features:

- **Auth:** Zustand-persisted tokens; axios interceptor does single-flight refresh-token
  rotation and force-logout on failure.
- **Dashboards:** recharts pie/bar charts (owner/staff compare available vs occupied slots;
  admin shows owner/staff/customer counts and revenue).
- **3D lot views** (`/lot-3d`, `/slot-detail`) rendered with react-three-fiber; WebGL
  fallback included.
- **Map view** embeds Google Maps from `google_map_url` with a query fallback.
- MMK pricing formatting everywhere.

### 11.2 Customer app — `smart-parking-customer` (port 5174)

Audience: **CUSTOMER**.

| Route | Purpose |
|---|---|
| `/login`, `/register`, `/verify-email` | Auth + OTP flow |
| `/dashboard` | Lot search + active session banner + live location tracking |
| `/parking/:id` | Booking wizard: select → schedule → pay → success (with overlap guard) |
| `/cars` | Car management |
| `/sessions` | Session history (all/active/finished) with live timers |
| `/profile` | Profile |
| `/lot-3d/:lotId`, `/slot-3d/:slotId` | Interactive 3D lot/slot views |
| `/wallet-payment/result` | Payment result landing page |

Notable features:

- **Booking wizard** checks for overlapping PENDING/ACTIVE bookings for the selected car
  (`findCarSessionOverlap`).
- **Wallet payment** via `pay/initiate` + `pay/confirm` (OTP + PIN) with hosted-page
  redirect.
- **Parking tracking** resolves the slot's lat/lng, else the lot map URL, else a Google Maps
  search for "lot name + slot number".
- Inline route guards (protected/public/auth-only) in `App.tsx`.

### 11.3 Shared frontend conventions

- Axios `client.ts` (same pattern in both apps): Bearer injection + single-flight refresh.
- Zustand `persist` in localStorage (management key `smart-parking-auth`, customer key
  `smart-parking-customer-auth`).
- Tailwind v4 via `@tailwindcss/vite`; theme colors in `src/index.css` (primary brand
  `#FFCC00`); `next-themes` for dark mode.
- Vite plugin `patchThree()` silences Three.js deprecation warnings; `three` is excluded
  from `optimizeDeps`.

---

## 12. Configuration & Environment Variables

### 12.1 Backend `.env` (see `smart-parking-api/.env.example`)

| Variable | Default | Description |
|---|---|---|
| `APP_NAME` | `Smart Parking Lot Management System` | App title |
| `APP_ENV` / `DEBUG` | `development` / `True` | Environment + debug |
| `API_V1_PREFIX` | `/api/v1` | API prefix |
| `DATABASE_URL` | `sqlite:///./smart_parking.db` | SQLAlchemy connection string (Postgres in Docker) |
| `SECRET_KEY` | `change-this-secret-key-in-production` | JWT signing key |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token lifetime |
| `BACKEND_CORS_ORIGINS` | `["http://localhost:3000","http://localhost:8000","http://localhost:5173"]` | CORS allow-list (JSON) |
| `DEFAULT_PAGE_SIZE` | `10` | Default pagination size |
| `MAX_PAGE_SIZE` | `100` | Pagination cap |
| `DEFAULT_HOURLY_RATE` | `1000.0` | Fallback hourly rate (MMK) |
| `DEFAULT_ADMIN_*` | — | Seed admin identity/password |
| `SMTP_*` | gmail defaults | SMTP for OTP email |
| `OTP_EXPIRE_MINUTES` | `10` | OTP validity |
| `OTP_LENGTH` | `6` | OTP code length |
| `WALLET_API_BASE_URL` | `` | Wallet backend base URL (e.g. `http://localhost:8001`) |
| `WALLET_REFERENCE_PREFIX` | `PP` | Parking-side payment reference prefix |
| `WALLET_REDIRECT_BASE_URL` | `http://localhost:8000` | Public URL of this API for the wallet callback |
| `CUSTOMER_APP_URL` | `http://localhost:5174` | Customer frontend base |
| `MANAGEMENT_APP_URL` | `http://localhost:5173` | Management frontend base |

### 12.2 Frontend `.env`

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend base URL (default `http://localhost:8000/api/v1`; production `https://smart-parking-api.onrender.com/api/v1`) |

---

## 13. Deployment

### 13.1 Docker Compose (API + PostgreSQL)

`docker-compose.yml` at the repo root runs two services:

- **db** — `postgres:16-alpine` (volume `pgdata`, port 5432)
- **api** — the FastAPI image; startup command runs `alembic upgrade head`,
  `python -m scripts.seed`, then `uvicorn`.

```bash
docker compose up --build -d
docker compose logs -f api
curl http://localhost:8000/health
```

In compose, the API reaches the wallet backend at `http://host.docker.internal:8001`
(`WALLET_API_BASE_URL`), and its public redirect base is `http://localhost:8000`
(`WALLET_REDIRECT_BASE_URL`). See `DOCKER.md` for manual `docker run` instructions.

### 13.2 Frontends (Vercel)

Both frontends ship `vercel.json` with a single SPA rewrite
(`{"source": "/(.*)", "destination": "/index.html"}`). Set `VITE_API_BASE_URL` to the
deployed API URL.

### 13.3 Production checklist

- Change `SECRET_KEY` and the default admin password.
- Point `DATABASE_URL` at a managed PostgreSQL (not SQLite).
- Configure SMTP so OTP emails are actually delivered.
- Register the parking system as an external system in the wallet backend and store the
  generated API key in the appropriate `wallet_accounts` rows.
- Set `WALLET_REDIRECT_BASE_URL` to a publicly reachable URL of this API.

---

## 14. Testing

Backend tests live in `smart-parking-api/tests/` (pytest). Run with:

```bash
cd smart-parking-api
pytest -q
```

Test coverage areas include:

| File | Coverage |
|---|---|
| `test_auth.py` | Register, login, OTP, token refresh/rotation, logout, RBAC |
| `test_rbac.py` | Role-based access control across endpoints |
| `test_parking_flow.py` | Lot/floor/slot CRUD, session booking, finish |
| `test_overlap_booking.py` | Slot/car overlap + buffer enforcement |
| `test_wallet_payment_flow.py` | Wallet account management, session/subscription payment flows |
| `test_hosted_payment_callback.py` | Wallet callback verification + redirects |
| `test_subscription_flow.py` | Purchase, renewal, activation, gating |

Tests use a fake wallet client (`FakeWalletClient`) injected via FastAPI dependency
overrides, so no live wallet backend is required.

---

## 15. Known Limitations

- **`POST /parking-sessions/start` is a stub** — it always returns 403. Only the customer
  `/book` flow creates sessions (by design), but the staff/direct-start endpoint is not yet
  implemented.
- **`max_staff` is not enforced** — package `max_staff` limits are not checked when
  creating staff (only `max_lots` is enforced).
- **`.env.example` mismatch** — `WALLET_REDIRECT_BASE_URL` is set to `http://localhost:8001`
  there, while Docker Compose correctly overrides it to `http://localhost:8000`. For a
  browser-visible callback the value must point to the parking API, not the wallet.
- **DB drift risk** — the checked-in `smart_parking.db` (SQLite) is at migration
  `c8a1d3f5b9e2` while the head is `d4e2f6a8c1b0` (`payments.wallet_payment_url`). Run
  `alembic upgrade head` (Compose does this automatically) before using wallet payments.
- **Revenue metric** is computed from FINISHED session fees only; subscription revenue is
  not aggregated into dashboards.
- **Email delivery** falls back to logging OTPs when SMTP is unconfigured (development
  convenience, not production-safe).
- **Wallet coordination** is external: the parking API trusts the wallet for OTP/PIN
  handling; if the wallet's `external_systems` data is out of sync (key rotated/deactivated),
  payments fail with 401.
