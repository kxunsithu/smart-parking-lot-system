import { apiClient } from "@/api/client"
import type { ListResult } from "@/api/types"
import type { ApiSuccess, ParkingLotOut, ParkingLotCreate, ParkingLotUpdate, PaginationQuery } from "@/types"

export const parkingLotsApi = {
  async list(params?: PaginationQuery & { type?: string; owner_id?: number; with_staff_count?: boolean | string }): Promise<ListResult<ParkingLotOut>> {
    const res = await apiClient.get<ApiSuccess<ParkingLotOut[]>>("/parking-lots", { params })
    return { items: res.data.data, meta: res.data.meta! }
  },

  async get(id: number) {
    const res = await apiClient.get<ApiSuccess<ParkingLotOut>>(`/parking-lots/${id}`)
    return res.data.data
  },

  async create(payload: ParkingLotCreate) {
    const res = await apiClient.post<ApiSuccess<ParkingLotOut>>("/parking-lots", payload)
    return res.data.data
  },

  async update(id: number, payload: ParkingLotUpdate) {
    const res = await apiClient.put<ApiSuccess<ParkingLotOut>>(`/parking-lots/${id}`, payload)
    return res.data.data
  },

  async remove(id: number) {
    const res = await apiClient.delete<ApiSuccess<null>>(`/parking-lots/${id}`)
    return res.data
  },

  async toggleStatus(id: number) {
    const res = await apiClient.patch<ApiSuccess<ParkingLotOut>>(`/parking-lots/${id}/toggle-status`)
    return res.data.data
  },
}
