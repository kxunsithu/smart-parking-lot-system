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

# Seed default roles + System Admin account
python -m scripts.seed

# Start the API server
uvicorn app.main:app --reload
```

The API will be available at:
- **Swagger UI**: http://127.0.0.1:8000/docs
- **ReDoc**: http://127.0.0.1:8000/redoc
- **Health check**: http://127.0.0.1:8000/health

Default admin credentials:
- Email: `admin@smartparking.com`
- Password: `Admin@12345`

**Important**: Change the default admin password after first login.

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

## User Roles

| Role       | Capabilities |
|------------|--------------|
| `ADMIN`    | Manage owners, users, roles; view all resources & reports |
| `OWNER`    | Manage own lots, floors, slots, staff; view own reservations/sessions/revenue |
| `STAFF`    | Handle vehicle entry/exit, confirm reservations, update slot status, manage sessions |
| `CUSTOMER` | Register, manage own profile & vehicles, search lots, reserve slots, pay |

## API Documentation

For detailed API documentation, see:
- Backend README: [smart-parking-api/README.md](smart-parking-api/README.md)
- Postman Collection: [smart-parking-api/Smart_Parking_API.postman_collection.json](smart-parking-api/Smart_Parking_API.postman_collection.json)

## Frontend Documentation

For detailed frontend documentation, see:
- Frontend README: [smart-parking-frontend/README.md](smart-parking-frontend/README.md)

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
