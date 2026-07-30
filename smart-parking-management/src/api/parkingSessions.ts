import { apiClient } from "@/api/client"
import type { ListParams, ListResult } from "@/api/types"
import type { ApiSuccess, ParkingSessionOut, ParkingSessionStart, ParkingSessionFinish } from "@/types"

export const parkingSessionsApi = {
  async list(params?: ListParams & { status?: string; vehicle_id?: number; slot_id?: number }): Promise<ListResult<ParkingSessionOut>> {
    const res = await apiClient.get<ApiSuccess<ParkingSessionOut[]>>("/parking-sessions", { params })
    return { items: res.data.data, meta: res.data.meta! }
  },

  async get(id: number) {
    const res = await apiClient.get<ApiSuccess<ParkingSessionOut>>(`/parking-sessions/${id}`)
    return res.data.data
  },

  async start(payload: ParkingSessionStart) {
    const res = await apiClient.post<ApiSuccess<ParkingSessionOut>>("/parking-sessions/start", payload)
    return res.data.data
  },

  async finish(id: number, payload: ParkingSessionFinish = {}) {
    const res = await apiClient.patch<ApiSuccess<ParkingSessionOut>>(`/parking-sessions/${id}/finish`, payload)
    return res.data.data
  },
}
