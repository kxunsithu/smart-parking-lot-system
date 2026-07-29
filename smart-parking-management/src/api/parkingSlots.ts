import { apiClient } from "@/api/client"
import type { ListParams, ListResult } from "@/api/types"
import type { ApiSuccess, ParkingSlotOut, SlotStatus, ParkingSlotCreate, ParkingSlotUpdate } from "@/types"

export const parkingSlotsApi = {
  async list(params?: ListParams): Promise<ListResult<ParkingSlotOut>> {
    const res = await apiClient.get<ApiSuccess<ParkingSlotOut[]>>("/parking-slots", { params })
    return { items: res.data.data, meta: res.data.meta! }
  },

  async get(id: number) {
    const res = await apiClient.get<ApiSuccess<ParkingSlotOut>>(`/parking-slots/${id}`)
    return res.data.data
  },

  async create(payload: ParkingSlotCreate) {
    const res = await apiClient.post<ApiSuccess<ParkingSlotOut>>("/parking-slots", payload)
    return res.data.data
  },

  async update(id: number, payload: ParkingSlotUpdate) {
    const res = await apiClient.put<ApiSuccess<ParkingSlotOut>>(`/parking-slots/${id}`, payload)
    return res.data.data
  },

  async updateStatus(id: number, status: SlotStatus) {
    const res = await apiClient.patch<ApiSuccess<ParkingSlotOut>>(`/parking-slots/${id}/status`, { status })
    return res.data.data
  },

  async remove(id: number) {
    const res = await apiClient.delete<ApiSuccess<null>>(`/parking-slots/${id}`)
    return res.data
  },
}
