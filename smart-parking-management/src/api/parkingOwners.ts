import { apiClient } from "@/api/client"
import type { ListParams, ListResult } from "@/api/types"
import type { ApiSuccess, ParkingOwnerOut } from "@/types"

export interface CreateOwnerPayload {
  name: string
  email: string
  password: string
  phone?: string
  company_name?: string
  business_license?: string
  address?: string
}

export interface UpdateOwnerPayload {
  company_name?: string
  business_license?: string
  address?: string
}

export const parkingOwnersApi = {
  async list(params?: ListParams): Promise<ListResult<ParkingOwnerOut>> {
    const res = await apiClient.get<ApiSuccess<ParkingOwnerOut[]>>("/parking-owners", { params })
    return { items: res.data.data, meta: res.data.meta! }
  },

  async get(id: number) {
    const res = await apiClient.get<ApiSuccess<ParkingOwnerOut>>(`/parking-owners/${id}`)
    return res.data.data
  },

  async me() {
    const res = await apiClient.get<ApiSuccess<ParkingOwnerOut>>("/parking-owners/me")
    return res.data.data
  },

  async create(payload: CreateOwnerPayload) {
    const res = await apiClient.post<ApiSuccess<ParkingOwnerOut>>("/parking-owners", payload)
    return res.data.data
  },

  async update(id: number, payload: UpdateOwnerPayload) {
    const res = await apiClient.put<ApiSuccess<ParkingOwnerOut>>(`/parking-owners/${id}`, payload)
    return res.data.data
  },

  async remove(id: number) {
    const res = await apiClient.delete<ApiSuccess<null>>(`/parking-owners/${id}`)
    return res.data
  },
}
