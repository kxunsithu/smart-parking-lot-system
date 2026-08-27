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
  phone?: string | null
  address?: string | null
  user?: UserOut | null
}

export interface CustomerUpdate {
  current_lat?: number | null
  current_lng?: number | null
  phone?: string | null
  address?: string | null
}

export interface CarOut {
  id: number
  customer_id: number
  plate_number: string
  brand?: string | null
  color?: string | null
}

export interface CarCreate {
  plate_number: string
  brand?: string | null
  color?: string | null
  customer_id?: number | null
}

export interface CarUpdate {
  plate_number?: string | null
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

export type SlotStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED"

export interface ParkingSlotOut {
  id: number
  floor_id: number
  slot_number: string
  section?: string | null
  latitude?: number | null
  longitude?: number | null
  status: SlotStatus
}

export type SessionStatus = "ACTIVE" | "FINISHED"

export interface SessionPaymentInitiateRequest {
  car_id: number
  slot_id: number
  start_time: string  // ISO datetime string
  end_time: string    // ISO datetime string
  wallet_phone?: string | null
}

export interface SessionPaymentConfirmRequest {
  reference: string
  otp_code: string
  pin: string
}

export interface ParkingSessionOut {
  id: number
  car_id: number
  slot_id: number
  start_time: string
  end_time?: string | null
  duration?: number | null
  fee?: number | null
  status: SessionStatus
}

export interface WalletPaymentOut {
  id: number
  reference: string
  session_id?: number | null
  subscription_id?: number | null
  wallet_account_id?: number | null
  amount: number
  fee: number
  total: number
  status: string
  message?: string | null
  wallet_payment_reference?: string | null
  wallet_payment_url?: string | null
  wallet_transaction_number?: string | null
  paid_at?: string | null
  created_at: string
}

/** A completed wallet transaction row returned by GET /payments */
export interface PaymentListOut {
  id: number
  reference: string
  kind: string
  session_id?: number | null
  wallet_payment_reference?: string | null
  wallet_transaction_number?: string | null
  receiver_phone?: string | null
  payer_name?: string | null
  payer_phone?: string | null
  amount: number
  fee: number
  total: number
  status: string
  paid_at?: string | null
  created_at: string
  lot_name?: string | null
  plate_number?: string | null
  package_name?: string | null
  owner_name?: string | null
  direction?: string | null
}

export interface WalletPaymentConfirm {
  otp_code: string
  pin: string
}

export interface ParkingSessionPayResult {
  payment: WalletPaymentOut
  session: ParkingSessionOut
}

export interface ParkingSessionStart {
  car_id: number
  slot_id: number
}

export interface ParkingSessionBook {
  car_id: number
  slot_id: number
  start_time: string  // ISO datetime string
  end_time: string    // ISO datetime string
}

export interface ParkingSessionFinish {
  rate_per_hour?: number | null
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
  phone: string
}

export interface UserUpdate {
  name?: string
  phone?: string | null
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

export interface ResetPasswordRequest {
  email: string
  otp: string
  new_password: string
}
