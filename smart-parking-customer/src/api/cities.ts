import apiClient from "./client"

export interface CityOut {
  id: number
  name: string
  name_mm: string | null
  description: string | null
  image_url: string | null
  is_active: boolean
  created_at: string
}

export const citiesApi = {
  list: async (params?: { is_active?: boolean }): Promise<CityOut[]> => {
    const res = await apiClient.get<{ success: boolean; data: CityOut[] }>("/cities", { params })
    return res.data.data
  },

  get: async (id: number): Promise<CityOut> => {
    const res = await apiClient.get<{ success: boolean; data: CityOut }>(`/cities/${id}`)
    return res.data.data
  },
}
