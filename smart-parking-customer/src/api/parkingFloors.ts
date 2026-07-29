import apiClient from "./client"
import type { ApiSuccess } from "./types"

export interface ParkingFloorOut {
  id: number
  parking_lot_id: number
  floor_name: string
}

export const parkingFloorsApi = {
  list: async (params?: {
    parking_lot_id?: number
    limit?: number
  }): Promise<ParkingFloorOut[]> => {
    const response = await apiClient.get<ApiSuccess<ParkingFloorOut[]>>("/parking-floors", { params })
    return response.data.data
  },

  get: async (id: number): Promise<ParkingFloorOut> => {
    const response = await apiClient.get<ApiSuccess<ParkingFloorOut>>(`/parking-floors/${id}`)
    return response.data.data
  },
}
