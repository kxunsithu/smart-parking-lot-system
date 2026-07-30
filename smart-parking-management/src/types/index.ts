// Types mirroring the backend Pydantic schemas (see smart-parking-api/app/schemas).

export type RoleName = "ADMIN" | "OWNER" | "STAFF" | "CUSTOMER"

export type SlotStatus = "AVAILABLE" | "OCCUPIED"

export type SessionStatus = "PENDING" | "ACTIVE" | "FINISHED"

export type PaymentStatus = "PENDING" | "PAID" | "REFUNDED"

export type PaymentMethod = "CASH" | "KBZPAY" | "WAVEPAY" | "AYAPAY" | "UABPAY"

export type SubscriptionStatus = "ACTIVE" | "EXPIRED" | "CANCELLED"

export interface PackageOut {
  id: number
  name: string
  description?: string | null
  price: number
  duration_days: number
  max_lots: number
  max_staff: number
  is_active: boolean
  created_at: string
}

export interface SubscriptionOut {
  id: number
  owner_id: number
  package_id: number
  started_at: string
  expires_at: string
  status: SubscriptionStatus
  payment_method: PaymentMethod | string
  amount: number
  transaction_ref?: string | null
  created_at: string
  package?: PackageOut | null
}

export interface ApiMeta {
  page: number
  limit: number
  total: number
  total_pages: number
}

export interface ApiSuccess<T> {
  success: true
  message: string
  data: T
  meta?: ApiMeta | null
}

export interface ApiErrorDetail {
  field?: string | null
  message: string
}

export interface ApiErrorBody {
  success: false
  message: string
  errors?: ApiErrorDetail[] | null
}

export interface RoleOut {
  id: number
  name: RoleName
  description?: string | null
}

export interface UserOut {
  id: number
  name: string
  email: string
  phone?: string | null
  role_id: number
  role?: RoleOut | null
  is_active: boolean
  is_verified: boolean
  created_at: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface ParkingOwnerOut {
  id: number
  user_id: number
  company_name?: string | null
  user?: UserOut | null
}

export interface ParkingLotOut {
  id: number
  owner_id: number
  name: string
  google_map_url?: string | null
  rate_per_hour?: number | null
  is_active: boolean
  created_at: string
  owner?: ParkingOwnerOut | null
}

export interface ParkingLotWithStaffOut extends ParkingLotOut {
  staff_count: number
}

export interface ParkingStaffOut {
  id: number
  user_id: number
  parking_lot_id: number
  created_by?: number | null
  user?: UserOut | null
}

export interface VehicleOut {
  id: number
  customer_id: number
  plate_number: string
  vehicle_type?: string | null
  brand?: string | null
  color?: string | null
}

export interface ParkingFloorOut {
  id: number
  parking_lot_id: number
  floor_name?: string | null
}

export interface ParkingSlotOut {
  id: number
  floor_id: number
  slot_number: string
  section?: string | null
  latitude?: number | null
  longitude?: number | null
  status: SlotStatus
}

export interface ParkingSessionOut {
  id: number
  vehicle_id: number
  slot_id: number
  start_time: string
  end_time?: string | null
  duration?: number | null
  fee?: number | null
  status: SessionStatus
}

export interface PaymentOut {
  id: number
  parking_session_id: number
  customer_id: number
  amount: number
  payment_method: PaymentMethod
  transaction_ref?: string | null
  status: PaymentStatus
  paid_at: string
}

export interface AdminDashboardOut {
  total_owners: number
  total_staff: number
  total_customers: number
  total_parking_lots: number
  total_revenue: number
}

export interface OwnerDashboardOut {
  total_parking_lots: number
  total_floors: number
  available_slots: number
  occupied_slots: number
  total_staff: number
  total_sessions: number
  total_revenue: number
}

export interface StaffDashboardOut {
  parking_lot_id: number
  available_slots: number
  occupied_slots: number
  active_sessions: number
}

export interface PaginationQuery {
  page?: number
  limit?: number
  sort_by?: string
  order?: "asc" | "desc"
  search?: string
}

// Auth Request Types
export interface RegisterRequest {
  name: string
  email: string
  password: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RefreshTokenRequest {
  refresh_token: string
}

export interface LogoutRequest {
  refresh_token: string
}

export interface ChangePasswordRequest {
  old_password: string
  new_password: string
}

export interface SendOTPRequest {
  email: string
}

export interface VerifyOTPRequest {
  email: string
  code: string
}

export interface RegisterOwnerRequest {
  name: string
  email: string
  password: string
  confirm_password: string
  company_name: string
}

// Customer Types
export interface CustomerOut {
  id: number
  user_id: number
  current_lat?: number | null
  current_lng?: number | null
  user?: UserOut | null
}

export interface CustomerUpdate {
  current_lat?: number | null
  current_lng?: number | null
}

// Package CRUD Types
export interface PackageCreate {
  name: string
  description?: string | null
  price: number
  duration_days: number
  max_lots?: number
  max_staff?: number
}

export interface PackageUpdate {
  name?: string | null
  description?: string | null
  price?: number | null
  duration_days?: number | null
  max_lots?: number | null
  max_staff?: number | null
  is_active?: boolean | null
}

// Parking Floor CRUD Types
export interface ParkingFloorCreate {
  parking_lot_id: number
  floor_name: string
}

export interface ParkingFloorUpdate {
  floor_name?: string | null
}

// Parking Lot CRUD Types
export interface ParkingLotCreate {
  name: string
  google_map_url?: string | null
  rate_per_hour?: number | null
  owner_id?: number | null
}

export interface ParkingLotUpdate {
  name?: string | null
  google_map_url?: string | null
  rate_per_hour?: number | null
}

// Parking Owner Update
export interface ParkingOwnerUpdate {
  company_name?: string | null
}

// Parking Session CRUD Types
export interface ParkingSessionStart {
  vehicle_id: number
  slot_id: number
}

export interface ParkingSessionFinish {
  rate_per_hour?: number | null
}

// Parking Slot CRUD Types
export interface ParkingSlotCreate {
  floor_id: number
  slot_number: string
  section?: string | null
  latitude?: number | null
  longitude?: number | null
}

export interface ParkingSlotUpdate {
  slot_number?: string | null
  section?: string | null
  latitude?: number | null
  longitude?: number | null
}

export interface ParkingSlotStatusUpdate {
  status: SlotStatus
}

// Parking Staff CRUD Types
export interface ParkingStaffCreate {
  name: string
  email: string
  password: string
  parking_lot_id: number
}

export interface ParkingStaffUpdate {
  parking_lot_id?: number | null
  is_active?: boolean | null
}

// Payment CRUD Types
export interface PaymentCreate {
  parking_session_id: number
  customer_id?: number | null
  amount: number
  payment_method: PaymentMethod
  transaction_ref?: string | null
}

export interface PaymentStatusUpdate {
  status: PaymentStatus
}

// User CRUD Types
export interface UserCreate {
  name: string
  email: string
  password: string
  phone?: string | null
  role_id: number
}

export interface UserUpdate {
  name?: string | null
  phone?: string | null
  is_active?: boolean | null
}

// Vehicle CRUD Types
export interface VehicleCreate {
  plate_number: string
  vehicle_type?: string | null
  brand?: string | null
  color?: string | null
  customer_id?: number | null
}

export interface VehicleUpdate {
  plate_number?: string | null
  vehicle_type?: string | null
  brand?: string | null
  color?: string | null
}

// Subscription Purchase
export interface SubscriptionPurchase {
  package_id: number
  owner_id?: number | null
  payment_method: PaymentMethod | string
  transaction_ref?: string | null
}
