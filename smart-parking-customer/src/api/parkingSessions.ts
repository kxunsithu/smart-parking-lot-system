import apiClient from "./client"
import type {
  ApiSuccess,
  ParkingSessionOut,
  ParkingSessionBook,
  ParkingSessionStart,
  ParkingSessionFinish,
  ParkingSessionPayResult,
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

  /** Customer booking: creates a PENDING session; becomes ACTIVE after wallet payment */
  book: async (data: ParkingSessionBook): Promise<ParkingSessionOut> => {
    const response = await apiClient.post<ApiSuccess<ParkingSessionOut>>("/parking-sessions/book", data)
    return response.data.data
  },

  /** Customer: request a wallet payment for a PENDING session (returns OTP) */
  payInitiate: async (id: number): Promise<WalletPaymentOut> => {
    const response = await apiClient.post<ApiSuccess<WalletPaymentOut>>(`/parking-sessions/${id}/pay/initiate`)
    return response.data.data
  },

  /** Customer: confirm the wallet payment (OTP + PIN) to activate the session */
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
