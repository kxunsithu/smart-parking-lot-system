# Design Patterns in Smart Parking System

**Architecture:** Frontend (React) → Backend API (FastAPI) → Database (PostgreSQL)

| # | Pattern | Description |
|---|---------|-------------|
| 1 | **Layered Architecture** | Code is split into 4 layers: API → Service → Repository → Model. Each layer has one job. |
| 2 | **Dependency Injection** | Framework automatically provides DB and User objects to endpoints. No manual creation. |
| 3 | **Singleton** | App config object is created once and shared everywhere. |
| 4 | **Repository** | All database code is in one base class. Every model (Car, User, Session) reuses it. |
| 5 | **Adapter** | External systems (Wallet API, Email) are wrapped in simple classes. Service layer uses only these wrappers. |
| 6 | **Observer** | Frontend state (Login, Token) in Zustand store. Components auto-update when state changes. |
| 7 | **Middleware** | Every request passes through a chain: Logging → Error Handling → Auth. |

**Total: 7 patterns**
