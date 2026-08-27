# Design Patterns အသုံးပြုမှု ရှင်းလင်းချက် (OODD Subject)

## နိဒါန်း

ဤ project တွင် **Smart Parking Lot Management System** ၏ backend (Python/FastAPI) နှင့် frontend (React/TypeScript) နှစ်ဖက်စလုံး၌ Object-Oriented Design Patterns များကို အသုံးပြုထားပါသည်။ အောက်ပါ pattern တစ်ခုချင်းစီကို ရှင်းပြထားပါသည်။

---

## ၁။ Layered Architecture (အလွှာလိုက် ဗိသုကာ)

### ရှင်းလင်းချက်
Project တစ်ခုလုံးကို အလွှာ ၄ ခု ခွဲထားသည်:

```
┌────────────────────────────────────────┐
│  ၁. API Layer (app/api/v1/)       │  ← HTTP Request/Response ကိုင်တွယ်ခြင်း
├────────────────────────────────────────┤
│  ၂. Service Layer (app/services/)   │  ← Business Logic (လုပ်ငန်းဆိုင်ရာ ယုတ္တိ)
├────────────────────────────────────────┤
│  ၃. Repository Layer (app/repos/)  │  ← Database နှင့် ဆက်သွယ်ခြင်း
├────────────────────────────────────────┤
│  ၄. Model Layer (app/models/)      │  ← Data Structure (SQLAlchemy Models)
└────────────────────────────────────────┘
```

### ဥပမာ Code
```python
# API Layer - sanitized: request လက်ခံပြီး service သို့ ပို့ပေးသည်
@app.post("/cars")
def create_car(payload: CarCreate, db=Depends(get_db)):
    car = CarService(db).create_car(payload, current_user)
    return {"success": True, "data": car}

# Service Layer - business logic လုပ်သည်
class CarService:
    def create_car(self, payload, current_user):
        # validation, business rules တွေစစ်သည်

# Repository Layer - DB နဲ့ ဆက်သွယ်သည်
class CarRepository(BaseRepository[Car]):
    def get_by_user(self, user_id):
        return self.db.scalars(select(Car).where(Car.user_id == user_id)).all()
```

### အကျိုးကျေးဇူး
- **စနစ်ရှုပ်ထွေးမှု လျော့ကျစေသည်** — အလွှာတစ်ခုချင်းစီမှာ တာဝန်ယူမှု တစ်ခုစီရှိသည်
- **Maintenance လွယ်ကူစေသည်** — business logic ပြောင်းလိုလျှင် API code ကို မထိဘဲ Service ကိုပဲ ပြောင်းနိုင်သည်
- **Testing လွယ်ကူစေသည်** — အလွှာတစ်ခုချင်းစီကို သီးခြား test လုပ်နိုင်သည်

---

## ၂။ Repository Pattern

### ရှင်းလင်းချက်
Database access logic များကို Repository class များထဲတွင် သီးခြားထားသည်။ Service layer သည် SQL ကို တိုက်ရိုက်မရေးဘဲ Repository method များကိုသာ ခေါ်သုံးသည်။

### Code Location
- **Base**: `smart-parking-api/app/repositories/base.py`
- **Concrete**: `smart-parking-api/app/repositories/car_repository.py`, `user_repository.py`, `parking_session_repository.py` စသဖြင့်

### ဥပမာ Code
```python
# base.py - Generic repository
class BaseRepository(Generic[ModelType]):
    model: Type[ModelType]

    def __init__(self, db: Session):
        self.db = db

    def get(self, id_: int):
        return self.db.get(self.model, id_)

    def get_all(self):
        return list(self.db.scalars(select(self.model)).all())

    def create(self, obj):
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def paginate(self, stmt, page, limit, sort_by, order, search, search_fields):
        # pagination, search, sort logic အားလုံး ဒီမှာ ရှိသည်
        ...

# Concrete repository - model အလိုက် extend လုပ်သည်
class CarRepository(BaseRepository[Car]):
    def get_by_user(self, user_id):
        return self.db.scalars(select(Car).where(Car.user_id == user_id)).all()
```

### အကျိုးကျေးဇူး
- **Data access logic ကို business logic နှင့် ခွဲထားသည်**
- **Code reuse** — CRUD method တွေကိုမှန်မှန် rewrite လုပ်စရာမလို
- **Testing လွယ်ကူ** — Database ပြောင်းလိုလျှင် Repository ကိုပဲ ပြောင်းရသည်

---

## ၃။ Dependency Injection (DI)

### ရှင်းလင်းချက်
FastAPI ၏ built-in DI system ကို အသုံးပြုထားသည်။ Object များကို manually create လုပ်ရန် မလိုဘဲ Framework က automatically inject လုပ်ပေးသည်။

