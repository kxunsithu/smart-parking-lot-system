import apiClient from "./client"
import type { ApiSuccess, ParkingLotOut } from "./types"

export const parkingLotsApi = {
  list: async (params?: {
    type?: string
    page?: number
    limit?: number
  }): Promise<ParkingLotOut[]> => {
    const response = await apiClient.get<ApiSuccess<ParkingLotOut[]>>("/parking-lots", { params })
    return response.data.data
  },

  get: async (id: number): Promise<ParkingLotOut> => {
    const response = await apiClient.get<ApiSuccess<ParkingLotOut>>(`/parking-lots/${id}`)
    return response.data.data
  },
}
