import { apiClient } from "@/api/client"
import type { ListParams, ListResult } from "@/api/types"
import type { ApiSuccess, PaymentMethod, PaymentOut, PaymentStatus } from "@/types"

export interface CreatePaymentPayload {
  parking_session_id: number
  reservation_id?: number
  amount: number
  payment_method: PaymentMethod
  customer_id?: number
}

export const paymentsApi = {
  async list(params?: ListParams): Promise<ListResult<PaymentOut>> {
    const res = await apiClient.get<ApiSuccess<PaymentOut[]>>("/payments", { params })
    return { items: res.data.data, meta: res.data.meta! }
  },

  async get(id: number) {
    const res = await apiClient.get<ApiSuccess<PaymentOut>>(`/payments/${id}`)
    return res.data.data
  },

  async create(payload: CreatePaymentPayload) {
    const res = await apiClient.post<ApiSuccess<PaymentOut>>("/payments", payload)
    return res.data.data
  },

  async updateStatus(id: number, status: PaymentStatus) {
    const res = await apiClient.patch<ApiSuccess<PaymentOut>>(`/payments/${id}/status`, { status })
    return res.data.data
  },
}
