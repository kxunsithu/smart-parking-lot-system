import { apiClient } from "./client"

export interface CityOut {
  id: number
  name: string
  name_mm: string | null
  description: string | null
  image_url: string | null
  is_active: boolean
  created_at: string
}

const BASE = "/cities"

export const citiesApi = {
  list: async (params?: { is_active?: boolean }): Promise<CityOut[]> => {
    const res = await apiClient.get<{ success: boolean; data: CityOut[] }>(BASE, { params })
    return res.data.data
  },

  get: async (id: number): Promise<CityOut> => {
    const res = await apiClient.get<{ success: boolean; data: CityOut }>(`${BASE}/${id}`)
    return res.data.data
  },

  create: async (form: FormData): Promise<CityOut> => {
    const res = await apiClient.post<{ success: boolean; data: CityOut }>(BASE, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return res.data.data
  },

  update: async (id: number, form: FormData): Promise<CityOut> => {
    const res = await apiClient.put<{ success: boolean; data: CityOut }>(`${BASE}/${id}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return res.data.data
  },

  deleteImage: async (id: number): Promise<CityOut> => {
    const res = await apiClient.delete<{ success: boolean; data: CityOut }>(`${BASE}/${id}/image`)
    return res.data.data
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}`)
  },
}
