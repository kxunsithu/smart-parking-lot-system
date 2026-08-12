# Features List

## 1. System Admin Features (smart-parking-management)

### 1.1 Authentication & Access Control
- [ ] Login
  - [ ] Email + password validation
  - [ ] Role validation (requires `ADMIN` role)
  - [ ] Invalid credentials error message
  - [ ] Redirect to `/admin/dashboard` after success
  - [ ] JWT token stored + admin profile loaded
- [ ] Auth Guard
  - [ ] Unauthenticated user redirected to login
  - [ ] Non-admin role blocked with access denied message
  - [ ] Logout clears token + profile → redirects to `/login`

### 1.2 Dashboard Layout
- [ ] Sidebar
  - [ ] Collapsible navigation sidebar
  - [ ] Brand logo + System Admin title display
  - [ ] Admin navigation menu items (Dashboard, Users, Packages, Subscriptions, Wallet Settings)
  - [ ] Active route highlight
  - [ ] User profile summary & logout button
- [ ] Header
  - [ ] Current page title + breadcrumb navigation
  - [ ] Profile avatar + quick profile dropdown

### 1.3 Admin Dashboard (/admin/dashboard)
- [ ] System Overview Stat Cards
  - [ ] Total Parking Owners count
  - [ ] Total Active Parking Lots count
  - [ ] System-wide Active Sessions count
  - [ ] Total Platform Revenue collected (MMK)
- [ ] Global Analytics & Charts
  - [ ] Subscription earnings overview (monthly trend)
  - [ ] System occupancy rate breakdown
  - [ ] Active vs inactive parking lots ratio
- [ ] Quick Actions
  - [ ] Manage users → `/admin/users`
  - [ ] Package configuration → `/admin/packages`
  - [ ] Owner subscriptions → `/admin/subscriptions`

### 1.4 User Management (/admin/users)
- [ ] Users List
  - [ ] User list table (Name, Email, Role, Phone, Verification status, Active status)
  - [ ] Search by name or email
  - [ ] Role filter dropdown (`ALL`, `ADMIN`, `OWNER`, `STAFF`, `CUSTOMER`)
  - [ ] Pagination + sortable columns
- [ ] Account Actions
  - [ ] Activate / Deactivate user account toggle
  - [ ] Resend email verification status check
  - [ ] View detailed user profile modal

### 1.5 Package Management (/admin/packages)
- [ ] Subscription Tiers List
  - [ ] Package cards/table (Basic, Pro, Enterprise)
  - [ ] Tier details: price (MMK/month), duration (days), max_lots, max_staff
  - [ ] Active status badge (Active / Inactive)
- [ ] Create Package (/admin/packages/create)
  - [ ] Name, description, price, duration, max_lots quota, max_staff quota
  - [ ] Form validation
- [ ] Edit Package (/:id/edit)
  - [ ] Pre-filled package details, update validation
- [ ] Toggle Active Status
  - [ ] Enable/disable tier availability for owner purchases

### 1.6 Owner Subscriptions & Billing (/admin/subscriptions)
- [ ] Subscriptions List
  - [ ] List all owner subscriptions (Owner name, Company, Package name, Status, Amount, Start/Expires date)
  - [ ] Filter by status (`ACTIVE`, `PENDING`, `EXPIRED`, `CANCELLED`)
  - [ ] Search by owner email or company name
- [ ] Subscription Actions
  - [ ] Manual activation button (for offline payment processing)
  - [ ] Cancel / Extend subscription duration

### 1.7 Platform Digital Wallet Setup (/admin/wallet)
- [ ] Wallet Configuration Form
  - [ ] Digital Wallet API Key (`X-API-Key`) input
  - [ ] Platform wallet phone number input
  - [ ] Save & test connection status with Digital Wallet backend

### 1.8 Profile & Settings (/admin/profile)
- [ ] Profile View
  - [ ] Name, email, phone, role badge display
- [ ] Change Password
  - [ ] Current password + new password + confirmation validation

