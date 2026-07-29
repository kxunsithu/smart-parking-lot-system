import { apiClient } from "@/api/client"
import type { ListParams, ListResult } from "@/api/types"
import type { ApiSuccess, ParkingStaffOut, ParkingStaffCreate, ParkingStaffUpdate } from "@/types"

export const parkingStaffApi = {
  async list(params?: ListParams): Promise<ListResult<ParkingStaffOut>> {
    const res = await apiClient.get<ApiSuccess<ParkingStaffOut[]>>("/parking-staff", { params })
    return { items: res.data.data, meta: res.data.meta! }
  },

  async get(id: number) {
    const res = await apiClient.get<ApiSuccess<ParkingStaffOut>>(`/parking-staff/${id}`)
    return res.data.data
  },

  async create(payload: ParkingStaffCreate) {
    const res = await apiClient.post<ApiSuccess<ParkingStaffOut>>("/parking-staff", payload)
    return res.data.data
  },

  async update(id: number, payload: ParkingStaffUpdate) {
    const res = await apiClient.put<ApiSuccess<ParkingStaffOut>>(`/parking-staff/${id}`, payload)
    return res.data.data
  },

  async remove(id: number) {
    const res = await apiClient.delete<ApiSuccess<null>>(`/parking-staff/${id}`)
    return res.data
  },
}
