# Smart Parking Lot Management System — Frontend

A modern, responsive React + TypeScript frontend for the Smart Parking Lot Management System, with
dedicated dashboards for System Admins, Parking Owners, Parking Staff, and Customers.

## Tech Stack

- **React 19 + TypeScript + Vite**
- **Tailwind CSS v4** (via `@tailwindcss/vite`)
- **shadcn/ui** (Base UI-based "base-nova" style) for accessible, composable UI primitives
- **React Router v7** for routing and role-based route guards
- **TanStack Query v5** for server-state data fetching, caching, and mutations
- **Axios** with interceptors for JWT auth + silent token refresh
- **React Hook Form + Zod** for form state and validation
- **Zustand** (persisted) for auth/session state
- **Recharts** for dashboard analytics
- **lucide-react** icons, **sonner** for toast notifications

Primary brand color: **`#FFCC00`** (wired into shadcn's `--primary` CSS variable in `src/index.css`,
used consistently across buttons, links, active nav states, and charts).

## Getting Started

### 1. Install dependencies

```bash
cd smart-parking-frontend
npm install
```

### 2. Configure the API URL

```bash
cp .env.example .env
```

By default `VITE_API_BASE_URL=http://localhost:8000/api/v1`, matching the `smart-parking-api`
backend's default port. Update it if your backend runs elsewhere.

### 3. Make sure the backend is running and CORS allows this app

The backend's `.env` (`smart-parking-api/.env`) `BACKEND_CORS_ORIGINS` must include this app's dev
origin, e.g. `["http://localhost:5173", ...]` (already configured in the backend's `.env.example`).

### 4. Run the dev server

```bash
npm run dev
```

Visit http://localhost:5173. Log in with the backend's seeded admin account
(`admin@smartparking.com` / `Admin@12345` by default — see the backend README) or register a new
customer account from the UI.

### 5. Build for production

```bash
npm run build   # type-checks with tsc -b, then builds with vite
npm run preview # preview the production build locally
```

## Architecture

```
src/
├── api/            # Typed axios wrappers per backend resource (auth, users, parkingLots, ...)
├── components/
│   ├── ui/          # shadcn/ui primitives (button, card, table, dialog, ...)
│   ├── common/       # App-level reusable components (PageHeader, StatCard, DataPagination, ...)
│   ├── layout/       # AppSidebar, AppHeader, DashboardLayout, AuthLayout
│   └── theme/        # Light/dark theme provider + toggle
├── hooks/           # useAuth, usePaginationState, useDebounce
├── lib/             # queryClient, cn() utility, asChild shim, shadcn utils
├── pages/
│   ├── auth/         # Login, Register, Forgot Password
│   ├── admin/         # Admin dashboard, Owners management, Users management
│   ├── owner/         # Owner dashboard, Lots/Floors/Slots, Staff, Reservations, Sessions, Payments
│   ├── staff/         # Staff dashboard, Slot board (check-in/out), Reservations, Sessions
│   ├── customer/      # Customer dashboard, Search lots, Lot detail/reserve, Vehicles, Reservations, Payments
│   └── shared/        # Profile/settings, 404, 403 (Unauthorized)
├── routes/          # AppRouter (route tree) + ProtectedRoute/PublicOnlyRoute guards
├── stores/          # Zustand auth store (persisted access/refresh tokens + user)
├── types/           # TypeScript interfaces mirroring the backend's Pydantic schemas
├── utils/           # formatters, status→badge-tone mapping, role→nav-item config
├── App.tsx
└── main.tsx
```

### Key design decisions

- **Response envelope aware**: every backend response follows `{ success, message, data, meta? }`;
  the `api/*` modules unwrap `data` (and `meta` for paginated lists) so pages work with plain typed
  objects/arrays.
- **Auth**: `stores/authStore.ts` persists the access/refresh token pair and current user to
  `localStorage`. `api/client.ts`'s axios interceptor attaches the bearer token to every request and
  automatically retries once with a refreshed token on a `401`, redirecting to `/login` only if the
  refresh itself fails.
- **RBAC in the UI**: `routes/ProtectedRoute.tsx` guards routes both for authentication and for an
  `allowedRoles` allow-list; `utils/navConfig.ts` drives the sidebar navigation per role so each user
  only ever sees links relevant to their role.
- **Consistent CRUD pattern**: list pages combine `usePaginationState` (search/page state) +
  TanStack Query + a shadcn `Table`/card grid + a create/edit `Dialog` (React Hook Form + Zod) +
  `ConfirmDialog` for destructive actions. See `pages/admin/OwnersPage.tsx` as the canonical example.
- **No shadcn `form.tsx`**: this project uses a lightweight `components/common/FormField.tsx` wrapper
  around `react-hook-form`'s `register()` instead of shadcn's `Form`/`FormField` primitives.

## Known Backend Limitations Reflected in the UI

A few backend list endpoints are not scoped by parking lot ownership (only by role or an explicit
`customer_id`/`vehicle_id` filter), which the UI is transparent about with small notes on the
affected pages ("Showing all reservations/sessions visible to your role"):

- `GET /reservations` and `GET /parking-sessions` have no lot-scoping filter, so Owners/Staff/Admins
  see all platform reservations/sessions rather than only their own lot's.
- There is no `/dashboard/customer` endpoint — the Customer dashboard is assembled client-side from
  the customer's own vehicles/reservations/payments.
- There is no self-service "forgot password" email flow on the backend — the Forgot Password page
  explains this and points users to `Profile → Change Password` (when logged in) or their
  administrator.

## Linting

```bash
npm run lint
```