---

## 2. Parking Owner Features (smart-parking-management)

### 2.1 Authentication & Quota Guard
- [ ] Login
  - [ ] Email + password validation
  - [ ] Role check (`OWNER`)
  - [ ] Redirect to `/owner/dashboard`
- [ ] Quota Guard
  - [ ] Enforce active subscription requirement
  - [ ] Enforce lot limit (`max_lots`) when creating new parking lots
  - [ ] Enforce staff limit (`max_staff`) when adding staff members

### 2.2 Owner Dashboard Layout
- [ ] Sidebar
  - [ ] Owner company name display
  - [ ] Navigation items (Dashboard, Parking Lots, Staff, Subscription, Wallet Setup)
  - [ ] Active subscription tier badge (e.g. *Pro Plan*)
- [ ] Header
  - [ ] Active lot selector dropdown
  - [ ] Owner profile avatar

### 2.3 Owner Dashboard (/owner/dashboard)
- [ ] Financial & Occupancy Stat Cards
  - [ ] Total Revenue earned across lots (MMK)
  - [ ] Total Active Lots count
  - [ ] Total Assigned Staff count
  - [ ] Overall Live Occupancy percentage
- [ ] Analytics & Charts
  - [ ] Revenue chart (daily / weekly / monthly earnings)
  - [ ] Lot occupancy comparative chart
- [ ] Recent Parking Sessions Table
  - [ ] Real-time list of latest parking sessions across owner's lots

### 2.4 Multi-Lot Management (/owner/lots)
- [ ] Parking Lots List
  - [ ] Cards/table showing lot name, type (`PUBLIC`/`PRIVATE`), hourly rate, floor count, total slots, active status
  - [ ] Direct Google Maps link button
- [ ] Create Parking Lot (/owner/lots/create)
  - [ ] Name, type selection (`PUBLIC` / `PRIVATE`), rate per hour (MMK)
  - [ ] Google Maps URL, Latitude & Longitude inputs
  - [ ] Quota check validation (blocks if `max_lots` exceeded)
- [ ] Edit Parking Lot (/:id/edit)
  - [ ] Pre-filled lot information & rates update
- [ ] Toggle Lot Status
  - [ ] Activate / Deactivate parking lot operations

### 2.5 Multi-Floor & 2D/3D Slot Layout Designer (/owner/lots/:id/floors)
- [ ] Floor Management
  - [ ] Add new floor (e.g., Ground Floor, Level 1, Basement B1)
  - [ ] Rename / reorder floors
- [ ] Slot Designer
  - [ ] Add slot to selected floor (Slot number, section name e.g. Section A, latitude, longitude)
  - [ ] Bulk generate slots feature
  - [ ] Real-time slot status indicator (🟢 Available / 🔴 Occupied)
- [ ] Visual Layout Inspector
  - [ ] 2D Grid view of slots per floor
  - [ ] 3D Interactive preview toggle

### 2.6 Staff Management (/owner/staff)
- [ ] Staff List
  - [ ] Table of staff accounts created by owner
  - [ ] Columns: Staff Name, Email, Phone, Assigned Parking Lot, Created Date
- [ ] Add Staff (/owner/staff/create)
  - [ ] Staff name, email, password, phone
  - [ ] Assigned parking lot dropdown selection
  - [ ] Quota check validation (blocks if `max_staff` limit exceeded)
- [ ] Remove / Reassign Staff
  - [ ] Delete staff account or change assigned parking lot

### 2.7 Package Subscriptions (/owner/subscription)
- [ ] Current Subscription Card
  - [ ] Active package name, status badge (`ACTIVE`), start date, expiration date
  - [ ] Used vs available lot quota (`X / max_lots`)
  - [ ] Used vs available staff quota (`Y / max_staff`)
- [ ] Upgrade / Renew Subscription
  - [ ] Display available package tiers (Basic, Pro, Enterprise)
  - [ ] "Subscribe Now" / "Renew" button
  - [ ] Digital Wallet payment checkout flow redirection

