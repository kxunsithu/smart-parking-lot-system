import apiClient from "./client"
import type { ApiSuccess, ParkingSlotOut } from "./types"

export const parkingSlotsApi = {
  list: async (params?: {
    floor_id?: number
    limit?: number
  }): Promise<ParkingSlotOut[]> => {
    const response = await apiClient.get<ApiSuccess<ParkingSlotOut[]>>("/parking-slots", { params })
    return response.data.data
  },

  get: async (id: number): Promise<ParkingSlotOut> => {
    const response = await apiClient.get<ApiSuccess<ParkingSlotOut>>(`/parking-slots/${id}`)
    return response.data.data
  },
}
