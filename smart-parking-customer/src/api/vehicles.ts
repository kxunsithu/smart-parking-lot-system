import apiClient from "./client"
import type { ApiSuccess, VehicleOut, VehicleCreate, VehicleUpdate } from "./types"

export const vehiclesApi = {
  list: async (): Promise<VehicleOut[]> => {
    const response = await apiClient.get<ApiSuccess<VehicleOut[]>>("/vehicles")
    return response.data.data
  },

  create: async (data: VehicleCreate): Promise<VehicleOut> => {
    const response = await apiClient.post<ApiSuccess<VehicleOut>>("/vehicles", data)
    return response.data.data
  },

  get: async (id: number): Promise<VehicleOut> => {
    const response = await apiClient.get<ApiSuccess<VehicleOut>>(`/vehicles/${id}`)
    return response.data.data
  },

  update: async (id: number, data: VehicleUpdate): Promise<VehicleOut> => {
    const response = await apiClient.put<ApiSuccess<VehicleOut>>(`/vehicles/${id}`, data)
    return response.data.data
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete<ApiSuccess<null>>(`/vehicles/${id}`)
  },
}
