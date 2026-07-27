import { apiClient } from "@/api/client"
import type { ListParams, ListResult } from "@/api/types"
import type { ApiSuccess, UserOut } from "@/types"

export interface UpdateUserPayload {
  name?: string
  phone?: string
  is_active?: boolean
}

export const usersApi = {
  async list(params?: ListParams): Promise<ListResult<UserOut>> {
    const res = await apiClient.get<ApiSuccess<UserOut[]>>("/users", { params })
    return { items: res.data.data, meta: res.data.meta! }
  },

  async get(id: number) {
    const res = await apiClient.get<ApiSuccess<UserOut>>(`/users/${id}`)
    return res.data.data
  },

  async update(id: number, payload: UpdateUserPayload) {
    const res = await apiClient.put<ApiSuccess<UserOut>>(`/users/${id}`, payload)
    return res.data.data
  },

  async activate(id: number) {
    const res = await apiClient.patch<ApiSuccess<UserOut>>(`/users/${id}/activate`)
    return res.data.data
  },

  async deactivate(id: number) {
    const res = await apiClient.patch<ApiSuccess<UserOut>>(`/users/${id}/deactivate`)
    return res.data.data
  },

  async remove(id: number) {
    const res = await apiClient.delete<ApiSuccess<null>>(`/users/${id}`)
    return res.data
  },
}
