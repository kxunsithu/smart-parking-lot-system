import { apiClient } from "@/api/client"
import type { ListParams, ListResult } from "@/api/types"
import type { ApiSuccess, CarOut, CarCreate, CarUpdate } from "@/types"

export const carsApi = {
  async list(params?: ListParams): Promise<ListResult<CarOut>> {
    const res = await apiClient.get<ApiSuccess<CarOut[]>>("/cars", { params })
    return { items: res.data.data, meta: res.data.meta! }
  },

  async get(id: number) {
    const res = await apiClient.get<ApiSuccess<CarOut>>(`/cars/${id}`)
    return res.data.data
  },

  async create(payload: CarCreate) {
    const res = await apiClient.post<ApiSuccess<CarOut>>("/cars", payload)
    return res.data.data
  },

  async update(id: number, payload: CarUpdate) {
    const res = await apiClient.put<ApiSuccess<CarOut>>(`/cars/${id}`, payload)
    return res.data.data
  },

  async remove(id: number) {
    const res = await apiClient.delete<ApiSuccess<null>>(`/cars/${id}`)
    return res.data
  },
}