### Code Location
- `smart-parking-api/app/dependencies/auth.py`
- `smart-parking-api/app/database/session.py`
- API endpoints အားလုံးတွင် `Depends(get_db)`, `Depends(get_current_user)`

### ဥပမာ Code
```python
# DB session inject လုပ်သည်
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Endpoint တွင် inject လုပ်သုံးသည်
@app.get("/cars")
def list_cars(
    db: Session = Depends(get_db),                    # DB session inject
    current_user: User = Depends(get_current_user),      # User object inject
):
    return CarService(db).list_cars(current_user)

# Factory design - နားလည်ရန်
def require_roles(*roles: RoleName):
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.name not in {r.value for r in roles}:
            raise ForbiddenException("No permission")
        return current_user
    return dependency
```

### အကျိုးကျေးဇူး
- **Decoupling** — class များသည် dependency အပေါ်မှီခိုမှု နည်းသည်
- **Testing လွယ်ကူ** — test လုပ်ချိန်မှာ mock object inject လုပ်နိုင်သည်
- **Code ရှင်းလင်းသည်** — DB session, user object တွေကို နေရာတိုင်း manually create လုပ်စရာမလို

---

## ၄။ Singleton Pattern

### ရှင်းလင်းချက်
Application settings object တစ်ခုတည်းကိုသာ တစ်ကြိမ်တည်း create လုပ်ပြီး app တစ်ခုလုံးက share လုပ်သုံးသည်။

### Code Location
- `smart-parking-api/app/config/settings.py:89-94`

### ဥပမာ Code
```python
@lru_cache
def get_settings() -> Settings:
    return Settings()

# App တစ်ခုလုံးမှာ ဒီ object တစ်ခုတည်းကိုပဲ သုံးသည်
settings = get_settings()
```

### အသုံးပြုပုံ ဥပမာ
```python
# ဘယ်နေရာမှာမဆို settings object တစ်ခုတည်းကိုပဲ ရသည်
# email_service.py
class EmailService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST      # ← singleton ကနေ
        self.smtp_port = settings.SMTP_PORT

# wallet_payment_client.py
def get_wallet_client() -> WalletPaymentClient:
    return WalletPaymentClient(settings.WALLET_API_BASE_URL)  # ← singleton ကနေ
```

### အကျိုးကျေးဇူး
- **Resource ကုန်သက်သာသည်** — object တစ်ခုတည်းကိုပဲ reuse လုပ်သည်
- **State ညီညွတ်သည်** — app တစ်ခုလုံးမှာ setting အတူတူဖြစ်သည်
- **Performance** — object ခဏခဏ create/initialize လုပ်စရာမလို

---

## ၅။ Template Method Pattern

### ရှင်းလင်းချက်
Base class ထဲမှာ common algorithm (skeleton) ကို define လုပ်ပြီး concrete class များက အဲ့ဒီ skeleton ကို လိုအပ်သလို customize လုပ်သည်။

### Code Location
- `smart-parking-api/app/repositories/base.py`
- Concrete: `UserRepository`, `CarRepository`, `ParkingSessionRepository`, `ParkingFloorRepository` စသဖြင့်

### ဥပမာ Code
```python
# Base class - common template
class BaseRepository(Generic[ModelType]):
    def paginate(self, stmt, page, limit, sort_by, order, search, search_fields):
        # 1. search filter လုပ်ရန်
        # 2. count ရေတွက်ရန်
        # 3. sort လုပ်ရန်
        # 4. limit/offset (pagination)
        # 5. items ရယူရန်
        ... # ← ဒီ algorithm က model အားလုံးမှာ အတူတူ

# Subclass - model-specific logic သာ addition လုပ်ရသည်
class UserRepository(BaseRepository[User]):
    def get_by_email(self, email):
        return self.db.scalar(select(User).where(User.email == email))
```

### ရလဒ်
```
BaseRepository          →  Common CRUD + pagination + search logic
CarRepository         →  get_by_user() သာ addition
UserRepository       →  get_by_email(), get_with_role() သာ addition
ParkingSessionRepo  →  session-specific queries သာ addition
```

### အကျိုးကျေးဇူး
- **Code reuse** — CRUD logic ကို ဘယ်မှာမှ duplicate မလို
- **Consistency** — model တိုင်းမှာ method behavior အတူတူဖြစ်သည်

---

## ၆။ Adapter Pattern

### ရှင်းလင်းချက်
External system (Digital Wallet API) နှင့် Email (SMTP) တို့ကဲ့သို့သော third-party system များကို wrapper/adapter class များဖြင့် ကာရံထားသည်။ Service layer သည် adapter ရဲ့ simple interface ကိုသာ သိရသည် — external system ရဲ့ complexity ကို မသိရပါ။

