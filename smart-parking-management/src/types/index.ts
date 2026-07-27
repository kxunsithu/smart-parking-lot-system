// Types mirroring the backend Pydantic schemas (see smart-parking-api/app/schemas).

export type RoleName = "ADMIN" | "OWNER" | "STAFF"

export type SlotStatus = "AVAILABLE" | "RESERVED" | "OCCUPIED"

export type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED"

export type SessionStatus = "ACTIVE" | "FINISHED"

export type PaymentStatus = "PENDING" | "PAID" | "REFUNDED"

export type PaymentMethod = "CASH" | "KBZPAY" | "WAVEPAY" | "AYAPAY" | "UABPAY"

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
  created_by?: number | null
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
  business_license?: string | null
  address?: string | null
  user?: UserOut | null
}

export interface ParkingLotOut {
  id: number
  owner_id: number
  name: string
  type?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  google_map_url?: string | null
  total_slots: number
  created_at: string
}

export interface ParkingStaffOut {
  id: number
  user_id: number
  parking_lot_id: number
  employee_code?: string | null
  position?: string | null
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

export interface ReservationOut {
  id: number
  customer_id: number
  slot_id: number
  reservation_time: string
  status: ReservationStatus
}

export interface ParkingSessionOut {
  id: number
  vehicle_id: number
  slot_id: number
  entry_time?: string | null
  exit_time?: string | null
  duration?: number | null
  fee?: number | null
  status: SessionStatus
}

export interface PaymentOut {
  id: number
  parking_session_id: number
  customer_id: number
  reservation_id?: number | null
  amount: number
  payment_method: PaymentMethod
  status: PaymentStatus
  paid_at: string
}

export interface AdminDashboardOut {
  total_owners: number
  total_staff: number
  total_customers: number
  total_parking_lots: number
  total_slots: number
  total_active_sessions: number
  total_revenue: number
}

export interface OwnerDashboardOut {
  total_parking_lots: number
  total_floors: number
  total_slots: number
  available_slots: number
  occupied_slots: number
  reserved_slots: number
  total_staff: number
  total_reservations: number
  active_sessions: number
  total_revenue: number
}

export interface StaffDashboardOut {
  parking_lot_id: number
  total_slots: number
  available_slots: number
  occupied_slots: number
  reserved_slots: number
  active_sessions: number
  pending_reservations: number
}

export interface PaginationQuery {
  page?: number
  limit?: number
  sort_by?: string
  order?: "asc" | "desc"
  search?: string
}
