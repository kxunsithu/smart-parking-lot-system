import { apiClient } from "@/api/client"
import type { ApiSuccess, PackageOut, PackageCreate, PackageUpdate } from "@/types"

export interface ListPackagesParams {
  page?: number
  limit?: number
  search?: string
  sort_by?: string
  order?: "asc" | "desc"
}

export const packagesApi = {
  async list(params?: ListPackagesParams): Promise<{ data: PackageOut[]; meta: unknown }> {
    const res = await apiClient.get<ApiSuccess<PackageOut[]>>("/packages", { params })
    return { data: res.data.data, meta: res.data.meta }
  },

  async getById(id: number): Promise<PackageOut> {
    const res = await apiClient.get<ApiSuccess<PackageOut>>(`/packages/${id}`)
    return res.data.data
  },

  async create(payload: PackageCreate): Promise<PackageOut> {
    const res = await apiClient.post<ApiSuccess<PackageOut>>("/packages", payload)
    return res.data.data
  },

  async update(id: number, payload: PackageUpdate): Promise<PackageOut> {
    const res = await apiClient.put<ApiSuccess<PackageOut>>(`/packages/${id}`, payload)
    return res.data.data
  },

  async disable(id: number): Promise<void> {
    await apiClient.delete(`/packages/${id}`)
  },

  async enable(id: number): Promise<PackageOut> {
    const res = await apiClient.patch<ApiSuccess<PackageOut>>(`/packages/${id}/enable`)
    return res.data.data
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/packages/${id}/delete`)
  },
}