### Code Location
- **Wallet Adapter**: `smart-parking-api/app/services/wallet_payment_client.py`
- **Email Adapter**: `smart-parking-api/app/services/email_service.py`

### ဥပမာ Code
```python
# Adapter - external wallet API ကို wrap လုပ်ထားသည်
class WalletPaymentClient:
    def __init__(self, base_url: str):
        self.base_url = base_url

    def initiate(self, customer_phone, amount, order_reference, ...):
        # External API URL, headers, HTTP client, timeout အားလုံး ဒီမှာ ဝှက်ထားသည်
        return self._post("/api/external/payments/initiate", payload, api_key)

    def confirm(self, payment_reference, otp_code, pin, ...):
        return self._post("/api/external/payments/confirm", payload, api_key)

    def get_payment_status(self, payment_reference, api_key=None):
        return self._get(f"/api/external/payments/{payment_reference}", api_key)

# Service က adapter interface ကိုသာသုံးသည်
class PaymentService:
    def __init__(self, db: Session, wallet_client: WalletPaymentClient):
        self.wallet_client = wallet_client  # ← Adapter inject လုပ်ထားသည်

    def initiate_session_payment(self, ...):
        result = self.wallet_client.initiate(...)  # ← simple interface သာသုံးသည်

# Email adapter
class EmailService:
    async def send_otp_email(self, to_email: str, otp_code: str) -> bool:
        # SMTP configuration, TLS, timeouts အားလုံး ဒီမှာ ဝှက်ထားသည်
        ...
```

### ရရှိသော အကျိုးကျေးဇူး
- **External system ပြောင်းလိုလျှင်** Adapter class ကိုပဲ ပြောင်းရမည် — Service code ကို မထိရပါ
- **Testing** — external API ကို mock လုပ်ပြီး test လုပ်နိုင်သည်

---

## ၇။ Observer Pattern (Frontend - Zustand)

### ရှင်းလင်းချက်
Frontend (React) တွင် Zustand store ကို observable state အဖြစ် အသုံးပြုသည်။ State ပြောင်းလဲသောအခါ store ကို observe လုပ်ထားသော components/tasks အားလုံးကို အလိုအလျောက် notify လုပ်သည်။

### Code Location
- `smart-parking-management/src/stores/authStore.ts`
- `smart-parking-customer/src/stores/authStore.ts`

### ဥပမာ Code
```ts
// Store = Observable state
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: "smart-parking-auth" }
  )
)

// Any component/task can "observe" the store
// AppHeader.tsx - user state ပြောင်းလိုက်တာနဲ့ အလိုအလျောက် re-render
const { user, logout } = useAuth()

// Axios interceptor (Observer ကဲ့သို့)
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken  // store ကို observe/read
  if (token) config.headers.set("Authorization", `Bearer ${token}`)
  return config
})
```

### အလုပ်လုပ်ပုံ
```
Component A (Navbar)  ──┐
Component B (Profile)  ───┼──► observe ──► Zustand Store ──► State ပြောင်းသည်နှင့်
Interceptor (axios)    ──┘                      │
                                                 ▼
                                    Components အားလုံး auto-update!

Login လုပ်သောအခါ:
setTokens(token)  →  Store state ပြောင်း  →  Navbar, Profile, API calls အားလုံး react
```

### အကျိုးကျေးဇူး
- **State management ရှင်းလင်းသည်** — global state တစ်နေရာတည်းမှာ ထားသည်
- **Loose coupling** — component များသည် state ပြောင်းလဲမှုကို ကြိုမသိ၊ observer အနေနဲ့ react လုပ်သည်

---

## ၈။ Middleware Pattern (Chain of Responsibility)

### ရှင်းလင်းချက်
Request တိုင်းကို chain အလိုက် pass လုပ်သည်။ Request → Middleware 1 → Middleware 2 → Route → Middleware 1 → Response

### Code Location
- `smart-parking-api/app/middleware/logging_middleware.py`
- `smart-parking-api/app/middleware/exception_handlers.py`

### ဥပမာ Code
```python
# Request Logging Middleware (Interceptor)
class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        start = time.perf_counter()
        response = await call_next(request)          # ← next middleware/route သို့ pass
        duration = time.perf_counter() - start
        logger.info("%s %s -> %s (%.2fms)", request.method, request.url.path, response.status_code)
        return response
```

### Request Flow
```
 Client ──► CORS Middleware ──► Logging Middleware ──► Exception Handlers ──► Route
 Client ◄── CORS ◄── Logging ◄── Exception Handlers ◄── Route Response
```

### ဥပမာ — Exception Handler များ
```python
def register_exception_handlers(app: FastAPI):
    @app.exception_handler(AppException)      # Custom exception များ
    @app.exception_handler(HTTPException)    # FastAPI/Starlette exceptions
    @app.exception_handler(Exception)        # Unknown errors → 500
```

