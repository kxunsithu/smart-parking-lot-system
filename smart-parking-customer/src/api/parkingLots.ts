import apiClient from "./client"
import type { ApiSuccess, ApiMeta, ParkingLotOut } from "./types"

export const parkingLotsApi = {
  list: async (params?: {
    type?: string
    page?: number
    limit?: number
    search?: string
  }): Promise<{ items: ParkingLotOut[]; meta: ApiMeta | null }> => {
    const response = await apiClient.get<ApiSuccess<ParkingLotOut[]>>("/parking-lots", { params })
    return { items: response.data.data, meta: response.data.meta ?? null }
  },

  get: async (id: number): Promise<ParkingLotOut> => {
    const response = await apiClient.get<ApiSuccess<ParkingLotOut>>(`/parking-lots/${id}`)
    return response.data.data
  },
}
