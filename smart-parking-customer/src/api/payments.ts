import apiClient from "./client"
import type { ApiSuccess, ApiMeta, PaymentListOut } from "./types"

export const paymentsApi = {
  /** Fetch the current customer's wallet transaction receipts (session payments only). */
  list: async (params?: {
    page?: number
    limit?: number
    search?: string
  }): Promise<{ items: PaymentListOut[]; meta: ApiMeta | null }> => {
    const res = await apiClient.get<ApiSuccess<PaymentListOut[]>>("/payments", { params })
    return { items: res.data.data, meta: res.data.meta ?? null }
  },
}
