import { apiClient } from "@/api/client"
import type { ListParams, ListResult } from "@/api/types"
import type { ApiSuccess, VehicleOut, VehicleCreate, VehicleUpdate } from "@/types"

export const vehiclesApi = {
  async list(params?: ListParams): Promise<ListResult<VehicleOut>> {
    const res = await apiClient.get<ApiSuccess<VehicleOut[]>>("/vehicles", { params })
    return { items: res.data.data, meta: res.data.meta! }
  },

  async get(id: number) {
    const res = await apiClient.get<ApiSuccess<VehicleOut>>(`/vehicles/${id}`)
    return res.data.data
  },

  async create(payload: VehicleCreate) {
    const res = await apiClient.post<ApiSuccess<VehicleOut>>("/vehicles", payload)
    return res.data.data
  },

  async update(id: number, payload: VehicleUpdate) {
    const res = await apiClient.put<ApiSuccess<VehicleOut>>(`/vehicles/${id}`, payload)
    return res.data.data
  },

  async remove(id: number) {
    const res = await apiClient.delete<ApiSuccess<null>>(`/vehicles/${id}`)
    return res.data
  },
}
