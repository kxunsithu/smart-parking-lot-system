export interface RoleOut {
  id: number
  name: string
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

export interface VehicleOut {
  id: number
  customer_id: number
  plate_number: string
  vehicle_type?: string | null
  brand?: string | null
  color?: string | null
}

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

export interface ParkingLotOut {
  id: number
  owner_id: number
  name: string
  google_map_url?: string | null
  is_active: boolean
  rate_per_hour?: number | null
  created_at: string
}

export type SlotStatus = "AVAILABLE" | "OCCUPIED"

export interface ParkingSlotOut {
  id: number
  floor_id: number
  slot_number: string
  section?: string | null
  latitude?: number | null
  longitude?: number | null
  status: SlotStatus
}

export type SessionStatus = "PENDING" | "ACTIVE" | "FINISHED"

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

export interface ParkingSessionStart {
  vehicle_id: number
  slot_id: number
}

export interface ParkingSessionBook {
  vehicle_id: number
  slot_id: number
  start_time: string  // ISO datetime string
  end_time: string    // ISO datetime string
  payment_method: PaymentMethod
}

export interface ParkingSessionFinish {
  rate_per_hour?: number | null
}

export type PaymentStatus = "PENDING" | "PAID" | "REFUNDED"

export type PaymentMethod = "CASH" | "KBZPAY" | "WAVEPAY" | "AYAPAY" | "UABPAY"

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

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

export interface SendOTPRequest {
  email: string
}

export interface VerifyOTPRequest {
  email: string
  code: string
}

export interface ChangePasswordRequest {
  old_password: string
  new_password: string
}
