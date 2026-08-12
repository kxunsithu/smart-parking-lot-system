import apiClient from "./client"
import type {
  ApiSuccess,
  ParkingSessionOut,
  ParkingSessionBook,
  ParkingSessionStart,
  ParkingSessionFinish,
  ParkingSessionPayResult,
  SessionPaymentInitiateRequest,
  SessionPaymentConfirmRequest,
  WalletPaymentConfirm,
  WalletPaymentOut,
} from "./types"

export const parkingSessionsApi = {
  list: async (params?: {
    status?: string
    car_id?: number
    page?: number
    limit?: number
  }): Promise<ParkingSessionOut[]> => {
    const response = await apiClient.get<ApiSuccess<ParkingSessionOut[]>>("/parking-sessions", { params })
    return response.data.data
  },

  get: async (id: number): Promise<ParkingSessionOut> => {
    const response = await apiClient.get<ApiSuccess<ParkingSessionOut>>(`/parking-sessions/${id}`)
    return response.data.data
  },

  /** Customer booking: validates booking & initiates wallet payment (no session recorded until payment is confirmed) */
  book: async (data: SessionPaymentInitiateRequest): Promise<WalletPaymentOut> => {
    const response = await apiClient.post<ApiSuccess<WalletPaymentOut>>("/parking-sessions/book", data)
    return response.data.data
  },

  /** Customer: confirm wallet payment by reference (OTP + PIN) -> creates ACTIVE session */
  payConfirmByRef: async (data: SessionPaymentConfirmRequest): Promise<ParkingSessionPayResult> => {
    const response = await apiClient.post<ApiSuccess<ParkingSessionPayResult>>("/parking-sessions/pay/confirm", data)
    return response.data.data
  },

  /** [Legacy] Request a wallet payment for a PENDING session */
  payInitiate: async (id: number, data?: { wallet_phone?: string | null }): Promise<WalletPaymentOut> => {
    const response = await apiClient.post<ApiSuccess<WalletPaymentOut>>(`/parking-sessions/${id}/pay/initiate`, data)
    return response.data.data
  },

  /** [Legacy] Confirm the wallet payment (OTP + PIN) for a session_id */
  payConfirm: async (id: number, data: WalletPaymentConfirm): Promise<ParkingSessionPayResult> => {
    const response = await apiClient.post<ApiSuccess<ParkingSessionPayResult>>(`/parking-sessions/${id}/pay/confirm`, data)
    return response.data.data
  },

  /** Staff/Admin: directly start a session (immediately ACTIVE) */
  start: async (data: ParkingSessionStart): Promise<ParkingSessionOut> => {
    const response = await apiClient.post<ApiSuccess<ParkingSessionOut>>("/parking-sessions/start", data)
    return response.data.data
  },

  finish: async (id: number, data?: ParkingSessionFinish): Promise<ParkingSessionOut> => {
    const response = await apiClient.patch<ApiSuccess<ParkingSessionOut>>(
      `/parking-sessions/${id}/finish`,
      data || {}
    )
    return response.data.data
  },
}
