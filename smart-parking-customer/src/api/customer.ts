import apiClient from "./client"
import type { ApiSuccess, CustomerOut, CustomerUpdate } from "./types"

export const customerApi = {
  getProfile: async (): Promise<CustomerOut> => {
    const response = await apiClient.get<ApiSuccess<CustomerOut>>("/customers/me")
    return response.data.data
  },

  updateProfile: async (data: CustomerUpdate): Promise<CustomerOut> => {
    const response = await apiClient.put<ApiSuccess<CustomerOut>>("/customers/me", data)
    return response.data.data
  },
}
