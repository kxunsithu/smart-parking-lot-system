import { apiClient } from "@/api/client"
import type { ApiSuccess, PackageOut } from "@/types"

export interface CreatePackagePayload {
  name: string
  description?: string | null
  price: number
  duration_days: number
  max_lots?: number
  max_staff?: number
}

export interface UpdatePackagePayload {
  name?: string
  description?: string | null
  price?: number
  duration_days?: number
  max_lots?: number
  max_staff?: number
  is_active?: boolean
}

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

  async create(payload: CreatePackagePayload): Promise<PackageOut> {
    const res = await apiClient.post<ApiSuccess<PackageOut>>("/packages", payload)
    return res.data.data
  },

  async update(id: number, payload: UpdatePackagePayload): Promise<PackageOut> {
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