### အကျိုးကျေးဇူး
- **Cross-cutting concerns** ကို business logic နဲ့ ခွဲထားသည်
- Request တိုင်းမှာ logging, CORS, error handling စသည် အလိုအလျောက် apply ဖြစ်သည်

---

## ၉။ DTO (Data Transfer Object) Pattern

### ရှင်းလင်းချက်
Database models (ORM) များကို client သို့ တိုက်ရိုက် expose မလုပ်ဘဲ DTO/Schema class များဖြင့် data ကို သီးခြား shape လုပ်ပေးသည်။

### Code Location
- `smart-parking-api/app/schemas/`

### ဥပမာ
```python
# Database Model (ORM)
class User(Base):
    id: int
    password_hash: str      # ← client ကို မပြသင့်ပါ
    email: str
    is_verified: bool

# DTO (Schema) — client ပြသရန် shape
class UserOut(BaseModel):
    id: int
    email: str
    name: str
    role: RoleOut
    # password_hash, is_verified တို့ မပါဝင်ပါ
```

### အကျိုးကျေးဇူး
- **Security** — sensitive data (password, token) ကို client သို့ မပို့ခြင်း
- **API contract ခိုင်မာသည်** — client မှာ ပြောင်းလဲမှုများလျှင် API ကို မထိပါ

---

## ၁၀။ Factory Method / Factory Function

### ရှင်းလင်းချက်
Object တစ်ခုကို create လုပ်ရန် dedicated function/method ကို အသုံးပြုသည်။

### Code Location
- `app/repositories/base.py` — `BaseRepository[ModelType]` (generic factory)
- `app/dependencies/auth.py` — `require_roles(*roles)` သည် dependency function တစ်ခုကို ထုတ်ပေးသည်
- `app/api/v1/wallet_account.py` — `get_wallet_client()` သည် adapter object ကို ထုတ်ပေးသည်
- Frontend — `apiClient()` သည် axios instance တစ်ခုကို create လုပ်ပေးသည်

### ဥပမာ
```python
# Factory function — Role-based dependency ထုတ်ပေးသည်
def require_roles(*roles: RoleName):
    allowed = {role.value for role in roles}
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.name not in allowed:
            raise ForbiddenException("No permission")
        return current_user
    return dependency

# တစ်နေရာတည်းမှာသာ သုံးသည်
current_user: User = Depends(require_roles(RoleName.ADMIN))
```

---

## အသုံးပြုထားသော Patterns အကျဉ်းချုပ်

| # | Pattern | Language/Layer | Location |
|---|---------|---------------|----------|
| ၁ | Layered Architecture | Backend | `app/api/`, `app/services/`, `app/repositories/` |
| ၂ | Repository | Backend | `app/repositories/base.py` |
| ၃ | Dependency Injection | Backend | FastAPI `Depends()`, `app/dependencies/` |
| ၄ | Singleton | Backend | `app/config/settings.py` — `@lru_cache` |
| ၅ | Template Method | Backend | `BaseRepository[T]` → concrete repos |
| ၆ | Adapter | Backend | `wallet_payment_client.py`, `email_service.py` |
| ၇ | Observer | Frontend | Zustand `authStore.ts`, axios interceptors |
| ၈ | Middleware (CoR) | Backend | `logging_middleware.py`, `exception_handlers.py` |
| ၉ | DTO | Backend | `app/schemas/` |
| ၁၀ | Factory | Backend | `require_roles()`, `get_wallet_client()` |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│            Frontend (React + Zustand)           │
│  ┌──────────┐   ┌──────────┐    ┌──────┐ │
│  │ Component │◄──┤  Store    │    │Router│ │   ← Observer Pattern
│  └──────────┘   │ (Observer)│    └──┬───┘ │
│  ┌──────────────────────────────────────┐ │      │
│  │  API Client + Interceptors        │◄─┘      │
│  └──────────────────────────────────────┘         │
└───────────────────┬─────────────────────────────┘
                    │ HTTP / JSON
┌───────────────────▼─────────────────────────────┐
│           Backend (FastAPI)                  │
│  ┌──────────────────────────────────────┐    │
│  │  Middleware (CoR)               │    │
│  │  API Routes (DI)               │    │
│  ├──────────────────────────────────────┤    │
│  │  Services (Business Logic)      │    │
│  │  ├── Adapters (Wallet/Email)│    │
│  │  ├── Settings (Singleton)    │    │
│  ├──────────────────────────────────────┤    │
│  │  Repositories (Template Method) │    │
│  ├──────────────────────────────────────┤    │
│  │  ORM Models (SQLAlchemy)     │    │
│  └──────────────────────────────────────┘    │
└───────────────────┬─────────────────────────────┘
                    │
              ┌─────▼─────┐
              │  PostgreSQL │
              └───────────┘
```
