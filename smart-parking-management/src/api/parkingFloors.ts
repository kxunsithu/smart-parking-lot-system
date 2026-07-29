import { apiClient } from "@/api/client"
import type { ListParams, ListResult } from "@/api/types"
import type { ApiSuccess, ParkingFloorOut, ParkingFloorCreate, ParkingFloorUpdate } from "@/types"

export const parkingFloorsApi = {
  async list(params?: ListParams): Promise<ListResult<ParkingFloorOut>> {
    const res = await apiClient.get<ApiSuccess<ParkingFloorOut[]>>("/parking-floors", { params })
    return { items: res.data.data, meta: res.data.meta! }
  },

  async get(id: number) {
    const res = await apiClient.get<ApiSuccess<ParkingFloorOut>>(`/parking-floors/${id}`)
    return res.data.data
  },

  async create(payload: ParkingFloorCreate) {
    const res = await apiClient.post<ApiSuccess<ParkingFloorOut>>("/parking-floors", payload)
    return res.data.data
  },

  async update(id: number, payload: ParkingFloorUpdate) {
    const res = await apiClient.put<ApiSuccess<ParkingFloorOut>>(`/parking-floors/${id}`, payload)
    return res.data.data
  },

  async remove(id: number) {
    const res = await apiClient.delete<ApiSuccess<null>>(`/parking-floors/${id}`)
    return res.data
  },
}
