import { apiClient } from "@/api/client"
import type { ListParams, ListResult } from "@/api/types"
import type { ApiSuccess, ParkingLotOut } from "@/types"

export interface CreateLotPayload {
  name: string
  type?: string
  address?: string
  latitude?: number
  longitude?: number
  google_map_url?: string
  owner_id?: number
}

export interface UpdateLotPayload {
  name?: string
  type?: string
  address?: string
  latitude?: number
  longitude?: number
  google_map_url?: string
}

export const parkingLotsApi = {
  async list(params?: ListParams): Promise<ListResult<ParkingLotOut>> {
    const res = await apiClient.get<ApiSuccess<ParkingLotOut[]>>("/parking-lots", { params })
    return { items: res.data.data, meta: res.data.meta! }
  },

  async get(id: number) {
    const res = await apiClient.get<ApiSuccess<ParkingLotOut>>(`/parking-lots/${id}`)
    return res.data.data
  },

  async create(payload: CreateLotPayload) {
    const res = await apiClient.post<ApiSuccess<ParkingLotOut>>("/parking-lots", payload)
    return res.data.data
  },

  async update(id: number, payload: UpdateLotPayload) {
    const res = await apiClient.put<ApiSuccess<ParkingLotOut>>(`/parking-lots/${id}`, payload)
    return res.data.data
  },

  async remove(id: number) {
    const res = await apiClient.delete<ApiSuccess<null>>(`/parking-lots/${id}`)
    return res.data
  },
}
