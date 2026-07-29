import apiClient from "./client"
import type { ApiSuccess, ParkingSessionOut, ParkingSessionBook, ParkingSessionStart, ParkingSessionFinish } from "./types"

export const parkingSessionsApi = {
  list: async (params?: {
    status?: string
    vehicle_id?: number
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

  /** Customer booking: creates a PENDING session with pre-calculated fee */
  book: async (data: ParkingSessionBook): Promise<ParkingSessionOut> => {
    const response = await apiClient.post<ApiSuccess<ParkingSessionOut>>("/parking-sessions/book", data)
    return response.data.data
  },

  /** Confirm payment → session becomes ACTIVE and slot becomes OCCUPIED */
  confirmPayment: async (id: number): Promise<ParkingSessionOut> => {
    const response = await apiClient.post<ApiSuccess<ParkingSessionOut>>(
      `/parking-sessions/${id}/confirm-payment`,
      {}
    )
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