### 2.8 Owner Wallet Setup (/owner/wallet)
- [ ] Receiving Wallet Configuration
  - [ ] Agent Digital Wallet API Key (`api_key`) input
  - [ ] Wallet phone number input
  - [ ] Connection test button
  - [ ] Direct payment destination note (all parking fees for owner's lots deposit here)

---

## 3. Parking Staff Features (smart-parking-management)

### 3.1 Authentication & Context
- [ ] Login
  - [ ] Email + password validation
  - [ ] Role check (`STAFF`)
  - [ ] Load assigned parking lot context
  - [ ] Redirect to `/staff/dashboard`

### 3.2 Staff Dashboard (/staff/dashboard)
- [ ] Assigned Lot Header
  - [ ] Display assigned lot name, location, type, and hourly rate
- [ ] Shift Summary Stat Cards
  - [ ] Check-ins today count
  - [ ] Check-outs today count
  - [ ] Currently occupied slots count
  - [ ] Total cash collected during shift (MMK)
  - [ ] Total digital wallet payments collected (MMK)
- [ ] Quick Action Buttons
  - [ ] Vehicle Check-In → `/staff/check-in`
  - [ ] Vehicle Check-Out → `/staff/check-out`
  - [ ] Live Slot Grid → `/staff/slots`

### 3.3 Gate Check-In Entry (/staff/check-in)
- [ ] Vehicle Entry Form
  - [ ] License plate number input (format validation)
  - [ ] Select floor dropdown
  - [ ] Select available slot grid / list (only `AVAILABLE` slots selectable)
- [ ] Check-In Execution
  - [ ] Confirm entry → creates `ACTIVE` session with automated start timestamp
  - [ ] Flips target slot status to `OCCUPIED`
  - [ ] Print / display entry slip receipt with QR/code

### 3.4 Gate Check-Out Exit (/staff/check-out)
- [ ] Vehicle Exit Search
  - [ ] Search active parking session by license plate number or slot number
- [ ] Fee Settlement Screen
  - [ ] Entry time, exit time, calculated duration (hours/minutes)
  - [ ] Automated total fee calculation (`duration_hours * rate_per_hour`)
  - [ ] Payment method selector: Cash (ငွေသား) or Digital Wallet
- [ ] Complete Check-Out
  - [ ] Record payment status (`COMPLETED`)
  - [ ] Finalize parking session status (`FINISHED`)
  - [ ] Flips slot status back to `AVAILABLE`
  - [ ] Print / view exit invoice receipt

### 3.5 Live Slot Occupancy Grid (/staff/slots)
- [ ] Interactive Floor Grid View
  - [ ] Floor selector tab bar
  - [ ] Slot status grid layout with color codes:
    - 🟢 Green: `AVAILABLE`
    - 🔴 Red: `OCCUPIED`
  - [ ] Section grouping (Section A, Section B)
- [ ] Slot Manual Status Override
  - [ ] Click slot to manually toggle status (`AVAILABLE` ↔ `OCCUPIED`) for maintenance or emergency

### 3.6 Active Sessions Tracker (/staff/sessions)
- [ ] Active Parking List
  - [ ] List of all vehicles currently parked in the lot
  - [ ] Columns: Plate Number, Floor & Slot, Entry Time, Live Running Duration, Running Fee Timer
  - [ ] Search by license plate number

---

## 4. End Customer Features (smart-parking-customer)

### 4.1 Authentication & Account Setup
- [ ] Registration (/register)
  - [ ] Account fields: Name, Email, Phone number (`09...`), Password + Confirmation
  - [ ] Submit → Account created → Redirect to OTP Verification
- [ ] Email Verification (/verify-email)
  - [ ] 6-digit OTP code input
  - [ ] Invalid / expired OTP error message
  - [ ] Resend OTP code with countdown timer
- [ ] Login (/login)
  - [ ] Email + password validation
  - [ ] Redirect to Customer Dashboard (/) upon success
- [ ] Forgot Password (/forgot-password)
  - [ ] Enter email → OTP sent → Reset password flow

### 4.2 Customer Dashboard & Nearby Lots Map (/)
- [ ] Interactive GPS Map
  - [ ] Leaflet / Map visualizer centered on Yangon, Myanmar
  - [ ] Parking lot pin markers with custom status colors
  - [ ] Click pin → view lot summary popup card
- [ ] Lot Search & Filter Controls
  - [ ] Search bar (by lot name or location township)
  - [ ] Filter tabs: `ALL`, `PUBLIC`, `PRIVATE`
- [ ] Parking Lot Cards List
  - [ ] Lot name, type badge, hourly rate (MMK/hr), total slots, available slot count
  - [ ] Distance from user location
  - [ ] "View 3D Layout" button → `/parking/:id/3d`
  - [ ] "Open in Google Maps" navigation link

### 4.3 Interactive 3D & 2D Lot Visualizer (/parking/:id/3d)
- [ ] 3D Interactive Floor Plan (`Lot3DView` / `Slot3DView`)
  - [ ] 3D canvas renderer of parking structure
  - [ ] Floor selection tabs (Ground Floor, Level 1, Basement)
  - [ ] Real-time slot status display (Green = Available, Red = Occupied)
  - [ ] Click slot → view slot section, slot number, and GPS coordinates

### 4.4 Vehicle Fleet Management (/cars)
- [ ] Registered Vehicles List
  - [ ] Vehicle cards showing Plate Number, Brand/Model, Color
- [ ] Add Vehicle Modal
  - [ ] License plate number input (e.g. `1A-1234`), Brand (e.g. Toyota), Color (e.g. Silver)
  - [ ] Validation & save
- [ ] Remove Vehicle
  - [ ] Delete registered car with confirmation

### 4.5 Active Parking Sessions & Live Cost Tracker (/sessions)
- [ ] Active Session Banner
  - [ ] Assigned Lot name, Floor, Slot number, and vehicle plate number
  - [ ] Real-time running timer (Elapsed Hours:Minutes:Seconds)
  - [ ] Accumulating cost timer in Myanmar Kyat (MMK)
- [ ] Session History Tab
  - [ ] List of past completed parking sessions
  - [ ] Entry/exit timestamps, total duration, fee paid, payment method
  - [ ] View digital payment receipt modal

### 4.6 Digital Wallet Payment Flow (/wallet-payment)
- [ ] Fee Summary & Method Selection
  - [ ] Fee breakdown + total amount display
  - [ ] Select Digital Wallet provider
- [ ] Hosted Wallet Portal Checkout
  - [ ] Redirect to Digital Wallet backend (`digital-wallet-backend-api.up.railway.app`)
  - [ ] Enter wallet phone number & OTP code
  - [ ] Enter 4-digit Wallet PIN code
- [ ] Payment Callback & Receipt (/wallet-payment/result)
  - [ ] Automated browser redirect back to customer app
  - [ ] Success / Failure status banner
  - [ ] Digital transaction reference code (`PP...`) & receipt summary

### 4.7 Profile & Settings (/profile)
- [ ] Personal Profile Card
  - [ ] Name, email, phone number, email verification status badge
  - [ ] Avatar upload / update
- [ ] Change Password (/change-password)
  - [ ] Current password + new password + confirmation validation

---

## 5. Backend API (smart-parking-api)

### 5.1 Authentication & RBAC (/api/v1/auth)
- [ ] `POST /auth/register` — Customer registration
- [ ] `POST /auth/verify-otp` — Verify registration OTP
- [ ] `POST /auth/resend-otp` — Resend verification OTP
- [ ] `POST /auth/login` — JWT login (returns access & refresh tokens)
- [ ] `POST /auth/forgot-password` — Send password reset OTP
- [ ] `POST /auth/reset-password` — Reset password via OTP
- [ ] `GET /auth/me` — Fetch current user profile & permissions

### 5.2 User Management API (/api/v1/users)
- [ ] `GET /users` — List all users (Filter by role, search keyword, pagination)
- [ ] `GET /users/{id}` — Get single user details
- [ ] `PATCH /users/{id}/status` — Activate or deactivate user account

### 5.3 Package Management API (/api/v1/packages)
- [ ] `GET /packages` — List all active subscription tiers
- [ ] `POST /packages` — Create new subscription package (Admin only)
- [ ] `PUT /packages/{id}` — Update package details & quota limits (Admin only)
- [ ] `DELETE /packages/{id}` — Deactivate subscription package (Admin only)

### 5.4 Subscription Management API (/api/v1/subscriptions)
- [ ] `GET /subscriptions/admin/all` — List all owner subscriptions (Admin only)
- [ ] `POST /subscriptions/subscribe` — Owner package purchase initiation
- [ ] `POST /subscriptions/{id}/activate` — Manual subscription activation (Admin override)

### 5.5 Parking Lot & Layout API (/api/v1/parking-lots, /parking-floors, /parking-slots)
- [ ] `GET /parking-lots` — List owner's parking lots
- [ ] `POST /parking-lots` — Create parking lot (Enforces `max_lots` quota)
- [ ] `PUT /parking-lots/{id}` — Update lot info & hourly rate
- [ ] `GET /parking-lots/customer/search` — Search nearby parking lots with live availability & GPS
- [ ] `POST /parking-floors` — Add floor to parking lot
- [ ] `POST /parking-slots` — Add slot to floor (with section & GPS coordinates)
- [ ] `PATCH /parking-slots/{id}/status` — Toggle slot status (`AVAILABLE` / `OCCUPIED`)
- [ ] `GET /parking-lots/{id}/layout` — Fetch complete 2D/3D floor & slot layout

### 5.6 Parking Staff API (/api/v1/parking-staff)
- [ ] `GET /parking-staff/owner` — List staff created by owner
- [ ] `POST /parking-staff` — Create staff account & assign to lot (Enforces `max_staff` quota)
- [ ] `DELETE /parking-staff/{id}` — Remove staff member

### 5.7 Customer Vehicle API (/api/v1/cars)
- [ ] `GET /cars` — List customer registered vehicles
- [ ] `POST /cars` — Register new vehicle
- [ ] `DELETE /cars/{id}` — Delete registered vehicle

### 5.8 Parking Session API (/api/v1/parking-sessions)
- [ ] `POST /parking-sessions/check-in` — Check in vehicle (Start session, occupy slot)
- [ ] `POST /parking-sessions/check-out` — Check out vehicle (Calculate fee, release slot)
- [ ] `GET /parking-sessions/active` — List active sessions for assigned lot (Staff)
- [ ] `GET /parking-sessions/customer/active` — Get active session for customer
- [ ] `GET /parking-sessions/customer/history` — Get customer parking session history

### 5.9 Wallet Account API (/api/v1/wallet-accounts)
- [ ] `POST /wallet-accounts/platform` — Register platform receiving wallet API key (Admin)
- [ ] `POST /wallet-accounts/owner` — Register owner receiving wallet API key (Owner)
- [ ] `GET /wallet-accounts/me` — Fetch owner's registered wallet details

### 5.10 Wallet Payment API (/api/v1/wallet-payments)
- [ ] `POST /wallet-payments/initiate` — Initiate payment & generate hosted payment URL
- [ ] `POST /wallet-payments/callback` — Webhook / Callback handler from Digital Wallet backend

### 5.11 Dashboard Analytics API (/api/v1/dashboard)
- [ ] `GET /dashboard/admin` — Fetch global admin KPIs & platform stats
- [ ] `GET /dashboard/owner` — Fetch owner revenue, occupancy & session statistics
- [ ] `GET /dashboard/staff` — Fetch staff shift counters & lot occupancy
