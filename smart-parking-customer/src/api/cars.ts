import apiClient from "./client"
import type { ApiSuccess, CarOut, CarCreate, CarUpdate } from "./types"

export const carsApi = {
  list: async (): Promise<CarOut[]> => {
    const response = await apiClient.get<ApiSuccess<CarOut[]>>("/cars")
    return response.data.data
  },

  create: async (data: CarCreate): Promise<CarOut> => {
    const response = await apiClient.post<ApiSuccess<CarOut>>("/cars", data)
    return response.data.data
  },

  get: async (id: number): Promise<CarOut> => {
    const response = await apiClient.get<ApiSuccess<CarOut>>(`/cars/${id}`)
    return response.data.data
  },

  update: async (id: number, data: CarUpdate): Promise<CarOut> => {
    const response = await apiClient.put<ApiSuccess<CarOut>>(`/cars/${id}`, data)
    return response.data.data
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete<ApiSuccess<null>>(`/cars/${id}`)
  },
}
